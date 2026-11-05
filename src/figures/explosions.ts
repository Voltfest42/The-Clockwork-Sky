import { M_SUN, R_SUN } from '../core/constants';
import { lightCurve, peakOf, type ExplosionInput } from '../core/supernova/arnett';
import { PISN_ONSET, PULSATION_ONSET, DIRECT_COLLAPSE_ONSET } from '../core/stellar/pairInstability';

/**
 * Chapter 25's figures' shared pieces: the toy collapse's settings (Figure
 * 25.1), the sketched spectra of the kinds of supernova (25.2), Arnett's
 * light curves' presets (25.3) and the pair-instability map's (25.4).
 */

// ---------- Figure 25.1: collapse and bounce ----------

export const NEUTRINO_RANGE = [0, 6] as const;
export const NEUTRINO_PRESETS = [
  { id: 'none', name: 'No heating', L: 0 },
  { id: 'weak', name: 'Weak heating', L: 1 },
  { id: 'strong', name: 'Strong heating', L: 3 },
] as const;
export const BOUNCE_START = { L: 0 };

/** "0.35 s", "12 ms". */
export function formatSeconds(t: number): string {
  if (t < 0.1) return `${Number((t * 1000).toPrecision(2))} ms`;
  return `${t.toFixed(2)} s`;
}

/** An energy in units of 10⁵¹ erg (a "foe"), from joules: "0.8 × 10⁵¹ erg". */
export function formatFoe(joules: number): string {
  const foe = joules / 1e44;
  return `${Number(foe.toPrecision(foe < 0.1 ? 1 : 2))} × 10⁵¹ erg`;
}

// ---------- Figure 25.2: the kinds of supernova ----------

export type SupernovaType = 'II' | 'Ib' | 'Ic' | 'Ia';

/** A line in a sketched spectrum: its rest wavelength (nm), how deep its absorption and how bright its emission. */
interface Line {
  label: string;
  nm: number;
  depth: number;
  emission: number;
}

export interface SupernovaKind {
  type: SupernovaType;
  name: string;
  /** The lines that sort it. */
  lines: string;
  star: string;
  how: string;
  leaves: string;
  example: string;
  /** For the sketch: the expansion speed (km/s), the continuum's colour temperature (K) and its lines. */
  speed: number;
  colour: number;
  features: readonly Line[];
  /** The features labelled on the sketch. */
  marks: readonly string[];
}

export const SUPERNOVA_KINDS: readonly SupernovaKind[] = [
  {
    type: 'II',
    name: 'Type II',
    lines: 'hydrogen: Hα and Hβ, broad, with their absorption shifted blue',
    star: 'a supergiant that still had its hydrogen envelope, red (most) or blue (SN 1987A)',
    how: 'its iron core collapsed',
    leaves: 'a neutron star or a black hole',
    example: 'SN 1987A in the Large Magellanic Cloud; SN 2023ixf in M101',
    speed: 9000,
    colour: 9000,
    features: [
      { label: 'Hα', nm: 656.3, depth: 0.35, emission: 0.9 },
      { label: 'Hβ', nm: 486.1, depth: 0.3, emission: 0.35 },
      { label: 'Hγ', nm: 434.0, depth: 0.2, emission: 0.15 },
      { label: 'Na I', nm: 589.3, depth: 0.25, emission: 0.2 },
      { label: 'Fe II', nm: 516.9, depth: 0.2, emission: 0.08 },
      { label: 'Ca II', nm: 858.0, depth: 0.3, emission: 0.3 },
    ],
    marks: ['Hα', 'Hβ', 'Ca II'],
  },
  {
    type: 'Ib',
    name: 'Type Ib',
    lines: 'no hydrogen, but helium: He I at 588, 668 and 707 nm',
    star: 'a massive star stripped of its hydrogen, by its own wind or, more often, by a companion',
    how: 'its iron core collapsed',
    leaves: 'a neutron star or a black hole',
    example: 'SN 2008D in NGC 2770, caught as its shock broke out',
    speed: 9000,
    colour: 7500,
    features: [
      { label: 'He I', nm: 587.6, depth: 0.45, emission: 0.25 },
      { label: 'He I 668', nm: 667.8, depth: 0.25, emission: 0.12 },
      { label: 'He I 707', nm: 706.5, depth: 0.28, emission: 0.12 },
      { label: 'He I 502', nm: 501.6, depth: 0.2, emission: 0.05 },
      { label: 'O I', nm: 777.4, depth: 0.25, emission: 0.08 },
      { label: 'Ca II', nm: 858.0, depth: 0.35, emission: 0.35 },
      { label: 'Fe II', nm: 516.9, depth: 0.2, emission: 0.05 },
    ],
    marks: ['He I', 'He I 707', 'O I', 'Ca II'],
  },
  {
    type: 'Ic',
    name: 'Type Ic',
    lines: 'neither hydrogen nor helium; oxygen and calcium',
    star: 'a massive star stripped of its hydrogen and its helium',
    how: 'its iron core collapsed; the broadest-lined ones come with long gamma-ray bursts',
    leaves: 'a neutron star or a black hole',
    example: 'SN 1998bw, with the gamma-ray burst GRB 980425',
    speed: 11000,
    colour: 7000,
    features: [
      { label: 'O I', nm: 777.4, depth: 0.45, emission: 0.15 },
      { label: 'Ca II', nm: 858.0, depth: 0.4, emission: 0.4 },
      { label: 'Fe II', nm: 516.9, depth: 0.3, emission: 0.05 },
      { label: 'Na I', nm: 589.3, depth: 0.2, emission: 0.1 },
      { label: 'Ca II H&K', nm: 395.0, depth: 0.35, emission: 0.05 },
    ],
    marks: ['O I', 'Ca II', 'Fe II'],
  },
  {
    type: 'Ia',
    name: 'Type Ia',
    lines: 'no hydrogen or helium, but silicon: Si II absorbing near 615 nm',
    star: 'a carbon–oxygen white dwarf in a pair, fed by its companion or merging with another white dwarf',
    how: 'carbon caught fire in its packed core and burnt the whole star in about a second',
    leaves: 'nothing: the white dwarf is blown apart',
    example: 'SN 2011fe in M101; SN 2014J in M82',
    speed: 11000,
    colour: 11000,
    features: [
      { label: 'Si II', nm: 635.5, depth: 0.6, emission: 0.2 },
      { label: 'S II', nm: 545.4, depth: 0.25, emission: 0.04 },
      { label: 'S II 564', nm: 564.0, depth: 0.25, emission: 0.04 },
      { label: 'Si II 597', nm: 597.2, depth: 0.15, emission: 0.03 },
      { label: 'Fe II', nm: 492.4, depth: 0.35, emission: 0.05 },
      { label: 'Ca II H&K', nm: 395.0, depth: 0.5, emission: 0.05 },
      { label: 'O I', nm: 777.4, depth: 0.15, emission: 0.03 },
      { label: 'Ca II', nm: 858.0, depth: 0.3, emission: 0.15 },
    ],
    marks: ['Si II', 'S II', 'Ca II H&K'],
  },
];

