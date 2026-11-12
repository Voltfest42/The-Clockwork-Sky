import { slowerShare } from '../math/erf';
import type { Vec3 } from '../math/vec3';
import { KMS_KPC } from '../nbody/restricted';
import { hash32, Random } from '../random';
import { G_GALAXY } from './rotation';

/**
 * Will the Milky Way and Andromeda collide? (Chapter 31, Figure 31.2.) The
 * Local Group's big galaxies as extended dark halos that pull on each other
 * and drag through each other's halos, with their measured masses, distances
 * and motions sampled within their uncertainties: Sawala et al.'s (2025,
 * Nature Astronomy 9, 1206) method, from their paper and public code
 * (github.com/TillSawala/MW-M31), which Wu et al. (2026) reused.
 *
 * - Each galaxy is an NFW halo of mass M₂₀₀ (the mass inside the radius
 *   where the mean density is 200 times the critical density, here for
 *   Planck 2018's H₀ = 67.66 km/s/Mpc) and concentration c.
 * - They pull on each other as points softened over 20 kpc.
 * - Dynamical friction (Chandrasekhar's formula) acts on the lighter of each
 *   pair while it is inside the heavier one's r₂₀₀, with the heavier halo's
 *   density and velocity dispersion (Zentner & Bullock 2003's fit) and a
 *   Coulomb logarithm ln(r/ε), ε set by the lighter halo's scale radius
 *   (Jethwa et al. 2016); the force is shared between the two in proportion
 *   to the other's mass, so momentum is kept.
 * - Leapfrog with steps of 1 Myr, in the frame of the centre of mass, for
 *   10 billion years; two galaxies closer than 20 kpc merge, adding their
 *   masses and momenta.
 *
 * Where this differs from their code: time is in true millions of years (their
 * code's unit of kpc/(km/s) is 0.978 of one), a merged halo is rebuilt for its
 * new mass, and the Coulomb logarithm is never allowed below zero (their ln(r/ε)
 * turns negative, a push, inside ε, which is 30–40 kpc for the Milky Way).
 *
 * Units: kpc, km/s, Myr and M☉.
 */

// ---------- halos ----------

/** The Hubble constant of Planck 2018 (Colossus's "planck18"), km/s/Mpc. */
export const PLANCK18_H0 = 67.66;
/** The critical density for it, M☉/kpc³: 3H₀²/(8πG). */
export const CRITICAL_DENSITY = (3 * (PLANCK18_H0 / 1000) ** 2) / (8 * Math.PI * G_GALAXY);

/** ln(1 + x) − x/(1 + x): an NFW halo's mass inside x scale radii, over 4πρₛrₛ³. */
export function nfwShape(x: number): number {
  return Math.log1p(x) - x / (1 + x);
}

/** Where an NFW halo's circular speed peaks, in scale radii. */
export const NFW_PEAK = 2.16258;

export interface NfwHalo {
  /** M☉. */
  m200: number;
  c: number;
  /** kpc. */
  r200: number;
  rs: number;
  /** The highest circular speed, km/s. */
  vmax: number;
}

export function nfwHalo(m200: number, c: number): NfwHalo {
  const r200 = Math.cbrt((3 * m200) / (4 * Math.PI * 200 * CRITICAL_DENSITY));
  const rs = r200 / c;
  const vmax = Math.sqrt((G_GALAXY * m200 * nfwShape(NFW_PEAK)) / nfwShape(c) / (NFW_PEAK * rs));
  return { m200, c, r200, rs, vmax };
}

/** Density (M☉/kpc³) at r (kpc): M₂₀₀ / (4π g(c) r (r + rₛ)²). */
export function nfwDensity(r: number, h: NfwHalo): number {
  return h.m200 / (4 * Math.PI * nfwShape(h.c) * r * (r + h.rs) ** 2);
}

/** The one-dimensional velocity dispersion (km/s), Zentner & Bullock's (2003) fit: σ = V_max 1.4393 x^0.354 / (1 + 1.1756 x^0.725), x = r/rₛ. */
export function nfwDispersion(r: number, h: NfwHalo): number {
  const x = r / h.rs;
  return (h.vmax * 1.4393 * x ** 0.354) / (1 + 1.1756 * x ** 0.725);
}

/** Jethwa et al.'s (2016) length in the Coulomb logarithm ln(r/ε), from the satellite's scale radius (kpc). */
export function coulombLength(rs: number): number {
  return rs > 8 ? 2.2 * rs - 14 : 0.45 * rs;
}

// ---------- the Galactocentric frame ----------

