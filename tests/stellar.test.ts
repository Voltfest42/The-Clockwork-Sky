import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { M_SUN } from '../src/core/constants';
import { extinction, extinctionRatio, reddening, transmission } from '../src/core/ism/extinction';
import { criticalMassForRadius, densityOf, freeFallTime, jeansMass, jeansVerdict, MU_ATOMIC, MU_MOLECULAR } from '../src/core/ism/jeans';
import { Random } from '../src/core/random';
import { brownDwarfLuminosity, brownDwarfTemperature, coolClassOf, HYDROGEN_BURNING_LIMIT } from '../src/core/stellar/brownDwarfs';
import { zoneOf } from '../src/core/stellar/calibration';
import { drawCluster, imfDensity, imfMean, imfShare, kroupa, sampleImf } from '../src/core/stellar/imf';
import { pairFate, pairRemnant } from '../src/core/stellar/pairInstability';
import { pmsAt, zamsArrival, type PmsTrack } from '../src/core/stellar/pms';
import { DEFAULTS, evolveStar, type SseTrack } from '../src/core/stellar/sse/evolve';
import { hrdiag, type HrState } from '../src/core/stellar/sse/hrdiag';
import { landmarks, star } from '../src/core/stellar/sse/star';
import { zcnsts } from '../src/core/stellar/sse/zcnsts';
import { PARSEC, SECONDS_PER_JULIAN_YEAR } from '../src/core/units';
import bhac15 from '../src/data/bhac15.json';
import fixtures from './fixtures/sse/tracks.json';
import { expectNear } from './helpers';

const MYR = 1e6 * SECONDS_PER_JULIAN_YEAR;

interface FixtureTrack {
  m: number;
  z: number;
  n: number;
  steps: number[][];
  types: number[][];
}

/** Relative difference, with a floor so values near zero compare absolutely. */
const close = (a: number, b: number, rel: number, floor = 1e-12) => Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), floor);

const firstTime = (track: SseTrack, kw: number) => track.types.find((t) => t.kw === kw)?.t;

describe('SSE against Hurley’s own code', () => {
  const tracks = fixtures.tracks as FixtureTrack[];

  it('has fixtures for every stellar type a single star reaches in the grid', () => {
    const reached = new Set(tracks.flatMap((t) => t.types.map((r) => r[1])));
    // Single stars in this grid never become naked helium giants (9) or leave nothing (15); see the extra stars below.
    for (const kw of [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14]) expect(reached.has(kw), `type ${kw}`).toBe(true);
  });

  // A step that lands exactly on a boundary (a core reaching its limit, tested against 10⁻¹⁴) can fall on either side of it,
  // because gfortran's and V8's powers differ in their last bit. Then one track takes a single extra step, 10⁻⁷ of the age
  // later, and the same remnant follows: the comparison lets the steps realign once, at a change of type, and no more.
  it.each(tracks.map((t) => [t.m, t.z, t] as const))('evolves %f M☉ at Z = %f step for step', (m, z, fixture) => {
    const track = evolveStar(m, z, fixtures.tEnd);
    // The same type changes at the same times and masses.
    expect(track.types.map((t) => t.kw)).toEqual(fixture.types.map((r) => r[1]));
    for (const [k, [t, kw, mt]] of fixture.types.entries()) {
      expect(close(track.types[k].t, t, 1e-6), `type ${kw} at ${t} Myr, got ${track.types[k].t}`).toBe(true);
      expect(close(track.types[k].mt, mt, 1e-6), `mass at type ${kw}: ${mt}, got ${track.types[k].mt}`).toBe(true);
    }
    // Every kept step: [j, t, kw, mass0, mt, L, R, mc, rc, menv].
    let offset = 0;
    let realigned = 0;
    for (const [k, row] of fixture.steps.entries()) {
      let s = track.steps[row[0] - 1 + offset];
      if (s?.kw !== row[2] && realigned === 0) {
        const next = track.steps[row[0] + offset];
        if (next && next.kw === row[2] && close(next.t, row[1], 1e-6)) {
          // The port takes the extra step.
          offset += 1;
          realigned++;
          s = next;
        } else if (s && close(s.t, row[1], 1e-6) && fixture.steps[k + 1]?.[2] === s.kw) {
          // Hurley's code takes the extra step: skip it.
          offset -= 1;
          realigned++;
          continue;
        }
      }
      const at = `step ${row[0]} (type ${row[2]}, t = ${row[1]})`;
      expect(s, at).toBeDefined();
      expect(s.kw, at).toBe(row[2]);
      expect(close(s.t, row[1], 1e-6), `${at}: t ${s.t}`).toBe(true);
      expect(close(s.mass0, row[3], 1e-6), `${at}: mass0 ${s.mass0}`).toBe(true);
      expect(close(s.mt, row[4], 1e-6), `${at}: mt ${s.mt}`).toBe(true);
      expect(close(s.L, row[5], 1e-5), `${at}: L ${s.L} against ${row[5]}`).toBe(true);
      expect(close(s.R, row[6], 1e-5), `${at}: R ${s.R} against ${row[6]}`).toBe(true);
      expect(close(s.mc, row[7], 1e-5, 1e-9), `${at}: Mc ${s.mc} against ${row[7]}`).toBe(true);
      expect(close(s.rc, row[8], 1e-5, 1e-9), `${at}: Rc ${s.rc} against ${row[8]}`).toBe(true);
      expect(close(s.menv, row[9], 1e-4, 1e-8), `${at}: Menv ${s.menv} against ${row[9]}`).toBe(true);
    }
    expect(track.steps.length - fixture.n).toBe(offset);
  });
});

