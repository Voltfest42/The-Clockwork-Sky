import { useMemo, useState, type ReactNode } from 'react';
import { periastronShift, trackAt } from '../core/gr/peters';
import { formatScientific } from '../core/math/scientific';
import { SECONDS_PER_JULIAN_YEAR } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { formatDuration, formatLength, formatPeriod, HULSE_TAYLOR_RATIO, OWN_PAIR, PAIRS, pairFacts, type PairPreset } from './ripples';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The shrinking orbit (Figure 29.1): Peters' equations for a pair of compact
 * stars, stepped from today to the merger. The separation and eccentricity
 * against the time left, on log scales; the orbit at a chosen moment to
 * scale; the period's decay and the advance of periastron; and, as Taylor and
 * Weisberg plotted it, the cumulative shift of the time of periastron since
 * 1975, against which the Hulse–Taylor pulsar's timing agrees to 0.2%.
 */

const YEAR = SECONDS_PER_JULIAN_YEAR;
const START = 'hulse-taylor';

export function ShrinkingOrbitFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [pick, setPick] = useState<string>(START);
  const [own, setOwn] = useState<PairPreset>(OWN_PAIR);
  // How far along: the log of the time left, as a share from now (0) to a second before the merger (1)
  const [along, setAlong] = useState(0);
  const reset = () => {
    setPick(START);
    setOwn(OWN_PAIR);
    setAlong(0);
  };
  const pair = pick === 'own' ? own : (PAIRS.find((p) => p.id === pick) ?? PAIRS[0]);
  const facts = useMemo(() => pairFacts(pair), [pair]);
  const T = facts.mergeIn;
  const leftAt = (u: number) => Math.exp(Math.log(T) + u * (Math.log(1) - Math.log(T)));
  const left = along === 0 ? T : leftAt(along);
  const now = trackAt(facts.track, T - left);
  const ht = pair.id === 'hulse-taylor';
  const yearsShown = 50;

  // The curves against the time left (in years), from the track
  const pts = facts.track.points.map((p) => ({ left: Math.max((T - p.t) / YEAR, 1e-12), a: p.a / facts.a, e: p.e }));
  const interp = (key: 'a' | 'e') => (x: number) => {
    // x: years left; the track runs from the most left to the least
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (x <= a.left && x >= b.left) {
        const t = (Math.log(x) - Math.log(a.left)) / (Math.log(b.left) - Math.log(a.left) || 1);
        return a[key] + t * (b[key] - a[key]);
      }
    }
    return NaN;
  };
  const xMax = (T / YEAR) * 1.5;
  // Down to a second before the merger, where the slider ends
  const xMin = 1 / YEAR;

  // The periastron shift over fifty years from 1975
  const shiftEnd = periastronShift(pair.period, facts.pbdot, yearsShown * YEAR);
  const shiftAt = (yr: number) => periastronShift(pair.period, facts.pbdot, (yr - 1975) * YEAR);
  const shiftMeasured = (yr: number) => HULSE_TAYLOR_RATIO.value * shiftAt(yr);
  const shiftUnit = Math.abs(shiftEnd) >= 1 ? { k: 1, name: 's' } : Math.abs(shiftEnd) >= 1e-3 ? { k: 1e3, name: 'ms' } : { k: 1e6, name: 'µs' };
  const tiny = Math.abs(shiftEnd) < 1e-6;

  const perYear = Math.abs(facts.pbdot) * YEAR;
  const caption = `${pair.name}: ${pair.what}, of ${fmtMass(pair.m1)} and ${fmtMass(pair.m2)} M☉, ${formatPeriod(pair.period)} round${pair.e > 0 ? `, eccentricity ${pair.e.toFixed(3)}` : ', on a circle'}. Its gravitational waves shorten the period by ${formatScientific(Math.abs(facts.pbdot), 3)} seconds every second, ${formatTiny(perYear)} a year${ht ? `; measured, ${HULSE_TAYLOR_RATIO.value} ± ${HULSE_TAYLOR_RATIO.error} of that` : ''}. They will merge in ${formatDuration(T)}. ${along === 0 ? 'Today' : `With ${formatDuration(left)} left`}: ${formatLength(now.a)} apart, ${formatPeriod(now.P)} round, eccentricity ${now.e < 0.001 ? 'under 0.001' : now.e.toFixed(3)}, waves at ${formatHz(2 / now.P)}.`;

  // The orbit to scale: today's ellipse and now's, centred on one focus
  const VIEW = 260;
  const R = VIEW * 0.42;
  const ellipse = (a: number, e: number) => {
    const s = (a / facts.a) * R / (1 + pair.e);
    const b = s * Math.sqrt(1 - e * e);
    const cx = VIEW / 2 - s * e;
    return { cx, rx: s, ry: b };
  };
  const today = ellipse(facts.a, pair.e);
  const then = ellipse(now.a, now.e);

  return (
    <Figure
      number={number}
      title="The shrinking orbit"
      description="Peters’ equations for a pair of compact stars: as gravitational waves carry energy and angular momentum away, the orbit shrinks and becomes rounder, slowly for hundreds of millions of years and then all at once. For the Hulse–Taylor pulsar the period shortens by 2.4 × 10⁻¹² seconds every second, and the time of periastron drifts earlier along a parabola that the pulsar’s timing has followed since 1975, to 0.2%. Other pairs to try: the double pulsar, two white dwarfs, and the Sun and Jupiter."
      height={1000}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the moment chosen', symbol: <circle r="6" fill="none" stroke="var(--text)" strokeWidth="2" /> },
        { label: 'the orbit today', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" /> },
        { label: 'the orbit at the moment chosen', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#38bdf8" strokeWidth="2.5" /> },
      ]}
      simplified={
        <p>
          Peters’ equations are relativity’s leading order: two point masses losing energy and angular momentum to gravitational waves, averaged over
          each orbit. They stop being right in the last few orbits, which take seconds; the merger time adds those on by the circular formula. The
          pulsars’ masses and orbits are measured (Weisberg and Huang 2016; Kramer et al. 2021); the white dwarfs’ are from their eclipses (Burdge
          et al. 2019). The measured decay of the Hulse–Taylor pulsar is corrected for the Galaxy’s pull, which changes the period too. Tides,
          mass transfer and the Sun’s own death are left out: the Sun and Jupiter will never merge this way.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Pair">
        {[...PAIRS, OWN_PAIR].map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.toggle}
            aria-pressed={pick === p.id}
            onClick={() => {
              setPick(p.id);
              setAlong(0);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      {pick === 'own' && (
        <div className={styles.controls}>
          <Slider label="First mass" value={own.m1} min={0.2} max={40} log step={0.01} format={(v) => `${fmtMass(v)} M☉`} onChange={(v) => setOwn({ ...own, m1: Number(v.toPrecision(2)) })} />
          <Slider label="Second mass" value={own.m2} min={0.2} max={40} log step={0.01} format={(v) => `${fmtMass(v)} M☉`} onChange={(v) => setOwn({ ...own, m2: Number(v.toPrecision(2)) })} />
          <Slider label="Period" value={own.period} min={60} max={YEAR} log step={0.01} format={formatPeriod} onChange={(v) => setOwn({ ...own, period: Number(v.toPrecision(2)) })} />
          <Slider label="Eccentricity" value={own.e} min={0} max={0.9} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => setOwn({ ...own, e: Math.round(v * 100) / 100 })} />
        </div>
      )}
      <div className={styles.controls}>
        <Slider
          label="Time left before they merge"
          value={along}
          min={0}
          max={1}
          step={0.01}
          format={() => (along === 0 ? `${formatDuration(T)} (today)` : formatDuration(left))}
          onChange={(v) => setAlong(Math.round(v * 100) / 100)}
        />
      </div>
      <div className={styles.split}>
        <div>
          <p className={styles.panelTitle}>The orbit shrinks and rounds off (time left, read right to left)</p>
          <ScatterChart
            groups={[]}
            lines={[
              { name: 'separation ÷ today’s', color: 'var(--series-1)', f: interp('a') },
              { name: 'eccentricity', color: 'var(--series-2)', dashed: true, f: interp('e') },
            ]}
            xScale="log"
            yScale="log"
            xMin={xMin}
            xMax={xMax}
            yMin={3e-5}
            yMax={1.2}
            xLabel="Time left before they merge (years)"
            yLabel="Separation ÷ today’s, or eccentricity"
            formatX={(x) => `10${superscriptOf(Math.round(Math.log10(x)))}`}
            highlight={{ x: left / YEAR, y: now.a / facts.a, label: along === 0 ? 'today' : 'now', color: 'var(--text)' }}
            height={330}
            ariaLabel={`The separation and eccentricity against the time left before the merger, on logarithmic scales. ${caption}`}
          />
        </div>
        <div>
          <p className={styles.panelTitle}>{along === 0 ? 'The orbit today, to scale' : 'The orbit to scale: today (dashed) and at the moment chosen'}</p>
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width="100%" style={{ maxWidth: 300, display: 'block', background: 'var(--sky-bg)', borderRadius: 6 }} role="img" aria-label={`The orbit today, ${formatLength(facts.a)} across its semi-major axis, and ${along === 0 ? 'the same' : `now, ${(now.a / facts.a).toPrecision(2)} times as big with eccentricity ${now.e.toFixed(3)}`}.`}>
            <ellipse cx={today.cx} cy={VIEW / 2} rx={today.rx} ry={today.ry} fill="none" stroke="#64748b" strokeDasharray="3 3" />
            <ellipse cx={then.cx} cy={VIEW / 2} rx={Math.max(then.rx, 0.4)} ry={Math.max(then.ry, 0.4)} fill="none" stroke="#7dd3fc" strokeWidth="2" />
            <circle cx={VIEW / 2} cy={VIEW / 2} r={3} fill="#fde68a" />
            <text x={8} y={VIEW - 10} fontSize="11" fill="#9aa8c4">
              one focus, with the heavier star near it
            </text>
            {then.rx < 2 && (
              <text x={VIEW / 2} y={VIEW / 2 + 22} fontSize="11" fill="#7dd3fc" textAnchor="middle">
                now {formatRatio(now.a / facts.a)} of today’s size: too small to see
              </text>
            )}
          </svg>
        </div>
      </div>
      <div className={styles.split}>
        <div>
          <p className={styles.panelTitle}>The periastron arrives earlier each orbit: the shift since 1975</p>
          <ScatterChart
            groups={[]}
            lines={[
              { name: 'relativity’s prediction', color: 'var(--series-1)', f: (yr) => shiftAt(yr) * shiftUnit.k },
              ...(ht ? [{ name: `measured (${HULSE_TAYLOR_RATIO.value} × the prediction)`, color: 'var(--series-2)', dash: '2 4', f: (yr: number) => shiftMeasured(yr) * shiftUnit.k }] : []),
            ]}
            xScale="linear"
            yScale="linear"
            xMin={1975}
            xMax={1975 + yearsShown}
            yMin={tiny ? -1 : shiftEnd * shiftUnit.k * 1.1}
            yMax={tiny ? 0.05 : -shiftEnd * shiftUnit.k * 0.05}
            xLabel="Year"
            yLabel={`Cumulative shift (${shiftUnit.name})`}
            formatX={(x) => String(Math.round(x))}
            formatY={(y) => String(Number(y.toPrecision(3))).replace('-', '−')}
            height={300}
            ariaLabel={`The cumulative shift of the time of periastron from 1975 to ${1975 + yearsShown}: after ${yearsShown} years, ${tiny ? 'too small to draw' : `${(shiftEnd * shiftUnit.k).toPrecision(3)} ${shiftUnit.name}`}.`}
          />
          {tiny && <p className={styles.hint}>For this pair the shift is far too small to draw: {formatScientific(Math.abs(shiftEnd), 2)} s in fifty years.</p>}
        </div>
        <dl className={styles.facts}>
          <div>
            <dt>Period shortens by</dt>
            <dd>
              {formatScientific(Math.abs(facts.pbdot), 3)} s/s ({formatTiny(perYear)} a year)
            </dd>
          </div>
          <div>
            <dt>Periastron advances</dt>
            <dd>{facts.advance >= 0.01 ? `${facts.advance.toFixed(facts.advance < 10 ? 2 : 0)}° a year` : `${formatScientific(facts.advance, 2)}° a year`}</dd>
          </div>
          <div>
            <dt>Merges in</dt>
            <dd>{formatDuration(T)}</dd>
          </div>
          <div>
            <dt>Gravitational waves now</dt>
            <dd>{formatHz(facts.waveFrequency)}, twice the orbit’s frequency</dd>
          </div>
          {ht && (
            <div>
              <dt>Measured ÷ predicted</dt>
              <dd>
                {HULSE_TAYLOR_RATIO.value} ± {HULSE_TAYLOR_RATIO.error}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <p className={figureStyles.note}>Read the top chart from right to left: today is at the right, and the merger at the far left.</p>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

/** "1/5,900": a small ratio as one over a round number. */
function formatRatio(r: number): string {
  return `1/${Number((1 / r).toPrecision(2)).toLocaleString('en-GB')}`;
}

function fmtMass(m: number): string {
  return m < 0.01 ? m.toPrecision(2) : m < 10 ? String(Number(m.toPrecision(3))) : String(Math.round(m));
}

function formatTiny(s: number): string {
  if (s >= 1) return `${s.toPrecision(3)} s`;
  if (s >= 1e-3) return `${(s * 1e3).toPrecision(3)} ms`;
  if (s >= 1e-6) return `${(s * 1e6).toPrecision(3)} µs`;
  if (s >= 1e-9) return `${(s * 1e9).toPrecision(3)} ns`;
  return `${formatScientific(s, 2)} s`;
}

function formatHz(f: number): string {
  if (f >= 1) return `${f.toPrecision(3)} Hz`;
  if (f >= 1e-3) return `${(f * 1e3).toPrecision(3)} mHz`;
  if (f >= 1e-6) return `${(f * 1e6).toPrecision(3)} µHz`;
  return `${(f * 1e9).toPrecision(3)} nHz`;
}

function superscriptOf(n: number): string {
  const digits = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return String(n)
    .split('')
    .map((c) => (c === '-' ? '⁻' : digits[Number(c)]))
    .join('');
}
