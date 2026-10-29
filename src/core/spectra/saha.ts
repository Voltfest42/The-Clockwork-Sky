import { EV, H, K_B, M_E } from '../constants';

/**
 * How a gas's atoms share themselves out between ionisation stages (Saha's
 * equation, 1920) and, within a stage, between energy levels (Boltzmann's
 * law), at one temperature and one electron pressure. This is the physics
 * behind the spectral sequence: a line is strong only where many atoms are
 * in the right stage and on the right rung.
 *
 * Temperatures in kelvin, pressures in pascals (N/m²), energies in eV.
 * Unless given, the electron pressure is a main-sequence star's.
 * Partition functions are held constant at values typical of stellar
 * photospheres, a simplification that moves the curves by a few per cent.
 */

/** k in eV per kelvin. */
const K_EV = K_B / EV;

/**
 * The electron pressure (Pa) in a main-sequence star's photosphere, roughly,
 * at its effective temperature: about 1.6 Pa for the Sun, 25 for an A0 star,
 * 0.06 for an M dwarf (read from model atmospheres of dwarfs, at the depth
 * where the continuum forms, and interpolated in log P against log T). Cool
 * stars have few free electrons, because only the metals give theirs up.
 */
export function electronPressureOf(kelvin: number): number {
  const t = Math.min(Math.max(kelvin, PRESSURES[0][0]), PRESSURES[PRESSURES.length - 1][0]);
  for (let i = 1; i < PRESSURES.length; i++) {
    if (t <= PRESSURES[i][0]) {
      const [t0, p0] = PRESSURES[i - 1];
      const [t1, p1] = PRESSURES[i];
      const f = Math.log(t / t0) / Math.log(t1 / t0);
      return 10 ** (p0 + f * (p1 - p0));
    }
  }
  return 10 ** PRESSURES[PRESSURES.length - 1][1];
}

/** [kelvin, log₁₀ P_e (Pa)] for main-sequence photospheres. */
const PRESSURES: readonly (readonly [number, number])[] = [
  [2500, -1.6],
  [3500, -1.2],
  [4500, -0.6],
  [5800, 0.2],
  [7500, 1.0],
  [10000, 1.4],
  [15000, 2.0],
  [25000, 2.3],
  [50000, 2.5],
];

export interface Element {
  symbol: string;
  name: string;
  /** Atomic mass, u. */
  mass: number;
  /** Ionisation energies of the neutral atom, the first ion…, eV. */
  ionisation: readonly number[];
  /** Partition functions of the neutral atom, the first ion, the second ion… */
  partition: readonly number[];
  /** The Sun's abundance, log ε = log₁₀(N / N_H) + 12 (Asplund, Amarsi & Grevesse 2021). */
  logEps: number;
}

/**
 * The elements Chapter 12's figures use. Ionisation energies from NIST;
 * partition functions near 6,000 K from Gray, The Observation and Analysis of
 * Stellar Photospheres (2005), Appendix D, held constant; abundances from
 * Asplund, Amarsi & Grevesse (2021, A&A 653, A141).
 */
export const ELEMENTS = {
  H: { symbol: 'H', name: 'hydrogen', mass: 1.008, ionisation: [13.598], partition: [2, 1], logEps: 12 },
  He: { symbol: 'He', name: 'helium', mass: 4.0026, ionisation: [24.587, 54.418], partition: [1, 2, 1], logEps: 10.914 },
  C: { symbol: 'C', name: 'carbon', mass: 12.011, ionisation: [11.26, 24.383], partition: [9.3, 5.9, 1], logEps: 8.46 },
  N: { symbol: 'N', name: 'nitrogen', mass: 14.007, ionisation: [14.534, 29.601], partition: [4.1, 9, 6], logEps: 7.83 },
  O: { symbol: 'O', name: 'oxygen', mass: 15.999, ionisation: [13.618, 35.121], partition: [8.7, 4, 9], logEps: 8.69 },
  Ne: { symbol: 'Ne', name: 'neon', mass: 20.18, ionisation: [21.565, 40.963], partition: [1, 5.4, 9], logEps: 8.06 },
  Na: { symbol: 'Na', name: 'sodium', mass: 22.99, ionisation: [5.139, 47.286], partition: [2.1, 1, 6], logEps: 6.22 },
  Mg: { symbol: 'Mg', name: 'magnesium', mass: 24.305, ionisation: [7.646, 15.035], partition: [1, 2, 1], logEps: 7.55 },
  Si: { symbol: 'Si', name: 'silicon', mass: 28.085, ionisation: [8.152, 16.346], partition: [9.4, 5.7, 1], logEps: 7.51 },
  S: { symbol: 'S', name: 'sulphur', mass: 32.06, ionisation: [10.36, 23.338], partition: [8.5, 4.2, 8.2], logEps: 7.12 },
  Ca: { symbol: 'Ca', name: 'calcium', mass: 40.078, ionisation: [6.113, 11.872], partition: [1.2, 2.2, 1], logEps: 6.3 },
  Ti: { symbol: 'Ti', name: 'titanium', mass: 47.867, ionisation: [6.828, 13.576], partition: [30, 55, 23], logEps: 4.97 },
  Fe: { symbol: 'Fe', name: 'iron', mass: 55.845, ionisation: [7.902, 16.199], partition: [26, 42, 25], logEps: 7.46 },
} as const satisfies Record<string, Element>;

