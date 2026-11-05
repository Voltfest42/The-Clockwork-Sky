import { AMU, C, H, K_B, M_E } from '../constants';
import { A_RAD } from './eos';

/**
 * Electrons (and positrons) at any temperature and any packing (Part III,
 * Chapters 24 and 25): the Fermi–Dirac integrals done by quadrature, so the
 * gas goes smoothly from a hot, thin ideal gas to Chandrasekhar's cold packed
 * electrons, slow or near light speed, and, hot enough, makes electron–positron
 * pairs out of its light.
 *
 * Inside, momenta are in units of m_e c (t = p/m_e c) and energies in m_e c²
 * (ε = √(1 + t²), the rest mass included); the chemical potential ψ = μ/m_e c²
 * includes the rest mass too, and θ = kT/m_e c². At the boundaries everything is
 * SI: densities kg/m³, number densities m⁻³, pressures Pa, energy densities J/m³.
 *
 * In equilibrium with light, positrons have chemical potential −μ, so the net
 * number of electrons n₋ − n₊ is fixed by the gas's charge: n_e = ρ/(μ_e m_u).
 */

/** The electron's Compton wavelength h/(m_e c), m. */
const LAMBDA_C = H / (M_E * C);
/** Two spin states over the phase-space cell: n = (8π/λ_C³) ∫ t² f dt. */
const N_UNIT = (8 * Math.PI) / LAMBDA_C ** 3;
const MC2 = M_E * C * C;

// Eight-point Gauss–Legendre nodes and weights on [−1, 1].
const GL_X = [-0.960289856497536, -0.796666477413627, -0.525532409916329, -0.18343464249565, 0.18343464249565, 0.525532409916329, 0.796666477413627, 0.960289856497536];
const GL_W = [0.101228536290376, 0.222381034453374, 0.313706645877887, 0.362683783378362, 0.362683783378362, 0.313706645877887, 0.222381034453374, 0.101228536290376];

/** The Fermi–Dirac integrals of one kind of particle, dimensionless. */
export interface FermiIntegrals {
  /** ∫ t² f dt: the number density over 8π/λ_C³. */
  N: number;
  /** (1/3) ∫ t⁴/ε f dt: the pressure over 8π m_e c²/λ_C³. */
  P: number;
  /** ∫ t² ε f dt: the energy density, rest mass included, over 8π m_e c²/λ_C³. */
  E: number;
  /** ∂N/∂ψ = (1/θ) ∫ t² f(1 − f) dt. */
  dN: number;
}

/** The occupation of a state of energy ε (m_e c²) for chemical potential ψ and temperature θ: 1/(e^{(ε − ψ)/θ} + 1). */
export function occupation(eps: number, psi: number, theta: number): number {
  const x = (eps - psi) / theta;
  if (x > 700) return 0;
  if (x < -700) return 1;
  return 1 / (Math.exp(x) + 1);
}

/**
 * The integrals for particles of chemical potential ψ at temperature θ, by
 * eight-point Gauss–Legendre panels in t. Where the occupation falls from full
 * to empty the panels are four kT wide in energy, so the edge is resolved at
 * any temperature; below it, where every state is full, a few wide panels do;
 * beyond 50 kT past the edge nothing is left. Good to about a part in 10⁹.
 */
