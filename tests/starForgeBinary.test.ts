import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { classify, compactPair, eventOf, UNIVERSE_AGE } from '../src/core/stellar/bse/outcome';
import { evolveBinary } from '../src/core/stellar/bse/evolve';
import { binaryRun, FIGURE_SWITCHES, zooRow, type BinaryRun } from '../src/core/stellar/bse/runs';
import { computeStellar } from '../src/core/stellar/requests';
import { ALGOL, ZOO_MASSES, ZOO_PERIODS, zooForgeQuery } from '../src/figures/binaries28';
import { turnoffReadout } from '../src/figures/starLives';
import {
  clampPair,
  eventWords,
  kickWords,
  PAIR_DEFAULTS,
  PAIR_LIMITS,
  pairFromQuery,
  pairPhases,
  pairMass,
  pairQuery,
  pairRequest,
  pairState,
  pairWords,
  periodOf,
  prefersLogTime,
  rerollSeed,
  samePair,
  separationOf,
  snapPair,
  speedWords,
  stepAt,
  storyEvents,
  timeSpan,
  transferEpisodes,
  valueAt,
  type ForgePair,
} from '../src/lab/starForge/binary';
import { findPairPreset, PAIR_PRESETS } from '../src/lab/starForge/binaryPresets';
import { fromQuery, presetState, toQuery } from '../src/lab/starForge/link';
import { expectNear } from './helpers';

/** The Star Forge's binaries mode: its inputs, links, the reading of a BSE run, and every preset's claims. */

const runs = new Map<string, BinaryRun>();
const runOf = (p: ForgePair) => {
  const key = JSON.stringify(p);
  if (!runs.has(key)) runs.set(key, binaryRun(pairRequest(p)));
  return runs.get(key)!;
};
const preset = (id: string) => findPairPreset(id)!;
const presetRun = (id: string) => runOf(preset(id).pair);
const AURSUN = 214.95;

describe('a pair’s inputs', () => {
  it('are clamped to their limits, with a note for each that moved, and fall back for values that aren’t numbers', () => {
    const c = clampPair({ m1: 300, m2: 0.01, period: 1e6, ecc: 0.99, z: 0.02, alpha: 9, sigma: -5, wind: 1, seed: 0 });
    expect(c.pair).toMatchObject({ m1: 100, m2: 0.1, period: 1e5, ecc: 0.95, alpha: 5, sigma: 0, seed: 1 });
    expect(c.notes).toHaveLength(7);
    expect(c.notes[0]).toBe('The mass runs from 0.1 to 100 M☉, so 300 M☉ became 100 M☉.');
    expect(clampPair({ m1: Number.NaN }).pair.m1).toBe(2.8);
    expect(clampPair({}).pair).toEqual({ m1: 2.8, m2: 1, period: 1.8, ecc: 0, z: 0.02, ...PAIR_DEFAULTS });
  });

  it('always land inside the limits, snapped so nearby slider positions give the same pair (property)', () => {
    const n = (lo: number, hi: number) => fc.double({ min: lo, max: hi, noNaN: true });
    fc.assert(
      fc.property(n(-10, 500), n(-10, 500), n(-1, 1e7), n(-1, 2), n(0, 0.1), n(-1, 10), n(-100, 900), n(-1, 5), n(-10, 2e5), (m1, m2, period, ecc, z, alpha, sigma, wind, seed) => {
        const { pair } = clampPair({ m1, m2, period, ecc, z, alpha, sigma, wind, seed });
        for (const [key, limit] of [['m1', 'mass'], ['m2', 'mass'], ['period', 'period'], ['ecc', 'ecc'], ['z', 'z'], ['alpha', 'alpha'], ['sigma', 'sigma'], ['wind', 'wind'], ['seed', 'seed']] as const) {
          // Snapping rounds within a part in a thousand of the limits
          expect(pair[key]).toBeGreaterThanOrEqual(PAIR_LIMITS[limit][0] * 0.999);
          expect(pair[key]).toBeLessThanOrEqual(PAIR_LIMITS[limit][1] * 1.001);
        }
        expect(snapPair(pair)).toEqual(pair);
      }),
    );
  });

  it('turns a period into a separation and back by Kepler’s law as BSE writes it: Algol’s ancestors 9.7 R☉ apart, the Earth 1 AU from the Sun', () => {
    expectNear(separationOf(2.8, 1, 1.8), 9.714, 0.001, 'Algol, R☉');
    expectNear(separationOf(1, 3e-6, 365.24) / AURSUN, 1, 1e-6, 'the Earth, AU');
    fc.assert(
      fc.property(fc.double({ min: 0.1, max: 100, noNaN: true }), fc.double({ min: 0.1, max: 100, noNaN: true }), fc.double({ min: -1, max: 5, noNaN: true }), (m1, m2, logP) => {
        const p = 10 ** logP;
        expectNear(periodOf(m1, m2, separationOf(m1, m2, p)) / p, 1, 1e-12, 'round trip');
      }),
    );
  });

  it('rerolls the kick to a different seed each time, never leaving the limits', () => {
    let seed: number = PAIR_DEFAULTS.seed;
    const seen = new Set([seed]);
    for (let i = 0; i < 200; i++) {
      seed = rerollSeed(seed);
      expect(seed).toBeGreaterThanOrEqual(1);
      expect(seed).toBeLessThanOrEqual(PAIR_LIMITS.seed[1]);
      seen.add(seed);
    }
    expect(seen.size).toBe(201);
  });
});

