import { formatScientific } from '../core/math/scientific';
import { barrierHeight, gamowIntegralApprox, gamowPeak, lnShareAboveBarrier, thermalEnergy, type NuclearPair } from '../core/nuclear/gamow';
import { hydrogenBurning, type BurningConditions } from '../core/nuclear/ppcno';
import type { Fuel } from '../core/nuclear/ignition';
import { SECONDS_PER_JULIAN_YEAR } from '../core/units';
import { STAR_15, STAR_25, yearsLeftAtStart, type MassiveStar } from '../data/burningStages';
import solarModel from '../data/solarModel.json';

/**
 * Helpers for Chapter 22 (the nuclear furnace): the Gamow peak's reactions,
 * the conditions for the pp chains and the CN cycle, the Sun's burning added
 * up over Model S, formatting, and the massive stars' last days.
 */

const YEAR = SECONDS_PER_JULIAN_YEAR;

// ---------- Figure 22.1: the Gamow peak ----------

export interface GamowReaction extends NuclearPair {
  id: string;
  /** Where it burns, K. */
  T: number;
  where: string;
}

export const GAMOW_REACTIONS: readonly GamowReaction[] = [
  { id: 'pp', name: 'p + p', z1: 1, z2: 1, a1: 1, a2: 1, T: 15.7e6, where: 'the Sun’s centre' },
  { id: 'pc', name: 'p + ¹²C', z1: 1, z2: 6, a1: 1, a2: 12, T: 20e6, where: 'the CNO cycle in a star a little heavier than the Sun' },
  { id: 'pn', name: 'p + ¹⁴N', z1: 1, z2: 7, a1: 1, a2: 14, T: 20e6, where: 'the CNO cycle’s slowest step' },
  { id: 'cc', name: '¹²C + ¹²C', z1: 6, z2: 6, a1: 12, a2: 12, T: 0.8e9, where: 'carbon burning in a massive star' },
  { id: 'oo', name: '¹⁶O + ¹⁶O', z1: 8, z2: 8, a1: 16, a2: 16, T: 2e9, where: 'oxygen burning, a year before a supernova' },
];

/** The rate's fall without tunnelling, as a power of ten: classical (only nuclei above the barrier) over quantum. */
export function classicalShortfall(p: NuclearPair, T: number): number {
  const kT = thermalEnergy(T);
  const lnClassical = Math.log(kT) - barrierHeight(p) / kT;
  return (Math.log(gamowIntegralApprox(p, T)) - lnClassical) / Math.LN10;
}

/** The share above the barrier as a power of ten. */
export const log10ShareAboveBarrier = (p: NuclearPair, T: number) => lnShareAboveBarrier(p, T) / Math.LN10;

/** An energy in keV: "6.1 keV", "2.1 MeV". */
export function formatKeV(e: number): string {
  if (e >= 1000) return `${Number((e / 1000).toPrecision(2))} MeV`;
  if (e >= 10) return `${Math.round(e)} keV`;
  return `${Number(e.toPrecision(e < 2 ? 3 : 2))} keV`;
}

/** A temperature in the units that read best: "15.7 million K", "2 billion K". */
export function formatHotKelvin(T: number): string {
  if (T >= 1e9) return `${Number((T / 1e9).toPrecision(3))} billion K`;
  return `${Number((T / 1e6).toPrecision(3))} million K`;
}

/** A probability as a power of ten: "1 in 8,100", "10⁻²⁷". */
export function formatChance(p: number): string {
  if (p >= 1e-6) return `1 in ${Number((1 / p).toPrecision(2)).toLocaleString('en-GB')}`;
  return formatScientific(p, 2);
}

export { gamowPeak };

// ---------- Figure 22.2: the pp chains and the CN cycle ----------

export interface Makeup {
  id: string;
  name: string;
  rho: number;
  X: number;
  Z: number;
}

/** A newborn star like the Sun (100 g/cm³), and the Sun's centre today (Model S). */
export const MAKEUPS: readonly Makeup[] = [
  { id: 'newborn', name: 'A newborn star', rho: 1e5, X: 0.7, Z: 0.02 },
  { id: 'sun', name: 'The Sun’s centre today', rho: solarModel.shells[0].rho, X: solarModel.shells[0].X, Z: solarModel.shells[0].Z },
];

export const burningAt = (T: number, m: Makeup): BurningConditions => ({ T, rho: m.rho, X: m.X, Z: m.Z });

/** The Sun's burning added up over Model S's shells, each burning steadily: the branches' shares, CNO's share and the luminosity (L☉). */
export const SUN_BURNING = (() => {
  let I = 0;
  let II = 0;
  let III = 0;
  let pp = 0;
  let cno = 0;
  const sh = solarModel.shells;
  for (let i = 1; i < sh.length; i++) {
    const a = sh[i - 1];
    const b = sh[i];
    const T = (a.T + b.T) / 2;
    if (T < 5e6) continue;
    const h = hydrogenBurning({ T, rho: (a.rho + b.rho) / 2, X: (a.X + b.X) / 2, Z: (a.Z + b.Z) / 2 });
    const dm = (b.m - a.m) * solarModel.mass;
    I += h.branches.ppI * h.ppPower * dm;
    II += h.branches.ppII * h.ppPower * dm;
    III += h.branches.ppIII * h.ppPower * dm;
    pp += h.ppPower * dm;
    cno += h.cnoPower * dm;
  }
  const t = I + II + III;
  return { ppI: I / t, ppII: II / t, ppIII: III / t, cno: cno / (pp + cno), luminosity: (pp + cno) / 3.828e26 };
})();

