import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { brownDwarfLuminosity, HYDROGEN_BURNING_LIMIT } from '../src/core/stellar/brownDwarfs';
import {
  BROWN_DWARF_KW,
  brownDwarfLife,
  clampStar,
  FORGE_LIMITS,
  otherModels,
  parseStars,
  snapStar,
  starToken,
  stateOf,
  summarise,
  type ForgeStar,
} from '../src/core/stellar/forge';
import { fateOf, lifeOf } from '../src/core/stellar/lives';
import { heliumCoreIfKept, keptMassFate, PISN_ONSET, DIRECT_COLLAPSE_ONSET } from '../src/core/stellar/pairInstability';
import type { PmsTrack } from '../src/core/stellar/pms';
import { computeStellar, type LifeAnswer } from '../src/core/stellar/requests';
import bhac15 from '../src/data/bhac15.json';
import { fromQuery, presetState, toQuery } from '../src/lab/starForge/link';
import { describeNow, forgeRange, layersOf } from '../src/lab/starForge/model';
import { PRESETS } from '../src/lab/starForge/presets';
import { expectNear } from './helpers';

/** The Star Forge: its model (src/core/stellar/forge.ts), its links and its presets' claims. */

const TRACKS = bhac15.tracks as PmsTrack[];
const life = (s: ForgeStar) => summarise(s, s.mass < HYDROGEN_BURNING_LIMIT ? brownDwarfLife(s.mass, TRACKS) : lifeOf(s.mass, s.z, { windScale: s.wind }));
const presetStars = (id: string) => PRESETS.find((p) => p.id === id)!.stars!;

describe('the inputs', () => {
  it('are clamped to their limits, with a note for each that moved', () => {
    const c = clampStar({ mass: 500, z: 0.00001, wind: 2 });
    expect(c.star).toEqual({ mass: 300, z: 0.0001, wind: 2 });
    expect(c.notes).toHaveLength(2);
    expect(c.notes[0]).toContain('300 M☉');
    expect(clampStar({ mass: Number.NaN, z: 0.02, wind: 1 }).star.mass).toBe(1);
  });

  it('always end up inside the limits, snapped so nearby slider positions give the same star', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e3, max: 1e4, noNaN: true }), fc.double({ min: -1, max: 1, noNaN: true }), fc.double({ min: -5, max: 10, noNaN: true }), (mass, z, wind) => {
        const { star } = clampStar({ mass, z, wind });
        expect(star.mass).toBeGreaterThanOrEqual(FORGE_LIMITS.mass[0]);
        expect(star.mass).toBeLessThanOrEqual(FORGE_LIMITS.mass[1]);
        expect(star.z).toBeGreaterThanOrEqual(FORGE_LIMITS.z[0]);
        expect(star.z).toBeLessThanOrEqual(FORGE_LIMITS.z[1]);
        expect(star.wind).toBeGreaterThanOrEqual(0);
        expect(star.wind).toBeLessThanOrEqual(3);
        expect(snapStar(star)).toEqual(star);
      }),
    );
  });
});

describe('a life summed up', () => {
  it('gives the Sun 11 billion years on the main sequence, a red giant over 200 Suns wide and a 0.52 M☉ white dwarf', () => {
    const sun = life({ mass: 1, z: 0.02, wind: 1 });
    expectNear(sun.msEnd / 1000, 11, 0.2, 'main sequence, Gyr');
    expect(sun.largest.R).toBeGreaterThan(200);
    expect(sun.fate.kind).toBe('co-wd');
    expectNear(sun.fate.remnant, 0.52, 0.01, 'white dwarf');
    expect(sun.zone).toBe('fitted');
    expect(sun.other).toBeNull();
    expect(stateOf(sun, 4570)!.kw).toBe(1);
    expect(stateOf(sun, sun.death + 1)!.kw).toBe(11);
  });

  it('has the phases in order, ending in the remnant, and the remnant never heavier than the star', () => {
    fc.assert(
      fc.property(fc.double({ min: Math.log10(0.1), max: Math.log10(100), noNaN: true }), (logM) => {
        const s = snapStar({ mass: 10 ** logM, z: 0.02, wind: 1 });
        const l = life(s);
        for (let i = 1; i < l.phases.length; i++) expect(l.phases[i].start).toBeGreaterThanOrEqual(l.phases[i - 1].start);
        expect(l.fate.remnant).toBeLessThanOrEqual(s.mass);
        expect(l.msEnd).toBeLessThanOrEqual(l.death);
      }),
      { numRuns: 25 },
    );
  });

  it('says “nothing” after a star leaves nothing, and caps a pulsing star’s black hole', () => {
    const l = life({ mass: 150, z: 0.0001, wind: 0.1 });
    expect(l.fate.pair).toBe('pulsational');
    expect(l.fate.remnant).toBeLessThanOrEqual(45);
    expect(stateOf(l, l.death + 1)!.kw).toBe(14);
  });
});

