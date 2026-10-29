import { FILTER_V, meanFluxDensity } from '../light/filters';
import { planck } from '../light/planck';
import { binaryState, type BinaryOrbit } from './orbit';

/**
 * Eclipses: how much of a pair's light is hidden when one star passes in front
 * of the other. Each star is a sphere whose disc darkens towards its edge
 * (the quadratic limb-darkening law), seen in the V band, where each square
 * metre gives out light by Planck's law at the star's temperature.
 *
 * Units: radii and distances in any one unit (the binaries core uses R☉),
 * temperatures in kelvin. Light is a fraction of the pair's total out of eclipse.
 */

/** Limb darkening I(μ)/I(1) = 1 − u₁(1 − μ) − u₂(1 − μ)², where μ is the cosine of the angle from the disc's centre. */
export type LimbDarkening = readonly [number, number];

/** A middling quadratic law for Sun-like and hotter stars in the V band (Claret's tables give 0.3–0.5 and 0.2–0.3). */
export const DEFAULT_LIMB: LimbDarkening = [0.4, 0.25];

/** The area two uniform discs of radii r₁ and r₂, centres d apart, have in common (exact). */
export function overlapArea(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a1 = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const a2 = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  return r1 * r1 * (a1 - Math.sin(2 * a1) / 2) + r2 * r2 * (a2 - Math.sin(2 * a2) / 2);
}

/** The angle (radians, 0 to 2π) of a ring of radius s, centred on the back star, that lies behind a disc of radius rf whose centre is d away. */
function ringBehind(s: number, rf: number, d: number): number {
  if (s + d <= rf) return 2 * Math.PI;
  if (s >= d + rf || s <= d - rf) return 0;
  const c = (s * s + d * d - rf * rf) / (2 * s * d);
  return 2 * Math.acos(Math.max(-1, Math.min(1, c)));
}

/**
 * The share of a limb-darkened star's light (radius rb) hidden behind a disc
 * of radius rf whose centre is d from the star's, by adding up thin rings of
 * equal area across the star's face.
 */
export function hiddenFraction(rb: number, rf: number, d: number, limb: LimbDarkening = DEFAULT_LIMB, rings = 400): number {
  if (d >= rb + rf) return 0;
  const [u1, u2] = limb;
  let hidden = 0;
  let total = 0;
  for (let k = 0; k < rings; k++) {
    // Rings of equal area: s² evenly spaced.
    const s = rb * Math.sqrt((k + 0.5) / rings);
    const mu = Math.sqrt(Math.max(0, 1 - (s / rb) ** 2));
    const I = 1 - u1 * (1 - mu) - u2 * (1 - mu) ** 2;
    total += I * 2 * Math.PI;
    hidden += I * ringBehind(s, rf, d);
  }
  return hidden / total;
}

const surfaceCache = new Map<number, number>();

/** How bright each square metre of a star's surface is in the V band, relative units (Planck's law through Bessell's V filter). */
export function surfaceBrightnessV(kelvin: number): number {
  const key = Math.round(kelvin);
  let value = surfaceCache.get(key);
  if (value === undefined) {
    value = meanFluxDensity(FILTER_V, (l) => planck(l, key)) / 1e13;
    surfaceCache.set(key, value);
  }
  return value;
}

export interface EclipsingPair extends BinaryOrbit {
  /** Radii, R☉. */
  r1: number;
  r2: number;
  /** Surface temperatures, K. */
  t1: number;
  t2: number;
  limb?: LimbDarkening;
}

/** Each star's share of the pair's V-band light out of eclipse. */
export function lightShares(pair: EclipsingPair): [number, number] {
  const [u1, u2] = pair.limb ?? DEFAULT_LIMB;
  const disc = 1 - u1 / 3 - u2 / 6;
  const f1 = pair.r1 ** 2 * surfaceBrightnessV(pair.t1) * disc;
  const f2 = pair.r2 ** 2 * surfaceBrightnessV(pair.t2) * disc;
  return [f1 / (f1 + f2), f2 / (f1 + f2)];
}

/** The pair's V-band light at a phase, as a fraction of its light out of eclipse. */
export function relativeLight(pair: EclipsingPair, phase: number): number {
  const s = binaryState(pair, phase);
  if (s.projected >= pair.r1 + pair.r2) return 1;
  const [l1, l2] = lightShares(pair);
  const limb = pair.limb ?? DEFAULT_LIMB;
  // The star behind loses the light its companion's disc covers.
  return s.front === 2 ? 1 - l1 * hiddenFraction(pair.r1, pair.r2, s.projected, limb) : 1 - l2 * hiddenFraction(pair.r2, pair.r1, s.projected, limb);
}

/** A light curve sampled at n evenly spaced phases from 0 to 1. */
export function lightCurve(pair: EclipsingPair, n = 400): { phase: number; light: number }[] {
  return Array.from({ length: n + 1 }, (_, k) => ({ phase: k / n, light: relativeLight(pair, k / n) }));
}
