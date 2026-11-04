import { useMemo, useState, type ReactNode } from 'react';
import { R_EARTH } from '../core/constants';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { fire, LAUNCH_HEIGHT, viewFor } from './cannon';
import { CANNON_SPEEDS, CANNON_TARGETS, cannonTry, DWARF, dwarfFrom, dwarfProfile, dwarfTry, FIRST_TRIES, secant, type ShotTry } from './shooting';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Shooting (Figure T10.1). A problem with a condition at each end: the cannon
 * on its mountain must land its ball on a target; a star's centre must give a
 * surface with the right mass inside. Guess the start, step to the far end,
 * see how far off it lands, and correct the guess from the last two misses.
 */

type Problem = 'cannon' | 'star';
const W = 560;
const H = 300;
const COLOURS = ['#62d6c4', '#f6c453', '#f28cb1', '#8fb4ff', '#c3e88d', '#ffa36c'];
const START = { problem: 'cannon' as Problem, target: 1500, mass: DWARF.mass };

function firstTries(problem: Problem, target: number): ShotTry[] {
  return FIRST_TRIES[problem].map((g) => (problem === 'cannon' ? cannonTry(g, target) : dwarfTry(g, target)));
}

export function ShootingFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [problem, setProblem] = useState<Problem>(START.problem);
  const [target, setTarget] = useState(START.target);
  const [mass, setMass] = useState(START.mass);
  const [tries, setTries] = useState<ShotTry[]>(() => firstTries(START.problem, START.target));
  const [manual, setManual] = useState<number>(FIRST_TRIES.cannon[1]);
  const goal = problem === 'cannon' ? target : mass;
  const reset = () => {
    setProblem(START.problem);
    setTarget(START.target);
    setMass(START.mass);
    setTries(firstTries(START.problem, START.target));
    setManual(FIRST_TRIES.cannon[1]);
  };
  const restart = (p: Problem, g: number) => {
    setTries(firstTries(p, g));
    setManual(FIRST_TRIES[p][1]);
  };

  const shoot = (guess: number) => (problem === 'cannon' ? cannonTry(guess, goal) : dwarfTry(guess, goal));
  const add = (guess: number) => setTries((t) => [...t, shoot(guess)].slice(-6));
  // From the newest two tries in the state itself, so that quick clicks each correct from the one before.
  const correct = () =>
    setTries((t) => {
      const [a, b] = t.slice(-2);
      if (Math.abs(b.miss) < (problem === 'cannon' ? 1 : 1e-4)) return t;
      const next = problem === 'cannon' ? secant(a, b) : Math.min(2e6, Math.max(100, secant(a, b)));
      return [...t, shoot(next)].slice(-6);
    });
  const last = tries[tries.length - 1];
  const tolerance = problem === 'cannon' ? 1 : 1e-4;
  const hit = Math.abs(last.miss) < tolerance;

  const shots = useMemo(() => (problem === 'cannon' ? tries.map((t) => fire(t.guess)) : []), [tries, problem]);
  const view = viewFor(shots, W / H);
  const scale = W / (2 * view.half);
  const px = (x: number) => W / 2 + (x - view.cx) * scale;
  const py = (y: number) => H / 2 - (y - view.cy) * scale;
  const targetAngle = Math.PI / 2 - (target * 1000) / R_EARTH;
  const tx = R_EARTH * Math.cos(targetAngle);
  const ty = R_EARTH * Math.sin(targetAngle);

  const fmtGuess = (g: number) => (problem === 'cannon' ? `${(g / 1000).toFixed(3)} km/s` : `${Number((g / 1000).toPrecision(4))} g/cm³`);
  const fmtMiss = (m: number) =>
    problem === 'cannon'
      ? `${m >= 0 ? 'long' : 'short'} by ${Math.abs(m) < 10 ? Math.abs(m).toFixed(1) : Math.round(Math.abs(m)).toLocaleString('en-GB')} km`
      : `${m >= 0 ? 'too heavy' : 'too light'} by ${Math.abs(m).toPrecision(2)} M☉`;

  return (
    <Figure
      number={number}
      title="Shooting"
      description="The shooting method, for problems with a condition at each end. Newton’s cannon must land its ball on a target: guess a speed, fire, see how far long or short it lands, and correct the speed from the last two misses; a handful of corrections hit it to within a kilometre. The same trick builds a red dwarf: guess the density at its centre, step out to the surface, compare the mass inside with the mass wanted, and correct."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={
        problem === 'cannon'
          ? [
              {
                label: 'the target',
                symbol: <path d="M0 6V-8l8 4-8 4" fill="var(--wrong)" stroke="var(--wrong)" />,
              },
            ]
          : undefined
      }
      simplified={
        <p>
          The cannon is Figure 7.1’s, computed by the n-body engine, from a mountain 100 km high with no air. The red dwarf is a polytrope of index
          1.5 with its pressure constant chosen so that Proxima’s mass gives Proxima’s radius; its stepping is the Lane–Emden solution’s (Figure
          20.4), scaled. Each correction is a secant step on the logarithm of how far off it came out, which grows more evenly with the guess than the
          miss itself; real star builders correct several guesses at once with Newton’s method.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Problem">
          {(['cannon', 'star'] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={problem === p}
              onClick={() => {
                setProblem(p);
                restart(p, p === 'cannon' ? target : mass);
              }}
            >
              {p === 'cannon' ? 'Newton’s cannon' : 'A red dwarf'}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        {problem === 'cannon' ? (
          <Slider
            label="Target, along the ground"
            value={target}
            min={CANNON_TARGETS[0]}
            max={CANNON_TARGETS[1]}
            step={50}
            format={(t) => `${Math.round(t).toLocaleString('en-GB')} km`}
            onChange={(t) => {
              setTarget(Math.round(t));
              restart('cannon', Math.round(t));
            }}
          />
        ) : (
          <Slider
            label="Mass wanted"
            value={mass}
            min={0.08}
            max={0.4}
            step={0.002}
            format={(m) => `${m.toFixed(3)} M☉`}
            onChange={(m) => {
              setMass(m);
              restart('star', m);
            }}
          />
        )}
        {problem === 'cannon' ? (
          <Slider
            label="Your speed"
            value={manual}
            min={CANNON_SPEEDS[0]}
            max={CANNON_SPEEDS[1]}
            step={10}
            format={(v) => `${(v / 1000).toFixed(2)} km/s`}
            onChange={setManual}
          />
        ) : (
          <Slider
            label="Your central density"
            value={manual}
            min={1000}
            max={1e6}
            log
            format={(v) => `${Number((v / 1000).toPrecision(3))} g/cm³`}
            onChange={setManual}
          />
        )}
      </div>
      <div className={figureStyles.toolbar}>
        <button type="button" className={styles.toggle} onClick={() => add(manual)}>
          {problem === 'cannon' ? 'Fire at your speed' : 'Step out from your centre'}
        </button>
        <button type="button" className={styles.toggle} onClick={correct} disabled={hit}>
          Correct from the last two misses
        </button>
      </div>

      {problem === 'cannon' ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`Newton’s cannon: ${tries.length} shots at a target ${target} km away; the last one ${fmtMiss(last.miss)}`}
          style={{
            display: 'block',
            background: 'var(--sky-bg)',
            borderRadius: 6,
          }}
        >
          <circle cx={px(0)} cy={py(0)} r={R_EARTH * scale} fill="#2b5d8a" />
          <line x1={px(0)} y1={py(R_EARTH)} x2={px(0)} y2={py(R_EARTH + LAUNCH_HEIGHT)} stroke="#c9b48a" strokeWidth="4" />
          {shots.map((s, i) => (
            <polyline
              key={i}
              points={s.path.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={COLOURS[i % COLOURS.length]}
              strokeWidth={i === shots.length - 1 ? 2.5 : 1.4}
              strokeOpacity={i === shots.length - 1 ? 1 : 0.7}
            />
          ))}
          <g transform={`translate(${px(tx)} ${py(ty)})`}>
            <path d="M0 0V-16l10 5-10 5" fill="var(--wrong)" stroke="var(--wrong)" />
          </g>
        </svg>
      ) : (
        <ProfilePlot
          series={tries.map((t, i) => ({
            name: `try ${i + 1}: ${dwarfFrom(t.guess).mass.toFixed(3)} M☉`,
            color: COLOURS[i % COLOURS.length],
            points: dwarfProfile(t.guess),
          }))}
          xLabel="Distance from the centre (R☉)"
          yLabel="Density (g/cm³)"
          xMax={Math.max(0.2, ...tries.map((t) => dwarfFrom(t.guess).radius)) * 1.05}
          yScale="log"
          yMin={0.1}
          yMax={2e3}
          formatX={(x) => x.toFixed(2)}
          ariaLabel={`Density against radius for ${tries.length} guesses of the central density; the last one gives ${dwarfFrom(last.guess).mass.toFixed(3)} M☉, wanted ${mass.toFixed(3)}`}
          height={280}
        />
      )}

      <ol className={styles.lists} style={{ display: 'block', paddingLeft: 22, margin: '8px 0' }}>
        {tries.map((t, i) => (
          <li key={i} style={{ color: 'var(--text)' }}>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 5,
                background: COLOURS[i % COLOURS.length],
                marginRight: 6,
              }}
            />
            {fmtGuess(t.guess)}: {Math.abs(t.miss) < tolerance ? 'a hit' : fmtMiss(t.miss)}
          </li>
        ))}
      </ol>
      <Caption>
        {hit
          ? `A hit: ${fmtGuess(last.guess)} ${problem === 'cannon' ? `lands the ball within a kilometre of the target, ${target.toLocaleString('en-GB')} km away` : `gives a star of ${mass.toFixed(3)} M☉, ${dwarfFrom(last.guess).radius.toFixed(3)} R☉ across`}, after ${tries.length} tries.`
          : `The last try, ${fmtGuess(last.guess)}, came out ${fmtMiss(last.miss)}. The straight line through the last two misses says where to aim next.`}
      </Caption>
    </Figure>
  );
}