describe('a pair in an address', () => {
  it('round-trips through the query, with the switches only where they differ from the defaults (property)', () => {
    fc.assert(
      fc.property(
        fc.record({
          m1: fc.double({ min: 0.1, max: 100, noNaN: true }),
          m2: fc.double({ min: 0.1, max: 100, noNaN: true }),
          period: fc.double({ min: 0.1, max: 1e5, noNaN: true }),
          ecc: fc.double({ min: 0, max: 0.95, noNaN: true }),
          z: fc.double({ min: 0.0001, max: 0.03, noNaN: true }),
          alpha: fc.double({ min: 0.1, max: 5, noNaN: true }),
          sigma: fc.integer({ min: 0, max: 400 }),
          wind: fc.double({ min: 0, max: 3, noNaN: true }),
          tides: fc.boolean(),
          seed: fc.integer({ min: 1, max: 99999 }),
        }),
        fc.option(fc.double({ min: 0, max: 13_800, noNaN: true }), { nil: null }),
        (raw, t) => {
          const pair = clampPair(raw).pair;
          const back = pairFromQuery(new URLSearchParams(pairQuery(pair, t)));
          expect(back.pair).toEqual(pair);
          expect(back.notes).toEqual([]);
          if (t === null) expect(back.t).toBeNull();
          else expectNear(back.t!, Number(t.toPrecision(4)), 1e-12, 'moment');
        },
      ),
    );
    expect(pairQuery(clampPair({ m1: 2.8, m2: 1, period: 1.8, z: 0.02 }).pair, null)).toBe('mode=binary&m1=2.8&m2=1&p=1.8&z=0.02');
  });

  it('opens binaries mode from ?mode=binary, a preset or a pair, and keeps the moment', () => {
    const plain = fromQuery('?mode=binary');
    expect(plain.state).toMatchObject({ mode: 'binary', preset: 'algol', t: null });
    const p = fromQuery('?preset=gw150914&t=6.5');
    expect(p.state).toMatchObject({ mode: 'binary', preset: 'gw150914', t: 6.5 });
    expect(toQuery(p.state)).toBe('?preset=gw150914&t=6.5');
    const own = fromQuery('?mode=binary&m1=12&m2=1&p=1230&z=0.02&seed=6&t=12100');
    expect(own.state.mode).toBe('binary');
    if (own.state.mode !== 'binary') return;
    expect(own.state.pair).toEqual(preset('millisecond-pulsar').pair);
    expect(own.state.preset).toBeNull();
    expect(toQuery(own.state)).toBe('?mode=binary&m1=12&m2=1&p=1230&z=0.02&seed=6&t=12100');
    const wild = fromQuery('?mode=binary&m1=500&m2=1&p=2');
    expect(wild.notes).toEqual(['The mass runs from 0.1 to 100 M☉, so 500 M☉ became 100 M☉.']);
    expect(presetState('cygnus-x1')).toMatchObject({ mode: 'binary', preset: 'cygnus-x1', t: null });
  });
});

