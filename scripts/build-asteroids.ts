/**
 * Builds src/data/asteroids.json for Figure 8.4 from the orbits of every
 * numbered asteroid in JPL's Small-Body Database (the orbits come from the
 * Minor Planet Center's observations).
 *
 * Only summaries are written, never the orbits themselves:
 * - a histogram of semi-major axes, 1.5–5.5 AU in bins of 0.01 AU;
 * - counts in the main groups;
 * - every asteroid's real position on one date (Kepler's equation from its
 *   osculating elements), and from those the average distance from an asteroid
 *   in the main belt to its nearest known neighbour;
 * - the asteroids in a slab of the belt 50 million km square and 2 million km
 *   thick round the ecliptic, as points in that slab, for the "how empty is
 *   it" view.
 *
 *   node scripts/build-asteroids.ts
 *
 * The raw query (about 55 MB) is cached in scripts/.cache/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const API = 'https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=a,e,i,om,w,ma,epoch&sb-kind=a&sb-ns=n';
const CACHE = 'scripts/.cache/sbdb-numbered.json';
const OUT = 'src/data/asteroids.json';
/** The date the positions are worked out for: 2026 October 1, 0h TT (JD). */
const DATE_JD = 2_461_314.5;
const DATE_TEXT = '1 October 2026';
const AU_KM = 149_597_870.7;
/** The Gaussian gravitational constant, radians a day for an orbit of 1 AU round the Sun. */
const K = 0.017_202_098_95;
const BIN = 0.01;
const FROM = 1.5;
const TO = 5.5;
/** The main belt, for the spacing: between the 4:1 and 2:1 resonances with Jupiter. */
const BELT: readonly [number, number] = [2.06, 3.27];
/** The slab for the "how empty" view: centred on a point of the belt at 2.7 AU, in km. */
const SLAB = { centreAu: 2.7, half: 25_000_000, halfThickness: 1_000_000 };

interface Query {
  fields: string[];
  data: string[][];
  count: number;
}

async function download(): Promise<Query> {
  if (!existsSync(CACHE)) {
    console.log(`Downloading ${API}`);
    const response = await fetch(API);
    if (!response.ok) throw new Error(`SBDB query failed: ${response.status}`);
    mkdirSync('scripts/.cache', { recursive: true });
    writeFileSync(CACHE, Buffer.from(await response.arrayBuffer()));
  }
  return JSON.parse(readFileSync(CACHE, 'utf8')) as Query;
}

