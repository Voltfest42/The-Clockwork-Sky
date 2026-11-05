import { EV } from '../constants';
import { screening } from '../structure/burning';
import {
  B8_DECAY,
  BE7_CAPTURE,
  BE7P,
  C12P,
  C13P,
  CNO_SHARES,
  DP,
  HE3HE3,
  HE3HE4,
  HYDROGEN_TO_HELIUM_MEV,
  LI7P,
  N13_DECAY,
  N14P,
  N15P,
  O15_DECAY,
  PP,
  type ChargedReaction,
} from '../../data/rates';
import { be7CaptureRate, decayRate, nonResonantRate } from './rates';
import { evolveNetwork, type Network } from './network';

/**
 * Hydrogen burning (Chapter 22): the pp chains and the CN cycle at a fixed
 * temperature and density, burning steadily. Every short-lived nucleus
 * (deuterium, ³He, ⁷Be, ⁷Li, ⁸B, and the CN cycle's catalysts) sits at the
 * abundance where it is made as fast as it is destroyed, so every step of a
 * chain carries the same flow. The protons and ⁴He are taken as given.
 *
 * Steady burning is reached after the slowest catalyst's lifetime: ³He's in a
 * million years or so at the Sun's centre (longer further out), ¹⁴N's in a few
 * hundred million. `cnApproach` follows the CN cycle there from the Sun's
 * starting carbon and nitrogen.
 *
 * SI at the edges: T in K, ρ in kg/m³, energy rates in W/kg, times in s.
 * Inside, abundances are molar (mol/g) and rates N_A⟨σv⟩ in cm³ mol⁻¹ s⁻¹.
 */

export interface BurningConditions {
  /** K. */
  T: number;
  /** kg/m³. */
  rho: number;
  /** Mass fractions of hydrogen and of metals. */
  X: number;
  Z: number;
}

/** Avogadro's number times one MeV, times 1000 g/kg: turns mol g⁻¹ s⁻¹ × MeV into W/kg. */
const W_PER_KG = 6.022_140_76e23 * 1e6 * EV * 1000;

export type StepId = 'pp' | 'dp' | '33' | '34' | 'ec' | '17' | 'li7p' | 'b8' | 'c12p' | 'n13' | 'c13p' | 'n14p' | 'o15' | 'n15p';

export interface Step {
  id: StepId;
  label: string;
  /** Which chain it belongs to. */
  chain: 'pp' | 'cno';
  /** Reactions per kilogram per second. */
  flow: number;
  /** How long one nucleus waits for this step, s: the reactant's lifetime against it. */
  wait: number;
}

export interface HydrogenBurning {
  conditions: BurningConditions;
  /** Heat released by each, W/kg (neutrinos' share removed). */
  ppPower: number;
  cnoPower: number;
  /** Shares of the pp chains' helium made by each branch. */
  branches: { ppI: number; ppII: number; ppIII: number };
  /** The share of each kind of chain's energy carried off by neutrinos. */
  neutrinoShare: { pp: number; cno: number };
  /** Steady mass fractions of the short-lived nuclei. */
  abundances: Record<'d' | 'he3' | 'be7' | 'li7' | 'b8' | 'c12' | 'n13' | 'c13' | 'n14' | 'o15' | 'n15', number>;
  steps: Step[];
}

/** ρ N_A⟨σv⟩, screened: s⁻¹ per unit of the partner's molar abundance. */
function k(r: ChargedReaction, c: BurningConditions): number {
  const g = c.rho / 1000;
  return g * nonResonantRate(r, c.T) * screening(r.z1 * r.z2, g, c.T / 1e7, c);
}

/** The carbon and nitrogen nuclei that run the CN cycle, mol/g: the Sun's shares of the metals. */
export function cnCatalysts(Z: number): number {
  return Z * (CNO_SHARES.C / 12 + CNO_SHARES.N / 14);
}

