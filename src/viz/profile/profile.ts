/** A series' value at x by straight-line interpolation, or undefined outside it. */
export function valueAt(points: readonly { x: number; y: number }[], x: number): number | undefined {
  if (points.length === 0 || x < points[0].x || x > points[points.length - 1].x) return undefined;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].x <= x) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  if (b.x === a.x) return a.y;
  return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
}
