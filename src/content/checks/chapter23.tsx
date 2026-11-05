import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkPileUp, PILE_UP_CHOICES, PILE_UP_START } from './chapter23Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is { N: number } => {
  if (!value || typeof value !== 'object') return false;
  const N = (value as Record<string, unknown>).N;
  return typeof N === 'number' && (PILE_UP_CHOICES as readonly number[]).includes(N);
};

export function FirstPileUp() {
  return (
    <InteractiveQuestion
      id="first-pile-up"
      prompt="In Figure 23.2, run the slow process from its iron seed. At which magic number of neutrons does the flow first pile up?"
      initial={{ N: PILE_UP_START }}
      isState={isSettings}
      check={(s) => checkPileUp(s)}
    >
      {(s, set) => <NeutronPicker N={s.N} onChange={(N) => set({ N })} />}
    </InteractiveQuestion>
  );
}

function NeutronPicker({ N, onChange }: { N: number; onChange: (N: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Neutrons</label>
      <select id={id} value={N} onChange={(e) => onChange(Number(e.target.value))}>
        {PILE_UP_CHOICES.map((n) => (
          <option key={n} value={n}>
            N = {n}
          </option>
        ))}
      </select>
    </div>
  );
}
