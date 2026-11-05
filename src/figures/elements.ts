import { formatScientific, powerOfTen } from '../core/math/scientific';
import { fitMassModel, massesWithModel, type MassModel } from '../core/nuclear/liquidDrop';
import {
  bindingPerNucleon,
  ELEMENT_NAMES,
  nuclideName,
  nuclideSymbol,
  nuclideTable,
  SYMBOLS,
  type DecayKind,
  type Nuclide,
  type NuclidesData,
  type NuclideTable,
} from '../core/nuclear/nuclides';
import { fitQRule, rPatterns, runRProcess, type RPatterns, type RProcessRun, type RProcessSetup } from '../core/nuclear/rprocess';
import { buildSNetwork, decayToStable, exponentialExposures, runSProcess, type SNetwork, type SProcessRun } from '../core/nuclear/sprocess';
import { SECONDS_PER_JULIAN_YEAR } from '../core/units';
import abundances from '../data/abundances.json';
import kadonis from '../data/kadonis.json';
import nuclidesData from '../data/nuclides.json';
import origins from '../data/origins/origins.json';

/**
 * Helpers for Chapter 23 (where the elements come from): the chart of
 * nuclides and its colours, the slow and rapid processes' runs (cached, as
 * the figures ask for the same ones again), the Sun's abundances and the
 * elements' origins, and formatting.
 */

const YEAR = SECONDS_PER_JULIAN_YEAR;

// ---------- The data, unpacked once ----------

let table: NuclideTable | undefined;
/** Every known nuclide. */
export function nuclides(): NuclideTable {
  table ??= nuclideTable(nuclidesData as unknown as NuclidesData);
  return table;
}

let model: MassModel | undefined;
/** The course's mass model, fitted to the measured masses. */
export function massModel(): MassModel {
  model ??= fitMassModel(nuclides());
  return model;
}

let rSetup: RProcessSetup | undefined;
export function rProcessSetup(): RProcessSetup {
  rSetup ??= { table: nuclides(), masses: massesWithModel(nuclides(), massModel()), qRule: fitQRule(nuclides()) };
  return rSetup;
}

let network: SNetwork | undefined;
/** The slow process's network, from iron to polonium. */
export function sNetwork(): SNetwork {
  network ??= buildSNetwork(nuclides(), kadonis);
  return network;
}

const sRuns = new Map<number, SProcessRun>();
/** The slow process at a neutron density (cm⁻³), from an iron-56 seed to an exposure of 4 mb⁻¹. */
export function sRun(neutronDensity: number): SProcessRun {
  const key = Number(neutronDensity.toPrecision(3));
  let run = sRuns.get(key);
  if (!run) {
    run = runSProcess(sNetwork(), { neutronDensity: key, exposureMax: 4 });
    if (sRuns.size > 12) sRuns.clear();
    sRuns.set(key, run);
  }
  return run;
}

/** The Sun's main s-process component: exposures spread exponentially with τ₀ = 0.3 mb⁻¹ (Käppeler et al.), decayed to stability. */
export const MAIN_TAU0 = 0.3;
export function mainComponent(neutronDensity: number): Map<number, number> {
  return decayToStable(sNetwork(), exponentialExposures(sRun(neutronDensity), MAIN_TAU0));
}

const rRuns = new Map<string, { run: RProcessRun; patterns: RPatterns }>();
/** The toy r-process at a neutron density (cm⁻³) and temperature (K), for 20 seconds. */
export function rRun(neutronDensity: number, T: number): { run: RProcessRun; patterns: RPatterns } {
  const key = `${neutronDensity.toPrecision(3)}|${T.toPrecision(3)}`;
  let r = rRuns.get(key);
  if (!r) {
    const run = runRProcess(rProcessSetup(), { neutronDensity, temperature: T, duration: R_DURATION, zMax: 95, steps: 300 });
    r = { run, patterns: rPatterns(run) };
    if (rRuns.size > 12) rRuns.clear();
    rRuns.set(key, r);
  }
  return r;
}
export const R_DURATION = 20;

// ---------- The Sun ----------

interface ElementAbundance {
  Z: number;
  symbol: string;
  photosphere: number | null;
  photosphereErr: number | null;
  meteorites: number | null;
  meteoritesErr: number | null;
  note: string;
}

