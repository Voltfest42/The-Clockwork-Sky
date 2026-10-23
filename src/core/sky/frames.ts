import { eclipticMatrix, precessionMatrix } from '../coords/precession';
import { apply, multiply, rotationX, rotationZ, transpose, type Mat3, type Vec3 } from '../math/vec3';
import { utFromTt } from '../time/deltaT';
import { julianEpoch } from '../time/julian';
import { localSiderealTime } from '../time/sidereal';
import { J2000_OBLIQUITY } from '../ephemeris/planets';

/**
 * The frames the sky view draws in. Everything is computed in the J2000
 * equatorial frame and turned into the view's "local" frame with one matrix:
 * east–north–up for the view from the ground, or a frame fixed to the stars
 * for charts. Angles in radians; times are Julian Dates (TT).
 */

/** Where the observer stands. */
export interface Place {
  /** Geographic latitude, north positive: radians. */
  latitude: number;
  /** Geographic longitude, east positive: radians. */
  longitude: number;
}

/**
 * The matrix from the mean equator and equinox of date to the observer's
 * east–north–up frame, for a local sidereal time and a latitude (radians).
 * A star's azimuth is then atan2(east, north) and its altitude asin(up).
 */
export function horizonMatrix(lst: number, latitude: number): Mat3 {
  const s = Math.sin(latitude);
  const c = Math.cos(latitude);
  // First turn the sky so the meridian lies along x (the hour-angle frame, with y pointing east)…
  const toHourAngle = rotationZ(-lst);
  // …then tip the pole down to altitude φ above the north point.
  const tip: Mat3 = [
    [0, 1, 0],
    [-s, 0, c],
    [c, 0, s],
  ];
  return multiply(tip, toHourAngle);
}

export interface SkyFrames {
  /** J2000 equatorial → local (east, north, up). */
  fromJ2000: Mat3;
  /** Mean equator and equinox of date → local. */
  fromEquatorOfDate: Mat3;
  /** Mean ecliptic and equinox of date → local. */
  fromEclipticOfDate: Mat3;
  /** Local mean sidereal time: radians. */
  lst: number;
  /** The Julian epoch (years) for the stars' positions. */
  epoch: number;
}

/** The frames for an observer at a place and a moment (Julian Date, TT). The sky turns with UT, found from ΔT. */
export function horizonFrames(jdTT: number, place: Place): SkyFrames {
  const lst = localSiderealTime(utFromTt(jdTT), place.longitude);
  const H = horizonMatrix(lst, place.latitude);
  const P = precessionMatrix(jdTT);
  const fromJ2000 = multiply(H, P);
  return {
    fromJ2000,
    fromEquatorOfDate: H,
    fromEclipticOfDate: multiply(fromJ2000, transpose(eclipticMatrix(jdTT))),
    lst,
    epoch: julianEpoch(jdTT),
  };
}

/**
 * Frames for a chart fixed to the J2000 ecliptic: the stars stay put, apart
 * from their own motions, while the poles of date move among them. The local
 * frame's z axis is the ecliptic's north pole.
 */
export function eclipticChartFrames(jdTT: number): SkyFrames {
  const fromJ2000 = rotationX(-J2000_OBLIQUITY);
  return {
    fromJ2000,
    fromEquatorOfDate: multiply(fromJ2000, transpose(precessionMatrix(jdTT))),
    fromEclipticOfDate: multiply(fromJ2000, transpose(eclipticMatrix(jdTT))),
    lst: 0,
    epoch: julianEpoch(jdTT),
  };
}

/** A J2000 direction in the local frame. */
export function toLocal(frames: SkyFrames, v: Vec3): Vec3 {
  return apply(frames.fromJ2000, v);
}
