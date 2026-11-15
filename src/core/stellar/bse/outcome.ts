/**
 * Reading a BSE run: its steps and events as named fields, and what kind of
 * pair it made (Chapter 28's binary zoo). Units are BSE’s: masses in M☉, radii
 * and separations in R☉, luminosities in L☉, times in Myr, periods in days.
 */
import { M_SUN, R_SUN } from '../../constants';
import { mergerTime } from '../../gr/peters';
import { BCM, EVENT_LABELS, type BseResult } from './evolve';

/** The age of the universe, Myr. */
export const UNIVERSE_AGE = 13_800;

export interface BinaryStep {
  t: number;
  kw: [number, number];
  /** Masses and core masses, M☉. */
  m: [number, number];
  mc: [number, number];
  /** Luminosities (L☉), radii (R☉) and surface temperatures (K). */
  L: [number, number];
  R: [number, number];
  T: [number, number];
  /** Each star’s radius over its Roche lobe’s. */
  rrl: [number, number];
  /** Period in days (0 once there is no orbit), separation in R☉, eccentricity. */
  period: number;
  sep: number;
  ecc: number;
}

/** One step from a bcm row. BSE’s Teff uses its own constant (1130 L/R² in units of 1000 K); this one is the same. */
export function stepOf(row: number[]): BinaryStep {
  const two = (col: number): [number, number] => [row[col], row[col + 14]];
  const logT = two(BCM.logT);
  return {
    t: row[BCM.t],
    kw: two(BCM.kw),
    m: two(BCM.mass),
    mc: two(BCM.mc),
    L: [10 ** row[BCM.logL], 10 ** row[BCM.logL + 14]],
    R: [10 ** row[BCM.logR], 10 ** row[BCM.logR + 14]],
    T: [10 ** logT[0], 10 ** logT[1]],
    rrl: two(BCM.rrl),
    period: row[BCM.tb] > 0 ? row[BCM.tb] * 365.24 : 0,
    sep: Math.max(row[BCM.sep], 0),
    ecc: row[BCM.ecc],
  };
}

export interface BinaryEvent {
  t: number;
  m: [number, number];
  kw: [number, number];
  sep: number;
  ecc: number;
  rrl: [number, number];
  /** BSE’s label number (EVENT_LABELS). */
  label: number;
}

export const eventOf = (r: number[]): BinaryEvent => ({
  t: r[1],
  m: [r[2], r[3]],
  kw: [r[4], r[5]],
  sep: r[6],
  ecc: r[7],
  rrl: [r[8], r[9]],
  label: r[10],
});

/** What each event means, in words. */
export const EVENT_WORDS: Record<(typeof EVENT_LABELS)[number], string> = {
  '': '',
  INITIAL: 'Born on the main sequence',
  'KW CHNGE': 'A star changes type',
  'BEG RCHE': 'Roche-lobe overflow begins',
  'END RCHE': 'Roche-lobe overflow ends',
  CONTACT: 'Both stars fill their lobes: contact',
  COELESCE: 'The stars merge',
  COMENV: 'Common envelope',
  GNTAGE: 'Accreted gas makes the companion a giant again',
  'NO REMNT': 'Nothing left',
  'MAX TIME': 'The end of the run',
  DISRUPT: 'The pair comes apart',
  'BEG SYMB': 'A symbiotic star: wind accretion begins',
  'END SYMB': 'Symbiotic phase ends',
  'BEG BSS': 'A blue straggler',
};

/** Short names of the stellar types, 0–15. */
export const TYPE_NAMES = [
  'low-mass main-sequence star', 'main-sequence star', 'Hertzsprung-gap star', 'red giant', 'core-helium-burning star',
  'early-AGB star', 'thermally pulsing AGB star', 'naked helium star', 'helium Hertzsprung-gap star', 'helium giant',
  'helium white dwarf', 'carbon–oxygen white dwarf', 'oxygen–neon white dwarf', 'neutron star', 'black hole', 'nothing',
] as const;

export type Outcome =
  | 'detached'
  | 'transfer'
  | 'merger'
  | 'disrupted'
  | 'cv'
  | 'xrb'
  | 'dwd'
  | 'typeIa'
  | 'dns'
  | 'nsbh'
  | 'bbh';

export interface Classified {
  outcome: Outcome;
  /** For a pair of compact stars: whether gravitational waves bring them together within the universe’s age. */
  merges?: boolean;
  /** For a compact pair: Peters’ merger time from when the pair formed, or the time BSE took to merge them, Myr. */
  mergeTime?: number;
  /** When the compact pair formed, Myr. */
  formed?: number;
  /** The final types and masses. */
  kw: [number, number];
  m: [number, number];
}

