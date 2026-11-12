import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CLUSTER_DEFAULTS, type ClusterConfig, type ClusterInfo, type ClusterMessage, type ClusterSample } from '../core/nbody/clusterHost';
import { Caption, Figure } from '../viz/Figure';
import { LineChart } from '../viz/LineChart';
import { useOnScreen, useReducedMotion } from '../viz/hooks';
import { particleScene, type ParticleOverlay, type ParticleState } from '../viz/particles/scene';
import { useCluster } from '../viz/particles/useCluster';
import { Scene3D } from '../viz/scene3d/Scene3D';
import { BOUND_COLOUR, CLUSTER_ORBITS, clusterCaption, ESCAPED_COLOUR, massColour, massSize, STAR_COUNTS } from './crowds';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * A cluster evaporates (Figure 30.1): 500 to 2,000 stars in a Plummer sphere,
 * every star pulling every other (Hermite with block steps, in a worker), in
 * the Galaxy's tide. Stars that gain enough energy cross the Jacobi radius
 * and drift off through L1 and L2 into two tails; heavy stars sink to the
 * middle. The charts follow the bound mass and the cluster's size in
 * relaxation times, and the energy error says how well the arithmetic holds.
 */

type ColourBy = 'mass' | 'bound';

export function ClusterFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [config, setConfig] = useState<ClusterConfig>(CLUSTER_DEFAULTS);
  const [colourBy, setColourBy] = useState<ColourBy>('mass');
  const [wantRun, setWantRun] = useState(false);
  const [info, setInfo] = useState<ClusterInfo | null>(null);
  const [frame, setFrame] = useState<{ t: number; positions: Float32Array; bound: Uint8Array } | null>(null);
  const [samples, setSamples] = useState<ClusterSample[]>([]);
  const [ended, setEnded] = useState<'dissolved' | 'limit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReset, setCameraReset] = useState(0);
  // The camera's distance: close up on the cluster, or out far enough for the tails
  const [framing, setFraming] = useState<{ view: 'cluster' | 'tails'; distance: number | null }>({ view: 'cluster', distance: null });
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box, '0px');
  const reducedMotion = useReducedMotion();
  const lastShown = useRef(0);

  const onMessage = useCallback(
    (message: ClusterMessage) => {
      if (message.type === 'error') {
        setError(message.message);
        setWantRun(false);
        return;
      }
      if (message.type === 'loaded') {
        setInfo(message);
        setSamples([]);
        setEnded(null);
        setError(null);
        lastShown.current = 0;
        return;
      }
      if (message.samples.length) setSamples((s) => [...s, ...message.samples]);
      if (message.ended) {
        setEnded(message.ended);
        setWantRun(false);
      }
      // With reduced motion, the stars jump once a second rather than gliding
      const now = performance.now();
      if (reducedMotion && message.running && now - lastShown.current < 1000) return;
      lastShown.current = now;
      setFrame({ t: message.t, positions: message.positions, bound: message.bound });
    },
    [reducedMotion],
  );
  const post = useCluster(onMessage);

  useEffect(() => {
    post({ type: 'load', config });
  }, [config, post]);

  const running = wantRun && onScreen && !ended;
  useEffect(() => {
    post(running ? { type: 'run' } : { type: 'pause' });
  }, [running, post]);

  const choose = (change: Partial<ClusterConfig>) => {
    setWantRun(false);
    setFraming({ view: 'cluster', distance: null });
    setConfig((c) => ({ ...c, ...change }));
  };
  const reset = () => {
    setWantRun(false);
    setColourBy('mass');
    setFraming({ view: 'cluster', distance: null });
    setConfig({ ...CLUSTER_DEFAULTS });
    setCameraReset((k) => k + 1);
  };
  const frameOn = (view: 'cluster' | 'tails') => {
    // Out to where nine stars in ten are, but never closer than the close-up
    let distance: number | null = null;
    if (view === 'tails' && frame && info) {
      const r = Array.from({ length: frame.positions.length / 3 }, (_, i) => Math.hypot(frame.positions[3 * i], frame.positions[3 * i + 1], frame.positions[3 * i + 2])).sort((a, b) => a - b);
      distance = Math.max(5.5 * info.jacobi, 2.6 * r[Math.floor(0.9 * (r.length - 1))]);
    }
    setFraming({ view, distance });
    setCameraReset((k) => k + 1);
  };

  const latest = samples.length ? samples[samples.length - 1] : null;
  // The ring is redrawn only when the Jacobi radius changes by a few per cent
  const jacobi = Math.round((latest?.jacobi ?? info?.jacobi ?? 10) * 20) / 20;

  // Colours and sizes, per star
  const looks = useMemo(() => {
    if (!info || !frame) return null;
    const n = info.masses.length;
    const colours = new Float32Array(3 * n);
    const sizes = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const m = info.masses[i];
      const c = colourBy === 'mass' ? massColour(m) : frame.bound[i] ? BOUND_COLOUR : ESCAPED_COLOUR;
      colours.set(c, 3 * i);
      sizes[i] = colourBy === 'mass' ? massSize(m) : 3;
    }
    return { colours, sizes };
  }, [info, frame, colourBy]);

  const overlay = useMemo<ParticleOverlay>(
    () => ({
      rings: [{ centre: [0, 0, 0], radius: jacobi, colour: '#7dd3fc', dashed: true }],
      markers: [
        { position: [-jacobi, 0, 0], colour: '#7dd3fc', size: 9, hollow: true },
        { position: [jacobi, 0, 0], colour: '#7dd3fc', size: 9, hollow: true },
      ],
      lines: [
        { points: [[-1.15 * jacobi, 0, 0], [-2.6 * jacobi, 0, 0]], colour: '#64748b' },
        { points: [[0, 1.15 * jacobi, 0], [0, 2.6 * jacobi, 0]], colour: '#64748b' },
      ],
      labels: [
        { text: 'L1', position: [-jacobi, 0, 0], priority: 50 },
        { text: 'L2', position: [jacobi, 0, 0], priority: 50 },
        { text: 'Jacobi radius', position: [0, -jacobi, 0], priority: 40 },
        { text: '← to the Galaxy’s centre', position: [-2.6 * jacobi, 0, 0], priority: 30, offset: [0, -22] },
        { text: 'direction of orbit ↑', position: [0, 2.6 * jacobi, 0], priority: 30 },
      ],
    }),
    [jacobi],
  );

  const sceneState = useMemo<ParticleState | null>(
    () => (frame && looks ? { positions: frame.positions, colours: looks.colours, sizes: looks.sizes, overlay } : null),
    [frame, looks, overlay],
  );

  const trh = info?.relaxation ?? 1;
  const xMax = Math.max(4, Math.ceil(((latest?.t ?? 0) / trh) * 1.1));
  const xTicks = Array.from({ length: xMax + 1 }, (_, k) => k).filter((k) => xMax <= 10 || k % Math.ceil(xMax / 10) === 0).map((k) => ({ value: k, label: String(k) }));
  const boundSeries = samples.map((s) => ({ x: s.t / trh, y: s.bound * 100 }));
  const radiusSeries = samples.map((s) => ({ x: s.t / trh, y: s.lagrangian[1] }));
  const heavySeries = samples.map((s) => ({ x: s.t / trh, y: s.heavy }));
  const radiusMax = Math.max(2, ...samples.map((s) => Math.max(s.lagrangian[1], s.heavy))) * 1.15;

  const caption = info && latest ? clusterCaption(config, info, latest, ended) : 'Building the cluster…';
  const description = `${caption} The 3D view shows the stars from above the Galaxy’s disc, in a frame that turns with the cluster’s orbit: the Galaxy’s centre is to the left and the cluster moves up the view. The dashed circle is the Jacobi radius, with L1 and L2 where it crosses the line to the centre.`;

  return (
    <Figure
      number={number}
      title="A cluster evaporates"
      description="A star cluster of 500 to 2,000 stars in the Galaxy’s tide, every star pulling every other, computed in the reader’s browser. Stars that gain energy in close passes cross the Jacobi radius, where the Galaxy’s pull wins, and drift away through the two Lagrange points into a leading and a trailing tail; the heavy stars sink to the middle. Charts follow the share of the mass still bound and the cluster’s size, in relaxation times."
      height={1180}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        ...(colourBy === 'mass'
          ? [
              { label: 'a star of 0.1 M☉ (small, red)', symbol: <circle r="2.5" fill="#e2603f" /> },
              { label: 'a star of 1 M☉', symbol: <circle r="4" fill="#fff1c9" stroke="#94a3b8" /> },
              { label: 'a star of 3 M☉ (large, blue-white)', symbol: <circle r="5.5" fill="#9cc8ff" /> },
            ]
          : [
              { label: 'within the Jacobi radius', symbol: <circle r="4" fill="#9cc8ff" /> },
              { label: 'escaped', symbol: <circle r="4" fill="#f59e0b" /> },
            ]),
        { label: 'Jacobi radius, with L1 and L2', symbol: <circle r="8" fill="none" stroke="#7dd3fc" strokeDasharray="3 2" /> },
      ]}
      simplified={
        <p>
          Every star pulls every other directly, softened within {info ? formatSoft(info.softening) : 'a few hundredths of a parsec'} so that no
          pair binds too tightly to follow (which slows relaxation a little). The Galaxy’s tide is Hill’s approximation for a circular orbit, with a
          flat rotation curve of 230 km/s and the disc’s pull out of the plane. Stars don’t age, lose mass or explode, there are no pairs of stars
          at the start and no gas, and the Galaxy’s spiral arms and giant clouds, which shake real clusters apart faster, are left out. Kroupa’s
          mix stops at 3 M☉, the heaviest stars left in a cluster a few hundred million years old.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} onClick={() => setWantRun((r) => !r)} disabled={!!ended || !info} aria-pressed={wantRun}>
            {wantRun ? 'Pause' : samples.length > 1 ? 'Carry on' : 'Run the cluster'}
          </button>
          <span className={figureStyles.segmented} role="group" aria-label="Stars">
            {STAR_COUNTS.map((n) => (
              <button key={n} type="button" aria-pressed={config.n === n} onClick={() => choose({ n })}>
                {n.toLocaleString('en-GB')} stars
              </button>
            ))}
          </span>
          <span className={figureStyles.segmented} role="group" aria-label="Masses">
            <button type="button" aria-pressed={config.masses === 'kroupa'} onClick={() => choose({ masses: 'kroupa' })}>
              Kroupa’s mix
            </button>
            <button type="button" aria-pressed={config.masses === 'equal'} onClick={() => choose({ masses: 'equal' })}>
              All equal
            </button>
          </span>
        </div>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Orbit in the Galaxy">
            {CLUSTER_ORBITS.map((o) => (
              <button key={o.radius} type="button" aria-pressed={config.orbit === o.radius} onClick={() => choose({ orbit: o.radius })}>
                {o.label}
              </button>
            ))}
          </span>
          <span className={figureStyles.segmented} role="group" aria-label="Colour the stars by">
            <button type="button" aria-pressed={colourBy === 'mass'} onClick={() => setColourBy('mass')}>
              Colour by mass
            </button>
            <button type="button" aria-pressed={colourBy === 'bound'} onClick={() => setColourBy('bound')}>
              Bound or escaped
            </button>
          </span>
          <span className={figureStyles.segmented} role="group" aria-label="Frame the view on">
            <button type="button" aria-pressed={framing.view === 'cluster'} onClick={() => frameOn('cluster')}>
              Close up
            </button>
            <button type="button" aria-pressed={framing.view === 'tails'} onClick={() => frameOn('tails')}>
              Whole tails
            </button>
          </span>
        </div>
        {sceneState ? (
          <Scene3D
            key={`${config.n}-${config.masses}-${config.orbit}`}
            label="3D view of the star cluster"
            description={description}
            factory={particleScene}
            state={sceneState}
            camera={{ target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: framing.view === 'tails' ? 1.5 : 1.25, distance: framing.distance ?? 5.5 * (info?.jacobi ?? 10) }}
            limits={{ minDistance: 1, maxDistance: 4000 }}
            cameraReset={cameraReset}
            overlay={frame ? <span className={seasonStyles.sceneBadge}>{formatClock(frame.t, trh)}</span> : undefined}
          />
        ) : (
          <p className={styles.hint}>{error ?? 'Building the cluster…'}</p>
        )}
        {error && sceneState && <p className={styles.hint}>{error}</p>}
        <div className={styles.split}>
          <div>
            <p className={styles.panelTitle}>Mass still within the Jacobi radius</p>
            <LineChart
              series={[{ name: 'share of the starting mass', color: 'var(--series-1)', points: boundSeries }]}
              xLabel="Time (relaxation times)"
              yLabel="Bound (%)"
              xMin={0}
              xMax={xMax}
              yMin={0}
              yMax={100}
              xTicks={xTicks}
              formatY={(y) => `${Math.round(y)}%`}
              height={220}
              hideLegend
              ariaLabel={`The share of the cluster’s mass still within the Jacobi radius against time, in relaxation times. ${latest ? `Now ${Math.round(latest.bound * 100)}%.` : ''}`}
            />
          </div>
          <div>
            <p className={styles.panelTitle}>Half-mass radius: the whole cluster and its heaviest tenth</p>
            <LineChart
              series={[
                { name: 'all bound stars', color: 'var(--series-1)', points: radiusSeries },
                ...(config.masses === 'kroupa' ? [{ name: 'the heaviest tenth', color: 'var(--series-2)', dashed: true, points: heavySeries }] : []),
              ]}
              xLabel="Time (relaxation times)"
              yLabel="Radius (pc)"
              xMin={0}
              xMax={xMax}
              yMin={0}
              yMax={radiusMax}
              xTicks={xTicks}
              formatY={(y) => y.toFixed(1)}
              height={220}
              ariaLabel={`The half-mass radius of the bound stars${config.masses === 'kroupa' ? ' and of the heaviest tenth of them' : ''} against time. ${latest ? `Now ${latest.lagrangian[1].toFixed(2)} pc${config.masses === 'kroupa' ? ` and ${latest.heavy.toFixed(2)} pc` : ''}.` : ''}`}
            />
          </div>
        </div>
        <Caption>{caption}</Caption>
      </div>
    </Figure>
  );
}

function formatClock(t: number, trh: number): string {
  return `${t < 10 ? t.toFixed(1) : Math.round(t)} Myr · ${(t / trh).toFixed(1)} relaxation times`;
}

function formatSoft(pc: number): string {
  return `${(pc * 206_265).toLocaleString('en-GB', { maximumSignificantDigits: 2 })} AU`;
}
