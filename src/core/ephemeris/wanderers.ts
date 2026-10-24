import { wrapPi } from '../math/angles';
import { angleBetween, norm, rotateX, toSpherical, type Vec3 } from '../math/vec3';
import { crossings } from '../math/roots';
import { earthHeliocentric, moonGeocentric, planetGeocentric, sunGeocentric } from './bodies';
import { J2000_OBLIQUITY } from './planets';

/**
 * How the planets move across the sky as seen from Earth: their geocentric
 * longitude and latitude against the stars, how far they are from the Sun
 * (elongation), and the events that mark their cycles: oppositions and
 * conjunctions, greatest elongations, and the stations where a planet stops
 * and turns backwards (retrograde) or forwards again.
 *
 * Longitudes are in the fixed J2000 ecliptic frame, so they are measured
 * against the stars, not the moving equinox. Angles are radians; times are
 * Julian Dates (TT); distances AU. Everything comes from Standish's elements
 * and the Sun and Moon theories (bodies.ts), so it is valid for 3000 BC to
 * AD 3000.
 */

export type Wanderer = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

/** The planets that orbit inside Earth's orbit, and so never get far from the Sun. */
export function isInferior(planet: Wanderer): boolean {
  return planet === 'mercury' || planet === 'venus';
}

/** A geocentric J2000 equatorial vector turned into the J2000 ecliptic frame. */
function eclipticOf(v: Vec3): Vec3 {
  return rotateX(v, -J2000_OBLIQUITY);
}

export interface EclipticPlace {
  /** Ecliptic longitude against the stars (J2000), radians, −π to π. */
  lon: number;
  /** Ecliptic latitude, radians. */
  lat: number;
  /** Distance from Earth's centre, AU. */
  distance: number;
}

/** A planet's geocentric place among the stars at a Julian Date (TT), corrected for light-time. */
export function geocentricPlace(planet: Wanderer, jdTT: number): EclipticPlace {
  const earth = earthHeliocentric(jdTT, moonGeocentric(jdTT));
  const { lon, lat, r } = toSpherical(eclipticOf(planetGeocentric(planet, jdTT, earth)));
  return { lon, lat, distance: r };
}

/** The Sun's geocentric longitude against the stars (J2000 ecliptic), radians. */
export function sunLongitude(jdTT: number): number {
  return toSpherical(eclipticOf(sunGeocentric(jdTT))).lon;
}

/** A planet's longitude minus the Sun's, −π to π: positive when it is east of the Sun (in the evening sky). */
export function longitudeFromSun(planet: Wanderer, jdTT: number): number {
  return wrapPi(geocentricPlace(planet, jdTT).lon - sunLongitude(jdTT));
}

/** The angle between a planet and the Sun as seen from Earth (the elongation), radians, 0 to π. */
export function elongation(planet: Wanderer, jdTT: number): number {
  const earth = earthHeliocentric(jdTT, moonGeocentric(jdTT));
  return angleBetween(planetGeocentric(planet, jdTT, earth), sunGeocentric(jdTT));
}

/** How fast a planet's longitude is changing: radians per day, positive eastwards (direct), negative when retrograde. */
export function longitudeRate(planet: Wanderer, jdTT: number, h = 0.05): number {
  return wrapPi(geocentricPlace(planet, jdTT + h).lon - geocentricPlace(planet, jdTT - h).lon) / (2 * h);
}

/** Root-finding tolerance: about a minute. */
const TOL = 1e-3;

export interface Station {
  jdTT: number;
  /** The planet stops and turns west (retrograde) or turns east again (direct). */
  turns: 'retrograde' | 'direct';
  /** Its longitude there, radians. */
  lon: number;
}

/** The stations between two dates (TT): the moments a planet stands still against the stars and reverses. */
export function stations(planet: Wanderer, fromTT: number, toTT: number): Station[] {
  return crossings((t) => longitudeRate(planet, t), fromTT, toTT, 2, TOL).map((c) => ({
    jdTT: c.x,
    turns: c.direction < 0 ? 'retrograde' : 'direct',
    lon: geocentricPlace(planet, c.x).lon,
  }));
}

