import { sunGeocentric } from '../core/ephemeris/bodies';
import { sunPosition } from '../core/ephemeris/sun';
import { constellationAt, type Constellation } from '../core/sky/charts';
import { calendarFromJd, daysInMonth, isLeapYear, jdFromCalendar } from '../core/time/calendar';
import { ttFromUt } from '../core/time/deltaT';
import { DEG } from '../core/units';
import { MONTHS } from '../viz/time/format';

/**
 * The Sun's year among the stars: which constellation it is in on each day,
 * when it enters each one, and the astrologers' sign for comparison. Days are
 * taken at noon UT; times are Julian Dates (TT).
 */

/** The signs of the zodiac, 30° each from the March equinox: where astrology puts the Sun. */
export const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

/** The constellations the signs were named after (IAU abbreviations), in the same order. */
const SIGN_CONSTELLATIONS = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Sgr', 'Cap', 'Aqr', 'Psc'];

/** Whether a sign is named after a constellation: "Scorpio" and "Sco". */
export function signMatches(sign: string, constellationId: string): boolean {
  return SIGN_CONSTELLATIONS[SIGNS.indexOf(sign)] === constellationId;
}

/** The sign for a date: the Sun's ecliptic longitude of date, in 30° steps. */
export function signAt(jdTT: number): string {
  return SIGNS[Math.floor(sunPosition(jdTT).lon / (30 * DEG)) % 12];
}

/** Noon UT on day `d` (0 = 1 January) of a year: Julian Date (TT). */
export function noonOfDay(year: number, d: number): number {
  return ttFromUt(jdFromCalendar({ year, month: 1, day: 1.5 }) + d);
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** "24 October" for a day of a year (0 = 1 January). */
export function dayLabel(year: number, d: number): string {
  const date = calendarFromJd(jdFromCalendar({ year, month: 1, day: 1.5 }) + d);
  return `${Math.floor(date.day)} ${MONTHS[date.month - 1]}`;
}

/** The day of the year (0 = 1 January) of a calendar date. */
export function dayOfYearOf(year: number, month: number, day: number): number {
  let d = day - 1;
  for (let m = 1; m < month; m++) d += daysInMonth(year, m);
  return d;
}

export interface ConstellationStay {
  constellation: Constellation;
  /** When the Sun enters, as a day of the year with its fraction (0 = 1 January 00:00 UT), or null if it was already there on 1 January. */
  enters: number | null;
  /** First and last whole days of the year it is in at noon (0 = 1 January). */
  from: number;
  to: number;
}

/**
 * The constellations the Sun passes through in a year, in order: when it
 * enters each (found to the minute by bisection between daily samples) and
 * the days it spends there.
 */
export function sunsConstellations(constellations: readonly Constellation[], year: number): ConstellationStay[] {
  const stays: ConstellationStay[] = [];
  const n = daysInYear(year);
  const at = (t: number) => constellationAt(constellations, sunGeocentric(noonOfDay(year, t - 0.5)));
  for (let d = 0; d < n; d++) {
    const c = at(d + 0.5);
    if (!c) continue;
    const last = stays[stays.length - 1];
    if (last && last.constellation.id === c.id) {
      last.to = d;
      continue;
    }
    let enters: number | null = null;
    if (last) {
      // Between noon on the day before and noon today.
      let a = d - 0.5;
      let b = d + 0.5;
      for (let i = 0; i < 12; i++) {
        const m = (a + b) / 2;
        if (at(m)?.id === c.id) b = m;
        else a = m;
      }
      enters = (a + b) / 2;
    }
    stays.push({ constellation: c, enters, from: d, to: d });
  }
  return stays;
}

/** How far the Sun moves along the ecliptic in a day, around a date: degrees. */
export function dailyMotion(jdTT: number): number {
  const a = sunPosition(jdTT - 0.5).lon;
  const b = sunPosition(jdTT + 0.5).lon;
  return ((((b - a) / DEG) % 360) + 360) % 360;
}
