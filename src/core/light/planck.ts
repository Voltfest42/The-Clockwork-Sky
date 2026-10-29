import { C, EV, H, K_B, SIGMA, WIEN_B } from '../constants';

/**
 * Light as waves and photons, and the glow of a warm body (thermal, or
 * black-body, radiation).
 *
 * Wavelengths are in metres, frequencies in hertz, energies in joules and
 * temperatures in kelvin. Spectral radiance per unit wavelength is in
 * W m⁻² sr⁻¹ m⁻¹, per unit frequency in W m⁻² sr⁻¹ Hz⁻¹.
 */

/** c = fλ: the frequency (Hz) of light of a wavelength (m). */
export function frequencyOf(wavelength: number): number {
  return C / wavelength;
}

/** The wavelength (m) of light of a frequency (Hz). */
export function wavelengthOf(frequency: number): number {
  return C / frequency;
}

/** E = hf = hc/λ: the energy (J) of one photon of a wavelength (m). */
export function photonEnergy(wavelength: number): number {
  return (H * C) / wavelength;
}

/** A photon's energy in electronvolts, from its wavelength (m). 550 nm is 2.25 eV; 1 nm, 1.24 keV; 21 cm, 5.9 µeV. */
export function photonEnergyEv(wavelength: number): number {
  return photonEnergy(wavelength) / EV;
}

/** The second radiation constant hc/k, m K. */
const C2 = (H * C) / K_B;

/** Planck's law per unit wavelength, B_λ(T) = (2hc²/λ⁵) / (e^{hc/λkT} − 1): W m⁻² sr⁻¹ m⁻¹. */
export function planck(wavelength: number, kelvin: number): number {
  const x = C2 / (wavelength * kelvin);
  if (x > 700) return 0;
  return (2 * H * C * C) / wavelength ** 5 / Math.expm1(x);
}

/** Planck's law per unit frequency, B_ν(T) = (2hν³/c²) / (e^{hν/kT} − 1): W m⁻² sr⁻¹ Hz⁻¹. */
export function planckFrequency(frequency: number, kelvin: number): number {
  const x = (H * frequency) / (K_B * kelvin);
  if (x > 700) return 0;
  return (2 * H * frequency ** 3) / (C * C) / Math.expm1(x);
}

/** Photons rather than energy: B_λ / (hc/λ), photons s⁻¹ m⁻² sr⁻¹ m⁻¹. */
export function planckPhotons(wavelength: number, kelvin: number): number {
  return planck(wavelength, kelvin) / photonEnergy(wavelength);
}

/** Wien's law: the wavelength (m) where B_λ peaks, b / T. The Sun's is 502 nm; yours, at 310 K, 9.3 µm. */
export function peakWavelength(kelvin: number): number {
  return WIEN_B / kelvin;
}

/** The temperature (K) of a black body whose spectrum (per unit wavelength) peaks at a wavelength (m): b / λ. */
export function temperatureForPeak(wavelength: number): number {
  return WIEN_B / wavelength;
}

/** Stefan–Boltzmann: the power a black body's surface gives out, σT⁴, W/m². Double the temperature, sixteen times the power. */
export function surfaceFlux(kelvin: number): number {
  return SIGMA * kelvin ** 4;
}

/** L = 4πR²σT⁴: a star's luminosity (W) from its radius (m) and surface temperature (K). */
export function luminosity(radius: number, kelvin: number): number {
  return 4 * Math.PI * radius * radius * surfaceFlux(kelvin);
}

/** The radius (m) a star of a luminosity (W) and temperature (K) must have: R = √(L / 4πσT⁴). */
export function radiusFor(luminosityW: number, kelvin: number): number {
  return Math.sqrt(luminosityW / (4 * Math.PI * surfaceFlux(kelvin)));
}

/**
 * The share (0–1) of a black body's power at wavelengths shorter than λ (m).
 *
 * With x = hc/λkT, it is (15/π⁴) ∫ₓ^∞ t³/(eᵗ − 1) dt. For x ≥ 2 the integral is
 * the sum over n of e^{−nx} (x³/n + 3x²/n² + 6x/n³ + 6/n⁴); for small x, the
 * total π⁴/15 minus ∫₀ˣ, whose series in x has Bernoulli-number coefficients.
 */
export function fractionShortward(wavelength: number, kelvin: number): number {
  if (!(wavelength > 0)) return 0;
  const x = C2 / (wavelength * kelvin);
  const total = Math.PI ** 4 / 15;
  if (x >= 2) {
    let sum = 0;
    for (let n = 1; n <= 60; n++) {
      const term = Math.exp(-n * x) * (x ** 3 / n + (3 * x * x) / n ** 2 + (6 * x) / n ** 3 + 6 / n ** 4);
      sum += term;
      if (term < 1e-17 * sum) break;
    }
    return Math.min(1, sum / total);
  }
  // ∫₀ˣ t³/(eᵗ − 1) dt = Σ B_k x^{k+3} / (k! (k+3)), with B_k the Bernoulli numbers (B₁ = −½).
  let below = x ** 3 / 3 - x ** 4 / 8;
  let factorial = 1;
  for (let k = 2; k < BERNOULLI.length; k += 2) {
    factorial *= (k - 1) * k;
    below += (BERNOULLI[k] * x ** (k + 3)) / (factorial * (k + 3));
  }
  return Math.max(0, 1 - below / total);
}

/** Bernoulli numbers B₀ … B₁₆ (B₁ is handled separately; the odd ones beyond are zero). */
const BERNOULLI = [1, -0.5, 1 / 6, 0, -1 / 30, 0, 1 / 42, 0, -1 / 30, 0, 5 / 66, 0, -691 / 2730, 0, 7 / 6, 0, -3617 / 510];

/** The share (0–1) of a black body's power between two wavelengths (m). */
export function fractionBetween(shorter: number, longer: number, kelvin: number): number {
  return Math.max(0, fractionShortward(longer, kelvin) - fractionShortward(shorter, kelvin));
}

/** The visible band, by the usual convention: 400–700 nm, in metres. */
export const VISIBLE = { from: 400e-9, to: 700e-9 } as const;
