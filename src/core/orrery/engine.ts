import { createStepper, type Stepper } from '../integrate/steppers';
import { cross, norm, normalize, type Vec3 } from '../math/vec3';
import { angularMomentumError, energyError, reference, type Reference } from '../nbody/diagnostics';
import { createIas15, type Ias15 } from '../nbody/ias15';
import { createSystem, gravity, type NBodySystem } from '../nbody/system';
import { createWisdomHolman, jacobiOrder, type WisdomHolman } from '../nbody/wisdomHolman';
import { stateFromElements, type Elements } from '../orbits/elements';
import { isPlanetary, parentage, type Parentage } from './hierarchy';

/**
 * The Orrery's engine: a system of bodies with names, sizes and colours, run
 * by the integrator that suits it, with the things that happen along the way
 * (close encounters, collisions, escapes) written to a log.
 *
 * Units: AU, days and G·m in AU³/day² (the Sun's is about 2.96 × 10⁻⁴).
 *
 * - **Wisdom–Holman** for planetary systems: one heavy body with the others
 *   going round it. Fast and accurate for quiet systems, but blind to close
 *   encounters.
 * - **IAS15** for everything else: a pair of stars, three-body chaos, moons,
 *   and any planetary system where two bodies have come close. It picks its own
 *   step, so it is slower but accurate even through near-misses.
 * - **Leapfrog**, the method from Chapter 7, for comparison.
 *
 * On "automatic", the engine starts with Wisdom–Holman when the system is
 * planetary and IAS15 otherwise, and switches to IAS15 for good the first time
 * two bodies come within three Hill radii of each other.
 */

export type OrreryMethod = 'whfast' | 'ias15' | 'leapfrog';
export type MethodChoice = 'auto' | OrreryMethod;

export const METHOD_NAMES: Record<OrreryMethod, string> = { whfast: 'Wisdom–Holman', ias15: 'IAS15', leapfrog: 'Leapfrog' };

export interface OrreryBody {
  id: string;
  name: string;
  /** G·m, AU³/day². Zero for a test particle: pulled, but pulling nothing. */
  gm: number;
  /** Radius, AU; 0 for a point that never collides. */
  radius: number;
  colour: string;
  /** Position, AU, and velocity, AU/day. */
  x: Vec3;
  v: Vec3;
}

export interface OrreryEvent {
  /** Days since the start. */
  t: number;
  kind: 'encounter' | 'collision' | 'escape' | 'method' | 'edit';
  text: string;
}

/** A new body on an orbit about another. Angles in radians, a in AU. */
export interface NewBodyOnOrbit {
  name: string;
  gm: number;
  radius: number;
  colour: string;
  parent: string;
  orbit: Elements;
}

export const MAX_BODIES = 50;
/** The speed of light in AU/day: no body may be given a tenth of it. */
const LIGHT = 173.144_632_674;
/** Up to 200 solar masses. */
const MAX_GM = 200 * 2.959_122_082_855_911e-4;
const MAX_UNDO = 30;

interface Saved {
  bodies: OrreryBody[];
  t: number;
}

export class Orrery {
  ids: string[] = [];
  names: string[] = [];
  radii: number[] = [];
  colours: string[] = [];
  system: NBodySystem;
  choice: MethodChoice;
  method: OrreryMethod = 'ias15';
  /** Simulated days since the start. */
  t = 0;
  steps = 0;
  events: OrreryEvent[] = [];
  /** How far the system reaches (AU), and a time to go once round it (days): for scaling steps and judging escapes. */
  size = 1;
  timescale = 1;
  private ref!: Reference;
  private wh: WisdomHolman | null = null;
  private ias: Ias15 | null = null;
  private leap: Stepper | null = null;
  private dt = 1;
  private planetary = false;
  private hill: Float64Array = new Float64Array(0);
  private parents: Int32Array = new Int32Array(0);
  private root = 0;
  private near = new Map<string, { closest: number; t: number }>();
  /** For each pair last logged while bound to each other, the size of their orbit then: an unchanging pair isn't logged lap after lap. */
  private loggedOrbit = new Map<string, number>();
  private closestLogged = new Map<string, number>();
  private escaped = new Set<string>();
  private undoStack: Saved[] = [];
  private order: number[] = [];

  constructor(bodies: readonly OrreryBody[], choice: MethodChoice = 'auto') {
    this.choice = choice;
    this.system = createSystem([]);
    this.load(bodies);
  }