/** The Sun's place and motion: Astropy's Galactocentric frame (its "v4.0" defaults), as Sawala et al. use. */
export interface SunFrame {
  /** The Galactic Centre's ICRS right ascension and declination, degrees (Reid & Brunthaler 2004). */
  centreRa: number;
  centreDec: number;
  /** The Sun's distance from it, kpc (GRAVITY 2018). */
  distance: number;
  /** The Sun's height above the midplane, kpc (Bennett & Bovy 2019). */
  height: number;
  /** The Sun's velocity in the Galactocentric frame, km/s. */
  velocity: Vec3;
}

/** Astropy's roll of the x–z plane onto the Galactic plane, degrees. */
const ROLL0 = 58.5986320306;

type M3 = number[][];

function mul(a: M3, b: M3): M3 {
  return a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
}

function apply(m: M3, v: readonly number[]): Vec3 {
  return [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
}

/** Astropy's rotation_matrix: a rotation of the axes by `angle` (radians) about x, y or z. */
function axes(angle: number, axis: 0 | 1 | 2): M3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const m = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const a1 = (axis + 1) % 3;
  const a2 = (axis + 2) % 3;
  m[a1][a1] = c;
  m[a1][a2] = s;
  m[a2][a1] = -s;
  m[a2][a2] = c;
  return m;
}

const DEG = Math.PI / 180;
/** km/s for a proper motion of 1 µas/yr at 1 kpc. */
export const KMS_PER_UAS_KPC = 4.740470446e-3;

/**
 * Turns a galaxy's sky position (degrees), distance (kpc), proper motion
 * (µas/yr, μ_α cos δ and μ_δ) and line-of-sight speed (km/s) into a position
 * (kpc) and velocity (km/s) about the Galactic Centre, as Astropy's
 * Galactocentric transformation does: x from the Sun towards the centre, z
 * towards the north Galactic pole, y along the Sun's motion.
 */
export function galactocentric(
  ra: number,
  dec: number,
  distance: number,
  pmRaCosDec: number,
  pmDec: number,
  vlos: number,
  frame: SunFrame,
): { x: Vec3; v: Vec3 } {
  const a = ra * DEG;
  const d = dec * DEG;
  const rhat = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  const ea = [-Math.sin(a), Math.cos(a), 0];
  const ed = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  const k = KMS_PER_UAS_KPC * distance;
  const pos = rhat.map((u) => u * distance);
  const vel = [0, 1, 2].map((i) => vlos * rhat[i] + k * (pmRaCosDec * ea[i] + pmDec * ed[i]));
  const R = mul(axes(ROLL0 * DEG, 0), mul(axes(-frame.centreDec * DEG, 1), axes(frame.centreRa * DEG, 2)));
  const H = axes(-Math.asin(frame.height / frame.distance), 1);
  const A = mul(H, R);
  const offset = apply(H, [frame.distance, 0, 0]);
  const p = apply(A, pos);
  const w = apply(A, vel);
  return {
    x: [p[0] - offset[0], p[1] - offset[1], p[2] - offset[2]],
    v: [w[0] + frame.velocity[0], w[1] + frame.velocity[1], w[2] + frame.velocity[2]],
  };
}

// ---------- the observables and their sampling ----------

export type LocalGroupName = 'MW' | 'M31' | 'M33' | 'LMC';

/** A measured value and its one-sigma uncertainty. */
export type Measured = readonly [value: number, sigma: number];

export interface GalaxyObservables {
  /** M₂₀₀, M☉. */
  mass: Measured;
  c: Measured;
  /** Sky position, degrees (not sampled). */
  ra?: number;
  dec?: number;
  /** Distance modulus, magnitudes. */
  distanceModulus?: Measured;
  /** µas/yr. */
  pmRaCosDec?: Measured;
  pmDec?: Measured;
  /** Heliocentric line-of-sight speed, km/s. */
  vlos?: Measured;
}

export type LocalGroupData = Record<LocalGroupName, GalaxyObservables>;

/**
 * How much of each uncertainty to keep, from 1 (as measured) to 0 (the most
 * likely value only): Andromeda's proper motion, the four masses, and
 * everything else (distances, line-of-sight speeds, the other galaxies'
 * proper motions and the halos' concentrations).
 */
export interface Narrowing {
  m31Motion: number;
  masses: number;
  rest: number;
}

export const AS_MEASURED: Narrowing = { m31Motion: 1, masses: 1, rest: 1 };

/** A standard normal truncated at ±2σ, as Sawala et al. sample. */
function truncatedNormal(random: Random): number {
  for (;;) {
    const z = random.normal();
    if (Math.abs(z) <= 2) return z;
  }
}

