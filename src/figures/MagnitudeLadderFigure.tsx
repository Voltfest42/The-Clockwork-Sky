import { useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { brightnessRatio, explainDifference, formatRatio, LADDER } from './magnitudes';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The magnitude ladder (Figure T5.1): brightness from the Sun to JWST's
 * faintest galaxies on the astronomers' scale, where each step of one
 * magnitude is a factor of 2.512 and five steps a factor of 100. Pick two
 * things to compare.
 */

const START = { a: 'vega', b: 'eye' };
const W = 560;
const H = 520;
const M_TOP = -28;
const M_BOTTOM = 32;
const AXIS = 150;

const my = (m: number) => 16 + ((m - M_TOP) / (M_BOTTOM - M_TOP)) * (H - 32);
const fmt = (m: number) => `${m < 0 ? '−' : ''}${Math.abs(m)}`;

export function MagnitudeLadderFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [aId, setAId] = useState(START.a);
  const [bId, setBId] = useState(START.b);
  const reset = () => {
    setAId(START.a);
    setBId(START.b);
  };
  const a = LADDER.find((x) => x.id === aId)!;
  const b = LADDER.find((x) => x.id === bId)!;
  const [bright, faint] = a.V <= b.V ? [a, b] : [b, a];
  const diff = faint.V - bright.V;
  const ratio = brightnessRatio(bright.V, faint.V);
  const caption =
    diff < 0.005
      ? `${a.name} and ${b.name.toLowerCase()} are equally bright.`
      : `${bright.name} (magnitude ${fmt(bright.V)}) is ${diff.toFixed(2).replace(/\.?0+$/, '')} magnitudes brighter than ${faint.name.charAt(0).toLowerCase() + faint.name.slice(1)} (${fmt(faint.V)}): ${explainDifference(diff)} = ${formatRatio(ratio)} times as bright.`;

  return (
    <Figure
      number={number}
      title="The magnitude ladder"
      description="Brightness on the astronomers’ magnitude scale, from the Sun at −26.7 down through the full Moon, Venus, the brightest stars and the faintest the eye can see at about 6, to the faintest galaxies JWST has seen at about 31. Bigger numbers are fainter. Each step of one magnitude is a factor of about 2.5 in brightness, and every five steps a factor of 100, so the ladder spans a factor of about 10²³."
      height={680}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a rung: something in the sky at its magnitude', symbol: <path d="M-10 0 H10" stroke="var(--text-muted)" strokeWidth="2" /> },
        { label: 'the two things compared', symbol: <path d="M-10 0 H10" stroke="var(--series-1)" strokeWidth="3" /> },
        { label: 'every five magnitudes: a factor of 100', symbol: <rect x="-8" y="-6" width="16" height="12" fill="var(--series-2)" opacity="0.25" /> },
      ]}
      simplified={<p>Magnitudes here are visual (V-band) brightness. Planets’ brightness changes with their distance and phase; their brightest is shown.</p>}
    >
      <div className={figureStyles.toolbar}>
        <label className={figureStyles.inputLabel}>
          Compare
          <select value={aId} onChange={(e) => setAId(e.target.value)}>
            {LADDER.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} ({fmt(x.V)})
              </option>
            ))}
          </select>
        </label>
        <label className={figureStyles.inputLabel}>
          with
          <select value={bId} onChange={(e) => setBId(e.target.value)}>
            {LADDER.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} ({fmt(x.V)})
              </option>
            ))}
          </select>
        </label>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svgLight} role="img" aria-label={`The magnitude ladder from −27 to 31, with ${a.name} and ${b.name} marked. ${caption}`}>
        {Array.from({ length: 12 }, (_, k) => M_TOP + 3 + 5 * k)
          .filter((m) => m + 5 <= M_BOTTOM)
          .map((m, k) =>
            k % 2 === 0 ? <rect key={m} x={AXIS - 40} y={my(m)} width={40} height={my(m + 5) - my(m)} fill="var(--series-2)" opacity={0.12} /> : null,
          )}
        <line x1={AXIS} x2={AXIS} y1={my(M_TOP)} y2={my(M_BOTTOM)} stroke="var(--text-muted)" strokeWidth="1.5" />
        {Array.from({ length: 13 }, (_, k) => -25 + 5 * k).map((m) => (
          <g key={m}>
            <line x1={AXIS - 6} x2={AXIS} y1={my(m)} y2={my(m)} stroke="var(--text-muted)" />
            <text x={AXIS - 10} y={my(m) + 3.5} fontSize="10.5" textAnchor="end" fill="var(--text-muted)">
              {fmt(m)}
            </text>
          </g>
        ))}
        <text x={AXIS - 50} y={my(M_TOP) + 4} fontSize="10.5" fontWeight="600" textAnchor="end" fill="var(--text)">
          brighter ↑
        </text>
        <text x={AXIS - 50} y={my(M_BOTTOM)} fontSize="10.5" fontWeight="600" textAnchor="end" fill="var(--text)">
          fainter ↓
        </text>
        {LADDER.map((x, i) => {
          const picked = x.id === aId || x.id === bId;
          const ly = labelY(i);
          return (
            <g key={x.id}>
              <line x1={AXIS} x2={AXIS + 40} y1={my(x.V)} y2={my(x.V)} stroke={picked ? 'var(--series-1)' : 'var(--text-muted)'} strokeWidth={picked ? 3 : 1.5} />
              <line x1={AXIS + 40} x2={AXIS + 56} y1={my(x.V)} y2={ly} stroke="var(--border)" />
              <text x={AXIS + 60} y={ly + 3.5} fontSize="11" fontWeight={picked ? 700 : 400} fill={picked ? 'var(--series-1)' : 'var(--text)'}>
                {x.name} ({fmt(x.V)})
              </text>
            </g>
          );
        })}
        {diff > 0.005 && (
          <g>
            <line x1={W - 40} x2={W - 40} y1={my(bright.V)} y2={my(faint.V)} stroke="var(--series-1)" strokeWidth="2" markerEnd="none" />
            <text transform={`translate(${W - 26} ${(my(bright.V) + my(faint.V)) / 2}) rotate(90)`} fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--series-1)">
              ×{formatRatio(ratio)}
            </text>
          </g>
        )}
      </svg>
      <div className={styles.readout}>
        <span>
          Difference: <b>{diff.toFixed(2).replace(/\.?0+$/, '') || '0'} magnitudes</b>
        </span>
        <span>
          Brightness ratio: <b>{formatRatio(ratio)}</b>
        </span>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

/** Labels spread down the ladder so they don't overlap: each rung's label sits at its own height, pushed down if the one above is too close. */
function labelY(index: number): number {
  let y = -Infinity;
  for (let i = 0; i <= index; i++) y = Math.max(my(LADDER[i].V), y + 15);
  return y;
}
