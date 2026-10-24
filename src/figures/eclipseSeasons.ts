import { eclipsesBetween, sarosNumber, type Eclipse } from '../core/ephemeris/eclipses';
import { phasesBetween, type MoonPhase } from '../core/ephemeris/lunation';
import { meanAscendingNode } from '../core/ephemeris/moon';
import { sunPosition } from '../core/ephemeris/sun';
import { wrapPi } from '../core/math/angles';
import { calendarFromJd, jdFromCalendar } from '../core/time/calendar';
import { ttFromUt, utFromTt } from '../core/time/deltaT';
import { DEG } from '../core/units';
import { MONTHS } from '../viz/time/format';
import { daysInYear } from './sunsYear';

/**
 * Eclipse seasons: an eclipse needs a new or full Moon while the Sun is near
 * one of the nodes of the Moon's tilted orbit. These helpers lay out a year:
 * its new and full Moons, its eclipses (from the eclipse finder), and the
 * stretches when the Sun is close enough to a node. Times are Julian Dates
 * (TT); days of the year count from 1 January 00:00 UT.
 */

/** How close the Sun must be to a node for an eclipse season: within about 15–18° for a solar eclipse; the figure uses 17°. */
export const SEASON_HALF_WIDTH = 17 * DEG;

/** 1 January 00:00 UT of a year, as a Julian Date (TT). */
export function yearStartTT(year: number): number {
  return ttFromUt(jdFromCalendar({ year, month: 1, day: 1 }));
}

/** The day of the year (with its fraction) of a moment. */
export function dayOfYearTT(year: number, jdTT: number): number {
  return jdTT - yearStartTT(year);
}

/** The Sun's angle from the nearer node of the Moon's orbit, and which node: radians, −π/2 to π/2. */
export function sunFromNode(jdTT: number): { angle: number; node: 'ascending' | 'descending' } {
  const d = wrapPi(sunPosition(jdTT).lon - meanAscendingNode(jdTT));
  if (Math.abs(d) <= Math.PI / 2) return { angle: d, node: 'ascending' };
  return { angle: wrapPi(d - Math.PI), node: 'descending' };
}

export interface YearOfEclipses {
  year: number;
  days: number;
  phases: (MoonPhase & { day: number })[];
  eclipses: (Eclipse & { day: number; saros: number })[];
  /** Eclipse seasons: [first day, last day] spans within the year. */
  seasons: { from: number; to: number; node: 'ascending' | 'descending' }[];
}

export function yearOfEclipses(year: number): YearOfEclipses {
  const start = yearStartTT(year);
  const days = daysInYear(year);
  const end = start + days;
  const phases = phasesBetween(start, end)
    .filter((p) => p.name === 'new' || p.name === 'full')
    .map((p) => ({ ...p, day: p.jdTT - start }));
  const eclipses = eclipsesBetween(start, end).map((e) => ({ ...e, day: e.jdTT - start, saros: sarosNumber(e) }));
  const seasons: YearOfEclipses['seasons'] = [];
  let open: { from: number; node: 'ascending' | 'descending' } | null = null;
  for (let d = 0; d <= days; d += 0.25) {
    const s = sunFromNode(start + d);
    const inside = Math.abs(s.angle) < SEASON_HALF_WIDTH;
    if (inside && !open) open = { from: d, node: s.node };
    if (!inside && open) {
      seasons.push({ ...open, to: d });
      open = null;
    }
  }
  if (open) seasons.push({ ...open, to: days });
  return { year, days, phases, eclipses, seasons };
}

/** "Total solar eclipse", "Penumbral lunar eclipse". */
export function eclipseName(e: Eclipse): string {
  const type = e.type[0].toUpperCase() + e.type.slice(1);
  return `${type} ${e.kind} eclipse`;
}

/** "12 August" for a moment (Julian Date, TT), in UT. */
export function dateText(jdTT: number): string {
  const d = calendarFromJd(utFromTt(jdTT));
  return `${Math.floor(d.day)} ${MONTHS[d.month - 1]}`;
}