export function hydrogenBurning(c: BurningConditions): HydrogenBurning {
  const Yp = c.X;
  const Y4 = Math.max(0, 1 - c.X - c.Z) / 4;
  const kpp = k(PP, c);
  const kdp = k(DP, c);
  const k33 = k(HE3HE3, c);
  const k34 = k(HE3HE4, c);
  const k17 = k(BE7P, c);
  const kLi = k(LI7P, c);
  const lEc = be7CaptureRate(c.rho, c.T, c.X);
  const lB8 = decayRate(B8_DECAY.halfLife);

  // The pp chains.
  const Rpp = (Yp * Yp * kpp) / 2;
  const Yd = Rpp / (Yp * kdp);
  // ³He is made at Rpp and destroyed by ³He + ³He (two at a time) and ³He + ⁴He: k₃₃Y₃² + k₃₄Y₄Y₃ = Rpp.
  const b = k34 * Y4;
  const Y3 = (-b + Math.sqrt(b * b + 4 * k33 * Rpp)) / (2 * k33);
  const R33 = (Y3 * Y3 * k33) / 2;
  const R34 = Y3 * Y4 * k34;
  const Y7 = R34 / (lEc + Yp * k17);
  const Rec = Y7 * lEc;
  const R17 = Y7 * Yp * k17;
  const YLi = Rec / (Yp * kLi);
  const YB8 = R17 / lB8;
  const ppMeV =
    Rpp * (PP.q - (PP.qNu ?? 0)) +
    Rpp * DP.q +
    R33 * HE3HE3.q +
    R34 * HE3HE4.q +
    Rec * (BE7_CAPTURE.q - BE7_CAPTURE.qNu) +
    Rec * LI7P.q +
    R17 * BE7P.q +
    R17 * (B8_DECAY.q - B8_DECAY.qNu);
  const helium = R33 + R34;
  // Neutrinos: one from every p + p (two per helium in ppI, one in ppII and ppIII), plus ⁷Be's or ⁸B's.
  const nuMeV = Rpp * (PP.qNu ?? 0) + Rec * BE7_CAPTURE.qNu + R17 * B8_DECAY.qNu;

  // The CN cycle, every step carrying the same flow J.
  const kc12 = Yp * k(C12P, c);
  const kc13 = Yp * k(C13P, c);
  const kn14 = Yp * k(N14P, c);
  const kn15 = Yp * k(N15P, c);
  const ln13 = decayRate(N13_DECAY.halfLife);
  const lo15 = decayRate(O15_DECAY.halfLife);
  const total = cnCatalysts(c.Z);
  const J = total / (1 / kc12 + 1 / ln13 + 1 / kc13 + 1 / kn14 + 1 / lo15 + 1 / kn15);
  const cnoNu = N13_DECAY.qNu + O15_DECAY.qNu;

  const perKg = (molPerGram: number) => molPerGram * 6.022_140_76e23 * 1000;
  const steps: Step[] = [
    { id: 'pp', label: PP.label, chain: 'pp', flow: perKg(Rpp), wait: 1 / (Yp * kpp) },
    { id: 'dp', label: DP.label, chain: 'pp', flow: perKg(Rpp), wait: 1 / (Yp * kdp) },
    { id: '33', label: HE3HE3.label, chain: 'pp', flow: perKg(R33), wait: 1 / (Y3 * k33) },
    { id: '34', label: HE3HE4.label, chain: 'pp', flow: perKg(R34), wait: 1 / (Y4 * k34) },
    { id: 'ec', label: '⁷Be + e⁻ → ⁷Li + ν', chain: 'pp', flow: perKg(Rec), wait: 1 / lEc },
    { id: 'li7p', label: LI7P.label, chain: 'pp', flow: perKg(Rec), wait: 1 / (Yp * kLi) },
    { id: '17', label: BE7P.label, chain: 'pp', flow: perKg(R17), wait: 1 / (Yp * k17) },
    { id: 'b8', label: '⁸B → 2 ⁴He + e⁺ + ν', chain: 'pp', flow: perKg(R17), wait: 1 / lB8 },
    { id: 'c12p', label: C12P.label, chain: 'cno', flow: perKg(J), wait: 1 / kc12 },
    { id: 'n13', label: '¹³N → ¹³C + e⁺ + ν', chain: 'cno', flow: perKg(J), wait: 1 / ln13 },
    { id: 'c13p', label: C13P.label, chain: 'cno', flow: perKg(J), wait: 1 / kc13 },
    { id: 'n14p', label: N14P.label, chain: 'cno', flow: perKg(J), wait: 1 / kn14 },
    { id: 'o15', label: '¹⁵O → ¹⁵N + e⁺ + ν', chain: 'cno', flow: perKg(J), wait: 1 / lo15 },
    { id: 'n15p', label: N15P.label, chain: 'cno', flow: perKg(J), wait: 1 / kn15 },
  ];

  return {
    conditions: c,
    ppPower: ppMeV * W_PER_KG,
    cnoPower: J * (HYDROGEN_TO_HELIUM_MEV - cnoNu) * W_PER_KG,
    branches: { ppI: R33 / helium, ppII: Rec / helium, ppIII: R17 / helium },
    neutrinoShare: { pp: nuMeV / (helium * HYDROGEN_TO_HELIUM_MEV), cno: cnoNu / HYDROGEN_TO_HELIUM_MEV },
    abundances: {
      d: 2 * Yd,
      he3: 3 * Y3,
      be7: 7 * Y7,
      li7: 7 * YLi,
      b8: 8 * YB8,
      c12: (12 * J) / kc12,
      n13: (13 * J) / ln13,
      c13: (13 * J) / kc13,
      n14: (14 * J) / kn14,
      o15: (15 * J) / lo15,
      n15: (15 * J) / kn15,
    },
    steps,
  };
}

