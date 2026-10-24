import { useRef, useState, type ReactNode } from 'react';
import { WEIGHING_PAIRS } from '../data/gravity';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { formatKm, formatPeriodDays, massFromOrbit, percentOff, scientific } from './weighing';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The cosmic scale: weigh the Sun, Earth, Jupiter, Mars or Pluto by measuring
 * a satellite's orbit on the figure. Set a ruler ring on the orbit, time some
 * laps with the stopwatch, and the figure works out the mass from Newton's
 * form of Kepler's third law, with whatever error the measurements carry.
 */

const W = 560;
const H = 360;
const ORBIT_PX = 140;
const SECONDS_PER_ORBIT = 6;

/** The ruler starts well inside the orbit, at a round value, so the reader has to set it. */
function startingRuler(a: number): number {
  const step = 10 ** Math.floor(Math.log10(a / 1000));
  return Math.round((0.6 * a) / step) * step;
}

export function CosmicScaleFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [pairId, setPairId] = useState('earth-moon');
  const pair = WEIGHING_PAIRS.find((p) => p.id === pairId)!;
  // The ruler moves in round steps (100 km for the Moon's orbit), a thousandth of the orbit or less.
  const rulerStep = 10 ** Math.floor(Math.log10(pair.a / 1000));
  const viewKm = Math.ceil((pair.a * (H / 2 - 8)) / ORBIT_PX / rulerStep) * rulerStep;
  const [ruler, setRuler] = useState(() => startingRuler(pair.a));
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState<number | null>(null);
  const [timed, setTimed] = useState<number | null>(null);
  const [laps, setLaps] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt;
    if (reducedMotion) {
      // Jump a twenty-fourth of an orbit at a time, at the same average pace.
      pending.current += dt;
      if (pending.current < SECONDS_PER_ORBIT / 24) return;
      step = SECONDS_PER_ORBIT / 24;
      pending.current = 0;
    }
    setTime((t) => t + (step * pair.period) / SECONDS_PER_ORBIT);
  });

  const choose = (id: string) => {
    const p = WEIGHING_PAIRS.find((x) => x.id === id)!;
    setPairId(id);
    setRuler(startingRuler(p.a));
    setTime(0);
    setStarted(null);
    setTimed(null);
    setLaps(1);
  };
  const reset = () => {
    choose('earth-moon');
    setPlaying(false);
  };
  const stopwatch = () => {
    if (started === null) {
      setStarted(time);
      setTimed(null);
      setPlaying(true);
    } else {
      setTimed(time - started);
      setStarted(null);
    }
  };

  // The satellite starts a quarter-turn before the start line, at the top, and goes anticlockwise.
  const angle = (2 * Math.PI * time) / pair.period;
  const cx = W / 2;
  const cy = H / 2;
  const sat = { x: cx + ORBIT_PX * Math.cos(angle), y: cy - ORBIT_PX * Math.sin(angle) };
  const pxPerKm = ORBIT_PX / pair.a;
  const centralPx = Math.max(6, pair.centralRadius * pxPerKm);
  const satellitePx = Math.max(5, pair.satelliteRadius * pxPerKm);
  const rulerPx = ruler * pxPerKm;
  const elapsed = started !== null ? time - started : timed;
  const period = timed !== null ? timed / laps : null;
  const measured = period ? massFromOrbit(ruler, period) : null;
  const accurate = massFromOrbit(pair.a, pair.period);

  const rulerOff = Math.abs(ruler - pair.a) / pair.a;
  let caption: string;
  if (measured) {
    const off = Math.abs(measured - pair.mass) / pair.mass;
    caption = `From your measurements, ${pair.central} weighs ${scientific(measured)} kg: ${percentOff(measured, pair.mass)} from the accurate value. ${
      off < 0.03
        ? 'Within a few per cent: the orbit is an accurate scale.'
        : rulerOff > 0.02
          ? 'Check the ruler: a distance 1% too big gives a mass 3% too big, because the distance is cubed.'
          : 'Check the timing: a period 1% too long gives a mass 2% too small, because the period is squared. Timing more laps helps.'
    }`;
  } else if (started !== null) caption = `Timing… stop the stopwatch when ${pair.satellite} has crossed the start line ${laps === 1 ? 'once' : `${laps} times`}.`;
  else caption = `Set the ruler ring on ${pair.satellite}’s orbit, then time ${pair.satellite} round with the stopwatch, from the start line back to it.`;

  return (
    <Figure
      number={number}
      title="The cosmic scale"
      description="A satellite circles a planet or the Sun: Earth round the Sun, the Moon or the space station round Earth, Io round Jupiter, Phobos round Mars, Charon round Pluto. You measure the orbit’s size with a ruler ring and its period with a stopwatch, and the figure works out the mass at the centre from Newton’s version of Kepler’s third law, comparing it with the accurate value."
      height={820}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'your ruler ring', symbol: onSky(<circle r="7" fill="none" stroke="#f6c453" strokeWidth="1.8" strokeDasharray="3 2" />) },
        { label: 'the start and finish line', symbol: onSky(<path d="M0 8 V-8" stroke="#ffffff" strokeWidth="1.5" />) },
        { label: 'the satellite and its orbit', symbol: onSky(<g><circle r="7" fill="none" stroke="#5c6b8a" strokeWidth="1" /><circle cx="7" r="2.5" fill="#62d6c4" /></g>) },
      ]}
      simplified={
        <p>
          The orbits are drawn as circles at their average distance (the Moon’s and Phobos’s are slightly oval), and run sped up. Bodies too small
          to see at this scale are drawn bigger. The formula gives the two bodies’ masses together; for the Moon and Charon the partner’s share
          is included in the accurate value. {pair.asOf && `The space station’s orbit is as of ${pair.asOf}: it sinks and is boosted, so its period changes.`}
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <span className={styles.presets} role="group" aria-label="Pair to weigh">
            {WEIGHING_PAIRS.map((p) => (
              <button key={p.id} type="button" className={styles.toggle} aria-pressed={p.id === pairId} onClick={() => choose(p.id)}>
                {p.name}
              </button>
            ))}
          </span>
        </div>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={stopwatch}>
            {started === null ? '⏱ Start the stopwatch' : '⏱ Stop the stopwatch'}
          </button>
          <span className={figureStyles.stepper} role="group" aria-label="Laps to time">
            <span className={styles.togglesLabel}>Laps</span>
            <button type="button" onClick={() => setLaps(Math.max(1, laps - 1))} aria-label="One lap fewer">
              −
            </button>
            <output aria-live="polite">{laps}</output>
            <button type="button" onClick={() => setLaps(Math.min(5, laps + 1))} aria-label="One lap more">
              +
            </button>
          </span>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={seasonStyles.svg}
          role="img"
          aria-label={`${pair.satellite} circling ${pair.central}. The ruler ring is set to ${formatKm(ruler)}${rulerOff < 0.01 ? ', on the orbit' : ruler < pair.a ? ', inside the orbit' : ', outside the orbit'}.`}
        >
          <rect width={W} height={H} fill="#070b16" />
          <line x1={cx} y1={cy} x2={cx} y2={8} stroke="#ffffff" strokeWidth="1.2" />
          <text x={cx + 6} y={20} fontSize="12" fill="var(--sky-muted)">
            start line
          </text>
          <circle cx={cx} cy={cy} r={ORBIT_PX} fill="none" stroke="#5c6b8a" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={centralPx} fill={pair.id.startsWith('sun') ? 'var(--sun)' : '#6f8fc9'} />
          <circle cx={cx} cy={cy} r={rulerPx} fill="none" stroke="#f6c453" strokeWidth="1.8" strokeDasharray="5 4" />
          <circle cx={sat.x} cy={sat.y} r={satellitePx} fill="#62d6c4" stroke="#070b16" strokeWidth="1" />
          <text x={14} y={H - 14} fontSize="13" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            Stopwatch: {elapsed === null ? '—' : formatPeriodDays(elapsed)}
          </text>
          <text x={W - 14} y={H - 14} textAnchor="end" fontSize="12" fill="var(--sky-muted)">
            Clock: {formatPeriodDays(time)} since the start
          </text>
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Ruler
          <input
            type="range"
            min={0}
            max={viewKm}
            step={rulerStep}
            value={ruler}
            onChange={(e) => setRuler(Number(e.target.value))}
            aria-valuetext={formatKm(ruler)}
          />
          <output>{formatKm(ruler)}</output>
        </label>
        <div className={figureStyles.summary} style={{ marginTop: 10 }}>
          <p>
            Distance: <b>{formatKm(ruler)}</b> · Period: <b>{period ? formatPeriodDays(period) : 'not timed yet'}</b>
            {timed !== null && laps > 1 && ` (${formatPeriodDays(timed)} for ${laps} laps)`}
          </p>
          <p>
            Mass = 4π² × distance³ ÷ (G × period²) = <b>{measured ? `${scientific(measured)} kg` : '…'}</b>
          </p>
          <p>
            Accurate value: <b>{scientific(pair.mass)} kg</b>, {pair.massOf}
            {Math.abs(accurate - pair.mass) / pair.mass > 0.005 && ` (this orbit’s true size and period give ${scientific(accurate)} kg)`}
          </p>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
