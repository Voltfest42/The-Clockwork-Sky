import { Random } from '../random';
import {
  ClusterSim,
  crossingTime,
  galacticTide,
  jacobiRadius,
  kroupaMasses,
  plummerSphere,
  PLUMMER_HALF_MASS,
  readCluster,
  relaxationTime,
  type Tide,
} from './cluster';

/**
 * The many-body engine's message protocol, spoken between Figure 30.1 (and,
 * later, the Orrery's cluster mode) and the Web Worker that runs a cluster.
 * The host holds the simulation and answers; the worker only wires it to
 * `postMessage` and a timer, and a page without workers runs the same host
 * on the main thread. Units: pc, Myr, M☉.
 */

export interface ClusterConfig {
  /** Number of stars. */
  n: number;
  /** Equal masses (0.5 M☉ each) or Kroupa's mix from 0.08 to 3 M☉. */
  masses: 'equal' | 'kroupa';
  /** The cluster's orbit round the Galaxy, kpc from the centre. */
  orbit: number;
  /** Half-mass radius at the start, pc. */
  halfMass: number;
  seed: number;
}

export const CLUSTER_DEFAULTS: ClusterConfig = { n: 1000, masses: 'kroupa', orbit: 8.2, halfMass: 2, seed: 1 };

/** The heaviest star of Kroupa's mix here: an open cluster a few hundred million years old has lost its heavier stars. */
export const KROUPA_TOP = 3;
/** Softening, as a share of the half-mass radius. */
export const SOFTENING_SHARE = 1 / 50;
/** Aarseth's accuracy parameter for the figure's runs. */
export const ETA = 0.05;

export type ClusterRequest =
  | { type: 'load'; config: ClusterConfig }
  /** Runs for `budget` ms of computing per tick (default 30), sending a state after each. */
  | { type: 'run'; budget?: number }
  | { type: 'pause' }
  /** Runs to time `t` (Myr) at once, then sends a state (for tests and keyboard stepping). */
  | { type: 'advance'; t: number };

/** One reading of the cluster. */
export interface ClusterSample {
  /** Myr. */
  t: number;
  /** Mass within the Jacobi radius, as a share of the starting mass. */
  bound: number;
  boundCount: number;
  /** pc. */
  jacobi: number;
  /** Radii holding 10%, 50% and 90% of the bound mass, pc. */
  lagrangian: [number, number, number];
  /** Half-mass radius of the heaviest tenth of the bound stars, pc. */
  heavy: number;
  /** The Jacobi integral's drift since the start, as a share of its size. */
  energyError: number;
}

export interface ClusterInfo {
  type: 'loaded';
  config: ClusterConfig;
  /** Masses, M☉. */
  masses: Float32Array;
  totalMass: number;
  /** Starting relaxation and crossing times, Myr; the starting Jacobi radius, pc. */
  relaxation: number;
  crossing: number;
  jacobi: number;
  tide: Tide;
  softening: number;
}

export interface ClusterState {
  type: 'state';
  /** Myr. */
  t: number;
  /** Positions relative to the cluster's centre, pc (x away from the Galaxy's centre, y along the orbit, z out of the plane). */
  positions: Float32Array;
  /** 1 for the stars within the Jacobi radius. */
  bound: Uint8Array;
  /** Readings since the last state. */
  samples: ClusterSample[];
  running: boolean;
  /** Why the run stopped by itself: all but a few stars gone, or the time limit. */
  ended: 'dissolved' | 'limit' | null;
}

export type ClusterMessage = ClusterInfo | ClusterState | { type: 'error'; message: string };

/** The run stops when less than this share of the mass is bound, or after this many relaxation times. */
export const DISSOLVED = 0.02;
export const RUN_LIMIT = 30;
/** Readings per relaxation time. */
export const SAMPLES_PER_RELAXATION = 25;

