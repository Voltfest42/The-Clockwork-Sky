import { useId } from 'react';
import { formatSuns, solarLuminosity } from '../../figures/thermal';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { StarDisc } from '../../viz/star/StarDisc';
import { checkHalfTemperature, type StarState } from './chapter11Answers';
import styles from './checks.module.css';

const isStar = (value: unknown): value is StarState =>
  typeof value === 'object' && value !== null && typeof (value as StarState).radius === 'number' && typeof (value as StarState).kelvin === 'number';

export function HalfTemperature() {
  return (
    <InteractiveQuestion
      id="half-temperature"
      prompt="Make a star exactly as luminous as the Sun, but with half the Sun’s surface temperature."
      initial={{ radius: 1, kelvin: 5772 }}
      isState={isStar}
      check={(s) => checkHalfTemperature(s)}
    >
      {(s, set) => <MakeStar star={s} onStar={set} />}
    </InteractiveQuestion>
  );
}

function MakeStar({ star, onStar }: { star: StarState; onStar: (s: StarState) => void }) {
  const r = useId();
  const t = useId();
  const L = solarLuminosity(star.radius, star.kelvin);
  return (
    <div style={{ maxWidth: 440 }}>
      <svg viewBox="-60 -40 120 80" width="100%" style={{ maxWidth: 240, display: 'block' }} role="img" aria-label={`A star ${formatSuns(star.radius)} times the Sun’s radius beside the Sun`}>
        <rect x={-60} y={-40} width={120} height={80} rx={6} fill="#070b16" />
        <StarDisc cx={-38} cy={0} r={4} kelvin={5772} title="the Sun" />
        <StarDisc cx={14} cy={0} r={Math.min(36, 4 * star.radius)} kelvin={star.kelvin} title="your star" />
      </svg>
      <div className={styles.guess}>
        <label htmlFor={r}>Radius</label>
        <input id={r} type="range" min={-1} max={1.3} step={0.001} value={Math.log10(star.radius)} onChange={(e) => onStar({ ...star, radius: Math.round(10 ** Number(e.target.value) * 1000) / 1000 })} aria-valuetext={`${formatSuns(star.radius)} times the Sun’s`} />
        <output htmlFor={r}>{formatSuns(star.radius)} R☉</output>
      </div>
      <div className={styles.guess}>
        <label htmlFor={t}>Temperature</label>
        <input id={t} type="range" min={2000} max={8000} step={10} value={star.kelvin} onChange={(e) => onStar({ ...star, kelvin: Number(e.target.value) })} aria-valuetext={`${star.kelvin} K`} />
        <output htmlFor={t}>{star.kelvin.toLocaleString('en-GB')} K</output>
      </div>
      <p style={{ margin: '6px 0 0' }}>
        Luminosity: <b>{formatSuns(L)}</b> times the Sun’s
      </p>
    </div>
  );
}
