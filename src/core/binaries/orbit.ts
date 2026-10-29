import { G, GM_SUN, M_SUN, R_SUN } from '../constants';
import { eccentricAnomaly, trueAnomalyFromEccentric } from '../ephemeris/kepler';
import { DEG, SECONDS_PER_DAY } from '../units';

/**
 * Two stars in orbit round their balance point: where each is, as seen from
 * above the orbit and from Earth, and how fast each moves towards or away
 * from us. Kepler's third law with both masses, a³ = (M₁ + M₂) P², gives the
 * orbit's size; each star's share of it goes inversely with its mass.
 *
 * Units: masses in solar masses, the period in days, sizes in solar radii,
 * speeds in km/s, angles in degrees. Phase is the fraction of an orbit since
 * periastron (the closest approach), so it sets the mean anomaly.
 *
 * Conventions are the spectroscopists': z points away from us, so a positive
 * radial velocity is a star moving away; i = 90° is edge-on; ω is the
 * argument of periastron of the first star's orbit, measured from the
 * ascending node, where that star crosses the sky's plane moving away.
 */

export interface BinaryOrbit {
  /** Masses, M☉. */
  m1: number;
  m2: number;
  /** Period, days. */
  period: number;
  e: number;
  /** Inclination, degrees: 0 face-on, 90 edge-on. */
  i: number;
  /** Argument of periastron of star 1, degrees. */
  omega: number;
  /** Position angle of the line of nodes on the sky, degrees from north through east; only turns the picture. */
  node?: number;
  /** The pair's own speed away from us (systemic velocity), km/s. */
  gamma?: number;
}

/** The relative orbit's semi-major axis (R☉) from the total mass (M☉) and period (days), by Newton's form of Kepler's third law: a³ = G M P² / 4π². */
export function semiMajorAxis(totalMass: number, periodDays: number): number {
  const P = periodDays * SECONDS_PER_DAY;
  return Math.cbrt((GM_SUN * totalMass * P * P) / (4 * Math.PI * Math.PI)) / R_SUN;
}

/** The total mass (M☉) from the relative orbit's semi-major axis (AU) and period (years): M₁ + M₂ = a³ / P², the form in solar units (exact to 1 part in 20,000). */
export function totalMass(aAu: number, periodYears: number): number {
  return aAu ** 3 / (periodYears * periodYears);
}

/** Each star's velocity semi-amplitude K (km/s): how far its radial velocity swings either side of the pair's. */
export function semiAmplitudes(orbit: BinaryOrbit): { k1: number; k2: number } {
  const a = semiMajorAxis(orbit.m1 + orbit.m2, orbit.period) * R_SUN; // metres
  const P = orbit.period * SECONDS_PER_DAY;
  const factor = (2 * Math.PI * Math.sin(orbit.i * DEG)) / (P * Math.sqrt(1 - orbit.e * orbit.e)) / 1000;
  const a1 = (a * orbit.m2) / (orbit.m1 + orbit.m2);
  const a2 = (a * orbit.m1) / (orbit.m1 + orbit.m2);
  return { k1: factor * a1, k2: factor * a2 };
}

export interface BinaryState {
  /** True anomaly, radians. */
  nu: number;
  /** Separation of the stars, R☉. */
  separation: number;
  /** Each star's place relative to the balance point, R☉: x along the line of nodes, y across it in the orbit's plane (seen from above). */
  above: [{ x: number; y: number }, { x: number; y: number }];
  /** Each star's place as seen from Earth, R☉: x along the line of nodes, y across it on the sky, z away from us. */
  sky: [{ x: number; y: number; z: number }, { x: number; y: number; z: number }];
  /** Radial velocities, km/s, positive moving away. */
  v1: number;
  v2: number;
  /** The stars' separation on the sky, R☉: when it is less than the sum of their radii, one eclipses the other. */
  projected: number;
  /** Which star is nearer to us, 1 or 2. */
  front: 1 | 2;
}

