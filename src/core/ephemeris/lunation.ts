import { polynomial } from '../math/poly';
import { DEG } from '../units';

/**
 * The times of the Moon's phases, from Meeus, Astronomical Algorithms (2nd
 * ed.), ch. 49: a mean lunation plus periodic corrections from the Sun's and
 * Moon's anomalies, the Moon's argument of latitude and the planets. New and
 * full Moons come out within a few seconds of the full theory near the
 * present (Meeus quotes a mean error of 3.7 s over 1980–2020), and within
 * minutes over 3000 BC–AD 3000.
 *
 * A lunation is numbered k: k = 0 is the new Moon of 6 January 2000, and
 * k + 0.25, k + 0.5 and k + 0.75 are the first quarter, full Moon and last
 * quarter after new Moon k. Times are Julian Dates (TT).
 */

export type PhaseName = 'new' | 'first quarter' | 'full' | 'last quarter';

export const PHASES: readonly PhaseName[] = ['new', 'first quarter', 'full', 'last quarter'];

/** The mean synodic month, new Moon to new Moon: days. */
export const SYNODIC_MONTH = 29.530_588_861;

/** The mean arguments of a lunation, in degrees, shared with the eclipse finder (Meeus 49.4–49.7). */
export interface LunationArguments {
  /** Lunation number, with its quarter. */
  k: number;
  /** Centuries from J2000 (Meeus 49.3). */
  T: number;
  /** Mean phase: JDE (Meeus 49.1). */
  jdMean: number;
  /** Eccentricity factor for terms with the Sun's anomaly (Meeus 47.6). */
  E: number;
  /** The Sun's mean anomaly: radians. */
  M: number;
  /** The Moon's mean anomaly: radians. */
  Mp: number;
  /** The Moon's argument of latitude: radians. */
  F: number;
  /** Longitude of the Moon's ascending node: radians. */
  omega: number;
}

export function lunationArguments(k: number): LunationArguments {
  const T = k / 1236.85;
  return {
    k,
    T,
    jdMean: 2_451_550.097_66 + SYNODIC_MONTH * k + polynomial(T, [0, 0, 0.000_154_37, -0.000_000_150, 0.000_000_000_73]),
    E: polynomial(T, [1, -0.002_516, -0.000_007_4]),
    M: (2.5534 + 29.105_356_70 * k + polynomial(T, [0, 0, -0.000_001_4, -0.000_000_11])) * DEG,
    Mp: (201.5643 + 385.816_935_28 * k + polynomial(T, [0, 0, 0.010_758_2, 0.000_012_38, -0.000_000_058])) * DEG,
    F: (160.7108 + 390.670_502_84 * k + polynomial(T, [0, 0, -0.001_611_8, -0.000_002_27, 0.000_000_011])) * DEG,
    omega: (124.7746 - 1.563_755_88 * k + polynomial(T, [0, 0, 0.002_067_2, 0.000_002_15])) * DEG,
  };
}

/** Periodic terms for new and full Moon: coefficients (days), powers of E, and multiples of M, M′, F, Ω. */
type Term = readonly [coefficient: number, ePower: number, m: number, mp: number, f: number, omega: number];

const NEW: readonly Term[] = [
  [-0.4072, 0, 0, 1, 0, 0], [0.17241, 1, 1, 0, 0, 0], [0.01608, 0, 0, 2, 0, 0], [0.01039, 0, 0, 0, 2, 0],
  [0.00739, 1, -1, 1, 0, 0], [-0.00514, 1, 1, 1, 0, 0], [0.00208, 2, 2, 0, 0, 0], [-0.00111, 0, 0, 1, -2, 0],
  [-0.00057, 0, 0, 1, 2, 0], [0.00056, 1, 1, 2, 0, 0], [-0.00042, 0, 0, 3, 0, 0], [0.00042, 1, 1, 0, 2, 0],
  [0.00038, 1, 1, 0, -2, 0], [-0.00024, 1, -1, 2, 0, 0], [-0.00017, 0, 0, 0, 0, 1], [-0.00007, 0, 2, 1, 0, 0],
  [0.00004, 0, 0, 2, -2, 0], [0.00004, 0, 3, 0, 0, 0], [0.00003, 0, 1, 1, -2, 0], [0.00003, 0, 0, 2, 2, 0],
  [-0.00003, 0, 1, 1, 2, 0], [0.00003, 0, -1, 1, 2, 0], [-0.00002, 0, -1, 1, -2, 0], [-0.00002, 0, 1, 3, 0, 0],
  [0.00002, 0, 0, 4, 0, 0],
];

const FULL: readonly Term[] = [
  [-0.40614, 0, 0, 1, 0, 0], [0.17302, 1, 1, 0, 0, 0], [0.01614, 0, 0, 2, 0, 0], [0.01043, 0, 0, 0, 2, 0],
  [0.00734, 1, -1, 1, 0, 0], [-0.00515, 1, 1, 1, 0, 0], [0.00209, 2, 2, 0, 0, 0], [-0.00111, 0, 0, 1, -2, 0],
  [-0.00057, 0, 0, 1, 2, 0], [0.00056, 1, 1, 2, 0, 0], [-0.00042, 0, 0, 3, 0, 0], [0.00042, 1, 1, 0, 2, 0],
  [0.00038, 1, 1, 0, -2, 0], [-0.00024, 1, -1, 2, 0, 0], [-0.00017, 0, 0, 0, 0, 1], [-0.00007, 0, 2, 1, 0, 0],
  [0.00004, 0, 0, 2, -2, 0], [0.00004, 0, 3, 0, 0, 0], [0.00003, 0, 1, 1, -2, 0], [0.00003, 0, 0, 2, 2, 0],
  [-0.00003, 0, 1, 1, 2, 0], [0.00003, 0, -1, 1, 2, 0], [-0.00002, 0, -1, 1, -2, 0], [-0.00002, 0, 1, 3, 0, 0],
  [0.00002, 0, 0, 4, 0, 0],
];

