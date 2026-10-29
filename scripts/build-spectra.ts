/**
 * Builds src/data/xsl/spectra.json: ten real stellar spectra, one or two of
 * each class from O to M, from the X-shooter Spectral Library's second data
 * release (Gonneau et al. 2020, A&A 634, A133), served by ESO's science
 * archive. ESO's archive data are CC BY 4.0; the file says so and sits in its
 * own folder.
 *
 * Each star's ultraviolet-blue (UVB) and visible (VIS) arms are joined: the
 * VIS arm is scaled to match the UVB arm where they overlap cleanly, 547–555
 * nm (the VIS arm's blue edge is unreliable), and blended across that range.
 * The result is averaged into 0.4 nm bins from 370 to 800 nm and scaled so the brightest
 * bin is 1000. The spectra are in the stars' rest frames and are not
 * corrected for reddening.
 *
 *   npx tsx scripts/build-spectra.ts
 *
 * The FITS files are downloaded once into scripts/.cache/xsl/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const TAP = 'https://archive.eso.org/tap_obs/sync';
const FILE = 'https://dataportal.eso.org/dataportal_new/file/';
const CACHE = 'scripts/.cache/xsl';
const OUT_DIR = 'src/data/xsl';
const OUT = `${OUT_DIR}/spectra.json`;
const FROM = 370;
const TO = 800;
const STEP = 0.4;

/** The stars: XSL's target name, a name for readers, the class (SIMBAD) and an approximate temperature. */
const STARS = [
  { target: 'HD057060', id: '29-cma', name: '29 Canis Majoris', spectralClass: 'O7 Ia', kelvin: 33000, note: 'a hot supergiant in a close pair' },
  { target: 'HD034816', id: 'lambda-lep', name: 'λ Leporis', spectralClass: 'B0.5 IV', kelvin: 28000, note: 'a hot blue star' },
  { target: 'HD166283', id: 'hd166283', name: 'HD 166283', spectralClass: 'A1 V', kelvin: 9300, note: 'a white main-sequence star like Sirius' },
  { target: 'HD184571', id: 'hd184571', name: 'HD 184571', spectralClass: 'F5 V', kelvin: 6550, note: 'a main-sequence star a little hotter than the Sun' },
  { target: 'HD013043', id: 'hd13043', name: 'HD 13043', spectralClass: 'G2 V', kelvin: 5800, note: 'a star of the Sun’s class' },
  { target: 'HD140283', id: 'hd140283', name: 'HD 140283', spectralClass: 'F9–G0 IV, metal-poor', kelvin: 5520, note: 'an old star with about 1/250 of the Sun’s iron' },
  { target: 'HD016160', id: 'hd16160', name: 'HD 16160', spectralClass: 'K3 V', kelvin: 4830, note: 'an orange dwarf, 7 parsecs away' },
  { target: 'HD081797', id: 'alphard', name: 'Alphard (α Hydrae)', spectralClass: 'K3 III', kelvin: 4100, note: 'an orange giant' },
  { target: 'HD119850', id: 'hd119850', name: 'HD 119850', spectralClass: 'M2 V', kelvin: 3600, note: 'a red dwarf, 5 parsecs away' },
  { target: 'HD039801', id: 'betelgeuse', name: 'Betelgeuse', spectralClass: 'M1–2 Ia', kelvin: 3600, note: 'a red supergiant' },
] as const;

interface Arm {
  wave: Float32Array;
  flux: Float32Array;
}

/** Reads the one-row binary table of an ESO Phase 3 spectrum: big-endian float32 arrays WAVE (nm) and FLUX. */
function readSpectrum(buffer: Buffer): Arm {
  let offset = 0;
  const readHeader = () => {
    const cards: Record<string, string> = {};
    for (;;) {
      const block = buffer.subarray(offset, offset + 2880).toString('latin1');
      offset += 2880;
      for (let i = 0; i < 2880; i += 80) {
        const card = block.slice(i, i + 80);
        const key = card.slice(0, 8).trim();
        if (key === 'END') return cards;
        if (card[8] === '=') cards[key] = card.slice(10).split('/')[0].trim().replace(/^'|'$/g, '').trim();
      }
    }
  };
  readHeader();
  const ext = readHeader();
  const fields = Number(ext.TFIELDS);
  const columns: { name: string; n: number }[] = [];
  for (let i = 1; i <= fields; i++) {
    const form = /^(\d+)E$/.exec(ext[`TFORM${i}`]);
    if (!form) throw new Error(`Unexpected TFORM${i}: ${ext[`TFORM${i}`]}`);
    columns.push({ name: ext[`TTYPE${i}`], n: Number(form[1]) });
  }
  const arrays: Record<string, Float32Array> = {};
  let at = offset;
  for (const c of columns) {
    const a = new Float32Array(c.n);
    for (let k = 0; k < c.n; k++) a[k] = buffer.readFloatBE(at + 4 * k);
    arrays[c.name] = a;
    at += 4 * c.n;
  }
  return { wave: arrays.WAVE, flux: arrays.FLUX };
}

