import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  HORIZON,
  LOCAL_GROUP_DEFAULTS,
  TRACK_EVERY,
  type FutureSummary,
  type FutureTrack,
  type LocalGroupConfig,
  type LocalGroupMessage,
} from '../core/galaxy/localGroupHost';
import { LOCAL_GROUP_SETS, type LocalGroupSet } from '../data/localGroup';
import { Caption, Figure } from '../viz/Figure';
import { LineChart } from '../viz/LineChart';
import { useOnScreen } from '../viz/hooks';
import { useLocalGroup } from '../viz/particles/useEngine';
import { andromedaMotion, localGroupCaption, mergedBy, oddsOf } from './collisions';
import figureStyles from './figures.module.css';
import { Slider } from './Slider';
import styles from './sky/sky.module.css';

/**
 * Will we collide? (Figure 31.2.) A thousand possible presents of the Local
 * Group, each drawn from the measured masses, distances and motions within
 * their uncertainties, followed for ten billion years in a worker (Sawala et
 * al.'s 2025 method): the share in which the Milky Way and Andromeda merge,
 * their distance in a hundred of the futures, and Andromeda's paths. The
 * reader picks the measurements, the galaxies included, and how much of each
 * uncertainty to keep.
 */

type Chart = 'distance' | 'paths';

const MERGED = 'var(--series-2)';
const APART = 'var(--series-1)';

