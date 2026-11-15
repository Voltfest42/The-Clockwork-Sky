import type { BinaryEvent, BinaryStep } from '../../core/stellar/bse/outcome';
import { EVENT_WORDS, TYPE_NAMES, UNIVERSE_AGE } from '../../core/stellar/bse/outcome';
import { EVENT_LABELS } from '../../core/stellar/bse/evolve';
import type { BinaryRun, Supernova } from '../../core/stellar/bse/runs';

/**
 * The Star Forge's pairs of stars (binaries mode): the limits on what a reader
 * can ask for, Kepler's law with BSE's constants, a pair in an address, and a
 * BSE run read for the views: the state at a moment, the time axis, each
 * star's phases and the pair's, and the outcome in words.
 *
 * Units are BSE's: masses in M☉, radii and separations in R☉, luminosities in
 * L☉, times in Myr, periods in days, speeds in km/s.
 */

export interface ForgePair {
  /** Masses at birth, M☉. Star 1 is the first given, not necessarily the heavier. */
  m1: number;
  m2: number;
  /** Orbital period at birth, days. */
  period: number;
  ecc: number;
  /** Metallicity on SSE's scale (0.02 is its Sun). */
  z: number;
  /** The common-envelope efficiency α. */
  alpha: number;
  /** The kicks' dispersion, km/s. */
  sigma: number;
  /** Multiplies every wind; 1 is BSE's own. */
  wind: number;
  /** Tidal circularisation and synchronisation (BSE's tflag). */
  tides: boolean;
  /** The random seed for the kicks (BSE's idum). */
  seed: number;
}

/** What the inputs allow: BSE's masses (its formulae are fitted to 100 M☉), periods from hours to centuries, and the uncertain physics' plausible ranges. */
export const PAIR_LIMITS = {
  mass: [0.1, 100],
  period: [0.1, 1e5],
  ecc: [0, 0.95],
  z: [0.0001, 0.03],
  alpha: [0.1, 5],
  sigma: [0, 400],
  wind: [0, 3],
  /** Ran2 starts the same from a seed and its negative; Figure 28.4's cells use seeds up to about 14 million. */
  seed: [1, 99_999_999],
} as const;

/** BSE's own values (binary.in), marked on the sliders. */
export const BSE_OWN = { alpha: 3, sigma: 190, wind: 1, tides: true, seed: 29769 } as const;

/** The Forge's defaults: BSE's, except α = 1, which bse.f's comments and most modern codes use (Part III plan §13, question 4). */
export const PAIR_DEFAULTS = { alpha: 1, sigma: 190, wind: 1, tides: true, seed: 29769 } as const;

const AURSUN = 214.95;
const YEARDY = 365.24;

/** The separation (R☉) of a pair of m1 + m2 M☉ with this period (days), by Kepler's law as BSE writes it. */
export function separationOf(m1: number, m2: number, period: number): number {
  const tb = period / YEARDY;
  return AURSUN * Math.cbrt(tb * tb * (m1 + m2));
}

/** The period (days) of a pair of m1 + m2 M☉ this far apart (R☉). */
export function periodOf(m1: number, m2: number, sep: number): number {
  return (sep / AURSUN) * Math.sqrt(sep / (AURSUN * (m1 + m2))) * YEARDY;
}

/**
 * Rounds the inputs so that nearby slider positions give the same pair (and the same cached run). Masses keep four
 * figures, so that a zoo cell's companion (q times the primary) opens unchanged.
 */
export function snapPair(p: ForgePair): ForgePair {
  return {
    m1: Number(p.m1.toPrecision(4)),
    m2: Number(p.m2.toPrecision(4)),
    period: Number(p.period.toPrecision(3)),
    ecc: Math.round(p.ecc * 100) / 100,
    z: Number(p.z.toPrecision(2)),
    alpha: Number(p.alpha.toPrecision(2)),
    sigma: Math.round(p.sigma / 5) * 5,
    wind: Math.round(p.wind * 20) / 20,
    tides: p.tides,
    seed: Math.round(p.seed),
  };
}

const NAMES: Record<keyof typeof PAIR_LIMITS, [string, string]> = {
  mass: ['mass', ' M☉'],
  period: ['period', ' days'],
  ecc: ['eccentricity', ''],
  z: ['metallicity', ''],
  alpha: ['common-envelope efficiency', ''],
  sigma: ['kick dispersion', ' km/s'],
  wind: ['wind strength', '×'],
  seed: ['kick seed', ''],
};

