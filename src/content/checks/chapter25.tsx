import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkNickel, NICKEL_QUESTION_START } from './chapter25Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is { nickel: number } => {
  if (!value || typeof value !== 'object') return false;
  const nickel = (value as Record<string, unknown>).nickel;
  return typeof nickel === 'number' && nickel >= 0.05 && nickel <= 1.4;
};

export function NickelForPeak() {
  return (
    <InteractiveQuestion
      id="nickel-for-sn2011fe"
      prompt="In Figure 25.3, with a white dwarf’s settings, how much nickel-56 puts the peak on SN 2011fe’s?"
      initial={{ nickel: NICKEL_QUESTION_START }}
      isState={isSettings}
      check={(s) => checkNickel(s)}
    >
      {(s, set) => <NickelPicker nickel={s.nickel} onChange={(nickel) => set({ nickel })} />}
    </InteractiveQuestion>
  );
}

function NickelPicker({ nickel, onChange }: { nickel: number; onChange: (nickel: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Nickel-56</label>
      <input
        id={id}
        type="range"
        min={0.05}
        max={1.4}
        step={0.01}
        value={nickel}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 100) / 100)}
        aria-valuetext={`${nickel.toFixed(2)} solar masses`}
      />
      <output htmlFor={id}>{nickel.toFixed(2)} M☉</output>
    </div>
  );
}
