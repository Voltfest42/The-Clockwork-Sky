import { LOCAL_GROUP_SETS, SUN_FRAME, type LocalGroupSet } from '../../data/localGroup';
import { choose, integrateLocalGroup, sampleLocalGroup, type LocalGroupName, type Narrowing } from './localGroup';

/**
 * The Local Group's futures, computed in a Web Worker for Figure 31.2: one
 * sampled present after another, each followed for ten billion years, sent
 * back in batches so the odds sharpen as they come in. A new request
 * abandons the old one. The worker only wires this host to `postMessage`
 * and a timer; a page without workers runs it on the main thread.
 */

export interface LocalGroupConfig {
  set: LocalGroupSet;
  include: { M33: boolean; LMC: boolean };
  narrowing: Narrowing;
  friction: boolean;
  /** How many futures. */
  count: number;
  seed: number;
}

export const LOCAL_GROUP_DEFAULTS: LocalGroupConfig = {
  set: 'sawala2025',
  include: { M33: true, LMC: true },
  narrowing: { m31Motion: 1, masses: 1, rest: 1 },
  friction: true,
  count: 1000,
  seed: 1,
};

/** Futures whose paths are kept for drawing. */
export const TRACKED = 100;
/** Paths are recorded every this many Myr. */
export const TRACK_EVERY = 50;
/** Step for the figure's runs, Myr: outcomes match 1 Myr's (tests/chapter31.test.ts) at half the cost. */
export const FIGURE_STEP = 2;
export const HORIZON = 10_000;

export type LocalGroupRequest = { type: 'run'; config: LocalGroupConfig } | { type: 'stop' };

export interface FutureSummary {
  index: number;
  /** Myr, or null. */
  merger: number | null;
  /** kpc. */
  closest: number;
  satellites: { name: LocalGroupName; into: LocalGroupName; at: number }[];
}

export interface FutureTrack {
  index: number;
  merger: number | null;
  /** Milky Way–Andromeda distance every TRACK_EVERY Myr, kpc (NaN after a merger). */
  distances: Float32Array;
  /** Andromeda's path about the Milky Way in the plane of their orbit now, kpc. */
  path: Float32Array;
}

export interface LocalGroupProgress {
  type: 'futures';
  /** Which request this answers. */
  job: number;
  config: LocalGroupConfig;
  done: number;
  futures: FutureSummary[];
  tracks: FutureTrack[];
  finished: boolean;
}

export type LocalGroupMessage = LocalGroupProgress | { type: 'error'; message: string };

export interface LocalGroupHost {
  receive(request: LocalGroupRequest): void;
  tick(): void;
  readonly running: boolean;
}

/** One future of a configuration: the sample's present, followed. */
export function future(config: LocalGroupConfig, index: number, record: boolean) {
  const data = LOCAL_GROUP_SETS[config.set].data;
  const galaxies = choose(sampleLocalGroup(data, SUN_FRAME, config.seed, index, config.narrowing), config.include);
  return integrateLocalGroup(galaxies, { dt: FIGURE_STEP, duration: HORIZON, friction: config.friction, recordEvery: record ? TRACK_EVERY : 0 });
}

export function createLocalGroupHost(post: (message: LocalGroupMessage) => void, now: () => number = () => performance.now(), budget = 40): LocalGroupHost {
  let config: LocalGroupConfig | null = null;
  let job = 0;
  let done = 0;
  let running = false;

  return {
    get running() {
      return running;
    },
    receive(request) {
      if (request.type === 'stop') {
        running = false;
        return;
      }
      config = request.config;
      job++;
      done = 0;
      running = true;
    },
    tick() {
      if (!running || !config) return;
      try {
        const t0 = now();
        const futures: FutureSummary[] = [];
        const tracks: FutureTrack[] = [];
        while (done < config.count && now() - t0 < budget) {
          const index = done;
          const f = future(config, index, index < TRACKED);
          futures.push({ index, merger: f.merger, closest: f.closest, satellites: f.satellites });
          if (index < TRACKED) tracks.push({ index, merger: f.merger, distances: f.distances, path: f.path });
          done++;
        }
        const finished = done >= config.count;
        if (finished) running = false;
        post({ type: 'futures', job, config, done, futures, tracks, finished });
      } catch (error) {
        running = false;
        post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
      }
    },
  };
}
