import { GM_SUN } from '../constants';
import { Random } from '../random';
import { PARSEC, SECONDS_PER_JULIAN_YEAR } from '../units';

/**
 * A star cluster, every star pulling on every other (Chapter 30, and the
 * Orrery's cluster mode in Stage 29): direct summation, softened, stepped by
 * the fourth-order Hermite scheme with block time steps (Makino & Aarseth
 * 1992), the method of Aarseth's NBODY codes, in the Galaxy's tide.
 *
 * Units inside and at the edges: parsecs, millions of years and solar masses,
 * so G = 4.50 × 10⁻³ pc³ M☉⁻¹ Myr⁻² and a speed of 1 pc/Myr is 0.978 km/s.
 *
 * The tide is Hill's approximation (as in NBODY6; Binney & Tremaine 2008): the
 * cluster's centre goes round the Galaxy on a circle at angular speed Ω, and
 * the stars are followed in a frame that turns with it, x pointing away from
 * the Galaxy's centre, y along the orbit and z out of the plane. Each star
 * then feels, besides the other stars, the Coriolis force, the centrifugal
 * force and the Galaxy's pull expanded to first order about the centre:
 *
 *   ẍ = 2Ωẏ + (4Ω² − κ²) x,  ÿ = −2Ωẋ,  z̈ = −ν² z,
 *
 * with κ the epicyclic frequency and ν the vertical one. The Jacobi integral
 * (the energy in the turning frame) is kept exactly by these equations, so its
 * drift measures the integrator's error, escaped stars included.
 */

/** Seconds in a million years. */
const MYR = 1e6 * SECONDS_PER_JULIAN_YEAR;
/** The gravitational constant in pc³ M☉⁻¹ Myr⁻². */
export const G_CLUSTER = (GM_SUN * MYR * MYR) / PARSEC ** 3;
/** One km/s in pc/Myr. */
export const KMS = (1e3 * MYR) / PARSEC;

// ---------- starting conditions ----------

/** Stars' masses (M☉), positions (pc) and velocities (pc/Myr), x₀, y₀, z₀, x₁, … */
export interface Stars {
  mass: Float64Array;
  x: Float64Array;
  v: Float64Array;
}

/** The half-mass radius of a Plummer sphere of scale radius a: a / √(2^(2/3) − 1) = 1.305 a. */
export const PLUMMER_HALF_MASS = 1 / Math.sqrt(2 ** (2 / 3) - 1);

/**
 * A Plummer (1911) sphere of n stars, total mass M (M☉) and scale radius a
 * (pc), sampled as Aarseth, Hénon & Wielen (1974) do: each radius from the
 * mass inside it, each speed by rejection from the distribution function, in
 * random directions; then moved to rest at the origin. Radii beyond `rMax`
 * (pc; default 10a) are drawn again. `masses` (each star's, default equal)
 * are placed independently of position, so the cluster starts unsegregated.
 */
export function plummerSphere(n: number, totalMass: number, a: number, random: Random, masses?: Float64Array, rMax = 10 * a): Stars {
  const mass = masses ? Float64Array.from(masses) : new Float64Array(n).fill(totalMass / n);
  const sum = mass.reduce((s, m) => s + m, 0);
  for (let i = 0; i < n; i++) mass[i] *= totalMass / sum;
  const x = new Float64Array(3 * n);
  const v = new Float64Array(3 * n);
  const isotropic = (r: number, out: Float64Array, at: number) => {
    const z = random.uniform(-1, 1);
    const phi = random.uniform(0, 2 * Math.PI);
    const s = Math.sqrt(1 - z * z);
    out[at] = r * s * Math.cos(phi);
    out[at + 1] = r * s * Math.sin(phi);
    out[at + 2] = r * z;
  };
  for (let i = 0; i < n; i++) {
    let r: number;
    do {
      const m = random.uniform(1e-10, 1);
      r = a / Math.sqrt(m ** (-2 / 3) - 1);
    } while (r > rMax);
    isotropic(r, x, 3 * i);
    // The speed as a share q of the escape speed there: g(q) = q²(1 − q²)^(7/2), whose peak is below 0.1
    let q: number;
    do q = random.next();
    while (0.1 * random.next() > q * q * (1 - q * q) ** 3.5);
    const vEscape = Math.sqrt((2 * G_CLUSTER * totalMass) / Math.sqrt(r * r + a * a));
    isotropic(q * vEscape, v, 3 * i);
  }
  toCentreOfMass(mass, x, v);
  return { mass, x, v };
}

