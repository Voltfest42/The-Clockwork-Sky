import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PARSEC } from '../src/core/units';
import { R_SUN } from '../src/core/constants';
import { CROSSING, stellarCollisions } from '../src/core/galaxy/encounters';
import {
  choose,
  coulombLength,
  CRITICAL_DENSITY,
  galactocentric,
  integrateLocalGroup,
  mostLikelyLocalGroup,
  nfwDensity,
  nfwDispersion,
  nfwHalo,
  nfwShape,
  relativeMotion,
  sampleLocalGroup,
  type LocalGroupData,
} from '../src/core/galaxy/localGroup';
import { createLocalGroupHost, future, LOCAL_GROUP_DEFAULTS, type LocalGroupConfig, type LocalGroupMessage } from '../src/core/galaxy/localGroupHost';
import { erf, erfc, slowerShare } from '../src/core/math/erf';
import {
  COLLISION_DEFAULTS,
  COLLISION_PRESETS,
  collisionGalaxies,
  createCollisionHost,
  encounterSpec,
  MergerWatch,
  type CollisionConfig,
  type CollisionMessage,
  type CollisionState,
} from '../src/core/nbody/collisionHost';
import {
  discAxis,
  encounterStart,
  frictionCoefficient,
  G_KPC,
  GalaxyEncounter,
  isRing,
  KMS_KPC,
  pairEnergy,
  pericentreSpeed,
  plummerCircularSpeed,
  plummerDensity,
  plummerDispersion,
  plummerMassInside,
  plummerPotential,
  ringReading,
  type EncounterSpec,
  type GalaxySpec,
} from '../src/core/nbody/restricted';
import { checkRing, RING_START } from '../src/content/checks/chapter31Answers';
import { AS_OF } from '../src/data/asOf';
import { LOCAL_GROUP_ODDS, SAWALA_2025, SUN_FRAME, TEXTBOOK_COLLISION, WU_2026 } from '../src/data/localGroup';
import { TIMELINE } from '../src/data/timeline';
import { collisionCaption, crossingNumbers, fateShares, localGroupCaption, mergedBy, oddsOf, presetOf, ringCheck } from '../src/figures/collisions';
import { CHAPTERS, PARTS, partReady, partsComplete } from '../src/site/course';
import { GLOSSARY } from '../src/site/glossary';
import { expectNear } from './helpers';

const close = (actual: number, expected: number, relative: number, label = 'value') =>
  expect(Math.abs(actual - expected) / Math.abs(expected), `${label}: ${actual} vs ${expected}`).toBeLessThan(relative);

function galaxy(mass: number, axis: readonly [number, number, number] | null, count: number): GalaxySpec {
  const k = Math.cbrt(mass / 2e11);
  return { mass, scale: 6 * k, disc: axis ? { inner: 4 * k, outer: 20 * k, axis, count } : undefined };
}

/** Runs an encounter to time t (Myr from the closest approach). */
function runTo(spec: EncounterSpec, t: number): GalaxyEncounter {
  const enc = new GalaxyEncounter(spec);
  while (enc.t < t - 1e-9) enc.step();
  return enc;
}

describe('the error function', () => {
  it('matches tabulated values', () => {
    // Abramowitz & Stegun Table 7.1, and erfc(4) from its asymptotic series
    expectNear(erf(0.5), 0.5204998778130465, 1e-14, 'erf 0.5');
    expectNear(erf(1), 0.8427007929497149, 1e-14, 'erf 1');
    expectNear(erf(2), 0.9953222650189527, 1e-14, 'erf 2');
    expectNear(erf(3), 0.9999779095030014, 1e-13, 'erf 3');
    expectNear(erf(3.5), 0.9999992569016276, 1e-13, 'erf 3.5');
    close(erfc(4), 1.541725790028002e-8, 1e-9, 'erfc 4');
    expect(erf(-0.7)).toBeCloseTo(-erf(0.7), 15);
  });

  it('gives the share of a Maxwellian crowd slower than a body: smooth, rising from 4X³/(3√π) to 1', () => {
    close(slowerShare(1e-3), (4 * 1e-9) / (3 * Math.sqrt(Math.PI)), 1e-5, 'small X');
    // Continuous where the series hands over
    close(slowerShare(1 - 1e-9), slowerShare(1 + 1e-9), 1e-7, 'at X = 1');
    expectNear(slowerShare(6), 1, 1e-12, 'large X');
    fc.assert(
      fc.property(fc.double({ min: 1e-3, max: 5, noNaN: true }), fc.double({ min: 1.001, max: 2, noNaN: true }), (X, k) => {
        expect(slowerShare(X * k)).toBeGreaterThan(slowerShare(X));
        expect(slowerShare(X)).toBeGreaterThan(0);
        expect(slowerShare(X)).toBeLessThan(1);
      }),
    );
  });
});

