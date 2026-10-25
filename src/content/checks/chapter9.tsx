import { useId } from 'react';
import { lightYearsFromParsecs } from '../../core/stars/distance';
import { starDot } from '../../core/stars/photometry';
import { sunMagnitude } from '../../figures/sunAway';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkSunAtTheLimit } from './chapter9Answers';
import styles from './checks.module.css';

const isParsecs = (value: unknown): value is number => typeof value === 'number' && value >= 1 && value <= 100;

export function SunAtTheLimit() {
  return (
    <InteractiveQuestion
      id="sun-at-the-limit"
      prompt="Move the Sun away until it is just too faint to see with your eyes alone (magnitude 6)."
      initial={2}
      isState={isParsecs}
      check={(pc) => checkSunAtTheLimit(pc)}
    >
      {(pc, setPc) => <Distance parsecs={pc} onParsecs={setPc} />}
    </InteractiveQuestion>
  );
}

function Distance({ parsecs, onParsecs }: { parsecs: number; onParsecs: (pc: number) => void }) {
  const id = useId();
  const ly = lightYearsFromParsecs(parsecs);
  const m = sunMagnitude(parsecs);
  const dot = starDot(m, 6.5);
  return (
    <div style={{ maxWidth: 420 }}>
      <svg viewBox="-60 -30 120 60" width="100%" style={{ maxWidth: 240, display: 'block' }} aria-hidden="true">
        <rect x={-60} y={-30} width={120} height={60} rx={6} fill="#070b16" />
        {dot.radius > 0 && <circle r={dot.radius} fill="#fff1c4" opacity={dot.alpha} />}
      </svg>
      <div className={styles.guess}>
        <label htmlFor={id}>Distance</label>
        <input
          id={id}
          type="range"
          min={0}
          max={2}
          step={0.002}
          value={Math.log10(parsecs)}
          onChange={(e) => onParsecs(Math.round(10 ** Number(e.target.value) * 100) / 100)}
          aria-valuetext={`${Math.round(ly)} light-years: the Sun is magnitude ${m.toFixed(1)}`}
        />
        <output htmlFor={id}>
          {Math.round(ly)} light-years · magnitude {m.toFixed(1)}
        </output>
      </div>
    </div>
  );
}
