import { AMU, C, H, K_B, M_E, SIGMA } from '../constants';

/**
 * Equations of state for stellar gas (Part III): what pressure a gas of a given
 * density, temperature and make-up exerts, from its ions, its electrons and its
 * light. SI units: densities kg/m³, temperatures K, pressures Pa, number
 * densities m⁻³.
 *
 * - Ions and non-degenerate electrons are ideal gases, P = nkT.
 * - Radiation: P = aT⁴/3, with a = 4σ/c.
 * - Electrons at zero temperature, packed as tightly as the Pauli principle
 *   allows: Chandrasekhar's exact pressure for any Fermi momentum, from
 *   non-relativistic (P ∝ n^{5/3}) to relativistic (P ∝ n^{4/3}).
 * - Partly degenerate electrons by Paczyński's interpolation (1983),
 *   P_e ≈ (P_ideal² + P_degenerate²)^½, good to a few per cent.
 *
 * The gas is fully ionised. Make-up is given by the mass fractions of hydrogen
 * (X) and metals (Z); helium is the rest.
 */

/** The radiation constant a = 4σ/c, J m⁻³ K⁻⁴. */
export const A_RAD = (4 * SIGMA) / C;

/** Mass fractions of hydrogen and of everything heavier than helium. */
export interface Mix {
  X: number;
  Z: number;
}

/** The Sun's starting mix, near enough: 70% hydrogen, 2% metals. */
export const SOLAR_MIX: Mix = { X: 0.7, Z: 0.02 };

/** Mean mass per particle of fully ionised gas, in atomic mass units: 1/μ ≈ 2X + 3Y/4 + Z/2. */
export function meanMolecularWeight({ X, Z }: Mix): number {
  const Y = 1 - X - Z;
  return 1 / (2 * X + 0.75 * Y + 0.5 * Z);
}

/** Mass per electron in atomic mass units, μ_e = 2/(1 + X): 1.18 for the Sun's mix, 2 for helium, carbon or oxygen. */
export function electronMolecularWeight({ X }: Mix): number {
  return 2 / (1 + X);
}

/** Mass per ion in atomic mass units (metals' ions left out, as they add little): 1/μ_ion ≈ X + Y/4. */
export function ionMolecularWeight({ X, Z }: Mix): number {
  return 1 / (X + (1 - X - Z) / 4);
}

/** The pressure of an ideal gas of density ρ and temperature T whose particles average μ atomic mass units. */
export function idealPressure(rho: number, T: number, mu: number): number {
  return (rho * K_B * T) / (mu * AMU);
}

/** The pressure of black-body radiation at T: aT⁴/3. */
export function radiationPressure(T: number): number {
  return (A_RAD * T ** 4) / 3;
}

/** Electrons per cubic metre in gas of density ρ with μ_e atomic mass units per electron. */
export function electronDensity(rho: number, mue: number): number {
  return rho / (mue * AMU);
}

/** The Fermi momentum, kg m/s, of electrons packed n per cubic metre: p_F = h (3n/8π)^{1/3}. */
export function fermiMomentum(n: number): number {
  return H * Math.cbrt((3 * n) / (8 * Math.PI));
}

/** The relativity parameter x = p_F / (m_e c): about 1 at 10⁹ kg/m³ (10⁶ g/cm³) for μ_e = 2. */
export function relativityParameter(n: number): number {
  return fermiMomentum(n) / (M_E * C);
}

/**
 * The pressure of electrons at zero temperature, packed n per cubic metre
 * (Chandrasekhar 1935): P = (π m_e⁴ c⁵ / 3h³) [x(2x² − 3)√(1 + x²) + 3 asinh x].
 * At small x it is (3π²)^{2/3} ħ² n^{5/3} / (5 m_e); at large x, (3π²)^{1/3} ħ c n^{4/3} / 4.
 */
export function degeneratePressure(n: number): number {
  const x = relativityParameter(n);
  if (x < 0.1) {
    // The full form loses digits to cancellation at small x (its terms are ~3x, its sum ~8x⁵/5): use its series,
    // 8x⁵/5 − 4x⁷/7 + x⁹/3, good to 1.4 × 10⁻⁷ at x = 0.1.
    return ((Math.PI * M_E ** 4 * C ** 5) / (3 * H ** 3)) * ((8 / 5) * x ** 5) * (1 - (5 / 14) * x * x + (5 / 24) * x ** 4);
  }
  return ((Math.PI * M_E ** 4 * C ** 5) / (3 * H ** 3)) * (x * (2 * x * x - 3) * Math.sqrt(1 + x * x) + 3 * Math.asinh(x));
}

/** The electrons' pressure at density ρ and temperature T, partly degenerate, by Paczyński's interpolation. */
export function electronPressure(rho: number, T: number, mue: number): number {
  const n = electronDensity(rho, mue);
  const ideal = n * K_B * T;
  const packed = degeneratePressure(n);
  return Math.hypot(ideal, packed);
}

/** Everything's pressure: ions, electrons (partly degenerate) and light. */
export function totalPressure(rho: number, T: number, mix: Mix): number {
  return idealPressure(rho, T, ionMolecularWeight(mix)) + electronPressure(rho, T, electronMolecularWeight(mix)) + radiationPressure(T);
}

