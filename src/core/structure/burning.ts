import type { Mix } from './eos';

/**
 * How fast hydrogen burns into helium, as heat released per kilogram per
 * second (W/kg), from the textbook fits for the two ways stars do it
 * (Kippenhahn, Weigert & Weiss, eqs. 18.63 and 18.65, from Caughlan & Fowler's
 * rates). Chapter 22 opens the box; Chapter 21's star builder needs only the
 * rates. ρ in kg/m³, T in K.
 *
 * - **The pp chain**: ε = 2.57 × 10⁴ f g ρX² T₉^−⅔ exp(−3.381/T₉^⅓) erg/g/s
 *   (ρ in g/cm³, T₉ in 10⁹ K), counting only the main branch (ppI); at the
 *   Sun's centre, where about a third of chains take the ppII branch, it is
 *   about a fifth low.
 * - **The CNO cycle**: ε = 8.24 × 10²⁵ f g X_CN X ρ T₉^−⅔ exp(−15.231/T₉^⅓ −
 *   (T₉/0.8)²) erg/g/s, limited by its slowest step, ¹⁴N(p,γ)¹⁵O. X_CN is the
 *   carbon and nitrogen that run the cycle, counted as ¹⁴N: 0.23 of the
 *   metals, as in Model S (oxygen joins the cycle too slowly to count here).
 * - **Screening**: the electrons round each nucleus soften its repulsion,
 *   f = exp(0.0059 Z₁Z₂ (ζρ/T₇³)^½) (Salpeter's weak screening), a few per
 *   cent for pp in the Sun and about a third for CNO.
 */

/** The carbon and nitrogen that catalyse the CNO cycle, as ¹⁴N, per unit of metals (Model S's starting mix). */
export const CN_SHARE = 0.23;

/** Salpeter's weak-screening factor for charges Z₁ and Z₂ (ρ in g/cm³, T₇ in 10⁷ K). */
function screening(z1z2: number, rhoGcc: number, T7: number, { X, Z }: Mix): number {
  // ζ = Σ (Z_i² + Z_i) X_i / A_i: 2 for hydrogen, 1.5 for helium, about 4 for the metals.
  const zeta = 2 * X + 1.5 * (1 - X - Z) + 4 * Z;
  return Math.exp(0.00592 * z1z2 * Math.sqrt((zeta * rhoGcc) / T7 ** 3));
}

/** The pp chain's heating, W/kg. */
export function ppRate(rho: number, T: number, mix: Mix): number {
  if (T <= 0 || mix.X <= 0) return 0;
  const g = rho / 1000;
  const t9 = T / 1e9;
  const g11 = 1 + 3.82 * t9 + 1.51 * t9 * t9 + 0.144 * t9 ** 3 - 0.0114 * t9 ** 4;
  const erg = 2.57e4 * screening(1, g, T / 1e7, mix) * g11 * g * mix.X * mix.X * t9 ** (-2 / 3) * Math.exp(-3.381 / Math.cbrt(t9));
  return erg * 1e-4; // erg/g/s → W/kg
}

/** The CNO cycle's heating, W/kg. */
export function cnoRate(rho: number, T: number, mix: Mix): number {
  if (T <= 0 || mix.X <= 0) return 0;
  const g = rho / 1000;
  const t9 = T / 1e9;
  const g141 = Math.max(0, 1 - 2.0 * t9 + 3.41 * t9 * t9 - 2.43 * t9 ** 3);
  const erg =
    8.24e25 *
    screening(7, g, T / 1e7, mix) *
    g141 *
    CN_SHARE *
    mix.Z *
    mix.X *
    g *
    t9 ** (-2 / 3) *
    Math.exp(-15.231 / Math.cbrt(t9) - (t9 / 0.8) ** 2);
  return erg * 1e-4;
}

/** Both together, W/kg. */
export function burningRate(rho: number, T: number, mix: Mix): number {
  return ppRate(rho, T, mix) + cnoRate(rho, T, mix);
}

/** How steeply a rate climbs with temperature, d ln ε / d ln T, by a centred difference. */
export function temperatureExponent(rate: (rho: number, T: number, mix: Mix) => number, rho: number, T: number, mix: Mix): number {
  const h = 1e-4;
  return (Math.log(rate(rho, T * (1 + h), mix)) - Math.log(rate(rho, T * (1 - h), mix))) / (Math.log(1 + h) - Math.log(1 - h));
}
