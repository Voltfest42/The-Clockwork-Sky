/**
 * Stepping solvers for ordinary differential equations y′ = f(x, y), the
 * workhorse of the structure core (Part III): the Lane–Emden equation, white
 * dwarfs and neutron stars, the four equations of a star.
 *
 * - `rk4Fixed`: the classical fourth-order Runge–Kutta method with a fixed step.
 * - `solveAdaptive`: the Dormand–Prince 5(4) pair (Dormand & Prince 1980), the
 *   method behind MATLAB's ode45 and SciPy's RK45. Each step makes a fifth- and
 *   a fourth-order estimate from the same seven trial slopes; their difference
 *   is the error, which sets the next step. It stops early when a `stop`
 *   condition is met, and reports each accepted step to `emit`.
 *
 * Units are the caller's: x in X, y in Y, f in Y/X.
 */

/** The right-hand side: writes dy/dx at (x, y) into `out`. */
export type Derivative = (x: number, y: Float64Array, out: Float64Array) => void;

/** One accepted step, for a figure that shows the solver at work. */
export interface OdeStep {
  x: number;
  /** A copy of the state at x. */
  y: Float64Array;
  /** The step just taken (X). */
  h: number;
}

/** Fixed-step RK4 from x0 over n steps of h. Returns every point, the start included. */
export function rk4Fixed(f: Derivative, x0: number, y0: readonly number[], h: number, n: number): OdeStep[] {
  const size = y0.length;
  const y = Float64Array.from(y0);
  const k1 = new Float64Array(size);
  const k2 = new Float64Array(size);
  const k3 = new Float64Array(size);
  const k4 = new Float64Array(size);
  const t = new Float64Array(size);
  const out: OdeStep[] = [{ x: x0, y: y.slice(), h: 0 }];
  let x = x0;
  for (let s = 0; s < n; s++) {
    f(x, y, k1);
    for (let i = 0; i < size; i++) t[i] = y[i] + 0.5 * h * k1[i];
    f(x + 0.5 * h, t, k2);
    for (let i = 0; i < size; i++) t[i] = y[i] + 0.5 * h * k2[i];
    f(x + 0.5 * h, t, k3);
    for (let i = 0; i < size; i++) t[i] = y[i] + h * k3[i];
    f(x + h, t, k4);
    for (let i = 0; i < size; i++) y[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    x += h;
    out.push({ x, y: y.slice(), h });
  }
  return out;
}

export interface AdaptiveOptions {
  /** Relative and absolute tolerances on each component (defaults 1e-9 and 1e-12). */
  rtol?: number;
  atol?: number;
  /** The first trial step (X); default a thousandth of the span. */
  h0?: number;
  /** The largest step allowed (X); default the whole span. */
  hMax?: number;
  /** Gives up after this many accepted steps (default 100,000). */
  maxSteps?: number;
  /** Stops after the first accepted step where this returns true; the step is kept. */
  stop?: (x: number, y: Float64Array) => boolean;
  /** Called with every accepted step, the start included. */
  emit?: (step: OdeStep) => void;
}

export interface AdaptiveResult {
  /** Every accepted step, the start included, with the slope at each (for Hermite interpolation). */
  steps: OdeStep[];
  slopes: Float64Array[];
  /** Why it ended: it reached x1, a stop condition fired, or it ran out of steps. */
  reason: 'end' | 'stop' | 'steps';
  /** Trial steps rejected for too large an error. */
  rejected: number;
  /** Times f was evaluated: the cost. */
  evaluations: number;
}

// Dormand–Prince 5(4) coefficients.
const C2 = 1 / 5;
const C3 = 3 / 10;
const C4 = 4 / 5;
const C5 = 8 / 9;
const A21 = 1 / 5;
const A31 = 3 / 40;
const A32 = 9 / 40;
const A41 = 44 / 45;
const A42 = -56 / 15;
const A43 = 32 / 9;
const A51 = 19372 / 6561;
const A52 = -25360 / 2187;
const A53 = 64448 / 6561;
const A54 = -212 / 729;
const A61 = 9017 / 3168;
const A62 = -355 / 33;
const A63 = 46732 / 5247;
const A64 = 49 / 176;
const A65 = -5103 / 18656;
const B1 = 35 / 384;
const B3 = 500 / 1113;
const B4 = 125 / 192;
const B5 = -2187 / 6784;
const B6 = 11 / 84;
// Fifth-order weights minus the fourth-order ones: the error estimate.
const E1 = 71 / 57600;
const E3 = -71 / 16695;
const E4 = 71 / 1920;
const E5 = -17253 / 339200;
const E6 = 22 / 525;
const E7 = -1 / 40;

/** Integrates y′ = f(x, y) from x0 to x1 (either direction) with adaptive Dormand–Prince steps. */
export function solveAdaptive(f: Derivative, x0: number, y0: readonly number[], x1: number, options: AdaptiveOptions = {}): AdaptiveResult {
  const { rtol = 1e-9, atol = 1e-12, maxSteps = 100_000, stop, emit } = options;
  const span = x1 - x0;
  const dir = Math.sign(span) || 1;
  const hMax = Math.abs(options.hMax ?? span);
  let h = dir * Math.min(Math.abs(options.h0 ?? span / 1000), hMax);
  const size = y0.length;
  let x = x0;
  const y = Float64Array.from(y0);
  const k1 = new Float64Array(size);
  const k2 = new Float64Array(size);
  const k3 = new Float64Array(size);
  const k4 = new Float64Array(size);
  const k5 = new Float64Array(size);
  const k6 = new Float64Array(size);
  const k7 = new Float64Array(size);
  const t = new Float64Array(size);
  const yNew = new Float64Array(size);
  let evaluations = 1;
  f(x, y, k1);
  const steps: OdeStep[] = [{ x, y: y.slice(), h: 0 }];
  const slopes: Float64Array[] = [k1.slice()];
  emit?.(steps[0]);
  let rejected = 0;
  let reason: AdaptiveResult['reason'] = 'end';

  while (dir * (x1 - x) > 0) {
    if (steps.length > maxSteps) {
      reason = 'steps';
      break;
    }
    if (dir * (x + h - x1) > 0) h = x1 - x;
    for (let i = 0; i < size; i++) t[i] = y[i] + h * A21 * k1[i];
    f(x + C2 * h, t, k2);
    for (let i = 0; i < size; i++) t[i] = y[i] + h * (A31 * k1[i] + A32 * k2[i]);
    f(x + C3 * h, t, k3);
    for (let i = 0; i < size; i++) t[i] = y[i] + h * (A41 * k1[i] + A42 * k2[i] + A43 * k3[i]);
    f(x + C4 * h, t, k4);
    for (let i = 0; i < size; i++) t[i] = y[i] + h * (A51 * k1[i] + A52 * k2[i] + A53 * k3[i] + A54 * k4[i]);
    f(x + C5 * h, t, k5);
    for (let i = 0; i < size; i++) t[i] = y[i] + h * (A61 * k1[i] + A62 * k2[i] + A63 * k3[i] + A64 * k4[i] + A65 * k5[i]);
    f(x + h, t, k6);
    for (let i = 0; i < size; i++) yNew[i] = y[i] + h * (B1 * k1[i] + B3 * k3[i] + B4 * k4[i] + B5 * k5[i] + B6 * k6[i]);
    f(x + h, yNew, k7);
    evaluations += 6;
    let err = 0;
    for (let i = 0; i < size; i++) {
      const e = h * (E1 * k1[i] + E3 * k3[i] + E4 * k4[i] + E5 * k5[i] + E6 * k6[i] + E7 * k7[i]);
      const scale = atol + rtol * Math.max(Math.abs(y[i]), Math.abs(yNew[i]));
      err = Math.max(err, Math.abs(e) / scale);
    }
    if (!Number.isFinite(err)) err = 1e10;
    if (err <= 1) {
      x += h;
      y.set(yNew);
      k1.set(k7); // first-same-as-last
      const step = { x, y: y.slice(), h };
      steps.push(step);
      slopes.push(k1.slice());
      emit?.(step);
      if (stop?.(x, y)) {
        reason = 'stop';
        break;
      }
    } else {
      rejected++;
    }
    const factor = err === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * err ** -0.2));
    h = dir * Math.min(Math.abs(h * factor), hMax);
    if (Math.abs(h) < 1e-14 * Math.max(1, Math.abs(x))) {
      reason = 'steps';
      break;
    }
  }
  return { steps, slopes, reason, rejected, evaluations };
}

