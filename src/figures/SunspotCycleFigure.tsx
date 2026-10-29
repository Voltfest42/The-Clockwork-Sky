import { useEffect, useRef, useState, type ReactNode } from 'react';
import { readTokens, useDarkMode } from '../viz/hooks';
import { Caption, Figure } from '../viz/Figure';
import { BANDS, CYCLES, describeCycle, FIRST_ROTATION, LAST_MONTH, monthName, MONTHLY, ROTATIONS, rotationYear, SMOOTHED } from './sunspots';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The sunspot cycle (Figure 15.2): SILSO's monthly sunspot numbers since 1749,
 * with their smoothed curve and every cycle numbered, and below it the
 * butterfly diagram since 1874, where the spots were by latitude. Pick a
 * cycle for its length and height; the two panels share a time axis.
 */

const X0 = 1749;
const X1 = 2027;
const W = 640;
const LEFT = 44;
const RIGHT = 10;
const TOP_H = 220;
const FLY_H = 150;
const sx = (year: number) => LEFT + ((year - X0) / (X1 - X0)) * (W - LEFT - RIGHT);
const MAX = 400;

function linePath(points: readonly { x: number; y: number }[], top: number, height: number) {
  return points.map((p, k) => `${k ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${(top + height - (Math.min(p.y, MAX) / MAX) * height).toFixed(1)}`).join('');
}

const MONTHLY_PATH = linePath(MONTHLY, 10, TOP_H - 40);
const SMOOTHED_PATH = linePath(SMOOTHED, 10, TOP_H - 40);
const LATEST = CYCLES[CYCLES.length - 1];

