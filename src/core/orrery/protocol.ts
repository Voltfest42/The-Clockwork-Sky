import type { Vec3 } from '../math/vec3';
import { Orrery, type MethodChoice, type NewBodyOnOrbit, type OrreryBody, type OrreryEvent, type OrreryMethod } from './engine';
import { frameOf, toFrame, type FrameSpec, FIXED_FRAME } from './frame';
import { parentage } from './hierarchy';

/**
 * The Orrery's message protocol, between the lab and the Web Worker that runs
 * the engine. Like the chapter figures' protocol (nbody/protocol.ts), the host
 * here holds the engine and answers messages; the worker wires it to
 * `postMessage` and a timer, and a page without workers runs it on the main
 * thread.
 *
 * Trails are recorded in the worker, after every step, in the frame the lab is
 * showing, so a trail in a turning frame shows the path as it looked from that
 * frame. Each body gets about 90 points a lap of its own orbit, whatever the
 * time warp.
 *
 * Units: AU, days, AU/day; rates in simulated days per real second.
 */

export type OrreryRequest =
  | { type: 'load'; bodies: readonly OrreryBody[]; method: MethodChoice; frame?: FrameSpec }
  /** Runs at `rate` days per second, sending a snapshot every `postEvery` seconds (default 1/30). */
  | { type: 'run'; rate: number; postEvery?: number }
  | { type: 'pause' }
  /** Runs `days` further at once (as far as about two seconds of work allows) and sends a snapshot. */
  | { type: 'advance'; days: number }
  | { type: 'frame'; frame: FrameSpec }
  | { type: 'method'; method: MethodChoice }
  | { type: 'add'; body: NewBodyOnOrbit }
  | { type: 'remove'; id: string }
  | { type: 'mass'; id: string; gm: number }
  | { type: 'velocity'; id: string; v: Vec3 }
  | { type: 'circular'; id: string }
  | { type: 'undo' };

export interface OrrerySnapshot {
  type: 'state';
  t: number;
  steps: number;
  ids: string[];
  names: string[];
  colours: string[];
  radii: number[];
  gm: Float64Array;
  x: Float64Array;
  v: Float64Array;
  /** New trail points since the last snapshot, five numbers each: body index, time (days), x, y, z in the frame (AU). */
  trail: Float64Array;
  /** The trails start again (after a load, an edit or a new frame). */
  trailReset: boolean;
  energyError: number;
  angularMomentumError: number;
  method: OrreryMethod;
  choice: MethodChoice;
  /** The integrator's step, days. */
  stepSize: number;
  /** Events since the last snapshot. */
  events: OrreryEvent[];
  running: boolean;
  /** Simulated days per real second actually achieved lately: below the rate asked for when the computer can't keep up. */
  achievedRate: number;
  canUndo: boolean;
  /** A time to go once round the system's fastest orbit, days: for sizing the time warp. */
  timescale: number;
  size: number;
}

export type OrreryMessage = OrrerySnapshot | { type: 'error'; message: string };

/** Most trail points per body in one snapshot; more are thinned evenly. */
export const MAX_TRAIL_PER_BODY = 600;
const POINTS_PER_LAP = 90;

export interface OrreryHost {
  receive(request: OrreryRequest): void;
  /** Advances a running simulation by `seconds` of real time, working for at most `budgetMs` milliseconds. */
  tick(seconds: number, budgetMs?: number): void;
  readonly running: boolean;
}