describe('SSE’s physics', () => {
  it('puts the Sun at 4.57 billion years within 10% of its luminosity and radius', () => {
    const sun = evolveStar(1, 0.02, 4570).steps.at(-1)!;
    expectNear(sun.L, 1, 0.1, 'L/L☉');
    expectNear(sun.R, 1, 0.1, 'R/R☉');
    expect(sun.kw).toBe(1);
  });

  it('ends the Sun as a carbon–oxygen white dwarf of about half a solar mass, after a red giant and the AGB', () => {
    const sun = evolveStar(1, 0.02, 15000);
    expect(sun.types.map((t) => t.kw)).toEqual([1, 2, 3, 4, 5, 6, 11, 11]);
    expectNear(sun.steps.at(-1)!.mt, 0.52, 0.03, 'white dwarf, M☉');
    expectNear(firstTime(sun, 2)! / 1000, 11, 0.5, 'main sequence, Gyr');
  });

  it('turns heavy stars into neutron stars and black holes, and middling ones into oxygen–neon white dwarfs', () => {
    expect(evolveStar(7.2, 0.02, 1000).steps.at(-1)!.kw).toBe(12);
    expect(evolveStar(20, 0.02, 1000).steps.at(-1)!.kw).toBe(13);
    expect(evolveStar(40, 0.02, 1000).steps.at(-1)!.kw).toBe(14);
  });

  it('never gains mass (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.6, max: 100, noNaN: true }), fc.constantFrom(0.0001, 0.001, 0.004, 0.02, 0.03), (m, z) => {
        const steps = evolveStar(m, z, 20000).steps;
        return steps.every((s, i) => i === 0 || s.mt <= steps[i - 1].mt + 1e-12);
      }),
      { numRuns: 40 },
    );
  });

  it('gives heavier stars shorter main sequences (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.7, max: 90, noNaN: true }), fc.double({ min: 1.05, max: 1.5, noNaN: true }), fc.constantFrom(0.0001, 0.004, 0.02), (m, f, z) => {
        const tLight = firstTime(evolveStar(m, z, 1e5), 2)!;
        const tHeavy = firstTime(evolveStar(m * f, z, 1e5), 2)!;
        return tHeavy < tLight;
      }),
      { numRuns: 40 },
    );
  });

  // SSE's formulas meet at these ends, but its small-envelope perturbation, which starts in the HG, shrinks heavy stars' radii
  // by up to 3% there (60 M☉); the port reproduces that, so the radius gets 5%.
  it('is continuous in luminosity and radius at the end of the main sequence and of the Hertzsprung gap (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.8, max: 60, noNaN: true }), fc.constantFrom(0.0001, 0.001, 0.02, 0.03), (m, z) => {
        const c = zcnsts(z);
        const at = (aj: number) => {
          const lm = landmarks();
          star(1, m, m, lm, c);
          const s: HrState = { mass: m, aj, mt: m, kw: 1, mc: 0, r: 0, lum: 0, rc: 0, menv: 0, renv: 0, k2: 0 };
          hrdiag(s, lm, c, DEFAULTS);
          return { s, lm };
        };
        const { lm } = at(0);
        const ends = [lm.tm, lm.tscls[1]];
        return ends.every((t) => {
          const before = at(t * (1 - 1e-9)).s;
          const after = at(t * (1 + 1e-9)).s;
          return before.kw !== after.kw && close(before.lum, after.lum, 1e-3) && close(before.r, after.r, 0.05);
        });
      }),
      { numRuns: 60 },
    );
  });

  it('sets the metallicity’s mass boundaries as the paper does', () => {
    const c = zcnsts(0.02);
    expectNear(c.zpars[1], 1.0185, 1e-12, 'Mhook');
    expectNear(c.zpars[2], 1.995, 1e-12, 'Mhef');
    expectNear(c.zpars[3], 13.0, 0.1, 'Mfgb');
    expectNear(c.zpars[4], 6.11, 0.01, 'Mup');
    expectNear(c.zpars[11], 0.7, 1e-12, 'X');
  });
});

