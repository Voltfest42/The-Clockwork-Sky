import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  COLLISION_DEFAULTS,
  COLLISION_PRESETS,
  STAR_CHOICES,
  type CollisionConfig,
  type CollisionInfo,
  type CollisionMessage,
  type CollisionPreset,
  type CollisionSample,
  type DiscSetting,
} from '../core/nbody/collisionHost';
import { Caption, Figure } from '../viz/Figure';
import { LineChart } from '../viz/LineChart';
import { useOnScreen, useReducedMotion } from '../viz/hooks';
import { rgb } from '../viz/particles/colour';
import { particleScene, type ParticleState } from '../viz/particles/scene';
import { useCollision } from '../viz/particles/useEngine';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { Scene3D } from '../viz/scene3d/Scene3D';
import { collisionCaption, COMPANION_COLOUR, fateShares, formatWhen, MAIN_COLOUR, presetOf, PRESET_INFO, radiusColour, SPEEDS } from './collisions';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import { Slider } from './Slider';
import styles from './sky/sky.module.css';

/**
 * Colliding galaxies (Figure 31.1): two disc galaxies of test stars, Toomre's
 * restricted method with extended (Plummer) galaxies and dynamical friction,
 * stepped in a worker and drawn as points. Presets after Toomre & Toomre
 * (1972) and Lynds & Toomre (1976); every setting can be changed. Charts follow
 * the galaxies' separation and what has become of their stars.
 */

type ColourBy = 'galaxy' | 'radius';
type View = 'above' | 'edge';

const VIEWS: Record<View, { label: string; camera: OrbitCameraState }> = {
  above: { label: 'Above the orbit', camera: { target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: 1.45, distance: 230 } },
  edge: { label: 'In the orbit’s plane', camera: { target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: 0.04, distance: 230 } },
};

const PRESETS: readonly CollisionPreset[] = ['antennae', 'mice', 'ring', 'flyby'];