describe('Plummer galaxies', () => {
  it('have a force, density and velocity spread that agree with their potential (Poisson’s and Jeans’s equations)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.2, max: 60, noNaN: true }), fc.double({ min: 1, max: 10, noNaN: true }), (r, b) => {
        const M = 1e11;
        const h = 1e-4 * r;
        const dPhi = (plummerPotential(r + h, M, b) - plummerPotential(r - h, M, b)) / (2 * h);
        // The pull holding a circle: v²/r = dΦ/dr
        close(plummerCircularSpeed(r, M, b) ** 2 / r, dPhi, 1e-6, 'circular speed');
        // Poisson: (1/r²) d/dr (r² dΦ/dr) = 4πGρ
        const flux = (x: number) => x * x * ((plummerPotential(x + h, M, b) - plummerPotential(x - h, M, b)) / (2 * h));
        close((flux(r + h) - flux(r - h)) / (2 * h) / (r * r), 4 * Math.PI * G_KPC * plummerDensity(r, M, b), 1e-4, 'Poisson');
        // Gauss: GM(<r)/r² = dΦ/dr
        close((G_KPC * plummerMassInside(r, M, b)) / (r * r), dPhi, 1e-6, 'mass inside');
        // Jeans, isotropic: d(ρσ²)/dr = −ρ dΦ/dr
        const p = (x: number) => plummerDensity(x, M, b) * plummerDispersion(x, M, b) ** 2;
        close((p(r + h) - p(r - h)) / (2 * h), -plummerDensity(r, M, b) * dPhi, 1e-5, 'Jeans');
      }),
    );
  });

  it('feel Chandrasekhar’s friction: k ∝ 1/v³ when fast, finite and ∝ 1/σ³ when slow', () => {
    const [m, rho, sigma, lnL] = [1e10, 1e7, 0.1, 2];
    const pre = 4 * Math.PI * G_KPC ** 2 * m * rho * lnL;
    close(frictionCoefficient(m, rho, sigma, 3, lnL), pre / 27, 1e-9, 'fast');
    const slow = (pre * 4) / (3 * Math.sqrt(Math.PI) * (Math.SQRT2 * sigma) ** 3);
    close(frictionCoefficient(m, rho, sigma, 1e-9, lnL), slow, 1e-9, 'at rest');
    close(frictionCoefficient(m, rho, sigma, 1e-4, lnL), slow, 1e-5, 'slow');
    // The drag force k·v peaks near the crowd's own speeds
    const drag = (v: number) => frictionCoefficient(m, rho, sigma, v, lnL) * v;
    expect(drag(0.15)).toBeGreaterThan(drag(0.02));
    expect(drag(0.15)).toBeGreaterThan(drag(1));
  });
});

