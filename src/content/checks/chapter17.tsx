import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { formatMyr } from '../../figures/starLives';
import { checkPleiadesAge } from './chapter17Answers';
import styles from './checks.module.css';

const isAge = (value: unknown): value is number => typeof value === 'number' && value >= 10 && value <= 15000;

export function PleiadesAge() {
  return (
    <InteractiveQuestion
      id="pleiades-age"
      prompt="Use Figure 17.3: pick the Pleiades and slide the age until the line’s turn-off matches the cluster’s. How old are the Pleiades?"
      initial={1000}
      isState={isAge}
      check={(age) => checkPleiadesAge(age)}
    >
      {(age, set) => <AgePicker age={age} onAge={set} />}
    </InteractiveQuestion>
  );
}

function AgePicker({ age, onAge }: { age: number; onAge: (a: number) => void }) {
  const id = useId();
  const position = Math.log10(age);
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Age</label>
      <input
        id={id}
        type="range"
        min={1}
        max={Math.log10(15000)}
        step={0.005}
        value={position}
        onChange={(e) => onAge(Number((10 ** Number(e.target.value)).toPrecision(2)))}
        aria-valuetext={formatMyr(age)}
      />
      <output htmlFor={id}>{formatMyr(age)}</output>
    </div>
  );
}
