import { useId } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkEarthTwin, TWIN_START, type TwinSettings } from './chapter19Answers';
import styles from './checks.module.css';

const isSettings = (value: unknown): value is TwinSettings => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.rv === 'number' && typeof v.light === 'number' && typeof v.nights === 'number' && v.rv >= 0.05 && v.light >= 10 && v.nights >= 10 && v.nights <= 3650;
};

export function DetectEarthTwin() {
  return (
    <InteractiveQuestion
      id="detect-earth-twin"
      prompt="As in Figure 19.1, an Earth twin orbits a Sun-like star, seen edge-on. Choose the instruments and how long to watch, so that its wobble or its transits stand out by 7.1σ."
      initial={TWIN_START}
      isState={isSettings}
      check={(s) => checkEarthTwin(s)}
    >
      {(s, set) => <TwinPicker settings={s} onChange={set} />}
    </InteractiveQuestion>
  );
}

/** The slider moves through log₁₀ of the value, in steps of 0.01 from a round end. */
const log2dp = (v: number) => Math.round(Math.log10(v) * 100) / 100;

function TwinPicker({ settings, onChange }: { settings: TwinSettings; onChange: (s: TwinSettings) => void }) {
  const id = useId();
  const rows: { key: keyof TwinSettings; label: string; min: number; max: number; text: (v: number) => string; spoken: (v: number) => string }[] = [
    { key: 'rv', label: 'Wobble precision', min: 0.05, max: 10, text: (v) => (v < 1 ? `${Math.round(v * 100)} cm/s` : `${v.toFixed(1)} m/s`), spoken: (v) => `${v.toFixed(2)} metres per second` },
    { key: 'light', label: 'Light precision', min: 10, max: 3000, text: (v) => `${Math.round(v)} ppm`, spoken: (v) => `${Math.round(v)} parts per million per half hour` },
    { key: 'nights', label: 'Nights watched', min: 30, max: 3650, text: (v) => Math.round(v).toLocaleString('en-GB'), spoken: (v) => `${Math.round(v)} nights` },
  ];
  return (
    <div>
      {rows.map((r) => {
        const value = settings[r.key];
        return (
          <div key={r.key} className={styles.guess}>
            <label htmlFor={`${id}${r.key}`}>{r.label}</label>
            <input
              id={`${id}${r.key}`}
              type="range"
              min={log2dp(r.min)}
              max={log2dp(r.max)}
              step={0.01}
              value={Math.log10(value)}
              onChange={(e) => {
                const v = 10 ** Number(e.target.value);
                onChange({ ...settings, [r.key]: r.key === 'nights' ? Math.round(v) : Number(v.toPrecision(3)) });
              }}
              aria-valuetext={r.spoken(value)}
            />
            <output htmlFor={`${id}${r.key}`}>{r.text(value)}</output>
          </div>
        );
      })}
    </div>
  );
}