/** Moves positions and velocities to the centre of mass's frame. */
export function toCentreOfMass(mass: Float64Array, x: Float64Array, v: Float64Array) {
  const n = mass.length;
  let m = 0;
  const cx = [0, 0, 0];
  const cv = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    m += mass[i];
    for (let k = 0; k < 3; k++) {
      cx[k] += mass[i] * x[3 * i + k];
      cv[k] += mass[i] * v[3 * i + k];
    }
  }
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      x[3 * i + k] -= cx[k] / m;
      v[3 * i + k] -= cv[k] / m;
    }
  }
}

/** Kroupa's (2001) initial mass function: dN/dm ∝ m^−1.3 below 0.5 M☉ and m^−2.3 above. */
export const KROUPA = { mMin: 0.08, mBreak: 0.5, mMax: 10, lowSlope: 1.3, highSlope: 2.3 } as const;

/**
 * n masses (M☉) drawn from Kroupa's mass function between mMin and mMax, by
 * inverting each power law's cumulative share. The default upper limit, 10
 * M☉, suits a young open cluster; with no stellar evolution here, its heavy
 * stars live for ever.
 */
export function kroupaMasses(n: number, random: Random, mMin: number = KROUPA.mMin, mMax: number = KROUPA.mMax): Float64Array {
  const { mBreak, lowSlope, highSlope } = KROUPA;
  // ∫ m^−s dm from a to b, with the high segment scaled to join the low one at the break
  const piece = (a: number, b: number, s: number) => (b ** (1 - s) - a ** (1 - s)) / (1 - s);
  const join = mBreak ** (highSlope - lowSlope);
  const low = mMin < mBreak ? piece(mMin, Math.min(mBreak, mMax), lowSlope) : 0;
  const high = mMax > mBreak ? join * piece(Math.max(mBreak, mMin), mMax, highSlope) : 0;
  const out = new Float64Array(n);
  const invert = (u: number, a: number, b: number, s: number) => (a ** (1 - s) + u * (b ** (1 - s) - a ** (1 - s))) ** (1 / (1 - s));
  for (let i = 0; i < n; i++) {
    const u = random.next() * (low + high);
    out[i] = u < low ? invert(u / low, mMin, Math.min(mBreak, mMax), lowSlope) : invert((u - low) / high, Math.max(mBreak, mMin), mMax, highSlope);
  }
  return out;
}

/** The mean mass (M☉) of Kroupa's function between mMin and mMax, exactly. */
export function kroupaMeanMass(mMin: number = KROUPA.mMin, mMax: number = KROUPA.mMax): number {
  const { mBreak, lowSlope, highSlope } = KROUPA;
  const piece = (a: number, b: number, s: number) => (b ** (1 - s) - a ** (1 - s)) / (1 - s);
  const join = mBreak ** (highSlope - lowSlope);
  const number = piece(mMin, mBreak, lowSlope) + join * piece(mBreak, mMax, highSlope);
  const mass = piece(mMin, mBreak, lowSlope - 1) + join * piece(mBreak, mMax, highSlope - 1);
  return mass / number;
}

// ---------- the Galaxy's tide ----------

/** Hill's tide for a cluster on a circular orbit: Ω, κ and ν in Myr⁻¹. */
export interface Tide {
  omega: number;
  kappa: number;
  nu: number;
}

/**
 * The tide at `radius` kpc from the Galaxy's centre, for a flat rotation
 * curve of `speed` km/s (κ = √2 Ω) and a midplane density that falls
 * exponentially outwards from `density0` M☉/pc³ at the Sun's 8.2 kpc with a
 * scale length of 2.6 kpc (ν² = 4πGρ: a flat curve adds nothing to it).
 */
export function galacticTide(radius = 8.2, speed = 230, density0 = 0.1): Tide {
  const omega = (speed * KMS) / (radius * 1000);
  const rho = density0 * Math.exp(-(radius - 8.2) / 2.6);
  return { omega, kappa: Math.SQRT2 * omega, nu: Math.sqrt(4 * Math.PI * G_CLUSTER * rho) };
}

/** The tide's strength along x, 4Ω² − κ² (Myr⁻²). */
export function tidalStrength(tide: Tide): number {
  return 4 * tide.omega ** 2 - tide.kappa ** 2;
}

