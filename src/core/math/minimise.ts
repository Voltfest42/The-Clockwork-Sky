/**
 * Nelder and Mead's downhill simplex (1965): finds a minimum of a function of a
 * few variables without its slopes, by moving a triangle (in two dimensions;
 * a tetrahedron in three) of trial points downhill, reflecting, stretching and
 * shrinking it. Good for fitting a handful of parameters to measurements,
 * including along the narrow curving valleys that a plain one-at-a-time search
 * gets stuck in.
 */
export function nelderMead(f: (x: readonly number[]) => number, start: readonly number[], steps: readonly number[], options: { tolerance?: number; maxEvaluations?: number } = {}): { x: number[]; value: number; evaluations: number } {
  const { tolerance = 1e-8, maxEvaluations = 2000 } = options;
  const n = start.length;
  let evaluations = 0;
  const value = (x: number[]) => {
    evaluations++;
    return f(x);
  };
  let simplex = [start.slice(), ...steps.map((s, k) => start.map((v, j) => (j === k ? v + s : v)))].map((x) => ({ x, v: value(x) }));
  while (evaluations < maxEvaluations) {
    simplex.sort((a, b) => a.v - b.v);
    const best = simplex[0];
    const worst = simplex[n];
    if (Math.abs(worst.v - best.v) <= tolerance * (Math.abs(best.v) + tolerance)) break;
    const centroid = Array.from({ length: n }, (_, j) => simplex.slice(0, n).reduce((a, p) => a + p.x[j], 0) / n);
    const along = (t: number) => centroid.map((c, j) => c + t * (worst.x[j] - c));
    const reflected = along(-1);
    const vr = value(reflected);
    if (vr < best.v) {
      const expanded = along(-2);
      const ve = value(expanded);
      simplex[n] = ve < vr ? { x: expanded, v: ve } : { x: reflected, v: vr };
    } else if (vr < simplex[n - 1].v) {
      simplex[n] = { x: reflected, v: vr };
    } else {
      const contracted = vr < worst.v ? along(-0.5) : along(0.5);
      const vc = value(contracted);
      if (vc < Math.min(vr, worst.v)) simplex[n] = { x: contracted, v: vc };
      else simplex = simplex.map((p, k) => (k === 0 ? p : { x: p.x.map((v, j) => best.x[j] + 0.5 * (v - best.x[j])), v: 0 })).map((p, k) => (k === 0 ? p : { x: p.x, v: value(p.x) }));
    }
  }
  simplex.sort((a, b) => a.v - b.v);
  return { x: simplex[0].x, value: simplex[0].v, evaluations };
}
