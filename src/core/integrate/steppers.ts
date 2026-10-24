/**
 * Three ways to step a motion forward in time, for any system whose
 * acceleration depends only on where things are, x″ = a(x): planets under
 * gravity, a weight on a spring.
 *
 * - **Euler** (forward Euler): move along the current velocity, then change the
 *   velocity by the current acceleration. First order; on an orbit its energy
 *   grows every step, so the planet spirals outward.
 * - **Leapfrog** (kick–drift–kick, velocity Verlet): half a kick, a whole drift,
 *   half a kick. Second order and symplectic: its energy error wobbles but
 *   stays bounded, however long it runs. One acceleration per step, reused
 *   from the end of the step before.
 * - **RK4** (the classical Runge–Kutta method): tries the acceleration at four
 *   trial points and blends them. Fourth order, so very accurate for a given
 *   step, but not symplectic: on an orbit its energy creeps slowly away.
 *
 * Units are whatever the caller's are: positions in L, velocities in L/T,
 * accelerations in L/T², time steps in T. The state is two flat arrays of the
 * same length (x₀, y₀, z₀, x₁, …), changed in place.
 */

export type Method = 'euler' | 'leapfrog' | 'rk4';

export const METHODS: readonly Method[] = ['euler', 'leapfrog', 'rk4'];

/** Fills `out` with the acceleration at positions `x` (L/T²). */
export type Acceleration = (x: Float64Array, out: Float64Array) => void;

/** One stage inside a step, reported to `emit` when a figure shows the parts of a tick. */
export interface StepStage {
  /** A kick changes the velocity; a drift moves the positions; a probe is a trial position where RK4 tests the acceleration. */
  kind: 'kick' | 'drift' | 'probe';
  /** Copies of the positions (L) and velocities (L/T) after this stage, or at the probe. */
  x: Float64Array;
  v: Float64Array;
}

export interface Stepper {
  readonly method: Method;
  /** Advances x and v (in place) by dt. */
  step(x: Float64Array, v: Float64Array, dt: number, emit?: (stage: StepStage) => void): void;
  /** Forgets any cached acceleration: call after changing x from outside. */
  invalidate(): void;
  /** How many times the acceleration has been worked out: the cost. */
  readonly evaluations: number;
}

/** The order of accuracy: halve the step and the error over a fixed time shrinks 2^order times. */
export const ORDER: Record<Method, number> = { euler: 1, leapfrog: 2, rk4: 4 };

/** Accelerations worked out per step. */
export const EVALUATIONS_PER_STEP: Record<Method, number> = { euler: 1, leapfrog: 1, rk4: 4 };

/** A stepper for states of `size` numbers with the given acceleration. */
export function createStepper(method: Method, size: number, acceleration: Acceleration): Stepper {
  switch (method) {
    case 'euler':
      return euler(size, acceleration);
    case 'leapfrog':
      return leapfrog(size, acceleration);
    case 'rk4':
      return rk4(size, acceleration);
  }
}

const copy = (a: Float64Array) => Float64Array.from(a);

function euler(size: number, acceleration: Acceleration): Stepper {
  const a = new Float64Array(size);
  let evaluations = 0;
  return {
    method: 'euler',
    get evaluations() {
      return evaluations;
    },
    invalidate() {},
    step(x, v, dt, emit) {
      acceleration(x, a);
      evaluations++;
      for (let i = 0; i < size; i++) x[i] += v[i] * dt;
      emit?.({ kind: 'drift', x: copy(x), v: copy(v) });
      for (let i = 0; i < size; i++) v[i] += a[i] * dt;
      emit?.({ kind: 'kick', x: copy(x), v: copy(v) });
    },
  };
}

function leapfrog(size: number, acceleration: Acceleration): Stepper {
  const a = new Float64Array(size);
  let fresh = false;
  let evaluations = 0;
  return {
    method: 'leapfrog',
    get evaluations() {
      return evaluations;
    },
    invalidate() {
      fresh = false;
    },
    step(x, v, dt, emit) {
      if (!fresh) {
        acceleration(x, a);
        evaluations++;
      }
      const h = dt / 2;
      for (let i = 0; i < size; i++) v[i] += a[i] * h;
      emit?.({ kind: 'kick', x: copy(x), v: copy(v) });
      for (let i = 0; i < size; i++) x[i] += v[i] * dt;
      emit?.({ kind: 'drift', x: copy(x), v: copy(v) });
      acceleration(x, a);
      evaluations++;
      fresh = true;
      for (let i = 0; i < size; i++) v[i] += a[i] * h;
      emit?.({ kind: 'kick', x: copy(x), v: copy(v) });
    },
  };
}

function rk4(size: number, acceleration: Acceleration): Stepper {
  const xt = new Float64Array(size);
  const vt = new Float64Array(size);
  const k = Array.from({ length: 4 }, () => ({ dx: new Float64Array(size), dv: new Float64Array(size) }));
  let evaluations = 0;
  return {
    method: 'rk4',
    get evaluations() {
      return evaluations;
    },
    invalidate() {},
    step(x, v, dt, emit) {
      // Stage s probes at x + c·dt·(previous stage's velocity), with c = 0, ½, ½, 1.
      const c = [0, 0.5, 0.5, 1];
      for (let s = 0; s < 4; s++) {
        const prev = s === 0 ? null : k[s - 1];
        for (let i = 0; i < size; i++) {
          xt[i] = prev ? x[i] + c[s] * dt * prev.dx[i] : x[i];
          vt[i] = prev ? v[i] + c[s] * dt * prev.dv[i] : v[i];
        }
        emit?.({ kind: 'probe', x: copy(xt), v: copy(vt) });
        acceleration(xt, k[s].dv);
        evaluations++;
        k[s].dx.set(vt);
      }
      for (let i = 0; i < size; i++) {
        x[i] += (dt / 6) * (k[0].dx[i] + 2 * k[1].dx[i] + 2 * k[2].dx[i] + k[3].dx[i]);
        v[i] += (dt / 6) * (k[0].dv[i] + 2 * k[1].dv[i] + 2 * k[2].dv[i] + k[3].dv[i]);
      }
      emit?.({ kind: 'drift', x: copy(x), v: copy(v) });
    },
  };
}
