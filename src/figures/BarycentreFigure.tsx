import { useRef, useState, type ReactNode } from 'react';
import { BALANCE_PAIRS } from '../data/gravity';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { balanceDistance, balancePeriod, describeBalance, wobbleSpeed } from './barycentre';
import { formatPeriodDays } from './weighing';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Both bodies move: two bodies circle their shared balance point, the
 * barycentre. Left, the pair, with the distance between them fixed on the
 * page; right, a close-up of the heavier body at true scale, wobbling round
 * the balance point. A slider sets the mass ratio.
 */

const W = 560;
const H = 300;
const SPLIT = 330;
const SEPARATION_PX = 136;
const SECONDS_PER_ORBIT = 8;
const LOG_MAX = 6;
const HEAVY = '#6f8fc9';
const LIGHT = '#c9b48f';
const CROSS = '#f28cb1';

function Cross({ x, y }: { x: number; y: number }) {
  return <path d={`M${x - 6} ${y} H${x + 6} M${x} ${y - 6} V${y + 6}`} stroke={CROSS} strokeWidth="2.2" />;
}

export function BarycentreFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [pairId, setPairId] = useState('earth-moon');
  const pair = BALANCE_PAIRS.find((p) => p.id === pairId)!;
  const [ratio, setRatio] = useState(pair.ratio);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState(0.1);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt / SECONDS_PER_ORBIT;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 1 / 16;
    }
    setPhase((p) => (p + step) % 1);
  });

  const choose = (id: string) => {
    const p = BALANCE_PAIRS.find((x) => x.id === id)!;
    setPairId(id);
    setRatio(p.ratio);
  };
  const reset = () => {
    choose('earth-moon');
    setPlaying(false);
    setPhase(0.1);
  };

  const angle = 2 * Math.PI * phase;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const d = balanceDistance(ratio, pair.separation);
  const heavyFrac = 1 / (1 + ratio);
  // The pair, round the balance point.
  const bx = SPLIT / 2;
  const by = H / 2;
  const toPx = SEPARATION_PX / pair.separation;
  const heavyR = Math.max(5, pair.heavyRadius * toPx);
  const lightR = Math.max(3, Math.min(pair.lightRadius * toPx, heavyR));
  const heavy = { x: bx - SEPARATION_PX * heavyFrac * c, y: by + SEPARATION_PX * heavyFrac * s };
  const light = { x: bx + SEPARATION_PX * (1 - heavyFrac) * c, y: by - SEPARATION_PX * (1 - heavyFrac) * s };
  // The close-up: the balance point fixed in the middle, the heavy body at true scale circling it.
  const zx = SPLIT + (W - SPLIT) / 2;
  const zy = H / 2;
  // Fit the body's whole swing round the balance point inside the panel.
  const zoom = 100 / (pair.heavyRadius + d);
  const zr = pair.heavyRadius * zoom;
  const zc = { x: zx - d * zoom * c, y: zy + d * zoom * s };
  const period = balancePeriod(pair, ratio);
  const wobble = wobbleSpeed(pair, ratio);
  const sliderValue = Math.log10(ratio);
  const ratioText = ratio < 10 ? ratio.toFixed(2) : Math.round(ratio).toLocaleString('en-GB');

  return (
    <Figure
      number={number}
      title="The barycentre"
      description="Two bodies circle their shared balance point, the barycentre, which divides the line between them in the inverse ratio of their masses. Earth and the Moon’s is inside Earth; Pluto and Charon’s is in the space between them; Jupiter swings the Sun round a point just outside its surface. A slider sets the mass ratio, and a close-up shows the heavier body at true scale wobbling round the balance point."
      height={720}
      tryThis={tryThis}
      orrery="preset=earth-moon"
      onReset={reset}
      notToScale
      legend={[
        { label: 'the balance point (barycentre)', symbol: onSky(<path d="M-6 0 H6 M0 -6 V6" stroke={CROSS} strokeWidth="2.2" />) },
        { label: 'the heavier body', symbol: onSky(<circle r="6" fill={HEAVY} />) },
        { label: 'the lighter body', symbol: onSky(<circle r="4" fill={LIGHT} />) },
        { label: 'their paths round the balance point', symbol: onSky(<circle r="7" fill="none" stroke="#5c6b8a" strokeWidth="1.2" />) },
      ]}
      simplified={
        <p>
          On the left the bodies are drawn far too big for the distance between them (the close-up on the right is to scale). The orbits are
          circles. Changing the ratio keeps the heavier body’s mass and changes the lighter one’s.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <span className={styles.presets} role="group" aria-label="Pair">
            {BALANCE_PAIRS.map((p) => (
              <button key={p.id} type="button" className={styles.toggle} aria-pressed={p.id === pairId && Math.abs(ratio - p.ratio) < 1e-9} onClick={() => choose(p.id)}>
                {p.name}
              </button>
            ))}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={`${pair.heavy} is ${ratioText} times as heavy as ${pair.light}. ${describeBalance(pair, ratio)}`}>
          <rect width={W} height={H} fill="#070b16" />
          <circle cx={bx} cy={by} r={SEPARATION_PX * heavyFrac} fill="none" stroke="#5c6b8a" strokeWidth="1" />
          <circle cx={bx} cy={by} r={SEPARATION_PX * (1 - heavyFrac)} fill="none" stroke="#5c6b8a" strokeWidth="1" />
          <line x1={heavy.x} y1={heavy.y} x2={light.x} y2={light.y} stroke="#5c6b8a" strokeWidth="1" strokeDasharray="3 4" />
          <circle cx={heavy.x} cy={heavy.y} r={heavyR} fill={HEAVY} />
          <circle cx={light.x} cy={light.y} r={lightR} fill={LIGHT} />
          <Cross x={bx} y={by} />
          <line x1={SPLIT} y1={10} x2={SPLIT} y2={H - 10} stroke="#2a3550" strokeWidth="1" />
          <text x={SPLIT + 12} y={22} fontSize="12" fill="var(--sky-muted)">
            Close-up of {pair.heavy}, to scale
          </text>
          <clipPath id="barycentre-close-up">
            <rect x={SPLIT + 1} y={0} width={W - SPLIT - 1} height={H} />
          </clipPath>
          <g clipPath="url(#barycentre-close-up)">
            <circle cx={zx} cy={zy} r={d * zoom} fill="none" stroke="#5c6b8a" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={zc.x} cy={zc.y} r={zr} fill={HEAVY} fillOpacity={0.85} />
            <Cross x={zx} y={zy} />
          </g>
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Mass ratio
          <input
            type="range"
            min={0}
            max={LOG_MAX}
            step={0.01}
            value={sliderValue}
            onChange={(e) => setRatio(10 ** Number(e.target.value))}
            aria-valuetext={`${pair.heavy} ${ratioText} times as heavy as ${pair.light}`}
          />
          <output>{ratioText} : 1</output>
        </label>
        <div className={styles.readout}>
          <span>
            Balance point: <b>{Math.round(d).toLocaleString('en-GB')} km</b> from {pair.heavy}’s centre
          </span>
          <span>
            Once round: <b>{formatPeriodDays(period)}</b>
          </span>
          <span>
            {pair.heavy[0].toUpperCase() + pair.heavy.slice(1)} wobbles at <b>{wobble < 1000 ? `${wobble.toFixed(wobble < 10 ? 2 : 1)} m/s` : `${(wobble / 1000).toFixed(1)} km/s`}</b>
          </span>
        </div>
      </div>
      <Caption>{describeBalance(pair, ratio)}</Caption>
    </Figure>
  );
}
