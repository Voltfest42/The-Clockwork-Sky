import { niceTicks } from '../ticks';
import styles from '../LineChart.module.css';

/**
 * Sampled series against time, for strain: each drawn as the smallest and largest value in every column of pixels,
 * so a million samples cost no more than a thousand, with optional vertical markers (a playhead, the merger).
 */

export interface WaveSeries {
  name: string;
  color: string;
  /** Samples, and the time of the first one and the sample rate. */
  values: ArrayLike<number>;
  t0: number;
  sampleRate: number;
  /** Scales the values for drawing. */
  scale?: number;
  width?: number;
  opacity?: number;
}

export interface WaveMarker {
  t: number;
  label?: string;
  color: string;
  dashed?: boolean;
}

const PAD = { left: 52, right: 14, top: 12, bottom: 38 };

export function WaveformPlot({
  series,
  tMin,
  tMax,
  yMax,
  xLabel,
  yLabel,
  formatY = (y) => String(Number(y.toPrecision(2))),
  markers = [],
  width = 640,
  height = 220,
  ariaLabel,
}: {
  series: readonly WaveSeries[];
  tMin: number;
  tMax: number;
  /** The y axis runs from −yMax to yMax. */
  yMax: number;
  xLabel: string;
  yLabel: string;
  formatY?: (y: number) => string;
  markers?: readonly WaveMarker[];
  width?: number;
  height?: number;
  ariaLabel: string;
}) {
  const W = width;
  const H = height;
  const left = PAD.left;
  const right = W - PAD.right;
  const top = PAD.top;
  const bottom = H - PAD.bottom;
  const sx = (t: number) => left + ((t - tMin) / (tMax - tMin)) * (right - left);
  const sy = (y: number) => top + ((yMax - Math.max(-yMax, Math.min(yMax, y))) / (2 * yMax)) * (bottom - top);
  const columns = Math.round(right - left);

  const path = (s: WaveSeries) => {
    const k = s.scale ?? 1;
    const parts: string[] = [];
    for (let c = 0; c < columns; c++) {
      const ta = tMin + ((tMax - tMin) * c) / columns;
      const tb = tMin + ((tMax - tMin) * (c + 1)) / columns;
      const ia = Math.max(0, Math.floor((ta - s.t0) * s.sampleRate));
      const ib = Math.min(s.values.length - 1, Math.ceil((tb - s.t0) * s.sampleRate));
      if (ib < ia || ib < 0 || ia > s.values.length - 1) continue;
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = ia; i <= ib; i++) {
        const v = s.values[i] * k;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const x = (left + c + 0.5).toFixed(1);
      parts.push(`${parts.length ? 'L' : 'M'} ${x} ${sy(hi).toFixed(1)} L ${x} ${sy(lo).toFixed(1)}`);
    }
    return parts.join(' ');
  };

  const yTicks = niceTicks(-yMax, yMax).filter((t) => Math.abs(t) <= yMax);
  const tTicks = niceTicks(tMin, tMax);

  return (
    <div className={styles.wrap}>
      {series.length > 1 && (
        <ul className={styles.legend} aria-label="Chart legend">
          {series.map((s) => (
            <li key={s.name}>
              <svg width="22" height="10" aria-hidden="true">
                <line x1="1" x2="21" y1="5" y2="5" stroke={s.color} strokeWidth="2" />
              </svg>
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} style={{ maxWidth: W }} role="img" aria-label={ariaLabel}>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={left} x2={right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
            <text x={left - 6} y={sy(t) + 3.5} className={styles.tick} textAnchor="end">
              {formatY(t)}
            </text>
          </g>
        ))}
        {tTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={top} y2={bottom} className={styles.grid} />
            <text x={sx(t)} y={bottom + 15} className={styles.tick} textAnchor="middle">
              {String(Number(t.toPrecision(3))).replace('-', '−')}
            </text>
          </g>
        ))}
        <text x={(left + right) / 2} y={H - 5} className={styles.axis} textAnchor="middle">
          {xLabel}
        </text>
        <text transform={`translate(13 ${(top + bottom) / 2}) rotate(-90)`} className={styles.axis} textAnchor="middle">
          {yLabel}
        </text>
        {series.map((s) => (
          <path key={s.name} d={path(s)} fill="none" stroke={s.color} strokeWidth={s.width ?? 1.4} strokeOpacity={s.opacity ?? 1} strokeLinejoin="round" />
        ))}
        {markers
          .filter((m) => m.t >= tMin && m.t <= tMax)
          .map((m) => (
            <g key={`${m.label ?? ''}${m.t}`}>
              <line x1={sx(m.t)} x2={sx(m.t)} y1={top} y2={bottom} stroke={m.color} strokeWidth="1.5" strokeDasharray={m.dashed ? '4 3' : undefined} />
              {m.label && (
                <text x={sx(m.t) + (sx(m.t) > (left + right) / 2 ? -4 : 4)} y={top + 11} className={styles.tick} textAnchor={sx(m.t) > (left + right) / 2 ? 'end' : 'start'} style={{ fill: m.color }}>
                  {m.label}
                </text>
              )}
            </g>
          ))}
      </svg>
    </div>
  );
}
