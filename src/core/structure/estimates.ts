import { AMU, C, G, K_B } from '../constants';

/**
 * Back-of-the-envelope physics for a star (Chapter 20 and Toolkit T11): each
 * estimate keeps only the powers of the quantities that matter and drops the
 * numbers in front. SI units in and out: kg, m, s, W, Pa, K.
 */

/** Central pressure from weight over area: the whole mass's pull, GM/R², on the whole mass, spread over about R²: P_c ~ GM²/R⁴. */
export function centralPressureEstimate(mass: number, radius: number): number {
  return (G * mass * mass) / radius ** 4;
}

/** A strict lower bound on any star's central pressure, P_c > GM²/(8πR⁴), whatever its density inside (density falling outwards). */
export function centralPressureLowerBound(mass: number, radius: number): number {
  return (G * mass * mass) / (8 * Math.PI * radius ** 4);
}

/** The central pressure of a ball of even density, 3GM²/(8πR⁴): the sum of the weight of every layer above the centre. */
export function uniformCentralPressure(mass: number, radius: number): number {
  return (3 * G * mass * mass) / (8 * Math.PI * radius ** 4);
}

/** Central temperature from a particle's share of gravity's energy, kT ~ GMμm_u/R, for gas of mean molecular weight μ. */
export function centralTemperatureEstimate(mass: number, radius: number, mu: number): number {
  return (G * mass * mu * AMU) / (K_B * radius);
}

/** How long a ball of mass M and radius R would take to fall in with nothing holding it up, s: (3π / 32Gρ̄)^½. */
export function freeFallTimeOf(mass: number, radius: number): number {
  const rhoMean = mass / ((4 / 3) * Math.PI * radius ** 3);
  return Math.sqrt((3 * Math.PI) / (32 * G * rhoMean));
}

/** How long light takes to random-walk out of a star of radius R, s, with steps of ℓ (m): (R/ℓ)² steps of ℓ/c each, so R²/(ℓc). */
export function photonEscapeTime(radius: number, step: number): number {
  return (radius * radius) / (step * C);
}
