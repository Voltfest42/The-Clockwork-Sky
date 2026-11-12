import { GM_SUN, C, AU } from '../constants';
import { eccentricAnomaly } from '../ephemeris/kepler';
import type { VisualOrbit } from '../binaries/visual';
import { ARCSEC, DEG, SECONDS_PER_JULIAN_YEAR } from '../units';

/**
 * A star's orbit round the Galaxy's black hole (Figure 30.5): where S2 is on
 * the sky and along the line of sight, how fast it moves, what relativity adds
 * to its light's redshift, and how far its orbit turns each lap.
 *
 * Elements as for a visual binary (core/binaries/visual.ts): the period and
 * periastron time in years, the semi-major axis in arcseconds, angles in
 * degrees. The line of sight z points away from us, so a positive radial
 * velocity is a redshift. Lengths come out in AU and speeds in km/s, using
 * the distance (pc) to turn angles into lengths.
 */

/** One km/s in AU per year. */
const KMS_IN_AU_PER_YEAR = (1e3 * SECONDS_PER_JULIAN_YEAR) / AU;

/** Kepler's third law in the Sun's units: the mass (M☉) an orbit of semi-major axis a (AU) and period P (years) goes round, a³/P². */
export function keplerMass(aAu: number, periodYears: number): number {
  return aAu ** 3 / periodYears ** 2;
}

/** The orbit's semi-major axis in AU, from arcseconds at a distance in parsecs (1″ at 1 pc is 1 AU). */
export function semiMajorAxisAu(orbit: VisualOrbit, distancePc: number): number {
  return orbit.a * distancePc;
}

export interface OrbitPoint {
  /** Offsets on the sky from the black hole, arcseconds: east (as Δα cos δ) and north. */
  east: number;
  north: number;
  /** Along the line of sight, away from us, AU. */
  z: number;
  /** Distance from the black hole, AU. */
  r: number;
  /** Radial velocity (away from us) and total speed, km/s. */
  vz: number;
  speed: number;
  /** True anomaly, radians. */
  nu: number;
}

/**
 * Where the star is at a fractional year: on the sky, along the line of sight
 * and in speed. `turn` (radians) is added to the argument of periastron, to
 * draw a precessing orbit.
 */
export function orbitAt(orbit: VisualOrbit, year: number, distancePc: number, turn = 0): OrbitPoint {
  const w = orbit.omega * DEG + turn;
  const W = orbit.node * DEG;
  const i = orbit.i * DEG;
  const n = (2 * Math.PI) / orbit.period;
  const M = n * (year - orbit.periastron);
  const E = eccentricAnomaly(M, orbit.e);
  const root = Math.sqrt(1 - orbit.e * orbit.e);
  const x = Math.cos(E) - orbit.e;
  const y = root * Math.sin(E);
  const edot = n / (1 - orbit.e * Math.cos(E));
  const xdot = -Math.sin(E) * edot;
  const ydot = root * Math.cos(E) * edot;
  // Thiele–Innes constants for a unit semi-major axis, and the line of sight's pair
  const A = Math.cos(w) * Math.cos(W) - Math.sin(w) * Math.sin(W) * Math.cos(i);
  const B = Math.cos(w) * Math.sin(W) + Math.sin(w) * Math.cos(W) * Math.cos(i);
  const F = -Math.sin(w) * Math.cos(W) - Math.cos(w) * Math.sin(W) * Math.cos(i);
  const G = -Math.sin(w) * Math.sin(W) + Math.cos(w) * Math.cos(W) * Math.cos(i);
  const Cz = Math.sin(w) * Math.sin(i);
  const Hz = Math.cos(w) * Math.sin(i);
  const aAu = semiMajorAxisAu(orbit, distancePc);
  const vScale = aAu / KMS_IN_AU_PER_YEAR;
  const vx = xdot * vScale;
  const vy = ydot * vScale;
  return {
    north: orbit.a * (A * x + F * y),
    east: orbit.a * (B * x + G * y),
    z: aAu * (Cz * x + Hz * y),
    r: aAu * (1 - orbit.e * Math.cos(E)),
    vz: Cz * vx + Hz * vy,
    speed: Math.hypot(vx, vy),
    nu: 2 * Math.atan2(Math.sqrt(1 + orbit.e) * Math.sin(E / 2), Math.sqrt(1 - orbit.e) * Math.cos(E / 2)),
  };
}

/** The black hole's GM over c², in AU, for a mass in M☉. */
function gravitationalRadius(mass: number): number {
  return (GM_SUN * mass) / (C * C) / AU;
}

/**
 * What relativity adds to the star's redshift, as a speed (km/s): the
 * gravitational redshift GM/rc² and the transverse Doppler shift v²/2c², to
 * first order (GRAVITY 2018's PPN(1)). About 200 km/s at S2's pericentre.
 */
export function relativisticRedshift(point: OrbitPoint, mass: number): number {
  const c = C / 1e3;
  return c * (gravitationalRadius(mass) / point.r + (point.speed / c) ** 2 / 2);
}

/** The Schwarzschild precession per orbit (radians): 6πGM / (c² a (1 − e²)). */
export function precessionPerOrbit(orbit: VisualOrbit, mass: number, distancePc: number): number {
  return (6 * Math.PI * gravitationalRadius(mass)) / (semiMajorAxisAu(orbit, distancePc) * (1 - orbit.e * orbit.e));
}

/** The first pericentre at or after a fractional year. */
export function nextPericentre(orbit: VisualOrbit, year: number): number {
  return orbit.periastron + Math.ceil((year - orbit.periastron) / orbit.period) * orbit.period;
}

/** The pericentre distance (AU) and the speed there (km/s). */
export function pericentre(orbit: VisualOrbit, mass: number, distancePc: number): { r: number; speed: number } {
  const a = semiMajorAxisAu(orbit, distancePc);
  const r = a * (1 - orbit.e);
  const gm = 4 * Math.PI * Math.PI * mass; // AU³/yr²
  const speed = Math.sqrt((gm * (1 + orbit.e)) / r) / KMS_IN_AU_PER_YEAR;
  return { r, speed };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A fractional (Julian) year as a month and year: 2018.379 → "May 2018". */
export function yearLabel(year: number): string {
  const date = new Date(Date.UTC(2000, 0, 1, 12) + (year - 2000) * 365.25 * 86_400_000);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** An angle in arcseconds as milliarcseconds. */
export const toMas = (arcsec: number) => arcsec * 1000;

/** A radian count as arcminutes. */
export const toArcmin = (radians: number) => radians / (ARCSEC * 60);
