/**
 * Where the stellar-evolution engine can be trusted, by initial mass (M☉) and
 * metallicity Z, from the papers' own ranges: SSE's formulas are fitted to
 * Pols et al. (1998)'s models of 0.5–50 M☉ at Z = 0.0001–0.03, and stated valid
 * for 0.1–100 M☉ (Hurley, Pols & Tout 2000). Below the hydrogen-burning limit
 * brown-dwarf cooling takes over; above about 100 M☉ pair instability decides
 * the end; nothing here is reliable above 150 M☉ or outside SSE's metallicities.
 */
import { HYDROGEN_BURNING_LIMIT } from './brownDwarfs';

export type Zone = 'fitted' | 'extrapolated' | 'other-model' | 'unreliable';

export const SSE_FITTED = { mass: [0.5, 50], z: [0.0001, 0.03] } as const;
export const SSE_VALID = { mass: [0.1, 100] } as const;
export const RELIABLE_MAX_MASS = 150;

export function zoneOf(mass: number, z: number): Zone {
  if (z < SSE_FITTED.z[0] || z > SSE_FITTED.z[1] || mass > RELIABLE_MAX_MASS) return 'unreliable';
  if (mass < HYDROGEN_BURNING_LIMIT) return 'other-model';
  if (mass >= SSE_FITTED.mass[0] && mass <= SSE_FITTED.mass[1]) return 'fitted';
  if (mass > SSE_VALID.mass[1]) return 'other-model';
  return 'extrapolated';
}
