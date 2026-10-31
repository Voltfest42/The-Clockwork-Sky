import { useId, type PointerEvent, type ReactNode } from 'react';
import { niceTicks } from './ticks';
import styles from './LineChart.module.css';

/**
 * Points and lines on linear or logarithmic axes: the chart for power laws
 * (Kepler's third law, square and cube laws). On log axes the ticks fall on
 * powers of ten, and a power law y = k xⁿ is a straight line of slope n.
 */

export type Scale = 'linear' | 'log';
export type PointShape = 'circle' | 'square' | 'diamond' | 'triangle';

export interface ScatterGroup {
  name: string;
  /** CSS colour. */
  color: string;
  shape: PointShape;
  points: readonly { x: number; y: number; label: string }[];
}

export interface ScatterLine {
  name: string;
  color: string;
  dashed?: boolean;
  /** A dash pattern of its own (an SVG stroke-dasharray), in place of `dashed`'s. */
  dash?: string;
  /** The line's value at x. */
  f: (x: number) => number;
}

interface ScatterChartProps {
  groups: readonly ScatterGroup[];
  lines?: readonly ScatterLine[];
  xScale: Scale;
  yScale: Scale;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xLabel: string;
  yLabel: string;
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
  /** Points to label beside them, by label. */
  labelled?: readonly string[];
  /** A highlighted point (the reader's own planet), drawn on top. */
  highlight?: { x: number; y: number; label: string; color: string };
  /** Called with the x value under the pointer when the chart is clicked or dragged. */
  onPick?: (x: number) => void;
  width?: number;
  height?: number;
  ariaLabel: string;
  /** Extra SVG drawn over the chart, given the axis mappings. */
  children?: (sx: (x: number) => number, sy: (y: number) => number) => ReactNode;
}

const PAD = { left: 58, right: 16, top: 14, bottom: 42 };

/** A point's symbol, centred on (x, y). */
function pointSymbol(shape: PointShape, x: number, y: number, r: number, color: string, title?: string) {
  const t = title ? <title>{title}</title> : null;
  switch (shape) {
    case 'circle':
      return (
        <circle cx={x} cy={y} r={r} fill={color}>
          {t}
        </circle>
      );
    case 'square':
      return (
        <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} fill={color}>
          {t}
        </rect>
      );
    case 'diamond':
      return (
        <path d={`M ${x} ${y - r * 1.25} L ${x + r * 1.25} ${y} L ${x} ${y + r * 1.25} L ${x - r * 1.25} ${y} Z`} fill={color}>
          {t}
        </path>
      );
    case 'triangle':
      return (
        <path d={`M ${x} ${y - r * 1.3} L ${x + r * 1.2} ${y + r * 0.8} L ${x - r * 1.2} ${y + r * 0.8} Z`} fill={color}>
          {t}
        </path>
      );
  }
}

/** Ticks for an axis: powers of ten on a log axis, round values on a linear one. */
function axisTicks(scale: Scale, min: number, max: number): number[] {
  if (scale === 'linear') return niceTicks(min, max);
  const out: number[] = [];
  for (let p = Math.ceil(Math.log10(min) - 1e-9); p <= Math.floor(Math.log10(max) + 1e-9); p++) out.push(10 ** p);
  return out;
}

/** "0.01", "1", "1000": a plain number for a tick. */
function plainNumber(x: number): string {
  if (x >= 1) return Math.round(x).toLocaleString('en-GB');
  return String(Number(x.toPrecision(2)));
}

