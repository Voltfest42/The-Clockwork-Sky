import { G, L_SUN, M_SUN, R_SUN, SIGMA } from '../constants';
import { SECONDS_PER_JULIAN_YEAR } from '../units';
import { degeneratePressure, electronDensity, electronMolecularWeight, SOLAR_MIX, temperatureFor, type Mix } from './eos';
import { centralPressureCoefficient, gravitationalEnergy, integrateProfile, solveLaneEmden, type LaneEmden } from './laneEmden';

/**
 * A ball of gas with no fuel, shining (Figure 20.2): the star that heats as it
 * cools. It is an n = 1.5 polytrope, fully convective as young stars and brown
 * dwarfs are, shrinking through a sequence of balanced states. SI units.
 *
 * - **Bookkeeping, exact for a polytrope.** Its gravitational energy is
 *   Ω = −3GM²/((5 − n)R). By the virial theorem the gas's internal energy is
 *   U = −Ω/2, so its total energy is E = Ω/2: as it shrinks, gravity releases
 *   energy, half of which warms the gas and half of which is radiated.
 * - **Heat and packing.** At the centre the pressure needed to hold the star up
 *   is P_c = W_n GM²/R⁴. Part comes from heat and part, once the electrons are
 *   packed tightly, from degeneracy, which needs no heat (Chapter 24). The
 *   central temperature is whatever makes up the rest, by Paczyński's
 *   interpolation. The share of P_c that comes from heat sets how much of U is
 *   heat; the rest is the packed electrons' energy.
 * - **Its light.** A fully convective star's surface stays near one
 *   temperature as it shrinks (its Hayashi track): taken from a fit to BHAC15's
 *   models at a million years, scaled down by the fourth root of the heat share
 *   as the gas goes degenerate, so a failed star fades. L = 4πR²σT_eff⁴.
 * - **The end.** Hydrogen ignites when the pp chain at the centre could pay for
 *   the light (a simple fit to the pp rate, integrated over the polytrope's
 *   core). A ball that never gets that hot heads for the radius where packed
 *   electrons alone would hold it up; it is followed until its centre has
 *   cooled to half its hottest, and from there fades as a brown dwarf (Part
 *   II's brown dwarfs, Chapter 16; the fading here is too crude to follow).
 */

export const CONTRACTION_INDEX = 1.5;

let solution: LaneEmden | undefined;
/** The n = 1.5 Lane–Emden solution, worked out once. */
export function contractionPolytrope(): LaneEmden {
  solution ??= solveLaneEmden(CONTRACTION_INDEX);
  return solution;
}

/**
 * A young star's surface temperature (K) on its Hayashi track: a fit to
 * Baraffe et al.'s (2015) models at a million years, within 6% from 0.01 to
 * 1.4 solar masses (2,350 K at 0.01, 2,930 K at 0.1, 4,380 K at 1).
 */
export function hayashiTemperature(massSolar: number): number {
  const x = Math.log10(Math.min(1.4, Math.max(0.01, massSolar)));
  return 10 ** (3.6411 + 0.2122 * x + 0.0386 * x * x);
}

/**
 * The pp chain's heating, W/kg, at density ρ (kg/m³), temperature T (K) and
 * hydrogen fraction X: the simple fit ε = 2.57 × 10⁴ ρ X² T₉^{−2/3}
 * exp(−3.381 T₉^{−1/3}) erg/g/s (Kippenhahn, Weigert & Weiss, eq. 18.63,
 * screening and the chain's branches left out; within a factor of two of the
 * Sun's centre). Chapter 22 builds the real rates.
 */
export function ppHeating(rho: number, T: number, X: number): number {
  if (T <= 0) return 0;
  const t9 = T / 1e9;
  return 2.57e-3 * rho * X * X * t9 ** (-2 / 3) * Math.exp(-3.381 / Math.cbrt(t9));
}

export interface ContractionState {
  /** Radius, m. */
  radius: number;
  /** Central density (kg/m³) and temperature (K). */
  rhoC: number;
  tC: number;
  /** Gravitational energy Ω (J, negative). */
  gravity: number;
  /** The gas's heat (J) and the packed electrons' energy (J); together U = −Ω/2. */
  heat: number;
  packing: number;
  /** Energy radiated since the start, J. */
  radiated: number;
  /** Surface temperature (K) and luminosity (W). */
  teff: number;
  luminosity: number;
  /** What the pp chain at the centre would give, W. */
  fusion: number;
  /** Time since the start, s. */
  age: number;
}

export interface ContractionTrack {
  massSolar: number;
  mix: Mix;
  states: ContractionState[];
  /** Ignites hydrogen, or stalls as a brown dwarf. */
  outcome: 'ignites' | 'brown-dwarf';
  /** The hottest the centre gets, K, and the state where it does. */
  peakTemperature: number;
  peakIndex: number;
  /** The radius (m) at which packed electrons alone would hold it up. */
  coldRadius: number;
}

export interface ContractionOptions {
  mix?: Mix;
  /** The central temperature to start from, K (default 3 × 10⁵). */
  startTemperature?: number;
  /** States along the way (default 240). */
  states?: number;
  /** How long to follow it at most, s (default 10 billion years). */
  maxAge?: number;
  /** A brown dwarf is followed until its centre cools to this share of its hottest (default 0.5). */
  cooledTo?: number;
}

/** The power (W) the pp chain would make in an n = 1.5 star of central density ρ_c and temperature T_c. */
function fusionPower(sol: LaneEmden, radius: number, rhoC: number, tC: number, X: number): number {
  const a = radius / sol.xi1;
  // ρ = ρ_c θⁿ and, as for an ideal gas, T = T_c θ.
  return 4 * Math.PI * a ** 3 * integrateProfile(sol, (th) => {
    const rho = rhoC * th ** sol.n;
    return rho * ppHeating(rho, tC * th, X);
  });
}

