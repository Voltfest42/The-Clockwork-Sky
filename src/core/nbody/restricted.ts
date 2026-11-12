import { GM_SUN } from '../constants';
import { slowerShare } from '../math/erf';
import type { Vec3 } from '../math/vec3';
import { Random } from '../random';
import { PARSEC, SECONDS_PER_JULIAN_YEAR } from '../units';

/**
 * Colliding galaxies by Toomre's restricted method (Chapter 31, and the
 * Orrery's galaxy mode in Stage 29). Each galaxy is a rigid, extended mass, a
 * Plummer sphere (a softened point mass, as Toomre & Toomre's 1972 galaxies
 * were); the galaxies pull on each other, and Chandrasekhar's dynamical
 * friction, the drag of the wake each raises in the other's halo, can make
 * them sink together. Their stars are test particles: each feels both
 * galaxies but pulls on nothing, like a game's effect particles that follow a
 * physics proxy without pushing back. So a hundred thousand stars cost only
 * two pulls each per step.
 *
 * Everything is stepped together by kick–drift–kick leapfrog with a fixed
 * step. Without friction the scheme is symplectic and exactly reversible,
 * which is used to set an encounter up: the galaxies are placed at their
 * closest approach and run backwards to the start.
 *
 * Units: kpc, Myr and M☉, so G = 4.50 × 10⁻¹² kpc³ M☉⁻¹ Myr⁻², and a speed of
 * 1 kpc/Myr is 978 km/s.
 */

const MYR = 1e6 * SECONDS_PER_JULIAN_YEAR;
const KPC = 1e3 * PARSEC;
/** G in kpc³ M☉⁻¹ Myr⁻². */
export const G_KPC = (GM_SUN * MYR * MYR) / KPC ** 3;
/** One km/s in kpc/Myr. */
export const KMS_KPC = (1e3 * MYR) / KPC;

// ---------- a Plummer galaxy ----------

/** Potential (kpc²/Myr²) at r (kpc) from a Plummer sphere of mass M (M☉) and scale b (kpc): −GM/√(r² + b²). */
export function plummerPotential(r: number, mass: number, b: number): number {
  return (-G_KPC * mass) / Math.sqrt(r * r + b * b);
}

/** Density (M☉/kpc³): 3M/(4πb³) (1 + r²/b²)^(−5/2). */
export function plummerDensity(r: number, mass: number, b: number): number {
  return ((3 * mass) / (4 * Math.PI * b ** 3)) * (1 + (r * r) / (b * b)) ** -2.5;
}

/** Mass inside r (M☉): M r³/(r² + b²)^(3/2). */
export function plummerMassInside(r: number, mass: number, b: number): number {
  return (mass * r ** 3) / (r * r + b * b) ** 1.5;
}

/** Circular speed (kpc/Myr): √(GM r²/(r² + b²)^(3/2)). */
export function plummerCircularSpeed(r: number, mass: number, b: number): number {
  return Math.sqrt((G_KPC * mass * r * r) / (r * r + b * b) ** 1.5);
}

/** The one-dimensional velocity dispersion (kpc/Myr) of an isotropic Plummer sphere's own stars, from Jeans's equation: σ² = GM/(6√(r² + b²)). */
export function plummerDispersion(r: number, mass: number, b: number): number {
  return Math.sqrt((G_KPC * mass) / (6 * Math.sqrt(r * r + b * b)));
}

/**
 * Chandrasekhar's (1943) dynamical friction on a body of mass m (M☉) moving
 * at relative speed u (kpc/Myr) through a crowd of density ρ (M☉/kpc³) whose
 * speeds are Maxwellian with dispersion σ (kpc/Myr):
 *
 *   a = −4πG² m ρ ln Λ F(X) u/|u|³,  X = |u|/(√2 σ),
 *
 * returned as the coefficient k (1/Myr) of a = −k u. F(X) is the share of the
 * crowd slower than the body (`slowerShare`); for small u, F ≈ 4X³/(3√π), so
 * k stays finite: a slow body feels a drag in proportion to its speed.
 */
