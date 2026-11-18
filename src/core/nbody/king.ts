import { erf } from '../math/erf';
import type { Random } from '../random';
import { solveAdaptive } from '../structure/ode';
import { G_CLUSTER, toCentreOfMass, type Stars } from './cluster';

/**
 * King (1966) models, for the Orrery's star clusters: a lowered isothermal
 * sphere, the usual model of a globular or old open cluster. Its stars move
 * as in an isothermal gas of dispersion σ, but with the fastest left out:
 * f(E) ∝ exp(−E/σ²) − 1 for bound stars and nothing beyond, so the cluster
 * has an edge, its tidal radius r_t, where the potential reaches the escape
 * energy. One number sets its shape: W₀, the central potential's depth in
 * units of σ². Deep models (W₀ ≈ 9) have a dense core and a wide halo; shallow
 * ones (W₀ ≈ 3) are nearly uniform. Concentration c = log₁₀(r_t / r₀), with
 * r₀ King's core scale.
 *
 * In King's units (r₀ = √(9σ² / 4πGρ₀), velocities in σ) Poisson's equation
 * is W″ + 2W′/x = −9 ρ̃(W)/ρ̃(W₀), with
 * ρ̃(W) = e^W erf(√W) − √(4W/π)(1 + 2W/3) (Binney & Tremaine 2008, §4.3.3).
 *
 * Units: pc, Myr, M☉ at the edges (as cluster.ts).
 */

/** King's density for a depth W = Ψ/σ², up to a constant factor. */
export function kingDensity(W: number): number {
  if (!(W > 0)) return 0;
  if (W < 0.02) {
    // The two terms cancel for shallow W: (8 / 15√π) W^(5/2) (1 + 2W/7 + …).
    return (8 / (15 * Math.sqrt(Math.PI))) * W ** 2.5 * (1 + (2 * W) / 7);
  }
  return Math.exp(W) * erf(Math.sqrt(W)) - Math.sqrt((4 * W) / Math.PI) * (1 + (2 * W) / 3);
}

export interface KingProfile {
  w0: number;
  /** Radii (x, in r₀), depths W and the share of the mass inside, from the centre to the tidal radius. */
  x: Float64Array;
  W: Float64Array;
  mass: Float64Array;
  /** The tidal radius, in r₀, and the concentration log₁₀(r_t / r₀). */
  tidal: number;
  concentration: number;
  /** The half-mass radius, in r₀. */
  halfMass: number;
  /** The total mass in units of ρ₀ r₀³: μ = −(4π/9) x_t² W′(x_t). */
  mu: number;
}

/** Solves Poisson's equation for a King model of depth W₀, from the centre out to the tidal radius. */
export function kingProfile(w0: number): KingProfile {
  if (!(w0 > 0 && w0 <= 16)) throw new Error('W₀ must be between 0 and 16.');
  const rho0 = kingDensity(w0);
  const x0 = 1e-4;
  const result = solveAdaptive(
    (x, y, out) => {
      out[0] = y[1];
      out[1] = (-9 * kingDensity(y[0])) / rho0 - (2 * y[1]) / x;
    },
    x0,
    [w0 - 1.5 * x0 * x0, -3 * x0],
    1e5,
    { rtol: 1e-10, atol: 1e-13, h0: 1e-4, stop: (_x, y) => y[0] <= 0 },
  );
  const steps = result.steps;
  const last = steps[steps.length - 1];
  const prev = steps[steps.length - 2];
  // The edge, where W reaches zero, between the last two steps (linearly in W).
  const f = prev.y[0] / (prev.y[0] - last.y[0]);
  const tidal = prev.x + f * (last.x - prev.x);
  const slopeEdge = prev.y[1] + f * (last.y[1] - prev.y[1]);
  const kept = steps.slice(0, -1);
  const n = kept.length + 2;
  const x = new Float64Array(n);
  const W = new Float64Array(n);
  const mass = new Float64Array(n);
  const total = -(tidal * tidal * slopeEdge);
  x[0] = 0;
  W[0] = w0;
  mass[0] = 0;
  kept.forEach((s, k) => {
    x[k + 1] = s.x;
    W[k + 1] = s.y[0];
    mass[k + 1] = (-(s.x * s.x) * s.y[1]) / total;
  });
  x[n - 1] = tidal;
  W[n - 1] = 0;
  mass[n - 1] = 1;
  let halfMass = tidal;
  for (let k = 1; k < n; k++) {
    if (mass[k] >= 0.5) {
      halfMass = x[k - 1] + ((0.5 - mass[k - 1]) / (mass[k] - mass[k - 1])) * (x[k] - x[k - 1]);
      break;
    }
  }
  return { w0, x, W, mass, tidal, concentration: Math.log10(tidal), halfMass, mu: ((4 * Math.PI) / 9) * total };
}

