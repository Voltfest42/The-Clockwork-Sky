import { discAxis, GalaxyEncounter, KMS_KPC, ringReading, type EncounterSpec, type Fates, type GalaxySpec, type RingReading } from './restricted';

/**
 * The colliding galaxies' message protocol (Figure 31.1, and later the
 * Orrery's galaxy mode), spoken between the figure and the Web Worker that
 * steps the encounter. The host holds the encounter and answers; the worker
 * only wires it to `postMessage` and a timer, and a page without workers runs
 * the same host on the main thread. Units: kpc, Myr, M☉; speeds in km/s.
 */

export type CollisionPreset = 'antennae' | 'mice' | 'ring' | 'flyby';

/** One disc's orientation to the orbit: Toomre & Toomre's tilt i (0–90°) and ω, and which way it turns. */
export interface DiscSetting {
  tilt: number;
  omega: number;
  /** 1: turning with the orbit (for tilts below 90°); −1: against it. */
  spin: 1 | -1;
}

export interface CollisionConfig {
  /** The preset it started from (its name is shown while nothing is changed). */
  preset: CollisionPreset;
  /** The companion's mass as a share of the main galaxy's. */
  massRatio: number;
  /** Closest approach, kpc. */
  pericentre: number;
  /** The orbit's eccentricity: below 1 bound, 1 parabolic. */
  eccentricity: number;
  main: DiscSetting;
  /** The companion's disc, or null for a companion without one. */
  companion: DiscSetting | null;
  friction: boolean;
  /** Stars in all. */
  stars: number;
  /** How long to follow it after the closest approach, Myr. */
  duration: number;
  seed: number;
}

/** The main galaxy: 2 × 10¹¹ M☉ in a Plummer sphere of scale 6 kpc, its disc from 4 to 20 kpc. A companion is scaled by the cube root of its mass. */
export const MAIN_GALAXY = { mass: 2e11, scale: 6, inner: 4, outer: 20 } as const;
/** The Coulomb logarithm for the galaxies' friction. */
export const COLLISION_LN_LAMBDA = 2;

export const COLLISION_PRESETS: Record<CollisionPreset, Omit<CollisionConfig, 'stars' | 'seed'>> = {
  // Toomre & Toomre (1972): equal masses, e = 0.5, both discs at i = 60°, ω = −30°, reaching 0.75 of the closest approach
  antennae: { preset: 'antennae', massRatio: 1, pericentre: 26, eccentricity: 0.5, main: { tilt: 60, omega: -30, spin: 1 }, companion: { tilt: 60, omega: -30, spin: 1 }, friction: true, duration: 1500 },
  // Toomre & Toomre (1972): equal masses, e = 0.6, i = 15° and 60°, ω = −90°, discs reaching 0.7 of the closest approach
  mice: { preset: 'mice', massRatio: 1, pericentre: 28, eccentricity: 0.6, main: { tilt: 15, omega: -90, spin: 1 }, companion: { tilt: 60, omega: -90, spin: 1 }, friction: true, duration: 2000 },
  // A companion a third as heavy, fast, through the middle along the disc's axis (Lynds & Toomre 1976)
  ring: { preset: 'ring', massRatio: 0.3, pericentre: 1, eccentricity: 2, main: { tilt: 90, omega: 0, spin: 1 }, companion: null, friction: true, duration: 600 },
  // A companion a third as heavy passing once, prograde, in the disc's plane
  flyby: { preset: 'flyby', massRatio: 0.3, pericentre: 30, eccentricity: 1, main: { tilt: 0, omega: 0, spin: 1 }, companion: null, friction: true, duration: 1200 },
};

export const STAR_CHOICES = [20_000, 50_000, 100_000] as const;

export const COLLISION_DEFAULTS: CollisionConfig = { ...COLLISION_PRESETS.antennae, stars: 20_000, seed: 1 };

/** The galaxies' Plummer spheres and discs for a configuration. */
export function collisionGalaxies(config: CollisionConfig): [GalaxySpec, GalaxySpec] {
  const both = config.companion !== null;
  const mainStars = both ? Math.round(config.stars / 2) : config.stars;
  const k = Math.cbrt(config.massRatio);
  const axis = (d: DiscSetting, plusX: boolean) => {
    const a = discAxis(d.tilt, d.omega, plusX);
    return [d.spin * a[0], d.spin * a[1], d.spin * a[2]] as const;
  };
  const main: GalaxySpec = {
    mass: MAIN_GALAXY.mass,
    scale: MAIN_GALAXY.scale,
    disc: { inner: MAIN_GALAXY.inner, outer: MAIN_GALAXY.outer, axis: axis(config.main, true), count: mainStars },
  };
  const companion: GalaxySpec = {
    mass: MAIN_GALAXY.mass * config.massRatio,
    scale: MAIN_GALAXY.scale * k,
    disc: config.companion
      ? { inner: MAIN_GALAXY.inner * k, outer: MAIN_GALAXY.outer * k, axis: axis(config.companion, false), count: config.stars - mainStars }
      : undefined,
  };
  return [main, companion];
}

export function encounterSpec(config: CollisionConfig): EncounterSpec {
  const galaxies = collisionGalaxies(config);
  return {
    galaxies,
    pericentre: config.pericentre,
    eccentricity: config.eccentricity,
    friction: config.friction,
    lnLambda: COLLISION_LN_LAMBDA,
    startSeparation: Math.max(3 * MAIN_GALAXY.outer, 2 * config.pericentre),
    seed: config.seed,
  };
}

export type CollisionRequest =
  | { type: 'load'; config: CollisionConfig }
  /** Runs at `rate` Myr of the encounter per second of real time, computing for at most `budget` ms per tick (default 30). */
  | { type: 'run'; rate: number; budget?: number }
  | { type: 'pause' }
  /** Runs to time t (Myr) at once, then sends a state (for tests and keyboard stepping). */
  | { type: 'advance'; t: number };