  /** The bodies now, with their states. */
  bodies(): OrreryBody[] {
    const s = this.system;
    return this.ids.map((id, i) => ({
      id,
      name: this.names[i],
      gm: s.gm[i],
      radius: this.radii[i],
      colour: this.colours[i],
      x: [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]],
      v: [s.v[3 * i], s.v[3 * i + 1], s.v[3 * i + 2]],
    }));
  }

  private load(bodies: readonly OrreryBody[]) {
    if (bodies.length === 0) throw new Error('A system needs at least one body.');
    if (bodies.length > MAX_BODIES) throw new Error(`The Orrery holds up to ${MAX_BODIES} bodies.`);
    if (new Set(bodies.map((b) => b.id)).size !== bodies.length) throw new Error('Every body needs its own id.');
    for (const b of bodies) checkBody(b);
    if (!bodies.some((b) => b.gm > 0)) throw new Error('At least one body needs a mass.');
    this.ids = bodies.map((b) => b.id);
    this.names = bodies.map((b) => b.name);
    this.radii = bodies.map((b) => b.radius);
    this.colours = bodies.map((b) => b.colour);
    const t = this.system.t;
    this.system = createSystem(bodies);
    this.system.t = t;
    this.rebuild();
  }

  /** Measures the system again and builds a fresh integrator: after a load, an edit or a merger. */
  private rebuild() {
    const s = this.system;
    const p = parentage(s.gm, s.x, s.v);
    this.parents = p.parent;
    this.hill = p.hill;
    this.root = p.root;
    this.planetary = isPlanetary(s.gm, p);
    this.measure(p);
    this.ref = reference(s);
    this.near.clear();
    this.loggedOrbit.clear();
    this.closestLogged.clear();
    this.method = this.choice === 'auto' ? (this.planetary && !this.anyClose() ? 'whfast' : 'ias15') : this.choice;
    this.makeIntegrator();
  }

  /** The system's size (AU) and its shortest orbital period (days), from where the bodies are now. */
  private measure(p: Parentage) {
    const s = this.system;
    let m = 0;
    const c = [0, 0, 0];
    for (let i = 0; i < s.n; i++) {
      m += s.gm[i];
      for (let k = 0; k < 3; k++) c[k] += s.gm[i] * s.x[3 * i + k];
    }
    let size = 0;
    for (let i = 0; i < s.n; i++) {
      if (s.gm[i] <= 0 && s.n > 1) continue;
      size = Math.max(size, Math.hypot(s.x[3 * i] - c[0] / m, s.x[3 * i + 1] - c[1] / m, s.x[3 * i + 2] - c[2] / m));
    }
    for (const orbit of p.orbits) if (orbit && orbit.a > 0) size = Math.max(size, orbit.a * (1 + orbit.e));
    this.size = size > 0 ? size : 1;
    // The shortest orbit, judged near periapsis, where an eccentric orbit moves fastest: a lap there takes P(1 − e)^1.5
    // (with e capped at 0.9: a body falling straight in has no orbit to speak of, and the crossing time below says more).
    let shortest = Infinity;
    for (const orbit of p.orbits) if (orbit && Number.isFinite(orbit.period)) shortest = Math.min(shortest, orbit.period * Math.pow(1 - Math.min(orbit.e, 0.9), 1.5));
    // Without any bound orbit, the time to fall across the system.
    const crossing = 2 * Math.PI * Math.sqrt(this.size ** 3 / m);
    this.timescale = Number.isFinite(shortest) && shortest > 0 ? Math.min(shortest, crossing) : crossing;
  }

  private makeIntegrator() {
    const s = this.system;
    const g = gravity(s.gm);
    this.wh = null;
    this.ias = null;
    this.leap = null;
    if (this.method === 'whfast') {
      this.order = jacobiOrder(s.gm, s.x);
      // The heaviest body must come first; parentage and jacobiOrder agree on it.
      this.wh = createWisdomHolman(s.gm, g, this.order);
      this.dt = this.timescale / 25;
    } else if (this.method === 'leapfrog') {
      this.leap = createStepper('leapfrog', s.x.length, g);
      this.dt = this.timescale / 300;
    } else {
      this.ias = createIas15(s.x.length, g, { dt: this.timescale / 100, minDt: this.timescale * 1e-13 });
    }
  }

  /** The step the integrator is using (or will try next), days. */
  get stepSize(): number {
    return this.ias ? this.ias.dt : this.dt;
  }

  energyError(): number {
    return energyError(this.system, this.ref);
  }

  angularMomentumError(): number {
    return angularMomentumError(this.system, this.ref);
  }

  /** Changes the integrator, carrying on from where the system is. */
  setMethod(choice: MethodChoice) {
    this.choice = choice;
    const before = this.method;
    this.rebuild();
    if (this.method !== before) this.log('method', `Switched to ${METHOD_NAMES[this.method]}.`);
  }

  /**
   * Runs until the simulated time reaches `target` (days), or `budget()`
   * says to stop (it is asked every few steps). `after` sees the system after
   * every step. Returns whether it got there.
   */
  advanceTo(target: number, budget: () => boolean = () => true, after?: (s: NBodySystem) => void, exact = false): boolean {
    // A merger replaces the system, so look it up afresh every step.
    let k = 0;
    while (this.system.t < target) {
      if (k++ % 8 === 7 && !budget()) return false;
      this.step(exact ? target - this.system.t : undefined);
      after?.(this.system);
    }
    return true;
  }

  /** One step of the current integrator, then the checks. With `limit`, the step is no longer than that (days). */
  step(limit?: number) {
    const s = this.system;
    let taken: number;
    if (this.wh) {
      taken = limit !== undefined ? Math.min(this.dt, limit) : this.dt;
      this.wh.step(s.x, s.v, taken);
    } else if (this.leap) {
      taken = limit !== undefined ? Math.min(this.dt, limit) : this.dt;
      this.leap.step(s.x, s.v, taken);
    } else {
      taken = this.ias!.step(s.x, s.v, limit);
    }
    s.t += taken;
    this.t = s.t;
    this.steps++;
    for (let i = 0; i < s.x.length; i++) {
      if (!Number.isFinite(s.x[i]) || !Number.isFinite(s.v[i])) throw new Error('The simulation broke down: a body was flung off to infinity. Undo, or try IAS15.');
    }
    this.checkCollisions();
    this.checkEncounters();
    if (this.steps % 64 === 0) this.checkEscapes();
    if (this.steps % 256 === 0) this.refreshHierarchy();
  }

  private refreshHierarchy() {
    const s = this.system;
    const p = parentage(s.gm, s.x, s.v);
    // A body that has started or stopped going round something other than the heaviest body: a capture, or a release.
    for (let i = 0; i < s.n; i++) {
      const was = this.parents[i];
      const now = p.parent[i];
      if (was === now || i === p.root || was === undefined) continue;
      if (now !== p.root && now >= 0) this.log('encounter', `${this.names[i]} has been caught by ${this.names[now]}, and is going round it.`);
      else if (was !== p.root && was >= 0) this.log('escape', `${this.names[i]} has broken free of ${this.names[was]}.`);
    }
    this.parents = p.parent;
    this.hill = p.hill;
    this.root = p.root;
    // Wisdom–Holman needs its bodies in order from the star outward: rebuild it if they have swapped.
    if (this.wh) {
      const order = jacobiOrder(s.gm, s.x);
      if (order.some((b, i) => b !== this.order[i])) {
        this.order = order;
        this.wh = createWisdomHolman(s.gm, gravity(s.gm), order);
      }
    }
  }

  private checkCollisions(): void {
    const s = this.system;
    for (let i = 0; i < s.n; i++) {
      if (this.radii[i] <= 0) continue;
      for (let j = i + 1; j < s.n; j++) {
        if (this.radii[j] <= 0) continue;
        const reach = this.radii[i] + this.radii[j];
        const dx = s.x[3 * j] - s.x[3 * i];
        const dy = s.x[3 * j + 1] - s.x[3 * i + 1];
        const dz = s.x[3 * j + 2] - s.x[3 * i + 2];
        if (dx * dx + dy * dy + dz * dz < reach * reach) {
          this.merge(i, j);
          return this.checkCollisions();
        }
      }
    }
  }

  /** Merges two bodies that have touched: their masses add, momentum is kept, and their volumes add. */
  private merge(i: number, j: number) {
    const s = this.system;
    const [big, small] = s.gm[j] > s.gm[i] ? [j, i] : [i, j];
    const m = s.gm[big] + s.gm[small];
    const bodies = this.bodies();
    const a = bodies[big];
    const b = bodies[small];
    const mix = (p: Vec3, q: Vec3): Vec3 =>
      m > 0 ? [(a.gm * p[0] + b.gm * q[0]) / m, (a.gm * p[1] + b.gm * q[1]) / m, (a.gm * p[2] + b.gm * q[2]) / m] : p;
    const merged: OrreryBody = { ...a, gm: m, x: mix(a.x, b.x), v: mix(a.v, b.v), radius: Math.cbrt(a.radius ** 3 + b.radius ** 3) };
    const rest = bodies.filter((_, k) => k !== small).map((body) => (body.id === a.id ? merged : body));
    this.log('collision', b.gm === 0 ? `${b.name} hit ${a.name}.` : `${b.name} and ${a.name} collided and merged.`);
    const t = s.t;
    this.load(rest);
    this.system.t = t;
  }

  /** Whether any pair of bodies (other than the star and a planet) is within three Hill radii now. */
  private anyClose(): boolean {
    const s = this.system;
    for (let i = 0; i < s.n; i++) {
      for (let j = i + 1; j < s.n; j++) {
        if (i === this.root || j === this.root || (s.gm[i] === 0 && s.gm[j] === 0)) continue;
        const zone = 3 * Math.max(this.hill[i], this.hill[j]);
        if (Math.hypot(s.x[3 * j] - s.x[3 * i], s.x[3 * j + 1] - s.x[3 * i + 1], s.x[3 * j + 2] - s.x[3 * i + 2]) < zone) return true;
      }
    }
    return false;
  }

  private checkEncounters() {
    const s = this.system;
    if (s.n < 2) return;
    for (let i = 0; i < s.n; i++) {
      for (let j = i + 1; j < s.n; j++) {
        if (s.gm[i] === 0 && s.gm[j] === 0) continue;
        // Pairs of planets (or a planet and a comet) are watched within three Hill radii of the heavier;
        // in a system with no single heavy body, within 5% of its size.
        let zone: number;
        if (this.planetary) {
          if (i === this.root || j === this.root || this.parents[i] === j || this.parents[j] === i) continue;
          zone = 3 * Math.max(this.hill[i], this.hill[j]);
        } else {
          zone = 0.05 * this.size;
        }
        if (!(zone > 0)) continue;
        const d = Math.hypot(s.x[3 * j] - s.x[3 * i], s.x[3 * j + 1] - s.x[3 * i + 1], s.x[3 * j + 2] - s.x[3 * i + 2]);
        const key = `${this.ids[i]}|${this.ids[j]}`;
        const close = this.near.get(key);
        if (d < zone) {
          if (!close) {
            this.near.set(key, { closest: d, t: s.t });
            if (this.method === 'whfast' && this.choice === 'auto') {
              this.log('method', `${this.names[i]} and ${this.names[j]} came within three Hill radii: switched to IAS15, which can follow a close encounter.`);
              this.method = 'ias15';
              const g = gravity(s.gm);
              this.wh = null;
              this.ias = createIas15(s.x.length, g, { dt: this.dt / 4, minDt: this.timescale * 1e-13 });
            }
          } else if (d < close.closest) {
            close.closest = d;
            close.t = s.t;
          }
        } else if (close && d > 1.2 * zone) {
          this.near.delete(key);
          const a = this.pairOrbit(i, j);
          const before = this.loggedOrbit.get(key);
          if (a > 0) this.loggedOrbit.set(key, a);
          else this.loggedOrbit.delete(key);
          // Skip a pass by a pair going round each other just as before, and one no closer than an earlier pass by the same pair.
          const best = this.closestLogged.get(key) ?? Infinity;
          if ((a > 0 && before !== undefined && Math.abs(a - before) < 0.05 * a) || close.closest > 0.9 * best) continue;
          this.closestLogged.set(key, close.closest);
          this.log('encounter', `${this.names[i]} and ${this.names[j]} passed within ${formatDistance(close.closest)} of each other.`, close.t);
        }
      }
    }
  }

  /** The semi-major axis of i and j's orbit about each other (AU), or −1 if they aren't bound. */
  private pairOrbit(i: number, j: number): number {
    const s = this.system;
    const mu = s.gm[i] + s.gm[j];
    const d = Math.hypot(s.x[3 * j] - s.x[3 * i], s.x[3 * j + 1] - s.x[3 * i + 1], s.x[3 * j + 2] - s.x[3 * i + 2]);
    const w = Math.hypot(s.v[3 * j] - s.v[3 * i], s.v[3 * j + 1] - s.v[3 * i + 1], s.v[3 * j + 2] - s.v[3 * i + 2]);
    const energy = (w * w) / 2 - mu / d;
    return energy < 0 ? -mu / (2 * energy) : -1;
  }

  private checkEscapes() {
    const s = this.system;
    for (let i = 0; i < s.n; i++) {
      if (this.escaped.has(this.ids[i])) continue;
      // A body in a pair that is leaving together hasn't escaped its partner.
      let paired = false;
      for (let k = 0; k < s.n && !paired; k++) if (k !== i && s.gm[k] > 0 && this.pairOrbit(i, k) > 0) paired = true;
      if (paired) continue;
      // The body against the centre of mass of all the others.
      let m = 0;
      const c = [0, 0, 0];
      const u = [0, 0, 0];
      for (let k = 0; k < s.n; k++) {
        if (k === i) continue;
        m += s.gm[k];
        for (let q = 0; q < 3; q++) {
          c[q] += s.gm[k] * s.x[3 * k + q];
          u[q] += s.gm[k] * s.v[3 * k + q];
        }
      }
      if (m <= 0) continue;
      const r = [0, 1, 2].map((q) => s.x[3 * i + q] - c[q] / m);
      const w = [0, 1, 2].map((q) => s.v[3 * i + q] - u[q] / m);
      const d = Math.hypot(r[0], r[1], r[2]);
      const energy = (w[0] ** 2 + w[1] ** 2 + w[2] ** 2) / 2 - (m + s.gm[i]) / d;
      const outward = r[0] * w[0] + r[1] * w[1] + r[2] * w[2] > 0;
      if (energy > 0 && outward && d > 3 * this.size) {
        this.escaped.add(this.ids[i]);
        this.log('escape', `${this.names[i]} has escaped: it is moving away faster than the others’ pull can ever bring it back.`);
      }
    }
  }

  private log(kind: OrreryEvent['kind'], text: string, t = this.system.t) {
    this.events.push({ t, kind, text });
  }

  // ——— Editing. Every edit can be undone. ———

  private save() {
    this.undoStack.push({ bodies: this.bodies(), t: this.system.t });
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  undo() {
    const saved = this.undoStack.pop();
    if (!saved) return;
    this.system.t = saved.t;
    this.load(saved.bodies);
    this.t = saved.t;
    this.escaped.clear();
    this.log('edit', 'Undid the last change.');
  }

  /** Replaces the system (keeping the clock), as one undoable edit. */
  replace(bodies: readonly OrreryBody[], what: string) {
    const before = this.bodies();
    this.save();
    try {
      this.load(bodies);
    } catch (error) {
      this.undoStack.pop();
      this.load(before);
      throw error;
    }
    this.escaped.clear();
    this.log('edit', what);
  }

  /** Adds a body on an orbit about another: its elements are measured from that body. */
  addOnOrbit(spec: NewBodyOnOrbit) {
    const bodies = this.bodies();
    if (bodies.length >= MAX_BODIES) throw new Error(`The Orrery holds up to ${MAX_BODIES} bodies.`);
    const parent = bodies.find((b) => b.id === spec.parent);
    if (!parent) throw new Error('Pick a body for it to go round.');
    const { a, e, i, node, peri, M } = spec.orbit;
    if (!(a > 0) || !Number.isFinite(a)) throw new Error('The orbit’s size must be more than zero.');
    if (!(e >= 0 && e < 1)) throw new Error('The eccentricity must be at least 0 and less than 1.');
    if (![i, node, peri, M].every(Number.isFinite)) throw new Error('The orbit’s angles must be numbers.');
    if (a * (1 - e) <= 1.5 * (parent.radius + spec.radius)) throw new Error(`That orbit would take it into ${parent.name}.`);
    if (a > 1e5) throw new Error('That orbit is too large: keep it under 100,000 AU.');
    const rel = stateFromElements(parent.gm + spec.gm, spec.orbit);
    const id = uniqueId(spec.name, bodies);
    const body: OrreryBody = {
      id,
      name: spec.name,
      gm: spec.gm,
      radius: spec.radius,
      colour: spec.colour,
      x: [parent.x[0] + rel.x[0], parent.x[1] + rel.x[1], parent.x[2] + rel.x[2]],
      v: [parent.v[0] + rel.v[0], parent.v[1] + rel.v[1], parent.v[2] + rel.v[2]],
    };
    this.replace([...bodies, body], `Added ${spec.name}, going round ${parent.name}.`);
    return id;
  }

  remove(id: string) {
    const bodies = this.bodies();
    const gone = bodies.find((b) => b.id === id);
    if (!gone) return;
    if (bodies.length === 1) throw new Error('The last body can’t be deleted.');
    this.replace(
      bodies.filter((b) => b.id !== id),
      `Deleted ${gone.name}.`,
    );
  }

  /** Changes a body's G·m (AU³/day²), leaving where it is and how it moves alone. */
  setMass(id: string, gm: number) {
    const bodies = this.bodies();
    const body = bodies.find((b) => b.id === id);
    if (!body) return;
    this.replace(
      bodies.map((b) => (b.id === id ? { ...b, gm } : b)),
      `Changed ${body.name}’s mass.`,
    );
  }

  /** Gives a body a new velocity (AU/day). */
  setVelocity(id: string, v: Vec3) {
    const bodies = this.bodies();
    const body = bodies.find((b) => b.id === id);
    if (!body) return;
    this.replace(
      bodies.map((b) => (b.id === id ? { ...b, v } : b)),
      `Changed ${body.name}’s velocity.`,
    );
  }

  /** Sets a body moving at the speed for a circular orbit about its parent, at its present distance, in the plane it was moving in. */
  circularise(id: string) {
    const s = this.system;
    const i = this.ids.indexOf(id);
    if (i < 0) return;
    const p = parentage(s.gm, s.x, s.v);
    const j = p.parent[i];
    if (j < 0) throw new Error(`${this.names[i]} is the heaviest body: it has nothing to go round.`);
    const mu = s.gm[i] + s.gm[j];
    const r: Vec3 = [s.x[3 * i] - s.x[3 * j], s.x[3 * i + 1] - s.x[3 * j + 1], s.x[3 * i + 2] - s.x[3 * j + 2]];
    const w: Vec3 = [s.v[3 * i] - s.v[3 * j], s.v[3 * i + 1] - s.v[3 * j + 1], s.v[3 * i + 2] - s.v[3 * j + 2]];
    let h = cross(r, w);
    if (norm(h) <= 1e-12 * norm(r) * norm(w) || norm(h) === 0) {
      // Moving straight towards or away from its parent: go round in the x–y plane (or the x–z plane, over a pole).
      const rh = normalize(r);
      h = Math.abs(rh[2]) > 0.99 ? [0, 1, 0] : [-rh[2] * rh[0], -rh[2] * rh[1], 1 - rh[2] * rh[2]];
    }
    const along = normalize(cross(h, r));
    const speed = Math.sqrt(mu / norm(r));
    const v: Vec3 = [s.v[3 * j] + speed * along[0], s.v[3 * j + 1] + speed * along[1], s.v[3 * j + 2] + speed * along[2]];
    const bodies = this.bodies();
    this.replace(
      bodies.map((b) => (b.id === id ? { ...b, v } : b)),
      `Made ${this.names[i]}’s orbit about ${this.names[j]} circular.`,
    );
  }

  /** The parent of each body, as of the last check (−1 for the heaviest). */
  get parentIndex(): Int32Array {
    return this.parents;
  }
}