export function frictionCoefficient(m: number, rho: number, sigma: number, speed: number, lnLambda: number): number {
  const s2 = Math.SQRT2 * sigma;
  const pre = 4 * Math.PI * G_KPC * G_KPC * m * rho * lnLambda;
  const X = speed / s2;
  if (X < 1e-6) return (pre * 4) / (3 * Math.sqrt(Math.PI) * s2 ** 3);
  return (pre * slowerShare(X)) / speed ** 3;
}

// ---------- an encounter ----------

export interface Disc {
  /** Inner and outer radius of the stars, kpc. */
  inner: number;
  outer: number;
  /** The stars' spin axis: they go round anticlockwise seen from its tip (a unit vector in the encounter's frame). */
  axis: Vec3;
  /** How many stars. */
  count: number;
  /** The scale length of the stars' exponential surface density, kpc (default 60% of the outer radius). */
  scaleLength?: number;
}

export interface GalaxySpec {
  /** M☉. */
  mass: number;
  /** Plummer scale radius, kpc. */
  scale: number;
  disc?: Disc;
}

export interface EncounterSpec {
  galaxies: readonly [GalaxySpec, GalaxySpec];
  /** The closest approach, kpc. */
  pericentre: number;
  /**
   * The orbit's eccentricity in the extended galaxies' own potential: at the
   * closest approach the relative speed is √((1 + e) |Φ(r_p)|), which for
   * point masses is Kepler's. Below 1 the pair is bound, 1 is parabolic.
   */
  eccentricity: number;
  /** Dynamical friction between the galaxies. */
  friction: boolean;
  /** Coulomb logarithm (default 3). */
  lnLambda?: number;
  /** Step, Myr (default 1). */
  dt?: number;
  /**
   * How far apart the galaxies start, kpc: the run goes back from the
   * closest approach until they are this far apart, or (for a bound orbit) to
   * the last apocentre if that comes first (Toomre's discs started there).
   */
  startSeparation: number;
  seed?: number;
}

/** The pair's own state: two galaxies' positions (kpc) and velocities (kpc/Myr) in the frame of their centre of mass. */
export interface PairState {
  x: Float64Array;
  v: Float64Array;
}

/** Each galaxy's mass, scale and the friction switch, as the stepping needs them. */
interface PairModel {
  mass: readonly [number, number];
  scale: readonly [number, number];
  friction: boolean;
  lnLambda: number;
}

/**
 * Accelerations (kpc/Myr²) of the two galaxies into `out` (length 6). The
 * pull between two Plummer spheres is taken as the average of each one's pull
 * on the other as a point, F = −½GM_AM_B d [1/(d² + b_A²)^(3/2) + 1/(d² + b_B²)^(3/2)],
 * which is equal and opposite and comes from the potential
 * −½GM_AM_B [1/√(d² + b_A²) + 1/√(d² + b_B²)]. Friction, as Sawala et al.
 * (2025) apply it, acts on the lighter galaxy (B when they are equal) as it
 * moves through the heavier one's sphere, a_DF = −k(v_s − v_h), and is shared
 * so that momentum is kept: the lighter gets a_DF M_h/(M_s + M_h), the
 * heavier −a_DF M_s/(M_s + M_h). (Chandrasekhar's formula assumes a body
 * much heavier than the crowd it moves through; a heavy galaxy “dragged” by a
 * light one's dense core would fling the light one away.)
 */
