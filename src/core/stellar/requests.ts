/**
 * The stellar work the figures ask for (evolution, and stars built from the
 * equations of structure), as plain messages, so it can
 * run in a Web Worker (src/workers/stellar.worker.ts) or, where there is none,
 * on the main thread. Each answer is plain data that survives structured cloning.
 */
import solarModel from '../../data/solarModel.json';
import { M_SUN } from '../constants';
import { buildStar, mainSequence, type StarModel, type StarSummary } from '../structure/zams';
import { fateCurve, isochrone, lifeOf, type Fate, type IsochronePoint } from './lives';
import type { SseTrack } from './sse/evolve';

export type StellarRequest =
  | { kind: 'isochrone'; age: number; z: number; detail?: 'coarse' }
  | { kind: 'fates'; z: number; wind: number }
  | { kind: 'life'; mass: number; z: number; wind: number }
  /** A star built from the four equations of structure (Chapter 21); `today` gives it Model S's hydrogen, burnt down in the core, and its mass. */
  | { kind: 'star'; mass: number; X: number; Z: number; burning: number; today?: boolean }
  | { kind: 'main-sequence'; masses: readonly number[]; X: number; Z: number };

/**
 * A life as the worker sends it, with the wind it was run with. If SSE can't follow the star to its end (without
 * winds, its formulas for stars above about 90 M☉ stall while they burn helium), it has no steps and says why.
 */
export interface LifeAnswer extends SseTrack {
  wind: number;
  error?: string;
}

export type StellarAnswer = IsochronePoint[] | Fate[] | LifeAnswer | StarModel | StarSummary[];

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
  }
}