async function archiveFiles(): Promise<{ target: string; dp: string; min: number; snr: number }[]> {
  const list = `${CACHE}/obscore.csv`;
  if (!existsSync(list)) {
    const query = "SELECT target_name, dp_id, em_min, snr FROM ivoa.ObsCore WHERE obs_collection='XSL'";
    const response = await fetch(`${TAP}?${new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', QUERY: query })}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(list, await response.text());
  }
  const [head, ...rows] = readFileSync(list, 'utf8').trim().split(/\r?\n/);
  const cols = head.split(',');
  return rows.map((r) => {
    const f = r.split(',');
    return { target: f[cols.indexOf('target_name')], dp: f[cols.indexOf('dp_id')], min: Number(f[cols.indexOf('em_min')]), snr: Number(f[cols.indexOf('snr')]) };
  });
}

async function arm(dp: string): Promise<Arm> {
  const path = `${CACHE}/${dp.replace(/:/g, '_')}.fits`;
  if (!existsSync(path)) {
    console.log(`Downloading ${dp}`);
    const response = await fetch(FILE + dp);
    if (!response.ok) throw new Error(`Download of ${dp} failed: ${response.status}`);
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  return readSpectrum(readFileSync(path));
}

/** The mean flux in [a, b) nm, or NaN if no sample falls there. */
function binMean(s: Arm, a: number, b: number): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < s.wave.length; i++) {
    const w = s.wave[i];
    if (w >= a && w < b && Number.isFinite(s.flux[i])) {
      sum += s.flux[i];
      n++;
    }
  }
  return n ? sum / n : NaN;
}

const files = await archiveFiles();
const n = Math.round((TO - FROM) / STEP);
const out = [];
for (const star of STARS) {
  const pick = (lo: number, hi: number) =>
    files.filter((f) => f.target === star.target && f.min > lo && f.min < hi).sort((a, b) => b.snr - a.snr)[0];
  const uvbFile = pick(2.9e-7, 3.1e-7);
  const visFile = pick(5.2e-7, 5.5e-7);
  if (!uvbFile || !visFile) throw new Error(`Missing arms for ${star.target}`);
  const uvb = await arm(uvbFile.dp);
  const vis = await arm(visFile.dp);
  const scale = binMean(uvb, 547, 555) / binMean(vis, 547, 555);
  const flux: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = FROM + k * STEP;
    const w = Math.min(1, Math.max(0, (a - 547) / 8));
    flux.push(w === 0 ? binMean(uvb, a, a + STEP) : w === 1 ? scale * binMean(vis, a, a + STEP) : (1 - w) * binMean(uvb, a, a + STEP) + w * scale * binMean(vis, a, a + STEP));
  }
  const top = Math.max(...flux.filter(Number.isFinite));
  out.push({ ...star, archive: [uvbFile.dp, visFile.dp], flux: flux.map((f) => (Number.isFinite(f) ? Math.max(0, Math.round((1000 * f) / top)) : 0)) });
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({
    source: 'X-shooter Spectral Library DR2 (A. Gonneau and colleagues 2020, A&A 634, A133), from the ESO Science Archive Facility',
    licence: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), under ESO’s archive data policy. Based on observations collected at the European Southern Observatory (programme 084.B-0869 and others).',
    units: { wavelength: `nm in air, from ${FROM} in steps of ${STEP}`, flux: 'flux per unit wavelength, scaled so the brightest bin is 1000', kelvin: 'approximate effective temperature, K' },
    from: FROM,
    step: STEP,
    stars: out,
  }) + '\n',
);
console.log(`Wrote ${OUT}: ${out.length} stars, ${n} bins each`);
