import { C, G } from '../constants';
import { cubicIntegral, ellipticK } from '../math/elliptic';

/**
 * Orbits and light round a black hole that doesn't spin: geodesics of
 * Schwarzschild's spacetime (1916).
 *
 * Units: G = M = c = 1, so distances are in GM/c² (1.48 km per solar mass;
 * the horizon is at r = 2), the angular momentum L per unit mass in GM/c, the
 * energy E per unit rest energy (1 for a body at rest far away), and proper
 * time τ in GM/c³ (4.93 µs per solar mass).
 *
 * With u = 1/r, a body's path obeys (du/dφ)² = F(u), with
 *
 *   F(u) = (E² − 1)/L² + 2u/L² − u² + 2u³   (relativity)
 *   F(u) = (E² − 1)/L² + 2u/L² − u²         (Newton, with the same E and L),
 *
 * so u″ = 1/L² − u + 3u² against Newton's 1/L² − u. The extra 2u³ is the
 * −L²/r³ term in the effective potential: it makes orbits precess and, close
 * in, pulls them in. Light obeys u″ = −u + 3u², with impact parameter b in
 * place of L and nothing like Newton's 1/L².
 */

export const HORIZON = 2;
export const PHOTON_SPHERE = 3;
export const ISCO = 6;
/** The impact parameter below which light is captured: √27, the shadow's radius. */
export const CAPTURE_IMPACT = Math.sqrt(27);

/** The effective potential (1 − 2/r)(1 + L²/r²): a body's E² must exceed it to be at r. */
export function effectivePotential(r: number, L: number): number {
  return (1 - 2 / r) * (1 + (L * L) / (r * r));
}

/** The same as an energy per unit mass, (V − 1)/2 = −1/r + L²/2r² − L²/r³, to set beside Newton's. */
export function potentialEnergy(r: number, L: number): number {
  return -1 / r + (L * L) / (2 * r * r) - (L * L) / r ** 3;
}

/** Newton's effective potential energy per unit mass: −1/r + L²/2r². */
export function newtonPotentialEnergy(r: number, L: number): number {
  return -1 / r + (L * L) / (2 * r * r);
}

/** Circular orbits for angular momentum L: the stable one (outer) and the unstable one (inner); none if L < √12. */
export function circularOrbits(L: number): { stable: number; unstable: number } | null {
  const L2 = L * L;
  if (L2 < 12 * (1 - 1e-12)) return null;
  const s = Math.sqrt(Math.max(0, 1 - 12 / L2));
  return { stable: (L2 / 2) * (1 + s), unstable: (L2 / 2) * (1 - s) };
}

/** The angular momentum and energy of the circular orbit at r (r > 3). */
export function circularOrbit(r: number): { L: number; E: number } {
  return { L: Math.sqrt((r * r) / (r - 3)), E: (r - 2) / Math.sqrt(r * (r - 3)) };
}

/** F(u) for a body (relativity, or Newton's with the same E and L). */
export function orbitF(u: number, E: number, L: number, newton = false): number {
  const L2 = L * L;
  return (E * E - 1) / L2 + (2 * u) / L2 - u * u + (newton ? 0 : 2 * u ** 3);
}

/** The roots of F(u) = 0 for u in (0, 1): where a body turns. Ascending in u (descending in r). */
export function turningPoints(E: number, L: number): number[] {
  const roots: number[] = [];
  const f = (u: number) => orbitF(u, E, L);
  const n = 4000;
  let prev = f(1e-9);
  for (let i = 1; i <= n; i++) {
    const u = (i / n) ** 2;
    const v = f(u);
    if (prev === 0 || prev * v < 0) {
      let a = ((i - 1) / n) ** 2;
      let b = u;
      let fa = prev;
      for (let k = 0; k < 80; k++) {
        const m = (a + b) / 2;
        const fm = f(m);
        if (fa * fm <= 0) b = m;
        else {
          a = m;
          fa = fm;
        }
      }
      roots.push((a + b) / 2);
    }
    prev = v;
  }
  return roots;
}

export type OrbitKind = 'bound' | 'circular' | 'plunge' | 'flyby' | 'captured';

export interface OrbitPoint {
  x: number;
  y: number;
  r: number;
  /** Proper time (relativity) or time (Newton) since the start, GM/c³. */
  t: number;
}

export interface Orbit {
  kind: OrbitKind;
  /** Where it starts, and its closest and furthest points (r), where they exist. */
  start: number;
  periapsis: number | null;
  apoapsis: number | null;
  points: OrbitPoint[];
  /** For a bound orbit: how far the closest point moves on each turn, exactly and by the weak-field rule 6π/p (radians). */
  precession: number | null;
  weakFieldPrecession: number | null;
  /** Ended at the horizon. */
  fellIn: boolean;
}

