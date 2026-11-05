import { AMU, C, K_B, M_E, M_SUN, R_EARTH, R_MOON, R_SUN, T_SUN, L_SUN } from '../core/constants';
import { formatScientific } from '../core/math/scientific';
import { ageAtLuminosity, coolingTrack, interpolate, MESTEL_C, type CoolingTrack } from '../core/compact/cooling';
import { buildWhiteDwarf, chandrasekharMass, massForRadius, massRadiusCurve, MU_E, type MassRadiusPoint } from '../core/compact/whiteDwarf';
import { degeneratePressure } from '../core/structure/eos';
import { fermiEnergy, fermiTemperature, occupation, pairGas } from '../core/structure/fermi';
import solarModel from '../data/solarModel.json';
import { MEASURED_WHITE_DWARFS } from '../data/whiteDwarfs';

/**
 * Chapter 24's figures' shared pieces: packed electrons (Figure 24.1), cold
 * white dwarfs built by the stepping solver (24.2) and white dwarfs cooling
 * and crystallising (24.3). Densities in kg/m³ unless marked g/cm³.
 */

const MC2 = M_E * C * C;

// ---------- Figure 24.1: the Fermi sea ----------

export interface FermiPreset {
  id: string;
  name: string;
  /** kg/m³, K, and mass units per electron. */
  rho: number;
  T: number;
  mue: number;
}

const SUN_X = solarModel.shells[0].X;

/** Places to look: the Sun's centre (with its own hydrogen), a red giant's helium core as it flashes, Sirius B's centre and a cooling ember's surface layers. */
export const FERMI_PRESETS: readonly FermiPreset[] = [
  { id: 'sun', name: 'The Sun’s centre', rho: solarModel.shells[0].rho, T: solarModel.shells[0].T, mue: 2 / (1 + SUN_X) },
  { id: 'giant', name: 'A red giant’s core', rho: 1e9, T: 1e8, mue: 2 },
  { id: 'sirius-b', name: 'Sirius B’s centre', rho: 3.16e10, T: 1.4e7, mue: 2 },
];

/** The figure's default: white-dwarf matter at a million g/cm³ and ten million K. */
export const FERMI_START = { rho: 1e9, T: 1e7, mue: 2 } as const;
export const FERMI_RHO_RANGE = [1e3, 1e13] as const; // kg/m³: 1 to 10¹⁰ g/cm³
export const FERMI_T_RANGE = [1e4, 1e9] as const;

export interface FermiState {
  /** Electrons per m³. */
  ne: number;
  /** The Fermi momentum over m_e c, the Fermi energy (J, kinetic) and temperature (K). */
  x: number;
  EF: number;
  TF: number;
  /** kT/m_e c² and the chemical potential over m_e c², rest mass included. */
  theta: number;
  psi: number;
  /** Electron pressures, Pa: the real one at this temperature, an ideal gas's, and packed electrons' at zero temperature. */
  P: number;
  ideal: number;
  packed: number;
  /** How fast electrons at the top of the sea move, as a share of light's speed. */
  edgeSpeed: number;
  /** The share of states below the Fermi momentum that are full (1 when cold and packed). */
  filled: number;
}

/** Electrons at density ρ (kg/m³) and T (K), μ_e mass units per electron: their Fermi sea and pressures. */
export function fermiState(rho: number, T: number, mue: number): FermiState {
  const ne = rho / (mue * AMU);
  const EF = fermiEnergy(ne);
  const y = 1 + EF / MC2;
  const x = Math.sqrt(y * y - 1);
  const gas = pairGas(ne, T, false);
  const theta = (K_B * T) / MC2;
  // The share of the states under p_F that are taken: ∫ f t² dt / (x³/3).
  let sum = 0;
  const n = 200;
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * x;
    sum += occupation(Math.sqrt(1 + t * t), gas.psi, theta) * t * t;
  }
  const filled = (sum * (x / n)) / (x ** 3 / 3);
  return {
    ne,
    x,
    EF,
    TF: fermiTemperature(rho, mue),
    theta,
    psi: gas.psi,
    P: gas.pressure,
    ideal: ne * K_B * T,
    packed: degeneratePressure(ne),
    edgeSpeed: x / Math.sqrt(1 + x * x),
    filled,
  };
}

/** How packed the electrons are, in words, from T/T_F. */
export function packingWord(T: number, TF: number): 'packed' | 'partly packed' | 'free' {
  const r = T / TF;
  if (r < 0.1) return 'packed';
  if (r < 3) return 'partly packed';
  return 'free';
}

/** A momentum in units of m_e c: "0.80 m_e c". */
export function formatMomentum(x: number): string {
  if (x < 0.01) return `${formatScientific(x, 2)} mₑc`;
  return `${Number(x.toPrecision(2))} mₑc`;
}

/** An energy in electronvolts: "160 keV", "1.3 MeV", "86 eV". */
export function formatElectronvolts(joules: number): string {
  const ev = joules / 1.602_176_634e-19;
  if (ev >= 1e6) return `${Number((ev / 1e6).toPrecision(2))} MeV`;
  if (ev >= 1e3) return `${Number((ev / 1e3).toPrecision(2))} keV`;
  return `${Number(ev.toPrecision(2))} eV`;
}

/** A temperature for any range: "15.7 million K", "3.2 billion K", "8,000 K". */
export function formatAnyKelvin(T: number): string {
  if (T >= 1e9) return `${Number((T / 1e9).toPrecision(3))} billion K`;
  if (T >= 1e6) return `${Number((T / 1e6).toPrecision(3))} million K`;
  return `${Number(T.toPrecision(2)).toLocaleString('en-GB')} K`;
}

