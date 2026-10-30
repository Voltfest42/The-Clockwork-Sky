/**
 * Facts that go out of date: counts that grow as things are found, orbits
 * that drift, dates that are announced and can slip. Each has the month it
 * was last checked, where it lives, where to check it, and how often.
 *
 * The pages show these dates ("as of March 2026"), and tests/asOf.test.ts
 * fails once a fact is overdue, so a stage can't end with a stale one: check
 * the source, update the value and the date here, and the test passes again.
 *
 * Facts about the future that can be worked out (the next eclipse, the next
 * opposition of Mars, Voyager's milestone) aren't here: the pages compute
 * them from today's date (src/site/content/Dated.tsx).
 */

export interface DatedFact {
  /** "YYYY-MM": the month it was last checked. */
  checked: string;
  /** What it is, for the test's message. */
  what: string;
  /** The files that hold it. */
  where: string;
  /** Where to check it. */
  source: string;
  /** How long it can go unchecked, months. */
  everyMonths: number;
}

export const AS_OF = {
  moons: {
    checked: '2026-03',
    what: 'the planets’ moon counts',
    where: 'src/data/planets.ts (WORLDS[].moons)',
    source: 'NASA Science’s moon pages and the IAU Minor Planet Center’s announcements',
    everyMonths: 12,
  },
  visitors: {
    checked: '2026-10',
    what: 'the interstellar visitors known',
    where: 'src/data/planets.ts (INTERSTELLAR_VISITORS)',
    source: 'the IAU Minor Planet Center’s list of interstellar objects',
    everyMonths: 12,
  },
  iss: {
    checked: '2026-10',
    what: 'the ISS’s height and period',
    where: 'src/data/gravity.ts (earth-iss) and src/data/scale.ts (ISS)',
    source: 'NASA’s ISS trajectory data, or a current orbital element set',
    everyMonths: 12,
  },
  asteroids: {
    checked: '2026-10',
    what: 'the numbered asteroids',
    where: 'src/data/asteroids.json (scripts/build-asteroids.ts) and Chapter 8’s “close to a million”',
    source: 'JPL’s Small-Body Database',
    everyMonths: 24,
  },
  gaiaDr4: {
    checked: '2026-10',
    what: 'the date of Gaia’s fourth data release',
    where: 'src/data/gaia.ts',
    source: 'ESA’s Gaia news (cosmos.esa.int/web/gaia)',
    everyMonths: 6,
  },
  elt: {
    checked: '2026-10',
    what: 'the Extremely Large Telescope being built (first light planned for March 2029)',
    where: 'src/data/telescopes.ts (BUCKETS, the ELT’s note)',
    source: 'ESO’s ELT pages (eso.org/public/telescopes-instruments/elt)',
    everyMonths: 12,
  },
  solarCycle: {
    checked: '2026-10',
    what: 'the sunspot record and the state of Cycle 25 (peaked in October 2024 at a smoothed 160.9; record to September 2026)',
    where: 'src/data/silso/sunspots.json (scripts/build-sunspots.ts), and Chapter 15’s “Cycle 25 peaked in October 2024”',
    source: 'WDC-SILSO, Royal Observatory of Belgium (sidc.be/SILSO): the monthly numbers and the table of cycle minima and maxima',
    everyMonths: 12,
  },
  records: {
    checked: '2026-10',
    what: 'record holders: the heaviest star, the coldest and the nearest brown dwarfs',
    where: 'src/data/records.ts (used by Chapter 16)',
    source: 'the literature: Kalari et al. 2022 and later for R136a1; Luhman’s and the Backyard Worlds surveys for brown dwarfs',
    everyMonths: 24,
  },
  deltaT: {
    checked: '2026-01',
    what: 'the measured values of ΔT',
    where: 'src/core/time/deltaT.ts',
    source: 'the IERS and USNO Earth-orientation data',
    everyMonths: 24,
  },
} as const satisfies Record<string, DatedFact>;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-03" → "March 2026". */
export function monthYear(checked: string): string {
  const [year, month] = checked.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** The first day a fact is overdue, as milliseconds since 1970 (UTC). */
export function dueAt(fact: DatedFact): number {
  const [year, month] = fact.checked.split('-').map(Number);
  return Date.UTC(year, month - 1 + fact.everyMonths, 1);
}
