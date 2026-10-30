/**
 * Pair instability: the fate of the heaviest cores, which SSE doesn't model.
 * Above a certain temperature, light in the core turns into electron–positron
 * pairs, the core loses pressure and contracts, and oxygen burns explosively.
 * Ranges by the helium core's mass at the end (M☉), after Heger & Woosley
 * (2002), Woosley (2017) and Belczynski et al. (2016); the gap's lower edge,
 * near 45 M☉ in black holes, after Farmer et al. (2019). The edges are
 * uncertain by several solar masses.
 */

export type PairFate = 'core-collapse' | 'pulsational' | 'pair-instability' | 'direct-collapse';

/** Helium-core masses (M☉) where pulses begin, where the star is blown apart, and where it collapses whole. */
export const PULSATION_ONSET = 35;
export const PISN_ONSET = 65;
export const DIRECT_COLLAPSE_ONSET = 135;
/** The heaviest black hole pulsations leave, M☉ (the lower edge of the gap). */
export const PULSATION_REMNANT_CAP = 45;

/** What happens to a star whose helium core weighs `heCore` M☉ at the end. */
export function pairFate(heCore: number): PairFate {
  if (heCore < PULSATION_ONSET) return 'core-collapse';
  if (heCore < PISN_ONSET) return 'pulsational';
  if (heCore < DIRECT_COLLAPSE_ONSET) return 'pair-instability';
  return 'direct-collapse';
}

/**
 * The remnant's mass (M☉) once pair instability is allowed for, given the helium core's mass and the remnant
 * mass the star would otherwise leave: pulsations shed mass down to at most 45 M☉; a pair-instability supernova
 * leaves nothing.
 */
export function pairRemnant(heCore: number, remnant: number): number {
  switch (pairFate(heCore)) {
    case 'core-collapse':
      return remnant;
    case 'pulsational':
      return Math.min(remnant, PULSATION_REMNANT_CAP);
    case 'pair-instability':
      return 0;
    case 'direct-collapse':
      return remnant;
  }
}
