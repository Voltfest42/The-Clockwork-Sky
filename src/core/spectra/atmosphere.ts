import { AMU, C, K_B } from '../constants';
import { planck } from '../light/planck';
import { electronPressureOf, ELEMENTS, hydrogenLevelShare, ionisationFractions, levelFraction, sahaRatio, type ElementSymbol } from './saha';

/**
 * A toy stellar atmosphere for Chapter 12: one layer at one temperature and
 * one electron pressure (a main-sequence star's), a Planck continuum, and dark lines whose strength
 * comes from Saha's and Boltzmann's laws. It reproduces where each element's
 * lines peak along the spectral sequence, and why (the reason Cannon's classes
 * are a temperature scale), but not real line depths or shapes: real
 * atmospheres have depth, gravity and convection, and thousands more lines.
 *
 * Wavelengths are in metres unless a name says nm; temperatures in kelvin.
 */

export interface Line {
  element: string;
  /** 0 neutral, 1 singly ionised. */
  ion: number;
  /** Air wavelength, nm. */
  nm: number;
  /** Lower level's energy, eV. */
  chi: number;
  logGf: number;
  name?: string;
}

/** Abundance multipliers relative to the Sun's, by element ("make the Sun without iron": { Fe: 0 }). */
export type Abundances = Partial<Record<ElementSymbol, number>>;

export interface SpectrumOptions {
  kelvin: number;
  lines: readonly Line[];
  abundances?: Abundances;
  /** Speed along the line of sight, m/s (positive away from us). */
  velocity?: number;
  /** First wavelength, nm. */
  from?: number;
  /** Last wavelength, nm. */
  to?: number;
  /** Output bin width, nm. */
  step?: number;
  electronPressure?: number;
}

export interface Spectrum {
  /** Bin centres, nm. */
  nm: number[];
  /** Flux per unit wavelength, W m⁻² m⁻¹ sr⁻¹ (the black body's units). */
  flux: number[];
  /** The continuum, without lines. */
  continuum: number[];
}

const K_EV = 8.617_333_262e-5;
const MICROTURBULENCE = 2_000; // m/s
const FINE = 0.01; // nm
const FLOOR = 0.06; // the darkest a line's core gets, as a share of the continuum
const SIGMA_HMINUS = 3.5e-21; // m², H⁻ bound-free near 500 nm
const SIGMA_THOMSON = 6.652e-29; // m²
const LINE_SCALE = 1e-19; // sets the lines’ overall strength: tuned so the Sun’s Na D, Hβ and Ca II K lines have about their real equivalent widths (0.08, 0.4 and 2 nm)

/** TiO's band heads in the visible (nm, air), each degrading to the red, with a relative strength. */
export const TIO_BANDS: readonly { nm: number; strength: number }[] = [
  { nm: 476.1, strength: 0.6 },
  { nm: 495.4, strength: 0.8 },
  { nm: 516.7, strength: 0.9 },
  { nm: 544.8, strength: 1 },
  { nm: 559.7, strength: 0.9 },
  { nm: 615.9, strength: 0.9 },
  { nm: 665.1, strength: 0.7 },
  { nm: 705.4, strength: 1.2 },
  { nm: 712.6, strength: 0.8 },
  { nm: 758.9, strength: 0.6 },
];

/** TiO's dissociation energy, eV. */
export const TIO_DISSOCIATION = 6.87;

/** The temperature (K) at which half of the toy atmosphere's titanium is in TiO molecules. */
export const TIO_HALF = 3_900;

/**
 * The share of titanium bound in TiO molecules: a dissociation equilibrium,
 * N(TiO)/N(Ti) ∝ T^{−3/2} e^{D₀/kT}, scaled so half is bound at 3,900 K. TiO
 * survives only in the coolest stars, the M stars.
 */
export function tioShare(kelvin: number): number {
  const x = (TIO_HALF / kelvin) ** 1.5 * Math.exp((TIO_DISSOCIATION / K_EV) * (1 / kelvin - 1 / TIO_HALF));
  return x / (1 + x);
}