/** How a King sphere is sized: by its half-mass radius, or by its tidal radius (a cluster that fills its Jacobi radius), pc. */
export type KingSize = { halfMass: number } | { tidal: number };

/**
 * A King sphere of n stars with these masses (M☉), sampled from the model:
 * each radius from the mass inside it, each speed from the distribution
 * function there, v² (e^(W − v²/2) − 1) up to the escape speed √(2W) σ, by
 * rejection, in random directions; then moved to rest at the origin.
 * Positions pc, velocities pc/Myr.
 */
export function kingSphere(masses: Float64Array, w0: number, size: KingSize, random: Random): Stars & { profile: KingProfile; r0: number; sigma: number } {
  const profile = kingProfile(w0);
  const n = masses.length;
  const total = masses.reduce((s, m) => s + m, 0);
  const r0 = 'halfMass' in size ? size.halfMass / profile.halfMass : size.tidal / profile.tidal;
  // M = 9σ² r₀ μ / (4πG), so σ² = 4πGM / (9 r₀ μ).
  const sigma = Math.sqrt((4 * Math.PI * G_CLUSTER * total) / (9 * r0 * profile.mu));
  const x = new Float64Array(3 * n);
  const v = new Float64Array(3 * n);
  const { x: px, W: pW, mass: pm } = profile;
  const isotropic = (r: number, out: Float64Array, at: number) => {
    const z = random.uniform(-1, 1);
    const phi = random.uniform(0, 2 * Math.PI);
    const s = Math.sqrt(1 - z * z);
    out[at] = r * s * Math.cos(phi);
    out[at + 1] = r * s * Math.sin(phi);
    out[at + 2] = r * z;
  };
  for (let i = 0; i < n; i++) {
    // The radius holding a random share of the mass, and the depth there.
    const u = random.uniform(1e-9, 1 - 1e-9);
    let lo = 0;
    let hi = pm.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pm[mid] <= u) lo = mid;
      else hi = mid;
    }
    const f = (u - pm[lo]) / (pm[hi] - pm[lo] || 1);
    const xr = px[lo] + f * (px[hi] - px[lo]);
    const W = Math.max(0, pW[lo] + f * (pW[hi] - pW[lo]));
    isotropic(xr * r0, x, 3 * i);
    // The speed, in σ, by rejection under the distribution's peak.
    const vMax = Math.sqrt(2 * W);
    let peak = 0;
    for (let k = 1; k <= 64; k++) {
      const s = (k / 64) * vMax;
      peak = Math.max(peak, s * s * (Math.exp(W - (s * s) / 2) - 1));
    }
    let speed = 0;
    if (vMax > 0) {
      for (let tries = 0; tries < 10_000; tries++) {
        const s = random.uniform(0, vMax);
        if (random.uniform(0, 1.05 * peak) <= s * s * (Math.exp(W - (s * s) / 2) - 1)) {
          speed = s;
          break;
        }
      }
    }
    isotropic(speed * sigma, v, 3 * i);
  }
  const mass = Float64Array.from(masses);
  toCentreOfMass(mass, x, v);
  return { mass, x, v, profile, r0, sigma };
}
