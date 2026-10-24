import { apsis } from '../core/ephemeris/seasons';
import { sunPosition } from '../core/ephemeris/sun';
import { dailySunlight, dayLength, noonAltitude, SOLAR_CONSTANT, solarDeclination } from '../core/sky/sunlight';
import { calendarFromJd } from '../core/time/calendar';
import { utFromTt } from '../core/time/deltaT';
import { DEG } from '../core/units';
import { dayOfYearOf, daysInYear, noonOfDay } from './sunsYear';

/**
 * The seasons machine's sums: the real Sun's longitude and distance for each
 * day of a year, and what a tilt of the reader's choosing would make of them
 * at a latitude. Angles in radians unless named in degrees.
 */

export interface SunDay {
  /** Day of the year, 0 = 1 January. */
  day: number;
  /** The Sun's ecliptic longitude of date (radians). */
  lon: number;
  /** Earth–Sun distance, AU. */
  distance: number;
}

/** The real Sun at noon UT on every day of a year. */
export function sunDays(year: number): SunDay[] {
  return Array.from({ length: daysInYear(year) }, (_, day) => {
    const sun = sunPosition(noonOfDay(year, day));
    return { day, lon: sun.lon, distance: sun.distance };
  });
}

export interface DayFacts {
  declination: number;
  /** Degrees. */
  noonHeight: number;
  /** Hours. */
  dayLength: number;
  /** Daily mean at the top of the atmosphere, W/m². */
  sunlight: number;
  /** Sunlight on a surface facing the Sun, W/m²: the distance's effect alone. */
  facing: number;
}

/** A day's sunlight at a latitude, with Earth's axis tilted by `obliquity`. */
export function dayFacts(day: SunDay, latitude: number, obliquity: number): DayFacts {
  const declination = solarDeclination(day.lon, obliquity);
  return {
    declination,
    noonHeight: noonAltitude(declination, latitude) / DEG,
    dayLength: dayLength(declination, latitude),
    sunlight: dailySunlight(declination, latitude, day.distance),
    facing: SOLAR_CONSTANT / (day.distance * day.distance),
  };
}

export type Hemisphere = 'north' | 'south';

/** The astronomical season from the Sun's longitude: spring runs from the March equinox to the June solstice in the north. */
export function seasonOf(lon: number, hemisphere: Hemisphere): 'spring' | 'summer' | 'autumn' | 'winter' {
  const quarter = Math.floor(lon / (Math.PI / 2)) % 4;
  const north = (['spring', 'summer', 'autumn', 'winter'] as const)[quarter];
  if (hemisphere === 'north') return north;
  return ({ spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' } as const)[north];
}

/** The days of the year of perihelion and aphelion, and the distances then. */
export function apsisDays(year: number) {
  const day = (jdTT: number) => {
    const date = calendarFromJd(utFromTt(jdTT));
    return dayOfYearOf(year, date.month, Math.floor(date.day));
  };
  const near = apsis(year, 'perihelion');
  const far = apsis(year, 'aphelion');
  return { perihelion: { day: day(near.jdTT), distance: near.distance }, aphelion: { day: day(far.jdTT), distance: far.distance } };
}

/** Ticks for a year's x axis: the 1st of each month, labelled with its initial. */
export function monthTicks(year: number): { value: number; label: string }[] {
  return ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((label, i) => ({ value: dayOfYearOf(year, i + 1, 1), label }));
}

/** The tilt presets: Earth's, none, Mars's and Uranus's (degrees). */
export const TILTS = [
  { label: 'No tilt', degrees: 0 },
  { label: 'Earth, 23.4°', degrees: 23.44 },
  { label: 'Mars, 25.2°', degrees: 25.19 },
  { label: 'Uranus, 98°', degrees: 97.77 },
] as const;
