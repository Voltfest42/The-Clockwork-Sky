/**
 * A small nuclear reaction network (Chapter 22), integrated by the implicit
 * (backward) Euler method with Newton's method on each step.
 *
 * Abundances are molar, Y = X/A in moles per gram, so that Σ A·Y = 1 (every
 * nucleon counted once) whatever the reactions do; implicit Euler keeps that
 * sum exactly, as it keeps every linear invariant. A reaction's rate per gram
 * per second is R = k Π Y / Π nᵢ!, with k in s⁻¹ already holding the density
 * and N_A⟨σv⟩ (k = ρ N_A⟨σv⟩ for two bodies, ρ² N_A²⟨σv⟩ for three, λ for a
 * decay), and nᵢ! counting identical reactants.
 *
 * Networks are stiff: ¹³N decays in ten minutes while ¹⁴N waits a hundred
 * million years for a proton. Implicit Euler is stable at any step, so the
 * steps can grow with time to follow both.
 */

export interface NetReaction {
  /** Species consumed and made, as indices, repeated for identical nuclei. */
  from: readonly number[];
  to: readonly number[];
  /** The rate coefficient, s⁻¹ (see above). */
  k: number;
}

export interface Network {
  species: readonly string[];
  /** Mass numbers, for Σ A·Y = 1. */
  mass: readonly number[];
  reactions: readonly NetReaction[];
}

function factorialOfCounts(from: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const i of from) counts.set(i, (counts.get(i) ?? 0) + 1);
  let f = 1;
  for (const n of counts.values()) for (let j = 2; j <= n; j++) f *= j;
  return f;
}

/** A reaction's rate, mol g⁻¹ s⁻¹. */
export function reactionRate(r: NetReaction, Y: ArrayLike<number>): number {
  let rate = r.k / factorialOfCounts(r.from);
  for (const i of r.from) rate *= Y[i];
  return rate;
}

/** dY/dt for every species. */
export function derivatives(net: Network, Y: ArrayLike<number>): Float64Array {
  const out = new Float64Array(net.species.length);
  for (const r of net.reactions) {
    const R = reactionRate(r, Y);
    if (R === 0) continue;
    for (const i of r.from) out[i] -= R;
    for (const i of r.to) out[i] += R;
  }
  return out;
}

/** ∂(dY_i/dt)/∂Y_j, exactly. */
export function jacobian(net: Network, Y: ArrayLike<number>): Float64Array[] {
  const n = net.species.length;
  const J = Array.from({ length: n }, () => new Float64Array(n));
  for (const r of net.reactions) {
    const base = r.k / factorialOfCounts(r.from);
    // ∂R/∂Y_j: drop one factor of Y_j at a time.
    for (let a = 0; a < r.from.length; a++) {
      let d = base;
      for (let b = 0; b < r.from.length; b++) if (b !== a) d *= Y[r.from[b]];
      const j = r.from[a];
      for (const i of r.from) J[i][j] -= d;
      for (const i of r.to) J[i][j] += d;
    }
  }
  return J;
}

/** Solves A x = b by Gaussian elimination with partial pivoting (A and b are overwritten). */
export function solveLinear(A: Float64Array[], b: Float64Array): Float64Array {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    const piv = A[c][c];
    if (piv === 0) continue;
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / piv;
      if (f === 0) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = A[r][r] === 0 ? 0 : s / A[r][r];
  }
  return x;
}

/**
 * One implicit Euler step of length h (s): solves Y − Yₙ − h f(Y) = 0 by
 * Newton's method. Species marked fixed keep their abundance. Returns
 * undefined if Newton fails to converge.
 */
export function implicitStep(net: Network, Yn: ArrayLike<number>, h: number, fixed: readonly boolean[] = []): Float64Array | undefined {
  const n = net.species.length;
  const Y = Float64Array.from(Yn);
  for (let iter = 0; iter < 30; iter++) {
    const f = derivatives(net, Y);
    const J = jacobian(net, Y);
    const A = J.map((row, i) => {
      const out = new Float64Array(n);
      for (let j = 0; j < n; j++) out[j] = (i === j ? 1 : 0) - h * row[j];
      return out;
    });
    const g = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (fixed[i]) {
        A[i].fill(0);
        A[i][i] = 1;
        g[i] = 0;
      } else g[i] = -(Y[i] - Yn[i] - h * f[i]);
    }
    const d = solveLinear(A, g);
    let worst = 0;
    for (let i = 0; i < n; i++) {
      Y[i] += d[i];
      const scale = Math.max(Math.abs(Y[i]), 1e-30);
      worst = Math.max(worst, Math.abs(d[i]) / scale);
    }
    if (!Number.isFinite(worst)) return undefined;
    if (worst < 1e-10) {
      for (let i = 0; i < n; i++) if (Y[i] < 0) Y[i] = 0;
      return Y;
    }
  }
  return undefined;
}

export interface NetworkRun {
  /** Times, s, and the abundances (mol/g) at each. */
  t: number[];
  Y: Float64Array[];
}

export interface EvolveOptions {
  /** The first time to report, s; the steps start well before it. */
  tFirst?: number;
  /** How many times to report, evenly spaced in log t. */
  points?: number;
  fixed?: readonly boolean[];
  /** Stops once this returns true. */
  until?: (Y: Float64Array) => boolean;
}

/** Runs the network from Y₀ at t = 0 to tEnd (s), with steps that grow geometrically. */
export function evolveNetwork(net: Network, Y0: readonly number[], tEnd: number, o: EvolveOptions = {}): NetworkRun {
  const points = o.points ?? 120;
  const tFirst = o.tFirst ?? tEnd * 1e-9;
  const report = Array.from({ length: points }, (_, i) => tFirst * (tEnd / tFirst) ** (i / (points - 1)));
  const run: NetworkRun = { t: [0], Y: [Float64Array.from(Y0)] };
  let Y: Float64Array = Float64Array.from(Y0);
  let t = 0;
  let h = tFirst / 100;
  for (const target of report) {
    while (t < target * (1 - 1e-12)) {
      const step = Math.min(h, target - t);
      const next = implicitStep(net, Y, step, o.fixed);
      if (!next) {
        h /= 4;
        if (h < tFirst * 1e-12) throw new Error('the network failed to converge');
        continue;
      }
      Y = next;
      t += step;
      h = Math.min(step * 1.6, tEnd);
    }
    run.t.push(t);
    run.Y.push(Float64Array.from(Y));
    if (o.until?.(Y)) break;
  }
  return run;
}

/** Σ A·Y: 1 when every nucleon is counted. */
export function nucleonSum(net: Network, Y: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < net.species.length; i++) s += net.mass[i] * Y[i];
  return s;
}
