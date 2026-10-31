import { GM_EARTH, GM_SUN } from '../constants';
import { binaryState, type BinaryOrbit } from '../binaries/orbit';
import { DEG, SECONDS_PER_DAY } from '../units';

/**
 * A planet's pull on its star: the star circles their balance point, and its
 * lines shift towards and away from us (Chapters 7, 12 and 14). This is the
 * binaries core with one "star" very light.
 *
 * Units: planets' masses in Earth masses, stars' in solar masses, periods in
 * days, tilts in degrees (90 edge-on), speeds in m/s.
 */

/** Earth's mass in solar masses (IAU 2015 nominal G·M ratio, 1/332,946). */
export const EARTH_IN_SUNS = GM_EARTH / GM_SUN;

/**
 * The star's velocity semi-amplitude K (m/s): how far its speed towards us
 * swings either side of its mean, K = (2πG/P)^{1/3} m sin i / (M + m)^{2/3} / √(1 − e²).
 * Jupiter swings the Sun by 12.5 m/s, Earth by 9 cm/s.
 */
export function wobbleAmplitude(planetEarths: number, starSuns: number, periodDays: number, iDegrees = 90, e = 0): number {
  const P = periodDays * SECONDS_PER_DAY;
  const m = planetEarths * EARTH_IN_SUNS;
  // In units of the Sun's G·M: (2π GM☉ / P)^{1/3} m / (M + m)^{2/3}.
  return (Math.cbrt((2 * Math.PI * GM_SUN) / P) * m * Math.sin(iDegrees * DEG)) / Math.cbrt((starSuns + m) ** 2) / Math.sqrt(1 - e * e);
}

/** The planet and its star as a binary orbit (masses in M☉), for the binaries core. Periastron at phase 0, ω = 90° so a circular orbit's transit falls at phase 0. */
export function planetOrbit(planetEarths: number, starSuns: number, periodDays: number, iDegrees = 90, e = 0, omega = 90): BinaryOrbit {
  return { m1: starSuns, m2: planetEarths * EARTH_IN_SUNS, period: periodDays, e, i: iDegrees, omega };
}

/** The star's radial velocity (m/s, positive away from us) at a time (days) since phase 0. */
export function starVelocity(orbit: BinaryOrbit, tDays: number): number {
  return binaryState(orbit, tDays / orbit.period).v1 * 1000;
}

/** The least mass (Earth masses) of a planet from its star's swing K (m/s), the star's mass and the period: m sin i, for m ≪ M. */
export function minimumMassFromWobble(k: number, starSuns: number, periodDays: number, e = 0): number {
  const P = periodDays * SECONDS_PER_DAY;
  return (k * Math.sqrt(1 - e * e) * Math.cbrt(starSuns ** 2)) / Math.cbrt((2 * Math.PI * GM_SUN) / P) / EARTH_IN_SUNS;
}