describe('a run read for the views', () => {
  const run = presetRun('algol');

  it('finds the state at any moment, and interpolates within a phase only', () => {
    expect(stepAt(run.steps, -5)).toBe(run.steps[0]);
    expect(stepAt(run.steps, 911).t).toBeLessThanOrEqual(911);
    const s = stepAt(run.steps, 911);
    expect(valueAt(run.steps, s.t, (x) => x.m[0])).toBe(s.m[0]);
    expect(Number.isNaN(valueAt(run.steps, 20_000, (x) => x.m[0]))).toBe(true);
  });

  it('spans the time axis to a quarter past the last event, or to the universe’s age while something is still going on', () => {
    const [, end] = timeSpan(run);
    const last = run.events.filter((e) => e.label !== 10).at(-1)!.t;
    expectNear(end, last * 1.25, 1e-9, 'Algol');
    expect(timeSpan(presetRun('cataclysmic-variable'))[1]).toBe(UNIVERSE_AGE);
    expect(timeSpan(presetRun('millisecond-pulsar'))[1]).toBe(UNIVERSE_AGE);
  });

  it('opens on a log time axis when most of what happens comes early in a long run', () => {
    expect(prefersLogTime(run)).toBe(false);
    expect(prefersLogTime(presetRun('gw150914'))).toBe(false);
    expect(prefersLogTime(presetRun('hulse-taylor'))).toBe(true);
    expect(prefersLogTime(presetRun('cataclysmic-variable'))).toBe(true);
    expect(pairMass(11.4)).toBe('11.4 M☉');
    expect(pairMass(0.45)).toBe('0.45 M☉');
  });

  it('cuts each star’s life and the pair’s into phases that tile the span without gaps', () => {
    const [, end] = timeSpan(run);
    const phases = pairPhases(run, end);
    for (const row of [...phases.stars, phases.pair]) {
      expect(row[0].start).toBe(0);
      expect(row.at(-1)!.end).toBe(end);
      for (let i = 1; i < row.length; i++) {
        expect(row[i].start).toBe(row[i - 1].end);
        expect(row[i].kind).not.toBe(row[i - 1].kind);
      }
    }
    // Algol's first transfer starts on the main sequence at 427 million years
    const first = transferEpisodes(run, end)[0];
    expectNear(first[0], 427.4, 0.5, 'first transfer, Myr');
    expect(phases.pair.map((s) => s.kind)).toContain('merged');
  });

  it('tells the pair’s state in words, and every event', () => {
    const s = stepAt(run.steps, 911);
    expect(pairState(s)).toBe('overflow-1');
    expect(pairWords(s)).toMatch(/^Star 1 is a red giant of 0\.70 M☉, filling its Roche lobe; star 2 is a main-sequence star of 3\.10 M☉\. They orbit every 2\.9 days, 1\d\.\d R☉ apart\.$/);
    const events = storyEvents(run);
    const words = events.map((e) => eventWords(e, run.events[run.events.indexOf(e) - 1]));
    expect(words[0]).toBe('Born on the main sequence');
    expect(words).toContain('Star 1 fills its Roche lobe: mass transfer begins');
    expect(words.some((w) => w.startsWith('Common envelope'))).toBe(true);
    expect(words.every((w) => w.length > 0)).toBe(true);
  });
});

