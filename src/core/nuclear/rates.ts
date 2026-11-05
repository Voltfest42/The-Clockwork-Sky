import type { ChargedReaction } from '../../data/rates';
import { reducedMass } from './gamow';

/**
 * Thermonuclear reaction rates (Chapter 22). Rates are given as nuclear
 * physicists tabulate them, N_A⟨σv⟩ in cm³ mol⁻¹ s⁻¹ for two bodies (cm⁶ mol⁻²
 * s⁻¹ for three), as functions of temperature in K; the network (network.ts)
 * turns them into rates per second with the density. Decay and capture rates
 * are in s⁻¹.
 *
 * - Non-resonant reactions from their S-factors, through the Gamow peak:
 *   N_A⟨σv⟩ = 7.8327 × 10⁹ (Z₁Z₂/μ)^⅓ S_eff T₉^(−⅔) e^(−τ), with τ = 3E₀/kT and
 *   S_eff = S(0)[1 + 5/12τ + (S′/S)(E₀ + 35kT/36)] (Fowler, Caughlan &
 *   Zimmerman 1967). S in MeV b, T₉ in 10⁹ K.
 * - Helium, carbon, neon, oxygen and silicon burning from Caughlan & Fowler's
 *   fits (1988), as coded in Timmes's aprox13 network (AMReX Microphysics,
 *   rates/aprox_rates.H, read 5 Nov 2026), and ¹²C(α,γ)¹⁶O from deBoer et al.
 *   (2017).
 */

/** N_A⟨σv⟩ for a non-resonant reaction from its S-factor, cm³ mol⁻¹ s⁻¹. */
export function nonResonantRate(r: Pick<ChargedReaction, 'z1' | 'z2' | 'a1' | 'a2' | 's0' | 'slope'>, T: number): number {
  const t9 = T / 1e9;
  if (t9 <= 0) return 0;
  const mu = reducedMass(r);
  const z2 = (r.z1 * r.z2) ** 2;
  const tau = 4.2487 * Math.cbrt((z2 * mu) / t9);
  const E0 = 0.122_04 * Math.cbrt(z2 * mu * t9 * t9);
  const kT = 0.086_173 * t9;
  const sEff = r.s0 * (1 + 5 / (12 * tau) + (r.slope ?? 0) * (E0 + (35 * kT) / 36));
  return 7.8327e9 * Math.cbrt((r.z1 * r.z2) / mu) * sEff * t9 ** (-2 / 3) * Math.exp(-tau);
}

/** A decay rate from a half-life (s): ln 2 / t½, s⁻¹. */
export const decayRate = (halfLife: number) => Math.LN2 / halfLife;

/**
 * ⁷Be's capture of an electron in a star's core, s⁻¹ (Solar Fusion II, eq. 26:
 * 5.60 × 10⁻⁹ (ρ/μ_e) T₆^(−½) [1 + 0.004(T₆ − 16)], ρ in g/cm³). ρ in kg/m³.
 * About 150 days at the Sun's centre.
 */
export function be7CaptureRate(rho: number, T: number, X: number): number {
  const t6 = T / 1e6;
  const mue = 2 / (1 + X);
  return 5.6e-9 * (rho / 1000 / mue) * t6 ** -0.5 * (1 + 0.004 * (t6 - 16));
}

// ---------- Caughlan & Fowler (1988), for comparison and for helium and heavier fuels ----------

const powers = (T: number) => {
  const t9 = T / 1e9;
  const t913 = Math.cbrt(t9);
  return { t9, t913, t923: t913 * t913, t943: t9 * t913, t953: t9 * t913 * t913, t932: t9 ** 1.5, t9i: 1 / t9, t9i13: 1 / t913, t9i23: 1 / (t913 * t913), t9i32: t9 ** -1.5 };
};

/** p(p,e⁺ν)d, CF88. */
export function cf88pp(T: number): number {
  const p = powers(T);
  return 4.01e-15 * p.t9i23 * Math.exp(-3.38 * p.t9i13) * (1 + 0.123 * p.t913 + 1.09 * p.t923 + 0.938 * p.t9);
}