/** The Jacobi radius (pc) of a cluster of mass M (M☉): where the tide along x balances its pull, (GM / (4Ω² − κ²))^(1/3). L1 and L2 lie there. */
export function jacobiRadius(mass: number, tide: Tide): number {
  return Math.cbrt((G_CLUSTER * mass) / tidalStrength(tide));
}

// ---------- timescales ----------

/**
 * Spitzer's (1987) half-mass relaxation time (Myr) for n stars of mean mass m
 * (M☉) within a half-mass radius rh (pc):
 * 0.138 √n rh^(3/2) / (√m √G ln(0.4 n)).
 */
export function relaxationTime(n: number, rh: number, meanMass: number): number {
  return (0.138 * Math.sqrt(n) * rh ** 1.5) / (Math.sqrt(meanMass) * Math.sqrt(G_CLUSTER) * Math.log(0.4 * n));
}

/** A crossing time (Myr): the half-mass radius rh (pc) over the 3D speed of a cluster of mass M (M☉) in balance, σ² = GM / (2 r_v) with r_v ≈ 1.3 rh. */
export function crossingTime(mass: number, rh: number): number {
  const sigma = Math.sqrt((G_CLUSTER * mass) / (2 * 1.3 * rh));
  return rh / sigma;
}

// ---------- the integrator ----------

export interface ClusterOptions {
  /** Plummer softening length, pc. */
  softening: number;
  tide: Tide | null;
  /** Aarseth's accuracy parameter (default 0.02) and the first step's (0.01). */
  eta?: number;
  etaStart?: number;
  /** The longest step, Myr; rounded down to a power of two. */
  maxStep: number;
}

/**
 * The cluster's state and its Hermite integrator. Each star keeps its own
 * time and step, a power of two no longer than the longest step; the stars
 * whose steps end soonest move together (a block), after every star has been
 * predicted to that moment. All stars are level whenever the time is a
 * multiple of the longest step.
 */
export class ClusterSim {
  readonly n: number;
  readonly mass: Float64Array;
  readonly x: Float64Array;
  readonly v: Float64Array;
  /** Each star's acceleration and jerk at its own time. */
  private readonly a: Float64Array;
  private readonly j: Float64Array;
  /** Predicted positions and velocities at the current block time. */
  private readonly xp: Float64Array;
  private readonly vp: Float64Array;
  /** Each star's own time and step, Myr. */
  readonly ti: Float64Array;
  readonly dt: Float64Array;
  /** The block time, Myr. */
  t = 0;
  /** Blocks and single-star steps taken. */
  blocks = 0;
  starSteps = 0;
  readonly eps2: number;
  readonly tide: Tide | null;
  readonly eta: number;
  readonly maxStep: number;
  private readonly active: Int32Array;
  private readonly a0: Float64Array;
  private readonly j0: Float64Array;

  constructor(stars: Stars, options: ClusterOptions) {
    this.n = stars.mass.length;
    this.mass = Float64Array.from(stars.mass);
    this.x = Float64Array.from(stars.x);
    this.v = Float64Array.from(stars.v);
    this.a = new Float64Array(3 * this.n);
    this.j = new Float64Array(3 * this.n);
    this.xp = Float64Array.from(stars.x);
    this.vp = Float64Array.from(stars.v);
    this.ti = new Float64Array(this.n);
    this.dt = new Float64Array(this.n);
    this.active = new Int32Array(this.n);
    this.a0 = new Float64Array(3 * this.n);
    this.j0 = new Float64Array(3 * this.n);
    this.eps2 = options.softening ** 2;
    this.tide = options.tide;
    this.eta = options.eta ?? 0.02;
    this.maxStep = 2 ** Math.floor(Math.log2(options.maxStep));
    const etaStart = options.etaStart ?? 0.01;
    for (let i = 0; i < this.n; i++) this.active[i] = i;
    this.forces(this.n);
    for (let i = 0; i < this.n; i++) {
      const a = Math.hypot(this.a[3 * i], this.a[3 * i + 1], this.a[3 * i + 2]);
      const j = Math.hypot(this.j[3 * i], this.j[3 * i + 1], this.j[3 * i + 2]);
      this.dt[i] = this.quantise(j > 0 ? (etaStart * a) / j : this.maxStep, 0);
    }
  }

