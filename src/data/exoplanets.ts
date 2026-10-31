/**
 * Facts about other worlds that change: the census's size, missions' dates
 * and disputed discoveries. Registered in asOf.ts ("exoplanets",
 * "exoplanetMissions", "k218b"); Chapter 19 takes its values from here. The
 * census itself is src/data/exoplanets.json, written by
 * scripts/fetch-exoplanets.ts; tests/chapter19.test.ts checks that the counts
 * below match it.
 */

/** The census: confirmed planets in the NASA Exoplanet Archive when exoplanets.json was fetched. */
export const CENSUS = { count: 6451, tess: 1012, kepler: 2787, k2: 550, asOf: 'October 2026', fetched: '2026-10-31' } as const;

/** Missions to come (ESA's Plato page: launch planned for January 2027 on Ariane 6). */
export const PLATO = { launch: 'January 2027', asOf: 'October 2026' } as const;

/** K2-18 b: methane and carbon dioxide seen by JWST (Madhusudhan et al. 2023); the dimethyl sulfide claimed in 2023 and 2025 not confirmed by reanalyses (e.g. “Insufficient evidence for DMS and DMDS in the atmosphere of K2-18 b”, arXiv:2505.13407, 2025). */
export const K2_18B = { status: 'not confirmed', asOf: 'October 2026' } as const;