function pairAcceleration(model: PairModel, x: Float64Array, v: Float64Array, out: Float64Array): void {
  const [mA, mB] = model.mass;
  const [bA, bB] = model.scale;
  const dx = x[0] - x[3];
  const dy = x[1] - x[4];
  const dz = x[2] - x[5];
  const d2 = dx * dx + dy * dy + dz * dz;
  const sA = d2 + bA * bA;
  const sB = d2 + bB * bB;
  const f = 0.5 * G_KPC * (1 / (sA * Math.sqrt(sA)) + 1 / (sB * Math.sqrt(sB)));
  // Force on A per unit M_A M_B
  const fx = -f * dx;
  const fy = -f * dy;
  const fz = -f * dz;
  let ax = fx * mB;
  let ay = fy * mB;
  let az = fz * mB;
  let bx = -fx * mA;
  let by = -fy * mA;
  let bz = -fz * mA;
  if (model.friction) {
    const d = Math.sqrt(d2);
    // u: the lighter galaxy's velocity relative to the heavier
    const bLighter = mB <= mA;
    const sign = bLighter ? -1 : 1;
    const ux = sign * (v[0] - v[3]);
    const uy = sign * (v[1] - v[4]);
    const uz = sign * (v[2] - v[5]);
    const u = Math.sqrt(ux * ux + uy * uy + uz * uz);
    const [ms, mh, bh] = bLighter ? [mB, mA, bA] : [mA, mB, bB];
    const k = frictionCoefficient(ms, plummerDensity(d, mh, bh), plummerDispersion(d, mh, bh), u, model.lnLambda);
    // Accelerations of the lighter (s) and heavier (h) galaxy, per unit of u
    const toS = (-k * mh) / (ms + mh);
    const toH = (k * ms) / (ms + mh);
    const aA = bLighter ? toH : toS;
    const aB = bLighter ? toS : toH;
    ax += aA * ux;
    ay += aA * uy;
    az += aA * uz;
    bx += aB * ux;
    by += aB * uy;
    bz += aB * uz;
  }
  out[0] = ax;
  out[1] = ay;
  out[2] = az;
  out[3] = bx;
  out[4] = by;
  out[5] = bz;
}

/** The pair's orbital energy (M☉ kpc²/Myr²): kinetic plus the potential of the pull above. */
export function pairEnergy(spec: Pick<EncounterSpec, 'galaxies'>, state: PairState): number {
  const [A, B] = spec.galaxies;
  const d = Math.hypot(state.x[0] - state.x[3], state.x[1] - state.x[4], state.x[2] - state.x[5]);
  const kinetic =
    0.5 * A.mass * (state.v[0] ** 2 + state.v[1] ** 2 + state.v[2] ** 2) + 0.5 * B.mass * (state.v[3] ** 2 + state.v[4] ** 2 + state.v[5] ** 2);
  return kinetic + pairPotential(A, B, d);
}

/** −½GM_AM_B [1/√(d² + b_A²) + 1/√(d² + b_B²)]. */
export function pairPotential(A: GalaxySpec, B: GalaxySpec, d: number): number {
  return -0.5 * G_KPC * A.mass * B.mass * (1 / Math.sqrt(d * d + A.scale ** 2) + 1 / Math.sqrt(d * d + B.scale ** 2));
}

/** The relative speed (kpc/Myr) at the closest approach r_p for an orbit of eccentricity e, as `EncounterSpec` defines it. */
export function pericentreSpeed(A: GalaxySpec, B: GalaxySpec, rp: number, e: number): number {
  const mu = (A.mass * B.mass) / (A.mass + B.mass);
  return Math.sqrt(((1 + e) * -pairPotential(A, B, rp)) / mu);
}

function model(spec: EncounterSpec): PairModel {
  return {
    mass: [spec.galaxies[0].mass, spec.galaxies[1].mass],
    scale: [spec.galaxies[0].scale, spec.galaxies[1].scale],
    friction: spec.friction,
    lnLambda: spec.lnLambda ?? 3,
  };
}

/**
 * Sets an encounter up: the galaxies at their closest approach at t = 0, B at
 * +x from A and moving towards +y (so the orbit turns anticlockwise about +z),
 * run backwards until they are `startSeparation` apart (or at the last
 * apocentre). Returns the pair at the start and the start time (negative, Myr).
 */