/** Where a line's absorption sits: shifted blue by the expansion. */
export const blueshifted = (nm: number, speed: number) => nm * (1 - speed / 299_792);

/** A sketched spectrum: a warm continuum with P Cygni lines, flux against wavelength (nm) from 350 to 900, normalised to its peak. */
export function sketchSpectrum(kind: SupernovaKind, n = 330): { nm: number; flux: number }[] {
  const out: { nm: number; flux: number }[] = [];
  const width = (nm: number) => (nm * kind.speed) / 299_792 / 2.2;
  for (let i = 0; i < n; i++) {
    const nm = 350 + (550 * i) / (n - 1);
    const x = 1.4388e7 / (nm * kind.colour);
    let f = 1 / (nm ** 5 * (Math.exp(x) - 1));
    // Ultraviolet line blanketing by iron-group lines, stronger in Type Ia.
    if (nm < 420) f *= kind.type === 'Ia' ? 0.55 + 0.45 * ((nm - 350) / 70) : 0.75 + 0.25 * ((nm - 350) / 70);
    let shape = 1;
    let glow = 0;
    for (const l of kind.features) {
      const w = width(l.nm);
      const a = blueshifted(l.nm, kind.speed * 0.75);
      shape *= 1 - l.depth * Math.exp(-(((nm - a) / w) ** 2));
      glow += l.emission * Math.exp(-(((nm - l.nm * 1.002) / (w * 1.1)) ** 2));
    }
    out.push({ nm, flux: f * shape + f * glow * 0.6 });
  }
  const top = Math.max(...out.map((p) => p.flux));
  return out.map((p) => ({ nm: p.nm, flux: p.flux / top }));
}

/** The decision tree's questions in order, and which answer leads where. */
export const SORTING = [
  { question: 'Hydrogen lines?', yes: 'II' as SupernovaType, no: 1 },
  { question: 'Silicon near 615 nm?', yes: 'Ia' as SupernovaType, no: 2 },
  { question: 'Helium lines?', yes: 'Ib' as SupernovaType, no: 'Ic' as SupernovaType },
] as const;

/** The answers a type gives to the tree's questions, as far as it goes. */
export function pathTo(type: SupernovaType): { question: string; answer: boolean }[] {
  const out: { question: string; answer: boolean }[] = [{ question: SORTING[0].question, answer: type === 'II' }];
  if (type === 'II') return out;
  out.push({ question: SORTING[1].question, answer: type === 'Ia' });
  if (type === 'Ia') return out;
  out.push({ question: SORTING[2].question, answer: type === 'Ib' });
  return out;
}

// ---------- Figure 25.3: light from radioactive nickel ----------

