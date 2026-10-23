import { cross, normalize, angleBetween, type Mat3, type Vec3 } from '../math/vec3';
import { julianEpoch } from '../time/julian';
import { ARCSEC } from '../units';

/**
 * Precession: the slow turning of Earth's axis, which carries the celestial
 * poles round a circle of about 23.4° radius in about 25,800 years, and drags
 * the equinox (the zero point of right ascension) backwards along the
 * ecliptic.
 *
 * The expressions are Vondrák, Capitaine & Wallace (2011), "New precession
 * expressions, valid for long time intervals", A&A 534, A22 (with the erratum,
 * A&A 541, C1), as coded in ERFA's eraLtpecl, eraLtpequ and eraLtp. They follow
 * the poles of the ecliptic and of the equator for ±200,000 years from 2000,
 * and match the IAU 2006 precession to a few milliarcseconds near the present.
 *
 * Vectors are in the J2000 mean equatorial frame: x towards the J2000 equinox,
 * z towards the J2000 north celestial pole. Times are Julian Dates (TT).
 */

/** The obliquity at J2000.0 used to set up the ecliptic frame, radians (84,381.406″). */
const EPS0 = 84_381.406 * ARCSEC;

/** Ecliptic pole: P_A and Q_A polynomials (arcseconds, in centuries from J2000)… */
const PQ_POLY = [
  [5851.607687, -0.1189, -0.00028913, 0.000000101],
  [-1600.8863, 1.1689818, -0.0000002, -0.000000437],
] as const;

/** …and periodic terms: period (centuries), then cos P, cos Q, sin P, sin Q amplitudes (arcseconds). */
const PQ_PERIODIC = [
  [708.15, -5486.751211, -684.66156, 667.66673, -5523.863691],
  [2309.0, -17.127623, 2446.28388, -2354.886252, -549.74745],
  [1620.0, -617.517403, 399.671049, -428.152441, -310.998056],
  [492.2, 413.44294, -356.652376, 376.202861, 421.535876],
  [1183.0, 78.614193, -186.387003, 184.778874, -36.776172],
  [622.0, -180.732815, -316.80007, 335.321713, -145.278396],
  [882.0, -87.676083, 198.296701, -185.138669, -34.74445],
  [547.0, 46.140315, 101.135679, -120.97283, 22.885731],
] as const;

/** Equator pole: X and Y polynomials (arcseconds)… */
const XY_POLY = [
  [5453.282155, 0.4252841, -0.00037173, -0.000000152],
  [-73750.93035, -0.7675452, -0.00018725, 0.000000231],
] as const;

/** …and periodic terms: period (centuries), then cos X, cos Y, sin X, sin Y amplitudes (arcseconds). */
const XY_PERIODIC = [
  [256.75, -819.940624, 75004.344875, 81491.287984, 1558.515853],
  [708.15, -8444.676815, 624.033993, 787.163481, 7774.939698],
  [274.2, 2600.009459, 1251.136893, 1251.296102, -2219.534038],
  [241.45, 2755.17563, -1102.212834, -1257.950837, -2523.969396],
  [2309.0, -167.659835, -2660.66498, -2966.79973, 247.850422],
  [492.2, 871.855056, 699.291817, 639.744522, -846.485643],
  [396.1, 44.769698, 153.16722, 131.600209, -1393.124055],
  [288.9, -512.313065, -950.865637, -445.040117, 368.526116],
  [231.1, -819.415595, 499.754645, 584.522874, 749.045012],
  [1610.0, -538.071099, -145.18821, -89.756563, 444.704518],
  [620.0, -189.793622, 558.116553, 524.42963, 235.934465],
  [157.87, -402.922932, -23.923029, -13.549067, 374.049623],
  [220.3, 179.516345, -165.405086, -210.157124, -171.33018],
  [1200.0, -9.814756, 9.344131, -44.919798, -22.899655],
] as const;

/** Sums the periodic and polynomial parts of a pair of series at t centuries from J2000. Arcseconds. */
function series(t: number, poly: readonly (readonly number[])[], periodic: readonly (readonly number[])[]): [number, number] {
  let a = 0;
  let b = 0;
  const w = 2 * Math.PI * t;
  for (const [period, cosA, cosB, sinA, sinB] of periodic) {
    const angle = w / period;
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    a += c * cosA + s * sinA;
    b += c * cosB + s * sinB;
  }
  let power = 1;
  for (let i = 0; i < poly[0].length; i++) {
    a += poly[0][i] * power;
    b += poly[1][i] * power;
    power *= t;
  }
  return [a, b];
}

/** Centuries from J2000 for a Julian Date (TT), measured in Julian epochs as ERFA does. */
function centuries(jdTT: number): number {
  return (julianEpoch(jdTT) - 2000) / 100;
}

/** The mean ecliptic pole of date, as a unit vector in the J2000 equatorial frame (Vondrák et al. 2011, eraLtpecl). */
export function eclipticPole(jdTT: number): Vec3 {
  const [P, Q] = series(centuries(jdTT), PQ_POLY, PQ_PERIODIC);
  const p = P * ARCSEC;
  const q = Q * ARCSEC;
  const w = Math.sqrt(Math.max(0, 1 - p * p - q * q));
  const s = Math.sin(EPS0);
  const c = Math.cos(EPS0);
  return [p, -q * c - w * s, -q * s + w * c];
}

/** The mean north celestial pole of date, as a unit vector in the J2000 equatorial frame (Vondrák et al. 2011, eraLtpequ). */
export function equatorPole(jdTT: number): Vec3 {
  const [X, Y] = series(centuries(jdTT), XY_POLY, XY_PERIODIC);
  const x = X * ARCSEC;
  const y = Y * ARCSEC;
  return [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))];
}

/**
 * The precession matrix: it turns a direction in the J2000 mean equatorial
 * frame into the mean equator and equinox of date, as P·v (eraLtp). Its rows
 * are the equinox of date, the 90° point on the equator of date, and the
 * pole of date, all in J2000 coordinates.
 */
export function precessionMatrix(jdTT: number): Mat3 {
  const pole = equatorPole(jdTT);
  const equinox = normalize(cross(pole, eclipticPole(jdTT)));
  return [equinox, cross(pole, equinox), pole];
}

/**
 * The matrix that turns a direction in the J2000 mean equatorial frame into
 * ecliptic coordinates of date (the mean ecliptic and equinox of date). Its
 * rows are the equinox of date, the 90° point on the ecliptic of date, and the
 * ecliptic pole of date. Its transpose turns ecliptic coordinates of date back
 * into J2000 equatorial ones.
 */
export function eclipticMatrix(jdTT: number): Mat3 {
  const pole = eclipticPole(jdTT);
  const equinox = normalize(cross(equatorPole(jdTT), pole));
  return [equinox, cross(pole, equinox), pole];
}

/** The mean obliquity of date from the same model: the angle between the poles of the equator and the ecliptic. Radians. */
export function precessionObliquity(jdTT: number): number {
  return angleBetween(equatorPole(jdTT), eclipticPole(jdTT));
}
