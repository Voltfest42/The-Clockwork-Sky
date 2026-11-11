import { useMemo, type ReactNode } from 'react';
import { contourLines, type Grid } from '../../core/math/contour';

/**
 * The potential view's map: a potential as contour lines, like a hiking map's
 * lines of equal height, drawn on the night-dark panel the sky and HR diagram
 * use. The figure chooses the levels and their styles and draws what else it
 * wants over the top with the scales it is given (grid units → SVG units).
 */

export interface ContourStyle {
  level: number;
  stroke: string;
  width?: number;
  dash?: string;
  opacity?: number;
  /** Keep only lines that stay within this distance of the origin (grid units). */
  within?: number;
}

export interface PotentialMapProps {
  grid: Grid;
  contours: readonly ContourStyle[];
  /** SVG width; the height follows the grid's aspect. */
  width?: number;
  ariaLabel: string;
  children?: (sx: (x: number) => number, sy: (y: number) => number, unit: number) => ReactNode;
}

export function PotentialMap({ grid, contours, width = 640, ariaLabel, children }: PotentialMapProps) {
  const unit = width / (grid.x1 - grid.x0);
  const height = (grid.y1 - grid.y0) * unit;
  const sx = (x: number) => (x - grid.x0) * unit;
  const sy = (y: number) => height - (y - grid.y0) * unit;
  const paths = useMemo(
    () =>
      contours.map((c) =>
        contourLines(grid, c.level)
          .filter((line) => c.within === undefined || line.every(([x, y]) => Math.hypot(x, y) < c.within!))
          .map((line) => line.map(([x, y], i) => `${i ? 'L' : 'M'}${((x - grid.x0) * unit).toFixed(1)} ${(height - (y - grid.y0) * unit).toFixed(1)}`).join(''))
          .join(''),
      ),
    [grid, contours, unit, height],
  );
  return (
    <svg viewBox={`0 0 ${width} ${height.toFixed(1)}`} width="100%" style={{ display: 'block', background: 'var(--sky-bg)', borderRadius: 6 }} role="img" aria-label={ariaLabel}>
      {contours.map((c, i) => (
        <path key={i} d={paths[i]} fill="none" stroke={c.stroke} strokeWidth={c.width ?? 1} strokeDasharray={c.dash} strokeOpacity={c.opacity ?? 1} strokeLinejoin="round" />
      ))}
      {children?.(sx, sy, unit)}
    </svg>
  );
}