export function fermiIntegrals(psi: number, theta: number): FermiIntegrals {
  const top = Math.max(psi, 1);
  const epsHi = top + 50 * theta;
  const epsLo = Math.max(1, psi - 36 * theta);
  const tOf = (e: number) => Math.sqrt(Math.max(0, e * e - 1));
  const edges: number[] = [0];
  const tLo = tOf(epsLo);
  if (tLo > 0) {
    // Full states: smooth, so a few panels.
    const k = Math.max(2, Math.min(12, Math.ceil(tLo / 0.5)));
    for (let i = 1; i <= k; i++) edges.push((tLo * i) / k);
  }
  const panels = Math.max(4, Math.ceil((epsHi - epsLo) / (4 * theta)));
  for (let i = 1; i <= panels; i++) edges.push(tOf(epsLo + ((epsHi - epsLo) * i) / panels));
  let N = 0;
  let P = 0;
  let E = 0;
  let dN = 0;
  for (let p = 1; p < edges.length; p++) {
    const a = edges[p - 1];
    const b = edges[p];
    if (b <= a) continue;
    const half = (b - a) / 2;
    const mid = (a + b) / 2;
    for (let k = 0; k < 8; k++) {
      const t = mid + half * GL_X[k];
      const w = half * GL_W[k];
      const eps = Math.sqrt(1 + t * t);
      const f = occupation(eps, psi, theta);
      const t2f = t * t * f * w;
      N += t2f;
      P += (t2f * t * t) / eps;
      E += t2f * eps;
      dN += t2f * (1 - f);
    }
  }
  return { N, P: P / 3, E, dN: dN / theta };
}

/** Electrons and positrons in equilibrium at temperature T, with a net n_e electrons per m³. SI. */
export interface PairGas {
  /** The electrons' chemical potential, rest mass included, over m_e c². */
  psi: number;
  /** Electrons and positrons per m³. */
  electrons: number;
  positrons: number;
  /** Their pressure, Pa, and energy density, rest mass included, J/m³. */
  pressure: number;
  energy: number;
  /** The entropy density, J m⁻³ K⁻¹: (E + P − μ n_e)/T. */
  entropy: number;
}

/**
 * The electron (and positron) gas with a net `ne` electrons per m³ at T kelvin:
 * the chemical potential found by Newton's method on ln(n₋ − n₊), kept inside a
 * bracket, then the moments. With `pairs` false, positrons are left out (the gas
 * of Chapter 24's figures).
 */
export function pairGas(ne: number, T: number, pairs = true): PairGas {
  const theta = (K_B * T) / MC2;
  const target = ne / N_UNIT;
  const net = (psi: number) => {
    const e = fermiIntegrals(psi, theta);
    const p = pairs ? fermiIntegrals(-psi, theta) : undefined;
    return { value: e.N - (p?.N ?? 0), slope: e.dN + (p?.dN ?? 0), e, p };
  };
  // Starting guesses: packed electrons at zero temperature, and a thin Maxwell–Boltzmann gas.
  const packed = Math.sqrt(1 + Math.cbrt(3 * target) ** 2);
  const thin = 1 + theta * Math.log(target / (Math.sqrt(Math.PI / 2) * theta ** 1.5 * (1 + (15 / 8) * theta)));
  let lo = pairs ? 0 : -Infinity;
  let hi = Infinity;
  let psi = Math.max(packed, thin);
  let state = net(psi);
  for (let i = 0; i < 200; i++) {
    if (state.value > target) hi = Math.min(hi, psi);
    else lo = Math.max(lo, psi);
    const g = Math.log(Math.max(state.value, 1e-300)) - Math.log(target);
    if (Math.abs(g) < 1e-13) break;
    let next = state.value > 0 ? psi - (g * state.value) / state.slope : (lo + Math.min(hi, lo + 1)) / 2;
    if (!(next > lo && next < hi) || !Number.isFinite(next)) {
      next = Number.isFinite(hi) ? (Number.isFinite(lo) ? (lo + hi) / 2 : hi - Math.max(1, Math.abs(hi)) * 0.5) : psi + Math.max(theta, 0.5 * Math.abs(psi));
    }
    if (Math.abs(next - psi) < 1e-15 * Math.max(1, Math.abs(psi))) break;
    psi = next;
    state = net(psi);
  }
  const { e, p } = state;
  const electrons = e.N * N_UNIT;
  const positrons = (p?.N ?? 0) * N_UNIT;
  const pressure = (e.P + (p?.P ?? 0)) * N_UNIT * MC2;
  const energy = (e.E + (p?.E ?? 0)) * N_UNIT * MC2;
  return { psi, electrons, positrons, pressure, energy, entropy: (energy + pressure - psi * MC2 * (electrons - positrons)) / T };
}