export function encounterStart(spec: EncounterSpec): { state: PairState; t: number } {
  const [A, B] = spec.galaxies;
  const total = A.mass + B.mass;
  const vp = pericentreSpeed(A, B, spec.pericentre, spec.eccentricity);
  const x = Float64Array.from([(-B.mass / total) * spec.pericentre, 0, 0, (A.mass / total) * spec.pericentre, 0, 0]);
  const v = Float64Array.from([0, (-B.mass / total) * vp, 0, 0, (A.mass / total) * vp, 0]);
  // Backwards without friction, so that an encounter starts the same whether friction is on or off
  const m = { ...model(spec), friction: false };
  const dt = spec.dt ?? 1;
  const acc = new Float64Array(6);
  let t = 0;
  let last = spec.pericentre;
  // Backwards: the same kick–drift–kick with a negative step
  for (let n = 0; n < 20_000; n++) {
    leapfrogPair(m, x, v, -dt, acc);
    t -= dt;
    const d = Math.hypot(x[0] - x[3], x[1] - x[4], x[2] - x[5]);
    if (d >= spec.startSeparation) break;
    if (d < last) {
      // Turned back: this was the apocentre; step forward to it
      leapfrogPair(m, x, v, dt, acc);
      t += dt;
      break;
    }
    last = d;
  }
  return { state: { x, v }, t };
}

function leapfrogPair(m: PairModel, x: Float64Array, v: Float64Array, dt: number, acc: Float64Array): void {
  pairAcceleration(m, x, v, acc);
  for (let i = 0; i < 6; i++) v[i] += 0.5 * dt * acc[i];
  for (let i = 0; i < 6; i++) x[i] += dt * v[i];
  pairAcceleration(m, x, v, acc);
  for (let i = 0; i < 6; i++) v[i] += 0.5 * dt * acc[i];
}

/**
 * The spin axis of a disc tilted by i to the orbit's plane, with its closest
 * approach an angle ω past the ascending node (where the companion climbs
 * through the disc's plane), measured along the orbit: Toomre & Toomre's
 * (1972) i and ω. The orbit turns about +z; `towardsPlusX` is true for the
 * galaxy whose companion passes it on the +x side (A), false for the other.
 * i = 0 is a disc turning with the orbit (prograde), i = 180° against it.
 */
export function discAxis(iDeg: number, omegaDeg: number, towardsPlusX: boolean): Vec3 {
  const i = (iDeg * Math.PI) / 180;
  const w = (omegaDeg * Math.PI) / 180;
  const s = towardsPlusX ? 1 : -1;
  return [s * Math.sin(i) * Math.sin(w), s * Math.sin(i) * Math.cos(w), Math.cos(i)];
}

