import { LATE_FUELS } from '../../data/rates';
import { tripleAlphaPower } from './helium';
import { hydrogenBurning } from './ppcno';
import { c12c12, ne20ag, o16o16 } from './rates';

/**
 * Where each fuel lights (Chapter 22): lines on the core's map.
 *
 * A fuel ignites where its burning can pay for what the core loses. Through
 * hydrogen and helium burning a core loses its heat as light, slowly: the
 * lines are where burning makes a milliwatt per kilogram, about what the Sun's
 * centre makes (1.7 mW/kg). From carbon on, neutrinos made by pairs of
 * electrons and positrons in the hot gas carry the heat off directly, far
 * faster, and each fuel burns where its burning balances them (Woosley, Heger
 * & Weaver 2002, Fig. 8): "balanced power".
 *
 * - Hydrogen: the pp chains and the CN cycle, X = 0.7, Z = 0.02 (ppcno.ts).
 * - Helium: triple-alpha in pure helium (helium.ts).
 * - Carbon, neon, oxygen, silicon: Woosley, Heger & Weaver's approximations
 *   (§IV, eqs. 18, 21, 22 and 27) with Caughlan & Fowler's rates, unscreened,
 *   for mass fractions of carbon 0.2, neon 0.2 with oxygen 0.7, oxygen 0.7 and
 *   silicon 0.5.
 * - Pair neutrinos: Clayton's approximations for gas that is neither
 *   degenerate nor relativistic, 4.9 × 10¹⁸ T₉³ e^(−11.86/T₉) erg cm⁻³ s⁻¹, and
 *   relativistic, 3.3 × 10¹⁵ T₉⁹ (as Woosley's lecture notes give them), joined
 *   as the first plus the second times e^(−11.86/T₉). Within a factor of a
 *   few of Itoh et al.'s fits; degeneracy, which suppresses pairs in dense
 *   cores, is left out.
 *
 * SI at the edges: ρ in kg/m³, T in K, rates in W/kg.
 */

export type Fuel = 'H' | 'He' | 'C' | 'Ne' | 'O' | 'Si';

export const FUELS: readonly { id: Fuel; name: string; ash: string }[] = [
  { id: 'H', name: 'Hydrogen', ash: 'helium' },
  { id: 'He', name: 'Helium', ash: 'carbon and oxygen' },
  { id: 'C', name: 'Carbon', ash: 'neon and magnesium' },
  { id: 'Ne', name: 'Neon', ash: 'oxygen and magnesium' },
  { id: 'O', name: 'Oxygen', ash: 'silicon and sulphur' },
  { id: 'Si', name: 'Silicon', ash: 'iron-peak nuclei (nickel-56)' },
];

/** What a core loses as light while it burns hydrogen and helium, W/kg: a milliwatt per kilogram. */
export const LIGHT_LOSSES = 1e-3;

const ERG_PER_G_S = 1e-4; // → W/kg

/** Heat carried off by pair neutrinos, W/kg (see above). */
export function neutrinoLosses(rho: number, T: number): number {
  const t9 = T / 1e9;
  const boltzmann = Math.exp(-11.86 / t9);
  const perCm3 = 4.9e18 * t9 ** 3 * boltzmann + 3.3e15 * t9 ** 9 * boltzmann;
  return (perCm3 / (rho / 1000)) * ERG_PER_G_S;
}

/** What a core loses: light or neutrinos, whichever is larger, W/kg. */
export function coreLosses(rho: number, T: number): number {
  return Math.max(LIGHT_LOSSES, neutrinoLosses(rho, T));
}

/** The heat a fuel's burning releases at density ρ and temperature T, W/kg. */
export function fuelPower(fuel: Fuel, rho: number, T: number): number {
  const g = rho / 1000;
  const t9 = T / 1e9;
  switch (fuel) {
    case 'H': {
      const h = hydrogenBurning({ T, rho, X: 0.7, Z: 0.02 });
      return h.ppPower + h.cnoPower;
    }
    case 'He':
      return tripleAlphaPower(rho, T, 1);
    case 'C': {
      const Y = LATE_FUELS.C.x / 12;
      return 4.8e18 * Y * Y * g * c12c12(T) * ERG_PER_G_S;
    }
    case 'Ne': {
      const Yne = LATE_FUELS.Ne.x / 20;
      const Yo = LATE_FUELS.O.x / 16;
      return 2.5e29 * t9 ** 1.5 * ((Yne * Yne) / Yo) * Math.exp(-54.89 / t9) * ne20ag(T) * ERG_PER_G_S;
    }
    case 'O': {
      const Y = LATE_FUELS.O.x / 16;
      return 8e18 * Y * Y * g * o16o16(T) * ERG_PER_G_S;
    }
    case 'Si':
      return 1.8e28 * t9 ** 1.5 * LATE_FUELS.Si.x * Math.exp(-142.07 / t9) * ne20ag(T) * ERG_PER_G_S;
  }
}

const SEARCH: Record<Fuel, [number, number]> = {
  H: [2e6, 2e8],
  He: [2e7, 2e9],
  C: [1e8, 5e9],
  Ne: [3e8, 8e9],
  O: [3e8, 8e9],
  Si: [8e8, 2e10],
};

/** The temperature (K) at which a fuel lights at density ρ (kg/m³): where its burning first pays for the core's losses. */
export function ignitionTemperature(fuel: Fuel, rho: number): number {
  let [lo, hi] = SEARCH[fuel];
  const f = (T: number) => Math.log(fuelPower(fuel, rho, T) / coreLosses(rho, T));
  for (let i = 0; i < 70; i++) {
    const mid = Math.sqrt(lo * hi);
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return Math.sqrt(lo * hi);
}

/** A fuel's ignition line across densities from 10^logRho[0] to 10^logRho[1] g/cm³: points of T (K) and ρ (kg/m³). */
export function ignitionLine(fuel: Fuel, logRho: readonly [number, number], n = 40): { T: number; rho: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const rho = 10 ** (logRho[0] + ((logRho[1] - logRho[0]) * i) / (n - 1)) * 1000;
    return { T: ignitionTemperature(fuel, rho), rho };
  });
}

/** Woosley, Heger & Weaver's adiabat for a massive star's centre, ρ = 10⁶ T₉³ g/cm³, in kg/m³. */
export function massiveStarAdiabat(T: number): number {
  return 1e6 * (T / 1e9) ** 3 * 1000;
}

/** The balanced-power temperature (K) along that adiabat, where burning first matches the losses. */
export function balancedTemperature(fuel: Fuel): number {
  let [lo, hi] = SEARCH[fuel];
  const f = (T: number) => {
    const rho = massiveStarAdiabat(T);
    return Math.log(fuelPower(fuel, rho, T) / coreLosses(rho, T));
  };
  for (let i = 0; i < 70; i++) {
    const mid = Math.sqrt(lo * hi);
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return Math.sqrt(lo * hi);
}