/** The electrons' pressure (Pa) in gas of density ρ (kg/m³) at T, with μ_e mass units per electron, partly degenerate and exact; no pairs. */
export function exactElectronPressure(rho: number, T: number, mue: number): number {
  return pairGas(rho / (mue * AMU), T, false).pressure;
}

/** The Fermi energy, kinetic only (J), of electrons packed n per m³: m_e c²(√(1 + x²) − 1). */
export function fermiEnergy(n: number): number {
  const x = Math.cbrt((3 * n) / (8 * Math.PI)) * LAMBDA_C;
  return MC2 * (Math.sqrt(1 + x * x) - 1);
}

/** The Fermi temperature E_F/k (K) of electrons in gas of density ρ (kg/m³) with μ_e mass units per electron. Below it, they are packed. */
export function fermiTemperature(rho: number, mue: number): number {
  return fermiEnergy(rho / (mue * AMU)) / K_B;
}

/** The density (kg/m³) at which electrons' Fermi energy equals kT: the degeneracy line on the core's map. */
export function degeneracyDensity(T: number, mue: number): number {
  // E_F = kT: x² = (1 + θ)² − 1, n = (8π/3)(x/λ_C)³.
  const theta = (K_B * T) / MC2;
  const x = Math.sqrt((1 + theta) ** 2 - 1);
  return ((8 * Math.PI) / 3) * (x / LAMBDA_C) ** 3 * mue * AMU;
}

/** A gas of ions, electrons with their pairs, and light: what pair instability needs. */
export interface HotGas {
  /** Mass per ion and per net electron, in atomic mass units. */
  A: number;
  mue: number;
}

/** Oxygen, fully ionised: the core in which pair instability strikes. */
export const OXYGEN: HotGas = { A: 16, mue: 2 };

export interface HotGasState {
  /** Pa, and J/kg (the net electrons' rest mass left out). */
  pressure: number;
  energy: number;
  /** Electron–positron pairs per net electron. */
  pairsPerElectron: number;
  /** Shares of the pressure. */
  shares: { ions: number; electrons: number; light: number };
}

/** The pressure and energy per kilogram of ions, electrons with pairs, and light at density ρ (kg/m³) and T (K). */
export function hotGas(rho: number, T: number, gas: HotGas): HotGasState {
  const ne = rho / (gas.mue * AMU);
  const e = pairGas(ne, T, true);
  const ionsP = (rho / (gas.A * AMU)) * K_B * T;
  const lightP = (A_RAD * T ** 4) / 3;
  const pressure = ionsP + lightP + e.pressure;
  const energy = (1.5 * ionsP + 3 * lightP + e.energy - ne * MC2) / rho;
  return { pressure, energy, pairsPerElectron: e.positrons / ne, shares: { ions: ionsP / pressure, electrons: e.pressure / pressure, light: lightP / pressure } };
}

/**
 * The first adiabatic exponent Γ₁ = (∂ ln P/∂ ln ρ) at constant entropy of
 * ions, electrons with their pairs, and light, from the thermodynamic identity
 * Γ₁ = χ_ρ + χ_T² P/(ρ T c_V), with each derivative by central differences
 * (each point solving the pairs' balance again). Where making pairs soaks up
 * the work of squeezing, Γ₁ falls below 4/3: pair instability.
 */
export function gamma1Pairs(rho: number, T: number, gas: HotGas = OXYGEN): number {
  const h = 1e-3;
  const up = Math.exp(h);
  const here = hotGas(rho, T, gas);
  const denser = hotGas(rho * up, T, gas);
  const thinner = hotGas(rho / up, T, gas);
  const hotter = hotGas(rho, T * up, gas);
  const cooler = hotGas(rho, T / up, gas);
  const chiRho = (Math.log(denser.pressure) - Math.log(thinner.pressure)) / (2 * h);
  const chiT = (Math.log(hotter.pressure) - Math.log(cooler.pressure)) / (2 * h);
  // c_V = ∂u/∂T at constant ρ, from u at T e^{±h}.
  const cV = (hotter.energy - cooler.energy) / (T * (up - 1 / up));
  return chiRho + (chiT * chiT * here.pressure) / (rho * T * cV);
}
