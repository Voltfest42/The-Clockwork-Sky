import type { PointerEvent } from 'react';
import { niceTicks } from './ticks';
import styles from './LineChart.module.css';

export interface Series {
  name: string;
  /** CSS colour, e.g. 'var(--series-1)'. */
  color: string;
  dashed?: boolean;
  points: readonly { x: number; y: number }[];
}

/** A labelled vertical line: today's date, a solstice. */
export interface ChartMarker {
  x: number;
  label?: string;
  /** CSS colour; defaults to the text colour. */
  color?: string;
  /** A thin dashed line rather than a solid one. */
  faint?: boolean;
}

interface LineChartProps {
  series: readonly Series[];
  xLabel: string;
  yLabel: string;
  yMin?: number;
  yMax?: number;
  /** The x range; defaults to the data's. */
  xMin?: number;
  xMax?: number;
  formatY?: (y: number) => string;
  /** Ticks along the x axis; defaults to every x value when there are few, else round values. */
  xTicks?: readonly { value: number; label: string }[];
  formatX?: (x: number) => string;
  /** Vertical lines across the chart. */
  markers?: readonly ChartMarker[];
  /** A horizontal reference line, such as zero. */
  baseline?: number;
  /** Dots at each point (with their values on hover); by default only when there are 30 points or fewer. */
  dots?: boolean;
  /** Called with the x value under the pointer when the chart is clicked or dragged. */
  onPick?: (x: number) => void;
  /** Size of the drawing in its own units. A narrower width keeps the text larger when the chart sits in a narrow column. */
  width?: number;
  height?: number;
  /** Lines across the chart at these values; by default, round values. */
  yTicks?: readonly number[];
  ariaLabel: string;
  /** Hides the legend (when the figure has its own). */
  hideLegend?: boolean;
}

const PAD = { left: 52, right: 16, top: 14, bottom: 40 };

/** Several series on linear axes, with a legend, optional markers and a pointer to pick an x value. */
export function LineChart({
  series,
  xLabel,
  yLabel,
  yMin = 0,
  yMax = 1,
  xMin,
  xMax,
  formatY = (y) => `${Math.round(y * 100)}%`,
  xTicks,
  formatX = (x) => String(x),
  markers = [],
  baseline,
  dots,
  onPick,
  width = 560,
  height = 260,
  yTicks: yTickValues,
  ariaLabel,
  hideLegend,
}: LineChartProps) {
  const W = width;
  const H = height;
  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const x0 = xMin ?? Math.min(...xs);
  const x1 = xMax ?? Math.max(...xs);
  const sx = (x: number) => PAD.left + ((x - x0) / (x1 - x0 || 1)) * (W - PAD.left - PAD.right);
  const sy = (y: number) => H - PAD.bottom - ((y - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom);
  const clampY = (y: number) => Math.max(yMin, Math.min(yMax, y));
  const yTicks = yTickValues ?? niceTicks(yMin, yMax);
  const distinct = [...new Set(xs)].sort((a, b) => a - b);
  const ticks = xTicks ?? (distinct.length <= 12 ? distinct : niceTicks(x0, x1)).map((value) => ({ value, label: formatX(value) }));
  const showDots = dots ?? series.every((s) => s.points.length <= 30);

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    if (!onPick || (event.type === 'pointermove' && event.buttons !== 1)) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * W;
    const value = x0 + ((x - PAD.left) / (W - PAD.left - PAD.right)) * (x1 - x0);
    onPick(Math.max(x0, Math.min(x1, value)));
  };

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
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.chart}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={onPick ? pick : undefined}
        onPointerMove={onPick ? pick : undefined}
        style={onPick ? { cursor: 'crosshair', touchAction: 'pan-y' } : undefined}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
            <text x={PAD.left - 6} y={sy(t) + 3.5} className={styles.tick} textAnchor="end">
              {formatY(t)}
            </text>
          </g>
        ))}
        {baseline !== undefined && baseline >= yMin && baseline <= yMax && (
          <line x1={PAD.left} x2={W - PAD.right} y1={sy(baseline)} y2={sy(baseline)} className={styles.baseline} />
        )}
        {ticks.map((t) => (
          <text key={t.value} x={sx(t.value)} y={H - PAD.bottom + 15} className={styles.tick} textAnchor="middle">
            {t.label}
          </text>
        ))}
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 6} className={styles.axis} textAnchor="middle">
          {xLabel}
        </text>
        <text transform={`translate(12 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} className={styles.axis} textAnchor="middle">
          {yLabel}
        </text>
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              points={s.points.map((p) => `${sx(p.x).toFixed(1)},${sy(clampY(p.y)).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeDasharray={s.dashed ? '5 4' : undefined}
              strokeLinejoin="round"
            />
            {showDots &&
              !s.dashed &&
              s.points.map((p) => (
                <circle key={p.x} cx={sx(p.x)} cy={sy(clampY(p.y))} r="3.5" fill={s.color}>
                  <title>
                    {s.name}, {formatX(p.x)}: {formatY(p.y)}
                  </title>
                </circle>
              ))}
          </g>
        ))}
        {markers
          .filter((m) => m.x >= x0 && m.x <= x1)
          .map((m, i) => (
            <g key={`${m.x}-${i}`}>
              <line
                x1={sx(m.x)}
                x2={sx(m.x)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke={m.color ?? 'var(--text)'}
                strokeWidth={m.faint ? 1 : 1.75}
                strokeDasharray={m.faint ? '3 3' : undefined}
              />
              {m.label && (
                <text
                  x={sx(m.x) + (sx(m.x) > W - 110 ? -4 : 4)}
                  y={PAD.top + (m.faint ? 10 : 24)}
                  className={styles.marker}
                  textAnchor={sx(m.x) > W - 110 ? 'end' : 'start'}
                  fill={m.color ?? 'var(--text)'}
                >
                  {m.label}
                </text>
              )}
            </g>
          ))}
      </svg>
    </div>
  );
}
