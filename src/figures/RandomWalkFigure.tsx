import { useMemo, useRef, useState, type ReactNode } from 'react';
import { randomWalk, rmsDistances } from '../core/structure/randomWalk';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { ScatterChart } from '../viz/ScatterChart';
import { CONVECTION_BASE, ESCAPE_RANGE, formatLength, formatYears, SUN_ESCAPE, SUN_SHELLS } from './energy';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The random walk (Figure 21.1). One photon's walk, step by step: absorbed and
 * given out again in a random direction, it wanders only about √N steps in N.
 * Then many walks at once, whose typical distance follows √N exactly. Then the
 * Sun: the mean free path at each depth from Model S's opacity and density,
 * and the time light takes to random-walk out, added up shell by shell.
 */

type View = 'walk' | 'many' | 'sun';
const VIEWS: { id: View; name: string }[] = [
  { id: 'walk', name: 'One walk' },
  { id: 'many', name: 'Many walks' },
  { id: 'sun', name: 'The Sun' },
];
const MAX_STEPS = 2000;
const START = { view: 'walk' as View, seed: 1, shown: 0, cursor: 0.35 };
const W = 560;
const H = 320;
/** Half the view's width, in steps: room for most walks of 2,000 steps (√2000 ≈ 45). */
const HALF = 90;
const CHECKPOINTS = Array.from({ length: 25 }, (_, k) => Math.round(10 ** ((k * Math.log10(3000)) / 24))).filter((v, k, a) => a.indexOf(v) === k);

