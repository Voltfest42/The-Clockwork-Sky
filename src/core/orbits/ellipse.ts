import { eccentricAnomaly, trueAnomalyFromEccentric } from '../ephemeris/kepler';

/**
 * Kepler orbits as ellipses: the shape, where the body is at a given time, the
 * area its line to the Sun sweeps, and its speed. The Sun (or whatever is
 * orbited) sits at one focus, at the origin, with perihelion on the +x axis.
 *
 * Lengths are in whatever unit `a` is given in (metres at module boundaries,
 * AU where a function says so); angles are radians; GM is m³/s² with lengths
 * in metres.
 */

export interface Ellipse {
  /** Semi-major axis: half the longest diameter, the average of the nearest and farthest distances. */
  a: number;
  /** Eccentricity, 0 (a circle) to just under 1. */
  e: number;
}

/** Half the shortest diameter. */
export function semiMinorAxis({ a, e }: Ellipse): number {
  return a * Math.sqrt(1 - e * e);
}

/** How far each focus is from the centre: the Sun sits this far from the middle of the orbit. */
export function focusOffset({ a, e }: Ellipse): number {
  return a * e;
}

/** The nearest and farthest distances from the Sun: perihelion and aphelion. */
export function apsides({ a, e }: Ellipse): { perihelion: number; aphelion: number } {
  return { perihelion: a * (1 - e), aphelion: a * (1 + e) };
}

/** The distance from the Sun at a true anomaly ν (the angle from perihelion, seen from the Sun). */
export function radiusAt({ a, e }: Ellipse, nu: number): number {
  return (a * (1 - e * e)) / (1 + e * Math.cos(nu));
}

/** The whole area inside the orbit. */
export function ellipseArea(orbit: Ellipse): number {
  return Math.PI * orbit.a * semiMinorAxis(orbit);
}

export interface OrbitPoint {
  x: number;
  y: number;
  /** Distance from the Sun. */
  r: number;
  /** True anomaly, radians. */
  nu: number;
  /** Eccentric anomaly, radians. */
  E: number;
}

/** Where the body is for a mean anomaly M (radians, a steady measure of time: 2π per orbit), with the Sun at the origin. */
export function pointAtMeanAnomaly(orbit: Ellipse, M: number): OrbitPoint {
  const { a, e } = orbit;
  const E = eccentricAnomaly(M, e);
  const x = a * (Math.cos(E) - e);
  const y = semiMinorAxis(orbit) * Math.sin(E);
  return { x, y, r: Math.hypot(x, y), nu: trueAnomalyFromEccentric(E, e), E };
}

/** A point on the orbit at a true anomaly ν, with the Sun at the origin. */
export function pointAtTrueAnomaly(orbit: Ellipse, nu: number): { x: number; y: number } {
  const r = radiusAt(orbit, nu);
  return { x: r * Math.cos(nu), y: r * Math.sin(nu) };
}

/**
 * The area swept by the line from the Sun between two mean anomalies: Kepler's
 * second law says it grows in step with time, so it is the whole area times
 * the fraction of the orbit's time that has passed.
 */
export function areaSwept(orbit: Ellipse, M1: number, M2: number): number {
  return ((M2 - M1) / (2 * Math.PI)) * ellipseArea(orbit);
}

/**
 * The same area worked out the slow way, independent of Kepler's second law:
 * adding up thin triangles from the Sun (½ r² dν) between the two points.
 * Used to check the law.
 */
export function areaSweptByIntegration(orbit: Ellipse, M1: number, M2: number, steps = 2000): number {
  const nu1 = pointAtMeanAnomaly(orbit, M1).nu;
  let nu2 = pointAtMeanAnomaly(orbit, M2).nu;
  while (nu2 < nu1) nu2 += 2 * Math.PI;
  // Simpson's rule on ½ r(ν)².
  const n = steps % 2 === 0 ? steps : steps + 1;
  const h = (nu2 - nu1) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    sum += w * 0.5 * radiusAt(orbit, nu1 + i * h) ** 2;
  }
  return (sum * h) / 3;
}

/** The speed at a distance r from the Sun on an orbit of semi-major axis a (the vis-viva equation): m/s for GM in m³/s² and lengths in metres. */
export function orbitalSpeed(GM: number, r: number, a: number): number {
  return Math.sqrt(GM * (2 / r - 1 / a));
}

/** An orbit's period from its semi-major axis, by Kepler's third law around the Sun: years for a in AU. */
export function periodYears(aAu: number): number {
  return aAu ** 1.5;
}

/** The semi-major axis that gives a period, by Kepler's third law around the Sun: AU for a period in years. */
export function semiMajorAxisAu(periodYrs: number): number {
  return periodYrs ** (2 / 3);
}

/** An orbit's period from its semi-major axis and the mass it circles (Newton's form of the third law): seconds for metres and m³/s². */
export function periodSeconds(GM: number, a: number): number {
  return 2 * Math.PI * Math.sqrt((a * a * a) / GM);
}

/** Points round the whole orbit, evenly spaced in eccentric anomaly, for drawing. */
export function orbitOutline(orbit: Ellipse, n = 180): { x: number; y: number }[] {
  const b = semiMinorAxis(orbit);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const E = (2 * Math.PI * i) / n;
    out.push({ x: orbit.a * (Math.cos(E) - orbit.e), y: b * Math.sin(E) });
  }
  return out;
}