/** Follows a ball of `massSolar` solar masses as it shrinks and shines, until hydrogen ignites or it stalls as a brown dwarf. */
export function contract(massSolar: number, options: ContractionOptions = {}): ContractionTrack {
  const mix = options.mix ?? SOLAR_MIX;
  const sol = contractionPolytrope();
  const n = sol.n;
  const mass = massSolar * M_SUN;
  const mue = electronMolecularWeight(mix);
  const W = centralPressureCoefficient(sol);
  const rhoCOf = (R: number) => sol.densityContrast * (mass / ((4 / 3) * Math.PI * R ** 3));
  const pCOf = (R: number) => (W * G * mass * mass) / R ** 4;
  const packedShare = (R: number) => Math.min(1, degeneratePressure(electronDensity(rhoCOf(R), mue)) / pCOf(R));

  // The cold radius: packed electrons alone hold the centre up. Their share grows as R shrinks; bisect in log R.
  let lo = Math.log(1e3);
  let hi = Math.log(1e12);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (packedShare(Math.exp(mid)) >= 1) lo = mid;
    else hi = mid;
  }
  const coldRadius = Math.exp(hi);

  // Start where the centre is at the start temperature, as an ideal gas: T_c = (μ m_u / k) P_c / ρ_c ∝ M/R.
  const t0 = options.startTemperature ?? 3e5;
  let r0 = R_SUN;
  for (let i = 0; i < 60; i++) {
    const t = temperatureFor(rhoCOf(r0), pCOf(r0), mix);
    r0 *= t / t0;
  }
  // The lightest balls never get that hot: start them at three times the cold radius instead.
  r0 = Math.max(r0, coldRadius * 3);

  const teffH = hayashiTemperature(massSolar);
  const total = options.states ?? 240;
  const maxAge = options.maxAge ?? 1e10 * SECONDS_PER_JULIAN_YEAR;
  const energy0 = gravitationalEnergy(n, mass, r0) / 2;
  const states: ContractionState[] = [];
  let outcome: ContractionTrack['outcome'] = 'brown-dwarf';
  let age = 0;

  const stateAt = (R: number): ContractionState => {
    const rhoC = rhoCOf(R);
    const pC = pCOf(R);
    const tC = temperatureFor(rhoC, pC, mix);
    const gravity = gravitationalEnergy(n, mass, R);
    const internal = -gravity / 2;
    const heatShare = 1 - packedShare(R);
    const teff = teffH * Math.max(0, heatShare) ** 0.25;
    return {
      radius: R,
      rhoC,
      tC,
      gravity,
      heat: internal * heatShare,
      packing: internal * (1 - heatShare),
      radiated: energy0 - gravity / 2,
      teff,
      luminosity: 4 * Math.PI * R * R * SIGMA * teff ** 4,
      fusion: fusionPower(sol, R, rhoC, tC, mix.X),
      age: 0,
    };
  };

  // Steps evenly in log R towards the cold radius, closing in on it geometrically (its approach takes ever longer).
  let prev = stateAt(r0);
  states.push(prev);
  const gap0 = Math.log(r0 / coldRadius);
  let peak = prev.tC;
  for (let i = 1; i < total * 3; i++) {
    const f = i / total;
    // log(R / R_cold) falls linearly at first, then geometrically.
    const gap = f < 0.8 ? gap0 * (1 - f) : gap0 * 0.2 * 10 ** (-(f - 0.8) * 8);
    const R = coldRadius * Math.exp(gap);
    const next = stateAt(R);
    if (next.fusion >= next.luminosity) {
      // Ignition between prev and next: interpolate in log R on the margin fusion − light.
      const g0 = Math.log(prev.fusion / prev.luminosity);
      const g1 = Math.log(next.fusion / next.luminosity);
      const s = g0 / (g0 - g1);
      const lit = stateAt(Math.exp(Math.log(prev.radius) + s * (Math.log(R) - Math.log(prev.radius))));
      age += 0.5 * (lit.radiated - prev.radiated) * (1 / prev.luminosity + 1 / lit.luminosity);
      lit.age = age;
      states.push(lit);
      outcome = 'ignites';
      break;
    }
    const dE = next.radiated - prev.radiated;
    const dt = next.luminosity > 0 ? 0.5 * dE * (1 / prev.luminosity + 1 / next.luminosity) : Infinity;
    if (!Number.isFinite(dt) || age + dt > maxAge) break;
    age += dt;
    next.age = age;
    states.push(next);
    prev = next;
    peak = Math.max(peak, next.tC);
    // A failed star: stop once its centre has cooled to half its hottest. From there it fades as a brown dwarf (Chapter 16).
    if (next.tC < (options.cooledTo ?? 0.5) * peak) break;
  }
  let peakIndex = 0;
  states.forEach((s, i) => {
    if (s.tC > states[peakIndex].tC) peakIndex = i;
  });
  return { massSolar, mix, states, outcome, peakTemperature: states[peakIndex].tC, peakIndex, coldRadius };
}

/** The lightest ball that ignites hydrogen in this model, in solar masses, by bisection (about 0.08–0.1). */
export function hydrogenBurningLimit(mix: Mix = SOLAR_MIX): number {
  let lo = 0.02;
  let hi = 0.3;
  for (let i = 0; i < 30; i++) {
    const mid = Math.sqrt(lo * hi);
    if (contract(mid, { mix, states: 160 }).outcome === 'ignites') hi = mid;
    else lo = mid;
  }
  return Math.sqrt(lo * hi);
}

/** Solar units for readouts. */
export const toSolarLuminosity = (watts: number) => watts / L_SUN;
export const toSolarRadius = (metres: number) => metres / R_SUN;