/** Classifies the orbit with energy E and angular momentum L, and where it starts. */
export function classify(E: number, L: number): { kind: OrbitKind; start: number; periapsis: number | null; apoapsis: number | null; roots: number[] } {
  const roots = turningPoints(E, L).filter((u) => u < 0.5 + 1e-9);
  const far = 400;
  // A circular orbit is a double root of F, which a search for sign changes can't see: test for it directly.
  const circles = circularOrbits(L);
  if (circles && E < 1) {
    const bottom = effectivePotential(circles.stable, L);
    if (Math.abs(E * E - bottom) <= 1e-9 * bottom) return { kind: 'circular', start: circles.stable, periapsis: circles.stable, apoapsis: circles.stable, roots };
  }
  if (E < 1) {
    if (roots.length >= 2) {
      const [ua, ub] = roots;
      const kind: OrbitKind = ub - ua < 1e-6 * ub ? 'circular' : 'bound';
      return { kind, start: 1 / ua, periapsis: 1 / ub, apoapsis: 1 / ua, roots };
    }
    // F(0) < 0 < F(½) = E²/L², so there is always at least one turning point: the plunge starts there.
    return { kind: 'plunge', start: 1 / roots[0], periapsis: null, apoapsis: 1 / roots[0], roots };
  }
  if (roots.length >= 1) return { kind: 'flyby', start: far, periapsis: 1 / roots[0], apoapsis: null, roots };
  return { kind: 'captured', start: far, periapsis: null, apoapsis: null, roots };
}

/** The exact precession per orbit of a bound orbit between u_a = 1/apoapsis and u_b = 1/periapsis: 4K(k)/√(2(u_c − u_a)) − 2π. */
export function precessionPerOrbit(periapsis: number, apoapsis: number): number {
  const ua = 1 / apoapsis;
  const ub = 1 / periapsis;
  const uc = 0.5 - ua - ub; // the three roots of 2u³ − u² + … sum to ½
  const k = Math.sqrt((ub - ua) / (uc - ua));
  return (4 * ellipticK(k)) / Math.sqrt(2 * (uc - ua)) - 2 * Math.PI;
}

/** The weak-field precession 6πGM/(c²a(1 − e²)) per orbit, from its closest and furthest points. */
export function weakFieldPrecession(periapsis: number, apoapsis: number): number {
  const p = (2 * periapsis * apoapsis) / (periapsis + apoapsis);
  return (6 * Math.PI) / p;
}

/** The energy and angular momentum of a bound orbit with these closest and furthest points (relativity). */
export function orbitWithTurningPoints(periapsis: number, apoapsis: number): { E: number; L: number } {
  // E² = V(r) at both turning points: solve for L², then E².
  const ra = apoapsis;
  const rp = periapsis;
  const L2 = (1 / rp - 1 / ra) / ((1 / (rp * rp) - 1 / (ra * ra)) / 2 - (1 / rp ** 3 - 1 / ra ** 3));
  const L = Math.sqrt(L2);
  return { L, E: Math.sqrt(effectivePotential(ra, L)) };
}

export interface TraceOptions {
  /** Newton's gravity, starting from the same point with the same speeds. */
  newton?: boolean;
  /** How many turns (in angle) to follow at most. */
  turns?: number;
  /** The step in angle, radians. */
  dphi?: number;
  /** Stop once the body gets further than this. */
  escape?: number;
}

/**
 * Follows a body with energy E and angular momentum L from its starting point
 * (the outer turning point of a bound or plunging orbit, or far away coming
 * in), by RK4 on u″ = 1/L² − u (+ 3u²) in the angle. Newton's version starts
 * from the same point with the same speeds.
 */
export function traceOrbit(E: number, L: number, options: TraceOptions = {}): Orbit {
  const { newton = false, turns = 6, dphi = 0.004, escape = 450 } = options;
  const c = classify(E, L);
  const u0 = 1 / c.start;
  // Coming in from far away, or starting at a turning point (moving sideways only).
  const v0 = c.kind === 'flyby' || c.kind === 'captured' ? Math.sqrt(Math.max(0, orbitF(u0, E, L))) : 0;
  const L2 = L * L;
  const acc = (u: number) => 1 / L2 - u + (newton ? 0 : 3 * u * u);
  let u = u0;
  let v = v0;
  let phi = 0;
  let t = 0;
  const points: OrbitPoint[] = [{ x: c.start, y: 0, r: c.start, t: 0 }];
  let fellIn = false;
  const maxPhi = 2 * Math.PI * turns;
  while (phi < maxPhi) {
    const h = u > 0.25 ? dphi / 4 : dphi;
    // RK4 on (u, v).
    const k1u = v;
    const k1v = acc(u);
    const k2u = v + 0.5 * h * k1v;
    const k2v = acc(u + 0.5 * h * k1u);
    const k3u = v + 0.5 * h * k2v;
    const k3v = acc(u + 0.5 * h * k2u);
    const k4u = v + h * k3v;
    const k4v = acc(u + h * k3u);
    const uNew = u + (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    v = v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    // dτ = r² dφ / L, by the midpoint.
    const um = (u + uNew) / 2;
    t += h / (L * Math.max(um, 1e-9) ** 2);
    u = uNew;
    phi += h;
    if (!newton && u >= 0.5) {
      // Stop at the horizon, on it.
      const r = 2;
      points.push({ x: r * Math.cos(phi), y: r * Math.sin(phi), r, t });
      fellIn = true;
      break;
    }
    if (u <= 0) break;
    const r = 1 / u;
    points.push({ x: r * Math.cos(phi), y: r * Math.sin(phi), r, t });
    // Only an unbound body escapes; a bound one (Newton's from the same start included) comes back.
    if (r > Math.max(escape, 1.5 * c.start) && v < 0) break;
  }
  const bound = c.kind === 'bound' && c.periapsis !== null && c.apoapsis !== null;
  return {
    kind: c.kind,
    start: c.start,
    periapsis: c.periapsis,
    apoapsis: c.apoapsis,
    points,
    precession: bound && !newton ? precessionPerOrbit(c.periapsis!, c.apoapsis!) : null,
    weakFieldPrecession: bound ? weakFieldPrecession(c.periapsis!, c.apoapsis!) : null,
    fellIn,
  };
}

// ---------- light ----------

/** The closest approach (r) of light with impact parameter b, or null if it is captured (b < √27). */
export function closestApproach(b: number): number | null {
  if (b <= CAPTURE_IMPACT) return null;
  // The smallest positive root of 2u³ − u² + 1/b² = 0 lies in (0, 1/3).
  let lo = 0;
  let hi = 1 / 3;
  const g = (u: number) => 2 * u ** 3 - u * u + 1 / (b * b);
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    if (g(m) > 0) lo = m;
    else hi = m;
  }
  return 1 / ((lo + hi) / 2);
}

