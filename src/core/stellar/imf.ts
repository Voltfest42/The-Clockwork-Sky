import type { Random } from '../random';

/**
 * The initial mass function: how many stars are born at each mass. Kroupa's
 * (2001, MNRAS 322, 231) broken power law, dN/dM ∝ M^−α with α = 0.3 below
 * 0.08 M☉, 1.3 from 0.08 to 0.5 and 2.3 above (Salpeter's 2.35, nearly), joined
 * without a step. Masses in M☉.
 */

export interface Segment {
  /** Lower and upper mass, M☉. */
  lo: number;
  hi: number;
  alpha: number;
}

export interface Imf {
  segments: readonly Segment[];
  /** Each segment's coefficient k in dN/dM = k M^−α, continuous at the breaks, normalised to one object in all. */
  k: readonly number[];
}

export const KROUPA_BREAKS = [0.01, 0.08, 0.5, 150] as const;
export const KROUPA_ALPHAS = [0.3, 1.3, 2.3] as const;
/** Salpeter's (1955) single slope. */
export const SALPETER_ALPHA = 2.35;

/** ∫ M^p dM from lo to hi. */
function powerIntegral(lo: number, hi: number, p: number): number {
  return Math.abs(p + 1) < 1e-12 ? Math.log(hi / lo) : (hi ** (p + 1) - lo ** (p + 1)) / (p + 1);
}

/** Kroupa's IMF from `lo` to `hi` (M☉), normalised to one object. */
export function kroupa(lo: number = KROUPA_BREAKS[0], hi: number = KROUPA_BREAKS[3]): Imf {
  const segments: Segment[] = [];
  const k: number[] = [];
  let coefficient = 1;
  for (let s = 0; s < KROUPA_ALPHAS.length; s++) {
    const a = KROUPA_BREAKS[s];
    const b = KROUPA_BREAKS[s + 1];
    if (s > 0) coefficient *= a ** (KROUPA_ALPHAS[s] - KROUPA_ALPHAS[s - 1]);
    const from = Math.max(a, lo);
    const to = Math.min(b, hi);
    if (to <= from) continue;
    segments.push({ lo: from, hi: to, alpha: KROUPA_ALPHAS[s] });
    k.push(coefficient);
  }
  const total = segments.reduce((sum, seg, i) => sum + k[i] * powerIntegral(seg.lo, seg.hi, -seg.alpha), 0);
  return { segments, k: k.map((x) => x / total) };
}

/** dN/dM at mass m (M☉): the share of objects per solar mass. */
export function imfDensity(imf: Imf, m: number): number {
  const i = imf.segments.findIndex((s) => m >= s.lo && m <= s.hi);
  return i < 0 ? 0 : imf.k[i] * m ** -imf.segments[i].alpha;
}

/** The share of objects (moment 0) or of mass (moment 1) between `lo` and `hi` (M☉). */
export function imfShare(imf: Imf, lo: number, hi: number, moment: 0 | 1 = 0): number {
  const part = (a: number, b: number) =>
    imf.segments.reduce((sum, s, i) => {
      const from = Math.max(s.lo, a);
      const to = Math.min(s.hi, b);
      return to > from ? sum + imf.k[i] * powerIntegral(from, to, moment - s.alpha) : sum;
    }, 0);
  const all = part(imf.segments[0].lo, imf.segments[imf.segments.length - 1].hi);
  return part(lo, hi) / all;
}

/** The mean mass, M☉. */
export function imfMean(imf: Imf): number {
  return imf.segments.reduce((sum, s, i) => sum + imf.k[i] * powerIntegral(s.lo, s.hi, 1 - s.alpha), 0);
}

/** One mass drawn from the IMF by inverting its cumulative distribution (M☉). */
export function sampleImf(imf: Imf, random: Random): number {
  let u = random.next();
  for (const [i, s] of imf.segments.entries()) {
    const n = imf.k[i] * powerIntegral(s.lo, s.hi, -s.alpha);
    if (u <= n || i === imf.segments.length - 1) {
      const f = Math.min(1, u / n);
      const p = 1 - s.alpha;
      return Math.abs(p) < 1e-12 ? s.lo * (s.hi / s.lo) ** f : (s.lo ** p + f * (s.hi ** p - s.lo ** p)) ** (1 / p);
    }
    u -= n;
  }
  return imf.segments[imf.segments.length - 1].hi;
}

/** Draws objects from the IMF until `stars` of them are stars (≥ `starLimit` M☉); brown dwarfs come along. */
export function drawCluster(imf: Imf, stars: number, random: Random, starLimit = 0.08): number[] {
  const masses: number[] = [];
  let n = 0;
  while (n < stars) {
    const m = sampleImf(imf, random);
    masses.push(m);
    if (m >= starLimit) n++;
  }
  return masses;
}
