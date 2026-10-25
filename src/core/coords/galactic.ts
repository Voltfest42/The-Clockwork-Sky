import { normalizeRadians } from '../math/angles';
import { apply, transpose, type Mat3, type Vec3 } from '../math/vec3';
import type { Equatorial } from './transforms';

/**
 * Galactic coordinates: longitude l and latitude b, measured from the plane of
 * the Milky Way. l = 0 points at the Galaxy's centre (in Sagittarius) and b = 90°
 * at the north galactic pole (in Coma Berenices). All angles are in radians.
 */
export interface Galactic {
  /** Galactic longitude, [0, 2π). */
  lon: number;
  /** Galactic latitude, [−π/2, π/2]. */
  lat: number;
}

/**
 * The rotation from equatorial (ICRS, which matches J2000 to well under an
 * arcsecond) to galactic axes, as defined for the Hipparcos catalogue (ESA
 * 1997, vol. 1, §1.5.3, matrix A_G′). Its rows are the galactic x (towards the
 * centre), y (towards l = 90°) and z (towards the north galactic pole) axes,
 * written in equatorial coordinates.
 */
const EQUATORIAL_TO_GALACTIC: Mat3 = [
  [-0.054_875_560_4, -0.873_437_090_2, -0.483_835_015_5],
  [0.494_109_427_9, -0.444_829_630_0, 0.746_982_244_5],
  [-0.867_666_149_0, -0.198_076_373_4, 0.455_983_776_2],
];

/** Galactic coordinates from equatorial ones (J2000 / ICRS right ascension and declination). */
export function galacticFromEquatorial({ ra, dec }: Equatorial): Galactic {
  const cosDec = Math.cos(dec);
  const [x, y, z] = apply(EQUATORIAL_TO_GALACTIC, [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)]);
  return { lon: normalizeRadians(Math.atan2(y, x)), lat: Math.atan2(z, Math.hypot(x, y)) };
}

/** A direction or position in equatorial axes (ICRS / J2000: x towards RA 0h, z towards the north celestial pole) turned into galactic axes (x towards the Galaxy's centre, z towards the north galactic pole). Same units. */
export function galacticFromEquatorialVector(v: Vec3): Vec3 {
  return apply(EQUATORIAL_TO_GALACTIC, v);
}

/** A direction or position in galactic axes turned into equatorial ones (the inverse turn). Same units. */
export function equatorialFromGalacticVector(v: Vec3): Vec3 {
  return apply(transpose(EQUATORIAL_TO_GALACTIC), v);
}
