import { M_SUN, R_SUN } from '../core/constants';
import { formatScientific } from '../core/math/scientific';
import { polytrope, solveLaneEmden } from '../core/structure/laneEmden';
import { diffusionTime } from '../core/structure/randomWalk';
import { temperatureFor, SOLAR_MIX } from '../core/structure/eos';
import { SECONDS_PER_JULIAN_YEAR } from '../core/units';
import type { StarModel } from '../core/structure/zams';
import solarModel from '../data/solarModel.json';

/**
 * Helpers for Chapter 21 (getting the energy out): Model S's opacity, mean
 * free path, escape time and temperature gradients, the star builder's
 * presets, and formatting.
 */

export interface SunShell {
  /** r/R. */
  x: number;
  r: number;
  T: number;
  rho: number;
  P: number;
  X: number;
  Z: number;
  kappa: number;
  /** Mean free path, m. */
  path: number;
  nabla: number;
  nablaAd: number;
  nablaRad: number;
  gamma1: number;
  /** Luminosity and mass inside, as fractions of the Sun's. */
  L: number;
  m: number;
}

export const SUN_SHELLS: readonly SunShell[] = solarModel.shells.map((s) => ({
  x: s.r,
  r: s.r * solarModel.radius,
  T: s.T,
  rho: s.rho,
  P: s.P,
  X: s.X,
  Z: s.Z,
  kappa: s.kappa,
  path: 1 / (s.kappa * s.rho),
  nabla: s.nabla,
  nablaAd: s.nablaAd,
  nablaRad: s.nablaRad,
  gamma1: s.gamma1,
  L: s.L,
  m: s.m,
}));

/** Where Model S's convection zone begins, r/R: 0.712, where helioseismology puts it (0.713 ± 0.001). */
export const CONVECTION_BASE = solarModel.convectionBase;

const YEAR = SECONDS_PER_JULIAN_YEAR;

/** Light's random walk from the centre to r/R in Model S, years, with the running total at each shell. */
export const SUN_ESCAPE = (() => {
  const d = diffusionTime(SUN_SHELLS, CONVECTION_BASE * solarModel.radius);
  return { years: d.total / YEAR, running: d.running.map((t) => t / YEAR) };
})();

/** The published range for the Sun: 10,000 to 170,000 years (Mitalas & Sills 1992 and others). */
export const ESCAPE_RANGE = [1e4, 1.7e5] as const;

/** A length in the units that read best: "0.052 mm", "2.5 mm", "1.5 cm", "150 km". */
export function formatLength(m: number): string {
  if (m < 1e-2) return `${Number((m * 1000).toPrecision(2))} mm`;
  if (m < 1) return `${Number((m * 100).toPrecision(2))} cm`;
  if (m < 1000) return `${Number(m.toPrecision(2))} m`;
  return `${Number((m / 1000).toPrecision(2)).toLocaleString('en-GB')} km`;
}

/** "31,000 years", "8.3 minutes". */
export function formatYears(y: number): string {
  if (y < 1 / 365.25) return `${Number((y * 365.25 * 24 * 60).toPrecision(2))} minutes`;
  if (y < 1) return `${Number((y * 365.25).toPrecision(2))} days`;
  return `${Number(y.toPrecision(2)).toLocaleString('en-GB')} years`;
}

/** An opacity in cm²/g, from m²/kg: "0.35 cm²/g", "1.2 × 10⁵ cm²/g". */
export function formatOpacity(kappa: number): string {
  const c = kappa * 10;
  if (c >= 1e4 || c < 1e-3) return `${formatScientific(c, 2)} cm²/g`;
  return `${Number(c.toPrecision(2)).toLocaleString('en-GB')} cm²/g`;
}

/** "0.59 L☉", "21 L☉", "47,000 L☉". */
export function formatLuminosity(l: number): string {
  if (l >= 100) return `${Number(l.toPrecision(2)).toLocaleString('en-GB')} L☉`;
  return `${Number(l.toPrecision(2))} L☉`;
}

// ---------- Figure 21.4: build a star ----------

export interface StarPreset {
  id: string;
  name: string;
  mass: number;
  X: number;
  Z: number;
  today?: boolean;
}

export const BUILD_PRESETS: readonly StarPreset[] = [
  { id: 'young-sun', name: 'The young Sun', mass: 1, X: 0.7, Z: 0.02 },
  {
    id: 'sun-today',
    name: 'Today’s Sun',
    mass: 1,
    X: 0.7,
    Z: 0.02,
    today: true,
  },
  { id: 'red-dwarf', name: 'A red dwarf', mass: 0.3, X: 0.7, Z: 0.02 },
  { id: 'sirius-a', name: 'Sirius A', mass: 2.06, X: 0.7, Z: 0.02 },
  { id: 'blue', name: 'Ten Suns', mass: 10, X: 0.7, Z: 0.02 },
];

/** The masses of "Build a main sequence", M☉. */
export const MAIN_SEQUENCE_MASSES: readonly number[] = [
  0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20,
];

/** The builder's mass range, M☉. */
export const BUILD_RANGE = [0.3, 20] as const;

/** Burning-rate multipliers for the thermostat. */
export const BURNING = [0.1, 1, 10] as const;

// ---------- Figure 20.1: the centres of Proxima and Sirius A ----------

/**
 * Proxima Centauri's centre, as Figure 20.1 gives it: it convects throughout,
 * so it is an n = 1.5 polytrope (§20.5) with its measured mass and radius; the
 * temperature is what the gas laws, with its packed electrons, need for that
 * pressure. (Chapter 21's builder makes red dwarfs a third too big, because
 * their surfaces are full of molecules it doesn't have.)
 */
export function convectiveCentre(massSolar: number, radiusSolar: number): { P: number; T: number; rho: number } {
  const p = polytrope(solveLaneEmden(1.5), massSolar * M_SUN, radiusSolar * R_SUN);
  return { P: p.pC, rho: p.rhoC, T: temperatureFor(p.rhoC, p.pC, SOLAR_MIX) };
}

/** Where the gas convects, in words. */
export function zonesInWords(model: StarModel): string {
  if (!model.zones.length) return 'radiation carries the energy all the way out';
  const parts = model.zones.map((z) => {
    if (z.r[0] < 0.01 && z.r[1] > 0.99) return 'it convects throughout';
    if (z.r[0] < 0.01) return `a convective core holding ${Math.round(z.q[1] * 100)}% of its mass, out to ${z.r[1].toFixed(2)} of its radius`;
    if (z.r[1] > 0.99)
      return `a convective envelope below ${z.r[0].toFixed(2)} of its radius, holding ${Math.max(0.1, (1 - z.q[0]) * 100).toPrecision(2)}% of its mass`;
    return `a convective layer from ${z.r[0].toFixed(2)} to ${z.r[1].toFixed(2)} of its radius`;
  });
  return parts.join(' and ');
}
