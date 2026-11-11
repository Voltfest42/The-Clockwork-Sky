/**
 * Roche geometry: two stars on a circular orbit, seen in the frame that turns
 * with them (Roche 1849; Kopal 1959). Gas there feels both stars' pulls and the
 * centrifugal push, which together make the Roche potential
 *
 *   Φ = −G M₁/r₁ − G M₂/r₂ − ½ ω² (x² + y²),
 *
 * a landscape with a hollow round each star and a pass between them at L1. The
 * deepest closed surface round each star, through L1, is its Roche lobe.
 *
 * Units, unless a function says otherwise: the separation is 1, G(M₁ + M₂) = 1
 * and ω = 1, so the orbit takes 2π. The frame's origin is the centre of mass;
 * star 1 (the donor in Chapter 28's figures) is at x = −μ and star 2 at
 * x = 1 − μ, where μ = M₂/(M₁ + M₂); +y is the direction star 2 moves in, and
 * the pair turns about +z.
 */
import { bisect } from '../math/roots';
import { solveAdaptive } from '../structure/ode';

/**
 * The radius of the sphere with the same volume as a star's Roche lobe, as a fraction of the separation, for mass
 * ratio q = M_star / M_companion (Eggleton 1983, ApJ 268, 368; good to 1% for any q). BSE's rl.f.
 */
export function rocheLobe(q: number): number {
  const p = q ** (1 / 3);
  return (0.49 * p * p) / (0.6 * p * p + Math.log(1 + p));
}

/** μ, star 2's share of the mass, from q = M₁/M₂ (donor over accretor, as BSE's q for the donor). */
export const muOf = (q: number) => 1 / (1 + q);

/** The Roche potential at (x, y, z) (units: G(M₁ + M₂)/a). */
export function rochePotential(x: number, y: number, z: number, mu: number): number {
  const r1 = Math.hypot(x + mu, y, z);
  const r2 = Math.hypot(x - (1 - mu), y, z);
  return -(1 - mu) / r1 - mu / r2 - 0.5 * (x * x + y * y);
}

/** The force per unit mass in the orbital plane, −∇Φ, without the Coriolis term. */
export function rocheForce(x: number, y: number, mu: number): [number, number] {
  const dx1 = x + mu;
  const dx2 = x - (1 - mu);
  const r1 = Math.hypot(dx1, y);
  const r2 = Math.hypot(dx2, y);
  const a1 = (1 - mu) / r1 ** 3;
  const a2 = mu / r2 ** 3;
  return [x - a1 * dx1 - a2 * dx2, y - a1 * y - a2 * y];
}

export interface RochePoint {
  name: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  x: number;
  y: number;
  /** The potential there. */
  phi: number;
}

/**
 * The five Lagrange points for any μ in (0, 1): L1 between the stars, L2 beyond the lighter one, L3 beyond the
 * heavier, L4 ahead of star 2 and L5 behind it. The collinear points are where the pull along the axis vanishes,
 * found by bisection between the stars and outside them.
 */
export function lagrangePoints(mu: number): RochePoint[] {
  if (!(mu > 0 && mu < 1)) throw new RangeError('μ must lie between 0 and 1.');
  const x1 = -mu;
  const x2 = 1 - mu;
  const fx = (x: number) => rocheForce(x, 0, mu)[0];
  const eps = 1e-9;
  const l1 = bisect(fx, x1 + eps, x2 - eps, 1e-15);
  const beyond2 = bisect(fx, x2 + eps, x2 + 2, 1e-15);
  const beyond1 = bisect(fx, x1 - 2, x1 - eps, 1e-15);
  // L2 lies behind the lighter star
  const [l2, l3] = mu <= 0.5 ? [beyond2, beyond1] : [beyond1, beyond2];
  const p = (name: RochePoint['name'], x: number, y: number): RochePoint => ({ name, x, y, phi: rochePotential(x, y, 0, mu) });
  return [p('L1', l1, 0), p('L2', l2, 0), p('L3', l3, 0), p('L4', 0.5 - mu, Math.sqrt(3) / 2), p('L5', 0.5 - mu, -Math.sqrt(3) / 2)];
}

/** The potential of a star's Roche lobe: L1's. */
export const criticalPotential = (mu: number) => lagrangePoints(mu)[0].phi;

