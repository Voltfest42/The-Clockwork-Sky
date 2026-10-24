import { meanLongitude } from '../core/ephemeris/meanLongitude';
import { pointAtMeanAnomaly } from '../core/orbits/ellipse';
import { TRANSFER_PLANETS } from '../data/gravity';

/**
 * Getting to Mars (Figure 7.6): the Hohmann transfer, the cheapest way from
 * one circular orbit to another, half an ellipse that touches Earth's orbit at
 * perihelion and Mars's at aphelion. Earth and Mars are on circles at their
 * mean distances (AU), at their mean longitudes (radians) for the date (Julian
 * Date, TT); times in days.
 */

const { earth, mars } = TRANSFER_PLANETS;

/** The transfer orbit: semi-major axis (AU), eccentricity, and the half-orbit's duration (days). */
export const TRANSFER = (() => {
  const a = (earth.a + mars.a) / 2;
  const e = (mars.a - earth.a) / (mars.a + earth.a);
  // Kepler's third law round the Sun, scaled from Earth's orbit.
  const period = earth.period * (a / earth.a) ** 1.5;
  return { a, e, days: period / 2 };
})();

const TAU = 2 * Math.PI;
const wrap = (x: number) => ((x % TAU) + TAU) % TAU;
const wrapPi = (x: number) => wrap(x + Math.PI) - Math.PI;

/** How far Mars must be ahead of Earth at launch to be at the far end of the transfer when the craft gets there (radians, about 44°). */
export const LAUNCH_LEAD = Math.PI - (TAU * TRANSFER.days) / mars.period;

/** The synodic period: how often Earth overtakes Mars, and so how often the launch windows come (days, about 780). */
export const SYNODIC = 1 / (1 / earth.period - 1 / mars.period);

export function earthLongitude(jd: number): number {
  return meanLongitude('earth', jd);
}

export function marsLongitude(jd: number): number {
  return meanLongitude('mars', jd);
}

/** How far Mars is ahead of Earth, round the Sun (radians, from −π to π). */
export function marsLead(jd: number): number {
  return wrapPi(marsLongitude(jd) - earthLongitude(jd));
}

/** The next launch window on or after a date: when Mars leads Earth by LAUNCH_LEAD (Julian Date). */
export function nextWindow(jd: number): number {
  // The lead shrinks steadily as Earth gains on Mars.
  const rate = TAU / SYNODIC;
  return jd + wrap(marsLead(jd) - LAUNCH_LEAD) / rate;
}

/** Where a craft launched at `launch` is at `jd` (AU, the Sun at the origin), or null before launch. */
export function craftPosition(launch: number, jd: number): { x: number; y: number } | null {
  const t = jd - launch;
  if (t < 0) return null;
  const f = Math.min(1, t / TRANSFER.days);
  const p = pointAtMeanAnomaly({ a: TRANSFER.a, e: TRANSFER.e }, Math.PI * f);
  const start = earthLongitude(launch);
  const c = Math.cos(start);
  const s = Math.sin(start);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

/** How far Mars is from the craft's meeting point when it arrives, along Mars's orbit (radians; positive if Mars is ahead). */
export function arrivalMiss(launch: number): number {
  return wrapPi(marsLongitude(launch + TRANSFER.days) - (earthLongitude(launch) + Math.PI));
}

/** A planet's place on its circle (AU). */
export function planetPosition(planet: 'earth' | 'mars', jd: number): { x: number; y: number } {
  const L = planet === 'earth' ? earthLongitude(jd) : marsLongitude(jd);
  const r = TRANSFER_PLANETS[planet].a;
  return { x: r * Math.cos(L), y: r * Math.sin(L) };
}
