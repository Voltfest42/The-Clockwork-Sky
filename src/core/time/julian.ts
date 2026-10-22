import { DAYS_PER_JULIAN_CENTURY, DAYS_PER_JULIAN_YEAR, SECONDS_PER_DAY } from '../units';

/**
 * Julian Dates: a continuous count of days from noon on 1 January 4713 BC in
 * the Julian calendar. The course keeps time as a Julian Date in Terrestrial
 * Time (TT), the smooth time scale of the ephemerides; clocks and the sky's
 * turning follow Universal Time (UT). The two differ by ΔT (deltaT.ts).
 * Calendar dates are converted in calendar.ts.
 */

/** J2000.0, the standard epoch: 2000 January 1, 12:00 TT, as a Julian Date. */
export const J2000 = 2_451_545.0;

/** The Julian Date of the Unix epoch, 1970 January 1, 00:00 UTC. */
export const UNIX_EPOCH_JD = 2_440_587.5;

/** Julian centuries of 36,525 days since J2000.0, the T of most astronomical series. JD (days) in, centuries out. */
export function julianCenturies(jd: number): number {
  return (jd - J2000) / DAYS_PER_JULIAN_CENTURY;
}

/**
 * The year as a decimal number, counted in Julian years of 365.25 days from
 * J2000.0, so J2000.0 is 2000.0. It runs within a few days of the calendar year
 * for the whole course's range. Astronomical numbering: 1 BC is 0. JD in, years out.
 */
export function julianEpoch(jd: number): number {
  return 2000 + (jd - J2000) / DAYS_PER_JULIAN_YEAR;
}

/**
 * The Julian Date (UTC) of a JavaScript time, given in milliseconds since 1970
 * as Date.now() returns it. Like JavaScript, it ignores leap seconds. Use it for
 * "now" only; historical dates go through calendar.ts.
 */
export function jdFromUnixMs(ms: number): number {
  return UNIX_EPOCH_JD + ms / (SECONDS_PER_DAY * 1000);
}

/** Milliseconds since 1970 for a Julian Date (UTC): the inverse of jdFromUnixMs, for display with Date. */
export function unixMsFromJd(jd: number): number {
  return (jd - UNIX_EPOCH_JD) * SECONDS_PER_DAY * 1000;
}
