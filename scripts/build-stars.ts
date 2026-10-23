/**
 * Builds src/data/hyg/stars.json, the naked-eye star catalogue for the sky
 * view, from the HYG database (David Nash, astronexus.com; CC BY-SA 4.0).
 *
 * Keeps every star of visual magnitude 6.5 or brighter (about 8,900), sorted
 * brightest first so a figure can take the first n stars for any limiting
 * magnitude. Positions are ICRS (≈ J2000) at epoch J2000.0, as HYG gives them.
 *
 *   npx tsx scripts/build-stars.ts
 *
 * The raw file is downloaded once into scripts/.cache/. The output is
 * share-alike (CC BY-SA 4.0), like its source, and is kept in its own folder.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const VERSION = 'v4.4';
const URL = 'https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz';
const CACHE = 'scripts/.cache/hyg_v44.csv.gz';
const OUT_DIR = 'src/data/hyg';
const OUT = `${OUT_DIR}/stars.json`;
const LIMIT = 6.5;

const GREEK: Record<string, string> = {
  Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ', Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ',
  Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ', Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω',
};

async function download(): Promise<Buffer> {
  if (!existsSync(CACHE)) {
    console.log(`Downloading ${URL}`);
    const response = await fetch(URL);
    if (!response.ok) throw new Error(`HYG download failed: ${response.status}`);
    mkdirSync('scripts/.cache', { recursive: true });
    writeFileSync(CACHE, Buffer.from(await response.arrayBuffer()));
  }
  return gunzipSync(readFileSync(CACHE));
}

/** Splits one CSV line, allowing quoted fields. */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(field);
      field = '';
    } else field += ch;
  }
  out.push(field);
  return out;
}

/** The Bayer letter with its superscript number, if any: "Alp", "Alp-1" → "α", "α¹". */
function bayerLetter(bayer: string): string | null {
  const [letter, n] = bayer.split('-');
  const greek = GREEK[letter];
  if (!greek) return null;
  const sup = n ? [...n].map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('') : '';
  return greek + sup;
}

interface Star {
  hip: number;
  ra: number;
  dec: number;
  pmra: number;
  pmdec: number;
  plx: number;
  rv: number;
  mag: number;
  ci: number | null;
  proper: string;
  bayer: string | null;
  flam: string;
  con: string;
}

const text = (await download()).toString('utf8');
const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
const header = splitCsv(lines[0]);
const col = (name: string) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`HYG has no column ${name}`);
  return i;
};
const C = {
  id: col('id'), hip: col('hip'), proper: col('proper'), ra: col('ra'), dec: col('dec'), dist: col('dist'),
  pmra: col('pmra'), pmdec: col('pmdec'), rv: col('rv'), mag: col('mag'), ci: col('ci'), bayer: col('bayer'), flam: col('flam'), con: col('con'),
};

const stars: Star[] = [];
for (const line of lines.slice(1)) {
  const f = splitCsv(line);
  if (f[C.id] === '0') continue; // the Sun
  const mag = Number(f[C.mag]);
  if (!(mag <= LIMIT)) continue;
  const dist = Number(f[C.dist]);
  stars.push({
    hip: Number(f[C.hip]) || 0,
    ra: Number(f[C.ra]) * 15,
    dec: Number(f[C.dec]),
    pmra: Number(f[C.pmra]) || 0,
    pmdec: Number(f[C.pmdec]) || 0,
    // HYG marks an unknown distance as 100,000 pc.
    plx: dist > 0 && dist < 100_000 ? 1000 / dist : 0,
    rv: Number(f[C.rv]) || 0,
    mag,
    ci: f[C.ci] === '' ? null : Number(f[C.ci]),
    proper: f[C.proper],
    bayer: f[C.bayer] ? bayerLetter(f[C.bayer]) : null,
    flam: f[C.flam],
    con: f[C.con],
  });
}
stars.sort((a, b) => a.mag - b.mag || a.hip - b.hip);

const round = (x: number, decimals: number) => {
  const k = 10 ** decimals;
  return Math.round(x * k) / k;
};

const names: [number, string][] = [];
const designations: [number, string, string][] = [];
stars.forEach((s, i) => {
  if (s.proper) names.push([i, s.proper]);
  const letter = s.bayer ?? (s.flam ? s.flam : null);
  if (letter && s.con) designations.push([i, letter, s.con]);
});

const output = {
  source: `HYG database ${VERSION}, David Nash (astronexus.com), stars to visual magnitude ${LIMIT}`,
  licence: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). This file is a derived work of the HYG database and is shared under the same licence.',
  epoch: 2000,
  units: {
    ra: '1e-4 degrees, ICRS', dec: '1e-4 degrees, ICRS', pmra: 'mas/yr, includes cos(dec)', pmdec: 'mas/yr', plx: '0.1 mas (0 = unknown)',
    rv: 'km/s (0 = unknown)', mag: '0.01 mag (visual)', ci: '0.001 mag B−V (null = unknown)', hip: 'Hipparcos number (0 = none)',
  },
  count: stars.length,
  ra: stars.map((s) => Math.round(s.ra * 1e4)),
  dec: stars.map((s) => Math.round(s.dec * 1e4)),
  pmra: stars.map((s) => Math.round(s.pmra)),
  pmdec: stars.map((s) => Math.round(s.pmdec)),
  plx: stars.map((s) => Math.round(s.plx * 10)),
  rv: stars.map((s) => Math.round(s.rv)),
  mag: stars.map((s) => Math.round(s.mag * 100)),
  ci: stars.map((s) => (s.ci === null ? null : Math.round(s.ci * 1000))),
  hip: stars.map((s) => s.hip),
  names,
  designations,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(output));
console.log(`Wrote ${OUT}: ${stars.length} stars, ${names.length} proper names, ${designations.length} designations; ${round(JSON.stringify(output).length / 1024, 1)} kB`);
