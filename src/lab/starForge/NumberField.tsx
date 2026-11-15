import { useState } from 'react';
import styles from './StarForge.module.css';

/** A number typed in, applied on Enter or when the field loses focus; the Forge clamps it and says so. */
export function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(String(value));
  }
  const commit = () => {
    const v = Number(text.replace('−', '-').replace(',', '.'));
    if (text.trim() === '' || v === value) return;
    onCommit(v);
  };
  return (
    <label className={styles.field}>
      {label}
      <input
        value={text}
        inputMode="decimal"
        size={7}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
    </label>
  );
}
