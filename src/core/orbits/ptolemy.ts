import { wrapPi } from '../math/angles';
import { DEG } from '../units';

/**
 * Ptolemy's model of a superior planet (Almagest, books IX–XI), in the plane
 * of the ecliptic only (no latitude theory).
 *
 * Earth sits still at the origin. The planet rides on a small circle, the
 * epicycle, whose centre moves round a larger circle, the deferent. The
 * deferent's centre is set off from Earth by `centre` towards the apogee; the
 * epicycle's centre moves round it at a steady rate as seen not from Earth or
 * from the deferent's centre but from a third point, the equant, set off by
 * `equant`. (Ptolemy put the equant twice as far out as the centre: the
 * "bisected eccentricity".) The planet goes round the epicycle at a steady
 * rate measured from the line through the equant, so that for Mars, Jupiter
 * and Saturn the line from the epicycle's centre to the planet stays parallel
 * to the line from Earth to the mean Sun.
 *
 * Lengths are in deferent radii (Ptolemy used 60 parts), angles in radians,
 * times in days, and longitudes are measured against the stars from the same
 * zero as the real ones the model is scored against.
 */

export interface PtolemyParams {
  /** The epicycle's radius, in deferent radii (Ptolemy's Mars: 39½ parts of 60). */
  epicycle: number;
  /** How far the deferent's centre is from Earth, in deferent radii (Mars: 6 of 60). */
  centre: number;
  /** How far the equant is from Earth, in deferent radii (Ptolemy: twice the centre's). */
  equant: number;
  /** The direction of the apogee from Earth, radians. */
  apogee: number;
  /** Days for the epicycle's centre to go once round the deferent, as seen from the equant (Mars: 687). */
  deferentPeriod: number;
  /** Days for the planet to go once round the epicycle, measured from the line through the equant (Mars: 780, its synodic period). */
  epicyclePeriod: number;
}

/** Where the model's motions stand at its starting moment, its epoch. */
export interface PtolemyEpoch {
  /** Julian Date (TT) of the epoch. */
  jdTT: number;
  /** The epicycle centre's mean longitude then, as seen from the equant: radians. */
  meanLongitude: number;
  /** The planet's angle round the epicycle then, measured from the line through the equant: radians. */
  anomaly: number;
}

export interface PtolemyState {
  /** The epicycle's centre and the planet, Earth at the origin: deferent radii. */
  epicycleCentre: { x: number; y: number };
  planet: { x: number; y: number };
  deferentCentre: { x: number; y: number };
  equantPoint: { x: number; y: number };
  /** The planet's longitude as seen from Earth, radians, −π to π. */
  longitude: number;
  /** The epicycle centre's mean longitude, as seen from the equant, radians. */
  meanLongitude: number;
}

/** The model's state at a Julian Date (TT). */
export function ptolemyAt(p: PtolemyParams, epoch: PtolemyEpoch, jdTT: number): PtolemyState {
  const dt = jdTT - epoch.jdTT;
  const mean = epoch.meanLongitude + (2 * Math.PI * dt) / p.deferentPeriod;
  const anomaly = epoch.anomaly + (2 * Math.PI * dt) / p.epicyclePeriod;
  const ax = Math.cos(p.apogee);
  const ay = Math.sin(p.apogee);
  const C = { x: p.centre * ax, y: p.centre * ay };
  const Q = { x: p.equant * ax, y: p.equant * ay };
  // The epicycle's centre is where the ray from the equant at the mean longitude meets the deferent.
  const ux = Math.cos(mean);
  const uy = Math.sin(mean);
  const qx = Q.x - C.x;
  const qy = Q.y - C.y;
  const b = ux * qx + uy * qy;
  const c = qx * qx + qy * qy - 1;
  const s = -b + Math.sqrt(Math.max(0, b * b - c));
  const P = { x: Q.x + s * ux, y: Q.y + s * uy };
  const dir = mean + anomaly;
  const planet = { x: P.x + p.epicycle * Math.cos(dir), y: P.y + p.epicycle * Math.sin(dir) };
  return { epicycleCentre: P, planet, deferentCentre: C, equantPoint: Q, longitude: Math.atan2(planet.y, planet.x), meanLongitude: mean };
}

/** The model's longitude at many times at once, radians. */
export function ptolemyLongitudes(p: PtolemyParams, epoch: PtolemyEpoch, times: readonly number[]): Float64Array {
  const out = new Float64Array(times.length);
  for (let i = 0; i < times.length; i++) out[i] = ptolemyAt(p, epoch, times[i]).longitude;
  return out;
}

export interface FitScore {
  /** The average miss, radians. */
  mean: number;
  /** The worst miss, radians. */
  worst: number;
  /** When the worst miss happens, Julian Date (TT). */
  worstAt: number;
}

