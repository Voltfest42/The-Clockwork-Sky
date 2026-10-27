/**
 * Where the coming eclipses can be seen, from NASA's decade tables of solar
 * and lunar eclipses (Fred Espenak, NASA's GSFC), 2021–2050, and writes
 * src/data/eclipseRegions.json: for every total, annular and hybrid eclipse of
 * the Sun, the places its central path crosses and how long it lasts at most;
 * for every total eclipse of the Moon, the parts of the world that see it. The course finds the eclipses
 * themselves with its own eclipse finder; this file only names the places.
 *
 *   node scripts/build-eclipse-regions.ts
 *
 * The raw pages are kept in scripts/.cache/eclipse-regions/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CACHE = 'scripts/.cache/eclipse-regions';
const DECADES = [2021, 2031, 2041];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function page(kind: 'SE' | 'LE', decade: number): Promise<string> {
  const file = `${CACHE}/${kind}${decade}.html`;
  if (!existsSync(file)) {
    const response = await fetch(`https://eclipse.gsfc.nasa.gov/${kind}decade/${kind}decade${decade}.html`);
    if (!response.ok) throw new Error(`${kind} ${decade}: ${response.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
  return readFileSync(file, 'latin1');
}

/** NASA's short place names, in words: "s Africa" → "southern Africa", "N. America" → "North America". */
function words(text: string): string {
  const sides: Record<string, string> = { n: 'northern', s: 'southern', e: 'eastern', w: 'western', c: 'central', ne: 'north-eastern', nw: 'north-western', se: 'south-eastern', sw: 'south-western' };
  return text
    .replace(/&amp;/g, '&')
    .replace(/\bN\. America\b/g, 'North America')
    .replace(/\bS\. America\b/g, 'South America')
    .replace(/\bC\. America\b/g, 'Central America')
    .replace(/\bMid East\b/g, 'the Middle East')
    .replace(/\bN\. Z\./g, 'New Zealand')
    .replace(/\bS\. Africa\b/g, 'South Africa')
    .replace(/\bN\. Dakota\b/g, 'North Dakota')
    .replace(/\bDominican Rep\./g, 'Dominican Republic')
    .replace(/\bFr\. Guyana\b/g, 'French Guiana')
    .replace(/\bIndondesia\b/g, 'Indonesia')
    .replace(/\bSwaziland\b/g, 'Eswatini')
    .replace(/\bAfganistan\b/g, 'Afghanistan')
    .replace(/\bDom\.Rep\./g, 'Dominican Republic')
    .replace(/\bN\.A\./g, 'North America')
    .replace(/\bS America\b/g, 'South America')
    .replace(/\bCote d'Ivoire\b/g, 'Côte d’Ivoire')
    .replace(/\b([ns])\. (?=[A-Z])/g, (_, side: string) => `${side} `)
    .replace(/\b(ne|nw|se|sw|n|s|e|w|c) (?=[A-Z])/g, (_, side: string) => `${sides[side]} `)
    .replace(/\s+/g, ' ')
    .split(',')
    .map((place) => place.trim())
    .filter(Boolean)
    .join(', ');
}

/** The table's rows: date, type and the last cell's text. */
function rows(html: string) {
  const out: { date: string; type: string; cell: string; before: string }[] = [];
  for (const row of html.split(/<tr[\s>]/).slice(1)) {
    const date = row.match(/(\d{4}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d\d)/);
    const type = row.match(/>\s*(Total|Annular|Hybrid|Partial|Penumbral)\s*</);
    const cells = row.split(/<td[^>]*>/);
    if (!date || !type || cells.length < 7) continue;
    const iso = `${date[1]}-${String(MONTHS.indexOf(date[2]) + 1).padStart(2, '0')}-${date[3]}`;
    const text = (cell: string) => cell.split('</td>')[0].replace(/<[^>]+>/g, ' ').trim();
    out.push({ date: iso, type: type[1].toLowerCase(), cell: cells[cells.length - 1].split('</td>')[0], before: text(cells[cells.length - 2]) });
  }
  return out;
}

const solar = [];
const lunar = [];
for (const decade of DECADES) {
  for (const r of rows(await page('SE', decade))) {
    if (r.type === 'partial') continue;
    const path = r.cell.match(/\[(?:Total|Annular|Hybrid):\s*([^\]]+)\]/);
    if (!path) throw new Error(`No path for the solar eclipse of ${r.date}`);
    // The longest the Sun stays covered (or ringed), anywhere on the path: "06m23s" is 383 seconds.
    const d = r.before.match(/(\d+)m(\d+)s/);
    solar.push({ date: r.date, type: r.type, path: words(path[1]), seconds: d ? 60 * Number(d[1]) + Number(d[2]) : null });
  }
  for (const r of rows(await page('LE', decade))) {
    if (r.type !== 'total') continue;
    lunar.push({ date: r.date, seen: words(r.cell.replace(/<[^>]+>/g, ' ')) });
  }
}

writeFileSync(
  'src/data/eclipseRegions.json',
  JSON.stringify(
    {
      source: 'NASA eclipse decade tables, 2021–2050: Eclipse Predictions by Fred Espenak (NASA’s GSFC)',
      fetched: new Date().toISOString().slice(0, 10),
      covers: { from: '2021-01-01', to: '2050-12-31' },
      solar,
      lunar,
    },
    null,
    1,
  ),
);
console.log(`Wrote src/data/eclipseRegions.json: ${solar.length} central solar eclipses and ${lunar.length} total lunar eclipses.`);
