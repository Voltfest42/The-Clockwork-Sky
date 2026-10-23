import { calendarFromJd, jdFromCalendar, type CalendarDate } from './calendar';
import { jdFromUnixMs, unixMsFromJd } from './julian';
import { SECONDS_PER_DAY } from '../units';

/**
 * Clock time at a place. A named time zone ("Europe/London") uses the
 * browser's copy of the IANA time-zone database, which knows daylight saving
 * and the history of each zone back to its local mean time before standard
 * time arrived (London's clocks ran 1 min 15 s behind Greenwich until 1847).
 * Without a name, a zone is the hour band of the longitude (UTC + longitude/15°,
 * rounded), which is what a ship would use.
 *
 * Times go in and out as Julian Dates in UT; calendar dates follow calendar.ts
 * (Julian before 15 October 1582).
 */

export interface Zone {
  /** An IANA zone name, or null for the longitude's hour band. */
  name: string | null;
  /** East longitude, radians: used when there's no name. */
  longitude: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Whether the browser knows a time-zone name. */
export function isKnownZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The offset of a named zone from UTC at a moment (ms since 1970), in seconds: positive east of Greenwich. */
function namedOffset(timeZone: string, ms: number): number {
  // Work with a whole second: Intl drops fractions of a second, and rounds them differently before 1970.
  const whole = Math.round(ms / 1000) * 1000;
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(new Date(whole)).map((p) => [p.type, p.value]));
  const yearNumber = Number(parts.year);
  // Intl writes years by era; Date uses astronomical numbering (1 BC = 0). Both use the proleptic Gregorian calendar.
  const year = parts.era === 'BC' || parts.era === 'B' ? 1 - yearNumber : yearNumber;
  const local = new Date(0);
  local.setUTCFullYear(year, Number(parts.month) - 1, Number(parts.day));
  local.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second), 0);
  return Math.round((local.getTime() - whole) / 1000);
}

/** The zone's offset from UTC at a moment (Julian Date, UT): seconds, positive east. */
export function utcOffset(zone: Zone, jdUT: number): number {
  if (zone.name) {
    try {
      return namedOffset(zone.name, unixMsFromJd(jdUT));
    } catch {
      // An unknown name falls back to the hour band.
    }
  }
  return Math.round((zone.longitude * 180) / Math.PI / 15) * 3600;
}

/** A clock reading: the calendar date and time of day. */
export interface ClockTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** The clock time in a zone at a moment (Julian Date, UT). Seconds are whole. */
export function clockTime(zone: Zone, jdUT: number): ClockTime {
  const offset = utcOffset(zone, jdUT);
  // Round to the second first, so 23:59:59.9 doesn't show as the wrong day.
  const localJd = Math.round((jdUT + offset / SECONDS_PER_DAY) * SECONDS_PER_DAY) / SECONDS_PER_DAY;
  const date = calendarFromJd(localJd);
  const whole = Math.floor(date.day);
  let seconds = Math.round((date.day - whole) * SECONDS_PER_DAY);
  if (seconds >= SECONDS_PER_DAY) seconds = SECONDS_PER_DAY - 1;
  return {
    year: date.year,
    month: date.month,
    day: whole,
    hour: Math.floor(seconds / 3600),
    minute: Math.floor((seconds % 3600) / 60),
    second: seconds % 60,
  };
}

/**
 * The moment (Julian Date, UT) when a zone's clocks read a time. Around a
 * daylight-saving change, a time that happens twice gives the first, and a
 * time that never happens is read with the offset from just before it.
 */
export function jdFromClockTime(zone: Zone, time: ClockTime): number {
  const date: CalendarDate = { year: time.year, month: time.month, day: time.day + (time.hour * 3600 + time.minute * 60 + time.second) / SECONDS_PER_DAY };
  const local = jdFromCalendar(date);
  // The offset depends on the moment, which depends on the offset: two rounds settle it.
  let jd = local - utcOffset(zone, local) / SECONDS_PER_DAY;
  jd = local - utcOffset(zone, jd) / SECONDS_PER_DAY;
  return jd;
}

/** "UTC+1", "UTC−5", "UTC+5:30", "UTC−0:01:15", "UTC". Offset in seconds. */
export function formatOffset(offset: number): string {
  if (offset === 0) return 'UTC';
  const sign = offset > 0 ? '+' : '−';
  const total = Math.abs(offset);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const tail = s ? `:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : m ? `:${String(m).padStart(2, '0')}` : '';
  return `UTC${sign}${h}${tail}`;
}

/** The moment now, as a Julian Date (UT). */
export function jdNow(): number {
  return jdFromUnixMs(Date.now());
}
