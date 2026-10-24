import { wrapPi } from '../core/math/angles';
import { eccentricAnomaly, trueAnomalyFromEccentric } from '../core/ephemeris/kepler';
import { DEG } from '../core/units';

/**
 * The analemma: where the Sun stands at the same clock time every day of the
 * year. Its height follows the Sun's declination; its east–west wander is the
 * equation of time, the difference between sundial time and clock time. Two
 * things make that difference: the tilt of Earth's axis, and the ellipse of
 * its orbit. Either can be switched off. A simple model of Earth's orbit:
 * Kepler's equation with the present eccentricity and perihelion.
 */

const ECCENTRICITY = 0.0167;
const OBLIQUITY = 23.44 * DEG;
/** The ecliptic longitude of the Sun's perigee (Earth's perihelion seen from Earth), about 283°. */
const PERIGEE = 282.94 * DEG;
/** Days from 1 January to perihelion. */
const PERIHELION_DAY = 2.7;
const YEAR = 365.2422;

export interface AnalemmaPoint {
  /** Sundial time minus clock time: minutes (positive when the sundial is ahead). */
  equationOfTime: number;
  /** The Sun's declination: degrees. */
  declination: number;
}

/** The Sun at the same clock time on a day of the year (0 = 1 January), with the tilt and the ellipse switched on or off. */
export function analemmaPoint(day: number, options: { tilt: boolean; ellipse: boolean }): AnalemmaPoint {
  const e = options.ellipse ? ECCENTRICITY : 0;
  const epsilon = options.tilt ? OBLIQUITY : 0;
  const M = (2 * Math.PI * (day - PERIHELION_DAY)) / YEAR;
  const nu = trueAnomalyFromEccentric(eccentricAnomaly(M, e), e);
  const lon = nu + PERIGEE;
  const meanLon = M + PERIGEE;
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lon), Math.cos(lon));
  // The mean Sun moves evenly along the equator; the real one runs ahead of it or behind.
  const equationOfTime = (wrapPi(meanLon - ra) / (2 * Math.PI)) * 1440;
  return { equationOfTime, declination: Math.asin(Math.sin(epsilon) * Math.sin(lon)) / DEG };
}