/** Builds a cluster from its configuration: masses, a Plummer sphere cut at 1.5 Jacobi radii, the tide and the integrator. */
export function buildCluster(config: ClusterConfig) {
  const random = new Random(config.seed);
  const masses = config.masses === 'kroupa' ? kroupaMasses(config.n, random, 0.08, KROUPA_TOP) : new Float64Array(config.n).fill(0.5);
  const totalMass = masses.reduce((s, m) => s + m, 0);
  const tide = galacticTide(config.orbit);
  const jacobi = jacobiRadius(totalMass, tide);
  const stars = plummerSphere(config.n, totalMass, config.halfMass / PLUMMER_HALF_MASS, random, masses, 1.5 * jacobi);
  const crossing = crossingTime(totalMass, config.halfMass);
  const relaxation = relaxationTime(config.n, config.halfMass, totalMass / config.n);
  const softening = config.halfMass * SOFTENING_SHARE;
  const sim = new ClusterSim(stars, { softening, tide, eta: ETA, maxStep: crossing / 16 });
  return { sim, totalMass, tide, jacobi, crossing, relaxation, softening };
}

export interface ClusterHost {
  receive(request: ClusterRequest): void;
  tick(): void;
  readonly running: boolean;
}

/** A host that answers requests through `post`; `now` is a clock in ms (performance.now). */
export function createClusterHost(post: (message: ClusterMessage) => void, now: () => number = () => performance.now()): ClusterHost {
  let built: ReturnType<typeof buildCluster> | null = null;
  let running = false;
  let budget = 30;
  let e0 = 0;
  let centre: number[] | undefined;
  let lastBound: Uint8Array = new Uint8Array(0);
  let nextSample = 0;
  let samples: ClusterSample[] = [];
  let ended: ClusterState['ended'] = null;

  const sample = () => {
    const b = built!;
    const reading = readCluster(b.sim.mass, b.sim.positionsNow(), b.tide, centre);
    centre = reading.centre;
    lastBound = reading.bound;
    const e = b.sim.jacobiEnergy();
    const s: ClusterSample = {
      t: b.sim.t,
      bound: reading.boundMass / b.totalMass,
      boundCount: reading.boundCount,
      jacobi: reading.jacobi,
      lagrangian: reading.lagrangian,
      heavy: reading.heavyHalfMass,
      energyError: (e - e0) / Math.abs(e0),
    };
    samples.push(s);
    nextSample = b.sim.t + b.relaxation / SAMPLES_PER_RELAXATION;
    if (s.bound < DISSOLVED) ended = 'dissolved';
    else if (b.sim.t >= RUN_LIMIT * b.relaxation) ended = 'limit';
    if (ended) running = false;
  };

  const state = () => {
    const b = built!;
    const x = b.sim.positionsNow();
    const positions = new Float32Array(x.length);
    const c = centre ?? [0, 0, 0];
    for (let i = 0; i < x.length; i += 3) {
      positions[i] = x[i] - c[0];
      positions[i + 1] = x[i + 1] - c[1];
      positions[i + 2] = x[i + 2] - c[2];
    }
    post({ type: 'state', t: b.sim.t, positions, bound: Uint8Array.from(lastBound), samples, running, ended });
    samples = [];
  };

  /** Steps until `until` (ms on the clock) or time `t`, taking readings as they fall due at level moments. */
  const work = (until: number, t = Infinity) => {
    const b = built!;
    const sim = b.sim;
    while (!ended && sim.t < t - 1e-9) {
      sim.step();
      if (sim.t >= nextSample && sim.t % sim.maxStep === 0) sample();
      if (now() >= until) break;
    }
  };

  const guard = (job: () => void) => {
    try {
      job();
    } catch (error) {
      running = false;
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return {
    get running() {
      return running;
    },
    receive(request) {
      guard(() => {
        switch (request.type) {
          case 'load': {
            built = buildCluster(request.config);
            running = false;
            ended = null;
            centre = undefined;
            samples = [];
            e0 = built.sim.jacobiEnergy();
            post({
              type: 'loaded',
              config: request.config,
              masses: Float32Array.from(built.sim.mass),
              totalMass: built.totalMass,
              relaxation: built.relaxation,
              crossing: built.crossing,
              jacobi: built.jacobi,
              tide: built.tide,
              softening: built.softening,
            });
            sample();
            state();
            return;
          }
          case 'run':
            if (!built) throw new Error('Nothing is loaded.');
            budget = request.budget ?? 30;
            running = !ended;
            return;
          case 'pause':
            running = false;
            if (built) state();
            return;
          case 'advance':
            if (!built) throw new Error('Nothing is loaded.');
            work(Infinity, request.t);
            state();
            return;
        }
      });
    },
    tick() {
      if (!running || !built) return;
      guard(() => {
        work(now() + budget);
        state();
      });
    },
  };
}
