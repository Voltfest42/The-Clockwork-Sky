import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { computeStellar, requestKey, type LifeAnswer, type PairMap, type StellarAnswer, type StellarRequest } from '../core/stellar/requests';
import type { CollapseRun } from '../core/supernova/collapse';
import type { CoreHistory } from '../core/supernova/pairs';
import type { Fate, IsochronePoint } from '../core/stellar/lives';
import type { StarModel, StarSummary } from '../core/structure/zams';
import type { BinaryRun, FigureSwitches, ZooCell } from '../core/stellar/bse/runs';

/**
 * Asks the stellar-evolution worker for an isochrone, a fate curve or a whole
 * life, and gives back the answer once it comes. Answers are cached for the
 * page's lifetime. Requests wait in a queue, newest first, and leave it when
 * no figure wants them any more, so a slider dragged quickly doesn't queue up
 * work. Without workers, the work runs on the main thread after a frame.
 *
 * Until the answer comes, a figure gets the newest answer it has already had
 * for any of its earlier requests. While a slider moves faster than the
 * worker, every answer is for a value the slider has already left; showing it
 * anyway keeps the figure moving with the slider instead of freezing until it
 * stops.
 */

const cache = new Map<string, StellarAnswer>();
let worker: Worker | null = null;
let busy = false;
let nextId = 1;
const waiting = new Map<string, StellarRequest>();
/** How many mounted figures want each request now. */
const wanted = new Map<string, number>();
/** Each figure's requests, oldest first (by the figure's useId). */
const histories = new Map<string, string[]>();

// Every answer bumps a version, so the figures waiting look again.
let version = 0;
const subscribers = new Set<() => void>();
const subscribe = (f: () => void) => {
  subscribers.add(f);
  return () => {
    subscribers.delete(f);
  };
};
const getVersion = () => version;

function pump() {
  if (busy || !waiting.size) return;
  const [key, request] = [...waiting].pop()!;
  waiting.delete(key);
  if (cache.has(key)) return pump();
  busy = true;
  const done = (answer: StellarAnswer | undefined) => {
    busy = false;
    if (answer) cache.set(key, answer);
    version++;
    for (const f of subscribers) f();
    pump();
  };
  if (typeof Worker === 'undefined') {
    setTimeout(() => done(computeStellar(request)), 0);
    return;
  }
  if (!worker) worker = new Worker(new URL('../workers/stellar.worker.ts', import.meta.url), { type: 'module' });
  const id = nextId++;
  worker.onmessage = (event: MessageEvent<{ id: number; answer?: StellarAnswer; error?: string }>) => {
    if (event.data.id !== id) return;
    if (event.data.error) console.error(event.data.error);
    done(event.data.answer);
  };
  worker.postMessage({ id, request });
}

export function useStellar(request: StellarRequest | null): StellarAnswer | null {
  const key = request ? requestKey(request) : null;
  const figure = useId();
  useSyncExternalStore(subscribe, getVersion, getVersion);
  useEffect(
    () => () => {
      histories.delete(figure);
    },
    [figure],
  );
  useEffect(() => {
    if (!key || !request) return;
    const history = histories.get(figure) ?? [];
    histories.set(figure, history);
    if (history[history.length - 1] !== key) history.push(key);
    if (history.length > 100) history.shift();
    wanted.set(key, (wanted.get(key) ?? 0) + 1);
    if (!cache.has(key)) {
      waiting.set(key, request);
      pump();
    }
    return () => {
      const n = (wanted.get(key) ?? 1) - 1;
      if (n > 0) wanted.set(key, n);
      else {
        wanted.delete(key);
        waiting.delete(key);
      }
    };
    // The key stands for the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, figure]);
  if (!key) return null;
  const answer = cache.get(key);
  if (answer) return answer;
  // Not ready yet: the newest answer to this figure's earlier requests.
  const history = histories.get(figure) ?? [];
  for (let i = history.length - 1; i >= 0; i--) {
    const earlier = cache.get(history[i]);
    if (earlier) return earlier;
  }
  return null;
}

/** How long the age must rest before the full isochrone is asked for, ms. */
const SETTLE = 250;

/**
 * Every star of one age (Myr) and metallicity still shining, from SSE. While the age or metallicity is changing
 * (a slider being dragged), a coarse isochrone, about five times quicker, so the line keeps up; once they have
 * rested for a quarter of a second, the full one.
 */
export function useIsochrone(age: number, z: number): IsochronePoint[] | null {
  const [rested, setRested] = useState({ age, z });
  useEffect(() => {
    const timer = setTimeout(() => setRested({ age, z }), SETTLE);
    return () => clearTimeout(timer);
  }, [age, z]);
  const settled = rested.age === age && rested.z === z;
  return useStellar({ kind: 'isochrone', age, z, ...(settled ? {} : { detail: 'coarse' as const }) }) as IsochronePoint[] | null;
}

/** The fates of 110 initial masses from 0.01 to 300 M☉. */
export const useFates = (z: number, wind: number) => useStellar({ kind: 'fates', z, wind }) as Fate[] | null;

/** One star's whole life. */
export const useLife = (mass: number, z: number, wind: number) => useStellar({ kind: 'life', mass, z, wind }) as LifeAnswer | null;

/** One star's whole life, or nothing when no star is asked for. */
export const useLifeOf = (star: { mass: number; z: number; wind: number } | null) =>
  useStellar(star ? { kind: 'life', mass: star.mass, z: star.z, wind: star.wind } : null) as LifeAnswer | null;

/** A star built from the four equations of structure (Figure 21.4), or none. */
export const useBuiltStar = (r: { mass: number; X: number; Z: number; burning: number; today?: boolean } | null) =>
  useStellar(r ? { kind: 'star', ...r } : null) as StarModel | null;

/** A main sequence built star by star (Figure 21.4), once asked for. */
export const useMainSequence = (r: { masses: readonly number[]; X: number; Z: number } | null) =>
  useStellar(r ? { kind: 'main-sequence', ...r } : null) as StarSummary[] | null;

/** Chapter 25's toy collapse and bounce, with neutrino heating of L × 10⁵² erg/s behind the shock. */
export const useCollapse = (neutrinoLuminosity: number) => useStellar({ kind: 'collapse', neutrinoLuminosity }) as CollapseRun | null;

/** The pair-instability wedge and the paths of helium cores through it (Figure 25.4). */
export const usePairMap = (r: { logT: readonly [number, number]; logRho: readonly [number, number]; masses: readonly number[] }) =>
  useStellar({ kind: 'pair-map', ...r }) as PairMap | null;

/** One helium core's Γ₁ along its path, at its centre and on average (Figure 25.4). */
export const usePairCore = (mass: number, logT: readonly [number, number]) => useStellar({ kind: 'pair-core', mass, logT }) as CoreHistory | null;

/** One binary's whole life from BSE (Chapter 28), or none. */
export const useBinary = (r: ({ m1: number; m2: number; period: number; ecc: number; z: number; seed?: number } & FigureSwitches) | null) =>
  useStellar(r ? { kind: 'binary', ...r } : null) as BinaryRun | null;

/** One row of the binary zoo's map (Figure 28.4). */
export const useZooRow = (r: { m1: number; q: number; z: number; periods: readonly number[] } & FigureSwitches) =>
  useStellar({ kind: 'zoo-row', ...r }) as ZooCell[] | null;
