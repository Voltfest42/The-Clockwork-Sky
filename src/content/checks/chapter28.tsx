import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkStream, STREAM_START } from './chapter28Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is { q: number } => {
  if (!value || typeof value !== 'object') return false;
  const q = (value as Record<string, unknown>).q;
  return typeof q === 'number' && q >= 0.1 && q <= 10;
};

export function StreamMissesCompanion() {
  return (
    <InteractiveQuestion
      id="stream-misses"
      prompt="In Figure 28.1, with the companion at its starting radius, set a mass ratio (donor ÷ companion) at which the stream from L1 misses the companion and forms a disc."
      initial={{ q: STREAM_START }}
      isState={isSettings}
      check={(s) => checkStream(s)}
    >
      {(s, set) => <RatioPicker q={s.q} onChange={(q) => set({ q })} />}
    </InteractiveQuestion>
  );
}

function RatioPicker({ q, onChange }: { q: number; onChange: (q: number) => void }) {
  const id = useId();
  const text = q < 1 ? q.toFixed(2) : q.toFixed(1);
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Mass ratio, donor ÷ companion</label>
      <input
        id={id}
        type="range"
        min={-1}
        max={1}
        step={0.01}
        value={Math.log10(q)}
        onChange={(e) => onChange(Number((10 ** Number(e.target.value)).toPrecision(2)))}
        aria-valuetext={text}
      />
      <output htmlFor={id}>{text}</output>
    </div>
  );
}
