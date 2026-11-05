/** The chart of nuclides' layout: the drawing's size, and views (windows of N and Z) on it. */

export interface ChartView {
  nMin: number;
  nMax: number;
  zMin: number;
  zMax: number;
}

export const CHART_W = 640;
export const CHART_H = 440;
export const PAD = { left: 40, right: 10, top: 10, bottom: 34 };
export const PLOT_W = CHART_W - PAD.left - PAD.right;
export const PLOT_H = CHART_H - PAD.top - PAD.bottom;

/** The cell size in drawing units for a view: square cells that fit both ways. */
export function cellSize(v: ChartView): number {
  return Math.min(PLOT_W / (v.nMax - v.nMin + 1), PLOT_H / (v.zMax - v.zMin + 1));
}

/** A view of the same shape as the plot, centred on (N, Z), `columns` cells wide, kept within bounds. */
export function viewAround(N: number, Z: number, columns: number, bounds: ChartView): ChartView {
  const cols = Math.max(6, Math.min(columns, bounds.nMax - bounds.nMin + 1));
  const rows = Math.max(4, Math.round((cols * PLOT_H) / PLOT_W));
  const clamp = (lo: number, size: number, min: number, max: number) => Math.max(min, Math.min(lo, max - size + 1));
  const nMin = clamp(Math.round(N - cols / 2), cols, bounds.nMin, bounds.nMax);
  const zMin = clamp(Math.round(Z - rows / 2), rows, bounds.zMin, bounds.zMax);
  return { nMin, nMax: nMin + cols - 1, zMin, zMax: zMin + rows - 1 };
}

