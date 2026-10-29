import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hiddenFraction, lightCurve, overlapArea, relativeLight, type EclipsingPair } from '../src/core/binaries/eclipse';
import { binaryState, companionMass, eclipseLimit, massFunction, minimumMasses, semiAmplitudes, semiMajorAxis, totalMass, type BinaryOrbit } from '../src/core/binaries/orbit';
import { AU, R_SUN } from '../src/core/constants';
import { bin, boxModel, boxSearch, chiSquare, fold, measure, periodGrid, sampleTimes, standardDeviation } from '../src/core/signal/series';
import { expectNear } from './helpers';

const R_PER_AU = AU / R_SUN;

describe('two stars in orbit', () => {
  it('sizes the orbit by Kepler’s third law with both masses', () => {
    expectNear(semiMajorAxis(1, 365.256) / R_PER_AU, 1, 1e-4, 'one Sun, one year: 1 AU');
    expectNear(semiMajorAxis(8, 365.256) / R_PER_AU, 2, 2e-4, 'eight Suns, one year: 2 AU');
    // Sirius: a = 7.50″ at a parallax of 379.2 mas is 19.8 AU; P = 50.13 years (research §6).
    expectNear(totalMass(7.4957 / 0.37921, 50.1284), 3.08, 0.01, 'Sirius A + B, M☉');
    // α Centauri: a = 17.49″ at 750.8 mas, P = 79.76 years: 1.08 + 0.91 (Akeson et al. 2021).
    expectNear(totalMass(17.493 / 0.75081, 79.762), 1.988, 0.01, 'α Centauri A + B, M☉');
  });

  it('keeps the balance point still, and each star’s share of the orbit inverse to its mass (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 30, noNaN: true }),
        fc.double({ min: 0.1, max: 30, noNaN: true }),
        fc.double({ min: 0, max: 0.9, noNaN: true }),
        fc.double({ min: 0, max: 90, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (m1, m2, e, i, phase) => {
          const orbit: BinaryOrbit = { m1, m2, period: 10, e, i, omega: 40 };
          const s = binaryState(orbit, phase);
          const mx = m1 * s.sky[0].x + m2 * s.sky[1].x;
          const mz = m1 * s.sky[0].z + m2 * s.sky[1].z;
          const mv = m1 * s.v1 + m2 * s.v2;
          const scale = s.separation * (m1 + m2);
          return Math.abs(mx) < 1e-9 * scale && Math.abs(mz) < 1e-9 * scale && Math.abs(mv) < 1e-6 * (m1 + m2) * 100;
        },
      ),
    );
  });

  it('gives radial velocities that are the rate of change of distance along the line of sight', () => {
    const orbit: BinaryOrbit = { m1: 1.4, m2: 0.7, period: 12, e: 0.4, i: 63, omega: 110 };
    const dt = 1e-5;
    for (const phase of [0.05, 0.3, 0.62, 0.9]) {
      const a = binaryState(orbit, phase - dt);
      const b = binaryState(orbit, phase + dt);
      const dzdt = ((b.sky[0].z - a.sky[0].z) * R_SUN) / (2 * dt * orbit.period * 86400) / 1000;
      expectNear(binaryState(orbit, phase).v1, dzdt, 1e-3, `v₁ at phase ${phase}`);
    }
  });

  it('swings each star’s velocity by its semi-amplitude K, larger for the lighter star', () => {
    const orbit: BinaryOrbit = { m1: 2, m2: 1, period: 5, e: 0, i: 90, omega: 0 };
    const { k1, k2 } = semiAmplitudes(orbit);
    expectNear(k2 / k1, 2, 1e-12, 'K₂/K₁ = M₁/M₂');
    const vs = Array.from({ length: 1000 }, (_, k) => binaryState(orbit, k / 1000).v1);
    expectNear(Math.max(...vs), k1, 1e-3 * k1, 'largest v₁');
    // Earth's pull on the Sun: 9 cm/s (research §11).
    expectNear(semiAmplitudes({ m1: 1, m2: 3.003e-6, period: 365.256, e: 0, i: 90, omega: 0 }).k1 * 1e5, 8.95, 0.05, 'the Sun’s wobble from Earth, cm/s');
  });

  it('weighs both stars from a double-lined pair’s velocities, and the unseen one from a single line', () => {
    const orbit: BinaryOrbit = { m1: 2.376, m2: 2.291, period: 3.96, e: 0, i: 76, omega: 0 };
    const { k1, k2 } = semiAmplitudes(orbit);
    const sin3 = Math.sin((76 * Math.PI) / 180) ** 3;
    const m = minimumMasses(orbit.period, k1, k2);
    expectNear(m.m1 / sin3, 2.376, 1e-6, 'M₁');
    expectNear(m.m2 / sin3, 2.291, 1e-6, 'M₂');
    const f = massFunction(orbit.period, k1);
    expectNear(f, (2.291 ** 3 * sin3) / (2.376 + 2.291) ** 2, 1e-9, 'f(M)');
    expectNear(companionMass(f, 2.376, 76), 2.291, 1e-6, 'M₂ back from f(M)');
    expect(companionMass(f, 2.376)).toBeLessThan(2.291);
  });

  it('puts the start of eclipses where cos i = (R₁ + R₂)/a', () => {
    const orbit: BinaryOrbit = { m1: 1.2, m2: 0.8, period: 3, e: 0, i: 90, omega: 90 };
    const limit = eclipseLimit(orbit, 1.3, 0.8);
    expectNear(limit, 79.03, 0.02, 'tilt, degrees');
    const pair = (i: number): EclipsingPair => ({ ...orbit, i, r1: 1.3, r2: 0.8, t1: 6200, t2: 5000 });
    const dips = (i: number) => Math.min(...lightCurve(pair(i), 800).map((p) => p.light));
    expect(dips(limit - 0.3)).toBe(1);
    expect(dips(limit + 0.3)).toBeLessThan(1);
  });
});

