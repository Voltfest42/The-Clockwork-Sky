import { M_SUN, T_SUN } from '../core/constants';
import { transmission, reddening, extinctionRatio } from '../core/ism/extinction';
import { jeansVerdict, MU_ATOMIC, MU_MOLECULAR, type Cloud } from '../core/ism/jeans';
import { planck } from '../core/light/planck';
import { spectrumColour } from '../core/stars/photometry';
import { brownDwarfLuminosity, brownDwarfTemperature, HYDROGEN_BURNING_LIMIT } from '../core/stellar/brownDwarfs';
import { imfShare, kroupa } from '../core/stellar/imf';
import { pmsAt, type PmsTrack } from '../core/stellar/pms';
import { lzamsf, rzamsf } from '../core/stellar/sse/zfuncs';
import { zcnsts } from '../core/stellar/sse/zcnsts';
import { PARSEC, SECONDS_PER_JULIAN_YEAR } from '../core/units';
import bhac15 from '../data/bhac15.json';

/** Helpers for Chapter 16's figures: dust, clouds, young stars, brown dwarfs and newborn clusters. */

const MYR = 1e6 * SECONDS_PER_JULIAN_YEAR;

// —— Formatting ——

export function formatMass(m: number): string {
  if (m >= 1e4) return `${Number(m.toPrecision(2)).toLocaleString('en-GB')} M☉`;
  if (m >= 10) return `${Math.round(m).toLocaleString('en-GB')} M☉`;
  return `${m.toPrecision(2)} M☉`;
}

export function formatParsecs(pc: number): string {
  if (pc < 0.1) return `${(Math.round((pc * 206_265) / 100) * 100).toLocaleString('en-GB')} AU`;
  return `${pc.toPrecision(2)} pc`;
}

/** An age in years, in words. */
export function formatAge(years: number): string {
  if (years >= 1e9) return `${(years / 1e9).toPrecision(2)} billion years`;
  if (years >= 1e6) return `${Number((years / 1e6).toPrecision(2))} million years`;
  return `${Number(years.toPrecision(2)).toLocaleString('en-GB')} years`;
}

// —— Figure 16.1: dust dims and reddens ——

export const DUST_STARS = [
  { id: 'b', name: 'A hot blue star', kelvin: 20000 },
  { id: 'sun', name: 'A star like the Sun', kelvin: T_SUN },
  { id: 'red', name: 'A cool red dwarf', kelvin: 3300 },
] as const;

/** Visual extinctions, magnitudes (research §8). */
export const DUST_PRESETS = [
  { id: 'none', name: 'No dust', av: 0 },
  { id: 'kpc', name: '1 kiloparsec of the Milky Way’s disc', av: 1.5 },
  { id: 'cloud', name: 'Behind a dark cloud’s edge', av: 10 },
  { id: 'centre', name: 'The centre of the Galaxy', av: 30 },
] as const;

/** The star's spectrum seen through A_V magnitudes of dust, scaled so the dust-free peak is 1: [wavelength (m), value]. */
export function dustedSpectrum(kelvin: number, av: number, from: number, to: number, n = 260): [number, number][] {
  const peak = planck(2.897_771_955e-3 / kelvin, kelvin);
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const l = from * (to / from) ** (i / n);
    out.push([l, (planck(l, kelvin) / peak) * transmission(l, av)]);
  }
  return out;
}

/** What the dust does to the star in each band, and how it looks: shares let through, magnitudes, the colour. */
export function dustReadout(kelvin: number, av: number) {
  return {
    vShare: transmission(0.551e-6, av),
    kShare: transmission(2.19e-6, av),
    ak: av * extinctionRatio(2.19e-6),
    reddening: reddening(av),
    colour: spectrumColour((l) => planck(l, kelvin) * transmission(l, av)),
    clearColour: spectrumColour((l) => planck(l, kelvin)),
  };
}

// —— Figure 16.2: collapse or not ——

