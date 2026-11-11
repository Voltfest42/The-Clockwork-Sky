/**
 * How faint a gravitational wave each kind of detector can hear, and how
 * loud sources are, as characteristic strain against frequency: the usual
 * picture (Moore, Cole & Berry 2015), in which a source above a detector's
 * curve can be heard. Analytic curves, not the detectors' measured noise.
 * Conventions differ between papers by factors of order two; the picture is
 * about orders of magnitude. Frequencies in Hz, distances in m, masses in kg;
 * strain dimensionless.
 */
import { C, G } from '../constants';
import { SECONDS_PER_JULIAN_YEAR } from '../units';

/**
 * Advanced LIGO at its design sensitivity: Sathyaprakash & Schutz's (2009, Living Reviews in Relativity 12, 2,
 * eq. 72 and Table 1) fit to the one-sided noise power, S_h = S₀ [x^(−4.14) − 5x^(−2) + 111 (1 − x² + x⁴/2)/(1 + x²/2)],
 * x = f/215 Hz, S₀ = 10⁻⁴⁹ Hz⁻¹, above its 10 Hz wall (Infinity below).
 */
export function ligoNoise(f: number): number {
  if (f < 10) return Infinity;
  const x = f / 215;
  return 1e-49 * (x ** -4.14 - 5 / (x * x) + (111 * (1 - x * x + (x ** 4) / 2)) / (1 + (x * x) / 2));
}

/**
 * LISA's sky-averaged noise power (Robson, Cornish & Liu 2019, Classical and Quantum Gravity 36, 105011, eqs. 1, 10,
 * 11 and 14): arms of 2.5 million km, its optical and acceleration noise, and, if `confusion`, the unresolved hum of
 * the Galaxy's white-dwarf pairs after four years. Hz⁻¹.
 */
export function lisaNoise(f: number, confusion = true): number {
  const L = 2.5e9;
  const fStar = 19.09e-3;
  const oms = (1.5e-11) ** 2 * (1 + (2e-3 / f) ** 4);
  const acc = (3e-15) ** 2 * (1 + (0.4e-3 / f) ** 2) * (1 + (f / 8e-3) ** 4);
  const instrument = (10 / (3 * L * L)) * (oms + (2 * (1 + Math.cos(f / fStar) ** 2) * acc) / (2 * Math.PI * f) ** 4) * (1 + 0.6 * (f / fStar) ** 2);
  if (!confusion) return instrument;
  const A = 9e-45;
  const galaxy = A * f ** (-7 / 3) * Math.exp(-(f ** 0.138) - 221 * f * Math.sin(521 * f)) * (1 + Math.tanh(1680 * (0.00113 - f)));
  return instrument + galaxy;
}

/** A detector's noise as characteristic strain, √(f S_n(f)). */
export function noiseStrain(f: number, noise: (f: number) => number): number {
  return Math.sqrt(f * noise(f));
}

/** A pulsar timing array's background now: NANOGrav's 15-year amplitude, h_c = A (f / 1 yr⁻¹)^(−2/3), A = 2.4 × 10⁻¹⁵ (Agazie et al. 2023). */
export const PTA_BACKGROUND = { amplitude: 2.4e-15, from: 2e-9, to: 3e-8 } as const;

export function ptaBackground(f: number): number {
  return PTA_BACKGROUND.amplitude * (f * SECONDS_PER_JULIAN_YEAR) ** (-2 / 3);
}

/**
 * A sketch of a pulsar timing array's reach after T years: white timing noise makes h_c rise as f^(3/2) above 1/T,
 * and the array loses its grip fast below 1/T, as the waves take longer than the data to rise and fall. Scaled so
 * that the background it has found rises just above it at the lowest frequencies (from about 0.8/T to 1.7/T), as it
 * has. Not an analytic fit, only its shape: real arrays' curves come from each pulsar's noise.
 */
export function ptaReach(f: number, years = 15): number {
  const T = years * SECONDS_PER_JULIAN_YEAR;
  const x = f * T;
  return 0.6 * ptaBackground(1 / T) * (x ** 1.5 + x ** -3) / 2;
}

/**
 * An inspiral's characteristic strain at frequency f, 2f |h̃(f)|, with |h̃| = √(5/24) π^(−2/3) (c/D) (G𝓜/c³)^(5/6) f^(−7/6),
 * the leading-order amplitude averaged over the pair's orientation and place in the sky (Moore, Cole & Berry 2015).
 */
export function inspiralStrain(mc: number, D: number, f: number): number {
  const tilde = Math.sqrt(5 / 24) * Math.PI ** (-2 / 3) * (C / D) * ((G * mc) / C ** 3) ** (5 / 6) * f ** (-7 / 6);
  return 2 * f * tilde;
}

/**
 * A pair whose orbit hardly changes while it is watched (two white dwarfs in the Galaxy): its strain
 * h = (4/D) (G𝓜/c²)^(5/3) (πf/c)^(2/3), built up over T seconds of watching to h √(fT).
 */
export function steadyStrain(mc: number, D: number, f: number, T: number): number {
  const h = (4 / D) * ((G * mc) / C ** 2) ** (5 / 3) * ((Math.PI * f) / C) ** (2 / 3);
  return h * Math.sqrt(f * T);
}
