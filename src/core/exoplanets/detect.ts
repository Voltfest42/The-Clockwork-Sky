import type { Series } from '../signal/series';

/**
 * Does a planet stand out of the noise? Two matched measurements at the
 * planet's known period: the size of the star's sinusoidal swing, fitted by
 * least squares, and the depth of a box-shaped dip at the transit's time,
 * each divided by its uncertainty. A blind search over many periods needs a
 * higher bar, because noise alone throws up peaks (Toolkit T6); Kepler asked
 * for 7.1σ.
 *
 * Units are the caller's: times in days, velocities in m/s, light as a
 * fraction of the star's.
 */

/** The threshold this course uses for "detected": Kepler's, 7.1σ. */
export const DETECTION_SIGMA = 7.1;

export interface WobbleFit {
  /** The fitted semi-amplitude, same units as the values. */
  k: number;
  /** Its uncertainty. */
  error: number;
  significance: number;
}

/**
 * Fits v = A sin(2πt/P) + B cos(2πt/P) + C by least squares to measurements
 * of known scatter sigma, and returns K = √(A² + B²) with its uncertainty
 * from the fit's covariance.
 */
export function fitWobble(series: Series, period: number, sigma: number): WobbleFit {
  const n = series.times.length;
  // Normal equations for the three unknowns.
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const r = [0, 0, 0];
  for (let k = 0; k < n; k++) {
    const w = (2 * Math.PI * series.times[k]) / period;
    const row = [Math.sin(w), Math.cos(w), 1];
    for (let i = 0; i < 3; i++) {
      r[i] += row[i] * series.values[k];
      for (let j = 0; j < 3; j++) m[i][j] += row[i] * row[j];
    }
  }
  const inv = invert3(m);
  if (!inv) return { k: 0, error: Infinity, significance: 0 };
  const coef = [0, 1, 2].map((i) => inv[i][0] * r[0] + inv[i][1] * r[1] + inv[i][2] * r[2]);
  const [a, b] = coef;
  const k = Math.hypot(a, b);
  // σ_K² = σ² (a² C₀₀ + 2ab C₀₁ + b² C₁₁) / K²; at K = 0, the mean of the two variances.
  const variance = k > 0 ? (sigma * sigma * (a * a * inv[0][0] + 2 * a * b * inv[0][1] + b * b * inv[1][1])) / (k * k) : (sigma * sigma * (inv[0][0] + inv[1][1])) / 2;
  const error = Math.sqrt(Math.max(variance, 0));
  return { k, error, significance: error > 0 ? k / error : 0 };
}

function invert3(m: number[][]): number[][] | null {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

export interface DipFit {
  /** The mean outside the dip minus the mean inside. */
  depth: number;
  error: number;
  significance: number;
  /** How many measurements fell in the dip. */
  inside: number;
}

/** The depth of a dip of the given duration centred on t0 + k × period, from measurements of known scatter sigma. */
export function measureDip(series: Series, period: number, t0: number, duration: number, sigma: number): DipFit {
  let sIn = 0;
  let nIn = 0;
  let sOut = 0;
  let nOut = 0;
  for (let k = 0; k < series.times.length; k++) {
    const p = (series.times[k] - t0) / period;
    const offset = (p - Math.round(p)) * period;
    if (Math.abs(offset) < duration / 2) {
      sIn += series.values[k];
      nIn++;
    } else {
      sOut += series.values[k];
      nOut++;
    }
  }
  if (!nIn || !nOut) return { depth: 0, error: Infinity, significance: 0, inside: nIn };
  const depth = sOut / nOut - sIn / nIn;
  const error = sigma * Math.sqrt(1 / nIn + 1 / nOut);
  return { depth, error, significance: depth / error, inside: nIn };
}
