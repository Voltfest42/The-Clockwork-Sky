import { C } from '../core/constants';
import { type Abundances, equivalentWidth, type Line, syntheticSpectrum } from '../core/spectra/atmosphere';
import { shiftedWavelength } from '../core/spectra/doppler';
import { jumpEnergy, lineName, seriesOf, wavelength } from '../core/spectra/hydrogen';
import { spectralTypeOf } from '../core/stars/hr';
import { GASES, type Gas } from '../data/spectra/lamps';
import lineData from '../data/spectra/lines.json';
import { SUN_COMPOSITION } from '../data/sunComposition';
import xsl from '../data/xsl/spectra.json';
import { formatKelvin, formatWavelength } from '../viz/spectrum/format';

/**
 * Chapter 12's figures: Kirchhoff's three spectra (12.1), hydrogen's ladder
 * (12.2), make a spectrum and Payne's curves (12.3), what the Sun is made of
 * (12.4) and the Doppler shifter (12.5).
 */

export const LINES: readonly Line[] = lineData.lines;

// ---------- 12.1, Kirchhoff's three spectra ----------

export type View = 'lamp' | 'cloud' | 'through';

export const VIEWS: readonly { id: View; label: string; kind: string }[] = [
  { id: 'lamp', label: 'The lamp', kind: 'a continuous spectrum' },
  { id: 'cloud', label: 'The cloud, from the side', kind: 'bright lines' },
  { id: 'through', label: 'The lamp, through the cloud', kind: 'dark lines' },
];

export function gas(id: string): Gas {
  const g = GASES.find((x) => x.id === id);
  if (!g) throw new Error(`No gas ${id}`);
  return g;
}

/** What you see from each place, in a sentence. */
export function describeKirchhoff(view: View, gasId: string): string {
  const g = gas(gasId);
  const strongest = [...g.lines].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([nm]) => `${nm.toFixed(1)} nm`);
  const name = g.name.toLowerCase();
  if (view === 'lamp')
    return 'Looking straight at the hot, dense lamp: a continuous spectrum, every colour from violet to red with no gaps. Any hot solid, liquid or dense gas glows like this.';
  if (view === 'cloud')
    return `Looking at the thin cloud of ${name} against a dark background: bright lines, light at only a few wavelengths, the strongest at ${strongest.join(' and ')}. That pattern is ${name}’s alone.`;
  return `Looking at the lamp through the cooler cloud of ${name}: the lamp’s continuous spectrum with dark lines where the bright lines were. The gas takes those colours out of the beam and sends them off in all directions, so less of them reaches you.`;
}

// ---------- 12.2, hydrogen's ladder ----------

export const TOP_LEVEL = 6;

export interface Jump {
  lower: number;
  upper: number;
}

/** Every jump on the ladder up to level 6, grouped by the level it starts or ends on. */
export const JUMPS: readonly Jump[] = [1, 2, 3].flatMap((lower) => Array.from({ length: TOP_LEVEL - lower }, (_, k) => ({ lower, upper: lower + k + 1 })));

export function describeJump({ lower, upper }: Jump, absorb: boolean): string {
  const series = seriesOf(lower);
  const lambda = wavelength(lower, upper);
  const energy = jumpEnergy(lower, upper);
  const region = lambda < 380e-9 ? 'ultraviolet, invisible to the eye' : lambda > 750e-9 ? 'infrared, invisible to the eye' : 'visible';
  const move = absorb ? `An atom on level ${lower} takes in a photon and its electron climbs to level ${upper}` : `The electron drops from level ${upper} to level ${lower} and the atom gives out a photon`;
  return `${move}: ${energy.toFixed(2)} eV, ${formatWavelength(lambda)}, ${region}. This is ${lineName(lower, upper)}, in the ${series?.name ?? ''} series.`;
}

// ---------- 12.3, make a spectrum ----------

export const SPECTRUM_FROM = 380;
export const SPECTRUM_TO = 750;

/** The elements the reader can change, with the lines they make. */
export const DIALS = [
  { symbol: 'H', name: 'Hydrogen' },
  { symbol: 'He', name: 'Helium' },
  { symbol: 'Na', name: 'Sodium' },
  { symbol: 'Mg', name: 'Magnesium' },
  { symbol: 'Ca', name: 'Calcium' },
  { symbol: 'Fe', name: 'Iron' },
  { symbol: 'Ti', name: 'Titanium (TiO)' },
] as const;

/** Abundance settings, from none to ten times the Sun's. */
export const AMOUNTS = [0, 0.1, 1, 10] as const;