/** The temperature (K) at which the CN cycle makes as much heat as the pp chains, at density ρ (kg/m³) and make-up X, Z. */
export function crossoverTemperature(rho: number, X: number, Z: number): number {
  let lo = 8e6;
  let hi = 5e7;
  const f = (T: number) => {
    const h = hydrogenBurning({ T, rho, X, Z });
    return Math.log(h.cnoPower / h.ppPower);
  };
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi);
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return Math.sqrt(lo * hi);
}

/** The CN cycle's species, in the order of the cycle. */
export const CN_SPECIES = ['¹²C', '¹³N', '¹³C', '¹⁴N', '¹⁵O', '¹⁵N'] as const;

export interface CnApproach {
  /** Years since the gas reached this temperature and density. */
  years: number[];
  /** Each catalyst's share of all the CN nuclei, in CN_SPECIES' order, at each time. */
  shares: number[][];
}

/**
 * The CN catalysts settling into the cycle's balance from the Sun's starting
 * carbon and nitrogen (most of it carbon), with the protons held fixed: a stiff
 * network, integrated by implicit Euler, over `years`.
 */
export function cnApproach(c: BurningConditions, years: number, points = 120): CnApproach {
  const Yp = c.X;
  const YEAR = 3.155_76e7;
  const net: Network = {
    species: [...CN_SPECIES],
    mass: [12, 13, 13, 14, 15, 15],
    reactions: [
      { from: [0], to: [1], k: Yp * k(C12P, c) },
      { from: [1], to: [2], k: decayRate(N13_DECAY.halfLife) },
      { from: [2], to: [3], k: Yp * k(C13P, c) },
      { from: [3], to: [4], k: Yp * k(N14P, c) },
      { from: [4], to: [5], k: decayRate(O15_DECAY.halfLife) },
      { from: [5], to: [0], k: Yp * k(N15P, c) },
    ],
  };
  const Y0 = [(c.Z * CNO_SHARES.C) / 12, 0, 0, (c.Z * CNO_SHARES.N) / 14, 0, 0];
  const run = evolveNetwork(net, Y0, years * YEAR, { tFirst: YEAR * 1e3, points });
  const total = Y0.reduce((a, b) => a + b, 0);
  return {
    years: run.t.map((t) => t / YEAR),
    shares: run.Y.map((Y) => Array.from(Y, (y) => y / total)),
  };
}
