import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COLLISION_PRESETS,
  STAR_CHOICES,
  type CollisionConfig,
  type CollisionInfo,
  type CollisionMessage,
  type CollisionPreset,
  type CollisionSample,
  type DiscSetting,
} from '../../core/nbody/collisionHost';
import { collisionCaption, COMPANION_COLOUR, fateShares, formatWhen, MAIN_COLOUR, presetOf, PRESET_INFO, radiusColour, SPEEDS } from '../../figures/collisions';
import { Slider } from '../../figures/Slider';
import { Legend } from '../../viz/Figure';
import { LineChart } from '../../viz/LineChart';
import { useOnScreen, useReducedMotion } from '../../viz/hooks';
import { rgb } from '../../viz/particles/colour';
import { particleScene, type ParticleState } from '../../viz/particles/scene';
import { useCollision } from '../../viz/particles/useEngine';
import type { OrbitCameraState } from '../../viz/scene3d/orbitCamera';
import { Scene3D } from '../../viz/scene3d/Scene3D';
import figureStyles from '../../figures/figures.module.css';
import seasonStyles from '../../figures/seasons.module.css';
import skyStyles from '../../figures/sky/sky.module.css';
import { collisionQuery } from './manyLinks';
import { GALAXY_PRESETS } from './manyPresets';
import styles from './Orrery.module.css';

/**
 * The Orrery's galaxy mode: two disc galaxies of up to 100,000 test stars
 * meeting, by Toomre's restricted method with dynamical friction (the engine
 * of Figure 31.1, in its worker). Figure 31.1's encounters and a sketch of
 * the Milky Way meeting Andromeda; every setting can be changed, and the run
 * shared as a link.
 */

type ColourBy = 'galaxy' | 'radius';
type View = 'above' | 'edge';

const VIEWS: Record<View, { label: string; camera: OrbitCameraState }> = {
  above: { label: 'Above the orbit', camera: { target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: 1.45, distance: 230 } },
  edge: { label: 'In the orbit’s plane', camera: { target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: 0.04, distance: 230 } },
};

