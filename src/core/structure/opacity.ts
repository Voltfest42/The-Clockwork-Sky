import type { Mix } from './eos';

/**
 * Opacity: how strongly stellar gas blocks light, as the Rosseland mean κ, the
 * cross-section per kilogram (m²/kg; 1 m²/kg = 10 cm²/g). A photon's mean free
 * path is 1/κρ. These are the textbook analytic fits (Carroll & Ostlie ch. 9;
 * Hansen, Kawaler & Trimble ch. 4), written in SI:
 *
 * - **Electron scattering**: free electrons scatter light whatever its
 *   colour, κ_es = 0.02(1 + X) m²/kg (0.2(1 + X) cm²/g; 0.35 cm²/g for the
 *   Sun's X = 0.74). It is the floor in hot, thin gas.
 * - **Bound–free** (photoionisation of metals' inner electrons) and
 *   **free–free** (a free electron absorbing a photon as it passes an ion),
 *   both Kramers' law κ ∝ ρT^−3.5: stronger the cooler and denser the gas.
 *   Bound–free is divided by a guillotine factor t; Novotny's textbook form
 *   (Carroll & Ostlie's StatStar) is refitted here to the Sun's tables
 *   (`guillotine`).
 * - **H⁻**: the fragile negative hydrogen ion, which does most of the blocking
 *   in cool photospheres, κ ∝ (Z/0.02) ρ^½ T⁹ (fitted for 3,000–6,000 K). It
 *   rises so steeply that it is combined harmonically with the rest, so that
 *   it rules only where it is the smaller: once hydrogen ionises, the ion is gone.
 * - **Molecules** and grains, a floor of 0.1Z cm²/g in the coolest gas.
 *
 * Real opacities come from tables (OPAL, OP), which add millions of lines; the
 * textbook fits miss the Sun's by up to a factor of 2.5, the refitted ones by
 * about 20% at most in its radiative zone, and more in cool outer layers. None of the
 * fits has the iron bump near 200,000 K, which drives some stars' pulsations.
 */

/** The coolest temperature the guillotine fit follows, K: the base of the Sun's convection zone. */
export const FIT_FLOOR = 2e6;

/** cgs ↔ SI: ρ in g/cm³ from kg/m³, and κ in m²/kg from cm²/g. */
const toGcc = (rho: number) => rho / 1000;
const CM2_PER_G = 0.1;

export type OpacitySource = 'electron' | 'bound-free' | 'free-free' | 'h-minus' | 'molecules';

export const OPACITY_SOURCE_NAMES: Record<OpacitySource, string> = {
  electron: 'electron scattering',
  'bound-free': 'bound–free (Kramers)',
  'free-free': 'free–free (Kramers)',
  'h-minus': 'the H⁻ ion',
  molecules: 'molecules and grains',
};

/** Electron scattering, m²/kg: 0.02(1 + X). */
export function electronScattering({ X }: Mix): number {
  return 0.2 * (1 + X) * CM2_PER_G;
}

/**
 * The guillotine factor t that tames Kramers' bound–free law, from ρ (kg/m³)
 * and T (K). Novotny's textbook form, 2.82(ρ(1 + X))^0.2, makes the Sun's
 * centre 1.8 times too opaque and the base of its convection zone 2.5 times
 * too clear, because metals keep more of their electrons where it is cooler.
 * Here its coefficient and a temperature term are fitted to Model S's own
 * opacities through the Sun's radiative zone, which it then matches within
 * about 20%: t = 7.1 (ρ(1 + X))^0.2 (T/10⁷ K)^1.35, ρ in g/cm³. The temperature
 * term is held at its value at 2 million K below that, where the fit has no
 * Sun to follow (the Sun convects there); left to run, it swells hot stars'
 * envelopes.
 */
export function guillotine(rho: number, T: number, { X }: Mix): number {
  return 7.1 * (toGcc(rho) * (1 + X)) ** 0.2 * (Math.max(T, FIT_FLOOR) / 1e7) ** 1.35;
}

