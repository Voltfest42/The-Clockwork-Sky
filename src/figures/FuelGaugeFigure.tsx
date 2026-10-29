import { useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { FUEL_MARKS, FUELS } from './sun';
import styles from './sky/sky.module.css';

/**
 * The fuel gauge (Figure 15.3): how long the Sun could shine at today's power
 * if it burnt like coal, if it shrank under its own weight, and if it fused
 * hydrogen into helium, on a logarithmic scale of time with the age of Earth
 * marked. Only one fuel lasts long enough.
 */

const W = 600;
const LEFT = 16;
const RIGHT = 16;
const LOG0 = 2; // 100 years
const LOG1 = 11; // 100 billion years
const sx = (years: number) => LEFT + ((Math.log10(years) - LOG0) / (LOG1 - LOG0)) * (W - LEFT - RIGHT);
const TICKS = [
  { log: 2, label: '100 years' },
  { log: 4, label: '10,000' },
  { log: 6, label: '1 million' },
  { log: 8, label: '100 million' },
  { log: 10, label: '10 billion' },
];

function formatYears(years: number): string {
  if (years >= 1e9) return `${(years / 1e9).toFixed(1)} billion years`;
  if (years >= 1e6) return `${(years / 1e6).toFixed(0)} million years`;
  return `${(Math.round(years / 100) * 100).toLocaleString('en-GB')} years`;
}

export function FuelGaugeFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [fuelId, setFuelId] = useState<string | null>(null);
  const fuel = FUELS.find((f) => f.id === fuelId);
  const H = 70 + FUELS.length * 46;
  const earth = FUEL_MARKS[FUEL_MARKS.length - 1];

  return (
    <Figure
      number={number}
      title="Fuel gauge"
      description="How long the Sun could shine at today’s power on three fuels, on a scale of time where each step is a factor of 100: burning like coal, about 5,000 years; shrinking under its own weight, about 30 million years; fusing hydrogen into helium, about 10 billion years. Earth is 4.5 billion years old, so only fusion fits."
      height={420}
      tryThis={tryThis}
      onReset={() => setFuelId(null)}
      legend={[
        { label: 'how long the fuel would last', symbol: <rect x="-9" y="-5" width="18" height="10" rx="2" fill="var(--series-1)" /> },
        { label: 'the age of Earth', symbol: <line y1="-9" y2="9" stroke="var(--series-2)" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          Order-of-magnitude arithmetic: the Sun shines at today’s power throughout, coal brings its own oxygen, and fusion burns only the
          hydrogen in the core, about a tenth of the Sun, which is where the Sun’s 10-billion-year life on the main sequence comes from (Chapter 17).
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={styles.toggles} role="group" aria-label="Fuels">
          <span className={styles.togglesLabel}>Show the sum for:</span>
          {FUELS.map((f) => (
            <button key={f.id} type="button" className={styles.toggle} aria-pressed={fuelId === f.id} onClick={() => setFuelId(fuelId === f.id ? null : f.id)}>
              {f.name}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img" aria-label={`How long the Sun would last: ${FUELS.map((f) => `${f.name.toLowerCase()}, ${formatYears(f.years)}`).join('; ')}. The age of Earth is 4.5 billion years.`}>
        {TICKS.map((t) => (
          <g key={t.log}>
            <line x1={sx(10 ** t.log)} x2={sx(10 ** t.log)} y1={10} y2={H - 30} stroke="var(--border)" />
            <text x={sx(10 ** t.log)} y={H - 14} fontSize="10.5" textAnchor={t.log === LOG0 ? 'start' : 'middle'} fill="var(--text-muted)">
              {t.label}
            </text>
          </g>
        ))}
        {FUELS.map((f, k) => {
          const y = 22 + k * 46;
          const chosen = fuelId === f.id;
          const enough = f.years > earth.years;
          return (
            <g key={f.id}>
              <rect x={LEFT} y={y} width={Math.max(2, sx(f.years) - LEFT)} height={22} rx="3" fill="var(--series-1)" fillOpacity={chosen || !fuelId ? 0.9 : 0.4} />
              <text x={LEFT + 6} y={y - 4} fontSize="11" fill="var(--text)" fontWeight={chosen ? 700 : 400}>
                {f.name}: {formatYears(f.years)} {enough ? '✓' : '✗'}
              </text>
            </g>
          );
        })}
        {FUEL_MARKS.map((m) => (
          <g key={m.label}>
            <line x1={sx(m.years)} x2={sx(m.years)} y1={14} y2={H - 30} stroke={m === earth ? 'var(--series-2)' : 'var(--text-muted)'} strokeWidth={m === earth ? 2 : 1} strokeDasharray={m === earth ? undefined : '3 3'} />
            <text x={sx(m.years) - 4} y={H - 36} fontSize="10" textAnchor="end" fill={m === earth ? 'var(--series-2)' : 'var(--text-muted)'}>
              {m.label}
            </text>
          </g>
        ))}
      </svg>
      {fuel && (
        <div className={styles.card}>
          <p style={{ margin: 0 }}>{fuel.sum}</p>
          <p style={{ margin: '6px 0 0' }}>
            <b>{fuel.verdict}</b>
          </p>
        </div>
      )}
      <Caption>
        {fuel
          ? `${fuel.name}: ${formatYears(fuel.years)}.`
          : 'Earth’s rocks are 4.5 billion years old, and the Sun must have shone on them all that time. Coal would last 5,000 years and shrinking 30 million; only fusion lasts billions.'}
      </Caption>
    </Figure>
  );
}