export interface SampledGalaxy {
  name: LocalGroupName;
  mass: number;
  c: number;
  x: Vec3;
  v: Vec3;
}

/** The distance (kpc) for a distance modulus. */
export function distanceFromModulus(mu: number): number {
  return 10 ** (mu / 5 + 1) / 1000;
}

/**
 * Draws one possible present for the Local Group: every observable from a
 * Gaussian truncated at ±2σ, in a fixed order from a stream seeded by the
 * sample's index, so that the same future keeps its draws when galaxies are
 * left out or uncertainties narrowed (narrowing scales each draw towards the
 * most likely value). The Milky Way sits at the Galactic Centre, at rest.
 */
export function sampleLocalGroup(data: LocalGroupData, frame: SunFrame, seed: number, index: number, narrowing: Narrowing = AS_MEASURED): SampledGalaxy[] {
  const random = new Random(hash32(seed * 0x9e3779b1 + index) ^ index);
  const draw = (m: Measured, keep: number) => m[0] + truncatedNormal(random) * m[1] * keep;
  const out: SampledGalaxy[] = [];
  for (const name of ['MW', 'M31', 'M33', 'LMC'] as const) {
    const g = data[name];
    const mass = draw(g.mass, narrowing.masses);
    const c = draw(g.c, narrowing.rest);
    if (name === 'MW') {
      out.push({ name, mass, c, x: [0, 0, 0], v: [0, 0, 0] });
      continue;
    }
    const motion = name === 'M31' ? narrowing.m31Motion : narrowing.rest;
    const mu = draw(g.distanceModulus!, narrowing.rest);
    const pmRa = draw(g.pmRaCosDec!, motion);
    const pmDec = draw(g.pmDec!, motion);
    const vlos = draw(g.vlos!, narrowing.rest);
    const { x, v } = galactocentric(g.ra!, g.dec!, distanceFromModulus(mu), pmRa, pmDec, vlos, frame);
    out.push({ name, mass, c, x, v });
  }
  return out;
}

/** The galaxies at their most likely values. */
export function mostLikelyLocalGroup(data: LocalGroupData, frame: SunFrame): SampledGalaxy[] {
  return sampleLocalGroup(data, frame, 1, 0, { m31Motion: 0, masses: 0, rest: 0 });
}

// ---------- integrating a future ----------

export interface FutureOptions {
  /** Myr (default 10,000). */
  duration?: number;
  /** Myr (default 1). */
  dt?: number;
  /** kpc (default 20). */
  softening?: number;
  /** Two galaxies closer than this merge, kpc (default 20). */
  mergeDistance?: number;
  /** Dynamical friction (default on). */
  friction?: boolean;
  /** Record the Milky Way–Andromeda distance and path every this many Myr (0: don't). */
  recordEvery?: number;
}

export interface LocalGroupFuture {
  /** When the Milky Way and Andromeda merge, Myr from now, or null if not within the run. */
  merger: number | null;
  /** Their closest approach before merging, kpc. */
  closest: number;
  /** When each other galaxy merged, and into which. */
  satellites: { name: LocalGroupName; into: LocalGroupName; at: number }[];
  /** The Milky Way–Andromeda distance (kpc) every `recordEvery` Myr from now, to the merger or the end. */
  distances: Float32Array;
  /**
   * Andromeda's path about the Milky Way (kpc), in the plane of their orbit
   * today: x along the line between them now, y along Andromeda's sideways
   * motion, z out of the plane; x₀, y₀, z₀, x₁, … at the same times.
   */
  path: Float32Array;
}

/**
 * Follows one possible present of the Local Group for ten billion years,
 * as described at the top of this file.
 */
