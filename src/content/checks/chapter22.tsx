import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { formatHotKelvin } from '../../figures/furnace';
import { checkCrossover, CROSSOVER_START } from './chapter22Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is { T: number } => {
  if (!value || typeof value !== 'object') return false;
  const T = (value as Record<string, unknown>).T;
  return typeof T === 'number' && T >= 10e6 && T <= 30e6;
};

export function Crossover() {
  return (
    <InteractiveQuestion
      id="cno-crossover"
      prompt="In Figure 22.2, with a newborn star’s make-up, at what temperature does the CNO cycle start to make more heat than the pp chains?"
      initial={{ T: CROSSOVER_START }}
      isState={isSettings}
      check={(s) => checkCrossover(s)}
    >
      {(s, set) => <TemperaturePicker T={s.T} onChange={(T) => set({ T })} />}
    </InteractiveQuestion>
  );
}

function TemperaturePicker({ T, onChange }: { T: number; onChange: (T: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Temperature</label>
      <input
        id={id}
        type="range"
        min={10}
        max={30}
        step={0.1}
        value={T / 1e6}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 10) * 1e5)}
        aria-valuetext={formatHotKelvin(T)}
      />
      <output htmlFor={id}>{formatHotKelvin(T)}</output>
    </div>
  );
}
