import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkSunIndex, SUN_N_START } from './chapter20Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is { n: number } => {
  if (!value || typeof value !== 'object') return false;
  const n = (value as Record<string, unknown>).n;
  return typeof n === 'number' && n >= 0 && n <= 4.9;
};

export function SunPolytrope() {
  return (
    <InteractiveQuestion
      id="sun-polytrope"
      prompt="As in Figure 20.4, give a polytrope the Sun’s mass and radius. Which index n gives it the Sun’s central density, 154 g/cm³?"
      initial={{ n: SUN_N_START }}
      isState={isSettings}
      check={(s) => checkSunIndex(s)}
    >
      {(s, set) => <IndexPicker n={s.n} onChange={(n) => set({ n })} />}
    </InteractiveQuestion>
  );
}

function IndexPicker({ n, onChange }: { n: number; onChange: (n: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Index n</label>
      <input id={id} type="range" min={0} max={4.9} step={0.05} value={n} onChange={(e) => onChange(Math.round(Number(e.target.value) * 20) / 20)} aria-valuetext={n.toFixed(2)} />
      <output htmlFor={id}>{n.toFixed(2)}</output>
    </div>
  );
}
