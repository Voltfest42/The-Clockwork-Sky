/**
 * Contour lines of a function sampled on a grid, by marching squares: each
 * cell's corners above and below the level give the edges the line crosses,
 * placed by linear interpolation; saddle cells are split by the cell's mean.
 * The pieces are joined end to end into polylines.
 *
 * Units are the caller's: the grid covers x0–x1 and y0–y1 in its own units,
 * and the lines come back in them.
 */

export interface Grid {
  /** Values row by row: values[j * nx + i] at x = x0 + i (x1 − x0)/(nx − 1), y = y0 + j (y1 − y0)/(ny − 1). */
  values: Float64Array;
  nx: number;
  ny: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Samples f over a grid of nx × ny points. */
export function sampleGrid(f: (x: number, y: number) => number, nx: number, ny: number, x0: number, x1: number, y0: number, y1: number): Grid {
  const values = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = y0 + ((y1 - y0) * j) / (ny - 1);
    for (let i = 0; i < nx; i++) values[j * nx + i] = f(x0 + ((x1 - x0) * i) / (nx - 1), y);
  }
  return { values, nx, ny, x0, x1, y0, y1 };
}

type Point = [number, number];

/** The polylines where the gridded function equals `level`. */
export function contourLines(grid: Grid, level: number): Point[][] {
  const { values, nx, ny, x0, x1, y0, y1 } = grid;
  const dx = (x1 - x0) / (nx - 1);
  const dy = (y1 - y0) / (ny - 1);
  const v = (i: number, j: number) => values[j * nx + i];
  // Edge crossings are keyed by their edge, so neighbouring cells share the exact same point
  const edgeKey = (i: number, j: number, horizontal: boolean) => (horizontal ? 2 : 1) + 4 * (j * nx + i);
  const points = new Map<number, Point>();
  const crossing = (i: number, j: number, horizontal: boolean): number => {
    const key = edgeKey(i, j, horizontal);
    if (!points.has(key)) {
      const a = v(i, j);
      const b = horizontal ? v(i + 1, j) : v(i, j + 1);
      const t = a === b ? 0.5 : (level - a) / (b - a);
      points.set(key, horizontal ? [x0 + (i + t) * dx, y0 + j * dy] : [x0 + i * dx, y0 + (j + t) * dy]);
    }
    return key;
  };
  const segments: [number, number][] = [];
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = v(i, j);
      const b = v(i + 1, j);
      const c = v(i + 1, j + 1);
      const d = v(i, j + 1);
      if (![a, b, c, d].every(Number.isFinite)) continue;
      const code = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (c > level ? 4 : 0) | (d > level ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const bottom = () => crossing(i, j, true);
      const right = () => crossing(i + 1, j, false);
      const top = () => crossing(i, j + 1, true);
      const left = () => crossing(i, j, false);
      const centreAbove = (a + b + c + d) / 4 > level;
      switch (code) {
        case 1:
        case 14:
          segments.push([left(), bottom()]);
          break;
        case 2:
        case 13:
          segments.push([bottom(), right()]);
          break;
        case 3:
        case 12:
          segments.push([left(), right()]);
          break;
        case 4:
        case 11:
          segments.push([right(), top()]);
          break;
        case 6:
        case 9:
          segments.push([bottom(), top()]);
          break;
        case 7:
        case 8:
          segments.push([left(), top()]);
          break;
        case 5:
          if (centreAbove) segments.push([left(), top()], [bottom(), right()]);
          else segments.push([left(), bottom()], [right(), top()]);
          break;
        case 10:
          if (centreAbove) segments.push([left(), bottom()], [right(), top()]);
          else segments.push([left(), top()], [bottom(), right()]);
          break;
      }
    }
  }
  // Join the pieces end to end
  const ends = new Map<number, number[]>();
  segments.forEach(([p, q], k) => {
    for (const e of [p, q]) {
      const list = ends.get(e) ?? [];
      list.push(k);
      ends.set(e, list);
    }
  });
  const used = new Uint8Array(segments.length);
  const lines: Point[][] = [];
  const follow = (from: number, chain: number[]) => {
    let at = from;
    for (;;) {
      const next = (ends.get(at) ?? []).find((k) => !used[k]);
      if (next === undefined) return;
      used[next] = 1;
      const [p, q] = segments[next];
      at = p === at ? q : p;
      chain.push(at);
    }
  };
  for (let k = 0; k < segments.length; k++) {
    if (used[k]) continue;
    used[k] = 1;
    const [p, q] = segments[k];
    const forward = [q];
    follow(q, forward);
    const backward: number[] = [];
    follow(p, backward);
    const keys = [...backward.reverse(), p, ...forward];
    lines.push(keys.map((key) => points.get(key)!));
  }
  return lines;
}
