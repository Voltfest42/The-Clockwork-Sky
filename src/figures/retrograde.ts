import { earthHeliocentric, moonGeocentric, planetGeocentric } from '../core/ephemeris/bodies';
import { siderealPeriodDays } from '../core/ephemeris/meanLongitude';
import { heliocentricEcliptic, J2000_OBLIQUITY } from '../core/ephemeris/planets';
import { retrogradeLoops, type RetrogradeLoop, type Wanderer } from '../core/ephemeris/wanderers';
import { angleBetween, normalize, rotateX, type Vec3 } from '../core/math/vec3';
import { calendarFromJd, formatYear } from '../core/time/calendar';
import { utFromTt } from '../core/time/deltaT';
import { MONTHS } from '../viz/time/format';

/**
 * The data behind Figure 5.2: a planet's backward loop, with Earth's and the
 * planet's places from above (heliocentric, J2000 ecliptic, AU) and the
 * planet's direction on the sky (geocentric, J2000 equatorial unit vectors)
 * through a window of time around it. Times are Julian Dates (TT).
 */

export type LoopPlanet = Extract<Wanderer, 'mars' | 'jupiter' | 'saturn' | 'venus'>;
export const LOOP_PLANETS: readonly LoopPlanet[] = ['mars', 'jupiter', 'saturn', 'venus'];

/** Average days between loops (the synodic periods). */
const SYNODIC: Record<LoopPlanet, number> = { mars: 779.94, jupiter: 398.88, saturn: 378.09, venus: 583.92 };

/** The first loop whose middle (opposition, or Venus's inferior conjunction) is on or after a date. */
export function loopAfter(planet: LoopPlanet, jdTT: number): RetrogradeLoop {
  const s = SYNODIC[planet];
  const loops = retrogradeLoops(planet, jdTT - 0.6 * s, jdTT + 1.6 * s);
  return loops.find((l) => l.middle >= jdTT) ?? loops[loops.length - 1];
}

/** The last loop whose middle is before a date. */
export function loopBefore(planet: LoopPlanet, jdTT: number): RetrogradeLoop {
  const s = SYNODIC[planet];
  const loops = retrogradeLoops(planet, jdTT - 1.6 * s, jdTT + 0.6 * s);
  return [...loops].reverse().find((l) => l.middle < jdTT) ?? loops[0];
}

/** How many days either side of the loop's middle the figure shows. */
export function halfWindow(planet: LoopPlanet, loop: RetrogradeLoop): number {
  return Math.round(loop.days * (planet === 'venus' ? 1.0 : 1.4));
}

export interface LoopSample {
  jdTT: number;
  /** From above: x, y in the J2000 ecliptic, AU, Sun at the origin. */
  earth: { x: number; y: number };
  planet: { x: number; y: number };
  /** The planet's direction from Earth on the sky. */
  direction: Vec3;
}

/** Earth and the planet every `step` days from one date to another. */
export function sampleLoop(planet: LoopPlanet, fromTT: number, toTT: number, step = 1): LoopSample[] {
  const out: LoopSample[] = [];
  for (let t = fromTT; t <= toTT + 1e-9; t += step) {
    const earthEq = earthHeliocentric(t, moonGeocentric(t));
    const earth = rotateX(earthEq, -J2000_OBLIQUITY);
    const p = heliocentricEcliptic(planet, t);
    out.push({ jdTT: t, earth: { x: earth[0], y: earth[1] }, planet: { x: p[0], y: p[1] }, direction: normalize(planetGeocentric(planet, t, earthEq)) });
  }
  return out;
}

/** An orbit's outline from above, J2000 ecliptic, AU: one sidereal period sampled around a date. */
export function orbitOutline(planet: LoopPlanet | 'earth', jdTT: number, n = 240): { x: number; y: number }[] {
  const period = siderealPeriodDays(planet);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const p = heliocentricEcliptic(planet, jdTT - period / 2 + (period * i) / n);
    out.push({ x: p[0], y: p[1] });
  }
  return out;
}

/** The widest angle of a set of sky directions from their middle one: radians. For sizing the sky chart. */
export function spread(directions: readonly Vec3[]): number {
  const middle = directions[Math.floor(directions.length / 2)];
  return Math.max(...directions.map((d) => angleBetween(d, middle)));
}

/**
 * The direction of the line of sight from Earth to the planet, as a unit
 * vector in the same frame: where it points among the distant stars, which
 * are so far away that only the direction matters.
 */
export function sightDirection(earth: { x: number; y: number }, planet: { x: number; y: number }): { x: number; y: number } {
  const dx = planet.x - earth.x;
  const dy = planet.y - earth.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** "16 January 2025" for a Julian Date (TT), in UT. */
export function dateLabel(jdTT: number): string {
  const { year, month, day } = calendarFromJd(utFromTt(jdTT));
  return `${Math.floor(day)} ${MONTHS[month - 1]} ${formatYear(year)}`;
}
