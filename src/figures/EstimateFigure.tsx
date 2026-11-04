import { useState, type ReactNode } from 'react';
import { formatScientific, powerOfTen } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { RECIPES, runRecipe } from './holding';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The estimate machine (Figure T11.1): pick a quantity and build its estimate
 * one factor at a time on a ruler of powers of ten, where multiplying is
 * adding: each factor is an arrow that moves the running product along. Then
 * compare the estimate with the true value.
 */

/** A value in the recipe's unit, for reading. */
function inUnit(value: number, unit: { scale: number; name: string }): string {
  const v = value / unit.scale;
  const text = v >= 1e5 || v < 0.01 ? formatScientific(v, 2) : Number(v.toPrecision(2)).toLocaleString('en-GB');
  return `${text} ${unit.name}`;
}

export function EstimateFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [id, setId] = useState(RECIPES[0].id);
  const [done, setDone] = useState(0);
  const reset = () => {
    setId(RECIPES[0].id);
    setDone(0);
  };
  const recipe = RECIPES.find((r) => r.id === id)!;
  const { value, running } = runRecipe(recipe);
  const factors = recipe.factors;
  const finished = done === factors.length;
  // Logs of the running product after each factor, starting from 1 (log 0).
  const logs = [0, ...running.map((v) => Math.log10(v))];
  const truthLogs = [recipe.truth.low ?? recipe.truth.value, recipe.truth.high ?? recipe.truth.value].map(Math.log10);
  const all = [...logs, ...truthLogs, ...factors.map((f) => f.power * Math.log10(f.value))];
  const lo = Math.floor(Math.min(...all)) - 1;
  const hi = Math.ceil(Math.max(...all)) + 1;
  const W = 600;
  const rowH = 30;
  const H = 46 + rowH * (factors.length + 1);
  const sx = (l: number) => 20 + ((l - lo) / (hi - lo)) * (W - 40);
  const tickStep = Math.max(1, Math.ceil((hi - lo) / 12));
  const ticks: number[] = [];
  for (let e = Math.ceil(lo / tickStep) * tickStep; e <= hi; e += tickStep) ticks.push(e);
  const ratio = recipe.truth.value / value;
  const verdict =
    recipe.truth.low !== undefined && value >= recipe.truth.low && value <= recipe.truth.high!
      ? 'inside the range'
      : ratio >= 1
        ? `${ratio >= 10 ? Math.round(ratio) : ratio.toPrecision(2)} times lower than the true value`
        : `${1 / ratio >= 10 ? Math.round(1 / ratio) : (1 / ratio).toPrecision(2)} times higher than the true value`;

  return (
    <Figure
      number={number}
      title="The estimate machine"
      description="Build an estimate one factor at a time on a ruler of powers of ten, where multiplying means adding: each factor is an arrow that moves the running answer along the ruler. Five quantities for the Sun: its central pressure and temperature, how fast it would fall in without pressure, how long shrinking could power it, and how long light takes to get out. Each estimate ends beside the true value."
      height={520}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a factor, as a step along the ruler', symbol: <line x1="-9" x2="9" y1="0" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'the estimate', symbol: <circle r="6" fill="var(--accent)" /> },
        { label: 'the true value', symbol: <rect x="-3" y="-8" width="6" height="16" fill="var(--series-2)" /> },
      ]}
      simplified={<p>Each estimate drops the numbers in front (factors like 3/8π or ½) and keeps only how the answer scales with the quantities that matter.</p>}
    >
      <div className={styles.presets} role="group" aria-label="Quantity">
        {RECIPES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={styles.toggle}
            aria-pressed={id === r.id}
            onClick={() => {
              setId(r.id);
              setDone(0);
            }}
          >
            {r.name}
          </button>
        ))}
      </div>
      <div className={figureStyles.toolbar} style={{ marginTop: 10 }}>
        <span>
          <b>{recipe.formula}</b>
        </span>
        <button type="button" className={figureStyles.toolButton} disabled={finished} onClick={() => setDone((d) => Math.min(factors.length, d + 1))}>
          Next factor
        </button>
        <button type="button" className={figureStyles.toolButton} disabled={finished} onClick={() => setDone(factors.length)}>
          All at once
        </button>
        <button type="button" className={figureStyles.toolButton} disabled={done === 0} onClick={() => setDone(0)}>
          Start again
        </button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`A ruler of powers of ten from ${powerOfTen(lo)} to ${powerOfTen(hi)}, with ${done} of ${factors.length} factors applied`}>
        <defs>
          <marker id={`arrow-${number}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
          </marker>
        </defs>
        <line x1={20} x2={W - 20} y1={24} y2={24} stroke="var(--text-muted)" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={19} y2={29} stroke="var(--text-muted)" />
            <text x={sx(t)} y={14} textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
              {powerOfTen(t)}
            </text>
            <line x1={sx(t)} x2={sx(t)} y1={30} y2={H - 4} stroke="var(--border)" strokeOpacity={0.6} />
          </g>
        ))}
        {factors.slice(0, done).map((f, k) => {
          const y = 46 + rowH * k;
          return (
            <g key={f.label}>
              <line x1={sx(logs[k])} x2={sx(logs[k + 1])} y1={y} y2={y} stroke="var(--accent)" strokeWidth="2.5" markerEnd={`url(#arrow-${number})`} />
              <text x={Math.min(sx(logs[k]), sx(logs[k + 1])) - 6} y={y + 4} textAnchor="end" fontSize="11.5" fill="var(--text)">
                × {f.label}
              </text>
            </g>
          );
        })}
        {finished && (
          <g>
            <rect
              x={sx(truthLogs[0]) - 3}
              y={36}
              width={Math.max(6, sx(truthLogs[1]) - sx(truthLogs[0]) + 6)}
              height={H - 40}
              fill="var(--series-2)"
              fillOpacity={0.35}
            />
            <circle cx={sx(logs[logs.length - 1])} cy={46 + rowH * factors.length} r="7" fill="var(--accent)" />
            <text x={sx(logs[logs.length - 1]) + 11} y={46 + rowH * factors.length + 4} fontSize="11.5" fontWeight="600" fill="var(--text)">
              estimate
            </text>
          </g>
        )}
      </svg>
      {done > 0 && done <= factors.length && (
        <p className={styles.hint} aria-live="polite">
          {`× ${factors[done - 1].label}: ${factors[done - 1].meaning}. Running total ${formatScientific(running[done - 1], 2)}.`}
        </p>
      )}
      {finished && (
        <div className={styles.card}>
          <p style={{ margin: 0 }}>
            Estimate: <b>{inUnit(value, recipe.unit)}</b>. True value ({recipe.truth.label}): <b>{inUnit(recipe.truth.value, recipe.unit)}</b>
            {recipe.truth.low !== undefined && ` (${inUnit(recipe.truth.low, recipe.unit)} to ${inUnit(recipe.truth.high!, recipe.unit)})`}. The estimate is {verdict}.
          </p>
          <p style={{ margin: '6px 0 0' }}>{recipe.lesson}</p>
        </div>
      )}
      <Caption>
        {finished
          ? `${recipe.name}: the estimate, ${inUnit(value, recipe.unit)}, is ${verdict}.`
          : `${recipe.name}: ${done} of ${factors.length} factors applied. Press Next factor to multiply by the next one.`}
      </Caption>
    </Figure>
  );
}