const ELEMENTS = abundances.elements as ElementAbundance[];

/**
 * The Sun's abundance of an element as log ε = log₁₀(N/N_H) + 12: the
 * photosphere's (Asplund et al. 2021), or the meteorites' where the
 * photosphere's can't be measured. Lithium is the photosphere's: the Sun has
 * burnt most of its own.
 */
export function solarLogEps(Z: number): { value: number; from: 'photosphere' | 'meteorites' } | null {
  const e = ELEMENTS.find((x) => x.Z === Z);
  if (!e) return null;
  if (e.photosphere !== null) return { value: e.photosphere, from: 'photosphere' };
  if (e.meteorites !== null) return { value: e.meteorites, from: 'meteorites' };
  return null;
}

/** An element's standard atomic weight on Earth, u, from its isotopes' abundances and masses. */
export function atomicWeight(Z: number): number | null {
  let sum = 0;
  let share = 0;
  for (const n of nuclides().list) {
    if (n.Z !== Z || n.abundance === null || n.massExcess === null) continue;
    sum += (n.abundance / 100) * (n.A + n.massExcess / 931_494.102_42);
    share += n.abundance / 100;
  }
  return share > 0.5 ? sum / share : null;
}

/** The Sun's mass fraction of an element (using Earth's isotope mix for its atomic weight). */
export function solarMassFraction(Z: number): number | null {
  const own = solarLogEps(Z);
  const w = atomicWeight(Z);
  if (!own || !w) return null;
  let total = 0;
  for (const e of ELEMENTS) {
    const l = solarLogEps(e.Z);
    const m = atomicWeight(e.Z);
    if (l && m) total += 10 ** l.value * m;
  }
  return (10 ** own.value * w) / total;
}

/** A nuclide's share of the Sun's atoms, per 10¹² hydrogen atoms: its element's abundance times its share on Earth. */
export function solarNuclideAbundance(n: Nuclide): number | null {
  const own = solarLogEps(n.Z);
  if (!own || n.abundance === null) return null;
  return 10 ** own.value * (n.abundance / 100);
}

export interface SolarIsotope {
  Z: number;
  A: number;
  /** Atoms per million silicon atoms (Lodders et al. 2009). */
  N: number;
  /** Shares from the slow and rapid processes (Prantzos et al. 2020). */
  s: number;
  r: number;
}
export const SOLAR_ISOTOPES = abundances.isotopes as SolarIsotope[];

/** The Sun's slow- and rapid-process abundances by mass number, atoms per million silicon atoms. */
export function solarByMass(kind: 's' | 'r'): Map<number, number> {
  const out = new Map<number, number>();
  for (const i of SOLAR_ISOTOPES) out.set(i.A, (out.get(i.A) ?? 0) + i.N * i[kind]);
  return out;
}

/** The Sun's isotopes made only by the slow process (s-fraction 1), shielded from the rapid one. */
export const S_ONLY = SOLAR_ISOTOPES.filter((i) => i.s >= 0.999);

/** Prantzos et al.'s (2020) shares of each element from gallium on: slow, rapid and p processes. */
export function processShares(Z: number): { s: number; r: number; p: number } | null {
  return abundances.heavyElements.find((e) => e.Z === Z) ?? null;
}

// ---------- Origins ----------

export type Origin = 'big-bang' | 'cosmic-rays' | 'low-mass-stars' | 'massive-stars' | 'white-dwarfs' | 'neutron-star-mergers' | 'none';

