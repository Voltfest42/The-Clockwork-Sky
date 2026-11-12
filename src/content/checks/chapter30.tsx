import { useId } from 'react';
import { keplerMass } from '../../core/galaxy/s2';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkWeighing, WEIGH_START } from './chapter30Answers';
import styles from './checks.module.css';

const isMeasurement = (value: unknown): value is { a: number; period: number } => {
  if (!value || typeof value !== 'object') return false;
  const { a, period } = value as Record<string, unknown>;
  return typeof a === 'number' && typeof period === 'number' && a >= 300 && a <= 2000 && period >= 5 && period <= 30;
};

export function WeighSagittarius() {
  return (
    <InteractiveQuestion
      id="weigh-sgr-a"
      prompt="Weigh Sagittarius A*: measure S2’s semi-major axis (in AU) and its period (in years) in Figure 30.5, and enter them here."
      initial={{ ...WEIGH_START }}
      isState={isMeasurement}
      check={(s) => checkWeighing(s)}
    >
      {(s, set) => <Measurements a={s.a} period={s.period} onChange={(next) => set({ ...s, ...next })} />}
    </InteractiveQuestion>
  );
}

function Measurements({ a, period, onChange }: { a: number; period: number; onChange: (next: { a?: number; period?: number }) => void }) {
  const aId = useId();
  const pId = useId();
  return (
    <>
      <div className={styles.guess}>
        <label htmlFor={aId}>Semi-major axis</label>
        <input id={aId} type="range" min={300} max={2000} step={5} value={a} onChange={(e) => onChange({ a: Number(e.target.value) })} aria-valuetext={`${a} AU`} />
        <output htmlFor={aId}>{a.toLocaleString('en-GB')} AU</output>
      </div>
      <div className={styles.guess}>
        <label htmlFor={pId}>Period</label>
        <input id={pId} type="range" min={5} max={30} step={0.1} value={period} onChange={(e) => onChange({ period: Math.round(Number(e.target.value) * 10) / 10 })} aria-valuetext={`${period.toFixed(1)} years`} />
        <output htmlFor={pId}>{period.toFixed(1)} years</output>
      </div>
      <p>
        Mass = a³ ÷ P² = {(keplerMass(a, period) / 1e6).toFixed(2)} million M☉
      </p>
    </>
  );
}
