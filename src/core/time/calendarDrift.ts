import { seasonTime } from '../ephemeris/seasons';
import { calendarFromJd, jdFromCalendar, type CalendarName } from './calendar';
import { utFromTt } from './deltaT';

/**
 * How calendars drift against the seasons. A calendar year that is too long
 * or too short makes the March equinox fall a little earlier or later each
 * year, and the slips add up. Three rules are compared:
 *
 * - **no leap years**: every year 365 days, like the old Egyptian civil
 *   calendar, 0.2422 days short;
 * - **Julian** (45 BC): a leap year every 4 years, 365.25 days on average,
 *   0.0078 days long, so a day every 128 years;
 * - **Gregorian** (1582): the Julian rule without three leap days in four
 *   centuries, 365.2425 days, 0.0003 days long, so a day in about 3,200 years.
 *
 * Years use astronomical numbering (45 BC is −44). Times are Julian Dates (TT).
 */

export type CalendarRule = 'no-leap' | CalendarName;

/** The mean tropical year (equinox to equinox, averaged round the orbit), days. */
export const TROPICAL_YEAR = 365.24219;

/** The average length of a calendar year under each rule: days. */
export const CALENDAR_YEAR: Record<CalendarRule, number> = { 'no-leap': 365, julian: 365.25, gregorian: 365.2425 };

/** Years for a calendar to drift one day against the mean tropical year. */
export function yearsPerDayOfDrift(rule: CalendarRule): number {
  return 1 / Math.abs(CALENDAR_YEAR[rule] - TROPICAL_YEAR);
}

/** The year the comparison starts: 45 BC, when Julius Caesar's calendar began. The no-leap calendar is set to agree with it then. */
export const DRIFT_START_YEAR = -44;

/** When a calendar year begins (1 January, 00:00): Julian Date. The no-leap calendar counts 365-day years from the Julian 1 January of 45 BC. */
export function yearStart(year: number, rule: CalendarRule): number {
  if (rule === 'no-leap') return jdFromCalendar({ year: DRIFT_START_YEAR, month: 1, day: 1 }, 'julian') + 365 * (year - DRIFT_START_YEAR);
  return jdFromCalendar({ year, month: 1, day: 1 }, rule);
}

/** Midnight at the start of 21 March in a year under a rule: Julian Date. The no-leap calendar's 21 March is day 80 of its year. */
export function march21(year: number, rule: CalendarRule): number {
  return rule === 'no-leap' ? yearStart(year, rule) + 79 : jdFromCalendar({ year, month: 3, day: 21 }, rule);
}

/** The March equinox in civil time (UT, the time calendars count days in): Julian Date. */
function equinoxUT(year: number): number {
  return utFromTt(seasonTime(year, 'march-equinox'));
}

/** Days from the start of 21 March to the March equinox in a calendar year: negative when the equinox comes first. */
export function equinoxAfterMarch21(year: number, rule: CalendarRule): number {
  return equinoxUT(year) - march21(year, rule);
}

/**
 * How far the March equinox has slipped in a calendar since 45 BC: days,
 * positive when it now falls later in the calendar year. Measured from
 * 21 March, so leap days before March don't count as a slip.
 */
export function equinoxDrift(year: number, rule: CalendarRule): number {
  return equinoxAfterMarch21(year, rule) - equinoxAfterMarch21(DRIFT_START_YEAR, rule);
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The calendar date of the March equinox in a year under a rule: "21 March". The no-leap calendar uses the common-year months. */
export function equinoxDate(year: number, rule: CalendarRule): { month: number; day: number; label: string } {
  let month: number;
  let day: number;
  if (rule === 'no-leap') {
    let d = Math.floor((((equinoxUT(year) - yearStart(year, rule)) % 365) + 365) % 365);
    month = 0;
    while (d >= MONTH_DAYS[month]) d -= MONTH_DAYS[month++];
    month += 1;
    day = d + 1;
  } else {
    const date = calendarFromJd(equinoxUT(year), rule);
    month = date.month;
    day = Math.floor(date.day);
  }
  return { month, day, label: `${day} ${MONTH_NAMES[month - 1]}` };
}