/**
 * The state between two accepted steps by cubic Hermite interpolation, from
 * the values and slopes at each end: third-order accurate, enough to find
 * where a component crosses zero.
 */
export function hermite(xa: number, ya: Float64Array, fa: Float64Array, xb: number, yb: Float64Array, fb: Float64Array, x: number): { y: Float64Array; dy: Float64Array } {
  const h = xb - xa;
  const s = (x - xa) / h;
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
  const h10 = s ** 3 - 2 * s ** 2 + s;
  const h01 = -2 * s ** 3 + 3 * s ** 2;
  const h11 = s ** 3 - s ** 2;
  const d00 = (6 * s ** 2 - 6 * s) / h;
  const d10 = 3 * s ** 2 - 4 * s + 1;
  const d01 = (-6 * s ** 2 + 6 * s) / h;
  const d11 = 3 * s ** 2 - 2 * s;
  const y = new Float64Array(ya.length);
  const dy = new Float64Array(ya.length);
  for (let i = 0; i < ya.length; i++) {
    y[i] = h00 * ya[i] + h10 * h * fa[i] + h01 * yb[i] + h11 * h * fb[i];
    dy[i] = d00 * ya[i] + d10 * fa[i] + d01 * yb[i] + d11 * fb[i];
  }
  return { y, dy };
}
