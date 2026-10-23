import { normalizeRadians } from '../math/angles';
import { polynomial } from '../math/poly';
import { julianCenturies } from '../time/julian';
import { DEG } from '../units';

/**
 * The Sun's position seen from Earth, from Meeus, Astronomical Algorithms
 * (2nd ed.), ch. 25, "low accuracy": a Keplerian orbit with the main
 * perturbations folded into the equation of the centre. It is good to about
 * 0.01° near the present.
 */

export interface SunPosition {
  /** Geometric ecliptic longitude, referred to the mean equinox of date (Meeus's ☉): radians, [0, 2π). */
  lon: number;
  /** Distance from Earth's centre: AU. */
  distance: number;
  /** Mean anomaly: radians. */
  meanAnomaly: number;
  /** Eccentricity of Earth's orbit. */
  eccentricity: number;
}

/**
 * The Sun's geocentric position at a Julian Date (TT): its geometric ("true")
 * longitude in the ecliptic of date, and its distance. The latitude is within
 * 1.2″ of zero and taken as zero. No aberration or nutation (for the apparent
 * position, subtract 20.5″ of aberration and add the nutation in longitude).
 */
export function sunPosition(jdTT: number): SunPosition {
  const T = julianCenturies(jdTT);
  const L0 = polynomial(T, [280.46646, 36000.76983, 0.0003032]);
  const M = polynomial(T, [357.52911, 35999.05029, -0.0001537]);
  const e = polynomial(T, [0.016708634, -0.000042037, -0.0000001267]);
  const m = M * DEG;
  const C =
    polynomial(T, [1.914602, -0.004817, -0.000014]) * Math.sin(m) +
    polynomial(T, [0.019993, -0.000101]) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);
  const nu = (M + C) * DEG;
  return {
    lon: normalizeRadians((L0 + C) * DEG),
    distance: (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(nu)),
    meanAnomaly: normalizeRadians(m),
    eccentricity: e,
  };
}