/** The Sun's centre in Model S: heat made per cubic metre, W/m³ (about 260), and a resting person's (100 W in 0.07 m³). */
export const SUN_CORE_WATTS_PER_M3 = solarModel.shells[0].eps * solarModel.shells[0].rho;
export const BODY_WATTS_PER_M3 = 100 / 0.07;

/** A waiting time in the units that read best: "1.4 seconds", "80 days", "6.0 billion years". */
export function formatWait(seconds: number): string {
  const y = seconds / YEAR;
  if (seconds < 1e-3) return `${Number((seconds * 1e6).toPrecision(2))} microseconds`;
  if (seconds < 1) return `${Number((seconds * 1000).toPrecision(2))} milliseconds`;
  if (seconds < 120) return `${Number(seconds.toPrecision(2))} seconds`;
  if (seconds < 7200) return `${Number((seconds / 60).toPrecision(2))} minutes`;
  if (seconds < 2 * 86400) return `${Number((seconds / 3600).toPrecision(2))} hours`;
  if (y < 2) return `${Number((seconds / 86400).toPrecision(2))} days`;
  if (y < 1e6) return `${Number(y.toPrecision(2)).toLocaleString('en-GB')} years`;
  if (y < 1e9) return `${Number((y / 1e6).toPrecision(2))} million years`;
  if (y < 1e12) return `${Number((y / 1e9).toPrecision(2))} billion years`;
  return `${formatScientific(y, 1)} years`;
}

/** Heat per kilogram: "1.7 mW/kg", "0.54 W/kg". */
export function formatPower(w: number): string {
  if (w < 1e-6) return `${formatScientific(w, 2)} W/kg`;
  if (w < 1) return `${Number((w * 1000).toPrecision(2))} mW/kg`;
  return `${Number(w.toPrecision(2)).toLocaleString('en-GB')} W/kg`;
}

/** A share: "84%", "0.18%", "0.0012%", "under 0.001%". */
export function formatShare(s: number): string {
  if (s >= 0.1) return `${Math.round(s * 100)}%`;
  if (s >= 1e-5) return `${Number((s * 100).toPrecision(2))}%`;
  return 'under 0.001%';
}

/** The pp chains' and CN cycle's nuclei on the chart of nuclides: protons Z, neutrons N. */
export const NUCLIDES = {
  h1: { label: '¹H', Z: 1, N: 0 },
  h2: { label: '²H', Z: 1, N: 1 },
  he3: { label: '³He', Z: 2, N: 1 },
  he4: { label: '⁴He', Z: 2, N: 2 },
  li7: { label: '⁷Li', Z: 3, N: 4 },
  be7: { label: '⁷Be', Z: 4, N: 3 },
  be8: { label: '⁸Be', Z: 4, N: 4 },
  b8: { label: '⁸B', Z: 5, N: 3 },
  c12: { label: '¹²C', Z: 6, N: 6 },
  c13: { label: '¹³C', Z: 6, N: 7 },
  n13: { label: '¹³N', Z: 7, N: 6 },
  n14: { label: '¹⁴N', Z: 7, N: 7 },
  n15: { label: '¹⁵N', Z: 7, N: 8 },
  o15: { label: '¹⁵O', Z: 8, N: 7 },
} as const;
export type NuclideId = keyof typeof NUCLIDES;

/** Each step as an arrow between nuclides; ⁸B's decay goes by way of ⁸Be. */
export const STEP_ARROWS: Record<string, [NuclideId, NuclideId]> = {
  pp: ['h1', 'h2'],
  dp: ['h2', 'he3'],
  '33': ['he3', 'he4'],
  '34': ['he3', 'be7'],
  ec: ['be7', 'li7'],
  li7p: ['li7', 'he4'],
  '17': ['be7', 'b8'],
  b8: ['b8', 'be8'],
  c12p: ['c12', 'n13'],
  n13: ['n13', 'c13'],
  c13p: ['c13', 'n14'],
  n14p: ['n14', 'o15'],
  o15: ['o15', 'n15'],
  n15p: ['n15', 'c12'],
};

/** The CN cycle's catalysts over time are followed for this long at each make-up, years. */
export const CATALYST_YEARS = 1e10;

// ---------- Figure 22.3: Hoyle's resonance ----------

/** Energies relative to three separate helium nuclei, MeV. */
export const LEVELS = {
  be8: 0.0918,
  hoyle: 0.3794,
  carbonGround: -7.2747,
  carbonFirst: -7.2747 + 4.4389,
} as const;

/** The helium core of Figure 22.3: 10⁴ g/cm³, burning half its helium in 100 million years with the real Hoyle state. */
export const HELIUM_CORE = { rho: 1e7, years: 1e8 } as const;