/**
 * The potential of a star's surface that reaches a fraction `fill` of the way from its centre to L1 along the axis
 * (fill = 1 is the Roche lobe): a star swelling inside its lobe keeps to these equipotentials.
 */
export function fillPotential(mu: number, fill: number, star: 1 | 2 = 1): number {
  const l1 = lagrangePoints(mu)[0].x;
  const centre = star === 1 ? -mu : 1 - mu;
  return rochePotential(centre + fill * (l1 - centre), 0, 0, mu);
}

/**
 * The distance from a star's centre to the surface of potential `phi` along the unit direction (dx, dy, dz): the
 * first point outward where Φ reaches phi. Infinity if it never does within the separation.
 */
export function surfaceRadius(mu: number, star: 1 | 2, phi: number, dx: number, dy: number, dz: number): number {
  const cx = star === 1 ? -mu : 1 - mu;
  const at = (r: number) => rochePotential(cx + r * dx, r * dy, r * dz, mu) - phi;
  const n = 600;
  let r0 = 1e-6;
  for (let k = 1; k <= n; k++) {
    const r = (k / n) * 1.2;
    if (at(r) >= 0) return bisect(at, r0, r, 1e-13);
    r0 = r;
  }
  return Infinity;
}

/**
 * The volume-equivalent radius of a star's Roche lobe, as a fraction of the separation, by integrating the lobe's
 * volume over directions (Gauss–Legendre in cos θ, even steps in φ): what Eggleton's formula fits.
 */
export function lobeRadiusNumerical(mu: number, star: 1 | 2 = 1, nTheta = 24, nPhi = 48): number {
  const phi = criticalPotential(mu);
  const [nodes, weights] = gaussLegendre(nTheta);
  let volume = 0;
  for (let i = 0; i < nTheta; i++) {
    const ct = nodes[i];
    const st = Math.sqrt(1 - ct * ct);
    for (let j = 0; j < nPhi; j++) {
      const az = ((j + 0.5) / nPhi) * 2 * Math.PI;
      // Measured from the axis through both stars, so the narrow neck at L1 lies between rays, not on one
      const r = surfaceRadius(mu, star, phi, ct, st * Math.cos(az), st * Math.sin(az));
      volume += (weights[i] * (2 * Math.PI) / nPhi) * (r ** 3 / 3);
    }
  }
  return Math.cbrt((3 * volume) / (4 * Math.PI));
}

/** Gauss–Legendre nodes and weights on (−1, 1), by Newton's method on Legendre polynomials. */
function gaussLegendre(n: number): [number[], number[]] {
  const x: number[] = [];
  const w: number[] = [];
  for (let i = 1; i <= n; i++) {
    let z = Math.cos((Math.PI * (i - 0.25)) / (n + 0.5));
    let dp = 0;
    for (let k = 0; k < 100; k++) {
      let p0 = 1;
      let p1 = z;
      for (let m = 2; m <= n; m++) [p0, p1] = [p1, ((2 * m - 1) * z * p1 - (m - 1) * p0) / m];
      dp = (n * (z * p1 - p0)) / (z * z - 1);
      const dz = p1 / dp;
      z -= dz;
      if (Math.abs(dz) < 1e-15) break;
    }
    x.push(z);
    w.push(2 / ((1 - z * z) * dp * dp));
  }
  return [x, w];
}

