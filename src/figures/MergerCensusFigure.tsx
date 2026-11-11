import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { eventDate, FAMOUS_MERGERS, MERGER_CENSUS, MERGERS, RUNS, type MergerEvent } from '../data/mergers';
import { Caption, Figure } from '../viz/Figure';
import { Histogram } from '../viz/Histogram';
import { ScatterChart } from '../viz/ScatterChart';
import { eventsUpTo, heavierMassHistogram, KIND_NAMES, kindOf, LOWER_GAP, NEUTRON_STAR_RANGE, PAIR_INSTABILITY_GAP, type MergerKind } from './ripples';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The merger census (Figure 29.4): every event in GWOSC's cumulative
 * catalogue with its two masses at the source and their 90% intervals, on log
 * axes; the neutron stars' range, the gap below the lightest black holes and
 * the pair-instability gap shaded; a histogram of the heavier mass; a slider
 * through the observing runs; and a card for the event picked by click, list
 * or arrow keys.
 */

const START_EVENT = 'GW150914';
const LAST_RUN = RUNS.length - 1;
const RANGE = [1, 250] as const;

const KIND_STYLE: Record<MergerKind, { colour: string; shape: 'circle' | 'triangle' | 'diamond' }> = {
  bbh: { colour: 'var(--series-1)', shape: 'circle' },
  nsbh: { colour: 'var(--series-2)', shape: 'triangle' },
  bns: { colour: 'var(--series-3)', shape: 'diamond' },
};

const withMasses = MERGERS.filter((e) => e.m1 && e.m2);

