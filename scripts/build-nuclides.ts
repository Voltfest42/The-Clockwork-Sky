/**
 * Builds src/data/nuclides.json, every known nuclide's ground state for the
 * chart of nuclides (Chapter 23): protons, neutrons, mass excess (and whether
 * it is measured or extrapolated from systematics), half-life, the two main
 * decay modes with their branches, natural abundance, spin and parity, and
 * the year of discovery. The source is the IAEA's LiveChart of Nuclides API
 * (nds.iaea.org/relnsd), which serves ENSDF's half-lives and decays with
 * NUBASE2020's and AME2020's masses. The IAEA's terms allow its data to be
 * adapted and copied for teaching with an acknowledgement.
 *
 *   node scripts/build-nuclides.ts
 *
 * The raw CSV is downloaded once into scripts/.cache/nuclides/. Binding
 * energies and separation energies are not stored: the course works them out
 * from the mass excesses (src/core/nuclear/nuclides.ts), and a test checks
 * them against the IAEA's own columns.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all';
const CACHE = 'scripts/.cache/nuclides/';
const RAW = CACHE + 'ground_states.csv';
const OUT = 'src/data/nuclides.json';

if (!existsSync(RAW)) {
  console.log(`Downloading ${URL}`);
  const response = await fetch(URL, { headers: { 'User-Agent': 'TheClockworkSky-data-script/1.0 (education)' } });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(RAW, await response.text());
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

const lines = readFileSync(RAW, 'utf8').split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0]);
const rows = lines.slice(1).map((line) => {
  const fields = parseCsvLine(line);
  return Object.fromEntries(header.map((h, i) => [h, (fields[i] ?? '').trim()]));
});
const extracted = rows[0].Extraction_date;

const num = (s: string) => (s === '' ? null : Number(s));
/** Significant figures, as a number. */
const sig = (x: number, d: number) => Number(x.toPrecision(d));
const OPERATORS: Record<string, string> = { LT: '<', GT: '>', GE: '≥', AP: '~', LE: '≤' };

const Z: number[] = [];
const N: number[] = [];
const me: (number | null)[] = [];
const sys: number[] = [];
const hl: (number | null)[] = [];
const hlOp: Record<number, string> = {};
const d1: string[] = [];
const p1: (number | null)[] = [];
const d2: string[] = [];
const p2: (number | null)[] = [];
const ab: Record<number, number> = {};
const jp: string[] = [];
const year: (number | null)[] = [];

for (const r of rows) {
  const z = Number(r.z);
  const n = Number(r.n);
  // The free neutron stays; the tetraneutron and hexaneutron entries (no masses, no lifetimes) go.
  if (z === 0 && n !== 1) continue;
  const mass = num(r.massexcess);
  const stable = r.half_life === 'STABLE';
  const seconds = num(r.half_life_sec);
  // Keep a nuclide if anything is known of it: a mass or a lifetime.
  if (mass === null && !stable && seconds === null) continue;
  const i = Z.length;
  Z.push(z);
  N.push(n);
  me.push(mass === null ? null : Math.round(mass * 10) / 10);
  if (r.me_systematics === 'Y') sys.push(i);
  // Half-life in seconds: −1 for stable, null for unknown.
  hl.push(stable ? -1 : seconds === null ? null : sig(seconds, 4));
  if (r.operator_hl && OPERATORS[r.operator_hl]) hlOp[i] = OPERATORS[r.operator_hl];
  d1.push(r.decay_1);
  p1.push(num(r['decay_1_%']));
  d2.push(r.decay_2);
  p2.push(num(r['decay_2_%']));
  const abundance = num(r.abundance);
  if (abundance !== null) ab[i] = abundance;
  jp.push(r.jp);
  year.push(num(r.discovery));
}

const out = {
  source: `IAEA LiveChart of Nuclides (nds.iaea.org/relnsd/v1), ground states (ENSDF half-lives and decays; NUBASE2020 and AME2020 masses), extracted ${extracted}`,
  terms: 'IAEA Nuclear Data Section; may be adapted and copied for teaching with this acknowledgement',
  units: { me: 'keV (atomic mass excess)', hl: 's (−1 stable, null unknown)', p: '% of decays', ab: '% of the element on Earth' },
  count: Z.length,
  Z,
  N,
  me,
  sys,
  hl,
  hlOp,
  d1,
  p1,
  d2,
  p2,
  ab,
  jp,
  year,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${OUT}: ${Z.length} nuclides (${hl.filter((h) => h === -1).length} stable), ${sys.length} masses from systematics`);
