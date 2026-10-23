import { clamp } from '../math/angles';

/**
 * How a star looks: its colour from its B−V colour index, and the size and
 * brightness of the dot that stands for it.
 */

/**
 * A star's surface temperature from its B−V colour index (magnitudes), by
 * Ballesteros's formula (2012, EPL 97, 34008), which treats the star as a
 * black body: T = 4600 K × [1/(0.92 (B−V) + 1.7) + 1/(0.92 (B−V) + 0.62)].
 * Kelvin. Good to a few per cent for main-sequence stars.
 */
export function temperatureFromBV(bv: number): number {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

/** A piecewise Gaussian: one width below the peak, another above it. */
function lobe(x: number, mu: number, below: number, above: number): number {
  const t = (x - mu) / (x < mu ? below : above);
  return Math.exp(-0.5 * t * t);
}

/**
 * The CIE 1931 2° colour-matching functions at a wavelength (nm), from Wyman,
 * Sloan & Shirley's multi-lobe fit (2013, JCGT 2(2)).
 */
export function colourMatching(nm: number): [number, number, number] {
  return [
    1.056 * lobe(nm, 599.8, 37.9, 31.0) + 0.362 * lobe(nm, 442.0, 16.0, 26.7) - 0.065 * lobe(nm, 501.1, 20.4, 26.2),
    0.821 * lobe(nm, 568.8, 46.9, 40.5) + 0.286 * lobe(nm, 530.9, 16.3, 31.1),
    1.217 * lobe(nm, 437.0, 11.8, 36.0) + 0.681 * lobe(nm, 459.0, 26.0, 13.8),
  ];
}

/** The second radiation constant hc/k, m·K. */
const C2 = 1.438_776_877e-2;

/** sRGB's transfer curve: linear light (0–1) to an encoded value (0–1). */
function encodeSrgb(linear: number): number {
  const v = clamp(linear, 0, 1);
  return v <= 0.003_130_8 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

/**
 * The colour of a black body at a temperature (K), as sRGB channels 0–255,
 * scaled so the brightest channel is 255. The Planck spectrum is weighted by
 * the colour-matching functions from 380 to 780 nm, turned into linear sRGB
 * (D65 white, so a 6,500 K body is close to white), and encoded.
 */
export function blackBodyColour(kelvin: number): [number, number, number] {
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let nm = 380; nm <= 780; nm += 5) {
    const lambda = nm * 1e-9;
    const planck = 1 / (lambda ** 5 * (Math.exp(C2 / (lambda * kelvin)) - 1));
    const [x, y, z] = colourMatching(nm);
    X += planck * x;
    Y += planck * y;
    Z += planck * z;
  }
  const r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  const g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  const b = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  const max = Math.max(r, g, b);
  return [r, g, b].map((c) => Math.round(255 * encodeSrgb(Math.max(0, c) / max))) as [number, number, number];
}

/** A star's colour from its B−V index (white when it's unknown): sRGB channels 0–255. */
export function starColour(bv: number): [number, number, number] {
  if (!Number.isFinite(bv)) return [255, 255, 255];
  return blackBodyColour(temperatureFromBV(clamp(bv, -0.4, 2.0)));
}

/** How many times brighter a magnitude is than another (a difference of 5 magnitudes is a factor of 100). */
export function fluxRatio(magnitude: number, reference: number): number {
  return 10 ** (-0.4 * (magnitude - reference));
}

/**
 * The dot drawn for a point of light: radius (CSS pixels) and opacity (0–1).
 * The eye's response is far from linear, so the radius grows with the fourth
 * root of the light received (a tenth of a power of ten per magnitude) and the
 * faintest stars are drawn small and dim rather than not at all. A star at the
 * limiting magnitude gets about 0.9 px, Sirius about 3.5 px, and Venus about 6.5 px.
 * `zoom` (≥ 1 when zoomed in) enlarges everything a little.
 */
export function starDot(magnitude: number, limit: number, zoom = 1): { radius: number; alpha: number } {
  const above = limit - magnitude; // magnitudes brighter than the limit
  if (above < 0) return { radius: 0, alpha: 0 };
  const radius = Math.min(7.5, (0.4 + 0.5 * 10 ** (0.1 * above)) * zoom);
  const alpha = clamp(0.3 + 0.35 * above, 0.3, 1);
  return { radius, alpha };
}
