import { AMU, G, K_B } from '../constants';

/**
 * Will a cloud collapse? Jeans's criterion (1902) for a uniform, still ball of
 * gas: it collapses when its gravity beats its heat, which happens above the
 * Jeans mass. SI units throughout.
 *
 * The convention here is the virial one, 2K = |W| for a uniform sphere:
 * M_J = (5kT / Gμm_H)^{3/2} (3 / 4πρ)^{1/2}. Other textbooks' conventions differ
 * by a factor of a few; this one makes the verdict the same as comparing the two
 * energies the figure draws.
 */

/** The mass of a hydrogen atom, kg. */
export const M_H = 1.007_825 * AMU;

/** Mean mass per particle in units of m_H: molecular gas (H₂ with helium), and neutral atomic gas. */
export const MU_MOLECULAR = 2.33;
export const MU_ATOMIC = 1.27;

/** Density (kg/m³) of gas with n particles per cubic metre of mean mass μ m_H. */
export function densityOf(perCubicMetre: number, mu: number): number {
  return perCubicMetre * mu * M_H;
}

/** Particles per cubic metre in gas of density ρ (kg/m³) and mean mass μ m_H. */
export function numberDensityOf(density: number, mu: number): number {
  return density / (mu * M_H);
}

/** The Jeans mass, kg, of gas at temperature T (K) and density ρ (kg/m³), with mean mass μ m_H. */
export function jeansMass(kelvin: number, density: number, mu: number): number {
  return ((5 * K_B * kelvin) / (G * mu * M_H)) ** 1.5 * (3 / (4 * Math.PI * density)) ** 0.5;
}

/** The free-fall time, s: how long a still, pressureless ball of density ρ (kg/m³) takes to collapse. */
export function freeFallTime(density: number): number {
  return Math.sqrt((3 * Math.PI) / (32 * G * density));
}

/** A uniform spherical cloud: mass (kg), radius (m), temperature (K) and mean particle mass (in m_H). */
export interface Cloud {
  mass: number;
  radius: number;
  kelvin: number;
  mu: number;
}

/** The cloud's density, kg/m³. */
export const cloudDensity = (c: Cloud) => c.mass / ((4 / 3) * Math.PI * c.radius ** 3);

/** Twice the cloud's heat energy, 2K = 3NkT, J: what pushes outwards in the virial balance. */
export function twiceThermalEnergy(c: Cloud): number {
  return (3 * c.mass * K_B * c.kelvin) / (c.mu * M_H);
}

/** The size of the cloud's gravitational energy, |W| = (3/5) GM²/R, J: what pulls inwards. */
export function gravitationalEnergy(c: Cloud): number {
  return (0.6 * G * c.mass ** 2) / c.radius;
}

/** The cloud's verdict and numbers: it collapses when |W| > 2K, i.e. when it is heavier than its Jeans mass. */
export function jeansVerdict(c: Cloud) {
  const density = cloudDensity(c);
  const mJ = jeansMass(c.kelvin, density, c.mu);
  return {
    density,
    particlesPerCm3: numberDensityOf(density, c.mu) / 1e6,
    jeansMass: mJ,
    collapses: c.mass > mJ,
    freeFall: freeFallTime(density),
    thermal: twiceThermalEnergy(c),
    gravity: gravitationalEnergy(c),
  };
}

/** The least mass (kg) that collapses in a cloud of radius R (m) at temperature T (K): M = 5kTR / (Gμm_H). */
export function criticalMassForRadius(radius: number, kelvin: number, mu: number): number {
  return (5 * K_B * kelvin * radius) / (G * mu * M_H);
}
