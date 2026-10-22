/**
 * Calendar dates and Julian Dates (Meeus, Astronomical Algorithms, 2nd ed., ch. 7).
 *
 * Years use astronomical numbering: 1 BC is year 0, 2 BC is year −1, and so on.
 * Unless a calendar is named, dates from 15 October 1582 on are Gregorian and
 * earlier ones Julian, as the reform had it (Thursday 4 October 1582 was followed
 * by Friday 15 October). Either calendar can be named for any date, which
 * extends it backwards or forwards ("proleptic"). The Julian Day count starts at
 * noon on 1 January 4713 BC (year −4712) in the Julian calendar; the formulas
 * are tested from there on.
 */

export type CalendarName = 'gregorian' | 'julian';

/** A calendar date. The day may carry a fraction: day 4.81 is the 4th at 19:26:24. */
export interface CalendarDate {
  year: number;
  /** 1 = January … 12 = December. */
  month: number;
  day: number;
}

/** The Julian Date at which the Gregorian calendar began: 1582 October 15, 00:00. */
export const GREGORIAN_START_JD = 2_299_160.5;

/** The calendar a date is in when none is named: Gregorian from 1582 October 15 on, Julian before. */
export function calendarOf(date: CalendarDate): CalendarName {
  const { year, month, day } = date;
  if (year !== 1582) return year > 1582 ? 'gregorian' : 'julian';
  if (month !== 10) return month > 10 ? 'gregorian' : 'julian';
  return day >= 15 ? 'gregorian' : 'julian';
}

/** The calendar a Julian Date is shown in when none is named. */
export function calendarAt(jd: number): CalendarName {
  return jd >= GREGORIAN_START_JD ? 'gregorian' : 'julian';
}

/** The calendar whose leap-year rule applies to a year when none is named (1582's February was Julian). */
function calendarOfYear(year: number): CalendarName {
  return year > 1582 ? 'gregorian' : 'julian';
}

/** The fraction of a day at a time of day: dayFraction(19, 21) is 19:21:00, 0.80625. */
export function dayFraction(hours: number, minutes = 0, seconds = 0): number {
  return (hours + minutes / 60 + seconds / 3600) / 24;
}

/** The Julian Date (days) of a calendar date, in the date's own calendar unless one is named (Meeus 7.1). */
export function jdFromCalendar(date: CalendarDate, calendar: CalendarName = calendarOf(date)): number {
  let y = date.year;
  let m = date.month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  let b = 0;
  if (calendar === 'gregorian') {
    // The Gregorian calendar drops three leap days every four centuries.
    const a = Math.floor(y / 100);
    b = 2 - a + Math.floor(a / 4);
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + date.day + b - 1524.5;
}

/** The calendar date of a Julian Date (days), in the calendar in use at the time unless one is named (Meeus ch. 7). */
export function calendarFromJd(jd: number, calendar: CalendarName = calendarAt(jd)): CalendarDate {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (calendar === 'gregorian') {
    const alpha = Math.floor((z - 1_867_216.25) / 36_524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e) + f;
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year, month, day };
}

/** Whether a year (astronomical numbering) is a leap year in a calendar. Year 0 (1 BC) is a leap year in both. */
export function isLeapYear(year: number, calendar: CalendarName = calendarOfYear(year)): boolean {
  if (calendar === 'julian') return year % 4 === 0;
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** The number of days in a month (1–12) of a year. */
export function daysInMonth(year: number, month: number, calendar: CalendarName = calendarOfYear(year)): number {
  return month === 2 && isLeapYear(year, calendar) ? 29 : MONTH_LENGTHS[month - 1];
}

/**
 * Whether a date exists: a whole year, a month from 1 to 12, a day within the
 * month, and, when no calendar is named, not one of the ten days that October
 * 1582 skipped. The day's fraction is allowed.
 */
export function isValidDate(date: CalendarDate, calendar?: CalendarName): boolean {
  const { year, month, day } = date;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isFinite(day) || day < 1 || Math.floor(day) > daysInMonth(year, month, calendar ?? calendarOfYear(year))) return false;
  const skipped = year === 1582 && month === 10 && day >= 5 && day < 15;
  return calendar !== undefined || !skipped;
}

/** The day of the week of a Julian Date (Meeus ch. 7), with days starting at midnight UT: 0 = Sunday, 1 = Monday … 6 = Saturday. */
export function dayOfWeek(jd: number): number {
  return (((Math.floor(jd + 1.5) % 7) + 7) % 7);
}

/** The day of the year: 1 for 1 January. In 1582, with no calendar named, the ten skipped days don't count. */
export function dayOfYear(date: CalendarDate, calendar?: CalendarName): number {
  const start = { year: date.year, month: 1, day: 1 };
  const day = { ...date, day: Math.floor(date.day) };
  return Math.round(jdFromCalendar(day, calendar ?? calendarOf(day)) - jdFromCalendar(start, calendar ?? calendarOf(start))) + 1;
}

/**
 * A year in astronomical numbering, written the way historians write it:
 * 0 → "1 BC", −584 → "585 BC", 150 → "AD 150", 2026 → "2026". With era
 * 'always', positive years always get "AD", as in "3000 BC to AD 3000".
 * Years of five digits or more get a thousands separator: "10,000 BC".
 */
export function formatYear(year: number, era: 'auto' | 'always' = 'auto'): string {
  const number = (n: number) => (n >= 10_000 ? n.toLocaleString('en-GB') : String(n));
  if (year <= 0) return `${number(1 - year)} BC`;
  return era === 'always' || year < 1000 ? `AD ${number(year)}` : number(year);
}
