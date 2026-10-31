import { AMU, G, K_B, M_EARTH, R_EARTH, R_SUN } from '../constants';

/**
 * Starlight through an atmosphere: a toy transmission spectrum. During a
 * transit the planet's air blocks starlight up to a height that depends on how
 * strongly it absorbs each wavelength; that height rises by one scale height
 * H = kT / (μ m_H g) for each factor of e in the absorption (Lecavelier des
 * Etangs et al. 2008), so the planet looks bigger in its gases' bands. Here
 * each gas's absorption is a handful of bands, Gaussian in log wavelength,
 * at their real places with sketched strengths, plus Rayleigh scattering and
 * an optional grey cloud deck that hides everything below it. It is a sketch,
 * not a radiative-transfer model.
 *
 * Units: wavelengths in micrometres; masses in Earth masses, radii in Earth
 * radii (planets) and solar radii (stars); temperatures in kelvin; heights in
 * metres; depths as fractions.
 */

export type Gas = 'H2O' | 'CH4' | 'CO2';

export const GAS_NAMES: Record<Gas, string> = { H2O: 'water', CH4: 'methane', CO2: 'carbon dioxide' };

/** Bands: [centre (µm), width (in ln λ), strength relative to the strongest]. Centres are the real bands'; strengths are sketched. */
export const BANDS: Record<Gas, readonly (readonly [number, number, number])[]> = {
  H2O: [
    [0.94, 0.03, 0.08],
    [1.14, 0.035, 0.18],
    [1.4, 0.05, 0.5],
    [1.87, 0.05, 0.6],
    [2.7, 0.07, 1],
  ],
  CH4: [
    [1.17, 0.03, 0.06],
    [1.38, 0.03, 0.12],
    [1.67, 0.035, 0.3],
    [2.32, 0.045, 0.5],
    [3.33, 0.05, 1],
  ],
  CO2: [
    [1.6, 0.015, 0.05],
    [2.0, 0.03, 0.2],
    [2.7, 0.03, 0.5],
    [4.3, 0.04, 1.6],
  ],
};

/** Surface gravity (m/s²) of a planet of mass M (M⊕) and radius R (R⊕). */
export function surfaceGravity(massEarths: number, radiusEarths: number): number {
  return (G * massEarths * M_EARTH) / (radiusEarths * R_EARTH) ** 2;
}

/** The scale height (m): the height over which the air's pressure falls by a factor of e, kT / (μ m_H g), with μ in atomic mass units. */
export function scaleHeight(kelvin: number, mu: number, gravity: number): number {
  return (K_B * kelvin) / (mu * AMU * gravity);
}

export interface Atmosphere {
  massEarths: number;
  radiusEarths: number;
  /** The air's temperature, K. */
  kelvin: number;
  /** Mean molecular weight, amu: 2.3 for hydrogen and helium, 29 for Earth's air. */
  mu: number;
  starRadiusSuns: number;
  gases: readonly Gas[];
  /** The cloud deck's height above the planet's radius, in scale heights; null for clear skies. */
  cloudTop: number | null;
}

/** How much the gases absorb at a wavelength (µm), relative to the level that defines the planet's radius. */
export function opacity(lambda: number, gases: readonly Gas[]): number {
  // Rayleigh scattering, as λ⁻⁴, three times the reference level at 0.5 µm.
  let kappa = 3 * (0.5 / lambda) ** 4;
  for (const gas of gases) {
    for (const [centre, width, strength] of BANDS[gas]) {
      const x = Math.log(lambda / centre) / width;
      kappa += 40 * strength * Math.exp(-0.5 * x * x);
    }
  }
  return kappa;
}

/** The planet's apparent radius (m) at a wavelength: its radius plus H ln(1 + κ), capped below by the cloud deck. */
export function apparentRadius(atm: Atmosphere, lambda: number): number {
  const h = scaleHeight(atm.kelvin, atm.mu, surfaceGravity(atm.massEarths, atm.radiusEarths));
  let heights = Math.log(1 + opacity(lambda, atm.gases));
  if (atm.cloudTop !== null) heights = Math.max(heights, atm.cloudTop);
  return atm.radiusEarths * R_EARTH + h * heights;
}

/** The transit depth (fraction) at a wavelength (µm): (apparent radius / star's radius)². */
export function transitDepthAt(atm: Atmosphere, lambda: number): number {
  return (apparentRadius(atm, lambda) / (atm.starRadiusSuns * R_SUN)) ** 2;
}

/** How much the depth changes for one scale height of air (fraction): about 2 H Rp / R*². */
export function signalPerScaleHeight(atm: Atmosphere): number {
  const h = scaleHeight(atm.kelvin, atm.mu, surfaceGravity(atm.massEarths, atm.radiusEarths));
  return (2 * h * atm.radiusEarths * R_EARTH) / (atm.starRadiusSuns * R_SUN) ** 2;
}

/** The spectrum at n wavelengths spaced evenly in log λ between two wavelengths (µm). */
export function transmissionSpectrum(atm: Atmosphere, from = 0.5, to = 5.5, n = 400): { lambda: number; depth: number }[] {
  return Array.from({ length: n }, (_, k) => {
    const lambda = from * (to / from) ** (k / (n - 1));
    return { lambda, depth: transitDepthAt(atm, lambda) };
  });
}
