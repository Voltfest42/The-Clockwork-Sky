import type { Method } from '../integrate/steppers';
import { Simulation } from './simulation';
import type { BodySpec } from './system';

/**
 * The n-body engine's message protocol, spoken between a figure (or the
 * Orrery) and the Web Worker that runs the simulation. The host below holds
 * the simulation and answers messages; the worker only wires it to
 * `postMessage` and a timer, and a page without workers can run the same host
 * on the main thread.
 *
 * Units are the system's own (see system.ts): the figures use AU and days.
 */

export type NBodyRequest =
  /** Starts a new simulation. `track` lists the bodies whose every step is sent back as a trail (default: none). */
  | { type: 'load'; bodies: readonly BodySpec[]; method: Method; dt: number; track?: readonly number[] }
  /** Runs at `rate` units of simulated time per real second, sending a snapshot every `postEvery` seconds (default 1/30). */
  | { type: 'run'; rate: number; postEvery?: number }
  | { type: 'pause' }
  /** Takes `steps` steps (default 1) and sends a snapshot. */
  | { type: 'step'; steps?: number }
  /** Changes the method or time step, or bodies' masses, positions or velocities, and sends a snapshot. */
  | { type: 'edit'; method?: Method; dt?: number; bodies?: readonly { index: number; gm?: number; x?: readonly number[]; v?: readonly number[] }[] };

export interface NBodySnapshot {
  type: 'state';
  /** Simulated time, T, and steps taken since the load. */
  t: number;
  steps: number;
  /** All positions (L) and velocities (L/T) now. */
  x: Float64Array;
  v: Float64Array;
  /** The tracked bodies' positions after every step since the last snapshot: per step, per tracked body, x, y, z. Thinned out evenly if there were very many. */
  trail: Float64Array;
  /** Drift since the load or the last edit, as fractions (see diagnostics.ts). */
  energyError: number;
  angularMomentumError: number;
  running: boolean;
}

export type NBodyMessage = NBodySnapshot | { type: 'error'; message: string };

/** Most steps taken in one tick, so a huge rate can't freeze the worker; the run falls behind real time instead. */
export const MAX_STEPS_PER_TICK = 20_000;
/** Most trail points in one snapshot. */
export const MAX_TRAIL = 4_000;

export interface NBodyHost {
  receive(request: NBodyRequest): void;
  /** Advances a running simulation by `seconds` of real time. */
  tick(seconds: number): void;
  readonly running: boolean;
}

/** A host that answers requests through `post`. */
export function createHost(post: (message: NBodyMessage) => void): NBodyHost {
  let sim: Simulation | null = null;
  let track: readonly number[] = [];
  let trail: number[] = [];
  let running = false;
  let rate = 0;
  let postEvery = 1 / 30;
  let owed = 0;
  let sincePost = 0;

  const record = () => {
    if (!sim) return;
    for (const i of track) trail.push(sim.system.x[3 * i], sim.system.x[3 * i + 1], sim.system.x[3 * i + 2]);
  };

  const snapshot = () => {
    if (!sim) return;
    const width = 3 * track.length;
    let points = trail;
    const count = width ? trail.length / width : 0;
    if (count > MAX_TRAIL) {
      points = [];
      for (let k = 0; k < MAX_TRAIL; k++) {
        const at = Math.round(((k + 1) * count) / MAX_TRAIL) - 1;
        for (let w = 0; w < width; w++) points.push(trail[at * width + w]);
      }
    }
    trail = [];
    if (!sim.finite()) {
      running = false;
      post({ type: 'error', message: 'The simulation broke down: a body was flung off to infinity. Try a smaller time step.' });
      return;
    }
    post({
      type: 'state',
      t: sim.system.t,
      steps: sim.steps,
      x: Float64Array.from(sim.system.x),
      v: Float64Array.from(sim.system.v),
      trail: Float64Array.from(points),
      energyError: sim.energyError(),
      angularMomentumError: sim.angularMomentumError(),
      running,
    });
  };

  const guard = (work: () => void) => {
    try {
      work();
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
          case 'load':
            sim = new Simulation(request.bodies, request.method, request.dt);
            track = (request.track ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < request.bodies.length);
            trail = [];
            running = false;
            owed = 0;
            record();
            snapshot();
            return;
          case 'run':
            if (!sim) throw new Error('Nothing is loaded.');
            if (!Number.isFinite(request.rate) || request.rate <= 0) throw new Error('The rate must be a positive number.');
            rate = request.rate;
            postEvery = request.postEvery ?? 1 / 30;
            running = true;
            sincePost = 0;
            return;
          case 'pause':
            running = false;
            snapshot();
            return;
          case 'step': {
            if (!sim) throw new Error('Nothing is loaded.');
            const steps = Math.max(1, Math.min(MAX_STEPS_PER_TICK, Math.floor(request.steps ?? 1)));
            running = false;
            sim.advance(steps, undefined, record);
            snapshot();
            return;
          }
          case 'edit':
            if (!sim) throw new Error('Nothing is loaded.');
            if (request.method !== undefined || request.dt !== undefined) sim.configure(request.method ?? sim.method, request.dt ?? sim.dt);
            if (request.bodies) sim.edit(request.bodies);
            snapshot();
            return;
        }
      });
    },
    tick(seconds) {
      if (!running || !sim) return;
      guard(() => {
        const s = sim!;
        owed += (rate * seconds) / s.dt;
        const steps = Math.min(MAX_STEPS_PER_TICK, Math.floor(owed));
        owed = Math.min(owed - steps, 1);
        s.advance(steps, undefined, record);
        sincePost += seconds;
        if (sincePost >= postEvery) {
          sincePost = 0;
          snapshot();
        }
      });
    },
  };
}