export type Alignment = 'opposition' | 'conjunction' | 'inferior conjunction' | 'superior conjunction';

export interface AlignmentEvent {
  jdTT: number;
  kind: Alignment;
}

/**
 * When a planet lines up with the Sun in longitude between two dates (TT): at
 * conjunction (with the Sun) and, for Mars and beyond, at opposition (opposite
 * it). Mercury and Venus have inferior conjunctions, between us and the Sun,
 * and superior ones, beyond it.
 */
export function alignments(planet: Wanderer, fromTT: number, toTT: number): AlignmentEvent[] {
  const inferior = isInferior(planet);
  const sample = inferior ? 2 : 5;
  const out: AlignmentEvent[] = [];
  // Conjunctions: the difference in longitude crosses 0 (ignoring the jump at ±π).
  for (const c of crossings((t) => longitudeFromSun(planet, t), fromTT, toTT, sample, TOL, Math.PI)) {
    const kind = !inferior ? 'conjunction' : geocentricPlace(planet, c.x).distance < norm(sunGeocentric(c.x)) ? 'inferior conjunction' : 'superior conjunction';
    out.push({ jdTT: c.x, kind });
  }
  if (!inferior) {
    for (const c of crossings((t) => wrapPi(longitudeFromSun(planet, t) - Math.PI), fromTT, toTT, sample, TOL, Math.PI)) {
      out.push({ jdTT: c.x, kind: 'opposition' });
    }
  }
  return out.sort((a, b) => a.jdTT - b.jdTT);
}

export interface GreatestElongation {
  jdTT: number;
  /** East of the Sun (an evening star) or west of it (a morning star). */
  side: 'east' | 'west';
  /** The angle from the Sun, radians. */
  angle: number;
}

/** Mercury's or Venus's greatest elongations between two dates (TT): the moments it is farthest from the Sun. */
export function greatestElongations(planet: 'mercury' | 'venus', fromTT: number, toTT: number): GreatestElongation[] {
  const rate = (t: number) => (elongation(planet, t + 0.05) - elongation(planet, t - 0.05)) / 0.1;
  return crossings(rate, fromTT, toTT, 2, TOL)
    .filter((c) => c.direction < 0)
    .map((c) => ({ jdTT: c.x, side: longitudeFromSun(planet, c.x) > 0 ? 'east' : 'west', angle: elongation(planet, c.x) }));
}

export interface RetrogradeLoop {
  /** When the planet stops and turns backwards. */
  begins: Station;
  /** When it stops again and turns forwards. */
  ends: Station;
  /** The opposition (or inferior conjunction) in the middle of it. */
  middle: number;
  /** How long it moves backwards: days. */
  days: number;
  /** How far it moves backwards: radians. */
  arc: number;
}

/** Every complete backward loop between two dates (TT). */
export function retrogradeLoops(planet: Wanderer, fromTT: number, toTT: number): RetrogradeLoop[] {
  const list = stations(planet, fromTT, toTT);
  const middles = alignments(planet, fromTT, toTT).filter((a) => a.kind === 'opposition' || a.kind === 'inferior conjunction');
  const out: RetrogradeLoop[] = [];
  for (let i = 0; i + 1 < list.length; i++) {
    const [begins, ends] = [list[i], list[i + 1]];
    if (begins.turns !== 'retrograde') continue;
    const middle = middles.find((m) => m.jdTT > begins.jdTT && m.jdTT < ends.jdTT);
    out.push({ begins, ends, middle: middle?.jdTT ?? (begins.jdTT + ends.jdTT) / 2, days: ends.jdTT - begins.jdTT, arc: Math.abs(wrapPi(begins.lon - ends.lon)) });
  }
  return out;
}