/** Where both stars are, and how they move along the line of sight, at a phase (fraction of an orbit since periastron). */
export function binaryState(orbit: BinaryOrbit, phase: number): BinaryState {
  const { e } = orbit;
  const M = 2 * Math.PI * (phase - Math.floor(phase));
  const nu = trueAnomalyFromEccentric(eccentricAnomaly(M, e), e);
  const a = semiMajorAxis(orbit.m1 + orbit.m2, orbit.period);
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  const q1 = orbit.m2 / (orbit.m1 + orbit.m2);
  const q2 = orbit.m1 / (orbit.m1 + orbit.m2);
  const u = nu + orbit.omega * DEG; // argument of latitude of star 1
  const inc = orbit.i * DEG;
  // Star 1's orbit about the balance point; star 2 is always opposite.
  const x1 = r * q1 * Math.cos(u);
  const y1 = r * q1 * Math.sin(u);
  const sky1 = { x: x1, y: y1 * Math.cos(inc), z: y1 * Math.sin(inc) };
  const sky2 = { x: (-x1 * q2) / q1, y: (-sky1.y * q2) / q1, z: (-sky1.z * q2) / q1 };
  const { k1, k2 } = semiAmplitudes(orbit);
  const shape = Math.cos(u) + e * Math.cos(orbit.omega * DEG);
  const gamma = orbit.gamma ?? 0;
  return {
    nu,
    separation: r,
    above: [
      { x: x1, y: y1 },
      { x: (-x1 * q2) / q1, y: (-y1 * q2) / q1 },
    ],
    sky: [sky1, sky2],
    v1: gamma + k1 * shape,
    v2: gamma - k2 * shape,
    projected: r * Math.sqrt(1 - (Math.sin(inc) * Math.sin(u)) ** 2),
    front: sky1.z < 0 ? 1 : 2,
  };
}

/**
 * The mass function f(M) = P K₁³ (1 − e²)^{3/2} / (2πG), M☉: from one star's
 * period (days) and velocity semi-amplitude (km/s) alone, it equals
 * M₂³ sin³i / (M₁ + M₂)², which is never more than the unseen companion's mass.
 */
export function massFunction(periodDays: number, k1: number, e = 0): number {
  const P = periodDays * SECONDS_PER_DAY;
  const K = k1 * 1000;
  return (P * K ** 3 * (1 - e * e) ** 1.5) / (2 * Math.PI * G) / M_SUN;
}

/** The companion's mass (M☉) given the mass function, the visible star's mass and the tilt (degrees): solves M₂³ sin³i / (M₁ + M₂)² = f. At i = 90° it is the smallest possible. */
export function companionMass(f: number, m1: number, iDegrees = 90): number {
  const s3 = Math.sin(iDegrees * DEG) ** 3;
  let lo = 0;
  let hi = 1;
  while ((hi ** 3 * s3) / (m1 + hi) ** 2 < f) hi *= 2;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if ((mid ** 3 * s3) / (m1 + mid) ** 2 < f) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Both stars' masses times sin³i (M☉), from the period (days), both
 * semi-amplitudes (km/s) and the eccentricity: M₁ sin³i = P K₂ (K₁ + K₂)² (1 − e²)^{3/2} / (2πG),
 * and the same with K₁ for M₂. A double-lined pair's velocities give these;
 * the tilt, from eclipses or the orbit on the sky, gives the masses.
 */
export function minimumMasses(periodDays: number, k1: number, k2: number, e = 0): { m1: number; m2: number } {
  const P = periodDays * SECONDS_PER_DAY;
  const sum = (k1 + k2) * 1000;
  const c = (P * sum * sum * (1 - e * e) ** 1.5) / (2 * Math.PI * G) / M_SUN;
  return { m1: c * k2 * 1000, m2: c * k1 * 1000 };
}

/** The tilts (degrees) at which a circular pair's stars, of radii R₁ and R₂ (R☉), just touch on the sky: eclipses happen when cos i < (R₁ + R₂)/a. */
export function eclipseLimit(orbit: BinaryOrbit, r1: number, r2: number): number {
  const a = semiMajorAxis(orbit.m1 + orbit.m2, orbit.period);
  const c = (r1 + r2) / a;
  return c >= 1 ? 0 : Math.acos(c) / DEG;
}
