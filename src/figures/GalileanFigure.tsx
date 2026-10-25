import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { NBodyMessage } from '../core/nbody/protocol';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { useNBody } from '../viz/nbody/useNBody';
import { describeLaps, galileanBodies, inFrame, JUPITER_RADIUS_KM, LapCounter, MOON_COLOURS, MOONS, orbitFrame, PERIODS, STEP_DAYS, type MoonId } from './galilean';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Jupiter's clockwork moons: Io, Europa, Ganymede and Callisto computed live
 * by the n-body engine in its Web Worker, from JPL's positions on 1 January
 * 2026. Count the laps: 4 of Io and 2 of Europa for each of Ganymede's.
 */

const W = 560;
const H = 360;
const STRIP = 64;
const TRAIL = 160;
const ZOOMS = {
  all: { name: 'All four', reach: 1_950_000 },
  inner: { name: 'The inner three', reach: 1_120_000 },
} as const;
const SPEEDS = [0.5, 1, 2, 4, 8];
const JUPITER = '#d9b48a';

type Positions = Record<MoonId, { x: number; y: number }>;

export function GalileanFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const bodies = useMemo(() => galileanBodies(), []);
  const frame = useMemo(() => orbitFrame(bodies), [bodies]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [zoom, setZoom] = useState<keyof typeof ZOOMS>('all');
  const [days, setDays] = useState(0);
  const [positions, setPositions] = useState<Positions | null>(null);
  const [laps, setLaps] = useState<Record<MoonId, number>>({ io: 0, europa: 0, ganymede: 0, callisto: 0 });
  const [problem, setProblem] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [paths, setPaths] = useState<Record<MoonId, { x: number; y: number }[]> | null>(null);
  const counters = useRef<Record<MoonId, LapCounter> | null>(null);
  const trails = useRef<Record<MoonId, { x: number; y: number }[]>>({ io: [], europa: [], ganymede: [], callisto: [] });
  const lapNext = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  const post = useNBody((m: NBodyMessage) => {
    if (m.type === 'error') {
      setProblem(m.message);
      setPlaying(false);
      return;
    }
    if (m.steps === 0 || !counters.current) {
      counters.current = Object.fromEntries(MOONS.map((moon) => [moon.id, new LapCounter()])) as Record<MoonId, LapCounter>;
      trails.current = { io: [], europa: [], ganymede: [], callisto: [] };
    }
    // The trail has every tracked body (Jupiter, then the moons) after each step: count laps from it, in order.
    const width = 15;
    for (let k = 0; k + width <= m.trail.length; k += width) {
      const j = [m.trail[k], m.trail[k + 1], m.trail[k + 2]] as const;
      MOONS.forEach((moon, i) => {
        const at = k + 3 * (i + 1);
        const p = inFrame(frame, j, [m.trail[at], m.trail[at + 1], m.trail[at + 2]]);
        counters.current![moon.id].see(Math.atan2(p.y, p.x));
        const trail = trails.current[moon.id];
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 4000) trail.push(p);
        if (trail.length > TRAIL) trail.shift();
      });
    }
    const jupiter = [m.x[0], m.x[1], m.x[2]] as const;
    setPositions(Object.fromEntries(MOONS.map((moon, i) => [moon.id, inFrame(frame, jupiter, [m.x[3 * (i + 1)], m.x[3 * (i + 1) + 1], m.x[3 * (i + 1) + 2]])])) as Positions);
    setLaps(Object.fromEntries(MOONS.map((moon) => [moon.id, counters.current![moon.id].laps])) as Record<MoonId, number>);
    setPaths(Object.fromEntries(MOONS.map((moon) => [moon.id, [...trails.current[moon.id]]])) as Record<MoonId, { x: number; y: number }[]>);
    setDays(m.t);
  });

  useEffect(() => {
    counters.current = null;
    post({ type: 'load', bodies, method: 'leapfrog', dt: STEP_DAYS, track: [0, 1, 2, 3, 4] });
    if (lapNext.current) {
      lapNext.current = false;
      // Just over Ganymede's lap (the model's moons run a shade slow), in one go.
      post({ type: 'step', steps: Math.round((1.002 * PERIODS.ganymede) / STEP_DAYS) });
    }
  }, [post, bodies, run]);

  useEffect(() => {
    if (playing && onScreen && !reducedMotion) post({ type: 'run', rate: speed, postEvery: 1 / 30 });
    else post({ type: 'pause' });
  }, [post, playing, onScreen, reducedMotion, speed, run]);

  // With reduced motion, the moons jump a quarter of a day every half second instead of gliding.
  useAnimationFrame(playing && onScreen && reducedMotion, (dt) => {
    pending.current += dt;
    if (pending.current < 0.5) return;
    pending.current = 0;
    post({ type: 'step', steps: Math.round(0.25 / STEP_DAYS) });
  });

  const restart = () => {
    setPlaying(false);
    setProblem(null);
    setRun((r) => r + 1);
  };
  const reset = () => {
    restart();
    setSpeed(2);
    setZoom('all');
  };
  const oneLap = () => {
    lapNext.current = true;
    restart();
  };

  const reach = ZOOMS[zoom].reach;
  const scale = (H / 2 - 14) / reach;
  const cx = W / 2;
  const cy = H / 2;
  const sx = (x: number) => cx + x * scale;
  const sy = (y: number) => cy - y * scale;
  const jupiterR = JUPITER_RADIUS_KM * scale;
  const caption = problem ?? describeLaps(days, laps);
  const shown = MOONS.filter((m) => zoom === 'all' || m.id !== 'callisto');
  const stripScale = (W / 2 - 20) / reach;

  return (
    <Figure
      number={number}
      title="Jupiter’s clockwork moons"
      description="Jupiter’s four large moons, Io, Europa, Ganymede and Callisto, seen from above their orbits and computed live from JPL’s positions for 1 January 2026, with a counter of the laps each has made. Io goes round four times and Europa twice for each lap of Ganymede: the three are locked in a 1 : 2 : 4 resonance. A strip below shows them as they look from far off, strung along a line, as Galileo saw them."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'Jupiter (to scale)', symbol: onSky(<circle r="6" fill={JUPITER} />) },
        ...MOONS.map((m) => ({ label: `${m.name}, with its recent path`, symbol: onSky(<><path d="M-10 5 Q-4 -4 3 -3" stroke={MOON_COLOURS[m.id]} strokeOpacity="0.5" fill="none" /><circle cx="4" cy="-3" r="3.5" fill={MOON_COLOURS[m.id]} /></>) })),
      ]}
      simplified={
        <p>
          Jupiter and its moons pull on each other as points, computed by leapfrog in steps of 7.2 minutes. The Sun’s pull and Jupiter’s
          flattened shape are left out, so over weeks the computed moons fall behind the real ones (Io by a few degrees a week). The moons are
          drawn far bigger than they are.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={oneLap}>
            Run one lap of Ganymede
          </button>
          <span className={figureStyles.segmented} role="group" aria-label="Zoom">
            {(Object.keys(ZOOMS) as (keyof typeof ZOOMS)[]).map((z) => (
              <button key={z} type="button" aria-pressed={zoom === z} onClick={() => setZoom(z)}>
                {ZOOMS[z].name}
              </button>
            ))}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H + STRIP}`} className={seasonStyles.svg} role="img" aria-label={caption}>
          <rect width={W} height={H + STRIP} fill="#070b16" />
          <clipPath id="galilean-clip">
            <rect width={W} height={H} />
          </clipPath>
          <g clipPath="url(#galilean-clip)">
            {shown.map((m) => {
              const r = Math.hypot(m.x[0], m.x[1], m.x[2]) * scale;
              return <circle key={m.id} cx={cx} cy={cy} r={r} fill="none" stroke="#2a3550" strokeWidth="1" />;
            })}
            {shown.map((m) => (
              <path
                key={m.id}
                d={(paths?.[m.id] ?? []).map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ')}
                fill="none"
                stroke={MOON_COLOURS[m.id]}
                strokeOpacity={0.45}
                strokeWidth="1.5"
              />
            ))}
            <circle cx={cx} cy={cy} r={jupiterR} fill={JUPITER} />
            {positions &&
              shown.map((m) => {
                const p = positions[m.id];
                return (
                  <g key={m.id}>
                    <circle cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill={MOON_COLOURS[m.id]} />
                    <text x={sx(p.x) + 8} y={sy(p.y) - 6} fontSize="12" fill="var(--sky-text)">
                      {m.name}
                    </text>
                  </g>
                );
              })}
          </g>
          <text x={14} y={22} fontSize="13" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            Day {days.toFixed(1)}
          </text>
          <line x1={0} y1={H} x2={W} y2={H} stroke="#2a3550" />
          <text x={14} y={H + 18} fontSize="11" fill="var(--sky-muted)">
            Seen edge-on from below the picture, as from Earth
          </text>
          <circle cx={cx} cy={H + STRIP / 2 + 8} r={JUPITER_RADIUS_KM * stripScale} fill={JUPITER} />
          {positions &&
            shown.map((m) => (
              <circle key={m.id} cx={cx + positions[m.id].x * stripScale} cy={H + STRIP / 2 + 8} r={2.5} fill={MOON_COLOURS[m.id]}>
                <title>{m.name}</title>
              </circle>
            ))}
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Speed
          <input
            type="range"
            min={0}
            max={SPEEDS.length - 1}
            step={1}
            value={SPEEDS.indexOf(speed)}
            onChange={(e) => setSpeed(SPEEDS[Number(e.target.value)])}
            aria-valuetext={`${speed} days a second`}
          />
          <output>{speed} days a second</output>
        </label>
        <div className={styles.readout}>
          {MOONS.map((m) => (
            <span key={m.id}>
              {m.name}: <b>{Math.floor(laps[m.id] + 0.01)}</b> laps <span style={{ color: 'var(--text-muted)' }}>(once round in {PERIODS[m.id]} days)</span>
            </span>
          ))}
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
