import { useId, type KeyboardEvent, type PointerEvent } from 'react';
import { niceTicks } from './ticks';
import styles from './LineChart.module.css';

/**
 * A histogram: counts in bins along x, drawn as bars, on a linear or log count
 * axis. Vertical markers can be laid over it (resonances, limits), and a
 * pointer (or the arrow keys, once focused) picks an x value to read.
 */

export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
}

export interface HistogramMarker {
  x: number;
  label: string;
  color: string;
  dashed?: boolean;
}

interface HistogramProps {
  bins: readonly HistogramBin[];
  xMin: number;
  xMax: number;
  /** Count axis. A log axis starts at 1. */
  yScale?: 'linear' | 'log';
  xLabel: string;
  yLabel: string;
  formatX?: (x: number) => string;
  color: string;
  markers?: readonly HistogramMarker[];
  /** The x value being read, drawn as a line. */
  picked?: number | null;
  onPick?: (x: number) => void;
  /** How far one arrow-key press moves the picked value. */
  keyStep?: number;
  width?: number;
  height?: number;
  ariaLabel: string;
}

const PAD = { left: 58, right: 14, top: 26, bottom: 42 };

export function Histogram({
  bins,
  xMin,
  xMax,
  yScale = 'linear',
  xLabel,
  yLabel,
  formatX = (x) => String(x),
  color,
  markers = [],
  picked = null,
  onPick,
  keyStep,
  width = 600,
  height = 320,
  ariaLabel,
}: HistogramProps) {
  const clipId = `histogram-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const W = width;
  const H = height;
  const left = PAD.left;
  const right = W - PAD.right;
  const top = PAD.top;
  const bottom = H - PAD.bottom;
  const shown = bins.filter((b) => b.x1 > xMin && b.x0 < xMax);
  const most = Math.max(1, ...shown.map((b) => b.count));
  const linear = niceTicks(0, most);
  const step = linear.length > 1 ? linear[1] - linear[0] : most;
  // The top of the axis is the first round value at or above the tallest bar.
  const yMax = yScale === 'log' ? 10 ** Math.ceil(Math.log10(most)) : Math.ceil(most / step) * step;
  const sx = (x: number) => left + ((x - xMin) / (xMax - xMin)) * (right - left);
  const sy = (y: number) =>
    yScale === 'log' ? bottom - (Math.log10(Math.max(1, y)) / Math.log10(yMax)) * (bottom - top) : bottom - (y / yMax) * (bottom - top);
  const yTicks =
    yScale === 'log' ? Array.from({ length: Math.round(Math.log10(yMax)) + 1 }, (_, p) => 10 ** p) : Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const xTicks = niceTicks(xMin, xMax);

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    if (!onPick || (event.type === 'pointermove' && event.buttons !== 1)) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    onPick(Math.max(xMin, Math.min(xMax, xMin + ((px - left) / (right - left)) * (xMax - xMin))));
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!onPick || !keyStep) return;
    const at = picked ?? (xMin + xMax) / 2;
    const step = event.key === 'ArrowRight' ? keyStep : event.key === 'ArrowLeft' ? -keyStep : 0;
    if (!step) return;
    event.preventDefault();
    onPick(Math.max(xMin, Math.min(xMax, at + step)));
  };

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.chart}
        style={{ maxWidth: W, ...(onPick ? { cursor: 'crosshair', touchAction: 'pan-y' } : {}) }}
        role="img"
        aria-label={ariaLabel}
        tabIndex={onPick && keyStep ? 0 : undefined}
        onPointerDown={onPick ? pick : undefined}
        onPointerMove={onPick ? pick : undefined}
        onKeyDown={onPick ? onKeyDown : undefined}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={left} y={0} width={right - left} height={bottom} />
          </clipPath>
        </defs>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={left} x2={right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
            <text x={left - 6} y={sy(t) + 3.5} className={styles.tick} textAnchor="end">
              {t.toLocaleString('en-GB')}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={bottom + 15} className={styles.tick} textAnchor="middle">
            {formatX(t)}
          </text>
        ))}
        <text x={(left + right) / 2} y={H - 6} className={styles.axis} textAnchor="middle">
          {xLabel}
        </text>
        <text transform={`translate(13 ${(top + bottom) / 2}) rotate(-90)`} className={styles.axis} textAnchor="middle">
          {yLabel}
        </text>
        <g clipPath={`url(#${clipId})`}>
          {shown.map((b) =>
            b.count > 0 ? <rect key={b.x0} x={sx(b.x0)} y={sy(b.count)} width={Math.max(0.5, sx(b.x1) - sx(b.x0))} height={bottom - sy(b.count)} fill={color} /> : null,
          )}
          {markers.map((m, i) => (
            <g key={m.label}>
              <line x1={sx(m.x)} x2={sx(m.x)} y1={top - 4} y2={bottom} stroke={m.color} strokeWidth="1.5" strokeDasharray={m.dashed ? '4 3' : undefined} />
              <text x={sx(m.x)} y={top - 8 - (i % 2) * 11} className={styles.marker} textAnchor="middle" fill={m.color}>
                {m.label}
              </text>
            </g>
          ))}
          {picked !== null && <line x1={sx(picked)} x2={sx(picked)} y1={top} y2={bottom} stroke="var(--text)" strokeWidth="1.5" />}
        </g>
        <line x1={left} x2={right} y1={bottom} y2={bottom} className={styles.baseline} />
      </svg>
    </div>
  );
}
