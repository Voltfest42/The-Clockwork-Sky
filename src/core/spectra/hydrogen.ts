import { C, EV, H, PROTON_ELECTRON_MASS_RATIO, RYDBERG_INFINITY } from '../constants';

/**
 * Hydrogen's ladder of energy levels, by Bohr's model (1913), which is exact
 * for hydrogen's wavelengths to the accuracy shown here: level n lies 13.6 eV ÷
 * n² below the point where the electron goes free, and a jump between two
 * levels gives out or takes in a photon of 1/λ = R_H (1/n₁² − 1/n₂²).
 */

/** The Rydberg constant for hydrogen, with the reduced mass of electron and proton: about 1.096 776 × 10⁷ m⁻¹. */
export const RYDBERG_H = RYDBERG_INFINITY / (1 + 1 / PROTON_ELECTRON_MASS_RATIO);

/** Hydrogen's ionisation energy from the ground level, eV: R_H h c ≈ 13.598 eV. */
export const HYDROGEN_IONISATION = (RYDBERG_H * H * C) / EV;

/** The energy of level n (1, 2, 3…) above the ground level, eV: 0 for n = 1, 10.2 for n = 2, approaching 13.6. */
export function levelEnergy(n: number): number {
  return HYDROGEN_IONISATION * (1 - 1 / (n * n));
}

/** The energy of level n below the ionisation limit, eV (13.6 for n = 1, 3.4 for n = 2). */
export function bindingEnergy(n: number): number {
  return HYDROGEN_IONISATION / (n * n);
}

/** The wavelength in vacuum (m) of the jump between levels lower and upper. */
export function vacuumWavelength(lower: number, upper: number): number {
  if (!(upper > lower)) throw new Error('The upper level must be above the lower');
  return 1 / (RYDBERG_H * (1 / (lower * lower) - 1 / (upper * upper)));
}

/**
 * A vacuum wavelength (m) as it is measured in air, by the standard formula
 * for air's refractive index (Morton 2000, after Ciddor 1996; the IAU
 * standard). Astronomers quote wavelengths above 200 nm in air: Hα is 656.47
 * nm in vacuum and 656.28 nm in air. Shorter wavelengths are left as they are.
 */
export function vacuumToAir(vacuum: number): number {
  if (vacuum < 200e-9) return vacuum;
  const s2 = (1e-6 / vacuum) ** 2;
  const n = 1 + 8.342_54e-5 + 2.406_147e-2 / (130 - s2) + 1.599_8e-4 / (38.9 - s2);
  return vacuum / n;
}

/** The wavelength (m) of a jump as astronomers quote it: in air above 200 nm, in vacuum below. */
export function wavelength(lower: number, upper: number): number {
  return vacuumToAir(vacuumWavelength(lower, upper));
}

/** The photon's energy, eV, for a jump between two levels. */
export function jumpEnergy(lower: number, upper: number): number {
  return levelEnergy(upper) - levelEnergy(lower);
}

export const SERIES = [
  { lower: 1, name: 'Lyman', region: 'ultraviolet', year: 1906 },
  { lower: 2, name: 'Balmer', region: 'visible', year: 1885 },
  { lower: 3, name: 'Paschen', region: 'infrared', year: 1908 },
] as const;

/** The series a jump belongs to, by its lower level. */
export function seriesOf(lower: number): (typeof SERIES)[number] | undefined {
  return SERIES.find((s) => s.lower === lower);
}

/** The Greek-letter name of a jump within its series: Hα for 3 → 2, Lyβ for 3 → 1, Paα for 4 → 3. */
export function lineName(lower: number, upper: number): string {
  const greek = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η'][upper - lower - 1] ?? `${upper}`;
  const prefix = lower === 1 ? 'Ly' : lower === 2 ? 'H' : lower === 3 ? 'Pa' : `n=${lower} `;
  return `${prefix}${greek}`;
}

/** Where a series ends: the wavelength (m) of a jump from the ionisation limit to its lower level. */
export function seriesLimit(lower: number): number {
  return vacuumToAir((lower * lower) / RYDBERG_H);
}