/**
 * A pair of neutron stars or black holes: the event at which both had formed, bound, and BSE's coalescence of them, if
 * gravitational waves (which BSE follows inside 10 R☉) brought them together within the run. Null if the pair never
 * became one, or a supernova broke it.
 */
export function compactPair(events: readonly BinaryEvent[]): { formed: BinaryEvent; coalesced?: BinaryEvent } | null {
  const i = events.findIndex((e) => isCompact(e.kw[0]) && isCompact(e.kw[1]) && e.sep > 0 && e.ecc >= 0 && e.ecc < 1);
  if (i < 0) return null;
  const formed = events[i];
  const coalesced = events.slice(i + 1).find((e) => e.label === 6);
  const last = events[events.length - 1];
  const bound = isCompact(last.kw[0]) && isCompact(last.kw[1]) && last.sep > 0 && last.ecc >= 0 && last.ecc < 1;
  return bound || coalesced ? { formed, coalesced } : null;
}

const isWd = (k: number) => k >= 10 && k <= 12;
const isCompact = (k: number) => k === 13 || k === 14;
const isStar = (k: number) => k <= 9;

/**
 * Sorts a BSE run into the binary zoo, by what it became or did, in this order: a white dwarf destroyed (a Type Ia
 * candidate; not one swallowed by its companion); a pair of neutron stars or black holes still bound at the end, or
 * merged by gravitational waves (their types and masses are then those the pair formed with); a pair come apart; an X-ray binary
 * (a neutron star or black hole fed by an overflowing star) or a cataclysmic variable (a white dwarf fed so); a pair
 * of white dwarfs; two stars merged into one; any other pair that traded mass or shared an envelope; or none of
 * these: two stars that never touched.
 */
export function classify(result: BseResult): Classified {
  const events = result.bpp.map(eventOf);
  const last = events[events.length - 1];
  const kw = last.kw;
  const m = last.m;
  const base = { kw, m };
  // A white dwarf that ends as nothing exploded (or was destroyed by igniting helium), unless its companion swallowed
  // it: in a common envelope or a coalescence that leaves the other star standing, the white dwarf's mass joins it.
  for (let i = 1; i < events.length; i++) {
    const e = events[i];
    for (const s of [0, 1]) {
      if (!isWd(events[i - 1].kw[s]) || events[i - 1].kw[s] === 12 || e.kw[s] !== 15) continue;
      const swallowed = (e.label === 6 || e.label === 7) && e.kw[1 - s] !== 15;
      if (!swallowed) return { ...base, outcome: 'typeIa' };
    }
  }
  const pair = compactPair(events);
  if (pair) {
    const { formed, coalesced } = pair;
    const outcome = formed.kw[0] === 13 && formed.kw[1] === 13 ? 'dns' : formed.kw[0] === 14 && formed.kw[1] === 14 ? 'bbh' : 'nsbh';
    const t = coalesced ? coalesced.t - formed.t : mergerTime(formed.m[0] * M_SUN, formed.m[1] * M_SUN, formed.sep * R_SUN, formed.ecc) / (1e6 * 365.25 * 86400);
    return { kw: formed.kw, m: formed.m, outcome, merges: !!coalesced || formed.t + t < UNIVERSE_AGE, mergeTime: t, formed: formed.t };
  }
  if (events.some((e) => e.label === 11)) return { ...base, outcome: 'disrupted' };
  const overflow = events.filter((e) => e.label === 3);
  const fed = (test: (k: number) => boolean) =>
    overflow.some((e) => {
      const donor = e.rrl[0] >= e.rrl[1] ? 0 : 1;
      return isStar(e.kw[donor]) && test(e.kw[1 - donor]);
    });
  if (fed(isCompact)) return { ...base, outcome: 'xrb' };
  if (fed(isWd)) return { ...base, outcome: 'cv' };
  if (isWd(kw[0]) && isWd(kw[1]) && last.sep > 0) return { ...base, outcome: 'dwd' };
  if (events.some((e) => e.label === 6) || (kw[0] === 15) !== (kw[1] === 15)) return { ...base, outcome: 'merger' };
  if (events.some((e) => e.label === 3 || e.label === 5 || e.label === 7)) return { ...base, outcome: 'transfer' };
  return { ...base, outcome: 'detached' };
}
