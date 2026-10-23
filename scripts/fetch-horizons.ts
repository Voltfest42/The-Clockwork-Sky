/**
 * Fetches reference positions of the Sun, the Moon and the planets from JPL
 * Horizons (DE441) for the ephemeris tests, and writes them to
 * tests/fixtures/horizons.json.
 *
 * Each row is a geocentric astrometric position: right ascension and
 * declination in the ICRF (J2000 equator and equinox, to within 0.02″),
 * corrected for light-time but not for aberration, nutation or precession, and
 * the distance from Earth's centre. Times are Julian Dates in TT.
 *
 *   npx tsx scripts/fetch-horizons.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/** Horizons codes. Planets use their system barycentres, which DE441 covers for its whole span (within 1,000 km of the planet's centre). */
const BODIES: Record<string, string> = {
  sun: '10',
  moon: '301',
  mercury: '1',
  venus: '2',
  mars: '4',
  jupiter: '5',
  saturn: '6',
  uranus: '7',
  neptune: '8',
};

/** 1800–2050, roughly every ten years, at scattered days and hours (JD TT). */
const MODERN = Array.from({ length: 26 }, (_, i) => 2_378_496.5 + i * 3652.5 + ((i * 97.37) % 365) + ((i * 0.137) % 1));
/** 3000 BC to AD 3000, outside 1800–2050. */
const LONG = [
  -2999, -2500, -2000, -1500, -1000, -500, 0, 500, 1000, 1300, 1600, 1750, 2100, 2400, 2700, 2999,
].map((year, i) => 2_451_545 + (year - 2000) * 365.25 + i * 23.1);

async function fetchBody(command: string, jds: readonly number[]) {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${command}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: "'500@399'",
    TLIST: jds.map((jd) => jd.toFixed(6)).join(' '),
    TLIST_TYPE: 'JD',
    TIME_TYPE: 'TT',
    QUANTITIES: "'1,20'",
    ANG_FORMAT: 'DEG',
    EXTRA_PREC: 'YES',
    CSV_FORMAT: 'YES',
  });
  const response = await fetch(`${API}?${params}`);
  if (!response.ok) throw new Error(`Horizons ${command}: ${response.status}`);
  const body = (await response.json()) as { result: string };
  const text = body.result;
  const start = text.indexOf('$$SOE');
  const end = text.indexOf('$$EOE');
  if (start < 0 || end < 0) throw new Error(`Horizons ${command}: no ephemeris\n${text.slice(0, 2000)}`);
  return text
    .slice(start + 5, end)
    .trim()
    .split('\n')
    .map((line, i) => {
      const f = line.split(',').map((s) => s.trim());
      // Date, (solar presence), (lunar presence), RA, Dec, delta, deldot
      const numbers = f.slice(1).filter((s) => s !== '' && !Number.isNaN(Number(s))).map(Number);
      const [ra, dec, delta] = numbers;
      return { jdTT: jds[i], ra, dec, delta };
    });
}

const rows: { body: string; jdTT: number; ra: number; dec: number; delta: number }[] = [];
for (const [body, command] of Object.entries(BODIES)) {
  for (const set of [MODERN, LONG]) {
    for (const row of await fetchBody(command, set)) rows.push({ body, ...row });
  }
  console.log(`${body}: done`);
}

mkdirSync('tests/fixtures', { recursive: true });
writeFileSync(
  'tests/fixtures/horizons.json',
  JSON.stringify(
    {
      source: 'JPL Horizons (DE441), fetched by scripts/fetch-horizons.ts',
      fetched: new Date().toISOString().slice(0, 10),
      units: 'jdTT: Julian Date (TT); ra, dec: degrees, ICRF, geocentric astrometric; delta: AU from Earth’s centre',
      rows,
    },
    null,
    1,
  ),
);
console.log(`Wrote ${rows.length} rows to tests/fixtures/horizons.json`);