export function ScatterChart({
  groups,
  lines = [],
  xScale,
  yScale,
  xMin,
  xMax,
  yMin,
  yMax,
  xLabel,
  yLabel,
  formatX = plainNumber,
  formatY = plainNumber,
  labelled = [],
  highlight,
  onPick,
  width = 600,
  height = 380,
  ariaLabel,
  children,
}: ScatterChartProps) {
  const clipId = `scatter-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const W = width;
  const H = height;
  const left = PAD.left;
  const right = W - PAD.right;
  const top = PAD.top;
  const bottom = H - PAD.bottom;
  const map = (scale: Scale, v: number, lo: number, hi: number, a: number, b: number) =>
    scale === 'log' ? a + ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (b - a) : a + ((v - lo) / (hi - lo)) * (b - a);
  const sx = (x: number) => map(xScale, x, xMin, xMax, left, right);
  const sy = (y: number) => map(yScale, y, yMin, yMax, bottom, top);
  const inside = (x: number, y: number) => x >= xMin && x <= xMax && y >= yMin && y <= yMax;

  const xFromScreen = (px: number) => {
    const f = (px - left) / (right - left);
    return xScale === 'log' ? 10 ** (Math.log10(xMin) + f * (Math.log10(xMax) - Math.log10(xMin))) : xMin + f * (xMax - xMin);
  };
  const pick = (event: PointerEvent<SVGSVGElement>) => {
    if (!onPick || (event.type === 'pointermove' && event.buttons !== 1)) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    onPick(Math.max(xMin, Math.min(xMax, xFromScreen(px))));
  };

  // Lines are sampled evenly across the screen and clipped to the plot.
  const linePath = (f: (x: number) => number) => {
    const parts: string[] = [];
    let pen = false;
    for (let i = 0; i <= 200; i++) {
      const x = xFromScreen(left + ((right - left) * i) / 200);
      const y = f(x);
      if (!(y >= yMin && y <= yMax)) {
        pen = false;
        continue;
      }
      parts.push(`${pen ? 'L' : 'M'} ${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`);
      pen = true;
    }
    return parts.join(' ');
  };

  return (
    <div className={styles.wrap}>
      <ul className={styles.legend} aria-label="Chart legend">
        {groups.map((g) => (
          <li key={g.name}>
            <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              {pointSymbol(g.shape, 0, 0, 4.5, g.color)}
            </svg>
            {g.name}
          </li>
        ))}
        {lines.map((l) => (
          <li key={l.name}>
            <svg width="22" height="10" aria-hidden="true">
              <line x1="1" x2="21" y1="5" y2="5" stroke={l.color} strokeWidth="2" strokeDasharray={l.dash ?? (l.dashed ? '4 3' : undefined)} />
            </svg>
            {l.name}
          </li>
        ))}
      </ul>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.chart}
        style={{ maxWidth: W, ...(onPick ? { cursor: 'crosshair', touchAction: 'pan-y' } : {}) }}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={onPick ? pick : undefined}
        onPointerMove={onPick ? pick : undefined}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={left} y={top} width={right - left} height={bottom - top} />
          </clipPath>
        </defs>
        {axisTicks(yScale, yMin, yMax).map((t) => (
          <g key={`y${t}`}>
            <line x1={left} x2={right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
            <text x={left - 6} y={sy(t) + 3.5} className={styles.tick} textAnchor="end">
              {formatY(t)}
            </text>
          </g>
        ))}
        {axisTicks(xScale, xMin, xMax).map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={top} y2={bottom} className={styles.grid} />
            <text x={sx(t)} y={bottom + 15} className={styles.tick} textAnchor="middle">
              {formatX(t)}
            </text>
          </g>
        ))}
        <text x={(left + right) / 2} y={H - 6} className={styles.axis} textAnchor="middle">
          {xLabel}
        </text>
        <text transform={`translate(13 ${(top + bottom) / 2}) rotate(-90)`} className={styles.axis} textAnchor="middle">
          {yLabel}
        </text>
        <g clipPath={`url(#${clipId})`}>
          {lines.map((l) => (
            <path key={l.name} d={linePath(l.f)} fill="none" stroke={l.color} strokeWidth="2" strokeDasharray={l.dash ?? (l.dashed ? '6 4' : undefined)} />
          ))}
        </g>
        {groups.map((g) => (
          <g key={g.name}>
            {g.points
              .filter((p) => inside(p.x, p.y))
              .map((p) => (
                <g key={p.label}>
                  {pointSymbol(g.shape, sx(p.x), sy(p.y), 5, g.color, `${p.label}: ${formatX(p.x)}, ${formatY(p.y)}`)}
                  {labelled.includes(p.label) && (
                    <text x={sx(p.x) + 8} y={sy(p.y) + 4} className={styles.tick} style={{ fill: 'var(--text)' }}>
                      {p.label}
                    </text>
                  )}
                </g>
              ))}
          </g>
        ))}
        {children?.(sx, sy)}
        {highlight && inside(highlight.x, highlight.y) && (
          <g>
            <circle cx={sx(highlight.x)} cy={sy(highlight.y)} r={8} fill="none" stroke={highlight.color} strokeWidth="2.5" />
            <text x={sx(highlight.x) + (sx(highlight.x) > left + 120 ? -12 : 12)} y={sy(highlight.y) - 10} className={styles.marker} textAnchor={sx(highlight.x) > left + 120 ? 'end' : 'start'} fill={highlight.color}>
              {highlight.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
