/**
 * Builds src/data/spectra/lines.json: the spectral lines Chapter 12's figures
 * draw and its toy model atmosphere absorbs in, from the NIST Atomic Spectra
 * Database (A. Kramida, Yu. Ralchenko, J. Reader and the NIST ASD Team).
 *
 * For each line the file gives the wavelength in air (nm), the energy of its
 * lower level above the ground state (eV) and log gf, worked out from NIST's
 * transition probabilities: g_i f = 1.4992 × 10⁻¹⁶ λ²[Å] g_k A_ki. Lines that
 * are really close multiplets (helium's, Mg II 448 nm) add the gf of every
 * component within 0.06 nm.
 *
 *   npx tsx scripts/fetch-lines.ts
 *
 * NIST's answers are cached in scripts/.cache/nist/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const CACHE = 'scripts/.cache/nist';
const OUT_DIR = 'src/data/spectra';
const OUT = `${OUT_DIR}/lines.json`;

/** The lines, by species and approximate air wavelength (nm), with the names readers meet. */
const WANTED: { species: string; nm: number; name?: string }[] = [
  { species: 'H I', nm: 656.28, name: 'Hα' },
  { species: 'H I', nm: 486.13, name: 'Hβ' },
  { species: 'H I', nm: 434.05, name: 'Hγ' },
  { species: 'H I', nm: 410.17, name: 'Hδ' },
  { species: 'H I', nm: 397.01, name: 'Hε' },
  { species: 'H I', nm: 388.9, name: 'H8' },
  { species: 'He I', nm: 587.56, name: 'He I “D₃”' },
  { species: 'He I', nm: 447.15 },
  { species: 'He I', nm: 667.82 },
  { species: 'He I', nm: 501.57 },
  { species: 'He I', nm: 492.19 },
  { species: 'He I', nm: 471.31 },
  { species: 'He I', nm: 402.62 },
  { species: 'He II', nm: 468.57 },
  { species: 'Na I', nm: 588.995, name: 'Na D₂' },
  { species: 'Na I', nm: 589.592, name: 'Na D₁' },
  { species: 'Mg I', nm: 516.73, name: 'Mg b' },
  { species: 'Mg I', nm: 517.27, name: 'Mg b' },
  { species: 'Mg I', nm: 518.36, name: 'Mg b' },
  { species: 'Mg I', nm: 383.83 },
  { species: 'Mg II', nm: 448.11 },
  { species: 'Si II', nm: 634.71 },
  { species: 'Si II', nm: 637.14 },
  { species: 'Si II', nm: 412.81 },
  { species: 'Ca I', nm: 422.67, name: 'Ca I' },
  { species: 'Ca II', nm: 393.37, name: 'Ca II K' },
  { species: 'Ca II', nm: 396.85, name: 'Ca II H' },
  { species: 'Fe I', nm: 382.04 },
  { species: 'Fe I', nm: 385.99 },
  { species: 'Fe I', nm: 404.58 },
  { species: 'Fe I', nm: 406.36 },
  { species: 'Fe I', nm: 407.17 },
  { species: 'Fe I', nm: 425.08 },
  { species: 'Fe I', nm: 427.18 },
  { species: 'Fe I', nm: 430.79, name: 'Fe I (G band)' },
  { species: 'Fe I', nm: 438.35 },
  { species: 'Fe I', nm: 440.48 },
  { species: 'Fe I', nm: 495.76 },
  { species: 'Fe I', nm: 526.95 },
  { species: 'Fe I', nm: 527.04, name: 'Fe I (E)' },
  { species: 'Fe I', nm: 532.8 },
  { species: 'Fe I', nm: 537.15 },
  { species: 'Fe I', nm: 539.71 },
  { species: 'Fe I', nm: 543.45 },
  { species: 'Fe I', nm: 614.17 },
  { species: 'Fe I', nm: 649.5 },
  { species: 'Fe II', nm: 492.39 },
  { species: 'Fe II', nm: 501.84 },
  { species: 'Fe II', nm: 516.9 },
];

/** Multiplets whose components are added together. */
const SUM = new Set(['He I', 'He II', 'Mg II']);

