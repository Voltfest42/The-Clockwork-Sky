import { useMemo, useState, type ReactNode } from 'react';
import { MOON_DISTANCE_KM } from '../data/scale';
import { Caption, Figure } from '../viz/Figure';
import { Histogram } from '../viz/Histogram';
import { ASTEROID_COUNT, beltBins, describeBin, FETCHED, GROUPS, resonanceMarkers, SLAB, SPACING, spacingWords } from './asteroidBelt';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Gaps in the belt: the 896,000 numbered asteroids counted by the size of
 * their orbits, with the gaps where an asteroid's year would be a simple
 * fraction of Jupiter's. A second view shows a real patch of the belt, 50
 * million km across, with every known asteroid in it.
 */

const RANGES = {
  belt: { name: 'The main belt', from: 1.8, to: 3.7 },
  jupiter: { name: 'Out to Jupiter', from: 1.5, to: 5.5 },
} as const;
const BAR = '#8a9cc8';
const GAP = '#e0663f';
const GROUP = '#62d6c4';
const SIDE = 400;

export function AsteroidBeltFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [view, setView] = useState<'histogram' | 'empty'>('histogram');
  const [range, setRange] = useState<keyof typeof RANGES>('belt');
  const [log, setLog] = useState(false);
  const [showResonances, setShowResonances] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const bins = useMemo(() => beltBins(), []);
  const histogramBins = useMemo(() => bins.map((b) => ({ x0: b.a0, x1: b.a1, count: b.count })), [bins]);

  const reset = () => {
    setView('histogram');
    setRange('belt');
    setLog(false);
    setShowResonances(false);
    setPicked(null);
  };

  const { from, to } = RANGES[range];
  const markers = showResonances
    ? resonanceMarkers()
        .filter((m) => m.a >= from && m.a <= to)
        .map((m) => ({ x: m.a, label: m.name.replace(/ \(.*\)/, ''), color: m.kind === 'gap' ? GAP : GROUP, dashed: m.kind === 'group' }))
    : [];
  const count = ASTEROID_COUNT.toLocaleString('en-GB');
  const spacing = spacingWords(SPACING.medianKm);

  const k = SIDE / (2 * SLAB.halfWidthKm);
  const caption =
    view === 'histogram'
      ? picked !== null
        ? describeBin(bins, picked)
        : showResonances
          ? 'The gaps fall exactly where an asteroid would go round a whole number of times for each of Jupiter’s orbits: 3 : 1, 5 : 2, 7 : 3 and 2 : 1. At 3 : 2 and 1 : 1 the resonance shelters a group instead: the Hildas and the Trojans.'
          : `The ${count} numbered asteroids, counted by the size of their orbits in steps of 0.01 AU. Most lie between Mars and Jupiter, and the belt has sharp gaps.`
      : `A patch of the belt 50 million km square and 2 million km thick, at 2.7 AU from the Sun, with every numbered asteroid in it on ${SPACING.date}: ${SLAB.points.length}. From an asteroid in the main belt, the nearest known one is typically ${spacing} away.`;

  return (
    <Figure
      number={number}
      title="Gaps in the belt"
      description={`A histogram of the ${count} numbered asteroids by the size of their orbits, from 1.5 to 5.5 AU. The main belt between Mars and Jupiter has sharp gaps, the Kirkwood gaps, where an asteroid would go round 3, 5/2, 7/3 or 2 times for each of Jupiter’s orbits; at 3 : 2 and 1 : 1 the Hildas and the Trojans cluster instead. A second view shows a real patch of the belt 50 million km across with every known asteroid in it: a few dozen, millions of kilometres apart.`}
      height={700}
      tryThis={tryThis}
      onReset={reset}
      legend={
        view === 'histogram'
          ? [
              { label: 'asteroids per 0.01 AU', symbol: <rect x="-5" y="-8" width="10" height="16" fill={BAR} /> },
              { label: 'a Kirkwood gap (a resonance that clears)', symbol: <line x1="0" y1="-9" x2="0" y2="9" stroke={GAP} strokeWidth="2" /> },
              { label: 'a resonance that gathers a group', symbol: <line x1="0" y1="-9" x2="0" y2="9" stroke={GROUP} strokeWidth="2" strokeDasharray="4 3" /> },
            ]
          : [
              { label: 'a numbered asteroid (drawn far too big)', symbol: onSky(<circle r="2.5" fill="#e8e0d0" />) },
              { label: 'the Moon’s orbit round Earth, for scale', symbol: onSky(<circle r="6" fill="none" stroke="#62d6c4" strokeWidth="1.3" />) },
            ]
      }
      simplified={
        <p>
          Only numbered asteroids are counted: those with well-known orbits, from JPL’s Small-Body Database, fetched {FETCHED}. Hundreds of
          thousands more are known less well, and there are many more too small to have been found, so the true spacing is smaller, but still
          far too big to need dodging. The patch flattens 2 million km of thickness onto the page.
        </p>
      }
    >
      <div>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'histogram'} onClick={() => setView('histogram')}>
              By orbit size
            </button>
            <button type="button" aria-pressed={view === 'empty'} onClick={() => setView('empty')}>
              How empty is it?
            </button>
          </span>
          {view === 'histogram' && (
            <button type="button" className={figureStyles.toolButton} aria-pressed={showResonances} onClick={() => setShowResonances(!showResonances)}>
              {showResonances ? 'Hide' : 'Show'} Jupiter’s resonances
            </button>
          )}
        </div>
        {view === 'histogram' ? (
          <>
            <div className={styles.presets} role="group" aria-label="Range" style={{ marginBottom: 8 }}>
              {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
                <button key={r} type="button" className={styles.toggle} aria-pressed={range === r} onClick={() => setRange(r)}>
                  {RANGES[r].name}
                </button>
              ))}
              <button type="button" className={styles.toggle} aria-pressed={log} onClick={() => setLog(!log)}>
                Log scale
              </button>
            </div>
            <Histogram
              bins={histogramBins}
              xMin={from}
              xMax={to}
              yScale={log ? 'log' : 'linear'}
              xLabel="Size of the orbit (semi-major axis), AU"
              yLabel="Asteroids"
              formatX={(x) => x.toFixed(1)}
              color={BAR}
              markers={markers}
              picked={picked}
              onPick={setPicked}
              keyStep={0.01}
              ariaLabel={`Histogram of the numbered asteroids by orbit size from ${from} to ${to} AU${showResonances ? ', with Jupiter’s resonances marked' : ''}. ${picked !== null ? describeBin(bins, picked) : ''}`}
            />
            <p className={styles.hint}>Click or drag on the chart (or focus it and use the arrow keys) to read a bar.</p>
          </>
        ) : (
          <svg viewBox={`0 0 ${SIDE} ${SIDE}`} className={seasonStyles.svg} style={{ maxWidth: SIDE, margin: '0 auto' }} role="img" aria-label={caption}>
            <rect width={SIDE} height={SIDE} fill="#070b16" />
            {SLAB.points.map(([across, out], i) => (
              <circle key={i} cx={SIDE / 2 + across * 1000 * k} cy={SIDE / 2 - out * 1000 * k} r={2.2} fill="#e8e0d0" />
            ))}
            <circle cx={SIDE / 2} cy={SIDE / 2} r={MOON_DISTANCE_KM * k} fill="none" stroke="#62d6c4" strokeWidth="1.3" />
            <line x1={20} y1={SIDE - 20} x2={20 + 10_000_000 * k} y2={SIDE - 20} stroke="var(--sky-text)" strokeWidth="2" />
            <text x={20} y={SIDE - 28} fontSize="12" fill="var(--sky-text)">
              10 million km
            </text>
            <text x={14} y={20} fontSize="12" fill="var(--sky-muted)">
              ↑ away from the Sun
            </text>
          </svg>
        )}
        <div className={styles.readout}>
          <span>
            Numbered asteroids: <b>{count}</b>
          </span>
          <span>
            In the main belt: <b>{GROUPS.mainBelt.toLocaleString('en-GB')}</b>
          </span>
          <span>
            Trojans: <b>{GROUPS.trojans.toLocaleString('en-GB')}</b>
          </span>
          <span>
            Typical gap to the nearest: <b>{(SPACING.medianKm / 1e6).toFixed(1)} million km</b>
          </span>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
