/**
 * The arithmetic of Figure 2.4. In a year of Y Sun days, Earth turns Y + 1
 * times against the stars, so a star (sidereal) day lasts Y/(Y + 1) Sun days.
 * Times are in Sun days from a moment when you face the Sun and a distant star
 * together.
 */

/** The tropical year, in mean solar days. */
export const TROPICAL_YEAR = 365.2422;

/** The star day for a year of Y Sun days: days. 23 h 56 min 4 s for the real year. */
export function siderealDayFor(yearDays: number): number {
  return yearDays / (yearDays + 1);
}

/** How many times the star has come back to your meridian by time t (days). */
export function starTransitsBy(t: number, yearDays: number): number {
  return Math.floor(t / siderealDayFor(yearDays) + 1e-9);
}

/** How many noons have passed by time t (days). */
export function sunTransitsBy(t: number): number {
  return Math.floor(t + 1e-9);
}

/** "1 day 23 h 56 min", "23 h 56 min 4 s" for durations under a day. */
export function formatDayClock(days: number): string {
  const totalSeconds = Math.round(days * 86_400);
  const d = Math.floor(totalSeconds / 86_400);
  const h = Math.floor((totalSeconds % 86_400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const clock = `${h} h ${String(m).padStart(2, '0')} min`;
  if (d === 0) return s ? `${clock} ${String(s).padStart(2, '0')} s` : clock;
  return `${d} ${d === 1 ? 'day' : 'days'} ${clock}`;
}
