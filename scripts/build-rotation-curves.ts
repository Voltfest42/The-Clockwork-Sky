/**
 * Builds the rotation curves for Chapter 30 (Figure 30.3):
 *
 * - src/data/sparc/galaxies.json: five galaxies from SPARC (Lelli, McGaugh &
 *   Schombert 2016, AJ 152, 157), each with its measured rotation curve and
 *   the speeds its gas, stellar disc and bulge give (the stars' for a
 *   mass-to-light ratio of 1 at 3.6 µm), from the Rotmod_LTG files, and its
 *   luminosity at 3.6 µm (L☉) from the sample's table. SPARC
 *   asks for a citation and states no licence (Part III plan §13, question 6),
 *   so the folder has its own README with the citation.
 * - src/data/rotationCurves.json: the Milky Way's circular speed from Gaia,
 *   APOGEE, 2MASS and WISE red giants: Eilers et al. (2019, ApJ 871, 120),
 *   Table 1, and Ou et al. (2024, MNRAS 528, 693), Table 1, read from the
 *   papers' arXiv sources (1810.09466 and 2303.12838).
 *
 *   node scripts/build-rotation-curves.ts
 *
 * Downloads are kept in scripts/.cache/sparc/ and scripts/.cache/rotation/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, inflateRawSync } from 'node:zlib';

const SPARC_URL = 'https://astroweb.cwru.edu/SPARC/Rotmod_LTG.zip';
const SPARC_TABLE_URL = 'https://astroweb.cwru.edu/SPARC/SPARC_Lelli2016c.mrt';
const ARXIV = (id: string) => `https://arxiv.org/e-print/${id}`;
/** NGC 3198 (van Albada et al. 1985's case for a dark halo), two more spirals, a giant and a dark-dominated dwarf. */
const GALAXIES = ['NGC3198', 'NGC2403', 'NGC6503', 'UGC02885', 'DDO154'];
const NAMES: Record<string, string> = { NGC3198: 'NGC 3198', NGC2403: 'NGC 2403', NGC6503: 'NGC 6503', UGC02885: 'UGC 2885', DDO154: 'DDO 154' };

async function cached(path: string, url: string): Promise<Buffer> {
  if (!existsSync(path)) {
    console.log(`Downloading ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  return readFileSync(path);
}

/** The files in a zip archive, by name (stored or deflated entries, read through the central directory). */
function unzip(zip: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Not a zip file');
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  for (let k = 0; k < count; k++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error('Bad central directory');
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extra = zip.readUInt16LE(at + 30);
    const comment = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString('latin1', at + 46, at + 46 + nameLength);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const raw = zip.subarray(start, start + size);
    files.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    at += 46 + nameLength + extra + comment;
  }
  return files;
}

/** The files in a gzipped tar archive, by name. */
function untar(gz: Buffer): Map<string, Buffer> {
  const tar = gunzipSync(gz);
  const files = new Map<string, Buffer>();
  let at = 0;
  while (at + 512 <= tar.length) {
    const name = tar.toString('latin1', at, at + 100).replace(/\0.*$/s, '');
    if (!name) break;
    const size = parseInt(tar.toString('latin1', at + 124, at + 136).replace(/\0.*$/s, '').trim() || '0', 8);
    files.set(name, tar.subarray(at + 512, at + 512 + size));
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

const round = (x: number, digits: number) => Number(x.toFixed(digits));

// ---------- SPARC ----------

const zip = unzip(await cached('scripts/.cache/sparc/Rotmod_LTG.zip', SPARC_URL));
// The sample's table: each galaxy's luminosity at 3.6 µm (10⁹ L☉) is its eighth column
const table = (await cached('scripts/.cache/sparc/SPARC_Lelli2016c.mrt', SPARC_TABLE_URL)).toString('latin1');
const luminosity = (id: string) => {
  const row = table.split(/\r?\n/).find((line) => line.trim().split(/\s+/)[0] === id);
  if (!row) throw new Error(`${id} is missing from the table`);
  return Number(row.trim().split(/\s+/)[7]) * 1e9;
};
const galaxies = GALAXIES.map((id) => {
  const text = zip.get(`${id}_rotmod.dat`)?.toString('latin1');
  if (!text) throw new Error(`${id} is missing from the archive`);
  const distance = Number(/Distance\s*=\s*([\d.]+)/.exec(text)![1]);
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.trim().split(/\s+/).map(Number));
  return {
    id,
    name: NAMES[id],
    distance,
    luminosity: luminosity(id),
    r: rows.map((c) => round(c[0], 2)),
    v: rows.map((c) => round(c[1], 1)),
    error: rows.map((c) => round(c[2], 1)),
    gas: rows.map((c) => round(c[3], 2)),
    disc: rows.map((c) => round(c[4], 2)),
    bulge: rows.map((c) => round(c[5], 2)),
  };
});
mkdirSync('src/data/sparc', { recursive: true });
writeFileSync('src/data/sparc/galaxies.json', JSON.stringify(galaxies) + '\n');
console.log(`SPARC: ${galaxies.map((g) => `${g.name} (${g.r.length} radii)`).join(', ')}`);

// ---------- the Milky Way ----------

/** Rows of numbers from a LaTeX table, skipping commented-out rows. */
function tableRows(tex: string, from: RegExp, to: RegExp): number[][] {
  const body = tex.slice(tex.search(from), tex.search(to));
  return body
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('%') && /^\s*[\d.]+\s*&/.test(line))
    .map((line) =>
      line
        .replace(/\\\\.*$/, '')
        .split('&')
        .map((cell) => Number(cell.trim())),
    );
}

const eilersTex = untar(await cached('scripts/.cache/rotation/eilers-src.tar.gz', ARXIV('1810.09466'))).get('main.tex')!.toString('utf8');
// Columns: R, v_c, σ⁻, σ⁺
const eilers = tableRows(eilersTex, /\\startdata/, /\\enddata/).map(([r, v, lo, hi]) => ({ r, v, lo, hi }));
const ouTex = untar(await cached('scripts/.cache/rotation/ou-src.tar.gz', ARXIV('2303.12838'))).get('tab01.tex')!.toString('utf8');
// Columns: R, v_c, σ⁺, σ⁻, N
const ou = tableRows(ouTex, /\\hline\s*\n\s*\n/, /\\end\{tabular\}/).map(([r, v, hi, lo]) => ({ r, v, lo, hi }));
writeFileSync(
  'src/data/rotationCurves.json',
  JSON.stringify({
    eilers2019: { r: eilers.map((p) => p.r), v: eilers.map((p) => p.v), lo: eilers.map((p) => p.lo), hi: eilers.map((p) => p.hi) },
    ou2024: { r: ou.map((p) => p.r), v: ou.map((p) => p.v), lo: ou.map((p) => p.lo), hi: ou.map((p) => p.hi) },
  }) + '\n',
);
console.log(`Milky Way: Eilers et al. ${eilers.length} radii (${eilers[0].r}–${eilers.at(-1)!.r} kpc), Ou et al. ${ou.length} radii (${ou[0].r}–${ou.at(-1)!.r} kpc)`);
