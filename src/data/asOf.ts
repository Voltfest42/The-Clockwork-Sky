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
    checked: '2026-10',
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
    checked: '2026-11',
    what: 'record holders: the heaviest star, the coldest and the nearest brown dwarfs, the heaviest white dwarf, the heaviest neutron star, the fastest pulsar and the heaviest black hole known from a star in the Galaxy',
    where: 'src/data/records.ts (used by Chapters 16, 18, 24 and 26)',
    source: 'the literature: Kalari et al. 2022 and later for R136a1; Luhman’s and the Backyard Worlds surveys for brown dwarfs; Caiazzo et al. 2021 and later for massive white dwarfs; pulsar-timing and NICER papers for neutron stars; Gaia and X-ray binary papers for black holes',
    everyMonths: 24,
  },
  exoplanets: {
    checked: '2026-10',
    what: 'the exoplanet census (6,451 confirmed planets, 1,012 from TESS)',
    where: 'src/data/exoplanets.json (node scripts/fetch-exoplanets.ts --refresh) and the counts in src/data/exoplanets.ts (CENSUS)',
    source: 'the NASA Exoplanet Archive (exoplanetarchive.ipac.caltech.edu), table PSCompPars',
    everyMonths: 6,
  },
  exoplanetMissions: {
    checked: '2026-10',
    what: 'PLATO’s launch date (planned for January 2027)',
    where: 'src/data/exoplanets.ts (PLATO), used by Chapter 19',
    source: 'ESA’s Plato pages (esa.int/Science_Exploration/Space_Science/Plato)',
    everyMonths: 6,
  },
  k218b: {
    checked: '2026-10',
    what: 'whether dimethyl sulfide on K2-18 b is confirmed (not, as of the last check)',
    where: 'src/data/exoplanets.ts (K2_18B), and Chapter 19’s “Reading other worlds’ air”',
    source: 'the literature: Madhusudhan et al. and the reanalyses (arXiv), and NASA’s JWST news',
    everyMonths: 12,
  },
  pulsars: {
    checked: '2026-10',
    what: 'the number of pulsars known (4,503 in the ATNF catalogue v2.9.0, 6 October 2026) and of magnetars (about 30)',
    where: 'src/data/pulsars.ts (PULSAR_COUNTS), used by Chapter 26',
    source: 'the ATNF Pulsar Catalogue’s version history (atnf.csiro.au/research/pulsar/psrcat/catalogueHistory.html) and the McGill Online Magnetar Catalog',
    everyMonths: 12,
  },
  nicer: {
    checked: '2026-11',
    what: 'NICER’s neutron-star radii and the heaviest pulsars’ masses',
    where: 'src/data/neutronStars.ts, used by Figure 26.2',
    source: 'the literature: NICER papers (Riley, Miller, Choudhury, Salmi et al.) and pulsar-timing masses',
    everyMonths: 24,
  },
  tcrb: {
    checked: '2026-11',
    what: 'whether T Coronae Borealis has erupted (not, as of the last check)',
    where: 'src/data/novae.ts (T_CRB), used by Chapter 28’s “The binary zoo”',
    source: 'AAVSO’s alerts and light curve for T CrB, and the astronomical news (ATel, CBET)',
    everyMonths: 6,
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