describe('the engine’s answers to the Forge', () => {
  it('passes the winds and tides through: no winds keep a lone star’s mass, and tides off leave an eccentric orbit eccentric', () => {
    const wide = { m1: 3, m2: 1, period: 1e5, ecc: 0, z: 0.02, alpha: 1, sigma: 190 };
    const windy = binaryRun({ ...wide, wind: 1 });
    const still = binaryRun({ ...wide, wind: 0 });
    const giant = (r: BinaryRun) => r.steps.filter((s) => s.kw[0] >= 2 && s.kw[0] <= 6).at(-1)!.m[0];
    expect(giant(still)).toBeCloseTo(3, 6);
    expect(giant(windy)).toBeLessThan(2.9);
    const close = { m1: 1.5, m2: 1.2, period: 5, ecc: 0.5, z: 0.02, alpha: 1, sigma: 190 };
    const at = (r: BinaryRun) => stepAt(r.steps, 1500).ecc;
    expect(at(binaryRun({ ...close, tides: true }))).toBeLessThan(0.45);
    expect(at(binaryRun({ ...close, tides: false }))).toBeCloseTo(0.5, 3);
    // The worker's request leaves the chapter's figures' answers as they were
    expect(computeStellar({ kind: 'binary', ...close })).toEqual(binaryRun(close));
  });

  it('reports each supernova’s kick: the star, the remnant, the kick and whether the pair survived', () => {
    const run = presetRun('millisecond-pulsar');
    expect(run.supernovae).toHaveLength(1);
    const [k] = run.supernovae;
    expect(k).toMatchObject({ star: 0, kw: 13, disrupted: false, paired: true });
    expectNear(k.kick, 360, 0.5, 'kick, km/s');
    expectNear(k.mass, 1.46, 0.01, 'neutron star, M☉');
    expect(kickWords(k)).toMatch(/^Star 1 became a neutron star of 1\.46 M☉ with a kick of 360 km\/s; the pair stayed bound, and its centre of mass was set moving at \d+ km\/s\.$/);
    expect(kickWords(k, false)).toMatch(/its centre of mass’s velocity changed by \d+ km\/s\.$/);
    expect(speedWords(run.supernovae)).toBe(`The pair now moves at ${Math.round(k.speed)} km/s relative to the gas it was born from.`);
    // Two kicks give a range; black holes get none
    const ht = presetRun('hulse-taylor');
    expect(ht.supernovae.map((s) => s.star)).toEqual([0, 1]);
    expect(speedWords(ht.supernovae)).toMatch(/between \d+ and \d+ km\/s/);
    for (const s of presetRun('gw150914').supernovae) expect(s.kick).toBe(0);
    expect(kickWords(presetRun('gw150914').supernovae[0])).toContain('BSE gives black holes no kick');
  });

  it('draws the same kicks for the same seed, and others for another', () => {
    const p = preset('hulse-taylor').pair;
    expect(runOf(p).supernovae).toEqual(binaryRun(pairRequest(p)).supernovae);
    const other = binaryRun(pairRequest({ ...p, seed: rerollSeed(p.seed) }));
    expect(other.supernovae[0].kick).not.toBe(runOf(p).supernovae[0].kick);
  });
});

describe('the zoo’s classifier, as corrected in Stage 28', () => {
  it('doesn’t count a white dwarf swallowed by a giant in a common envelope as a Type Ia', () => {
    // A CO white dwarf and a red giant of 1.4 M☉: the giant overflows, and the white dwarf spirals into its core
    const r = evolveBinary({ m1: 2, m2: 1.4, period: 93.9, ecc: 0, z: 0.02, tEnd: UNIVERSE_AGE }, { alpha1: 1, sigma: 190 });
    const events = r.bpp.map(eventOf);
    const swallow = events.find((e) => e.label === 7 && e.kw.includes(15))!;
    expect(swallow.kw).toEqual([15, 5]);
    // It was fed by the giant's overflow first, which the zoo's order of precedence names
    expect(classify(r).outcome).toBe('cv');
  });

  it('times a compact pair’s merger from when it formed, and counts a merger BSE itself carried out', () => {
    const run = presetRun('hulse-taylor');
    const pair = compactPair(run.events)!;
    expect(pair.coalesced).toBeDefined();
    expect(run.outcome).toMatchObject({ outcome: 'dns', merges: true });
    expectNear(run.outcome.mergeTime!, pair.coalesced!.t - pair.formed.t, 1e-9, 'merger time');
    const gw = presetRun('gw150914');
    expect(compactPair(gw.events)!.coalesced).toBeUndefined();
    expect(gw.outcome.merges).toBe(true);
    expect(gw.outcome.formed! + gw.outcome.mergeTime!).toBeLessThan(UNIVERSE_AGE);
  });
});

