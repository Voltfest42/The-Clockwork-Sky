/**
 * Builds tests/fixtures/sse/tracks.json: reference tracks from Jarrod Hurley's
 * SSE (Hurley, Pols & Tout 2000, MNRAS 315, 543), which the TypeScript port in
 * src/core/stellar/ is tested against.
 *
 *   node scripts/sse/build-fixtures.ts
 *
 * The Fortran comes from AMUSE's repository (src/amuse_sse/src, "the SSE
 * distribution unchanged"), pinned to one commit, downloaded once into
 * scripts/.cache/sse/src/. It is compiled with gfortran in WSL together with
 * scripts/sse/fixture.f, a driver that runs EVOLV1 with evolve.in's default
 * switches and prints every step. The only change to SSE is that its output
 * arrays SCM and SPP are made REAL*8, so the steps aren't rounded to single
 * precision on the way out. The code is never shipped; only these outputs are kept.
 *
 * Needs WSL with gfortran (sudo apt install gfortran make).
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const COMMIT = '9f8c7af041b8272417e0fce2bf17e6398a7653d8';
const BASE = `https://raw.githubusercontent.com/amusecode/amuse/${COMMIT}/src/amuse_sse/src`;
const FILES = [
  'README_SSE', 'const_bse.h', 'deltat.f', 'evolv1.f', 'evolve.in', 'hrdiag.f', 'kick.f', 'mlwind.f',
  'mrenv.f', 'ran3.f', 'sse.f', 'star.f', 'zcnsts.f', 'zdata.h', 'zfuncs.f',
];
const SOURCES = ['fixture.f', 'deltat.f', 'evolv1.f', 'hrdiag.f', 'kick.f', 'mlwind.f', 'mrenv.f', 'ran3.f', 'star.f', 'zcnsts.f', 'zfuncs.f'];
const SRC = 'scripts/.cache/sse/src';
const BUILD = 'scripts/.cache/sse/build';
const OUT = 'tests/fixtures/sse/tracks.json';

/** The grid: masses (M☉) at each metallicity, chosen to pass through every stellar type and the formulas' edges. */
export const MASSES = [0.1, 0.25, 0.5, 0.65, 0.8, 1, 1.25, 1.6, 2, 2.5, 3.2, 4, 5.5, 6.5, 7.2, 9, 12, 15, 20, 30, 45, 60, 100, 150];
export const METALLICITIES = [0.0001, 0.0005, 0.001, 0.004, 0.01, 0.02, 0.03];
/** How long each star is followed, in Myr: 100 billion years, so stars down to about 0.6 M☉ finish. */
export const T_END = 1e5;

async function download() {
  mkdirSync(SRC, { recursive: true });
  for (const name of FILES) {
    const path = `${SRC}/${name}`;
    if (existsSync(path)) continue;
    console.log(`Downloading ${name}`);
    const response = await fetch(`${BASE}/${name}`);
    if (!response.ok) throw new Error(`Download failed: ${name} ${response.status}`);
    writeFileSync(path, await response.text());
  }
}

/** A Windows path as WSL sees it: D:\a b → /mnt/d/a b. */
const wslPath = (path: string) => resolve(path).replace(/^([A-Za-z]):/, (_, d: string) => `/mnt/${d.toLowerCase()}`).replace(/\\/g, '/');

function build() {
  mkdirSync(BUILD, { recursive: true });
  for (const name of FILES) copyFileSync(`${SRC}/${name}`, `${BUILD}/${name}`);
  copyFileSync('scripts/sse/fixture.f', `${BUILD}/fixture.f`);
  // Output arrays only: REAL → REAL*8, so the steps are printed at full precision.
  for (const name of ['const_bse.h', 'evolv1.f']) {
    const text = readFileSync(`${BUILD}/${name}`, 'utf8');
    const patched = text.replace(/^(\s+)REAL scm\(50000,14\),spp\(20,3\)/m, '$1REAL*8 scm(50000,14),spp(20,3)');
    if (patched === text) throw new Error(`No SCM declaration to patch in ${name}`);
    writeFileSync(`${BUILD}/${name}`, patched);
  }
  const dir = wslPath(BUILD);
  execFileSync('wsl', ['-e', 'bash', '-c', `cd '${dir}' && gfortran -O0 -o fixture ${SOURCES.join(' ')}`], { stdio: 'inherit' });
  return dir;
}

type Row = number[];
interface Track {
  m: number;
  z: number;
  /** Steps kept: [j, t (Myr), kw, mass0, mt, L (L☉), R (R☉), mc, rc, menv]. */
  steps: Row[];
  /** Every change of type: [t (Myr), kw, mt]. */
  types: Row[];
  /** How many steps the star took. */
  n: number;
}

/** Keeps every change of type (the steps either side), the first and last, and about 25 more spread evenly. */
function keep(rows: Row[]): Row[] {
  const n = rows.length;
  const every = Math.max(1, Math.floor(n / 25));
  return rows.filter((row, i) => i === 0 || i === n - 1 || i % every === 0 || row[2] !== rows[i - 1][2] || (i + 1 < n && row[2] !== rows[i + 1][2]));
}

const round = (x: number) => Number(x.toPrecision(11));

await download();
const dir = build();
const input = METALLICITIES.flatMap((z) => MASSES.map((m) => `${m} ${z} ${T_END}`)).join('\n') + '\n';
const output = execFileSync('wsl', ['-e', 'bash', '-c', `cd '${dir}' && ./fixture`], { input, maxBuffer: 1 << 30 }).toString();

const tracks: Track[] = [];
let steps: Row[] = [];
let types: Row[] = [];
const grid = METALLICITIES.flatMap((z) => MASSES.map((m) => ({ m, z })));
for (const line of output.split(/\r?\n/)) {
  const [tag, ...rest] = line.trim().split(/\s+/);
  if (tag === 'S') steps.push(rest.map(Number));
  else if (tag === 'P') types.push(rest.map(Number));
  else if (tag === 'E') {
    const { m, z } = grid[tracks.length];
    tracks.push({ m, z, n: steps.length, steps: keep(steps).map((r) => r.slice(0, 10).map(round)), types: types.map((r) => r.map(round)) });
    steps = [];
    types = [];
  }
}
if (tracks.length !== grid.length) throw new Error(`Expected ${grid.length} stars, got ${tracks.length}`);

mkdirSync('tests/fixtures/sse', { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({
    source: `Hurley's SSE, AMUSE commit ${COMMIT} (src/amuse_sse/src), compiled with gfortran -O0; evolve.in defaults`,
    tEnd: T_END,
    tracks,
  }),
);
const kept = tracks.reduce((s, t) => s + t.steps.length, 0);
const kinds = new Set(tracks.flatMap((t) => t.types.map((r) => r[1])));
console.log(`${tracks.length} stars, ${kept} steps kept; types reached: ${[...kinds].sort((a, b) => a - b).join(' ')}`);