describe('the restricted method', () => {
  const pair = (friction: boolean, e = 0.5): EncounterSpec => ({
    galaxies: [galaxy(2e11, discAxis(60, -30, true), 400), galaxy(1e11, discAxis(30, 45, false), 300)],
    pericentre: 20,
    eccentricity: e,
    friction,
    startSeparation: 150,
  });

  it('keeps the pair’s energy and angular momentum without friction, and retraces its steps backwards', () => {
    const spec = pair(false);
    const enc = new GalaxyEncounter(spec);
    const e0 = enc.energy();
    const L = () => {
      const [A, B] = spec.galaxies;
      const { x, v } = enc.pair;
      return A.mass * (x[0] * v[1] - x[1] * v[0]) + B.mass * (x[3] * v[4] - x[4] * v[3]);
    };
    const L0 = L();
    const x0 = Float64Array.from(enc.pair.x);
    let worst = 0;
    for (let n = 0; n < 4000; n++) {
      enc.step();
      worst = Math.max(worst, Math.abs(enc.energy() / e0 - 1));
    }
    expect(worst).toBeLessThan(2e-4);
    close(L(), L0, 1e-10, 'angular momentum');
    // Backwards: the same steps with dt negated
    const back = new GalaxyEncounter({ ...spec, dt: -1 });
    back.pair.x.set(enc.pair.x);
    back.pair.v.set(enc.pair.v);
    for (let n = 0; n < 4000; n++) back.step();
    for (let i = 0; i < 6; i++) expectNear(back.pair.x[i], x0[i], 1e-8, `position ${i}`);
  });

  it('starts an encounter so that the galaxies are closest at t = 0, at the closest approach asked for', () => {
    fc.assert(
      fc.property(fc.double({ min: 2, max: 45, noNaN: true }), fc.double({ min: 0.4, max: 1.8, noNaN: true }), fc.double({ min: 0.1, max: 1, noNaN: true }), (rp, e, q) => {
        const spec: EncounterSpec = { galaxies: [galaxy(2e11, null, 0), galaxy(2e11 * q, null, 0)], pericentre: rp, eccentricity: e, friction: false, startSeparation: 100 };
        const { t } = encounterStart(spec);
        expect(t).toBeLessThan(0);
        const enc = new GalaxyEncounter(spec);
        let best = { d: Infinity, t: 0, u: 0 };
        while (enc.t < 5) {
          enc.step();
          const d = enc.separation();
          if (d < best.d) best = { d, t: enc.t, u: enc.relativeSpeed() };
        }
        expect(Math.abs(best.t)).toBeLessThanOrEqual(1);
        close(best.d, rp, 2e-3, 'closest approach');
        // Its speed there: Kepler's for the extended pair's potential
        close(best.u, pericentreSpeed(spec.galaxies[0], spec.galaxies[1], rp, e), 0.02, 'speed at the closest approach');
      }),
      { numRuns: 25 },
    );
  }, 60_000);

  it('keeps the pair’s momentum with friction on, while friction takes its energy', () => {
    const spec = pair(true);
    const enc = new GalaxyEncounter(spec);
    const [A, B] = spec.galaxies;
    const e0 = pairEnergy(spec, enc.pair);
    for (let n = 0; n < 1500; n++) enc.step();
    for (let a = 0; a < 3; a++) expectNear(A.mass * enc.pair.v[a] + B.mass * enc.pair.v[3 + a], 0, 1e-6 * A.mass, `momentum ${a}`);
    expect(enc.energy()).toBeLessThan(e0);
  });

  it('keeps a lone disc’s stars on their circles', () => {
    // A companion a millionth as heavy, a megaparsec away
    const spec: EncounterSpec = { galaxies: [galaxy(2e11, discAxis(30, 10, true), 500), galaxy(2e5, null, 0)], pericentre: 1000, eccentricity: 1, friction: false, startSeparation: 1001 };
    const enc = new GalaxyEncounter(spec);
    const r = (i: number) => Math.hypot(enc.stars.x[3 * i] - enc.pair.x[0], enc.stars.x[3 * i + 1] - enc.pair.x[1], enc.stars.x[3 * i + 2] - enc.pair.x[2]);
    const r0 = Array.from({ length: 500 }, (_, i) => r(i));
    for (let n = 0; n < 1000; n++) enc.step();
    for (let i = 0; i < 500; i++) close(r(i), r0[i], 2e-3, `star ${i}`);
  });

  it('pulls out a tail and a bridge in a prograde pass and leaves a retrograde disc almost untouched, as Toomre and Toomre found', () => {
    const spec = (tilt: number): EncounterSpec => ({
      galaxies: [galaxy(2e11, discAxis(tilt, 0, true), 2000), galaxy(2e11, null, 0)],
      pericentre: 26,
      eccentricity: 1,
      friction: false,
      startSeparation: 60,
    });
    const prograde = runTo(spec(0), 600).fates().A;
    const retrograde = runTo(spec(180), 600).fates().A;
    // Taken by the companion (the bridge) and loose (the tail)
    expect(prograde[1] / 2000).toBeGreaterThan(0.1);
    expect(prograde[2] / 2000).toBeGreaterThan(0.05);
    expect((retrograde[1] + retrograde[2]) / 2000).toBeLessThan(0.01);
  }, 60_000);

  it('makes a bound pair that would swing apart again and again sink together and merge when friction is on', () => {
    const spec = (friction: boolean): EncounterSpec => ({ ...encounterSpec({ ...COLLISION_PRESETS.mice, stars: 200, seed: 1 }), friction });
    const watch = (friction: boolean) => {
      const enc = new GalaxyEncounter(spec(friction));
      const w = new MergerWatch(enc.spec.galaxies[0].scale + enc.spec.galaxies[1].scale);
      while (enc.t < 3000) {
        enc.step();
        w.see(enc.t, enc.separation());
      }
      return { merged: w.merged, separation: enc.separation() };
    };
    const without = watch(false);
    const withIt = watch(true);
    expect(without.merged).toBeNull();
    expect(withIt.merged).not.toBeNull();
    // Not at the first pass: they swing apart and fall back first
    expect(withIt.merged!).toBeGreaterThan(1000);
    expect(withIt.separation).toBeLessThan(5);
  }, 60_000);

  it('makes a ring when a heavy enough companion plunges through the middle, and none when it passes wide, is too light or moves in the disc’s plane', () => {
    expect(ringCheck({ massRatio: 0.3, pericentre: 1, tilt: 90 }).ring).toBe(true);
    expect(ringCheck({ massRatio: 0.3, pericentre: 3, tilt: 70 }).ring).toBe(true);
    expect(ringCheck({ massRatio: 0.3, pericentre: 20, tilt: 90 }).ring).toBe(false);
    expect(ringCheck({ massRatio: 0.3, pericentre: 6, tilt: 90 }).ring).toBe(false);
    expect(ringCheck({ massRatio: 0.05, pericentre: 1, tilt: 90 }).ring).toBe(false);
    expect(ringCheck({ massRatio: 0.3, pericentre: 1, tilt: 0 }).ring).toBe(false);
    // An untouched disc has no ring
    const enc = new GalaxyEncounter(encounterSpec({ ...COLLISION_PRESETS.ring, stars: 3000, seed: 1 }));
    expect(isRing(ringReading(enc, 0))).toBe(false);
  }, 60_000);

  it('builds its presets as described', () => {
    const [A, B] = collisionGalaxies({ ...COLLISION_PRESETS.antennae, stars: 1000, seed: 1 });
    expect(A.mass).toBe(B.mass);
    expect(A.disc!.count + B.disc!.count).toBe(1000);
    // Toomre's discs reach 0.75 of the closest approach
    close(A.disc!.outer / COLLISION_PRESETS.antennae.pericentre, 0.77, 0.03, 'disc over closest approach');
    // Both discs tilted 60° to the orbit
    expectNear((Math.acos(A.disc!.axis[2]) * 180) / Math.PI, 60, 1e-9, 'tilt A');
    expectNear((Math.acos(B.disc!.axis[2]) * 180) / Math.PI, 60, 1e-9, 'tilt B');
    const [, ring] = collisionGalaxies({ ...COLLISION_PRESETS.ring, stars: 1000, seed: 1 });
    expect(ring.disc).toBeUndefined();
    close(ring.scale, 6 * Math.cbrt(0.3), 1e-12, 'companion scaled by the cube root of its mass');
    for (const p of Object.keys(COLLISION_PRESETS) as (keyof typeof COLLISION_PRESETS)[]) expect(presetOf({ ...COLLISION_PRESETS[p], stars: 50_000, seed: 3 })).toBe(p);
    expect(presetOf({ ...COLLISION_DEFAULTS, pericentre: 27 })).toBeNull();
  });

  it('pulls tails out of the Antennae and the Mice', () => {
    for (const p of ['antennae', 'mice'] as const) {
      const enc = runTo(encounterSpec({ ...COLLISION_PRESETS[p], stars: 2000, seed: 1 }), 500);
      const f = enc.fates();
      expect((f.A[2] + f.B[2]) / 2000, p).toBeGreaterThan(0.05);
    }
  }, 60_000);
});

