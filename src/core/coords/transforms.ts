import { normalizeRadians, wrapPi } from '../math/angles';
import { polynomial } from '../math/poly';
import { julianCenturies } from '../time/julian';
import { ARCSEC } from '../units';

/**
 * Turning a direction on the sky from one coordinate system into another
 * (Meeus, Astronomical Algorithms, ch. 13). All angles are in radians.
 *
 * - Equatorial: right ascension and declination, fixed to the stars; the
 *   celestial equator lies above Earth's equator.
 * - Ecliptic: longitude and latitude, measured from the plane of Earth's orbit.
 * - Horizontal: azimuth and altitude in one observer's sky. Azimuth runs from
 *   north through east (0 = N, π/2 = E), as on a compass. (Meeus measures it from
 *   the south, so his azimuths are ours minus π.)
 *
 * The formulas work on unit vectors rather than tangents, so they stay exact at
 * the poles and the zenith.
 */

export interface Equatorial {
  /** Right ascension, [0, 2π). */
  ra: number;
  /** Declination, [−π/2, π/2]. */
  dec: number;
}

export interface Ecliptic {
  /** Ecliptic longitude, [0, 2π). */
  lon: number;
  /** Ecliptic latitude, [−π/2, π/2]. */
  lat: number;
}

export interface Horizontal {
  /** Azimuth from north through east, [0, 2π). */
  az: number;
  /** Altitude above the horizon, [−π/2, π/2]. */
  alt: number;
}

/** Laskar (1986), Meeus 22.3: the mean obliquity in arcseconds, as powers of U = T/100 (units of 10,000 Julian years). */
const LASKAR = [84_381.448, -4680.93, -1.55, 1999.25, -51.38, -249.67, -39.05, 7.12, 27.87, 5.79, 2.45];

/**
 * The mean obliquity of the ecliptic, the tilt of Earth's axis to its orbit, at
 * a Julian Date (TT). Radians. Laskar's formula, valid for 10,000 years either
 * side of 2000, by which time its error has grown to a few arcseconds. (Its
 * value for 2000 is the IAU 1976 one, 0.04″ above today's IAU 2006 value.)
 * Nutation, which adds up to 9″, is not included.
 */
export function meanObliquity(jdTT: number): number {
  return polynomial(julianCenturies(jdTT) / 100, LASKAR) * ARCSEC;
}

/** Ecliptic coordinates from equatorial ones, for an obliquity ε (radians). Meeus 13.1 and 13.2. */
export function eclipticFromEquatorial({ ra, dec }: Equatorial, obliquity: number): Ecliptic {
  const sinE = Math.sin(obliquity);
  const cosE = Math.cos(obliquity);
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  // Rotate about the line to the equinox (x) by −ε.
  const y2 = y * cosE + z * sinE;
  const z2 = z * cosE - y * sinE;
  return { lon: normalizeRadians(Math.atan2(y2, x)), lat: Math.atan2(z2, Math.hypot(x, y2)) };
}

/** Equatorial coordinates from ecliptic ones, for an obliquity ε (radians). Meeus 13.3 and 13.4. */
export function equatorialFromEcliptic({ lon, lat }: Ecliptic, obliquity: number): Equatorial {
  const sinE = Math.sin(obliquity);
  const cosE = Math.cos(obliquity);
  const x = Math.cos(lat) * Math.cos(lon);
  const y = Math.cos(lat) * Math.sin(lon);
  const z = Math.sin(lat);
  // Rotate about the line to the equinox (x) by +ε.
  const y2 = y * cosE - z * sinE;
  const z2 = z * cosE + y * sinE;
  return { ra: normalizeRadians(Math.atan2(y2, x)), dec: Math.atan2(z2, Math.hypot(x, y2)) };
}

/**
 * Where a direction appears in an observer's sky (Meeus 13.5 and 13.6).
 * lst is the local sidereal time and latitude the observer's, both radians.
 * The result is geometric: no refraction.
 */
export function horizontalFromEquatorial({ ra, dec }: Equatorial, lst: number, latitude: number): Horizontal {
  const h = lst - ra; // the hour angle: how far the star has turned west past the meridian
  const sinPhi = Math.sin(latitude);
  const cosPhi = Math.cos(latitude);
  // The star as a unit vector in the frame of the celestial pole and the meridian…
  const x = Math.cos(dec) * Math.cos(h);
  const y = -Math.cos(dec) * Math.sin(h);
  const z = Math.sin(dec);
  // …and in the observer's frame: the pole stands at altitude φ due north.
  const north = cosPhi * z - sinPhi * x;
  const up = sinPhi * z + cosPhi * x;
  return { az: normalizeRadians(Math.atan2(y, north)), alt: Math.atan2(up, Math.hypot(north, y)) };
}

/** The equatorial coordinates of a point in an observer's sky: the inverse of horizontalFromEquatorial. Radians. */
export function equatorialFromHorizontal({ az, alt }: Horizontal, lst: number, latitude: number): Equatorial {
  const sinPhi = Math.sin(latitude);
  const cosPhi = Math.cos(latitude);
  const north = Math.cos(alt) * Math.cos(az);
  const east = Math.cos(alt) * Math.sin(az);
  const up = Math.sin(alt);
  const x = cosPhi * up - sinPhi * north;
  const z = sinPhi * up + cosPhi * north;
  const h = Math.atan2(-east, x);
  return { ra: normalizeRadians(lst - h), dec: Math.atan2(z, Math.hypot(x, east)) };
}

/** The hour angle of a direction: how far it has turned west past the meridian, in (−π, π]. lst and ra in radians. */
export function hourAngle(lst: number, ra: number): number {
  return wrapPi(lst - ra);
}