/** A host that answers through `post`, timing its work with `now` (milliseconds). */
export function createOrreryHost(post: (message: OrreryMessage) => void, now: () => number): OrreryHost {
  let orrery: Orrery | null = null;
  let frame: FrameSpec = FIXED_FRAME;
  let running = false;
  let rate = 1;
  let postEvery = 1 / 30;
  let sincePost = 0;
  let sentEvents = 0;
  let trailReset = true;
  let points: number[][] = [];
  let last: number[] = [];
  let interval: number[] = [];
  let achieved = 0;
  let stepsSinceIntervals = 0;
  let count = 0;
  /** Where the running clock should be: steps overshoot it a little, and the next tick makes up for that. */
  let target = 0;

  const resetTrails = () => {
    if (!orrery) return;
    const n = orrery.ids.length;
    count = n;
    points = Array.from({ length: n }, () => []);
    last = new Array(n).fill(-Infinity);
    trailReset = true;
    measureIntervals();
  };

  /** How often to record each body: ~90 times a lap of its own orbit, or of the system's shortest timescale. */
  const measureIntervals = () => {
    if (!orrery) return;
    const s = orrery.system;
    const p = parentage(s.gm, s.x, s.v);
    interval = p.orbits.map((orbit) => (orbit && Number.isFinite(orbit.period) ? orbit.period : orrery!.timescale) / POINTS_PER_LAP);
    stepsSinceIntervals = 0;
  };

  const record = () => {
    if (!orrery) return;
    const s = orrery.system;
    if (++stepsSinceIntervals > 512) measureIntervals();
    let f: ReturnType<typeof frameOf> | null = null;
    for (let i = 0; i < s.n; i++) {
      if (s.t - last[i] < interval[i]) continue;
      f ??= frameOf(frame, orrery.ids, s.gm, s.x, s.v);
      const p = toFrame(f, [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]]);
      points[i].push(s.t, p[0], p[1], p[2]);
      last[i] = s.t;
    }
  };

  const snapshot = () => {
    if (!orrery) return;
    const s = orrery.system;
    const trail: number[] = [];
    points.forEach((list, i) => {
      const count = list.length / 4;
      const keep = Math.min(count, MAX_TRAIL_PER_BODY);
      for (let k = 0; k < keep; k++) {
        const at = keep === count ? k : Math.round(((k + 1) * count) / keep) - 1;
        trail.push(i, list[4 * at], list[4 * at + 1], list[4 * at + 2], list[4 * at + 3]);
      }
    });
    points = points.map(() => []);
    const events = orrery.events.slice(sentEvents);
    sentEvents = orrery.events.length;
    post({
      type: 'state',
      t: s.t,
      steps: orrery.steps,
      ids: [...orrery.ids],
      names: [...orrery.names],
      colours: [...orrery.colours],
      radii: [...orrery.radii],
      gm: Float64Array.from(s.gm),
      x: Float64Array.from(s.x),
      v: Float64Array.from(s.v),
      trail: Float64Array.from(trail),
      trailReset,
      energyError: orrery.energyError(),
      angularMomentumError: orrery.angularMomentumError(),
      method: orrery.method,
      choice: orrery.choice,
      stepSize: orrery.stepSize,
      events,
      running,
      achievedRate: achieved,
      canUndo: orrery.canUndo,
      timescale: orrery.timescale,
      size: orrery.size,
    });
    trailReset = false;
  };

  const guard = (work: () => void) => {
    try {
      work();
    } catch (error) {
      running = false;
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
      if (orrery) snapshot();
    }
  };

  /** An edit: the body count may change, so the trails start again. */
  const edit = (work: (o: Orrery) => void) => {
    if (!orrery) throw new Error('Nothing is loaded.');
    work(orrery);
    target = orrery.system.t;
    resetTrails();
    record();
    snapshot();
  };

  const afterStep = () => {
    // A merger changes the bodies: start the trails again.
    if (orrery && orrery.ids.length !== count) resetTrails();
    record();
  };

  return {
    get running() {
      return running;
    },
    receive(request) {
      guard(() => {
        switch (request.type) {
          case 'load':
            orrery = new Orrery(request.bodies, request.method);
            frame = request.frame ?? FIXED_FRAME;
            running = false;
            sentEvents = 0;
            achieved = 0;
            resetTrails();
            record();
            snapshot();
            return;
          case 'run':
            if (!orrery) throw new Error('Nothing is loaded.');
            if (!Number.isFinite(request.rate) || request.rate <= 0) throw new Error('The rate must be a positive number.');
            rate = request.rate;
            postEvery = request.postEvery ?? 1 / 30;
            if (!running) target = orrery.system.t;
            running = true;
            sincePost = 0;
            return;
          case 'pause':
            running = false;
            snapshot();
            return;
          case 'advance': {
            if (!orrery) throw new Error('Nothing is loaded.');
            running = false;
            const o = orrery;
            const stop = now() + 2000;
            o.advanceTo(o.system.t + request.days, () => now() < stop, afterStep);
            target = o.system.t;
            snapshot();
            return;
          }
          case 'frame':
            frame = request.frame;
            resetTrails();
            record();
            snapshot();
            return;
          case 'method':
            return edit((o) => o.setMethod(request.method));
          case 'add':
            return edit((o) => o.addOnOrbit(request.body));
          case 'remove':
            return edit((o) => o.remove(request.id));
          case 'mass':
            return edit((o) => o.setMass(request.id, request.gm));
          case 'velocity':
            return edit((o) => o.setVelocity(request.id, request.v));
          case 'circular':
            return edit((o) => o.circularise(request.id));
          case 'undo':
            return edit((o) => o.undo());
        }
      });
    },
    tick(seconds, budgetMs = 12) {
      if (!running || !orrery) return;
      guard(() => {
        const o = orrery!;
        const start = o.system.t;
        const stop = now() + budgetMs;
        target = Math.max(target, start - rate * seconds) + rate * seconds;
        // Falling behind: don't try to catch up later, just carry on from here.
        if (!o.advanceTo(target, () => now() < stop, afterStep)) target = o.system.t;
        const got = seconds > 0 ? (o.system.t - start) / seconds : 0;
        achieved = achieved === 0 ? got : 0.9 * achieved + 0.1 * got;
        sincePost += seconds;
        if (sincePost >= postEvery) {
          sincePost = 0;
          snapshot();
        }
      });
    },
  };
}
