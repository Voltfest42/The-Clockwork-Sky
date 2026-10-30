import { fromGaia, fromPhysics, type HRPoint } from '../../core/stars/hr';

/** The HR diagram's two sets of axes and the drawing's layout, shared by the diagram and anything drawn on it. */

export type Axes = 'observer' | 'physicist';

export const HR_WIDTH = 640;
export const HR_HEIGHT = 470;
export const PAD = { left: 58, right: 14, top: 12, bottom: 50 };
export const PLOT_W = HR_WIDTH - PAD.left - PAD.right;
export const PLOT_H = HR_HEIGHT - PAD.top - PAD.bottom;

/** The ranges of the two sets of axes. Observers: colour and M_G. Physicists: log T (decreasing) and log L. */
export const RANGES = {
  observer: { x: [-0.7, 4.8], y: [-9, 17] },
  physicist: { x: [Math.log10(45000), Math.log10(2200)], y: [-5, 6.2] },
} as const;

/** An axis range: x and y as RANGES gives them (log T decreasing and log L for the physicists' axes). */
export interface AxisRange {
  x: readonly [number, number];
  y: readonly [number, number];
}

/** A zoomed range on the physicists' axes, from temperatures (K, hot first) and luminosities (L☉). */
export const physicistRange = (hot: number, cool: number, faint: number, bright: number): AxisRange => ({
  x: [Math.log10(hot), Math.log10(cool)],
  y: [Math.log10(faint), Math.log10(bright)],
});

/** Where a point sits in the drawing, on a set of axes. */
export function placeOf(axes: Axes, p: HRPoint, r: AxisRange = RANGES[axes]): [number, number] {
  const [xv, yv] = axes === 'observer' ? [p.bpRp, p.mG] : [Math.log10(p.kelvin), Math.log10(p.luminosity)];
  const fx = (xv - r.x[0]) / (r.x[1] - r.x[0]);
  const fy = axes === 'observer' ? (yv - r.y[0]) / (r.y[1] - r.y[0]) : (r.y[1] - yv) / (r.y[1] - r.y[0]);
  return [PAD.left + fx * PLOT_W, PAD.top + fy * PLOT_H];
}

/** The point at a place in the drawing. */
export function pointAt(axes: Axes, x: number, y: number, r: AxisRange = RANGES[axes]): HRPoint {
  const fx = Math.min(1, Math.max(0, (x - PAD.left) / PLOT_W));
  const fy = Math.min(1, Math.max(0, (y - PAD.top) / PLOT_H));
  if (axes === 'observer') return fromGaia(r.x[0] + fx * (r.x[1] - r.x[0]), r.y[0] + fy * (r.y[1] - r.y[0]));
  return fromPhysics(10 ** (r.x[0] + fx * (r.x[1] - r.x[0])), 10 ** (r.y[1] - fy * (r.y[1] - r.y[0])));
}

