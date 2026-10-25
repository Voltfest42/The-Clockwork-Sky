/**
 * Fetches the states of Jupiter's four large moons from JPL Horizons (the
 * JUP365 satellite ephemeris), relative to Jupiter's centre, for Figure 8.3,
 * and writes:
 * - src/data/galilean.json: each moon's position and velocity on 1 January
 *   2026, 0h TT, in the ecliptic and equinox of J2000 (km, km/s), with the
 *   G·m of Jupiter and of each moon (km³/s²), from the same ephemeris;
 * - tests/fixtures/galilean.json: their positions every 10 days for the next
 *   60 days, to test the n-body run against.
 *
 *   node scripts/fetch-galilean.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const EPOCH = 2_461_041.5;
const MOONS = [
  { id: 'io', name: 'Io', code: '501' },
  { id: 'europa', name: 'Europa', code: '502' },
  { id: 'ganymede', name: 'Ganymede', code: '503' },
  { id: 'callisto', name: 'Callisto', code: '504' },
];
const LATER = [10, 20, 30, 40, 50, 60].map((d) => EPOCH + d);

async function horizons(command: string, jds: readonly number[], objData = false): Promise<string> {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${command}'`,
    OBJ_DATA: objData ? 'YES' : 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@599'",
    TLIST: jds.map((jd) => jd.toFixed(6)).join(' '),
    TLIST_TYPE: 'JD',
    TIME_TYPE: 'TT',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'ICRF',
    OUT_UNITS: 'KM-S',
    VEC_TABLE: '2',
    CSV_FORMAT: 'YES',
  });
  const response = await fetch(`${API}?${params}`);
  if (!response.ok) throw new Error(`Horizons ${command}: ${response.status}`);
  return ((await response.json()) as { result: string }).result;
}

function states(text: string): number[][] {
  const start = text.indexOf('$$SOE');
  const end = text.indexOf('$$EOE');
  if (start < 0 || end < 0) throw new Error(`Horizons: no ephemeris\n${text.slice(0, 2000)}`);
  return text
    .slice(start + 5, end)
    .trim()
    .split('\n')
    .map((line) => line.split(',').map((s) => s.trim()).filter((s) => s !== '' && !Number.isNaN(Number(s))).map(Number));
}

/** "GM (km^3/s^2)          = 5959.9155+- 0.004" → 5959.9155. */
function gm(text: string): number {
  const m = text.match(/GM[^=\n]*\(km\^3\/s\^2\)\s*=\s*([\d.]+)/) ?? text.match(/GM, km\^3\/s\^2\s*=\s*([\d.]+)/);
  if (!m) throw new Error(`No GM in\n${text.slice(0, 3000)}`);
  return Number(m[1]);
}

const jupiterText = await horizons('599', [EPOCH], true);
const jupiterGM = gm(jupiterText);
const moons = [];
const fixture = [];
for (const moon of MOONS) {
  const text = await horizons(moon.code, [EPOCH, ...LATER], true);
  const rows = states(text);
  const [, x, y, z, vx, vy, vz] = rows[0];
  moons.push({ ...moon, code: undefined, gm: gm(text), x: [x, y, z], v: [vx, vy, vz] });
  for (const row of rows.slice(1)) fixture.push({ id: moon.id, jdTT: row[0], x: [row[1], row[2], row[3]] });
  console.log(`${moon.name}: done`);
}

writeFileSync(
  'src/data/galilean.json',
  JSON.stringify(
    {
      source: 'JPL Horizons, JUP365 satellite ephemeris: states relative to Jupiter’s centre, ecliptic and equinox of J2000',
      fetched: new Date().toISOString().slice(0, 10),
      epochTT: EPOCH,
      epoch: '2026 January 1, 0h TT',
      units: { gm: 'km³/s²', x: 'km', v: 'km/s' },
      jupiter: { gm: jupiterGM, radiusKm: 71_492 },
      moons,
    },
    null,
    1,
  ),
);
mkdirSync('tests/fixtures', { recursive: true });
writeFileSync('tests/fixtures/galilean.json', JSON.stringify({ source: 'JPL Horizons, JUP365; km relative to Jupiter, ecliptic J2000', rows: fixture }));
console.log(`Jupiter G·m ${jupiterGM}; wrote src/data/galilean.json and tests/fixtures/galilean.json`);
