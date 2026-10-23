/**
 * Builds src/data/constellations.json (stick figures, names, IAU boundaries)
 * and src/data/milkyway.json (the Milky Way's outline) from d3-celestial by
 * Olaf Frohn (BSD 3-Clause; https://github.com/ofrohn/d3-celestial).
 *
 * Each stick-figure vertex is matched to a star in src/data/hyg/stars.json, so
 * the figures move with the stars' own motions over thousands of years. Run
 * build-stars.ts first.
 *
 *   npx tsx scripts/build-constellations.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { galacticFromEquatorial } from '../src/core/coords/galactic';

const BASE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data';
const FILES = ['constellations.lines.json', 'constellations.bounds.json', 'constellations.json', 'mw.json'];
const CACHE = 'scripts/.cache';
const DEG = Math.PI / 180;

/** How far a figure's vertex may be from its star, degrees. */
const MATCH_RADIUS = 0.25;

type Position = [number, number];
interface Feature {
  id: string;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

async function load(name: string): Promise<{ features: Feature[] }> {
  const path = `${CACHE}/${name}`;
  if (!existsSync(path)) {
    console.log(`Downloading ${name}`);
    const response = await fetch(`${BASE}/${name}`);
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(path, await response.text());
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

for (const f of FILES) await load(f);
const lines = await load('constellations.lines.json');
const bounds = await load('constellations.bounds.json');
const info = await load('constellations.json');
const mw = await load('mw.json');
const stars = JSON.parse(readFileSync('src/data/hyg/stars.json', 'utf8')) as { ra: number[]; dec: number[]; mag: number[] };

/** d3-celestial writes right ascension as a longitude from −180° to 180°. */
const ra360 = (lon: number) => (lon < 0 ? lon + 360 : lon);

const unit = (raDeg: number, decDeg: number): [number, number, number] => [
  Math.cos(decDeg * DEG) * Math.cos(raDeg * DEG),
  Math.cos(decDeg * DEG) * Math.sin(raDeg * DEG),
  Math.sin(decDeg * DEG),
];
const starVectors = stars.ra.map((r, i) => unit(r / 1e4, stars.dec[i] / 1e4));

/** The nearest catalogue star to a position, if it is within MATCH_RADIUS. */
function nearestStar([lon, lat]: Position): number | null {
  const v = unit(ra360(lon), lat);
  const cosLimit = Math.cos(MATCH_RADIUS * DEG);
  let best = -1;
  let bestDot = cosLimit;
  for (let i = 0; i < starVectors.length; i++) {
    const s = starVectors[i];
    const d = v[0] * s[0] + v[1] * s[1] + v[2] * s[2];
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  }
  return best >= 0 ? best : null;
}

const round = (x: number, decimals: number) => Math.round(x * 10 ** decimals) / 10 ** decimals;

// ---------- stick figures ----------

let matched = 0;
const unmatched: string[] = [];
const figures: Record<string, (number | [number, number])[][]> = {};
for (const feature of lines.features) {
  const strokes = feature.geometry.coordinates as Position[][];
  figures[feature.id] = strokes.map((stroke) =>
    stroke.map((p) => {
      const star = nearestStar(p);
      if (star !== null) {
        matched++;
        return star;
      }
      unmatched.push(`${feature.id} ${p[0]},${p[1]}`);
      return [round(ra360(p[0]), 3), round(p[1], 3)] as [number, number];
    }),
  );
}

// ---------- names and label positions ----------

const names = info.features.map((f) => {
  const p = f.properties as { name: string; gen: string; en: string; rank: string; display: [number, number, number] };
  return { id: f.id, name: p.name, genitive: p.gen, english: p.en, rank: Number(p.rank), label: [round(ra360(p.display[0]), 2), round(p.display[1], 2)] };
});

// ---------- boundaries ----------

const boundaries: Record<string, [number, number][][]> = {};
for (const feature of bounds.features) {
  const rings = (feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates) as Position[][][];
  boundaries[feature.id] = rings.flatMap((polygon) => polygon.map((ring) => ring.map(([lon, lat]) => [round(ra360(lon), 3), round(lat, 3)] as [number, number])));
}

// ---------- the Milky Way ----------

/**
 * The outline comes as polygons at five brightness levels. Filling polygons
 * that wrap round the sky is fragile under the sky view's projection, so the
 * outline is turned into a map instead: a grid of 1° cells in right ascension
 * and declination (J2000), each given the brightest level whose outline
 * contains its centre. The steps between levels are then smoothed with a
 * Gaussian 2° wide, because the real Milky Way fades rather than stopping at
 * an edge.
 *
 * Inside or outside is decided in galactic coordinates, by counting how many
 * outline edges cross the meridian above the point on its way to the north
 * galactic pole (which lies outside the Milky Way). That works for blobs and
 * for the outlines that run right round the sky alike.
 */
type Edge = [number, number, number, number]; // l1, b1, l2, b2 in degrees, with l2 unwrapped to within 180° of l1

const toGalactic = (raDeg: number, decDeg: number) => {
  const g = galacticFromEquatorial({ ra: raDeg * DEG, dec: decDeg * DEG });
  return [g.lon / DEG, g.lat / DEG] as const;
};

const levelEdges = mw.features.map((feature) => {
  const polygons = feature.geometry.coordinates as Position[][][];
  const edges: Edge[] = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const g = ring.map(([lon, lat]) => toGalactic(ra360(lon), lat));
      for (let i = 0; i < g.length; i++) {
        const [l1, b1] = g[i];
        const [l2raw, b2] = g[(i + 1) % g.length];
        let l2 = l2raw;
        if (l2 - l1 > 180) l2 -= 360;
        if (l1 - l2 > 180) l2 += 360;
        edges.push([l1, b1, l2, b2]);
      }
    }
  }
  return { level: Number(feature.id.slice(2)), edges, maxB: Math.max(...edges.map((e) => Math.max(e[1], e[3]))) };
});

/** Whether the meridian from (l, b) up to the north galactic pole crosses an odd number of edges. */
function inside(l: number, b: number, edges: Edge[]): boolean {
  let crossings = 0;
  for (const [l1, b1, l2, b2] of edges) {
    for (const shift of [-360, 0, 360]) {
      const a = l1 + shift;
      const c = l2 + shift;
      // Half-open in longitude, so a vertex on the meridian counts once.
      if ((a <= l && l < c) || (c <= l && l < a)) {
        const t = (l - a) / (c - a);
        if (b1 + t * (b2 - b1) > b) crossings++;
      }
    }
  }
  return crossings % 2 === 1;
}

const WIDTH = 360;
const HEIGHT = 180;
const raw = new Float64Array(WIDTH * HEIGHT);
for (let j = 0; j < HEIGHT; j++) {
  for (let i = 0; i < WIDTH; i++) {
    const [l, b] = toGalactic(i + 0.5, -90 + j + 0.5);
    let level = 0;
    for (const { level: k, edges, maxB } of levelEdges) if (k > level && b < maxB && inside(l, b, edges)) level = k;
    raw[j * WIDTH + i] = level;
  }
}

// Gaussian smoothing on the sphere, weighting each cell by its area (cos dec).
const SIGMA = 2 * DEG;
const REACH = 5; // degrees
const cell = (i: number, j: number) => unit(i + 0.5, -90 + j + 0.5);
const centres = Array.from({ length: WIDTH * HEIGHT }, (_, k) => cell(k % WIDTH, Math.floor(k / WIDTH)));
let levels = '';
let lit = 0;
for (let j = 0; j < HEIGHT; j++) {
  const dec = -90 + j + 0.5;
  for (let i = 0; i < WIDTH; i++) {
    const [x, y, z] = centres[j * WIDTH + i];
    let sum = 0;
    let weights = 0;
    for (let dj = -REACH; dj <= REACH; dj++) {
      const jj = j + dj;
      if (jj < 0 || jj >= HEIGHT) continue;
      const cosDec = Math.cos((-90 + jj + 0.5) * DEG);
      const span = Math.min(180, Math.ceil(REACH / Math.max(0.02, Math.cos(Math.min(89.5, Math.abs(dec) + REACH) * DEG))));
      for (let di = -span; di <= span; di++) {
        const ii = (((i + di) % WIDTH) + WIDTH) % WIDTH;
        const [a, b2, c] = centres[jj * WIDTH + ii];
        const theta = Math.acos(Math.min(1, x * a + y * b2 + z * c));
        if (theta > REACH * DEG) continue;
        const w = cosDec * Math.exp((-theta * theta) / (2 * SIGMA * SIGMA));
        sum += w * raw[jj * WIDTH + ii];
        weights += w;
      }
    }
    const digit = Math.round((sum / weights / 5) * 9);
    if (digit > 0) lit++;
    levels += digit;
  }
}

const notice =
  'Derived from d3-celestial, Copyright (c) 2015, Olaf Frohn. BSD 3-Clause licence: redistribution and use in source and binary forms, with or without modification, are permitted provided that the copyright notice, this list of conditions and the disclaimer in https://github.com/ofrohn/d3-celestial/blob/master/LICENSE are retained.';

const constellations = {
  source: 'd3-celestial (Olaf Frohn): stick figures after the IAU constellation charts, with Frohn’s edits; boundaries from Davenhall & Leggett (1989), VizieR VI/49',
  licence: notice,
  units: 'Right ascension and declination in degrees, J2000. A figure vertex is a star index into hyg/stars.json, or [ra, dec] where no star matched.',
  names,
  figures,
  boundaries,
};
const milky = {
  source: 'd3-celestial (Olaf Frohn): Milky Way outline after J. R. Vieira, mapped onto a 1° grid and smoothed over 2°',
  licence: notice,
  units: 'One digit per 1° cell, 0 (dark) to 9 (the brightest core). Rows run from declination −89.5° to +89.5° (J2000), and each row from right ascension 0.5° to 359.5°.',
  width: WIDTH,
  height: HEIGHT,
  levels,
};

writeFileSync('src/data/constellations.json', JSON.stringify(constellations));
writeFileSync('src/data/milkyway.json', JSON.stringify(milky));
console.log(`Milky Way: ${lit} of ${WIDTH * HEIGHT} cells lit`);
console.log(`Figures: ${matched} vertices matched to stars, ${unmatched.length} not: ${unmatched.slice(0, 10).join('; ')}`);
console.log(`constellations.json ${round(JSON.stringify(constellations).length / 1024, 1)} kB, milkyway.json ${round(JSON.stringify(milky).length / 1024, 1)} kB`);