describe('the encounter’s worker protocol', () => {
  it('loads, steps to a time, and runs at the time warp asked for', () => {
    const messages: CollisionMessage[] = [];
    let clock = 0;
    const host = createCollisionHost((m) => messages.push(m), () => clock);
    const config: CollisionConfig = { ...COLLISION_DEFAULTS, stars: 500, friction: false };
    host.receive({ type: 'load', config });
    expect(messages[0].type).toBe('loaded');
    const first = messages[1] as CollisionState;
    expect(first.type).toBe('state');
    expect(first.positions.length).toBe(1500);
    expect(first.t).toBeLessThan(0);
    host.receive({ type: 'advance', t: 0 });
    const atPeri = messages[messages.length - 1] as CollisionState;
    expectNear(atPeri.t, 0, 1e-9, 'time');
    close(atPeri.closest, config.pericentre, 0.1, 'closest so far');
    // 30 Myr a second for 0.2 s of clock: 6 steps of 1 Myr
    host.receive({ type: 'run', rate: 30 });
    clock += 200;
    host.tick();
    const after = messages[messages.length - 1] as CollisionState;
    expectNear(after.t, 6, 1e-9, 'six steps');
    expect(after.running).toBe(true);
    host.receive({ type: 'pause' });
    expect(host.running).toBe(false);
  });

  it('describes the encounter in words', () => {
    const enc = runTo(encounterSpec({ ...COLLISION_DEFAULTS, stars: 400 }), 300);
    const sample = { t: enc.t, separation: enc.separation(), speed: enc.relativeSpeed() / KMS_KPC, fates: enc.fates(), ring: ringReading(enc, 0) };
    const text = collisionCaption(COLLISION_DEFAULTS, { type: 'loaded', config: COLLISION_DEFAULTS, galaxies: enc.spec.galaxies as never, owner: enc.stars.owner, startRadius: enc.stars.startRadius, start: -900, end: 1500 }, sample, null, 20);
    expect(text).toMatch(/^The Antennae, after Toomre and Toomre \(1972\)/);
    expect(text).toContain('300 million years after the closest approach');
    const f = fateShares(sample);
    expectNear(f.home + f.taken + f.loose, 1, 1e-12, 'shares');
  });
});