describe('the presets', () => {
  it('have unique ids that don’t clash with the single stars’ and clusters’, and moments inside their runs', () => {
    const ids = PAIR_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(fromQuery(`?preset=${id}`).state.mode).toBe('binary');
    expect(ids).toHaveLength(10);
    for (const p of PAIR_PRESETS) {
      expect(snapPair(p.pair)).toEqual(p.pair);
      expect(samePair(clampPair(p.pair).pair, p.pair)).toBe(true);
      expect(p.t).toBeLessThanOrEqual(timeSpan(runOf(p.pair))[1]);
    }
  });

  it.each(PAIR_PRESETS.map((p) => [p.id, p] as const))('%s ends as its blurb says', (_, p) => {
    const run = runOf(p.pair);
    expect(run.outcome.outcome).toBe(p.expect.outcome);
    if (p.expect.merges !== undefined) expect(run.outcome.merges).toBe(p.expect.merges);
    expect(run.warnings).toEqual([]);
  });

  it('makes Algol at 911 million years, as Figure 28.3 does', () => {
    const s = stepAt(presetRun('algol').steps, 911);
    expect(s.kw).toEqual([3, 1]);
    expectNear(s.m[0], 0.7, 0.02, 'giant, M☉');
    expectNear(s.period, 2.88, 0.05, 'period, days');
  });

  it('makes a cataclysmic variable: a common envelope at 475 million years, overflow onto the white dwarf at 580 million and 3.5 hours (3.2 at 590 million), a period minimum near 70 minutes', () => {
    const run = presetRun('cataclysmic-variable');
    const ce = run.events.find((e) => e.label === 7)!;
    expectNear(ce.t, 475, 2, 'common envelope, Myr');
    expect(ce.sep).toBeLessThan(2.2);
    expectNear(run.events.find((e) => e.label === 7)!.sep, 2.05, 0.05, 'after it, R☉');
    const onset = run.events.find((e) => e.label === 3 && e.kw[0] === 11)!;
    expectNear(onset.t, 582, 2, 'onset, Myr');
    expectNear(stepAt(run.steps, onset.t).period * 24, 3.46, 0.05, 'period at the onset, h');
    const s = stepAt(run.steps, 590);
    expect(s.kw).toEqual([11, 0]);
    expectNear(s.period * 24, 3.2, 0.1, 'period at 590 Myr, h');
    const cv = run.steps.filter((x) => x.t > 582 && x.rrl[1] >= 1);
    const min = Math.min(...cv.map((x) => x.period * 24 * 60));
    expect(min).toBeGreaterThan(62);
    expect(min).toBeLessThan(75);
    expect(run.outcome.m[1]).toBeLessThan(0.05);
  });

  it('destroys a 0.82 M☉ white dwarf fed by a helium star at 161 million years', () => {
    const run = presetRun('helium-type-ia');
    const boom = run.events.find((e) => e.label === 9)!;
    expectNear(boom.t, 161, 1, 'explosion, Myr');
    const before = run.events[run.events.indexOf(boom) - 1];
    expect(before.kw).toEqual([11, 7]);
    expectNear(before.m[0], 0.82, 0.01, 'white dwarf, M☉');
    expect(before.sep).toBeLessThan(1);
    expect(stepAt(run.steps, 160).kw).toEqual([11, 7]);
    expectNear(run.events.find((e) => e.label === 7)!.m[1], 1.26, 0.01, 'helium star, M☉');
  });

  it('merges two white dwarfs of 0.98 and 0.63 M☉ after four billion years, above the Chandrasekhar mass', () => {
    const run = presetRun('white-dwarf-merger');
    expect(run.events.filter((e) => e.label === 7)).toHaveLength(2);
    const merge = run.events.find((e) => e.label === 6)!;
    expect(merge.kw).toEqual([15, 15]);
    const before = run.events[run.events.indexOf(merge) - 1];
    expect(before.kw).toEqual([11, 11]);
    expectNear(before.m[0], 0.98, 0.01, 'heavier, M☉');
    expectNear(before.m[1], 0.63, 0.01, 'lighter, M☉');
    expect(before.m[0] + before.m[1]).toBeGreaterThan(1.44);
    expectNear(merge.t, 4251, 2, 'merger, Myr');
  });

  it('merges two dwarfs into a blue straggler of 1.62 M☉ at 4.8 billion years, heavier than the turn-off then', () => {
    const run = presetRun('blue-straggler');
    const merge = run.events.find((e) => e.label === 6)!;
    expectNear(merge.t, 4807, 2, 'merger, Myr');
    expect(run.events.some((e) => e.label === 14)).toBe(true);
    const s = stepAt(run.steps, 5000);
    expect(s.kw[0]).toBe(1);
    expectNear(s.m[0], 1.62, 0.01, 'merged star, M☉');
    expect(turnoffReadout(4807, 0.02).mass).toBeLessThan(1.45);
    expect(turnoffReadout(4807, 0.02).mass).toBeGreaterThan(1.15);
    const wd = run.events.find((e) => e.kw[0] === 11)!;
    expectNear(wd.t - merge.t, 2400, 50, 'until the white dwarf, Myr');
  });

  it('strips a 12 M☉ star to a helium star of 2.7 M☉, which explodes at 21 million years beside a 17 M☉ companion', () => {
    const run = presetRun('stripped-supernova');
    const rlof = run.events.filter((e) => e.label === 3 || e.label === 4);
    expect((rlof[1].t - rlof[0].t) * 1e6).toBeLessThan(60_000);
    const he = run.events.find((e) => e.kw[0] === 7)!;
    expectNear(he.m[0], 2.74, 0.02, 'helium star, M☉');
    const [k] = run.supernovae;
    expect(stepAt(run.steps, k.t - 1e-6).kw[0]).toBeGreaterThanOrEqual(7);
    expectNear(k.t, 20.98, 0.01, 'supernova, Myr');
    expect(k.disrupted).toBe(false);
    const after = run.events.find((e) => e.kw[0] === 13)!;
    expectNear(after.m[1], 17.4, 0.1, 'companion, M☉');
    expectNear(after.ecc, 0.5, 0.02, 'eccentricity');
    expect(stepAt(run.steps, 20.9).kw[0]).toBe(8);
  });

  it('makes a millisecond pulsar: a neutron star that gains 0.7 M☉ from a red giant, beside a helium white dwarf in a 51-day orbit', () => {
    const run = presetRun('millisecond-pulsar');
    const born = run.events.find((e) => e.kw[0] === 13)!;
    expectNear(born.t, 20.1, 0.1, 'neutron star, Myr');
    const last = run.events.at(-1)!;
    expect(last.kw).toEqual([13, 10]);
    expectNear(last.m[0] - born.m[0], 0.72, 0.02, 'gain, M☉');
    expectNear(last.m[1], 0.28, 0.01, 'white dwarf, M☉');
    expectNear(periodOf(last.m[0], last.m[1], last.sep), 51, 1, 'period, days');
    const lmxb = run.events.filter((e) => e.t > 1000 && (e.label === 3 || e.label === 4));
    expectNear(lmxb[1].t - lmxb[0].t, 153, 3, 'X-ray binary, Myr');
    expect(stepAt(run.steps, 12_100).rrl[1]).toBeGreaterThanOrEqual(1);
  });

  it('makes a pair like Cygnus X-1: a black hole of 16 M☉ beside an O star of 56 M☉ nearly filling its lobe, less than a week apart', () => {
    const run = presetRun('cygnus-x1');
    const s = stepAt(run.steps, 6.95);
    expect(s.kw[0]).toBe(14);
    expect(s.kw[1]).toBeLessThanOrEqual(1);
    expectNear(s.m[0], 16.2, 0.2, 'black hole, M☉');
    expectNear(s.m[1], 56, 0.5, 'O star, M☉');
    expect(s.period).toBeLessThan(7);
    expect(s.rrl[1]).toBeGreaterThan(0.9);
    expect(s.rrl[1]).toBeLessThan(1);
    expectNear(run.outcome.mergeTime!, 670, 10, 'merger time, Myr');
    expect(run.events.some((e) => e.label === 7)).toBe(false);
    // BSE's own winds make a black hole about half Cygnus X-1's mass
    const windy = runOf({ ...preset('cygnus-x1').pair, wind: 1 });
    expect(windy.supernovae[0].mass).toBeLessThan(12);
  });

  it('makes the Hulse–Taylor pulsar’s ancestors: two neutron stars of 1.46 and 1.33 M☉ in a 7.8-hour orbit, merging 1.8 billion years on', () => {
    const run = presetRun('hulse-taylor');
    const { formed } = compactPair(run.events)!;
    expectNear(formed.m[0], 1.46, 0.01, 'first, M☉');
    expectNear(formed.m[1], 1.33, 0.01, 'second, M☉');
    expectNear(periodOf(formed.m[0], formed.m[1], formed.sep) * 24, 7.8, 0.1, 'period, hours');
    expectNear(run.outcome.mergeTime! / 1000, 1.81, 0.02, 'merger, Gyr');
    const ce = run.events.find((e) => e.label === 7)!;
    expect(ce.kw).toEqual([8, 7]);
    expectNear(ce.sep / AURSUN, 0.1, 0.01, 'after the shared envelope, AU');
    expectNear(run.events.find((e) => e.kw[0] === 13)!.ecc, 0.87, 0.01, 'eccentricity after the first kick');
    expect(formed.t).toBeLessThan(preset('hulse-taylor').t);
  });

  it('makes a pair like GW150914: black holes of 31 and 30 M☉, 22 R☉ apart, merging 610 million years later', () => {
    const run = presetRun('gw150914');
    expectNear(run.supernovae[0].t, 3.81, 0.02, 'first black hole, Myr');
    expectNear(run.supernovae[0].mass, 30.2, 0.1, 'first black hole, M☉');
    expectNear(run.events.find((e) => e.label === 7)!.sep, 18.5, 0.1, 'after the shared envelope, R☉');
    const { formed } = compactPair(run.events)!;
    expectNear(formed.m[0], 30.8, 0.1, 'M☉');
    expectNear(formed.m[1], 30.1, 0.1, 'M☉');
    expectNear(formed.sep, 21.9, 0.1, 'R☉');
    expectNear(run.outcome.mergeTime!, 608, 5, 'merger, Myr');
    expect(formed.t).toBeLessThan(preset('gw150914').t);
  });
});