export function GalaxyCollisionFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [config, setConfig] = useState<CollisionConfig>(COLLISION_DEFAULTS);
  const [colourBy, setColourBy] = useState<ColourBy>('galaxy');
  const [view, setView] = useState<View>('above');
  const [speed, setSpeed] = useState<number>(SPEEDS[1].rate);
  const [wantRun, setWantRun] = useState(false);
  const [info, setInfo] = useState<CollisionInfo | null>(null);
  const [frame, setFrame] = useState<{ t: number; positions: Float32Array; centres: number[]; merged: number | null; closest: number; ended: boolean } | null>(null);
  const [samples, setSamples] = useState<CollisionSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraReset, setCameraReset] = useState(0);
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
      // With reduced motion, the stars jump twice a second rather than gliding
      const now = performance.now();
      if (reducedMotion && message.running && now - lastShown.current < 500) return;
      lastShown.current = now;
      setFrame({ t: message.t, positions: message.positions, centres: message.centres, merged: message.merged, closest: message.closest, ended: message.ended });
    },
    [reducedMotion],
  );
  const post = useCollision(onMessage);

  // A short pause before rebuilding, so a slider's drag doesn't queue a rebuild for every step
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
    setConfig((c) => ({ ...c, ...next }));
  };
  const choosePreset = (p: CollisionPreset) => {
    setWantRun(false);
    setConfig((c) => ({ ...COLLISION_PRESETS[p], stars: c.stars, seed: c.seed }));
    setCameraReset((k) => k + 1);
  };
  const changeDisc = (which: 'main' | 'companion', next: Partial<DiscSetting>) => {
    setWantRun(false);
    setConfig((c) => {
      const d = c[which];
      return d ? { ...c, [which]: { ...d, ...next } } : c;
    });
  };
  const reset = () => {
    setWantRun(false);
    setColourBy('galaxy');
    setView('above');
    setSpeed(SPEEDS[1].rate);
    setConfig({ ...COLLISION_DEFAULTS });
    setCameraReset((k) => k + 1);
  };
  const restart = () => {
    setWantRun(false);
    post({ type: 'load', config });
  };
  const chooseView = (v: View) => {
    setView(v);
    setCameraReset((k) => k + 1);
  };

  // Colours and sizes, per star, plus the two galaxies' centres as the last two points
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
    // Dimmer dots when there are more of them, so a disc's middle doesn't burn white
    return { positions, colours: looks.colours, sizes: looks.sizes, additive: true, opacity: Math.min(0.55, Math.max(0.2, 0.45 * Math.sqrt(20_000 / n))) };
  }, [frame, looks, info]);

  const latest = samples.length ? samples[samples.length - 1] : null;
  const caption = info && latest && frame ? collisionCaption(config, info, latest, frame.merged, frame.closest) : 'Setting up the galaxies…';
  const preset = presetOf(config);

  // Charts, against time in millions of years from the closest approach
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
  const markers = [
    { x: 0, label: 'closest approach', faint: true },
    ...(frame?.merged != null ? [{ x: frame.merged, label: 'merged' }] : []),
  ];

  const description = `${caption} The 3D view shows the stars as points${colourBy === 'galaxy' ? ', the main galaxy’s blue-white and the companion’s orange' : ', coloured by how far from their galaxy’s centre they started, yellow in the middle to blue at the edge'}; the two white dots are the galaxies’ centres. The galaxies’ orbit turns anticlockwise seen from above.`;

  return (
    <Figure
      number={number}
      title="Galaxy collision"
      description="Two disc galaxies meet, each a cloud of up to 50,000 test stars round an extended mass, computed in the reader’s browser by Toomre’s method. Presets after Toomre and Toomre’s Antennae and Mice, a ring galaxy and a flyby; the masses, the closest approach, the orbit, each disc’s tilt and spin, and dynamical friction can be changed. Charts follow the galaxies’ separation and the share of stars pulled into tails or taken by the other galaxy."
      height={1360}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        ...(colourBy === 'galaxy'
          ? [
              { label: 'a star of the main galaxy', symbol: <circle r="3.5" fill={MAIN_COLOUR} /> },
              { label: 'a star of the companion', symbol: <circle r="3.5" fill={COMPANION_COLOUR} /> },
            ]
          : [
              { label: 'started near its galaxy’s centre', symbol: <circle r="3.5" fill="#fff1c9" stroke="#94a3b8" /> },
              { label: 'started at the disc’s edge', symbol: <circle r="3.5" fill="#6d8cff" /> },
            ]),
        { label: 'a galaxy’s centre', symbol: <circle r="4.5" fill="#ffffff" stroke="#64748b" /> },
      ]}
      simplified={
        <p>
          Toomre’s restricted method: each galaxy is a rigid ball of mass, a Plummer sphere (a softened point mass, as Toomre’s were), and its
          stars are test particles that feel both galaxies but pull on nothing, so the discs can’t raise spiral arms or bars of their own, and
          the galaxies keep their shapes however close they come. Dynamical friction is Chandrasekhar’s formula with a Coulomb logarithm of 2,
          acting on the lighter galaxy in the heavier one’s sphere as Sawala and colleagues apply it: it makes bound pairs sink together, but the
          merger’s last stages, which reshape both, are only sketched, and it is too weak to capture galaxies that meet on open orbits, which in
          nature, with their wide dark halos, often merge. The discs start flat and cold. There is no gas, so no bursts of new stars; and no dark halo beyond each galaxy’s sphere,
          which in real galaxies is bigger and makes the tails shorter. Toomre’s parameters are scaled to discs of 20 kpc in galaxies of 2 ×
          10¹¹ suns.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} onClick={() => setWantRun((r) => !r)} disabled={!info || !!frame?.ended} aria-pressed={wantRun}>
            {wantRun ? 'Pause' : frame && info && frame.t > info.start ? 'Carry on' : 'Run the collision'}
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={restart} disabled={!info}>
            Start again
          </button>
          <span className={figureStyles.segmented} role="group" aria-label="Time warp">
            {SPEEDS.map((s) => (
              <button key={s.rate} type="button" aria-pressed={speed === s.rate} onClick={() => setSpeed(s.rate)} title={`${s.rate} million years a second`}>
                {s.label}
              </button>
            ))}
          </span>
        </div>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Encounter">
            {PRESETS.map((p) => (
              <button key={p} type="button" aria-pressed={preset === p} onClick={() => choosePreset(p)}>
                {PRESET_INFO[p].label}
              </button>
            ))}
          </span>
          <button type="button" className={styles.toggle} aria-pressed={config.friction} onClick={() => change({ friction: !config.friction })}>
            Dynamical friction
          </button>
        </div>
        <div className={styles.controls}>
          <Slider
            label="Companion’s mass"
            value={config.massRatio}
            min={0.1}
            max={1}
            step={0.05}
            format={(v) => (v >= 0.995 ? 'as heavy as the main galaxy' : `${Math.round(v * 100)}% of the main galaxy’s`)}
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
          <Slider label="Main disc’s tilt to the orbit" value={config.main.tilt} min={0} max={90} step={5} format={(v) => `${Math.round(v)}°`} onChange={(v) => changeDisc('main', { tilt: Math.round(v) })} />
          {config.companion && (
            <Slider label="Companion’s tilt" value={config.companion.tilt} min={0} max={90} step={5} format={(v) => `${Math.round(v)}°`} onChange={(v) => changeDisc('companion', { tilt: Math.round(v) })} />
          )}
        </div>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Main disc turns">
            <button type="button" aria-pressed={config.main.spin === 1} onClick={() => changeDisc('main', { spin: 1 })}>
              Main turns with the orbit
            </button>
            <button type="button" aria-pressed={config.main.spin === -1} onClick={() => changeDisc('main', { spin: -1 })}>
              against it
            </button>
          </span>
          {config.companion ? (
            <span className={figureStyles.segmented} role="group" aria-label="Companion’s disc turns">
              <button type="button" aria-pressed={config.companion.spin === 1} onClick={() => changeDisc('companion', { spin: 1 })}>
                Companion with the orbit
              </button>
              <button type="button" aria-pressed={config.companion.spin === -1} onClick={() => changeDisc('companion', { spin: -1 })}>
                against it
              </button>
            </span>
          ) : null}
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={config.companion !== null}
            onClick={() => change({ companion: config.companion ? null : { tilt: 60, omega: config.main.omega, spin: 1 } })}
          >
            Companion has a disc
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
          <p className={styles.hint}>{error ?? 'Setting up the galaxies…'}</p>
        )}
        {error && sceneState && <p className={styles.hint}>{error}</p>}
        <div className={styles.split}>
          <div>
            <p className={styles.panelTitle}>The galaxies’ separation</p>
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
            <p className={styles.panelTitle}>Stars pulled away from their galaxy</p>
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
        <Caption>{caption}</Caption>
      </div>
    </Figure>
  );
}
