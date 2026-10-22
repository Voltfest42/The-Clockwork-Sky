import { normalizeRadians } from '../math/angles';
import { DAYS_PER_JULIAN_CENTURY, DEG, SECONDS_PER_DAY } from '../units';
import { J2000 } from './julian';

/**
 * Sidereal time: the sky's clock. It is the right ascension now crossing the
 * meridian, so it says how far the sky has turned. All angles in radians.
 */

/** How many times faster sidereal time runs than solar time (IAU 1982). */
export const SIDEREAL_RATE = 360.985_647_366_29 / 360;

/** The mean sidereal day, s: one turn of the sky relative to the equinox, 23 h 56 min 4.0905 s. */
export const SIDEREAL_DAY = SECONDS_PER_DAY / SIDEREAL_RATE;

/**
 * Greenwich mean sidereal time for a Julian Date in UT (strictly UT1; UTC is
 * within a second of it). Radians in [0, 2π). IAU 1982 expression, Meeus 12.4;
 * good to about 0.1 s of time over the course's range.
 */
export function greenwichMeanSiderealTime(jdUT: number): number {
  const d = jdUT - J2000;
  const t = d / DAYS_PER_JULIAN_CENTURY;
  const degrees = 280.460_618_37 + 360.985_647_366_29 * d + 0.000_387_933 * t * t - (t * t * t) / 38_710_000;
  return normalizeRadians(degrees * DEG);
}

/**
 * Greenwich apparent sidereal time: mean sidereal time corrected by the
 * equation of the equinoxes, Δψ cos ε, for nutation. The course ignores
 * nutation elsewhere (it is under 20″); this is here for checking against
 * published values. Δψ (nutation in longitude) and ε (obliquity) in radians.
 */
export function greenwichApparentSiderealTime(jdUT: number, nutationInLongitude: number, obliquity: number): number {
  return normalizeRadians(greenwichMeanSiderealTime(jdUT) + nutationInLongitude * Math.cos(obliquity));
}

/** Local mean sidereal time at a longitude (radians, east positive). Radians in [0, 2π). */
export function localSiderealTime(jdUT: number, longitude: number): number {
  return normalizeRadians(greenwichMeanSiderealTime(jdUT) + longitude);
}
