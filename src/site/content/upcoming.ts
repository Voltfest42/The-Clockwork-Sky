import { eclipsesBetween, type LunarEclipse, type SolarEclipse } from '../../core/ephemeris/eclipses';
import { alignments, type Wanderer } from '../../core/ephemeris/wanderers';
import { calendarFromJd } from '../../core/time/calendar';
import { ttFromUt, utFromTt } from '../../core/time/deltaT';
import { jdFromUnixMs } from '../../core/time/julian';
import regions from '../../data/eclipseRegions.json';
import { MONTHS } from '../../viz/time/format';

/**
 * What comes next, from today: the next total eclipses and the next time a
 * planet is opposite the Sun. The dates come from the course's own eclipse
 * finder and planet positions, so they stay right whenever the page is read;
 * where an eclipse can be seen comes from NASA's tables (src/data/
 * eclipseRegions.json, 2021–2050), and is left out beyond them.
 *
 * Times are Julian Dates (TT); "now" is milliseconds since 1970, as from Date.now().
 */

const YEAR = 365.25;

/** Milliseconds since 1970 (UTC) as a Julian Date (TT). */
export function jdTTFromMs(ms: number): number {
  return ttFromUt(jdFromUnixMs(ms));
}

/** "2 August 2027": the UT date of a Julian Date (TT). */
export function dayLabel(jdTT: number): string {
  const { year, month, day } = calendarFromJd(utFromTt(jdTT));
  return `${Math.floor(day)} ${MONTHS[month - 1]} ${year}`;
}

/** The Julian Date (TT) at noon on a "YYYY-MM-DD" date in the tables. */
function tableJd(date: string): number {
  return jdTTFromMs(Date.parse(`${date}T12:00:00Z`));
}

/** The table's entry within a day of an eclipse the finder found, if the table reaches that far. */
function match<T extends { date: string }>(list: readonly T[], jdTT: number): T | undefined {
  return list.find((e) => Math.abs(tableJd(e.date) - jdTT) < 1);
}

export interface UpcomingSolarEclipse {
  jdTT: number;
  date: string;
  /** The places the path of totality crosses, in words, if NASA's table reaches this far. */
  path?: string;
  /** The longest totality anywhere along the path, seconds. */
  seconds?: number;
}

export interface UpcomingLunarEclipse {
  jdTT: number;
  date: string;
  /** The parts of the world that see it, in words, if NASA's table reaches this far. */
  seen?: string;
}

/** Eclipses after `fromTT`, a few years at a time, until `enough` of them pass the test. */
function nextEclipses<E extends SolarEclipse | LunarEclipse>(fromTT: number, test: (e: SolarEclipse | LunarEclipse) => e is E, enough: number): E[] {
  const found: E[] = [];
  for (let start = fromTT; found.length < enough && start < fromTT + 60 * YEAR; start += 5 * YEAR) {
    found.push(...eclipsesBetween(start, start + 5 * YEAR).filter(test));
  }
  return found.filter((e) => e.jdTT > fromTT).slice(0, enough);
}

/** The next `count` total eclipses of the Sun after a time. */
export function nextTotalSolarEclipses(fromTT: number, count = 3): UpcomingSolarEclipse[] {
  return nextEclipses(fromTT, (e): e is SolarEclipse => e.kind === 'solar' && e.type === 'total', count).map((e) => {
    const entry = match(regions.solar, e.jdTT);
    return { jdTT: e.jdTT, date: dayLabel(e.jdTT), path: entry?.path, seconds: entry?.seconds ?? undefined };
  });
}

/** The next total eclipse of the Moon after a time. */
export function nextTotalLunarEclipse(fromTT: number): UpcomingLunarEclipse {
  const [e] = nextEclipses(fromTT, (x): x is LunarEclipse => x.kind === 'lunar' && x.type === 'total', 1);
  return { jdTT: e.jdTT, date: dayLabel(e.jdTT), seen: match(regions.lunar, e.jdTT)?.seen };
}

/** The next time a planet beyond Earth is opposite the Sun, after a time: Julian Date (TT). */
export function nextOpposition(planet: Exclude<Wanderer, 'mercury' | 'venus'>, fromTT: number): number {
  for (let start = fromTT; ; start += 2 * YEAR) {
    const next = alignments(planet, start, start + 2 * YEAR).find((a) => a.kind === 'opposition' && a.jdTT > fromTT);
    if (next) return next.jdTT;
  }
}

/** The last date NASA's table of eclipse regions covers, "YYYY-MM-DD". */
export const REGIONS_UNTIL = regions.covers.to;

/** A list of places as a phrase: "Greenland, Iceland and Spain", with "the" where English wants it ("the Arctic"). */
export function placeList(text: string): string {
  const places = text.split(', ').map((p) => (/^(Arctic|Philippines|Middle East|Dominican Republic)$|(Pacific|Atlantic|Indian Ocean|US|Americas)$/.test(p) && !p.startsWith('the ') ? `the ${p}` : p));
  return places.length > 1 ? `${places.slice(0, -1).join(', ')} and ${places[places.length - 1]}` : places[0];
}

/** "6 minutes 23 seconds". */
export function durationWords(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  return m === 0 ? part(s, 'second') : s === 0 ? part(m, 'minute') : `${part(m, 'minute')} ${part(s, 'second')}`;
}
