/**
 * How gravitational waves bring a pair of compact stars together, to leading
 * order (Peters & Mathews 1963; Peters 1964): the separation and eccentricity
 * shrink as the waves carry energy and angular momentum away. Also the
 * orbital period's decay, which the Hulse–Taylor pulsar confirmed, and the
 * advance of periastron (first post-Newtonian order). SI units: masses in kg,
 * separations in m, times in s, angles in radians.
 */
import { C, G } from '../constants';

/**
 * The time to merge from a circular orbit of separation a: T = (5/256) c⁵ a⁴ / (G³ m₁ m₂ (m₁ + m₂)). For an
 * eccentric orbit this is multiplied by (1 − e²)^(7/2), a fit good to a few per cent for e below about 0.8 that
 * merges eccentric orbits faster, as Peters' full integral (`petersTrack`) does.
 */
export function mergerTime(m1: number, m2: number, a: number, e = 0): number {
  const circular = ((5 / 256) * C ** 5 * a ** 4) / (G ** 3 * m1 * m2 * (m1 + m2));
  return circular * (1 - e * e) ** 3.5;
}

/** Peters' enhancement factor f(e) = (1 + 73e²/24 + 37e⁴/96) / (1 − e²)^(7/2): how much faster an eccentric orbit radiates energy than a circular one of the same size. */
export function enhancement(e: number): number {
  const e2 = e * e;
  return (1 + (73 / 24) * e2 + (37 / 96) * e2 * e2) / (1 - e2) ** 3.5;
}

/** Peters' rates for an orbit of separation a (semi-major axis, m) and eccentricity e: da/dt (m/s) and de/dt (1/s), both negative. */
export function petersRates(m1: number, m2: number, a: number, e: number): { dadt: number; dedt: number } {
  const k = (G ** 3 * m1 * m2 * (m1 + m2)) / C ** 5;
  const e2 = e * e;
  const dadt = (((-64 / 5) * k) / (a ** 3 * (1 - e2) ** 3.5)) * (1 + (73 / 24) * e2 + (37 / 96) * e2 * e2);
  const dedt = (((-304 / 15) * k * e) / (a ** 4 * (1 - e2) ** 2.5)) * (1 + (121 / 304) * e2);
  return { dadt, dedt };
}

/** The separation (semi-major axis) for a period P (s) and total mass M (kg), by Kepler's third law, m. */
export function separationFor(M: number, P: number): number {
  return Math.cbrt((G * M * P * P) / (4 * Math.PI * Math.PI));
}

/** The period for a separation a (m) and total mass M (kg), s. */
export function periodFor(M: number, a: number): number {
  return 2 * Math.PI * Math.sqrt(a ** 3 / (G * M));
}

/** The power radiated in gravitational waves by the orbit, W: (32/5) G⁴ m₁² m₂² M / (c⁵ a⁵) × f(e). */
export function wavePower(m1: number, m2: number, a: number, e = 0): number {
  return ((32 / 5) * G ** 4 * (m1 * m2) ** 2 * (m1 + m2) * enhancement(e)) / (C ** 5 * a ** 5);
}

/**
 * The orbital period's decay Ṗ_b (s/s, negative) for a period P_b (s), as written for pulsar timing (Taylor &
 * Weisberg 1982): Ṗ_b = −(192π G^(5/3) / 5c⁵) (P_b/2π)^(−5/3) f(e) m₁ m₂ / M^(1/3).
 */
export function periodDecay(m1: number, m2: number, Pb: number, e: number): number {
  return ((-192 * Math.PI * G ** (5 / 3)) / (5 * C ** 5)) * (Pb / (2 * Math.PI)) ** (-5 / 3) * enhancement(e) * m1 * m2 * (m1 + m2) ** (-1 / 3);
}

/** The advance of periastron, rad/s, to first post-Newtonian order: ω̇ = 3 (2π/P_b)^(5/3) (GM/c³)^(2/3) / (1 − e²). */
export function periastronAdvance(M: number, Pb: number, e: number): number {
  return (3 * (2 * Math.PI / Pb) ** (5 / 3) * ((G * M) / C ** 3) ** (2 / 3)) / (1 - e * e);
}