export const ORIGINS: readonly { id: Origin; name: string; phrase: string; colour: string; how: string }[] = [
  {
    id: 'big-bang',
    name: 'The Big Bang',
    phrase: 'the Big Bang',
    colour: '#5b8def',
    how: 'Made in the first minutes of the universe. The oldest stars already have it, in the same proportions everywhere; how it was made is cosmology, beyond this course.',
  },
  {
    id: 'cosmic-rays',
    name: 'Cosmic rays',
    phrase: 'cosmic rays',
    colour: '#e879a6',
    how: 'Chipped off carbon, nitrogen and oxygen nuclei in space by cosmic rays, fast protons crossing the Galaxy. Stars destroy these fragile nuclei rather than make them, which is why they are so rare.',
  },
  {
    id: 'low-mass-stars',
    name: 'Dying low-mass stars',
    phrase: 'dying low-mass stars',
    colour: '#e0a526',
    how: 'Made in red giants of about 1 to 8 Suns, by hydrogen and helium burning or by the slow neutron captures, and blown off in their winds and planetary nebulae. Their spectra show it: carbon stars, and technetium (Merrill 1952).',
  },
  {
    id: 'massive-stars',
    name: 'Exploding massive stars',
    phrase: 'exploding massive stars',
    colour: '#d4572a',
    how: 'Made by the burning stages of stars over about 8 Suns and in the supernovae that end them; their remnants glow with oxygen, neon, magnesium, silicon and sulphur.',
  },
  {
    id: 'white-dwarfs',
    name: 'Exploding white dwarfs',
    phrase: 'exploding white dwarfs',
    colour: '#8b6fd6',
    how: 'Made when a white dwarf explodes (a type Ia supernova), burning to nickel-56 that decays to iron: its light fades at nickel’s and cobalt’s half-lives.',
  },
  {
    id: 'neutron-star-mergers',
    name: 'Merging neutron stars',
    phrase: 'merging neutron stars',
    colour: '#2a9d8f',
    how: 'Made by the rapid neutron captures, most likely when neutron stars merge: the kilonova after GW170817 (2017) glowed with them. Collapsing stars and magnetar flares may make some too.',
  },
  { id: 'none', name: 'Made by people', phrase: 'people', colour: '#9a9a8a', how: 'No isotope lives long enough to have survived from the stars that made it; what there is on Earth was made in reactors and accelerators.' },
];

export const originOf = (id: Origin) => ORIGINS.find((o) => o.id === id)!;

export interface ElementOrigin {
  Z: number;
  symbol: string;
  shares: Partial<Record<Origin, number>>;
}
export const ELEMENT_ORIGINS = origins.elements as ElementOrigin[];

/** An element's origins, largest first. */
export function originsOf(Z: number): { origin: (typeof ORIGINS)[number]; share: number }[] {
  const e = ELEMENT_ORIGINS[Z - 1];
  if (!e) return [];
  return ORIGINS.filter((o) => (e.shares[o.id] ?? 0) > 0)
    .map((origin) => ({ origin, share: e.shares[origin.id]! }))
    .sort((a, b) => b.share - a.share);
}

/**
 * The elements of a person's body by mass: the six largest from the research
 * brief, the next five from the usual textbook table (rounded), and the iron
 * in an adult's blood (about 4 g in 70 kg).
 */
export const IN_YOU: Readonly<Record<number, number>> = { 8: 65, 6: 18, 1: 10, 7: 3, 20: 1.5, 15: 1, 19: 0.4, 16: 0.3, 11: 0.2, 17: 0.2, 12: 0.1, 26: 0.006 };

// ---------- Colours ----------

/** The chart's colours for each way of decaying. Stable nuclides use the text colour, so they stand out in both themes. */
export const DECAY_COLOURS: Record<DecayKind, string> = {
  stable: 'var(--text)',
  'beta-minus': '#3b82f6',
  'beta-plus': '#e05a7a',
  alpha: '#e7b416',
  proton: '#e8833a',
  neutron: '#a78bfa',
  fission: '#22a06b',
  unknown: '#9ca3af',
};

export const DECAY_NAMES: Record<DecayKind, string> = {
  stable: 'stable',
  'beta-minus': 'β⁻ decay',
  'beta-plus': 'β⁺ decay or electron capture',
  alpha: 'α decay',
  proton: 'gives out a proton',
  neutron: 'gives out a neutron',
  fission: 'splits (fission)',
  unknown: 'decay not known',
};

/** What each decay does, in words. */
export const DECAY_WORDS: Record<DecayKind, string> = {
  stable: 'stable',
  'beta-minus': 'β⁻ decay: a neutron turns into a proton, giving out an electron',
  'beta-plus': 'β⁺ decay or electron capture: a proton turns into a neutron',
  alpha: 'α decay: it throws out a helium nucleus',
  proton: 'it throws out a proton: past the proton drip line',
  neutron: 'it throws out a neutron: past the neutron drip line',
  fission: 'it splits in two',
  unknown: 'how it decays isn’t known',
};

