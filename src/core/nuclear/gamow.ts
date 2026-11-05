import { K_B, EV } from '../constants';

/**
 * Fusion through the Coulomb barrier (Chapter 22): the Gamow peak.
 *
 * Two nuclei of charges Z₁ and Z₂ repel. Classically they touch only if they
 * have more energy than the barrier's top, which in a star's centre almost
 * none do. Quantum mechanics lets them tunnel through it with probability
 * e^(−√(E_G/E)), where the Gamow energy E_G = 2μc²(παZ₁Z₂)² (Gamow 1928;
 * Atkinson & Houtermans 1929). Fast nuclei are rare (the Maxwell–Boltzmann
 * tail, e^(−E/kT)) and slow ones can't tunnel, so fusion happens in a narrow
 * window between, the Gamow peak:
 *
 * - its energy E₀ = (E_G (kT)²/4)^⅓,
 * - its width Δ = 4 (E₀kT/3)^½ (the 1/e width of a Gaussian fitted to it),
 * - its height e^(−τ), τ = 3E₀/kT,
 * - and the rate's sensitivity to temperature, ν = d ln r / d ln T = (τ − 2)/3.
 *
 * Temperatures in K. Particle energies in keV, as nuclear physicists give
 * them (1 keV is 1.602 × 10⁻¹⁶ J).
 */

/** Boltzmann's constant in keV per kelvin: kT at 10⁷ K is 0.862 keV. */
export const K_KEV = K_B / (1000 * EV);

/** The fine-structure constant (CODATA 2018). */
export const FINE_STRUCTURE = 1 / 137.035_999;

/** The atomic mass unit's energy, keV (CODATA 2018: 931.494 MeV). */
export const AMU_KEV = 931_494.1;

/** e²/4πε₀ in keV fm: the Coulomb energy of two unit charges a femtometre apart. */
export const COULOMB_KEV_FM = 1439.96;

/** A pair of nuclei that fuse. */
export interface NuclearPair {
  /** As printed: "p + ¹²C". */
  name: string;
  z1: number;
  z2: number;
  a1: number;
  a2: number;
}

/** kT in keV. */
export function thermalEnergy(T: number): number {
  return K_KEV * T;
}

/** A nucleus's mass in atomic mass units: the proton's own (1.00728), else its mass number, near enough. */
export function nuclearMass(a: number): number {
  return a === 1 ? 1.007_276 : a;
}

/** The pair's reduced mass, atomic mass units. */
export function reducedMass({ a1, a2 }: Pick<NuclearPair, 'a1' | 'a2'>): number {
  const m1 = nuclearMass(a1);
  const m2 = nuclearMass(a2);
  return (m1 * m2) / (m1 + m2);
}

/** The Gamow energy E_G = 2μc²(παZ₁Z₂)², keV: 493 keV for two protons. */
export function gamowEnergy(p: NuclearPair): number {
  return 2 * reducedMass(p) * AMU_KEV * (Math.PI * FINE_STRUCTURE * p.z1 * p.z2) ** 2;
}

/** The chance of tunnelling through the barrier at energy E (keV): e^(−√(E_G/E)). */
export function tunnelling(p: NuclearPair, E: number): number {
  return E > 0 ? Math.exp(-Math.sqrt(gamowEnergy(p) / E)) : 0;
}

/** The Maxwell–Boltzmann factor e^(−E/kT) at energy E (keV) and temperature T (K). */
export function boltzmann(E: number, T: number): number {
  return Math.exp(-E / thermalEnergy(T));
}

/** Their product, the integrand of the reaction rate (keV, K). */
export function gamowIntegrand(p: NuclearPair, E: number, T: number): number {
  return E > 0 ? Math.exp(-E / thermalEnergy(T) - Math.sqrt(gamowEnergy(p) / E)) : 0;
}

/** A nucleus's radius for touching, fm: 1.2 A^⅓, or the proton's charge radius, 0.84 fm. */
export function nuclearRadius(a: number): number {
  return a === 1 ? 0.84 : 1.2 * Math.cbrt(a);
}

/** The Coulomb barrier's top, keV: the repulsion when the two nuclei touch. Nearly 1 MeV for two protons. */
export function barrierHeight(p: NuclearPair): number {
  return (COULOMB_KEV_FM * p.z1 * p.z2) / (nuclearRadius(p.a1) + nuclearRadius(p.a2));
}

export interface GamowPeak {
  /** kT, the peak's energy E₀ and its width Δ, keV. */
  kT: number;
  E0: number;
  width: number;
  /** τ = 3E₀/kT: the rate goes as e^(−τ). */
  tau: number;
  /** The rate's temperature exponent, ν = (τ − 2)/3. */
  nu: number;
  /** At E₀: the tunnelling chance and the Boltzmann factor. */
  tunnellingAtPeak: number;
  boltzmannAtPeak: number;
}

export function gamowPeak(p: NuclearPair, T: number): GamowPeak {
  const kT = thermalEnergy(T);
  const E0 = Math.cbrt((gamowEnergy(p) * kT * kT) / 4);
  const tau = (3 * E0) / kT;
  return {
    kT,
    E0,
    width: 4 * Math.sqrt((E0 * kT) / 3),
    tau,
    nu: (tau - 2) / 3,
    tunnellingAtPeak: tunnelling(p, E0),
    boltzmannAtPeak: boltzmann(E0, T),
  };
}

/** The area under the Gamow peak, ∫ e^(−E/kT − √(E_G/E)) dE in keV, by Simpson's rule in ln E. */
export function gamowIntegral(p: NuclearPair, T: number, points = 4000): number {
  const { E0 } = gamowPeak(p, T);
  const u0 = Math.log(E0) - 5;
  const u1 = Math.log(E0) + 4;
  const n = points % 2 === 0 ? points : points + 1;
  const h = (u1 - u0) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const E = Math.exp(u0 + i * h);
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    sum += w * gamowIntegrand(p, E, T) * E;
  }
  return (sum * h) / 3;
}

/** The Gaussian approximation to the same area, (√π/2) Δ e^(−τ), keV. */
export function gamowIntegralApprox(p: NuclearPair, T: number): number {
  const g = gamowPeak(p, T);
  return (Math.sqrt(Math.PI) / 2) * g.width * Math.exp(-g.tau);
}

/**
 * The share of nuclei with more energy than the barrier's top, as a natural
 * logarithm (it underflows any number): ln Q(3/2, x) ≈ ln(2√(x/π)) − x for the
 * barrier at x = E_b/kT ≫ 1. For two protons at the Sun's centre, about e^(−630).
 */
export function lnShareAboveBarrier(p: NuclearPair, T: number): number {
  const x = barrierHeight(p) / thermalEnergy(T);
  return Math.log(2 * Math.sqrt(x / Math.PI)) - x + Math.log(1 + 1 / (2 * x));
}
