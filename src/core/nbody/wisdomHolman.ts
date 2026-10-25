import type { Acceleration, StepStage } from '../integrate/steppers';
import { keplerDrift } from './keplerDrift';

/**
 * The Wisdom–Holman integrator (Wisdom & Holman 1991), in the style of
 * WHFast (Rein & Tamayo 2015): for planetary systems with one body far heavier
 * than the rest.
 *
 * Leapfrog splits the motion into "coast in a straight line" and "kick by
 * gravity". Wisdom–Holman splits it differently: each planet coasts along its
 * exact Kepler orbit about the star, and the kicks carry only the small pulls
 * of the planets on each other. Those pulls are thousands of times weaker than
 * the star's, so the error is thousands of times smaller than leapfrog's for
 * the same step, and like leapfrog the energy error stays bounded.
 *
 * It works in Jacobi coordinates: each body is placed relative to the centre
 * of mass of all the bodies inside it (body 0 is the star), and its Kepler
 * orbit is about their total mass. Bodies must come in order: the star first,
 * then outward. The state goes in and out in the system's own frame;
 * the Jacobi coordinates live only inside a step.
 *
 * Units are the system's (see system.ts): G·m in L³/T², positions in L,
 * velocities in L/T, steps in T.
 */

export interface WisdomHolman {
  /** Advances x and v (in place, inertial frame) by dt, kick–drift–kick. */
  step(x: Float64Array, v: Float64Array, dt: number, emit?: (stage: StepStage) => void): void;
  invalidate(): void;
  readonly evaluations: number;
}

/**
 * A Wisdom–Holman stepper for bodies with gravitational parameters `gm`,
 * taken in the order given by `order` (indices into the system: the star
 * first, then outward). `acceleration` is the full Newtonian gravity of the
 * system (see system.ts).
 */
export function createWisdomHolman(gm: Float64Array, acceleration: Acceleration, order?: readonly number[]): WisdomHolman {
  const n = gm.length;
  const ord = order ? Int32Array.from(order) : Int32Array.from({ length: n }, (_, i) => i);
  if (ord.length !== n || new Set(ord).size !== n) throw new Error('The Jacobi order must list every body once.');
  const size = 3 * n;
  // eta[k]: total G·m of the first k + 1 bodies in Jacobi order.
  const eta = new Float64Array(n);
  let sum = 0;
  for (let k = 0; k < n; k++) {
    sum += gm[ord[k]];
    eta[k] = sum;
  }
  if (!(eta[0] > 0)) throw new Error('The central body needs a mass.');
  const a = new Float64Array(size);
  const xj = new Float64Array(size);
  const vj = new Float64Array(size);
  let fresh = false;
  let evaluations = 0;

  /** Inertial → Jacobi, positions or velocities (src indexed by body, dst by Jacobi rank). */
  const toJacobi = (src: Float64Array, dst: Float64Array) => {
    const b0 = 3 * ord[0];
    let rx = gm[ord[0]] * src[b0];
    let ry = gm[ord[0]] * src[b0 + 1];
    let rz = gm[ord[0]] * src[b0 + 2];
    for (let k = 1; k < n; k++) {
      const b = 3 * ord[k];
      const e = eta[k - 1];
      dst[3 * k] = src[b] - rx / e;
      dst[3 * k + 1] = src[b + 1] - ry / e;
      dst[3 * k + 2] = src[b + 2] - rz / e;
      const m = gm[ord[k]];
      rx += m * src[b];
      ry += m * src[b + 1];
      rz += m * src[b + 2];
    }
    const e = eta[n - 1];
    dst[0] = rx / e;
    dst[1] = ry / e;
    dst[2] = rz / e;
  };

  /** Jacobi → inertial. */
  const fromJacobi = (src: Float64Array, dst: Float64Array) => {
    // C: the centre of mass of the first k + 1 bodies, from the outside in.
    let cx = src[0];
    let cy = src[1];
    let cz = src[2];
    for (let k = n - 1; k >= 1; k--) {
      const f = gm[ord[k]] / eta[k];
      cx -= f * src[3 * k];
      cy -= f * src[3 * k + 1];
      cz -= f * src[3 * k + 2];
      const b = 3 * ord[k];
      dst[b] = cx + src[3 * k];
      dst[b + 1] = cy + src[3 * k + 1];
      dst[b + 2] = cz + src[3 * k + 2];
    }
    const b0 = 3 * ord[0];
    dst[b0] = cx;
    dst[b0 + 1] = cy;
    dst[b0 + 2] = cz;
  };

  /**
   * The interaction kick on the Jacobi velocities: the full pull in Jacobi
   * coordinates (each body's acceleration minus the mean acceleration of the
   * bodies inside it) minus the Kepler pull already taken care of by the drift.
   */
  const kick = (h: number) => {
    const b0 = 3 * ord[0];
    let ax = gm[ord[0]] * a[b0];
    let ay = gm[ord[0]] * a[b0 + 1];
    let az = gm[ord[0]] * a[b0 + 2];
    for (let k = 1; k < n; k++) {
      const b = 3 * ord[k];
      const e = eta[k - 1];
      const px = xj[3 * k];
      const py = xj[3 * k + 1];
      const pz = xj[3 * k + 2];
      const r2 = px * px + py * py + pz * pz;
      const kepler = eta[k] / (r2 * Math.sqrt(r2));
      vj[3 * k] += h * (a[b] - ax / e + kepler * px);
      vj[3 * k + 1] += h * (a[b + 1] - ay / e + kepler * py);
      vj[3 * k + 2] += h * (a[b + 2] - az / e + kepler * pz);
      const m = gm[ord[k]];
      ax += m * a[b];
      ay += m * a[b + 1];
      az += m * a[b + 2];
    }
  };

  return {
    get evaluations() {
      return evaluations;
    },
    invalidate() {
      fresh = false;
    },
    step(x, v, dt, emit) {
      if (!fresh) {
        acceleration(x, a);
        evaluations++;
      }
      toJacobi(x, xj);
      toJacobi(v, vj);
      kick(dt / 2);
      if (emit) {
        fromJacobi(vj, v);
        emit({ kind: 'kick', x: Float64Array.from(x), v: Float64Array.from(v) });
      }
      // Drift: the centre of mass in a straight line, every other body along its Kepler orbit.
      for (let k = 0; k < 3; k++) xj[k] += vj[k] * dt;
      for (let k = 1; k < n; k++) keplerDrift(eta[k], xj, vj, 3 * k, dt);
      fromJacobi(xj, x);
      if (emit) {
        fromJacobi(vj, v);
        emit({ kind: 'drift', x: Float64Array.from(x), v: Float64Array.from(v) });
      }
      acceleration(x, a);
      evaluations++;
      fresh = true;
      kick(dt / 2);
      fromJacobi(vj, v);
      emit?.({ kind: 'kick', x: Float64Array.from(x), v: Float64Array.from(v) });
    },
  };
}

/**
 * An order for Jacobi coordinates: the heaviest body first, then the rest by
 * distance from it, nearest first. Positions in L.
 */
export function jacobiOrder(gm: Float64Array, x: Float64Array): number[] {
  const n = gm.length;
  let root = 0;
  for (let i = 1; i < n; i++) if (gm[i] > gm[root]) root = i;
  const d = (i: number) => Math.hypot(x[3 * i] - x[3 * root], x[3 * i + 1] - x[3 * root + 1], x[3 * i + 2] - x[3 * root + 2]);
  const rest = Array.from({ length: n }, (_, i) => i).filter((i) => i !== root);
  rest.sort((i, j) => d(i) - d(j));
  return [root, ...rest];
}