export function RandomWalkFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [view, setView] = useState<View>(START.view);
  const [seed, setSeed] = useState(START.seed);
  const [shown, setShown] = useState(START.shown);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(START.cursor);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const reset = () => {
    setView(START.view);
    setSeed(START.seed);
    setShown(START.shown);
    setPlaying(false);
    setCursor(START.cursor);
  };

  const walk = useMemo(() => randomWalk(MAX_STEPS, seed), [seed]);
  const many = useMemo(() => (view === 'many' ? rmsDistances(400, CHECKPOINTS, 11) : null), [view]);

  useAnimationFrame(playing && onScreen && view === 'walk', (dt) => {
    setShown((n) => {
      // About 6 steps a second at first, speeding up to some 300 a second, so the start can be followed by eye.
      const next = Math.min(MAX_STEPS, n + Math.max(1, Math.round(dt * Math.max(6, n * 0.6))));
      if (next >= MAX_STEPS) setPlaying(false);
      return next;
    });
  });

  const play = () => {
    if (reducedMotion) {
      setShown(MAX_STEPS);
      return;
    }
    if (shown >= MAX_STEPS) setShown(0);
    setPlaying((p) => !p);
  };

  const p = walk[shown];
  const distance = Math.hypot(p.x, p.y, p.z);
  const sx = (x: number) => W / 2 + (x / HALF) * (W / 2);
  const sz = (z: number) => H / 2 - (z / HALF) * (W / 2);
  const path = walk
    .slice(0, shown + 1)
    .map((q) => `${sx(q.x).toFixed(1)},${sz(q.z).toFixed(1)}`)
    .join(' ');

  const sunCut = SUN_SHELLS.filter((s) => s.x <= 0.995);
  const at = SUN_SHELLS.reduce((best, s) => (Math.abs(s.x - cursor) < Math.abs(best.x - cursor) ? s : best));
  const k = SUN_SHELLS.indexOf(at);
  const soFar = SUN_ESCAPE.running[Math.min(k, SUN_ESCAPE.running.length - 1)] ?? 0;
  const inConvection = cursor > CONVECTION_BASE;

  const caption =
    view === 'walk'
      ? `After ${shown.toLocaleString('en-GB')} step${shown === 1 ? '' : 's'} the photon is ${distance.toFixed(1)} steps from where it started; √${shown.toLocaleString('en-GB')} is ${Math.sqrt(shown).toFixed(1)}. Going straight, it would be ${shown.toLocaleString('en-GB')} steps away.`
      : view === 'many'
        ? `Over 400 walks, the typical distance after N steps is √N steps: ${many ? `${many[many.length - 1].toFixed(0)} after ${CHECKPOINTS[CHECKPOINTS.length - 1].toLocaleString('en-GB')} steps` : 'working it out'}. To get R steps away takes about R² steps, so twice as far takes four times as long.`
        : `At ${cursor.toFixed(2)} of the Sun’s radius light goes ${formatLength(at.path)} between absorptions. ${
            inConvection
              ? 'Here the gas convects, and carries the energy up in weeks.'
              : `Random-walking from the centre to here takes about ${formatYears(soFar)}.`
          } All the way out through the radiative zone: ${formatYears(SUN_ESCAPE.years)}, then weeks to cross the convection zone and 8.3 minutes to reach us.`;

  return (
    <Figure
      number={number}
      title="The random walk"
      description={`A photon inside the Sun travels a fraction of a millimetre before it is absorbed and given out again in a random direction. After N such steps it is only about √N steps from where it started, so the energy takes a long time to get out. Model S’s opacity and density give the mean free path at each depth, from 0.05 mm at the centre to a few millimetres at the base of the convection zone, and the escape time, added up shell by shell: about ${formatYears(SUN_ESCAPE.years)}, within the published range of 10,000 to 170,000 years.`}
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={
        view === 'walk'
          ? [
              {
                label: 'the photon’s path',
                symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="2" />,
              },
              {
                label: 'where it started',
                symbol: <circle r="5" fill="var(--text)" />,
              },
              {
                label: '√N steps from the start',
                symbol: <circle r="7" fill="none" stroke="var(--series-2)" strokeDasharray="3 2" strokeWidth="2" />,
              },
            ]
          : undefined
      }
      simplified={
        <p>
          The walks take steps of one length and pick directions evenly; real photons’ steps vary, and the gas favours some colours. Each absorption
          ends one photon and the gas gives out another, so it is the energy that random-walks, not one photon. The Sun’s mean free path uses Model
          S’s opacities, the Rosseland mean over all colours, and the escape time treats the radiative zone as pure diffusion, the mean time to reach
          a radius, (1/c) ∫ κρ r dr. Careful published sums range from 10,000 to 170,000 years, depending on what they count.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Show">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
                {v.name}
              </button>
            ))}
          </span>
        </div>

        {view === 'walk' && (
          <>
            <div className={figureStyles.toolbar}>
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setShown((n) => Math.min(MAX_STEPS, n + 1))}
                disabled={shown >= MAX_STEPS}
              >
                One step
              </button>
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setShown((n) => Math.min(MAX_STEPS, n + 100))}
                disabled={shown >= MAX_STEPS}
              >
                100 steps
              </button>
              <button type="button" className={styles.toggle} aria-pressed={playing} onClick={play}>
                {playing ? 'Pause' : shown >= MAX_STEPS ? 'Play again' : `Play to ${MAX_STEPS.toLocaleString('en-GB')}`}
              </button>
              <button
                type="button"
                className={styles.toggle}
                onClick={() => {
                  setSeed((s) => s + 1);
                  setShown(0);
                  setPlaying(false);
                }}
              >
                A new walk
              </button>
            </div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              role="img"
              aria-label={`A random walk of ${shown} steps, now ${distance.toFixed(1)} steps from its start`}
              style={{
                display: 'block',
                background: 'var(--surface)',
                borderRadius: 6,
              }}
            >
              <circle
                cx={sx(0)}
                cy={sz(0)}
                r={(Math.sqrt(shown) / HALF) * (W / 2)}
                fill="none"
                stroke="var(--series-2)"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <polyline points={path} fill="none" stroke="var(--accent)" strokeWidth="1.3" strokeLinejoin="round" />
              <circle cx={sx(0)} cy={sz(0)} r={4.5} fill="var(--text)" />
              <circle cx={sx(p.x)} cy={sz(p.z)} r={5} fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
              <text x={10} y={H - 10} fontSize="12" fill="var(--text-muted)">
                Seen side on; each step one mean free path
              </text>
            </svg>
            <dl className={styles.facts}>
              <div>
                <dt>Steps taken</dt>
                <dd>{shown.toLocaleString('en-GB')}</dd>
              </div>
              <div>
                <dt>Distance from the start</dt>
                <dd>{distance.toFixed(1)} steps</dd>
              </div>
              <div>
                <dt>√N</dt>
                <dd>{Math.sqrt(shown).toFixed(1)} steps</dd>
              </div>
            </dl>
          </>
        )}

        {view === 'many' && (
          <ScatterChart
            groups={[
              {
                name: 'typical distance, 400 walks',
                color: 'var(--accent)',
                shape: 'circle',
                points: (many ?? []).map((d, i) => ({
                  x: CHECKPOINTS[i],
                  y: d,
                  label: `${CHECKPOINTS[i]} steps`,
                })),
              },
            ]}
            lines={[
              { name: '√N', color: 'var(--series-2)', f: (n) => Math.sqrt(n) },
              {
                name: 'going straight: N',
                color: 'var(--text-muted)',
                dashed: true,
                f: (n) => n,
              },
            ]}
            xScale="log"
            yScale="log"
            xMin={1}
            xMax={3000}
            yMin={1}
            yMax={3000}
            xLabel="Steps taken, N"
            yLabel="Distance from the start (steps)"
            ariaLabel="The typical distance of 400 random walks against the number of steps, on log axes, following the line √N, far below the straight line N"
            height={320}
          />
        )}

        {view === 'sun' && (
          <>
            <ProfilePlot
              series={[
                {
                  name: 'mean free path (Model S)',
                  color: 'var(--accent)',
                  points: sunCut.map((s) => ({ x: s.x, y: s.path })),
                },
              ]}
              zones={[
                {
                  from: CONVECTION_BASE,
                  to: 1,
                  label: 'convection carries the energy',
                },
              ]}
              xLabel="Distance from the centre (fraction of the radius)"
              yLabel="Mean free path (m)"
              yScale="log"
              yMin={1e-5}
              yMax={1e-1}
              formatValue={formatLength}
              cursor={cursor}
              onCursor={setCursor}
              cursorText={(x) => `${x.toFixed(2)} of the radius`}
              ariaLabel="The mean free path of light inside the Sun against distance from the centre, from 0.05 mm at the centre to a few millimetres at the base of the convection zone"
              height={280}
            />
            <dl className={styles.facts}>
              <div>
                <dt>Mean free path here</dt>
                <dd>{formatLength(at.path)}</dd>
              </div>
              <div>
                <dt>Out to here, by random walk</dt>
                <dd>{inConvection ? 'convection takes over' : formatYears(soFar)}</dd>
              </div>
              <div>
                <dt>Through the whole radiative zone</dt>
                <dd>
                  {formatYears(SUN_ESCAPE.years)} (published: {formatYears(ESCAPE_RANGE[0])} to {formatYears(ESCAPE_RANGE[1])})
                </dd>
              </div>
            </dl>
          </>
        )}
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
