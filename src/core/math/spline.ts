/**
 * A natural cubic spline through points (x₀ < x₁ < …): a smooth curve with
 * continuous slope and curvature, zero curvature at both ends. For reading a
 * smooth value and slope between a model's tabulated points (Model S's
 * pressure in Toolkit T8). Units are the caller's.
 */
export interface Spline {
  /** The value at x (clamped to the ends). */
  value(x: number): number;
  /** The slope dy/dx at x. */
  slope(x: number): number;
}

export function naturalSpline(xs: readonly number[], ys: readonly number[]): Spline {
  const n = xs.length;
  if (n < 2 || ys.length !== n) throw new RangeError('A spline needs at least two points, with as many values as positions');
  // Second derivatives by the tridiagonal (Thomas) algorithm.
  const m = new Float64Array(n);
  const c = new Float64Array(n);
  const d = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) {
    const h0 = xs[i] - xs[i - 1];
    const h1 = xs[i + 1] - xs[i];
    const a = h0 / 6;
    const b = (h0 + h1) / 3;
    const cc = h1 / 6;
    const rhs = (ys[i + 1] - ys[i]) / h1 - (ys[i] - ys[i - 1]) / h0;
    const denom = b - a * c[i - 1];
    c[i] = cc / denom;
    d[i] = (rhs - a * d[i - 1]) / denom;
  }
  for (let i = n - 2; i >= 1; i--) m[i] = d[i] - c[i] * m[i + 1];

  const locate = (x: number) => {
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  return {
    value(x) {
      const t = Math.min(xs[n - 1], Math.max(xs[0], x));
      const i = locate(t);
      const h = xs[i + 1] - xs[i];
      const a = (xs[i + 1] - t) / h;
      const b = (t - xs[i]) / h;
      return a * ys[i] + b * ys[i + 1] + (((a ** 3 - a) * m[i] + (b ** 3 - b) * m[i + 1]) * h * h) / 6;
    },
    slope(x) {
      const t = Math.min(xs[n - 1], Math.max(xs[0], x));
      const i = locate(t);
      const h = xs[i + 1] - xs[i];
      const a = (xs[i + 1] - t) / h;
      const b = (t - xs[i]) / h;
      return (ys[i + 1] - ys[i]) / h + ((-(3 * a * a - 1) * m[i] + (3 * b * b - 1) * m[i + 1]) * h) / 6;
    },
  };
}
