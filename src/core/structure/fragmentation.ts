import { M_SUN } from '../constants';
import { densityOf, jeansMass, MU_MOLECULAR } from '../ism/jeans';

/**
 * Why clouds make many stars (Figure 20.3): Hoyle's (1953) hierarchical
 * fragmentation. A cold cloud radiates the heat of its collapse and stays at
 * about 10 K, so its Jeans mass, M_J ∝ T^{3/2} ρ^{−1/2} (Chapter 16's
 * convention), falls as it gets denser: every fourfold rise in density halves
 * it, and the cloud breaks into ever smaller pieces. That stops when the
 * fragments become opaque to their own heat and warm up: the opacity limit,
 * about 0.007–0.01 solar masses (Low & Lynden-Bell 1976; Rees 1976).
 *
 * Masses in solar masses, densities in molecules (H₂ with its helium) per
 * cubic centimetre, as astronomers quote clouds.
 */

/** A dark cloud's temperature, K. */
export const CLOUD_TEMPERATURE = 10;

/** The opacity limit, the smallest fragments a collapsing cloud makes, solar masses (published estimates). */
export const OPACITY_LIMIT = { low: 0.007, high: 0.01 } as const;

/** The Jeans mass (solar masses) of molecular gas at 10 K with this many molecules per cubic centimetre. */
export function jeansMassAt(perCm3: number, kelvin = CLOUD_TEMPERATURE): number {
  return jeansMass(kelvin, densityOf(perCm3 * 1e6, MU_MOLECULAR), MU_MOLECULAR) / M_SUN;
}

/** The density (molecules per cm³) at which gas at 10 K has a Jeans mass of `massSolar`: M_J ∝ ρ^{−1/2}. */
export function densityForJeansMass(massSolar: number, kelvin = CLOUD_TEMPERATURE): number {
  const ref = jeansMassAt(1, kelvin);
  return (ref / massSolar) ** 2;
}

export interface Fragmentation {
  /** The Jeans mass at this density, solar masses. */
  jeansMass: number;
  /** Fragmentation has stopped: the Jeans mass has reached the opacity limit. */
  opaque: boolean;
  /** Each fragment's mass, solar masses (the Jeans mass, or the opacity limit once reached). */
  fragmentMass: number;
  /** How many fragments the cloud has broken into. */
  fragments: number;
  /** Halvings of the Jeans mass since the cloud began to collapse: the depth of the tree. */
  levels: number;
}

/**
 * A cloud of `cloudMass` solar masses, collapsing at 10 K from the density at
 * which it just becomes unstable: how far it has broken up at `perCm3`
 * molecules per cubic centimetre. Each level of the tree is a fourfold rise in
 * density, which halves the Jeans mass, so each fragment splits in two.
 */
export function fragmentationAt(cloudMass: number, perCm3: number): Fragmentation {
  const start = densityForJeansMass(cloudMass);
  const jm = jeansMassAt(Math.max(start, perCm3));
  const opaque = jm <= OPACITY_LIMIT.high;
  const fragmentMass = Math.max(jm, OPACITY_LIMIT.high);
  const levels = Math.max(0, Math.floor(Math.log2(cloudMass / fragmentMass) + 1e-9));
  return { jeansMass: jm, opaque, fragmentMass, fragments: 2 ** levels, levels };
}
