import { AU, R_EARTH } from '../constants';
import { moonGeocentric, sunGeocentric } from '../ephemeris/bodies';
import { apply, norm, type Vec3 } from '../math/vec3';
import { DEG } from '../units';
import { horizonFrames, type Place } from './frames';
import { SUNRISE_ALTITUDE } from './sunlight';

/**
 * Where the Sun and the Moon are in your sky, and when they rise, cross the
 * meridian and set. Positions are topocentric (seen from the observer, not
 * Earth's centre, which moves the Moon by up to 1°) and geometric: refraction
 * is allowed for in the altitude of rising and setting, as Meeus ch. 15 does.
 * Times are Julian Dates (TT); angles are radians; azimuth runs from north
 * through east.
 */

const EARTH_RADIUS_AU = R_EARTH / AU;

export type Luminary = 'sun' | 'moon';

/** A body's direction in the observer's east–north–up frame, seen from the observer. */
export function localPosition(body: Luminary, jdTT: number, place: Place): { local: Vec3; distance: number } {
  const geo = body === 'sun' ? sunGeocentric(jdTT) : moonGeocentric(jdTT);
  const v = apply(horizonFrames(jdTT, place).fromJ2000, geo);
  const top: Vec3 = [v[0], v[1], v[2] - EARTH_RADIUS_AU];
  const d = norm(top);
  return { local: [top[0] / d, top[1] / d, top[2] / d], distance: d };
}

/** A body's altitude and azimuth, seen from a place: radians. */
export function altAz(body: Luminary, jdTT: number, place: Place): { alt: number; az: number } {
  const { local } = localPosition(body, jdTT, place);
  let az = Math.atan2(local[0], local[1]);
  if (az < 0) az += 2 * Math.PI;
  return { alt: Math.asin(Math.max(-1, Math.min(1, local[2]))), az };
}

/**
 * The topocentric altitude of a body's centre when its upper edge touches the
 * horizon: refraction (34′) plus its angular radius. That's −0.833° for the
 * Sun, and −0.82° to −0.85° for the Moon. (Meeus 15.1's +0.125° for the Moon
 * is for geocentric positions, so it includes the parallax already applied here.)
 */
export function riseAltitude(body: Luminary, distanceAu: number): number {
  if (body === 'sun') return SUNRISE_ALTITUDE;
  const radius = Math.asin(1737.4 / (distanceAu * (AU / 1000)));
  return -0.5667 * DEG - radius;
}

export interface RiseSet {
  /** When the body's centre comes up through the rising altitude, or null if it doesn't that day. */
  rise: number | null;
  set: number | null;
  /** When it is highest (crossing the meridian), and how high. */
  transit: number;
  transitAltitude: number;
  /** Up all day, or down all day. */
  always: 'up' | 'down' | null;
}

/**
 * Rising, transit and setting of the Sun or the Moon in the 24 hours from a
 * start time (Julian Date, TT): found by stepping through the day every 20
 * minutes and refining each crossing by bisection, to about a second.
 */
export function riseTransitSet(body: Luminary, startTT: number, place: Place): RiseSet {
  const step = 1 / 72;
  const height = (jd: number) => {
    const { local, distance } = localPosition(body, jd, place);
    return Math.asin(Math.max(-1, Math.min(1, local[2]))) - riseAltitude(body, distance);
  };
  const refine = (a: number, b: number, fa: number) => {
    for (let i = 0; i < 30; i++) {
      const m = (a + b) / 2;
      const fm = height(m);
      if (fm > 0 === fa > 0) {
        a = m;
        fa = fm;
      } else b = m;
    }
    return (a + b) / 2;
  };
  let rise: number | null = null;
  let set: number | null = null;
  let best = startTT;
  let bestHeight = -Infinity;
  let previous = height(startTT);
  let anyUp = previous > 0;
  for (let i = 1; i <= 72; i++) {
    const t = startTT + i * step;
    const h = height(t);
    if (h > bestHeight) {
      bestHeight = h;
      best = t;
    }
    if (previous <= 0 && h > 0 && rise === null) rise = refine(t - step, t, previous);
    if (previous > 0 && h <= 0 && set === null) set = refine(t - step, t, previous);
    if (h > 0) anyUp = true;
    previous = h;
  }
  // The highest point, refined by golden-section search around the best sample.
  let a = best - step;
  let b = best + step;
  const r = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 30; i++) {
    const x1 = b - r * (b - a);
    const x2 = a + r * (b - a);
    if (height(x1) > height(x2)) b = x2;
    else a = x1;
  }
  const transit = (a + b) / 2;
  const transitAltitude = altAz(body, transit, place).alt;
  const always = rise === null && set === null ? (anyUp ? 'up' : 'down') : null;
  return { rise, set, transit, transitAltitude, always };
}