  /** The largest power of two no longer than `step` (and no longer than the longest step) that `time` is a whole number of. */
  private quantise(step: number, time: number): number {
    let dt = this.maxStep;
    while (dt > step && dt > 1e-12) dt /= 2;
    while (time % dt !== 0 && dt > 1e-12) dt /= 2;
    return dt;
  }

  /** Gravity from every star, the tide and the Coriolis force, with their jerks, on the first `count` stars of `active`, at the predicted positions. */
  private forces(count: number) {
    const { n, mass, xp, vp, a, j, eps2, active } = this;
    const G = G_CLUSTER;
    for (let k = 0; k < count; k++) {
      const i = active[k];
      const xi = xp[3 * i];
      const yi = xp[3 * i + 1];
      const zi = xp[3 * i + 2];
      const vxi = vp[3 * i];
      const vyi = vp[3 * i + 1];
      const vzi = vp[3 * i + 2];
      let ax = 0;
      let ay = 0;
      let az = 0;
      let jx = 0;
      let jy = 0;
      let jz = 0;
      for (let s = 0; s < n; s++) {
        if (s === i) continue;
        const dx = xp[3 * s] - xi;
        const dy = xp[3 * s + 1] - yi;
        const dz = xp[3 * s + 2] - zi;
        const dvx = vp[3 * s] - vxi;
        const dvy = vp[3 * s + 1] - vyi;
        const dvz = vp[3 * s + 2] - vzi;
        const r2 = dx * dx + dy * dy + dz * dz + eps2;
        const inv = 1 / Math.sqrt(r2);
        const inv3 = mass[s] * inv * inv * inv;
        const rv = (3 * (dx * dvx + dy * dvy + dz * dvz)) / r2;
        ax += inv3 * dx;
        ay += inv3 * dy;
        az += inv3 * dz;
        jx += inv3 * (dvx - rv * dx);
        jy += inv3 * (dvy - rv * dy);
        jz += inv3 * (dvz - rv * dz);
      }
      ax *= G;
      ay *= G;
      az *= G;
      jx *= G;
      jy *= G;
      jz *= G;
      if (this.tide) {
        const { omega, nu } = this.tide;
        const T = tidalStrength(this.tide);
        ax += 2 * omega * vyi + T * xi;
        ay += -2 * omega * vxi;
        az += -nu * nu * zi;
        jx += 2 * omega * ay + T * vxi;
        jy += -2 * omega * ax;
        jz += -nu * nu * vzi;
      }
      a[3 * i] = ax;
      a[3 * i + 1] = ay;
      a[3 * i + 2] = az;
      j[3 * i] = jx;
      j[3 * i + 1] = jy;
      j[3 * i + 2] = jz;
    }
  }

  /** Predicts every star to time t from its own last step (positions to third order, velocities to second). */
  private predict(t: number) {
    const { n, x, v, a, j, ti, xp, vp } = this;
    for (let i = 0; i < n; i++) {
      const h = t - ti[i];
      if (h === 0) {
        for (let k = 0; k < 3; k++) {
          xp[3 * i + k] = x[3 * i + k];
          vp[3 * i + k] = v[3 * i + k];
        }
        continue;
      }
      const h2 = (h * h) / 2;
      const h3 = (h2 * h) / 3;
      for (let k = 0; k < 3; k++) {
        const c = 3 * i + k;
        xp[c] = x[c] + h * v[c] + h2 * a[c] + h3 * j[c];
        vp[c] = v[c] + h * a[c] + h2 * j[c];
      }
    }
  }

  /** The time the next block ends. */
  nextTime(): number {
    let next = Infinity;
    for (let i = 0; i < this.n; i++) next = Math.min(next, this.ti[i] + this.dt[i]);
    return next;
  }