/** The Hoyle state can be moved this far, MeV above three helium nuclei. */
export const HOYLE_RANGE = [0.28, 0.48] as const;

// ---------- Figure 22.4: the last days of a massive star ----------

export const MASSIVE_STARS: readonly MassiveStar[] = [STAR_15, STAR_25];

export const FUEL_NAMES: Record<Fuel, string> = { H: 'hydrogen', He: 'helium', C: 'carbon', Ne: 'neon', O: 'oxygen', Si: 'silicon' };

/** The years-left range of the clock, log₁₀: from 20 million years to about an hour. */
export const CLOCK_RANGE = [7.3, -4] as const;

/** Which stage is burning at `yearsLeft` (the last one past its end, as the core collapses). */
export function stageAt(star: MassiveStar, yearsLeft: number): number {
  const starts = yearsLeftAtStart(star);
  for (let i = starts.length - 1; i >= 0; i--) if (yearsLeft <= starts[i]) return i;
  return 0;
}

/** "11 million years", "2,000 years", "8.8 months", "18 days", "18 hours". */
export function formatTimeLeft(years: number): string {
  if (years >= 1e6) return `${Number((years / 1e6).toPrecision(2))} million years`;
  if (years >= 2) return `${Number(years.toPrecision(2)).toLocaleString('en-GB')} years`;
  const days = years * 365.25;
  if (days >= 60) return `${Number((days / 30.44).toPrecision(2))} months`;
  if (days >= 2) return `${Number(days.toPrecision(2))} days`;
  if (days * 24 >= 2) return `${Number((days * 24).toPrecision(2))} hours`;
  return `${Number((days * 1440).toPrecision(2))} minutes`;
}

/** A luminosity in watts as a power of ten of the Sun's: "28,000 L☉", "10¹² L☉". */
export function formatSolarLuminosity(watts: number): string {
  const l = watts / 3.828e26;
  if (l < 1e6) return `${Number(l.toPrecision(2)).toLocaleString('en-GB')} L☉`;
  return `${formatScientific(l, 2)} L☉`;
}

export interface OnionLayer {
  id: string;
  /** What it is made of, and as chemical symbols: "O, Ne, Mg". */
  name: string;
  short: string;
  /** Outer edge, M☉ (drawn by mass). */
  outer: number;
  /** Burns at its base: the core's fuel at the centre, or a shell. */
  burning: boolean;
  /** Fixed colours that read in both themes (each layer is also named). */
  color: string;
}

export const ONION_COLOURS = {
  H: '#56b4e9',
  He: '#e69f00',
  CO: '#8c8c8c',
  ONe: '#cc79a7',
  O: '#cc79a7',
  Si: '#009e73',
  Fe: '#8a5a44',
} as const;

/**
 * The star's layers while each stage burns (`stage` 0–5) or at collapse (6),
 * by mass, outermost first. Each stage's fuel burns in the core; the earlier
 * fuels go on burning in shells at the base of their layers. Sourced edges:
 * the iron cores (1.45 and 1.62 M☉), the 15 M☉ star's silicon core (1.55)
 * and helium core (about 4), the 25 M☉ star's helium and carbon–oxygen cores
 * from the course's SSE port (8.8 and 6.4 M☉, Chapter 16) and the masses left
 * after their winds (Table I); the other edges are drawn roughly, and the
 * figure says so.
 */
export function onionAt(star: MassiveStar, stage: number): OnionLayer[] {
  const big = star.mass === 25;
  const s = Math.min(stage, star.stages.length - 1);
  const edge = {
    H: star.stages[s].mass,
    He: big ? 8.8 : 4.1,
    CO: big ? 6.4 : 2.6,
    ONe: big ? 3.2 : 2.0,
    Si: big ? 1.9 : 1.55,
    Fe: star.ironCore,
  };
  const SHORT: Record<keyof typeof ONION_COLOURS, string> = { H: 'H, He', He: 'He', CO: 'C, O', ONe: 'O, Ne, Mg', O: 'O, Mg', Si: 'Si, S', Fe: 'Fe, Ni' };
  const layer = (id: keyof typeof ONION_COLOURS, name: string, outer: number, burning = true): OnionLayer => ({ id, name, short: SHORT[id], outer, burning, color: ONION_COLOURS[id] });
  const H = layer('H', 'hydrogen', edge.H);
  const He = layer('He', 'helium', edge.He);
  const CO = layer('CO', 'carbon and oxygen', edge.CO);
  const ONe = layer('ONe', 'oxygen, neon and magnesium', edge.ONe);
  switch (stage) {
    case 0:
      return [H];
    case 1:
      return [H, He];
    case 2:
      return [H, He, CO];
    case 3:
      return [H, He, CO, ONe];
    case 4:
      return [H, He, CO, layer('O', 'oxygen and magnesium', edge.ONe)];
    case 5:
      return [H, He, CO, ONe, layer('Si', 'silicon and sulphur', edge.Si)];
    default:
      return [H, He, CO, ONe, layer('Si', 'silicon and sulphur', edge.Si), layer('Fe', 'iron and nickel', edge.Fe, false)];
  }
}