/**
 * The temperature at which gas of density ρ and make-up `mix` has pressure P,
 * found by bisection in log T. Zero when the packed electrons alone already
 * push harder than P: no temperature is cold enough.
 */
export function temperatureFor(rho: number, pressure: number, mix: Mix): number {
  const mue = electronMolecularWeight(mix);
  if (degeneratePressure(electronDensity(rho, mue)) >= pressure) return 0;
  let lo = 0; // log₁₀ T
  let hi = 11;
  if (totalPressure(rho, 10 ** hi, mix) < pressure) return Infinity;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (totalPressure(rho, 10 ** mid, mix) > pressure) hi = mid;
    else lo = mid;
  }
  return 10 ** ((lo + hi) / 2);
}

/** Which pressure is largest. */
export type Regime = 'radiation' | 'gas' | 'degenerate' | 'relativistic';

/**
 * Which pushes hardest at density ρ and temperature T: light, hot gas (ions and
 * electrons as an ideal gas), or electrons packed as tightly as they can be,
 * either moving well below light's speed ("degenerate") or near it
 * ("relativistic", Fermi momentum above m_e c). The regions of the core's map.
 */
export function dominantPressure(rho: number, T: number, mix: Mix): Regime {
  const mue = electronMolecularWeight(mix);
  const n = electronDensity(rho, mue);
  const gas = idealPressure(rho, T, meanMolecularWeight(mix));
  const light = radiationPressure(T);
  const packed = degeneratePressure(n);
  if (packed > gas && packed > light) return relativityParameter(n) > 1 ? 'relativistic' : 'degenerate';
  return light > gas ? 'radiation' : 'gas';
}

/** The density (kg/m³) at which radiation's pressure equals the gas's, at temperature T: ρ = aμm_u T³ / 3k. */
export function radiationGasBoundary(T: number, mix: Mix): number {
  return (A_RAD * meanMolecularWeight(mix) * AMU * T ** 3) / (3 * K_B);
}

/**
 * The density (kg/m³) at which gas of make-up `mix` at temperature T (K) has
 * pressure P (Pa): the equation of state turned round, as a star builder needs
 * it. Ions and electrons are ideal, plus light; with `packed`, the electrons
 * are partly degenerate (Paczyński's interpolation), found by Newton's method
 * in ln ρ from the ideal-gas answer, which is the largest the density can be.
 * NaN when light alone pushes harder than P.
 */
export function densityFor(P: number, T: number, mix: Mix, packed = true): number {
  const gas = P - radiationPressure(T);
  if (!(gas > 0) || !(T > 0)) return NaN;
  const ideal = (gas * meanMolecularWeight(mix) * AMU) / (K_B * T);
  if (!packed) return ideal;
  const mui = ionMolecularWeight(mix);
  const mue = electronMolecularWeight(mix);
  let lnRho = Math.log(ideal);
  for (let i = 0; i < 40; i++) {
    const rho = Math.exp(lnRho);
    const ions = idealPressure(rho, T, mui);
    const n = electronDensity(rho, mue);
    const thermal = n * K_B * T;
    const deg = degeneratePressure(n);
    const electrons = Math.hypot(thermal, deg);
    // d P/d ln ρ: ions and hot electrons go as ρ; packed electrons as n dP/dn = n m_e c² x² / 3√(1 + x²).
    const x = relativityParameter(n);
    const dDeg = (n * M_E * C * C * x * x) / (3 * Math.sqrt(1 + x * x));
    const slope = ions + (thermal * thermal + deg * dDeg) / electrons;
    const step = (ions + electrons - gas) / slope;
    lnRho -= step;
    if (Math.abs(step) < 1e-12) break;
  }
  return Math.exp(lnRho);
}

/** The share of the pressure from gas rather than light, β = P_gas / P. */
export function gasShare(P: number, T: number): number {
  return Math.max(0, Math.min(1, 1 - radiationPressure(T) / P));
}

/**
 * The adiabatic gradient ∇_ad = (∂ ln T / ∂ ln P) at constant entropy, for a
 * mix of ideal gas and light with gas share β: (8 − 6β)/(32 − 24β − 3β²).
 * 0.4 for gas alone, 0.25 for light alone. A rising parcel of gas cools at
 * this rate as it expands; if the star's own temperature falls faster, the
 * parcel stays warmer than its surroundings and keeps rising: convection.
 * (Packed electrons that move slower than light also keep 0.4.)
 */
export function adiabaticGradient(beta: number): number {
  return (8 - 6 * beta) / (32 - 24 * beta - 3 * beta * beta);
}

/**
 * The first adiabatic exponent Γ₁ = (∂ ln P / ∂ ln ρ) at constant entropy for
 * ideal gas and light (Chandrasekhar): β + (4 − 3β)²(γ − 1)/(β + 12(γ − 1)(1 − β)),
 * with γ = 5/3: from 5/3 for gas alone to 4/3 for light alone. How stiffly the
 * gas resists squeezing; a star whose average Γ₁ falls to 4/3 can't hold itself up.
 */
export function gamma1(beta: number): number {
  const g = 2 / 3;
  return beta + ((4 - 3 * beta) ** 2 * g) / (beta + 12 * g * (1 - beta));
}