  /** Takes one block step: the stars whose steps end soonest, predicted, given new forces and corrected. Returns how many stars moved. */
  step(): number {
    const { n, x, v, a, j, ti, dt, xp, vp, active } = this;
    const t1 = this.nextTime();
    let count = 0;
    for (let i = 0; i < n; i++) if (ti[i] + dt[i] === t1) active[count++] = i;
    this.predict(t1);
    // Keep the old acceleration and jerk of the stars that move
    for (let k = 0; k < count; k++) {
      const i = active[k];
      for (let c = 0; c < 3; c++) {
        this.a0[3 * k + c] = a[3 * i + c];
        this.j0[3 * k + c] = j[3 * i + c];
      }
    }
    this.forces(count);
    const { a0, j0 } = this;
    for (let k = 0; k < count; k++) {
      const i = active[k];
      const h = dt[i];
      let a2sq = 0;
      let a3sq = 0;
      let a1sq = 0;
      let j1sq = 0;
      for (let c = 0; c < 3; c++) {
        const p = 3 * i + c;
        const da = a0[3 * k + c] - a[p];
        const a2 = (-6 * da - h * (4 * j0[3 * k + c] + 2 * j[p])) / (h * h);
        const a3 = (12 * da + 6 * h * (j0[3 * k + c] + j[p])) / (h * h * h);
        x[p] = xp[p] + (a2 * h ** 4) / 24 + (a3 * h ** 5) / 120;
        v[p] = vp[p] + (a2 * h ** 3) / 6 + (a3 * h ** 4) / 24;
        const a2end = a2 + a3 * h;
        a2sq += a2end * a2end;
        a3sq += a3 * a3;
        a1sq += a[p] * a[p];
        j1sq += j[p] * j[p];
      }
      ti[i] = t1;
      // Aarseth's criterion: η (|a||a⁽²⁾| + |a⁽¹⁾|²) / (|a⁽¹⁾||a⁽³⁾| + |a⁽²⁾|²)
      const denominator = Math.sqrt(j1sq * a3sq) + a2sq;
      const ideal = denominator > 0 ? Math.sqrt((this.eta * (Math.sqrt(a1sq * a2sq) + j1sq)) / denominator) : this.maxStep;
      let next = h;
      if (ideal < h) while (next > ideal && next > 1e-12) next /= 2;
      else if (ideal >= 2 * h && t1 % (2 * h) === 0 && 2 * h <= this.maxStep) next = 2 * h;
      dt[i] = next;
    }
    this.t = t1;
    this.blocks++;
    this.starSteps += count;
    return count;
  }

  /** Steps blocks until the time reaches `t` (Myr), a multiple of the longest step, or `budget` star-force sums (star steps × n) have been spent. Returns whether it got there. */
  advanceTo(t: number, budget = Infinity): boolean {
    let spent = 0;
    while (this.t < t - 1e-12) {
      spent += this.step() * this.n;
      if (spent >= budget) return this.t >= t - 1e-12;
    }
    return true;
  }

  /** Whether every star is at the block time (true at every multiple of the longest step). */
  level(): boolean {
    for (let i = 0; i < this.n; i++) if (this.ti[i] !== this.t) return false;
    return true;
  }

  /** Positions (pc) at the block time: the stars' own, predicted forwards where their steps are still running. */
  positionsNow(): Float64Array {
    this.predict(this.t);
    return this.xp;
  }

  /** Velocities (pc/Myr) at the block time, likewise. */
  velocitiesNow(): Float64Array {
    this.predict(this.t);
    return this.vp;
  }

  /**
   * The Jacobi integral (M☉ pc² Myr⁻²) at the block time: kinetic energy in
   * the turning frame, the softened pair potential, and the tide's
   * potential, −½(4Ω² − κ²)x² + ½ν²z².
   */
  jacobiEnergy(): number {
    const x = this.positionsNow();
    const v = this.vp;
    const { n, mass, eps2 } = this;
    let e = 0;
    for (let i = 0; i < n; i++) {
      e += 0.5 * mass[i] * (v[3 * i] ** 2 + v[3 * i + 1] ** 2 + v[3 * i + 2] ** 2);
      if (this.tide) e += mass[i] * (-0.5 * tidalStrength(this.tide) * x[3 * i] ** 2 + 0.5 * this.tide.nu ** 2 * x[3 * i + 2] ** 2);
      let w = 0;
      for (let s = i + 1; s < n; s++) {
        const dx = x[3 * s] - x[3 * i];
        const dy = x[3 * s + 1] - x[3 * i + 1];
        const dz = x[3 * s + 2] - x[3 * i + 2];
        w += mass[s] / Math.sqrt(dx * dx + dy * dy + dz * dz + eps2);
      }
      e -= G_CLUSTER * mass[i] * w;
    }
    return e;
  }

