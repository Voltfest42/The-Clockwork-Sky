/**
 * Builds src/data/gwosc/: the cumulative catalogue of gravitational-wave
 * events (events.json) and GW150914's strain from both LIGO detectors,
 * whitened and band-passed (gw150914.json), from the Gravitational Wave Open
 * Science Center (gwosc.org). GWOSC's data are licensed CC BY 4.0; the
 * folder's README gives the credit and acknowledgement it asks for.
 *
 *   node scripts/fetch-gwtc.ts           (uses the cached downloads)
 *   node scripts/fetch-gwtc.ts --refresh (downloads the catalogue again)
 *
 * Raw files are kept in scripts/.cache/gwosc/. Refresh the catalogue when
 * asOf.ts says the merger census is due (every six months), update the counts
 * in src/data/mergers.ts and the date there and in asOf.ts.
 *
 * The strain is processed as in GWOSC's tutorials: the noise's power spectrum
 * from the whole 32 s (Welch's method, 4 s Hann segments), the data whitened
 * by it and kept between 35 and 350 Hz, then two seconds round the event cut
 * out, halved to 2,048 samples a second (nothing above 360 Hz is left to
 * alias) and divided by the whitened noise's spread, so the noise has a
 * standard deviation of 1. The amplitude spectral density is kept from 20 to
 * 400 Hz, so the figure can whiten its model the same way.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fft, ifft } from '../src/core/math/fft.ts';

const CACHE = 'scripts/.cache/gwosc/';
const OUT = 'src/data/gwosc/';
const CATALOGUE_URL = 'https://gwosc.org/eventapi/csv/GWTC/';
const STRAIN_URL = 'https://gwosc.org/eventapi/json/GWTC-1-confident/GW150914/v3/';
const STRAIN_FILES = { H1: 'H-H1_GWOSC_4KHZ_R1-1126259447-32.txt.gz', L1: 'L-L1_GWOSC_4KHZ_R1-1126259447-32.txt.gz' } as const;
const FILE_START = 1126259447;
/** GW150914's time (GPS), as the catalogue gives it. */
const EVENT_GPS = 1126259462.4;
const FS = 4096;

