import { M_SUN } from '../core/constants';
import {
  buildNeutronStar,
  logDensityForMass,
  massAboveDensity,
  massRadiusCurve,
  piecewiseEos,
  radiusAtDensity,
  radiusForMass,
  type MassRadiusCurve,
  type NeutronStar,
  type PiecewiseEos,
} from '../core/compact/tov';
import { aged, characteristicAge, isPastDeathLine, spinDownPower, surfaceField } from '../core/compact/pulsar';
import { formatScientific } from '../core/math/scientific';
import { DEFAULT_EOS, EOS_FITS, type EosFit } from '../data/eos';
import type { PulsarKind, PulsarRecord } from '../data/pulsars';

/**
 * Chapter 26's figures' shared pieces: equations of state and the neutron
 * stars they make (Figures 26.1 and 26.2), and pulsars on the P–Ṗ diagram
 * (26.4). Densities in kg/m³ unless marked g/cm³.
 */

// ---------- equations of state and their stars ----------

const eosCache = new Map<string, PiecewiseEos>();
const curveCache = new Map<string, MassRadiusCurve>();

export function fitOf(id: string): EosFit {
  return EOS_FITS.find((f) => f.id === id) ?? EOS_FITS.find((f) => f.id === DEFAULT_EOS)!;
}

export function eosOf(id: string): PiecewiseEos {
  let e = eosCache.get(id);
  if (!e) {
    e = piecewiseEos(fitOf(id));
    eosCache.set(id, e);
  }
  return e;
}

/** The mass–radius curve of an equation of state, in relativity or in Newton's gravity, computed once. */
export function curveOf(id: string, newtonian = false): MassRadiusCurve {
  const key = `${id}:${newtonian}`;
  let c = curveCache.get(key);
  if (!c) {
    c = massRadiusCurve(eosOf(id), newtonian ? { newtonian, n: 60, logRange: [14.25, 15.9] } : { n: 60 });
    curveCache.set(key, c);
  }
  return c;
}

/** Figure 26.2's slider: central density, log₁₀ g/cm³. */
export const NS_LOG_RHO = [14.3, 15.8] as const;
export const NS_START = { eos: DEFAULT_EOS, logRho: 14.95 } as const;

/** A star of the chosen equation of state with central density 10^logRho g/cm³. */
export function neutronStarAt(id: string, logRho: number, newtonian = false): NeutronStar {
  return buildNeutronStar(eosOf(id), 10 ** logRho * 1000, { newtonian, rtol: 1e-8 });
}

/** The heaviest star an equation of state allows (M☉), in relativity. */
export function maxMass(id: string): number {
  return curveOf(id).maximum.mass;
}

/** The equations of state whose heaviest star is lighter than `mass` (M☉): those that can't hold it up. */
export function failingAt(mass: number): string[] {
  return EOS_FITS.filter((f) => maxMass(f.id) < mass).map((f) => f.id);
}

/** A radius in km to one decimal: "11.7 km". */
export function formatKm1(km: number): string {
  return `${km.toFixed(1)} km`;
}

// ---------- Figure 26.1: inside a neutron star ----------

/** Nuclear saturation density, the density inside a big nucleus: 2.7 × 10¹⁴ g/cm³ (0.16 nucleons per fm³), in kg/m³. */
export const NUCLEAR_DENSITY = 2.7e17;
/** Where neutrons start to drip out of the crust's nuclei: 4.3 × 10¹¹ g/cm³, in kg/m³. */
export const NEUTRON_DRIP = 4.3e14;
/** Where "pasta" begins, near the crust's base: about 10¹⁴ g/cm³ (models range from 0.6 to 1.2 × 10¹⁴), in kg/m³. */
export const PASTA = 1e17;

export interface StarLayer {
  id: string;
  name: string;
  /** Distances from the centre (m) of its inner and outer edges, and its densities there (kg/m³). */
  from: number;
  to: number;
  rhoInner: number;
  rhoOuter: number;
  /** Its share of the star's mass. */
  massShare: number;
  colour: string;
  what: string;
}

export interface InsideStar {
  star: NeutronStar;
  mass: number;
  layers: StarLayer[];
  /** The crust's thickness and the outer crust's, m. */
  crust: number;
  outerCrust: number;
}

