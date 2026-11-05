import { AMU, K_B, L_SUN, M_SUN, R_SUN, T_SUN } from '../constants';
import { SECONDS_PER_JULIAN_YEAR } from '../units';
import { whiteDwarfOfMass, type WhiteDwarfModel } from './whiteDwarf';

/**
 * White dwarfs cooling and crystallising (Chapter 24). A white dwarf has no
 * fuel: its heat is in its ions, (3/2)kT each, and its packed electrons carry
 * that heat to the surface almost without loss, so the core is at one
 * temperature T_c. A thin skin of ordinary gas lets it out slowly, which gives
 * Mestel's (1952) law: L = C M T_c^{7/2}. So the core cools as
 *
 *   C_V dT_c/dt = −C M T_c^{7/2},
 *
 * and, while the heat capacity is the ions' alone, a white dwarf of age t
 * shines with L ∝ M t^{−7/5}. The constant C is set so that this is the
 * Mestel law Hurley, Pols & Tout's SSE uses (wdflag 0; L = 635 M Z^{0.4}
 * (A t)^{−1.4} L☉ for t in Myr, Z = 0.02): the course's Part II cooling.
 *
 * As it cools, its ions freeze into a crystal where the Coulomb coupling
 * Γ = ⟨Z^{5/3}⟩ e²/(a_e k T) passes 175 (a_e the radius of a sphere holding one
 * electron), from the centre outwards, since denser gas freezes warmer
 * (T_m ∝ ρ^{1/3}). Each ion that freezes gives out a latent heat of about
 * 0.77 kT; that heat, added to the heat capacity as the freezing front moves
 * through the star's mass (from the cold white dwarf's own profile), slows the
 * cooling, and so does the crystal itself, which holds 3k per ion (Dulong and
 * Petit) instead of the liquid's 3k/2. The separation of oxygen from carbon as
 * they freeze, which adds as much again, and the faster "Debye" cooling of a
 * cold crystal are left out.
 *
 * SI: K, W, kg, s (years where marked).
 */

/** The Coulomb coupling at which a one-component plasma freezes. */
export const MELTING_GAMMA = 175;
/** Latent heat per ion, in units of kT at freezing. */
export const LATENT_HEAT = 0.77;

/** A white dwarf's core: mean mass per ion (atomic mass units), ⟨Z^{5/3}⟩ over its ions, and μ_e. */
export interface CoreMix {
  A: number;
  Z53: number;
  mue: number;
}

/** Half carbon and half oxygen by mass. */
export const CARBON_OXYGEN: CoreMix = (() => {
  const nC = 0.5 / 12;
  const nO = 0.5 / 16;
  const n = nC + nO;
  return { A: 1 / n, Z53: (nC * 6 ** (5 / 3) + nO * 8 ** (5 / 3)) / n, mue: 2 };
})();

/** e²/4πε₀, J m. */
const E2 = 2.307_077_552e-28;

/** The temperature (K) at which gas of density ρ (kg/m³) freezes: Γ = 175. */
export function meltingTemperature(rho: number, mix: CoreMix = CARBON_OXYGEN): number {
  const ne = rho / (mix.mue * AMU);
  const ae = Math.cbrt(3 / (4 * Math.PI * ne));
  return (mix.Z53 * E2) / (ae * K_B * MELTING_GAMMA);
}

/** Mestel's constant C in L = C M T_c^{7/2} (W kg⁻¹ K^{−7/2}), matched to SSE's Mestel law for Z = 0.02. */
export const MESTEL_C = (() => {
  const myr = 1e6 * SECONDS_PER_JULIAN_YEAR;
  const k = 635 * 0.02 ** 0.4 * (L_SUN / M_SUN) * ((5 * AMU * myr) / (3 * K_B)) ** 1.4;
  return k ** -2.5;
})();

/** The luminosity (W) of a white dwarf of mass M (kg) whose core is at T_c (K). */
export function mestelLuminosity(mass: number, Tc: number): number {
  return MESTEL_C * mass * Tc ** 3.5;
}

/** The share of a white dwarf's mass that has frozen when its core is at T_c: every shell whose melting point is above T_c. */
export function frozenShare(wd: WhiteDwarfModel, Tc: number, mix: CoreMix = CARBON_OXYGEN): number {
  const p = wd.profile;
  if (meltingTemperature(p[0].rho, mix) <= Tc) return 0;
  for (let i = 1; i < p.length; i++) {
    const tm = meltingTemperature(p[i].rho, mix);
    if (tm <= Tc) {
      const tPrev = meltingTemperature(p[i - 1].rho, mix);
      const f = (tPrev - Tc) / (tPrev - tm);
      return (p[i - 1].m + f * (p[i].m - p[i - 1].m)) / wd.mass;
    }
  }
  return 1;
}

