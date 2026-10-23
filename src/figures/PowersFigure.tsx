import { useId, useState, type ReactNode } from 'react';
import {
  divideScientific,
  formatGrouped,
  formatScientific,
  formatSignificant,
  multiplyScientific,
  orderOfMagnitude,
  powerOfTen,
  superscript,
  toScientific,
  withPrefix,
  type Scientific,
} from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { PRESETS, type Operation } from './powers';
import figureStyles from './figures.module.css';
import styles from './PowersFigure.module.css';

export function PowersFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [a, setA] = useState<Scientific>(PRESETS[0].a);
  const [b, setB] = useState<Scientific>(PRESETS[0].b);
  const [op, setOp] = useState<Operation>(PRESETS[0].op);
  const [preset, setPreset] = useState<number | null>(0);
  const presetId = useId();

  const reset = () => {
    setA(PRESETS[0].a);
    setB(PRESETS[0].b);
    setOp(PRESETS[0].op);
    setPreset(0);
  };

  const choose = (index: number) => {
    const p = PRESETS[index];
    setA(p.a);
    setB(p.b);
    setOp(p.op);
    setPreset(index);
  };

  const valid = a.mantissa > 0 && b.mantissa > 0;
  const { raw, result } = valid ? (op === 'times' ? multiplyScientific(a, b) : divideScientific(a, b)) : { raw: a, result: a };
  const value = result.mantissa * 10 ** result.exponent;
  const tidy = toScientific(value, 3);
  const p = preset === null ? null : PRESETS[preset];
  const sign = op === 'times' ? '×' : '÷';
  const { value: prefixed, prefix } = withPrefix(value);

  return (
    <Figure
      number={number}
      title="The exponent machine"
      description="A calculator for numbers in scientific notation: enter two numbers as a front number and a power of ten, multiply or divide them, and see how the powers add or subtract. Worked examples answer questions such as how long sunlight takes to reach Earth."
      height={600}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the first number', symbol: <circle r="5" fill="var(--series-1)" /> },
        { label: 'the second number', symbol: <rect x="-5" y="-5" width="10" height="10" fill="var(--series-2)" /> },
        { label: 'the answer', symbol: <path d="M0 -7 L7 6 H-7 Z" fill="var(--text)" /> },
      ]}
    >
      <div className={figureStyles.toolbar}>
        <label htmlFor={presetId} className={figureStyles.inputLabel}>
          Example:
          <select
            id={presetId}
            className={styles.select}
            value={preset ?? ''}
            onChange={(e) => e.target.value !== '' && choose(Number(e.target.value))}
          >
            {preset === null && <option value="">Your own numbers</option>}
            {PRESETS.map((q, i) => (
              <option key={q.question} value={i}>
                {q.question}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.machine}>
        <NumberInput label="First number" value={a} onChange={(v) => (setA(v), setPreset(null))} shape="circle" />
        <div className={figureStyles.segmented} role="group" aria-label="Operation">
          <button type="button" aria-pressed={op === 'times'} onClick={() => (setOp('times'), setPreset(null))} aria-label="× (multiply)">
            ×
          </button>
          <button type="button" aria-pressed={op === 'over'} onClick={() => (setOp('over'), setPreset(null))} aria-label="÷ (divide)">
            ÷
          </button>
        </div>
        <NumberInput label="Second number" value={b} onChange={(v) => (setB(v), setPreset(null))} shape="square" />
      </div>

      {valid ? (
        <ol className={styles.working} aria-label="Working">
          <li>
            ({formatSci(a)}) {sign} ({formatSci(b)})
          </li>
          <li>
            = ({fmt(a.mantissa)} {sign} {fmt(b.mantissa)}) × 10
            <sup>
              {a.exponent} {op === 'times' ? '+' : '−'} {b.exponent < 0 ? `(${b.exponent})` : b.exponent}
            </sup>
            <span className={styles.why}>
              {op === 'times' ? 'multiply the front numbers, add the powers' : 'divide the front numbers, subtract the powers'}
            </span>
          </li>
          <li>
            = {fmt(raw.mantissa)} × {powerOfTen(raw.exponent)}
          </li>
          {Math.abs(raw.mantissa) >= 10 || Math.abs(raw.mantissa) < 1 ? (
            <li>
              = {fmt(tidy.mantissa)} × {powerOfTen(tidy.exponent)}
              <span className={styles.why}>tidy up: move the decimal point, and change the power to match</span>
            </li>
          ) : null}
          {tidy.exponent >= -3 && tidy.exponent < 10 && (
            <li>
              = {formatSignificant(value, 3)}
              <span className={styles.why}>written out</span>
            </li>
          )}
        </ol>
      ) : (
        <p className={figureStyles.bad}>Both numbers need to be bigger than zero.</p>
      )}

      {valid && <Ruler a={a} b={b} result={result} />}

      <Caption>
        {!valid
          ? 'Enter two positive numbers.'
          : p
            ? `${p.question} Take ${p.aName} and ${op === 'times' ? 'multiply it by' : 'divide it by'} ${p.bName}. The answer is ${formatScientific(value, 3)}${p.unit ? ` ${p.unit}` : ''}: ${p.meaning(value)}`
            : `The answer is ${formatScientific(value, 3)}. Its order of magnitude, the nearest power of ten, is ${powerOfTen(orderOfMagnitude(value))}${prefix.name ? `, and with a prefix it is ${formatSignificant(prefixed, 3)} ${prefix.name}-units (${prefix.symbol})` : ''}.`}
      </Caption>
    </Figure>
  );
}

