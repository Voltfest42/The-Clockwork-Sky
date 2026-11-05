import { EV } from '../constants';
import { c12ag, o16ag, tripleAlpha, type TripleAlphaOptions } from './rates';
import { implicitStep, type Network } from './network';

/**
 * Helium burning (Chapter 22, Figure 22.3): three helium nuclei into carbon
 * through Hoyle's resonance, and carbon into oxygen and neon by capturing more
 * helium. A one-zone toy at fixed temperature and density, run until the
 * helium is gone, to show what the Hoyle state's place decides: how hot a core
 * must be to burn its helium in a given time, and how much carbon survives.
 *
 * ρ in kg/m³, T in K, powers in W/kg, times in years.
 */

const N_A = 6.022_140_76e23;
const YEAR = 3.155_76e7;
/** Three helium nuclei into carbon releases 7.275 MeV. */
export const TRIPLE_ALPHA_Q = 7.275;

/** The heat from the triple-alpha reaction in gas with helium mass fraction Y, W/kg. */
export function tripleAlphaPower(rho: number, T: number, Y = 1, o: TripleAlphaOptions = {}): number {
  const g = rho / 1000;
  const Ya = Y / 4;
  const perGram = (g * g * Ya ** 3 * tripleAlpha(T, o)) / 6;
  return perGram * N_A * TRIPLE_ALPHA_Q * 1e6 * EV * 1000;
}

/** How long pure helium takes to burn half of itself by triple-alpha alone, s: 48/(ρ²N_A²⟨ααα⟩), ρ in g/cm³. */
export function heliumHalfLife(rho: number, T: number, o: TripleAlphaOptions = {}): number {
  const g = rho / 1000;
  return 48 / (g * g * tripleAlpha(T, o));
}

/** The temperature (K) at which pure helium of density ρ burns half of itself in `years`. */
export function heliumTemperature(rho: number, years: number, o: TripleAlphaOptions = {}): number {
  let lo = 3e7;
  let hi = 3e9;
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    if (heliumHalfLife(rho, mid, o) / YEAR > years) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/** MeV released by ¹²C(α,γ)¹⁶O and ¹⁶O(α,γ)²⁰Ne. */
const ALPHA_CAPTURE_Q = { carbon: 7.162, oxygen: 4.73 } as const;

function heliumNetwork(rho: number, T: number, o: TripleAlphaOptions): Network {
  const g = rho / 1000;
  return {
    species: ['⁴He', '¹²C', '¹⁶O', '²⁰Ne'],
    mass: [4, 12, 16, 20],
    reactions: [
      { from: [0, 0, 0], to: [1], k: g * g * tripleAlpha(T, o) },
      { from: [1, 0], to: [2], k: g * c12ag(T) },
      { from: [2, 0], to: [3], k: g * o16ag(T) },
    ],
  };
}

/** The heat from all three reactions at molar abundances Y = [He, C, O, Ne], W/kg. */
function heliumPower(rho: number, T: number, Y: ArrayLike<number>, o: TripleAlphaOptions): number {
  const g = rho / 1000;
  const mev =
    ((g * g * Y[0] ** 3 * tripleAlpha(T, o)) / 6) * TRIPLE_ALPHA_Q +
    g * Y[1] * Y[0] * c12ag(T) * ALPHA_CAPTURE_Q.carbon +
    g * Y[2] * Y[0] * o16ag(T) * ALPHA_CAPTURE_Q.oxygen;
  return mev * N_A * 1e6 * EV * 1000;
}

export interface HeliumAshes {
  /** Final mass fractions. */
  He: number;
  C: number;
  O: number;
  Ne: number;
  /** The core's temperature at the start and the end, K. */
  startT: number;
  endT: number;
  /** Years taken to burn the helium down to 1%. */
  years: number;
  /** Mass fractions [He, C, O, Ne] and temperature (K) against time (years). */
  history: { years: number; X: [number, number, number, number]; T: number }[];
}

/**
 * Burns pure helium of density ρ until 1% is left, as a star's core does: at
 * the steady power the star needs (the thermostat of Chapter 21), so the core
 * heats up as its helium runs low. It starts at the temperature at which
 * triple-alpha alone would burn half of it in `years`.
 */
export function burnHelium(rho: number, years: number, o: TripleAlphaOptions = {}): HeliumAshes {
  const startT = heliumTemperature(rho, years, o);
  const power = tripleAlphaPower(rho, startT, 1, o);
  /** Helium into carbon and oxygen releases about 5.9 × 10¹⁴ J/kg (Woosley, Heger & Weaver 2002). */
  const burnTime = 5.9e14 / power;
  let Y: Float64Array = Float64Array.from([0.25, 0, 0, 0]);
  let t = 0;
  let T = startT;
  const history: HeliumAshes['history'] = [{ years: 0, X: [1, 0, 0, 0], T }];
  for (let n = 0; n < 4000 && 4 * Y[0] > 0.01 && T < 2e9; n++) {
    // The temperature at which the core makes its power with what helium is left: Newton's method on ln T.
    for (let i = 0; i < 12; i++) {
      const p = heliumPower(rho, T, Y, o);
      const nu = Math.log(heliumPower(rho, T * 1.001, Y, o) / p) / Math.log(1.001);
      const step = Math.max(-0.3, Math.min(0.3, Math.log(power / p) / nu));
      T *= Math.exp(step);
      if (Math.abs(step) < 1e-7) break;
    }
    let dt = Math.max(0.006 * burnTime * 4 * Y[0], 1e-4 * burnTime);
    let next: Float64Array | undefined;
    while (!(next = implicitStep(heliumNetwork(rho, T, o), Y, dt))) dt /= 4;
    Y = next;
    t += dt;
    history.push({ years: t / YEAR, X: [4 * Y[0], 12 * Y[1], 16 * Y[2], 20 * Y[3]], T });
  }
  const last = history[history.length - 1];
  return { He: last.X[0], C: last.X[1], O: last.X[2], Ne: last.X[3], startT, endT: T, years: last.years, history };
}
