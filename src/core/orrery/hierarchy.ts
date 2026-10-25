import { elementsFromState, type OrbitState } from '../orbits/elements';
import type { Vec3 } from '../math/vec3';

/**
 * Who orbits whom: for each body, the body it goes round (its parent), and
 * its orbit about it. A moon's parent is its planet, a planet's is its star,
 * and the heaviest body has none.
 *
 * A body's parent is the smallest of the heavier bodies whose Hill sphere it
 * is inside and to which it is bound; the heaviest body's sphere reaches out
 * for ever. Its orbit is measured about the centre of mass of the parent and
 * of the parent's other children that are closer in (Jacobi's way), so a
 * planet round a pair of stars has a steady orbit about both.
 *
 * Units are the system's: G·m in L³/T², positions in L, velocities in L/T.
 */

export interface Parentage {
  /** Index of each body's parent, or −1 for the heaviest body. A body bound to nothing smaller counts as the heaviest's. */
  parent: Int32Array;
  /** Each body's orbit about its parent (null for the heaviest). */
  orbits: (OrbitState | null)[];
  /** The heaviest body. */
  root: number;
  /** Each body's Hill radius about its parent, L (Infinity for the heaviest). */
  hill: Float64Array;
}

export function parentage(gm: Float64Array, x: Float64Array, v: Float64Array): Parentage {
  const n = gm.length;
  const byMass = Array.from({ length: n }, (_, i) => i).sort((i, j) => gm[j] - gm[i] || i - j);
  const root = byMass[0];
  const parent = new Int32Array(n).fill(-1);
  const hill = new Float64Array(n).fill(Infinity);
  const orbits: (OrbitState | null)[] = new Array(n).fill(null);
  const placed: number[] = [root];
  const dist = (i: number, j: number) => Math.hypot(x[3 * i] - x[3 * j], x[3 * i + 1] - x[3 * j + 1], x[3 * i + 2] - x[3 * j + 2]);

  for (const i of byMass.slice(1)) {
    let best = root;
    for (const j of placed) {
      if (j === root || gm[j] <= 0 || gm[j] < gm[i]) continue;
      if (dist(i, j) >= hill[j] || hill[j] >= hill[best]) continue;
      const mu = gm[i] + gm[j];
      const dv = Math.hypot(v[3 * i] - v[3 * j], v[3 * i + 1] - v[3 * j + 1], v[3 * i + 2] - v[3 * j + 2]);
      if ((dv * dv) / 2 - mu / dist(i, j) < 0) best = j;
    }
    parent[i] = best;
    placed.push(i);
    const orbit = orbitAbout(gm, x, v, i, best, parent);
    orbits[i] = orbit;
    hill[i] = gm[i] > 0 && orbit.a > 0 ? orbit.r * Math.cbrt(gm[i] / (3 * gm[best])) : 0;
  }
  return { parent, orbits, root, hill };
}

/**
 * Body i's orbit about body p together with p's children that are closer to
 * p than i is (from `parent`, as far as it is filled in).
 */
function orbitAbout(gm: Float64Array, x: Float64Array, v: Float64Array, i: number, p: number, parent: Int32Array): OrbitState {
  const ri = Math.hypot(x[3 * i] - x[3 * p], x[3 * i + 1] - x[3 * p + 1], x[3 * i + 2] - x[3 * p + 2]);
  let m = gm[p];
  const c = [gm[p] * x[3 * p], gm[p] * x[3 * p + 1], gm[p] * x[3 * p + 2]];
  const u = [gm[p] * v[3 * p], gm[p] * v[3 * p + 1], gm[p] * v[3 * p + 2]];
  for (let k = 0; k < gm.length; k++) {
    if (k === i || parent[k] !== p || gm[k] <= 0) continue;
    const rk = Math.hypot(x[3 * k] - x[3 * p], x[3 * k + 1] - x[3 * p + 1], x[3 * k + 2] - x[3 * p + 2]);
    if (rk >= ri) continue;
    m += gm[k];
    for (let q = 0; q < 3; q++) {
      c[q] += gm[k] * x[3 * k + q];
      u[q] += gm[k] * v[3 * k + q];
    }
  }
  const r: Vec3 = [x[3 * i] - c[0] / m, x[3 * i + 1] - c[1] / m, x[3 * i + 2] - c[2] / m];
  const w: Vec3 = [v[3 * i] - u[0] / m, v[3 * i + 1] - u[1] / m, v[3 * i + 2] - u[2] / m];
  return elementsFromState(m + gm[i], r, w);
}

/** Whether the system is planetary: one body at least ten times heavier than all the rest together, and every other body going round it directly. */
export function isPlanetary(gm: Float64Array, p: Parentage): boolean {
  let others = 0;
  for (let i = 0; i < gm.length; i++) if (i !== p.root) others += gm[i];
  if (gm[p.root] < 10 * others) return false;
  for (let i = 0; i < gm.length; i++) if (i !== p.root && p.parent[i] !== p.root) return false;
  return true;
}
