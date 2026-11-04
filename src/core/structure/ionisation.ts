import { AMU, EV, H, K_B, M_E } from '../constants';
import { A_RAD, adiabaticGradient, densityFor, gasShare, type Mix } from './eos';

/**
 * Gas that is only partly ionised: a star's outer layers, below a few hundred
 * thousand kelvin, where hydrogen and helium are still gaining or losing their
 * electrons. Saha's equation gives the share of each in each stage. Ionising
 * soaks up heat, so in an ionisation zone a rising parcel of gas cools much
 * less as it expands: ∇_ad falls from 0.4 to about 0.1, and the gas convects
 * readily. Those zones set where a cool star's convective envelope begins and
 * how its adiabat runs inward from the surface; without them the Sun's
 * envelope comes out radiative and swollen. SI units.
 *
 * Simplified, as simple stellar codes are: hydrogen ionises first, with
 * electrons from itself and from easily ionised metals (a floor of 10⁻⁴ per
 * hydrogen atom); helium then ionises twice, with the electrons hydrogen gives.
 * Metals add their nuclei, and their electrons once hydrogen is ionised. No
 * pressure ionisation, molecules or degeneracy: above 150,000 K the solver
 * blends into the fully ionised gas of eos.ts, which has them.
 */

const CHI_H = 13.598 * EV;
const CHI_HE1 = 24.587 * EV;
const CHI_HE2 = 54.418 * EV;
/** (2π m_e k / h²)^{3/2}, m⁻³ K^{−3/2}. */
const SAHA = ((2 * Math.PI * M_E * K_B) / (H * H)) ** 1.5;
/** Metals' mean mass per nucleus, atomic mass units. */
const METAL_A = 16;

export interface IonisationState {
  /** Hydrogen's ionised share, and helium's shares once and twice ionised. */
  hydrogen: number;
  heliumOnce: number;
  heliumTwice: number;
  /** Free particles (nuclei, atoms, ions and electrons) per m³, electrons per m³, and the ionisation energy stored, J/m³. */
  particles: number;
  electrons: number;
  stored: number;
}

/** How ionised gas of density ρ (kg/m³) and temperature T (K) is, by Saha's equation. */
export function ionisation(rho: number, T: number, { X, Z }: Mix): IonisationState {
  const Y = 1 - X - Z;
  const nH = (rho * X) / AMU;
  const nHe = (rho * Y) / (4 * AMU);
  const nZ = (rho * Z) / (METAL_A * AMU);
  const kT = K_B * T;
  const c = SAHA * T ** 1.5;
  const floor = 1e-4 * nH;
  // Hydrogen: y(y n_H + floor)/(1 − y) = c e^{−χ/kT} (the statistical weights cancel), a quadratic in y.
  const cH = c * Math.exp(-CHI_H / kT);
  const b = floor + cH;
  const y = nH > 0 ? (2 * cH) / (b + Math.sqrt(b * b + 4 * nH * cH)) : 1;
  // Helium, twice, with the electrons hydrogen and the metals give, then once more with its own.
  let ne = y * nH + floor + (y * rho * Z) / (2 * AMU);
  let he1 = 0;
  let he2 = 0;
  for (let pass = 0; pass < 2; pass++) {
    const s1 = (4 * c * Math.exp(-CHI_HE1 / kT)) / ne;
    const s2 = (c * Math.exp(-CHI_HE2 / kT)) / ne;
    const he0 = 1 / (1 + s1 + s1 * s2);
    he1 = s1 * he0;
    he2 = s1 * s2 * he0;
    ne = y * nH + floor + (y * rho * Z) / (2 * AMU) + (he1 + 2 * he2) * nHe;
  }
  return {
    hydrogen: y,
    heliumOnce: he1,
    heliumTwice: he2,
    electrons: ne,
    particles: nH + nHe + nZ + ne,
    stored: nH * y * CHI_H + nHe * (he1 * CHI_HE1 + he2 * (CHI_HE1 + CHI_HE2)),
  };
}

