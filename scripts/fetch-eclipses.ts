/**
 * Fetches NASA's lists of solar and lunar eclipses for 1900–2100 (Fred
 * Espenak's Five Millennium Catalogs) and writes them to
 * tests/fixtures/eclipses.json, for the eclipse finder's tests.
 *
 * Each row has the date and time of greatest eclipse in TD (TT), the Saros
 * series, the type (solar: P partial, A annular, T total, H hybrid; lunar: N
 * penumbral, P partial, T total), gamma (how far the shadow's axis passes
 * from Earth's centre, in Earth radii) and the magnitude (lunar: penumbral
 * and umbral).
 *
 * The data may be reproduced with the acknowledgment
 * "Eclipse Predictions by Fred Espenak (NASA's GSFC)".
 *
 *   node scripts/fetch-eclipses.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BASE = 'https://eclipse.gsfc.nasa.gov';
const PAGES = [
  ['solar', 'SEcat5/SE1801-1900'],
  ['solar', 'SEcat5/SE1901-2000'],
  ['solar', 'SEcat5/SE2001-2100'],
  ['lunar', 'LEcat5/LE1801-1900'],
  ['lunar', 'LEcat5/LE1901-2000'],
  ['lunar', 'LEcat5/LE2001-2100'],
] as const;
const CACHE = 'scripts/.cache';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function page(path: string): Promise<string> {
  const file = `${CACHE}/${path.split('/')[1]}.html`;
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const response = await fetch(`${BASE}/${path}.html`);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  const text = await response.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, text);
  return text;
}

/** Julian Date of a Gregorian calendar date and time (Meeus 7.1). */
function jd(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

interface Row {
  kind: 'solar' | 'lunar';
  date: string;
  td: string;
  jdTT: number;
  deltaT: number;
  saros: number;
  type: string;
  gamma: number;
  magnitude: number;
  umbral?: number;
}

const rows: Row[] = [];
for (const [kind, path] of PAGES) {
  const text = (await page(path)).replace(/<[^>]*>/g, '');
  for (const line of text.split('\n')) {
    // 09511  2001 Jun 21  12:04:46     64     18  127   T   -p  -0.5701  1.0495 …
    const m = /^\s*\d{5}\s+(-?\d{4}) (\w{3}) (\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+(-?\d+)\s+-?\d+\s+(-?\d+)\s+(\w)\S*\s+\S+\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)(?:\s+(-?\d+\.\d+))?/.exec(line);
    if (!m) continue;
    const year = Number(m[1]);
    if (year < 1900 || year > 2100) continue;
    const month = MONTHS.indexOf(m[2]) + 1;
    const [h, min, s] = [m[4], m[5], m[6]].map(Number);
    const row: Row = {
      kind,
      date: `${m[1]}-${String(month).padStart(2, '0')}-${m[3]}`,
      td: `${m[4]}:${m[5]}:${m[6]}`,
      jdTT: Number((jd(year, month, Number(m[3])) + (h + min / 60 + s / 3600) / 24).toFixed(6)),
      deltaT: Number(m[7]),
      saros: Number(m[8]),
      type: m[9],
      gamma: Number(m[10]),
      magnitude: Number(m[11]),
    };
    if (kind === 'lunar') row.umbral = Number(m[12]);
    rows.push(row);
  }
}

mkdirSync('tests/fixtures', { recursive: true });
writeFileSync(
  'tests/fixtures/eclipses.json',
  JSON.stringify(
    {
      source: 'NASA Five Millennium Catalogs of Solar and Lunar Eclipses (eclipse.gsfc.nasa.gov), fetched by scripts/fetch-eclipses.ts',
      credit: 'Eclipse Predictions by Fred Espenak (NASA’s GSFC)',
      fetched: new Date().toISOString().slice(0, 10),
      units:
        'jdTT: Julian Date (TT) of greatest eclipse; deltaT: s; type: solar P/A/T/H, lunar N/P/T; gamma: Earth radii; magnitude: solar eclipse magnitude, or lunar penumbral magnitude with umbral',
      rows,
    },
    null,
    0,
  ).replace(/\},\{/g, '},\n{'),
);
console.log(`Wrote ${rows.filter((r) => r.kind === 'solar').length} solar and ${rows.filter((r) => r.kind === 'lunar').length} lunar eclipses`);
