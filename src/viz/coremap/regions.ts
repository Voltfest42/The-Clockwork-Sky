import { dominantPressure, type Mix, type Regime } from '../../core/structure/eos';

/**
 * The core's map's regions, worked out from the equations of state: for each
 * column of the map (log₁₀ T), the stretches of log₁₀ ρ where each pressure
 * dominates, with the boundaries found by bisection, so the edges are smooth
 * at any size. Densities on the map are in g/cm³ (water is 1), as astronomers
 * quote them; the equations of state take kg/m³.
 */

/** Each region's name on the map. */
export const REGIME_NAMES: Record<Regime, string> = {
  gas: 'Hot gas',
  radiation: 'Light',
  degenerate: 'Packed electrons',
  relativistic: 'Packed electrons near light speed',
};

export interface RegionRun {
  regime: Regime;
  /** The column's left edge and width in log T, and the run's bottom and top in log ρ (g/cm³). */
  x: number;
  width: number;
  y0: number;
  y1: number;
}

export interface Boundary {
  /** The two regimes either side, lower first. */
  between: [Regime, Regime];
  points: { x: number; y: number }[];
}

export interface CoreMapRegions {
  runs: RegionRun[];
  boundaries: Boundary[];
  /** Where to write each regime's name: a point well inside it. */
  labels: Partial<Record<Regime, { x: number; y: number }>>;
}

/** The regime at log₁₀ T = x and log₁₀ ρ = y (g/cm³). */
export function regimeAt(x: number, y: number, mix: Mix): Regime {
  return dominantPressure(10 ** y * 1000, 10 ** x, mix);
}

export function coreMapRegions(mix: Mix, logT: readonly [number, number], logRho: readonly [number, number], columns = 160, rows = 160): CoreMapRegions {
  const runs: RegionRun[] = [];
  const edges = new Map<string, Boundary>();
  const sums = new Map<Regime, { x: number; y: number; n: number }>();
  const dx = (logT[1] - logT[0]) / columns;
  const dy = (logRho[1] - logRho[0]) / rows;
  for (let c = 0; c < columns; c++) {
    const x = logT[0] + (c + 0.5) * dx;
    let start = logRho[0];
    let current = regimeAt(x, start, mix);
    for (let r = 1; r <= rows; r++) {
      const y = logRho[0] + r * dy;
      const here = regimeAt(x, y, mix);
      const s = sums.get(here) ?? { x: 0, y: 0, n: 0 };
      sums.set(here, { x: s.x + x, y: s.y + y - dy / 2, n: s.n + 1 });
      if (here === current) continue;
      // Refine the boundary between y − dy and y.
      let lo = y - dy;
      let hi = y;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (regimeAt(x, mid, mix) === current) lo = mid;
        else hi = mid;
      }
      const edge = (lo + hi) / 2;
      runs.push({ regime: current, x: x - dx / 2, width: dx, y0: start, y1: edge });
      const key = `${current}|${here}`;
      const b = edges.get(key) ?? { between: [current, here] as [Regime, Regime], points: [] };
      b.points.push({ x, y: edge });
      edges.set(key, b);
      start = edge;
      current = here;
    }
    runs.push({ regime: current, x: x - dx / 2, width: dx, y0: start, y1: logRho[1] });
  }
  const labels: CoreMapRegions['labels'] = {};
  for (const [regime, s] of sums) {
    if (s.n < columns * rows * 0.02) continue;
    let p = { x: s.x / s.n, y: s.y / s.n };
    if (regimeAt(p.x, p.y, mix) !== regime) {
      // A concave region: move to the nearest run of the regime.
      let best = Infinity;
      for (const run of runs) {
        if (run.regime !== regime) continue;
        const q = { x: run.x + run.width / 2, y: (run.y0 + run.y1) / 2 };
        const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
        if (d < best) {
          best = d;
          p = q;
        }
      }
    }
    labels[regime] = p;
  }
  return { runs, boundaries: [...edges.values()], labels };
}
