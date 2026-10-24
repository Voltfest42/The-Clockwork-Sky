import { AU, GM_SUN } from '../constants';
import { SECONDS_PER_DAY } from '../units';

/**
 * The n-body engine's state: point masses pulling on each other by Newton's
 * law of gravity, held in typed arrays.
 *
 * The engine works in any consistent units: lengths L, times T, and each
 * body's gravitational parameter G·m in L³/T². The Orrery and the chapter
 * figures that move planets use astronomical units and days (G·m in AU³/day²,
 * where the Sun's is the Gaussian constant squared, about 2.959 × 10⁻⁴);
 * Newton's cannon uses metres and seconds. The helpers below convert from SI
 * at the edges.
 */

export interface NBodySystem {
  /** Number of bodies. */
  readonly n: number;
  /** Gravitational parameters G·m, L³/T². Zero for a test particle, which is pulled but pulls nothing. */
  gm: Float64Array;
  /** Positions, L: x₀, y₀, z₀, x₁, … */
  x: Float64Array;
  /** Velocities, L/T, in the same layout. */
  v: Float64Array;
  /** Time since the start, T. */
  t: number;
}

export type Vec = readonly [number, number, number];

/** One body as a figure or a message describes it: G·m (L³/T²), position (L) and velocity (L/T). */
export interface BodySpec {
  gm: number;
  x: Vec;
  v: Vec;
}

/** The Sun's G·m in AU³/day², from the IAU nominal value. */
export const GM_SUN_AU_DAY = (GM_SUN * SECONDS_PER_DAY * SECONDS_PER_DAY) / AU ** 3;

/** A G·m in m³/s² as AU³/day². */
export function gmToAuDay(gmSI: number): number {
  return (gmSI * SECONDS_PER_DAY * SECONDS_PER_DAY) / AU ** 3;
}

/** A speed in m/s as AU/day. */
export function speedToAuDay(metresPerSecond: number): number {
  return (metresPerSecond * SECONDS_PER_DAY) / AU;
}

/** A speed in AU/day as m/s. */
export function speedFromAuDay(auPerDay: number): number {
  return (auPerDay * AU) / SECONDS_PER_DAY;
}

/** A system from a list of bodies, at time 0. Throws on a negative or non-finite value. */
export function createSystem(bodies: readonly BodySpec[]): NBodySystem {
  const n = bodies.length;
  const gm = new Float64Array(n);
  const x = new Float64Array(3 * n);
  const v = new Float64Array(3 * n);
  bodies.forEach((b, i) => {
    if (!Number.isFinite(b.gm) || b.gm < 0) throw new Error(`Body ${i + 1} needs a mass of zero or more.`);
    for (let k = 0; k < 3; k++) {
      if (!Number.isFinite(b.x[k]) || !Number.isFinite(b.v[k])) throw new Error(`Body ${i + 1} has a position or velocity that isn’t a number.`);
      x[3 * i + k] = b.x[k];
      v[3 * i + k] = b.v[k];
    }
    gm[i] = b.gm;
  });
  return { n, gm, x, v, t: 0 };
}

/** An independent copy. */
export function cloneSystem(s: NBodySystem): NBodySystem {
  return { n: s.n, gm: Float64Array.from(s.gm), x: Float64Array.from(s.x), v: Float64Array.from(s.v), t: s.t };
}

/** Body i's position (L) or velocity (L/T) as a tuple. */
export function positionOf(s: NBodySystem, i: number): Vec {
  return [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]];
}

export function velocityOf(s: NBodySystem, i: number): Vec {
  return [s.v[3 * i], s.v[3 * i + 1], s.v[3 * i + 2]];
}

/**
 * Newton's gravity for the system's masses: fills `out` with every body's
 * acceleration (L/T²) at positions `x` (L), by adding up the pull of every
 * other body with mass, G·m / r², towards it. Direct summation, n² pairs.
 */
export function gravity(gm: Float64Array): (x: Float64Array, out: Float64Array) => void {
  const n = gm.length;
  return (x, out) => {
    out.fill(0);
    for (let i = 0; i < n; i++) {
      const xi = x[3 * i];
      const yi = x[3 * i + 1];
      const zi = x[3 * i + 2];
      for (let j = i + 1; j < n; j++) {
        if (gm[i] === 0 && gm[j] === 0) continue;
        const dx = x[3 * j] - xi;
        const dy = x[3 * j + 1] - yi;
        const dz = x[3 * j + 2] - zi;
        const r2 = dx * dx + dy * dy + dz * dz;
        const inv = 1 / (r2 * Math.sqrt(r2));
        const fi = gm[j] * inv;
        const fj = gm[i] * inv;
        out[3 * i] += fi * dx;
        out[3 * i + 1] += fi * dy;
        out[3 * i + 2] += fi * dz;
        out[3 * j] -= fj * dx;
        out[3 * j + 1] -= fj * dy;
        out[3 * j + 2] -= fj * dz;
      }
    }
  };
}

/** Moves the system (in place) into the frame of its centre of mass, at rest at the origin. Test particles carry no weight. */
export function toCentreOfMassFrame(s: NBodySystem): NBodySystem {
  let total = 0;
  const r = [0, 0, 0];
  const u = [0, 0, 0];
  for (let i = 0; i < s.n; i++) {
    total += s.gm[i];
    for (let k = 0; k < 3; k++) {
      r[k] += s.gm[i] * s.x[3 * i + k];
      u[k] += s.gm[i] * s.v[3 * i + k];
    }
  }
  if (total === 0) return s;
  for (let i = 0; i < s.n; i++) {
    for (let k = 0; k < 3; k++) {
      s.x[3 * i + k] -= r[k] / total;
      s.v[3 * i + k] -= u[k] / total;
    }
  }
  return s;
}
