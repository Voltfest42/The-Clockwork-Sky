import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { formatScientific, powerOfTen } from '../../core/math/scientific';
import { niceTicks } from '../ticks';
import { valueAt } from './profile';
import styles from '../LineChart.module.css';

/**
 * The profile plot (Part III): quantities against radius or mass inside a star,
 * on a linear or logarithmic scale, with zones shaded (a convection zone, the
 * core), a reference model beside the reader's, and a cursor that reads every
 * line off at one place. The cursor follows the pointer, and the arrow keys
 * when the plot has focus (Page Up/Down for bigger steps, Home and End).
 */

export interface ProfileSeries {
  name: string;
  /** CSS colour. */
  color: string;
  dashed?: boolean;
  /** Points in order of x. */
  points: readonly { x: number; y: number }[];
}

export interface ProfileZone {
  from: number;
  to: number;
  label: string;
}

interface ProfilePlotProps {
  series: readonly ProfileSeries[];
  xLabel: string;
  yLabel: string;
  xMin?: number;
  xMax?: number;
  yScale?: 'linear' | 'log';
  yMin: number;
  yMax: number;
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
  zones?: readonly ProfileZone[];
  /** Where the cursor is, in x; none drawn when undefined. */
  cursor?: number;
  onCursor?: (x: number) => void;
  /** What the cursor reads, for its slider's spoken value. */
  cursorText?: (x: number) => string;
  /** A value read off at the cursor, for the readout under the plot (default: three significant figures). */
  formatValue?: (y: number) => string;
  ariaLabel: string;
  width?: number;
  height?: number;
  hideLegend?: boolean;
  /** Extra SVG over the plot, given the axis mappings. */
  children?: (sx: (x: number) => number, sy: (y: number) => number) => ReactNode;
}

const PAD = { left: 58, right: 16, top: 12, bottom: 40 };

/** Powers of ten across a log range, thinned to at most `max`. */
function logTicks(min: number, max: number, maxTicks = 7): number[] {
  const lo = Math.ceil(Math.log10(min) - 1e-9);
  const hi = Math.floor(Math.log10(max) + 1e-9);
  const step = Math.max(1, Math.ceil((hi - lo + 1) / maxTicks));
  const out: number[] = [];
  for (let e = lo; e <= hi; e += step) out.push(10 ** e);
  return out;
}

