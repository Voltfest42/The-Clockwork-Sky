import { useMemo, useState, type ReactNode } from 'react';
import { muOf } from '../core/binaries/roche';
import { contourLines, sampleGrid } from '../core/math/contour';
import { rochePotential, criticalPotential } from '../core/binaries/roche';
import { fromPhysics } from '../core/stars/hr';
import { EVENT_LABELS } from '../core/stellar/bse/evolve';
import { EVENT_WORDS, TYPE_NAMES, type BinaryEvent, type BinaryStep } from '../core/stellar/bse/outcome';
import { FIGURE_SWITCHES } from '../core/stellar/bse/runs';
import { Caption, Figure } from '../viz/Figure';
import { HRDiagram } from '../viz/hr/HRDiagram';
import { ScatterChart } from '../viz/ScatterChart';
import { StarDisc } from '../viz/star/StarDisc';
import { useBinary } from '../viz/useStellar';
import { ALGOL, ALGOL_TODAY } from './binaries28';
import { Slider } from './Slider';
import styles from './sky/sky.module.css';

/**
 * The Algol paradox, step by step (Figure 28.3): BSE runs a pair like Algol’s
 * ancestors from birth. The heavier star swells first and fills its Roche
 * lobe while both are still on the main sequence; it gives most of its mass
 * away, the orbit shrinking until the masses are equal and widening after;
 * hundreds of millions of years later the once-heavier star is a K-type giant
 * of 0.7 M☉ still filling its lobe beside a B star of 3 M☉: today’s Algol.
 */

const T_START = 911;
const T_MAX = 1040;
const MOMENTS = [
  { name: 'Born', t: 0 },
  { name: 'Overflow begins', t: 427.4 },
  { name: 'Masses equal', t: 443.4 },
  { name: 'Donor leaves the main sequence', t: 520 },
  { name: 'Algol today', t: T_START },
  { name: 'The companion swells', t: 999.5 },
  { name: 'Merged', t: 1035 },
] as const;

const fmt = (x: number, d = 2) => x.toFixed(d);

/** What an event's types and masses are, in words; after a merger, the one star left. */
function detail(e: BinaryEvent): string {
  const alone: 0 | 1 | null = e.kw[0] === 15 ? 1 : e.kw[1] === 15 ? 0 : null;
  if (alone !== null) return `: the merged star is a ${TYPE_NAMES[e.kw[alone]]} of ${fmt(e.m[alone])} M☉`;
  return `: ${TYPE_NAMES[e.kw[0]]} of ${fmt(e.m[0])} M☉ and ${TYPE_NAMES[e.kw[1]]} of ${fmt(e.m[1])} M☉`;
}