/** ¹²C(p,γ)¹³N, CF88. */
export function cf88c12pg(T: number): number {
  const p = powers(T);
  const a = 2.04e7 * p.t9i23 * Math.exp(-13.69 * p.t9i13 - (p.t9 * p.t9) / 2.25);
  const b = 1 + 0.03 * p.t913 + 1.19 * p.t923 + 0.254 * p.t9 + 2.06 * p.t943 + 1.12 * p.t953;
  return a * b + 1.08e5 * p.t9i32 * Math.exp(-4.925 * p.t9i) + 2.15e5 * p.t9i32 * Math.exp(-18.179 * p.t9i);
}

/** ¹⁴N(p,γ)¹⁵O, CF88 (with S(0) = 3.20 keV b, about twice what LUNA later measured). */
export function cf88n14pg(T: number): number {
  const p = powers(T);
  const a = 4.9e7 * p.t9i23 * Math.exp(-15.228 * p.t9i13 - (p.t9 * p.t9) / 10.850436);
  const b = 1 + 0.027 * p.t913 - 0.778 * p.t923 - 0.149 * p.t9 + 0.261 * p.t943 + 0.127 * p.t953;
  return a * b + 2.37e3 * p.t9i32 * Math.exp(-3.011 * p.t9i) + 2.19e4 * Math.exp(-12.53 * p.t9i);
}

/** ¹⁵N(p,α)¹²C, CF88. */
export function cf88n15pa(T: number): number {
  const p = powers(T);
  const a = 1.08e12 * p.t9i23 * Math.exp(-15.251 * p.t9i13 - (p.t9 * p.t9) / 0.272484);
  const b = 1 + 0.027 * p.t913 + 2.62 * p.t923 + 0.501 * p.t9 + 5.36 * p.t943 + 2.6 * p.t953;
  return (
    a * b +
    1.19e8 * p.t9i32 * Math.exp(-3.676 * p.t9i) +
    5.41e8 * p.t9 ** -0.5 * Math.exp(-8.926 * p.t9i) +
    0.1 * 4.72e8 * p.t9i32 * Math.exp(-7.721 * p.t9i) +
    0.1 * 2.2e9 * p.t9i32 * Math.exp(-11.418 * p.t9i)
  );
}

/** The Hoyle state's energy above three helium nuclei, MeV: 0.0918 (⁸Be) + 0.2875 (⁸Be + α) = 0.380. */
export const HOYLE_ABOVE_THRESHOLD = 0.3794;

/** 11.6045/T₉ per MeV: E/kT for E in MeV. */
const PER_MEV = 11.6045;

export interface TripleAlphaOptions {
  /** Moves the Hoyle state up (positive) or down, MeV, keeping its strength. */
  hoyleShift?: number;
  /** Leaves the Hoyle state out: carbon forms only off resonance. */
  noHoyle?: boolean;
}

/**
 * Three helium nuclei into carbon, N_A²⟨ααα⟩ in cm⁶ mol⁻² s⁻¹ (CF88): two
 * nuclei form ⁸Be (a resonance 92 keV up), a third joins it through the Hoyle
 * state of ¹²C (287 keV above ⁸Be + α), or, far more slowly, off resonance.
 */
