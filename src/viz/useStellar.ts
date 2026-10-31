import { useEffect, useState } from 'react';
import { computeStellar, requestKey, type LifeAnswer, type StellarAnswer, type StellarRequest } from '../core/stellar/requests';
import type { Fate, IsochronePoint } from '../core/stellar/lives';

/**
 * Asks the stellar-evolution worker for an isochrone, a fate curve or a whole
 * life, and gives back the answer once it comes (until then, the last answer
 * this figure had, or null). Answers are
 * cached for the page's lifetime. Requests wait in a queue, newest first, and
 * leave it when no figure wants them any more, so a slider dragged quickly
 * doesn't queue up work.
 * Without workers, the work runs on the main thread after a frame.
 */

const cache = new Map<string, StellarAnswer>();
let worker: Worker | null = null;
let busy = false;
let nextId = 1;
const waiting = new Map<string, StellarRequest>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  for (const f of listeners.get(key) ?? []) f();
}

function pump() {
  if (busy || !waiting.size) return;
  const [key, request] = [...waiting].pop()!;
  waiting.delete(key);
  if (cache.has(key)) return pump();
  busy = true;
  const done = (answer: StellarAnswer | undefined) => {
    busy = false;
    if (answer) cache.set(key, answer);
    notify(key);
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
  // The last answer delivered to this figure, kept while a new request runs.
  const [delivered, setDelivered] = useState<StellarAnswer | null>(null);
  useEffect(() => {
    if (!key || !request) return;
    const listener = () => setDelivered(cache.get(key) ?? null);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(listener);
    if (!cache.has(key)) {
      waiting.set(key, request);
      pump();
    }
    return () => {
      listeners.get(key)?.delete(listener);
      if (!listeners.get(key)?.size) waiting.delete(key);
    };
    // The key stands for the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!key) return null;
  return cache.get(key) ?? delivered;
}

/** Every star of one age (Myr) and metallicity still shining, from SSE. */
export const useIsochrone = (age: number, z: number) => useStellar({ kind: 'isochrone', age, z }) as IsochronePoint[] | null;

/** The fates of 110 initial masses from 0.01 to 300 M☉. */
export const useFates = (z: number, wind: number) => useStellar({ kind: 'fates', z, wind }) as Fate[] | null;

/** One star's whole life. */
export const useLife = (mass: number, z: number, wind: number) => useStellar({ kind: 'life', mass, z, wind }) as LifeAnswer | null;

/** One star's whole life, or nothing when no star is asked for. */
export const useLifeOf = (star: { mass: number; z: number; wind: number } | null) =>
  useStellar(star ? { kind: 'life', mass: star.mass, z: star.z, wind: star.wind } : null) as LifeAnswer | null;