describe('brown dwarfs', () => {
  it('cool for ever along BHAC15’s tracks and Burrows’s fits, with no remnant', () => {
    const l = life({ mass: 0.05, z: 0.02, wind: 1 });
    expect(l.brownDwarf).toBe(true);
    expect(l.death).toBe(Infinity);
    expect(l.fate.kind).toBe('brown-dwarf');
    expect(l.phases).toEqual([{ kw: BROWN_DWARF_KW, start: l.track.steps[0].t, end: 10_000 }]);
    const steps = l.track.steps;
    for (let i = 1; i < steps.length; i++) expect(steps[i].L).toBeLessThanOrEqual(steps[i - 1].L * 1.0001);
    // At 1 and 10 billion years, within a factor of two of Burrows’s fits (they meet the tables where those stop).
    for (const gyr of [1, 10]) {
      const s = stateOf(l, gyr * 1000)!;
      expect(s.L / brownDwarfLuminosity(0.05, gyr * 1e9)).toBeGreaterThan(0.5);
      expect(s.L / brownDwarfLuminosity(0.05, gyr * 1e9)).toBeLessThan(2);
    }
    // A T dwarf by 10 billion years.
    expect(stateOf(l, 10_000)!.T).toBeLessThan(1300);
  });

  it('match a table exactly at its own mass, and lie between the two tables between them', () => {
    const at = (m: number) => stateOf(life({ mass: m, z: 0.02, wind: 1 }), 1000)!.L;
    const table = (m: number) => {
      const t = TRACKS.find((x) => x.mass === m)!;
      return brownDwarfLife(m, [t]).steps;
    };
    expect(at(0.04)).toBeGreaterThan(at(0.03));
    expect(at(0.05)).toBeGreaterThan(at(0.04));
    expect(at(0.035)).toBeGreaterThan(at(0.03));
    expect(at(0.035)).toBeLessThan(at(0.04));
    expectNear(brownDwarfLife(0.05, TRACKS).steps[60].L / table(0.05)[60].L, 1, 1e-9, 'exact at a table’s mass');
  });
});

describe('other models above 100 M☉', () => {
  it('put pair-instability supernovae between about 140 and 270 Suns, by Heger and Woosley’s helium cores', () => {
    expectNear(heliumCoreIfKept(140), PISN_ONSET, 0.1, 'onset');
    expectNear(heliumCoreIfKept(269), DIRECT_COLLAPSE_ONSET, 0.5, 'end');
    expect(keptMassFate(120).pair).toBe('pulsational');
    expect(keptMassFate(150)).toEqual({ heCore: (13 / 24) * 130, pair: 'pair-instability', remnant: 0 });
    expect(keptMassFate(290).pair).toBe('direct-collapse');
  });

  it('speak only for metal-poor stars above 100 Suns', () => {
    expect(otherModels({ mass: 150, z: 0.0001, wind: 1 })?.pair).toBe('pair-instability');
    expect(otherModels({ mass: 150, z: 0.02, wind: 1 })).toBeNull();
    expect(otherModels({ mass: 90, z: 0.0001, wind: 1 })).toBeNull();
  });

  it('can’t be reached by SSE itself: its helium cores stay below the pair-instability range at any metallicity and wind', () => {
    for (const z of [0.0001, 0.02]) for (const wind of [0.1, 1]) expect(fateOf(250, z, { windScale: wind }).heCore).toBeLessThan(PISN_ONSET);
  });
});

describe('the worker’s answers', () => {
  it('say so when SSE can’t follow a star, rather than failing (no winds above about 90 Suns)', () => {
    const a = computeStellar({ kind: 'life', mass: 120, z: 0.02, wind: 0 }) as LifeAnswer;
    expect(a.steps).toHaveLength(0);
    expect(a.error).toMatch(/steps/);
    expect(a.wind).toBe(0);
    const b = computeStellar({ kind: 'life', mass: 40, z: 0.02, wind: 0 }) as LifeAnswer;
    expect(b.error).toBeUndefined();
    expect(b.steps.length).toBeGreaterThan(10);
  });
});