function fmt(x: number): string {
  return formatSignificant(x, 4).replace('-', '−');
}

function formatSci({ mantissa, exponent }: Scientific): string {
  return `${fmt(mantissa)} × 10${superscript(exponent)}`;
}

/** A number in scientific notation: a front number and a power of ten, each with its own field. */
function NumberInput({
  label,
  value,
  onChange,
  shape,
}: {
  label: string;
  value: Scientific;
  onChange: (v: Scientific) => void;
  shape: 'circle' | 'square';
}) {
  const id = useId();
  const [mText, setMText] = useState(String(value.mantissa));
  const [eText, setEText] = useState(String(value.exponent));
  const [shown, setShown] = useState(value);
  // A new value from outside (a preset or a reset) replaces what's typed.
  if (shown !== value) {
    setShown(value);
    setMText(String(value.mantissa));
    setEText(String(value.exponent));
  }
  // A text field, so the decimal point shows as a point whatever the browser's language; a comma works too.
  const m = parseNumber(mText);
  const e = Number(eText);
  const mBad = mText === '' || !Number.isFinite(m) || m <= 0;
  const eBad = eText === '' || !Number.isInteger(e) || Math.abs(e) > 99;
  const commit = (mt: string, et: string) => {
    const mm = parseNumber(mt);
    const ee = Number(et);
    if (mt !== '' && Number.isFinite(mm) && mm > 0 && et !== '' && Number.isInteger(ee) && Math.abs(ee) <= 99) {
      const next = { mantissa: mm, exponent: ee };
      setShown(next);
      onChange(next);
    }
  };
  return (
    <fieldset className={styles.number}>
      <legend>
        <svg viewBox="-11 -11 22 22" width="14" height="14" aria-hidden="true">
          {shape === 'circle' ? <circle r="6" fill="var(--series-1)" /> : <rect x="-6" y="-6" width="12" height="12" fill="var(--series-2)" />}
        </svg>{' '}
        {label}
      </legend>
      <input
        id={`${id}-m`}
        type="text"
        inputMode="decimal"
        value={mText}
        aria-label={`${label}: the front number`}
        aria-invalid={mBad}
        onChange={(event) => {
          setMText(event.target.value);
          commit(event.target.value, eText);
        }}
      />
      <span aria-hidden="true">× 10</span>
      <input
        id={`${id}-e`}
        className={styles.exponent}
        type="number"
        inputMode="numeric"
        step={1}
        min={-99}
        max={99}
        value={eText}
        aria-label={`${label}: the power of ten`}
        aria-invalid={eBad}
        onChange={(event) => {
          setEText(event.target.value);
          commit(mText, event.target.value);
        }}
      />
      <span className={styles.plain}>{!mBad && !eBad ? `= ${plain(m * 10 ** e)}` : ''}</span>
    </fieldset>
  );
}

/** A number typed with a decimal point or a decimal comma. */
function parseNumber(text: string): number {
  return text.trim() === '' ? NaN : Number(text.trim().replace(',', '.'));
}

/** A number written out in full when that's readable, or in scientific notation otherwise. */
function plain(x: number): string {
  const e = Math.floor(Math.log10(x));
  if (e >= 0 && e < 16) return formatGrouped(Number(x.toPrecision(6)), 0);
  if (e < 0 && e > -7) return formatSignificant(x, 4);
  return formatScientific(x, 4);
}

/** A ruler of powers of ten, marking the two numbers and the answer. */
function Ruler({ a, b, result }: { a: Scientific; b: Scientific; result: Scientific }) {
  const log = (s: Scientific) => Math.log10(s.mantissa) + s.exponent;
  const values = [log(a), log(b), log(result)];
  const lo = Math.floor(Math.min(...values, 0)) - 1;
  const hi = Math.ceil(Math.max(...values, 0)) + 1;
  const W = 640;
  const x = (v: number) => 20 + ((v - lo) / (hi - lo)) * (W - 40);
  const every = Math.max(1, Math.ceil((hi - lo) / 12));
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / every) * every; t <= hi; t += every) ticks.push(t);
  return (
    <svg
      className={styles.ruler}
      viewBox={`0 0 ${W} 70`}
      role="img"
      aria-label={`A ruler of powers of ten from 10^${lo} to 10^${hi}, with the first number near 10^${values[0].toFixed(1)}, the second near 10^${values[1].toFixed(1)} and the answer near 10^${values[2].toFixed(1)}.`}
    >
      <line x1={20} y1={40} x2={W - 20} y2={40} className={styles.axis} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={35} x2={x(t)} y2={45} className={styles.axis} />
          <text x={x(t)} y={62} textAnchor="middle" className={styles.tick}>
            {powerOfTen(t)}
          </text>
        </g>
      ))}
      <circle cx={x(values[0])} cy={28} r={6} fill="var(--series-1)" />
      <rect x={x(values[1]) - 6} y={22} width={12} height={12} fill="var(--series-2)" />
      <path d={`M${x(values[2])} 16 l7 13 h-14 z`} fill="var(--text)" />
    </svg>
  );
}
