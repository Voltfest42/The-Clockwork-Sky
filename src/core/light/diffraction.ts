/**
 * How a telescope blurs a point of light: diffraction by its circular opening
 * (the Airy pattern), the air's blur (seeing), and adaptive optics.
 *
 * Angles are in radians, wavelengths and apertures in metres. Images are
 * point-spread functions: the light per steradian from a star of unit flux, so
 * that ∫ PSF dΩ = 1.
 */

/** Bessel functions J₀ and J₁: power series below |x| = 12, Hankel's asymptotic expansion above. */
export function besselJ0(x: number): number {
  return besselJ(0, x);
}

export function besselJ1(x: number): number {
  return besselJ(1, x);
}

function besselJ(n: 0 | 1, x: number): number {
  const sign = n === 1 && x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  if (ax < 12) {
    // Σ (−1)ᵏ (x/2)^{2k+n} / (k! (k+n)!)
    const half = ax / 2;
    let term = n === 0 ? 1 : half;
    let sum = term;
    const q = half * half;
    for (let k = 1; k < 80; k++) {
      term *= -q / (k * (k + n));
      sum += term;
      if (Math.abs(term) < 1e-17 * Math.max(1, Math.abs(sum))) break;
    }
    return sign * sum;
  }
  const mu = 4 * n * n;
  const z = 8 * ax;
  // P and Q to ten terms each; at x ≥ 12 the error is about 10⁻¹¹.
  let p = 1;
  let q = 0;
  let term = 1;
  for (let k = 1; k <= 20; k++) {
    term *= (mu - (2 * k - 1) ** 2) / (k * z);
    if (k % 2 === 1) q += (k % 4 === 1 ? 1 : -1) * term;
    else p += (k % 4 === 2 ? -1 : 1) * term;
  }
  const chi = ax - ((2 * n + 1) * Math.PI) / 4;
  return sign * Math.sqrt(2 / (Math.PI * ax)) * (p * Math.cos(chi) - q * Math.sin(chi));
}

/** The first dark ring of the Airy pattern is at x = 3.8317… (the first zero of J₁), so θ = 1.21967 λ/D. */
export const AIRY_FIRST_ZERO = 3.831_705_970_207_512;

/** The Airy pattern's brightness relative to its centre, [2J₁(x)/x]², at x = πDθ/λ. */
export function airy(x: number): number {
  if (Math.abs(x) < 1e-8) return 1;
  const v = (2 * besselJ1(x)) / x;
  return v * v;
}

/** The Rayleigh criterion: the smallest angle (rad) between two stars a telescope of aperture D (m) can split at a wavelength (m), 1.22 λ/D. */
export function rayleighLimit(wavelength: number, aperture: number): number {
  return (AIRY_FIRST_ZERO / Math.PI) * (wavelength / aperture);
}

/** The aperture (m) needed to split two stars an angle (rad) apart: the Rayleigh criterion turned round. */
export function apertureToSplit(wavelength: number, separation: number): number {
  return (AIRY_FIRST_ZERO / Math.PI) * (wavelength / separation);
}

/** How the air blurs: none, a seeing disc of a given width at 500 nm, or adaptive optics that put a share of the light back into a sharp core. */
export type Air =
  | { kind: 'none' }
  | { kind: 'seeing'; fwhm: number }
  | { kind: 'adaptive'; fwhm: number; strehl: number };

/**
 * The diffraction-limited transfer function of a clear circular aperture
 * (the overlap of two discs), at spatial frequency ν as a fraction of the
 * cut-off D/λ.
 */
export function apertureMtf(nu: number): number {
  if (nu >= 1) return 0;
  return (2 / Math.PI) * (Math.acos(nu) - nu * Math.sqrt(1 - nu * nu));
}

/**
 * The long-exposure point-spread function, as a function of angle from the star
 * (rad), tabulated out to `maxAngle`. Without air it is the Airy pattern. With
 * seeing, it is the telescope's transfer function times Kolmogorov
 * turbulence's long-exposure one, exp[−3.44 (λf/r₀)^{5/3}], turned back into an
 * image by a Hankel transform; r₀ = 0.98 λ / FWHM, with the FWHM given at 500 nm
 * and shrinking as λ^{−1/5} at longer wavelengths. Adaptive optics is a simple
 * mix: a share (the Strehl ratio) of the light in the Airy pattern, the rest in
 * the seeing halo.
 */
