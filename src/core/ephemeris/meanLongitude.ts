import { normalizeRadians } from '../math/angles';
import { julianCenturies } from '../time/julian';
import { DEG } from '../units';

/**
 * Where the planets are on average: each planet's mean longitude, the angle it
 * would have reached by now if it moved round a circle at a steady pace.
 *
 * A real planet runs ahead of that and falls behind it during its year, by up
 * to about twice its orbit's eccentricity in radians (23° for Mercury, 11° for
 * Mars, under 2° for Venus and Neptune). That's ample for drawing the Solar
 * System to scale. The exact positions arrive with Kepler's equation in Stage 3.
 */

export type PlanetName = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

export interface MeanOrbit {
  /** Semi-major axis, the average of the nearest and farthest distances from the Sun: AU. */
  a: number;
  /** Mean longitude at J2000.0, degrees, measured in the ecliptic from the March equinox. */
  L0: number;
  /** How fast the mean longitude grows: degrees per Julian century. */
  Ldot: number;
}

/**
 * E. M. Standish, "Keplerian Elements for Approximate Positions of the Major
 * Planets" (JPL Solar System Dynamics), Table 1, for 1800–2050, mean ecliptic
 * and equinox of J2000. "earth" is the Earth–Moon barycentre.
 */
export const MEAN_ORBITS: Readonly<Record<PlanetName, MeanOrbit>> = {
  mercury: { a: 0.387_099_27, L0: 252.250_323_50, Ldot: 149_472.674_111_75 },
  venus: { a: 0.723_335_66, L0: 181.979_099_50, Ldot: 58_517.815_387_29 },
  earth: { a: 1.000_002_61, L0: 100.464_571_66, Ldot: 35_999.372_449_81 },
  mars: { a: 1.523_710_34, L0: -4.553_432_05, Ldot: 19_140.302_684_99 },
  jupiter: { a: 5.202_887_00, L0: 34.396_440_51, Ldot: 3_034.746_127_75 },
  saturn: { a: 9.536_675_94, L0: 49.954_244_23, Ldot: 1_222.493_622_01 },
  uranus: { a: 19.189_164_64, L0: 313.238_104_51, Ldot: 428.482_027_85 },
  neptune: { a: 30.069_922_76, L0: -55.120_029_69, Ldot: 218.459_453_25 },
};

export const PLANETS: readonly PlanetName[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

/** A planet's mean longitude at a Julian Date (TT), in radians, [0, 2π). */
export function meanLongitude(planet: PlanetName, jdTT: number): number {
  const { L0, Ldot } = MEAN_ORBITS[planet];
  return normalizeRadians((L0 + Ldot * julianCenturies(jdTT)) * DEG);
}

/** A planet's sidereal period, the time to go once round against the stars, from its mean motion: days. */
export function siderealPeriodDays(planet: PlanetName): number {
  return (360 / MEAN_ORBITS[planet].Ldot) * 36_525;
}

/**
 * The Moon's mean longitude at a Julian Date (TT), radians, measured in the
 * ecliptic of date from the equinox of date (Meeus, Astronomical Algorithms,
 * 47.1, leading terms). The real Moon swings up to about 6° either side of it.
 */
export function moonMeanLongitude(jdTT: number): number {
  const T = julianCenturies(jdTT);
  return normalizeRadians((218.316_447_7 + 481_267.881_234_21 * T) * DEG);
}