/** Novotny's textbook guillotine factor, 2.82(ρ(1 + X))^0.2 (ρ in g/cm³), for comparison. */
export function textbookGuillotine(rho: number, { X }: Mix): number {
  return 2.82 * (toGcc(rho) * (1 + X)) ** 0.2;
}

/** Bound–free absorption by Kramers' law, m²/kg: 4.34 × 10²⁵ Z(1 + X) ρT^−3.5 / t cm²/g (ρ in g/cm³). `textbook` uses Novotny's t. */
export function boundFree(rho: number, T: number, mix: Mix, textbook = false): number {
  const t = textbook ? textbookGuillotine(rho, mix) : guillotine(rho, T, mix);
  return (4.34e25 / t) * mix.Z * (1 + mix.X) * toGcc(rho) * T ** -3.5 * CM2_PER_G;
}

/** The textbook sum of electron scattering and Kramers' two laws with Novotny's guillotine, m²/kg: what the fit improves on. */
export function textbookOpacity(rho: number, T: number, mix: Mix): number {
  return electronScattering(mix) + boundFree(rho, T, mix, true) + freeFree(rho, T, mix);
}

/** Free–free absorption by Kramers' law, m²/kg: 3.68 × 10²² (1 − Z)(1 + X) ρT^−3.5 cm²/g. */
export function freeFree(rho: number, T: number, { X, Z }: Mix): number {
  return 3.68e22 * (1 - Z) * (1 + X) * toGcc(rho) * T ** -3.5 * CM2_PER_G;
}

/** The H⁻ ion, m²/kg: 2.5 × 10⁻³¹ (Z/0.02) ρ^½ T⁹ cm²/g (for 3,000–6,000 K). */
export function hMinus(rho: number, T: number, { Z }: Mix): number {
  return 2.5e-31 * (Z / 0.02) * Math.sqrt(toGcc(rho)) * T ** 9 * CM2_PER_G;
}

/** Molecules and grains in the coolest gas, m²/kg: 0.1Z cm²/g. */
export function molecular({ Z }: Mix): number {
  return 0.1 * Z * CM2_PER_G;
}

/** Each source's share, m²/kg; `total` combines them as `opacity` does. */
export interface OpacityParts {
  electron: number;
  boundFree: number;
  freeFree: number;
  hMinus: number;
  molecules: number;
  total: number;
}

/** Every source at density ρ (kg/m³) and temperature T (K), and the total. */
export function opacityParts(rho: number, T: number, mix: Mix): OpacityParts {
  const electron = electronScattering(mix);
  const bf = boundFree(rho, T, mix);
  const ff = freeFree(rho, T, mix);
  const hm = hMinus(rho, T, mix);
  const mol = molecular(mix);
  const ionised = electron + bf + ff;
  return {
    electron,
    boundFree: bf,
    freeFree: ff,
    hMinus: hm,
    molecules: mol,
    total: mol + 1 / (1 / hm + 1 / ionised),
  };
}

/** The Rosseland mean opacity, m²/kg, at density ρ (kg/m³) and temperature T (K). */
export function opacity(rho: number, T: number, mix: Mix): number {
  return opacityParts(rho, T, mix).total;
}

/** Which source blocks most of the light at ρ (kg/m³) and T (K): the regions of Figure 21.2. */
export function dominantOpacity(rho: number, T: number, mix: Mix): OpacitySource {
  const p = opacityParts(rho, T, mix);
  const ionised = p.electron + p.boundFree + p.freeFree;
  // Where H⁻ is the smaller of the two it rules the harmonic sum; molecules only where they beat both.
  const harmonic = p.total - p.molecules;
  if (p.molecules > harmonic) return 'molecules';
  if (p.hMinus < ionised) return 'h-minus';
  if (p.electron >= p.boundFree && p.electron >= p.freeFree) return 'electron';
  return p.boundFree >= p.freeFree ? 'bound-free' : 'free-free';
}

/** A photon's mean free path, m: 1/κρ. */
export function meanFreePath(kappa: number, rho: number): number {
  return 1 / (kappa * rho);
}