export function MergerCensusFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [picked, setPicked] = useState<string>(START_EVENT);
  const [runIndex, setRunIndex] = useState(LAST_RUN);
  const selectId = useId();
  const reset = () => {
    setPicked(START_EVENT);
    setRunIndex(LAST_RUN);
  };
  const run = RUNS[runIndex];
  const shown = useMemo(() => eventsUpTo(run.id), [run.id]);
  const plotted = shown.filter((e) => e.m1 && e.m2);
  const event = MERGERS.find((e) => e.name === picked) ?? MERGERS[0];
  const visible = shown.includes(event);
  const famous = FAMOUS_MERGERS.find((f) => f.name === event.name);
  const bins = useMemo(() => heavierMassHistogram(plotted, 5, 150), [plotted]);
  const counts = (Object.keys(KIND_NAMES) as MergerKind[]).map((k) => ({ k, n: plotted.filter((e) => kindOf(e) === k).length }));
  const inGap = plotted.filter((e) => e.m1 && e.m1[0] >= PAIR_INSTABILITY_GAP[0]).length;

  // The arrow keys step through the plotted events in order of the heavier mass
  const order = useMemo(() => [...plotted].sort((a, b) => (a.m1?.[0] ?? 0) - (b.m1?.[0] ?? 0)), [plotted]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = order.findIndex((x) => x.name === picked);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1 : Math.max(0, Math.min(order.length - 1, (i < 0 ? 0 : i) + (e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 1)));
    setPicked(order[next].name);
  };

  const pickNear = (sx: (x: number) => number, sy: (y: number) => number) => (event: PointerEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const view = svg.viewBox.baseVal;
    const x = ((event.clientX - box.left) / box.width) * view.width;
    const y = ((event.clientY - box.top) / box.height) * view.height;
    let best: MergerEvent | null = null;
    let bestD = 16 ** 2;
    for (const p of plotted) {
      if (!p.m1 || !p.m2) continue;
      const d = (sx(p.m1[0]) - x) ** 2 + (sy(p.m2[0]) - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best) setPicked(best.name);
  };

  const date = eventDate(event.name);
  const kind = kindOf(event);
  const caption = `${shown.length} ${shown.length === 1 ? 'event' : 'events'} up to the end of ${run.id} (${run.years}), ${plotted.length} with their masses estimated: ${counts
    .filter((c) => c.n > 0)
    .map((c) => `${c.n} ${c.n === 1 ? 'merger' : 'mergers'} of ${KIND_NAMES[c.k]}`)
    .join(', ')}. ${inGap ? `${inGap} ${inGap === 1 ? 'has its heavier black hole' : 'have their heavier black hole'} in the pair-instability gap, above 50 M☉.` : 'None has a black hole in the pair-instability gap yet.'} Picked: ${event.name}, ${date.text}${visible ? '' : ' (not yet found at this point)'}${event.m1 && event.m2 ? `: ${fmtInterval(event.m1)} and ${fmtInterval(event.m2)} M☉` : ': too faint for its masses to be estimated'}.`;

  return (
    <Figure
      number={number}
      title="The merger census"
      description={`Every merger in the gravitational-wave catalogue (${MERGER_CENSUS.count} candidates as of ${MERGER_CENSUS.asOf}, ${MERGER_CENSUS.withMasses} with their masses estimated): the heavier mass against the lighter, with their uncertainties, on logarithmic axes. Most are pairs of black holes of 10 to 40 Suns; a few involve neutron stars; dozens have a heavier black hole above 50 Suns, in the gap where pair instability should leave none, or at its uncertain edge. A slider steps through the observing runs since 2015 to watch the census grow.`}
      height={1180}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: '90% intervals of the two masses', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="1.5" /> },
        { label: 'the pair-instability gap (Chapter 25)', symbol: <rect x="-9" y="-6" width="18" height="12" fill="var(--wrong)" fillOpacity="0.18" /> },
        { label: 'neutron stars’ masses, and the gap above them', symbol: <rect x="-9" y="-6" width="18" height="12" fill="var(--series-3)" fillOpacity="0.2" /> },
        { label: 'the event picked', symbol: <circle r="6" fill="none" stroke="var(--text)" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          The masses are each event’s median and 90% credible interval at the source, as GWOSC lists them (the catalogue papers’ preferred
          analyses); the heavier is always “first”. Candidates found in the later runs below the catalogue’s threshold for estimating their
          masses are counted but not drawn. Which events are neutron stars is judged here by mass alone (below 3 M☉); the gaps’ edges are uncertain
          by several Suns. The catalogue shows what the detectors can hear, not what exists: heavy pairs are heard from much farther away, so they
          are over-represented.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <label htmlFor={selectId} className={figureStyles.inputLabel}>
          Event
        </label>
        <select id={selectId} value={picked} onChange={(e) => setPicked(e.target.value)}>
          <optgroup label="Famous">
            {FAMOUS_MERGERS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </optgroup>
          {RUNS.map((r) => (
            <optgroup key={r.id} label={`${r.id} (${r.years})`}>
              {withMasses
                .filter((e) => e.run === r.id && !FAMOUS_MERGERS.some((f) => f.name === e.name))
                .map((e) => (
                  <option key={e.name} value={e.name}>
                    {e.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className={styles.controls}>
        <Slider label="Up to the end of" value={runIndex} min={0} max={LAST_RUN} step={1} format={(v) => `${RUNS[Math.round(v)].id} (${RUNS[Math.round(v)].years})`} onChange={(v) => setRunIndex(Math.round(v))} />
      </div>
      <div tabIndex={0} role="img" aria-label={`Map of the mergers’ masses. Use the arrow keys to step through them by the heavier mass. ${caption}`} onKeyDown={onKeyDown}>
        <ScatterChart
          groups={(Object.keys(KIND_STYLE) as MergerKind[]).map((k) => ({
            name: KIND_NAMES[k],
            color: KIND_STYLE[k].colour,
            shape: KIND_STYLE[k].shape,
            points: plotted.filter((e) => kindOf(e) === k).map((e) => ({ x: e.m1![0], y: e.m2![0], label: e.name })),
          }))}
          xScale="log"
          yScale="log"
          xMin={RANGE[0]}
          xMax={RANGE[1]}
          yMin={RANGE[0]}
          yMax={RANGE[1]}
          xLabel="Heavier mass (M☉)"
          yLabel="Lighter mass (M☉)"
          highlight={visible && event.m1 && event.m2 ? { x: event.m1[0], y: event.m2[0], label: event.name.replace(/_\d+$/, ''), color: 'var(--text)' } : undefined}
          height={500}
          ariaLabel={`The heavier against the lighter mass of ${plotted.length} mergers, on logarithmic axes.`}
        >
          {(sx, sy) => (
            <g>
              <rect x={sx(RANGE[0])} y={sy(RANGE[1])} width={sx(RANGE[1]) - sx(RANGE[0])} height={sy(RANGE[0]) - sy(RANGE[1])} fill="transparent" onPointerDown={pickNear(sx, sy)} style={{ cursor: 'pointer' }} />
              <g pointerEvents="none">
                {/* The impossible half: the lighter can't be the heavier */}
                <path d={`M ${sx(RANGE[0])} ${sy(RANGE[0])} L ${sx(RANGE[1])} ${sy(RANGE[1])} L ${sx(RANGE[0])} ${sy(RANGE[1])} Z`} fill="var(--text-muted)" fillOpacity="0.08" />
                <text x={sx(2.5)} y={sy(45)} fontSize="11" fill="var(--text-muted)">
                  (the lighter can’t be heavier)
                </text>
                <rect x={sx(PAIR_INSTABILITY_GAP[0])} y={sy(RANGE[1])} width={sx(PAIR_INSTABILITY_GAP[1]) - sx(PAIR_INSTABILITY_GAP[0])} height={sy(RANGE[0]) - sy(RANGE[1])} fill="var(--wrong)" fillOpacity="0.1" />
                <rect x={sx(RANGE[0])} y={sy(PAIR_INSTABILITY_GAP[1])} width={sx(RANGE[1]) - sx(RANGE[0])} height={sy(PAIR_INSTABILITY_GAP[0]) - sy(PAIR_INSTABILITY_GAP[1])} fill="var(--wrong)" fillOpacity="0.07" />
                <text x={sx(Math.sqrt(PAIR_INSTABILITY_GAP[0] * PAIR_INSTABILITY_GAP[1]))} y={sy(3.4)} fontSize="11" fill="var(--wrong)" textAnchor="middle">
                  pair-instability gap
                </text>
                <rect x={sx(NEUTRON_STAR_RANGE[0])} y={sy(RANGE[1])} width={sx(NEUTRON_STAR_RANGE[1]) - sx(NEUTRON_STAR_RANGE[0])} height={sy(RANGE[0]) - sy(RANGE[1])} fill="var(--series-3)" fillOpacity="0.12" />
                <rect x={sx(RANGE[0])} y={sy(NEUTRON_STAR_RANGE[1])} width={sx(RANGE[1]) - sx(RANGE[0])} height={sy(NEUTRON_STAR_RANGE[0]) - sy(NEUTRON_STAR_RANGE[1])} fill="var(--series-3)" fillOpacity="0.12" />
                <rect x={sx(LOWER_GAP[0])} y={sy(RANGE[1])} width={sx(LOWER_GAP[1]) - sx(LOWER_GAP[0])} height={sy(RANGE[0]) - sy(RANGE[1])} fill="var(--series-3)" fillOpacity="0.05" />
                <text x={sx(1.6)} y={sy(200)} fontSize="11" fill="var(--series-3)" textAnchor="middle">
                  neutron stars
                </text>
                <text x={sx(3.4)} y={sy(14)} fontSize="10.5" fill="var(--series-3)" textAnchor="middle">
                  gap?
                </text>
                {plotted.map((e) =>
                  e.m1 && e.m2 ? (
                    <g key={e.name} stroke="var(--text-muted)" strokeOpacity="0.35" strokeWidth="1">
                      <line x1={sx(Math.max(RANGE[0], e.m1[0] + e.m1[1]))} x2={sx(Math.min(RANGE[1], e.m1[0] + e.m1[2]))} y1={sy(e.m2[0])} y2={sy(e.m2[0])} />
                      <line x1={sx(e.m1[0])} x2={sx(e.m1[0])} y1={sy(Math.max(RANGE[0], e.m2[0] + e.m2[1]))} y2={sy(Math.min(RANGE[1], e.m2[0] + e.m2[2]))} />
                    </g>
                  ) : null,
                )}
              </g>
            </g>
          )}
        </ScatterChart>
      </div>
      <div className={figureStyles.withSide}>
        <div>
          <p className={styles.panelTitle}>How heavy the heavier black hole is</p>
          <Histogram
            bins={bins}
            xMin={0}
            xMax={150}
            xLabel="Heavier mass (M☉)"
            yLabel="Mergers"
            color="var(--series-1)"
            markers={[
              { x: PAIR_INSTABILITY_GAP[0], label: 'gap', color: 'var(--wrong)', dashed: true },
              ...(event.m1 && visible ? [{ x: event.m1[0], label: event.name.replace(/_\d+$/, ''), color: 'var(--text)' }] : []),
            ]}
            height={240}
            ariaLabel={`Histogram of the heavier mass of ${plotted.length} mergers, in bins of 5 M☉: most between 10 and 40, with a peak near 35.`}
          />
        </div>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h4 className={styles.cardTitle}>{event.name}</h4>
            <span className={styles.cardSubtitle}>
              {date.text}, {event.run}
            </span>
          </div>
          {famous && <p style={{ margin: '6px 0', fontSize: '0.9rem' }}>{famous.note}</p>}
          <dl className={styles.facts}>
            {event.m1 && event.m2 ? (
              <>
                <div>
                  <dt>Masses</dt>
                  <dd>
                    {fmtInterval(event.m1)} and {fmtInterval(event.m2)} M☉{kind ? `: ${KIND_NAMES[kind]}` : ''}
                  </dd>
                </div>
                {event.mf && (
                  <div>
                    <dt>Left behind</dt>
                    <dd>
                      {fmtInterval(event.mf)} M☉{event.mf[0] < event.m1[0] + event.m2[0] ? `; ${(event.m1[0] + event.m2[0] - event.mf[0]).toFixed(1)} M☉ radiated, roughly` : ''}
                    </dd>
                  </div>
                )}
                {event.mc && (
                  <div>
                    <dt>Chirp mass</dt>
                    <dd>{fmtInterval(event.mc)} M☉</dd>
                  </div>
                )}
                {event.chi && (
                  <div>
                    <dt>Effective spin</dt>
                    <dd>{fmtInterval(event.chi)}</dd>
                  </div>
                )}
              </>
            ) : (
              <div>
                <dt>Masses</dt>
                <dd>not estimated: too faint</dd>
              </div>
            )}
            {event.d && (
              <div>
                <dt>Distance</dt>
                <dd>
                  {fmtInterval(event.d)} Mpc (about {lightYears(event.d[0])})
                </dd>
              </div>
            )}
            <div>
              <dt>Signal-to-noise</dt>
              <dd>
                {event.snr ?? 'not given'}
                {event.pastro !== undefined ? `; ${Math.round(event.pastro * 100)}% likely to be real` : ''}
              </dd>
            </div>
            <div>
              <dt>Catalogue</dt>
              <dd>{event.cat}</dd>
            </div>
          </dl>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

/** Megaparsecs as light-years in words: "130 million light-years", "1.5 billion light-years". */
function lightYears(mpc: number): string {
  const millions = mpc * 3.2616;
  return millions < 1000 ? `${Math.round(millions / 10) * 10} million light-years` : `${(millions / 1000).toFixed(1)} billion light-years`;
}

function fmtInterval([m, lo, hi]: readonly [number, number, number]): string {
  const d = Math.abs(m) >= 100 ? 0 : Math.abs(m) >= 10 ? 1 : 2;
  const f = (x: number) => x.toFixed(d).replace('-', '−');
  return `${f(m)} (${f(m + lo)} to ${f(m + hi)})`;
}

