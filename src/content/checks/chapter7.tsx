import { useId, useMemo } from 'react';
import { R_EARTH } from '../../core/constants';
import { fire } from '../../figures/cannon';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkOrbitSpeed } from './chapter7Answers';
import styles from './checks.module.css';

const isSpeed = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 12_000;

export function OrbitSpeed() {
  return (
    <InteractiveQuestion
      id="orbit-speed"
      prompt="Set the cannon’s speed so that the ball goes into orbit and never comes down."
      initial={5000}
      isState={isSpeed}
      check={(v) => checkOrbitSpeed(v)}
    >
      {(v, setV) => <Speed speed={v} onSpeed={setV} />}
    </InteractiveQuestion>
  );
}

/** The speed slider, under a small Earth with the shot's path. */
function Speed({ speed, onSpeed }: { speed: number; onSpeed: (v: number) => void }) {
  const id = useId();
  return (
    <div style={{ maxWidth: 420 }}>
      <Sketch speed={speed} />
      <div className={styles.guess}>
        <label htmlFor={id}>Speed</label>
        <input id={id} type="range" min={0} max={12} step={0.05} value={speed / 1000} onChange={(e) => onSpeed(Math.round(Number(e.target.value) * 1000))} aria-valuetext={`${(speed / 1000).toFixed(2)} km/s`} />
        <output htmlFor={id}>{(speed / 1000).toFixed(2)} km/s</output>
      </div>
    </div>
  );
}

function Sketch({ speed }: { speed: number }) {
  const shot = useMemo(() => fire(speed), [speed]);
  const k = 70 / R_EARTH;
  const path = shot.path.map((p, i) => `${i ? 'L' : 'M'}${(100 + p.x * k).toFixed(1)} ${(100 - p.y * k).toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 200, display: 'block' }} aria-hidden="true">
      <rect width="200" height="200" rx="8" fill="#070b16" />
      <clipPath id="orbit-speed-clip">
        <rect width="200" height="200" rx="8" />
      </clipPath>
      <circle cx="100" cy="100" r="70" fill="#2f6db5" />
      <path d={path} fill="none" stroke="#62d6c4" strokeWidth="2" clipPath="url(#orbit-speed-clip)" />
      <circle cx="100" cy={100 - (R_EARTH + 100_000) * k} r="3" fill="#ffffff" />
    </svg>
  );
}