export function tripleAlpha(T: number, o: TripleAlphaOptions = {}): number {
  const p = powers(T);
  const r2abe =
    7.4e5 * p.t9i32 * Math.exp(-1.0663 * p.t9i) +
    4.164e9 * p.t9i23 * Math.exp(-13.49 * p.t9i13 - (p.t9 * p.t9) / 0.009604) * (1 + 0.031 * p.t913 + 8.009 * p.t923 + 1.732 * p.t9 + 49.883 * p.t943 + 27.426 * p.t953);
  const hoyle = o.noHoyle ? 0 : 130 * p.t9i32 * Math.exp(-3.3364 * p.t9i - PER_MEV * (o.hoyleShift ?? 0) * p.t9i);
  const offResonance =
    2.51e7 * p.t9i23 * Math.exp(-23.57 * p.t9i13 - (p.t9 * p.t9) / 0.055225) * (1 + 0.018 * p.t913 + 5.249 * p.t923 + 0.65 * p.t9 + 19.176 * p.t943 + 6.034 * p.t953);
  const rbeac = hoyle + offResonance;
  const higher = 0.1 * 1.35e-7 * p.t9i32 * Math.exp(-24.811 * p.t9i);
  if (p.t9 > 0.08) return 2.9e-16 * r2abe * rbeac + higher;
  const f1 = 0.01 + (0.2 + 0.8 * Math.exp(-((0.025 * p.t9i) ** 3.263))) / (1 + 4 * Math.exp(-((p.t9 / 0.025) ** 9.227)));
  return 2.9e-16 * r2abe * rbeac * f1 + higher;
}

/** ¹²C(α,γ)¹⁶O, deBoer et al. (2017). */
export function c12ag(T: number): number {
  const p = powers(T);
  const nr = Math.exp(24.1 - 32 * p.t9i13 - 5.9 * p.t913 + 1.8 * p.t9 - 0.17 * p.t953) * p.t9 ** (-2 / 3);
  const r = Math.exp(7.4 - 30 * p.t9i) * p.t9i32;
  return nr + r;
}

/** ¹⁶O(α,γ)²⁰Ne, CF88. */
export function o16ag(T: number): number {
  const p = powers(T);
  return (
    9.37e9 * p.t9i23 * Math.exp(-39.757 * p.t9i13 - (p.t9 * p.t9) / 2.515396) +
    62.1 * p.t9i32 * Math.exp(-10.297 * p.t9i) +
    538 * p.t9i32 * Math.exp(-12.226 * p.t9i) +
    13 * p.t9 * p.t9 * Math.exp(-20.093 * p.t9i)
  );
}

/** ²⁰Ne(α,γ)²⁴Mg, CF88. */
export function ne20ag(T: number): number {
  const p = powers(T);
  const t1 = 4.11e11 * p.t9i23 * Math.exp(-46.766 * p.t9i13 - (p.t9 * p.t9) / 4.923961) * (1 + 0.009 * p.t913 + 0.882 * p.t923 + 0.055 * p.t9 + 0.749 * p.t943 + 0.119 * p.t953);
  const t2 = 5.27e3 * p.t9i32 * Math.exp(-15.869 * p.t9i) + 6.51e3 * p.t9 ** 0.5 * Math.exp(-16.223 * p.t9i);
  const t3 = 0.1 * (42.1 * p.t9i32 * Math.exp(-9.115 * p.t9i) + 32 * p.t9i23 * Math.exp(-9.383 * p.t9i));
  return (t1 + t2 + t3) / (1 + 5 * Math.exp(-18.96 * p.t9i));
}

/** ²⁰Ne(γ,α)¹⁶O, s⁻¹: light breaking neon apart, by detailed balance from ¹⁶O(α,γ). */
export function ne20Photodisintegration(T: number): number {
  const p = powers(T);
  return 5.65e10 * p.t932 * Math.exp(-54.937 * p.t9i) * o16ag(T);
}

/** ¹²C + ¹²C, CF88 (all channels). */
export function c12c12(T: number): number {
  const p = powers(T);
  const t9a = p.t9 / (1 + 0.0396 * p.t9);
  return 4.27e26 * t9a ** (5 / 6) * p.t9i32 * Math.exp(-84.165 / Math.cbrt(t9a) - 2.12e-3 * p.t9 ** 3);
}

/** ¹⁶O + ¹⁶O, CF88 (all channels). */
export function o16o16(T: number): number {
  const p = powers(T);
  return 7.1e36 * p.t9i23 * Math.exp(-135.93 * p.t9i13 - 0.629 * p.t923 - 0.445 * p.t943 + 0.0103 * p.t9 * p.t9);
}
