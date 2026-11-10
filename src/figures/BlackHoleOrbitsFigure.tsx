import { useMemo, useState, type PointerEvent, type ReactNode } from 'react';
import { circularOrbits, classify, effectivePotential, ISCO, newtonPotentialEnergy, PHOTON_SPHERE, potentialEnergy } from '../core/gr/schwarzschild';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useReducedMotion } from '../viz/hooks';
import { ScatterChart } from '../viz/ScatterChart';
import { E_RANGE, formatDegrees, L_RANGE, ORBIT_PRESETS, ORBIT_START, orbitPair, positionAt, turnedBy, turnsBeforeFalling, viewExtent } from './blackHoles';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Orbits near a black hole (Figure 27.1): a body's path round a black hole
 * that doesn't spin, by Schwarzschild's geodesics, beside Newton's from the
 * same start with the same speed; and the effective potential, relativity's
 * and Newton's, with the body's energy as a line. Far out the two agree; close
 * in, relativity's orbits precess, zoom and whirl, and inside 6GM/c² no
 * circular orbit is stable. A predict-first question opens it.
 */

const PREDICTIONS = [
  { id: 'faster', label: 'Yes: a black hole pulls harder', correct: false },
  { id: 'same', label: 'No: far away, it pulls just like the star', correct: true },
  { id: 'slower', label: 'No: it pulls more weakly', correct: false },
] as const;

