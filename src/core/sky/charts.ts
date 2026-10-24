import { fromSpherical, type Vec3 } from '../math/vec3';
import { DEG } from '../units';

/**
 * The sky's chart work: constellation stick figures, names and IAU
 * boundaries, and the Milky Way (from d3-celestial; see
 * src/data/constellations.json and milkyway.json), unpacked into unit vectors
 * in the J2000 equatorial frame.
 */

export interface RawConstellationFile {
  names: { id: string; name: string; genitive: string; english: string; rank: number; label: [number, number] }[];
  figures: Record<string, (number | [number, number])[][]>;
  boundaries: Record<string, [number, number][][]>;
}

export interface RawMilkyWayFile {
  width: number;
  height: number;
  /** One digit per 1° cell, 0 (dark) to 9 (the brightest core), in rows of declination from −89.5° up, each from right ascension 0.5°. */
  levels: string;
}

/** A point on a stick figure: a star (by catalogue index, so it moves with the star) or a fixed direction. */
export type FigurePoint = { star: number } | { fixed: Vec3 };

export interface Constellation {
  id: string;
  name: string;
  genitive: string;
  english: string;
  /** 1 for the best-known constellations, 3 for the faintest. */
  rank: number;
  /** Where its name goes. */
  label: Vec3;
  /** Strokes of the stick figure. */
  strokes: FigurePoint[][];
  /** Closed boundary outlines. */
  boundaries: Vec3[][];
}

/** The Milky Way's brightness as a map in right ascension and declination (J2000), one value per degree. */
export interface MilkyWay {
  width: number;
  height: number;
  /** 0 (dark) to 9 (the brightest core). */
  values: Uint8Array;
}

const vec = ([raDeg, decDeg]: readonly [number, number]): Vec3 => fromSpherical(raDeg * DEG, decDeg * DEG);

/** Unpacks the constellation file. Serpens's two halves share a name and come out as one entry each. */
export function parseConstellations(raw: RawConstellationFile): Constellation[] {
  return raw.names.map((c) => ({
    id: c.id,
    name: c.name,
    genitive: c.genitive,
    english: c.english,
    rank: c.rank,
    label: vec(c.label),
    strokes: (raw.figures[c.id] ?? []).map((stroke) => stroke.map((p) => (typeof p === 'number' ? { star: p } : { fixed: vec(p) }))),
    boundaries: (raw.boundaries[c.id] ?? []).map((ring) => ring.map(vec)),
  }));
}

export function parseMilkyWay(raw: RawMilkyWayFile): MilkyWay {
  const values = new Uint8Array(raw.width * raw.height);
  for (let k = 0; k < values.length; k++) values[k] = raw.levels.charCodeAt(k) - 48;
  return { width: raw.width, height: raw.height, values };
}

/**
 * The Milky Way's brightness, 0 to 9, in a J2000 direction (x, y, z), blended
 * smoothly between the map's 1° cells. Called for every pixel of the glow, so
 * it avoids allocating anything.
 */
export function milkyWayAt(mw: MilkyWay, x: number, y: number, z: number): number {
  const w = mw.width;
  let ra = Math.atan2(y, x) * RAD_TO_DEG;
  if (ra < 0) ra += 360;
  const v = Math.asin(z > 1 ? 1 : z < -1 ? -1 : z) * RAD_TO_DEG + 89.5;
  const u = ra - 0.5;
  let i0 = Math.floor(u);
  const fu = u - i0;
  if (i0 < 0) i0 += w;
  const i1 = i0 + 1 === w ? 0 : i0 + 1;
  let j0 = Math.floor(v);
  if (j0 < 0) j0 = 0;
  if (j0 > mw.height - 2) j0 = mw.height - 2;
  let fv = v - j0;
  if (fv < 0) fv = 0;
  if (fv > 1) fv = 1;
  const values = mw.values;
  const row0 = j0 * w;
  const row1 = row0 + w;
  const bottom = values[row0 + i0] * (1 - fu) + values[row0 + i1] * fu;
  const top = values[row1 + i0] * (1 - fu) + values[row1 + i1] * fu;
  return bottom * (1 - fv) + top * fv;
}

const RAD_TO_DEG = 180 / Math.PI;

/** A boundary ring as right ascensions and declinations (radians), and whether it goes round the north celestial pole. */
interface Ring {
  ra: Float64Array;
  dec: Float64Array;
  aroundNorthPole: boolean;
  minDec: number;
  maxDec: number;
}

const ringCache = new WeakMap<Constellation, Ring[]>();

function ringsOf(c: Constellation): Ring[] {
  let rings = ringCache.get(c);
  if (rings) return rings;
  rings = c.boundaries.map((points) => {
    const ra = new Float64Array(points.length);
    const dec = new Float64Array(points.length);
    points.forEach((p, i) => {
      ra[i] = Math.atan2(p[1], p[0]);
      dec[i] = Math.asin(Math.max(-1, Math.min(1, p[2])));
    });
    // A ring round a pole turns through a full 360° of right ascension.
    let turn = 0;
    for (let i = 0; i < points.length; i++) turn += wrap(ra[(i + 1) % points.length] - ra[i]);
    const aroundPole = Math.abs(turn) > Math.PI;
    let minDec = Infinity;
    let maxDec = -Infinity;
    for (const d of dec) {
      minDec = Math.min(minDec, d);
      maxDec = Math.max(maxDec, d);
    }
    const north = aroundPole && maxDec > 0;
    const south = aroundPole && maxDec < 0;
    return { ra, dec, aroundNorthPole: north, minDec: south ? -Math.PI / 2 : minDec, maxDec: north ? Math.PI / 2 : maxDec };
  });
  ringCache.set(c, rings);
  return rings;
}

function wrap(angle: number): number {
  return angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
}

/** Whether a direction (right ascension and declination, radians) is inside a boundary ring. */
function insideRing(ring: Ring, ra0: number, dec0: number): boolean {
  if (dec0 < ring.minDec || (dec0 > ring.maxDec && !ring.aroundNorthPole)) return false;
  // Count where the ring crosses the meridian from the point up to the north pole.
  let crossings = 0;
  const n = ring.ra.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const d1 = wrap(ring.ra[i] - ra0);
    const d2 = wrap(ring.ra[j] - ra0);
    if (d1 < 0 === d2 < 0 || Math.abs(d2 - d1) > Math.PI) continue;
    const dec = ring.dec[i] + ((ring.dec[j] - ring.dec[i]) * -d1) / (d2 - d1);
    if (dec > dec0) crossings++;
  }
  // A ring round the north pole holds the pole, where the count ends: inside means an even count then.
  return ring.aroundNorthPole ? crossings % 2 === 0 : crossings % 2 === 1;
}

/**
 * The constellation a J2000 direction lies in, by the IAU boundaries (which
 * are fixed to the stars, so precession carries the equinox through them).
 */
export function constellationAt(constellations: readonly Constellation[], v: Vec3): Constellation | null {
  const ra = Math.atan2(v[1], v[0]);
  const dec = Math.asin(Math.max(-1, Math.min(1, v[2] / Math.hypot(v[0], v[1], v[2]))));
  for (const c of constellations) if (ringsOf(c).some((ring) => insideRing(ring, ra, dec))) return c;
  return null;
}