export function amountLabel(x: number): string {
  return x === 0 ? 'none' : x === 1 ? 'as the Sun' : x < 1 ? `${x}×` : `${x}×`;
}

/** The model spectrum, normalised so its brightest bin is 1: [nm, flux] and [nm, line depth 0–1]. */
export function modelSpectrum(kelvin: number, abundances: Abundances = {}, velocity = 0, from = SPECTRUM_FROM, to = SPECTRUM_TO, step = 0.4) {
  const s = syntheticSpectrum({ kelvin, lines: LINES, abundances, velocity, from, to, step });
  const top = Math.max(...s.flux);
  return {
    points: s.nm.map((nm, i) => [nm * 1e-9, s.flux[i] / top] as [number, number]),
    depth: s.nm.map((nm, i) => [nm, 1 - s.flux[i] / s.continuum[i]] as [number, number]),
  };
}

export interface RealStar {
  id: string;
  name: string;
  spectralClass: string;
  kelvin: number;
  note: string;
}

export const REAL_STARS: readonly RealStar[] = xsl.stars.map(({ id, name, spectralClass, kelvin, note }) => ({ id, name, spectralClass, kelvin, note }));

/**
 * The real star to show beside the model: the one nearest in temperature
 * (in log T). The metal-poor star stands in when iron is turned down at a
 * temperature near its own.
 */
export function nearestRealStar(kelvin: number, ironShare = 1): RealStar {
  if (ironShare < 0.5 && kelvin > 4800 && kelvin < 6600) return REAL_STARS.find((s) => s.id === 'hd140283')!;
  return REAL_STARS.filter((s) => s.id !== 'hd140283').reduce((a, b) => (Math.abs(Math.log(b.kelvin / kelvin)) < Math.abs(Math.log(a.kelvin / kelvin)) ? b : a));
}

/** A real star's spectrum between two wavelengths (nm), normalised so its brightest point there is 1: [m, flux] pairs. */
export function realSpectrum(id: string, from = SPECTRUM_FROM, to = SPECTRUM_TO): [number, number][] {
  const star = xsl.stars.find((s) => s.id === id);
  if (!star) throw new Error(`No spectrum for ${id}`);
  const out: [number, number][] = [];
  star.flux.forEach((f, i) => {
    const nm = xsl.from + (i + 0.5) * xsl.step;
    if (nm >= from && nm <= to) out.push([nm * 1e-9, f]);
  });
  const top = Math.max(...out.map(([, f]) => f));
  return out.map(([l, f]) => [l, f / top]);
}

/** The spectral class's letter for a temperature: O above 30,000 K down to M below 3,700 K (L, T and Y are cooler still). */
export function classLetter(kelvin: number): string {
  return spectralTypeOf(kelvin).charAt(0);
}

/** A line's label: its own name (Hα, Na D₂) or its element and stage (He II). */
export function lineLabel(line: Line): string {
  return line.name ?? `${line.element} ${'I'.repeat(line.ion + 1)} ${Math.round(line.nm)}`;
}

/** The lines worth labelling at a temperature: the strongest few, by equivalent width in the model. */
export function strongestLines(kelvin: number, abundances: Abundances = {}, count = 4): { line: Line; width: number }[] {
  const shown = LINES.filter((l) => l.nm >= SPECTRUM_FROM && l.nm <= SPECTRUM_TO);
  const widths = shown.map((line) => ({ line: { ...line, name: lineLabel(line) }, width: equivalentWidth(line, kelvin, abundances) }));
  const chosen: { line: Line; width: number }[] = [];
  for (const w of widths.sort((a, b) => b.width - a.width)) {
    if (w.width < 0.01) break;
    // One label for a close group (Na D₁ and D₂, the Mg b triplet).
    if (chosen.some((c) => Math.abs(c.line.nm - w.line.nm) < 8)) continue;
    chosen.push(w);
    if (chosen.length === count) break;
  }
  return chosen;
}

const LINE_GROUPS: Record<string, string> = { H: 'hydrogen', He: 'helium', Na: 'sodium', Mg: 'magnesium', Ca: 'calcium', Fe: 'iron', Si: 'silicon' };

/** What the model shows at a temperature, in a sentence or two. */
export function describeModel(kelvin: number, abundances: Abundances = {}): string {
  const type = spectralTypeOf(kelvin);
  const top = strongestLines(kelvin, abundances, 3).map(({ line }) => line.name);
  const changed = Object.entries(abundances).filter(([, v]) => v !== 1 && v !== undefined);
  const tio = kelvin < 4300 && (abundances.Ti ?? 1) > 0 ? ' Bands of titanium oxide, a molecule that survives only in the coolest stars, cut into the red.' : '';
  const strongest = top.length ? `The strongest lines: ${top.join(', ')}.` : 'Hardly any lines show.';
  const note = changed.length
    ? ` You have changed ${changed.map(([s, v]) => `${LINE_GROUPS[s] ?? 'titanium'} to ${amountLabel(v!)}`).join(', ')}.`
    : '';
  const article = /^[AFOM]/.test(type) ? 'an' : 'a';
  return `At ${formatKelvin(kelvin)}, ${article} ${type.replace(/V$/, '')} star on the main sequence. ${strongest}${tio}${note}`;
}