/**
 * The exact deflection of light passing with impact parameter b > √27,
 * radians: 2∫₀^{u₀} du/√(2u³ − u² + 1/b²) − π, through Carlson's integral.
 */
export function deflection(b: number): number {
  const rmin = closestApproach(b);
  if (rmin === null) return Infinity;
  const u0 = 1 / rmin;
  // 2u³ − u² + 1/b² = 2(u − u₁)(u − u₀)(u − u₂), the roots summing to ½ and multiplying to −1/(2b²).
  const s = 0.5 - u0;
  const p = -1 / (2 * b * b) / u0;
  const disc = Math.sqrt(s * s - 4 * p);
  const u1 = (s - disc) / 2; // negative
  const u2 = (s + disc) / 2;
  return (2 / Math.SQRT2) * cubicIntegral(u1, u0, u2, 0, u0) - Math.PI;
}

/** The weak-field deflection 4GM/(c²b), radians. */
export function weakFieldDeflection(b: number): number {
  return 4 / b;
}

export interface Ray {
  points: { x: number; y: number }[];
  captured: boolean;
  /** Total turn of its direction, radians (Infinity if captured). */
  deflection: number;
  /** How many times it circled the hole (whole turns of angle round it). */
  loops: number;
}

/**
 * Traces a ray of light coming in from the left (x → −∞) at height b above the
 * hole's line, by RK4 on u″ = −u + 3u² in ψ, the angle swept since it came in.
 */
export function traceRay(b: number, options: { from?: number; to?: number; dpsi?: number } = {}): Ray {
  const { from = 60, to = 60, dpsi = 0.003 } = options;
  let u = 1 / Math.hypot(from, b);
  let psi = Math.atan2(b, from);
  let v = Math.sqrt(Math.max(0, 1 / (b * b) - u * u + 2 * u ** 3));
  const points: { x: number; y: number }[] = [];
  const at = () => {
    const phi = Math.PI - psi;
    return { x: Math.cos(phi) / u, y: Math.sin(phi) / u };
  };
  points.push(at());
  let captured = false;
  const acc = (w: number) => -w + 3 * w * w;
  for (let i = 0; i < 200_000; i++) {
    const h = u > 0.2 ? dpsi / 3 : dpsi;
    const k1u = v;
    const k1v = acc(u);
    const k2u = v + 0.5 * h * k1v;
    const k2v = acc(u + 0.5 * h * k1u);
    const k3u = v + 0.5 * h * k2v;
    const k3v = acc(u + 0.5 * h * k2u);
    const k4u = v + h * k3v;
    const k4v = acc(u + h * k3u);
    u = u + (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    v = v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    psi += h;
    if (u >= 0.5) {
      u = 0.5;
      points.push(at());
      captured = true;
      break;
    }
    if (u <= 1 / to) {
      points.push(at());
      break;
    }
    points.push(at());
    if (psi > 12 * Math.PI) break;
  }
  const exact = captured ? Infinity : deflection(b);
  return { points, captured, deflection: exact, loops: captured ? Math.max(0, Math.floor((psi - Math.PI) / (2 * Math.PI))) : Math.max(0, Math.floor(exact / (2 * Math.PI))) };
}

/** The angular diameter (radians) of a black hole's shadow, 2√27 GM/c²D, for a mass (kg) at a distance (m). */
export function shadowDiameter(massKg: number, distanceM: number): number {
  return (2 * CAPTURE_IMPACT * G * massKg) / (C * C * distanceM);
}
