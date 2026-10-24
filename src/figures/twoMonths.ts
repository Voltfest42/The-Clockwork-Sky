/**
 * The arithmetic of Figure 4.2: the Moon goes round Earth once against the
 * stars in a sidereal month, but Earth moves along its orbit meanwhile, so the
 * Moon needs a couple of days more to line up with the Sun again: the synodic
 * month, new Moon to new Moon. Times in days from a new Moon that is also
 * lined up with a distant star.
 */

/** The sidereal month: the Moon's turn against the stars, days. */
export const SIDEREAL_MONTH = 27.321_662;

/** The sidereal year: Earth's turn round the Sun against the stars, days. */
export const SIDEREAL_YEAR = 365.256_36;

/** The synodic month for a year of Y days: 1/S = 1/P − 1/Y. 29.53 days for the real year. */
export function synodicMonthFor(yearDays: number): number {
  return 1 / (1 / SIDEREAL_MONTH - 1 / yearDays);
}

/** How many times the Moon has come back in line with the star by time t (days). */
export function starAlignmentsBy(t: number): number {
  return Math.floor(t / SIDEREAL_MONTH + 1e-9);
}

/** How many new Moons have passed by time t (days). */
export function newMoonsBy(t: number, yearDays: number): number {
  return Math.floor(t / synodicMonthFor(yearDays) + 1e-9);
}

/** "29 days 12 h 44 min". */
export function formatDays(days: number): string {
  const totalMinutes = Math.round(days * 1440);
  const d = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = totalMinutes % 60;
  return `${d} days ${h} h ${String(m).padStart(2, '0')} min`;
}
