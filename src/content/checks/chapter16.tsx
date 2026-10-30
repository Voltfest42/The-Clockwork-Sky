import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkSmallestCloud } from './chapter16Answers';
import styles from './checks.module.css';

const isMass = (value: unknown): value is number => typeof value === 'number' && value >= 0.5 && value <= 20;

export function SmallestCloud() {
  return (
    <InteractiveQuestion
      id="smallest-cloud"
      prompt="Use Figure 16.2: a cloud of cold molecules at 10 K with a radius of 0.1 parsecs. What is the least mass that collapses?"
      initial={1}
      isState={isMass}
      check={(m) => checkSmallestCloud(m)}
    >
      {(mass, set) => <MassPicker mass={mass} onMass={set} />}
    </InteractiveQuestion>
  );
}

function MassPicker({ mass, onMass }: { mass: number; onMass: (m: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Mass</label>
      <input id={id} type="range" min={0.5} max={20} step={0.1} value={mass} onChange={(e) => onMass(Number(e.target.value))} aria-valuetext={`${mass.toFixed(1)} solar masses`} />
      <output htmlFor={id}>{mass.toFixed(1)} M☉</output>
    </div>
  );
}
