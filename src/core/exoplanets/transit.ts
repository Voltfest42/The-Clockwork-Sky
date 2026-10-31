import { AU, R_EARTH, R_SUN } from '../constants';
import { DEFAULT_LIMB, hiddenFraction, type LimbDarkening } from '../binaries/eclipse';
import { DEG } from '../units';

/**
 * Transits: a planet crossing its star's face blocks a little of its light.
 * The star's disc darkens towards its edge by the quadratic law, and the
 * light hidden is added up over thin rings round the star's centre, across
 * the planet's footprint; this agrees with Mandel & Agol's (2002) formulas to
 * the rings' resolution, and their small-planet limit and the exact central
 * depth are the tests. Orbits here are circular.
 *
 * Units: sizes in stellar radii unless named otherwise (planets' radii in
 * Earth radii, stars' in solar radii, orbits in AU), periods and durations in
 * days, tilts in degrees (90 edge-on). Light is a fraction of the star's own.
 */

export interface TransitGeometry {
  /** Planet-to-star radius ratio, k = Rp / R*. */
  k: number;
  /** Orbit's radius in stellar radii, a / R*. */
  aOverR: number;
  /** Tilt, degrees: 90 is edge-on. */
  i: number;
  /** Period, days. */
  period: number;
  limb?: LimbDarkening;
}

/** Planet-to-star radius ratio from a planet's radius (R⊕) and its star's (R☉). */
export function radiusRatio(planetEarths: number, starSuns: number): number {
  return (planetEarths * R_EARTH) / (starSuns * R_SUN);
}

/** An orbit's radius (AU) in stellar radii, for a star of radius R (R☉). */
export function orbitInStarRadii(aAu: number, starSuns: number): number {
  return (aAu * AU) / (starSuns * R_SUN);
}

/** The depth of a transit across a uniform disc: the share of the disc covered, k². Jupiter's across the Sun is 1.0%, Earth's 84 parts per million. */
export function uniformDepth(k: number): number {
  return k * k;
}

/** The impact parameter b: the planet's closest approach to the star's centre on the sky, in stellar radii, a cos i / R*. */
export function impactParameter(aOverR: number, iDegrees: number): number {
  return aOverR * Math.cos(iDegrees * DEG);
}

/** The chance that an orbit tilted at random transits at all: (R* + Rp) / a. For Earth round the Sun, 0.47%. */
export function transitProbability(aOverR: number, k = 0): number {
  return Math.min(1, (1 + k) / aOverR);
}

/** The tilt (degrees) below which there is no transit: cos i = (1 + k) / (a/R*). */
export function transitLimit(aOverR: number, k = 0): number {
  const c = (1 + k) / aOverR;
  return c >= 1 ? 0 : Math.acos(c) / DEG;
}

/**
 * The time (days) from first to last contact, T₁₄ = (P/π) asin(√((1 + k)² − b²) / (a/R* sin i)),
 * for a circular orbit (Seager & Mallén-Ornelas 2003); 0 if there is no transit.
 */
export function totalDuration(g: TransitGeometry): number {
  const b = impactParameter(g.aOverR, g.i);
  const chord = (1 + g.k) ** 2 - b * b;
  if (chord <= 0) return 0;
  return (g.period / Math.PI) * Math.asin(Math.min(1, Math.sqrt(chord) / (g.aOverR * Math.sin(g.i * DEG))));
}

/** The time (days) the planet's disc is wholly inside the star's, second to third contact; 0 for a grazing transit. */
export function fullDuration(g: TransitGeometry): number {
  const b = impactParameter(g.aOverR, g.i);
  const chord = (1 - g.k) ** 2 - b * b;
  if (chord <= 0) return 0;
  return (g.period / Math.PI) * Math.asin(Math.min(1, Math.sqrt(chord) / (g.aOverR * Math.sin(g.i * DEG))));
}

/** Whether the transit only grazes the star's edge: the planet's disc is never wholly inside, b > 1 − k. */
export function isGrazing(g: TransitGeometry): boolean {
  const b = impactParameter(g.aOverR, g.i);
  return b > 1 - g.k && b < 1 + g.k;
}

