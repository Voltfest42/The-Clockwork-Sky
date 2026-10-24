import { angularRadius, skyBodies } from '../core/ephemeris/bodies';
import { jdFromCalendar } from '../core/time/calendar';
import { ttFromUt } from '../core/time/deltaT';
import { ARCSEC } from '../core/units';

/**
 * The geometry behind Figures 5.4 and 5.5: an inner planet seen from Earth,
 * with circular orbits in one plane. Lengths in AU, angles in radians.
 */

/** The angle between the Sun and a planet as seen from Earth, and the angle at the planet between the Sun and Earth. */
export function triangle(a: number, angle: number): { elongation: number; atPlanet: number; distance: number } {
  // Sun at the origin, Earth at (0, −1), the planet at `angle` anticlockwise from the +x axis.
  const px = a * Math.cos(angle);
  const py = a * Math.sin(angle);
  const toSun = { x: 0, y: 1 };
  const toPlanet = { x: px, y: py + 1 };
  const distance = Math.hypot(toPlanet.x, toPlanet.y);
  const elongation = Math.acos(Math.max(-1, Math.min(1, (toSun.x * toPlanet.x + toSun.y * toPlanet.y) / distance)));
  const fromPlanetToSun = { x: -px, y: -py };
  const fromPlanetToEarth = { x: -px, y: -1 - py };
  const dot = fromPlanetToSun.x * fromPlanetToEarth.x + fromPlanetToSun.y * fromPlanetToEarth.y;
  const atPlanet = Math.acos(Math.max(-1, Math.min(1, dot / (a * distance))));
  return { elongation, atPlanet, distance };
}

/** The greatest elongation for a circular orbit of radius a (AU), and the radius it implies: the side of a right-angled triangle. */
export function greatestElongationFor(a: number): number {
  return Math.asin(a);
}

export function radiusFromElongation(elongation: number): number {
  return Math.sin(elongation);
}

export interface VenusView {
  /** The lit fraction of the disc as seen from Earth, 0 to 1. */
  lit: number;
  /** The angle at Venus between the Sun and Earth: 0 full, π new. */
  phaseAngle: number;
  /** Distance from Earth, AU. */
  distance: number;
  /** East of the Sun (+) or west (−), radians. */
  elongation: number;
}

const VENUS_A = 0.723_33;
/** How far Ptolemy's epicycle centre sits from Earth, as a fraction of the Sun's distance: any value that keeps Venus nearer than the Sun. */
export const PTOLEMY_CENTRE = 0.5;

/**
 * Venus a time after superior conjunction (days), in two worlds with the same
 * directions on the sky. Sun-centred: Venus goes round the Sun at 0.72 AU.
 * Ptolemy: Venus rides an epicycle whose centre stays on the line from Earth
 * to the Sun, nearer than the Sun, so the Sun always lights it from behind.
 */
export function venusIn(world: 'copernicus' | 'ptolemy', days: number, synodic = 583.92): VenusView {
  // Relative to the Earth–Sun line, Venus goes round once a synodic period, starting behind the Sun.
  const theta = (2 * Math.PI * days) / synodic;
  // Earth at the origin, the Sun at (1, 0): Venus from Earth is (Sun + a·(cos θ, sin θ)), scaled by d in Ptolemy's world.
  const scale = world === 'ptolemy' ? PTOLEMY_CENTRE : 1;
  const vx = scale * (1 + VENUS_A * Math.cos(theta));
  const vy = scale * VENUS_A * Math.sin(theta);
  const distance = Math.hypot(vx, vy);
  const toEarth = { x: -vx / distance, y: -vy / distance };
  const sx = 1 - vx;
  const sy = -vy;
  const sd = Math.hypot(sx, sy);
  const phaseAngle = Math.acos(Math.max(-1, Math.min(1, (toEarth.x * sx + toEarth.y * sy) / sd)));
  return { lit: (1 + Math.cos(phaseAngle)) / 2, phaseAngle, distance: distance / scale, elongation: Math.atan2(vy, vx) };
}

export interface GalileoView {
  label: string;
  /** Lit fraction, 0 to 1. */
  lit: number;
  /** Apparent diameter, arcseconds. */
  diameter: number;
  /** East of the Sun: the evening sky. */
  east: boolean;
}

/** Venus as Galileo could have seen it from October 1610 to January 1611, from the ephemeris (Gregorian dates, noon UT). */
export function galileosVenus(): GalileoView[] {
  const dates: [number, number, number, string][] = [
    [1610, 10, 1, '1 Oct 1610'],
    [1610, 11, 1, '1 Nov 1610'],
    [1610, 12, 1, '1 Dec 1610'],
    [1610, 12, 20, '20 Dec 1610'],
    [1611, 1, 10, '10 Jan 1611'],
    [1611, 1, 30, '30 Jan 1611'],
  ];
  return dates.map(([year, month, day, label]) => {
    const t = ttFromUt(jdFromCalendar({ year, month, day: day + 0.5 }, 'gregorian'));
    const bodies = skyBodies(t);
    const venus = bodies.find((b) => b.name === 'venus')!;
    const sun = bodies.find((b) => b.name === 'sun')!;
    // East of the Sun when Venus is ahead of it in right ascension, roughly: compare the vectors' cross product with the pole.
    const cross = sun.position[0] * venus.position[1] - sun.position[1] * venus.position[0];
    return { label, lit: venus.illuminated, diameter: (2 * angularRadius(venus)) / ARCSEC, east: cross > 0 };
  });
}