export interface NickelPreset {
  id: string;
  name: string;
  /** M☉, M☉, km/s, cm²/g. */
  nickel: number;
  ejecta: number;
  speed: number;
  opacity: number;
  plateau: boolean;
}

export const NICKEL_PRESETS: readonly NickelPreset[] = [
  { id: 'ia', name: 'A white dwarf (Type Ia)', nickel: 0.6, ejecta: 1.4, speed: 10000, opacity: 0.1, plateau: false },
  { id: 'ic', name: 'A stripped star (Type Ic)', nickel: 0.2, ejecta: 3, speed: 9000, opacity: 0.07, plateau: false },
  { id: 'sn1987a', name: 'A blue supergiant (like SN 1987A)', nickel: 0.069, ejecta: 14, speed: 3000, opacity: 0.1, plateau: false },
  { id: 'iip', name: 'A red supergiant (Type II-P)', nickel: 0.05, ejecta: 10, speed: 4000, opacity: 0.34, plateau: true },
];
export const NICKEL_START = NICKEL_PRESETS[0];
export const NICKEL_RANGES = { nickel: [0.01, 2], ejecta: [0.5, 20], speed: [2000, 20000], opacity: [0.03, 0.34] } as const;
/** The red supergiant's radius for Popov's plateau, m. */
export const PLATEAU_RADIUS = 500 * R_SUN;

/** The model's input in SI from the figure's units. */
export function explosionOf(p: { nickel: number; ejecta: number; speed: number; opacity: number }): ExplosionInput {
  return { nickel: p.nickel * M_SUN, ejecta: p.ejecta * M_SUN, speed: p.speed * 1000, opacity: p.opacity / 10 };
}

/** Days the light curve is drawn at: log-spaced from a day to 500. */
export const CURVE_DAYS = Array.from({ length: 241 }, (_, i) => Number((10 ** ((i / 240) * Math.log10(500))).toPrecision(5)));

/** The light curve's peak for some settings, in W and days. */
export function peakFor(p: { nickel: number; ejecta: number; speed: number; opacity: number; plateau: boolean }) {
  const days = Array.from({ length: 1201 }, (_, i) => i * 0.25);
  return peakOf(lightCurve(explosionOf(p), days, p.plateau ? { radius: PLATEAU_RADIUS } : undefined));
}

/** "1.2 × 10³⁶ W (3.1 billion Suns)". */
export function formatSupernovaLuminosity(w: number): string {
  const e = Math.floor(Math.log10(w));
  const m = w / 10 ** e;
  const sup = String(e).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
  const suns = w / 3.828e26;
  const inSuns = suns >= 1e9 ? `${Number((suns / 1e9).toPrecision(2))} billion Suns` : `${Number((suns / 1e6).toPrecision(2)).toLocaleString('en-GB')} million Suns`;
  return `${m.toFixed(1)} × 10${sup} W (${inSuns})`;
}

// ---------- Figure 25.4: the pair-instability wedge ----------

export const PAIR_LOG_T = [8, 10] as const;
export const PAIR_LOG_RHO = [0, 8] as const;
export const PAIR_MASSES = [10, 30, 50, 80, 130, 200] as const;
export const PAIR_START = { mass: 80 };

export type PairOutcome = 'collapse' | 'pulses' | 'destroyed' | 'whole';
/** What published models say a helium core of this mass (M☉) does (Heger & Woosley 2002; Woosley 2017). */
export function pairOutcome(heCore: number): PairOutcome {
  if (heCore < PULSATION_ONSET) return 'collapse';
  if (heCore < PISN_ONSET) return 'pulses';
  if (heCore < DIRECT_COLLAPSE_ONSET) return 'destroyed';
  return 'whole';
}
export const OUTCOME_NAMES: Record<PairOutcome, string> = {
  collapse: 'core collapse, as in lighter stars',
  pulses: 'pulses that throw off shells, then collapse',
  destroyed: 'blown apart, leaving nothing',
  whole: 'collapses whole into a black hole',
};
export const OUTCOME_COLOURS: Record<PairOutcome, string> = {
  collapse: 'var(--text-muted)',
  pulses: 'var(--series-2)',
  destroyed: 'var(--accent)',
  whole: 'var(--series-3)',
};
export const OUTCOME_EDGES = { pulses: PULSATION_ONSET, destroyed: PISN_ONSET, whole: DIRECT_COLLAPSE_ONSET } as const;

/** The lightest core whose average Γ₁ dips below 4/3 by the standard model (M☉): `lightestUnstableCore()`, rounded; a unit test keeps it in step. */
export const MODEL_THRESHOLD = 27;

/** "1.4 × 10³⁶ W". */
export function formatWatts(w: number): string {
  const e = Math.floor(Math.log10(w));
  const sup = String(e).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
  return `${(w / 10 ** e).toFixed(1)} × 10${sup} W`;
}