export function BlackHoleOrbitsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [E, setE] = useState<number>(ORBIT_START.E);
  const [L, setL] = useState<number>(ORBIT_START.L);
  const [guess, setGuess] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const reducedMotion = useReducedMotion();
  const reset = () => {
    setE(ORBIT_START.E);
    setL(ORBIT_START.L);
    setGuess(null);
    setChecked(null);
    setPlaying(false);
    setTime(0);
  };
  const choose = (nextE: number, nextL: number) => {
    setE(nextE);
    setL(nextL);
    setTime(0);
  };
  const pair = useMemo(() => orbitPair(E, L), [E, L]);
  const { relativity: gr, newton } = pair;
  const tEnd = gr.points[gr.points.length - 1].t;
  useAnimationFrame(playing && !reducedMotion, (dt) => setTime((t) => (t + (dt * tEnd) / 12 > tEnd ? 0 : t + (dt * tEnd) / 12)));
  const ext = viewExtent(gr);
  const circles = circularOrbits(L);
  const preset = ORBIT_PRESETS.find((p) => Math.abs(p.E - E) < 1e-9 && Math.abs(p.L - L) < 1e-9);

  // ---------- words ----------
  const r = (x: number) => (x >= 100 ? Math.round(x).toLocaleString('en-GB') : x.toFixed(1));
  let what: string;
  switch (gr.kind) {
    case 'bound':
      what = `It swings between ${r(gr.periapsis!)} and ${r(gr.apoapsis!)} GM/c² from the centre. Each turn its closest point moves on by ${formatDegrees(gr.precession!)} (the weak-field rule, 6πGM/c²a(1 − e²), says ${formatDegrees(gr.weakFieldPrecession!)}); Newton’s orbit from the same start closes on itself.`;
      if (gr.precession! > Math.PI) what += ' It whirls round the hole close in before zooming out again.';
      break;
    case 'circular':
      what = `A circular orbit at ${r(gr.start)} GM/c²${gr.start < ISCO - 0.05 ? ', inside the innermost stable orbit: the slightest nudge would send it in or out' : Math.abs(gr.start - ISCO) < 0.05 ? ': the innermost stable orbit. Any closer and no circle is stable' : ', stable: nudged, it would oscillate round it'}.`;
      break;
    case 'plunge':
      what = `It plunges: with this little angular momentum nothing holds it off the hole, and it crosses the horizon after ${turnsBeforeFalling(gr).toFixed(1)} turns. Newton’s orbit from the same start swings round and comes back out.`;
      break;
    case 'flyby':
      what = `It comes in from far away, passes ${r(gr.periapsis!)} GM/c² from the centre and leaves, turned by ${formatDegrees(turnedBy(gr))}.`;
      break;
    case 'captured':
      what = 'It comes in from far away and falls straight in: no barrier stands in its way.';
      break;
  }
  const caption = `Energy ${E.toFixed(4)}, angular momentum ${L.toFixed(2)} GM/c. ${what}`;

  // Clicking the orbit view starts the body there, moving sideways only, with this angular momentum.
  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width - 0.5) * 2 * ext;
    const y = (0.5 - (event.clientY - box.top) / box.height) * 2 * ext;
    const rr = Math.max(2.2, Math.hypot(x, y));
    const e = Math.sqrt(Math.max(0, effectivePotential(rr, L)));
    if (e > 0 && e < E_RANGE[1]) choose(Math.max(E_RANGE[0], e), L);
  };

  const sv = (v: number) => (v / ext) * 200;
  const path = (pts: readonly { x: number; y: number }[]) => pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1).map((p, i) => `${i ? 'L' : 'M'} ${sv(p.x).toFixed(1)} ${(-sv(p.y)).toFixed(1)}`).join(' ');
  const here = positionAt(gr, time);
  const thereN = positionAt(newton, time);
  const energy = (E * E - 1) / 2;
  const span = Math.max(Math.abs(energy) * 2.6, 0.004);
  const rMax = Math.max(60, Math.min(1500, (gr.apoapsis ?? gr.periapsis ?? 30) * 2));

  return (
    <Figure
      number={number}
      title="Orbits near a black hole"
      description="A body orbiting a black hole, by general relativity, beside the orbit Newton’s gravity would give from the same start. Far from the hole the two agree: a black hole pulls like any other mass. Closer in, relativity’s orbits precess, a little at first and then wildly, zooming in and whirling round; inside six times GM/c² no circular orbit is stable, and gas spirals in and plunges. The effective potential shows why: relativity adds a term that pulls in hard close to the hole."
      height={1120}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the orbit by general relativity', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'Newton’s, from the same start', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="5 4" /> },
        { label: 'the horizon, 2GM/c²', symbol: <circle r="6" fill="#000" stroke="var(--text-muted)" /> },
        { label: 'light’s circle, 3GM/c², and the innermost stable orbit, 6GM/c²', symbol: <circle r="6" fill="none" stroke="var(--text-muted)" strokeDasharray="2 2" /> },
        { label: 'the body’s energy', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--right)" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          The black hole doesn’t spin; a spinning one drags orbits round with it, and its innermost stable orbit moves in to as little as GM/c² for
          gas going its way. The orbits are exact geodesics, stepped with RK4 in angle; the precession quoted is exact, from an elliptic integral.
          Distances are in GM/c², 1.5 km for each solar mass, so the picture fits a black hole of any mass. The body is small and feels no drag, no
          tides and no gravitational waves. Newton’s orbit starts from the same place at the same speed.
        </p>
      }
    >
      <div className={seasonStyles.predict}>
        <fieldset>
          <legend>Predict first: the Sun is replaced by a black hole of the same mass. Does it pull Earth in faster?</legend>
          {PREDICTIONS.map((p, k) => (
            <label key={p.id} className={figureStyles.checkbox}>
              <input type="radio" name={`bh-guess-${number}`} checked={guess === k} onChange={() => setGuess(k)} />
              {p.label}
            </label>
          ))}
          <button type="button" className={figureStyles.toolButton} disabled={guess === null} onClick={() => setChecked(guess)}>
            Check
          </button>
        </fieldset>
        <div aria-live="polite">
          {checked !== null && (
            <p className={seasonStyles.verdict}>
              <span className={PREDICTIONS[checked].correct ? seasonStyles.right : seasonStyles.wrong}>{PREDICTIONS[checked].correct ? '✓ Right.' : '✗ Not quite.'}</span> Far away, a
              black hole pulls exactly as any mass does: Earth would orbit it as it orbits the Sun, in the dark. Only within a few times its horizon’s
              radius does it differ. Pick <b>Far away</b> to see the two orbits agree, then move in.
            </p>
          )}
        </div>
      </div>

      <div className={figureStyles.toolbar}>
        <span className={styles.presets} role="group" aria-label="Orbits">
          {ORBIT_PRESETS.map((p) => (
            <button key={p.id} type="button" className={figureStyles.toolButton} aria-pressed={preset?.id === p.id} onClick={() => choose(p.E, p.L)}>
              {p.name}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        <Slider label="Angular momentum" value={L} min={L_RANGE[0]} max={L_RANGE[1]} log step={0.002} format={(v) => `${v.toFixed(2)} GM/c`} onChange={(v) => choose(E, Math.round(v * 1000) / 1000)} />
        <Slider label="Energy" value={E} min={E_RANGE[0]} max={E_RANGE[1]} step={0.0001} format={(v) => v.toFixed(4)} onChange={(v) => choose(Math.round(v * 10000) / 10000, L)} />
      </div>

      <div className={styles.split}>
        <div>
          <p className={styles.panelTitle}>The orbit (click to start it there)</p>
          <svg viewBox="-210 -210 420 420" width="100%" style={{ maxWidth: 440, display: 'block', touchAction: 'pan-y', cursor: 'crosshair' }} role="img" aria-label={`The orbit seen from above, ${Math.round(ext)} GM/c² from the centre to the edge. ${what}`} onPointerDown={pick}>
            <rect x="-210" y="-210" width="420" height="420" rx="8" fill="var(--sky-bg)" />
            {[PHOTON_SPHERE, ISCO].map((rr) => (
              <circle key={rr} r={sv(rr)} fill="none" stroke="var(--sky-muted)" strokeDasharray="3 3" strokeWidth="1" />
            ))}
            <path d={path(newton.points)} fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeDasharray="5 4" />
            <path d={path(gr.points)} fill="none" stroke="#6b9bff" strokeWidth="2.2" />
            <circle r={Math.max(2.5, sv(2))} fill="#000" stroke="var(--sky-muted)" strokeWidth="1" />
            {(playing || time > 0) && (
              <>
                <circle cx={sv(thereN.x)} cy={-sv(thereN.y)} r={4.5} fill="#f59e0b" />
                <circle cx={sv(here.x)} cy={-sv(here.y)} r={5.5} fill="#6b9bff" stroke="#fff" strokeWidth="1.2" />
              </>
            )}
            <circle cx={sv(gr.points[0].x)} cy={-sv(gr.points[0].y)} r={3.5} fill="#e2e8f5" />
            <text x={-200} y={200} fontSize="11" fill="var(--sky-muted)">
              {Math.round(ext)} GM/c² to the edge
            </text>
          </svg>
          <div className={figureStyles.toolbar}>
            <button type="button" className={figureStyles.toolButton} onClick={() => setPlaying((p) => !p)} disabled={reducedMotion} aria-pressed={playing && !reducedMotion}>
              {playing && !reducedMotion ? 'Pause' : 'Move along the orbits'}
            </button>
          </div>
        </div>
        <div>
          <p className={styles.panelTitle}>Effective potential, per unit mass (c²)</p>
          <ScatterChart
            groups={[]}
            lines={[
              { name: 'relativity', color: 'var(--accent)', f: (x) => potentialEnergy(x, L) },
              { name: 'Newton', color: 'var(--series-2)', dashed: true, f: (x) => newtonPotentialEnergy(x, L) },
              { name: 'its energy', color: 'var(--right)', f: () => energy },
            ]}
            xScale="log"
            yScale="linear"
            xMin={2}
            xMax={rMax}
            yMin={-span}
            yMax={span}
            xLabel="Distance from the centre (GM/c²)"
            yLabel="Energy"
            formatY={(y) => (Math.abs(y) < 1e-12 ? '0' : y.toPrecision(2))}
            height={360}
            ariaLabel={`The effective potential for angular momentum ${L.toFixed(2)}: Newton’s rises without limit close in, relativity’s turns over and falls to the horizon${circles ? `, with a peak at ${circles.unstable.toFixed(1)} GM/c² and a well at ${circles.stable.toFixed(1)}` : ' with no well at all'}. The body’s energy line is at ${energy.toPrecision(2)}.`}
          >
            {(sx, sy) => (
              <g>
                {circles && (
                  <>
                    <circle cx={sx(circles.stable)} cy={sy(potentialEnergy(circles.stable, L))} r={4} fill="var(--accent)" />
                    {potentialEnergy(circles.unstable, L) < span && <circle cx={sx(circles.unstable)} cy={sy(potentialEnergy(circles.unstable, L))} r={4} fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />}
                  </>
                )}
                <line x1={sx(ISCO)} x2={sx(ISCO)} y1={sy(-span)} y2={sy(span)} stroke="var(--text-muted)" strokeDasharray="2 3" />
                <text x={sx(ISCO) + 4} y={sy(-span) - 6} fontSize="11" fill="var(--text)">
                  6GM/c²
                </text>
              </g>
            )}
          </ScatterChart>
          <p className={styles.hint}>
            {classify(E, L).kind === 'bound' || classify(E, L).kind === 'circular'
              ? 'The body is trapped where its energy line lies above the curve: between its two turning points.'
              : circles
                ? 'Its energy line clears the peak, so nothing turns it back.'
                : 'With this little angular momentum the curve has no peak to turn it back.'}
          </p>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
