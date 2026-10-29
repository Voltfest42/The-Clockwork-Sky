import { C } from '../constants';

/**
 * The Doppler shift of light from a source moving along the line of sight:
 * λ_seen = λ_rest (1 + v/c), with v positive away from us (a redshift). Exact
 * enough for stars, whose speeds are thousandths of c or less; at 300 km/s the
 * relativistic correction is 5 parts in 10⁷ of the wavelength.
 */

/** The wavelength (same units as rest) seen from a source moving at v m/s, positive away. */
export function shiftedWavelength(rest: number, velocity: number): number {
  return rest * (1 + velocity / C);
}

/** The speed along the line of sight, m/s, positive away, from a line's rest and seen wavelengths: v = c Δλ / λ. */
export function velocityFromShift(rest: number, seen: number): number {
  return (C * (seen - rest)) / rest;
}

/** The relativistic shift, for comparison: λ_seen = λ_rest √((1 + β) / (1 − β)). */
export function relativisticWavelength(rest: number, velocity: number): number {
  const beta = velocity / C;
  return rest * Math.sqrt((1 + beta) / (1 - beta));
}
