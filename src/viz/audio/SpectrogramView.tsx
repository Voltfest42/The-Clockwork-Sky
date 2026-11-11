import { useEffect, useRef } from 'react';
import type { Spectrogram } from '../../core/signal/strain';
import { niceTicks } from '../ticks';
import styles from '../LineChart.module.css';

/**
 * A spectrogram: time across, frequency up, power as brightness on a dark
 * ground (in both themes, like the sky views), drawn on a canvas under SVG
 * axes. A frequency track can be laid over it, and a playhead.
 */

/** A magma-like ramp from near-black to pale yellow: dark for quiet, bright for loud. */
const RAMP: readonly [number, number, number][] = [
  [7, 11, 22],
  [44, 17, 95],
  [114, 31, 129],
  [182, 54, 121],
  [241, 96, 93],
  [254, 175, 119],
  [252, 253, 191],
];

function colourAt(v: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, v)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const t = x - i;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const PAD = { left: 52, right: 14, top: 10, bottom: 38 };

export function SpectrogramView({
  spec,
  timeOffset,
  tMin,
  tMax,
  fMin = 0,
  fMax,
  range = 30,
  tracks = [],
  playhead,
  width = 640,
  height = 220,
  ariaLabel,
}: {
  spec: Spectrogram;
  /** Added to the spectrogram's own times for the axis, s. */
  timeOffset: number;
  tMin: number;
  tMax: number;
  fMin?: number;
  fMax: number;
  /** How many decibels below the loudest are drawn (quieter is black). */
  range?: number;
  /** Frequencies against time to draw over it (time on the axis's scale), each with its colour and dashes. */
  tracks?: readonly { points: readonly { t: number; f: number }[]; color: string; dash: string }[];
  playhead?: number | null;
  width?: number;
  height?: number;
  ariaLabel: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const W = width;
  const H = height;
  const left = PAD.left;
  const right = W - PAD.right;
  const top = PAD.top;
  const bottom = H - PAD.bottom;
  const sx = (t: number) => left + ((t - tMin) / (tMax - tMin)) * (right - left);
  const sy = (f: number) => bottom - ((f - fMin) / (fMax - fMin)) * (bottom - top);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const cols = Math.round(right - left);
    const rows = Math.round(bottom - top);
    el.width = cols;
    el.height = rows;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(cols, rows);
    let loudest = 0;
    for (const col of spec.power) for (const p of col) if (p > loudest) loudest = p;
    const floor = loudest * 10 ** (-range / 10);
    const df = spec.freqs.length > 1 ? spec.freqs[1] - spec.freqs[0] : 1;
    const times = spec.times;
    for (let c = 0; c < cols; c++) {
      const t = tMin + ((c + 0.5) / cols) * (tMax - tMin) - timeOffset;
      // The nearest column of the spectrogram
      let k = -1;
      if (times.length && t >= times[0] - (times[1] - times[0] || 1) / 2 && t <= times[times.length - 1] + (times[1] - times[0] || 1) / 2) {
        const step = times.length > 1 ? times[1] - times[0] : 1;
        k = Math.max(0, Math.min(times.length - 1, Math.round((t - times[0]) / step)));
      }
      for (let r = 0; r < rows; r++) {
        const f = fMax - ((r + 0.5) / rows) * (fMax - fMin);
        let v = 0;
        if (k >= 0) {
          const j = f / df;
          const j0 = Math.floor(j);
          const col = spec.power[k];
          if (j0 >= 0 && j0 + 1 < col.length) {
            const p = col[j0] + (col[j0 + 1] - col[j0]) * (j - j0);
            v = p > floor ? Math.log10(p / floor) / (range / 10) : 0;
          }
        }
        const [R, G, B] = colourAt(v);
        const o = (r * cols + c) * 4;
        image.data[o] = R;
        image.data[o + 1] = G;
        image.data[o + 2] = B;
        image.data[o + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [spec, timeOffset, tMin, tMax, fMin, fMax, range, left, right, top, bottom]);

  const fTicks = niceTicks(fMin, fMax).filter((f) => f >= fMin && f <= fMax);
  const tTicks = niceTicks(tMin, tMax);
  const pathOf = (points: readonly { t: number; f: number }[]) =>
    points
      .filter((p) => p.t >= tMin && p.t <= tMax && p.f <= fMax)
      .map((p, i) => `${i ? 'L' : 'M'} ${sx(p.t).toFixed(1)} ${sy(p.f).toFixed(1)}`)
      .join(' ');

  return (
    <div className={styles.wrap} style={{ position: 'relative', maxWidth: W }}>
      <canvas
        ref={canvas}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: `${(left / W) * 100}%`,
          top: `${(top / H) * 100}%`,
          width: `${((right - left) / W) * 100}%`,
          height: `${((bottom - top) / H) * 100}%`,
          borderRadius: 2,
        }}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} style={{ position: 'relative', maxWidth: W }} role="img" aria-label={ariaLabel}>
        {fTicks.map((f) => (
          <text key={`f${f}`} x={left - 6} y={sy(f) + 3.5} className={styles.tick} textAnchor="end">
            {f}
          </text>
        ))}
        {tTicks.map((t) => (
          <text key={`t${t}`} x={sx(t)} y={bottom + 15} className={styles.tick} textAnchor="middle">
            {String(Number(t.toPrecision(3))).replace('-', '−')}
          </text>
        ))}
        <text x={(left + right) / 2} y={H - 5} className={styles.axis} textAnchor="middle">
          Time from the peak (s)
        </text>
        <text transform={`translate(13 ${(top + bottom) / 2}) rotate(-90)`} className={styles.axis} textAnchor="middle">
          Frequency (Hz)
        </text>
        {tracks.map((tr, i) => (
          <path key={i} d={pathOf(tr.points)} fill="none" stroke={tr.color} strokeWidth="2" strokeDasharray={tr.dash} />
        ))}
        {playhead !== null && playhead !== undefined && playhead >= tMin && playhead <= tMax && (
          <line x1={sx(playhead)} x2={sx(playhead)} y1={top} y2={bottom} stroke="#ffffff" strokeWidth="1.5" />
        )}
      </svg>
    </div>
  );
}
