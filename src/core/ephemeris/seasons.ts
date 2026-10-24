import { normalizeRadians, wrapPi } from '../math/angles';
import { norm } from '../math/vec3';
import { jdFromCalendar } from '../time/calendar';
import { julianCenturies } from '../time/julian';
import { DEG } from '../units';
import { earthHeliocentric, moonGeocentric } from './bodies';
import { sunPosition } from './sun';

/**
 * The turning points of Earth's year: the equinoxes and solstices, when the
 * Sun's apparent longitude is 0°, 90°, 180° or 270°, and perihelion and
 * aphelion, when Earth is closest to and farthest from the Sun. Times are
 * Julian Dates (TT); years use astronomical numbering.
 */

export type SeasonPoint = 'march-equinox' | 'june-solstice' | 'september-equinox' | 'december-solstice';
export const SEASON_POINTS: readonly SeasonPoint[] = ['march-equinox', 'june-solstice', 'september-equinox', 'december-solstice'];

/**
 * The Sun's apparent longitude at a Julian Date (TT): radians. Meeus ch. 25's
 * geometric longitude, corrected for aberration (−20.5″) and the largest term
 * of nutation, as Meeus 25.8 does. Good to about 0.01°.
 */
export function apparentSunLongitude(jdTT: number): number {
  const omega = (125.04 - 1934.136 * julianCenturies(jdTT)) * DEG;
  return normalizeRadians(sunPosition(jdTT).lon - 0.00569 * DEG - 0.00478 * DEG * Math.sin(omega));
}

/** Rough calendar dates (March, June, September, December) to start from. */
const START: Record<SeasonPoint, [month: number, day: number]> = {
  'march-equinox': [3, 20],
  'june-solstice': [6, 21],
  'september-equinox': [9, 23],
  'december-solstice': [12, 22],
};

/**
 * An equinox or solstice in a year: the moment the Sun's apparent longitude
 * reaches 0°, 90°, 180° or 270°. Julian Date (TT). Within about 15 minutes of
 * the full theory, from the accuracy of the solar formula.
 */
export function seasonTime(year: number, point: SeasonPoint): number {
  const index = SEASON_POINTS.indexOf(point);
  const [month, day] = START[point];
  let jd = jdFromCalendar({ year, month, day });
  // Newton's method on the longitude: the Sun moves about 360° in 365.24 days (Meeus 27.1's correction).
  for (let i = 0; i < 8; i++) {
    const off = wrapPi(index * (Math.PI / 2) - apparentSunLongitude(jd));
    jd += (off / (2 * Math.PI)) * 365.242;
    if (Math.abs(off) < 1e-9) break;
  }
  return jd;
}

/** Earth's distance from the Sun at a Julian Date (TT): AU. Earth's centre, not the Earth–Moon barycentre, so it wobbles with the Moon by ±4,700 km. */
export function earthSunDistance(jdTT: number): number {
  return norm(earthHeliocentric(jdTT, moonGeocentric(jdTT)));
}

/** Finds a minimum of f within [a, b] by golden-section search, to a tolerance in days. */
function goldenMinimum(f: (x: number) => number, a: number, b: number, tolerance = 1e-4): number {
  const r = (Math.sqrt(5) - 1) / 2;
  let x1 = b - r * (b - a);
  let x2 = a + r * (b - a);
  let f1 = f(x1);
  let f2 = f(x2);
  while (b - a > tolerance) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = b - r * (b - a);
      f1 = f(x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = a + r * (b - a);
      f2 = f(x2);
    }
  }
  return (a + b) / 2;
}

/**
 * Perihelion (Earth closest to the Sun) or aphelion (farthest) in a year:
 * Julian Date (TT) and distance (AU). Perihelion falls on 2–5 January and
 * aphelion on 3–7 July. Because the Moon tugs Earth to and fro, the moment
 * can shift by a day from that of the Earth–Moon pair's orbit, so it is found
 * for Earth itself, by searching the distance day by day and then refining.
 */
export function apsis(year: number, which: 'perihelion' | 'aphelion'): { jdTT: number; distance: number } {
  const sign = which === 'perihelion' ? 1 : -1;
  const f = (jd: number) => sign * earthSunDistance(jd);
  const start = jdFromCalendar(which === 'perihelion' ? { year, month: 1, day: 1 } : { year, month: 7, day: 1 }) - 4;
  let best = start;
  for (let d = 0; d <= 14; d += 0.25) if (f(start + d) < f(best)) best = start + d;
  const jd = goldenMinimum(f, best - 0.5, best + 0.5);
  return { jdTT: jd, distance: earthSunDistance(jd) };
}
