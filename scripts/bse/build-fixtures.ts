/**
 * Builds tests/fixtures/bse/binaries.json.gz: reference lives of binaries from
 * Jarrod Hurley's BSE (Hurley, Tout & Pols 2002, MNRAS 329, 897), which the
 * TypeScript port in src/core/stellar/bse/ is tested against.
 *
 *   node scripts/bse/build-fixtures.ts
 *
 * The Fortran comes from AMUSE's repository (src/amuse_bse/src, Hurley's BSE
 * distribution), pinned to the commit the SSE fixtures use, downloaded once into
 * scripts/.cache/bse/src/. Its single-star routines are byte-identical to the
 * SSE files there. It is compiled with gfortran in WSL together with
 * scripts/bse/fixture.f, a driver that runs EVOLV2 with binary.in's switches
 * and prints every step. The only changes to BSE are that its output arrays
 * (BCM, BPP, SCM, SPP) are made REAL*8, so the steps aren't rounded to single
 * precision on the way out, and BCM gets room for 200,000 steps. The code is
 * never shipped; only these outputs are kept.
 *
 * Needs WSL with gfortran (sudo apt install gfortran).
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

export const COMMIT = '9f8c7af041b8272417e0fce2bf17e6398a7653d8';
const BASE = `https://raw.githubusercontent.com/amusecode/amuse/${COMMIT}/src/amuse_bse/src`;
const FILES = [
  'README_BSE', 'binary.in', 'bse.f', 'comenv.f', 'const_bse.h', 'corerd.f', 'deltat.f', 'dgcore.f', 'evolv2.f', 'gntage.f',
  'hrdiag.f', 'instar.f', 'kick.f', 'mix.f', 'mlwind.f', 'mrenv.f', 'ran3.f', 'rl.f', 'star.f', 'zcnsts.f', 'zdata.h', 'zfuncs.f',
];
const SOURCES = [
  'fixture.f', 'comenv.f', 'corerd.f', 'deltat.f', 'dgcore.f', 'evolv2.f', 'gntage.f', 'hrdiag.f', 'instar.f', 'kick.f', 'mix.f',
  'mlwind.f', 'mrenv.f', 'ran3.f', 'rl.f', 'star.f', 'zcnsts.f', 'zfuncs.f',
];
const SRC = 'scripts/.cache/bse/src';
const BUILD = 'scripts/.cache/bse/build';
const OUT = 'tests/fixtures/bse/binaries.json.gz';

/** How long each pair is followed, Myr (binary.in's 15 billion years). */
export const T_END = 15000;
export const PRIMARIES = [0.6, 1, 1.6, 2.5, 4, 6.5, 10, 16, 30, 80];
export const RATIOS = [0.1, 0.5, 0.9];
export const PERIODS = [1, 10, 100, 1000, 10000];

export interface GridPoint {
  m1: number;
  m2: number;
  period: number;
  ecc: number;
  z: number;
  /** The kick's dispersion, km/s: 0 switches kicks off. */
  sigma: number;
  seed: number;
}

/**
 * The grid: every primary, mass ratio and period at three metallicities with circular orbits, and at Z = 0.02 with
 * e = 0.5 too, kicks off (companions under 0.1 M☉ are left out); then 24 massive pairs with kicks on, each its own seed.
 */
export function grid(): GridPoint[] {
  const points: GridPoint[] = [];
  const sets: [number, number][] = [[0.02, 0], [0.02, 0.5], [0.001, 0], [0.0001, 0]];
  for (const [z, ecc] of sets) {
    for (const m1 of PRIMARIES) {
      for (const q of RATIOS) {
        const m2 = Number((q * m1).toPrecision(6));
        if (m2 < 0.1) continue;
        for (const period of PERIODS) points.push({ m1, m2, period, ecc, z, sigma: 0, seed: 29769 });
      }
    }
  }
  let seed = 1001;
  for (const m1 of [8, 12, 16, 25]) {
    for (const q of [0.5, 0.9]) {
      for (const period of [10, 100, 1000]) {
        points.push({ m1, m2: q * m1, period, ecc: 0, z: 0.02, sigma: 190, seed: seed++ });
      }
    }
  }
  return points;
}

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
  copyFileSync('scripts/bse/fixture.f', `${BUILD}/fixture.f`);
  // Output arrays only: REAL → REAL*8, so the steps are printed at full precision, and room for every step
  const patches: [string, RegExp, string][] = [
    ['const_bse.h', /^(\s+)REAL scm\(50000,14\),spp\(20,3\)/m, '$1REAL*8 scm(50000,14),spp(20,3)'],
    ['const_bse.h', /^(\s+)REAL bcm\(50000,34\),bpp\(80,10\)/m, '$1REAL*8 bcm(200000,34),bpp(80,10)'],
    ['evolv2.f', /^(\s+)REAL bcm\(50000,34\),bpp\(80,10\)/m, '$1REAL*8 bcm(200000,34),bpp(80,10)'],
  ];
  for (const [name, from, to] of patches) {
    const text = readFileSync(`${BUILD}/${name}`, 'utf8');
    const patched = text.replace(from, to);
    if (patched === text) throw new Error(`Nothing to patch in ${name}: ${from}`);
    writeFileSync(`${BUILD}/${name}`, patched);
  }
  const dir = wslPath(BUILD);
  execFileSync('wsl', ['-e', 'bash', '-c', `cd '${dir}' && gfortran -O0 -o fixture ${SOURCES.join(' ')}`], { stdio: 'inherit' });
  return dir;
}

