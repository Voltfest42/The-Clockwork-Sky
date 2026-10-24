import { createStepper, METHODS, type Method } from '../core/integrate/steppers';

/**
 * A weight on a spring, stepped by Euler, leapfrog or RK4 (Toolkit figure
 * T4.1). Time is in swings (one full swing takes 1), position in units of the
 * starting stretch: the exact motion is cos(2π t). The pull of the spring is
 * −(2π)² x.
 */

export const SWING_STEPS = [8, 12, 16, 24, 32, 48, 64, 100, 200] as const;

/** How many swings the figure runs. */
export const SWINGS = 3;

const OMEGA = 2 * Math.PI;

/** The exact position at time t (swings). */
export function exactSpring(t: number): number {
  return Math.cos(OMEGA * t);
}

/** The energy of a state, as a fraction of the starting energy. */
function energy(x: number, v: number): number {
  return x * x + (v * v) / (OMEGA * OMEGA);
}

/** Steps the spring for `swings` swings at `stepsPerSwing` steps each: the positions after every step, and the energy at the end as a fraction of the start. */
export function stepSpring(method: Method, stepsPerSwing: number, swings = SWINGS): { points: { x: number; y: number }[]; energy: number } {
  const stepper = createStepper(method, 1, (x, out) => {
    out[0] = -OMEGA * OMEGA * x[0];
  });
  const x = Float64Array.from([1]);
  const v = Float64Array.from([0]);
  const dt = 1 / stepsPerSwing;
  const points = [{ x: 0, y: 1 }];
  for (let k = 1; k <= stepsPerSwing * swings; k++) {
    stepper.step(x, v, dt);
    points.push({ x: k * dt, y: x[0] });
  }
  return { points, energy: energy(x[0], v[0]) };
}

/** Each method's energy at the end of the run, as a fraction of the start. */
export function springEnergies(stepsPerSwing: number): Record<Method, number> {
  return Object.fromEntries(METHODS.map((m) => [m, stepSpring(m, stepsPerSwing).energy])) as Record<Method, number>;
}
