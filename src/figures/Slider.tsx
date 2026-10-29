import styles from './sky/sky.module.css';

/**
 * A labelled range slider with its value beside it, on a linear or a
 * logarithmic scale (the slider moves through log₁₀ of the value). The value
 * is read out the same way to screen readers.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  log,
  format,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Step in the slider's own units (log₁₀ of the value when log). */
  step?: number;
  log?: boolean;
  format: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const position = log ? Math.log10(value) : value;
  return (
    <label className={styles.slider}>
      {label}
      <input
        type="range"
        min={log ? Math.log10(min) : min}
        max={log ? Math.log10(max) : max}
        step={step ?? (log ? 0.002 : (max - min) / 400)}
        value={position}
        disabled={disabled}
        onChange={(e) => onChange(log ? 10 ** Number(e.target.value) : Number(e.target.value))}
        aria-valuetext={format(value)}
      />
      <output>{format(value)}</output>
    </label>
  );
}
