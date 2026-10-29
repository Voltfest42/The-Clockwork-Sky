/**
 * Builds src/data/dwarfSequence.json, the mean colours, temperatures and
 * bolometric corrections of main-sequence stars, from Eric Mamajek's table "A
 * Modern Mean Dwarf Stellar Color and Effective Temperature Sequence"
 * (version 2022.04.16). The table states no licence and asks that Pecaut &
 * Mamajek (2013, ApJS 208, 9) be cited.
 *
 *   npx tsx scripts/build-dwarfs.ts
 *
 * The raw file is downloaded once into scripts/.cache/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt';
const CACHE = 'scripts/.cache/mamajek.txt';
const OUT = 'src/data/dwarfSequence.json';

async function download(): Promise<string> {
  if (!existsSync(CACHE)) {
    console.log(`Downloading ${URL}`);
    const response = await fetch(URL);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    mkdirSync('scripts/.cache', { recursive: true });
    writeFileSync(CACHE, await response.text());
  }
  return readFileSync(CACHE, 'utf8');
}

const text = await download();
const version = /Version (\S+)/.exec(text)?.[1];
if (version !== '2022.04.16') console.warn(`Expected version 2022.04.16, found ${version}`);
const lines = text.split(/\r?\n/);
const header = lines.findIndex((l) => l.startsWith('#SpT'));
const columns = lines[header].slice(1).trim().split(/\s+/);
const col = (name: string) => {
  const i = columns.indexOf(name);
  if (i < 0) throw new Error(`No column ${name}`);
  return i;
};
const num = (s: string) => (/^-?\d/.test(s) ? Number(s) : null);

const rows: Record<string, (number | null)[] | string[]> = { spt: [], teff: [], logL: [], mbol: [], bcv: [], mv: [], bv: [], gv: [], bprp: [], mg: [], radius: [], mass: [] };
for (const line of lines.slice(header + 1)) {
  if (line.startsWith('#')) break;
  if (!line.trim()) continue;
  const f = line.trim().split(/\s+/);
  (rows.spt as string[]).push(f[0]);
  const put = (key: string, name: string) => (rows[key] as (number | null)[]).push(num(f[col(name)]));
  put('teff', 'Teff');
  put('logL', 'logL');
  put('mbol', 'Mbol');
  put('bcv', 'BCv');
  put('mv', 'Mv');
  put('bv', 'B-V');
  put('gv', 'G-V');
  put('bprp', 'Bp-Rp');
  put('mg', 'M_G');
  put('radius', 'R_Rsun');
  put('mass', 'Msun');
}

writeFileSync(
  OUT,
  JSON.stringify({
    source: `E. Mamajek, “A Modern Mean Dwarf Stellar Color and Effective Temperature Sequence”, version ${version} (${URL}); cite Pecaut & Mamajek (2013), ApJS 208, 9`,
    licence: 'No licence stated; used with the citation the author asks for',
    units: { teff: 'K', logL: 'log10 L/L☉', mbol: 'mag', bcv: 'mag (V band)', mv: 'mag', bv: 'mag', gv: 'mag (Gaia DR2 G − Johnson V)', bprp: 'mag (Gaia)', mg: 'mag', radius: 'R☉', mass: 'M☉' },
    ...rows,
  }) + '\n',
);
console.log(`Wrote ${OUT}: ${(rows.spt as string[]).length} spectral types`);
