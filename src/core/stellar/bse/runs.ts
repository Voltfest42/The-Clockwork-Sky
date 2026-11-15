/**
 * The BSE runs Chapter 28's figures ask the stellar worker for: one pair's whole
 * life, thinned for drawing, and rows of the binary zoo's map. Plain data, so
 * the answers survive structured cloning. Units are BSE's (M☉, R☉, L☉, Myr,
 * days).
 */
import { evolveBinary, type BseOptions, type BseResult } from './evolve';
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

/** The Star Forge's further switches: every wind multiplied by `wind` (1 is BSE's own), and tides on or off (BSE's tflag). */
export interface ForgeSwitches extends FigureSwitches {
  wind?: number;
  tides?: boolean;
}

/** A supernova in a run: which star (0 or 1), what it left (13 a neutron star, 14 a black hole) and how it was kicked. */
export interface Supernova {
  t: number;
  star: 0 | 1;
  kw: number;
  /** The remnant's mass, M☉. */
  mass: number;
  /** The kick's speed, km/s (BSE gives black holes none). */
  kick: number;
  /** Bound pairs and single stars: the change in the centre of mass's speed. A pair pulled apart: the stars' relative speed when far apart. km/s. */
  speed: number;
  /** The kick and the mass lost unbound the pair. */
  disrupted: boolean;
  /** False when the star had no companion left. */
  paired: boolean;
}

export interface BinaryRun {
  /** What was asked for, so a figure can tell an earlier answer from the current one. */
  input: { m1: number; m2: number; period: number; ecc: number; z: number; seed?: number } & ForgeSwitches;
  steps: BinaryStep[];
  events: BinaryEvent[];
  outcome: Classified;
  warnings: string[];
  supernovae: Supernova[];
}

const options = (s: ForgeSwitches, seed: number): Partial<BseOptions> => ({
  alpha1: s.alpha,
  sigma: s.sigma,
  seed,
  ...(s.wind !== undefined ? { windScale: s.wind } : {}),
  ...(s.tides !== undefined ? { tflag: s.tides ? 1 : 0 } : {}),
});

/** Which star went supernova: the one whose type became the remnant's at that moment in the event log. */
function supernovaeOf(result: BseResult): Supernova[] {
  const events = result.bpp.map(eventOf);
  return result.supernovae.map((k) => {
    let star: 0 | 1 = 0;
    let best = Infinity;
    for (let i = 1; i < events.length; i++) {
      for (const s of [0, 1] as const) {
        if (events[i].kw[s] !== k.kw || events[i - 1].kw[s] === k.kw) continue;
        const d = Math.abs(events[i].t - k.t) + Math.abs(events[i].m[s] - k.mass) * 1e-3;
        if (d < best) {
          best = d;
          star = s;
        }
      }
    }
    return { t: k.t, star, kw: k.kw, mass: k.mass, kick: k.kick, speed: Math.hypot(...k.vs), disrupted: k.ecc > 1, paired: k.paired };
  });
}

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
  r: { m1: number; m2: number; period: number; ecc: number; z: number; tEnd?: number; seed?: number } & ForgeSwitches,
): BinaryRun {
  const result = evolveBinary({ m1: r.m1, m2: r.m2, period: r.period, ecc: r.ecc, z: r.z, tEnd: r.tEnd ?? UNIVERSE_AGE }, options(r, r.seed ?? 29769));
  const input: BinaryRun['input'] = { m1: r.m1, m2: r.m2, period: r.period, ecc: r.ecc, z: r.z, alpha: r.alpha, sigma: r.sigma };
  if (r.seed !== undefined) input.seed = r.seed;
  if (r.wind !== undefined) input.wind = r.wind;
  if (r.tides !== undefined) input.tides = r.tides;
  return {
    input,
    steps: thin(result.bcm.map(stepOf), 2500),
    events: result.bpp.map(eventOf),
    outcome: classify(result),
    warnings: result.warnings,
    supernovae: supernovaeOf(result),
  };
}

export interface ZooCell extends Classified {
  m1: number;
  period: number;
}

/** The seed for a cell of the zoo's map, so each cell's kick is its own but the same every time. */
export const zooSeed = (m1: number, period: number) => 1 + Math.round(Math.log10(m1) * 1000) * 7919 + Math.round(Math.log10(period) * 1000);

/** A zoo cell's companion, M☉: q times the primary, to four figures, as the Star Forge keeps masses (so a cell opens there unchanged). */
export const zooCompanion = (m1: number, q: number) => Number((q * m1).toPrecision(4));

/** One row of the zoo's map: a primary of m1 with a companion of q m1, at each period (days), circular, from the ZAMS. */
export function zooRow(r: { m1: number; q: number; z: number; periods: readonly number[] } & FigureSwitches): ZooCell[] {
  return r.periods.map((period) => {
    const result = evolveBinary({ m1: r.m1, m2: zooCompanion(r.m1, r.q), period, ecc: 0, z: r.z, tEnd: UNIVERSE_AGE }, options(r, zooSeed(r.m1, period)));
    return { ...classify(result), m1: r.m1, period };
  });
}
