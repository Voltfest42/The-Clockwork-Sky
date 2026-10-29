import { useId } from 'react';
import { CYCLES } from '../../figures/sunspots';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkTallestCycle } from './chapter15Answers';
import styles from './checks.module.css';

const isCycle = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= CYCLES.length;

export function TallestCycle() {
  return (
    <InteractiveQuestion
      id="tallest-cycle"
      prompt="Use Figure 15.2: which solar cycle had the most sunspots at its peak?"
      initial={0}
      isState={isCycle}
      check={(n) => checkTallestCycle(n)}
    >
      {(n, set) => <CyclePicker n={n} onPick={set} />}
    </InteractiveQuestion>
  );
}

function CyclePicker({ n, onPick }: { n: number; onPick: (n: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Cycle</label>
      <select id={id} value={n} onChange={(e) => onPick(Number(e.target.value))}>
        <option value={0}>Pick one</option>
        {CYCLES.map((c) => (
          <option key={c.n} value={c.n}>
            Cycle {c.n} ({Math.floor(c.start)}–{c.end ? Math.floor(c.end) : ''})
          </option>
        ))}
      </select>
    </div>
  );
}
