import { daysInMonth, formatYear } from '../../core/time/calendar';
import { ttFromUt, utFromTt } from '../../core/time/deltaT';
import { SIDEREAL_DAY } from '../../core/time/sidereal';
import { clockTime, formatOffset, jdFromClockTime, utcOffset } from '../../core/time/zone';
import { placeZone, type ChosenPlace } from '../../site/place';

/** Times in words for the sky figures, and the time control's steps. */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type StepUnit = 'hour' | 'sidereal' | 'solar' | 'month' | 'year';

export const STEP_LABELS: Record<StepUnit, string> = {
  hour: 'an hour',
  sidereal: 'a star day (23 h 56 min)',
  solar: 'a Sun day (24 h)',
  month: 'a month',
  year: 'a year',
};

/** Moves a moment (JD, TT) by a step, keeping the clock time for months and years. */
export function stepTime(jdTT: number, unit: StepUnit, direction: 1 | -1, place: ChosenPlace): number {
  if (unit === 'hour') return jdTT + direction / 24;
  if (unit === 'sidereal') return jdTT + (direction * SIDEREAL_DAY) / 86_400;
  if (unit === 'solar') return jdTT + direction;
  const zone = placeZone(place);
  const t = clockTime(zone, utFromTt(jdTT));
  let { year, month } = t;
  if (unit === 'year') year += direction;
  else {
    month += direction;
    if (month > 12) [month, year] = [1, year + 1];
    if (month < 1) [month, year] = [12, year - 1];
  }
  const day = Math.min(t.day, daysInMonth(year, month));
  return ttFromUt(jdFromClockTime(zone, { ...t, year, month, day }));
}

/** "London time, UTC+1" or "UTC+7, by longitude". */
export function zoneLabel(place: ChosenPlace, jdTT: number): string {
  const offset = formatOffset(utcOffset(placeZone(place), utFromTt(jdTT)));
  if (!place.timeZone) return `${offset}, by longitude`;
  if (place.id === 'here') return `your time, ${offset}`;
  if (place.timeZone === 'UTC') return 'UTC';
  return `${place.name} time, ${offset}`;
}

/** "Thu 23 October 2026, 21:40" style text for a moment at a place. */
export function formatMoment(jdTT: number, place: ChosenPlace, withZone = true): string {
  const t = clockTime(placeZone(place), utFromTt(jdTT));
  const time = `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
  return `${t.day} ${MONTHS[t.month - 1]} ${formatYear(t.year)}, ${time}${withZone ? ` (${zoneLabel(place, jdTT)})` : ''}`;
}