export interface CloudPreset {
  id: string;
  name: string;
  /** M☉, parsecs, K, and molecules or atoms. */
  mass: number;
  radius: number;
  kelvin: number;
  molecular: boolean;
  note: string;
}

/** Real clouds, round numbers (research §8). Barnard 68: 2.1 M☉, a radius of 12,500 AU, 16 K, at 125 pc (Alves, Lada & Lada 2001). */
export const CLOUD_PRESETS: readonly CloudPreset[] = [
  {
    id: 'warm',
    name: 'Warm gas between the stars',
    mass: 50,
    radius: 10,
    kelvin: 8000,
    molecular: false,
    note: 'About half an atom per cubic centimetre at 8,000 K: most of the space between the stars. Its heat wins by far.',
  },
  {
    id: 'cold',
    name: 'A cold cloud of atoms',
    mass: 600,
    radius: 5,
    kelvin: 100,
    molecular: false,
    note: 'About 30 atoms per cubic centimetre at 100 K: denser and colder, but still nowhere near collapse.',
  },
  {
    id: 'gmc',
    name: 'A giant molecular cloud',
    mass: 2e5,
    radius: 20,
    kelvin: 15,
    molecular: true,
    note: 'A cloud like Orion’s, two hundred thousand Suns of cold molecules. Gravity wins by far: it breaks into many clumps, and each makes stars.',
  },
  {
    id: 'b68',
    name: 'Barnard 68',
    mass: 2.1,
    radius: 0.0606,
    kelvin: 16,
    molecular: true,
    note: 'A small dark cloud about 400 light-years away: twice the Sun’s mass, 25,000 AU across, at 16 K. By this simple sum its gravity is about half what it needs; its denser middle is thought to be close to collapse.',
  },
  {
    id: 'core',
    name: 'A dense core',
    mass: 5,
    radius: 0.05,
    kelvin: 10,
    molecular: true,
    note: 'The densest knot of a molecular cloud, where a star or two will form.',
  },
];

export const toCloud = (mass: number, radius: number, kelvin: number, molecular: boolean): Cloud => ({
  mass: mass * M_SUN,
  radius: radius * PARSEC,
  kelvin,
  mu: molecular ? MU_MOLECULAR : MU_ATOMIC,
});

/** The figure's numbers in its own units: M☉, particles per cm³, years. */
export function collapseReadout(mass: number, radius: number, kelvin: number, molecular: boolean) {
  const v = jeansVerdict(toCloud(mass, radius, kelvin, molecular));
  return {
    collapses: v.collapses,
    jeansMass: v.jeansMass / M_SUN,
    perCm3: v.particlesPerCm3,
    freeFallYears: (v.freeFall / MYR) * 1e6,
    /** |W| / 2K: above 1, gravity wins. */
    balance: v.gravity / v.thermal,
  };
}

// —— Figures 16.3 and 16.4: young stars and brown dwarfs (BHAC15) ——

export const PMS_TRACKS = bhac15.tracks as PmsTrack[];
export const trackOf = (mass: number) => PMS_TRACKS.find((t) => t.mass === mass)!;

/** The masses drawn in Figure 16.3, M☉. */
export const YOUNG_MASSES = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.2, 1.4] as const;
/** The ages marked along the tracks, years. */
export const YOUNG_AGES = [1e6, 3e6, 1e7, 3e7, 1e8] as const;

/**
 * Famous young stars, with their temperatures (K) and luminosities (L☉) from the papers that measured them:
 * TW Hydrae (Andrews et al. 2012), PDS 70 (Keppler et al. 2018), AU Microscopii (Plavchan et al. 2020),
 * V1298 Tauri (David et al. 2019), β Pictoris (Zwintz et al. 2019).
 */
