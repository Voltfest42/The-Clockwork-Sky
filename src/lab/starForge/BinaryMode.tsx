import { useMemo, useState } from 'react';
import type { BinaryRun } from '../../core/stellar/bse/runs';
import { Slider } from '../../figures/Slider';
import { Legend } from '../../viz/Figure';
import type { DensityGrid } from '../../viz/hr/HRDiagram';
import { useBinary } from '../../viz/useStellar';
import figureStyles from '../../figures/figures.module.css';
import skyStyles from '../../figures/sky/sky.module.css';
import {
  BSE_OWN,
  eventWords,
  eventTime,
  formatAge,
  formatPeriod,
  formatSeparation,
  logStart,
  PAIR_DEFAULTS,
  PAIR_LIMITS,
  PAIR_STATE_NAMES,
  pairPhases,
  pairRequest,
  pairMass,
  pairWords,
  periodOf,
  prefersLogTime,
  rerollSeed,
  separationOf,
  stepAt,
  storyEvents,
  timeSpan,
  type ForgePair,
} from './binary';
import { OutcomeCard, OutcomeChip, PairChart, PairHR, PairStrips, PairView } from './binaryViews';
import { ALPHAS, CHARTS, INSTANTS, PAIR_FILL, PAIR_LEGEND, pairRange, pairViewEnlarged, type ChartKind } from './pairDrawing';
import { formatWind, formatZ, STAR_STYLES } from './format';
import { NumberField } from './NumberField';
import styles from './StarForge.module.css';

/**
 * The Star Forge's binaries mode: set two stars and their orbit, and the
 * uncertain physics, and BSE (in the stellar worker) runs the pair's whole
 * life at once; slide through time to watch it. Below, how much the outcome
 * depends on the common-envelope efficiency and on the kicks.
 */

/** A moment worth opening at when no preset gives one: just after the first time the stars touch, or the first change of type. */
function firstMoment(run: BinaryRun): number {
  const touch = run.events.find((e) => [3, 5, 6, 7, 11].includes(e.label));
  const change = run.events.find((e) => e.label === 2);
  const e = touch ?? change;
  return e ? e.t * 1.0001 + 1e-4 : 0;
}

const sameInput = (run: BinaryRun, p: ForgePair) => {
  const i = run.input;
  return i.m1 === p.m1 && i.m2 === p.m2 && i.period === p.period && i.ecc === p.ecc && i.z === p.z && i.alpha === p.alpha && i.sigma === p.sigma && i.wind === p.wind && i.tides === p.tides && i.seed === p.seed;
};