describe('beyond SSE', () => {
  it('cools brown dwarfs as Burrows et al.’s fits say, and close to BHAC15’s tracks at a billion years', () => {
    expectNear(brownDwarfLuminosity(0.05, 1e9), 4e-5, 1e-12, 'L at 0.05 M☉, 1 Gyr');
    expectNear(brownDwarfTemperature(0.05, 1e9), 1550, 1e-9, 'T at 0.05 M☉, 1 Gyr');
    const track = (bhac15.tracks as PmsTrack[]).find((t) => t.mass === 0.05)!;
    const model = pmsAt(track, 1e9)!;
    expectNear(brownDwarfLuminosity(0.05, 1e9) / model.luminosity, 1, 0.4, 'L against BHAC15');
    expectNear(brownDwarfTemperature(0.05, 1e9) / model.kelvin, 1, 0.15, 'T against BHAC15');
    expect(coolClassOf(brownDwarfTemperature(0.03, 1e10))).toBe('Y');
    expect(HYDROGEN_BURNING_LIMIT * 1047.57).toBeCloseTo(78.6, 1);
  });

  it('brings young stars to the main sequence in tens of millions of years, small ones in hundreds', () => {
    const tracks = bhac15.tracks as PmsTrack[];
    const arrival = (m: number) => zamsArrival(tracks.find((t) => t.mass === m)!)! / 1e6;
    expect(arrival(1)).toBeGreaterThan(30);
    expect(arrival(1)).toBeLessThan(50);
    expect(arrival(0.1)).toBeGreaterThan(200);
    expect(arrival(0.1)).toBeLessThan(1000);
    for (const m of [0.01, 0.03, 0.05]) expect(zamsArrival(tracks.find((t) => t.mass === m)!)).toBeNull();
    // Heavier stars arrive sooner, all the way up.
    const stars = tracks.filter((t) => t.mass >= 0.1).map((t) => zamsArrival(t)!);
    for (let k = 1; k < stars.length; k++) expect(stars[k]).toBeLessThanOrEqual(stars[k - 1] * 1.05);
  });

  it('blows apart helium cores between about 65 and 135 M☉, and caps pulsating ones near 45', () => {
    expect(pairFate(20)).toBe('core-collapse');
    expect(pairFate(50)).toBe('pulsational');
    expect(pairFate(100)).toBe('pair-instability');
    expect(pairFate(200)).toBe('direct-collapse');
    expect(pairRemnant(50, 48)).toBe(45);
    expect(pairRemnant(100, 90)).toBe(0);
    expect(pairRemnant(20, 12)).toBe(12);
  });

  it('marks where the engine is fitted, extrapolated or not to be trusted', () => {
    expect(zoneOf(1, 0.02)).toBe('fitted');
    expect(zoneOf(0.3, 0.02)).toBe('extrapolated');
    expect(zoneOf(80, 0.02)).toBe('extrapolated');
    expect(zoneOf(0.05, 0.02)).toBe('other-model');
    expect(zoneOf(120, 0.001)).toBe('other-model');
    expect(zoneOf(200, 0.02)).toBe('unreliable');
    expect(zoneOf(1, 0.00001)).toBe('unreliable');
  });
});

