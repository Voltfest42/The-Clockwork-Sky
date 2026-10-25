/**
 * Builds src/data/hyg/neighbours.json, the stars within 10 parsecs of the Sun
 * for Figure 9.2, from the HYG database (David Nash, astronexus.com; CC BY-SA
 * 4.0), which build-stars.ts has already downloaded.
 *
 * Each star keeps its position (equatorial, ICRS, in parsecs, as HYG gives it),
 * its visual and absolute magnitudes, B−V, spectral type, name and Gliese
 * number, and a class: O–M for ordinary stars, D for white dwarfs. Stars with
 * no spectral type (a few dozen faint Gliese stars) are classed from B−V, or
 * failing that from their absolute magnitude; they are flagged.
 *
 *   node scripts/build-neighbours.ts
 *
 * The output is share-alike (CC BY-SA 4.0), like its source, and is kept in
 * the hyg folder with the star catalogue.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const CACHE = 'scripts/.cache/hyg_v44.csv.gz';
const OUT = 'src/data/hyg/neighbours.json';
const RADIUS = 10;

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

const GREEK: Record<string, string> = {
  Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ', Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ',
  Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ', Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω',
};

/** "Alp1Cen" → "α¹ Cen", "61    Cyg" → "61 Cyg", "Eps Ind" → "ε Ind". */
function designation(bf: string): string {
  const m = bf.trim().match(/^(\d+)?\s*([A-Z][a-z]{1,2})?(\d)?\s*([A-Z][a-z]{2})$/);
  if (!m) return bf.trim().replace(/\s+/g, ' ');
  const [, flam, letter, n, con] = m;
  const greek = letter && GREEK[letter] ? GREEK[letter] + (n ? '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(n)] : '') : null;
  return greek ? `${greek} ${con}` : `${flam ?? ''} ${con}`.trim();
}

type StarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' | 'D';

/** The class from a spectral type, or null if it doesn't say. "dM5.5e" → M, "sdM4" → M, "DA2" → D, "k-m" → K, "A0m..." → A. */
function classFromSpectrum(spect: string): StarClass | null {
  const s = spect.trim();
  if (/^D[ABCOQZXP]?/.test(s) && !/^d/.test(s)) return 'D';
  const m = s.replace(/^(esd|sd|d)/, '').match(/[OBAFGKMobafgkm]/);
  return m ? (m[0].toUpperCase() as StarClass) : null;
}

/** A rough class from B−V on the main sequence (Pecaut & Mamajek 2013's colour ranges), or from the absolute magnitude without a colour. */
function classFromColour(ci: number | null, absmag: number): StarClass {
  if (ci !== null) {
    if (ci < -0.1) return 'B';
    if (ci < 0.3) return 'A';
    if (ci < 0.58) return 'F';
    if (ci < 0.81) return 'G';
    if (ci < 1.4) return 'K';
    return 'M';
  }
  return absmag > 8.5 ? 'M' : 'K';
}

const lines = gunzipSync(readFileSync(CACHE)).toString('utf8').split(/\r?\n/).filter((l) => l.length > 0);
const header = splitCsv(lines[0]);
const col = (name: string) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`HYG has no column ${name}`);
  return i;
};
const C = {
  id: col('id'), hip: col('hip'), gl: col('gl'), bf: col('bf'), proper: col('proper'), dist: col('dist'), mag: col('mag'),
  absmag: col('absmag'), spect: col('spect'), ci: col('ci'), x: col('x'), y: col('y'), z: col('z'), base: col('base'),
};

interface Neighbour {
  name: string;
  gl: string;
  x: number;
  y: number;
  z: number;
  mag: number;
  absmag: number;
  ci: number | null;
  spect: string;
  cls: StarClass;
  /** The class was estimated from colour or brightness. */
  guessed: boolean;
  /** The system it belongs to (its Gliese number without A/B), for counting systems. */
  system: string;
}

const stars: Neighbour[] = [];
for (const line of lines.slice(1)) {
  const f = splitCsv(line);
  if (f[C.id] === '0') continue; // the Sun
  const dist = Number(f[C.dist]);
  if (!(dist > 0 && dist <= RADIUS)) continue;
  const ci = f[C.ci] === '' ? null : Number(f[C.ci]);
  const absmag = Number(f[C.absmag]);
  const spect = f[C.spect].trim();
  const fromSpectrum = classFromSpectrum(spect);
  const gl = f[C.gl].trim().replace(/\s+/g, ' ');
  const name = f[C.proper] || (f[C.bf].trim() ? designation(f[C.bf]) : '') || gl || `HIP ${f[C.hip]}`;
  stars.push({
    name,
    gl,
    x: Number(f[C.x]),
    y: Number(f[C.y]),
    z: Number(f[C.z]),
    mag: Number(f[C.mag]),
    absmag,
    ci,
    spect,
    cls: fromSpectrum ?? classFromColour(ci, absmag),
    guessed: fromSpectrum === null,
    system: f[C.base].trim().replace(/\s+/g, ' ') || gl.replace(/[A-Z]$/, '') || name,
  });
}
stars.sort((a, b) => Math.hypot(a.x, a.y, a.z) - Math.hypot(b.x, b.y, b.z));
// A companion without a name of its own takes its primary's: "Gl 244B" → "Sirius B".
for (const s of stars) {
  const letter = s.gl.match(/^G[lJ] [\d.]+([B-D])$/)?.[1];
  if (!letter || s.name !== s.gl) continue;
  const primary = stars.find((p) => p !== s && p.system === s.system && p.name !== p.gl && !/ [B-D]$/.test(p.name));
  if (primary) s.name = `${primary.name} ${letter}`;
}

const r = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;
const output = {
  source: 'HYG database v4.4, David Nash (astronexus.com): every star within 10 parsecs of the Sun',
  licence: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). This file is a derived work of the HYG database and is shared under the same licence.',
  units: { x: 'parsecs, ICRS equatorial (x towards RA 0h, z towards the north celestial pole)', mag: 'visual magnitude', absmag: 'absolute visual magnitude', ci: 'B−V' },
  count: stars.length,
  stars: stars.map((s) => ({ ...s, x: r(s.x, 4), y: r(s.y, 4), z: r(s.z, 4), mag: r(s.mag, 2), absmag: r(s.absmag, 2) })),
};
writeFileSync(OUT, JSON.stringify(output));
const counts: Record<string, number> = {};
for (const s of stars) counts[s.cls] = (counts[s.cls] ?? 0) + 1;
console.log(`Wrote ${OUT}: ${stars.length} stars (${JSON.stringify(counts)}), ${stars.filter((s) => s.guessed).length} classed by colour; ${r(JSON.stringify(output).length / 1024, 1)} kB`);
