/**
 * Builds the sunspot files in src/data/silso/:
 *
 * - sunspots.json: the monthly mean total sunspot number since 1749 and its
 *   13-month smoothed version (version 2), and the dates and heights of every
 *   cycle's minimum and maximum, from WDC-SILSO, Royal Observatory of
 *   Belgium, Brussels (doi 10.24414/qnza-ac80). SILSO's data are shared under
 *   CC BY-NC 4.0, so this file is too, in its own folder. Provisional months
 *   are marked; SILSO's daily estimated numbers aren't used.
 * - butterfly.json: the butterfly diagram, the area of sunspots by latitude
 *   for every solar rotation since 1874, from the Royal Greenwich Observatory
 *   and USAF/NOAA records as compiled by D. Hathaway (solarcyclescience.com,
 *   formerly NASA Marshall), US government data. Areas after 1976 are already
 *   multiplied by 1.4 to match the Greenwich ones.
 *
 *   node scripts/build-sunspots.ts
 *
 * The raw files are downloaded once into scripts/.cache/silso/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CACHE = 'scripts/.cache/silso/';
const SOURCES = {
  'SN_m_tot_V2.0.csv': 'https://www.sidc.be/SILSO/INFO/snmtotcsv.php',
  'SN_ms_tot_V2.0.csv': 'https://www.sidc.be/SILSO/INFO/snmstotcsv.php',
  'cyclesminmax.html': 'https://www.sidc.be/SILSO/cyclesminmax',
  'bflydata.txt': 'http://solarcyclescience.com/AR_Database/bflydata.txt',
} as const;

async function download(name: keyof typeof SOURCES): Promise<string> {
  const path = CACHE + name;
  if (!existsSync(path)) {
    console.log(`Downloading ${SOURCES[name]}`);
    const response = await fetch(SOURCES[name]);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(path, await response.text());
  }
  return readFileSync(path, 'utf8');
}

// Monthly numbers: year; month; decimal year; number; standard deviation; observations; 1 if definitive, 0 if provisional.
const parse = (text: string) =>
  text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => l.split(';').map((s) => s.trim()));
const monthly = parse(await download('SN_m_tot_V2.0.csv'));
const smoothed = parse(await download('SN_ms_tot_V2.0.csv'));
if (monthly[0][0] !== '1749' || monthly[0][1] !== '01') throw new Error('Expected the monthly series to start in January 1749');
const firstProvisional = monthly.findIndex((r) => r[6] === '0');

// The cycles table: seven cells a row (number; minimum's year, month and number; maximum's year, month and number), decimals with commas.
const html = await download('cyclesminmax.html');
const cells = [...html.matchAll(/<td[^>]*>\s*([^<]*?)\s*<\/td>/g)].map((m) => m[1]);
const cycles: { n: number; min: [number, number]; minSn: number; max: [number, number] | null; maxSn: number | null }[] = [];
for (let i = 0; i + 6 < cells.length; i += 7) {
  const c = cells.slice(i, i + 7).map((s) => s.replace(',', '.'));
  const n = Number(c[0]);
  if (!Number.isInteger(n) || n !== cycles.length + 1) break;
  cycles.push({
    n,
    min: [Number(c[1]), Number(c[2])],
    minSn: Number(c[3]),
    max: c[4] ? [Number(c[4]), Number(c[5])] : null,
    maxSn: c[6] ? Number(c[6]) : null,
  });
}
if (cycles.length < 25) throw new Error(`Found only ${cycles.length} cycles`);

writeFileSync(
  'src/data/silso/sunspots.json',
  JSON.stringify({
    source: 'WDC-SILSO, Royal Observatory of Belgium, Brussels: monthly mean total sunspot number, version 2 (doi 10.24414/qnza-ac80)',
    licence: 'CC BY-NC 4.0',
    start: [1749, 1],
    // Monthly means, one a month from January 1749; −1 where none.
    monthly: monthly.map((r) => Number(r[3])),
    // 13-month smoothed, from the same month; −1 for the last six months, which it can't smooth yet.
    smoothed: smoothed.map((r) => Number(r[3])),
    // The first provisional month's index, if any: later values may still be revised.
    provisionalFrom: firstProvisional >= 0 ? firstProvisional : null,
    cycles,
  }),
);
console.log(`Wrote src/data/silso/sunspots.json: ${monthly.length} months to ${monthly.at(-1)!.slice(0, 2).join('-')}, ${cycles.length} cycles`);

// The butterfly diagram: for each Carrington rotation, its number and then 50 areas (millionths of a hemisphere), in latitude bands of equal
// width in sin(latitude), from the south pole to the north.
const fly = await download('bflydata.txt');
const rotations: { cr: number; areas: number[] }[] = [];
for (const line of fly.split(/\r?\n/)) {
  if (!line.trim()) continue;
  if (!line.includes(',')) rotations.push({ cr: Number(line.trim()), areas: [] });
  else rotations.at(-1)!.areas.push(...line.split(',').filter((s) => s.trim()).map(Number));
}
if (!rotations.every((r, i) => r.areas.length === 50 && r.cr === rotations[0].cr + i)) throw new Error('Unexpected butterfly data');
// Areas as one character each, 0–9 then a–f: 0 is none, and each step up is twice the area, from 1–2 millionths up.
const level = (a: number) => (a <= 0 ? 0 : Math.max(1, Math.min(15, Math.floor(Math.log2(a)) + 1)));
writeFileSync(
  'src/data/silso/butterfly.json',
  JSON.stringify({
    source: 'D. Hathaway, from the Royal Greenwich Observatory and USAF/NOAA sunspot records (solarcyclescience.com), US government data',
    firstRotation: rotations[0].cr,
    bands: 50,
    // One string a rotation, south to north; character k is the level of band k: 0 none, n the areas from 2ⁿ⁻¹ to 2ⁿ millionths of a hemisphere.
    rotations: rotations.map((r) => r.areas.map((a) => level(a).toString(16)).join('')),
  }),
);
console.log(`Wrote src/data/silso/butterfly.json: rotations ${rotations[0].cr}–${rotations.at(-1)!.cr}`);
