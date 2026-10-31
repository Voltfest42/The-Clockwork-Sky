/**
 * Builds src/data/exoplanets.json, every confirmed exoplanet, from the NASA
 * Exoplanet Archive's Planetary Systems Composite Parameters table
 * (PSCompPars), through its TAP service. The Archive asks that work using it
 * acknowledge it and cite Christiansen et al. (2025, Planetary Science Journal); its pages
 * state no other terms.
 *
 *   node scripts/fetch-exoplanets.ts           (uses the cached download)
 *   node scripts/fetch-exoplanets.ts --refresh (downloads again)
 *
 * The raw CSV is kept in scripts/.cache/exoplanets/. Refresh it when asOf.ts
 * says the census is due (every six months), and update the date there.
 *
 * Masses and radii the Archive works out from each other by a mass–radius
 * relation ("M-R relationship", "Calculated Value") are left out: the census
 * shows only what was measured. Minimum masses (m sin i) are kept and marked.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const TAP = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
const CACHE = 'scripts/.cache/exoplanets/';
const RAW = CACHE + 'pscomppars.csv';
const OUT = 'src/data/exoplanets.json';

const COLUMNS = [
  'pl_name',
  'hostname',
  'discoverymethod',
  'disc_year',
  'disc_facility',
  'pl_orbper',
  'pl_orbsmax',
  'pl_bmasse',
  'pl_bmassprov',
  'pl_rade',
  'pl_rade_reflink',
  'st_teff',
  'st_lum',
  'sy_dist',
  'cb_flag',
];

async function download(): Promise<string> {
  if (!existsSync(RAW) || process.argv.includes('--refresh')) {
    const query = `select ${COLUMNS.join(',')} from pscomppars order by disc_year, pl_name`;
    const url = `${TAP}?query=${encodeURIComponent(query)}&format=csv`;
    console.log(`Downloading ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(RAW, await response.text());
    writeFileSync(CACHE + 'fetched.txt', new Date().toISOString().slice(0, 10));
  }
  return readFileSync(RAW, 'utf8');
}

/** One CSV line's fields, with quoted fields that may hold commas. */
function fields(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let k = 0; k < line.length; k++) {
    const c = line[k];
    if (c === '"') {
      if (quoted && line[k + 1] === '"') {
        cur += '"';
        k++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const text = await download();
const fetched = readFileSync(CACHE + 'fetched.txt', 'utf8').trim();
const [header, ...lines] = text.split(/\r?\n/).filter((l) => l.trim());
const names = fields(header);
for (const c of COLUMNS) if (!names.includes(c)) throw new Error(`Missing column ${c}`);
const rows = lines.map((l) => {
  const f = fields(l);
  return Object.fromEntries(names.map((n, k) => [n, f[k]])) as Record<string, string>;
});

/** A number to three significant figures, or null. */
const sig = (s: string, digits = 3) => {
  if (s === '' || s === undefined) return null;
  const x = Number(s);
  return Number.isFinite(x) ? Number(x.toPrecision(digits)) : null;
};

// Methods in the order the census figure lists them; the rest are "Other".
const METHODS = ['Transit', 'Radial Velocity', 'Microlensing', 'Imaging', 'Transit Timing Variations', 'Astrometry', 'Pulsar Timing'];
const methodOf = (m: string) => {
  const k = METHODS.indexOf(m);
  return k >= 0 ? k : METHODS.length;
};
const FACILITIES = ['Kepler', 'K2', 'Transiting Exoplanet Survey Satellite (TESS)'];
const facilityOf = (f: string) => FACILITIES.indexOf(f);

// Planets grouped by host star, so each star's values are stored once.
const order = [...rows.keys()].sort((i, j) => (rows[i].hostname < rows[j].hostname ? -1 : rows[i].hostname > rows[j].hostname ? 1 : 0));
const hosts: Record<string, string>[] = [];
const perHost: number[] = [];
for (const i of order) {
  if (hosts.at(-1)?.hostname !== rows[i].hostname) {
    hosts.push(rows[i]);
    perHost.push(0);
  }
  perHost[perHost.length - 1]++;
}
const planets = order.map((i) => rows[i]);

const out = {
  source: 'NASA Exoplanet Archive, Planetary Systems Composite Parameters (PSCompPars), via TAP',
  citation:
    'This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program. Christiansen et al. (2025), Planetary Science Journal.',
  fetched,
  count: rows.length,
  methods: [...METHODS, 'Other'],
  facilities: ['Kepler', 'K2', 'TESS'],
  /** Host stars, by name, each with its number of planets; the planets' columns below follow in the same order. */
  hosts: hosts.map((h) => h.hostname),
  planets: perHost,
  /** Each host's surface temperature (K, to 10 K), log₁₀ luminosity (L☉) and distance (pc). */
  teff: hosts.map((h) => (sig(h.st_teff) === null ? null : Math.round(Number(h.st_teff) / 10) * 10)),
  logL: hosts.map((h) => (sig(h.st_lum) === null ? null : Number(Number(h.st_lum).toFixed(2)))),
  distance: hosts.map((h) => sig(h.sy_dist)),
  /** Each planet's name after its host's ("b"), or "=" and its whole name when it doesn't start with the host's. */
  suffix: planets.map((r) => (r.pl_name.startsWith(r.hostname + ' ') ? r.pl_name.slice(r.hostname.length + 1) : '=' + r.pl_name)),
  method: planets.map((r) => methodOf(r.discoverymethod)),
  year: planets.map((r) => Number(r.disc_year)),
  /** Index into facilities, or −1. */
  facility: planets.map((r) => facilityOf(r.disc_facility)),
  /** Orbital period, days. */
  period: planets.map((r) => sig(r.pl_orbper)),
  /** Semi-major axis, AU (for microlensing, the projected separation). */
  a: planets.map((r) => sig(r.pl_orbsmax)),
  /** Mass, Earth masses: measured, or a minimum (m sin i) where massKind is 1. */
  mass: planets.map((r) => (r.pl_bmassprov === 'M-R relationship' ? null : sig(r.pl_bmasse))),
  /** 0: a true mass; 1: a minimum mass, m sin i. */
  massKind: planets.map((r) => (r.pl_bmassprov === 'Msini' ? 1 : 0)),
  /** Radius, Earth radii, measured (not worked out from the mass). */
  radius: planets.map((r) => (r.pl_rade_reflink.includes('CALCULATED_VALUE') ? null : sig(r.pl_rade))),
  /** 1 if it orbits a pair of stars. */
  circumbinary: planets.map((r) => Number(r.cb_flag) || 0),
};
writeFileSync(OUT, JSON.stringify(out));
const tess = out.facility.filter((f) => f === 2).length;
if (out.planets.reduce((a, b) => a + b, 0) !== out.count) throw new Error('Planets lost grouping by host');
console.log(`Wrote ${OUT}: ${out.count} planets (${tess} from TESS), fetched ${fetched}`);
