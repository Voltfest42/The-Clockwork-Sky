import { useMemo, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { Slider } from './Slider';
import { formatMyr, GALAXY_AGE, shortMyr, LIFETIME_MASSES, LIFETIME_PREDICTIONS, LIFETIME_STARS, lifetimeCurve, lifetimeReadout, ruleOfThumb, SUN_AGE } from './starLives';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Lifetimes (Figure 17.1): how long a star stays on the main sequence against
 * its mass, from the SSE engine, on log axes. A predict-first question meets
 * the idea that heavy stars, with more fuel, live longer. Famous stars, the
 * Sun's age and the Galaxy's are marked.
 */

const START_MASS = 10;

const years = (y: number) => formatMyr(y / 1e6);
/** "450th", "2nd", "3rd": for "a 450th of the Sun’s time". */
const ordinal = (n: number) => {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n.toLocaleString('en-GB')}${suffix}`;
};
const massLabel = (m: number) => `${Number(m.toPrecision(2))} M☉`;

export function LifetimesFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mass, setMass] = useState(START_MASS);
  const [guess, setGuess] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);
  const reset = () => {
    setMass(START_MASS);
    setGuess(null);
    setChecked(null);
  };
  const curve = useMemo(() => lifetimeCurve(), []);
  const lifetimeAt = (m: number) => {
    const lm = Math.log(m);
    for (let i = 1; i < curve.length; i++) {
      if (curve[i].mass >= m) {
        const a = curve[i - 1];
        const b = curve[i];
        const f = (lm - Math.log(a.mass)) / (Math.log(b.mass) - Math.log(a.mass));
        return Math.exp(Math.log(a.years) + f * (Math.log(b.years) - Math.log(a.years)));
      }
    }
    return curve[curve.length - 1].years;
  };
  const r = lifetimeReadout(mass);
  const stars = LIFETIME_STARS.map((s) => ({ x: s.mass, y: lifetimeReadout(s.mass).years, label: s.name }));

  return (
    <Figure
      number={number}
      title="Lifetimes"
      description="How long a star shines steadily on the main sequence, against its mass, from the stellar-evolution engine on log axes: about 10 billion years for the Sun, a few tens of millions for a star of 10 Suns, and trillions for the smallest red dwarfs. Heavier stars have more fuel but burn it far faster, so they die sooner. Famous stars, the Sun’s age and the age of the Galaxy are marked."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      starForge={`mass=${Number(mass.toPrecision(3))}`}
      simplified={
        <p>
          Lifetimes are SSE’s formulas (Hurley, Pols &amp; Tout 2000) for stars of the Sun’s make-up, without rotation: the time from arriving on
          the main sequence to running out of hydrogen in the core. The giant phases that follow add about a tenth more. The formulas are fitted to
          detailed models of 0.5 to 50 Suns; outside that range they are extrapolated. Polaris, Betelgeuse and Rigel have already left the main
          sequence; their points show how long they spent on it.
        </p>
      }
    >
      <div className={seasonStyles.predict}>
        <fieldset>
          <legend>Predict first: two stars are born together, one of 10 Suns and one of half a Sun. Which lives longer?</legend>
          {LIFETIME_PREDICTIONS.map((p, i) => (
            <label key={p.id} className={figureStyles.checkbox}>
              <input type="radio" name={`life-guess-${number}`} checked={guess === i} onChange={() => setGuess(i)} />
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
              <span className={LIFETIME_PREDICTIONS[checked].correct ? seasonStyles.right : seasonStyles.wrong}>{LIFETIME_PREDICTIONS[checked].correct ? '✓ Right.' : '✗ Not quite.'}</span> The
              light star lives far longer: about {years(lifetimeReadout(0.5).years)}, against {years(lifetimeReadout(10).years)} for the heavy one.
              The heavy star has 20 times the fuel, but it shines thousands of times more brightly, so it burns through it far sooner.
            </p>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <Slider label="Mass" value={mass} min={LIFETIME_MASSES[0]} max={LIFETIME_MASSES[1]} log format={massLabel} onChange={setMass} />
      </div>
      <ScatterChart
        groups={[{ name: 'Famous stars', color: 'var(--series-3)', shape: 'circle', points: stars }]}
        lines={[
          { name: 'The engine', color: 'var(--series-1)', f: lifetimeAt },
          { name: 'Rule of thumb', color: 'var(--series-2)', dashed: true, f: ruleOfThumb },
          { name: 'The Sun’s age', color: 'var(--text-muted)', dashed: true, f: () => SUN_AGE * 1e6 },
          { name: 'The Galaxy’s age', color: 'var(--text-muted)', dashed: true, f: () => GALAXY_AGE * 1e6 },
        ]}
        labelled={['the Sun', 'Proxima Centauri', 'Sirius A', 'Betelgeuse', 'Spica A']}
        xScale="log"
        yScale="log"
        xMin={0.1}
        xMax={100}
        yMin={1e6}
        yMax={1e13}
        xLabel="Mass (Suns)"
        yLabel="Time on the main sequence"
        formatY={(y) => shortMyr(y / 1e6)}
        highlight={{ x: mass, y: r.years, label: massLabel(mass), color: 'var(--accent)' }}
        onPick={setMass}
        ariaLabel={`Main-sequence lifetime against mass on log axes. A star of ${massLabel(mass)} lives about ${years(r.years)}.`}
      >
        {(sx, sy) => (
          <g pointerEvents="none">
            <text x={sx(0.11)} y={sy(SUN_AGE * 1e6) - 5} fontSize="11" fill="var(--text-muted)">
              the Sun’s age
            </text>
            <text x={sx(0.11)} y={sy(GALAXY_AGE * 1e6) - 5} fontSize="11" fill="var(--text-muted)">
              the Galaxy’s age
            </text>
          </g>
        )}
      </ScatterChart>
      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          <b>A star of {massLabel(mass)}</b> shines on the main sequence for about <b>{years(r.years)}</b>
          {r.vsSun > 1.05 ? `, ${Number(r.vsSun.toPrecision(2)).toLocaleString('en-GB')} times as long as the Sun` : r.vsSun < 0.95 ? (r.vsSun >= 0.02 ? `, ${Math.round(r.vsSun * 100)}% of the Sun’s time` : `, a ${ordinal(Math.round(1 / r.vsSun))} of the Sun’s time`) : ', like the Sun'}. It has {Number(r.fuel.toPrecision(2))} times the Sun’s fuel and
          burns it {Number(r.burn.toPrecision(2)).toLocaleString('en-GB')} times as fast.
        </p>
        <p style={{ margin: '6px 0 0' }}>
          {r.anyDied
            ? 'Stars this heavy, born early in the Galaxy’s history, have already died.'
            : 'No star this light has ever reached the end of its main sequence: the Galaxy isn’t old enough.'}
        </p>
      </div>
      <Caption>
        {mass >= 1 ? `Heavier is shorter: a star of ${massLabel(mass)} lasts ${years(r.years)}.` : `Lighter is longer: a star of ${massLabel(mass)} lasts ${years(r.years)}.`} Drag across the chart or use the slider to pick a mass.
      </Caption>
    </Figure>
  );
}