/** A 1.4 M☉ neutron star of the chosen equation of state, cut into its layers by density. */
export function insideStar(id = DEFAULT_EOS, mass = 1.4): InsideStar {
  const eos = eosOf(id);
  const lr = logDensityForMass(curveOf(id), mass) ?? 14.9;
  const star = buildNeutronStar(eos, 10 ** lr * 1000, { rtol: 1e-9 });
  const R = star.radius;
  const crustBase = eos.crustCore * 1000;
  const r = (rho: number) => radiusAtDensity(star, rho);
  const m = (rho: number) => massAboveDensity(star, rho) / star.mass;
  const rhoC = star.rhoC;
  const inner = 2 * NUCLEAR_DENSITY;
  const bounds = [
    { id: 'inner-core', name: 'Inner core', rhoOuter: Math.min(inner, rhoC), colour: '#7c3aed', what: 'Over twice the density of a nucleus. Nobody knows what is here: neutrons and protons squeezed harder than any experiment can, or hyperons (particles with strange quarks), or free quarks.' },
    { id: 'outer-core', name: 'Outer core', rhoOuter: crustBase, colour: '#2563eb', what: 'A liquid of neutrons with 5–10% protons and as many electrons and muons. The neutrons are a superfluid, flowing without friction; the protons a superconductor.' },
    { id: 'pasta', name: 'Pasta', rhoOuter: PASTA, colour: '#0f766e', what: 'At the crust’s base the nuclei, crowded into a sea of neutrons, merge into rods and sheets (“spaghetti” and “lasagne”), then tubes and holes, before dissolving into the core.' },
    { id: 'inner-crust', name: 'Inner crust', rhoOuter: NEUTRON_DRIP, colour: '#d97706', what: 'Nuclei so rich in neutrons that some drip out: a lattice of nuclei in a sea of electrons and free, superfluid neutrons.' },
    { id: 'outer-crust', name: 'Outer crust', rhoOuter: 1e3, colour: '#b45309', what: 'A solid lattice of nuclei in a sea of electrons. Going down, electrons are squeezed into the nuclei’s protons, so they grow ever richer in neutrons: iron-56 at the top, then nickel-62, …, zinc-80, nickel-78 and krypton-118 at the bottom, nuclei no laboratory has made in quantity (Chapter 23).' },
  ];
  const layers: StarLayer[] = [];
  let from = 0;
  let rhoInner = rhoC;
  for (const b of bounds) {
    if (b.rhoOuter >= rhoInner) continue;
    const to = b.id === 'outer-crust' ? R : r(b.rhoOuter);
    layers.push({ id: b.id, name: b.name, from, to, rhoInner, rhoOuter: b.id === 'outer-crust' ? 0 : b.rhoOuter, massShare: (b.id === 'outer-crust' ? 1 : m(b.rhoOuter)) - (from === 0 ? 0 : m(rhoInner)), colour: b.colour, what: b.what });
    from = to;
    rhoInner = b.rhoOuter;
  }
  return { star, mass: star.mass / M_SUN, layers, crust: R - r(crustBase), outerCrust: R - r(NEUTRON_DRIP) };
}

// ---------- Figure 26.4: the P–Ṗ diagram ----------

export const P_RANGE = [1e-3, 40] as const;
export const PDOT_RANGE = [1e-22, 1e-9] as const;

export const KIND_STYLES: Record<PulsarKind, { colour: string; shape: 'circle' | 'square' | 'diamond' | 'triangle'; order: number }> = {
  young: { colour: 'var(--series-2)', shape: 'triangle', order: 1 },
  ordinary: { colour: 'var(--text-muted)', shape: 'circle', order: 2 },
  'double-neutron-star': { colour: 'var(--series-3)', shape: 'diamond', order: 3 },
  millisecond: { colour: 'var(--series-1)', shape: 'circle', order: 4 },
  magnetar: { colour: 'var(--wrong)', shape: 'square', order: 5 },
  'compact-object': { colour: 'var(--right)', shape: 'diamond', order: 6 },
};

export const FIELD_LINES = [1e8, 1e10, 1e12, 1e14] as const;
export const AGE_LINES = [1e3, 1e5, 1e7, 1e9] as const;
export const POWER_LINES = [1e24, 1e27, 1e30] as const;

export interface PulsarFacts {
  B: number;
  age: number;
  power: number;
}

export function pulsarFacts(p: { P: number; Pdot: number }): PulsarFacts {
  return { B: surfaceField(p.P, p.Pdot), age: characteristicAge(p.P, p.Pdot), power: spinDownPower(p.P, p.Pdot) };
}

/** "3.8 × 10¹² G". */
export function formatGauss(B: number): string {
  return `${formatScientific(B, 2)} G`;
}

/** "1,300 years", "11 million years", "1.6 billion years". */
export function formatYears(y: number): string {
  if (y >= 1e9) return `${Number((y / 1e9).toPrecision(2))} billion years`;
  if (y >= 1e6) return `${Number((y / 1e6).toPrecision(2))} million years`;
  if (y >= 1e4) return `${Math.round(Number(y.toPrecision(2))).toLocaleString('en-GB')} years`;
  return `${Math.round(Number(y.toPrecision(2))).toLocaleString('en-GB')} years`;
}

/** "33.4 ms", "1.34 s". */
export function formatPeriod(P: number): string {
  if (P < 0.1) return `${Number((P * 1000).toPrecision(3))} ms`;
  return `${Number(P.toPrecision(3))} s`;
}

/** The reader's own pulsar: born with period P0 (s) and field B (gauss), aged; or recycled. */
export interface OwnPulsar {
  P0: number;
  B: number;
  logAge: number;
  /** Where it was spun up, if it was: its period and field after recycling. */
  recycled: { P: number; B: number } | null;
}

export const OWN_START: OwnPulsar = { P0: 0.02, B: 3e12, logAge: 3, recycled: null };
export const OWN_LOG_AGE = [2, 10] as const;

export function ownPosition(o: OwnPulsar): { P: number; Pdot: number; B: number; dead: boolean } {
  const start = o.recycled ?? { P: o.P0, B: o.B };
  const now = aged(start.P, start.B, 10 ** o.logAge);
  return { ...now, B: start.B, dead: isPastDeathLine(now.P, now.Pdot) };
}

/** The reader's pulsar's path from its birth (or its recycling) to now, in n points. */
export function ownTrack(o: OwnPulsar, n = 60): { P: number; Pdot: number }[] {
  const start = o.recycled ?? { P: o.P0, B: o.B };
  const out: { P: number; Pdot: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const years = 10 ** (OWN_LOG_AGE[0] - 2 + ((o.logAge - OWN_LOG_AGE[0] + 2) * i) / n);
    out.push(aged(start.P, start.B, i === 0 ? 0 : years));
  }
  return out;
}

/** Pulsars with a measured Ṗ, for the chart, and those without (shown at the bottom edge). */
export function splitPulsars(pulsars: readonly PulsarRecord[]) {
  return {
    plotted: pulsars.filter((p): p is PulsarRecord & { Pdot: number } => p.Pdot !== null),
    unmeasured: pulsars.filter((p) => p.Pdot === null),
  };
}

export { radiusForMass };