export function GalaxyMode({ initial }: { initial: CollisionConfig }) {
  const [config, setConfig] = useState<CollisionConfig>(initial);
  const [colourBy, setColourBy] = useState<ColourBy>('galaxy');
  const [view, setView] = useState<View>('above');
  const [speed, setSpeed] = useState<number>(SPEEDS[1].rate);
  const [wantRun, setWantRun] = useState(false);
  const [info, setInfo] = useState<CollisionInfo | null>(null);
  const [frame, setFrame] = useState<{ t: number; positions: Float32Array; centres: number[]; merged: number | null; closest: number; ended: boolean } | null>(null);
  const [samples, setSamples] = useState<CollisionSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraReset, setCameraReset] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box, '0px');
  const reducedMotion = useReducedMotion();
  const lastShown = useRef(0);

  const onMessage = useCallback(
    (message: CollisionMessage) => {
      if (message.type === 'error') {
        setError(message.message);
        setWantRun(false);
        return;
      }
      if (message.type === 'loaded') {
        setInfo(message);
        setSamples([]);
        setError(null);
        lastShown.current = 0;
        return;
      }
      if (message.samples.length) setSamples((s) => [...s, ...message.samples]);
      if (message.ended) setWantRun(false);
      const now = performance.now();
      if (reducedMotion && message.running && now - lastShown.current < 500) return;
      lastShown.current = now;
      setFrame({ t: message.t, positions: message.positions, centres: message.centres, merged: message.merged, closest: message.closest, ended: message.ended });
    },
    [reducedMotion],
  );
  const post = useCollision(onMessage);

  useEffect(() => {
    const timer = setTimeout(() => post({ type: 'load', config }), 120);
    return () => clearTimeout(timer);
  }, [config, post]);

  const running = wantRun && onScreen && !frame?.ended;
  useEffect(() => {
    post(running ? { type: 'run', rate: speed } : { type: 'pause' });
  }, [running, speed, post]);

  const change = (next: Partial<CollisionConfig>) => {
    setWantRun(false);
    setCopied(null);
    setConfig((c) => ({ ...c, ...next }));
  };
  const choosePreset = (p: CollisionPreset) => {
    setWantRun(false);
    setCopied(null);
    setConfig((c) => ({ ...COLLISION_PRESETS[p], stars: c.stars, seed: c.seed }));
    setCameraReset((k) => k + 1);
  };
  const changeDisc = (which: 'main' | 'companion', next: Partial<DiscSetting>) => {
    setWantRun(false);
    setCopied(null);
    setConfig((c) => {
      const d = c[which];
      return d ? { ...c, [which]: { ...d, ...next } } : c;
    });
  };
  const restart = () => {
    setWantRun(false);
    post({ type: 'load', config });
  };
  const chooseView = (v: View) => {
    setView(v);
    setCameraReset((k) => k + 1);
  };

  const looks = useMemo(() => {
    if (!info) return null;
    const n = info.owner.length;
    const colours = new Float32Array(3 * (n + 2));
    const sizes = new Float32Array(n + 2);
    const main = rgb(MAIN_COLOUR);
    const companion = rgb(COMPANION_COLOUR);
    const size = n > 60_000 ? 1.6 : n > 30_000 ? 1.9 : 2.3;
    for (let i = 0; i < n; i++) {
      const k = info.owner[i];
      const outer = info.galaxies[k].disc?.outer ?? 20;
      colours.set(colourBy === 'galaxy' ? (k === 0 ? main : companion) : radiusColour(info.startRadius[i], outer), 3 * i);
      sizes[i] = size;
    }
    colours.set([1, 1, 1], 3 * n);
    colours.set([1, 1, 1], 3 * n + 3);
    sizes[n] = 6;
    sizes[n + 1] = 6;
    return { colours, sizes };
  }, [info, colourBy]);

  const sceneState = useMemo<ParticleState | null>(() => {
    if (!frame || !looks || !info || frame.positions.length !== 3 * info.owner.length) return null;
    const positions = new Float32Array(frame.positions.length + 6);
    positions.set(frame.positions);
    positions.set(frame.centres, frame.positions.length);
    const n = info.owner.length;
    return { positions, colours: looks.colours, sizes: looks.sizes, additive: true, opacity: Math.min(0.55, Math.max(0.2, 0.45 * Math.sqrt(20_000 / n))) };
  }, [frame, looks, info]);

  const latest = samples.length ? samples[samples.length - 1] : null;
  const caption = info && latest && frame ? collisionCaption(config, info, latest, frame.merged, frame.closest) : 'Setting up the galaxies…';
  const preset = presetOf(config);
  const milkyWay = config.preset === 'milky-way';
  const names = milkyWay ? { main: 'Andromeda', companion: 'the Milky Way' } : { main: 'the main galaxy', companion: 'the companion' };

  const tMin = info ? Math.floor(info.start / 100) * 100 : -300;
  const tMax = info ? info.end : 1500;
  const separation = samples.map((s) => ({ x: s.t, y: s.separation }));
  const sepMax = Math.max(80, ...samples.map((s) => s.separation)) * 1.1;
  const loose = samples.map((s) => ({ x: s.t, y: 100 * fateShares(s).loose }));
  const taken = samples.map((s) => ({ x: s.t, y: 100 * fateShares(s).taken }));
  const fateMax = Math.max(10, ...loose.map((p) => p.y), ...taken.map((p) => p.y)) * 1.15;
  const step = tMax - tMin > 1500 ? 500 : 250;
  const xTicks: { value: number; label: string }[] = [];
  for (let t = Math.ceil(tMin / step) * step; t <= tMax; t += step) xTicks.push({ value: t, label: String(t) });
  const markers = [{ x: 0, label: 'closest approach', faint: true }, ...(frame?.merged != null ? [{ x: frame.merged, label: 'merged' }] : [])];

  const description = `${caption} The 3D view shows the stars as points${colourBy === 'galaxy' ? `, ${names.main}’s blue-white and ${names.companion}’s orange` : ', coloured by how far from their galaxy’s centre they started, yellow in the middle to blue at the edge'}; the two white dots are the galaxies’ centres. The galaxies’ orbit turns anticlockwise seen from above.`;

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?mode=galaxies&${collisionQuery(config)}`;
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
        <label htmlFor="orrery-encounter">Encounter</label>
        <select id="orrery-encounter" value={preset ?? 'custom'} onChange={(e) => GALAXY_PRESETS.includes(e.target.value as CollisionPreset) && choosePreset(e.target.value as CollisionPreset)}>
          {!preset && <option value="custom">Your own encounter</option>}
          {GALAXY_PRESETS.map((p) => (
            <option key={p} value={p}>
              {PRESET_INFO[p].label}
            </option>
          ))}
        </select>
        <button type="button" className={figureStyles.toolButton} onClick={restart} disabled={!info}>
          Start again
        </button>
      </div>
      <p className={styles.blurb}>{preset ? `${PRESET_INFO[preset].about}.` : 'Your own encounter: change anything and run it again.'}</p>

      <div className={figureStyles.toolbar}>
        <button type="button" className={figureStyles.toolButton} onClick={() => setWantRun((r) => !r)} disabled={!info || !!frame?.ended} aria-pressed={wantRun}>
          {wantRun ? '❚❚ Pause' : frame && info && frame.t > info.start ? '▶ Carry on' : '▶ Run the collision'}
        </button>
        <span className={figureStyles.segmented} role="group" aria-label="Time warp">
          {SPEEDS.map((s) => (
            <button key={s.rate} type="button" aria-pressed={speed === s.rate} onClick={() => setSpeed(s.rate)} title={`${s.rate} million years a second`}>
              {s.label}
            </button>
          ))}
        </span>
        <button type="button" className={skyStyles.toggle} aria-pressed={config.friction} onClick={() => change({ friction: !config.friction })}>
          Dynamical friction
        </button>
      </div>
      <div className={skyStyles.controls}>
        <Slider
          label={milkyWay ? 'The Milky Way’s mass' : 'Companion’s mass'}
          value={config.massRatio}
          min={0.1}
          max={1}
          step={0.05}
          format={(v) => (v >= 0.995 ? `as heavy as ${names.main}` : `${Math.round(v * 100)}% of ${names.main}’s`)}
          onChange={(v) => change({ massRatio: Math.round(v * 20) / 20 })}
        />
        <Slider label="Closest approach" value={config.pericentre} min={1} max={50} step={1} format={(v) => `${Math.round(v)} kpc`} onChange={(v) => change({ pericentre: Math.round(v) })} />
        <Slider
          label="Orbit’s eccentricity"
          value={config.eccentricity}
          min={0.3}
          max={2}
          step={0.1}
          format={(v) => `${v.toFixed(1)} (${v < 0.995 ? 'bound' : v < 1.005 ? 'parabolic' : 'open'})`}
          onChange={(v) => change({ eccentricity: Math.round(v * 10) / 10 })}
        />
        <Slider label={`${milkyWay ? 'Andromeda’s' : 'Main'} disc’s tilt to the orbit`} value={config.main.tilt} min={0} max={90} step={5} format={(v) => `${Math.round(v)}°`} onChange={(v) => changeDisc('main', { tilt: Math.round(v) })} />
        {config.companion && (
          <Slider label={milkyWay ? 'The Milky Way’s tilt' : 'Companion’s tilt'} value={config.companion.tilt} min={0} max={90} step={5} format={(v) => `${Math.round(v)}°`} onChange={(v) => changeDisc('companion', { tilt: Math.round(v) })} />
        )}
      </div>
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label={`${milkyWay ? 'Andromeda’s' : 'Main'} disc turns`}>
          <button type="button" aria-pressed={config.main.spin === 1} onClick={() => changeDisc('main', { spin: 1 })}>
            {milkyWay ? 'Andromeda' : 'Main'} turns with the orbit
          </button>
          <button type="button" aria-pressed={config.main.spin === -1} onClick={() => changeDisc('main', { spin: -1 })}>
            against it
          </button>
        </span>
        {config.companion && (
          <span className={figureStyles.segmented} role="group" aria-label={`${milkyWay ? 'The Milky Way’s' : 'Companion’s'} disc turns`}>
            <button type="button" aria-pressed={config.companion.spin === 1} onClick={() => changeDisc('companion', { spin: 1 })}>
              {milkyWay ? 'Milky Way' : 'Companion'} with the orbit
            </button>
            <button type="button" aria-pressed={config.companion.spin === -1} onClick={() => changeDisc('companion', { spin: -1 })}>
              against it
            </button>
          </span>
        )}
        <button type="button" className={skyStyles.toggle} aria-pressed={config.companion !== null} onClick={() => change({ companion: config.companion ? null : { tilt: 60, omega: config.main.omega, spin: 1 } })}>
          {milkyWay ? 'The Milky Way has a disc' : 'Companion has a disc'}
        </button>
      </div>
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Stars">
          {STAR_CHOICES.map((n) => (
            <button key={n} type="button" aria-pressed={config.stars === n} onClick={() => change({ stars: n })}>
              {n.toLocaleString('en-GB')} stars
            </button>
          ))}
        </span>
        <span className={figureStyles.segmented} role="group" aria-label="Colour the stars by">
          <button type="button" aria-pressed={colourBy === 'galaxy'} onClick={() => setColourBy('galaxy')}>
            By galaxy
          </button>
          <button type="button" aria-pressed={colourBy === 'radius'} onClick={() => setColourBy('radius')}>
            By starting radius
          </button>
        </span>
        <span className={figureStyles.segmented} role="group" aria-label="View">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => chooseView(v)}>
              {VIEWS[v].label}
            </button>
          ))}
        </span>
      </div>
      <Legend
        items={[
          ...(colourBy === 'galaxy'
            ? [
                { label: `a star of ${names.main}`, symbol: <circle r="3.5" fill={MAIN_COLOUR} /> },
                { label: `a star of ${names.companion}`, symbol: <circle r="3.5" fill={COMPANION_COLOUR} /> },
              ]
            : [
                { label: 'started near its galaxy’s centre', symbol: <circle r="3.5" fill="#fff1c9" stroke="#94a3b8" /> },
                { label: 'started at the disc’s edge', symbol: <circle r="3.5" fill="#6d8cff" /> },
              ]),
          { label: 'a galaxy’s centre', symbol: <circle r="4.5" fill="#ffffff" stroke="#64748b" /> },
        ]}
      />
      {sceneState ? (
        <Scene3D
          label="3D view of the colliding galaxies"
          description={description}
          factory={particleScene}
          state={sceneState}
          camera={{ ...VIEWS[view].camera, distance: config.preset === 'ring' ? 110 : VIEWS[view].camera.distance }}
          limits={{ minDistance: 5, maxDistance: 2000 }}
          cameraReset={cameraReset}
          height="clamp(300px, 62vw, 540px)"
          overlay={frame ? <span className={seasonStyles.sceneBadge}>{formatWhen(frame.t)}</span> : undefined}
        />
      ) : (
        <p className={skyStyles.hint}>{error ?? 'Setting up the galaxies…'}</p>
      )}
      {error && sceneState && <p className={styles.error}>{error}</p>}
      <p className={styles.status} aria-live="polite">
        {caption}
      </p>
      <div className={skyStyles.split}>
        <div>
          <p className={skyStyles.panelTitle}>The galaxies’ separation</p>
          <LineChart
            series={[{ name: 'distance between the centres', color: 'var(--series-1)', points: separation }]}
            xLabel="Million years from the closest approach"
            yLabel="Separation (kpc)"
            xMin={tMin}
            xMax={tMax}
            xTicks={xTicks}
            yMin={0}
            yMax={sepMax}
            markers={markers}
            formatY={(y) => String(Math.round(y))}
            height={220}
            hideLegend
            ariaLabel={`The distance between the galaxies’ centres against time. ${latest ? `Now ${Math.round(latest.separation)} kpc.` : ''}`}
          />
        </div>
        <div>
          <p className={skyStyles.panelTitle}>Stars pulled away from their galaxy</p>
          <LineChart
            series={[
              { name: 'loose, in tails and bridges', color: 'var(--series-2)', points: loose },
              { name: 'taken by the other galaxy', color: 'var(--series-3)', dashed: true, points: taken },
            ]}
            xLabel="Million years from the closest approach"
            yLabel="Share of the stars (%)"
            xMin={tMin}
            xMax={tMax}
            xTicks={xTicks}
            yMin={0}
            yMax={fateMax}
            markers={markers}
            formatY={(y) => `${Math.round(y)}%`}
            height={220}
            ariaLabel={`The share of all the stars loose in tails and bridges, and taken by the other galaxy, against time. ${latest ? `Now ${Math.round(100 * fateShares(latest).loose)}% and ${Math.round(100 * fateShares(latest).taken)}%.` : ''}`}
          />
        </div>
      </div>
      <div className={styles.buttons}>
        <button type="button" className={figureStyles.toolButton} onClick={copyLink}>
          Copy a link to this encounter
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
          Toomre’s restricted method: each galaxy is a rigid ball of mass, a Plummer sphere, and its stars are test particles that feel both
          galaxies but pull on nothing, so the discs can’t raise arms or bars of their own and the galaxies keep their shapes however close they
          come. Dynamical friction is Chandrasekhar’s formula on the lighter galaxy in the heavier one’s sphere; it makes bound pairs sink
          together, but it is too weak to capture galaxies that meet on open orbits, which in nature, with their wide dark halos, often merge.
          There is no gas, so no bursts of new stars.
          {milkyWay
            ? ' The Milky Way and Andromeda are scaled to these model galaxies at their measured ratio of masses; the plane of their orbit, and so the discs’ tilts to it, aren’t known, and whether and when they meet is the question of Figure 31.2.'
            : ''}
        </p>
      </details>
    </div>
  );
}