// ---------- Figure 24.2: build a white dwarf ----------

export const WD_MAKEUPS = [
  { id: 'helium', name: 'Helium', mue: MU_E.helium },
  { id: 'carbonOxygen', name: 'Carbon and oxygen', mue: MU_E.carbonOxygen },
  { id: 'iron', name: 'Iron', mue: MU_E.iron },
] as const;
export type MakeupId = (typeof WD_MAKEUPS)[number]['id'];

/** Central densities the figure offers, g/cm³ (log₁₀). */
export const WD_LOG_RHO = [4, 12] as const;
export const WD_START = { logRho: 6.5, makeup: 'carbonOxygen' as MakeupId };

/** The mass–radius curves for μ_e = 2 and for iron, worked out once. */
let curves: { two: MassRadiusPoint[]; iron: MassRadiusPoint[] } | undefined;
export function wdCurves() {
  return (curves ??= { two: massRadiusCurve(2, 65, WD_LOG_RHO), iron: massRadiusCurve(MU_E.iron, 65, WD_LOG_RHO) });
}

export const CHANDRASEKHAR = { two: chandrasekharMass(2) / M_SUN, iron: chandrasekharMass(MU_E.iron) / M_SUN };

/** The measured white dwarfs, with radii in km. */
export const MEASURED = MEASURED_WHITE_DWARFS.map((w) => ({ ...w, radiusKm: w.radius * (R_SUN / 1000), radiusErrorKm: w.radiusError * (R_SUN / 1000) }));

/** Each measured white dwarf against the solver's white dwarf of its mass (μ_e = 2): the model's radius, km. */
export function modelRadiusFor(massSolar: number): number {
  const c = wdCurves().two;
  for (let i = 1; i < c.length; i++) {
    if (c[i].mass >= massSolar) {
      const f = (massSolar - c[i - 1].mass) / (c[i].mass - c[i - 1].mass);
      return c[i - 1].radiusKm + f * (c[i].radiusKm - c[i - 1].radiusKm);
    }
  }
  return c[c.length - 1].radiusKm;
}

export const EARTH_KM = R_EARTH / 1000;
export const MOON_KM = R_MOON / 1000;

let earthSized: number | undefined;
/** The mass (M☉) of the white dwarf as big as Earth, from the solver (μ_e = 2). */
export const earthSizedMass = () => (earthSized ??= massForRadius(R_EARTH, 2));

export const WD_PREDICTIONS = [
  { id: 'bigger', label: 'Bigger: more matter takes more room', correct: false },
  { id: 'smaller', label: 'Smaller', correct: true },
  { id: 'same', label: 'The same size', correct: false },
] as const;

/** A white dwarf of central density 10^logRho g/cm³ and μ_e, with the steps the solver took. */
export const whiteDwarfAt = (logRho: number, mue: number) => buildWhiteDwarf(10 ** logRho * 1000, mue);

/** "6,371 km", "24,000 km". */
export function formatKm(km: number): string {
  return `${Number(km.toPrecision(km >= 1000 ? 3 : 2)).toLocaleString('en-GB')} km`;
}

// ---------- Figure 24.3: cooling and crystallising ----------

export const COOLING_MASSES = [0.6, 0.9, 1.1] as const;
/** Ages the figure spans, years. */
export const COOLING_AGES = [1e7, 1.4e10] as const;
export const COOLING_START = { mass: 0.6, age: 2e9, crystallise: true };

let tracks: Map<string, CoolingTrack> | undefined;
/** The cooling track of a mass, with or without crystallisation, worked out once. */
export function track(mass: number, crystallise: boolean): CoolingTrack {
  tracks ??= new Map();
  const key = `${mass}|${crystallise}`;
  let t = tracks.get(key);
  if (!t) {
    t = coolingTrack(mass, crystallise);
    tracks.set(key, t);
  }
  return t;
}

/** Where freezing begins on the HR diagram for masses from 0.5 to 1.25 M☉: the surface temperature (K) and luminosity (L☉) when the centre starts to freeze. */
export function freezingLine(): { mass: number; T: number; L: number }[] {
  return [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25].map((m) => {
    const t = track(m, false);
    const L = (MESTEL_C * m * M_SUN * t.freezingStarts.Tc ** 3.5) / L_SUN;
    return { mass: m, T: T_SUN * (L / t.radiusSolar ** 2) ** 0.25, L };
  });
}

/** How far behind (years) freezing has put a white dwarf's cooling at `age`: how much earlier one that didn't freeze was as bright. */
export function delayAt(mass: number, age: number): number {
  const L = interpolate(track(mass, true), age, 'L');
  return Math.max(0, age - ageAtLuminosity(track(mass, false), L));
}

/** "5 billion years", "300 million years". */
export function formatYears(years: number): string {
  if (years >= 1e9) return `${Number((years / 1e9).toPrecision(2))} billion years`;
  if (years >= 1e6) return `${Number((years / 1e6).toPrecision(2))} million years`;
  return `${Number(years.toPrecision(2)).toLocaleString('en-GB')} years`;
}

/** A small luminosity as a fraction of the Sun's: "1/7,000 of the Sun’s". */
export function formatFaint(L: number): string {
  if (L >= 0.01) return `${Number(L.toPrecision(2))} times the Sun’s`;
  return `1/${Number((1 / L).toPrecision(2)).toLocaleString('en-GB')} of the Sun’s`;
}
