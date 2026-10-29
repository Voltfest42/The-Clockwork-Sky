import { useState, type ReactNode } from 'react';
import { AU, L_SUN, SOLAR_IRRADIANCE } from '../core/constants';
import { formatScientific } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { sunlightPlaces, sunPowerFromSunlight } from './thermal';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The inverse-square law (Figure 11.4): light from a point spreads over ever
 * bigger spheres, so a detector twice as far catches a quarter as much. Then
 * sunlight at each planet and at Voyager 1, and the Sun's power worked out
 * from sunlight at Earth, the way Chapter 7 weighed the Sun.
 */

const W = 560;
const H = 196;
const SX = 50;
const UNIT = 150;
const CY = 72;
const S = 26; // the detector's side, in the drawing

export function InverseSquareFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [d, setD] = useState(1);
  const [weighed, setWeighed] = useState(false);
  const [now] = useState(() => Date.now());
  const reset = () => {
    setD(1);
    setWeighed(false);
  };
  const share = 1 / (d * d);
  const places = sunlightPlaces(now);
  const power = sunPowerFromSunlight();

  const bx = (w: number) => 120 + ((Math.log10(w) + 2) / 6) * (W - 240); // 0.01 to 10,000 W/m², leaving room for the labels
  const fraction = (n: number) => (n === 1 ? '1' : n === 2 ? '¼' : '⅑');

  return (
    <Figure
      number={number}
      title="The inverse-square law"
      description="Light from a point spreading out: the light that crosses one square at one unit away covers four squares at two units and nine at three, so a detector of the same size catches a quarter, then a ninth. Below, sunlight at each planet and at Voyager 1, in watts per square metre, from 9,000 at Mercury to a few hundredths at Voyager; and the Sun’s total power worked out from sunlight at Earth: 1,361 watts a square metre over a sphere one astronomical unit in radius."
      height={660}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'light spreading from the source', symbol: <path d="M-10 0 L10 -8 M-10 0 L10 8" stroke="var(--sun-edge)" strokeWidth="1.5" /> },
        { label: 'your detector: the same size wherever it is', symbol: <rect x="-6" y="-6" width="12" height="12" fill="var(--series-1)" /> },
      ]}
      simplified={
        <p>
          The source is a point, with nothing in the way. Sunlight at each planet is for its average distance from the Sun; the Sun’s own
          output varies by about 0.1% over its 11-year cycle.
        </p>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svgLight} role="img" aria-label={`Light from a point source spreading over 1, 4 and 9 squares at distances 1, 2 and 3. The detector at distance ${d.toFixed(2)} catches ${(share * 100).toFixed(0)}% as much as at distance 1.`}>
        <defs>
          <radialGradient id={`source-${number.replace('.', '-')}`}>
            <stop offset="0" stopColor="#fff7d1" />
            <stop offset="1" stopColor="var(--sun-edge)" />
          </radialGradient>
        </defs>
        {[-1, 1].map((k) => (
          <line key={k} x1={SX} y1={CY} x2={SX + 3.4 * UNIT} y2={CY + k * (S / 2) * 3.4} stroke="var(--sun-edge)" strokeWidth="1.2" opacity="0.7" />
        ))}
        {[1, 2, 3].map((n) => (
          <g key={n}>
            {/* the screen seen edge-on, and face-on below */}
            <line x1={SX + n * UNIT} x2={SX + n * UNIT} y1={CY - (S / 2) * n} y2={CY + (S / 2) * n} stroke="var(--text-muted)" strokeWidth="2.5" />
            <text x={SX + n * UNIT} y={CY - (S / 2) * n - 6} fontSize="11" textAnchor="middle" fill="var(--text)">
              {n} {n === 1 ? 'unit' : 'units'}
            </text>
            <g transform={`translate(${SX + n * UNIT - (n * 13) / 2} ${H - 18 - n * 13})`}>
              {Array.from({ length: n * n }, (_, i) => (
                <rect key={i} x={(i % n) * 13} y={Math.floor(i / n) * 13} width={12} height={12} fill={i === 0 ? 'var(--series-1)' : 'none'} stroke="var(--text-muted)" />
              ))}
            </g>
            <text x={SX + n * UNIT + (n * 13) / 2 + 8} y={H - 22} fontSize="12" fontWeight="700" fill="var(--text)">
              {fraction(n)}
            </text>
          </g>
        ))}
        <circle cx={SX} cy={CY} r={9} fill={`url(#source-${number.replace('.', '-')})`} />
        <rect x={SX + d * UNIT - 4} y={CY - S / 2} width={8} height={S} fill="var(--series-1)" />
        <text x={SX + d * UNIT} y={CY + S / 2 + 14} fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--series-1)">
          {(share * 100).toFixed(0)}%
        </text>
      </svg>
      <label className={styles.slider}>
        Detector’s distance
        <input type="range" min={1} max={3.3} step={0.01} value={d} onChange={(e) => setD(Number(e.target.value))} aria-valuetext={`${d.toFixed(2)} units: it catches ${(share * 100).toFixed(1)}% as much light as at 1 unit`} />
        <output>{d.toFixed(2)} units</output>
      </label>

      <h4 className={styles.panelTitle} style={{ marginTop: 14 }}>
        Sunlight above the air, in watts per square metre
      </h4>
      <svg viewBox={`0 0 ${W} ${places.length * 20 + 26}`} className={seasonStyles.svgLight} role="img" aria-label={`Sunlight at each planet: ${places.map((p) => `${p.name} ${formatWatts(p.watts)} watts per square metre`).join('; ')}`}>
        {[0.01, 0.1, 1, 10, 100, 1000, 10_000].map((w) => (
          <g key={w}>
            <line x1={bx(w)} x2={bx(w)} y1={0} y2={places.length * 20} stroke="var(--border)" />
            <text x={bx(w)} y={places.length * 20 + 14} fontSize="10" textAnchor="middle" fill="var(--text-muted)">
              {w >= 1 ? w.toLocaleString('en-GB') : w}
            </text>
          </g>
        ))}
        {places.map((p, i) => (
          <g key={p.id}>
            <text x={112} y={i * 20 + 14} fontSize="11" textAnchor="end" fill="var(--text)">
              {p.name}
            </text>
            <rect x={120} y={i * 20 + 4} width={Math.max(1, bx(p.watts) - 120)} height={13} rx={2} fill={p.id === 'earth' ? 'var(--series-1)' : p.id === 'voyager' ? 'var(--series-3)' : 'var(--sun-edge)'} opacity={0.85} />
            <text x={bx(p.watts) + 4} y={i * 20 + 14} fontSize="10.5" fill="var(--text)">
              {formatWatts(p.watts)} at {p.au < 10 ? p.au.toFixed(2) : p.au.toFixed(0)} AU
            </text>
          </g>
        ))}
      </svg>

      <div className={figureStyles.toolbar} style={{ marginTop: 10 }}>
        <button type="button" className={figureStyles.toolButton} onClick={() => setWeighed(true)} disabled={weighed}>
          Weigh the Sun’s power
        </button>
      </div>
      {weighed && (
        <ol className={styles.hint} style={{ marginTop: 4 }}>
          <li>Above the air, each square metre facing the Sun at Earth receives {SOLAR_IRRADIANCE.toLocaleString('en-GB')} watts.</li>
          <li>
            The Sun’s light crosses every square metre of a sphere 1 AU ({formatScientific(AU, 4)} m) in radius: 4π × (1 AU)² ={' '}
            {formatScientific(4 * Math.PI * AU * AU, 3)} square metres.
          </li>
          <li>
            So the Sun gives out {SOLAR_IRRADIANCE.toLocaleString('en-GB')} × {formatScientific(4 * Math.PI * AU * AU, 3)} = <b>{formatScientific(power, 3)} watts</b>, the
            power of about {formatScientific(power / 1e9, 2)} large power stations. (The IAU’s value is {formatScientific(L_SUN, 4)} W.)
          </li>
        </ol>
      )}
      <Caption>
        {weighed
          ? `The Sun’s power, from sunlight at Earth and the inverse-square law: ${formatScientific(power, 3)} watts.`
          : `At ${d.toFixed(2)} units the same detector catches 1/${(d * d).toFixed(2)} = ${(share * 100).toFixed(1)}% of the light it catches at 1 unit: the light is spread over ${(d * d).toFixed(2)} times the area.`}
      </Caption>
    </Figure>
  );
}

function formatWatts(w: number): string {
  if (w >= 100) return Math.round(w).toLocaleString('en-GB', { maximumSignificantDigits: 3 });
  if (w >= 1) return w.toPrecision(2);
  return w.toPrecision(2);
}