export const YOUNG_STARS = [
  { id: 'twhya', name: 'TW Hydrae', kelvin: 4110, luminosity: 0.28, age: '8–10 million years', note: 'the nearest star still with a gas disc, 60 parsecs away' },
  { id: 'pds70', name: 'PDS 70', kelvin: 3972, luminosity: 0.35, age: 'about 5 million years', note: 'two planets caught forming in its disc' },
  { id: 'aumic', name: 'AU Microscopii', kelvin: 3700, luminosity: 0.09, age: 'about 22 million years', note: 'a red dwarf with a dusty disc and two young planets' },
  { id: 'v1298', name: 'V1298 Tauri', kelvin: 4970, luminosity: 0.93, age: 'about 23 million years', note: 'four planets, still puffy from their birth' },
  { id: 'betapic', name: 'β Pictoris', kelvin: 8050, luminosity: 8.7, age: 'about 20 million years', note: 'already on the main sequence, with a planet-forming disc seen edge-on' },
] as const;

/** The zero-age main sequence from SSE's formulas (Tout et al. 1996) at Z = 0.02, 0.1–3 M☉: [mass, K, L☉]. */
export function zamsLine(): [number, number, number][] {
  const c = zcnsts(0.02);
  const out: [number, number, number][] = [];
  for (let lm = -1; lm <= Math.log10(3) + 1e-9; lm += 0.02) {
    const m = 10 ** lm;
    const L = lzamsf(m, c);
    const R = rzamsf(m, c);
    out.push([m, T_SUN * (L / R ** 2) ** 0.25, L]);
  }
  return out;
}

/** A track's points from `from` to `to` years: [age, K, L☉]. */
export function trackPoints(track: PmsTrack, from = 0, to = Infinity): [number, number, number][] {
  return track.points.filter((p) => 10 ** p[0] >= from && 10 ** p[0] <= to).map((p) => [10 ** p[0], p[1], 10 ** p[2]]);
}

/** The masses in Figure 16.4, M☉: brown dwarfs, those at the limit, and stars. */
export const COOLING_MASSES = [0.01, 0.02, 0.03, 0.05, 0.06, 0.07, 0.075, 0.08, 0.1, 0.2] as const;
export const COOLING_END = 1e10;

export type CoolingKind = 'brown-dwarf' | 'limit' | 'star';
export const coolingKind = (mass: number): CoolingKind => (mass < 0.07 ? 'brown-dwarf' : mass < 0.08 ? 'limit' : 'star');

/**
 * Luminosity against age (years, L☉): BHAC15's track, carried on to 10 billion years by Burrows et al.'s power
 * law where the table stops (brown dwarfs only), scaled to meet the table's last point.
 */
export function coolingCurve(mass: number): { model: [number, number][]; fit: [number, number][] } {
  const track = trackOf(mass);
  const model = track.points.map((p) => [10 ** p[0], 10 ** p[2]] as [number, number]);
  const [tEnd, lEnd] = model[model.length - 1];
  const fit: [number, number][] = [];
  if (tEnd < COOLING_END * 0.95) {
    const scale = lEnd / brownDwarfLuminosity(mass, tEnd);
    for (let k = 0; k <= 40; k++) {
      const t = tEnd * (COOLING_END / tEnd) ** (k / 40);
      fit.push([t, scale * brownDwarfLuminosity(mass, t)]);
    }
  }
  return { model, fit };
}

/** Luminosity (L☉) of a cooling-figure object at an age (years), from the model or its extension. */
export function coolingLuminosity(mass: number, age: number): number {
  const s = pmsAt(trackOf(mass), age);
  if (s) return s.luminosity;
  const { model, fit } = coolingCurve(mass);
  // Tracks that run to (nearly) 10 billion years end within a hair of it: hold their last value.
  if (!fit.length) return age >= model[model.length - 1][0] ? model[model.length - 1][1] : NaN;
  const scale = fit[0][1] / brownDwarfLuminosity(mass, fit[0][0]);
  return scale * brownDwarfLuminosity(mass, age);
}

