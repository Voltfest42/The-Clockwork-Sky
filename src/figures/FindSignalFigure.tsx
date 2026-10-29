import { useMemo, useState, type ReactNode } from 'react';
import { bin, fold } from '../core/signal/series';
import { Caption, Figure } from '../viz/Figure';
import { LightCurve } from '../viz/lightCurve/LightCurve';
import { bestPeak, NOISE_ONLY, periodogram, pointScatter, SIGNAL, TRIAL_PERIODS, WITH_PLANET } from './signal';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Find the signal (Figure T6.1): a noisy light curve with a planet's transit
 * hidden in it. Average neighbouring points and the scatter shrinks as 1/√N;
 * fold the light curve at a trial period and the dips pile up when the period
 * is right; search every period, and see that pure noise throws up peaks too.
 */

const BINS = [
  { hours: 0, name: 'None' },
  { hours: 1, name: '1 hour' },
  { hours: 3, name: '3 hours' },
  { hours: 12, name: '12 hours' },
];

const START = { planet: true, folded: false, binHours: 0, period: 2.5, searched: false };

export function FindSignalFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [planet, setPlanet] = useState(START.planet);
  const [folded, setFolded] = useState(START.folded);
  const [binHours, setBinHours] = useState(START.binHours);
  const [period, setPeriod] = useState(START.period);
  const [searched, setSearched] = useState(START.searched);
  const reset = () => {
    setPlanet(START.planet);
    setFolded(START.folded);
    setBinHours(START.binHours);
    setPeriod(START.period);
    setSearched(START.searched);
  };
  const series = planet ? WITH_PLANET : NOISE_ONLY;
  const xs = useMemo(() => (folded ? fold(series.times, period) : series.times), [series, folded, period]);
  // Folded, bins are in phase: the same number of hours, as a share of the period.
  const binned = useMemo(() => {
    if (!binHours) return null;
    const width = folded ? binHours / 24 / period : binHours / 24;
    return bin(xs, series.values, width, 0, SIGNAL.sigma);
  }, [xs, series, binHours, folded, period]);
  const results = searched ? periodogram(series) : null;
  const peak = results ? bestPeak(results) : null;
  // How many measurements each average holds: two an hour, or, folded, two an hour from every cycle.
  const perBin = binned ? Math.max(1, Math.round(binned.reduce((n, b) => n + b.count, 0) / binned.length)) : 1;
  const scatter = pointScatter(series);

  return (
    <Figure
      number={number}
      title="Find the signal"
      description="Sixty days of a star’s light, measured every half hour, with a planet’s transit hidden in the noise: a dip of 0.5% for 3.6 hours every 4.3 days. Averaging neighbouring points shrinks the scatter as one over the square root of their number; folding the measurements at a trial period piles the dips on top of each other when the period is right; and a search over 1,500 periods finds the planet, but also finds peaks in pure noise, false alarms."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a measurement', symbol: <rect x="-2" y="-2" width="4" height="4" fill="var(--text-muted)" /> },
        { label: 'an average, with its error bar', symbol: <g><line y1="-7" y2="7" stroke="var(--series-1)" /><rect x="-3" y="-3" width="6" height="6" fill="var(--series-1)" /></g> },
        { label: 'how far each period’s best dip stands out', symbol: <line x1="-9" x2="9" stroke="var(--series-2)" strokeWidth="2.5" /> },
      ]}
      simplified={
        <p>
          The noise is the simplest kind, independent from one measurement to the next and the same size throughout. Real light curves also wander
          slowly as the star’s spots turn and the instrument drifts, which has to be taken out first. The search slides a box-shaped dip of the
          right length across the folded curve; real searches try many lengths too.
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={figureStyles.toolbar}>
          <div className={figureStyles.segmented} role="group" aria-label="Which star">
            <button type="button" aria-pressed={planet} onClick={() => setPlanet(true)}>
              A star with a planet
            </button>
            <button type="button" aria-pressed={!planet} onClick={() => setPlanet(false)}>
              Noise alone
            </button>
          </div>
          <div className={figureStyles.segmented} role="group" aria-label="Plot against">
            <button type="button" aria-pressed={!folded} onClick={() => setFolded(false)}>
              Time
            </button>
            <button type="button" aria-pressed={folded} onClick={() => setFolded(true)}>
              Folded
            </button>
          </div>
        </div>
        <div className={styles.toggles} role="group" aria-label="Average neighbouring points">
          <span className={styles.togglesLabel}>Average over:</span>
          {BINS.map((b) => (
            <button key={b.hours} type="button" className={styles.toggle} aria-pressed={binHours === b.hours} onClick={() => setBinHours(b.hours)}>
              {b.name}
            </button>
          ))}
        </div>
        <Slider label="Fold at a period of" value={period} min={1} max={15} log step={0.0005} format={(p) => `${p.toFixed(3)} days`} onChange={(p) => { setPeriod(p); setFolded(true); }} />
      </div>
      <LightCurve
        xMin={0}
        xMax={folded ? 1 : SIGNAL.span}
        yMin={0.985}
        yMax={1.012}
        xLabel={folded ? `Phase, folded at ${period.toFixed(3)} days` : 'Time (days)'}
        yLabel="Light (share of usual)"
        formatX={(x) => (folded ? x.toFixed(1) : String(x))}
        formatY={(y) => `${(y * 100).toFixed(1)}%`}
        dots={[
          { name: `${series.times.length.toLocaleString('en-GB')} measurements`, color: binned ? 'color-mix(in srgb, var(--text-muted) 45%, transparent)' : 'var(--text-muted)', xs, ys: series.values },
          ...(binned ? [{ name: `averages of about ${perBin}`, color: 'var(--series-1)', xs: binned.map((b) => b.x), ys: binned.map((b) => b.mean), errors: binned.map((b) => b.error), large: true }] : []),
        ]}
        ariaLabel={folded ? `The light curve folded at ${period.toFixed(3)} days` : 'Sixty days of measurements of the star’s light'}
        height={250}
      />
      <div className={styles.readout}>
        <span>
          One measurement’s scatter: <b>±{(scatter * 100).toFixed(2)}%</b>
        </span>
        <span>
          An average of {perBin}: <b>±{((scatter / Math.sqrt(perBin)) * 100).toFixed(2)}%</b> (÷ √{perBin})
        </span>
        <button type="button" className={figureStyles.toolButton} onClick={() => setSearched(true)} disabled={searched}>
          Search every period
        </button>
      </div>
      {results && peak && (
        <>
          <LightCurve
            xMin={1}
            xMax={15}
            yMin={0}
            yMax={Math.max(8, Math.ceil(peak.significance + 1))}
            xLabel="Trial period (days)"
            yLabel="Best dip (σ)"
            curves={[{ name: 'How far the best dip stands out', color: 'var(--series-2)', points: results.map((r) => ({ x: r.period, y: r.significance })) }]}
            levels={[{ y: 5, label: '5σ' }]}
            cursor={period}
            onCursor={(p) => {
              setPeriod(p);
              setFolded(true);
            }}
            cursorStep={0.01}
            cursorText={(p) => `Fold at ${p.toFixed(2)} days`}
            ariaLabel={`The search over ${TRIAL_PERIODS.length.toLocaleString('en-GB')} trial periods; the highest peak is at ${peak.period.toFixed(2)} days, ${peak.significance.toFixed(1)}σ`}
            height={200}
            hideLegend
          />
          <div className={styles.readout}>
            <span>
              Highest peak: <b>{peak.period.toFixed(3)} days</b>, standing out by <b>{peak.significance.toFixed(1)}σ</b>
            </span>
            <button
              type="button"
              className={figureStyles.toolButton}
              onClick={() => {
                setPeriod(peak.period);
                setFolded(true);
              }}
            >
              Fold at the peak
            </button>
          </div>
        </>
      )}
      <Caption>
        {peak
          ? planet
            ? `The search finds a dip every ${peak.period.toFixed(2)} days, ${peak.significance.toFixed(0)}σ out of the noise: far beyond anything noise alone makes. Smaller peaks at half and double the period are echoes of the same dip.`
            : `Noise alone, and still the highest of ${TRIAL_PERIODS.length.toLocaleString('en-GB')} trials stands out by ${peak.significance.toFixed(1)}σ. Try enough periods and chance supplies a peak; that is why discoveries need 5σ or more, and a second look.`
          : folded
            ? `Folded at ${period.toFixed(3)} days, every measurement is placed by where it falls in that cycle. ${Math.abs(period - SIGNAL.period) < 0.01 && planet ? 'At the right period the dips pile up into one.' : 'At a wrong period the dips are smeared out.'}`
            : 'Sixty days of measurements, each wobbling by about 0.4% for no reason but noise. Is anything hidden in it?'}
      </Caption>
    </Figure>
  );
}