/**
 * The centres' separation on the sky, in stellar radii, at a phase (fraction
 * of an orbit from mid-transit), and whether the planet is in front.
 */
export function skySeparation(phase: number, aOverR: number, iDegrees: number): { z: number; inFront: boolean } {
  const angle = 2 * Math.PI * phase;
  const ci = Math.cos(iDegrees * DEG);
  return { z: aOverR * Math.sqrt(Math.sin(angle) ** 2 + (ci * Math.cos(angle)) ** 2), inFront: Math.cos(angle) > 0 };
}

/** The angle (radians) of a ring of radius s round the star's centre that lies behind a planet of radius k whose centre is z away. */
function ringBehind(s: number, k: number, z: number): number {
  if (s + z <= k) return 2 * Math.PI;
  if (s >= z + k || s <= z - k) return 0;
  return 2 * Math.acos(Math.max(-1, Math.min(1, (s * s + z * z - k * k) / (2 * s * z))));
}

/**
 * The star's light (fraction of its own) with a planet of radius ratio k
 * centred z stellar radii from the star's centre. The rings run only across
 * the planet's footprint, |z − k| to z + k, so a planet as small as Earth is
 * resolved anywhere on the disc; the star's whole light is exact.
 */
export function lightWithPlanet(z: number, k: number, limb: LimbDarkening = DEFAULT_LIMB, rings = 400): number {
  if (z >= 1 + k) return 1;
  // A planet bigger than the star, or the binaries core's case: hand over to its integration.
  if (k >= 1) return 1 - hiddenFraction(1, k, z, limb, rings);
  const [u1, u2] = limb;
  const lo = Math.max(0, z - k);
  const hi = Math.min(1, z + k);
  const ds = (hi - lo) / rings;
  let hidden = 0;
  for (let j = 0; j < rings; j++) {
    const s = lo + (j + 0.5) * ds;
    const mu = Math.sqrt(Math.max(0, 1 - s * s));
    hidden += (1 - u1 * (1 - mu) - u2 * (1 - mu) ** 2) * ringBehind(s, k, z) * s * ds;
  }
  return 1 - hidden / (Math.PI * meanIntensity(limb));
}

/** The light at a time (days from mid-transit). */
export function transitLight(g: TransitGeometry, tDays: number, rings = 400): number {
  const { z, inFront } = skySeparation(tDays / g.period, g.aOverR, g.i);
  return inFront ? lightWithPlanet(z, g.k, g.limb ?? DEFAULT_LIMB, rings) : 1;
}

/** The mean brightness of a limb-darkened disc relative to its centre's: 1 − u₁/3 − u₂/6. */
export function meanIntensity([u1, u2]: LimbDarkening): number {
  return 1 - u1 / 3 - u2 / 6;
}

/**
 * The exact depth of a central transit (z = 0) across a limb-darkened star:
 * the light from inside radius k over the whole disc's, from integrating the
 * quadratic law in closed form.
 */
export function centralDepth(k: number, limb: LimbDarkening = DEFAULT_LIMB): number {
  const [u1, u2] = limb;
  const x = Math.min(1, k * k);
  const muPart = (2 / 3) * (1 - (1 - x) ** 1.5); // ∫₀ˣ μ dx, with μ = √(1 − x)
  const mu2Part = x - (x * x) / 2; // ∫₀ˣ μ² dx
  const inside = x - u1 * (x - muPart) - u2 * (x - 2 * muPart + mu2Part);
  return inside / meanIntensity(limb);
}

/** Mandel & Agol's small-planet limit: the depth of a small planet at z is k² I(z) / ⟨I⟩. */
export function smallPlanetDepth(k: number, z: number, limb: LimbDarkening = DEFAULT_LIMB): number {
  const [u1, u2] = limb;
  const mu = Math.sqrt(Math.max(0, 1 - z * z));
  return (k * k * (1 - u1 * (1 - mu) - u2 * (1 - mu) ** 2)) / meanIntensity(limb);
}
