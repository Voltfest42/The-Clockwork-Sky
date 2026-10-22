import { AU, C } from './constants';

/**
 * Units and conversions. Modules exchange SI values: metres, seconds,
 * kilograms and radians. Times are the one exception: they travel as Julian
 * Dates, in days (see time/julian.ts). These helpers convert to and from the
 * units astronomers and readers use.
 */

// ---------- angles ----------

/** One degree, in radians. Multiply degrees by DEG to get radians. */
export const DEG = Math.PI / 180;

/** One arcminute, in radians. */
export const ARCMIN = DEG / 60;

/** One arcsecond, in radians. */
export const ARCSEC = DEG / 3600;

/** One hour of right ascension or hour angle (15°), in radians. */
export const HOUR_ANGLE = 15 * DEG;

/** Degrees to radians. */
export function degToRad(degrees: number): number {
  return degrees * DEG;
}

/** Radians to degrees. */
export function radToDeg(radians: number): number {
  return radians / DEG;
}

// ---------- time ----------

/** Seconds in a day of 86,400 SI seconds. */
export const SECONDS_PER_DAY = 86_400;

/** Days in a Julian year, exactly: the year of the light-year and of Julian centuries. */
export const DAYS_PER_JULIAN_YEAR = 365.25;

/** Days in a Julian century, exactly. */
export const DAYS_PER_JULIAN_CENTURY = 36_525;

/** Seconds in a Julian year (31,557,600 s). */
export const SECONDS_PER_JULIAN_YEAR = SECONDS_PER_DAY * DAYS_PER_JULIAN_YEAR;

// ---------- distance ----------

/** One light-year, m: the distance light travels in a Julian year. Exact (IAU). About 9.4607 × 10¹⁵ m. */
export const LIGHT_YEAR = C * SECONDS_PER_JULIAN_YEAR;

/** One parsec, m: (648,000 / π) AU, the distance at which 1 AU spans one arcsecond. Exact (IAU 2015 Resolution B2). About 3.0857 × 10¹⁶ m. */
export const PARSEC = AU * (648_000 / Math.PI);

/** Metres to astronomical units. */
export function metresToAu(metres: number): number {
  return metres / AU;
}

/** Astronomical units to metres. */
export function auToMetres(au: number): number {
  return au * AU;
}

/** Metres to light-years. */
export function metresToLightYears(metres: number): number {
  return metres / LIGHT_YEAR;
}

/** Light-years to metres. */
export function lightYearsToMetres(lightYears: number): number {
  return lightYears * LIGHT_YEAR;
}

/** Metres to parsecs. */
export function metresToParsecs(metres: number): number {
  return metres / PARSEC;
}

/** Parsecs to metres. */
export function parsecsToMetres(parsecs: number): number {
  return parsecs * PARSEC;
}

/** How long light takes to cross a distance: metres in, seconds out. */
export function lightTravelTime(metres: number): number {
  return metres / C;
}
