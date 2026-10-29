import { photonRateV } from '../core/light/filters';
import { Random } from '../core/random';
import { formatDuration } from '../core/time/duration';
import type { Bucket } from '../data/telescopes';

/**
 * Counting photons (Figure 10.2): a star's photons landing on a small grid of
 * pixels, at real rates through the V filter, with a perfect detector: every
 * photon counted, no read noise, no sky. The count in each pixel is random
 * (Poisson), so the image is noisy, and its noise relative to the signal falls
 * as 1/√N.
 */

export const TARGETS = [
  { id: 'sirius', name: 'Sirius', V: -1.46 },
  { id: 'vega', name: 'Vega', V: 0.03 },
  { id: 'polaris', name: 'Polaris', V: 1.98 },
  { id: 'limit', name: 'a star at the eye’s limit', V: 6 },
  { id: 'proxima', name: 'Proxima Centauri', V: 11.13 },
  { id: 'pluto', name: 'Pluto', V: 14.4 },
  { id: 'galaxy', name: 'a distant galaxy', V: 24 },
  { id: 'jwst', name: 'JWST’s faintest galaxies', V: 31 },
] as const;

/** Photons a second from a star of visual magnitude V into a bucket. */
export function photonRate(V: number, bucket: Bucket): number {
  return photonRateV(V) * bucket.area;
}

/** The grid: GRID × GRID pixels, the star's light spread as a Gaussian of SIGMA pixels about the middle. */
export const GRID = 21;
const SIGMA = 1.7;

/** The share of the star's light falling on each pixel (row by row), summing to just under 1. */
export const PIXEL_SHARE: Float64Array = (() => {
  const share = new Float64Array(GRID * GRID);
  const c = (GRID - 1) / 2;
  const erf1 = (x: number) => 0.5 * (1 + erf(x / (SIGMA * Math.SQRT2)));
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) share[j * GRID + i] = (erf1(i - c + 0.5) - erf1(i - c - 0.5)) * (erf1(j - c + 0.5) - erf1(j - c - 0.5));
  return share;
})();

/** The error function (Abramowitz & Stegun 7.1.26, to 1.5 × 10⁻⁷). */
export function erf(x: number): number {
  const t = 1 / (1 + 0.327_591_1 * Math.abs(x));
  const y = 1 - ((((1.061_405_429 * t - 1.453_152_027) * t + 1.421_413_741) * t - 0.284_496_736) * t + 0.254_829_592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/**
 * One exposure: each pixel's photon count for the whole exposure (Poisson,
 * seeded), and what each pixel has collected by a fraction f of the way
 * through, for the time-lapse. Few photons in a pixel get their own arrival
 * times; many are thinned smoothly with a fixed random wobble per pixel, which
 * keeps the right mean and spread.
 */
export class Exposure {
  readonly totals: Float64Array;
  private readonly times: (Float64Array | null)[];
  private readonly wobble: Float64Array;

  constructor(expected: number, seed: number) {
    const random = new Random(seed);
    this.totals = new Float64Array(GRID * GRID);
    this.times = [];
    this.wobble = new Float64Array(GRID * GRID);
    for (let p = 0; p < GRID * GRID; p++) {
      const n = random.poisson(expected * PIXEL_SHARE[p]);
      this.totals[p] = n;
      this.wobble[p] = random.normal();
      if (n <= 60) {
        const t = new Float64Array(n);
        for (let k = 0; k < n; k++) t[k] = random.next();
        this.times.push(t);
      } else this.times.push(null);
    }
  }

  /** Counts per pixel once a fraction f (0–1) of the exposure has passed. */
  countsAt(f: number): Float64Array {
    const out = new Float64Array(GRID * GRID);
    for (let p = 0; p < out.length; p++) {
      const times = this.times[p];
      const n = this.totals[p];
      if (times) {
        let k = 0;
        for (const t of times) if (t < f) k++;
        out[p] = k;
      } else out[p] = Math.max(0, Math.min(n, Math.round(f * n + this.wobble[p] * Math.sqrt(f * (1 - f) * n))));
    }
    return out;
  }
}

export function total(counts: Float64Array): number {
  let s = 0;
  for (const c of counts) s += c;
  return s;
}

/** How the exposure turned out, in a sentence. */
export function describeExposure(expected: number, counted: number, rate: number, seconds: number, target: string, bucket: string): string {
  const time = formatDuration(seconds);
  if (counted === 0) {
    const wait = rate > 0 ? formatDuration(1 / rate) : 'for ever';
    return `In ${time}, ${bucket} caught no photons from ${target}: on average one arrives every ${wait}.`;
  }
  const noise = 100 / Math.sqrt(counted);
  const verdict =
    counted < 30 ? 'a few scattered dots, nothing you could call a star' : counted < 300 ? 'a faint, grainy blob' : counted < 10_000 ? 'a clear star, still a little grainy' : 'a smooth, sharp star';
  return `In ${time}, ${bucket} caught ${counted.toLocaleString('en-GB')} photons from ${target} (about ${formatCount(expected)} expected): ${verdict}. The noise is about √N, ${noise < 1 ? noise.toFixed(2) : noise.toFixed(noise < 10 ? 1 : 0)}% of the signal.`;
}

/** A count for reading: 1,234 or 3.4 million. */
export function formatCount(n: number): string {
  if (n < 1) return n.toPrecision(2);
  if (n < 1e6) return Math.round(n).toLocaleString('en-GB');
  if (n < 1e9) return `${(n / 1e6).toPrecision(3)} million`;
  if (n < 1e12) return `${(n / 1e9).toPrecision(3)} billion`;
  return `${(n / 1e12).toPrecision(3)} trillion`;
}
