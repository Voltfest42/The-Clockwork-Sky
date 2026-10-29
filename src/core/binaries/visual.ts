import { eccentricAnomaly } from '../ephemeris/kepler';
import { ARCSEC, DEG } from '../units';

/**
 * Visual binaries: where the fainter star of a pair sits relative to the
 * brighter one on the sky, from the orbit's Campbell elements, through the
 * Thiele–Innes constants and Kepler's equation.
 *
 * Elements are as in the Sixth Catalog of Orbits of Visual Binary Stars: the
 * period P and periastron time T in years, the semi-major axis a in
 * arcseconds, the angles in degrees (Ω for equinox J2000). Outputs are in
 * radians: separation ρ and position angle θ, measured from north through east.
 */

export interface VisualOrbit {
  /** Period, years. */
  period: number;
  /** Time of periastron, as a fractional year. */
  periastron: number;
  /** Semi-major axis, arcseconds. */
  a: number;
  e: number;
  /** Inclination, degrees. */
  i: number;
  /** Position angle of the ascending node, degrees. */
  node: number;
  /** Argument of periastron, degrees. */
  omega: number;
}

/** The fainter star's offset from the brighter at a fractional year: north and east (radians, east as Δα cos δ), separation and position angle. */
export function visualPosition(orbit: VisualOrbit, year: number): { north: number; east: number; separation: number; positionAngle: number } {
  const w = orbit.omega * DEG;
  const W = orbit.node * DEG;
  const i = orbit.i * DEG;
  const a = orbit.a * ARCSEC;
  // Thiele–Innes constants.
  const A = a * (Math.cos(w) * Math.cos(W) - Math.sin(w) * Math.sin(W) * Math.cos(i));
  const B = a * (Math.cos(w) * Math.sin(W) + Math.sin(w) * Math.cos(W) * Math.cos(i));
  const F = a * (-Math.sin(w) * Math.cos(W) - Math.cos(w) * Math.sin(W) * Math.cos(i));
  const G = a * (-Math.sin(w) * Math.sin(W) + Math.cos(w) * Math.cos(W) * Math.cos(i));
  const M = (2 * Math.PI * (year - orbit.periastron)) / orbit.period;
  const E = eccentricAnomaly(M, orbit.e);
  const x = Math.cos(E) - orbit.e;
  const y = Math.sqrt(1 - orbit.e * orbit.e) * Math.sin(E);
  const north = A * x + F * y;
  const east = B * x + G * y;
  const pa = Math.atan2(east, north);
  return { north, east, separation: Math.hypot(north, east), positionAngle: pa < 0 ? pa + 2 * Math.PI : pa };
}

/** A Julian-year date (2026.83) from Unix milliseconds. */
export function fractionalYear(ms: number): number {
  return 2000 + (ms - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86_400_000);
}
