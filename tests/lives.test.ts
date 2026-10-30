import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  coolingAgeFor,
  dyingMass,
  fateBoundary,
  fateOf,
  isochrone,
  lifeOf,
  msLifetime,
  nuclearLifetime,
  phasesOf,
  stateAt,
  turnoffMass,
  whiteDwarf,
  zFromFeH,
} from '../src/core/stellar/lives';
import { computeStellar, requestKey } from '../src/core/stellar/requests';
import { stripPosition, stripTime } from '../src/viz/phases/strip';
import { expectNear } from './helpers';

/** Whole lives, isochrones and fates from the SSE port (src/core/stellar/lives.ts). */

describe('lifetimes', () => {
  it('the Sun spends about 11 billion years on the main sequence, a star of 10 Suns about 25 million', () => {
    expectNear(msLifetime(1) / 1000, 11, 0.5, 'Sun, Gyr');
    expect(msLifetime(10)).toBeGreaterThan(20);
    expect(msLifetime(10)).toBeLessThan(30);
    expect(msLifetime(0.1)).toBeGreaterThan(1e6); // a trillion years
  });

  it('heavier stars always have shorter main sequences, and nuclear lives a little longer than them', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.1, max: 90, noNaN: true }), fc.double({ min: 1.01, max: 1.5, noNaN: true }), (m, k) => {
        expect(msLifetime(m * k)).toBeLessThan(msLifetime(m));
        expect(nuclearLifetime(m)).toBeGreaterThan(msLifetime(m));
      }),
      { numRuns: 60 },
    );
  });

  it('the turn-off mass is the main-sequence lifetime turned round', () => {
    fc.assert(
      fc.property(fc.double({ min: 5, max: 20000, noNaN: true }), (age) => {
        expectNear(msLifetime(turnoffMass(age)) / age, 1, 1e-6, 'lifetime at the turn-off');
        expect(dyingMass(age)).toBeGreaterThan(turnoffMass(age));
      }),
      { numRuns: 40 },
    );
  });

  it('maps [Fe/H] onto SSE’s scale, inside its range', () => {
    expectNear(zFromFeH(0), 0.02, 1e-12, 'solar');
    expectNear(zFromFeH(-1), 0.002, 1e-12, 'a tenth');
    expect(zFromFeH(-5)).toBe(0.0001);
    expect(zFromFeH(1)).toBe(0.03);
  });
});

describe('a whole life', () => {
  const sun = lifeOf(1);

  it('runs the Sun to a white dwarf, through every giant phase in order', () => {
    expect(phasesOf(sun).map((p) => p.kw)).toEqual([1, 2, 3, 4, 5, 6, 11]);
  });

  it('runs every mass to a remnant', () => {
    for (const m of [0.1, 0.8, 3, 8, 25, 60, 150]) expect(lifeOf(m).steps.some((s) => s.kw >= 10)).toBe(true);
  });

  it('reads a track at its own steps exactly, and between them within its neighbours', () => {
    for (const s of sun.steps.filter((_, i) => i % 37 === 0)) {
      const read = stateAt(sun, s.t)!;
      expectNear(read.L / s.L, 1, 1e-12, 'L at a step');
    }
    fc.assert(
      fc.property(fc.integer({ min: 0, max: sun.steps.length - 2 }), fc.double({ min: 0, max: 1, noNaN: true }), (i, f) => {
        const [a, b] = [sun.steps[i], sun.steps[i + 1]];
        const s = stateAt(sun, a.t + f * (b.t - a.t))!;
        if (a.kw === b.kw) {
          expect(s.L).toBeGreaterThanOrEqual(Math.min(a.L, b.L) * (1 - 1e-12));
          expect(s.L).toBeLessThanOrEqual(Math.max(a.L, b.L) * (1 + 1e-12));
        }
      }),
    );
    expect(stateAt(sun, -1)).toBeNull();
  });

  it('phases follow each other with no gaps', () => {
    const phases = phasesOf(sun);
    for (let i = 1; i < phases.length; i++) expect(phases[i].start).toBe(phases[i - 1].end);
  });
});

describe('isochrones', () => {
  it('give every shining star of one age, lightest first, with giants once the cluster is old enough', () => {
    const iso = isochrone(4000);
    expect(iso.every((p) => p.kw < 10)).toBe(true);
    for (let i = 1; i < iso.length; i++) expect(iso[i].mass).toBeGreaterThan(iso[i - 1].mass);
    expect(iso.some((p) => p.kw === 3)).toBe(true);
    expect(iso.some((p) => p.kw === 4)).toBe(true);
    // The heaviest main-sequence star is the turn-off.
    const ms = iso.filter((p) => p.kw <= 1);
    expectNear(ms[ms.length - 1].mass, turnoffMass(4000), 0.01, 'turn-off');
  });

  it('match a single star run to the same age', () => {
    const iso = isochrone(700, 0.02, { msPoints: 6, giantPoints: 6 });
    for (const p of iso) {
      const life = lifeOf(p.mass);
      const s = stateAt(life, 700)!;
      expectNear(s.L / p.L, 1, 0.02, `L of ${p.mass}`);
    }
  });
});

