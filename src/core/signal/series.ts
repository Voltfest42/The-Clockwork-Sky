import { Random } from '../random';

/**
 * Measurements in a row: times and values with noise. Averaging, folding at a
 * trial period, and searching many periods for a repeating dip (a simple box
 * search, after Kovács, Zucker & Mazeh 2002). Used by Toolkit T6 and the
 * binary workbench, and later for planets' transits.
 *
 * Units are the caller's: times in days and values as fractions of a star's
 * light, in this course.
 */

export interface Series {
  times: Float64Array;
  values: Float64Array;
}

/** Gaussian noise of standard deviation sigma added to a model, at the given times, from a seed. */
export function measure(times: ArrayLike<number>, model: (t: number) => number, sigma: number, seed: number): Series {
  const random = new Random(seed);
  const t = Float64Array.from(times);
  return { times: t, values: t.map((x) => model(x) + sigma * random.normal()) };
}

/** Times every `cadence` from `start` for `span` (same units), leaving out gaps where `observed` says no. */
export function sampleTimes(start: number, span: number, cadence: number, observed: (t: number) => boolean = () => true): number[] {
  const out: number[] = [];
  for (let t = start; t < start + span; t += cadence) if (observed(t)) out.push(t);
  return out;
}

/** The phase (0 to 1) of each time folded at a period, with phase 0 at t0. */
export function fold(times: ArrayLike<number>, period: number, t0 = 0): Float64Array {
  return Float64Array.from(times, (t) => {
    const p = (t - t0) / period;
    return p - Math.floor(p);
  });
}

export interface Bin {
  /** The bin's centre. */
  x: number;
  mean: number;
  /** The mean's uncertainty: the scatter of its points divided by √N (or sigma/√N if sigma is given). */
  error: number;
  count: number;
}

/** Averages of the values in bins of width `width` along x, from `from`; empty bins are left out. */
export function bin(xs: ArrayLike<number>, values: ArrayLike<number>, width: number, from = 0, sigma?: number): Bin[] {
  const sums = new Map<number, { s: number; s2: number; n: number }>();
  for (let k = 0; k < xs.length; k++) {
    const b = Math.floor((xs[k] - from) / width);
    const cell = sums.get(b) ?? { s: 0, s2: 0, n: 0 };
    cell.s += values[k];
    cell.s2 += values[k] * values[k];
    cell.n += 1;
    sums.set(b, cell);
  }
  return [...sums.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, { s, s2, n }]) => {
      const mean = s / n;
      const scatter = sigma ?? Math.sqrt(Math.max(0, s2 / n - mean * mean) * (n > 1 ? n / (n - 1) : 1));
      return { x: from + (b + 0.5) * width, mean, error: scatter / Math.sqrt(n), count: n };
    });
}

/** The scatter (standard deviation) of a set of values. */
export function standardDeviation(values: ArrayLike<number>): number {
  let s = 0;
  let s2 = 0;
  for (let k = 0; k < values.length; k++) {
    s += values[k];
    s2 += values[k] * values[k];
  }
  const n = values.length;
  const mean = s / n;
  return Math.sqrt(Math.max(0, (s2 / n - mean * mean) * (n / (n - 1))));
}

/** χ²: the sum of the squared misfits, each in units of its uncertainty. A good fit gives about one per point. */
export function chiSquare(values: ArrayLike<number>, model: ArrayLike<number>, sigma: number): number {
  let sum = 0;
  for (let k = 0; k < values.length; k++) sum += ((values[k] - model[k]) / sigma) ** 2;
  return sum;
}

export interface BoxResult {
  period: number;
  /** Phase of the dip's middle, 0 to 1. */
  phase: number;
  /** How deep the best dip is: the mean outside the box minus the mean inside. */
  depth: number;
  /** The depth divided by its uncertainty: how many σ it stands out. */
  significance: number;
}

/**
 * For each trial period, folds the series and slides a box of the given
 * duration (a fraction of the period's phase, or in time units if
 * `durationTime` is set) across it, keeping the deepest dip: the box
 * least-squares search in its simplest form. The significance is the dip's
 * depth over its uncertainty, sigma × √(1/N_in + 1/N_out).
 */
export function boxSearch(series: Series, periods: readonly number[], durationTime: number, sigma: number, phaseBins = 200): BoxResult[] {
  const n = series.times.length;
  let total = 0;
  for (let k = 0; k < n; k++) total += series.values[k];
  return periods.map((period) => {
    const sums = new Float64Array(phaseBins);
    const counts = new Float64Array(phaseBins);
    for (let k = 0; k < n; k++) {
      const p = series.times[k] / period;
      const b = Math.min(phaseBins - 1, Math.floor((p - Math.floor(p)) * phaseBins));
      sums[b] += series.values[k];
      counts[b] += 1;
    }
    const width = Math.max(1, Math.round((durationTime / period) * phaseBins));
    let best: BoxResult = { period, phase: 0, depth: 0, significance: 0 };
    for (let start = 0; start < phaseBins; start++) {
      let s = 0;
      let c = 0;
      for (let j = 0; j < width; j++) {
        const b = (start + j) % phaseBins;
        s += sums[b];
        c += counts[b];
      }
      if (c < 2 || c > n - 2) continue;
      const depth = (total - s) / (n - c) - s / c;
      const significance = depth / (sigma * Math.sqrt(1 / c + 1 / (n - c)));
      if (significance > best.significance) best = { period, phase: (start + width / 2) / phaseBins, depth, significance };
    }
    return best;
  });
}

/** A box-shaped dip: 1 − depth while within half a duration of t0 + k × period, else 1. */
export function boxModel(period: number, t0: number, duration: number, depth: number): (t: number) => number {
  return (t) => {
    const p = (t - t0) / period;
    const offset = (p - Math.round(p)) * period;
    return Math.abs(offset) < duration / 2 ? 1 - depth : 1;
  };
}

/** Periods evenly spaced in frequency between two periods, as a periodogram wants. */
export function periodGrid(shortest: number, longest: number, count: number): number[] {
  const f0 = 1 / longest;
  const f1 = 1 / shortest;
  return Array.from({ length: count }, (_, k) => 1 / (f0 + ((f1 - f0) * k) / (count - 1)));
}
