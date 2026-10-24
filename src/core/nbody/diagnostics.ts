import type { NBodySystem, Vec } from './system';

/**
 * What an exact solution would keep fixed: the total energy, the total
 * angular momentum and the total momentum. A numerical integrator's drift in
 * them is its error, which is how the figures and the Orrery report accuracy.
 *
 * The engine knows each body's G·m rather than its mass, so these are the
 * true quantities times G (energy in L⁵/T⁴, angular momentum in L⁵/T³); only
 * their changes matter. Test particles (G·m = 0) carry none.
 */

/** G × the total energy: kinetic, ½ G·m v² for each body, plus potential, −G·mᵢ G·mⱼ / r for each pair. */
export function energy(s: NBodySystem): number {
  let e = 0;
  for (let i = 0; i < s.n; i++) {
    if (s.gm[i] === 0) continue;
    const vx = s.v[3 * i];
    const vy = s.v[3 * i + 1];
    const vz = s.v[3 * i + 2];
    e += 0.5 * s.gm[i] * (vx * vx + vy * vy + vz * vz);
    for (let j = i + 1; j < s.n; j++) {
      if (s.gm[j] === 0) continue;
      const dx = s.x[3 * j] - s.x[3 * i];
      const dy = s.x[3 * j + 1] - s.x[3 * i + 1];
      const dz = s.x[3 * j + 2] - s.x[3 * i + 2];
      e -= (s.gm[i] * s.gm[j]) / Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  return e;
}

/** G × the total angular momentum about the origin: the sum of G·m (r × v). */
export function angularMomentum(s: NBodySystem): Vec {
  let lx = 0;
  let ly = 0;
  let lz = 0;
  for (let i = 0; i < s.n; i++) {
    const m = s.gm[i];
    const [x, y, z] = [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]];
    const [vx, vy, vz] = [s.v[3 * i], s.v[3 * i + 1], s.v[3 * i + 2]];
    lx += m * (y * vz - z * vy);
    ly += m * (z * vx - x * vz);
    lz += m * (x * vy - y * vx);
  }
  return [lx, ly, lz];
}

/** G × the total momentum: the sum of G·m v. */
export function momentum(s: NBodySystem): Vec {
  const p = [0, 0, 0];
  for (let i = 0; i < s.n; i++) for (let k = 0; k < 3; k++) p[k] += s.gm[i] * s.v[3 * i + k];
  return [p[0], p[1], p[2]];
}

/** The energy and angular momentum at the start, to measure drift against. */
export interface Reference {
  energy: number;
  angularMomentum: Vec;
}

export function reference(s: NBodySystem): Reference {
  return { energy: energy(s), angularMomentum: angularMomentum(s) };
}

/** How far the energy has drifted, as a fraction of the starting energy (signed: positive means more energy than at the start). */
export function energyError(s: NBodySystem, ref: Reference): number {
  return (energy(s) - ref.energy) / Math.abs(ref.energy || 1);
}

/** How far the angular momentum has drifted, as the length of the change over the starting length. */
export function angularMomentumError(s: NBodySystem, ref: Reference): number {
  const l = angularMomentum(s);
  const l0 = ref.angularMomentum;
  const d = Math.hypot(l[0] - l0[0], l[1] - l0[1], l[2] - l0[2]);
  return d / (Math.hypot(l0[0], l0[1], l0[2]) || 1);
}

/**
 * The orbit of body i about body j, from their positions and velocities
 * (the two-body problem's exact answer): semi-major axis (L; negative when
 * unbound), eccentricity, and specific energy (L²/T²).
 */
export function relativeOrbit(s: NBodySystem, i: number, j: number): { a: number; e: number; energy: number; r: number; speed: number } {
  const mu = s.gm[i] + s.gm[j];
  const r = [0, 1, 2].map((k) => s.x[3 * i + k] - s.x[3 * j + k]);
  const v = [0, 1, 2].map((k) => s.v[3 * i + k] - s.v[3 * j + k]);
  const rr = Math.hypot(r[0], r[1], r[2]);
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const eps = v2 / 2 - mu / rr;
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]];
  const h2 = h[0] * h[0] + h[1] * h[1] + h[2] * h[2];
  const e = Math.sqrt(Math.max(0, 1 + (2 * eps * h2) / (mu * mu)));
  return { a: -mu / (2 * eps), e, energy: eps, r: rr, speed: Math.sqrt(v2) };
}