/** A sequential scale from 0 to 1 (pale to deep), readable on either background: viridis-like stops. */
const STOPS = [
  [253, 231, 37],
  [122, 209, 81],
  [34, 168, 132],
  [42, 120, 142],
  [65, 68, 135],
  [68, 1, 84],
];
export function sequential(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const c = STOPS[i].map((v, k) => Math.round(v + f * (STOPS[i + 1][k] - v)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/**
 * An amount as a colour, t from 0 (few) to 1 (many): the more there is, the
 * more the square stands out from the background, deep purple on a light page
 * and bright yellow on a dark one.
 */
export const amountColour = (t: number, dark: boolean) => sequential(dark ? 1 - t : t);

/** Half-lives coloured from a microsecond (pale) to a billion years (deep), on a log scale. */
export const HALF_LIFE_RANGE = [-6, 16.5] as const;
export const halfLifeColour = (seconds: number) => sequential((Math.log10(seconds) - HALF_LIFE_RANGE[0]) / (HALF_LIFE_RANGE[1] - HALF_LIFE_RANGE[0]));

/** Binding energy per nucleon coloured from 7 MeV (pale) to 8.8 MeV (deep). */
export const BINDING_RANGE = [7000, 8800] as const;
export const bindingColour = (keV: number) => sequential((keV - BINDING_RANGE[0]) / (BINDING_RANGE[1] - BINDING_RANGE[0]));

// ---------- Formatting ----------

/** A half-life in the units that read best: "stable", "2.1 × 10⁵ years", "66 hours", "0.16 seconds". */
export function formatHalfLife(seconds: number | null, bound: string | null = null): string {
  if (seconds === null) return 'not measured';
  if (!Number.isFinite(seconds)) return 'stable';
  const b = bound === '<' ? 'under ' : bound === '>' || bound === '≥' ? 'over ' : bound === '~' ? 'about ' : '';
  const y = seconds / YEAR;
  const n = (x: number) => Number(x.toPrecision(x < 10 ? 2 : 3)).toLocaleString('en-GB');
  if (seconds < 1e-9) return `${b}${formatScientific(seconds, 2)} seconds`;
  if (seconds < 1e-6) return `${b}${n(seconds * 1e9)} nanoseconds`;
  if (seconds < 1e-3) return `${b}${n(seconds * 1e6)} microseconds`;
  if (seconds < 1) return `${b}${n(seconds * 1000)} milliseconds`;
  if (seconds < 120) return `${b}${n(seconds)} seconds`;
  if (seconds < 7200) return `${b}${n(seconds / 60)} minutes`;
  if (seconds < 3 * 86400) return `${b}${n(seconds / 3600)} hours`;
  if (y < 1) return `${b}${n(seconds / 86400)} days`;
  if (y < 1e6) return `${b}${n(y)} years`;
  if (y < 1e9) return `${b}${n(y / 1e6)} million years`;
  if (y < 1e12) return `${b}${n(y / 1e9)} billion years`;
  return `${b}${formatScientific(y, 2)} years`;
}

/** An energy in MeV from keV, to `digits` decimals: "8.790 MeV". */
export const formatMeV = (keV: number, digits = 3) => `${(keV / 1000).toFixed(digits)} MeV`;

/** A neutron density: "10²⁴ per cm³". */
export const formatNeutronDensity = (n: number) => `${powerOfTen(Math.round(Math.log10(n) * 10) / 10)} per cm³`;

/** A neutron exposure in mb⁻¹: "0.30 per mb". */
export const formatExposure = (tau: number) => `${tau.toFixed(2)} per mb`;

/** A count of atoms relative to hydrogen as "N per million hydrogen atoms" or "1 per N". */
export function formatPerHydrogen(logEps: number): string {
  const perH = 10 ** (logEps - 12);
  if (perH >= 1e-3) return `${Number((perH * 1000).toPrecision(2)).toLocaleString('en-GB')} for every thousand hydrogen atoms`;
  if (perH >= 1e-6) return `${Number((perH * 1e6).toPrecision(2)).toLocaleString('en-GB')} for every million hydrogen atoms`;
  return `1 for every ${formatInWords(1 / perH)} hydrogen atoms`;
}

/** A large number in words: "3.2 billion", "41 trillion". */
export function formatInWords(x: number): string {
  if (x >= 1e15) return formatScientific(x, 2);
  if (x >= 1e12) return `${Number((x / 1e12).toPrecision(2))} trillion`;
  if (x >= 1e9) return `${Number((x / 1e9).toPrecision(2))} billion`;
  if (x >= 1e6) return `${Number((x / 1e6).toPrecision(2))} million`;
  return Number(x.toPrecision(2)).toLocaleString('en-GB');
}

/** A share as a percentage that reads well: "64%", "0.5%". */
export function formatPercent(share: number): string {
  const p = share * 100;
  if (p >= 10) return `${Math.round(p)}%`;
  if (p >= 1) return `${Number(p.toPrecision(2))}%`;
  if (p >= 0.01) return `${Number(p.toPrecision(1))}%`;
  return 'under 0.01%';
}

export { bindingPerNucleon, ELEMENT_NAMES, nuclideName, nuclideSymbol, SYMBOLS };

/** Nuclides to jump to on the chart. */
export const FAMOUS: readonly { Z: number; A: number; why: string }[] = [
  { Z: 1, A: 1, why: 'hydrogen: one proton' },
  { Z: 2, A: 4, why: 'helium-4: doubly magic, very tightly bound for its size' },
  { Z: 6, A: 12, why: 'carbon-12: made by triple-alpha' },
  { Z: 26, A: 56, why: 'iron-56: the end of nickel-56’s decay' },
  { Z: 28, A: 56, why: 'nickel-56: silicon burning’s ash, doubly magic' },
  { Z: 28, A: 62, why: 'nickel-62: the most tightly bound nucleus' },
  { Z: 43, A: 99, why: 'technetium-99: seen in red giants' },
  { Z: 50, A: 132, why: 'tin-132: doubly magic, far from stability' },
  { Z: 79, A: 197, why: 'gold-197: gold’s only stable isotope' },
  { Z: 82, A: 208, why: 'lead-208: the heaviest doubly magic nucleus' },
  { Z: 92, A: 238, why: 'uranium-238: older than the Solar System' },
];

/** An element's place in the table: [row, column], from 1, with the lanthanides and actinides in rows 9 and 10. */
export function tablePlace(Z: number): [number, number] {
  if (Z === 1) return [1, 1];
  if (Z === 2) return [1, 18];
  if (Z <= 10) return [2, Z <= 4 ? Z - 2 : Z + 8];
  if (Z <= 18) return [3, Z <= 12 ? Z - 10 : Z];
  if (Z <= 36) return [4, Z - 18];
  if (Z <= 54) return [5, Z - 36];
  if (Z <= 56) return [6, Z - 54];
  if (Z <= 71) return [9, Z - 54];
  if (Z <= 86) return [6, Z - 68];
  if (Z <= 88) return [7, Z - 86];
  if (Z <= 103) return [10, Z - 86];
  return [7, Z - 100];
}

/**
 * The pattern's peaks in the three regions where the Sun's are (A = 70–95,
 * 115–140 and 180–205): in each, the top of the pattern smoothed over five
 * mass numbers, if it is a real top (not at the region's edge) holding at
 * least 0.2% of all the nuclei.
 */
export function peaksOf(pattern: Map<number, number>): number[] {
  const smooth = (A: number) => {
    let s = 0;
    for (let d = -2; d <= 2; d++) s += pattern.get(A + d) ?? 0;
    return s / 5;
  };
  const total = [...pattern.values()].reduce((s, y) => s + y, 0);
  if (!total) return [];
  const out: number[] = [];
  for (const [lo, hi] of [
    [70, 95],
    [115, 140],
    [180, 205],
  ]) {
    let best = lo;
    for (let A = lo; A <= hi; A++) if (smooth(A) > smooth(best)) best = A;
    if (best > lo + 2 && best < hi - 2 && smooth(best) > 0.002 * total) out.push(best);
  }
  return out;
}
