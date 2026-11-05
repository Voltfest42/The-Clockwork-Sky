import type { Fuel } from '../core/nuclear/ignition';

/**
 * The burning stages of massive stars, for Figure 22.4.
 *
 * Woosley, Heger & Weaver (2002, Rev. Mod. Phys. 74, 1015), Table I: each
 * fuel's central temperature and density, the star's mass, luminosity and
 * radius while it burns, and how long it lasts, for stars of 15 and 25 solar
 * masses of the Sun's make-up (KEPLER models with mass loss). Read from the
 * paper on 5 Nov 2026.
 *
 * Their neutrino luminosities are from Woosley's lecture notes (UC Santa Cruz,
 * Ay 220, 2019, lecture 11): a 15-solar-mass KEPLER model at hydrogen and
 * helium burning, carbon ignition and depletion, oxygen and silicon depletion
 * and just before collapse. None is given there for 25 solar masses.
 *
 * The iron cores at collapse are 1.45 and 1.62 solar masses (the paper's
 * Fig. 10); the silicon core of a star of 13–17 solar masses is 1.5–1.6 and
 * its helium core about 4 (§VI). Other codes' stages differ: carbon burning
 * lasts up to about three times longer or shorter in other models of 20–25
 * solar masses (Paxton et al. 2011, MESA paper I, §8).
 *
 * SI-friendly units in the file: K, kg/m³, years; masses, luminosities and
 * radii in the Sun's.
 */

export interface BurningStage {
  fuel: Fuel;
  /** Central temperature, K, and density, kg/m³. */
  T: number;
  rho: number;
  /** The star's mass (M☉), luminosity (L☉) and radius (R☉) then. */
  mass: number;
  L: number;
  R: number;
  /** How long the stage lasts, years. */
  years: number;
}

export interface MassiveStar {
  mass: number;
  stages: readonly BurningStage[];
  /** Iron core at collapse, M☉. */
  ironCore: number;
  /** Neutrino and photon luminosities at moments in its late life, erg/s → W (none for 25 M☉). */
  luminosities?: readonly { moment: string; yearsLeft: number; photons: number; neutrinos: number }[];
}

const DAY = 1 / 365.25;
const G_CC = 1000;

export const STAR_15: MassiveStar = {
  mass: 15,
  ironCore: 1.45,
  stages: [
    { fuel: 'H', T: 3.53e7, rho: 5.81 * G_CC, mass: 14.9, L: 28.0e3, R: 6.75, years: 11.1e6 },
    { fuel: 'He', T: 1.78e8, rho: 1.39e3 * G_CC, mass: 14.3, L: 41.3e3, R: 461, years: 1.97e6 },
    { fuel: 'C', T: 8.34e8, rho: 2.39e5 * G_CC, mass: 12.6, L: 83.3e3, R: 803, years: 2.03e3 },
    { fuel: 'Ne', T: 1.63e9, rho: 7.24e6 * G_CC, mass: 12.6, L: 86.5e3, R: 821, years: 0.732 },
    { fuel: 'O', T: 1.94e9, rho: 6.66e6 * G_CC, mass: 12.6, L: 86.6e3, R: 821, years: 2.58 },
    { fuel: 'Si', T: 3.34e9, rho: 4.26e7 * G_CC, mass: 12.6, L: 86.5e3, R: 821, years: 18.3 * DAY },
  ],
  // Woosley's KEPLER model; the times left are this file's own placing of each moment on Table I's stages.
  luminosities: [
    { moment: 'hydrogen burning', yearsLeft: 7e6, photons: 1.06e31, neutrinos: 7.0e29 },
    { moment: 'helium burning', yearsLeft: 1e6, photons: 1.73e31, neutrinos: 7.4e29 },
    { moment: 'carbon ignites', yearsLeft: 2.0e3, photons: 2.78e31, neutrinos: 7.1e30 },
    { moment: 'carbon runs out', yearsLeft: 3.3, photons: 3.5e31, neutrinos: 3.5e34 },
    { moment: 'oxygen runs out', yearsLeft: 18.3 * DAY, photons: 3.53e31, neutrinos: 3.8e36 },
    { moment: 'silicon runs out', yearsLeft: DAY, photons: 3.53e31, neutrinos: 2.3e38 },
    { moment: 'just before collapse', yearsLeft: 1 / 3.155_76e7, photons: 3.53e31, neutrinos: 1.9e42 },
  ],
};

export const STAR_25: MassiveStar = {
  mass: 25,
  ironCore: 1.62,
  stages: [
    { fuel: 'H', T: 3.81e7, rho: 3.81 * G_CC, mass: 24.5, L: 110e3, R: 9.17, years: 6.7e6 },
    { fuel: 'He', T: 1.96e8, rho: 762 * G_CC, mass: 19.6, L: 182e3, R: 1030, years: 0.839e6 },
    { fuel: 'C', T: 8.41e8, rho: 1.29e5 * G_CC, mass: 12.5, L: 245e3, R: 1390, years: 522 },
    { fuel: 'Ne', T: 1.57e9, rho: 3.95e6 * G_CC, mass: 12.5, L: 246e3, R: 1400, years: 0.891 },
    { fuel: 'O', T: 2.09e9, rho: 3.6e6 * G_CC, mass: 12.5, L: 246e3, R: 1400, years: 0.402 },
    { fuel: 'Si', T: 3.65e9, rho: 3.01e7 * G_CC, mass: 12.5, L: 246e3, R: 1400, years: 0.733 * DAY },
  ],
};

/** How much longer or shorter other codes' carbon burning lasts in stars of 20–25 M☉ (MESA paper I). */
export const CARBON_SPREAD = 3;

/** Years left before collapse when each stage begins: the later stages' durations added up (the gaps between stages left out). */
export function yearsLeftAtStart(star: MassiveStar): number[] {
  return star.stages.map((_, i) => star.stages.slice(i).reduce((sum, s) => sum + s.years, 0));
}
