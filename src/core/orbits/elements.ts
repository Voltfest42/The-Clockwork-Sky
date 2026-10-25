import { cross, dot, norm, type Vec3 } from '../math/vec3';
import { eccentricAnomaly, hyperbolicAnomaly } from '../ephemeris/kepler';

/**
 * Orbital elements and state vectors: the six numbers that describe a Kepler
 * orbit, and the position and velocity they correspond to, both ways.
 *
 * Units are the caller's: μ = G(M + m) in L³/T², lengths in L, velocities in
 * L/T, angles in radians, times in T. The reference plane is the x–y plane
 * (the ecliptic, for the Solar System), and angles are measured from +x.
 */

export interface Elements {
  /** Semi-major axis, L; negative for a hyperbola. */
  a: number;
  /** Eccentricity: 0 a circle, below 1 an ellipse, above 1 a hyperbola. */
  e: number;
  /** Inclination to the x–y plane, 0 to π. */
  i: number;
  /** Longitude of the ascending node, from +x. */
  node: number;
  /** Argument of periapsis, from the node. */
  peri: number;
  /** Mean anomaly. */
  M: number;
}

export interface OrbitState extends Elements {
  /** True anomaly. */
  nu: number;
  /** Period, T; Infinity when unbound. */
  period: number;
  /** Distance, L, and speed, L/T. */
  r: number;
  speed: number;
}

const TWO_PI = 2 * Math.PI;
const wrap = (angle: number) => ((angle % TWO_PI) + TWO_PI) % TWO_PI;

/**
 * The elements of the orbit through position r (L) with velocity v (L/T)
 * about a centre of attraction μ. Angles that aren't defined (the node of an
 * orbit in the reference plane, the periapsis of a circle) are set to 0 and the
 * others measured from +x instead, so the position always comes back.
 */
export function elementsFromState(mu: number, r: Vec3, v: Vec3): OrbitState {
  const rr = norm(r);
  const speed = norm(v);
  const h = cross(r, v);
  const hh = norm(h);
  const energy = (speed * speed) / 2 - mu / rr;
  const a = -mu / (2 * energy);
  // The eccentricity vector points at periapsis.
  const rv = dot(r, v);
  const ev: Vec3 = [
    ((speed * speed - mu / rr) * r[0] - rv * v[0]) / mu,
    ((speed * speed - mu / rr) * r[1] - rv * v[1]) / mu,
    ((speed * speed - mu / rr) * r[2] - rv * v[2]) / mu,
  ];
  const e = norm(ev);
  const i = hh > 0 ? Math.acos(Math.max(-1, Math.min(1, h[2] / hh))) : 0;
  // The node line, z × h.
  const n: Vec3 = [-h[1], h[0], 0];
  const nn = norm(n);
  const flat = nn <= 1e-12 * hh;
  const node = flat ? 0 : wrap(Math.atan2(n[1], n[0]));
  const round = e < 1e-10;
  // The angle of a vector in the orbit's plane, from the node (or +x).
  const inPlane = (u: Vec3) => {
    if (flat) {
      const angle = Math.atan2(u[1], u[0]);
      return wrap(h[2] >= 0 ? angle : -angle);
    }
    const cosA = dot(n, u) / (nn * norm(u));
    const angle = Math.acos(Math.max(-1, Math.min(1, cosA)));
    return u[2] >= 0 ? angle : TWO_PI - angle;
  };
  const peri = round ? 0 : inPlane(ev);
  const nu = wrap(inPlane(r) - peri);
  let M: number;
  if (e < 1) {
    const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
    M = wrap(E - e * Math.sin(E));
  } else {
    const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
    M = e * Math.sinh(F) - F;
  }
  const period = a > 0 ? TWO_PI * Math.sqrt((a * a * a) / mu) : Infinity;
  return { a, e, i, node, peri, M, nu, period, r: rr, speed };
}

/** The position (L) and velocity (L/T) on an orbit with these elements, about μ. */
export function stateFromElements(mu: number, el: Elements): { x: Vec3; v: Vec3 } {
  const { a, e, i, node, peri, M } = el;
  let nu: number;
  if (e < 1) {
    const E = eccentricAnomaly(wrap(M), e);
    nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  } else {
    const F = hyperbolicAnomaly(M, e);
    nu = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(F / 2));
  }
  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(nu));
  const k = Math.sqrt(mu / p);
  // In the orbit's plane, periapsis along +x.
  const px = r * Math.cos(nu);
  const py = r * Math.sin(nu);
  const vx = -k * Math.sin(nu);
  const vy = k * (e + Math.cos(nu));
  const [cO, sO, cw, sw, ci, si] = [Math.cos(node), Math.sin(node), Math.cos(peri), Math.sin(peri), Math.cos(i), Math.sin(i)];
  // Rotate by the argument of periapsis, the inclination and the node.
  const rot = (x: number, y: number): Vec3 => [
    (cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y,
    (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y,
    sw * si * x + cw * si * y,
  ];
  return { x: rot(px, py), v: rot(vx, vy) };
}
