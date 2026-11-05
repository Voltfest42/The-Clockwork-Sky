/**
 * Builds src/data/kadonis.json, the Maxwellian-averaged neutron-capture cross
 * sections at kT = 30 keV of the 357 isotopes in KADoNiS v0.3 (the Karlsruhe
 * Astrophysical Database of Nucleosynthesis in Stars, Dillmann et al.,
 * exp-astro.de/kadonis1.0), the successor of Bao et al. (2000, ADNDT 76, 70).
 * The database asks for a citation; it states no other terms.
 *
 *   node scripts/build-kadonis.ts
 *
 * The raw table ("all recommended MACS", tab-separated, in millibarns) is
 * downloaded once into scripts/.cache/kadonis/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://exp-astro.de/kadonis1.0/maketable.php?type=macs';
const CACHE = 'scripts/.cache/kadonis/';
const RAW = CACHE + 'macs.txt';
const OUT = 'src/data/kadonis.json';

if (!existsSync(RAW)) {
  console.log(`Downloading ${URL}`);
  const response = await fetch(URL, { headers: { 'User-Agent': 'TheClockworkSky-data-script/1.0 (education)' } });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(RAW, await response.text());
}

const lines = readFileSync(RAW, 'utf8').split(/\r?\n/).filter((l) => l.trim());
// Columns: Z, A, isomer (g/m or blank), symbol, MACS at 5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100 keV, error at 30 keV (mb).
const isotopes = lines
  .slice(1)
  .map((line) => line.split('\t').map((f) => f.trim()))
  .filter((f) => f[9] !== '-' && f[9] !== '')
  .map((f) => ({
    Z: Number(f[0]),
    A: Number(f[1]),
    ...(f[2] ? { isomer: f[2] } : {}),
    macs30: Number(Number(f[9]).toPrecision(4)),
    err30: Number(Number(f[15]).toPrecision(3)),
  }));

const out = {
  source: 'KADoNiS v0.3, Karlsruhe Astrophysical Database of Nucleosynthesis in Stars (I. Dillmann, R. Plag, F. Käppeler, T. Rauscher et al.), exp-astro.de/kadonis1.0, recommended MACS',
  terms: 'Cite Dillmann et al. (2006, AIP Conf. Proc. 819, 123) and Bao et al. (2000, ADNDT 76, 70)',
  units: 'mb (Maxwellian-averaged (n,γ) cross section at kT = 30 keV, and its error)',
  isotopes,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${OUT}: ${isotopes.length} isotopes`);