/** The atoms that absorb a line, per hydrogen nucleus, divided by the lower level's weight (so multiplying by gf gives the line's strength). */
export function absorbersPerHydrogen(line: Line, kelvin: number, electronPressure = electronPressureOf(kelvin), abundances: Abundances = {}): number {
  const symbol = line.element as ElementSymbol;
  const element = ELEMENTS[symbol];
  const multiplier = abundances[symbol] ?? 1;
  if (symbol === 'H') {
    const n = Math.round(1 / Math.sqrt(1 - line.chi / 13.598));
    return (multiplier * hydrogenLevelShare(n, kelvin, electronPressure)) / (2 * n * n);
  }
  const fraction = ionisationFractions(element, kelvin, electronPressure)[line.ion];
  return multiplier * 10 ** (element.logEps - 12) * fraction * levelFraction(1, line.chi, element.partition[line.ion], kelvin);
}

/**
 * The continuum's opacity per hydrogen nucleus, m²: the H⁻ ion (most of it in
 * cool stars), neutral hydrogen's excited levels (in A and B stars) and
 * electron scattering (in O stars).
 */
export function continuumOpacity(kelvin: number, electronPressure = electronPressureOf(kelvin)): number {
  const hydrogen = ELEMENTS.H;
  const ionised = sahaRatio(hydrogen.ionisation[0], 2, 1, kelvin, electronPressure);
  const neutral = 1 / (1 + ionised);
  const hMinus = neutral / sahaRatio(0.754, 1, 2, kelvin, electronPressure);
  let excited = 0;
  for (let n = 3; n <= 6; n++) excited += hydrogenLevelShare(n, kelvin, electronPressure) * 7.9e-22 * n * (500 / (91.18 * n * n)) ** 3;
  const electrons = 1 - neutral + 1e-4;
  return hMinus * SIGMA_HMINUS + excited + electrons * SIGMA_THOMSON;
}

/** A Voigt profile H(a, x), roughly: a Gaussian core with Lorentzian wings. */
function voigt(a: number, x: number): number {
  return Math.exp(-x * x) + a / (Math.sqrt(Math.PI) * (1 + x * x));
}

/** A line's Lorentzian half-width, nm: hydrogen's lines are widened most, by the electric fields of passing ions. */
function dampingWidth(line: Line): number {
  if (line.element === 'H') return 0.04;
  if (line.element === 'He') return 0.01;
  return 0.0015 * (line.nm / 500) ** 2;
}

/** The toy atmosphere's spectrum: a Planck continuum with lines, binned. */
export function syntheticSpectrum({ kelvin, lines, abundances = {}, velocity = 0, from = 380, to = 750, step = 0.4, electronPressure = electronPressureOf(kelvin) }: SpectrumOptions): Spectrum {
  const n = Math.round((to - from) / FINE);
  const tau = new Float64Array(n + 1);
  const kappa = continuumOpacity(kelvin, electronPressure);
  const shift = 1 + velocity / C;

  for (const line of lines) {
    const element = ELEMENTS[line.element as ElementSymbol];
    if (!element) continue;
    const centre = line.nm * shift;
    if (centre < from - 40 || centre > to + 40) continue;
    const strength = (LINE_SCALE * absorbersPerHydrogen(line, kelvin, electronPressure, abundances) * 10 ** line.logGf * (line.nm / 500) ** 2) / kappa;
    if (!(strength > 1e-7)) continue;
    const thermal = Math.sqrt((2 * K_B * kelvin) / (element.mass * AMU) + MICROTURBULENCE ** 2);
    const doppler = Math.max((line.nm * thermal) / C, FINE);
    const a = dampingWidth(line) / doppler;
    const tau0 = strength / (Math.sqrt(Math.PI) * doppler);
    // Out to where the Lorentzian wing falls below 0.002.
    const wing = Math.min(40, Math.max(6 * doppler, Math.sqrt((tau0 * a * doppler * doppler) / (Math.sqrt(Math.PI) * 0.002))));
    const i0 = Math.max(0, Math.floor((centre - wing - from) / FINE));
    const i1 = Math.min(n, Math.ceil((centre + wing - from) / FINE));
    for (let i = i0; i <= i1; i++) tau[i] += tau0 * voigt(a, (from + i * FINE - centre) / doppler);
  }

  const tio = tioShare(kelvin) * (abundances.Ti ?? 1);
  if (tio > 1e-4) {
    for (const band of TIO_BANDS) {
      const head = band.nm * shift;
      const i0 = Math.max(0, Math.ceil((head - from) / FINE));
      for (let i = i0; i <= n; i++) {
        const d = from + i * FINE - head;
        if (d > 60) break;
        tau[i] += 1.2 * tio * band.strength * Math.exp(-d / 9);
      }
    }
  }

  const bins = Math.round((to - from) / step);
  const per = Math.round(step / FINE);
  const out: Spectrum = { nm: [], flux: [], continuum: [] };
  for (let b = 0; b < bins; b++) {
    let sum = 0;
    for (let k = 0; k < per; k++) {
      const t = tau[Math.min(n, b * per + k)];
      sum += FLOOR + (1 - FLOOR) * Math.exp(-t);
    }
    const nm = from + (b + 0.5) * step;
    const continuum = planck(nm * 1e-9, kelvin);
    out.nm.push(nm);
    out.continuum.push(continuum);
    out.flux.push((continuum * sum) / per);
  }
  return out;
}

