import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkIsco, ISCO_START } from './chapter27Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is { radius: number } => {
  if (!value || typeof value !== 'object') return false;
  const radius = (value as Record<string, unknown>).radius;
  return typeof radius === 'number' && radius >= 2 && radius <= 15;
};

export function SmallestStableOrbit() {
  return (
    <InteractiveQuestion
      id="smallest-stable-orbit"
      prompt="In Figure 27.1, how close to a black hole is the smallest stable circular orbit?"
      initial={{ radius: ISCO_START }}
      isState={isSettings}
      check={(s) => checkIsco(s)}
    >
      {(s, set) => <RadiusPicker radius={s.radius} onChange={(radius) => set({ radius })} />}
    </InteractiveQuestion>
  );
}

function RadiusPicker({ radius, onChange }: { radius: number; onChange: (radius: number) => void }) {
  const id = useId();
  return (
    <div className={styles.guess}>
      <label htmlFor={id}>Distance from the centre</label>
      <input
        id={id}
        type="range"
        min={2}
        max={15}
        step={0.1}
        value={radius}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 10) / 10)}
        aria-valuetext={`${radius.toFixed(1)} GM over c squared`}
      />
      <output htmlFor={id}>{radius.toFixed(1)} GM/c²</output>
    </div>
  );
}