// ---------- 12.4, what the Sun is made of ----------

export interface SolarShare {
  symbol: string;
  name: string;
  /** Share of atoms. */
  byNumber: number;
  /** Share of mass. */
  byMass: number;
  /** Grams in a kilogram of the Sun. */
  grams: number;
}

/** The Sun's make-up by number of atoms and by mass, from Asplund and colleagues' abundances. */
export function solarComposition(): SolarShare[] {
  const atoms = SUN_COMPOSITION.map((e) => ({ ...e, n: 10 ** (e.logEps - 12) }));
  const totalN = atoms.reduce((s, e) => s + e.n, 0);
  const totalM = atoms.reduce((s, e) => s + e.n * e.mass, 0);
  return atoms.map((e) => ({ symbol: e.symbol, name: e.name, byNumber: e.n / totalN, byMass: (e.n * e.mass) / totalM, grams: (1000 * e.n * e.mass) / totalM }));
}

/** Hydrogen's, helium's and everything else's shares of the Sun's mass (X, Y, Z). */
export function massFractions(): { X: number; Y: number; Z: number } {
  const c = solarComposition();
  const X = c.find((e) => e.symbol === 'H')!.byMass;
  const Y = c.find((e) => e.symbol === 'He')!.byMass;
  return { X, Y, Z: 1 - X - Y };
}

/** A share as a readable percentage: "73.9%", "0.77%", "0.0016%". */
export function formatShare(x: number): string {
  const pct = x * 100;
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  return `${Number(pct.toPrecision(2))}%`;
}

/** Grams, readably: "739 g", "7.7 g", "0.14 g". */
export function formatGrams(g: number): string {
  return g >= 100 ? `${Math.round(g)} g` : `${Number(g.toPrecision(2))} g`;
}

// ---------- 12.5, the Doppler shifter ----------

/** Measured speeds along the line of sight, km/s, positive away from us (SIMBAD). */
export const RADIAL_VELOCITIES = [
  { id: 'barnard', name: 'Barnard’s star', kms: -110.5 },
  { id: 'arcturus', name: 'Arcturus', kms: -5.2 },
  { id: 'aldebaran', name: 'Aldebaran', kms: 54.3 },
] as const;

/** The window Figure 12.5 shows, nm: sodium's D lines and helium's D₃. */
export const DOPPLER_WINDOW = [585, 593] as const;

/** The laboratory lines in Figure 12.5's window: sodium's D lines. */
export const LAB_LINES = [588.995, 589.592] as const;

/** A pair of Sun-like stars in a circular orbit, each moving at up to 60 km/s, round every 4 days. */
export const PAIR = { speed: 60, periodDays: 4 } as const;

/** The two stars' speeds along the line of sight (km/s) at a phase (0–1) of their orbit. */
export function pairVelocities(phase: number): [number, number] {
  const v = PAIR.speed * Math.sin(2 * Math.PI * phase);
  return [v, -v];
}

/** Where a line (nm) appears from a star moving at km/s. */
export function shiftedNm(nm: number, kms: number): number {
  return shiftedWavelength(nm, kms * 1000);
}

export function describeDoppler(kms: number): string {
  const shift = shiftedNm(LAB_LINES[0], kms) - LAB_LINES[0];
  if (Math.abs(kms) < 0.05) return 'The star isn’t moving towards us or away: its lines sit exactly where the laboratory’s are.';
  const way = kms > 0 ? 'away from us, so its lines are shifted to the red (longer wavelengths)' : 'towards us, so its lines are shifted to the blue (shorter wavelengths)';
  return `The star is moving ${Math.abs(kms).toLocaleString('en-GB', { maximumFractionDigits: 1 })} km/s ${way}: sodium’s D₂ line moves ${Math.abs(shift * 1000).toFixed(0)} thousandths of a nanometre, from 588.995 to ${shiftedNm(LAB_LINES[0], kms).toFixed(3)} nm. Δλ/λ = v/c: one part in ${Math.round(C / 1000 / Math.abs(kms)).toLocaleString('en-GB', { maximumSignificantDigits: 2 })}.`;
}