export function integrateLocalGroup(galaxies: readonly SampledGalaxy[], options: FutureOptions = {}): LocalGroupFuture {
  const duration = options.duration ?? 10_000;
  const dt = options.dt ?? 1;
  const eps2 = (options.softening ?? 20) ** 2;
  const mergeDistance = options.mergeDistance ?? 20;
  const friction = options.friction ?? true;
  const recordEvery = options.recordEvery ?? 0;
  const n = galaxies.length;
  const mass = Float64Array.from(galaxies, (g) => g.mass);
  const c = galaxies.map((g) => g.c);
  const halos = galaxies.map((g) => nfwHalo(g.mass, g.c));
  const x = new Float64Array(3 * n);
  const v = new Float64Array(3 * n);
  galaxies.forEach((g, i) => {
    x.set(g.x, 3 * i);
    v.set(g.v, 3 * i);
  });
  // The centre of mass at rest
  const total = mass.reduce((s, m) => s + m, 0);
  for (let a = 0; a < 3; a++) {
    let p = 0;
    for (let i = 0; i < n; i++) p += mass[i] * v[3 * i + a];
    for (let i = 0; i < n; i++) v[3 * i + a] -= p / total;
  }
  const alive = new Array<boolean>(n).fill(true);
  /** Which body each galaxy is now part of. */
  const body = galaxies.map((_, i) => i);
  const mw = galaxies.findIndex((g) => g.name === 'MW');
  const m31 = galaxies.findIndex((g) => g.name === 'M31');
  const acc = new Float64Array(3 * n);

  // The orbital plane of the Milky Way and Andromeda now
  const basis = orbitBasis(x, v, mw, m31);
  const records = recordEvery > 0 ? Math.floor(duration / recordEvery) + 1 : 0;
  const distances = new Float32Array(records).fill(Number.NaN);
  const path = new Float32Array(3 * records).fill(Number.NaN);
  const record = (k: number) => {
    const d = [x[3 * m31] - x[3 * mw], x[3 * m31 + 1] - x[3 * mw + 1], x[3 * m31 + 2] - x[3 * mw + 2]];
    distances[k] = Math.hypot(d[0], d[1], d[2]);
    for (let a = 0; a < 3; a++) path[3 * k + a] = d[0] * basis[a][0] + d[1] * basis[a][1] + d[2] * basis[a][2];
  };

  const accelerations = () => {
    acc.fill(0);
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (!alive[j]) continue;
        const dx = x[3 * j] - x[3 * i];
        const dy = x[3 * j + 1] - x[3 * i + 1];
        const dz = x[3 * j + 2] - x[3 * i + 2];
        const s = dx * dx + dy * dy + dz * dz + eps2;
        const f = G_GALAXY / (s * Math.sqrt(s));
        acc[3 * i] += f * mass[j] * dx;
        acc[3 * i + 1] += f * mass[j] * dy;
        acc[3 * i + 2] += f * mass[j] * dz;
        acc[3 * j] -= f * mass[i] * dx;
        acc[3 * j + 1] -= f * mass[i] * dy;
        acc[3 * j + 2] -= f * mass[i] * dz;
      }
    }
    if (!friction) return;
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      for (let j = 0; j < n; j++) {
        // i the satellite, j the heavier host
        if (i === j || !alive[j] || !(mass[j] > mass[i])) continue;
        const dx = x[3 * i] - x[3 * j];
        const dy = x[3 * i + 1] - x[3 * j + 1];
        const dz = x[3 * i + 2] - x[3 * j + 2];
        const r = Math.max(10, Math.hypot(dx, dy, dz));
        const host = halos[j];
        if (r >= host.r200) continue;
        const ux = v[3 * i] - v[3 * j];
        const uy = v[3 * i + 1] - v[3 * j + 1];
        const uz = v[3 * i + 2] - v[3 * j + 2];
        const u = Math.hypot(ux, uy, uz);
        const lnLambda = Math.log(r / coulombLength(halos[i].rs));
        if (lnLambda <= 0) continue;
        const sigma = nfwDispersion(r, host);
        const F = slowerShare(u / (Math.SQRT2 * sigma));
        const k = (4 * Math.PI * G_GALAXY * G_GALAXY * lnLambda * mass[i] * nfwDensity(r, host) * F) / Math.max(u, 5) ** 3;
        const shareI = mass[j] / (mass[i] + mass[j]);
        const shareJ = mass[i] / (mass[i] + mass[j]);
        acc[3 * i] -= ux * k * shareI;
        acc[3 * i + 1] -= uy * k * shareI;
        acc[3 * i + 2] -= uz * k * shareI;
        acc[3 * j] += ux * k * shareJ;
        acc[3 * j + 1] += uy * k * shareJ;
        acc[3 * j + 2] += uz * k * shareJ;
      }
    }
  };

  let merger: number | null = null;
  let closest = Infinity;
  const satellites: LocalGroupFuture['satellites'] = [];
  // Acceleration (km/s)²/kpc times Myr gives km/s after this factor; speed in km/s times Myr gives kpc after it.
  const h = dt * KMS_KPC;
  if (records) record(0);
  accelerations();
  const steps = Math.round(duration / dt);
  for (let step = 1; step <= steps; step++) {
    for (let i = 0; i < 3 * n; i++) v[i] += 0.5 * h * acc[i];
    for (let i = 0; i < 3 * n; i++) x[i] += h * v[i];
    accelerations();
    for (let i = 0; i < 3 * n; i++) v[i] += 0.5 * h * acc[i];
    const t = step * dt;
    // Mergers
    for (let l = n - 1; l >= 0; l--) {
      for (let m = l - 1; m >= 0; m--) {
        if (!alive[l] || !alive[m]) continue;
        const d = Math.hypot(x[3 * l] - x[3 * m], x[3 * l + 1] - x[3 * m + 1], x[3 * l + 2] - x[3 * m + 2]);
        if (d >= mergeDistance) continue;
        const [keep, gone] = mass[l] > mass[m] ? [l, m] : [m, l];
        const sum = mass[keep] + mass[gone];
        for (let a = 0; a < 3; a++) {
          x[3 * keep + a] = (mass[keep] * x[3 * keep + a] + mass[gone] * x[3 * gone + a]) / sum;
          v[3 * keep + a] = (mass[keep] * v[3 * keep + a] + mass[gone] * v[3 * gone + a]) / sum;
        }
        mass[keep] = sum;
        mass[gone] = 0;
        halos[keep] = nfwHalo(sum, c[keep]);
        alive[gone] = false;
        const pair = (body[mw] === gone && body[m31] === keep) || (body[mw] === keep && body[m31] === gone);
        if (pair) merger ??= t;
        else satellites.push({ name: galaxies[gone].name, into: galaxies[keep].name, at: t });
        for (let i = 0; i < n; i++) if (body[i] === gone) body[i] = keep;
        body[gone] = keep;
      }
    }
    if (merger === null) {
      const bm = body[mw];
      const ba = body[m31];
      closest = Math.min(closest, Math.hypot(x[3 * ba] - x[3 * bm], x[3 * ba + 1] - x[3 * bm + 1], x[3 * ba + 2] - x[3 * bm + 2]));
      if (records && step % Math.round(recordEvery / dt) === 0) record(step / Math.round(recordEvery / dt));
    } else break;
    // (Satellites' own fates after the Milky Way–Andromeda merger aren't followed.)
  }
  return { merger, closest, satellites, distances, path };
}