export function SunspotCycleFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [cycleN, setCycleN] = useState(LATEST.n);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dark = useDarkMode();
  const cycle = CYCLES.find((c) => c.n === cycleN)!;
  const reset = () => setCycleN(LATEST.n);

  // The butterfly diagram: one column a rotation, one row a band of latitude, shaded by sunspot area.
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const scale = 2;
    c.width = W * scale;
    c.height = FLY_H * scale;
    ctx.scale(scale, scale);
    const tokens = readTokens(c, ['--text', '--series-2'] as const);
    ctx.clearRect(0, 0, W, FLY_H);
    const top = 6;
    const h = FLY_H - 26;
    ROTATIONS.forEach((row, k) => {
      const x0 = sx(rotationYear(FIRST_ROTATION + k));
      const x1 = sx(rotationYear(FIRST_ROTATION + k + 1));
      for (let b = 0; b < BANDS; b++) {
        const level = parseInt(row[b], 16);
        if (!level) continue;
        // Bands are even in sin(latitude), so drawing them evenly puts the equator in the middle with the poles squeezed, as Maunder drew it.
        const y = top + h - ((b + 1) / BANDS) * h;
        ctx.fillStyle = tokens['--series-2'];
        ctx.globalAlpha = Math.min(1, 0.15 + level / 11);
        ctx.fillRect(x0, y, Math.max(0.6, x1 - x0 + 0.2), h / BANDS + 0.2);
      }
    });
    ctx.strokeStyle = tokens['--text'];
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(sx(1874), top + h / 2);
    ctx.lineTo(W - RIGHT, top + h / 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [dark]);

  const startX = sx(cycle.start);
  const endX = sx(cycle.end ?? LAST_MONTH[0] + LAST_MONTH[1] / 12);
  const peakY = cycle.height !== null ? 10 + (TOP_H - 40) - (cycle.height / MAX) * (TOP_H - 40) : null;

  return (
    <Figure
      number={number}
      title="The sunspot cycle"
      description="Monthly sunspot numbers from 1749 to today, rising and falling about every 11 years, with every cycle numbered; Cycle 19, which peaked in 1958, was the highest. Below, the butterfly diagram since 1874: where on the Sun the spots appeared, by latitude. Each cycle’s spots start at mid-latitudes and drift towards the equator, making a pair of wings."
      height={600}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'monthly sunspot number', symbol: <line x1="-9" x2="9" stroke="var(--text-muted)" strokeWidth="1" /> },
        { label: 'smoothed over 13 months', symbol: <line x1="-9" x2="9" stroke="var(--series-1)" strokeWidth="2.5" /> },
        { label: 'the chosen cycle', symbol: <rect x="-8" y="-7" width="16" height="14" fill="var(--accent)" fillOpacity="0.2" /> },
        { label: 'sunspot area, by latitude', symbol: <rect x="-7" y="-4" width="14" height="8" fill="var(--series-2)" /> },
      ]}
      simplified={
        <p>
          These are the real records. The sunspot number counts groups and single spots seen from Earth, combined from observers since 1749; it
          was recalibrated in 2015 (version 2), and the latest months are provisional. The butterfly diagram’s areas after 1976 come from a
          different network and are scaled by 1.4 to match the earlier ones. The Maunder minimum, 1645–1715, when spots almost vanished, comes
          before this record begins.
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} disabled={cycleN <= 1} onClick={() => setCycleN(cycleN - 1)} aria-label="Previous cycle">
            ←
          </button>
          <label>
            Cycle{' '}
            <select value={cycleN} onChange={(e) => setCycleN(Number(e.target.value))} aria-label="Pick a cycle">
              {CYCLES.map((c) => (
                <option key={c.n} value={c.n}>
                  {c.n} ({Math.floor(c.start)}–{c.end ? Math.floor(c.end) : ''})
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={figureStyles.toolButton} disabled={cycleN >= LATEST.n} onClick={() => setCycleN(cycleN + 1)} aria-label="Next cycle">
            →
          </button>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${TOP_H}`} width="100%" style={{ display: 'block' }} role="img" aria-label={`Monthly sunspot numbers, 1749 to ${LAST_MONTH[0]}, with Cycle ${cycle.n} highlighted`}>
        <rect x={startX} y={10} width={Math.max(1, endX - startX)} height={TOP_H - 40} fill="var(--accent)" fillOpacity="0.16" />
        {[0, 100, 200, 300].map((v) => {
          const y = 10 + (TOP_H - 40) - (v / MAX) * (TOP_H - 40);
          return (
            <g key={v}>
              <line x1={LEFT} x2={W - RIGHT} y1={y} y2={y} stroke="var(--border)" />
              <text x={LEFT - 6} y={y + 3.5} fontSize="10.5" textAnchor="end" fill="var(--text-muted)">
                {v}
              </text>
            </g>
          );
        })}
        <path d={MONTHLY_PATH} fill="none" stroke="var(--text-muted)" strokeWidth="0.6" strokeOpacity="0.8" />
        <path d={SMOOTHED_PATH} fill="none" stroke="var(--series-1)" strokeWidth="2" />
        {CYCLES.map((c) =>
          c.peak !== null && c.height !== null ? (
            <text key={c.n} x={sx(c.peak)} y={10 + (TOP_H - 40) - (Math.min(c.height, MAX) / MAX) * (TOP_H - 40) - 6} fontSize="9.5" textAnchor="middle" fill={c.n === cycle.n ? 'var(--text)' : 'var(--text-muted)'} fontWeight={c.n === cycle.n ? 700 : 400}>
              {c.n}
            </text>
          ) : null,
        )}
        {peakY !== null && cycle.peak !== null && <circle cx={sx(cycle.peak)} cy={peakY} r="4" fill="none" stroke="var(--accent)" strokeWidth="2" />}
        {[1750, 1800, 1850, 1900, 1950, 2000].map((y) => (
          <text key={y} x={sx(y)} y={TOP_H - 14} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
            {y}
          </text>
        ))}
        <text transform={`translate(11 ${(TOP_H - 30) / 2 + 10}) rotate(-90)`} fontSize="11" textAnchor="middle" fill="var(--text)" fontWeight="600">
          Sunspot number
        </text>
      </svg>
      <div style={{ position: 'relative' }}>
        <canvas ref={canvas} style={{ width: '100%', height: 'auto', aspectRatio: `${W} / ${FLY_H}`, display: 'block' }} role="img" aria-label="The butterfly diagram: sunspot area by latitude since 1874; each cycle’s spots begin near 30° north and south and drift towards the equator" />
        <svg viewBox={`0 0 ${W} ${FLY_H}`} width="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
          {[
            { label: '30° N', y: 6 + (FLY_H - 26) * (0.5 - 0.25) },
            { label: 'equator', y: 6 + (FLY_H - 26) * 0.5 },
            { label: '30° S', y: 6 + (FLY_H - 26) * (0.5 + 0.25) },
          ].map((t) => (
            <text key={t.label} x={LEFT - 4} y={t.y + 3.5} fontSize="9.5" textAnchor="end" fill="var(--text-muted)">
              {t.label}
            </text>
          ))}
          <rect x={startX} y={6} width={Math.max(1, endX - startX)} height={FLY_H - 26} fill="var(--accent)" fillOpacity="0.1" />
          <text x={sx(1874) + 4} y={FLY_H - 6} fontSize="10.5" fill="var(--text-muted)">
            Where the spots were, by latitude (from 1874)
          </text>
        </svg>
      </div>
      <Caption>{`${describeCycle(cycle)} The record runs to ${monthName(LAST_MONTH)}.`}</Caption>
    </Figure>
  );
}