describe('links', () => {
  it('open presets, single stars, several stars and clusters, and come back the same', () => {
    expect(fromQuery('?preset=betelgeuse').state).toEqual(presetState('betelgeuse'));
    expect(fromQuery('').state).toEqual(presetState('sun'));
    const one = fromQuery('?mass=18&z=0.004&wind=0.5').state;
    expect(one).toEqual({ mode: 'stars', stars: [{ mass: 18, z: 0.004, wind: 0.5 }], preset: null });
    expect(fromQuery(toQuery(one)).state).toEqual(one);
    const many = fromQuery('?stars=20,0.02,1;20,0.001,1;1,0.02,1').state;
    expect(many.mode === 'stars' && many.stars.length).toBe(3);
    expect(fromQuery(toQuery(many)).state).toEqual(many);
    const cluster = fromQuery('?cluster=m67&age=3900').state;
    expect(cluster).toEqual({ mode: 'cluster', cluster: 'm67', age: 3900, z: null, preset: null });
    expect(fromQuery(toQuery(cluster)).state).toEqual(cluster);
  });

  it('accept the chapters’ links: ?mass= (17.1), ?preset=sun (17.2), ?cluster=&age= (17.3), ?mass=&z= (18.4)', () => {
    expect(fromQuery('?mass=3.16').state).toEqual({ mode: 'stars', stars: [{ mass: 3.16, z: 0.02, wind: 1 }], preset: null });
    expect(fromQuery('?preset=sun').state.preset).toBe('sun');
    expect(fromQuery('?cluster=pleiades&age=120').state.preset).toBe('pleiades');
    expect(fromQuery('?mass=25&z=0.0001').state).toEqual({ mode: 'stars', stars: [{ mass: 25, z: 0.0001, wind: 1 }], preset: null });
  });

  it('clamp what is out of range and say so, and fall back on what can’t be read', () => {
    const big = fromQuery('?mass=1000');
    expect(big.state).toEqual({ mode: 'stars', stars: [{ mass: 300, z: 0.02, wind: 1 }], preset: null });
    expect(big.notes).toHaveLength(1);
    expect(fromQuery('?stars=banana').state).toEqual(presetState('sun'));
    expect(fromQuery('?stars=banana').notes).toHaveLength(1);
    expect(fromQuery('?cluster=nowhere').state).toMatchObject({ cluster: 'pleiades' });
    expect(fromQuery('?cluster=hyades&age=99999').state).toMatchObject({ age: 15000 });
    expect(parseStars('1,0.02,1;2,0.02,1;3,0.02,1;4,0.02,1;5,0.02,1')!.stars).toHaveLength(4);
    expect(starToken({ mass: 2.06, z: 0.02, wind: 1 })).toBe('2.06,0.02,1');
  });
});

describe('the views’ helpers', () => {
  it('cut a star open by size and by mass: a red giant’s core holds a large share of its mass in a sliver of its width', () => {
    const sun = life({ mass: 1, z: 0.02, wind: 1 });
    const giant = sun.track.steps.find((s) => s.kw === 3 && s.R > 50)!;
    const core = layersOf(giant)[0];
    expect(core.name).toBe('Helium core');
    expect(core.r[1]).toBeLessThan(0.01);
    expect(core.m[1]).toBeGreaterThan(0.3);
    const ms = layersOf(stateOf(sun, 4570)!);
    expect(ms.map((l) => l.name.split(':')[0])).toEqual(['Radiative zone', 'Convective envelope']);
    expectNear(ms[1].r[1] - ms[1].r[0], 0.27, 0.05, 'the Sun’s convection zone, share of the radius');
    expect(layersOf(stateOf(life({ mass: 0.2, z: 0.02, wind: 1 }), 1000)!)).toHaveLength(1);
    for (const s of sun.track.steps.filter((x) => x.kw < 10)) {
      const layers = layersOf(s);
      expectNear(layers[layers.length - 1].r[1], 1, 1e-9, 'the layers reach the surface');
      for (const l of layers) {
        expect(l.r[0]).toBeLessThanOrEqual(l.r[1]);
        expect(l.m[0]).toBeLessThanOrEqual(l.m[1]);
      }
    }
  });

  it('widen the HR diagram for brown dwarfs, and describe each stage in words', () => {
    const sun = life({ mass: 1, z: 0.02, wind: 1 });
    const bd = life({ mass: 0.02, z: 0.02, wind: 1 });
    expect(10 ** forgeRange([sun]).x[1]).toBeCloseTo(1800, 6);
    expect(10 ** forgeRange([bd]).x[1]).toBeLessThan(600);
    expect(describeNow(stateOf(sun, 4570)!)).toMatch(/^a main-sequence star, 0\.9\d times the Sun’s width$/);
    expect(describeNow(stateOf(life({ mass: 18, z: 0.02, wind: 1 }), 30)!)).toMatch(/^a neutron star \d\d km across$/);
  });
});