type Row = number[];

/** bcm's columns kept in the fixture (1-based; see BCM in evolve.ts). */
export const KEPT = [1, 2, 3, 4, 5, 6, 8, 13, 15, 16, 17, 18, 19, 20, 22, 27, 29, 30, 31, 32];

interface Binary extends GridPoint {
  /** How many steps BSE stored. */
  n: number;
  /** The event log, every row: bpp(j,1..10). */
  bpp: Row[];
  /** Steps kept: [j (0-based), ...bcm at KEPT]. */
  steps: Row[];
}

/** Keeps the first and last steps, both sides of every change of type, and about 12 more spread evenly. */
function keep(rows: Row[]): number[] {
  const n = rows.length;
  const every = Math.max(1, Math.floor(n / 12));
  const changed = (i: number) => i > 0 && (rows[i][1] !== rows[i - 1][1] || rows[i][15] !== rows[i - 1][15]);
  const kept: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1 || i % every === 0 || changed(i) || (i + 1 < n && changed(i + 1))) kept.push(i);
  }
  return kept;
}

const round = (x: number) => Number(x.toPrecision(10));

await download();
const dir = build();
const points = grid();
const binaries: Binary[] = [];
const BATCH = 20;
for (let start = 0; start < points.length; start += BATCH) {
  const batch = points.slice(start, start + BATCH);
  const input = batch.map((p) => `${p.m1} ${p.m2} ${p.period} ${p.ecc} ${p.z} ${T_END} ${p.sigma} ${p.seed}`).join('\n') + '\n';
  const output = execFileSync('wsl', ['-e', 'bash', '-c', `cd '${dir}' && ./fixture`], { input, maxBuffer: 1 << 30 }).toString();
  let steps: Row[] = [];
  let bpp: Row[] = [];
  for (const line of output.split(/\r?\n/)) {
    const [tag, ...rest] = line.trim().split(/\s+/);
    if (tag === 'S') steps.push(rest.map(Number));
    else if (tag === 'P') bpp.push(rest.map(Number));
    else if (tag === 'E') {
      const p = batch[binaries.length - start];
      const kept = keep(steps).map((i) => [i, ...KEPT.map((k) => round(steps[i][k - 1]))]);
      binaries.push({ ...p, n: steps.length, bpp: bpp.map((r) => r.map(round)), steps: kept });
      steps = [];
      bpp = [];
    }
  }
  if (binaries.length !== start + batch.length) throw new Error(`Batch at ${start}: expected ${batch.length} binaries`);
  process.stdout.write(`\r${binaries.length} of ${points.length}`);
}
console.log();

mkdirSync('tests/fixtures/bse', { recursive: true });
const json = JSON.stringify({
  source: `Hurley's BSE, AMUSE commit ${COMMIT} (src/amuse_bse/src), compiled with gfortran -O0; binary.in's switches`,
  tEnd: T_END,
  kept: KEPT,
  binaries,
});
writeFileSync(OUT, gzipSync(json, { level: 9 }));
const events = new Map<number, number>();
for (const b of binaries) for (const r of b.bpp) events.set(r[9], (events.get(r[9]) ?? 0) + 1);
const finals = new Set(binaries.map((b) => `${b.bpp.at(-1)![3]}+${b.bpp.at(-1)![4]}`));
console.log(`${binaries.length} binaries, ${(json.length / 1e6).toFixed(1)} MB of JSON; events ${[...events].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' ')}`);
console.log(`final pairs of types: ${[...finals].sort().join(' ')}`);
