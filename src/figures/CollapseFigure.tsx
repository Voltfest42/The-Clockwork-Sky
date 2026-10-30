import { useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { Slider } from './Slider';
import { CLOUD_PRESETS, collapseReadout, formatMass, formatParsecs } from './starBirth';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Collapse or not (Figure 16.2): a cloud's heat against its gravity, by Jeans's
 * criterion. Set its mass, size and temperature; the two bars compare the
 * energy of its heat pushing out with its gravity pulling in, and the verdict
 * gives the Jeans mass and how fast it would fall in.
 */

const START = CLOUD_PRESETS.find((p) => p.id === 'gmc')!;

function formatDensity(n: number): string {
  if (n >= 100) return `${Number(n.toPrecision(2)).toLocaleString('en-GB')}`;
  return n.toPrecision(2);
}

function formatYears(y: number): string {
  if (y >= 1e9) return `${(y / 1e9).toPrecision(2)} billion years`;
  if (y >= 1e6) return `${(y / 1e6).toPrecision(2)} million years`;
  return `${Number(y.toPrecision(2)).toLocaleString('en-GB')} years`;
}

function times(x: number): string {
  if (x >= 100) return `${Number(x.toPrecision(2)).toLocaleString('en-GB')} times`;
  return `${x.toPrecision(2)} times`;
}

export function CollapseFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mass, setMass] = useState(START.mass);
  const [radius, setRadius] = useState(START.radius);
  const [kelvin, setKelvin] = useState(START.kelvin);
  const [molecular, setMolecular] = useState(START.molecular);
  const reset = () => {
    setMass(START.mass);
    setRadius(START.radius);
    setKelvin(START.kelvin);
    setMolecular(START.molecular);
  };
  const preset = CLOUD_PRESETS.find((p) => p.mass === mass && p.radius === radius && p.kelvin === kelvin && p.molecular === molecular);
  const r = collapseReadout(mass, radius, kelvin, molecular);
  // Bars: the larger is full width, the smaller in proportion.
  const big = Math.max(r.balance, 1);
  const gravityWidth = r.balance / big;
  const heatWidth = 1 / big;
  const verdict = r.collapses
    ? `Collapses: its gravity beats its heat ${times(r.balance)} over, so it falls in, in about ${formatYears(r.freeFallYears)}.`
    : `Holds up: its heat beats its gravity ${times(1 / r.balance)} over. It would need ${times(r.jeansMass / mass)} the mass to collapse.`;

  return (
    <Figure
      number={number}
      title="Collapse or not"
      description="A cloud of gas with a mass, a size and a temperature. Two bars compare the energy of its heat, pushing out, with its gravity, pulling in; when gravity wins, the cloud is heavier than its Jeans mass and collapses, in a free-fall time. Real clouds as presets, from the warm gas between the stars, which never collapses, to a giant molecular cloud, which does."
      height={560}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'heat pushing out (twice its heat energy)', symbol: <rect x="-9" y="-5" width="18" height="10" rx="2" fill="var(--series-2)" /> },
        { label: 'gravity pulling in (its gravitational energy)', symbol: <rect x="-9" y="-5" width="18" height="10" rx="2" fill="var(--series-1)" /> },
      ]}
      simplified={
        <p>
          The cloud is a still, even ball of gas, weighed by Jeans’s criterion in its energy form: it collapses when its gravitational energy is
          more than twice its heat energy, which happens above M<sub>J</sub> = (5kT / Gμm<sub>H</sub>)<sup>3/2</sup> (3 / 4πρ)<sup>1/2</sup>.
          Other books’ versions differ by a factor of a few. Real clouds are lumpy and turbulent, and magnetic fields help hold them up; the
          collapse itself, and why it breaks into many stars, is Part III’s.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Clouds" style={{ marginBottom: 6 }}>
        {CLOUD_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.toggle}
            aria-pressed={preset?.id === p.id}
            onClick={() => {
              setMass(p.mass);
              setRadius(p.radius);
              setKelvin(p.kelvin);
              setMolecular(p.molecular);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <Slider label="Mass" value={mass} min={0.1} max={1e7} log format={formatMass} onChange={setMass} />
        <Slider label="Radius" value={radius} min={0.01} max={100} log format={formatParsecs} onChange={setRadius} />
        <Slider label="Temperature" value={kelvin} min={5} max={10000} log format={(t) => `${t < 100 ? t.toFixed(1) : Math.round(t).toLocaleString('en-GB')} K`} onChange={setKelvin} />
        <span className={figureStyles.segmented} role="group" aria-label="The gas is">
          <button type="button" aria-pressed={molecular} onClick={() => setMolecular(true)}>
            Molecules
          </button>
          <button type="button" aria-pressed={!molecular} onClick={() => setMolecular(false)}>
            Atoms
          </button>
        </span>
      </div>
      <svg viewBox="0 0 600 96" width="100%" style={{ display: 'block', margin: '8px 0' }} role="img" aria-label={`Heat against gravity: ${verdict}`}>
        {[
          { y: 8, label: 'Heat pushing out', width: heatWidth, color: 'var(--series-2)' },
          { y: 52, label: 'Gravity pulling in', width: gravityWidth, color: 'var(--series-1)' },
        ].map((b) => (
          <g key={b.label}>
            <text x={0} y={b.y + 11} fontSize="12" fill="var(--text)">
              {b.label}
            </text>
            <rect x={0} y={b.y + 16} width={600} height={18} rx={3} fill="var(--border)" fillOpacity={0.5} />
            <rect x={0} y={b.y + 16} width={Math.max(2, 600 * b.width)} height={18} rx={3} fill={b.color} />
          </g>
        ))}
      </svg>
      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          <b>{verdict}</b>
        </p>
        <p style={{ margin: '6px 0 0' }}>
          {formatDensity(r.perCm3)} {molecular ? 'molecules' : 'atoms'} per cubic centimetre. Jeans mass: <b>{formatMass(r.jeansMass)}</b>.
          {preset ? ` ${preset.note}` : ''}
        </p>
      </div>
      <Caption>
        {r.collapses
          ? 'Gravity wins: the cloud is heavier than its Jeans mass. Colder, denser clouds have smaller Jeans masses, so they break into clumps that each collapse.'
          : 'Heat wins: the gas’s motion holds the cloud up. Make it colder, heavier or smaller to tip the balance.'}
      </Caption>
    </Figure>
  );
}
