/**
 * The stellar work the figures ask for (evolution, and stars built from the
 * equations of structure), as plain messages, so it can
 * run in a Web Worker (src/workers/stellar.worker.ts) or, where there is none,
 * on the main thread. Each answer is plain data that survives structured cloning.
 */
import solarModel from '../../data/solarModel.json';
import { M_SUN } from '../constants';
import { buildStar, mainSequence, type StarModel, type StarSummary } from '../structure/zams';
import { runCollapse, type CollapseRun } from '../supernova/collapse';
import { coreHistory, pairWedge, type CoreHistory, type WedgeColumn } from '../supernova/pairs';
import { fateCurve, isochrone, lifeOf, type Fate, type IsochronePoint } from './lives';
import { binaryRun, zooRow, type BinaryRun, type FigureSwitches, type ZooCell } from './bse/runs';
import type { SseTrack } from './sse/evolve';

export type StellarRequest =
  | { kind: 'isochrone'; age: number; z: number; detail?: 'coarse' }
  | { kind: 'fates'; z: number; wind: number }
  | { kind: 'life'; mass: number; z: number; wind: number }
  /** A star built from the four equations of structure (Chapter 21); `today` gives it Model S's hydrogen, burnt down in the core, and its mass. */
  | { kind: 'star'; mass: number; X: number; Z: number; burning: number; today?: boolean }
  | { kind: 'main-sequence'; masses: readonly number[]; X: number; Z: number }
  /** The toy collapse and bounce of Chapter 25, with neutrinos of luminosity L (10⁵² erg/s) heating behind the shock. */
  | { kind: 'collapse'; neutrinoLuminosity: number }
  /** Chapter 25's pair-instability wedge on the core's map, and the paths of helium cores of these masses (M☉) through it. */
  | { kind: 'pair-map'; logT: readonly [number, number]; logRho: readonly [number, number]; masses: readonly number[] }
  /** One core's Γ₁, at its centre and on average, along its path (Figure 25.4). */
  | { kind: 'pair-core'; mass: number; logT: readonly [number, number] }
  /** One binary's life from BSE (Chapter 28). */
  | ({ kind: 'binary'; m1: number; m2: number; period: number; ecc: number; z: number; seed?: number } & FigureSwitches)
  /** One row of the binary zoo's map (Figure 28.4): a primary of m1 M☉, companions of q m1, at each period (days). */
  | ({ kind: 'zoo-row'; m1: number; q: number; z: number; periods: readonly number[] } & FigureSwitches);

/** The wedge where Γ₁ < 4/3, and each core's path. */
export interface PairMap {
  wedge: WedgeColumn[];
  histories: CoreHistory[];
}

/**
 * A life as the worker sends it, with the wind it was run with. If SSE can't follow the star to its end (without
 * winds, its formulas for stars above about 90 M☉ stall while they burn helium), it has no steps and says why.
 */
export interface LifeAnswer extends SseTrack {
  wind: number;
  error?: string;
}

export type StellarAnswer =
  | IsochronePoint[]
  | Fate[]
  | LifeAnswer
  | StarModel
  | StarSummary[]
  | CollapseRun
  | PairMap
  | CoreHistory
  | BinaryRun
  | ZooCell[];

/** Model S's hydrogen against the mass fraction: today's Sun, its core a little over half burnt. */
export const SUN_TODAY_HYDROGEN: readonly (readonly [number, number])[] = solarModel.shells.map((s) => [s.m, s.X] as const);
/** Model S's own mass, M☉. */
export const MODEL_S_MASS_SOLAR = solarModel.mass / M_SUN;

/** A key that identifies a request, for caching. */
export const requestKey = (r: StellarRequest): string => JSON.stringify(r);

export function computeStellar(r: StellarRequest): StellarAnswer {
  switch (r.kind) {
    case 'isochrone':
      // A coarse isochrone has a quarter of the giant branch's points and takes about a fifth of the time.
      return r.detail === 'coarse' ? isochrone(r.age, r.z, { giantPoints: 20 }) : isochrone(r.age, r.z);
    case 'fates':
      // Fates above 300 M☉ aren't asked for; between 150 and 300 the figure marks them unreliable.
      return fateCurve(r.z, { windScale: r.wind }, 110, 300);
    case 'life':
      try {
        return { ...lifeOf(r.mass, r.z, { windScale: r.wind }), wind: r.wind };
      } catch (e) {
        return { m: r.mass, z: r.z, steps: [], types: [], wind: r.wind, error: e instanceof Error ? e.message : String(e) };
      }
    case 'star':
      return r.today
        ? buildStar({ mass: MODEL_S_MASS_SOLAR, X: r.X, Z: r.Z, burning: r.burning, hydrogen: SUN_TODAY_HYDROGEN })
        : buildStar({ mass: r.mass, X: r.X, Z: r.Z, burning: r.burning });
    case 'main-sequence':
      return mainSequence(r.masses, r.X, r.Z);
    case 'collapse':
      return runCollapse({ neutrinoLuminosity: r.neutrinoLuminosity });
    case 'pair-map':
      return { wedge: pairWedge(r.logT, r.logRho, 64), histories: r.masses.map((m) => coreHistory(m, r.logT)) };
    case 'pair-core':
      return coreHistory(r.mass, r.logT, 40);
    case 'binary':
      return binaryRun(r);
    case 'zoo-row':
      return zooRow(r);
  }
}
