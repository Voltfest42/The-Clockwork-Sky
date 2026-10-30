/**
 * Builds src/data/bhac15.json: young stars' and brown dwarfs' tracks from
 * Baraffe, Homeier, Allard & Chabrier (2015, A&A 577, A42), "BHAC15", for
 * 0.01–1.4 M☉ at solar metallicity, from Isabelle Baraffe's page
 * (perso.ens-lyon.fr/isabelle.baraffe/BHAC15dir/), which asks only that the
 * paper be cited.
 *
 *   node scripts/build-pms.ts
 *
 * The raw file (1.4 MB) is downloaded once into scripts/.cache/bhac15/. Each
 * track keeps about 60 ages, evenly spaced in log t, with the first and last.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://perso.ens-lyon.fr/isabelle.baraffe/BHAC15dir/BHAC15_tracks+structure';
const CACHE = 'scripts/.cache/bhac15/tracks.txt';
const OUT = 'src/data/bhac15.json';
const KEEP = 60;

async function download(): Promise<string> {
  if (!existsSync(CACHE)) {
    console.log(`Downloading ${URL}`);
    const response = await fetch(URL);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    mkdirSync('scripts/.cache/bhac15', { recursive: true });
    writeFileSync(CACHE, await response.text());
  }
  return readFileSync(CACHE, 'utf8');
}

const text = await download();
// Columns: M/Ms, log t (yr), Teff (K), log L/Ls, log g, R/Rs, log(Li/Li0), log Tc, log ρc, Mrad, Rrad, k2conv, k2rad.
const rows = text
  .split(/\r?\n/)
  .filter((line) => /^\s*\d\.\d{3}\s/.test(line))
  .map((line) => line.trim().split(/\s+/).map(Number));
const masses = [...new Set(rows.map((r) => r[0]))].sort((a, b) => a - b);

const tracks = masses.map((mass) => {
  const all = rows.filter((r) => r[0] === mass);
  const t0 = all[0][1];
  const t1 = all[all.length - 1][1];
  const kept: number[][] = [];
  let next = t0;
  for (const [i, r] of all.entries()) {
    if (i === 0 || i === all.length - 1 || r[1] >= next) {
      // log t, Teff, log L, R, log(Li/Li0)
      kept.push([Number(r[1].toFixed(4)), r[2], r[3], r[5], Math.max(-9, r[6])]);
      next = r[1] + (t1 - t0) / KEEP;
    }
  }
  return { mass, points: kept };
});

writeFileSync(
  OUT,
  JSON.stringify({
    source: 'Baraffe, Homeier, Allard & Chabrier 2015, A&A 577, A42 (BHAC15), solar metallicity; perso.ens-lyon.fr/isabelle.baraffe/BHAC15dir/',
    columns: ['log t (yr)', 'Teff (K)', 'log L/L☉', 'R/R☉', 'log Li/Li0'],
    tracks,
  }),
);
console.log(`${tracks.length} tracks, ${tracks.reduce((s, t) => s + t.points.length, 0)} points`);
