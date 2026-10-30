import { T_SUN } from '../constants';

/**
 * Brown dwarfs cooling for ever: the power-law fits of Burrows et al. (2001,
 * Rev. Mod. Phys. 73, 719, eqs. 1 and 2) for luminosity and effective
 * temperature against age and mass. Good to tens of per cent for about
 * 0.01–0.07 M☉ (10 to 75 Jupiters) and 0.01–10 billion years; they leave out
 * the early deuterium-burning pause. Masses in M☉, ages in years, luminosities
 * in L☉, temperatures in K.
 */

/** The least mass that fuses hydrogen for good at solar metallicity, M☉ (Chabrier et al. 2023: 78.5 Jupiters). */
export const HYDROGEN_BURNING_LIMIT = 0.075;

/** Jupiter's mass in solar masses (M☉ / M♃ = 1,047.57). */
export const JUPITER_MASS = 1 / 1047.57;

/** The Rosseland mean opacity the fits assume, cm²/g. */
const KAPPA = 1e-2;

/** Luminosity, L☉, of a brown dwarf of `mass` (M☉) at `age` (years). */
export function brownDwarfLuminosity(mass: number, age: number, kappa = KAPPA): number {
  return 4e-5 * (1e9 / age) ** 1.3 * (mass / 0.05) ** 2.64 * (kappa / 1e-2) ** 0.35;
}

/** Effective temperature, K, of a brown dwarf of `mass` (M☉) at `age` (years). */
export function brownDwarfTemperature(mass: number, age: number, kappa = KAPPA): number {
  return 1550 * (1e9 / age) ** 0.32 * (mass / 0.05) ** 0.83 * (kappa / 1e-2) ** 0.088;
}

/** Radius, R☉, from the fits' luminosity and temperature (L = R² T⁴ in solar units). */
export function brownDwarfRadius(mass: number, age: number): number {
  return Math.sqrt(brownDwarfLuminosity(mass, age)) / (brownDwarfTemperature(mass, age) / T_SUN) ** 2;
}

/** The spectral class a cooling brown dwarf passes through at a temperature (K), roughly. */
export function coolClassOf(kelvin: number): 'M' | 'L' | 'T' | 'Y' {
  if (kelvin >= 2300) return 'M';
  if (kelvin >= 1300) return 'L';
  if (kelvin >= 500) return 'T';
  return 'Y';
}