describe('fates', () => {
  it('match the textbook at the Sun’s make-up', () => {
    expect(fateOf(0.05).kind).toBe('brown-dwarf');
    expect(fateOf(0.5).kind).toBe('helium-wd');
    const sun = fateOf(1);
    expect(sun.kind).toBe('co-wd');
    expectNear(sun.remnant, 0.52, 0.02, 'the Sun’s white dwarf');
    expect(fateOf(7).kind).toBe('one-wd');
    expect(fateOf(10).kind).toBe('neutron-star');
    expect(fateOf(30).kind).toBe('black-hole');
  });

  it('put neutron stars from about 8 Suns and black holes from about 20', () => {
    const collapse = (k: string) => k === 'neutron-star' || k === 'black-hole';
    expectNear(fateBoundary(5, 15, (f) => collapse(f.kind)), 8, 0.3, 'neutron stars');
    expectNear(fateBoundary(12, 40, (f) => f.kind === 'black-hole'), 20.5, 1.5, 'black holes');
  });

  it('never leave more than the star began with', () => {
    fc.assert(
      fc.property(fc.double({ min: Math.log(0.05), max: Math.log(120), noNaN: true }), (lm) => {
        const f = fateOf(Math.exp(lm));
        expect(f.remnant).toBeLessThanOrEqual(Math.exp(lm) * (1 + 1e-9));
      }),
      { numRuns: 25 },
    );
  });

  it('with SSE’s winds, strip even metal-poor giants before pair instability can blow them apart', () => {
    for (const m of [150, 300]) expect(fateOf(m, 0.0001).pair).toBe('core-collapse');
    // Weaker winds leave helium cores heavy enough to pulse.
    expect(fateOf(150, 0.0001, { windScale: 0.2 }).pair).toBe('pulsational');
  });
});

describe('white dwarfs', () => {
  it('cool exactly as SSE’s own white dwarfs do', () => {
    const life = lifeOf(1);
    for (const s of life.steps.filter((x) => x.kw === 11)) {
      const w = whiteDwarf(s.mt, s.t - s.epoch);
      expectNear(w.L / s.L, 1, 1e-9, `L at ${s.t}`);
      expectNear(w.R / s.R, 1, 1e-9, 'R');
    }
  });

  it('fade for ever, and the cooling age can be read back from the luminosity', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.5, max: 1.3, noNaN: true }), fc.double({ min: 0, max: 4, noNaN: true }), (m, la) => {
        const age = 10 ** la;
        expect(whiteDwarf(m, age * 1.1).L).toBeLessThan(whiteDwarf(m, age).L);
        expectNear(coolingAgeFor(m, whiteDwarf(m, age).L) / age, 1, 1e-6, 'cooling age');
      }),
      { numRuns: 50 },
    );
  });

  it('are smaller the heavier they are', () => {
    expect(whiteDwarf(1.2, 100).R).toBeLessThan(whiteDwarf(0.6, 100).R);
    expectNear(whiteDwarf(0.6, 100).R * 109.1, 1.4, 0.1, 'Earths');
  });
});

describe('the worker’s requests', () => {
  it('answer each kind and key them uniquely', () => {
    expect((computeStellar({ kind: 'isochrone', age: 1000, z: 0.02 }) as unknown[]).length).toBeGreaterThan(50);
    expect(requestKey({ kind: 'life', mass: 1, z: 0.02, wind: 1 })).not.toBe(requestKey({ kind: 'life', mass: 1, z: 0.02, wind: 0.5 }));
  });
});

describe('the life strip’s time axis', () => {
  it('puts the start at 0 and the end at 1, and its inverse round-trips, on both scales', () => {
    for (const scale of ['linear', 'before-end'] as const) {
      expectNear(stripPosition(0, 0, 12000, scale), 0, 1e-12, 'start');
      expectNear(stripPosition(12000, 0, 12000, scale), 1, 1e-12, 'end');
      fc.assert(
        fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (f) => {
          expectNear(stripPosition(stripTime(f, 0, 12000, scale), 0, 12000, scale), f, 1e-9, 'round trip');
        }),
      );
    }
  });

  it('gives the last tenth of a percent of a life a share of the strip when time runs before the end', () => {
    expect(stripPosition(11988, 0, 12000, 'linear')).toBeGreaterThan(0.99);
    expect(stripPosition(11988, 0, 12000, 'before-end')).toBeLessThan(0.6);
  });
});
