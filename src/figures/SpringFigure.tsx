import { useMemo, useState, type ReactNode } from 'react';
import { METHODS, type Method } from '../core/integrate/steppers';
import { Caption, Figure } from '../viz/Figure';
import { LineChart } from '../viz/LineChart';
import { exactSpring, springEnergies, stepSpring, SWING_STEPS, SWINGS } from './spring';
import { METHOD_NAMES } from './stepping';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Steps on a spring: a weight bouncing on a spring, computed in steps by
 * Euler, leapfrog or RK4, against the exact motion. Euler's swings grow,
 * leapfrog's stay the same size, RK4's shrink very slowly.
 */

/** "+31%", "−0.4%", "+0.012%", "under 0.001%". */
function change(energy: number): string {
  const p = (energy - 1) * 100;
  const a = Math.abs(p);
  if (a < 0.001) return 'under 0.001%';
  const sign = p > 0 ? '+' : '−';
  return `${sign}${a >= 10 ? Math.round(a) : a >= 0.1 ? a.toFixed(1) : a.toFixed(3)}%`;
}

export function SpringFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [method, setMethod] = useState<Method>('euler');
  const [choice, setChoice] = useState(6);
  const steps = SWING_STEPS[choice];
  const run = useMemo(() => stepSpring(method, steps), [method, steps]);
  const energies = useMemo(() => springEnergies(steps), [steps]);
  const exact = useMemo(() => Array.from({ length: 60 * SWINGS + 1 }, (_, i) => ({ x: i / 60, y: exactSpring(i / 60) })), []);
  const reset = () => {
    setMethod('euler');
    setChoice(6);
  };
  const e = energies[method];

  return (
    <Figure
      number={number}
      title="Steps on a spring"
      description="A weight bouncing on a spring, computed in steps and drawn against the exact motion over three swings. You choose the method and how many steps each swing is cut into: Euler’s swings grow, leapfrog’s stay the same size, and RK4 follows the exact curve closely."
      height={560}
      tryThis={tryThis}
      onReset={reset}
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Method">
          {METHODS.map((m) => (
            <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)}>
              {METHOD_NAMES[m]}
            </button>
          ))}
        </span>
      </div>
      <LineChart
        series={[
          { name: 'Exact', color: 'var(--text-muted)', dashed: true, points: exact },
          { name: `${METHOD_NAMES[method]}, ${steps} steps a swing`, color: 'var(--series-1)', points: run.points },
        ]}
        xLabel="Time (swings)"
        yLabel="Position"
        xMin={0}
        xMax={SWINGS}
        yMin={-3}
        yMax={3}
        yTicks={[-3, -2, -1, 0, 1, 2, 3]}
        formatY={(y) => String(y)}
        xTicks={[0, 1, 2, 3].map((v) => ({ value: v, label: String(v) }))}
        baseline={0}
        dots={steps <= 16}
        height={260}
        ariaLabel={`The weight’s position over three swings, exact and computed by ${METHOD_NAMES[method]} with ${steps} steps a swing. After three swings its energy has changed by ${change(e)}.`}
      />
      <label className={styles.slider} style={{ marginTop: 10 }}>
        Steps a swing
        <input
          type="range"
          min={0}
          max={SWING_STEPS.length - 1}
          step={1}
          value={choice}
          onChange={(ev) => setChoice(Number(ev.target.value))}
          aria-valuetext={`${steps} steps a swing`}
        />
        <output>{steps}</output>
      </label>
      <div className={styles.readout}>
        <span>Energy after three swings:</span>
        {METHODS.map((m) => (
          <span key={m}>
            {METHOD_NAMES[m]} <b>{change(energies[m])}</b>
          </span>
        ))}
      </div>
      <Caption>
        {method === 'euler'
          ? `Euler’s method uses the speed at the start of each step for the whole step, so the weight overshoots a little every time: the swings grow, and after three the energy is up ${change(e)}. More steps help, but the swings still grow.`
          : method === 'leapfrog'
            ? `Leapfrog splits each step’s change of speed into two halves around the move. The swings stay the same size for ever: after three, the energy has changed by ${change(e)}, and the error doesn’t build up.`
            : `RK4 tries the spring’s pull four times in each step and blends them, so it follows the exact curve closely: after three swings the energy has changed by ${change(e)}. But its small error always leaks the same way, and over a very long run the swings slowly die.`}
      </Caption>
    </Figure>
  );
}