describe('stars don’t collide', () => {
  it('gives the chapter’s numbers', () => {
    const n = crossingNumbers(300);
    close(n.meanFreePath, 1.6e15, 0.03, 'mean free path, pc');
    close(n.meanFreePath / 30_000, 5e10, 0.06, 'fifty billion galaxies across');
    close(n.chance, 2e-11, 0.06, 'chance per star');
    close(n.hits, 2, 0.06, 'about two hits');
    close(Math.sqrt(n.focusing - 1) * 300, 618, 0.01, 'escape speed at contact, km/s');
    close(n.focusing, 5.2, 0.02, 'focusing at 300 km/s');
    close(n.focusedHits, 10, 0.03, 'about ten in all');
    expect(CROSSING.stars).toBe(1e11);
    // A grain of sand (1 mm) for the Sun: Proxima Centauri (1.302 pc) is about 30 km away
    close(((1.302 * PARSEC) / (2 * R_SUN)) * 1e-3 * 1e-3, 30, 0.05, 'km to the next grain');
    // Fewer hits for faster stars, as a property
    fc.assert(fc.property(fc.double({ min: 50, max: 2000, noNaN: true }), (v) => stellarCollisions({ ...CROSSING, speed: v * 1.1 }).focusedHits < stellarCollisions({ ...CROSSING, speed: v }).focusedHits));
  });
});