/** A line's equivalent width in the toy atmosphere, nm: the width of continuum it takes out, the usual measure of a line's strength. */
export function equivalentWidth(line: Line, kelvin: number, abundances: Abundances = {}): number {
  // Titanium off, so TiO's bands don't count towards the line.
  const s = syntheticSpectrum({ kelvin, lines: [line], abundances: { ...abundances, Ti: 0 }, from: line.nm - 20, to: line.nm + 20, step: 0.01 });
  let w = 0;
  for (let i = 0; i < s.nm.length; i++) w += (1 - s.flux[i] / s.continuum[i]) * 0.01;
  return w;
}

/**
 * Payne's curves: how strong each kind of line is at each temperature along
 * the main sequence, measured as the share of the element's atoms that can
 * absorb it (in the right stage of ionisation, on the right level), relative
 * to the most that share ever reaches. For TiO, the share of titanium bound
 * in the molecule.
 */
export const PAYNE_SPECIES = [
  { id: 'H I', label: 'Hydrogen (Balmer lines)', symbol: 'H', stage: 0, chi: 10.199 },
  { id: 'He I', label: 'Neutral helium', symbol: 'He', stage: 0, chi: 20.964 },
  { id: 'He II', label: 'Ionised helium', symbol: 'He', stage: 1, chi: 48.372 },
  { id: 'Mg II', label: 'Ionised magnesium', symbol: 'Mg', stage: 1, chi: 8.864 },
  { id: 'Fe II', label: 'Ionised iron', symbol: 'Fe', stage: 1, chi: 2.89 },
  { id: 'Ca II', label: 'Ionised calcium (H and K)', symbol: 'Ca', stage: 1, chi: 0 },
  { id: 'Fe I', label: 'Neutral iron', symbol: 'Fe', stage: 0, chi: 1.5 },
  { id: 'Ca I', label: 'Neutral calcium', symbol: 'Ca', stage: 0, chi: 0 },
  { id: 'TiO', label: 'Titanium oxide (a molecule)', symbol: 'Ti', stage: -1, chi: 0 },
] as const;

export type PayneId = (typeof PAYNE_SPECIES)[number]['id'];

/** The share of an element's atoms able to absorb a species' lines (per unit of the level's weight), at a temperature (K) on the main sequence. */
export function payneStrength(id: PayneId, kelvin: number): number {
  const s = PAYNE_SPECIES.find((p) => p.id === id)!;
  if (s.stage < 0) return tioShare(kelvin);
  const line: Line = { element: s.symbol, ion: s.stage, nm: 500, chi: s.chi, logGf: 0 };
  return absorbersPerHydrogen(line, kelvin) / 10 ** (ELEMENTS[s.symbol].logEps - 12);
}

/** The temperatures Payne's curves run over, K. */
export const PAYNE_RANGE = [2500, 50000] as const;

/** Payne's curve for a species, scaled so its peak is 1: [kelvin, strength] pairs, evenly spaced in log T. */
export function payneCurve(id: PayneId, points = 160): [number, number][] {
  const [lo, hi] = PAYNE_RANGE;
  const raw: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const kelvin = lo * (hi / lo) ** (i / points);
    raw.push([kelvin, payneStrength(id, kelvin)]);
  }
  const top = Math.max(...raw.map(([, v]) => v));
  return raw.map(([k, v]) => [k, v / top]);
}

/** The temperature (K) where a species' lines are strongest, found on a fine grid in log T. */
export function paynePeak(id: PayneId): number {
  const [lo, hi] = PAYNE_RANGE;
  let best = 0;
  let at = 0;
  for (let i = 0; i <= 2000; i++) {
    const kelvin = lo * (hi / lo) ** (i / 2000);
    const v = payneStrength(id, kelvin);
    if (v > best) {
      best = v;
      at = kelvin;
    }
  }
  return at;
}
