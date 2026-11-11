import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkChirp, CHIRP_START } from './chapter29Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is { mc: number } => {
  if (!value || typeof value !== 'object') return false;
  const mc = (value as Record<string, unknown>).mc;
  return typeof mc === 'number' && mc >= 5 && mc <= 60;
};

export function MatchTheChirp() {
  return (
    <InteractiveQuestion
      id="match-the-chirp"
      prompt="In Figure 29.3, what chirp mass at the source makes the model’s sweep match GW150914’s? (The masses keep GW150914’s ratio.)"
      initial={{ mc: CHIRP_START }}
      isState={isSettings}
      check={(s) => checkChirp(s)}
    >
      {(s, set) => <ChirpMassPicker mc={s.mc} onChange={(mc) => set({ mc })} />}
    </InteractiveQuestion>
  );
}

function ChirpMassPicker({ mc, onChange }: { mc: number; onChange: (mc: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Chirp mass at the source</label>
      <input
        id={id}
        type="range"
        min={5}
        max={60}
        step={0.5}
        value={mc}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 2) / 2)}
        aria-valuetext={`${mc.toFixed(1)} solar masses`}
      />
      <output htmlFor={id}>{mc.toFixed(1)} M☉</output>
    </div>
  );
}