/** Pressure of partly ionised gas and light, Pa. */
export function partialPressure(rho: number, T: number, mix: Mix): number {
  return ionisation(rho, T, mix).particles * K_B * T + (A_RAD * T ** 4) / 3;
}

/** Internal energy per kilogram, J/kg: the particles' heat, the light's energy and the ionisation energy stored. */
export function internalEnergy(rho: number, T: number, mix: Mix): number {
  const s = ionisation(rho, T, mix);
  return (1.5 * s.particles * K_B * T + A_RAD * T ** 4 + s.stored) / rho;
}

/** The density (kg/m³) of partly ionised gas at pressure P and temperature T, by Newton's method in ln ρ. */
export function partialDensity(P: number, T: number, mix: Mix): number {
  const gas = P - (A_RAD * T ** 4) / 3;
  if (!(gas > 0) || !(T > 0)) return NaN;
  const target = Math.log(gas / (K_B * T)); // ln of the particles per m³ needed
  // Start from neutral-ish gas; the particles per kilogram fall as the density rises (less ionisation), so ln n(ln ρ) is smooth and rising.
  let lnRho = Math.log((gas * 1.3 * AMU) / (K_B * T));
  for (let i = 0; i < 50; i++) {
    const n0 = Math.log(ionisation(Math.exp(lnRho), T, mix).particles);
    const n1 = Math.log(ionisation(Math.exp(lnRho + 1e-6), T, mix).particles);
    const slope = Math.max(0.3, (n1 - n0) / 1e-6);
    const step = (n0 - target) / slope;
    lnRho -= Math.max(-2, Math.min(2, step));
    if (Math.abs(step) < 1e-11) break;
  }
  return Math.exp(lnRho);
}

/** ∇_ad of partly ionised gas and light, from its thermodynamics: Pδ/(ρTc_P), with δ = −(∂ln ρ/∂ln T)_P and c_P = (∂u/∂T)_P + Pδ/(ρT). */
export function partialAdiabaticGradient(P: number, T: number, mix: Mix): number {
  const e = 1e-4;
  const T1 = T * (1 - e);
  const T2 = T * (1 + e);
  const r1 = partialDensity(P, T1, mix);
  const r2 = partialDensity(P, T2, mix);
  const rho = partialDensity(P, T, mix);
  const delta = -(Math.log(r2) - Math.log(r1)) / (Math.log(T2) - Math.log(T1));
  const dudT = (internalEnergy(r2, T2, mix) - internalEnergy(r1, T1, mix)) / (T2 - T1);
  const cP = dudT + (P * delta) / (rho * T);
  return (P * delta) / (rho * T * cP);
}

/** Where the solver blends from partly to fully ionised gas, K (in log T). */
export const BLEND = [1.5e5, 3e5] as const;

/** The share of the fully ionised description at T: 0 below 150,000 K, 1 above 300,000 K, smooth in log T between. */
function ionisedWeight(T: number): number {
  if (T <= BLEND[0]) return 0;
  if (T >= BLEND[1]) return 1;
  const s = Math.log(T / BLEND[0]) / Math.log(BLEND[1] / BLEND[0]);
  return s * s * (3 - 2 * s);
}

/**
 * The star builder's gas: its density (kg/m³) and adiabatic gradient at
 * pressure P (Pa) and temperature T (K). Partly ionised below 150,000 K, fully
 * ionised (with partly degenerate electrons) above 300,000 K, blended between.
 */
export function stellarGas(P: number, T: number, mix: Mix): { rho: number; nablaAd: number } {
  const w = ionisedWeight(T);
  let rho = 0;
  let nablaAd = 0;
  if (w > 0) {
    rho = w * Math.log(densityFor(P, T, mix));
    nablaAd = w * adiabaticGradient(gasShare(P, T));
  }
  if (w < 1) {
    rho += (1 - w) * Math.log(partialDensity(P, T, mix));
    nablaAd += (1 - w) * partialAdiabaticGradient(P, T, mix);
  }
  return { rho: Math.exp(rho), nablaAd };
}
