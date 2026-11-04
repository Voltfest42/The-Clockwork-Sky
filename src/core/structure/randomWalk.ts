import { C } from '../constants';
import { Random } from '../random';

/**
 * A photon's random walk (Figure 21.1). Inside a star, light goes a short way
 * (its mean free path ℓ = 1/κρ) before it is absorbed and given out again in a
 * random direction. After N steps it has wandered about √N steps from where it
 * started, so crossing a distance R takes about (R/ℓ)² steps. Strictly it is the
 * energy that diffuses, handed from one photon to the next.
 */

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** A direction picked evenly over the sphere. */
function direction(rng: Random): Point3 {
  const z = 2 * rng.next() - 1;
  const phi = 2 * Math.PI * rng.next();
  const s = Math.sqrt(1 - z * z);
  return { x: s * Math.cos(phi), y: s * Math.sin(phi), z };
}

/** A walk of `steps` unit steps in random directions from the origin, seeded: every point, the start included. */
export function randomWalk(steps: number, seed: number): Point3[] {
  const rng = new Random(seed);
  const out: Point3[] = [{ x: 0, y: 0, z: 0 }];
  let p = out[0];
  for (let k = 0; k < steps; k++) {
    const d = direction(rng);
    p = { x: p.x + d.x, y: p.y + d.y, z: p.z + d.z };
    out.push(p);
  }
  return out;
}

/**
 * The root-mean-square distance from the start after each number of steps in
 * `checkpoints`, over `walkers` seeded walks of unit steps: close to √N.
 */
export function rmsDistances(walkers: number, checkpoints: readonly number[], seed: number): number[] {
  const rng = new Random(seed);
  const last = Math.max(...checkpoints);
  const sums = checkpoints.map(() => 0);
  for (let w = 0; w < walkers; w++) {
    let x = 0;
    let y = 0;
    let z = 0;
    let c = 0;
    for (let k = 1; k <= last; k++) {
      const d = direction(rng);
      x += d.x;
      y += d.y;
      z += d.z;
      while (c < checkpoints.length && checkpoints[c] === k) {
        sums[c] += x * x + y * y + z * z;
        c++;
      }
    }
  }
  return sums.map((s) => Math.sqrt(s / walkers));
}

/**
 * Steps a walker takes to climb out of a slab `depth` steps thick, starting at
 * its floor, which sends it back up (as deeper gas would). Only the up-and-down
 * part of each step counts, a third of its square on average, so it takes
 * about 3 × depth² steps. Gives up after `limit` steps and returns the limit.
 */
export function stepsToEscape(depth: number, seed: number, limit = 1e7): number {
  const rng = new Random(seed);
  let z = 0;
  for (let k = 1; k <= limit; k++) {
    z += 2 * rng.next() - 1; // the step's upward part, for a direction even over the sphere
    if (z < 0) z = -z;
    if (z >= depth) return k;
  }
  return limit;
}

/** A shell of a star, for the escape time: r (m), opacity (m²/kg) and density (kg/m³). */
export interface DiffusionShell {
  r: number;
  kappa: number;
  rho: number;
}

/**
 * How long light takes to random-walk from the centre out to radius `rOut` (m),
 * s: the mean time to first reach r for diffusion out of a sphere whose
 * diffusion coefficient D = ℓc/3 changes with depth, t = ∫ r dr / (ℓ c) =
 * (1/c) ∫ κρ r dr, added up shell by shell (the trapezium rule). For a constant
 * ℓ it is R²/2ℓc. Also gives the running total at each shell.
 */
export function diffusionTime(shells: readonly DiffusionShell[], rOut: number): { total: number; running: number[] } {
  let total = 0;
  const running = [0];
  for (let k = 1; k < shells.length; k++) {
    const a = shells[k - 1];
    const b = shells[k];
    if (a.r >= rOut) {
      running.push(total);
      continue;
    }
    const top = Math.min(b.r, rOut);
    const f = b.r - a.r > 0 ? (top - a.r) / (b.r - a.r) : 0;
    const fb = a.kappa * a.rho * a.r + f * (b.kappa * b.rho * b.r - a.kappa * a.rho * a.r);
    total += (0.5 * (a.kappa * a.rho * a.r + fb) * (top - a.r)) / C;
    running.push(total);
  }
  return { total, running };
}