/** Two unit vectors that, with the axis, make a right-handed set. */
function planeBasis(axis: Vec3): [Vec3, Vec3] {
  const [nx, ny, nz] = axis;
  // A vector not parallel to the axis
  const t: Vec3 = Math.abs(nz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let ex = t[1] * nz - t[2] * ny;
  let ey = t[2] * nx - t[0] * nz;
  let ez = t[0] * ny - t[1] * nx;
  const l = Math.hypot(ex, ey, ez);
  ex /= l;
  ey /= l;
  ez /= l;
  return [
    [ex, ey, ez],
    [ny * ez - nz * ey, nz * ex - nx * ez, nx * ey - ny * ex],
  ];
}

/** The stars: positions (kpc) and velocities (kpc/Myr), x₀, y₀, z₀, x₁, …; which galaxy each began in; and how far from its centre. */
export interface TestStars {
  x: Float64Array;
  v: Float64Array;
  owner: Uint8Array;
  startRadius: Float32Array;
}

/**
 * Discs of test stars round each galaxy, on circular orbits in its own pull,
 * flat and cold, as Toomre's were. Radii are drawn from an exponential surface
 * density (by default with a scale of 60% of the outer radius), cut to the disc's inner and
 * outer edge (Toomre used even rings, a flat surface density); seeded.
 */
export function discStars(spec: EncounterSpec, pair: PairState): TestStars {
  const random = new Random(spec.seed ?? 1);
  const n = spec.galaxies.reduce((s, g) => s + (g.disc?.count ?? 0), 0);
  const x = new Float64Array(3 * n);
  const v = new Float64Array(3 * n);
  const owner = new Uint8Array(n);
  const startRadius = new Float32Array(n);
  let at = 0;
  spec.galaxies.forEach((g, k) => {
    const disc = g.disc;
    if (!disc) return;
    const [e1, e2] = planeBasis(disc.axis);
    const h = disc.scaleLength ?? 0.6 * disc.outer;
    // The largest weight R e^(−R/h) on [inner, outer], for rejection
    const peak = Math.min(Math.max(h, disc.inner), disc.outer);
    const top = peak * Math.exp(-peak / h);
    for (let j = 0; j < disc.count; j++) {
      let R: number;
      do R = random.uniform(disc.inner, disc.outer);
      while (random.next() * top > R * Math.exp(-R / h));
      const phi = random.uniform(0, 2 * Math.PI);
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      const vc = plummerCircularSpeed(R, g.mass, g.scale);
      for (let a = 0; a < 3; a++) {
        x[3 * at + a] = pair.x[3 * k + a] + R * (c * e1[a] + s * e2[a]);
        v[3 * at + a] = pair.v[3 * k + a] + vc * (-s * e1[a] + c * e2[a]);
      }
      owner[at] = k;
      startRadius[at] = R;
      at++;
    }
  });
  return { x, v, owner, startRadius };
}

/** What became of each galaxy's stars: still at home, taken by the other galaxy, or loose in tails and bridges. */
export interface Fates {
  /** [own, captured, loose] counts for the stars that began in A, then in B. */
  A: [number, number, number];
  B: [number, number, number];
}

/**
 * An encounter in progress: the galaxies and their test stars, stepped
 * together. Time is in Myr from the closest approach.
 */
export class GalaxyEncounter {
  readonly spec: EncounterSpec;
  readonly dt: number;
  readonly pair: PairState;
  readonly stars: TestStars;
  t: number;
  private readonly model: PairModel;
  private readonly acc = new Float64Array(6);

  constructor(spec: EncounterSpec) {
    this.spec = spec;
    this.dt = spec.dt ?? 1;
    this.model = model(spec);
    const start = encounterStart(spec);
    this.pair = start.state;
    this.t = start.t;
    this.stars = discStars(spec, this.pair);
  }

  get count(): number {
    return this.stars.owner.length;
  }

  /** One kick–drift–kick step for the galaxies and every star. */
  step(): void {
    const dt = this.dt;
    const { x, v } = this.pair;
    pairAcceleration(this.model, x, v, this.acc);
    for (let i = 0; i < 6; i++) v[i] += 0.5 * dt * this.acc[i];
    this.kickStars(0.5 * dt);
    for (let i = 0; i < 6; i++) x[i] += dt * v[i];
    const sx = this.stars.x;
    const sv = this.stars.v;
    for (let i = 0; i < sx.length; i++) sx[i] += dt * sv[i];
    pairAcceleration(this.model, x, v, this.acc);
    for (let i = 0; i < 6; i++) v[i] += 0.5 * dt * this.acc[i];
    this.kickStars(0.5 * dt);
    this.t += dt;
  }

  /** Every star's pull from both galaxies, for a kick of h Myr. */
  private kickStars(h: number): void {
    const [mA, mB] = this.model.mass;
    const [bA, bB] = this.model.scale;
    const gA = G_KPC * mA * h;
    const gB = G_KPC * mB * h;
    const bA2 = bA * bA;
    const bB2 = bB * bB;
    const p = this.pair.x;
    const ax = p[0];
    const ay = p[1];
    const az = p[2];
    const bx = p[3];
    const by = p[4];
    const bz = p[5];
    const sx = this.stars.x;
    const sv = this.stars.v;
    for (let i = 0; i < sx.length; i += 3) {
      const x = sx[i];
      const y = sx[i + 1];
      const z = sx[i + 2];
      let dx = x - ax;
      let dy = y - ay;
      let dz = z - az;
      let s = dx * dx + dy * dy + dz * dz + bA2;
      let f = gA / (s * Math.sqrt(s));
      let vx = sv[i] - f * dx;
      let vy = sv[i + 1] - f * dy;
      let vz = sv[i + 2] - f * dz;
      dx = x - bx;
      dy = y - by;
      dz = z - bz;
      s = dx * dx + dy * dy + dz * dz + bB2;
      f = gB / (s * Math.sqrt(s));
      vx -= f * dx;
      vy -= f * dy;
      vz -= f * dz;
      sv[i] = vx;
      sv[i + 1] = vy;
      sv[i + 2] = vz;
    }
  }

  /** The galaxies' separation (kpc). */
  separation(): number {
    const x = this.pair.x;
    return Math.hypot(x[0] - x[3], x[1] - x[4], x[2] - x[5]);
  }

  /** Their relative speed (kpc/Myr). */
  relativeSpeed(): number {
    const v = this.pair.v;
    return Math.hypot(v[0] - v[3], v[1] - v[4], v[2] - v[5]);
  }

  /** The pair's orbital energy, M☉ kpc²/Myr². */
  energy(): number {
    return pairEnergy(this.spec, this.pair);
  }

  /**
   * Sorts each galaxy's stars: home if within 1.5 times its disc's outer
   * radius of its own centre; taken if not, but within that reach of the other
   * galaxy and bound to it; otherwise loose, in a tail or a bridge. (A
   * galaxy without a disc reaches as far as a disc of its size would.)
   */
  fates(): Fates {
    const fates: Fates = { A: [0, 0, 0], B: [0, 0, 0] };
    const g = this.spec.galaxies;
    const reach = g.map((x) => 1.5 * (x.disc?.outer ?? 20 * (x.scale / 6)));
    const p = this.pair.x;
    const q = this.pair.v;
    const { x, v, owner } = this.stars;
    for (let i = 0; i < owner.length; i++) {
      const own = owner[i];
      const other = 1 - own;
      const tally = own === 0 ? fates.A : fates.B;
      const rOwn = Math.hypot(x[3 * i] - p[3 * own], x[3 * i + 1] - p[3 * own + 1], x[3 * i + 2] - p[3 * own + 2]);
      if (rOwn <= reach[own]) {
        tally[0]++;
        continue;
      }
      const rOther = Math.hypot(x[3 * i] - p[3 * other], x[3 * i + 1] - p[3 * other + 1], x[3 * i + 2] - p[3 * other + 2]);
      if (rOther <= reach[other] && specificEnergy(x, v, i, p, q, other, g[other]) < 0) tally[1]++;
      else tally[2]++;
    }
    return fates;
  }
}

function specificEnergy(x: Float64Array, v: Float64Array, i: number, p: Float64Array, q: Float64Array, k: number, g: GalaxySpec): number {
  const dx = x[3 * i] - p[3 * k];
  const dy = x[3 * i + 1] - p[3 * k + 1];
  const dz = x[3 * i + 2] - p[3 * k + 2];
  const ux = v[3 * i] - q[3 * k];
  const uy = v[3 * i + 1] - q[3 * k + 1];
  const uz = v[3 * i + 2] - q[3 * k + 2];
  return 0.5 * (ux * ux + uy * uy + uz * uz) + plummerPotential(Math.sqrt(dx * dx + dy * dy + dz * dz), g.mass, g.scale);
}

// ---------- reading a disc ----------

export interface RingReading {
  /** The ring's radius, kpc (0 if there is none). */
  radius: number;
  /** Its surface density over the lowest between it and the core. */
  contrast: number;
  /** The share of 16 slices of angle round the centre where the ring is at least half its mean. */
  coverage: number;
}

/**
 * How ring-like one galaxy's own stars are now. Their distances from its
 * centre, projected on its starting disc's plane, are binned in steps of a
 * twentieth of the disc's outer radius out to 2.5 times it, and the surface
 * densities smoothed over three bins. The ring is the highest local maximum
 * beyond 1.5 Plummer scales; its contrast is its density over the lowest
 * between it and one scale from the centre, and its coverage says whether it
 * goes all the way round. A ring galaxy’s expanding wave is 60% denser than
 * the gap behind it, or more, all round.
 */
export function ringReading(enc: GalaxyEncounter, k: 0 | 1): RingReading {
  const g = enc.spec.galaxies[k];
  const disc = g.disc;
  const none = { radius: 0, contrast: 1, coverage: 0 };
  if (!disc) return none;
  const [e1, e2] = planeBasis(disc.axis);
  const width = disc.outer / 20;
  const BINS = 50;
  const counts = new Float64Array(BINS);
  const { x, owner } = enc.stars;
  const c = enc.pair.x;
  const r = new Float64Array(owner.length).fill(-1);
  const phi = new Float64Array(owner.length);
  for (let i = 0; i < owner.length; i++) {
    if (owner[i] !== k) continue;
    const dx = x[3 * i] - c[3 * k];
    const dy = x[3 * i + 1] - c[3 * k + 1];
    const dz = x[3 * i + 2] - c[3 * k + 2];
    const u = dx * e1[0] + dy * e1[1] + dz * e1[2];
    const w = dx * e2[0] + dy * e2[1] + dz * e2[2];
    r[i] = Math.hypot(u, w);
    phi[i] = Math.atan2(w, u);
    const j = Math.floor(r[i] / width);
    if (j < BINS) counts[j]++;
  }
  const raw = Array.from(counts, (n, j) => n / (Math.PI * width * width * (2 * j + 1)));
  const density = raw.map((d, j) => (j === 0 || j === BINS - 1 ? d : (raw[j - 1] + 2 * d + raw[j + 1]) / 4));
  const first = Math.ceil((1.5 * g.scale) / width);
  const inner = Math.ceil(g.scale / width);
  let ring = -1;
  for (let j = Math.max(first, 1); j < BINS - 1; j++) {
    if (density[j] > density[j - 1] && density[j] >= density[j + 1] && (ring < 0 || density[j] > density[ring])) ring = j;
  }
  if (ring < 0) return none;
  let low = Infinity;
  for (let j = inner; j < ring; j++) low = Math.min(low, density[j]);
  if (!Number.isFinite(low) || low <= 0) return none;
  const SLICES = 16;
  const slices = new Float64Array(SLICES);
  const r0 = (ring - 1) * width;
  const r1 = (ring + 2) * width;
  for (let i = 0; i < r.length; i++) {
    if (r[i] >= r0 && r[i] < r1) slices[Math.min(SLICES - 1, Math.floor(((phi[i] + Math.PI) / (2 * Math.PI)) * SLICES))]++;
  }
  const mean = slices.reduce((s, n) => s + n, 0) / SLICES;
  const coverage = mean > 0 ? slices.filter((n) => n >= 0.5 * mean).length / SLICES : 0;
  return { radius: (ring + 0.5) * width, contrast: density[ring] / low, coverage };
}

/** A ring galaxy, by `ringReading`: a wave three-fifths denser than the gap behind it, round at least three-quarters of the way. */
export function isRing(reading: RingReading): boolean {
  return reading.contrast >= 1.6 && reading.coverage >= 0.75;
}
