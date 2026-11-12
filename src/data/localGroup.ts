import type { LocalGroupData, SunFrame } from '../core/galaxy/localGroup';

/**
 * The Local Group's four biggest galaxies for Figure 31.2, as two teams
 * measured them, and what each team found. Sky positions are NED's (checked
 * 12 Nov 2026). Values are as the papers tabulate them: masses M₂₀₀ in M☉,
 * distance moduli in magnitudes, proper motions in µas/yr (μ_α cos δ, μ_δ),
 * heliocentric line-of-sight speeds in km/s, each with its one-sigma
 * uncertainty. The odds are registered in asOf.ts as "localGroup".
 */

/** NED's positions, degrees (ICRS). */
const SKY = {
  M31: { ra: 10.68479292, dec: 41.269065 },
  M33: { ra: 23.46204167, dec: 30.66022222 },
  LMC: { ra: 80.89416667, dec: -69.75611111 },
} as const;

/** Astropy's Galactocentric frame ("v4.0" defaults), as both teams use. */
export const SUN_FRAME: SunFrame = {
  centreRa: 266.4051,
  centreDec: -28.936175,
  distance: 8.122,
  height: 0.0208,
  velocity: [12.9, 245.6, 7.78],
};

/**
 * Sawala, Delhomelle, Deason, Frenk, Johansson, Keitaanranta, Rawlings &
 * Wright (2025), Nature Astronomy 9, 1206 (arXiv:2408.00064), Extended Data
 * Table 1: masses from their review of the literature; distance moduli from Li
 * et al. 2021 (M31), Ou et al. 2023 (M33) and Pietrzyński et al. 2019 (LMC);
 * Andromeda's proper motion from Gaia (Salomon et al. 2021), M33's from Hubble
 * and Gaia (van der Marel et al. 2019), the LMC's from Hubble (Kallivayalil et
 * al. 2013); line-of-sight speeds from Watkins et al. 2013 and McConnachie 2012.
 */
export const SAWALA_2025: LocalGroupData = {
  MW: { mass: [1.0e12, 0.2e12], c: [10, 2] },
  M31: { ...SKY.M31, mass: [1.3e12, 0.4e12], c: [10, 2], distanceModulus: [24.407, 0.032], pmRaCosDec: [48.9, 10.5], pmDec: [-36.9, 8.1], vlos: [-301, 1] },
  M33: { ...SKY.M33, mass: [3e11, 1e11], c: [10, 2], distanceModulus: [24.67, 0.07], pmRaCosDec: [31, 19], pmDec: [-29, 16], vlos: [-179.2, 1.8] },
  LMC: { ...SKY.LMC, mass: [1.5e11, 0.5e11], c: [10, 2], distanceModulus: [18.477, 0.026], pmRaCosDec: [1910, 20], pmDec: [229, 47], vlos: [262.2, 3.4] },
};

/**
 * Wu, Huang, Zhang, Sun & Shao (2026), The Astrophysical Journal Letters,
 * accepted (arXiv:2603.22863), Table 1: Sawala et al.'s values, but Andromeda's
 * and M33's proper motions from Gaia's supergiants with its systematic
 * offsets corrected (Wu et al. 2025, A&A 701, A265; M33's averaged with its
 * masers' motion, Brunthaler et al. 2005), and Andromeda's halo more
 * concentrated (c = 15 ± 2.5).
 */
export const WU_2026: LocalGroupData = {
  ...SAWALA_2025,
  M31: { ...SAWALA_2025.M31, c: [15, 2.5], pmRaCosDec: [45.9, 8.1], pmDec: [-20.5, 6.6] },
  M33: { ...SAWALA_2025.M33, pmRaCosDec: [30.6, 5.7], pmDec: [19.0, 5.7] },
};

export const LOCAL_GROUP_SETS = {
  sawala2025: { label: 'Sawala et al. 2025', data: SAWALA_2025, motion: 'Gaia (Salomon et al. 2021)' },
  wu2026: { label: 'Wu et al. 2026', data: WU_2026, motion: 'Gaia’s supergiants, corrected (Wu et al. 2025)' },
} as const;

export type LocalGroupSet = keyof typeof LOCAL_GROUP_SETS;

/**
 * What the teams found: the share of their futures in which the Milky Way and
 * Andromeda merge within 10 billion years (Sawala et al. counted a merger at
 * 20 kpc), and the median time to it. Sawala et al.'s shares are from 2,500
 * samples (their four-galaxy run of 50,000 gives "just over 50%").
 */
export const LOCAL_GROUP_ODDS = {
  asOf: 'November 2026',
  sawala2025: {
    two: 0.44,
    withM33: 0.63,
    withLmc: 0.37,
    four: 0.54,
    /** Median merger time of the futures that merge, Gyr. */
    median: 7.6,
    /** The LMC merges with the Milky Way in every future, after a median 1.3 Gyr; M33 with Andromeda in 86%, after 3.3 Gyr. */
    lmcMerges: 1.3,
    m33Share: 0.86,
    m33Merges: 3.3,
  },
  wu2026: {
    four: 0.9,
    median: 6.5,
    /** Across the two-sigma range of Andromeda's proper motion. */
    range: [0.647, 1] as const,
    /** The proper-motion uncertainty needed to settle it, µas/yr. */
    needed: 2,
  },
} as const;

/** The earlier, certain prediction (van der Marel et al. 2012, ApJ 753, 9): a first pass in 3.87 billion years and a merger 5.86 billion years from now, with Andromeda's sideways speed 17 ± 17 km/s. */
export const TEXTBOOK_COLLISION = { firstPass: 3.87, merger: 5.86, sideways: 17 } as const;