function checkBody(b: OrreryBody) {
  if (!b.name) throw new Error('Every body needs a name.');
  if (!Number.isFinite(b.gm) || b.gm < 0) throw new Error(`${b.name} needs a mass of zero or more.`);
  if (b.gm > MAX_GM) throw new Error(`${b.name} is too heavy: keep masses under 200 times the Sun’s.`);
  if (!Number.isFinite(b.radius) || b.radius < 0) throw new Error(`${b.name} needs a size of zero or more.`);
  if (![...b.x, ...b.v].every(Number.isFinite)) throw new Error(`${b.name} has a position or velocity that isn’t a number.`);
  if (Math.hypot(...b.x) > 1e6) throw new Error(`${b.name} is too far away: keep everything within a million AU.`);
  if (Math.hypot(...b.v) > LIGHT / 10) throw new Error(`${b.name} is too fast: keep speeds under a tenth of the speed of light.`);
}

function uniqueId(name: string, bodies: readonly OrreryBody[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'body';
  let id = base;
  for (let k = 2; bodies.some((b) => b.id === id); k++) id = `${base}-${k}`;
  return id;
}

/** A distance in AU, in words with sensible units: "0.0021 AU (310,000 km)". */
export function formatDistance(au: number): string {
  const km = au * 149_597_870.7;
  if (km < 1e6) return `${Math.round(km).toLocaleString('en-GB')} km`;
  if (au < 0.1) return `${au.toPrecision(2)} AU (${(km / 1e6).toPrecision(2)} million km)`;
  return `${au.toPrecision(3)} AU`;
}
