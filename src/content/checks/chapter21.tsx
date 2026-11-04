import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { formatLuminosity } from '../../figures/energy';
import { checkTwoSuns, TWO_SUNS_START } from './chapter21Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is { luminosity: number } => {
  if (!value || typeof value !== 'object') return false;
  const l = (value as Record<string, unknown>).luminosity;
  return typeof l === 'number' && l >= 1 && l <= 1000;
};

export function TwoSuns() {
  return (
    <InteractiveQuestion
      id="two-suns"
      prompt="In Figure 21.4, build a star of twice the Sun’s mass, with X = 0.7 and Z = 0.02. How many times as bright as the Sun is it?"
      initial={{ luminosity: TWO_SUNS_START }}
      isState={isSettings}
      check={(s) => checkTwoSuns(s)}
    >
      {(s, set) => <LuminosityPicker luminosity={s.luminosity} onChange={(luminosity) => set({ luminosity })} />}
    </InteractiveQuestion>
  );
}

function LuminosityPicker({ luminosity, onChange }: { luminosity: number; onChange: (l: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Luminosity</label>
      <input
        id={id}
        type="range"
        min={0}
        max={3}
        step={0.01}
        value={Math.log10(luminosity)}
        onChange={(e) => onChange(Number((10 ** Number(e.target.value)).toPrecision(2)))}
        aria-valuetext={formatLuminosity(luminosity)}
      />
      <output htmlFor={id}>{formatLuminosity(luminosity)}</output>
    </div>
  );
}
