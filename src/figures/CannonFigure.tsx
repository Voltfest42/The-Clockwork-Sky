import { useMemo, useRef, useState, type ReactNode } from 'react';
import { R_EARTH } from '../core/constants';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { CIRCULAR_SPEED, describeShot, ESCAPE_SPEED, fire, formatDuration, gravityAt, LAUNCH_HEIGHT, positionAt, scaleBarLength, viewFor, type Shot } from './cannon';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Newton's cannon: fire a ball sideways from a mountain 100 km high. Slow, it
 * falls back; at 7.85 km/s it falls all the way round and is in orbit; at
 * 11.1 km/s it escapes. Every shot is computed by the n-body engine. The
 * picture zooms to fit the shots, everything at true scale but the ball.
 */

const W = 560;
const H = 400;
const COLOURS = ['#62d6c4', '#f6c453', '#f28cb1', '#8fb4ff', '#c3e88d'];
const MAX_SHOTS = 5;
const PRESETS = [4, 7, 7.9, 9.5, 11.2];
const R0 = R_EARTH + LAUNCH_HEIGHT;

type View = { cx: number; cy: number; half: number };

/** How long a shot takes to play, in real seconds: 2 to 9, about 10 minutes of flight a second. */
function playSeconds(shot: Shot): number {
  return Math.min(9, Math.max(2, shot.duration / 600));
}

