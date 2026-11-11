/**
 * The gravitational-wave merger census and the observing runs (Chapter 29).
 * The events are GWOSC's cumulative catalogue, in src/data/gwosc/events.json
 * (CC BY 4.0; credit in src/data/gwosc/README.md), written by
 * scripts/fetch-gwtc.ts. Registered in asOf.ts: "mergers" (the census and
 * its counts, every six months) and "lvkRun" (what LVK plan next). The
 * record holders are in records.ts. tests/chapter29.test.ts checks the counts
 * below against the file.
 */
import catalogue from './gwosc/events.json';

/** A value with its 90% credible interval: [median, minus (negative), plus]. */
export type Interval = readonly [number, number, number];

export interface MergerEvent {
  /** GWOSC's common name, e.g. "GW150914" or "GW230529_181500". */
  name: string;
  /** The catalogue it is in: "GWTC-1", "GWTC-2.1", "GWTC-3", "GWTC-4.1", "GWTC-5.0". */
  cat: string;
  /** The observing run: "O1", "O2", "O3a", "O3b", "O4a", "O4b". */
  run: RunId;
  /** The masses at the source, M☉ (m1 the heavier); the chirp mass and the remnant's mass. */
  m1?: Interval;
  m2?: Interval;
  mc?: Interval;
  mf?: Interval;
  /** Luminosity distance, Mpc. */
  d?: Interval;
  /** The effective spin: the spins along the orbit's axis, weighted by mass, −1 to 1. */
  chi?: Interval;
  /** Redshift, the median. */
  z?: number;
  /** The network's signal-to-noise ratio. */
  snr: number | null;
  /** The probability it is astrophysical (not given for the earliest catalogues, whose events are all confident). */
  pastro?: number;
}

export type RunId = 'O1' | 'O2' | 'O3a' | 'O3b' | 'O4a' | 'O4b';

/** The observing runs whose events are catalogued, in order. O4's third part, O4c (2025), isn't catalogued yet. */
export const RUNS: readonly { id: RunId; years: string; detectors: string }[] = [
  { id: 'O1', years: '2015–16', detectors: 'the two LIGOs' },
  { id: 'O2', years: '2016–17', detectors: 'the two LIGOs, and Virgo for its last month' },
  { id: 'O3a', years: '2019', detectors: 'the two LIGOs and Virgo' },
  { id: 'O3b', years: '2019–20', detectors: 'the two LIGOs and Virgo' },
  { id: 'O4a', years: '2023–24', detectors: 'the two LIGOs, and KAGRA for its first month' },
  { id: 'O4b', years: '2024–25', detectors: 'the two LIGOs and Virgo' },
];

export const MERGERS = catalogue.events as readonly MergerEvent[];

/** The census's size when events.json was fetched, as the chapter quotes it. */
export const MERGER_CENSUS = { count: 391, withMasses: 282, fetched: catalogue.fetched, asOf: 'November 2026' } as const;

/** GWTC-5.0, the latest catalogue (26 May 2026): 161 new candidates from O4b, all consistent with pairs of black holes, 390 in all with a probability of at least a half of being real. */
export const LATEST_CATALOGUE = { name: 'GWTC-5.0', published: 'May 2026', fresh: 161, total: 390, run: 'O4b' } as const;

/** O4: 24 May 2023 to 18 Nov 2025, about 250 candidates announced as they happened. */
export const O4 = { from: '24 May 2023', to: '18 November 2025', alerts: 250 } as const;

/**
 * What LVK plan next (their observing-plans page, 15 October 2026 update): upgrades and commissioning now; a
 * six-month intermediate run, IR1, aimed at mid-January 2027, with LIGO and Virgo; the fifth long run, O5, with its
 * timeline still in discussion. Registered in asOf.ts as "lvkRun".
 */
export const NEXT_RUN = { name: 'IR1', length: 'six-month', target: 'mid-January 2027', asOf: 'November 2026' } as const;

/** The date of an event, from its name: "GW150914" → "14 September 2015". */
export function eventDate(name: string): { iso: string; text: string; year: number } {
  const m = /^GW(\d\d)(\d\d)(\d\d)/.exec(name);
  if (!m) throw new Error(`No date in ${name}`);
  const year = 2000 + Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return { iso: `${year}-${m[2]}-${m[3]}`, text: `${day} ${months[month - 1]} ${year}`, year };
}

/** The famous events, with what each is famous for. */
export const FAMOUS_MERGERS: readonly { name: string; note: string }[] = [
  { name: 'GW150914', note: 'The first gravitational waves detected: two black holes more than a billion light-years away.' },
  { name: 'GW170817', note: 'Two neutron stars, with a gamma-ray burst 1.7 s later and a kilonova: the first merger seen in light as well.' },
  { name: 'GW190814', note: 'A black hole of 23 Suns and something of 2.6: the heaviest neutron star, or the lightest black hole, known.' },
  { name: 'GW190521', note: 'A remnant of about 150 Suns: the first black hole of intermediate mass seen forming.' },
  { name: 'GW200115_042309', note: 'A black hole swallowing a neutron star.' },
  { name: 'GW230529_181500', note: 'A neutron star and an object of 2.5–4.5 Suns, in the gap between the heaviest neutron stars and the lightest black holes.' },
  { name: 'GW231123_135430', note: 'The heaviest merger yet, both black holes spinning fast; the lighter one in the pair-instability gap. Perhaps each was itself made by a merger.' },
  { name: 'GW250114_082203', note: 'The loudest yet: its ringing showed two tones and confirmed Hawking’s rule that a black hole’s area never shrinks.' },
];