describe('the Local Group', () => {
  it('uses Astropy’s Galactocentric frame', () => {
    const centre = galactocentric(SUN_FRAME.centreRa, SUN_FRAME.centreDec, SUN_FRAME.distance, 0, 0, 0, SUN_FRAME);
    for (const c of centre.x) expectNear(c, 0, 1e-9, 'the Galactic Centre');
    const sun = galactocentric(0, 0, 0, 0, 0, 0, SUN_FRAME);
    // Tilted by the Sun's height: x = −√(d² − z²)
    expectNear(sun.x[0], -Math.sqrt(8.122 ** 2 - 0.0208 ** 2), 1e-9, 'Sun x');
    expectNear(sun.x[1], 0, 1e-9, 'Sun y');
    expectNear(sun.x[2], 0.0208, 1e-6, 'Sun z');
    for (let a = 0; a < 3; a++) expectNear(sun.v[a], SUN_FRAME.velocity[a], 1e-9, `Sun v${a}`);
    // The north Galactic pole is up, to within the frame's tilt
    const pole = galactocentric(192.85948, 27.12825, 1e3, 0, 0, 0, SUN_FRAME);
    expect(Math.acos(pole.x[2] / Math.hypot(...pole.x))).toBeLessThan((0.5 * Math.PI) / 180);
    // Proper motion in µas/yr at a kpc is 4.74 × 10⁻³ km/s: 100 km/s across Andromeda's 761 kpc is 28 µas/yr
    close(100 / (4.740470446e-3 * 761), 27.7, 0.01, 'µas/yr');
  });

  it('puts Andromeda where the papers do: 765 kpc away, coming in at about 110 km/s, with Sawala and colleagues’ 76 km/s sideways', () => {
    const best = relativeMotion(mostLikelyLocalGroup(SAWALA_2025, SUN_FRAME));
    expectNear(best.distance, 765, 1, 'distance, kpc');
    expectNear(best.radial, -114.5, 1.5, 'radial speed, km/s');
    // Their quoted "most likely" sideways speed is the median of the samples
    const vt = Array.from({ length: 2000 }, (_, k) => relativeMotion(sampleLocalGroup(SAWALA_2025, SUN_FRAME, 1, k)).tangential).sort((a, b) => a - b);
    expectNear(vt[1000], 76, 3, 'median sideways speed');
    // Their "perfectly radial" proper motion gives almost none
    const radial: LocalGroupData = { ...SAWALA_2025, M31: { ...SAWALA_2025.M31, pmRaCosDec: [38.03, 1], pmDec: [-21.37, 1] } };
    expect(relativeMotion(mostLikelyLocalGroup(radial, SUN_FRAME)).tangential).toBeLessThan(5);
    // Wu and colleagues' motion is more nearly head on
    expect(relativeMotion(mostLikelyLocalGroup(WU_2026, SUN_FRAME)).tangential).toBeLessThan(30);
  }, 60_000);

  it('builds NFW halos for 200 times Planck 2018’s critical density', () => {
    close(CRITICAL_DENSITY, 127.1, 0.002, 'critical density, M☉/kpc³');
    const h = nfwHalo(1e12, 10);
    close(h.r200, 211, 0.005, 'r200 of the Milky Way');
    close(h.vmax, 172, 0.005, 'its highest circular speed');
    // The density adds up to M200 inside r200
    let m = 0;
    const N = 20_000;
    for (let i = 0; i < N; i++) {
      const r = ((i + 0.5) / N) * h.r200;
      m += 4 * Math.PI * r * r * nfwDensity(r, h) * (h.r200 / N);
    }
    close(m, 1e12, 1e-3, 'mass inside r200');
    expectNear(nfwShape(h.c), Math.log(11) - 10 / 11, 1e-15, 'g(c)');
    // Zentner & Bullock's dispersion peaks below V_max near the scale radius
    const s = [0.3, 1, 3].map((x) => nfwDispersion(x * h.rs, h));
    expect(s[1]).toBeGreaterThan(s[0]);
    expect(s[1]).toBeLessThan(h.vmax);
    // Jethwa et al.'s Coulomb length
    expectNear(coulombLength(21.1), 32.42, 1e-9, 'ε for the Milky Way');
    expectNear(coulombLength(5), 2.25, 1e-12, 'ε for a small halo');
  });

  it('draws the same future from the same seed and index, and narrowing pulls every draw towards the most likely values', () => {
    const a = sampleLocalGroup(SAWALA_2025, SUN_FRAME, 1, 7);
    const b = sampleLocalGroup(SAWALA_2025, SUN_FRAME, 1, 7);
    const c = sampleLocalGroup(SAWALA_2025, SUN_FRAME, 1, 8);
    expect(a).toEqual(b);
    expect(a[1].mass).not.toBe(c[1].mass);
    const best = mostLikelyLocalGroup(SAWALA_2025, SUN_FRAME);
    const half = sampleLocalGroup(SAWALA_2025, SUN_FRAME, 1, 7, { m31Motion: 1, masses: 0.5, rest: 1 });
    expectNear(half[1].mass - best[1].mass, (a[1].mass - best[1].mass) / 2, 1, 'half the mass offset');
    // Draws are cut at two standard deviations
    for (let k = 0; k < 300; k++) {
      const s = sampleLocalGroup(SAWALA_2025, SUN_FRAME, 3, k);
      expect(Math.abs(s[0].mass - 1e12)).toBeLessThanOrEqual(0.4e12 + 1);
    }
  });

  it('gives Sawala and colleagues’ odds of a merger within 10 billion years, from their measurements', () => {
    const odds = (include: LocalGroupConfig['include'], set: LocalGroupConfig['set'] = 'sawala2025', n = 400) => {
      const config = { ...LOCAL_GROUP_DEFAULTS, set, include };
      let merged = 0;
      for (let k = 0; k < n; k++) if (future(config, k, false).merger !== null) merged++;
      return merged / n;
    };
    const s = LOCAL_GROUP_ODDS.sawala2025;
    // 400 futures each: two standard errors are about 5%, and the methods differ a little
    expectNear(odds({ M33: false, LMC: false }), s.two, 0.06, 'the two alone');
    expectNear(odds({ M33: true, LMC: false }), s.withM33, 0.08, 'with M33');
    expectNear(odds({ M33: false, LMC: true }), s.withLmc, 0.06, 'with the LMC');
    expectNear(odds({ M33: true, LMC: true }), s.four, 0.06, 'all four');
    // M33 raises the odds and the LMC lowers them
    expect(odds({ M33: true, LMC: false })).toBeGreaterThan(odds({ M33: false, LMC: false }));
    expect(odds({ M33: false, LMC: true })).toBeLessThan(odds({ M33: false, LMC: false }));
    expectNear(odds({ M33: true, LMC: true }, 'wu2026'), LOCAL_GROUP_ODDS.wu2026.four, 0.06, 'Wu and colleagues, all four');
  }, 60_000);

  it('merges the LMC into the Milky Way first in every future, finds Sawala and colleagues’ median merger time, and few mergers within 5 billion years', () => {
    const futures = Array.from({ length: 300 }, (_, k) => ({ index: k, ...future(LOCAL_GROUP_DEFAULTS, k, false) }));
    const lmcFirst = futures.filter((f) => {
      const lmc = f.satellites.find((s) => s.name === 'LMC');
      return lmc && lmc.into === 'MW' && (f.merger === null || lmc.at < f.merger);
    }).length;
    expect(lmcFirst / 300).toBeGreaterThan(0.98);
    const o = oddsOf(futures);
    expectNear(o.median! / 1000, LOCAL_GROUP_ODDS.sawala2025.median, 0.5, 'median merger time, Gyr');
    expect(o.within5).toBeLessThan(0.06);
    expect(o.lmc).toBeGreaterThan(0.98);
  }, 60_000);

  it('gets the same futures from steps of 1 and 2 million years', () => {
    let differ = 0;
    for (let k = 0; k < 120; k++) {
      const galaxies = sampleLocalGroup(SAWALA_2025, SUN_FRAME, 1, k);
      const one = integrateLocalGroup(galaxies, { dt: 1 });
      const two = integrateLocalGroup(galaxies, { dt: 2 });
      if ((one.merger === null) !== (two.merger === null)) differ++;
      else if (one.merger !== null) expectNear(two.merger!, one.merger, 250, `merger time, future ${k}`);
    }
    expect(differ).toBeLessThanOrEqual(2);
  }, 60_000);

  it('records the Milky Way–Andromeda distance and path in the plane of their orbit', () => {
    const f = integrateLocalGroup(choose(mostLikelyLocalGroup(SAWALA_2025, SUN_FRAME), { M33: false, LMC: false }), { dt: 2, recordEvery: 50 });
    expectNear(f.distances[0], 765, 1, 'distance now');
    expectNear(f.path[0], 765, 1, 'along the line between them');
    expectNear(f.path[1], 0, 1e-6, 'no sideways offset yet');
    expectNear(f.path[2], 0, 1e-6, 'in the plane');
    // A two-body orbit stays in its plane
    for (let k = 0; k < f.distances.length && Number.isFinite(f.distances[k]); k++) expectNear(f.path[3 * k + 2], 0, 1e-3, `out of plane at ${k}`);
    // Without friction, the pair doesn't merge
    expect(integrateLocalGroup(choose(mostLikelyLocalGroup(SAWALA_2025, SUN_FRAME), { M33: false, LMC: false }), { dt: 2, friction: false }).merger).toBeNull();
  });

  it('streams futures from its worker host in batches, and starts again on a new request', () => {
    const messages: LocalGroupMessage[] = [];
    let clock = 0;
    const host = createLocalGroupHost((m) => messages.push(m), () => (clock += 1), 15);
    host.receive({ type: 'run', config: { ...LOCAL_GROUP_DEFAULTS, count: 40 } });
    while (host.running) host.tick();
    const done = messages.filter((m) => m.type === 'futures');
    expect(done.length).toBeGreaterThan(1);
    const last = done[done.length - 1];
    expect(last.type === 'futures' && last.finished && last.done === 40).toBe(true);
    const all = done.flatMap((m) => (m.type === 'futures' ? m.futures : []));
    expect(all.map((f) => f.index)).toEqual(Array.from({ length: 40 }, (_, k) => k));
    expect(done.flatMap((m) => (m.type === 'futures' ? m.tracks : [])).length).toBe(40);
    host.receive({ type: 'run', config: { ...LOCAL_GROUP_DEFAULTS, count: 5 } });
    host.tick();
    const next = messages[messages.length - 1];
    expect(next.type === 'futures' && next.job === 2).toBe(true);
  });

  it('describes the odds in words, with the published share once finished', () => {
    const futures = Array.from({ length: 50 }, (_, k) => ({ index: k, merger: k % 2 ? 7000 : null, closest: 30, satellites: [] }));
    const o = oddsOf(futures);
    expectNear(o.share, 0.5, 1e-12, 'share');
    const text = localGroupCaption(LOCAL_GROUP_DEFAULTS, o, true);
    expect(text).toContain('the Milky Way, Andromeda, M33 and the Large Magellanic Cloud');
    expect(text).toContain('in 50% of the futures');
    expect(text).toContain('Sawala et al. 2025 found 54%.');
    const curve = mergedBy(o.times, o.n);
    expect(curve[0]).toEqual({ x: 0, y: 0 });
    expect(curve[curve.length - 1]).toEqual({ x: 10, y: 50 });
  });
});

