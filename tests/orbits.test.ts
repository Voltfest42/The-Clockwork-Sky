import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AU, GM_SUN } from '../src/core/constants';
import { danbyStart, eccentricAnomaly, type KeplerStep } from '../src/core/ephemeris/kepler';
import { meanLongitude, siderealPeriodDays } from '../src/core/ephemeris/meanLongitude';
import { planetElements } from '../src/core/ephemeris/planets';
import { geocentricPlace } from '../src/core/ephemeris/wanderers';
import {
  apsides,
  areaSwept,
  areaSweptByIntegration,
  ellipseArea,
  focusOffset,
  orbitalSpeed,
  periodSeconds,
  periodYears,
  pointAtMeanAnomaly,
  pointAtTrueAnomaly,
  radiusAt,
  semiMajorAxisAu,
  semiMinorAxis,
} from '../src/core/orbits/ellipse';
import { bestFit, ptolemyAt, PTOLEMY_MARS, scoreFit, type PtolemyEpoch, type PtolemyParams } from '../src/core/orbits/ptolemy';
import { jdFromCalendar } from '../src/core/time/calendar';
import { ttFromUt } from '../src/core/time/deltaT';
import { DAYS_PER_JULIAN_YEAR, DEG, SECONDS_PER_JULIAN_YEAR } from '../src/core/units';
import { ORBITS, orbitById } from '../src/data/orbits';
import { expectNear } from './helpers';

describe('ellipses (Kepler’s first law)', () => {
  it('keeps the two pins’ string the same length all the way round', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.99, noNaN: true }), fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }), (e, nu) => {
        const orbit = { a: 1, e };
        const p = pointAtTrueAnomaly(orbit, nu);
        // One focus is the Sun, at the origin; the other is 2ae away, on the far side of the centre.
        const toSun = Math.hypot(p.x, p.y);
        const toOther = Math.hypot(p.x + 2 * focusOffset(orbit), p.y);
        expectNear(toSun + toOther, 2, 1e-12, 'string');
        expectNear(toSun, radiusAt(orbit, nu), 1e-12, 'r');
      }),
    );
  });

  it('has the right nearest and farthest points and size', () => {
    const mars = { a: 1.5237, e: 0.0934 };
    expectNear(apsides(mars).perihelion, 1.3814, 1e-4, 'perihelion');
    expectNear(apsides(mars).aphelion, 1.666, 1e-4, 'aphelion');
    expectNear(semiMinorAxis({ a: 1, e: 0.6 }), 0.8, 1e-15, 'b');
    expectNear(ellipseArea({ a: 2, e: 0 }), 4 * Math.PI, 1e-12, 'circle');
    // Earth's orbit is so nearly a circle that its narrowest diameter is 99.986% of its widest.
    expectNear(semiMinorAxis({ a: 1, e: orbitById('earth').e }), 0.99986, 1e-5, 'Earth');
    // Time zero is perihelion; half an orbit later, aphelion.
    expectNear(pointAtMeanAnomaly(mars, 0).x, apsides(mars).perihelion, 1e-12, 'at perihelion');
    expectNear(pointAtMeanAnomaly(mars, Math.PI).r, apsides(mars).aphelion, 1e-12, 'at aphelion');
  });
});

describe('equal areas in equal times (Kepler’s second law)', () => {
  it('sweeps the same area in the same time anywhere on the orbit', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.95, noNaN: true }),
        fc.double({ min: -3, max: 2.5, noNaN: true }),
        fc.double({ min: 0.05, max: 0.6, noNaN: true }),
        (e, M1, dM) => {
          const orbit = { a: 1, e };
          const exact = areaSwept(orbit, M1, M1 + dM);
          expectNear(areaSweptByIntegration(orbit, M1, M1 + dM, 4000), exact, 1e-7, 'area');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('moves fastest at perihelion: Mercury, Earth and Halley’s comet', () => {
    const speed = (id: string, r: number) => orbitalSpeed(GM_SUN, r * AU, orbitById(id).a * AU) / 1000;
    const mercury = apsides(orbitById('mercury'));
    expectNear(speed('mercury', mercury.perihelion), 58.98, 0.1, 'Mercury at perihelion');
    expectNear(speed('mercury', mercury.aphelion), 38.86, 0.1, 'Mercury at aphelion');
    expectNear(speed('earth', 1), 29.78, 0.02, 'Earth at 1 AU');
    const halley = apsides(orbitById('halley'));
    expect(speed('halley', halley.perihelion)).toBeGreaterThan(54);
    expect(speed('halley', halley.aphelion)).toBeLessThan(1);
    // Angular momentum: r × v is the same at both ends.
    expectNear(speed('halley', halley.perihelion) * halley.perihelion, speed('halley', halley.aphelion) * halley.aphelion, 1e-9, 'r v');
  });
});

