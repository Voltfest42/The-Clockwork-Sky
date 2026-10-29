import { C, H } from '../constants';
import { planck } from './planck';

/**
 * Filters and synthetic photometry: how bright a spectrum looks through a
 * coloured filter, and so its colour index B − V.
 *
 * The Johnson B and V passbands are Bessell's (1990, PASP 102, 1181, Table 2),
 * normalised response against wavelength, as served by the SVO Filter Profile
 * Service (Generic/Bessell.B and .V). They are weighted for energy: a filter's
 * mean flux density is ∫F_λ S dλ / ∫S dλ.
 *
 * Magnitudes are on the Vega system through Bessell's zero points: a star of
 * magnitude 0 has a mean flux density of 6.32 × 10⁻⁹ erg cm⁻² s⁻¹ Å⁻¹ in B and
 * 3.631 × 10⁻⁹ in V (Bessell, Castelli & Plez 1998, Table A2), so Vega has
 * B − V ≈ 0. Wavelengths are in metres; flux densities in W m⁻² m⁻¹.
 */

export interface Filter {
  name: string;
  /** Effective wavelength, m. */
  effective: number;
  /** Mean flux density of a magnitude-0 star through the filter, W m⁻² m⁻¹. */
  zeroPoint: number;
  /** [wavelength (m), response 0–1], in order of wavelength. */
  response: readonly (readonly [number, number])[];
}

const nm = (values: readonly (readonly [number, number])[]) => values.map(([a, s]) => [a * 1e-10, s] as const);

export const FILTER_B: Filter = {
  name: 'B',
  effective: 438e-9,
  // 6.32 × 10⁻⁹ erg cm⁻² s⁻¹ Å⁻¹ = 6.32 × 10⁻² W m⁻² m⁻¹.
  zeroPoint: 6.32e-2,
  response: nm([
    [3600, 0], [3700, 0.03], [3800, 0.134], [3900, 0.567], [4000, 0.92], [4100, 0.978], [4200, 1], [4300, 0.978], [4400, 0.935],
    [4500, 0.853], [4600, 0.74], [4700, 0.64], [4800, 0.536], [4900, 0.424], [5000, 0.325], [5100, 0.235], [5200, 0.15], [5300, 0.095],
    [5400, 0.043], [5500, 0.009], [5600, 0],
  ]),
};

export const FILTER_V: Filter = {
  name: 'V',
  effective: 545e-9,
  zeroPoint: 3.631e-2,
  response: nm([
    [4700, 0], [4800, 0.03], [4900, 0.163], [5000, 0.458], [5100, 0.78], [5200, 0.967], [5300, 1], [5400, 0.973], [5500, 0.898],
    [5600, 0.792], [5700, 0.684], [5800, 0.574], [5900, 0.461], [6000, 0.359], [6100, 0.27], [6200, 0.197], [6300, 0.135], [6400, 0.081],
    [6500, 0.045], [6600, 0.025], [6700, 0.017], [6800, 0.013], [6900, 0.009], [7000, 0],
  ]),
};

/** A filter's response at a wavelength (m), by straight lines between the tabulated points; zero outside them. */
export function filterResponse(filter: Filter, wavelength: number): number {
  const r = filter.response;
  if (wavelength <= r[0][0] || wavelength >= r[r.length - 1][0]) return 0;
  let i = 1;
  while (r[i][0] < wavelength) i++;
  const [x0, y0] = r[i - 1];
  const [x1, y1] = r[i];
  return y0 + ((y1 - y0) * (wavelength - x0)) / (x1 - x0);
}

/** ∫ S(λ) dλ, m: the filter's equivalent width (about 89 nm for V). */
export function equivalentWidth(filter: Filter): number {
  return integrate(filter, () => 1);
}

/** ∫ f(λ) S(λ) dλ over the filter, by the trapezium rule on a 1 nm grid. */
function integrate(filter: Filter, f: (wavelength: number) => number): number {
  const r = filter.response;
  const from = r[0][0];
  const to = r[r.length - 1][0];
  const steps = Math.round((to - from) / 1e-9);
  const h = (to - from) / steps;
  let sum = 0;
  for (let i = 0; i <= steps; i++) {
    const lambda = from + i * h;
    sum += (i === 0 || i === steps ? 0.5 : 1) * f(lambda) * filterResponse(filter, lambda);
  }
  return sum * h;
}

/** The mean flux density (same units as the spectrum) of a spectrum F_λ seen through a filter: ∫F S dλ / ∫S dλ. */
export function meanFluxDensity(filter: Filter, spectrum: (wavelength: number) => number): number {
  return integrate(filter, spectrum) / equivalentWidth(filter);
}

/** A spectrum's magnitude through a filter, on the Vega system: −2.5 log₁₀(⟨F_λ⟩ / zero point). Needs F_λ in W m⁻² m⁻¹. */
export function magnitudeThrough(filter: Filter, spectrum: (wavelength: number) => number): number {
  return -2.5 * Math.log10(meanFluxDensity(filter, spectrum) / filter.zeroPoint);
}

/**
 * The colour index B − V of a black body at a temperature (K). Only the shape of
 * the spectrum matters, so the radiance's scale cancels. About 0 near
 * 10,000 K, positive (redder) for cooler bodies. Real stars are a little redder
 * than black bodies of the same temperature: their dark lines take more light out
 * of B than of V.
 */
export function blackBodyBV(kelvin: number): number {
  const b = meanFluxDensity(FILTER_B, (l) => planck(l, kelvin)) / FILTER_B.zeroPoint;
  const v = meanFluxDensity(FILTER_V, (l) => planck(l, kelvin)) / FILTER_V.zeroPoint;
  return -2.5 * Math.log10(b / v);
}

/**
 * Photons per second per square metre through the V filter from a star of visual
 * magnitude m, for a perfect detector: the zero point's flux density, as photons
 * at the effective wavelength, across the filter's equivalent width. Magnitude 0
 * gives about 9 × 10⁹ (9 × 10⁵ per cm²).
 */
export function photonRateV(magnitude: number): number {
  const photon = (H * C) / FILTER_V.effective;
  return ((FILTER_V.zeroPoint * equivalentWidth(FILTER_V)) / photon) * 10 ** (-0.4 * magnitude);
}