const QUARTER: readonly Term[] = [
  [-0.62801, 0, 0, 1, 0, 0], [0.17172, 1, 1, 0, 0, 0], [-0.01183, 1, 1, 1, 0, 0], [0.00862, 0, 0, 2, 0, 0],
  [0.00804, 0, 0, 0, 2, 0], [0.00454, 1, -1, 1, 0, 0], [0.00204, 2, 2, 0, 0, 0], [-0.0018, 0, 0, 1, -2, 0],
  [-0.0007, 0, 0, 1, 2, 0], [-0.0004, 0, 0, 3, 0, 0], [-0.00034, 1, -1, 2, 0, 0], [0.00032, 1, 1, 0, 2, 0],
  [0.00032, 1, 1, 0, -2, 0], [-0.00028, 2, 2, 1, 0, 0], [0.00027, 1, 1, 2, 0, 0], [-0.00017, 0, 0, 0, 0, 1],
  [-0.00005, 0, -1, 1, -2, 0], [0.00004, 0, 0, 2, 2, 0], [-0.00004, 0, 1, 1, 2, 0], [0.00004, 0, -2, 1, 0, 0],
  [0.00003, 0, 1, 1, -2, 0], [0.00003, 0, 3, 0, 0, 0], [0.00002, 0, 0, 2, -2, 0], [0.00002, 0, -1, 1, 2, 0],
  [-0.00002, 0, 1, 3, 0, 0],
];

/** The planetary arguments A1–A14: constant and rate per lunation (degrees), and their coefficients (days). */
const PLANETARY: readonly (readonly [number, number, number])[] = [
  [299.77, 0.107408, 0.000325], [251.88, 0.016321, 0.000165], [251.83, 26.651886, 0.000164], [349.42, 36.412478, 0.000126],
  [84.66, 18.206239, 0.00011], [141.74, 53.303771, 0.000062], [207.14, 2.453732, 0.00006], [154.84, 7.30686, 0.000056],
  [34.52, 27.261239, 0.000047], [207.19, 0.121824, 0.000042], [291.34, 1.844379, 0.00004], [161.72, 24.198154, 0.000037],
  [239.56, 25.513099, 0.000035], [331.55, 3.592518, 0.000023],
];

function sumTerms(terms: readonly Term[], a: LunationArguments): number {
  let sum = 0;
  for (const [c, e, m, mp, f, om] of terms) sum += c * a.E ** e * Math.sin(m * a.M + mp * a.Mp + f * a.F + om * a.omega);
  return sum;
}

/** The lunation number of the phase nearest a Julian Date (TT): 0 for new, 1 first quarter, 2 full, 3 last quarter. */
export function nearestLunation(jdTT: number, phase: 0 | 1 | 2 | 3): number {
  return Math.round((jdTT - 2_451_550.097_66) / SYNODIC_MONTH - phase / 4) + phase / 4;
}

/** The time of a phase, by lunation number k (an integer plus 0, 0.25, 0.5 or 0.75): Julian Date (TT). Meeus ch. 49. */
export function phaseTime(k: number): number {
  const quarter = Math.round(((k % 1) + 1) * 4) % 4;
  const a = lunationArguments(k);
  let jd = a.jdMean;
  if (quarter === 0) jd += sumTerms(NEW, a);
  else if (quarter === 2) jd += sumTerms(FULL, a);
  else {
    jd += sumTerms(QUARTER, a);
    const W =
      0.00306 -
      0.00038 * a.E * Math.cos(a.M) +
      0.00026 * Math.cos(a.Mp) -
      0.00002 * Math.cos(a.Mp - a.M) +
      0.00002 * Math.cos(a.Mp + a.M) +
      0.00002 * Math.cos(2 * a.F);
    jd += quarter === 1 ? W : -W;
  }
  const T2 = a.T * a.T;
  PLANETARY.forEach(([c0, rate, coefficient], i) => {
    const angle = c0 + rate * k + (i === 0 ? -0.009173 * T2 : 0);
    jd += coefficient * Math.sin(angle * DEG);
  });
  return jd;
}

export interface MoonPhase {
  name: PhaseName;
  k: number;
  /** Julian Date (TT). */
  jdTT: number;
}

/** Every principal phase from one Julian Date (TT) to another, in order. */
export function phasesBetween(fromTT: number, toTT: number): MoonPhase[] {
  const out: MoonPhase[] = [];
  let k = Math.floor((fromTT - 2_451_550.097_66) / SYNODIC_MONTH) - 1;
  for (; ; k += 0.25) {
    const jd = phaseTime(k);
    if (jd > toTT) break;
    if (jd >= fromTT) out.push({ name: PHASES[Math.round(((k % 1) + 1) * 4) % 4], k, jdTT: jd });
  }
  return out;
}

/** The next phase of a kind after a Julian Date (TT). */
export function nextPhase(jdTT: number, name: PhaseName): MoonPhase {
  const q = PHASES.indexOf(name) as 0 | 1 | 2 | 3;
  let k = nearestLunation(jdTT, q) - 1;
  while (phaseTime(k) <= jdTT) k += 1;
  return { name, k, jdTT: phaseTime(k) };
}

/** Days since the last new Moon, at a Julian Date (TT): the Moon's age. */
export function moonAge(jdTT: number): number {
  let k = nearestLunation(jdTT, 0) + 1;
  while (phaseTime(k) > jdTT) k -= 1;
  return jdTT - phaseTime(k);
}