/** Effective temperature (K) at an age (years): the model's, or Burrows et al.'s fit scaled to meet the model's last point. */
export function coolingTemperature(mass: number, age: number): number {
  const track = trackOf(mass);
  const s = pmsAt(track, age);
  if (s) return s.kelvin;
  const last = track.points[track.points.length - 1];
  if (age < 10 ** last[0]) return NaN;
  if (10 ** last[0] >= COOLING_END * 0.95) return last[1];
  return (last[1] / brownDwarfTemperature(mass, 10 ** last[0])) * brownDwarfTemperature(mass, age);
}

export const jupiters = (mass: number) => Math.round(mass * 1047.57);
export const isBrownDwarf = (mass: number) => mass < HYDROGEN_BURNING_LIMIT;

// —— Figure 16.5: a new cluster's star masses ——

export const IMF = kroupa();
export const SUPERNOVA_MASS = 8;

/** Mass classes for the shares, M☉. */
export const MASS_CLASSES = [
  { id: 'bd', name: 'Brown dwarfs', lo: 0.01, hi: 0.08 },
  { id: 'red', name: 'Red dwarfs', lo: 0.08, hi: 0.5 },
  { id: 'sunlike', name: 'Sun-like', lo: 0.5, hi: 2 },
  { id: 'heavy', name: '2–8 Suns', lo: 2, hi: 8 },
  { id: 'massive', name: 'Over 8 Suns', lo: 8, hi: 151 },
] as const;

/**
 * Each mass's light at birth, L☉: SSE's zero-age main sequence at Z = 0.02 (extrapolated below 0.1 M☉ and held at
 * 100 M☉'s formula above it). Brown dwarfs' light is left out: it is too small to show.
 */
export function birthLuminosity(mass: number): number {
  if (mass < 0.08) return 0;
  return lzamsf(Math.min(mass, 150), zcnsts(0.02));
}

export interface ClusterSummary {
  count: number;
  stars: number;
  brownDwarfs: number;
  supernovae: number;
  heaviest: number;
  totalMass: number;
  /** Per class: shares of the number of objects, of the mass and of the light. */
  shares: { id: string; name: string; number: number; mass: number; light: number }[];
}

export function summariseCluster(masses: readonly number[]): ClusterSummary {
  const totals = MASS_CLASSES.map(() => ({ n: 0, m: 0, l: 0 }));
  let mass = 0;
  let light = 0;
  let heaviest = 0;
  for (const m of masses) {
    const k = MASS_CLASSES.findIndex((c) => m >= c.lo && m < c.hi);
    const L = birthLuminosity(m);
    totals[k].n++;
    totals[k].m += m;
    totals[k].l += L;
    mass += m;
    light += L;
    if (m > heaviest) heaviest = m;
  }
  return {
    count: masses.length,
    stars: masses.filter((m) => m >= 0.08).length,
    brownDwarfs: masses.filter((m) => m < 0.08).length,
    supernovae: masses.filter((m) => m >= SUPERNOVA_MASS).length,
    heaviest,
    totalMass: mass,
    shares: MASS_CLASSES.map((c, k) => ({ id: c.id, name: c.name, number: totals[k].n / masses.length, mass: totals[k].m / mass, light: totals[k].l / light })),
  };
}

/** Histogram bins in log₁₀ M from 0.01 to 150 M☉. */
export function massHistogram(masses: readonly number[], perDecade = 8) {
  const lo = -2;
  const hi = Math.log10(150);
  const n = Math.ceil((hi - lo) * perDecade);
  const width = (hi - lo) / n;
  const counts = new Array<number>(n).fill(0);
  for (const m of masses) counts[Math.min(n - 1, Math.floor((Math.log10(m) - lo) / width))]++;
  return counts.map((count, i) => ({ x0: lo + i * width, x1: lo + (i + 1) * width, count }));
}

/** The expected share of stars (≥ 0.08 M☉) above 8 M☉ under the IMF: about one in 160. */
export const MASSIVE_SHARE = imfShare(kroupa(0.08, 150), SUPERNOVA_MASS, 150);