/** Keeps a pair inside the limits, snapped, with a sentence for each value that had to move. Values that aren't numbers fall back to Algol's ancestors and BSE's switches. */
export function clampPair(input: Partial<Record<keyof ForgePair, number | boolean>>): { pair: ForgePair; notes: string[] } {
  const notes: string[] = [];
  const fit = (key: keyof ForgePair, limit: keyof typeof PAIR_LIMITS, fallback: number) => {
    const value = input[key];
    const [what, unit] = NAMES[limit];
    if (value === undefined) return fallback;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      notes.push(`That ${what} isn’t a number, so it is ${fallback}${unit}.`);
      return fallback;
    }
    const [lo, hi] = PAIR_LIMITS[limit];
    if (value < lo || value > hi) {
      const to = value < lo ? lo : hi;
      notes.push(`The ${what} runs from ${lo.toLocaleString('en-GB')} to ${hi.toLocaleString('en-GB')}${unit}, so ${value}${unit} became ${to.toLocaleString('en-GB')}${unit}.`);
      return to;
    }
    return value;
  };
  const pair = snapPair({
    m1: fit('m1', 'mass', 2.8),
    m2: fit('m2', 'mass', 1),
    period: fit('period', 'period', 1.8),
    ecc: fit('ecc', 'ecc', 0),
    z: fit('z', 'z', 0.02),
    alpha: fit('alpha', 'alpha', PAIR_DEFAULTS.alpha),
    sigma: fit('sigma', 'sigma', PAIR_DEFAULTS.sigma),
    wind: fit('wind', 'wind', PAIR_DEFAULTS.wind),
    tides: typeof input.tides === 'boolean' ? input.tides : PAIR_DEFAULTS.tides,
    seed: fit('seed', 'seed', PAIR_DEFAULTS.seed),
  });
  return { pair, notes };
}

export const samePair = (a: ForgePair, b: ForgePair) => (Object.keys(a) as (keyof ForgePair)[]).every((k) => a[k] === b[k]);

/** The next seed for "Reroll the kick": a step through the seeds that never repeats soon. */
export const rerollSeed = (seed: number) => 1 + ((seed * 7919 + 104729) % 99991);

/** The worker's request for a pair. */
export const pairRequest = (p: ForgePair) => ({ m1: p.m1, m2: p.m2, period: p.period, ecc: p.ecc, z: p.z, alpha: p.alpha, sigma: p.sigma, wind: p.wind, tides: p.tides, seed: p.seed });

// —— The address ——

/** The query for a pair: "mode=binary&m1=2.8&m2=1&p=1.8&z=0.02", with the switches only where they differ from the Forge's defaults, and a moment if one is chosen. */
export function pairQuery(p: ForgePair, t: number | null): string {
  const parts = [`mode=binary`, `m1=${p.m1}`, `m2=${p.m2}`, `p=${p.period}`];
  if (p.ecc) parts.push(`e=${p.ecc}`);
  parts.push(`z=${p.z}`);
  if (p.alpha !== PAIR_DEFAULTS.alpha) parts.push(`alpha=${p.alpha}`);
  if (p.sigma !== PAIR_DEFAULTS.sigma) parts.push(`sigma=${p.sigma}`);
  if (p.wind !== PAIR_DEFAULTS.wind) parts.push(`wind=${p.wind}`);
  if (!p.tides) parts.push('tides=0');
  if (p.seed !== PAIR_DEFAULTS.seed) parts.push(`seed=${p.seed}`);
  if (t !== null) parts.push(`t=${Number(t.toPrecision(4))}`);
  return parts.join('&');
}

/** Reads a pair from an address's query (mode=binary): the pair, the moment if one is given, and notes on anything that had to change. */
export function pairFromQuery(q: URLSearchParams): { pair: ForgePair; t: number | null; notes: string[] } {
  const num = (key: string) => (q.has(key) ? Number(q.get(key)) : undefined);
  const { pair, notes } = clampPair({
    m1: num('m1'),
    m2: num('m2'),
    period: num('p'),
    ecc: num('e'),
    z: num('z'),
    alpha: num('alpha'),
    sigma: num('sigma'),
    wind: num('wind'),
    tides: q.has('tides') ? q.get('tides') !== '0' : undefined,
    seed: num('seed'),
  });
  return { pair, t: momentFrom(q), notes };
}

