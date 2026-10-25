import type { Acceleration } from '../integrate/steppers';

/**
 * IAS15 (Rein & Spiegel 2015): a 15th-order integrator that picks its own
 * step, built on Everhart's (1985) Gauss–Radau method. For close encounters,
 * collisions-in-waiting and chaotic few-body systems, where no fixed step
 * would do.
 *
 * Over one step, each body's acceleration is written as a polynomial in time
 * (of degree 7), fitted through the accelerations at eight points of the step
 * placed at Gauss–Radau spacings. Integrating the polynomial twice gives the
 * positions and velocities; the positions at the eight points need the
 * polynomial, so the fit and the positions are improved together until they
 * stop changing (a predictor–corrector loop). The size of the last term says
 * how large the error is, and the next step is sized so that the error stays
 * below double-precision round-off: about 10⁻¹⁶ of the motion per step.
 *
 * Units are the caller's: positions in L, velocities in L/T, accelerations in
 * L/T², steps in T. Steps can be negative, to run backwards in time.
 */

/** The Gauss–Radau spacings: where in the step (as a fraction) the accelerations are taken. */
export const RADAU_SPACINGS = [
  0, 0.05626256053692215, 0.18024069173689236, 0.3526247171131696, 0.5471536263305554,
  0.7342101772154105, 0.8853209468390958, 0.9775206135612875,
] as const;

const H = RADAU_SPACINGS;

/**
 * The fitted polynomial, a(h) = a₀ + Σ bⱼ h^(j+1), is built up in Newton's
 * divided-difference form, a(h) = a₀ + g₀h + g₁h(h − h₁) + g₂h(h − h₁)(h − h₂) + …
 * C turns the g's into the b's: C[j][k] is the coefficient of h^(j+1) in
 * h(h − h₁)…(h − hₖ). D = C⁻¹ turns them back.
 */
const C: number[][] = (() => {
  const m = Array.from({ length: 7 }, () => new Array<number>(7).fill(0));
  // poly holds the coefficients of h(h − h₁)…(h − hₖ), lowest power first.
  let poly = [0, 1];
  for (let k = 0; k < 7; k++) {
    if (k > 0) {
      const next = new Array<number>(poly.length + 1).fill(0);
      for (let p = 0; p < poly.length; p++) {
        next[p + 1] += poly[p];
        next[p] -= H[k] * poly[p];
      }
      poly = next;
    }
    for (let j = 0; j <= k; j++) m[j][k] = poly[j + 1];
  }
  return m;
})();

const D: number[][] = (() => {
  // Back-substitution on the upper-triangular C, whose diagonal is all ones.
  const d: number[][] = Array.from({ length: 7 }, (_, i) => Array.from({ length: 7 }, (_, j) => (i === j ? 1 : 0)));
  for (let col = 0; col < 7; col++) {
    for (let row = col - 1; row >= 0; row--) {
      let s = 0;
      for (let k = row + 1; k <= col; k++) s += C[row][k] * d[k][col];
      d[row][col] = -s;
    }
  }
  return d;
})();

/** The coefficients' divisors when integrating once (velocity) and twice (position). */
const V_DIV = [2, 3, 4, 5, 6, 7, 8];
const X_DIV = [6, 12, 20, 30, 42, 56, 72];

const BINOMIAL = (() => {
  const b = Array.from({ length: 9 }, () => new Array<number>(9).fill(0));
  for (let n = 0; n < 9; n++) {
    b[n][0] = 1;
    for (let k = 1; k <= n; k++) b[n][k] = b[n - 1][k - 1] + (k < n ? b[n - 1][k] : 0);
  }
  return b;
})();

export interface Ias15Options {
  /** The error allowed per step, relative to the acceleration: 10⁻⁹ by default, as in REBOUND. */
  epsilon?: number;
  /** The first step, T. It adapts from there. */
  dt: number;
  /** The smallest step allowed, |T|: smaller means the run has hit a collision or a singularity. */
  minDt?: number;
}

export interface Ias15 {
  /**
   * Takes one step (repeating it with a smaller step if the first try was too
   * large) and returns the step taken, T. With `limit`, the step is no longer
   * than that, to land on a time exactly.
   */
  step(x: Float64Array, v: Float64Array, limit?: number): number;
  /** The step it will try next, T. */
  dt: number;
  /** Forgets everything carried between steps: call after changing the state from outside. */
  invalidate(): void;
  readonly evaluations: number;
}

/** A safety factor: a step that would need to shrink by more than this is redone; growth is capped at its inverse. */
const SAFETY = 0.25;

