import { useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Square and cube laws. Scale a shape by k: its length grows k times, its
 * area k² times, its volume k³ times. On ordinary axes the three laws are
 * curves; on log–log axes they are straight lines with slopes 1, 2 and 3.
 */

const SQUARE = 34;

/** A cube k units on a side, drawn in a simple oblique view and gridded in unit cubes on its visible faces. */
function Cube({ k }: { k: number }) {
  const s = SQUARE * k * 0.55;
  const d = s * 0.45;
  const x0 = 12;
  const y0 = 12 + d;
  const n = Math.max(1, Math.round(k));
  const front = `M ${x0} ${y0} h ${s} v ${s} h ${-s} Z`;
  const top = `M ${x0} ${y0} l ${d} ${-d} h ${s} l ${-d} ${d} Z`;
  const side = `M ${x0 + s} ${y0} l ${d} ${-d} v ${s} l ${-d} ${d} Z`;
  const grid: string[] = [];
  for (let i = 1; i < n; i++) {
    const f = (s * i) / n;
    grid.push(`M ${x0 + f} ${y0} v ${s}`, `M ${x0} ${y0 + f} h ${s}`);
  }
  return (
    <svg viewBox={`0 0 ${12 + SQUARE * 4 * 0.55 * 1.45 + 24} ${12 + SQUARE * 4 * 0.55 * 1.45 + 24}`} width="100%" style={{ maxWidth: 230 }} aria-hidden="true">
      <path d={top} fill="var(--series-1)" fillOpacity="0.35" stroke="var(--text)" strokeWidth="1" />
      <path d={side} fill="var(--series-1)" fillOpacity="0.55" stroke="var(--text)" strokeWidth="1" />
      <path d={front} fill="var(--series-1)" fillOpacity="0.2" stroke="var(--text)" strokeWidth="1.5" />
      <path d={grid.join(' ')} stroke="var(--text-muted)" strokeWidth="0.6" />
    </svg>
  );
}

export function ScalingFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [k, setK] = useState(2);
  const reset = () => setK(2);
  const x = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(v < 10 ? 2 : 1));
  return (
    <Figure
      number={number}
      title="Scale it up"
      description="A slider scales a square and a cube by a factor k. The side grows k times, the area of the square k² times and the volume of the cube k³ times: doubling the size gives four times the area and eight times the volume. A chart shows the three laws as straight lines of slope 1, 2 and 3 on log–log axes."
      height={640}
      tryThis={tryThis}
      onReset={reset}
    >
      <label className={styles.slider}>
        Scale by
        <input type="range" min={0.5} max={4} step={0.1} value={k} onChange={(e) => setK(Number(e.target.value))} aria-valuetext={`${k} times: area ${x(k * k)} times, volume ${x(k ** 3)} times`} />
        <output>×{k.toFixed(1)}</output>
      </label>
      <div className={figureStyles.withSide} style={{ marginTop: 10 }}>
        <ScatterChart
          groups={[
            { name: 'Length: ×k', color: 'var(--series-1)', shape: 'circle', points: [{ x: k, y: k, label: 'length' }] },
            { name: 'Area: ×k²', color: 'var(--series-2)', shape: 'square', points: [{ x: k, y: k * k, label: 'area' }] },
            { name: 'Volume: ×k³', color: 'var(--series-3)', shape: 'diamond', points: [{ x: k, y: k ** 3, label: 'volume' }] },
          ]}
          lines={[
            { name: 'slope 1', color: 'var(--series-1)', f: (v) => v },
            { name: 'slope 2', color: 'var(--series-2)', f: (v) => v * v },
            { name: 'slope 3', color: 'var(--series-3)', f: (v) => v ** 3 },
          ]}
          xScale="log"
          yScale="log"
          xMin={0.1}
          xMax={10}
          yMin={0.01}
          yMax={100}
          xLabel="Scale factor k"
          yLabel="How many times bigger"
          labelled={['length', 'area', 'volume']}
          onPick={(v) => setK(Math.round(Math.max(0.5, Math.min(4, v)) * 10) / 10)}
          width={440}
          height={320}
          ariaLabel={`Length, area and volume against the scale factor on log–log axes: three straight lines of slope 1, 2 and 3. At ×${k.toFixed(1)}: length ×${x(k)}, area ×${x(k * k)}, volume ×${x(k ** 3)}.`}
        />
        <div className={figureStyles.side}>
          <svg viewBox="0 0 150 150" width="100%" style={{ maxWidth: 150 }} aria-hidden="true">
            <rect x="8" y="8" width={SQUARE * k} height={SQUARE * k} fill="var(--series-2)" fillOpacity="0.25" stroke="var(--text)" strokeWidth="1.5" />
            <rect x="8" y="8" width={SQUARE} height={SQUARE} fill="none" stroke="var(--text)" strokeDasharray="3 3" />
          </svg>
          <Cube k={k} />
          <div className={figureStyles.summary} aria-live="polite">
            <p>
              Side: <b>×{x(k)}</b>
            </p>
            <p>
              Area: <b>×{x(k * k)}</b> ({x(k)} × {x(k)})
            </p>
            <p>
              Volume: <b>×{x(k ** 3)}</b> ({x(k)} × {x(k)} × {x(k)})
            </p>
          </div>
        </div>
      </div>
      <Caption>
        {k === 2
          ? 'Doubling the size: the side is twice as long, the area four times as big and the volume eight times. Weight goes with volume, so a twice-as-big animal is eight times as heavy.'
          : `Scaling by ${k.toFixed(1)}: area ×${x(k * k)}, volume ×${x(k ** 3)}. On log–log axes each law is a straight line whose slope is its power.`}
      </Caption>
    </Figure>
  );
}