describe('eclipses', () => {
  it('overlaps two discs exactly', () => {
    expectNear(overlapArea(1, 1, 0), Math.PI, 1e-12, 'one disc over another');
    expectNear(overlapArea(1, 0.5, 0.2), Math.PI / 4, 1e-12, 'a small disc inside');
    expect(overlapArea(1, 1, 2)).toBe(0);
    // Two unit circles with centres 1 apart share 2π/3 − √3/2.
    expectNear(overlapArea(1, 1, 1), (2 * Math.PI) / 3 - Math.sqrt(3) / 2, 1e-12, 'lens');
  });

  it('hides the overlap’s share of a uniform disc, by adding up rings (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.1, max: 2, noNaN: true }), fc.double({ min: 0, max: 3, noNaN: true }), (rf, d) => {
        const exact = overlapArea(1, rf, d) / Math.PI;
        return Math.abs(hiddenFraction(1, rf, d, [0, 0], 2000) - exact) < 3e-3;
      }),
    );
  });

  it('darkens the limb: a small disc over the middle hides more light than its area, near the edge less', () => {
    const area = 0.1 ** 2;
    expect(hiddenFraction(1, 0.1, 0)).toBeGreaterThan(area * 1.2);
    expect(hiddenFraction(1, 0.1, 0.95)).toBeLessThan((overlapArea(1, 0.1, 0.95) / Math.PI) * 0.8);
  });

  it('dims an edge-on pair of equal stars by half at each eclipse’s middle, and not at all between', () => {
    const pair: EclipsingPair = { m1: 1, m2: 1, period: 2, e: 0, i: 90, omega: 90, r1: 1, r2: 1, t1: 5800, t2: 5800 };
    // ω = 90°: star 1 is behind at phase 0 (z points away from us) and in front half an orbit later.
    expectNear(relativeLight(pair, 0), 0.5, 2e-3, 'mid-eclipse');
    expectNear(relativeLight(pair, 0.5), 0.5, 2e-3, 'mid-eclipse, half an orbit on');
    expect(relativeLight(pair, 0.25)).toBe(1);
  });

  it('makes the hotter star’s eclipse the deeper one', () => {
    const pair: EclipsingPair = { m1: 1.2, m2: 0.8, period: 3, e: 0, i: 88, omega: 90, r1: 1.2, r2: 1.2, t1: 7000, t2: 4500 };
    // Phase 0: star 1 (hot) is behind and hidden; phase 0.5: star 2 (cool) is.
    expect(relativeLight(pair, 0)).toBeLessThan(relativeLight(pair, 0.5));
  });
});

describe('measurements in a row', () => {
  it('shrinks the scatter of averages as 1/√N', () => {
    const times = sampleTimes(0, 1000, 1);
    const s = measure(times, () => 1, 0.01, 7);
    expectNear(standardDeviation(s.values), 0.01, 0.0007, 'single points');
    const bins = bin(s.times, s.values, 25);
    expectNear(standardDeviation(bins.map((b) => b.mean)), 0.01 / 5, 0.0004, 'averages of 25');
    expectNear(bins[0].error, 0.002, 0.0006, 'each average’s error bar');
  });

  it('folds times at a period into phases from 0 to 1', () => {
    const phases = fold([0, 2.5, 5, 7.5, 12], 5, 0);
    [0, 0.5, 0, 0.5, 0.4].forEach((p, k) => expectNear(phases[k], p, 1e-12, `phase ${k}`));
  });

  it('counts χ² as about one per point for a right model, more for a wrong one', () => {
    const times = sampleTimes(0, 500, 1);
    const s = measure(times, () => 1, 0.02, 3);
    const right = chiSquare(s.values, new Float64Array(times.length).fill(1), 0.02);
    const wrong = chiSquare(s.values, new Float64Array(times.length).fill(1.01), 0.02);
    expectNear(right / times.length, 1, 0.15, 'χ² per point');
    expect(wrong).toBeGreaterThan(right + 100);
  });

  it('finds a hidden repeating dip, at its period, standing well out of the noise', () => {
    const times = sampleTimes(0, 60, 1 / 48);
    const s = measure(times, boxModel(3.7, 1.2, 0.15, 0.003), 0.002, 11);
    const periods = periodGrid(1, 10, 3000);
    const results = boxSearch(s, periods, 0.15, 0.002);
    const best = results.reduce((a, b) => (b.significance > a.significance ? b : a));
    expectNear(best.period, 3.7, 0.01, 'period, days');
    expectNear(best.depth, 0.003, 0.0006, 'depth');
    expect(best.significance).toBeGreaterThan(10);
  });
});
