/**
 * Builds src/data/gaia/hr.json, the Hertzsprung–Russell diagram of the stars
 * within 100 parsecs, from Gaia Data Release 3 (ESA/Gaia/DPAC; CC BY-NC 3.0
 * IGO). The output is a derived work under the same licence and is kept in its
 * own folder.
 *
 * The query keeps stars with parallaxes over 10 mas measured to better than
 * 10%, a colour, a good astrometric fit (RUWE < 1.4) and a BP/RP flux excess in
 * the range Gaia Collaboration, Babusiaux et al. (2018) use for clean HR
 * diagrams. The Gaia Catalogue of Nearby Stars (Smart et al. 2021) would do as
 * well, but VizieR was out of reach from here, so the query goes to Gaia's own
 * archive.
 *
 * Output: the number of stars in each cell of a grid of colour (G_BP − G_RP)
 * against absolute magnitude M_G; every star within 20 pc; and a seeded sample
 * of the rest, as points.
 *
 *   npx tsx scripts/build-hr.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const TAP = 'https://gea.esac.esa.int/tap-server/tap/async';
const QUERY = `SELECT source_id, parallax, parallax_error, phot_g_mean_mag, bp_rp, ruwe FROM gaiadr3.gaia_source
WHERE parallax > 10 AND parallax_over_error > 10 AND bp_rp IS NOT NULL AND ruwe < 1.4
AND phot_bp_rp_excess_factor BETWEEN 1.0 + 0.015*bp_rp*bp_rp AND 1.3 + 0.06*bp_rp*bp_rp`;
const CACHE = 'scripts/.cache/gaia/gaia100.csv';
const OUT_DIR = 'src/data/gaia';
const OUT = `${OUT_DIR}/hr.json`;

export const GRID = { x0: -0.6, dx: 0.04, nx: 140, y0: -3, dy: 0.1, ny: 230 } as const;
const SAMPLE = 3000;
const NEAR_PC = 20;

async function download(): Promise<string> {
  if (!existsSync(CACHE)) {
    console.log('Querying the Gaia archive');
    const body = new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', PHASE: 'RUN', MAXREC: '3000000', QUERY });
    const job = await fetch(TAP, { method: 'POST', body, redirect: 'manual' });
    const location = job.headers.get('location');
    if (!location) throw new Error(`No job: ${job.status}`);
    for (;;) {
      const phase = await (await fetch(`${location}/phase`)).text();
      if (phase === 'COMPLETED') break;
      if (phase === 'ERROR' || phase === 'ABORTED') throw new Error(`Job ${phase}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
    const result = await fetch(`${location}/results/result`);
    mkdirSync('scripts/.cache/gaia', { recursive: true });
    writeFileSync(CACHE, await result.text());
  }
  return readFileSync(CACHE, 'utf8');
}

/** A small seeded generator (mulberry32), so the sample is the same every build. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rows = (await download()).trim().split(/\r?\n/).slice(1);
const grid = new Array<number>(GRID.nx * GRID.ny).fill(0);
const near: number[] = [];
const rest: [number, number][] = [];
for (const row of rows) {
  const [, plx, , g, bprp] = row.split(',').map(Number);
  const mg = g + 5 * Math.log10(plx) - 10;
  const i = Math.floor((bprp - GRID.x0) / GRID.dx);
  const j = Math.floor((mg - GRID.y0) / GRID.dy);
  if (i >= 0 && i < GRID.nx && j >= 0 && j < GRID.ny) grid[j * GRID.nx + i]++;
  if (1000 / plx <= NEAR_PC) near.push(Math.round(bprp * 1000), Math.round(mg * 100), Math.round(plx * 10));
  else rest.push([Math.round(bprp * 1000), Math.round(mg * 100)]);
}
const random = seeded(2026);
for (let i = rest.length - 1; i > 0; i--) {
  const k = Math.floor(random() * (i + 1));
  [rest[i], rest[k]] = [rest[k], rest[i]];
}
const sample = rest.slice(0, SAMPLE).flat();

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({
    source: 'Gaia Data Release 3 (ESA/Gaia/DPAC, 2022), stars with parallax > 10 mas (within 100 pc), parallax_over_error > 10, RUWE < 1.4 and a clean BP/RP excess',
    licence: 'CC BY-NC 3.0 IGO (https://creativecommons.org/licenses/by-nc/3.0/igo/). This file is derived from Gaia DR3 and is shared under the same licence.',
    count: rows.length,
    units: { grid: 'stars per cell, rows of M_G from y0, columns of G_BP − G_RP from x0', near: 'triples: (G_BP − G_RP) × 1000, M_G × 100, parallax × 10 (mas)', sample: 'pairs: (G_BP − G_RP) × 1000, M_G × 100' },
    grid: { ...GRID, counts: grid },
    near,
    sample,
  }) + '\n',
);
console.log(`Wrote ${OUT}: ${rows.length} stars, ${near.length / 3} within ${NEAR_PC} pc, ${SAMPLE} sampled`);
