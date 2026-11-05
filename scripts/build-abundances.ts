/**
 * Builds src/data/abundances.json, the Sun's make-up for Chapter 23:
 *
 * - every element's present-day abundance in the Sun's photosphere and in CI
 *   chondrites (the most primitive meteorites), as log ε = log₁₀(N/N_H) + 12,
 *   from Asplund, Amarsi & Grevesse (2021, A&A 653, A141, Table 2; open
 *   access, CC BY 4.0);
 * - the Solar System's isotopic abundances from gallium to uranium (Lodders
 *   et al. 2009, per million silicon atoms) with each isotope's shares from
 *   the slow and rapid neutron-capture processes, and each element's s, r and
 *   p shares, from Prantzos, Abia, Cristallo, Limongi & Chieffi (2020, MNRAS
 *   491, 1832, Tables 4 and 5 of the arXiv version, 1911.02545). Facts,
 *   cited.
 *
 *   node scripts/build-abundances.ts
 *
 * Both papers' LaTeX sources are downloaded from arXiv once into
 * scripts/.cache/abundances/ and their tables read from them.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CACHE = 'scripts/.cache/abundances/';
const OUT = 'src/data/abundances.json';

function source(arxiv: string, file: string): string {
  const dir = `${CACHE}src_${arxiv.replace('/', '_')}/`;
  if (!existsSync(dir + file)) {
    mkdirSync(dir, { recursive: true });
    console.log(`Downloading arXiv:${arxiv}`);
    execFileSync('curl', ['-sL', '-A', 'TheClockworkSky-data-script/1.0 (education)', '-o', dir + 'eprint', `https://arxiv.org/e-print/${arxiv}`]);
    execFileSync('tar', ['xzf', 'eprint'], { cwd: dir });
  }
  return readFileSync(dir + file, 'utf8');
}

// ---- Asplund, Amarsi & Grevesse (2021), Table 2: two elements per row ----
const asplund = source('2105.01661', 'sun_abund2.tex');
const table2 = asplund.slice(asplund.indexOf('\\label{t:abund}'), asplund.indexOf('\\end{tabular}', asplund.indexOf('\\label{t:abund}')));
const value = (s: string) => {
  const m = s.match(/(-?\d+\.\d+)\s*\\pm\s*(\d+\.\d+)/);
  return m ? { v: Number(m[1]), e: Number(m[2]) } : null;
};
const elements: { Z: number; symbol: string; photosphere: number | null; photosphereErr: number | null; meteorites: number | null; meteoritesErr: number | null; note: string }[] = [];
for (const line of table2.split('\n')) {
  if (!/^\s*\d+\s*&/.test(line)) continue;
  const cells = line.replace(/\\\\\s*$/, '').split('&').map((c) => c.trim());
  for (const half of [cells.slice(0, 5), cells.slice(5, 10)]) {
    if (!half[0] || !/^\d+$/.test(half[0])) continue;
    const ph = value(half[2]);
    const ci = value(half[3]);
    elements.push({
      Z: Number(half[0]),
      symbol: half[1],
      photosphere: ph?.v ?? null,
      photosphereErr: ph?.e ?? null,
      meteorites: ci?.v ?? null,
      meteoritesErr: ci?.e ?? null,
      note: half[4] ?? '',
    });
  }
}
elements.sort((a, b) => a.Z - b.Z);

// ---- Prantzos et al. (2020): isotopes (longtable) and elements ----
const prantzos = source('1911.02545', 'Prantzos.tex');
const isotopes: { Z: number; A: number; N: number; s: number; r: number }[] = [];
const long = prantzos.slice(prantzos.indexOf('\\label{tab:long}'), prantzos.indexOf('\\end{longtable}'));
for (const line of long.split('\n')) {
  // "  31 &$^{ 69}$Ga & 2.20E+01 & 0.490 & 0.510 & 0.719 & 0.281 & - & 0.653 & 0.347 \\"
  const m = line.match(/^\s*(\d+)\s*&\s*\$\^\{\s*(\d+)\}\$\s*[A-Za-z]+\s*&\s*([\d.E+-]+)\s*&(.*)\\\\/);
  if (!m) continue;
  const rest = m[4].split('&').map((c) => c.trim());
  isotopes.push({ Z: Number(m[1]), A: Number(m[2]), N: Number(m[3]), s: Number(rest[rest.length - 2]), r: Number(rest[rest.length - 1]) });
}
const elemTable = prantzos.slice(prantzos.indexOf('\\label{tab:Elements}'), prantzos.indexOf('\\end{tabular}', prantzos.indexOf('\\label{tab:Elements}')));
const heavy: { Z: number; s: number; r: number; p: number }[] = [];
for (const line of elemTable.split('\n')) {
  const m = line.match(/^\s*[A-Z][a-z]?\s*&\s*(\d+)\s*&\s*(-?[\d.]+)\s*&\s*([\d.E+-]+)\s*&\s*([\d.]+)\s*&\s*([\d.]+)\s*&\s*([\d.]+)\s*\\\\/);
  if (m) heavy.push({ Z: Number(m[1]), s: Number(m[4]), r: Number(m[5]), p: Number(m[6]) });
}

if (elements.length < 80 || isotopes.length < 150 || heavy.length < 50) throw new Error(`Parsed too little: ${elements.length} elements, ${isotopes.length} isotopes, ${heavy.length} heavy elements`);

const out = {
  sources: {
    elements: 'Asplund, Amarsi & Grevesse (2021), A&A 653, A141, Table 2: present-day photosphere and CI chondrites, log ε (H = 12)',
    isotopes: 'Prantzos, Abia, Cristallo, Limongi & Chieffi (2020), MNRAS 491, 1832 (arXiv:1911.02545): Solar System isotopic abundances of Lodders et al. (2009) per 10⁶ Si atoms, with their s- and r-fractions ("this work")',
    heavyElements: 'Prantzos et al. (2020), elemental s-, r- and p-fractions',
  },
  elements,
  isotopes,
  heavyElements: heavy,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${OUT}: ${elements.length} elements, ${isotopes.length} isotopes, ${heavy.length} heavy elements' shares`);
