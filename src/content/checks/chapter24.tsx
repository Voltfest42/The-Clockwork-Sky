import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkEarthSized, EARTH_SIZED_START } from './chapter24Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is { mass: number } => {
  if (!value || typeof value !== 'object') return false;
  const mass = (value as Record<string, unknown>).mass;
  return typeof mass === 'number' && mass >= 0.2 && mass <= 1.45;
};

export function EarthSizedWhiteDwarf() {
  return (
    <InteractiveQuestion
      id="earth-sized-white-dwarf"
      prompt="In Figure 24.2, what is the mass of a white dwarf the size of Earth?"
      initial={{ mass: EARTH_SIZED_START }}
      isState={isSettings}
      check={(s) => checkEarthSized(s)}
    >
      {(s, set) => <MassPicker mass={s.mass} onChange={(mass) => set({ mass })} />}
    </InteractiveQuestion>
  );
}

function MassPicker({ mass, onChange }: { mass: number; onChange: (mass: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Mass</label>
      <input
        id={id}
        type="range"
        min={0.2}
        max={1.45}
        step={0.01}
        value={mass}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 100) / 100)}
        aria-valuetext={`${mass.toFixed(2)} solar masses`}
      />
      <output htmlFor={id}>{mass.toFixed(2)} M☉</output>
    </div>
  );
}