export function BinaryMode({
  pair,
  t,
  presetT,
  density,
  onPair,
  onTime,
}: {
  pair: ForgePair;
  t: number | null;
  presetT: number | null;
  density?: DensityGrid;
  onPair: (patch: Partial<ForgePair>, typed?: boolean) => void;
  onTime: (t: number) => void;
}) {
  const run = useBinary(pairRequest(pair));
  const pending = !run || !sameInput(run, pair);
  const [logChoice, setLogTime] = useState<boolean | null>(null);
  const logTime = logChoice ?? (run ? prefersLogTime(run) : false);
  const [orbitBy, setOrbitBy] = useState<'period' | 'separation'>('period');
  const [chart, setChart] = useState<ChartKind>('masses');
  const range = useMemo(() => pairRange(run), [run]);

  const tEnd = run ? timeSpan(run)[1] : 1;
  const tMin = logTime ? logStart(tEnd) : 0;
  const tShown = Math.min(tEnd, Math.max(tMin, t ?? presetT ?? (run ? firstMoment(run) : 0)));
  const s = run ? stepAt(run.steps, tShown) : null;
  const sep = separationOf(pair.m1, pair.m2, pair.period);
  const story = run ? storyEvents(run) : [];
  const states = useMemo(() => new Set(run ? pairPhases(run, tEnd).pair.map((x) => x.kind) : []), [run, tEnd]);
  const current = story.filter((e) => e.t <= tShown + 1e-9).at(-1);

  const caption = !run || !s ? 'Running BSE…' : `${formatAge(tShown)} after birth. ${pairWords(s)}${pairViewEnlarged(s) ? ' (Stars too small to see are drawn as dots.)' : ''}`;

  return (
    <div>
      <div className={styles.inputs}>
        <p className={styles.editing}>The pair at birth:</p>
        {(['m1', 'm2'] as const).map((key, k) => (
          <div key={key} className={styles.inputRow}>
            <Slider label={`Star ${k + 1}’s mass`} value={pair[key]} min={PAIR_LIMITS.mass[0]} max={PAIR_LIMITS.mass[1]} log step={0.005} format={pairMass} onChange={(m) => onPair({ [key]: m })} />
            <NumberField label="or type (M☉)" value={pair[key]} onCommit={(m) => onPair({ [key]: m }, true)} />
          </div>
        ))}
        <span className={figureStyles.segmented} role="group" aria-label="Set the orbit by">
          <button type="button" aria-pressed={orbitBy === 'period'} onClick={() => setOrbitBy('period')}>
            By its period
          </button>
          <button type="button" aria-pressed={orbitBy === 'separation'} onClick={() => setOrbitBy('separation')}>
            By its separation
          </button>
        </span>
        {orbitBy === 'period' ? (
          <div className={styles.inputRow}>
            <Slider label="Orbital period" value={pair.period} min={PAIR_LIMITS.period[0]} max={PAIR_LIMITS.period[1]} log step={0.005} format={(p) => `${formatPeriod(p)} (${formatSeparation(separationOf(pair.m1, pair.m2, p))} apart)`} onChange={(p) => onPair({ period: p })} />
            <NumberField label="or type (days)" value={pair.period} onCommit={(p) => onPair({ period: p }, true)} />
          </div>
        ) : (
          <div className={styles.inputRow}>
            <Slider
              label="Separation"
              value={sep}
              min={separationOf(pair.m1, pair.m2, PAIR_LIMITS.period[0])}
              max={separationOf(pair.m1, pair.m2, PAIR_LIMITS.period[1])}
              log
              step={0.005}
              format={(a) => `${formatSeparation(a)} (a period of ${formatPeriod(periodOf(pair.m1, pair.m2, a))})`}
              onChange={(a) => onPair({ period: periodOf(pair.m1, pair.m2, a) })}
            />
            <NumberField label="or type (R☉)" value={Number(sep.toPrecision(3))} onCommit={(a) => onPair({ period: periodOf(pair.m1, pair.m2, a) }, true)} />
          </div>
        )}
        <Slider label="Eccentricity" value={pair.ecc} min={PAIR_LIMITS.ecc[0]} max={PAIR_LIMITS.ecc[1]} step={0.01} format={(e) => (e === 0 ? '0 (circular)' : e.toFixed(2))} onChange={(e) => onPair({ ecc: e })} />
        <Slider label="Metallicity" value={pair.z} min={PAIR_LIMITS.z[0]} max={PAIR_LIMITS.z[1]} log step={0.005} format={formatZ} onChange={(z) => onPair({ z })} />
      </div>

      <div className={styles.inputs}>
        <p className={styles.editing}>The uncertain physics:</p>
        <Slider
          label="Common-envelope efficiency α"
          value={pair.alpha}
          min={PAIR_LIMITS.alpha[0]}
          max={PAIR_LIMITS.alpha[1]}
          log
          step={0.01}
          format={(a) => `${Number(a.toPrecision(2))}${a === BSE_OWN.alpha ? ' (BSE’s own)' : a === PAIR_DEFAULTS.alpha ? ' (the Forge’s, and most modern codes’)' : ''}`}
          onChange={(a) => onPair({ alpha: a })}
        />
        <Slider label="Supernova kicks: spread of speeds" value={pair.sigma} min={PAIR_LIMITS.sigma[0]} max={PAIR_LIMITS.sigma[1]} step={5} format={(v) => `${Math.round(v)} km/s${Math.round(v) === BSE_OWN.sigma ? ' (BSE’s own)' : v === 0 ? ' (no kicks)' : ''}`} onChange={(v) => onPair({ sigma: v })} />
        <Slider label="Winds" value={pair.wind} min={PAIR_LIMITS.wind[0]} max={PAIR_LIMITS.wind[1]} step={0.05} format={(w) => formatWind(w).replace('SSE’s own', 'BSE’s own')} onChange={(w) => onPair({ wind: w })} />
        <div className={skyStyles.toggles} role="group" aria-label="Tides">
          <span className={skyStyles.togglesLabel}>Tides</span>
          <button type="button" className={skyStyles.toggle} aria-pressed={pair.tides} onClick={() => onPair({ tides: true })}>
            On (BSE’s own)
          </button>
          <button type="button" className={skyStyles.toggle} aria-pressed={!pair.tides} onClick={() => onPair({ tides: false })}>
            Off
          </button>
        </div>
        <div className={styles.buttons} style={{ marginTop: 0 }}>
          <button type="button" className={figureStyles.toolButton} onClick={() => onPair({ seed: rerollSeed(pair.seed) })}>
            Reroll the kicks
          </button>
          <span className={styles.note} style={{ margin: 0 }}>
            Kick seed {pair.seed}
          </span>
          <button
            type="button"
            className={figureStyles.toolButton}
            disabled={pair.alpha === BSE_OWN.alpha && pair.sigma === BSE_OWN.sigma && pair.wind === BSE_OWN.wind && pair.tides}
            onClick={() => onPair({ alpha: BSE_OWN.alpha, sigma: BSE_OWN.sigma, wind: BSE_OWN.wind, tides: BSE_OWN.tides })}
          >
            Use BSE’s own switches (α = 3)
          </button>
          <button
            type="button"
            className={figureStyles.toolButton}
            disabled={pair.alpha === PAIR_DEFAULTS.alpha && pair.sigma === PAIR_DEFAULTS.sigma && pair.wind === PAIR_DEFAULTS.wind && pair.tides}
            onClick={() => onPair({ alpha: PAIR_DEFAULTS.alpha, sigma: PAIR_DEFAULTS.sigma, wind: PAIR_DEFAULTS.wind, tides: PAIR_DEFAULTS.tides })}
          >
            Use the Forge’s (α = 1)
          </button>
        </div>
      </div>

      <div className={styles.time}>
        <Slider label="Time since birth" value={tShown} min={tMin} max={tEnd} log={logTime} step={logTime ? 0.002 : tEnd / 2000} format={formatAge} onChange={onTime} />
        <div className={skyStyles.toggles} role="group" aria-label="Time runs">
          <span className={skyStyles.togglesLabel}>Time runs</span>
          <button type="button" className={skyStyles.toggle} aria-pressed={!logTime} onClick={() => setLogTime(false)}>
            Evenly
          </button>
          <button type="button" className={skyStyles.toggle} aria-pressed={logTime} onClick={() => setLogTime(true)}>
            On a log scale
          </button>
        </div>
      </div>

      <div className={styles.main}>
        <div>
          <p className={skyStyles.panelTitle}>The pair to scale, seen from above</p>
          {s ? <PairView step={s} label={caption} /> : <div className={styles.pairPlaceholder}>Running BSE…</div>}
          <Legend
            items={[
              { label: 'star 1 and star 2, numbered, in their colours', symbol: <circle r="6" fill="#ffd9a8" /> },
              { label: 'the Roche lobes', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#f59e0b" strokeWidth="2" /> },
              ...(run?.steps.some((x) => x.kw.includes(13)) ? [{ label: 'a neutron star', symbol: <circle r="4" fill="#b8c0ff" stroke="#e0e7ff" /> }] : []),
              ...(run?.steps.some((x) => x.kw.includes(14)) ? [{ label: 'a black hole', symbol: <circle r="5" fill="#000" stroke="#f59e0b" strokeWidth="1.5" /> }] : []),
            ]}
          />
          <p className={styles.caption} aria-live="polite">
            {caption}
          </p>
        </div>
        <div className={styles.panel}>
          <OutcomeCard run={run} pending={pending} />
        </div>
      </div>

      {run && s && (
        <>
          <div className={styles.below}>
            <div>
              <p className={skyStyles.panelTitle}>Both stars on the HR diagram</p>
              <PairHR run={run} step={s} t={tShown} density={density} range={range} />
              <Legend
                items={[
                  { label: 'Gaia’s stars within 100 parsecs', symbol: <rect x="-8" y="-6" width="16" height="12" fill="rgb(150,175,255)" fillOpacity="0.6" /> },
                  ...([0, 1] as const).map((k) => ({
                    label: `star ${k + 1}’s track (bold: so far)`,
                    symbol: <path d="M-10 6 L0 0 L10 -8" stroke={STAR_STYLES[k].chart} strokeWidth="2.2" strokeDasharray={STAR_STYLES[k].dash} fill="none" />,
                  })),
                ]}
              />
            </div>
            <div className={styles.box}>
              <h3>What happens (click a time to go there)</h3>
              <ol className={styles.events}>
                {story.map((e) => {
                  const i = run.events.indexOf(e);
                  return (
                    <li key={i} aria-current={e === current ? 'step' : undefined}>
                      <button type="button" className={skyStyles.toggle} aria-pressed={e === current} onClick={() => onTime(e.t)}>
                        {eventTime(e.t)}
                      </button>{' '}
                      {eventWords(e, run.events[i - 1])}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className={`${styles.section} ${styles.chartBlock}`}>
            <div className={skyStyles.toggles} role="group" aria-label="Chart shows" style={{ marginBottom: 6 }}>
              <span className={skyStyles.togglesLabel}>Chart</span>
              {CHARTS.map((c) => (
                <button key={c.id} type="button" className={skyStyles.toggle} aria-pressed={chart === c.id} onClick={() => setChart(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
            <PairChart run={run} kind={chart} t={tShown} tEnd={tEnd} log={logTime} onPick={onTime} />
            <Legend items={[{ label: 'mass transfer (a star fills its Roche lobe)', symbol: <rect x="-8" y="-6" width="16" height="12" fill="var(--accent)" fillOpacity="0.25" /> }]} />
          </div>

          <div className={styles.section}>
            <p className={skyStyles.panelTitle}>Their lives, phase by phase (click to go there)</p>
            <PairStrips run={run} t={tShown} tEnd={tEnd} log={logTime} onPick={onTime} />
            <Legend
              items={[
                ...PAIR_LEGEND.filter((k) => states.has(k)).map((k) => ({
                  label: `the pair: ${PAIR_STATE_NAMES[k]}`,
                  symbol: <rect x="-8" y="-6" width="16" height="12" fill={PAIR_FILL[k]} stroke="#1b1f2a" strokeWidth="0.5" />,
                })),
                ...(run.supernovae.some((k) => k.t <= tEnd) ? [{ label: 'a supernova', symbol: <path d="M0 -6 l4 6 l-4 6 l-4 -6 Z" fill="#b91c1c" /> }] : []),
                ...INSTANTS.filter((m) => run.events.some((e) => e.label === m.label && e.t <= tEnd)).map((m) => ({
                  label: m.name,
                  symbol: <line x1="0" y1="-7" x2="0" y2="7" stroke="#b91c1c" strokeWidth="2" strokeDasharray={m.dash} />,
                })),
              ]}
            />
          </div>

          <Sensitivity pair={pair} run={run} />
        </>
      )}
    </div>
  );
}

/** The same pair with other common-envelope efficiencies, and with other kicks: how much the outcome hangs on what nobody knows well. */
function Sensitivity({ pair, run }: { pair: ForgePair; run: BinaryRun }) {
  const kicked = run.supernovae.some((k) => k.kick > 0) || (pair.sigma > 0 && run.supernovae.some((k) => k.kw === 13));
  const seeds = useMemo(() => {
    const out = [pair.seed];
    while (out.length < 6) out.push(rerollSeed(out[out.length - 1]));
    return out;
  }, [pair.seed]);
  return (
    <div className={styles.section}>
      <p className={skyStyles.panelTitle}>Where it can be trusted</p>
      <p className={styles.note} style={{ marginTop: 0 }}>
        BSE is 2002 physics (Hurley, Tout and Pols). Whether mass transfer runs away into a common envelope, how efficiently the orbit then
        throws the envelope off, and how hard supernovae kick are the field’s biggest uncertainties; modern codes built on the same skeleton
        (COSMIC, COMPAS and others) differ in exactly these recipes. The same pair, run again:
      </p>
      <p className={styles.stripLabel}>With other common-envelope efficiencies α</p>
      <ul className={styles.chipsOutcome} aria-label="Outcomes with other common-envelope efficiencies">
        {ALPHAS.map((a) => (
          <AlphaChip key={a} pair={pair} alpha={a} current={a === pair.alpha} />
        ))}
      </ul>
      {kicked && (
        <>
          <p className={styles.stripLabel}>With other kicks (σ = {pair.sigma} km/s, six seeds)</p>
          <ul className={styles.chipsOutcome} aria-label="Outcomes with other kicks">
            {seeds.map((seed) => (
              <SeedChip key={seed} pair={pair} seed={seed} current={seed === pair.seed} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function AlphaChip({ pair, alpha, current }: { pair: ForgePair; alpha: number; current: boolean }) {
  const run = useBinary(pairRequest({ ...pair, alpha }));
  return <OutcomeChip run={run} label={`α = ${alpha}${alpha === BSE_OWN.alpha ? ' (BSE’s)' : ''}${current ? ', as set' : ''}`} current={current} />;
}

function SeedChip({ pair, seed, current }: { pair: ForgePair; seed: number; current: boolean }) {
  const run = useBinary(pairRequest({ ...pair, seed }));
  return <OutcomeChip run={run} label={`seed ${seed}${current ? ', as set' : ''}`} current={current} />;
}