/** Rows of a rotation into the plane of the Milky Way–Andromeda orbit: along the line between them, along Andromeda's sideways motion, and out of the plane. */
function orbitBasis(x: Float64Array, v: Float64Array, mw: number, m31: number): Vec3[] {
  const r = [x[3 * m31] - x[3 * mw], x[3 * m31 + 1] - x[3 * mw + 1], x[3 * m31 + 2] - x[3 * mw + 2]];
  const u = [v[3 * m31] - v[3 * mw], v[3 * m31 + 1] - v[3 * mw + 1], v[3 * m31 + 2] - v[3 * mw + 2]];
  const e1 = unit(r);
  const along = e1[0] * u[0] + e1[1] * u[1] + e1[2] * u[2];
  let e2 = unit([u[0] - along * e1[0], u[1] - along * e1[1], u[2] - along * e1[2]]);
  if (!e2.every(Number.isFinite)) e2 = unit(Math.abs(e1[2]) < 0.9 ? [-e1[1], e1[0], 0] : [0, -e1[2], e1[1]]);
  const e3: Vec3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  return [e1, e2, e3];
}

function unit(a: readonly number[]): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}

/** Andromeda's motion relative to the Milky Way now: its distance (kpc), its speed towards us (km/s, negative when approaching) and its sideways speed (km/s). */
export function relativeMotion(galaxies: readonly SampledGalaxy[]): { distance: number; radial: number; tangential: number } {
  const mw = galaxies.find((g) => g.name === 'MW')!;
  const m31 = galaxies.find((g) => g.name === 'M31')!;
  const r = [m31.x[0] - mw.x[0], m31.x[1] - mw.x[1], m31.x[2] - mw.x[2]];
  const u = [m31.v[0] - mw.v[0], m31.v[1] - mw.v[1], m31.v[2] - mw.v[2]];
  const d = Math.hypot(r[0], r[1], r[2]);
  const radial = (r[0] * u[0] + r[1] * u[1] + r[2] * u[2]) / d;
  return { distance: d, radial, tangential: Math.sqrt(Math.max(0, u[0] ** 2 + u[1] ** 2 + u[2] ** 2 - radial * radial)) };
}

/** Which galaxies a run includes: always the Milky Way and Andromeda. */
export function choose(galaxies: readonly SampledGalaxy[], include: { M33: boolean; LMC: boolean }): SampledGalaxy[] {
  return galaxies.filter((g) => g.name === 'MW' || g.name === 'M31' || (g.name === 'M33' && include.M33) || (g.name === 'LMC' && include.LMC));
}