describe('the presets’ claims', () => {
  it('Betelgeuse: about ten million years on the main sequence, about a million burning helium as a supergiant, a neutron star of 2.0', () => {
    const l = life(presetStars('betelgeuse')[0]);
    expectNear(l.msEnd, 10, 0.5, 'main sequence, Myr');
    const helium = l.phases.find((p) => p.kw === 4)!;
    expectNear(helium.end - helium.start, 1, 0.2, 'helium burning, Myr');
    const crossing = l.phases.find((p) => p.kw === 2)!;
    expect(crossing.end - crossing.start).toBeGreaterThan(0.01);
    expect(crossing.end - crossing.start).toBeLessThan(0.1);
    expect(l.largest.R).toBeGreaterThan(1000);
    expect(l.fate.kind).toBe('neutron-star');
    expectNear(l.fate.remnant, 2.0, 0.05, 'neutron star');
  });

  it('20 Suns: a neutron star with the Sun’s metals, a black hole with a twentieth; half winds tip the metal-rich one too', () => {
    const [rich, poor] = presetStars('winds-20').map(life);
    expect(rich.fate.kind).toBe('neutron-star');
    expect(poor.fate.kind).toBe('black-hole');
    expect(life({ mass: 20, z: 0.02, wind: 0.5 }).fate.kind).toBe('black-hole');
  });

  it('100 Suns: a million Suns’ light, stripped to a helium star within four million years, a black hole of 15; at a tenth of the wind, more than twice that', () => {
    const l = life(presetStars('heavy-100')[0]);
    expect(l.brightest.L).toBeGreaterThan(1e6);
    expect(l.phases.some((p) => p.kw === 7)).toBe(true);
    expect(l.death).toBeLessThan(4);
    expectNear(l.fate.remnant, 15, 0.5, 'black hole');
    expect(life({ mass: 100, z: 0.02, wind: 0.1 }).fate.remnant).toBeGreaterThan(2 * l.fate.remnant);
  });

  it('150 Suns, almost no metals: SSE’s helium core of about 40 pulses; other models’ 70 leaves nothing', () => {
    const l = life(presetStars('pair-instability')[0]);
    expectNear(l.fate.heCore, 40, 1.5, 'SSE’s helium core');
    expect(l.fate.pair).toBe('pulsational');
    expect(l.other).toMatchObject({ pair: 'pair-instability', remnant: 0 });
    expectNear(l.other!.heCore, 70, 1, 'other models’ helium core');
  });

  it('the red dwarf lives about two hundred times as long as the Galaxy has existed; Sirius A about a billion years', () => {
    const red = life(presetStars('red-dwarf')[0]);
    expectNear(red.msEnd / 13000, 200, 30, 'Galaxy ages');
    expect(red.largest.R).toBeLessThan(1.5);
    expect(red.fate.kind).toBe('helium-wd');
    expectNear(life(presetStars('sirius')[0]).msEnd / 1000, 1, 0.15, 'Sirius A, Gyr');
  });

  it('every preset has a blurb, something to try and a simplification, and loads', () => {
    for (const p of PRESETS) {
      expect(p.blurb.length).toBeGreaterThan(40);
      expect(p.tryThis.length).toBeGreaterThan(20);
      expect(p.simplified.length).toBeGreaterThan(40);
      expect(!!p.stars !== !!p.cluster).toBe(true);
      expect(fromQuery(`?preset=${p.id}`).state.preset).toBe(p.id);
    }
  });
});