/** The moment asked for (?t=, Myr), or null. */
export function momentFrom(q: URLSearchParams): number | null {
  const t = q.has('t') ? Number(q.get('t')) : NaN;
  return Number.isFinite(t) ? Math.min(UNIVERSE_AGE, Math.max(0, t)) : null;
}

// —— Reading a run ——

/** The last step at or before t (the first if t comes before it). */
export function stepAt(steps: readonly BinaryStep[], t: number): BinaryStep {
  let lo = 0;
  let hi = steps.length - 1;
  if (t <= steps[0].t) return steps[0];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (steps[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return steps[lo];
}

/** A quantity at t, interpolated between steps while neither star changes type; NaN outside the run or where `get` gives NaN. */
export function valueAt(steps: readonly BinaryStep[], t: number, get: (s: BinaryStep) => number): number {
  if (t < steps[0].t || t > steps[steps.length - 1].t) return NaN;
  const a = stepAt(steps, t);
  const i = steps.indexOf(a);
  const b = steps[Math.min(i + 1, steps.length - 1)];
  if (b === a || b.t === a.t || b.kw[0] !== a.kw[0] || b.kw[1] !== a.kw[1]) return get(a);
  return get(a) + ((t - a.t) / (b.t - a.t)) * (get(b) - get(a));
}

/** The events worth listing: everything but the run's end and the symbiotic phases' edges. */
export const storyEvents = (run: BinaryRun): BinaryEvent[] => run.events.filter((e) => e.label !== 10 && e.label !== 12 && e.label !== 13);

/**
 * The span the time slider and charts cover, Myr: to a quarter past the last event, or the universe's age if
 * anything is still going on at the end (a star still burning or overflowing, as in a cataclysmic variable).
 */
export function timeSpan(run: BinaryRun): [number, number] {
  const events = run.events.filter((e) => e.label !== 10);
  const lastEvent = events.length ? events[events.length - 1].t : 0;
  const end = run.steps[run.steps.length - 1];
  const busy = end.rrl[0] >= 1 || end.rrl[1] >= 1;
  const tEnd = busy || lastEvent === 0 ? end.t : Math.min(end.t, Math.max(lastEvent * 1.25, lastEvent + 0.5));
  return [0, tEnd];
}

/** The low end of a log time axis: a thousandth of the span, at most a million years. */
export const logStart = (tEnd: number) => Math.min(1, tEnd / 1000);

// —— Phases ——

export interface Segment {
  start: number;
  end: number;
  /** A stellar type (0–15) for a star's row; the pair's state for the pair's row. */
  kind: number | PairState;
}

export type PairState = 'apart-orbit' | 'overflow-1' | 'overflow-2' | 'contact' | 'merged' | 'unbound' | 'gone';

export const PAIR_STATE_NAMES: Record<PairState, string> = {
  'apart-orbit': 'detached',
  'overflow-1': 'star 1 fills its lobe',
  'overflow-2': 'star 2 fills its lobe',
  contact: 'contact',
  merged: 'merged into one',
  unbound: 'flying apart',
  gone: 'nothing left',
};

/** The pair's state at a step. */
export function pairState(s: BinaryStep): PairState {
  const alive = [s.kw[0] !== 15, s.kw[1] !== 15];
  if (!alive[0] && !alive[1]) return 'gone';
  if (!alive[0] || !alive[1]) return 'merged';
  if (s.sep <= 0 || s.ecc < 0 || s.ecc >= 1) return 'unbound';
  if (s.rrl[0] >= 1 && s.rrl[1] >= 1) return 'contact';
  if (s.rrl[0] >= 1) return 'overflow-1';
  if (s.rrl[1] >= 1) return 'overflow-2';
  return 'apart-orbit';
}

/** Consecutive steps with the same kind, as segments from one step's time to the next's change. */
function segmentsBy(steps: readonly BinaryStep[], kind: (s: BinaryStep) => number | PairState, tEnd: number): Segment[] {
  const out: Segment[] = [];
  for (const s of steps) {
    if (s.t > tEnd) break;
    const k = kind(s);
    const last = out[out.length - 1];
    if (last && last.kind === k) continue;
    if (last) last.end = s.t;
    out.push({ start: s.t, end: tEnd, kind: k });
  }
  return out;
}

/** Each star's types through the run, and the pair's states, up to tEnd. */
export function pairPhases(run: BinaryRun, tEnd: number): { stars: [Segment[], Segment[]]; pair: Segment[] } {
  return {
    stars: [segmentsBy(run.steps, (s) => s.kw[0], tEnd), segmentsBy(run.steps, (s) => s.kw[1], tEnd)],
    pair: segmentsBy(run.steps, pairState, tEnd),
  };
}

/** Mass-transfer episodes (either star filling its lobe), as [start, end] in Myr, up to tEnd. */
export function transferEpisodes(run: BinaryRun, tEnd: number): [number, number][] {
  return pairPhases(run, tEnd)
    .pair.filter((s) => s.kind === 'overflow-1' || s.kind === 'overflow-2' || s.kind === 'contact')
    .map((s) => [s.start, s.end]);
}

// —— Words ——

export const article = (noun: string) => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;

/** "3.5 hours", "1.8 days", "51 days", "12 years". */
export function formatPeriod(days: number): string {
  if (days < 1) return `${Number((days * 24).toPrecision(2))} hours`;
  if (days < 1000) return `${Number(days.toPrecision(days < 10 ? 2 : 3)).toLocaleString('en-GB')} days`;
  return `${Number((days / 365.25).toPrecision(2)).toLocaleString('en-GB')} years`;
}

/** "1.2 R☉", "78 R☉", "2.3 AU" (beyond 1,000 R☉). */
export function formatSeparation(rsun: number): string {
  if (rsun >= 1000) return `${Number((rsun / AURSUN).toPrecision(2)).toLocaleString('en-GB')} AU`;
  return `${Number(rsun.toPrecision(rsun < 10 ? 2 : 3)).toLocaleString('en-GB')} R☉`;
}

/** "640 years", "21 million years", "4.25 billion years". */
export function formatAge(myr: number): string {
  if (myr >= 1000) return `${Number((myr / 1000).toPrecision(3)).toLocaleString('en-GB')} billion years`;
  if (myr >= 1) return `${Number(myr.toPrecision(3)).toLocaleString('en-GB')} million years`;
  return `${Math.round(myr * 1e6).toLocaleString('en-GB')} years`;
}

/** An event's time, precise enough to tell events apart: "3.81 million years", "20.07 million years", "1,035 million years". */
export function eventTime(myr: number): string {
  if (myr === 0) return 'At birth';
  if (myr < 0.001) return `${Math.round(myr * 1e6).toLocaleString('en-GB')} years`;
  if (myr < 10) return `${Number(myr.toPrecision(3)).toLocaleString('en-GB')} million years`;
  if (myr < 100) return `${myr.toFixed(2)} million years`;
  return `${Math.round(myr).toLocaleString('en-GB')} million years`;
}

const mass = (m: number) => `${m < 10 ? m.toFixed(2) : m.toFixed(1)} M☉`;

/** One star at a step: "a red giant of 2.97 M☉, filling its Roche lobe". */
export function starWords(s: BinaryStep, k: 0 | 1): string {
  if (s.kw[k] === 15) return 'nothing';
  return `${article(TYPE_NAMES[s.kw[k]])} of ${mass(s.m[k])}${s.rrl[k] >= 1 && s.kw[1 - k] !== 15 ? ', filling its Roche lobe' : ''}`;
}

/** The pair at a step, in a sentence or two. */
export function pairWords(s: BinaryStep): string {
  const state = pairState(s);
  if (state === 'gone') return 'Nothing is left of either star.';
  if (state === 'merged') {
    const k = s.kw[0] === 15 ? 1 : 0;
    return `The stars have become one: ${starWords(s, k as 0 | 1)}.`;
  }
  const stars = `Star 1 is ${starWords(s, 0)}; star 2 is ${starWords(s, 1)}.`;
  if (state === 'unbound') return `${stars} They are no longer bound to each other.`;
  return `${stars} They orbit every ${formatPeriod(s.period)}, ${formatSeparation(s.sep)} apart${s.ecc > 0.005 ? `, with an eccentricity of ${s.ecc.toFixed(2)}` : ''}.`;
}

/** An event in words: "Roche-lobe overflow begins", "Star 1 becomes a helium star". */
export function eventWords(e: BinaryEvent, prev?: BinaryEvent): string {
  if (e.label === 2 && prev) {
    const changed = [0, 1].filter((k) => e.kw[k] !== prev.kw[k]);
    if (changed.length === 1) {
      const k = changed[0];
      if (e.kw[k] === 15) return `Star ${k + 1} is destroyed`;
      return `Star ${k + 1} becomes ${article(TYPE_NAMES[e.kw[k]])}`;
    }
  }
  if (e.label === 3 || e.label === 4) {
    const donor = e.rrl[0] >= e.rrl[1] ? 0 : 1;
    return e.label === 3 ? `Star ${donor + 1} fills its Roche lobe: mass transfer begins` : 'Mass transfer ends';
  }
  if (e.label === 6 || e.label === 7) {
    const alone = e.kw[0] === 15 ? 1 : e.kw[1] === 15 ? 0 : null;
    const base = EVENT_WORDS[EVENT_LABELS[e.label]];
    if (alone !== null && e.kw[0] + e.kw[1] !== 30) return `${base}: they become one, ${article(TYPE_NAMES[e.kw[alone]])}`;
    if (e.label === 7) return `${base}: the pair spirals in to ${formatSeparation(e.sep)}`;
    return base;
  }
  if (e.label === 9) return 'A white dwarf explodes, leaving nothing';
  return EVENT_WORDS[EVENT_LABELS[e.label]];
}

/** A supernova's kick in words; `first` says whether the pair was still at rest where it was born. */
export function kickWords(k: Supernova, first = true): string {
  const who = `Star ${k.star + 1} became ${k.kw === 14 ? 'a black hole' : 'a neutron star'} of ${mass(k.mass)}`;
  if (!k.paired) return `${who}, alone, kicked at ${Math.round(k.kick)} km/s.`;
  if (k.kick === 0 && k.kw === 14) return `${who}; BSE gives black holes no kick${k.disrupted ? ', but the mass it lost unbound the pair' : ''}.`;
  if (k.disrupted) return `${who} with a kick of ${Math.round(k.kick)} km/s, which unbound the pair: the stars fly apart at ${Math.round(k.speed)} km/s.`;
  const moved = first ? `its centre of mass was set moving at ${Math.round(k.speed)} km/s` : `its centre of mass’s velocity changed by ${Math.round(k.speed)} km/s`;
  return `${who} with a kick of ${Math.round(k.kick)} km/s; the pair stayed bound, and ${moved}.`;
}

/**
 * The pair's speed after its kicks, relative to the gas it was born from, in words: exact after one kick, a range
 * after two (BSE doesn't follow the kicks' directions relative to each other).
 */
export function speedWords(kicks: readonly Supernova[]): string | null {
  const bound = kicks.filter((k) => k.paired && !k.disrupted);
  if (!bound.length || bound.length !== kicks.length) return null;
  const speeds = bound.map((k) => k.speed);
  if (speeds.every((v) => v < 0.5)) return null;
  if (speeds.length === 1) return `The pair now moves at ${Math.round(speeds[0])} km/s relative to the gas it was born from.`;
  const [a, b] = speeds;
  return `After both kicks the pair moves at between ${Math.round(Math.abs(a - b))} and ${Math.round(a + b)} km/s relative to the gas it was born from (BSE doesn’t follow the kicks’ directions relative to each other).`;
}

/** Whether a run's time axis should start on a log scale: when most of what happens comes in its first twentieth. */
export function prefersLogTime(run: BinaryRun): boolean {
  const [, tEnd] = timeSpan(run);
  const times = storyEvents(run)
    .filter((e) => e.label !== 1)
    .map((e) => e.t)
    .sort((a, b) => a - b);
  if (!times.length) return false;
  return times[Math.floor(times.length / 2)] < tEnd / 20;
}

/** A pair's mass to three figures: "0.45 M☉", "2.8 M☉", "11.4 M☉", "100 M☉". */
export const pairMass = (m: number) => `${Number(m.toPrecision(3)).toLocaleString('en-GB')} M☉`;