export interface CoolingPoint {
  /** Cooling age, years. */
  age: number;
  /** Core temperature (K), luminosity (L☉), surface temperature (K), share frozen. */
  Tc: number;
  L: number;
  Teff: number;
  frozen: number;
}

export interface CoolingTrack {
  massSolar: number;
  radiusSolar: number;
  crystallise: boolean;
  /** Where freezing begins: the core's temperature (K) and the age (years). */
  freezingStarts: { Tc: number; age: number };
  points: CoolingPoint[];
}

/**
 * A white dwarf's cooling from a core of 10⁸ K: age as the integral of
 * C_V(T)/L(T) dT downwards in ln T (`steps` of them, to 10⁵ K), with the latent
 * heat of the freezing front added to C_V when `crystallise` is on.
 */
export function coolingTrack(massSolar: number, crystallise: boolean, mix: CoreMix = CARBON_OXYGEN, steps = 400): CoolingTrack {
  const wd = whiteDwarfOfMass(massSolar, mix.mue);
  const M = wd.mass;
  const ions = M / (mix.A * AMU);
  const R = wd.radius / R_SUN;
  const lnHi = Math.log(1e8);
  const lnLo = Math.log(1e5);
  const h = (lnHi - lnLo) / steps;
  // dt/d ln T = −T C_eff(T)/L(T), C_eff = (3/2)k(N + N_frozen) + 0.77 kT × (dN_frozen/dT).
  const rate = (lnT: number) => {
    const T = Math.exp(lnT);
    let cv = 1.5 * K_B * ions;
    if (crystallise) {
      // A crystal holds twice the heat per ion (Dulong and Petit's 3k), and each ion gives out its latent heat as it freezes.
      const dT = T * 1e-3;
      const dq = (frozenShare(wd, T - dT, mix) - frozenShare(wd, T + dT, mix)) / (2 * dT);
      cv += 1.5 * K_B * ions * frozenShare(wd, T, mix) + LATENT_HEAT * K_B * T * ions * Math.max(0, dq);
    }
    return (T * cv) / mestelLuminosity(M, T);
  };
  const tFreeze = meltingTemperature(wd.rhoC, mix);
  const points: CoolingPoint[] = [];
  let age = 0;
  let prev = rate(lnHi);
  let freezingStarts = { Tc: tFreeze, age: NaN };
  const push = (lnT: number) => {
    const T = Math.exp(lnT);
    const L = mestelLuminosity(M, T) / L_SUN;
    points.push({ age: age / SECONDS_PER_JULIAN_YEAR, Tc: T, L, Teff: T_SUN * (L / (R * R)) ** 0.25, frozen: frozenShare(wd, T, mix) });
  };
  push(lnHi);
  for (let i = 1; i <= steps; i++) {
    const lnT = lnHi - i * h;
    // Simpson on each step: the latent heat's bump is smooth across a few steps.
    const mid = rate(lnT + h / 2);
    const here = rate(lnT);
    age += (h / 6) * (prev + 4 * mid + here);
    prev = here;
    if (Number.isNaN(freezingStarts.age) && Math.exp(lnT) <= tFreeze) {
      freezingStarts = { Tc: tFreeze, age: age / SECONDS_PER_JULIAN_YEAR };
    }
    push(lnT);
  }
  return { massSolar, radiusSolar: R, crystallise, freezingStarts, points };
}

/** The luminosity (L☉) on a track at an age (years), by interpolation in log age and log L. */
export function luminosityAtAge(track: CoolingTrack, age: number): number {
  return interpolate(track, age, 'L');
}

/** Any of a track's quantities at an age (years), by interpolation in log age (and log value for L and T). */
export function interpolate(track: CoolingTrack, age: number, key: 'L' | 'Tc' | 'Teff' | 'frozen'): number {
  const p = track.points;
  if (age <= p[1].age) return p[1][key];
  for (let i = 2; i < p.length; i++) {
    if (p[i].age >= age) {
      const f = (Math.log(age) - Math.log(p[i - 1].age)) / (Math.log(p[i].age) - Math.log(p[i - 1].age));
      if (key === 'frozen') return p[i - 1].frozen + f * (p[i].frozen - p[i - 1].frozen);
      return Math.exp(Math.log(p[i - 1][key]) + f * (Math.log(p[i][key]) - Math.log(p[i - 1][key])));
    }
  }
  return p[p.length - 1][key];
}

/** The age (years) at which a track reaches a luminosity (L☉). */
export function ageAtLuminosity(track: CoolingTrack, L: number): number {
  const p = track.points;
  for (let i = 1; i < p.length; i++) {
    if (p[i].L <= L) {
      const f = (Math.log(L) - Math.log(p[i - 1].L)) / (Math.log(p[i].L) - Math.log(p[i - 1].L));
      return Math.exp(Math.log(Math.max(p[i - 1].age, 1)) + f * (Math.log(p[i].age) - Math.log(Math.max(p[i - 1].age, 1))));
    }
  }
  return p[p.length - 1].age;
}