/** Heliocentric ecliptic position (AU) from osculating elements (angles in degrees) and the mean anomaly at the date. */
function position(a: number, e: number, iDeg: number, omDeg: number, wDeg: number, M: number): [number, number, number] {
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 50; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const d = Math.PI / 180;
  const [cw, sw, co, so, ci, si] = [Math.cos(wDeg * d), Math.sin(wDeg * d), Math.cos(omDeg * d), Math.sin(omDeg * d), Math.cos(iDeg * d), Math.sin(iDeg * d)];
  const x = (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp;
  const y = (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp;
  const z = sw * si * xp + cw * si * yp;
  return [x, y, z];
}

const query = await download();
const col = (name: string) => query.fields.indexOf(name);
const [ca, ce, ci, com, cw, cma, cep] = ['a', 'e', 'i', 'om', 'w', 'ma', 'epoch'].map(col);

const bins = new Array(Math.round((TO - FROM) / BIN)).fill(0);
const groups = { nearEarth: 0, inner: 0, mainBelt: 0, hildas: 0, trojans: 0, beyond: 0, total: 0 };
const belt: [number, number, number][] = [];
const slab: [number, number][] = [];
const centre: [number, number] = [SLAB.centreAu * AU_KM, 0];

for (const row of query.data) {
  const a = Number(row[ca]);
  const e = Number(row[ce]);
  if (!(a > 0) || !(e < 1)) continue;
  groups.total++;
  const q = a * (1 - e);
  if (q < 1.3) groups.nearEarth++;
  else if (a < BELT[0]) groups.inner++;
  else if (a <= BELT[1]) groups.mainBelt++;
  else if (a >= 3.7 && a <= 4.2) groups.hildas++;
  else if (a >= 5.05 && a <= 5.35) groups.trojans++;
  else groups.beyond++;
  if (a >= FROM && a < TO) bins[Math.floor((a - FROM) / BIN)]++;

  const n = K / a ** 1.5;
  const M = ((Number(row[cma]) * Math.PI) / 180 + n * (DATE_JD - Number(row[cep]))) % (2 * Math.PI);
  const p = position(a, e, Number(row[ci]), Number(row[com]), Number(row[cw]), M);
    if (a >= BELT[0] && a <= BELT[1] && q >= 1.3) belt.push([p[0] * AU_KM, p[1] * AU_KM, p[2] * AU_KM]);
  // The slab: a box round a point of the belt on the line to the March equinox direction.
  const along = p[0] * AU_KM - centre[0];
  const across = p[1] * AU_KM - centre[1];
  if (Math.abs(p[2] * AU_KM) <= SLAB.halfThickness && Math.abs(along) <= SLAB.half && Math.abs(across) <= SLAB.half) {
    slab.push([Math.round(across / 1000), Math.round(along / 1000)]);
  }
}

// Nearest neighbours in the main belt, with a grid of cells about the average spacing wide.
const CELL = 3e6;
const grid = new Map<string, number[]>();
const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
belt.forEach((p, index) => {
  const k = key(Math.floor(p[0] / CELL), Math.floor(p[1] / CELL), Math.floor(p[2] / CELL));
  const list = grid.get(k);
  if (list) list.push(index);
  else grid.set(k, [index]);
});
let total = 0;
const nearest: number[] = [];
for (let index = 0; index < belt.length; index++) {
  const p = belt[index];
  const [gi, gj, gk] = [Math.floor(p[0] / CELL), Math.floor(p[1] / CELL), Math.floor(p[2] / CELL)];
  let best = Infinity;
  // Points outside the cube searched so far are at least (reach − 1) cells away, so stop once the best is closer than that.
  for (let reach = 1; best > (reach - 2) * CELL; reach++) {
    best = Infinity;
    for (let di = -reach; di <= reach; di++)
      for (let dj = -reach; dj <= reach; dj++)
        for (let dk = -reach; dk <= reach; dk++) {
          for (const other of grid.get(key(gi + di, gj + dj, gk + dk)) ?? []) {
            if (other === index) continue;
            const q = belt[other];
            const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
            if (d < best) best = d;
          }
        }
  }
  total += best;
  nearest.push(best);
}
nearest.sort((x, y) => x - y);
const meanSpacing = total / belt.length;
const medianSpacing = nearest[Math.floor(nearest.length / 2)];

const output = {
  source: 'JPL Small-Body Database query API (orbits from the Minor Planet Center): every numbered asteroid',
  fetched: new Date().toISOString().slice(0, 10),
  count: groups.total,
  histogram: { from: FROM, to: TO, bin: BIN, counts: bins },
  groups,
  spacing: {
    date: DATE_TEXT,
    region: `the main belt, ${BELT[0]}–${BELT[1]} AU`,
    asteroids: belt.length,
    meanKm: Math.round(meanSpacing / 1000) * 1000,
    medianKm: Math.round(medianSpacing / 1000) * 1000,
  },
  slab: { centreAu: SLAB.centreAu, halfWidthKm: SLAB.half, halfThicknessKm: SLAB.halfThickness, units: 'thousands of km: across, outward', points: slab },
};
writeFileSync(OUT, JSON.stringify(output));
console.log(
  `Wrote ${OUT}: ${groups.total} asteroids ${JSON.stringify(groups)}; nearest neighbour in the belt: mean ${Math.round(meanSpacing / 1e3)} thousand km, median ${Math.round(medianSpacing / 1e3)} thousand km; ${slab.length} in the slab; ${(JSON.stringify(output).length / 1024).toFixed(1)} kB`,
);
