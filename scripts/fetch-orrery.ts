/**
 * Fetches the Orrery's starting states from JPL Horizons (DE441): the Sun,
 * the planets, Pluto, Earth and the Moon, relative to the Solar System's
 * barycentre, in the ecliptic and equinox of J2000, and writes:
 * - src/data/orrery.json: each body's position (AU) and velocity (AU/day) on
 *   1 January 2026, 0h TT, with its G·m (km³/s², DE440's values);
 * - tests/fixtures/orrery.json: the same bodies a Julian century later, to
 *   test a hundred-year run against.
 *
 * The planets with moons are their systems' barycentres (Earth–Moon, Mars,
 * Jupiter, …), carrying the whole system's mass, so the Solar System preset
 * needs no moons. Earth and the Moon are also fetched apart, for the Earth and
 * Moon preset.
 *
 *   node scripts/fetch-orrery.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const EPOCH = 2_461_041.5;
const LATER = EPOCH + 36_525;

/** G·m in km³/s², from DE440 (Park et al. 2021, Table 8). Systems carry their moons. */
const BODIES = [
  { id: 'sun', name: 'Sun', code: '10', gm: 132_712_440_041.279419 },
  { id: 'mercury', name: 'Mercury', code: '199', gm: 22_031.868551 },
  { id: 'venus', name: 'Venus', code: '299', gm: 324_858.592 },
  { id: 'earth-moon', name: 'Earth and Moon', code: '3', gm: 403_503.235502 },
  { id: 'mars', name: 'Mars', code: '4', gm: 42_828.375816 },
  { id: 'jupiter', name: 'Jupiter', code: '5', gm: 126_712_764.1 },
  { id: 'saturn', name: 'Saturn', code: '6', gm: 37_940_584.841_8 },
  { id: 'uranus', name: 'Uranus', code: '7', gm: 5_794_556.4 },
  { id: 'neptune', name: 'Neptune', code: '8', gm: 6_836_527.100_58 },
  { id: 'pluto', name: 'Pluto', code: '9', gm: 975.5 },
  { id: 'earth', name: 'Earth', code: '399', gm: 398_600.435507 },
  { id: 'moon', name: 'Moon', code: '301', gm: 4_902.800118 },
];

async function horizons(command: string, jds: readonly number[]): Promise<string> {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${command}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@0'",
    TLIST: jds.map((jd) => jd.toFixed(6)).join(' '),
    TLIST_TYPE: 'JD',
    TIME_TYPE: 'TT',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'ICRF',
    OUT_UNITS: 'AU-D',
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

const bodies = [];
const fixture = [];
for (const body of BODIES) {
  const rows = states(await horizons(body.code, [EPOCH, LATER]));
  const [, x, y, z, vx, vy, vz] = rows[0];
  bodies.push({ id: body.id, name: body.name, gm: body.gm, x: [x, y, z], v: [vx, vy, vz] });
  fixture.push({ id: body.id, jdTT: rows[1][0], x: [rows[1][1], rows[1][2], rows[1][3]] });
  console.log(`${body.name}: done`);
}

writeFileSync(
  'src/data/orrery.json',
  JSON.stringify(
    {
      source: 'JPL Horizons (DE441): states relative to the Solar System barycentre, ecliptic and equinox of J2000; G·m from DE440',
      fetched: new Date().toISOString().slice(0, 10),
      epochTT: EPOCH,
      epoch: '2026 January 1, 0h TT',
      units: { gm: 'km³/s²', x: 'AU', v: 'AU/day' },
      bodies,
    },
    null,
    1,
  ),
);
mkdirSync('tests/fixtures', { recursive: true });
writeFileSync('tests/fixtures/orrery.json', JSON.stringify({ source: 'JPL Horizons (DE441); AU from the Solar System barycentre, ecliptic J2000', rows: fixture }));
console.log('Wrote src/data/orrery.json and tests/fixtures/orrery.json');
