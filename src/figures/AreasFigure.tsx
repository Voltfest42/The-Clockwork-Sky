import { useMemo, useRef, useState, type ReactNode } from 'react';
import { areaSweptByIntegration, ellipseArea, pointAtMeanAnomaly, semiMinorAxis } from '../core/orbits/ellipse';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { formatE, ORBIT_PRESETS, presetFor, speedKmS, speedRange, wedge } from './ellipses';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Kepler's second law: a planet moves along its ellipse so that the line from
 * the Sun sweeps out equal areas in equal times. The orbit is split into 12
 * wedges, each swept in a twelfth of the orbit's time: long and thin far from
 * the Sun, short and wide near it, and all the same area, which the figure
 * measures by adding up thin slices.
 */

const W = 560;
const H = 330;
const A = 200;
const WEDGES = 12;
const SECONDS_PER_ORBIT = 12;
const COLOURS = ['rgba(79, 132, 245, 0.55)', 'rgba(217, 119, 6, 0.55)'];

export function AreasFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [e, setE] = useState(0.6);
  const [a, setA] = useState(1);
  const [fraction, setFraction] = useState(0.1);
  const [playing, setPlaying] = useState(false);
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
      step = 1 / 48;
    }
    setFraction((f) => (f + step) % 1);
  });

  const orbit = { a: 1, e };
  const b = semiMinorAxis(orbit);
  // Centre the ellipse; the Sun sits at the right focus, with perihelion on the right, and the planet goes anticlockwise.
  const cx = W / 2;
  const sunX = cx + A * e;
  const cy = H / 2;
  const at = (p: { x: number; y: number }) => ({ x: sunX + A * p.x, y: cy - A * p.y });
  const M = 2 * Math.PI * fraction;
  const planet = pointAtMeanAnomaly(orbit, M);
  const P = at(planet);
  const current = Math.floor(fraction * WEDGES);
  const measured = useMemo(() => {
    const o = { a: 1, e };
    return Array.from({ length: WEDGES }, (_, k) => areaSweptByIntegration(o, (2 * Math.PI * k) / WEDGES, (2 * Math.PI * (k + 1)) / WEDGES, 600) / ellipseArea(o));
  }, [e]);
  const speed = speedKmS(planet.r * a, a);
  const { fastest, slowest } = speedRange({ a, e });
  const preset = presetFor(e);

  const path = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${at(p).x.toFixed(1)} ${at(p).y.toFixed(1)}`).join(' ') + ' Z';
  const outline = Array.from({ length: 181 }, (_, i) => {
    const E = (2 * Math.PI * i) / 180;
    return `${(cx + A * Math.cos(E)).toFixed(1)},${(cy - A * b * Math.sin(E)).toFixed(1)}`;
  }).join(' ');

  const reset = () => {
    setE(0.6);
    setA(1);
    setFraction(0.1);
    setPlaying(false);
  };
  const choose = (id: string) => {
    const p = ORBIT_PRESETS.find((x) => x.id === id)!;
    setE(p.e);
    setA(p.a);
  };

  return (
    <Figure
      number={number}
      title="Sweeping areas"
      description="A planet on an elliptical orbit, with the orbit cut into twelve wedges from the Sun, each swept out in a twelfth of the orbit’s time. Near the Sun the wedges are short and wide, far away long and thin, but they all have the same area: Kepler’s second law. A readout gives the planet’s speed, fastest nearest the Sun."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'wedges swept in equal times (alternate colours)', symbol: onSky(<g><path d="M0 0 L10 -6 L10 6 Z" fill={COLOURS[0]} /><path d="M0 0 L-10 -6 L-10 6 Z" fill={COLOURS[1]} /></g>) },
        { label: 'the line from the Sun to the planet', symbol: onSky(<path d="M-10 0 H10" stroke="#ffffff" strokeWidth="2" />) },
        { label: 'the Sun, at a focus', symbol: onSky(<circle r="5" fill="var(--sun)" />) },
      ]}
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <span className={styles.togglesLabel}>Orbit</span>
          <span className={styles.presets} role="group" aria-label="Orbit">
            {ORBIT_PRESETS.filter((p) => p.id !== 'circle' && p.id !== 'mars').map((p) => (
              <button key={p.id} type="button" className={styles.toggle} aria-pressed={preset?.id === p.id} onClick={() => choose(p.id)}>
                {p.name}
              </button>
            ))}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={`An orbit of eccentricity ${formatE(e)} cut into twelve wedges of equal area. The planet is in wedge ${current + 1}, moving at ${speed.toFixed(1)} km/s.`}>
          {measured.map((_, k) => {
            const M1 = (2 * Math.PI * k) / WEDGES;
            const M2 = (2 * Math.PI * (k + 1)) / WEDGES;
            const isCurrent = k === current;
            return <path key={k} d={path(wedge(orbit, M1, isCurrent ? M : M2))} fill={COLOURS[k % 2]} fillOpacity={k < current || isCurrent ? 1 : 0.28} stroke="#070b16" strokeWidth="0.8" />;
          })}
          <polyline points={outline} fill="none" stroke="#c8d2e8" strokeWidth="1.2" />
          <line x1={sunX} y1={cy} x2={P.x} y2={P.y} stroke="#ffffff" strokeWidth="2" />
          <circle cx={sunX} cy={cy} r="9" fill="var(--sun)" />
          <circle cx={P.x} cy={P.y} r="7" fill="#62d6c4" stroke="#070b16" strokeWidth="1.5" />
          <text x={14} y={24} fontSize="13" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            Speed: {speed.toFixed(1)} km/s
          </text>
          <text x={14} y={42} fontSize="12" fill="var(--sky-muted)">
            Wedge {current + 1} of 12
          </text>
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Eccentricity
          <input
            type="range"
            min={0}
            max={0.97}
            step={0.01}
            value={e}
            onChange={(ev) => {
              setE(Number(ev.target.value));
              setA(1);
            }}
            aria-valuetext={formatE(e)}
          />
          <output>{formatE(e)}</output>
        </label>
        <label className={styles.slider}>
          Time
          <input
            type="range"
            min={0}
            max={0.999}
            step={0.001}
            value={fraction}
            onChange={(ev) => {
              setFraction(Number(ev.target.value));
              setPlaying(false);
            }}
            aria-valuetext={`${Math.round(fraction * 100)}% of the way round in time, in wedge ${current + 1}, at ${speed.toFixed(1)} km/s`}
          />
          <output>{Math.round(fraction * 100)}% of the orbit</output>
        </label>
        <div className={styles.readout}>
          <span>
            Each wedge’s area, measured: <b>{(Math.min(...measured) * 100).toFixed(2)}%</b> to <b>{(Math.max(...measured) * 100).toFixed(2)}%</b> of the whole
          </span>
          <span>
            Speed: <b>{fastest.toFixed(1)} km/s</b> nearest the Sun, <b>{slowest.toFixed(1)} km/s</b> farthest ({preset ? preset.name : 'for an orbit averaging 1 AU from the Sun'})
          </span>
        </div>
      </div>
      <Caption>
        {e < 0.05
          ? 'This orbit is so nearly a circle that the wedges look alike: the planet’s speed hardly changes.'
          : `Near the Sun the planet covers a long stretch of orbit in each twelfth of its year, far away only a short one, yet every wedge has the same area. It moves ${(fastest / slowest).toFixed(fastest / slowest > 10 ? 0 : 1)} times faster nearest the Sun than farthest away.`}
      </Caption>
    </Figure>
  );
}
