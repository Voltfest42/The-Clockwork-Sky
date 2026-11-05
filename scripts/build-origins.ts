/**
 * Builds src/data/origins/origins.json, where each element in the Solar
 * System was made, by share: Jennifer Johnson's periodic table of the
 * elements' origins (Ohio State University, 2017; Johnson 2019, Science 363,
 * 474), CC BY-SA 4.0, as read off her figure by C. M. G. Lee for the
 * Wikimedia Commons file "Nucleosynthesis periodic table.svg" (CC BY-SA). The
 * file is under the same share-alike licence, so it sits in its own folder
 * with a README, like the HYG stars.
 *
 *   node scripts/build-origins.ts
 *
 * The SVG is downloaded once into scripts/.cache/origins/. Its trailing
 * comment holds Lee's table: each element, its place in the table, the length
 * x (in pixels of Johnson's 185-pixel boxes) at which her diagonal boundary
 * between origins falls, and the origins in order. The script reads that
 * table as text (it runs nothing from the file) and turns each length into
 * shares the way Lee's code does: the area of the box on one side of the
 * diagonal, with helium's and lithium's first share split 45:55 and 37:63.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://upload.wikimedia.org/wikipedia/commons/3/31/Nucleosynthesis_periodic_table.svg';
const CACHE = 'scripts/.cache/origins/';
const RAW = CACHE + 'table.svg';
const OUT = 'src/data/origins/origins.json';

if (!existsSync(RAW)) {
  console.log(`Downloading ${URL}`);
  const response = await fetch(URL, { headers: { 'User-Agent': 'TheClockworkSky-data-script/1.0 (education)' } });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(RAW, await response.text());
}

const svg = readFileSync(RAW, 'utf8');
const start = svg.indexOf("datass = [[field.strip() for field in line.split('|')] for line in '''");
const end = svg.indexOf("'''", start + 80);
if (start < 0 || end < 0) throw new Error('The data table was not found in the SVG');
const table = svg.slice(svg.indexOf('\n', start) + 1, end);

const ORIGINS: Record<string, string> = {
  b: 'big-bang',
  j: 'cosmic-rays',
  y: 'low-mass-stars',
  o: 'neutron-star-mergers',
  g: 'massive-stars',
  c: 'white-dwarfs',
  z: 'none',
};
const X_MAX = 185;

const elements: { Z: number; symbol: string; shares: Record<string, number> }[] = [];
for (const line of table.split('\n')) {
  const fields = line.split('|').map((f) => f.trim());
  if (!fields[0]) continue; // the legend's rows
  const [symbol, , , xText, codes] = fields;
  const Z = elements.length + 1;
  const x = Number(xText);
  const n = codes.length;
  const f = (2 * x < X_MAX ? 2 * x * x : 4 * x * X_MAX - 2 * x * x - X_MAX * X_MAX) / (X_MAX * X_MAX);
  const fractions = n === 1 ? [1] : n === 2 ? [f, 1 - f] : Z === 2 ? [f * 0.45, f * 0.55, 1 - f] : [f * 0.37, f * 0.63, 1 - f];
  const shares: Record<string, number> = {};
  [...codes].forEach((code, i) => {
    shares[ORIGINS[code]] = Number(fractions[i].toFixed(3));
  });
  elements.push({ Z, symbol, shares });
}
if (elements.length !== 103 || elements[25].symbol !== 'Fe') throw new Error(`Unexpected table: ${elements.length} elements`);

mkdirSync('src/data/origins', { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({
    source: 'Jennifer Johnson, “Origin of the Elements in the Solar System” (Ohio State University, 2017; Johnson 2019, Science 363, 474), as read off her figure by C. M. G. Lee (Wikimedia Commons, “Nucleosynthesis periodic table.svg”)',
    licence: 'CC BY-SA 4.0',
    elements,
  }),
);
console.log(`Wrote ${OUT}: ${elements.length} elements`);