export function LocalGroupFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [config, setConfig] = useState<LocalGroupConfig>(LOCAL_GROUP_DEFAULTS);
  const [chart, setChart] = useState<Chart>('distance');
  const [futures, setFutures] = useState<FutureSummary[]>([]);
  const [tracks, setTracks] = useState<FutureTrack[]>([]);
  const [finished, setFinished] = useState(false);
  const [shown, setShown] = useState<LocalGroupConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box, '200px');
  const job = useRef(0);
  /** The configuration last sent; the first is sent once the figure comes near the screen. */
  const posted = useRef<LocalGroupConfig | null>(null);

  const onMessage = useCallback((message: LocalGroupMessage) => {
    if (message.type === 'error') {
      setError(message.message);
      return;
    }
    // Answers to an older request are dropped
    if (message.job < job.current) return;
    if (message.job > job.current) {
      job.current = message.job;
      setFutures([]);
      setTracks([]);
    }
    setShown(message.config);
    setFutures((f) => [...f, ...message.futures]);
    if (message.tracks.length) setTracks((t) => [...t, ...message.tracks]);
    setFinished(message.finished);
  }, []);
  const post = useLocalGroup(onMessage);

  useEffect(() => {
    if ((!onScreen && posted.current === null) || posted.current === config) return;
    const timer = setTimeout(() => {
      posted.current = config;
      post({ type: 'run', config });
    }, 150);
    return () => clearTimeout(timer);
  }, [config, onScreen, post]);

  const change = (next: Partial<LocalGroupConfig>) => setConfig((c) => ({ ...c, ...next }));
  const narrow = (key: keyof LocalGroupConfig['narrowing'], value: number) => setConfig((c) => ({ ...c, narrowing: { ...c.narrowing, [key]: value } }));
  const reset = () => {
    setConfig({ ...LOCAL_GROUP_DEFAULTS });
    setChart('distance');
  };

  const odds = useMemo(() => oddsOf(futures), [futures]);
  const current = shown ?? config;
  const caption = error ?? localGroupCaption(current, odds, finished);
  const motion = useMemo(() => andromedaMotion(config.set), [config.set]);
  const curve = mergedBy(odds.times, odds.n);

  return (
    <Figure
      number={number}
      title="Will we collide?"
      description="A thousand possible futures of the Local Group, computed in the reader’s browser: the Milky Way, Andromeda, M33 and the Large Magellanic Cloud as dark halos that pull on each other and drag through each other, starting from their measured masses, distances and motions, each drawn within its uncertainty. The figure shows the share of futures in which the Milky Way and Andromeda merge within ten billion years, their distance apart in a hundred of the futures, and Andromeda’s paths. The measurements, the galaxies included and the uncertainties can be changed."
      height={700}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a future in which they merge within 10 billion years (dot: the merger)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke={MERGED} strokeWidth="2" /> },
        { label: 'a future in which they don’t', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke={APART} strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          Sawala and colleagues’ method (2025), from their paper and code: each galaxy is a dark halo of the standard (NFW) shape, which pull on
          each other as points softened over 20 kpc; dynamical friction is Chandrasekhar’s formula applied to the lighter galaxy of each pair
          inside the heavier one’s halo, and two galaxies closer than 20 kpc count as merged. Every measured value is drawn from a bell curve
          cut off at two standard deviations. The galaxies’ stars and gas, their spin and shapes, the Small Magellanic Cloud and the Local Group’s
          hundred smaller galaxies are left out, and the expansion of the universe, which barely matters at these distances, too. The steps are
          two million years long.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Measurements">
            {(Object.keys(LOCAL_GROUP_SETS) as LocalGroupSet[]).map((s) => (
              <button key={s} type="button" aria-pressed={config.set === s} onClick={() => change({ set: s })}>
                {LOCAL_GROUP_SETS[s].label}
              </button>
            ))}
          </span>
          <span className={styles.togglesLabel}>Include:</span>
          <button type="button" className={styles.toggle} aria-pressed={config.include.M33} onClick={() => change({ include: { ...config.include, M33: !config.include.M33 } })}>
            M33
          </button>
          <button type="button" className={styles.toggle} aria-pressed={config.include.LMC} onClick={() => change({ include: { ...config.include, LMC: !config.include.LMC } })}>
            The Large Magellanic Cloud
          </button>
          <button type="button" className={styles.toggle} aria-pressed={config.friction} onClick={() => change({ friction: !config.friction })}>
            Dynamical friction
          </button>
        </div>
        <p className={styles.hint}>
          Andromeda’s proper motion from {LOCAL_GROUP_SETS[config.set].motion}: at the most likely values it is {Math.round(motion.distance)} kpc from the
          Milky Way’s centre, coming closer at {Math.round(-motion.radial)} km/s and moving sideways at {Math.round(motion.tangential)} km/s.
        </p>
        <div className={styles.controls}>
          <Slider
            label="Uncertainty in Andromeda’s sideways motion"
            value={config.narrowing.m31Motion}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}% of today’s`}
            onChange={(v) => narrow('m31Motion', Math.round(v * 20) / 20)}
          />
          <Slider label="Uncertainty in the masses" value={config.narrowing.masses} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}% of today’s`} onChange={(v) => narrow('masses', Math.round(v * 20) / 20)} />
          <Slider label="Every other uncertainty" value={config.narrowing.rest} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}% of today’s`} onChange={(v) => narrow('rest', Math.round(v * 20) / 20)} />
        </div>
        <p className={styles.readout} aria-live="off">
          <span>
            Merge within 10 billion years: <b>{odds.n ? `${Math.round(odds.share * 100)}%` : '…'}</b>
          </span>
          <span>
            within 5 billion: <b>{odds.n ? `${Math.round(odds.within5 * 100)}%` : '…'}</b>
          </span>
          <span>
            futures: <b>{odds.n.toLocaleString('en-GB')}</b> of {config.count.toLocaleString('en-GB')}
          </span>
        </p>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Chart">
            <button type="button" aria-pressed={chart === 'distance'} onClick={() => setChart('distance')}>
              Distance against time
            </button>
            <button type="button" aria-pressed={chart === 'paths'} onClick={() => setChart('paths')}>
              Andromeda’s paths
            </button>
          </span>
        </div>
        <div className={styles.split}>
          <div>
            <p className={styles.panelTitle}>{chart === 'distance' ? `The Milky Way to Andromeda in ${Math.min(tracks.length, 100)} futures` : 'Andromeda’s paths round the Milky Way, seen from above their orbit'}</p>
            {chart === 'distance' ? <DistanceFan tracks={tracks} /> : <PathFan tracks={tracks} />}
          </div>
          <div>
            <p className={styles.panelTitle}>Futures merged by each time</p>
            <LineChart
              series={[{ name: 'merged so far', color: MERGED, points: curve }]}
              xLabel="Billion years from now"
              yLabel="Merged (%)"
              xMin={0}
              xMax={10}
              yMin={0}
              yMax={100}
              formatY={(y) => `${Math.round(y)}%`}
              height={300}
              hideLegend
              ariaLabel={`The share of the futures in which the Milky Way and Andromeda have merged, against time. After 5 billion years ${Math.round(odds.within5 * 100)}%, after 10 billion ${Math.round(odds.share * 100)}%.`}
            />
          </div>
        </div>
        <Caption>{caption}</Caption>
      </div>
    </Figure>
  );
}

const W = 520;
const H = 300;
const PAD = { left: 52, right: 14, top: 12, bottom: 40 };

/** The Milky Way–Andromeda distance against time, one line per future. */
function DistanceFan({ tracks }: { tracks: readonly FutureTrack[] }) {
  const top = Math.max(1000, Math.ceil(Math.max(0, ...tracks.flatMap((t) => Array.from(t.distances).filter(Number.isFinite))) / 200) * 200);
  const sx = (t: number) => PAD.left + (t / HORIZON) * (W - PAD.left - PAD.right);
  const sy = (d: number) => H - PAD.bottom - (d / top) * (H - PAD.top - PAD.bottom);
  const merged = tracks.filter((t) => t.merger !== null).length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`The distance from the Milky Way to Andromeda against time in ${tracks.length} futures: ${merged} merge within 10 billion years, falling to 20 kpc, and the rest swing past and stay apart.`}>
      {Array.from({ length: top / 200 + 1 }, (_, k) => k * 200).map((d) => (
        <g key={d}>
          <line x1={PAD.left} x2={W - PAD.right} y1={sy(d)} y2={sy(d)} stroke="var(--border)" strokeWidth="0.6" />
          <text x={PAD.left - 6} y={sy(d) + 4} fontSize="11" textAnchor="end" fill="var(--text-muted)">
            {d}
          </text>
        </g>
      ))}
      {[0, 2, 4, 6, 8, 10].map((g) => (
        <text key={g} x={sx(g * 1000)} y={H - PAD.bottom + 16} fontSize="11" textAnchor="middle" fill="var(--text-muted)">
          {g}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 6} fontSize="11" textAnchor="middle" fill="var(--text-muted)">
        Billion years from now
      </text>
      <text x={12} y={(PAD.top + H - PAD.bottom) / 2} fontSize="11" textAnchor="middle" fill="var(--text-muted)" transform={`rotate(-90 12 ${(PAD.top + H - PAD.bottom) / 2})`}>
        Distance (kpc)
      </text>
      {tracks.map((t) => {
        let d = '';
        for (let k = 0; k < t.distances.length; k++) {
          const v = t.distances[k];
          if (!Number.isFinite(v)) break;
          d += `${d ? 'L' : 'M'}${sx(k * TRACK_EVERY).toFixed(1)} ${sy(v).toFixed(1)}`;
        }
        if (t.merger !== null) d += `L${sx(t.merger).toFixed(1)} ${sy(20).toFixed(1)}`;
        return <path key={t.index} d={d} fill="none" stroke={t.merger !== null ? MERGED : APART} strokeOpacity="0.45" strokeWidth="1" />;
      })}
      {tracks.map((t) => (t.merger !== null ? <circle key={`m${t.index}`} cx={sx(t.merger)} cy={sy(20)} r="2.2" fill={MERGED} /> : null))}
    </svg>
  );
}

/** Andromeda's path about the Milky Way in the plane of their orbit today, one line per future. */
function PathFan({ tracks }: { tracks: readonly FutureTrack[] }) {
  const S = 300;
  let reach = 800;
  for (const t of tracks) for (let k = 0; k < t.path.length; k += 3) if (Number.isFinite(t.path[k])) reach = Math.max(reach, Math.abs(t.path[k]), Math.abs(t.path[k + 1]));
  const half = Math.ceil(reach / 200) * 200;
  const s = (v: number) => S / 2 + (v / half) * (S / 2 - 8);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth: 420, display: 'block', margin: '0 auto' }} role="img" aria-label="Andromeda’s paths round the Milky Way in a hundred futures, seen from above the plane of their orbit today: it starts on the right and falls inwards; some paths spiral into the middle, others swing past and out again.">
      <line x1={8} x2={S - 8} y1={S / 2} y2={S / 2} stroke="var(--border)" strokeWidth="0.6" />
      <line y1={8} y2={S - 8} x1={S / 2} x2={S / 2} stroke="var(--border)" strokeWidth="0.6" />
      {tracks.map((t) => {
        let d = '';
        for (let k = 0; k < t.path.length; k += 3) {
          const x = t.path[k];
          if (!Number.isFinite(x)) break;
          d += `${d ? 'L' : 'M'}${s(x).toFixed(1)} ${s(-t.path[k + 1]).toFixed(1)}`;
        }
        return <path key={t.index} d={d} fill="none" stroke={t.merger !== null ? MERGED : APART} strokeOpacity="0.4" strokeWidth="0.9" />;
      })}
      <circle cx={s(765)} cy={S / 2} r="3" fill="var(--text)" />
      <text x={s(765)} y={S / 2 + 14} fontSize="10" textAnchor="end" fill="var(--text)">
        Andromeda now
      </text>
      <circle cx={S / 2} cy={S / 2} r="4" fill="var(--text)" />
      <text x={S / 2 + 6} y={S / 2 - 6} fontSize="10" fill="var(--text)">
        Milky Way
      </text>
      <text x={8} y={S - 10} fontSize="10" fill="var(--text-muted)">
        {half * 2} kpc across
      </text>
    </svg>
  );
}
