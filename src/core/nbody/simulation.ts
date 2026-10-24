import { createStepper, type Method, type Stepper, type StepStage } from '../integrate/steppers';
import { angularMomentumError, energyError, reference, type Reference } from './diagnostics';
import { cloneSystem, createSystem, gravity, type BodySpec, type NBodySystem } from './system';

/**
 * A running n-body simulation: a system, a method and a fixed time step,
 * with the energy and angular momentum it started with, so it can say how far
 * it has drifted. Units are the system's (see system.ts): time steps in T.
 */
export class Simulation {
  system: NBodySystem;
  method: Method;
  /** Time step, T. */
  dt: number;
  steps = 0;
  private stepper: Stepper;
  private ref: Reference;

  constructor(bodies: readonly BodySpec[] | NBodySystem, method: Method, dt: number) {
    checkStep(dt);
    this.system = 'n' in bodies ? cloneSystem(bodies) : createSystem(bodies);
    this.method = method;
    this.dt = dt;
    this.stepper = createStepper(method, this.system.x.length, gravity(this.system.gm));
    this.ref = reference(this.system);
  }

  /** Takes `count` steps of dt. `emit` sees the stages inside each step (see steppers.ts). */
  advance(count = 1, emit?: (stage: StepStage) => void, after?: (s: NBodySystem) => void): void {
    const s = this.system;
    for (let k = 0; k < count; k++) {
      this.stepper.step(s.x, s.v, this.dt, emit);
      s.t += this.dt;
      this.steps++;
      after?.(s);
    }
  }

  /** Changes the method or the time step, carrying on from where the system is. */
  configure(method: Method, dt: number): void {
    checkStep(dt);
    if (method !== this.method) this.stepper = createStepper(method, this.system.x.length, gravity(this.system.gm));
    this.method = method;
    this.dt = dt;
  }

  /** Changes bodies' masses, positions or velocities. The energy and angular momentum to measure drift against start again. */
  edit(changes: readonly { index: number; gm?: number; x?: readonly number[]; v?: readonly number[] }[]): void {
    const s = this.system;
    for (const c of changes) {
      if (!Number.isInteger(c.index) || c.index < 0 || c.index >= s.n) throw new Error(`There is no body ${c.index + 1}.`);
      if (c.gm !== undefined) {
        if (!Number.isFinite(c.gm) || c.gm < 0) throw new Error(`Body ${c.index + 1} needs a mass of zero or more.`);
        s.gm[c.index] = c.gm;
      }
      for (const [key, values] of [['x', c.x], ['v', c.v]] as const) {
        if (!values) continue;
        if (values.length !== 3 || values.some((q) => !Number.isFinite(q))) throw new Error(`Body ${c.index + 1} has a position or velocity that isn’t a number.`);
        s[key].set(values, 3 * c.index);
      }
    }
    if (changes.some((c) => c.gm !== undefined)) this.stepper = createStepper(this.method, s.x.length, gravity(s.gm));
    this.stepper.invalidate();
    this.ref = reference(s);
  }

  /** The energy's drift since the start (or the last edit), as a signed fraction. */
  energyError(): number {
    return energyError(this.system, this.ref);
  }

  /** The angular momentum's drift, as a fraction of its starting length. */
  angularMomentumError(): number {
    return angularMomentumError(this.system, this.ref);
  }

  /** Whether every position and velocity is still a finite number. */
  finite(): boolean {
    const { x, v } = this.system;
    for (let i = 0; i < x.length; i++) if (!Number.isFinite(x[i]) || !Number.isFinite(v[i])) return false;
    return true;
  }
}

function checkStep(dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) throw new Error('The time step must be a positive number.');
}
