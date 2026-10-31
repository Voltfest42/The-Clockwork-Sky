/**
 * The stellar-evolution work the figures ask for, as plain messages, so it can
 * run in a Web Worker (src/workers/stellar.worker.ts) or, where there is none,
 * on the main thread. Each answer is plain data that survives structured cloning.
 */
import { fateCurve, isochrone, lifeOf, type Fate, type IsochronePoint } from './lives';
import type { SseTrack } from './sse/evolve';

export type StellarRequest =
  | { kind: 'isochrone'; age: number; z: number }
  | { kind: 'fates'; z: number; wind: number }
  | { kind: 'life'; mass: number; z: number; wind: number };

/**
 * A life as the worker sends it, with the wind it was run with. If SSE can't follow the star to its end (without
 * winds, its formulas for stars above about 90 M☉ stall while they burn helium), it has no steps and says why.
 */
export interface LifeAnswer extends SseTrack {
  wind: number;
  error?: string;
}

export type StellarAnswer = IsochronePoint[] | Fate[] | LifeAnswer;

/** A key that identifies a request, for caching. */
export const requestKey = (r: StellarRequest): string => JSON.stringify(r);

export function computeStellar(r: StellarRequest): StellarAnswer {
  switch (r.kind) {
    case 'isochrone':
      return isochrone(r.age, r.z);
    case 'fates':
      // Fates above 300 M☉ aren't asked for; between 150 and 300 the figure marks them unreliable.
      return fateCurve(r.z, { windScale: r.wind }, 110, 300);
    case 'life':
      try {
        return { ...lifeOf(r.mass, r.z, { windScale: r.wind }), wind: r.wind };
      } catch (e) {
        return { m: r.mass, z: r.z, steps: [], types: [], wind: r.wind, error: e instanceof Error ? e.message : String(e) };
      }
  }
}