describe('the harmonic law (Kepler’s third law)', () => {
  it('puts every planet, dwarf planet and comet on P² = a³ (years and AU)', () => {
    for (const o of ORBITS.filter((x) => x.kind !== 'moon of Jupiter')) {
      expectNear(o.period / periodYears(o.a), 1, 0.006, `${o.name}: P = ${o.period.toFixed(3)} y, a^1.5 = ${periodYears(o.a).toFixed(3)}`);
    }
    expectNear(semiMajorAxisAu(8), 4, 1e-12, 'a 4 AU planet has an 8-year year');
  });

  it('puts Jupiter’s moons on a parallel line, about 32 times below, which weighs Jupiter', () => {
    const ratios = ORBITS.filter((x) => x.kind === 'moon of Jupiter').map((o) => o.period ** 2 / o.a ** 3);
    for (const r of ratios) expectNear(r / ratios[0], 1, 0.002, 'same line');
    // P²/a³ is 1/(M + m) in solar masses: the Sun is about 1047 times Jupiter.
    expectNear(ratios[0], 1047.3, 2, 'Sun over Jupiter');
    expectNear(Math.sqrt(ratios[0]), 32.4, 0.1, 'how far below');
  });

  it('agrees with Newton’s form for a 1 AU orbit round the Sun', () => {
    expectNear(periodSeconds(GM_SUN, AU) / SECONDS_PER_JULIAN_YEAR, 1, 2e-4, 'a year');
  });
});

describe('Kepler’s equation, step by step (Figure 6.4)', () => {
  it('reports every guess, ending on the answer', () => {
    const steps: KeplerStep[] = [];
    const E = eccentricAnomaly(1, 0.5, { emit: (s) => steps.push(s) });
    expect(steps[0].iteration).toBe(0);
    expectNear(steps[0].E, danbyStart(1, 0.5), 1e-15, 'start');
    expect(steps.length).toBeLessThan(8);
    expectNear(steps[steps.length - 1].E, E, 1e-15, 'last');
    expect(Math.abs(steps[steps.length - 1].residual)).toBeLessThan(1e-14);
    // Newton's method roughly doubles the correct digits each step.
    expect(Math.abs(steps[2].residual)).toBeLessThan(Math.abs(steps[1].residual) ** 1.5);
  });

  it('starts where it is told, and still converges from a poor guess at high eccentricity', () => {
    fc.assert(
      fc.property(fc.double({ min: -3, max: 3, noNaN: true }), fc.double({ min: 0, max: 0.97, noNaN: true }), (M, e) => {
        const steps: KeplerStep[] = [];
        const E = eccentricAnomaly(M, e, { start: M, emit: (s) => steps.push(s) });
        expectNear(steps[0].E, M, 1e-15, 'start');
        expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-12);
      }),
    );
  });
});

describe('Ptolemy’s model of Mars (Figure 5.3)', () => {
  const t0 = ttFromUt(jdFromCalendar({ year: 2020, month: 1, day: 1 }));
  const t1 = t0 + 15 * DAYS_PER_JULIAN_YEAR;
  const mid = (t0 + t1) / 2;
  const times: number[] = [];
  for (let t = t0; t <= t1; t += 10) times.push(t);
  const real = times.map((t) => geocentricPlace('mars', t).lon);
  const epoch: PtolemyEpoch = { jdTT: mid, meanLongitude: meanLongitude('mars', mid), anomaly: meanLongitude('earth', mid) + Math.PI - meanLongitude('mars', mid) };
  const { node, argPeri } = planetElements('mars', mid);
  const ptolemy: PtolemyParams = {
    ...PTOLEMY_MARS,
    apogee: node + argPeri + Math.PI,
    deferentPeriod: siderealPeriodDays('mars'),
    epicyclePeriod: 1 / (1 / 365.256_36 - 1 / siderealPeriodDays('mars')),
  };
  const score = (p: PtolemyParams) => scoreFit(p, epoch, times, real);

  it('keeps the epicycle parallel to the Sun’s direction, so the planet goes backwards near opposition', () => {
    const s = ptolemyAt(ptolemy, epoch, mid);
    const radius = Math.atan2(s.planet.y - s.epicycleCentre.y, s.planet.x - s.epicycleCentre.x);
    const meanSun = meanLongitude('earth', mid) + Math.PI;
    expectNear(Math.cos(radius - meanSun), 1, 1e-12, 'parallel');
    // The equant is twice as far out as the deferent's centre, on the same line.
    expectNear(s.equantPoint.x, 2 * s.deferentCentre.x, 1e-15, 'equant');
    expectNear(Math.hypot(s.epicycleCentre.x - s.deferentCentre.x, s.epicycleCentre.y - s.deferentCentre.y), 1, 1e-12, 'on the deferent');
  });

  it('fits Mars to about half a degree with Ptolemy’s proportions, and better when fitted', () => {
    const own = score(ptolemy);
    expect(own.mean / DEG).toBeLessThan(0.7);
    expect(own.worst / DEG).toBeLessThan(4);
    const fitted = bestFit(ptolemy, epoch, times, real);
    const best = score(fitted);
    expect(best.mean / DEG).toBeLessThan(0.3);
    expect(best.worst / DEG).toBeLessThan(1.2);
    // The fit lands close to Ptolemy's own proportions: he did well.
    expectNear(fitted.epicycle, PTOLEMY_MARS.epicycle, 0.02, 'epicycle');
    expectNear(fitted.equant / fitted.centre, 2, 0.15, 'bisected eccentricity');
    // But even the best is far from Tycho's arcminute.
    expect(best.worst / DEG).toBeGreaterThan(0.25);
  });

  it('needs the equant', () => {
    const noEquant = score(bestFit({ ...ptolemy, equant: ptolemy.centre }, epoch, times, real, { noEquant: true }));
    expect(noEquant.mean).toBeGreaterThan(2 * score(ptolemy).mean);
    expect(noEquant.worst / DEG).toBeGreaterThan(3);
    expect(score({ ...ptolemy, centre: 0, equant: 0 }).worst / DEG).toBeGreaterThan(20);
  });
});