export function CannonFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [speed, setSpeed] = useState(4000);
  const [shots, setShots] = useState<(Shot & { colour: string })[]>([]);
  const fired = useRef(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<View>(() => viewFor([], W / H));
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();

  const target = useMemo(() => viewFor(shots, W / H), [shots]);
  const shot = shots.at(-1);
  const loops = shot?.outcome === 'orbits' && !shot.leaves;
  const settled = Math.abs(Math.log(view.half / target.half)) < 0.002 && Math.hypot(view.cx - target.cx, view.cy - target.cy) < view.half * 0.002;

  useAnimationFrame((playing || !settled) && onScreen, (dt) => {
    if (!settled) {
      const f = Math.min(1, dt * 5);
      setView((v) => ({ cx: v.cx + (target.cx - v.cx) * f, cy: v.cy + (target.cy - v.cy) * f, half: v.half * (target.half / v.half) ** f }));
    }
    if (playing && shot) {
      const next = t + (dt * shot.duration) / playSeconds(shot);
      if (next >= shot.duration && !loops) {
        setT(shot.duration);
        setPlaying(false);
      } else setT(loops ? next % shot.duration : next);
    }
  });

  const shoot = (v: number) => {
    const s = { ...fire(v), colour: COLOURS[fired.current++ % COLOURS.length] };
    setSpeed(v);
    setShots((list) => [...list.slice(-(MAX_SHOTS - 1)), s]);
    if (reducedMotion) {
      setT(s.duration);
      setPlaying(false);
      setView(viewFor([...shots.slice(-(MAX_SHOTS - 1)), s], W / H));
    } else {
      setT(0);
      setPlaying(true);
    }
  };

  const reset = () => {
    fired.current = 0;
    setSpeed(4000);
    setShots([]);
    setT(0);
    setPlaying(false);
    setView(viewFor([], W / H));
  };

  const k = W / 2 / view.half;
  const sx = (x: number) => W / 2 + (x - view.cx) * k;
  const sy = (y: number) => H / 2 - (y - view.cy) * k;
  const line = (pts: readonly { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');

  // Newton's mountain, at true scale: 100 km high and 160 km across.
  const mountain = useMemo(() => {
    const w = 80_000 / R_EARTH;
    return Array.from({ length: 21 }, (_, i) => {
      const th = -w + (2 * w * i) / 20;
      const r = R_EARTH + LAUNCH_HEIGHT * (1 - Math.abs(th) / w);
      return { x: r * Math.sin(th), y: r * Math.cos(th) };
    });
  }, []);

  const ball = shot ? positionAt(shot, t) : { x: 0, y: R0 };
  const height = Math.hypot(ball.x, ball.y) - R_EARTH;
  const shown = shot ? shot.path.filter((p) => p.t <= t).concat([{ ...ball, t }]) : [];
  // Where the ball would be with no gravity: straight on along the line it was fired.
  const straight = shot && t > 0 && (shot.outcome !== 'orbits' || t < shot.duration / 4) ? { x: shot.speed * t, y: R0 } : null;
  const fallen = straight ? Math.hypot(straight.x - ball.x, straight.y - ball.y) : 0;
  const bar = scaleBarLength(view.half);
  const kms = (v: number) => (v / 1000).toFixed(1);

  return (
    <Figure
      number={number}
      title="Newton’s cannon"
      description="A cannon on top of a mountain 100 km high fires a ball sideways at a speed you choose, and the ball’s path is computed under Earth’s gravity. Slower than 7.85 km/s, it falls back to the ground, farther away the faster it goes; at 7.85 km/s it falls all the way round Earth and is in orbit; above 11.1 km/s it escapes and never comes back."
      height={780}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the latest shot (earlier ones fainter)', symbol: onSky(<path d="M-10 4 Q0 -8 10 4" stroke={COLOURS[0]} strokeWidth="2" fill="none" />) },
        { label: 'where the ball would go with no gravity', symbol: onSky(<path d="M-10 0 H10" stroke="#c8d2e8" strokeWidth="1.5" strokeDasharray="3 3" />) },
        { label: 'how far it has fallen from that line', symbol: onSky(<path d="M0 -8 V8" stroke="#ff8a7a" strokeWidth="2" />) },
        { label: 'Earth and the mountain, to scale', symbol: onSky(<circle r="7" fill="#2f6db5" />) },
      ]}
      simplified={
        <p>
          Earth is a perfect sphere with all its mass pulling from the centre, and it doesn’t spin. There is no air, so nothing slows the ball;
          a real cannonball at these speeds would burn up. The ball is drawn far too big. Each path is computed in small steps (the leapfrog
          method of the next section), a few thousand to an orbit.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} onClick={() => shoot(speed)}>
            Fire at {kms(speed)} km/s
          </button>
          <span className={styles.togglesLabel}>Or fire at</span>
          <span className={styles.presets} role="group" aria-label="Fire at a set speed">
            {PRESETS.map((v) => (
              <button key={v} type="button" className={styles.toggle} aria-pressed={shot?.speed === v * 1000} onClick={() => shoot(v * 1000)}>
                {v} km/s
              </button>
            ))}
          </span>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={seasonStyles.svg}
          role="img"
          aria-label={shot ? describeShot(shot) : 'Earth, with a cannon on top of a mountain 100 km high, ready to fire sideways.'}
        >
          <rect width={W} height={H} fill="#070b16" />
          <circle cx={sx(0)} cy={sy(0)} r={R_EARTH * k} fill="#2f6db5" />
          <circle cx={sx(0)} cy={sy(0)} r={R_EARTH * k} fill="none" stroke="#8fb4ff" strokeWidth="1.2" />
          <path d={line(mountain) + ' Z'} fill="#7a6a55" stroke="#c9b48f" strokeWidth="0.8" />
          {shots.slice(0, -1).map((s, i) => (
            <path key={i} d={line(s.path)} fill="none" stroke={s.colour} strokeOpacity={0.5} strokeWidth="1.6" />
          ))}
          {straight && (
            <>
              <line x1={sx(0)} y1={sy(R0)} x2={W + 20} y2={sy(R0)} stroke="#c8d2e8" strokeWidth="1.2" strokeDasharray="4 4" />
              <line x1={sx(straight.x)} y1={sy(straight.y)} x2={sx(ball.x)} y2={sy(ball.y)} stroke="#ff8a7a" strokeWidth="2" />
            </>
          )}
          {shot && <path d={line(shown)} fill="none" stroke={shot.colour} strokeWidth="2.4" />}
          <rect x={sx(0) - 2} y={sy(R0) - 3} width={14} height={6} rx={2} fill="#d9dde8" />
          <circle cx={sx(ball.x)} cy={sy(ball.y)} r={5} fill="#ffffff" stroke="#070b16" strokeWidth="1.5" />
          <g transform={`translate(16 ${H - 18})`}>
            <line x1={0} y1={0} x2={bar * k} y2={0} stroke="#c8d2e8" strokeWidth="2" />
            <line x1={0} y1={-4} x2={0} y2={4} stroke="#c8d2e8" strokeWidth="2" />
            <line x1={bar * k} y1={-4} x2={bar * k} y2={4} stroke="#c8d2e8" strokeWidth="2" />
            <text x={0} y={-8} fontSize="12" fill="var(--sky-text)">
              {(bar / 1000).toLocaleString('en-GB')} km
            </text>
          </g>
          {shot && (
            <text x={14} y={22} fontSize="13" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(t)} after firing · {Math.max(0, Math.round(height / 1000)).toLocaleString('en-GB')} km up
            </text>
          )}
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Speed
          <input
            type="range"
            min={0}
            max={12}
            step={0.1}
            value={speed / 1000}
            onChange={(e) => setSpeed(Math.round(Number(e.target.value) * 10) * 100)}
            aria-valuetext={`${kms(speed)} km/s`}
          />
          <output>{kms(speed)} km/s</output>
        </label>
        <div className={styles.readout}>
          <span>
            To circle from the mountain top: <b>{(CIRCULAR_SPEED / 1000).toFixed(2)} km/s</b>
          </span>
          <span>
            To escape: <b>{(ESCAPE_SPEED / 1000).toFixed(2)} km/s</b>
          </span>
          {shot && (
            <span>
              Gravity at the ball: <b>{Math.round(gravityAt(Math.max(0, height)) * 100)}%</b> of its pull at the ground
            </span>
          )}
          {straight && fallen > 1 && (
            <span>
              Fallen below the straight line: <b>{Math.round(fallen / 1000).toLocaleString('en-GB')} km</b>
            </span>
          )}
        </div>
      </div>
      <Caption>{shot ? describeShot(shot) : 'Choose a speed and fire. The ball leaves the cannon moving sideways, level with the ground.'}</Caption>
    </Figure>
  );
}
