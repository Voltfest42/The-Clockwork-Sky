import { PARSEC, SECONDS_PER_JULIAN_YEAR } from '../units';
import type { StarCatalogue } from './catalogue';

/**
 * Stars' own motions. Each star drifts across the sky with its proper motion,
 * and those with a known distance and radial velocity are moved in a straight
 * line through space, which also brings them closer or takes them farther
 * away (so a star approaching us speeds up across the sky and brightens).
 * Over the 26,000 years of one precession cycle the fastest bright stars move
 * by degrees: Arcturus by about 16°.
 *
 * Straight-line motion ignores the stars' curved paths round the Galaxy, which
 * matters only over much longer times. Directions are unit vectors in the
 * J2000 equatorial frame; times are Julian epochs (2000.0 = J2000).
 */

/** One km/s in parsecs per Julian year (about 1.0227 × 10⁻⁶). */
const KMS_IN_PC_PER_YEAR = (1000 * SECONDS_PER_JULIAN_YEAR) / PARSEC;

export interface StarPositions {
  /** The Julian epoch these positions are for. */
  epoch: number;
  /** Unit vectors, x, y, z for each star in turn (J2000 equatorial frame). */
  xyz: Float64Array;
  /** Visual magnitudes at that epoch, changed by the stars' changing distances. */
  mag: Float32Array;
}

/**
 * Where one star is at an epoch, starting from its J2000.0 position. Angles in
 * radians, proper motions in radians per year (pmra including cos dec),
 * parallax in radians (0 if unknown), radial velocity in km/s, epoch in Julian
 * years. Returns the unit direction and the distance as a multiple of the
 * star's J2000.0 distance (1 if the distance is unknown).
 */
export function starAt(
  ra: number,
  dec: number,
  pmra: number,
  pmdec: number,
  parallax: number,
  rv: number,
  epoch: number,
): { x: number; y: number; z: number; distanceRatio: number } {
  const t = epoch - 2000;
  const cr = Math.cos(ra);
  const sr = Math.sin(ra);
  const cd = Math.cos(dec);
  const sd = Math.sin(dec);
  // The star's direction, and the two directions on the sky: east (increasing ra) and north.
  const ux = cd * cr;
  const uy = cd * sr;
  const uz = sd;
  const ex = -sr;
  const ey = cr;
  const nx = -sd * cr;
  const ny = -sd * sr;
  const nz = cd;
  // Motion per year, in units of the star's distance: across the sky (radians a year) and along the line of sight.
  const radial = parallax > 0 ? rv * KMS_IN_PC_PER_YEAR * (parallax * 206_264.806_247_096_36) : 0;
  const vx = pmra * ex + pmdec * nx + radial * ux;
  const vy = pmra * ey + pmdec * ny + radial * uy;
  const vz = pmdec * nz + radial * uz;
  const x = ux + vx * t;
  const y = uy + vy * t;
  const z = uz + vz * t;
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length, distanceRatio: parallax > 0 ? length : 1 };
}

/** Every star in the catalogue at a Julian epoch (years). */
export function starPositionsAt(cat: StarCatalogue, epoch: number): StarPositions {
  const xyz = new Float64Array(cat.count * 3);
  const mag = new Float32Array(cat.count);
  for (let i = 0; i < cat.count; i++) {
    const s = starAt(cat.ra[i], cat.dec[i], cat.pmra[i], cat.pmdec[i], cat.parallax[i], cat.rv[i], epoch);
    xyz[3 * i] = s.x;
    xyz[3 * i + 1] = s.y;
    xyz[3 * i + 2] = s.z;
    mag[i] = cat.mag[i] + 5 * Math.log10(s.distanceRatio);
  }
  return { epoch, xyz, mag };
}
