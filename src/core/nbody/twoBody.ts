import { pointAtMeanAnomaly } from '../orbits/ellipse';

/**
 * The exact answer for two bodies, to start simulations from and to check
 * them against. Units are the caller's: μ = G(m₁ + m₂) in L³/T², lengths in
 * L, times in T. The orbit lies in the x–y plane with perihelion on the +x
 * axis, and the body goes round anticlockwise.
 */

/** The relative position (L) and velocity (L/T) at perihelion of an orbit of semi-major axis a and eccentricity e < 1. */
export function perihelionState(mu: number, a: number, e: number): { x: [number, number, number]; v: [number, number, number] } {
  const q = a * (1 - e);
  return { x: [q, 0, 0], v: [0, Math.sqrt((mu * (1 + e)) / q), 0] };
}

/** The orbit's period, T. */
export function orbitPeriod(mu: number, a: number): number {
  return 2 * Math.PI * Math.sqrt((a * a * a) / mu);
}

/** Where the body is (L) a time t (T) after perihelion, from Kepler's equation. */
export function keplerPosition(mu: number, a: number, e: number, t: number): { x: number; y: number } {
  const M = (2 * Math.PI * t) / orbitPeriod(mu, a);
  const p = pointAtMeanAnomaly({ a, e }, M);
  return { x: p.x, y: p.y };
}

/** The speed for a circular orbit at distance r (L/T). */
export function circularSpeed(mu: number, r: number): number {
  return Math.sqrt(mu / r);
}

/** The speed needed to escape from distance r, never to fall back (L/T): √2 times the circular speed. */
export function escapeSpeed(mu: number, r: number): number {
  return Math.sqrt((2 * mu) / r);
}
