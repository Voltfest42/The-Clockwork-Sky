import { AU, C } from '../constants';
import { eclipticMatrix } from '../coords/precession';
import { add, angleBetween, apply, fromSpherical, norm, scale, sub, transpose, type Vec3 } from '../math/vec3';
import { SECONDS_PER_DAY } from '../units';
import type { PlanetName } from './meanLongitude';
import { moonPosition } from './moon';
import { equatorialFromEclipticJ2000, heliocentricEcliptic, planetsValidAt } from './planets';
import { sunPosition } from './sun';

/**
 * The Sun, the Moon and the planets as seen from Earth's centre, all in one
 * frame: the J2000 mean equator and equinox (within 0.02″ of the ICRF), with
 * vectors in AU. Planets are corrected for light-time, so they match JPL's
 * "astrometric" positions; nothing is corrected for aberration or nutation.
 */

export type SkyBodyName = 'sun' | 'moon' | Exclude<PlanetName, 'earth'>;

export const NAKED_EYE_PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;
export const SKY_PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;

/** Earth's mass over the Moon's (DE430). */
const EARTH_MOON_MASS_RATIO = 81.300_569_07;

/** The light-time for one AU, in days (about 499 s). */
const LIGHT_DAYS_PER_AU = AU / C / SECONDS_PER_DAY;

const KM_PER_AU = AU / 1000;

export interface SkyBody {
  name: SkyBodyName;
  /** Geocentric position, AU, J2000 equatorial frame. */
  position: Vec3;
  /** Distance from Earth's centre, AU. */
  distance: number;
  /** Visual magnitude (approximate, for drawing). */
  magnitude: number;
  /** Sun–body–Earth angle, radians: 0 when fully lit, π when the lit side faces away. The Sun's is 0. */
  phaseAngle: number;
  /** The lit fraction of the disc as seen from Earth, 0 to 1. */
  illuminated: number;
  /** Physical radius, km, for the disc's angular size. */
  radiusKm: number;
}

const RADIUS_KM: Record<SkyBodyName, number> = {
  sun: 695_700,
  moon: 1737.4,
  mercury: 2439.7,
  venus: 6051.8,
  mars: 3389.5,
  jupiter: 69_911,
  saturn: 58_232,
  uranus: 25_362,
  neptune: 24_622,
};

/**
 * Visual magnitudes from the Astronomical Almanac (1984), as given by Meeus
 * (ch. 41): the planet's brightness at 1 AU from the Sun and from us, plus a
 * phase term in i (degrees). Saturn's rings, which add up to 0.7 mag when wide
 * open, are left out.
 */
function planetMagnitude(name: Exclude<SkyBodyName, 'sun' | 'moon'>, r: number, delta: number, iDeg: number): number {
  const distance = 5 * Math.log10(r * delta);
  const i = iDeg;
  switch (name) {
    case 'mercury':
      return -0.42 + distance + 0.038 * i - 0.000273 * i * i + 0.000002 * i * i * i;
    case 'venus':
      return -4.4 + distance + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i * i * i;
    case 'mars':
      return -1.52 + distance + 0.016 * i;
    case 'jupiter':
      return -9.4 + distance + 0.005 * i;
    case 'saturn':
      return -8.88 + distance;
    case 'uranus':
      return -7.19 + distance;
    case 'neptune':
      return -6.87 + distance;
  }
}

/** The Sun's geocentric position (AU, J2000 equatorial) at a Julian Date (TT), from Meeus ch. 25. */
export function sunGeocentric(jdTT: number): Vec3 {
  const sun = sunPosition(jdTT);
  return apply(transpose(eclipticMatrix(jdTT)), fromSpherical(sun.lon, 0, sun.distance));
}

/** The Moon's geocentric position (AU, J2000 equatorial) at a Julian Date (TT), from Meeus ch. 47. */
export function moonGeocentric(jdTT: number): Vec3 {
  const moon = moonPosition(jdTT);
  return apply(transpose(eclipticMatrix(jdTT)), fromSpherical(moon.lon, moon.lat, moon.distanceKm / KM_PER_AU));
}

/** Earth's centre, heliocentric (AU, J2000 equatorial): the Earth–Moon barycentre less Earth's small share of the Moon's offset. */
function earthHeliocentric(jdTT: number, moon: Vec3): Vec3 {
  const barycentre = equatorialFromEclipticJ2000(heliocentricEcliptic('earth', jdTT));
  return sub(barycentre, scale(moon, 1 / (1 + EARTH_MOON_MASS_RATIO)));
}

/**
 * A planet's geocentric astrometric position (AU, J2000 equatorial) at a
 * Julian Date (TT): where it was when the light now arriving left it.
 * Throws outside 3000 BC–AD 3000.
 */
export function planetGeocentric(planet: Exclude<PlanetName, 'earth'>, jdTT: number, earth = earthHeliocentric(jdTT, moonGeocentric(jdTT))): Vec3 {
  let tau = 0;
  let v: Vec3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    v = sub(equatorialFromEclipticJ2000(heliocentricEcliptic(planet, jdTT - tau)), earth);
    tau = norm(v) * LIGHT_DAYS_PER_AU;
  }
  return v;
}

/**
 * Everything in the Solar System that the sky view draws, at a Julian Date
 * (TT). The planets are left out outside 3000 BC–AD 3000, where their elements
 * aren't valid.
 */
export function skyBodies(jdTT: number): SkyBody[] {
  const sun = sunGeocentric(jdTT);
  const moon = moonGeocentric(jdTT);
  const sunDistance = norm(sun);
  const bodies: SkyBody[] = [];

  bodies.push({ name: 'sun', position: sun, distance: sunDistance, magnitude: -26.74, phaseAngle: 0, illuminated: 1, radiusKm: RADIUS_KM.sun });

  const moonPhase = angleBetween(sub(sun, moon), scale(moon, -1));
  const iMoon = (moonPhase * 180) / Math.PI;
  bodies.push({
    name: 'moon',
    position: moon,
    distance: norm(moon),
    magnitude: -12.73 + 0.026 * iMoon + 4e-9 * iMoon ** 4,
    phaseAngle: moonPhase,
    illuminated: (1 + Math.cos(moonPhase)) / 2,
    radiusKm: RADIUS_KM.moon,
  });

  if (planetsValidAt(jdTT)) {
    const earth = earthHeliocentric(jdTT, moon);
    for (const name of SKY_PLANETS) {
      const geo = planetGeocentric(name, jdTT, earth);
      const helio = add(geo, earth);
      const phase = angleBetween(scale(helio, -1), scale(geo, -1));
      const delta = norm(geo);
      bodies.push({
        name,
        position: geo,
        distance: delta,
        magnitude: planetMagnitude(name, norm(helio), delta, (phase * 180) / Math.PI),
        phaseAngle: phase,
        illuminated: (1 + Math.cos(phase)) / 2,
        radiusKm: RADIUS_KM[name],
      });
    }
  }
  return bodies;
}

/** A body's angular radius as seen from a distance (AU): radians. */
export function angularRadius(body: Pick<SkyBody, 'radiusKm' | 'distance'>): number {
  return Math.asin(Math.min(1, body.radiusKm / (body.distance * KM_PER_AU)));
}
