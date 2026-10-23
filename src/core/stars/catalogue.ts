import { ARCSEC, DEG } from '../units';

/**
 * The naked-eye star catalogue (from the HYG database; see
 * src/data/hyg/stars.json) in a form the sky view can use quickly: typed
 * arrays in SI-style units, brightest star first.
 *
 * Positions are ICRS (within 0.02″ of the J2000 mean equator and equinox) at
 * epoch J2000.0; stars move from there with their measured space motions
 * (motion.ts).
 */

/** The compact file written by scripts/build-stars.ts. */
export interface RawStarFile {
  epoch: number;
  count: number;
  ra: number[];
  dec: number[];
  pmra: number[];
  pmdec: number[];
  plx: number[];
  rv: number[];
  mag: number[];
  ci: (number | null)[];
  hip: number[];
  names: [number, string][];
  designations: [number, string, string][];
}

export interface StarCatalogue {
  count: number;
  /** Right ascension and declination at J2000.0: radians. */
  ra: Float64Array;
  dec: Float64Array;
  /** Proper motion in right ascension (times cos dec) and declination: radians per Julian year. */
  pmra: Float64Array;
  pmdec: Float64Array;
  /** Parallax: radians (0 where unknown). */
  parallax: Float64Array;
  /** Radial velocity: km/s, positive receding (0 where unknown). */
  rv: Float64Array;
  /** Visual magnitude. */
  mag: Float32Array;
  /** B−V colour index, magnitudes (NaN where unknown). */
  bv: Float32Array;
  /** Hipparcos number (0 for none). */
  hip: Int32Array;
  /** Proper names by star index: "Sirius". */
  names: ReadonlyMap<number, string>;
  /** Bayer or Flamsteed designations by star index: { letter: "α", constellation: "CMa" }. */
  designations: ReadonlyMap<number, { letter: string; constellation: string }>;
}

/** Unpacks the compact file into typed arrays. */
export function parseStarCatalogue(raw: RawStarFile): StarCatalogue {
  const n = raw.count;
  const cat: StarCatalogue = {
    count: n,
    ra: new Float64Array(n),
    dec: new Float64Array(n),
    pmra: new Float64Array(n),
    pmdec: new Float64Array(n),
    parallax: new Float64Array(n),
    rv: new Float64Array(n),
    mag: new Float32Array(n),
    bv: new Float32Array(n),
    hip: new Int32Array(n),
    names: new Map(raw.names),
    designations: new Map(raw.designations.map(([i, letter, constellation]) => [i, { letter, constellation }])),
  };
  const mas = ARCSEC / 1000;
  for (let i = 0; i < n; i++) {
    cat.ra[i] = (raw.ra[i] / 1e4) * DEG;
    cat.dec[i] = (raw.dec[i] / 1e4) * DEG;
    cat.pmra[i] = raw.pmra[i] * mas;
    cat.pmdec[i] = raw.pmdec[i] * mas;
    cat.parallax[i] = (raw.plx[i] / 10) * mas;
    cat.rv[i] = raw.rv[i];
    cat.mag[i] = raw.mag[i] / 100;
    const ci = raw.ci[i];
    cat.bv[i] = ci === null ? NaN : ci / 1000;
    cat.hip[i] = raw.hip[i];
  }
  return cat;
}

/** The index of the star with a Hipparcos number, or −1. */
export function findHip(cat: StarCatalogue, hip: number): number {
  return cat.hip.indexOf(hip);
}

/** The index of the star with a proper name (case-insensitive), or −1. */
export function findStarByName(cat: StarCatalogue, name: string): number {
  const wanted = name.toLowerCase();
  for (const [i, n] of cat.names) if (n.toLowerCase() === wanted) return i;
  return -1;
}

/** How many stars are at least as bright as a magnitude (the catalogue is sorted brightest first). */
export function countBrighterThan(cat: StarCatalogue, magnitude: number): number {
  let lo = 0;
  let hi = cat.count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cat.mag[mid] <= magnitude) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
