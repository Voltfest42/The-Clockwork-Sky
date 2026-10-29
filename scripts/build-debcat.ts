/**
 * Builds src/data/debcat.json, the masses, radii, temperatures and
 * luminosities of detached eclipsing binaries, from John Southworth's DEBCat
 * (Southworth 2015, ASP Conference Series 496, 164), in the copy VizieR keeps
 * as catalogue V/152 (the version of 10 October 2017: 195 systems). DEBCat's
 * own page (astro.keele.ac.uk/jkt/debcat) asks only that Southworth (2015) be
 * cited; it couldn't be reached from here, so the VizieR copy is used, through
 * the Harvard mirror.
 *
 *   node scripts/build-debcat.ts
 *
 * The raw files are downloaded once into scripts/.cache/debcat/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BASE = 'https://vizier.cfa.harvard.edu/ftp/cats/V/152/';
const CACHE = 'scripts/.cache/debcat/';
const OUT = 'src/data/debcat.json';

async function download(name: string): Promise<string> {
  const path = CACHE + name;
  if (!existsSync(path)) {
    console.log(`Downloading ${BASE + name}`);
    const response = await fetch(BASE + name);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(path, await response.text());
  }
  return readFileSync(path, 'utf8');
}

const text = await download('debcat.dat');
await download('ReadMe');
const rows = text.split(/\r?\n/).filter((l) => l.trim());

/** A field as a number, or null for DEBCat's −9.99 "not given". */
const num = (s: string) => {
  const x = Number(s.trim());
  return !Number.isFinite(x) || x === -9.99 ? null : x;
};

// Fields are separated by "|" (see the ReadMe's byte-by-byte description).
const systems = rows.map((line) => {
  const f = line.split('|');
  const n = (i: number) => num(f[i]);
  const round = (x: number | null, d = 4) => (x === null ? null : Number(x.toFixed(d)));
  return {
    name: f[0].trim().replace(/\s+/g, ' '),
    spt: [f[1].trim(), f[2].trim()],
    period: n(3),
    V: n(4),
    // log₁₀ of mass (M☉), radius (R☉), surface gravity (cgs), temperature (K) and luminosity (L☉), each with its uncertainty, for the two stars.
    logM: [round(n(6)), round(n(8))],
    eLogM: [round(n(7)), round(n(9))],
    logR: [round(n(10)), round(n(12))],
    eLogR: [round(n(11)), round(n(13))],
    logg: [round(n(14)), round(n(16))],
    logT: [round(n(18)), round(n(20))],
    eLogT: [round(n(19)), round(n(21))],
    logL: [round(n(22)), round(n(24))],
    eLogL: [round(n(23)), round(n(25))],
    metallicity: round(n(26), 2),
  };
});

const out = {
  source: 'DEBCat, J. Southworth (2015), ASP Conference Series 496, 164; VizieR V/152, version of 10 October 2017',
  terms: 'Free to use with a citation of Southworth (2015)',
  systems,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${OUT}: ${systems.length} systems`);
