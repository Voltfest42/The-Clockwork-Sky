/**
 * Neutron-star equations of state as piecewise polytropes: Read, Lackey, Owen
 * & Friedman (2009), Phys. Rev. D 79, 124032 (arXiv:0812.2163).
 *
 * Every equation of state shares their four-piece fit to the SLy crust (their
 * Table II); above it, three pieces join at 10^14.7 and 10^15 g/cm³, set by
 * the pressure p₁ at 10^14.7 g/cm³ and three adiabatic indices (their Table
 * III). Read et al. fitted 34 published equations of state; these are ten of
 * them, from too soft for the heaviest pulsars to the stiffest. Each piece is
 * p = K ρ^Γ with ρ the rest-mass density.
 *
 * Units as the paper gives them: densities in g/cm³, the crust's K for p/c²
 * in g/cm³ (so that p/c² = K ρ^Γ), p₁ in dyn/cm². The structure solver
 * (core/compact/tov.ts) converts to SI at its edges.
 */

/** The SLy crust (Read et al. Table II): Γ and K for each piece, and the densities (g/cm³) where they meet. */
export const SLY_CRUST = {
  gamma: [1.58425, 1.28733, 0.62223, 1.35692],
  K: [6.8011e-9, 1.06186e-6, 5.32697e1, 3.99874e-8],
  /** Where piece i meets piece i + 1. The last piece meets the core where their pressures are equal. */
  rho: [2.44034e7, 3.78358e11, 2.6278e12],
} as const;

/** The core's dividing densities ρ₁ and ρ₂, g/cm³ (p₁ is quoted at ρ₁). */
export const CORE_DIVISIONS = [10 ** 14.7, 10 ** 15] as const;

export interface EosFit {
  id: string;
  /** Its name in the literature. */
  name: string;
  /** What it is made of and who made it, in a phrase. */
  about: string;
  /** log₁₀ of the pressure at 10^14.7 g/cm³, in dyn/cm². */
  logP1: number;
  gamma1: number;
  gamma2: number;
  gamma3: number;
  /** Read et al.'s maximum mass for the tabulated equation of state (M☉), and their fit's error on it (%). */
  mMax: number;
  mMaxFitError: number;
  /** Their radius of a 1.4 M☉ star (km), and the fit's error on it (%). */
  r14: number;
  r14FitError: number;
}

/** Ten of Read et al.'s fits (their Table III), from the softest to the stiffest. */
export const EOS_FITS: readonly EosFit[] = [
  { id: 'PAL6', name: 'PAL6', about: 'neutrons, protons and electrons, a schematic potential (Prakash, Ainsworth & Lattimer 1988)', logP1: 34.38, gamma1: 2.227, gamma2: 2.189, gamma3: 2.159, mMax: 1.477, mMaxFitError: -0.47, r14: 10.547, r14FitError: -0.54 },
  { id: 'FPS', name: 'FPS', about: 'neutrons, protons and electrons, a Skyrme-type force (Pandharipande & Ravenhall 1989)', logP1: 34.283, gamma1: 2.985, gamma2: 2.863, gamma3: 2.6, mMax: 1.799, mMaxFitError: -0.03, r14: 10.85, r14FitError: 0.12 },
  { id: 'GNH3', name: 'GNH3', about: 'with hyperons, relativistic mean field (Glendenning 1985)', logP1: 34.648, gamma1: 2.664, gamma2: 2.194, gamma3: 2.304, mMax: 1.962, mMaxFitError: 0.13, r14: 14.203, r14FitError: -0.28 },
  { id: 'H4', name: 'H4', about: 'with hyperons, relativistic mean field (Lackey, Nayyar & Owen 2006)', logP1: 34.669, gamma1: 2.909, gamma2: 2.246, gamma3: 2.144, mMax: 2.032, mMaxFitError: -0.85, r14: 13.774, r14FitError: 1.34 },
  { id: 'SLy', name: 'SLy', about: 'neutrons, protons, electrons and muons, the Skyrme–Lyon force (Douchin & Haensel 2001)', logP1: 34.384, gamma1: 3.005, gamma2: 2.988, gamma3: 2.851, mMax: 2.049, mMaxFitError: 0.02, r14: 11.736, r14FitError: -0.21 },
  { id: 'WFF1', name: 'WFF1', about: 'neutrons and protons, variational with a three-body force (Wiringa, Fiks & Fabrocini 1988)', logP1: 34.031, gamma1: 2.519, gamma2: 3.791, gamma3: 3.66, mMax: 2.133, mMaxFitError: -0.29, r14: 10.414, r14FitError: 0.02 },
  { id: 'APR4', name: 'APR4', about: 'neutrons and protons, variational with a three-body force (Akmal, Pandharipande & Ravenhall 1998)', logP1: 34.269, gamma1: 2.83, gamma2: 3.445, gamma3: 3.348, mMax: 2.213, mMaxFitError: -1.08, r14: 11.428, r14FitError: -0.9 },
  { id: 'ENG', name: 'ENG', about: 'neutrons and protons, relativistic Brueckner–Hartree–Fock (Engvik et al. 1996)', logP1: 34.437, gamma1: 3.514, gamma2: 3.13, gamma3: 3.168, mMax: 2.24, mMaxFitError: -0.05, r14: 12.059, r14FitError: -0.69 },
  { id: 'MPA1', name: 'MPA1', about: 'neutrons and protons, relativistic Brueckner–Hartree–Fock (Müther, Prakash & Ainsworth 1987)', logP1: 34.495, gamma1: 3.446, gamma2: 3.572, gamma3: 2.887, mMax: 2.461, mMaxFitError: -0.16, r14: 12.473, r14FitError: -0.26 },
  { id: 'MS1', name: 'MS1', about: 'neutrons and protons, relativistic mean field (Müller & Serot 1996)', logP1: 34.858, gamma1: 3.224, gamma2: 3.033, gamma3: 1.325, mMax: 2.767, mMaxFitError: -0.54, r14: 14.918, r14FitError: 0.06 },
];

/** The equation of state the figures open with. */
export const DEFAULT_EOS = 'SLy';