export function pointSpread(wavelength: number, aperture: number, air: Air, maxAngle: number, samples = 240): { step: number; values: Float64Array } {
  const values = new Float64Array(samples + 1);
  const step = maxAngle / samples;
  const cutoff = aperture / wavelength; // cycles per radian
  const peak = (Math.PI / 4) * cutoff * cutoff; // the Airy peak for unit flux
  const diffraction = (theta: number) => peak * airy((Math.PI * aperture * theta) / wavelength);
  if (air.kind === 'none') {
    for (let i = 0; i <= samples; i++) values[i] = diffraction(i * step);
    return { step, values };
  }
  const r0 = friedParameter(air.fwhm, wavelength);
  // The air's transfer function is below 10⁻⁶ beyond 2.4 r₀/λ, so the integral stops there (or at the aperture's cut-off).
  const fmax = Math.min(cutoff, (2.4 * r0) / wavelength);
  const n = 400; // Simpson's rule over f in [0, fmax]
  const weights = new Float64Array(n + 1);
  for (let k = 0; k <= n; k++) {
    const f = (k / n) * fmax;
    const simpson = k === 0 || k === n ? 1 : k % 2 ? 4 : 2;
    weights[k] = (simpson / (3 * n)) * fmax * apertureMtf(f / cutoff) * Math.exp(-3.44 * ((wavelength * f) / r0) ** (5 / 3)) * 2 * Math.PI * f;
  }
  const strehl = air.kind === 'adaptive' ? air.strehl : 0;
  for (let i = 0; i <= samples; i++) {
    const theta = i * step;
    let sum = 0;
    for (let k = 1; k <= n; k++) sum += weights[k] * besselJ0(2 * Math.PI * (k / n) * fmax * theta);
    values[i] = strehl * diffraction(theta) + (1 - strehl) * Math.max(0, sum);
  }
  return { step, values };
}

/** The seeing disc's width (rad) at a wavelength, from its width at 500 nm: it shrinks slowly, as λ^{−1/5}. */
export function seeingAt(fwhmAt500: number, wavelength: number): number {
  return fwhmAt500 * (wavelength / 500e-9) ** -0.2;
}

/** Fried's parameter r₀ (m), the width of a patch of steady air, from the seeing (rad at 500 nm): FWHM = 0.98 λ / r₀. */
export function friedParameter(fwhmAt500: number, wavelength: number): number {
  return (0.98 * wavelength) / seeingAt(fwhmAt500, wavelength);
}

/** The share of a star's light inside an angle (rad) of its centre in the Airy pattern: 1 − J₀(x)² − J₁(x)² (Rayleigh), x = πDθ/λ. */
export function airyEncircled(angle: number, wavelength: number, aperture: number): number {
  const x = (Math.PI * aperture * angle) / wavelength;
  if (x < 1e-6) return 0;
  const j0 = besselJ0(x);
  const j1 = besselJ1(x);
  return 1 - j0 * j0 - j1 * j1;
}

/** The share of the light inside each tabulated angle, by adding up rings of a tabulated point-spread function. */
export function encircled(psf: { step: number; values: Float64Array }): Float64Array {
  const out = new Float64Array(psf.values.length);
  for (let i = 1; i < out.length; i++) {
    const r0 = (i - 1) * psf.step;
    const r1 = i * psf.step;
    // The trapezium rule on PSF × 2πr.
    out[i] = out[i - 1] + Math.PI * psf.step * (psf.values[i - 1] * r0 + psf.values[i] * r1);
  }
  return out;
}

/** Reads a tabulated point-spread function at an angle (rad), by straight lines between samples; zero beyond the table. */
export function psfAt(psf: { step: number; values: Float64Array }, angle: number): number {
  const i = angle / psf.step;
  const k = Math.floor(i);
  if (k >= psf.values.length - 1) return 0;
  const t = i - k;
  return psf.values[k] * (1 - t) + psf.values[k + 1] * t;
}
