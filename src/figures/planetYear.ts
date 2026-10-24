import { earthHeliocentric, moonGeocentric, planetGeocentric, sunGeocentric } from '../core/ephemeris/bodies';
import type { Wanderer } from '../core/ephemeris/wanderers';
import { wrapPi } from '../core/math/angles';
import { angleBetween, normalize, rotateX, toSpherical, type Vec3 } from '../core/math/vec3';
import { J2000_OBLIQUITY } from '../core/ephemeris/planets';
import { noonOfDay, daysInYear } from './sunsYear';

/**
 * The five naked-eye planets through one year, sampled at noon UT each day,
 * for Figure 5.1: where they are against the stars, how far from the Sun, and
 * when they move backwards. Times are Julian Dates (TT); angles radians.
 */

export const WANDERERS: readonly Wanderer[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

export const WANDERER_NAMES: Record<Wanderer, string> = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };

/** Track colours on the night sky, told apart by their labels too. */
export const TRACK_COLOURS: Record<Wanderer, string> = {
  mercury: '#a9bed6',
  venus: '#ffe08a',
  mars: '#ff8a5c',
  jupiter: '#62d6c4',
  saturn: '#c9a2ff',
};

export interface PlanetTrack {
  planet: Wanderer;
  /** Geocentric directions, J2000 equatorial unit vectors, one a day. */
  directions: Vec3[];
  /** Ecliptic longitude (J2000) each day, radians. */
  lon: Float64Array;
  /** Angle from the Sun each day (radians), positive east of it (evening sky). */
  fromSun: Float64Array;
  /** Whether it is moving backwards (westwards) against the stars that day. */
  retrograde: boolean[];
}

export interface YearSummary {
  planet: Wanderer;
  /** The farthest it gets from the Sun this year, radians, and on which day (0 = 1 January). */
  farthest: { angle: number; day: number };
  /** Its stretches of backward motion, as whole days of the year (from, to). */
  backwards: { from: number; to: number }[];
}

/** One year of all five planets. */
export function planetYear(year: number): PlanetTrack[] {
  const n = daysInYear(year);
  const tracks = WANDERERS.map<PlanetTrack>((planet) => ({ planet, directions: [], lon: new Float64Array(n + 1), fromSun: new Float64Array(n + 1), retrograde: [] }));
  // One extra day so the last day's motion is known.
  for (let d = 0; d <= n; d++) {
    const t = noonOfDay(year, d);
    const earth = earthHeliocentric(t, moonGeocentric(t));
    const sun = sunGeocentric(t);
    const sunLon = toSpherical(rotateX(sun, -J2000_OBLIQUITY)).lon;
    for (const track of tracks) {
      const v = planetGeocentric(track.planet, t, earth);
      const { lon } = toSpherical(rotateX(v, -J2000_OBLIQUITY));
      track.lon[d] = lon;
      const angle = angleBetween(v, sun);
      track.fromSun[d] = wrapPi(lon - sunLon) >= 0 ? angle : -angle;
      if (d < n) track.directions.push(normalize(v));
    }
  }
  for (const track of tracks) {
    for (let d = 0; d < n; d++) track.retrograde.push(wrapPi(track.lon[d + 1] - track.lon[d]) < 0);
  }
  return tracks;
}

/** The farthest each planet gets from the Sun, and when it moves backwards, in a year of tracks. */
export function summarise(track: PlanetTrack): YearSummary {
  let farthest = { angle: 0, day: 0 };
  for (let d = 0; d < track.directions.length; d++) {
    const a = Math.abs(track.fromSun[d]);
    if (a > farthest.angle) farthest = { angle: a, day: d };
  }
  const backwards: { from: number; to: number }[] = [];
  track.retrograde.forEach((r, d) => {
    if (!r) return;
    const last = backwards[backwards.length - 1];
    if (last && last.to === d - 1) last.to = d;
    else backwards.push({ from: d, to: d });
  });
  return { planet: track.planet, farthest, backwards };
}

/** The runs of days on which a track moves backwards, as index ranges into its directions (inclusive). */
export function backwardRuns(track: PlanetTrack): [number, number][] {
  return summarise(track).backwards.map(({ from, to }) => [from, Math.min(track.directions.length - 1, to + 1)]);
}

/** Where a planet is relative to the Sun, in words: "48° east of the Sun, in the evening sky". */
export function sideOfSun(fromSun: number): string {
  const deg = Math.round((Math.abs(fromSun) * 180) / Math.PI);
  if (deg < 8) return `${deg}° from the Sun, lost in its glare`;
  if (deg > 172) return `${deg}° from the Sun, opposite it: up all night`;
  return `${deg}° ${fromSun > 0 ? 'east' : 'west'} of the Sun, in the ${fromSun > 0 ? 'evening' : 'morning'} sky`;
}
