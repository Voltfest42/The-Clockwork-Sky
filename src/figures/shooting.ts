import { G, M_SUN, R_EARTH, R_SUN } from '../core/constants';
import { polytrope, solveLaneEmden, type LaneEmden } from '../core/structure/laneEmden';
import { famousStar } from '../data/stars';
import { CIRCULAR_SPEED, fire } from './cannon';

/**
 * The shooting method (Toolkit T10, Figure T10.1): solve a problem with a
 * condition at each end by guessing the start, stepping to the far end, and
 * correcting the guess from the miss. Each correction is a secant step: the
 * line through the last two tries, extended to where it misses by nothing.
 */

export interface ShotTry {
  /** The guess: a speed (m/s) or a central density (kg/m³). */
  guess: number;
  /** How far off the far end came out: km along the ground, or solar masses. */
  miss: number;
  /** The miss the corrections aim by: ln(got/wanted), which grows more evenly with the guess than the miss itself. */
  aim: number;
}

/** The next guess from the last two tries: where the straight line through them crosses an aim of zero. */
export function secant(a: ShotTry, b: ShotTry): number {
  if (b.aim === a.aim) return b.guess;
  return b.guess - (b.aim * (b.guess - a.guess)) / (b.aim - a.aim);
}

/** A try at the cannon: fire at `speed` (m/s) at a target `target` km away. */
export function cannonTry(speed: number, target: number): ShotTry {
  const guess = Math.min(CANNON_SPEEDS[1], Math.max(CANNON_SPEEDS[0], speed));
  const got = landing(guess);
  return { guess, miss: got - target, aim: Math.log(got / target) };
}

/** A try at the red dwarf: step out from a central density (kg/m³) towards a star of `target` M☉. */
export function dwarfTry(rhoC: number, target: number): ShotTry {
  const got = dwarfFrom(rhoC).mass;
  return { guess: rhoC, miss: got - target, aim: Math.log(got / target) };
}

// ---------- Newton's cannon ----------

/** The cannon's speeds, m/s: from a drop to just short of orbit (7.85 km/s from the mountain). Its targets, km along the ground: beyond 2,500 km the range climbs so steeply towards orbit that a correction can overshoot. */
export const CANNON_TARGETS = [300, 2500] as const;
export const CANNON_SPEEDS = [500, Math.floor(CIRCULAR_SPEED - 20)] as const;

/** Where a ball fired at `speed` lands, km along the ground from the mountain's foot. */
export function landing(speed: number): number {
  const shot = fire(Math.min(CANNON_SPEEDS[1], Math.max(CANNON_SPEEDS[0], speed)));
  return (shot.range ?? 2 * Math.PI * R_EARTH) / 1000;
}

// ---------- A red dwarf's centre ----------

let solution: LaneEmden | undefined;
const n15 = () => (solution ??= solveLaneEmden(1.5));

/**
 * The red dwarf of the shooting example: gas that convects throughout, so its
 * pressure follows P = Kρ^{5/3} (n = 1.5), with K set so that a star of
 * Proxima Centauri's mass has its radius.
 */
export const DWARF = (() => {
  const s = famousStar('proxima');
  const p = polytrope(n15(), s.mass.value * M_SUN, s.radius.value * R_SUN);
  return { mass: s.mass.value, radius: s.radius.value, K: p.K, rhoC: p.rhoC };
})();

/**
 * Step out from a centre of density ρ_c (kg/m³) until the density reaches
 * zero, and say what star that makes: its mass (M☉) and radius (R☉). The
 * stepping is the Lane–Emden solution's, scaled: a = √((n + 1)Kρ_c^{1/n − 1}/4πG).
 */
export function dwarfFrom(rhoC: number): { mass: number; radius: number } {
  const sol = n15();
  const a = Math.sqrt((2.5 * DWARF.K * rhoC ** (1 / 1.5 - 1)) / (4 * Math.PI * G));
  const mass = 4 * Math.PI * a ** 3 * rhoC * sol.xi1 ** 2 * Math.abs(sol.dthetaSurface);
  return { mass: mass / M_SUN, radius: (a * sol.xi1) / R_SUN };
}

/** The density profile (r in R☉, ρ in g/cm³) of the star from a central density. */
export function dwarfProfile(rhoC: number): { x: number; y: number }[] {
  const sol = n15();
  const { radius } = dwarfFrom(rhoC);
  return Array.from(sol.xi, (xi, i) => ({
    x: (xi / sol.xi1) * radius,
    y: (rhoC * Math.max(0, sol.theta[i]) ** 1.5) / 1000,
  })).filter((p) => p.x <= radius);
}

/** Starting guesses for the two problems: two speeds (m/s), two central densities (kg/m³). */
export const FIRST_TRIES = {
  cannon: [4000, 6000],
  star: [10_000, 40_000],
} as const;