interface Row {
  nm: number;
  aki: number;
  ei: number;
  gk: number;
}

const unquote = (s: string | undefined) => (s ?? '').replace(/^"|"$/g, '').replace(/[[\]()+?]/g, '');

async function query(species: string): Promise<Row[]> {
  const path = `${CACHE}/${species.replace(' ', '_')}.tsv`;
  if (!existsSync(path)) {
    const params = new URLSearchParams({
      spectra: species,
      limits_type: '0',
      low_w: '370',
      upp_w: '800',
      unit: '1',
      submit: 'Retrieve Data',
      de: '0',
      format: '3',
      line_out: '0',
      en_unit: '1',
      output: '0',
      bibrefs: '1',
      page_size: '15',
      show_obs_wl: '1',
      show_calc_wl: '1',
      unc_out: '1',
      order_out: '0',
      show_av: '2',
      tsb_value: '0',
      A_out: '0',
      intens_out: 'on',
      allowed_out: '1',
      forbid_out: '1',
      conf_out: 'on',
      term_out: 'on',
      enrg_out: 'on',
      J_out: 'on',
      g_out: 'on',
    });
    const response = await fetch(`https://physics.nist.gov/cgi-bin/ASD/lines1.pl?${params}`);
    if (!response.ok) throw new Error(`NIST: ${response.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(path, await response.text());
  }
  const [head, ...rows] = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => l.includes('\t'));
  const cols = head.split('\t');
  const c = (name: string) => cols.indexOf(name);
  return rows
    .map((r) => r.split('\t'))
    .map((f) => ({
      nm: Number(unquote(f[c('ritz_wl_air(nm)')]) || unquote(f[c('obs_wl_air(nm)')])),
      aki: Number(unquote(f[c('Aki(s^-1)')])),
      ei: Number(unquote(f[c('Ei(eV)')])),
      gk: Number(unquote(f[c('g_k')])),
    }))
    .filter((r) => r.nm > 0 && r.aki > 0 && r.gk > 0 && Number.isFinite(r.ei));
}

const gf = (r: Row) => 1.4992e-16 * (r.nm * 10) ** 2 * r.gk * r.aki;

const bySpecies = new Map<string, Row[]>();
for (const species of new Set(WANTED.map((w) => w.species))) bySpecies.set(species, await query(species));

const lines = WANTED.map((w) => {
  const rows = bySpecies.get(w.species)!;
  const near = rows.filter((r) => Math.abs(r.nm - w.nm) < 0.06);
  if (!near.length) throw new Error(`No NIST line for ${w.species} ${w.nm}`);
  const strongest = near.reduce((a, b) => (gf(b) > gf(a) ? b : a));
  const group = SUM.has(w.species) ? near.filter((r) => Math.abs(r.ei - strongest.ei) < 0.05) : [strongest];
  const total = group.reduce((s, r) => s + gf(r), 0);
  const nm = group.reduce((s, r) => s + r.nm * gf(r), 0) / total;
  const [element, stage] = w.species.split(' ');
  return {
    element,
    ion: stage.length - 1,
    nm: Math.round(nm * 1000) / 1000,
    chi: Math.round(strongest.ei * 1000) / 1000,
    logGf: Math.round(Math.log10(total) * 100) / 100,
    ...(w.name ? { name: w.name } : {}),
  };
});

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: 'NIST Atomic Spectra Database, version 5 (A. Kramida, Yu. Ralchenko, J. Reader and the NIST ASD Team), https://physics.nist.gov/asd',
      units: { nm: 'wavelength in air, nm', ion: '0 = neutral, 1 = singly ionised', chi: 'energy of the lower level, eV', logGf: 'log10 of the oscillator strength × the lower level’s statistical weight' },
      lines,
    },
    null,
    1,
  ) + '\n',
);
console.log(`Wrote ${OUT}: ${lines.length} lines`);
for (const l of lines) console.log(`${l.element} ${'I'.repeat(l.ion + 1)} ${l.nm} χ=${l.chi} log gf=${l.logGf}`);