describe('Chapter 28’s links into the Forge', () => {
  it('open a zoo cell’s pair unchanged: every cell of three rows, light and heavy, at both metallicities and another α, ends as on the map', () => {
    const rows: [number, number, number, number][] = [
      [ZOO_MASSES[2], 0.9, 0.02, 1],
      [ZOO_MASSES[12], 0.5, 0.001, 2.5],
      [ZOO_MASSES[18], 0.9, 0.02, 1],
    ];
    for (const [m1, q, z, alpha] of rows) {
      const cells = zooRow({ m1, q, z, periods: ZOO_PERIODS, alpha, sigma: 190 });
      ZOO_PERIODS.forEach((period, j) => {
        const opened = fromQuery(`?${zooForgeQuery(m1, q, period, z, alpha)}`);
        expect(opened.notes).toEqual([]);
        if (opened.state.mode !== 'binary') throw new Error('not a pair');
        expect({ ...binaryRun(pairRequest(opened.state.pair)).outcome, m1, period }, `${m1} M☉, q ${q}, ${period} d`).toEqual(cells[j]);
      });
    }
  });

  it('open Figure 28.3’s pair as the Algol preset, at the figure’s moment', () => {
    const opened = fromQuery('?preset=algol&t=443.5');
    expect(opened.state).toMatchObject({ mode: 'binary', preset: 'algol', t: 443.5 });
    // The same run: the Forge's request only adds the switches the figure leaves at BSE's defaults
    const forge = binaryRun(pairRequest(preset('algol').pair));
    const figure = binaryRun({ ...ALGOL, ...FIGURE_SWITCHES });
    expect({ ...forge, input: null }).toEqual({ ...figure, input: null });
  });
});