  /** Kinetic and (softened) potential energy of the stars alone, M☉ pc² Myr⁻², for the virial ratio. */
  energies(): { kinetic: number; potential: number } {
    const x = this.positionsNow();
    const v = this.vp;
    const { n, mass, eps2 } = this;
    let kinetic = 0;
    let potential = 0;
    for (let i = 0; i < n; i++) {
      kinetic += 0.5 * mass[i] * (v[3 * i] ** 2 + v[3 * i + 1] ** 2 + v[3 * i + 2] ** 2);
      for (let s = i + 1; s < n; s++) {
        const dx = x[3 * s] - x[3 * i];
        const dy = x[3 * s + 1] - x[3 * i + 1];
        const dz = x[3 * s + 2] - x[3 * i + 2];
        potential -= (G_CLUSTER * mass[i] * mass[s]) / Math.sqrt(dx * dx + dy * dy + dz * dz + eps2);
      }
    }
    return { kinetic, potential };
  }
}

// ---------- reading a cluster ----------

export interface ClusterReading {
  /** The cluster's centre, pc: the centre of mass of the stars within the Jacobi radius of it. */
  centre: [number, number, number];
  /** The mass within the Jacobi radius (M☉), the radius itself (pc), and how many stars. */
  boundMass: number;
  jacobi: number;
  boundCount: number;
  /** Whether each star is within the Jacobi radius. */
  bound: Uint8Array;
  /** Radii (pc) holding 10%, 50% and 90% of the bound mass. */
  lagrangian: [number, number, number];
  /** The radius (pc) holding half the mass of the heaviest tenth of the bound stars. */
  heavyHalfMass: number;
}

/**
 * Finds the cluster in a cloud of stars (pc): its centre, by taking the
 * centre of mass of the stars within the Jacobi radius again and again, with
 * the Jacobi radius found from the mass inside it (with no tide, everything is
 * bound); the bound stars' Lagrangian radii; and how far out the heaviest
 * tenth of them reach.
 */
export function readCluster(mass: Float64Array, x: Float64Array, tide: Tide | null, start?: readonly number[]): ClusterReading {
  const n = mass.length;
  let total = 0;
  const c: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    total += mass[i];
    for (let k = 0; k < 3; k++) c[k] += mass[i] * x[3 * i + k];
  }
  if (start) for (let k = 0; k < 3; k++) c[k] = start[k];
  else for (let k = 0; k < 3; k++) c[k] /= total;
  let rJ = tide ? jacobiRadius(total, tide) : Infinity;
  const r2 = new Float64Array(n);
  for (let iteration = 0; iteration < 8; iteration++) {
    let m = 0;
    const s = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const d2 = (x[3 * i] - c[0]) ** 2 + (x[3 * i + 1] - c[1]) ** 2 + (x[3 * i + 2] - c[2]) ** 2;
      r2[i] = d2;
      if (d2 <= rJ * rJ) {
        m += mass[i];
        for (let k = 0; k < 3; k++) s[k] += mass[i] * x[3 * i + k];
      }
    }
    if (m === 0) break;
    for (let k = 0; k < 3; k++) c[k] = s[k] / m;
    if (tide) rJ = jacobiRadius(m, tide);
  }
  const bound = new Uint8Array(n);
  const inside: number[] = [];
  let boundCount = 0;
  let boundMass = 0;
  for (let i = 0; i < n; i++) {
    const d2 = (x[3 * i] - c[0]) ** 2 + (x[3 * i + 1] - c[1]) ** 2 + (x[3 * i + 2] - c[2]) ** 2;
    r2[i] = d2;
    if (d2 <= rJ * rJ) {
      bound[i] = 1;
      boundCount++;
      boundMass += mass[i];
      inside.push(i);
    }
  }
  inside.sort((p, q) => r2[p] - r2[q]);
  const radiusHolding = (stars: number[], share: number) => {
    const sum = stars.reduce((s, i) => s + mass[i], 0);
    let m = 0;
    for (const i of stars) {
      m += mass[i];
      if (m >= share * sum) return Math.sqrt(r2[i]);
    }
    return stars.length ? Math.sqrt(r2[stars[stars.length - 1]]) : 0;
  };
  const lagrangian: [number, number, number] = [radiusHolding(inside, 0.1), radiusHolding(inside, 0.5), radiusHolding(inside, 0.9)];
  const byMass = [...inside].sort((p, q) => mass[q] - mass[p]).slice(0, Math.max(1, Math.round(inside.length / 10)));
  byMass.sort((p, q) => r2[p] - r2[q]);
  return { centre: c, boundMass, jacobi: rJ, boundCount, bound, lagrangian, heavyHalfMass: radiusHolding(byMass, 0.5) };
}