async function cached(name: string, url: string, binary: boolean, refresh = false): Promise<Buffer> {
  const path = CACHE + name;
  if (!existsSync(path) || refresh) {
    console.log(`Downloading ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(path, binary ? Buffer.from(await response.arrayBuffer()) : await response.text());
    writeFileSync(CACHE + 'fetched.txt', new Date().toISOString().slice(0, 10));
  }
  return readFileSync(path);
}

// ---------- the catalogue ----------

function csvRows(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  const head = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
  });
}

const num = (s: string): number | null => (s === '' ? null : Number(s));

/** A value with its 90% interval, as [median, minus, plus] (minus negative), or null. */
function interval(r: Record<string, string>, key: string): [number, number, number] | null {
  const v = num(r[key]);
  if (v === null) return null;
  return [v, num(r[`${key}_lower`]) ?? 0, num(r[`${key}_upper`]) ?? 0];
}

/** The date from an event's name: GW150914 or GW230529_181500 → "2015-09-14". */
function dateOf(name: string): string {
  const m = /^GW(\d\d)(\d\d)(\d\d)/.exec(name);
  if (!m) throw new Error(`No date in ${name}`);
  return `20${m[1]}-${m[2]}-${m[3]}`;
}

/** The observing run: O4's catalogues are one run part each; the earlier ones by date. */
function runOf(catalogue: string, date: string): string {
  if (catalogue.startsWith('GWTC-5')) return 'O4b';
  if (catalogue.startsWith('GWTC-4')) return 'O4a';
  if (catalogue.startsWith('GWTC-3')) return 'O3b';
  if (date < '2016-06-01') return 'O1';
  if (date < '2018-01-01') return 'O2';
  if (date < '2019-10-15') return 'O3a';
  throw new Error(`No run for ${catalogue} ${date}`);
}

async function catalogue() {
  const text = (await cached('gwtc.csv', CATALOGUE_URL, false, process.argv.includes('--refresh'))).toString('utf8');
  const rows = csvRows(text);
  const events = rows
    .map((r) => {
      const name = r.commonName;
      const date = dateOf(name);
      const cat = r['catalog.shortName'].replace('-confident', '');
      // The date is in the name, so it isn't stored
      const e: Record<string, unknown> = { name, cat, run: runOf(cat, date) };
      const fields: [string, string][] = [
        ['m1', 'mass_1_source'],
        ['m2', 'mass_2_source'],
        ['mc', 'chirp_mass_source'],
        ['mf', 'final_mass_source'],
        ['d', 'luminosity_distance'],
        ['chi', 'chi_eff'],
      ];
      for (const [k, col] of fields) {
        const v = interval(r, col);
        if (v) e[k] = v;
      }
      const z = num(r.redshift);
      if (z !== null) e.z = z;
      e.snr = num(r.network_matched_filter_snr);
      const pastro = num(r.p_astro);
      if (pastro !== null) e.pastro = pastro;
      return e;
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const fetched = readFileSync(CACHE + 'fetched.txt', 'utf8').trim();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(OUT + 'events.json', JSON.stringify({ source: CATALOGUE_URL, fetched, events }) + '\n');
  const withMasses = events.filter((e) => e.m1).length;
  console.log(`events.json: ${events.length} events, ${withMasses} with masses`);
}

// ---------- GW150914's strain ----------

function readStrain(gz: Buffer): Float64Array {
  const lines = gunzipSync(gz).toString('utf8').split('\n');
  const values = lines.filter((l) => l && !l.startsWith('#')).map(Number);
  return Float64Array.from(values);
}

function hann(n: number): Float64Array {
  return Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
}

/** One-sided PSD by Welch's method with Hann segments of `seg` samples overlapping by half. */
function welch(x: Float64Array, seg: number): Float64Array {
  const w = hann(seg);
  const norm = w.reduce((s, v) => s + v * v, 0);
  const psd = new Float64Array(seg / 2 + 1);
  let count = 0;
  for (let start = 0; start + seg <= x.length; start += seg / 2) {
    const re = Float64Array.from({ length: seg }, (_, i) => x[start + i] * w[i]);
    const im = new Float64Array(seg);
    fft(re, im);
    for (let k = 0; k <= seg / 2; k++) psd[k] += (re[k] ** 2 + im[k] ** 2) * (k === 0 || k === seg / 2 ? 1 : 2);
    count++;
  }
  return psd.map((p) => p / (count * norm * FS));
}

const BAND = [35, 350] as const;
const ROLL = 8;

function mask(f: number): number {
  const a = Math.abs(f);
  if (a >= BAND[0] && a <= BAND[1]) return 1;
  if (a < BAND[0] - ROLL || a > BAND[1] + ROLL) return 0;
  const d = a < BAND[0] ? BAND[0] - a : a - BAND[1];
  return 0.5 + 0.5 * Math.cos((Math.PI * d) / ROLL);
}

function processStrain(x: Float64Array) {
  const SEG = 4 * FS;
  const psd = welch(x, SEG);
  const asdAt = (f: number) => {
    const k = f * (SEG / FS);
    const i = Math.min(psd.length - 2, Math.floor(k));
    const t = k - i;
    return Math.sqrt(psd[i] * (1 - t) + psd[i + 1] * t);
  };
  // Whiten the whole 32 s, tapered at its ends by a Tukey window (a tenth of its length)
  const n = x.length;
  const size = 1 << Math.ceil(Math.log2(n));
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const edge = Math.floor(0.05 * n);
  for (let i = 0; i < n; i++) {
    const w = i < edge ? 0.5 - 0.5 * Math.cos((Math.PI * i) / edge) : i >= n - edge ? 0.5 - 0.5 * Math.cos((Math.PI * (n - 1 - i)) / edge) : 1;
    re[i] = x[i] * w;
  }
  fft(re, im);
  for (let k = 0; k < size; k++) {
    const f = (k <= size / 2 ? k : size - k) * (FS / size);
    const g = mask(f) > 0 ? mask(f) / asdAt(f) : 0;
    re[k] *= g;
    im[k] *= g;
  }
  ifft(re, im);
  const white = re.slice(0, n);
  // The noise's spread, away from the event and the tapered ends
  const eventAt = Math.round((EVENT_GPS - FILE_START) * FS);
  const off: number[] = [];
  for (let i = 4 * FS; i < n - 4 * FS; i++) if (Math.abs(i - eventAt) > 2 * FS) off.push(white[i]);
  const sigma = Math.sqrt(off.reduce((s, v) => s + v * v, 0) / off.length);
  // Two seconds: 1.5 s before the event's catalogue time and 0.5 s after, halved to 2,048 samples a second
  const from = eventAt - Math.round(1.5 * FS);
  const out: number[] = [];
  for (let i = from; i < from + 2 * FS; i += 2) out.push(Number((white[i] / sigma).toFixed(2)));
  // The ASD from 20 to 400 Hz at the Welch resolution (0.25 Hz), in units of 10⁻²³ /√Hz
  const asd: number[] = [];
  for (let k = 20 * (SEG / FS); k <= 400 * (SEG / FS); k++) asd.push(Number((Math.sqrt(psd[k]) / 1e-23).toPrecision(3)));
  return { strain: out, asd, start: FILE_START + from / FS };
}

async function strain() {
  const h = processStrain(readStrain(await cached(STRAIN_FILES.H1, STRAIN_URL + STRAIN_FILES.H1, true)));
  const l = processStrain(readStrain(await cached(STRAIN_FILES.L1, STRAIN_URL + STRAIN_FILES.L1, true)));
  const data = {
    source: STRAIN_URL,
    note: 'Whitened, band-passed 35–350 Hz, in units of the whitened noise’s standard deviation; ASD in 1e-23 /√Hz from 20 Hz in steps of 0.25 Hz.',
    gpsStart: h.start,
    eventGps: EVENT_GPS,
    sampleRate: FS / 2,
    band: BAND,
    asdFrom: 20,
    asdStep: 0.25,
    H1: h.strain,
    L1: l.strain,
    asdH1: h.asd,
    asdL1: l.asd,
  };
  writeFileSync(OUT + 'gw150914.json', JSON.stringify(data) + '\n');
  console.log(`gw150914.json: ${h.strain.length} samples per detector from GPS ${h.start}`);
}

await catalogue();
await strain();
