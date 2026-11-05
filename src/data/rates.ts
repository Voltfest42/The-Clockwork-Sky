/**
 * The reactions of Chapter 22's figures: what each one joins, the energy it
 * releases, and the laboratory number that sets how fast it goes.
 *
 * Charged particles that don't resonate fuse at a rate set by the Gamow peak
 * (core/nuclear/gamow.ts) times the reaction's astrophysical S-factor, which
 * holds the nuclear physics and changes only slowly with energy. S-factors in
 * MeV barns at zero energy, with the slope S'(0)/S(0) per MeV where it
 * matters at a star's temperatures.
 *
 * Sources:
 * - p + p and ¹⁴N + p: Solar Fusion III (Acharya et al. 2025, Rev. Mod. Phys.;
 *   arXiv:2405.06470): S₁₁(0) = 4.09 × 10⁻²⁵ MeV b (±1.5%) and S₁,₁₄(0) =
 *   1.68 ± 0.14 keV b (checked, research brief §4). Slopes from Solar Fusion II
 *   (Adelberger et al. 2011, Rev. Mod. Phys. 83, 195).
 * - d + p, ³He + ³He, ³He + ⁴He, ⁷Be + p: Solar Fusion II's recommended values
 *   (std): 2.14 × 10⁻⁷, 5.21, 5.6 × 10⁻⁴ and 2.08 × 10⁻⁵ MeV b.
 * - ⁷Li + p, ¹²C + p, ¹⁵N + p: NACRE (Angulo et al. 1999, Nucl. Phys. A 656, 3)
 *   (std): 59 keV b, 1.34 keV b and 73 MeV b. The unit tests hold the ¹²C + p and
 *   ¹⁵N + p rates within 15% of Caughlan & Fowler's fits (1988) at 10–30 million K.
 * - ¹³C + p: 5.5 keV b, Caughlan & Fowler's value (std), which puts the CN
 *   cycle's balance at ¹²C/¹³C ≈ 3.5, as textbooks and LUNA's recent
 *   measurements of both captures have it.
 * - Q values from the atomic mass evaluation, as in Bahcall's tables (std); a
 *   neutrino's average energy is lost to the star.
 * - Half-lives: ¹³N 9.965 min, ¹⁵O 122.24 s, ⁸B 770 ms (NUBASE, std).
 */

export interface ChargedReaction {
  id: string;
  /** As printed: "³He + ⁴He → ⁷Be + γ". */
  label: string;
  z1: number;
  z2: number;
  a1: number;
  a2: number;
  /** S(0), MeV b. */
  s0: number;
  /** S'(0)/S(0), per MeV. */
  slope?: number;
  /** Energy released, MeV, counting positron annihilation. */
  q: number;
  /** Of which a neutrino carries off on average, MeV. */
  qNu?: number;
}

export const PP: ChargedReaction = { id: 'pp', label: 'p + p → d + e⁺ + ν', z1: 1, z2: 1, a1: 1, a2: 1, s0: 4.09e-25, slope: 11.2, q: 1.442, qNu: 0.265 };
export const DP: ChargedReaction = { id: 'dp', label: 'd + p → ³He + γ', z1: 1, z2: 1, a1: 2, a2: 1, s0: 2.14e-7, slope: 26, q: 5.494 };
export const HE3HE3: ChargedReaction = { id: '33', label: '³He + ³He → ⁴He + 2p', z1: 2, z2: 2, a1: 3, a2: 3, s0: 5.21, slope: -0.86, q: 12.86 };
export const HE3HE4: ChargedReaction = { id: '34', label: '³He + ⁴He → ⁷Be + γ', z1: 2, z2: 2, a1: 3, a2: 4, s0: 5.6e-4, slope: -0.92, q: 1.586 };
export const BE7P: ChargedReaction = { id: '17', label: '⁷Be + p → ⁸B + γ', z1: 4, z2: 1, a1: 7, a2: 1, s0: 2.08e-5, q: 0.137 };
export const LI7P: ChargedReaction = { id: 'li7p', label: '⁷Li + p → 2 ⁴He', z1: 3, z2: 1, a1: 7, a2: 1, s0: 0.0593, q: 17.347 };
export const C12P: ChargedReaction = { id: 'c12p', label: '¹²C + p → ¹³N + γ', z1: 6, z2: 1, a1: 12, a2: 1, s0: 1.34e-3, slope: 1.9, q: 1.944 };
export const C13P: ChargedReaction = { id: 'c13p', label: '¹³C + p → ¹⁴N + γ', z1: 6, z2: 1, a1: 13, a2: 1, s0: 5.5e-3, slope: 0.8, q: 7.551 };
export const N14P: ChargedReaction = { id: 'n14p', label: '¹⁴N + p → ¹⁵O + γ', z1: 7, z2: 1, a1: 14, a2: 1, s0: 1.68e-3, slope: -2.0, q: 7.297 };
export const N15P: ChargedReaction = { id: 'n15p', label: '¹⁵N + p → ¹²C + ⁴He', z1: 7, z2: 1, a1: 15, a2: 1, s0: 73, slope: 4.8, q: 4.966 };

/** ⁸B's decay to two helium nuclei (by way of ⁸Be): MeV released and carried off by its neutrino. */
export const B8_DECAY = { q: 18.07, qNu: 6.735, halfLife: 0.77 } as const;
/** ⁷Be's capture of an electron: MeV released, and its neutrino's average share (0.862 MeV nine times in ten, 0.384 otherwise). */
export const BE7_CAPTURE = { q: 0.862, qNu: 0.814 } as const;
/** The CN cycle's two positron decays: MeV released (with annihilation), the neutrino's average, and half-lives, s. */
export const N13_DECAY = { q: 2.221, qNu: 0.707, halfLife: 9.965 * 60 } as const;
export const O15_DECAY = { q: 2.754, qNu: 0.997, halfLife: 122.24 } as const;

/** Four protons into helium releases 26.73 MeV, 0.71% of their mass. */
export const HYDROGEN_TO_HELIUM_MEV = 26.731;

/**
 * Carbon, nitrogen and oxygen as shares of the metals by mass, from the Sun's
 * surface (Asplund et al. 2009: 2.37, 0.69 and 5.73 × 10⁻³ of Z = 0.0134).
 */
export const CNO_SHARES = { C: 0.177, N: 0.052, O: 0.428 } as const;

/**
 * Energy released per gram of fuel burnt in the late stages, erg/g per unit
 * mass fraction (Woosley, Heger & Weaver 2002, §IV): carbon 4.0 × 10¹⁷, neon
 * 1.1 × 10¹⁷, oxygen 5.0 × 10¹⁷, silicon 1.9 × 10¹⁷; and the balanced-power
 * temperatures their Fig. 8 gives along ρ = 10⁶ T₉³ g/cm³, for mass fractions
 * of carbon 0.2, neon 0.2 (with oxygen 0.7), oxygen 0.7 and silicon 0.5.
 */
export const LATE_FUELS = {
  C: { q: 4.0e17, x: 0.2, balancedT9: 0.7 },
  Ne: { q: 1.1e17, x: 0.2, balancedT9: 1.45 },
  O: { q: 5.0e17, x: 0.7, balancedT9: 1.9 },
  Si: { q: 1.9e17, x: 0.5, balancedT9: 3.4 },
} as const;
