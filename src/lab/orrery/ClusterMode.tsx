import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatScientific } from '../../core/math/scientific';
import { clusterModeCaption } from './many';
import type { ClusterConfig, ClusterInfo, ClusterMessage, ClusterSample } from '../../core/nbody/clusterHost';
import { BOUND_COLOUR, ESCAPED_COLOUR, formatMyr, formatPc, massColour, massSize } from '../../figures/crowds';
import { Legend } from '../../viz/Figure';
import { LineChart } from '../../viz/LineChart';
import { useOnScreen, useReducedMotion } from '../../viz/hooks';
import { particleScene, type ParticleOverlay, type ParticleState } from '../../viz/particles/scene';
import { useCluster } from '../../viz/particles/useCluster';
import { Scene3D } from '../../viz/scene3d/Scene3D';
import figureStyles from '../../figures/figures.module.css';
import seasonStyles from '../../figures/seasons.module.css';
import skyStyles from '../../figures/sky/sky.module.css';
import { CLUSTER_ORBIT_CHOICES, CLUSTER_STAR_CHOICES, clusterQuery, HALF_MASS_CHOICES, W0_CHOICES } from './manyLinks';
import { CLUSTER_PRESETS, findClusterPreset, type ClusterPresetId } from './manyPresets';
import styles from './Orrery.module.css';

/**
 * The Orrery's cluster mode: 100 to 2,000 stars in a Plummer sphere or a
 * King model, equal masses or Kroupa's mix, in the Galaxy's tide or alone,
 * every star pulling every other (the engine of Figure 30.1, in its worker).
 * Charts follow the radii holding 2%, 10%, 50% and 90% of the mass about the
 * dense core, the heaviest stars' radius, the bound mass or the virial ratio,
 * and the energy error.
 */

type ColourBy = 'mass' | 'bound';

const log = (x: number) => Math.log10(Math.max(x, 1e-3));

