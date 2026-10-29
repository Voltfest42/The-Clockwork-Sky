import { useId, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { niceTicks } from '../ticks';
import styles from '../LineChart.module.css';

/**
 * Something measured against time or phase: a star's light, or its speed
 * towards us. Measurements as dots (with error bars when there are few), models
 * as lines, and a cursor that can be dragged or moved with the arrow keys to
 * link the chart to an orbit drawn beside it. Thousands of dots are drawn as
 * one path, so a season of measurements stays quick.
 */

export interface CurveSeries {
  name: string;
  /** CSS colour. */
  color: string;
  dashed?: boolean;
  /** Points in order of x; a gap where y is NaN. */
  points: readonly { x: number; y: number }[];
}

export interface DotSeries {
  name: string;
  color: string;
  xs: ArrayLike<number>;
  ys: ArrayLike<number>;
  /** Error bars (same units as y), drawn when there are fewer than 300 dots. */
  errors?: ArrayLike<number>;
  /** Bigger dots, for binned averages. */
  large?: boolean;
}

export interface LightCurveProps {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xLabel: string;
  yLabel: string;
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  curves?: readonly CurveSeries[];
  dots?: readonly DotSeries[];
  /** Horizontal reference lines. */
  levels?: readonly { y: number; label?: string; color?: string }[];
  /** A vertical cursor at this x, moved by dragging or the arrow keys when onCursor is set. */
  cursor?: number;
  onCursor?: (x: number) => void;
  /** Keyboard step for the cursor; Shift moves ten times as far. */
  cursorStep?: number;
  /** How the cursor's place reads out, for screen readers. */
  cursorText?: (x: number) => string;
  width?: number;
  height?: number;
  ariaLabel: string;
  hideLegend?: boolean;
  children?: (sx: (x: number) => number, sy: (y: number) => number) => ReactNode;
}

const PAD = { left: 56, right: 14, top: 12, bottom: 38 };

export function LightCurve({
  xMin,
  xMax,
  yMin,
  yMax,
  xLabel,
  yLabel,
  formatX = (x) => String(Number(x.toPrecision(3))),
  formatY = (y) => String(Number(y.toPrecision(3))),
  xTicks,
  yTicks,
  curves = [],
  dots = [],
  levels = [],
  cursor,
  onCursor,
  cursorStep = (xMax - xMin) / 100,
  cursorText,
  width = 560,
  height = 240,
  ariaLabel,
  hideLegend,
  children,
}: LightCurveProps) {
  const clipId = `lc-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const W = width;
  const H = height;
  const left = PAD.left;
  const right = W - PAD.right;
  const top = PAD.top;
  const bottom = H - PAD.bottom;
  const sx = (x: number) => left + ((x - xMin) / (xMax - xMin)) * (right - left);
  const sy = (y: number) => bottom - ((y - yMin) / (yMax - yMin)) * (bottom - top);
  const clampX = (x: number) => Math.max(xMin, Math.min(xMax, x));

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    if (!onCursor || (event.type === 'pointermove' && event.buttons !== 1)) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    onCursor(clampX(xMin + ((px - left) / (right - left)) * (xMax - xMin)));
  };
  const keys = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!onCursor || cursor === undefined) return;
    const step = event.shiftKey ? cursorStep * 10 : cursorStep;
    const moves: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step };
    if (event.key in moves) onCursor(clampX(cursor + moves[event.key]));
    else if (event.key === 'Home') onCursor(xMin);
    else if (event.key === 'End') onCursor(xMax);
    else return;
    event.preventDefault();
  };

  const path = (points: readonly { x: number; y: number }[]) => {
    const parts: string[] = [];
    let pen = false;
    for (const p of points) {
      if (!Number.isFinite(p.y)) {
        pen = false;
        continue;
      }
      parts.push(`${pen ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(Math.max(yMin - (yMax - yMin), Math.min(yMax + (yMax - yMin), p.y))).toFixed(1)}`);
      pen = true;
    }
    return parts.join('');
  };
  const dotPath = (d: DotSeries) => {
    const s = d.large ? 2.4 : d.xs.length < 300 ? 2 : 1.1;
    let out = '';
    for (let k = 0; k < d.xs.length; k++) {
      const x = d.xs[k];
      const y = d.ys[k];
      if (x < xMin || x > xMax || y < yMin || y > yMax) continue;
      out += `M${(sx(x) - s).toFixed(1)} ${(sy(y) - s).toFixed(1)}h${2 * s}v${2 * s}h${-2 * s}z`;
    }
    return out;
  };
  const errorPath = (d: DotSeries) => {
    if (!d.errors || d.xs.length >= 300) return '';
    let out = '';
    for (let k = 0; k < d.xs.length; k++) {
      const x = d.xs[k];
      if (x < xMin || x > xMax) continue;
      const lo = Math.max(yMin, d.ys[k] - d.errors[k]);
      const hi = Math.min(yMax, d.ys[k] + d.errors[k]);
      if (hi > lo) out += `M${sx(x).toFixed(1)} ${sy(lo).toFixed(1)}V${sy(hi).toFixed(1)}`;
    }
    return out;
  };

  const xs = xTicks ?? niceTicks(xMin, xMax);
  const ys = yTicks ?? niceTicks(yMin, yMax);
  const interactive = onCursor !== undefined && cursor !== undefined;

  return (
    <div className={styles.wrap}>
      {!hideLegend && (dots.length > 0 || curves.length > 0) && (
        <ul className={styles.legend} aria-label="Chart legend">
          {dots.map((d) => (
            <li key={d.name}>
              <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true">
                <rect x={-2.5} y={-2.5} width={5} height={5} fill={d.color} />
              </svg>
              {d.name}
            </li>
          ))}
          {curves.map((c) => (
            <li key={c.name}>
              <svg width="22" height="10" aria-hidden="true">
                <line x1="1" x2="21" y1="5" y2="5" stroke={c.color} strokeWidth="2.5" strokeDasharray={c.dashed ? '4 3' : undefined} />
              </svg>
              {c.name}
            </li>
          ))}
        </ul>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.chart}
        style={{ maxWidth: W, ...(interactive ? { cursor: 'crosshair', touchAction: 'pan-y' } : {}) }}
        role={interactive ? 'slider' : 'img'}
        aria-label={ariaLabel}
        tabIndex={interactive ? 0 : undefined}
        aria-valuemin={interactive ? xMin : undefined}
        aria-valuemax={interactive ? xMax : undefined}
        aria-valuenow={interactive ? cursor : undefined}
        aria-valuetext={interactive && cursorText ? cursorText(cursor) : undefined}
        onPointerDown={interactive ? pick : undefined}
        onPointerMove={interactive ? pick : undefined}
        onKeyDown={interactive ? keys : undefined}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={left} y={top} width={right - left} height={bottom - top} />
          </clipPath>
        </defs>
        {ys.map((t) => (
          <g key={`y${t}`}>
            <line x1={left} x2={right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
            <text x={left - 6} y={sy(t) + 3.5} className={styles.tick} textAnchor="end">
              {formatY(t)}
            </text>
          </g>
        ))}
        {xs.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={bottom + 15} className={styles.tick} textAnchor="middle">
            {formatX(t)}
          </text>
        ))}
        <line x1={left} x2={right} y1={bottom} y2={bottom} className={styles.grid} />
        <text x={(left + right) / 2} y={H - 5} className={styles.axis} textAnchor="middle">
          {xLabel}
        </text>
        <text transform={`translate(12 ${(top + bottom) / 2}) rotate(-90)`} className={styles.axis} textAnchor="middle">
          {yLabel}
        </text>
        <g clipPath={`url(#${clipId})`}>
          {levels.map((l) => (
            <g key={l.y}>
              <line x1={left} x2={right} y1={sy(l.y)} y2={sy(l.y)} stroke={l.color ?? 'var(--text-muted)'} strokeDasharray="4 3" />
              {l.label && (
                <text x={right - 4} y={sy(l.y) - 4} className={styles.tick} textAnchor="end" style={{ fill: l.color ?? 'var(--text-muted)' }}>
                  {l.label}
                </text>
              )}
            </g>
          ))}
          {dots.map((d) => (
            <g key={d.name}>
              <path d={errorPath(d)} stroke={d.color} strokeOpacity="0.6" />
              <path d={dotPath(d)} fill={d.color} />
            </g>
          ))}
          {curves.map((c) => (
            <path key={c.name} d={path(c.points)} fill="none" stroke={c.color} strokeWidth="2.25" strokeDasharray={c.dashed ? '6 4' : undefined} strokeLinejoin="round" />
          ))}
          {children?.(sx, sy)}
        </g>
        {cursor !== undefined && cursor >= xMin && cursor <= xMax && (
          <line x1={sx(cursor)} x2={sx(cursor)} y1={top} y2={bottom} stroke="var(--accent)" strokeWidth="1.75" />
        )}
      </svg>
    </div>
  );
}