export type ElementSymbol = keyof typeof ELEMENTS;

/** (2π m_e k T / h²)^{3/2}, m⁻³: the electrons' "quantum concentration". */
function quantumConcentration(kelvin: number): number {
  return ((2 * Math.PI * M_E * K_B * kelvin) / (H * H)) ** 1.5;
}

/**
 * Saha's equation: the ratio N_{i+1} / N_i of atoms in the next stage up to
 * those in stage i, given the energy χ (eV) to strip the next electron and the
 * two stages' partition functions, at temperature T (K) and electron pressure
 * P_e (Pa): (2 k T / P_e) (U_{i+1} / U_i) (2π m_e k T / h²)^{3/2} e^{−χ/kT}.
 */
export function sahaRatio(chi: number, uLower: number, uUpper: number, kelvin: number, electronPressure = electronPressureOf(kelvin)): number {
  return ((2 * K_B * kelvin) / electronPressure) * (uUpper / uLower) * quantumConcentration(kelvin) * Math.exp(-chi / (K_EV * kelvin));
}

/** The share of an element's atoms in each stage (neutral, singly ionised, …), summing to 1. */
export function ionisationFractions(element: Element, kelvin: number, electronPressure = electronPressureOf(kelvin)): number[] {
  const relative = [1];
  for (let i = 0; i < element.ionisation.length; i++) {
    const r = sahaRatio(element.ionisation[i], element.partition[i], element.partition[i + 1], kelvin, electronPressure);
    relative.push(relative[i] * r);
  }
  // Very hot gases overflow the products; scale by the largest before normalising.
  if (!relative.every(Number.isFinite)) {
    const logs = [0];
    for (let i = 0; i < element.ionisation.length; i++) {
      const r = sahaRatio(element.ionisation[i], element.partition[i], element.partition[i + 1], kelvin, electronPressure);
      logs.push(logs[i] + Math.log(r));
    }
    const top = Math.max(...logs);
    const scaled = logs.map((l) => Math.exp(l - top));
    const sum = scaled.reduce((a, b) => a + b, 0);
    return scaled.map((s) => s / sum);
  }
  const sum = relative.reduce((a, b) => a + b, 0);
  return relative.map((r) => r / sum);
}

/** Boltzmann's law: the share of a stage's atoms on a level of energy χ (eV) and weight g, out of the stage's partition function U. */
export function levelFraction(g: number, chi: number, partition: number, kelvin: number): number {
  return (g * Math.exp(-chi / (K_EV * kelvin))) / partition;
}

/** Hydrogen's partition function, summed over its levels up to n = nMax (statistical weight 2n²). Close to 2 below 20,000 K. */
export function hydrogenPartition(kelvin: number, nMax = 6): number {
  let u = 0;
  for (let n = 1; n <= nMax; n++) u += 2 * n * n * Math.exp(-(13.598 * (1 - 1 / (n * n))) / (K_EV * kelvin));
  return u;
}

/**
 * The share of all hydrogen atoms (neutral and ionised) sitting on level n of
 * neutral hydrogen: the absorbers of the Balmer lines for n = 2. Saha with
 * Boltzmann; in main-sequence stars it peaks near 10,000 K.
 */
export function hydrogenLevelShare(n: number, kelvin: number, electronPressure = electronPressureOf(kelvin)): number {
  const u = hydrogenPartition(kelvin);
  const neutral = 1 / (1 + sahaRatio(13.598, u, 1, kelvin, electronPressure));
  return neutral * levelFraction(2 * n * n, 13.598 * (1 - 1 / (n * n)), u, kelvin);
}

/** The share of an element's atoms in a stage (0 neutral, 1 singly ionised…) sitting on a level χ eV up, of weight g. */
export function absorberShare(symbol: ElementSymbol, stage: number, chi: number, g: number, kelvin: number, electronPressure = electronPressureOf(kelvin)): number {
  if (symbol === 'H' && stage === 0) {
    const n = Math.round(1 / Math.sqrt(Math.max(1e-9, 1 - chi / 13.598)));
    return hydrogenLevelShare(n, kelvin, electronPressure);
  }
  const element: Element = ELEMENTS[symbol];
  const fractions = ionisationFractions(element, kelvin, electronPressure);
  return fractions[stage] * levelFraction(g, chi, element.partition[stage], kelvin);
}
