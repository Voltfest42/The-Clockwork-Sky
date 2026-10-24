import { meanObliquity } from '../core/coords/transforms';
import { sunPosition } from '../core/ephemeris/sun';
import type { Vec3 } from '../core/math/vec3';
import type { Place } from '../core/sky/frames';
import { localPosition, riseTransitSet, type Luminary, type RiseSet } from '../core/sky/riseSet';
import { solarDeclination } from '../core/sky/sunlight';
import { calendarFromJd, jdFromCalendar } from '../core/time/calendar';
import { ttFromUt, utFromTt } from '../core/time/deltaT';
import { clockTime, jdFromClockTime, type Zone } from '../core/time/zone';
import { refract } from '../viz/sky/model';

/**
 * The Sun's (or the Moon's) path across a place's sky in one day, for the
 * sky view's overlays, and the day's rising, noon and setting in the place's
 * own clock time. Times are Julian Dates (TT).
 */

/** Local midnight at the start of day `d` of a year (0 = 1 January) in a time zone: Julian Date (TT). */
export function localMidnight(year: number, d: number, zone: Zone): number {
  const date = calendarFromJd(jdFromCalendar({ year, month: 1, day: 1 }) + d);
  return ttFromUt(jdFromClockTime(zone, { year: date.year, month: date.month, day: Math.floor(date.day), hour: 0, minute: 0, second: 0 }));
}

/** The body's direction every few minutes from a start time over a day, in the local frame, lifted by refraction as the sky view draws it. */
export function dayPath(body: Luminary, startTT: number, place: Place, steps = 144): Vec3[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const { local } = localPosition(body, startTT + i / steps, place);
    return local[2] > -0.05 ? refract(local) : local;
  });
}

/** Rising, noon and setting for the 24 hours from local midnight. */
export function dayOfSun(startTT: number, place: Place): RiseSet {
  return riseTransitSet('sun', startTT, place);
}

/** "04:43" in a zone's clock time. */
export function clockText(jdTT: number, zone: Zone): string {
  const t = clockTime(zone, utFromTt(jdTT));
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

/** The Sun's declination at a moment: radians. */
export function sunDeclination(jdTT: number): number {
  return solarDeclination(sunPosition(jdTT).lon, meanObliquity(jdTT));
}