/** One point of the stream: position and velocity in the turning frame, and the time (orbits are 2π). */
export interface StreamPoint {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Stream {
  points: StreamPoint[];
  /** Its closest approach to the accretor's centre (separations). */
  rMin: number;
  /** Whether it hit the accretor before getting round it. */
  hits: boolean;
  /** The radius of the circle with the stream's angular momentum about the accretor: where a disc forms (separations). */
  rCirc: number;
}

/**
 * Gas spilling from star 1 through L1 towards star 2 (radius r2, in separations), followed as ballistic particles in
 * the turning frame, where the Coriolis force swings the stream round (Lubow & Shu 1975): it leaves L1 at the speed
 * v0 (orbital units: a thousandth of the orbital speed is near the gas's sound speed in a typical pair). The stream is
 * followed until it hits the accretor, or past its closest approach and halfway round again.
 */
export function l1Stream(mu: number, r2: number, v0 = 0.001): Stream {
  const l1 = lagrangePoints(mu)[0].x;
  const x2 = 1 - mu;
  const toward = Math.sign(x2 - l1);
  const start = [l1 + toward * 1e-4, 0, toward * v0, 0];
  const points: StreamPoint[] = [];
  let rMin = Infinity;
  let hits = false;
  let turned = false;
  let h = 0;
  let passedAngle = 0;
  let lastAngle = Math.atan2(0, start[0] - x2);
  solveAdaptive(
    (_t, s, d) => {
      const [fx, fy] = rocheForce(s[0], s[1], mu);
      d[0] = s[2];
      d[1] = s[3];
      d[2] = fx + 2 * s[3];
      d[3] = fy - 2 * s[2];
    },
    0,
    start,
    4 * Math.PI,
    {
      rtol: 1e-10,
      atol: 1e-13,
      hMax: 0.01,
      emit: ({ x: t, y: s }) => {
        points.push({ t, x: s[0], y: s[1], vx: s[2], vy: s[3] });
      },
      stop: (_t, s) => {
        const dx = s[0] - x2;
        const dy = s[1];
        const r = Math.hypot(dx, dy);
        if (r <= r2) {
          hits = true;
          return true;
        }
        if (!turned) {
          if (r < rMin) {
            rMin = r;
            // Angular momentum about the accretor, per unit mass, in the inertial frame
            h = dx * (s[3] + dx) - dy * (s[2] - dy);
          } else if (rMin < Infinity) {
            // Past the first closest approach, which is the one that counts
            turned = true;
          }
        }
        const angle = Math.atan2(dy, dx);
        let step = angle - lastAngle;
        if (step > Math.PI) step -= 2 * Math.PI;
        if (step < -Math.PI) step += 2 * Math.PI;
        passedAngle += step;
        lastAngle = angle;
        // Past the closest approach, and about one and a half turns round the accretor
        return turned && Math.abs(passedAngle) > 3 * Math.PI;
      },
    },
  );
  return { points, rMin, hits, rCirc: (h * h) / mu };
}

/**
 * The closest approach of the stream to the accretor, as a fraction of the separation, by Ulrich & Burger's (1976)
 * fit to Lubow & Shu's (1974) streams, as BSE uses it: qa = M_accretor/M_donor.
 */
export const streamRMinFit = (qa: number) => 0.0425 * (qa * (1 + qa)) ** (1 / 4);

/** How the orbit responds to mass transfer, for Figure 28.2. */
export interface TransferPoint {
  /** The donor's and accretor's masses (M☉). */
  m1: number;
  m2: number;
  /** The separation and period, as multiples of the starting ones. */
  a: number;
  p: number;
  /** Both Roche lobes, as multiples of the starting separation. */
  rl1: number;
  rl2: number;
}

/**
 * The orbit as the donor (starting at m1, M☉) gives mass to the accretor (m2): the accretor keeps a fraction beta of
 * what it is given, and the rest leaves the pair carrying the accretor's specific orbital angular momentum
 * ("isotropic re-emission"). With beta = 1 (conservative) J = M₁M₂√(Ga/M) is fixed, so a ∝ (M₁M₂)⁻²: smallest at
 * equal masses. Otherwise dJ/J = (1 − β) dM₁ M₁/(M M₂), stepped in small amounts of the donor's mass, until it is
 * down to `down` M☉.
 */
export function transferTrack(m1: number, m2: number, beta: number, down: number, n = 400): TransferPoint[] {
  const a0 = 1;
  const p0 = 1;
  let lnJ = 0;
  let M1 = m1;
  let M2 = m2;
  const j0 = m1 * m2 * Math.sqrt(a0 / (m1 + m2));
  const out: TransferPoint[] = [];
  const dm = (m1 - down) / n;
  for (let k = 0; k <= n; k++) {
    const M = M1 + M2;
    const J = j0 * Math.exp(lnJ);
    const a = (J / (M1 * M2)) ** 2 * M;
    const p = p0 * Math.sqrt(a ** 3 / M) / Math.sqrt(a0 ** 3 / (m1 + m2));
    out.push({ m1: M1, m2: M2, a, p, rl1: a * rocheLobe(M1 / M2), rl2: a * rocheLobe(M2 / M1) });
    if (k === n) break;
    // A midpoint step in the donor's mass
    const step = (m1s: number, m2s: number) => ((1 - beta) * -dm * m1s) / ((m1s + m2s) * m2s);
    lnJ += step(M1 - dm / 2, M2 + (beta * dm) / 2);
    M1 -= dm;
    M2 += beta * dm;
  }
  return out;
}