describe('the initial mass function', () => {
  const stars = kroupa(0.08, 150);

  it('gives the brief’s shares for Kroupa’s IMF from 0.08 to 150 M☉', () => {
    expectNear(1 / imfShare(stars, 8, 150), 160, 6, 'one star in … above 8 M☉');
    expectNear(imfShare(stars, 8, 150, 1), 0.23, 0.01, 'their share of the mass');
    expectNear(imfShare(stars, 1, 150), 0.1, 0.01, 'heavier than the Sun');
    expectNear(imfShare(stars, 1, 150, 1), 0.56, 0.01, 'their share of the mass');
    expectNear(imfMean(stars), 0.59, 0.01, 'mean mass');
    const all = kroupa();
    expectNear(imfShare(all, 0.01, 0.08) / imfShare(all, 0.08, 150), 0.59, 0.02, 'brown dwarfs per star');
  });

  it('is continuous at its breaks and integrates to one', () => {
    const all = kroupa();
    for (const m of [0.08, 0.5]) expectNear(imfDensity(all, m * (1 - 1e-9)) / imfDensity(all, m * (1 + 1e-9)), 1, 1e-6, `at ${m}`);
    expectNear(imfShare(stars, 0.08, 150), 1, 1e-12, 'all of it');
  });

  it('draws masses inside its range whose shares match the analytic ones (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1e6 }), (seed) => {
        const random = new Random(seed);
        const draws = Array.from({ length: 4000 }, () => sampleImf(stars, random));
        const above1 = draws.filter((m) => m >= 1).length / draws.length;
        return draws.every((m) => m >= 0.08 && m <= 150) && Math.abs(above1 - 0.097) < 0.02;
      }),
      { numRuns: 20 },
    );
  });

  it('draws a cluster of a given number of stars, with brown dwarfs besides', () => {
    const cluster = drawCluster(kroupa(), 1000, new Random(7));
    expect(cluster.filter((m) => m >= 0.08).length).toBe(1000);
    const brown = cluster.length - 1000;
    expect(brown).toBeGreaterThan(450);
    expect(brown).toBeLessThan(750);
  });
});

describe('clouds and dust', () => {
  it('gives the brief’s Jeans mass and free-fall time for cold molecular gas', () => {
    const rho = densityOf(1e4 * 1e6, MU_MOLECULAR);
    expectNear(jeansMass(10, rho, MU_MOLECULAR) / M_SUN, 5.4, 0.1, 'M_J at 10 K and 10⁴ per cm³');
    expectNear(freeFallTime(rho) / MYR, 0.34, 0.01, 't_ff, Myr');
  });

  it('collapses exactly when gravity beats twice the heat (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: -1, max: 7, noNaN: true }), fc.double({ min: -2, max: 2, noNaN: true }), fc.double({ min: 0.7, max: 4, noNaN: true }), (logM, logR, logT) => {
        const cloud = { mass: 10 ** logM * M_SUN, radius: 10 ** logR * PARSEC, kelvin: 10 ** logT, mu: MU_MOLECULAR };
        const v = jeansVerdict(cloud);
        const margin = Math.abs(v.gravity / v.thermal - 1);
        return margin < 1e-9 || v.collapses === v.gravity > v.thermal;
      }),
    );
  });

  it('finds the least mass that collapses at a given size', () => {
    const r = 0.1 * PARSEC;
    const m = criticalMassForRadius(r, 10, MU_MOLECULAR);
    expectNear(m / M_SUN, 4.1, 0.1, '0.1 pc at 10 K');
    expect(jeansVerdict({ mass: m * 1.01, radius: r, kelvin: 10, mu: MU_MOLECULAR }).collapses).toBe(true);
    expect(jeansVerdict({ mass: m * 0.99, radius: r, kelvin: 10, mu: MU_MOLECULAR }).collapses).toBe(false);
    // Warm gas between the stars is nowhere near collapse.
    const warm = { mass: 100 * M_SUN, radius: 10 * PARSEC, kelvin: 8000, mu: MU_ATOMIC };
    expect(jeansVerdict(warm).jeansMass / warm.mass).toBeGreaterThan(1e4);
  });

  it('dims blue light more than red, as Cardelli, Clayton & Mathis’s law says', () => {
    expectNear(extinctionRatio(0.55e-6), 1, 0.01, 'A_V / A_V');
    expectNear(extinctionRatio(0.44e-6) - extinctionRatio(0.55e-6), 1 / 3.1, 0.015, 'E(B − V) / A_V');
    expectNear(extinctionRatio(2.2e-6), 0.11, 0.01, 'A_K / A_V');
    expectNear(reddening(3.1), 1, 1e-12, 'E(B − V) for A_V = 3.1');
    expectNear(transmission(0.55e-6, 2.5), 0.1, 0.003, '2.5 magnitudes lets a tenth through');
    expect(extinction(0.22e-6, 1)).toBeGreaterThan(extinction(0.3e-6, 1));
  });

  it('dims less and less towards longer wavelengths, from the ultraviolet bump to the infrared (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.25e-6, max: 20e-6, noNaN: true }), fc.double({ min: 1.01, max: 3, noNaN: true }), (lambda, f) => extinctionRatio(lambda * f) < extinctionRatio(lambda)),
    );
  });
});
