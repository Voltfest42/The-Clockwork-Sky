/**
 * Neutron stars whose masses or radii are measured, for Figure 26.2.
 *
 * Masses from pulsar timing (Shapiro delay or a companion's orbit), with 1σ
 * errors. Radii from NICER, which fits the X-ray pulses of hot spots on a
 * pulsar's surface, bent by its gravity: each analysis gives a 68% range, and
 * independent teams' analyses of the same data differ, so both are shown.
 * Registered in asOf.ts ("nicer"): new analyses come out every year or two.
 */

export interface MeasuredMass {
  id: string;
  name: string;
  mass: number;
  error: number;
  source: string;
}

export interface MeasuredRadius {
  id: string;
  name: string;
  /** M☉, km: the centre and the 68% range of each. */
  mass: number;
  massLow: number;
  massHigh: number;
  radius: number;
  radiusLow: number;
  radiusHigh: number;
  source: string;
}

/** The heaviest neutron stars, from pulsar timing and a companion's orbit. */
export const HEAVY_NEUTRON_STARS: readonly MeasuredMass[] = [
  { id: 'J0348', name: 'PSR J0348+0432', mass: 2.01, error: 0.04, source: 'Antoniadis et al. 2013' },
  { id: 'J0740', name: 'PSR J0740+6620', mass: 2.08, error: 0.07, source: 'Fonseca et al. 2021' },
  { id: 'J0952', name: 'PSR J0952−0607', mass: 2.35, error: 0.17, source: 'Romani et al. 2022' },
];

/** NICER's radii, each team's analysis separately (68% ranges). */
export const NICER_RADII: readonly MeasuredRadius[] = [
  { id: 'J0030-riley', name: 'PSR J0030+0451 (Riley et al. 2019)', mass: 1.34, massLow: 1.18, massHigh: 1.49, radius: 12.71, radiusLow: 11.52, radiusHigh: 13.85, source: 'Riley et al. 2019' },
  { id: 'J0030-miller', name: 'PSR J0030+0451 (Miller et al. 2019)', mass: 1.44, massLow: 1.3, massHigh: 1.59, radius: 13.02, radiusLow: 11.96, radiusHigh: 14.26, source: 'Miller et al. 2019' },
  { id: 'J0740-riley', name: 'PSR J0740+6620 (Riley et al. 2021)', mass: 2.072, massLow: 2.006, massHigh: 2.139, radius: 12.39, radiusLow: 11.41, radiusHigh: 13.69, source: 'Riley et al. 2021' },
  { id: 'J0740-miller', name: 'PSR J0740+6620 (Miller et al. 2021)', mass: 2.08, massLow: 2.01, massHigh: 2.15, radius: 13.7, radiusLow: 12.2, radiusHigh: 16.3, source: 'Miller et al. 2021' },
  { id: 'J0437', name: 'PSR J0437−4715 (Choudhury et al. 2024)', mass: 1.418, massLow: 1.374, massHigh: 1.462, radius: 11.36, radiusLow: 10.73, radiusHigh: 12.31, source: 'Choudhury et al. 2024' },
];

/** GW170817's tidal squeezing: a 1.4 M☉ neutron star's radius, 11.9 ± 1.4 km (90%; LIGO–Virgo 2018). */
export const GW170817_RADIUS = { mass: 1.4, radius: 11.9, error: 1.4 } as const;

/** The month NICER's radii and the heavy pulsars' masses were last checked. */
export const NEUTRON_STARS_AS_OF = 'November 2026';