export function createIas15(size: number, acceleration: Acceleration, options: Ias15Options): Ias15 {
  const epsilon = options.epsilon ?? 1e-9;
  const minDt = options.minDt ?? 0;
  const a0 = new Float64Array(size);
  const at = new Float64Array(size);
  const xs = new Float64Array(size);
  const csx = new Float64Array(size);
  const csv = new Float64Array(size);
  const b = Array.from({ length: 7 }, () => new Float64Array(size));
  const g = Array.from({ length: 7 }, () => new Float64Array(size));
  const tmp = new Float64Array(7);
  let fresh = false;
  let evaluations = 0;
  let dt = options.dt;

  const gFromB = () => {
    for (let k = 0; k < size; k++) {
      for (let j = 0; j < 7; j++) {
        let s = 0;
        for (let m = j; m < 7; m++) s += D[j][m] * b[m][k];
        g[j][k] = s;
      }
    }
  };

  const reset = () => {
    for (let j = 0; j < 7; j++) {
      b[j].fill(0);
      g[j].fill(0);
    }
    csx.fill(0);
    csv.fill(0);
    fresh = false;
  };

  const add = (target: Float64Array, cs: Float64Array, k: number, delta: number) => {
    // Kahan's compensated summation, so round-off doesn't build up over millions of steps.
    const y = delta - cs[k];
    const t = target[k] + y;
    cs[k] = t - target[k] - y;
    target[k] = t;
  };

  const self: Ias15 = {
    get dt() {
      return dt;
    },
    set dt(value: number) {
      dt = value;
    },
    get evaluations() {
      return evaluations;
    },
    invalidate: reset,
    step(x, v, limit) {
      if (!fresh) {
        acceleration(x, a0);
        evaluations++;
        fresh = true;
      }
      let h = dt;
      if (limit !== undefined && Math.abs(h) > Math.abs(limit)) h = limit;
      for (let attempt = 0; attempt < 50; attempt++) {
        if (!Number.isFinite(h) || Math.abs(h) < minDt || h === 0) throw new Error('The time step shrank to nothing: two bodies have probably collided.');
        // The predictor–corrector loop.
        let previous = Infinity;
        for (let iteration = 0; iteration < 12; iteration++) {
          let maxDelta = 0;
          let maxA = 0;
          for (let n = 1; n < 8; n++) {
            const hn = H[n];
            for (let k = 0; k < size; k++) {
              const s =
                b[0][k] / 6 + hn * (b[1][k] / 12 + hn * (b[2][k] / 20 + hn * (b[3][k] / 30 + hn * (b[4][k] / 42 + hn * (b[5][k] / 56 + (hn * b[6][k]) / 72)))));
              xs[k] = x[k] + h * hn * (v[k] + h * hn * (a0[k] / 2 + hn * s));
            }
            acceleration(xs, at);
            evaluations++;
            for (let k = 0; k < size; k++) {
              // The new divided difference g[n − 1], from this point's acceleration.
              let d = (at[k] - a0[k]) / hn;
              for (let m = 1; m < n; m++) d = (d - g[m - 1][k]) / (hn - H[m]);
              const change = d - g[n - 1][k];
              g[n - 1][k] = d;
              for (let j = 0; j < n; j++) b[j][k] += C[j][n - 1] * change;
              if (n === 7) {
                maxDelta = Math.max(maxDelta, Math.abs(change));
                maxA = Math.max(maxA, Math.abs(at[k]));
              }
            }
          }
          const error = maxA > 0 ? maxDelta / maxA : 0;
          if (error < 1e-16 || (iteration > 1 && error >= previous)) break;
          previous = error;
        }

        // How large the last term is, against the accelerations: the step's error.
        let maxB6 = 0;
        let maxA = 0;
        for (let k = 0; k < size; k++) {
          maxB6 = Math.max(maxB6, Math.abs(b[6][k]));
          maxA = Math.max(maxA, Math.abs(at[k]));
        }
        const error = maxA > 0 ? maxB6 / maxA : 0;
        let next = error > 0 && Number.isFinite(error) ? h * Math.pow(epsilon / error, 1 / 7) : h / SAFETY;
        if (!Number.isFinite(next)) next = h * SAFETY;
        if (Math.abs(next / h) < SAFETY) {
          // Too large a step: shrink it and try again, with the fit rescaled to the new step.
          const q = next / h;
          for (let j = 0; j < 7; j++) {
            const f = Math.pow(q, j + 1);
            for (let k = 0; k < size; k++) b[j][k] *= f;
          }
          gFromB();
          h = next;
          continue;
        }
        if (Math.abs(next / h) > 1 / SAFETY) next = h / SAFETY;

        // Accept: move to the end of the step.
        for (let k = 0; k < size; k++) {
          let sx = a0[k] / 2;
          let sv = a0[k];
          for (let j = 0; j < 7; j++) {
            sx += b[j][k] / X_DIV[j];
            sv += b[j][k] / V_DIV[j];
          }
          add(x, csx, k, h * v[k] + h * h * sx);
          add(v, csv, k, h * sv);
        }
        acceleration(x, a0);
        evaluations++;

        // A step cut short to land on a time leaves the step size to come as it was.
        dt = limit !== undefined && h === limit && Math.abs(dt) > Math.abs(next) ? dt : next;
        // Start the next step's fit from this one's, shifted along: a(1 + q·h′) written as a polynomial in h′.
        const q = dt / h;
        for (let k = 0; k < size; k++) {
          for (let j = 0; j < 7; j++) tmp[j] = b[j][k];
          for (let j = 0; j < 7; j++) {
            let s = 0;
            for (let m = j; m < 7; m++) s += tmp[m] * BINOMIAL[m + 1][j + 1];
            b[j][k] = s * Math.pow(q, j + 1);
          }
        }
        gFromB();
        return h;
      }
      throw new Error('The integrator couldn’t find a step small enough.');
    },
  };
  return self;
}
