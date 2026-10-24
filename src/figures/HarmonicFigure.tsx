import { useState, type ReactNode } from 'react';
import { periodYears } from '../core/orbits/ellipse';
import { ORBITS, type OrbitKind } from '../data/orbits';
import { Caption, Figure } from '../viz/Figure';
import { formatPeriod } from './ellipses';
import { ScatterChart, type PointShape, type Scale } from '../viz/ScatterChart';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Kepler's third law on one chart: each body's period against its distance
 * (the semi-major axis), on log–log axes. Everything that goes round the Sun
 * falls on one straight line, P² = a³; Jupiter's moons fall on a parallel line
 * lower down, because Jupiter is lighter than the Sun. Drop a planet of your
 * own anywhere and read off its year.
 */

const GROUPS: readonly { kind: OrbitKind; name: string; color: string; shape: PointShape }[] = [
  { kind: 'planet', name: 'Planets', color: 'var(--series-1)', shape: 'circle' },
  { kind: 'dwarf planet', name: 'Dwarf planets', color: 'var(--series-3)', shape: 'square' },
  { kind: 'comet', name: 'Comets', color: 'var(--series-2)', shape: 'diamond' },
  { kind: 'moon of Jupiter', name: 'Jupiter’s moons', color: 'var(--text)', shape: 'triangle' },
];

/** How much higher Jupiter's line sits (longer periods at the same distance): √(Sun's mass ÷ Jupiter's), from the moons themselves. */
const io = ORBITS.find((o) => o.id === 'io')!;
const JUPITER_FACTOR = io.period / periodYears(io.a);

const LABELLED = ['Mercury', 'Earth', 'Jupiter', 'Neptune', 'Pluto', 'Eris', 'Halley’s comet', 'Comet Encke', 'Io', 'Callisto'];

export function HarmonicFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [scale, setScale] = useState<Scale>('log');
  const [logA, setLogA] = useState(Math.log10(4));
  const a = 10 ** logA;
  const P = periodYears(a);
  const log = scale === 'log';
  const reset = () => {
    setScale('log');
    setLogA(Math.log10(4));
  };

  return (
    <Figure
      number={number}
      title="The planets on one line"
      description="A chart of orbital period against distance from the Sun (the semi-major axis) on log–log axes, for the planets, five dwarf planets, three comets and Jupiter’s four large moons. Everything going round the Sun lies on one straight line, the square of the period equalling the cube of the distance in years and astronomical units. Jupiter’s moons lie on a parallel line lower down."
      height={760}
      tryThis={tryThis}
      onReset={reset}
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Axes">
          <button type="button" aria-pressed={log} onClick={() => setScale('log')}>
            Log–log axes
          </button>
          <button type="button" aria-pressed={!log} onClick={() => setScale('linear')}>
            Ordinary axes
          </button>
        </span>
      </div>
      <ScatterChart
        groups={GROUPS.map((g) => ({ name: g.name, color: g.color, shape: g.shape, points: ORBITS.filter((o) => o.kind === g.kind).map((o) => ({ x: o.a, y: o.period, label: o.name })) }))}
        lines={[
          { name: 'P² = a³: round the Sun', color: 'var(--series-1)', f: (x) => periodYears(x) },
          { name: 'round Jupiter', color: 'var(--text-muted)', dashed: true, f: (x) => JUPITER_FACTOR * periodYears(x) },
        ]}
        xScale={scale}
        yScale={scale}
        xMin={log ? 0.001 : 0}
        xMax={log ? 100 : 70}
        yMin={log ? 0.001 : 0}
        yMax={log ? 1000 : 600}
        xLabel="Distance from what it orbits (semi-major axis, AU)"
        yLabel="Period (years)"
        labelled={log ? LABELLED : ['Neptune', 'Pluto', 'Eris', 'Halley’s comet']}
        highlight={{ x: a, y: P, label: 'Your planet', color: 'var(--accent)' }}
        onPick={(x) => setLogA(Math.log10(Math.max(0.1, x)))}
        ariaLabel={`Period against distance for ${ORBITS.length} bodies on ${log ? 'log–log' : 'ordinary'} axes. Everything going round the Sun lies on the line P² = a³; Jupiter’s moons lie on a parallel line, with periods about ${Math.round(JUPITER_FACTOR)} times longer at the same distance. Your planet, at ${a.toFixed(2)} AU, takes ${formatPeriod(P)}.`}
      />
      <label className={styles.slider} style={{ marginTop: 10 }}>
        Your planet
        <input
          type="range"
          min={-1}
          max={2}
          step={0.01}
          value={logA}
          onChange={(e) => setLogA(Number(e.target.value))}
          aria-label="Your planet’s distance from the Sun"
          aria-valuetext={`${a.toFixed(2)} AU: a year of ${formatPeriod(P)}`}
        />
        <output>{a < 10 ? a.toFixed(2) : a.toFixed(1)} AU</output>
      </label>
      <div className={styles.readout}>
        <span>
          A planet <b>{a < 10 ? a.toFixed(2) : a.toFixed(1)} AU</b> from the Sun takes <b>{formatPeriod(P)}</b> to go round
        </span>
        <span>
          Check: {P.toFixed(P < 10 ? 2 : 0)}² = {(P * P).toFixed(P < 10 ? 2 : 0)}, and {a.toFixed(a < 10 ? 2 : 1)}³ = {(a * a * a).toFixed(a < 10 ? 2 : 0)}
        </span>
      </div>
      <details className={figureStyles.note}>
        <summary>The numbers</summary>
        <table className={seasonStyles.table}>
          <caption>Distance, period, and P² ÷ a³ (1 for everything going round the Sun)</caption>
          <thead>
            <tr>
              <th scope="col">Body</th>
              <th scope="col">a (AU)</th>
              <th scope="col">Period</th>
              <th scope="col">P² ÷ a³</th>
            </tr>
          </thead>
          <tbody>
            {ORBITS.map((o) => (
              <tr key={o.id}>
                <th scope="row">{o.name}</th>
                <td>{o.a < 0.1 ? o.a.toFixed(5) : o.a.toFixed(3)}</td>
                <td>{o.period < 1 ? `${(o.period * 365.25).toFixed(2)} days` : `${o.period.toFixed(2)} years`}</td>
                <td>{(o.period ** 2 / o.a ** 3).toFixed(o.kind === 'moon of Jupiter' ? 0 : 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <Caption>
        {log
          ? `On log–log axes every power law is a straight line, and this one rises 3 steps for every 2 across: P² = a³. Your planet at ${a < 10 ? a.toFixed(2) : a.toFixed(1)} AU sits on the line, with a year of ${formatPeriod(P)}. Jupiter’s moons follow a line of the same slope, higher up: at the same distance, a moon takes about ${Math.round(JUPITER_FACTOR)} times as long to go round Jupiter as a planet would take round the Sun. Chapter 7 explains why, and uses it to weigh Jupiter.`
          : 'On ordinary axes the outer bodies spread across the chart while the inner planets bunch up in the corner and Jupiter’s moons vanish into it. The curve is there, but hard to read: switch back to log–log axes.'}
      </Caption>
    </Figure>
  );
}