export function ClusterMode({ initial, initialPreset }: { initial: ClusterConfig; initialPreset: ClusterPresetId | null }) {
  const [config, setConfig] = useState<ClusterConfig>(initial);
  const [presetId, setPresetId] = useState<ClusterPresetId | null>(initialPreset);
  const preset = findClusterPreset(presetId);
  const [colourBy, setColourBy] = useState<ColourBy>(preset?.colourBy ?? 'mass');
  const [wantRun, setWantRun] = useState(false);
  const [info, setInfo] = useState<ClusterInfo | null>(null);
  const [frame, setFrame] = useState<{ t: number; positions: Float32Array; bound: Uint8Array } | null>(null);
  const [samples, setSamples] = useState<ClusterSample[]>([]);
  const [ended, setEnded] = useState<'dissolved' | 'limit' | null>(null);
  const [paused, setPaused] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReset, setCameraReset] = useState(0);
  const [framing, setFraming] = useState<{ view: 'cluster' | 'tails'; distance: number | null }>({ view: 'cluster', distance: null });
  const [copied, setCopied] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box, '0px');
  const reducedMotion = useReducedMotion();
  const lastShown = useRef(0);
  const stopAt = useRef<number | null>(preset?.stopAt ?? null);

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
        setPaused(null);
        lastShown.current = 0;
        return;
      }
      if (message.samples.length) setSamples((s) => [...s, ...message.samples]);
      if (message.ended) {
        setEnded(message.ended);
        setWantRun(false);
      }
      if (stopAt.current !== null && message.t >= stopAt.current) {
        setPaused(`Paused at ${formatMyr(message.t)}, about the Hyades’ age. Carry on to see what becomes of it.`);
        stopAt.current = null;
        setWantRun(false);
      }
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
    setPresetId(null);
    stopAt.current = null;
    setFraming({ view: 'cluster', distance: null });
    setCopied(null);
    setConfig((c) => ({ ...c, ...change }));
  };
  const choosePreset = (id: ClusterPresetId) => {
    const p = findClusterPreset(id)!;
    setWantRun(false);
    setPresetId(id);
    setColourBy(p.colourBy);
    stopAt.current = p.stopAt ?? null;
    setFraming({ view: 'cluster', distance: null });
    setCopied(null);
    setConfig({ ...p.config });
    setCameraReset((k) => k + 1);
  };
  const restart = () => {
    setWantRun(false);
    stopAt.current = preset?.stopAt ?? null;
    post({ type: 'load', config });
  };

  const tide = config.tide !== false;
  const king = config.model === 'king';
  const latest = samples.length ? samples[samples.length - 1] : null;
  const jacobi = info && Number.isFinite(info.jacobi) ? Math.round((latest?.jacobi ?? info.jacobi) * 20) / 20 : null;
  // The view's scale: the Jacobi radius in the tide, or a few times the starting half-mass radius alone.
  const reach = jacobi ?? 4 * (info?.halfMass ?? config.halfMass);

  const frameOn = (view: 'cluster' | 'tails') => {
    let distance: number | null = null;
    if (view === 'tails' && frame) {
      const r = Array.from({ length: frame.positions.length / 3 }, (_, i) => Math.hypot(frame.positions[3 * i], frame.positions[3 * i + 1], frame.positions[3 * i + 2])).sort((a, b) => a - b);
      distance = Math.max(5.5 * reach, 2.6 * r[Math.floor(0.9 * (r.length - 1))]);
    }
    setFraming({ view, distance });
    setCameraReset((k) => k + 1);
  };

  const looks = useMemo(() => {
    if (!info || !frame) return null;
    const n = info.masses.length;
    const colours = new Float32Array(3 * n);
    const sizes = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const m = info.masses[i];
      colours.set(colourBy === 'mass' ? massColour(m) : frame.bound[i] ? BOUND_COLOUR : ESCAPED_COLOUR, 3 * i);
      sizes[i] = colourBy === 'mass' ? massSize(m) : 3;
    }
    return { colours, sizes };
  }, [info, frame, colourBy]);

  const overlay = useMemo<ParticleOverlay>(() => {
    if (jacobi === null) return {};
    return {
      rings: [{ centre: [0, 0, 0], radius: jacobi, colour: '#7dd3fc', dashed: true }],
      markers: [
        { position: [-jacobi, 0, 0], colour: '#7dd3fc', size: 9, hollow: true },
        { position: [jacobi, 0, 0], colour: '#7dd3fc', size: 9, hollow: true },
      ],
      labels: [
        { text: 'L1', position: [-jacobi, 0, 0], priority: 50 },
        { text: 'L2', position: [jacobi, 0, 0], priority: 50 },
        { text: 'Jacobi radius', position: [0, -jacobi, 0], priority: 40 },
        { text: '← to the Galaxy’s centre', position: [-2.6 * jacobi, 0, 0], priority: 30, offset: [0, -22] },
      ],
    };
  }, [jacobi]);

  const sceneState = useMemo<ParticleState | null>(() => (frame && looks ? { positions: frame.positions, colours: looks.colours, sizes: looks.sizes, overlay } : null), [frame, looks, overlay]);

  const trh = info?.relaxation ?? 1;
  const xMax = Math.max(4, Math.ceil(((latest?.t ?? 0) / trh) * 1.1));
  const xTicks = Array.from({ length: xMax + 1 }, (_, k) => k)
    .filter((k) => xMax <= 10 || k % Math.ceil(xMax / 10) === 0)
    .map((k) => ({ value: k, label: String(k) }));
  const radiusSeries = [
    { name: '2% of the mass', color: 'var(--series-3)', points: samples.map((s) => ({ x: s.t / trh, y: log(s.core[0]) })) },
    { name: '10%', color: 'var(--series-2)', points: samples.map((s) => ({ x: s.t / trh, y: log(s.core[1]) })) },
    { name: '50%', color: 'var(--series-1)', points: samples.map((s) => ({ x: s.t / trh, y: log(s.core[2]) })) },
    { name: '90%', color: 'var(--text-muted)', points: samples.map((s) => ({ x: s.t / trh, y: log(s.core[3]) })) },
    ...(config.masses === 'kroupa' ? [{ name: 'half the heaviest tenth', color: 'var(--series-1)', dashed: true, points: samples.map((s) => ({ x: s.t / trh, y: log(s.heavy) })) }] : []),
  ];
  const allLogs = radiusSeries.flatMap((s) => s.points.map((p) => p.y));
  const yLo = Math.floor(Math.min(-1, ...allLogs));
  const yHi = Math.ceil(Math.max(1, ...allLogs));
  const yTicks = Array.from({ length: yHi - yLo + 1 }, (_, k) => yLo + k);

  const caption = info && latest ? clusterModeCaption(config, info, latest, ended) : 'Building the cluster…';
  const description = `${caption} The 3D view shows the stars${tide ? ' from above the Galaxy’s disc, in a frame that turns with the cluster’s orbit: the Galaxy’s centre is to the left and the cluster moves up the view. The dashed circle is the Jacobi radius, with L1 and L2.' : '.'}`;

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?mode=cluster&${presetId ? `preset=${presetId}` : clusterQuery(config)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(`Copied: ${url}`);
    } catch {
      setCopied(url);
    }
  };

  return (
    <div ref={box}>
      <div className={styles.presetRow}>
        <label htmlFor="orrery-cluster-preset">Start from</label>
        <select id="orrery-cluster-preset" value={presetId ?? 'custom'} onChange={(e) => findClusterPreset(e.target.value) && choosePreset(e.target.value as ClusterPresetId)}>
          {!presetId && <option value="custom">Your own cluster</option>}
          {CLUSTER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className={figureStyles.toolButton} onClick={restart} disabled={!info}>
          Start again
        </button>
      </div>
      <p className={styles.blurb}>{preset ? preset.blurb : 'Your own cluster: every star pulls every other, computed in your browser.'}</p>
      {preset && (
        <p className={styles.note}>
          <b>Try this:</b> {preset.tryThis}
        </p>
      )}

      <div className={figureStyles.toolbar}>
        <button type="button" className={figureStyles.toolButton} onClick={() => setWantRun((r) => !r)} disabled={!!ended || !info} aria-pressed={wantRun}>
          {wantRun ? '❚❚ Pause' : samples.length > 1 ? '▶ Carry on' : '▶ Run the cluster'}
        </button>
        <span className={figureStyles.segmented} role="group" aria-label="Stars">
          {CLUSTER_STAR_CHOICES.map((n) => (
            <button key={n} type="button" aria-pressed={config.n === n} onClick={() => choose({ n })}>
              {n.toLocaleString('en-GB')}
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
        <span className={figureStyles.segmented} role="group" aria-label="Starting shape">
          <button type="button" aria-pressed={!king} onClick={() => choose({ model: 'plummer' })}>
            Plummer
          </button>
          {W0_CHOICES.map((w) => (
            <button key={w} type="button" aria-pressed={king && (config.w0 ?? 6) === w} onClick={() => choose({ model: 'king', w0: w })}>
              King, W₀ = {w}
            </button>
          ))}
        </span>
        <span className={figureStyles.segmented} role="group" aria-label="The Galaxy’s tide">
          <button type="button" aria-pressed={!tide} onClick={() => choose({ tide: false })}>
            No tide
          </button>
          {CLUSTER_ORBIT_CHOICES.map((r) => (
            <button key={r} type="button" aria-pressed={tide && config.orbit === r} onClick={() => choose({ tide: true, orbit: r })}>
              {r} kpc
            </button>
          ))}
        </span>
        <span className={figureStyles.segmented} role="group" aria-label="Half-mass radius at the start">
          {HALF_MASS_CHOICES.map((r) => (
            <button key={r} type="button" aria-pressed={config.halfMass === r} disabled={king && tide} onClick={() => choose({ halfMass: r })}>
              {r} pc
            </button>
          ))}
        </span>
      </div>
      {king && tide && <p className={styles.note}>A King model in the Galaxy’s tide is made to fill its Jacobi radius, so its size follows from its mass and orbit.</p>}
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Colour the stars by">
          <button type="button" aria-pressed={colourBy === 'mass'} onClick={() => setColourBy('mass')}>
            Colour by mass
          </button>
          <button type="button" aria-pressed={colourBy === 'bound'} onClick={() => setColourBy('bound')} disabled={!tide}>
            Bound or escaped
          </button>
        </span>
        <span className={figureStyles.segmented} role="group" aria-label="Frame the view on">
          <button type="button" aria-pressed={framing.view === 'cluster'} onClick={() => frameOn('cluster')}>
            Close up
          </button>
          <button type="button" aria-pressed={framing.view === 'tails'} onClick={() => frameOn('tails')}>
            {tide ? 'Whole tails' : 'Everything'}
          </button>
        </span>
      </div>

      <Legend
        items={[
          ...(colourBy === 'mass' || !tide
            ? [
                { label: 'a star of 0.1 M☉ (small, red)', symbol: <circle r="2.5" fill="#e2603f" /> },
                { label: 'a star of 1 M☉', symbol: <circle r="4" fill="#fff1c9" stroke="#94a3b8" /> },
                { label: 'a star of 3 M☉ (large, blue-white)', symbol: <circle r="5.5" fill="#9cc8ff" /> },
              ]
            : [
                { label: 'within the Jacobi radius', symbol: <circle r="4" fill="#9cc8ff" /> },
                { label: 'escaped', symbol: <circle r="4" fill="#f59e0b" /> },
              ]),
          ...(tide ? [{ label: 'Jacobi radius, with L1 and L2', symbol: <circle r="8" fill="none" stroke="#7dd3fc" strokeDasharray="3 2" /> }] : []),
        ]}
      />
      {sceneState ? (
        <Scene3D
          key={`${config.n}-${config.masses}-${config.orbit}-${tide}-${config.model}-${config.w0}-${config.halfMass}`}
          label="3D view of the star cluster"
          description={description}
          factory={particleScene}
          state={sceneState}
          camera={{ target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: framing.view === 'tails' ? 1.5 : 1.25, distance: framing.distance ?? 5.5 * reach }}
          limits={{ minDistance: 1, maxDistance: 4000 }}
          cameraReset={cameraReset}
          height="clamp(300px, 60vw, 520px)"
          overlay={frame ? <span className={seasonStyles.sceneBadge}>{`${frame.t < 10 ? frame.t.toFixed(1) : Math.round(frame.t)} Myr · ${(frame.t / trh).toFixed(1)} relaxation times`}</span> : undefined}
        />
      ) : (
        <p className={skyStyles.hint}>{error ?? 'Building the cluster…'}</p>
      )}
      {error && sceneState && <p className={styles.error}>{error}</p>}
      {paused && <p className={styles.note} role="status">{paused}</p>}
      <p className={styles.status} aria-live="polite">
        {caption}
      </p>
      <div className={skyStyles.split}>
        <div>
          <p className={skyStyles.panelTitle}>Radii holding 2%, 10%, 50% and 90% of the mass, from the dense core</p>
          <LineChart
            series={radiusSeries}
            xLabel="Time (relaxation times)"
            yLabel="Radius (pc, log scale)"
            xMin={0}
            xMax={xMax}
            yMin={yLo}
            yMax={yHi}
            xTicks={xTicks}
            yTicks={yTicks}
            formatY={(y) => (10 ** y >= 1 ? String(Math.round(10 ** y)) : String(Number((10 ** y).toPrecision(1))))}
            height={240}
            ariaLabel={`The radii about the dense core holding 2%, 10%, 50% and 90% of the bound mass${config.masses === 'kroupa' ? ', and half the mass of the heaviest tenth,' : ''} against time, on a log scale. ${latest ? `Now ${latest.core.map((r) => formatPc(r)).join(', ')}.` : ''}`}
          />
        </div>
        <div>
          {tide ? (
            <>
              <p className={skyStyles.panelTitle}>Mass still within the Jacobi radius</p>
              <LineChart
                series={[{ name: 'share of the starting mass', color: 'var(--series-1)', points: samples.map((s) => ({ x: s.t / trh, y: s.bound * 100 })) }]}
                xLabel="Time (relaxation times)"
                yLabel="Bound (%)"
                xMin={0}
                xMax={xMax}
                yMin={0}
                yMax={100}
                xTicks={xTicks}
                formatY={(y) => `${Math.round(y)}%`}
                height={240}
                hideLegend
                ariaLabel={`The share of the cluster’s mass within the Jacobi radius against time. ${latest ? `Now ${Math.round(latest.bound * 100)}%.` : ''}`}
              />
            </>
          ) : (
            <>
              <p className={skyStyles.panelTitle}>Virial ratio: kinetic energy over minus the potential</p>
              <LineChart
                series={[{ name: 'virial ratio', color: 'var(--series-1)', points: samples.map((s) => ({ x: s.t / trh, y: s.virial })) }]}
                xLabel="Time (relaxation times)"
                yLabel="Virial ratio"
                xMin={0}
                xMax={xMax}
                yMin={0.3}
                yMax={0.7}
                xTicks={xTicks}
                markers={[]}
                baseline={0.5}
                formatY={(y) => y.toFixed(2)}
                height={240}
                hideLegend
                ariaLabel={`The virial ratio against time; ½ means the cluster is in balance. ${latest ? `Now ${latest.virial.toFixed(3)}.` : ''}`}
              />
            </>
          )}
        </div>
      </div>
      {latest && (
        <p className={styles.status}>
          <span>
            Energy error <b>{formatScientific(Math.abs(latest.energyError), 1)}</b>
          </span>
          <span>
            Virial ratio <b>{latest.virial.toFixed(3)}</b>
          </span>
          {tide && (
            <span>
              Stars within the Jacobi radius <b>{latest.boundCount.toLocaleString('en-GB')}</b>
            </span>
          )}
        </p>
      )}
      <div className={styles.buttons}>
        <button type="button" className={figureStyles.toolButton} onClick={copyLink}>
          Copy a link to this cluster
        </button>
        {copied && (
          <span className={styles.note} style={{ margin: 0, wordBreak: 'break-all' }} role="status">
            {copied}
          </span>
        )}
      </div>
      <details className={styles.box} style={{ marginTop: 12 }}>
        <summary>What’s simplified here?</summary>
        <p>
          Every star pulls every other directly, softened within a fiftieth of the half-mass radius so that no pair binds too tightly to follow,
          which also stops the core collapsing as far as a real one would. The Galaxy’s tide is Hill’s approximation for a circular orbit with a
          flat rotation curve of 230 km/s. Stars don’t age, lose mass or explode, there are no pairs of stars at the start and no gas, and the
          spiral arms and giant clouds that shake real clusters apart faster are left out. Kroupa’s mix stops at 3 M☉.
        </p>
      </details>
    </div>
  );
}
