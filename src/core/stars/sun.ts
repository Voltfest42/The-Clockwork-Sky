import { C, G, L_SUN, M_SUN, R_SUN, EV } from '../constants';
import { SECONDS_PER_JULIAN_YEAR } from '../units';

/**
 * The Sun's power and what could pay for it (Chapter 15). SI units in and
 * out unless a name says otherwise.
 */

/** Energy released by turning four hydrogen nuclei into one of helium-4, J: 26.73 MeV, about 0.71% of the four protons' mass. */
export const PP_ENERGY = 26.73e6 * EV;

/** The share of hydrogen's mass turned into energy by fusing it into helium. */
export const FUSION_EFFICIENCY = 0.0071;

/** Energy per kilogram of coal burnt, J/kg (a typical bituminous coal's heat of combustion, about 30 MJ/kg). */
export const COAL_ENERGY = 3.0e7;

/** How long (s) the Sun could shine at today's luminosity on a store of energy (J). */
export function lifetimeOn(energy: number, luminosity = L_SUN): number {
  return energy / luminosity;
}

/** The Sun's mass as coal, burnt: about 5,000 years of sunshine. */
export function coalLifetime(): number {
  return lifetimeOn(M_SUN * COAL_ENERGY);
}

/** The Kelvin–Helmholtz time GM²/(RL), s: how long shrinking under its own weight could power the Sun, about 30 million years. */
export function kelvinHelmholtzTime(mass = M_SUN, radius = R_SUN, luminosity = L_SUN): number {
  return (G * mass * mass) / (radius * luminosity);
}

/** How long fusion could power the Sun (s), turning a share of its mass from hydrogen into helium: by default a tenth, about what its core burns on the main sequence. */
export function fusionLifetime(share = 0.1): number {
  return lifetimeOn(M_SUN * share * FUSION_EFFICIENCY * C * C);
}

/** The mass the Sun turns into light every second, kg/s: L/c². */
export function massLossRate(luminosity = L_SUN): number {
  return luminosity / (C * C);
}

/** The hydrogen the Sun fuses into helium every second, kg/s. */
export function hydrogenBurnRate(luminosity = L_SUN): number {
  return massLossRate(luminosity) / FUSION_EFFICIENCY;
}

/** Neutrinos from the Sun crossing each square metre at a distance (m) every second: two for each helium nucleus made. */
export function neutrinoFlux(distance: number, luminosity = L_SUN): number {
  return (2 * luminosity) / PP_ENERGY / (4 * Math.PI * distance * distance);
}

/** Seconds as years. */
export function toYears(seconds: number): number {
  return seconds / SECONDS_PER_JULIAN_YEAR;
}