export function ProfilePlot({
  series,
  xLabel,
  yLabel,
  xMin = 0,
  xMax = 1,
  yScale = 'linear',
  yMin,
  yMax,
  formatX = (x) => x.toFixed(1),
  formatY,
  zones = [],
  cursor,
  onCursor,
  cursorText,
  formatValue = (y) => (Math.abs(y) >= 1e5 || (Math.abs(y) < 0.01 && y !== 0) ? formatScientific(y, 3) : String(Number(y.toPrecision(3)))),
  ariaLabel,
  width = 560,
  height = 280,
  hideLegend,
  children,
}: ProfilePlotProps) {
  const W = width;
  const H = height;
  const log = yScale === 'log';
  const fy = (y: number) => (log ? Math.log10(Math.max(y, yMin * 1e-3)) : y);
  const y0 = fy(yMin);
  const y1 = fy(yMax);
  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right);
  const sy = (y: number) => {
    const v = Math.max(y0, Math.min(y1, fy(y)));
    return H - PAD.bottom - ((v - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);
  };
  const yTicks = log ? logTicks(yMin, yMax) : niceTicks(yMin, yMax);
  const xTicks = niceTicks(xMin, xMax);
  const fmtY = formatY ?? (log ? (y: number) => powerOfTen(Math.log10(y)) : (y: number) => String(Number(y.toPrecision(3))));

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    if (!onCursor || (event.type === 'pointermove' && event.buttons !== 1)) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    const x = xMin + ((px - PAD.left) / (W - PAD.left - PAD.right)) * (xMax - xMin);
    onCursor(Math.max(xMin, Math.min(xMax, x)));
  };

  const step = (xMax - xMin) / 100;
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onCursor || cursor === undefined) return;
    const moves: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: step * 10, PageDown: -step * 10 };
    let next: number | undefined;
    if (event.key in moves) next = cursor + moves[event.key];
    else if (event.key === 'Home') next = xMin;
    else if (event.key === 'End') next = xMax;
    if (next === undefined) return;
    event.preventDefault();
    onCursor(Math.max(xMin, Math.min(xMax, Math.round(next / step) * step)));
  };

  const chart = (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.chart}
      role="img"
      aria-label={ariaLabel}
      onPointerDown={onCursor ? pick : undefined}
      onPointerMove={onCursor ? pick : undefined}
      style={onCursor ? { cursor: 'crosshair', touchAction: 'pan-y' } : undefined}
    >
      {zones.map((z) => (
        <g key={z.label}>
          <rect
            x={sx(Math.max(xMin, z.from))}
            y={PAD.top}
            width={Math.max(0, sx(Math.min(xMax, z.to)) - sx(Math.max(xMin, z.from)))}
            height={H - PAD.top - PAD.bottom}
            fill="var(--accent)"
            fillOpacity={0.08}
          />
          <text x={sx(Math.max(xMin, z.from)) + 4} y={PAD.top + 12} className={styles.tick}>
            {z.label}
          </text>
        </g>
      ))}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
          <text x={PAD.left - 6} y={sy(t) + 3.5} className={styles.tick} textAnchor="end">
            {fmtY(t)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={t} x={sx(t)} y={H - PAD.bottom + 15} className={styles.tick} textAnchor="middle">
          {formatX(t)}
        </text>
      ))}
      <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} className={styles.baseline} />
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 6} className={styles.axis} textAnchor="middle">
        {xLabel}
      </text>
      <text transform={`translate(12 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} className={styles.axis} textAnchor="middle">
        {yLabel}
      </text>
      {series.map((s) => (
        <polyline
          key={s.name}
          points={s.points
            .filter((p) => p.x >= xMin && p.x <= xMax && (!log || p.y > 0))
            .map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
            .join(' ')}
          fill="none"
          stroke={s.color}
          strokeWidth="2.5"
          strokeDasharray={s.dashed ? '6 4' : undefined}
          strokeLinejoin="round"
        />
      ))}
      {children?.(sx, sy)}
      {cursor !== undefined && (
        <g>
          <line x1={sx(cursor)} x2={sx(cursor)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--text)" strokeWidth="1.25" strokeDasharray="3 3" />
          {series.map((s) => {
            const v = valueAt(s.points, cursor);
            return v === undefined || (log && v <= 0) ? null : <circle key={s.name} cx={sx(cursor)} cy={sy(v)} r="4" fill={s.color} stroke="var(--bg)" strokeWidth="1.5" />;
          })}
        </g>
      )}
    </svg>
  );

  return (
    <div className={styles.wrap}>
      {!hideLegend && (
        <ul className={styles.legend} aria-label="Legend">
          {series.map((s) => (
            <li key={s.name}>
              <svg width="22" height="10" aria-hidden="true">
                <line x1="1" x2="21" y1="5" y2="5" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '4 3' : undefined} />
              </svg>
              {s.name}
            </li>
          ))}
        </ul>
      )}
      {onCursor && cursor !== undefined ? (
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Cursor: ${xLabel}`}
          aria-valuemin={xMin}
          aria-valuemax={xMax}
          aria-valuenow={Number(cursor.toFixed(4))}
          aria-valuetext={cursorText?.(cursor) ?? formatX(cursor)}
          onKeyDown={onKey}
          style={{ outlineOffset: 2 }}
        >
          {chart}
        </div>
      ) : (
        chart
      )}
      {onCursor && cursor !== undefined && (
        <p className={styles.readoutLine} aria-live="polite">
          <b>{formatX(cursor)}</b>
          {series.map((s) => {
            const v = valueAt(s.points, cursor);
            return v === undefined ? null : (
              <span key={s.name}>
                {' · '}
                {s.name}: {formatValue(v)}
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
}