describe('the interactive question', () => {
  it('marks a ring galaxy right and the starting flyby wrong, with a hint', () => {
    expect(checkRing({ massRatio: 0.3, pericentre: 1, tilt: 90 }).correct).toBe(true);
    expect(checkRing({ massRatio: 0.2, pericentre: 1, tilt: 90 }).correct).toBe(true);
    expect(checkRing(RING_START).correct).toBe(false);
    expect(checkRing({ massRatio: 0.05, pericentre: 1, tilt: 90 }).correct).toBe(false);
  }, 60_000);
});

describe('Chapter 31 in the course', () => {
  it('is written, with its sections, glossary terms, timeline and dated facts, and Part III is out', () => {
    const chapter = CHAPTERS.find((c) => c.number === 31)!;
    expect(chapter.load).toBeDefined();
    expect(chapter.optional).toBe(true);
    expect(chapter.sections).toEqual(['Bridges and tails', 'Stars don’t collide', 'The Milky Way and Andromeda', 'Engines in the middle', 'The door to cosmology']);
    for (const id of ['dynamical-friction', 'ring-galaxy', 'elliptical-galaxy', 'local-group', 'quasar', 'redshift']) expect(GLOSSARY).toHaveProperty(id);
    expect(TIMELINE.filter((e) => e.chapter === 31).length).toBeGreaterThanOrEqual(15);
    for (let i = 1; i < TIMELINE.length; i++) expect(TIMELINE[i].year).toBeGreaterThanOrEqual(TIMELINE[i - 1].year);
    expect(AS_OF).toHaveProperty('localGroup');
    expect(LOCAL_GROUP_ODDS.asOf).toBe('November 2026');
    expect(TEXTBOOK_COLLISION.merger).toBeGreaterThan(TEXTBOOK_COLLISION.firstPass);
    // Every chapter is written, so every part is out
    expect(CHAPTERS.every((c) => c.load)).toBe(true);
    expect(PARTS.every(partReady)).toBe(true);
    expect(partsComplete()).toBe('Parts I, II and III are complete');
  });
});