/** One reading of the encounter, every 10 Myr. */
export interface CollisionSample {
  /** Myr from the closest approach. */
  t: number;
  /** kpc. */
  separation: number;
  /** km/s. */
  speed: number;
  fates: Fates;
  /** The main galaxy's ring. */
  ring: RingReading;
}

export interface CollisionInfo {
  type: 'loaded';
  config: CollisionConfig;
  galaxies: [GalaxySpec, GalaxySpec];
  /** Which galaxy each star began in (0 main, 1 companion) and how far from its centre, kpc. */
  owner: Uint8Array;
  startRadius: Float32Array;
  /** When the run starts and ends, Myr from the closest approach. */
  start: number;
  end: number;
}

export interface CollisionState {
  type: 'state';
  t: number;
  /** Stars' positions about the pair's centre of mass, kpc. The galaxies' orbit turns about +z, and they are closest on the x axis. */
  positions: Float32Array;
  /** The two galaxies' centres, kpc. */
  centres: [number, number, number, number, number, number];
  samples: CollisionSample[];
  /** The closest the galaxies have come so far, kpc. */
  closest: number;
  /** When the galaxies became one, Myr, or null. */
  merged: number | null;
  running: boolean;
  ended: boolean;
}

export type CollisionMessage = CollisionInfo | CollisionState | { type: 'error'; message: string };

export const SAMPLE_EVERY = 10;

export interface CollisionHost {
  receive(request: CollisionRequest): void;
  tick(): void;
  readonly running: boolean;
}

/**
 * When two galaxies count as one: after the closest approach, once an
 * apocentre of their orbit falls within the sum of their scale radii, or they
 * stay within half of it for 100 Myr.
 */
export class MergerWatch {
  private last = Infinity;
  private rising = false;
  private closeSince: number | null = null;
  merged: number | null = null;
  private readonly reach: number;
  constructor(reach: number) {
    this.reach = reach;
  }
  see(t: number, d: number): void {
    if (this.merged !== null || t < 0) {
      this.last = d;
      return;
    }
    if (d < this.last) {
      if (this.rising && this.last < this.reach) this.merged = t;
      this.rising = false;
    } else if (d > this.last) this.rising = true;
    if (d < 0.5 * this.reach) {
      this.closeSince ??= t;
      if (t - this.closeSince >= 100) this.merged = t;
    } else this.closeSince = null;
    this.last = d;
  }
}

/** A host that answers requests through `post`; `now` is a clock in ms (performance.now). */
export function createCollisionHost(post: (message: CollisionMessage) => void, now: () => number = () => performance.now()): CollisionHost {
  let enc: GalaxyEncounter | null = null;
  let config: CollisionConfig | null = null;
  let end = 0;
  let running = false;
  let rate = 30;
  let budget = 30;
  let owed = 0;
  let lastTick = 0;
  let samples: CollisionSample[] = [];
  let nextSample = 0;
  let closest = Infinity;
  let watch = new MergerWatch(1);

  const sample = () => {
    const e = enc!;
    samples.push({ t: e.t, separation: e.separation(), speed: e.relativeSpeed() / KMS_KPC, fates: e.fates(), ring: ringReading(e, 0) });
    nextSample = e.t + SAMPLE_EVERY;
  };

  const state = () => {
    const e = enc!;
    const positions = Float32Array.from(e.stars.x);
    const c = e.pair.x;
    post({
      type: 'state',
      t: e.t,
      positions,
      centres: [c[0], c[1], c[2], c[3], c[4], c[5]],
      samples,
      closest,
      merged: watch.merged,
      running,
      ended: e.t >= end - 1e-9,
    });
    samples = [];
  };

  const stepOnce = () => {
    const e = enc!;
    e.step();
    const d = e.separation();
    closest = Math.min(closest, d);
    watch.see(e.t, d);
    if (e.t >= nextSample - 1e-9) sample();
    if (e.t >= end - 1e-9) running = false;
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
            config = request.config;
            enc = new GalaxyEncounter(encounterSpec(config));
            end = config.duration;
            running = false;
            samples = [];
            closest = enc.separation();
            const [A, B] = enc.spec.galaxies;
            watch = new MergerWatch(A.scale + B.scale);
            post({
              type: 'loaded',
              config,
              galaxies: [A, B],
              owner: Uint8Array.from(enc.stars.owner),
              startRadius: Float32Array.from(enc.stars.startRadius),
              start: enc.t,
              end,
            });
            sample();
            state();
            return;
          }
          case 'run':
            if (!enc) throw new Error('Nothing is loaded.');
            rate = request.rate;
            budget = request.budget ?? 30;
            running = enc.t < end - 1e-9;
            owed = 0;
            lastTick = now();
            return;
          case 'pause':
            running = false;
            if (enc) state();
            return;
          case 'advance':
            if (!enc) throw new Error('Nothing is loaded.');
            while (enc.t < Math.min(request.t, end) - 1e-9) stepOnce();
            state();
            return;
        }
      });
    },
    tick() {
      if (!running || !enc) return;
      guard(() => {
        const e = enc!;
        const t0 = now();
        owed += ((t0 - lastTick) / 1000) * rate;
        lastTick = t0;
        // Don't build up a debt while the page was busy or hidden
        owed = Math.min(owed, rate * 0.25);
        let stepped = false;
        while (owed >= e.dt && running) {
          stepOnce();
          stepped = true;
          owed -= e.dt;
          if (now() - t0 > budget) {
            owed = 0;
            break;
          }
        }
        if (stepped || !running) state();
      });
    },
  };
}
