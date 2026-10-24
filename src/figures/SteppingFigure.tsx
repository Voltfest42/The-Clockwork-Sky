import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { METHODS, type Method, type StepStage } from '../core/integrate/steppers';
import type { NBodyMessage, NBodySnapshot } from '../core/nbody/protocol';
import { orbitOutline } from '../core/orbits/ellipse';
import { Caption, Figure } from '../viz/Figure';
import { useOnScreen, useReducedMotion } from '../viz/hooks';
import { LineChart } from '../viz/LineChart';
import { useNBody } from '../viz/nbody/useNBody';
import { energyHistory, ERROR_FLOOR, formatEnergyError, METHOD_NAMES, orbitBodies, PERIOD, powerOfTen, stagesOfStep, STEP_CHOICES } from './stepping';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Orbits, one step at a time: a planet round the Sun, computed by the n-body
 * engine in a Web Worker with Euler, leapfrog or RK4 and a step you choose.
 * Euler spirals outward, leapfrog stays on track, RK4 is accurate but drifts
 * slowly. A chart compares the three methods' energy errors over 20 orbits.
 */

const W = 560;
const H = 360;
const SECONDS_PER_ORBIT = 4;
const MAX_TRAIL = 30_000;
const ESCAPED = 3.6;
const SERIES: Record<Method, string> = { euler: 'var(--series-2)', leapfrog: 'var(--series-1)', rk4: 'var(--series-3)' };