/** How far a model's longitudes are from the real ones at the same times. */
export function scoreFit(p: PtolemyParams, epoch: PtolemyEpoch, times: readonly number[], real: ArrayLike<number>): FitScore {
  let sum = 0;
  let worst = 0;
  let worstAt = times[0];
  for (let i = 0; i < times.length; i++) {
    const miss = Math.abs(wrapPi(ptolemyAt(p, epoch, times[i]).longitude - real[i]));
    sum += miss;
    if (miss > worst) {
      worst = miss;
      worstAt = times[i];
    }
  }
  return { mean: sum / times.length, worst, worstAt };
}

/** Ptolemy's own proportions for Mars (Almagest X.7): an epicycle of 39½ parts and an eccentricity of 6, on a deferent of 60. */
export const PTOLEMY_MARS = { epicycle: 39.5 / 60, centre: 6 / 60, equant: 12 / 60 } as const;

/** The ranges the figure's sliders allow, which the fit also keeps to. */
export const PARAM_RANGES: Readonly<Record<keyof PtolemyParams, readonly [number, number]>> = {
  epicycle: [0, 0.95],
  centre: [0, 0.3],
  equant: [0, 0.3],
  apogee: [-Math.PI, Math.PI],
  deferentPeriod: [500, 900],
  epicyclePeriod: [600, 960],
};

const KEYS: readonly (keyof PtolemyParams)[] = ['epicycle', 'centre', 'equant', 'apogee', 'deferentPeriod', 'epicyclePeriod'];

function clampParams(p: PtolemyParams): PtolemyParams {
  const out = { ...p };
  for (const k of KEYS) {
    const [lo, hi] = PARAM_RANGES[k];
    out[k] = k === 'apogee' ? wrapPi(p[k]) : Math.min(hi, Math.max(lo, p[k]));
  }
  return out;
}

/**
 * The best this kind of model can do: the parameters with the smallest average
 * miss, found by the Nelder–Mead simplex method starting from `start`. The
 * epoch stays fixed. With `noEquant`, the equant is kept on the deferent's
 * centre (uniform motion about the centre, as before Ptolemy). Deterministic:
 * the same inputs give the same answer.
 */
export function bestFit(
  start: PtolemyParams,
  epoch: PtolemyEpoch,
  times: readonly number[],
  real: ArrayLike<number>,
  { iterations = 1500, noEquant = false }: { iterations?: number; noEquant?: boolean } = {},
): PtolemyParams {
  const steps: Record<keyof PtolemyParams, number> = { epicycle: 0.05, centre: 0.03, equant: 0.03, apogee: 10 * DEG, deferentPeriod: 5, epicyclePeriod: 5 };
  const toVector = (p: PtolemyParams) => KEYS.map((k) => p[k]);
  const fromVector = (v: number[]): PtolemyParams => {
    const p = clampParams(Object.fromEntries(KEYS.map((k, i) => [k, v[i]])) as unknown as PtolemyParams);
    return noEquant ? { ...p, equant: p.centre } : p;
  };
  const cost = (v: number[]) => scoreFit(fromVector(v), epoch, times, real).mean;

  const n = KEYS.length;
  const simplex: { v: number[]; f: number }[] = [];
  const x0 = toVector(start);
  simplex.push({ v: x0, f: cost(x0) });
  for (let i = 0; i < n; i++) {
    const v = [...x0];
    v[i] += steps[KEYS[i]];
    simplex.push({ v, f: cost(v) });
  }
  for (let it = 0; it < iterations; it++) {
    simplex.sort((a, b) => a.f - b.f);
    const best = simplex[0];
    const worst = simplex[n];
    if (worst.f - best.f < 1e-9) break;
    const centroid = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i].v[j] / n;
    const along = (k: number) => centroid.map((c, j) => c + k * (worst.v[j] - c));
    const reflected = along(-1);
    const fr = cost(reflected);
    if (fr < best.f) {
      const expanded = along(-2);
      const fe = cost(expanded);
      simplex[n] = fe < fr ? { v: expanded, f: fe } : { v: reflected, f: fr };
    } else if (fr < simplex[n - 1].f) {
      simplex[n] = { v: reflected, f: fr };
    } else {
      const contracted = along(fr < worst.f ? -0.5 : 0.5);
      const fc = cost(contracted);
      if (fc < Math.min(fr, worst.f)) {
        simplex[n] = { v: contracted, f: fc };
      } else {
        for (let i = 1; i <= n; i++) {
          const v = simplex[i].v.map((x, j) => best.v[j] + 0.5 * (x - best.v[j]));
          simplex[i] = { v, f: cost(v) };
        }
      }
    }
  }
  simplex.sort((a, b) => a.f - b.f);
  return fromVector(simplex[0].v);
}