/**
 * The cumulative shift of the time of periastron after time t (s) for a period decaying steadily at Ṗ_b: each orbit
 * comes a little sooner than the last, and the shortfall adds up as ½ (Ṗ_b / P_b) t², s (negative: earlier).
 * This is the curve Taylor and Weisberg plotted for PSR B1913+16.
 */
export function periastronShift(Pb: number, Pbdot: number, t: number): number {
  return (0.5 * Pbdot * t * t) / Pb;
}

/**
 * Peters' constant of the motion: along the track, a(1 − e²) / [e^(12/19) (1 + 121e²/304)^(870/2299)] stays the
 * same (Peters 1964, eq. 5.11), m. Undefined for a circular orbit, which stays circular.
 */
export function petersConstant(a: number, e: number): number {
  return (a * (1 - e * e)) / (e ** (12 / 19) * (1 + (121 / 304) * e * e) ** (870 / 2299));
}

export interface TrackPoint {
  /** Time since the start, s. */
  t: number;
  /** Separation (semi-major axis), m. */
  a: number;
  e: number;
  /** Orbital period, s. */
  P: number;
}

export interface PetersTrack {
  points: TrackPoint[];
  /** When they merge, s from the start (the separation reaching zero; the last few Schwarzschild radii take no time to speak of). */
  mergeAt: number;
}

/**
 * Peters' equations stepped from (a₀, e₀) inward: the time and eccentricity as functions of x = ln a, by classical
 * Runge–Kutta in `steps` equal steps of ln a down to `aEnd` (default: a ten-thousandth of a₀, or three times the
 * Schwarzschild radius of the total mass if that is larger). The time left from there is the circular formula's,
 * since the orbit has rounded off by then.
 */
export function petersTrack(m1: number, m2: number, a0: number, e0: number, steps = 600, aEnd?: number): PetersTrack {
  const M = m1 + m2;
  const end = aEnd ?? Math.max(a0 * 1e-4, (6 * G * M) / C ** 2);
  const x0 = Math.log(a0);
  const x1 = Math.log(end);
  const h = (x1 - x0) / steps;
  // dt/dx = a / (da/dt); de/dx = a (de/dt) / (da/dt)
  const deriv = (x: number, e: number): [number, number] => {
    const a = Math.exp(x);
    const r = petersRates(m1, m2, a, Math.max(0, e));
    return [a / r.dadt, (a * r.dedt) / r.dadt];
  };
  let t = 0;
  let e = e0;
  const points: TrackPoint[] = [{ t: 0, a: a0, e: e0, P: periodFor(M, a0) }];
  for (let i = 0; i < steps; i++) {
    const x = x0 + i * h;
    const [t1, e1] = deriv(x, e);
    const [t2, e2] = deriv(x + h / 2, e + (h / 2) * e1);
    const [t3, e3] = deriv(x + h / 2, e + (h / 2) * e2);
    const [t4, e4] = deriv(x + h, e + h * e3);
    t += (h / 6) * (t1 + 2 * t2 + 2 * t3 + t4);
    e = Math.max(0, e + (h / 6) * (e1 + 2 * e2 + 2 * e3 + e4));
    const a = Math.exp(x + h);
    points.push({ t, a, e, P: periodFor(M, a) });
  }
  const mergeAt = t + mergerTime(m1, m2, end, e);
  return { points, mergeAt };
}

/** The state of a track at time t (s from its start), interpolated in ln a, and the time left; past the merger it is the last point. */
export function trackAt(track: PetersTrack, t: number): TrackPoint & { left: number } {
  const pts = track.points;
  if (t <= 0) return { ...pts[0], left: track.mergeAt };
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].t >= t) {
      const f = (t - pts[i - 1].t) / (pts[i].t - pts[i - 1].t);
      const a = Math.exp(Math.log(pts[i - 1].a) + f * (Math.log(pts[i].a) - Math.log(pts[i - 1].a)));
      const e = pts[i - 1].e + f * (pts[i].e - pts[i - 1].e);
      const P = Math.exp(Math.log(pts[i - 1].P) + f * (Math.log(pts[i].P) - Math.log(pts[i - 1].P)));
      return { t, a, e, P, left: track.mergeAt - t };
    }
  }
  const last = pts[pts.length - 1];
  return { ...last, t, left: Math.max(0, track.mergeAt - t) };
}