export function SteppingFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [method, setMethod] = useState<Method>('euler');
  const [choice, setChoice] = useState(4);
  const [e, setE] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [snap, setSnap] = useState<NBodySnapshot | null>(null);
  const [trail, setTrail] = useState<number[]>([]);
  const [stages, setStages] = useState<{ from: [number, number]; stages: StepStage[] } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const steps = STEP_CHOICES[choice];

  const post = useNBody((m: NBodyMessage) => {
    if (m.type === 'error') {
      setProblem(m.message);
      setPlaying(false);
      return;
    }
    setSnap(m);
    const points: number[] = [];
    for (let i = 0; i < m.trail.length; i += 3) points.push(m.trail[i], m.trail[i + 1]);
    setTrail((prev) => (m.steps === 0 ? points : prev.concat(points).slice(-MAX_TRAIL)));
    if (Math.hypot(m.x[3] - m.x[0], m.x[4] - m.x[1]) > ESCAPED) setPlaying(false);
  });

  // A new simulation whenever the method, step or orbit changes, or the reader starts again.
  useEffect(() => {
    post({ type: 'load', bodies: orbitBodies(e), method, dt: PERIOD / steps, track: [1] });
  }, [post, method, steps, e, run]);

  useEffect(() => {
    if (playing && onScreen) post({ type: 'run', rate: PERIOD / SECONDS_PER_ORBIT, postEvery: reducedMotion ? 0.5 : 1 / 30 });
    else post({ type: 'pause' });
  }, [post, playing, onScreen, reducedMotion, run, method, steps, e]);

  const history = useMemo(() => METHODS.map((m) => ({ method: m, points: energyHistory(m, steps, e) })), [steps, e]);

  const restart = (change?: () => void) => {
    change?.();
    setPlaying(false);
    setStages(null);
    setProblem(null);
    setRun((r) => r + 1);
  };
  const reset = () =>
    restart(() => {
      setMethod('euler');
      setChoice(4);
      setE(0);
    });

  const oneStep = () => {
    if (!snap) return;
    setPlaying(false);
    setStages({ from: [snap.x[3], snap.x[4]], stages: stagesOfStep(method, snap.x, snap.v, steps) });
    post({ type: 'step' });
  };

  // Fit the picture round the orbit, and round the trail if it has spiralled out.
  let reach = 1 + e;
  for (let i = 0; i < trail.length; i += 2) reach = Math.max(reach, Math.hypot(trail[i], trail[i + 1]));
  const scale = (H / 2 - 16) / Math.min(ESCAPED, reach * 1.05);
  const sun = snap ? [snap.x[0], snap.x[1]] : [0, 0];
  const cx = W / 2;
  const cy = H / 2;
  const sx = (x: number) => cx + x * scale;
  const sy = (y: number) => cy - y * scale;
  const outline = orbitOutline({ a: 1, e }, 180)
    .map((p, i) => `${i ? 'L' : 'M'}${sx(p.x + sun[0]).toFixed(1)} ${sy(p.y + sun[1]).toFixed(1)}`)
    .join(' ');
  // Draw at most about 3,000 points of a long trail, always including the latest.
  const stride = 2 * Math.max(1, Math.ceil(trail.length / 6_000));
  const path: string[] = [];
  for (let i = Math.max(0, trail.length - 2) % stride; i < trail.length; i += stride) path.push(`${path.length ? 'L' : 'M'}${sx(trail[i]).toFixed(1)} ${sy(trail[i + 1]).toFixed(1)}`);
  const dots = steps <= 60 ? Math.min(trail.length / 2, 400) : 0;
  const planet = snap ? { x: snap.x[3], y: snap.x[4] } : { x: 1 - e, y: 0 };
  const velocity = snap ? { x: snap.v[3] - snap.v[0], y: snap.v[4] - snap.v[1] } : { x: 0, y: 0 };
  const dt = PERIOD / steps;
  const r = Math.hypot(planet.x - sun[0], planet.y - sun[1]);
  const orbits = snap ? snap.t / PERIOD : 0;
  const error = snap?.energyError ?? 0;
  const escaped = r > ESCAPED;

  let caption: string;
  if (problem) caption = problem;
  else if (escaped) caption = `With ${METHOD_NAMES[method]} and ${steps} steps an orbit, the planet has been flung out of the picture: each step added a little energy, and the orbit spiralled outward until it broke free.`;
  else if (!snap || snap.steps === 0) caption = `Press Play, or One step, to compute the orbit with ${METHOD_NAMES[method]}’s method in steps of ${dt.toFixed(dt < 10 ? 1 : 0)} days.`;
  else if (method === 'euler') caption = `Euler’s method gains energy on every step, so the orbit grows: after ${orbits.toFixed(1)} orbits the energy is off by ${formatEnergyError(error)}. Smaller steps slow the spiral down, but never stop it.`;
  else if (method === 'leapfrog') caption = `Leapfrog’s energy error rises and falls each orbit but doesn’t grow: ${formatEnergyError(error)} after ${orbits.toFixed(1)} orbits. The orbit slowly turns, but stays the right size for ever.`;
  else caption = `RK4 samples the pull four times a step, so it’s very accurate: ${formatEnergyError(error)} after ${orbits.toFixed(1)} orbits. But its error only grows, slowly draining the orbit’s energy.`;

  const yTicks = [-12, -9, -6, -3, 0];
  return (
    <Figure
      number={number}
      title="Step by step"
      description="A planet goes round the Sun, its orbit computed in steps: velocity moves the planet, gravity bends the velocity. You choose how many steps an orbit is cut into, and the method: Euler’s method, the obvious one, gains energy and spirals outward; leapfrog stays on track for ever; RK4 is far more accurate per step but slowly drifts. A chart compares their energy errors over 20 orbits."
      height={980}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the exact orbit', symbol: onSky(<path d="M-10 0 H10" stroke="#c8d2e8" strokeWidth="1.5" strokeDasharray="3 3" />) },
        { label: 'the computed path, a dot at every step', symbol: onSky(<g><path d="M-10 4 L0 -3 L10 4" stroke="#62d6c4" strokeWidth="1.8" fill="none" /><circle cx="0" cy="-3" r="2" fill="#62d6c4" /></g>) },
        { label: 'velocity: where the next step would carry it', symbol: onSky(<path d="M-9 0 H6 M2 -4 L8 0 L2 4" stroke="#f6c453" strokeWidth="1.8" fill="none" />) },
        { label: 'RK4’s trial points (after One step)', symbol: onSky(<circle r="4" fill="none" stroke="#f28cb1" strokeWidth="1.5" />) },
      ]}
      simplified={
        <p>
          The orbit is the size of Earth’s, with an Earth-mass planet, and the Sun moves a little too. The three methods are exactly the ones
          named, with no tricks: real simulations adjust the step as they go, or use methods made for orbits (the Orrery does).
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Method">
            {METHODS.map((m) => (
              <button key={m} type="button" aria-pressed={method === m} onClick={() => restart(() => setMethod(m))}>
                {METHOD_NAMES[m]}
              </button>
            ))}
          </span>
          <span className={styles.presets} role="group" aria-label="Orbit">
            <button type="button" className={styles.toggle} aria-pressed={e === 0} onClick={() => restart(() => setE(0))}>
              A circle
            </button>
            <button type="button" className={styles.toggle} aria-pressed={e === 0.5} onClick={() => restart(() => setE(0.5))}>
              Stretched (e = 0.5)
            </button>
          </span>
        </div>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} disabled={escaped || !!problem} onClick={() => { setStages(null); setPlaying(!playing); }}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button type="button" className={figureStyles.toolButton} disabled={escaped || !!problem || !snap} onClick={oneStep}>
            One step
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={() => restart()}>
            Start again
          </button>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={`${METHOD_NAMES[method]}, ${steps} steps an orbit. ${caption}`}>
          <rect width={W} height={H} fill="#070b16" />
          <path d={outline} fill="none" stroke="#c8d2e8" strokeWidth="1.2" strokeDasharray="4 4" opacity={0.8} />
          {path.length > 1 && <path d={path.join(' ')} fill="none" stroke="#62d6c4" strokeWidth="1.6" />}
          {dots > 0 &&
            Array.from({ length: dots }, (_, k) => {
              const i = trail.length - 2 * (k + 1);
              return <circle key={k} cx={sx(trail[i])} cy={sy(trail[i + 1])} r={2.2} fill="#62d6c4" />;
            })}
          <circle cx={sx(sun[0])} cy={sy(sun[1])} r={9} fill="var(--sun)" />
          {stages && (
            <g>
              {stages.stages
                .filter((s) => s.kind === 'probe')
                .map((s, i) => (
                  <circle key={i} cx={sx(s.x[3])} cy={sy(s.x[4])} r={5} fill="none" stroke="#f28cb1" strokeWidth="1.5" />
                ))}
              <line x1={sx(stages.from[0])} y1={sy(stages.from[1])} x2={sx(planet.x)} y2={sy(planet.y)} stroke="#ffffff" strokeWidth="1" strokeDasharray="2 3" />
            </g>
          )}
          {!escaped && (
            <>
              <line x1={sx(planet.x)} y1={sy(planet.y)} x2={sx(planet.x + velocity.x * dt)} y2={sy(planet.y + velocity.y * dt)} stroke="#f6c453" strokeWidth="2" markerEnd="url(#step-arrow)" />
              <circle cx={sx(planet.x)} cy={sy(planet.y)} r={6} fill="#62d6c4" stroke="#070b16" strokeWidth="1.5" />
            </>
          )}
          <defs>
            <marker id="step-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#f6c453" />
            </marker>
          </defs>
          <text x={14} y={22} fontSize="13" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {METHOD_NAMES[method]} · {orbits.toFixed(2)} orbits · energy {snap && snap.steps > 0 ? formatEnergyError(error) : 'exact'}
          </text>
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Steps an orbit
          <input
            type="range"
            min={0}
            max={STEP_CHOICES.length - 1}
            step={1}
            value={choice}
            onChange={(ev) => restart(() => setChoice(Number(ev.target.value)))}
            aria-valuetext={`${steps} steps an orbit, ${dt.toFixed(dt < 10 ? 1 : 0)} days each`}
          />
          <output>
            {steps} ({dt.toFixed(dt < 10 ? 1 : 0)} days each)
          </output>
        </label>
        <div className={styles.readout}>
          <span>
            Distance from the Sun: <b>{escaped ? `over ${ESCAPED} AU` : `${r.toFixed(3)} AU`}</b>
          </span>
          <span>
            Steps taken: <b>{(snap?.steps ?? 0).toLocaleString('en-GB')}</b>
          </span>
          <span>
            Pulls worked out: <b>{((snap?.steps ?? 0) * (method === 'rk4' ? 4 : 1)).toLocaleString('en-GB')}</b>
          </span>
        </div>
        <div className={figureStyles.below}>
          <LineChart
            series={history.map((h) => ({ name: METHOD_NAMES[h.method], color: SERIES[h.method], dashed: h.method !== method, points: h.points }))}
            xLabel="Orbits"
            yLabel="Energy error"
            xMin={0}
            xMax={20}
            yMin={Math.log10(ERROR_FLOOR)}
            yMax={1}
            yTicks={yTicks}
            formatY={(y) => (y === 0 ? '100%' : powerOfTen(y))}
            xTicks={[0, 5, 10, 15, 20].map((v) => ({ value: v, label: String(v) }))}
            markers={orbits > 0 && orbits <= 20 ? [{ x: orbits, label: 'now', faint: true }] : []}
            dots={false}
            height={230}
            ariaLabel={`Energy error over 20 orbits with ${steps} steps an orbit, on a scale of powers of ten. ${history
              .map((h) => `${METHOD_NAMES[h.method]}: ${powerOfTen(Math.round(h.points.at(-1)!.y))} after ${Math.round(h.points.at(-1)!.x)} orbits`)
              .join('; ')}.`}
          />
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
