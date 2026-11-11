/**
 * The BSE runs Chapter 28's figures ask the stellar worker for: one pair's whole
 * life, thinned for drawing, and rows of the binary zoo's map. Plain data, so
 * the answers survive structured cloning. Units are BSE's (M☉, R☉, L☉, Myr,
 * days).
 */
import { evolveBinary, type BseOptions } from './evolve';
import { classify, eventOf, stepOf, UNIVERSE_AGE, type BinaryEvent, type BinaryStep, type Classified } from './outcome';

/** The switches the figures change; the rest are binary.in's. */
export interface FigureSwitches {
  /** α, the common-envelope efficiency. */
  alpha: number;
  /** The kicks' dispersion, km/s. */
  sigma: number;
}

/**
 * The figures' defaults: binary.in's switches, except α = 1, which bse.f's comments and most modern codes use (BSE's
 * paper and binary.in use 3; Part III plan §13, question 4).
 */
export const FIGURE_SWITCHES: FigureSwitches = { alpha: 1, sigma: 190 };

export interface BinaryRun {
  steps: BinaryStep[];
  events: BinaryEvent[];
  outcome: Classified;
  warnings: string[];
}

const options = (s: FigureSwitches, seed: number): Partial<BseOptions> => ({ alpha1: s.alpha, sigma: s.sigma, seed });

/** Keeps at most `max` steps: every change of type, Roche-lobe overflow's edges, and the rest evenly. */
function thin(steps: BinaryStep[], max: number): BinaryStep[] {
  if (steps.length <= max) return steps;
  const every = Math.ceil(steps.length / max);
  return steps.filter((s, i) => {
    const prev = steps[i - 1];
    const next = steps[i + 1];
    const edge = (a?: BinaryStep) => a && (a.kw[0] !== s.kw[0] || a.kw[1] !== s.kw[1] || a.rrl[0] >= 1 !== s.rrl[0] >= 1 || a.rrl[1] >= 1 !== s.rrl[1] >= 1);
    return i === 0 || i === steps.length - 1 || i % every === 0 || edge(prev) || edge(next);
  });
}

/** One pair's life from the ZAMS for tEnd Myr (default: the universe's age). */
export function binaryRun(
  r: { m1: number; m2: number; period: number; ecc: number; z: number; tEnd?: number; seed?: number } & FigureSwitches,
): BinaryRun {
  const result = evolveBinary({ m1: r.m1, m2: r.m2, period: r.period, ecc: r.ecc, z: r.z, tEnd: r.tEnd ?? UNIVERSE_AGE }, options(r, r.seed ?? 29769));
  return { steps: thin(result.bcm.map(stepOf), 2500), events: result.bpp.map(eventOf), outcome: classify(result), warnings: result.warnings };
}

export interface ZooCell extends Classified {
  m1: number;
  period: number;
}

/** The seed for a cell of the zoo's map, so each cell's kick is its own but the same every time. */
export const zooSeed = (m1: number, period: number) => 1 + Math.round(Math.log10(m1) * 1000) * 7919 + Math.round(Math.log10(period) * 1000);

/** One row of the zoo's map: a primary of m1 with a companion of q m1, at each period (days), circular, from the ZAMS. */
export function zooRow(r: { m1: number; q: number; z: number; periods: readonly number[] } & FigureSwitches): ZooCell[] {
  return r.periods.map((period) => {
    const result = evolveBinary({ m1: r.m1, m2: r.q * r.m1, period, ecc: 0, z: r.z, tEnd: UNIVERSE_AGE }, options(r, zooSeed(r.m1, period)));
    return { ...classify(result), m1: r.m1, period };
  });
}