/** The last step at or before t. */
function stepAt(steps: BinaryStep[], t: number): BinaryStep {
  let lo = 0;
  let hi = steps.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (steps[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return steps[lo];
}

/** Linear interpolation of a quantity between steps (NaN outside the run). */
function at(steps: BinaryStep[], t: number, get: (s: BinaryStep) => number): number {
  if (t < steps[0].t || t > steps[steps.length - 1].t) return NaN;
  const a = stepAt(steps, t);
  const i = steps.indexOf(a);
  const b = steps[Math.min(i + 1, steps.length - 1)];
  if (b === a || b.t === a.t) return get(a);
  return get(a) + ((t - a.t) / (b.t - a.t)) * (get(b) - get(a));
}

/** The Roche lobes’ figure of eight for the pair, in R☉ about the centre of mass. */
function lobeOutline(q: number, sep: number): [number, number][][] {
  const mu = muOf(q);
  const grid = sampleGrid((x, y) => rochePotential(x, y, 0, mu), 121, 81, -1.2, 1.2, -0.8, 0.8);
  return contourLines(grid, criticalPotential(mu) + 1e-9).map((l) => l.map(([x, y]) => [x * sep, y * sep] as [number, number]));
}

export function AlgolFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [t, setT] = useState(T_START);
  const reset = () => setT(T_START);
  const run = useBinary({ ...ALGOL, ...FIGURE_SWITCHES });
  const steps = run?.steps;
  const s = steps ? stepAt(steps, t) : null;
  const paired = s ? s.sep > 0 && s.kw[0] < 15 && s.kw[1] < 15 : false;
  const outline = useMemo(() => (s && paired ? lobeOutline(s.m[0] / s.m[1], s.sep) : []), [s, paired]);
  const past = useMemo(() => (steps ? steps.filter((x) => x.t <= t) : []), [steps, t]);
  const events = run ? run.events.filter((e) => e.label !== 10) : [];
  const current = events.filter((e) => e.t <= t + 1e-9).at(-1);

  const VIEW_W = 360;
  const VIEW_H = 220;
  const span = 30; // R☉ across
  const px = VIEW_W / span;
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;

  const words = (k: number) => TYPE_NAMES[k];
  const left = s ? (s.kw[0] === 15 ? 1 : s.kw[1] === 15 ? 0 : null) : null;
  const stars = !s
    ? ''
    : left !== null
      ? `The two stars have merged into one, a ${words(s.kw[left])} of ${fmt(s.m[left])} M☉. They are no longer a pair.`
      : `Star 1, born with 2.8 M☉, is a ${words(s.kw[0])} of ${fmt(s.m[0])} M☉${s.rrl[0] >= 1 ? ', filling its Roche lobe' : ''}; star 2, born with 1.0 M☉, is a ${words(s.kw[1])} of ${fmt(s.m[1])} M☉. ${paired ? `They orbit every ${fmt(s.period)} days, ${fmt(s.sep, 1)} R☉ apart.` : 'They are no longer a pair.'}${s.m[0] < s.m[1] && s.kw[0] > s.kw[1] ? ' The lighter star is the more evolved: the Algol paradox.' : ''}`;
  const caption = s ? `${fmt(t, 0)} million years after birth. ${stars} Algol today: ${ALGOL_TODAY.mA} and ${ALGOL_TODAY.mB} M☉, ${ALGOL_TODAY.period} days.` : 'Running BSE…';

  return (
    <Figure
      number={number}
      title="The Algol paradox, step by step"
      description="Hurley’s binary-star code runs a pair like Algol’s ancestors, 2.8 and 1.0 solar masses 1.8 days apart. The heavier star swells first and fills its Roche lobe while both are still on the main sequence; it gives most of its mass away, and the orbit shrinks until the masses are equal and widens after. Four hundred million years later the once-heavier star is a K-type giant of 0.7 solar masses, still filling its lobe, beside a B star of 3.1: Algol as it is today, its lighter star the more evolved."
      height={1250}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'star 1, born the heavier', symbol: <circle r="6" fill="#f97316" /> },
        { label: 'star 2, born the lighter', symbol: <circle r="6" fill="#60a5fa" /> },
        { label: 'the Roche lobes', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#f59e0b" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          BSE (Hurley, Tout &amp; Pols 2002) follows each star with SSE’s fitted formulae and the pair with recipes for winds, tides,
          magnetic braking, overflow and common envelopes; it doesn’t solve the stars’ structure. Its stars are drawn as spheres of
          their own radius, except while one fills its lobe, when it is drawn filling it. The pair here was picked from a search of BSE runs to
          land near Algol’s masses and period; Algol’s third star, on a 680-day orbit, is left out. BSE’s accretor here takes gas
          as fast as its thermal timescale allows and loses the rest. Common envelopes use α = 1.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Time since birth" value={t} min={0} max={T_MAX} step={0.5} format={(v) => `${fmt(v, 0)} million years`} onChange={(v) => setT(Math.round(v * 2) / 2)} />
      </div>
      <div className={styles.presets} role="group" aria-label="Moments">
        {MOMENTS.map((m) => (
          <button key={m.name} type="button" className={styles.toggle} aria-pressed={Math.abs(m.t - t) < 0.01} onClick={() => setT(m.t)}>
            {m.name}
          </button>
        ))}
      </div>
      {s && steps ? (
        <>
          <div className={styles.split}>
            <div>
              <p className={styles.panelTitle}>The pair to scale, seen from above</p>
              <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" style={{ display: 'block', background: 'var(--sky-bg)', borderRadius: 6 }} role="img" aria-label={caption}>
                {paired && (
                  <>
                    {outline.map((line, i) => (
                      <path key={i} d={line.map(([x, y], k) => `${k ? 'L' : 'M'}${(cx + x * px).toFixed(1)} ${(cy - y * px).toFixed(1)}`).join('')} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                    ))}
                    {[0, 1].map((k) => {
                      const mu = s.m[1] / (s.m[0] + s.m[1]);
                      const x = k === 0 ? -mu * s.sep : (1 - mu) * s.sep;
                      const r = Math.min(s.R[k], s.rrl[k] > 0 ? s.R[k] / s.rrl[k] : s.R[k]) * px;
                      return <StarDisc key={k} cx={cx + x * px} cy={cy} r={r} kelvin={s.T[k]} title={`Star ${k + 1}: ${fmt(s.m[k])} M☉, ${Math.round(s.T[k])} K`} />;
                    })}
                  </>
                )}
                {!paired &&
                  [0, 1].map((k) =>
                    s.kw[k] < 15 ? <StarDisc key={k} cx={cx} cy={cy} r={Math.min(s.R[k] * px, VIEW_H / 2 - 4)} kelvin={s.T[k]} title={`${fmt(s.m[k])} M☉`} /> : null,
                  )}
                <line x1={10} x2={10 + 10 * px} y1={VIEW_H - 12} y2={VIEW_H - 12} stroke="#9aa8c4" />
                <text x={10} y={VIEW_H - 18} fontSize="11" fill="#9aa8c4">
                  10 R☉
                </text>
              </svg>
            </div>
            <div>
              <p className={styles.panelTitle}>What has happened</p>
              <ol style={{ margin: 0, paddingLeft: 22, fontSize: '0.9rem', lineHeight: 1.5 }}>
                {events.map((e, i) => (
                  <li key={i} style={{ fontWeight: e === current ? 700 : 400 }}>
                    <button type="button" className={styles.toggle} style={{ padding: '0 4px' }} aria-pressed={e === current} onClick={() => setT(e.t)}>
                      {fmt(e.t, 0)} Myr
                    </button>{' '}
                    {EVENT_WORDS[EVENT_LABELS[e.label]]}
                    {e.label === 2 ? detail(e) : ''}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className={styles.panelTitle}>Both stars on the HR diagram</p>
          <HRDiagram
            axes="physicist"
            radiusLines
            markers={[0, 1]
              .filter((k) => s.kw[k] < 10)
              .map((k) => ({ id: `s${k}`, label: `star ${k + 1}`, point: fromPhysics(Math.min(45000, s.T[k]), s.L[k]), highlight: true, side: k === 0 ? ('right' as const) : ('left' as const) }))}
            ariaLabel={`Both stars’ tracks so far. ${caption}`}
          >
            {(place) => {
              const line = (k: number) =>
                past
                  .filter((x) => x.kw[k] < 10)
                  .map((x, i) => `${i ? 'L' : 'M'}${place(fromPhysics(Math.min(45000, x.T[k]), x.L[k])).join(' ')}`)
                  .join(' ');
              return (
                <g>
                  <path d={line(0)} stroke="#f97316" strokeWidth={1.8} fill="none" />
                  <path d={line(1)} stroke="#60a5fa" strokeWidth={1.8} fill="none" />
                </g>
              );
            }}
          </HRDiagram>
          <div className={styles.split}>
            <div>
              <p className={styles.panelTitle}>Masses</p>
              <ScatterChart
                groups={[]}
                lines={[
                  { name: 'star 1', color: '#f97316', f: (x) => (x <= t ? at(steps, x, (z) => (z.kw[0] < 15 ? z.m[0] : NaN)) : NaN) },
                  { name: 'star 2', color: '#60a5fa', f: (x) => (x <= t ? at(steps, x, (z) => (z.kw[1] < 15 ? z.m[1] : NaN)) : NaN) },
                ]}
                xScale="linear"
                yScale="linear"
                xMin={0}
                xMax={T_MAX}
                yMin={0}
                yMax={4}
                xLabel="Time since birth (million years)"
                yLabel="Mass (M☉)"
                height={240}
                ariaLabel={`Both masses against time: star 1 from 2.8 M☉ and star 2 from 1.0 M☉; now ${fmt(s.m[0])} and ${fmt(s.m[1])} M☉.`}
              />
            </div>
            <div>
              <p className={styles.panelTitle}>Orbital period</p>
              <ScatterChart
                groups={[]}
                lines={[{ name: 'period', color: 'var(--accent)', f: (x) => (x <= t ? at(steps, x, (z) => (z.period > 0 ? z.period : NaN)) : NaN) }]}
                xScale="linear"
                yScale="log"
                xMin={0}
                xMax={T_MAX}
                yMin={0.5}
                yMax={10}
                xLabel="Time since birth (million years)"
                yLabel="Period (days)"
                formatY={(y) => String(Number(y.toPrecision(1)))}
                highlight={paired ? { x: t, y: s.period, label: `${fmt(s.period)} d`, color: 'var(--accent)' } : undefined}
                height={240}
                ariaLabel={`The period against time: 1.8 days at birth, shrinking to 0.82 days when the masses are equal, then widening; now ${paired ? `${fmt(s.period)} days` : 'no orbit'}.`}
              />
            </div>
          </div>
        </>
      ) : (
        <p className={styles.hint}>Running BSE…</p>
      )}
      <Caption>{caption}</Caption>
    </Figure>
  );
}
