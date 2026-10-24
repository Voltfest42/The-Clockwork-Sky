import { noonAltitude, solarDeclination } from '../../core/sky/sunlight';
import { DEG } from '../../core/units';
import { sunDays } from '../../figures/seasons';
import { dayLabel } from '../../figures/sunsYear';

/** Answers for Chapter 3's interactive Check yourself question. */

/** The noon Sun's height (degrees) on every day of a year at a latitude (degrees). */
export function noonHeights(year: number, latitude: number): number[] {
  return sunDays(year).map((d) => noonAltitude(solarDeclination(d.lon, 23.44 * DEG), latitude * DEG) / DEG);
}

/** How close (degrees) to the year's highest noon Sun counts as right: about ten days either side of a solstice. */
export const HIGHEST_TOLERANCE = 0.5;

/** Whether a day (0 = 1 January) is when the noon Sun is highest at a latitude (degrees). */
export function checkHighestNoon(year: number, latitude: number, day: number) {
  const heights = noonHeights(year, latitude);
  const best = Math.max(...heights);
  const height = heights[day];
  const where = Math.abs(latitude) < 0.05 ? 'on the equator' : `at ${Math.abs(latitude).toFixed(1)}° ${latitude > 0 ? 'north' : 'south'}`;
  if (best - height <= HIGHEST_TOLERANCE) {
    const story =
      Math.abs(latitude) <= 23.44
        ? `Between the tropics the noon Sun is highest, straight overhead, on the two days when it passes over your latitude on its way north and south${Math.abs(latitude) < 0.5 ? ': on the equator, at the two equinoxes' : ''}.`
        : latitude > 0
          ? 'That’s the June solstice, when the Sun is as far north as it goes, the longest day of the year in the north.'
          : 'That’s the December solstice, when the Sun is as far south as it goes, the longest day of the year in the south.';
    return {
      correct: true,
      feedback: (
        <p>
          On {dayLabel(year, day)} the noon Sun {where} climbs to {height.toFixed(1)}°, within a whisker of its highest. {story}
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        On {dayLabel(year, day)} the noon Sun {where} climbs to {height.toFixed(0)}°, but on other days it gets {(best - height).toFixed(0)}° higher.
        Look for the day when the Sun is farthest {latitude >= 0 ? 'north' : 'south'}
        {Math.abs(latitude) <= 23.44 ? ', or, between the tropics, when it passes straight over your latitude' : ''}.
      </p>
    ),
  };
}
