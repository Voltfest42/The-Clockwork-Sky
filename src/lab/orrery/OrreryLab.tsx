import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Vec3 } from '../../core/math/vec3';
import { METHOD_NAMES, type MethodChoice, type NewBodyOnOrbit, type OrreryBody, type OrreryEvent } from '../../core/orrery/engine';
import { directionFromFrame, directionToFrame, frameOf, toFrame, type FrameSpec } from '../../core/orrery/frame';
import { parentage, type Parentage } from '../../core/orrery/hierarchy';
import type { OrreryMessage, OrrerySnapshot } from '../../core/orrery/protocol';
import { lagrangePoints } from '../../core/orbits/lagrange';
import { gmToAuDay, GM_SUN_AU_DAY } from '../../core/nbody/system';
import { DEG } from '../../core/units';
import { useOnScreen, useReducedMotion } from '../../viz/hooks';
import { decodeSystem, encodeSystem } from './link';
import { EARTH_GM, formatClock, formatDistance, formatError, formatMass, formatSize, formatSpan, formatSpeed, JUPITER_GM, maxRateIndex, nearestRate, RATES } from './format';
import { findPreset, PRESETS, type Preset } from './presets';
import { TopView, type ViewModel } from './TopView';
import { useOrrery } from './useOrrery';
import figureStyles from '../../figures/figures.module.css';
import styles from './Orrery.module.css';

/**
 * The Orrery: pick a system or build one, run it, and watch gravity at work.
 * The engine runs in a Web Worker (src/core/orrery); this component holds the
 * view's settings, keeps the trails, and draws from the snapshots the worker
 * sends about thirty times a second. Readouts refresh four times a second.
 */

const Scene3DView = lazy(() => import('./Scene3DView'));

const KM = 1 / 149_597_870.7;
const R_SUN = 695_700 * KM;

/** Ready-made masses for a new body: G·m in AU³/day² and radius in AU. */
const MASSES = [
  { id: 'particle', name: 'A test particle (weighs nothing)', gm: 0, radius: 0 },
  { id: 'moon', name: 'The Moon', gm: gmToAuDay(4_902.8e9), radius: 1_737 * KM },
  { id: 'earth', name: 'Earth', gm: EARTH_GM, radius: 6_371 * KM },
  { id: 'neptune', name: 'Neptune', gm: gmToAuDay(6_836_527e9), radius: 24_764 * KM },
  { id: 'jupiter', name: 'Jupiter', gm: JUPITER_GM, radius: 71_492 * KM },
  { id: 'red-dwarf', name: 'A red dwarf (0.1 Suns)', gm: 0.1 * GM_SUN_AU_DAY, radius: 0.13 * R_SUN },
  { id: 'sun', name: 'The Sun', gm: GM_SUN_AU_DAY, radius: R_SUN },
] as const;
const NEW_COLOURS = ['#f28fb0', '#8fe3a1', '#f2c94c', '#9fd3ff', '#d6a8ff', '#ffb36b'];

const TRAILS = [
  { laps: 0, label: 'No trails' },
  { laps: 0.3, label: 'Short trails' },
  { laps: 1, label: 'One lap' },
  { laps: 5, label: 'Five laps' },
  { laps: 30, label: 'Thirty laps' },
];

const METHOD_CHOICES: { value: MethodChoice; label: string }[] = [
  { value: 'auto', label: 'Automatic' },
  { value: 'whfast', label: METHOD_NAMES.whfast },
  { value: 'ias15', label: METHOD_NAMES.ias15 },
  { value: 'leapfrog', label: METHOD_NAMES.leapfrog },
];

interface Readout {
  snap: OrrerySnapshot;
  parents: Parentage;
}

/** What the page's address asks for: ?preset=galilean&method=leapfrog, or ?system=… from "Copy a link". */
function fromAddress(): { preset: Preset; method?: MethodChoice; bodies?: OrreryBody[]; problem?: string } {
  const query = new URLSearchParams(window.location.search);
  const preset = findPreset(query.get('preset') ?? '') ?? PRESETS[0];
  const method = METHOD_CHOICES.find((m) => m.value === query.get('method'))?.value;
  const system = query.get('system');
  if (system) {
    try {
      return { preset, method, bodies: decodeSystem(system) };
    } catch {
      return { preset, method, problem: 'The system in this link couldn’t be read, so the Solar System is shown instead.' };
    }
  }
  return { preset, method };
}

export function OrreryLab() {
  const [start] = useState(fromAddress);
  const [preset, setPreset] = useState<Preset>(start.preset);
  const [custom, setCustom] = useState(!!start.bodies);
  const [playing, setPlaying] = useState(false);
  const [rateIndex, setRateIndex] = useState(nearestRate(start.preset.rate));
  const [view, setView] = useState<'top' | '3d'>('top');
  const [frame, setFrame] = useState<FrameSpec>(start.preset.frame);
  const [trailLaps, setTrailLaps] = useState(start.preset.trailLaps);
  const [zoom, setZoom] = useState(start.preset.zoom);
  const [pan, setPan] = useState<readonly [number, number]>([0, 0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(start.problem ?? null);
  const [events, setEvents] = useState<OrreryEvent[]>([]);
  const [readout, setReadout] = useState<Readout | null>(null);
  const [version, setVersion] = useState(0);
  const [cameraReset, setCameraReset] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const model = useRef<ViewModel>({ bodies: [], trails: new Map(), lagrange: null, arrow: null, selected: null });
  const latest = useRef<OrrerySnapshot | null>(null);
  const periods = useRef(new Map<string, number>());
  const lastReadout = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const ids = { preset: useId(), follow: useId(), turn: useId(), trails: useId(), method: useId(), warp: useId() };

  const settings = useRef({ frame, trailLaps, selected, playing });
  useEffect(() => {
    settings.current = { frame, trailLaps, selected, playing };
  });

  /** Rebuilds what the views draw from the latest snapshot: positions in the frame, the Lagrange points, the velocity arrow. */
  const rebuildModel = useCallback((s: OrrerySnapshot, parents: Parentage | null) => {
    const { frame: spec, selected: picked, playing: running } = settings.current;
    const f = frameOf(spec, s.ids, s.gm, s.x, s.v);
    const m = model.current;
    m.bodies = s.ids.map((id, i) => ({ id, name: s.names[i], colour: s.colours[i], radius: s.radii[i], gm: s.gm[i], p: toFrame(f, [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]]) }));
    m.selected = picked;
    m.lagrange = null;
    if (spec.rotate) {
      let a = s.ids.indexOf(spec.rotate[0]);
      let b = s.ids.indexOf(spec.rotate[1]);
      if (a >= 0 && b >= 0) {
        if (s.gm[b] > s.gm[a]) [a, b] = [b, a];
        const q = s.gm[b] / (s.gm[a] + s.gm[b]);
        const d = Math.hypot(s.x[3 * b] - s.x[3 * a], s.x[3 * b + 1] - s.x[3 * a + 1], s.x[3 * b + 2] - s.x[3 * a + 2]);
        if (q > 0 && q <= 0.5) m.lagrange = lagrangePoints(q).map((p) => ({ name: p.name, x: p.x * d, y: p.y * d }));
      }
    }
    m.arrow = null;
    const i = picked ? s.ids.indexOf(picked) : -1;
    if (!running && i >= 0 && parents && parents.parent[i] >= 0) {
      const j = parents.parent[i];
      const rel: Vec3 = [s.v[3 * i] - s.v[3 * j], s.v[3 * i + 1] - s.v[3 * j + 1], s.v[3 * i + 2] - s.v[3 * j + 2]];
      const r = Math.hypot(s.x[3 * i] - s.x[3 * j], s.x[3 * i + 1] - s.x[3 * j + 1], s.x[3 * i + 2] - s.x[3 * j + 2]);
      const circular = Math.sqrt((s.gm[i] + s.gm[j]) / r);
      // A circular orbit's velocity draws as an arrow half as long as the orbit's radius.
      m.arrow = { id: picked!, v: directionToFrame(f, rel), scale: (0.5 * r) / circular };
    }
  }, []);

  const post = useOrrery((message: OrreryMessage) => {
    if (message.type === 'error') {
      setProblem(message.message);
      setPlaying(false);
      return;
    }
    const s = message;
    latest.current = s;
    const m = model.current;
    if (s.trailReset) m.trails = new Map();
    for (let k = 0; k + 4 < s.trail.length; k += 5) {
      const id = s.ids[s.trail[k]];
      let list = m.trails.get(id);
      if (!list) m.trails.set(id, (list = []));
      list.push(s.trail[k + 1], s.trail[k + 2], s.trail[k + 3], s.trail[k + 4]);
    }
    // Trim each trail to its length: laps of the body's own orbit.
    const laps = settings.current.trailLaps;
    for (const [id, list] of m.trails) {
      if (!s.ids.includes(id)) {
        m.trails.delete(id);
        continue;
      }
      const keep = laps * (periods.current.get(id) ?? s.timescale);
      let drop = 0;
      while (drop < list.length && list[drop] < s.t - keep) drop += 4;
      if (drop) list.splice(0, drop);
    }
    if (s.events.length) setEvents((old) => [...old, ...s.events].slice(-200));
    const now = performance.now();
    let parents = readout?.parents ?? null;
    if (now - lastReadout.current > 250 || !s.running || s.trailReset) {
      lastReadout.current = now;
      parents = parentage(s.gm, s.x, s.v);
      const map = new Map<string, number>();
      parents.orbits.forEach((orbit, i) => map.set(s.ids[i], orbit && Number.isFinite(orbit.period) ? orbit.period : s.timescale));
      periods.current = map;
      setReadout({ snap: s, parents });
    }
    rebuildModel(s, parents);
    setVersion((v) => v + 1);
  });

  const load = useCallback(
    (p: Preset, given?: OrreryBody[], chosen?: MethodChoice) => {
      const bodies = given ?? p.bodies();
      const method = chosen ?? p.method;
      setPreset(p);
      setPlaying(false);
      setFrame(p.frame);
      setTrailLaps(p.trailLaps);
      setZoom(p.zoom);
      setPan([0, 0]);
      setSelected(null);
      setEvents([]);
      setProblem(null);
      setRateIndex(nearestRate(p.rate));
      setCameraReset((c) => c + 1);
      settings.current = { ...settings.current, frame: p.frame, trailLaps: p.trailLaps, selected: null, playing: false };
      post({ type: 'load', bodies, method, frame: p.frame });
    },
    [post],
  );

  // The first system. (In development React mounts twice, with a new worker each time; each gets the load.)
  // The state already starts from the address, so only the engine needs telling.
  useEffect(() => {
    post({ type: 'load', bodies: start.bodies ?? start.preset.bodies(), method: start.method ?? start.preset.method, frame: start.preset.frame });
  }, [post, start]);

  const maxRate = readout ? maxRateIndex(readout.snap.timescale) : RATES.length - 1;
  const rate = RATES[Math.min(rateIndex, maxRate)];

  useEffect(() => {
    if (playing && onScreen) post({ type: 'run', rate: rate.days, postEvery: reducedMotion ? 0.5 : 1 / 30 });
    else post({ type: 'pause' });
  }, [post, playing, onScreen, reducedMotion, rate.days]);

  const changeFrame = (next: FrameSpec) => {
    setFrame(next);
    settings.current = { ...settings.current, frame: next };
    setPan([0, 0]);
    post({ type: 'frame', frame: next });
  };

  const pick = (id: string | null) => {
    setSelected(id);
    settings.current = { ...settings.current, selected: id };
    if (latest.current) {
      rebuildModel(latest.current, readout?.parents ?? null);
      setVersion((v) => v + 1);
    }
  };

  // The arrow shows only while paused: redraw it when that changes.
  useEffect(() => {
    if (latest.current) {
      rebuildModel(latest.current, readout?.parents ?? null);
      setVersion((v) => v + 1);
    }
  }, [playing, rebuildModel, readout?.parents]);

  const snap = readout?.snap;
  const parents = readout?.parents;
  const index = (id: string | null) => (snap && id ? snap.ids.indexOf(id) : -1);
  const sel = index(selected);
  const nameOf = (i: number) => (snap && i >= 0 ? snap.names[i] : '');

  const setVelocity = (id: string, v: Vec3) => {
    setProblem(null);
    post({ type: 'velocity', id, v });
  };

  /** The picked body's velocity relative to its parent, changed by `change`, set back in the system's axes. */
  const nudge = (change: (rel: Vec3) => Vec3) => {
    const s = latest.current;
    if (!s || sel < 0 || !parents) return;
    const j = parents.parent[sel];
    if (j < 0) return;
    const rel: Vec3 = [s.v[3 * sel] - s.v[3 * j], s.v[3 * sel + 1] - s.v[3 * j + 1], s.v[3 * sel + 2] - s.v[3 * j + 2]];
    const next = change(rel);
    setVelocity(s.ids[sel], [s.v[3 * j] + next[0], s.v[3 * j + 1] + next[1], s.v[3 * j + 2] + next[2]]);
  };

  const onArrow = (id: string, vFrame: Vec3) => {
    const s = latest.current;
    if (!s || !parents) return;
    const i = s.ids.indexOf(id);
    const j = parents.parent[i];
    if (i < 0 || j < 0) return;
    const f = frameOf(frame, s.ids, s.gm, s.x, s.v);
    const rel = directionFromFrame(f, vFrame);
    setVelocity(id, [s.v[3 * j] + rel[0], s.v[3 * j + 1] + rel[1], s.v[3 * j + 2] + rel[2]]);
  };

  const copyLink = async () => {
    const s = latest.current;
    if (!s) return;
    const bodies: OrreryBody[] = s.ids.map((id, i) => ({ id, name: s.names[i], gm: s.gm[i], radius: s.radii[i], colour: s.colours[i], x: [s.x[3 * i], s.x[3 * i + 1], s.x[3 * i + 2]], v: [s.v[3 * i], s.v[3 * i + 1], s.v[3 * i + 2]] }));
    const url = `${window.location.origin}${window.location.pathname}?system=${encodeSystem(bodies)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied('Copied a link to this system, as it is now.');
    } catch {
      setCopied(url);
    }
  };

  // Turning frames: each body with the body it goes round.
  const pairs = useMemo(() => {
    if (!snap || !parents) return [];
    return snap.ids.flatMap((id, i) => (parents.parent[i] >= 0 && snap.gm[i] > 0 ? [[snap.ids[parents.parent[i]], id] as const] : []));
  }, [snap, parents]);
  const rotateValue = frame.rotate ? `${frame.rotate[0]}|${frame.rotate[1]}` : '';
  const pairListed = !frame.rotate || pairs.some(([a, b]) => `${a}|${b}` === rotateValue);

  const clock = snap ? formatClock(snap.t, custom ? undefined : preset.epochTT) : '';
  const viewLabel = view === 'top' ? 'The Orrery, seen from above' : 'The Orrery in 3D';
  const following = frame.rotate ? `turning with ${nameOf(index(frame.rotate[0]))} and ${nameOf(index(frame.rotate[1]))}` : frame.centre ? `centred on ${nameOf(index(frame.centre))}` : 'centred on the centre of mass';
  const caption = snap ? `${clock}. ${snap.ids.length} bodies, ${following}, ${playing ? `running at ${rate.label}` : 'paused'}.${sel >= 0 ? ` ${snap.names[sel]} is picked.` : ''}` : 'Loading the Orrery…';
  const ring = useMemo(() => {
    const target = zoom / 2;
    const p10 = Math.pow(10, Math.floor(Math.log10(target)));
    return [1, 2, 5, 10].map((k) => k * p10).filter((v) => v <= target).pop() ?? p10;
  }, [zoom]);

  return (
    <div className={styles.lab} ref={box}>
      <div className={styles.presetRow}>
        <label htmlFor={ids.preset}>System</label>
        <select
          id={ids.preset}
          value={custom ? 'custom' : preset.id}
          onChange={(e) => {
            const p = findPreset(e.target.value);
            if (!p) return;
            setCustom(false);
            load(p);
          }}
        >
          {custom && <option value="custom">Your system, from a link</option>}
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className={figureStyles.toolButton} onClick={() => (custom && start.bodies ? load(preset, start.bodies) : load(preset))}>
          Start again
        </button>
      </div>
      <p className={styles.blurb}>{custom ? 'A system someone built in the Orrery and shared as a link.' : preset.blurb}</p>

      <div className={styles.controls}>
        <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
          {playing ? '❚❚ Pause' : '▶ Run'}
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={() => post({ type: 'advance', days: rate.days })} disabled={playing}>
          Jump a second’s worth
        </button>
        <label className={styles.field} htmlFor={ids.warp}>
          Time warp
          <input
            id={ids.warp}
            type="range"
            min={0}
            max={maxRate}
            step={1}
            value={Math.min(rateIndex, maxRate)}
            onChange={(e) => setRateIndex(Number(e.target.value))}
            aria-valuetext={rate.label}
          />
          <output className={styles.rate}>{rate.label}</output>
        </label>
        <span className={figureStyles.segmented} role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'top'} onClick={() => setView('top')}>
            From above
          </button>
          <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>
            3D
          </button>
        </span>
        <button type="button" className={figureStyles.toolButton} onClick={() => post({ type: 'undo' })} disabled={!snap?.canUndo}>
          Undo
        </button>
      </div>

      <div className={styles.controls}>
        <label className={styles.field} htmlFor={ids.follow}>
          Centre on
          <select id={ids.follow} value={frame.centre ?? ''} disabled={!!frame.rotate} onChange={(e) => changeFrame({ centre: e.target.value || null, rotate: null })}>
            <option value="">The centre of mass</option>
            {snap?.ids.map((id, i) => (
              <option key={id} value={id}>
                {snap.names[i]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field} htmlFor={ids.turn}>
          Turn with
          <select
            id={ids.turn}
            value={pairListed ? rotateValue : ''}
            onChange={(e) => {
              const [a, b] = e.target.value.split('|');
              changeFrame(a && b ? { centre: null, rotate: [a, b] } : { centre: frame.centre, rotate: null });
            }}
          >
            <option value="">Nothing (fixed to the stars)</option>
            {pairs.map(([a, b]) => (
              <option key={`${a}|${b}`} value={`${a}|${b}`}>
                {nameOf(index(a))} and {nameOf(index(b))}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field} htmlFor={ids.trails}>
          Trails
          <select id={ids.trails} value={trailLaps} onChange={(e) => setTrailLaps(Number(e.target.value))}>
            {TRAILS.some((t) => t.laps === trailLaps) ? null : <option value={trailLaps}>{trailLaps} laps</option>}
            {TRAILS.map((t) => (
              <option key={t.laps} value={t.laps}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field} htmlFor={ids.method}>
          Integrator
          <select
            id={ids.method}
            value={snap?.choice ?? preset.method}
            onChange={(e) => {
              setProblem(null);
              post({ type: 'method', method: e.target.value as MethodChoice });
            }}
          >
            {METHOD_CHOICES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.value === 'auto' && snap?.choice === 'auto' ? `Automatic (now ${METHOD_NAMES[snap.method]})` : m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.main}>
        <div>
          <div style={{ position: 'relative' }}>
            {view === 'top' ? (
              <TopView
                model={model}
                version={version}
                zoom={zoom}
                pan={pan}
                onView={(z, p) => {
                  setZoom(z);
                  setPan(p);
                }}
                onHome={() => {
                  setZoom(preset.zoom);
                  setPan([0, 0]);
                }}
                onPick={pick}
                onArrow={onArrow}
                editable={!playing}
                label={`${viewLabel}. ${caption}`}
                height="clamp(320px, 62vw, 560px)"
              />
            ) : (
              <Suspense fallback={<div className={styles.view} style={{ height: 'clamp(320px, 62vw, 560px)' }} />}>
                <Scene3DView model={model} version={version} unit={preset.zoom} ring={ring} onPick={pick} cameraReset={cameraReset} description={caption} running={playing} />
              </Suspense>
            )}
            <span className={styles.clock} aria-hidden="true">
              {clock}
            </span>
          </div>
          {view === 'top' && (
            <div className={styles.viewButtons}>
              <button type="button" className={figureStyles.toolButton} onClick={() => setZoom((z) => z / 2)} aria-label="Zoom in">
                ＋ Zoom in
              </button>
              <button type="button" className={figureStyles.toolButton} onClick={() => setZoom((z) => z * 2)} aria-label="Zoom out">
                − Zoom out
              </button>
              <button
                type="button"
                className={figureStyles.toolButton}
                onClick={() => {
                  setZoom(preset.zoom);
                  setPan([0, 0]);
                }}
              >
                Fit the view
              </button>
              <span className={styles.note} style={{ margin: 0 }}>
                Drag to pan, click to pick a body; once clicked, the wheel zooms. Arrow keys, + and − work too.
              </span>
            </div>
          )}
          <p className={styles.status} aria-live="polite">
            {caption}
          </p>
          {snap && (
            <p className={styles.status}>
              <span>
                Integrator <b>{METHOD_NAMES[snap.method]}</b>, step <b>{formatSpan(snap.stepSize)}</b>
              </span>
              <span>
                Energy error <b>{formatError(snap.energyError)}</b>
              </span>
              <span>
                Angular momentum error <b>{formatError(snap.angularMomentumError)}</b>
              </span>
              {playing && snap.achievedRate > 0 && snap.achievedRate < 0.8 * rate.days && <span>The computer is keeping up at {formatSpan(snap.achievedRate)} a second.</span>}
            </p>
          )}
          {problem && (
            <p className={styles.error} role="alert">
              {problem}
            </p>
          )}
        </div>

        <div className={styles.panel}>
          {snap && sel >= 0 && parents ? (
            <BodyCard
              key={selected}
              snap={snap}
              index={sel}
              parents={parents}
              playing={playing}
              onCircular={() => post({ type: 'circular', id: snap.ids[sel] })}
              onDelete={() => {
                post({ type: 'remove', id: snap.ids[sel] });
                pick(null);
              }}
              onMass={(gm) => post({ type: 'mass', id: snap.ids[sel], gm })}
              onSpeed={(k) => nudge((rel) => [rel[0] * k, rel[1] * k, rel[2] * k])}
              onTurn={(degrees) => {
                const a = degrees * DEG;
                nudge((rel) => [rel[0] * Math.cos(a) - rel[1] * Math.sin(a), rel[0] * Math.sin(a) + rel[1] * Math.cos(a), rel[2]]);
              }}
              onClose={() => pick(null)}
            />
          ) : (
            <div className={styles.box}>
              <h3>Try this</h3>
              <p>{custom ? 'Run it and see what the system does; pick a body to change it.' : preset.tryThis}</p>
              <p className={styles.note}>Pick a body (in the view or the table) to see its orbit and change it.</p>
            </div>
          )}
          {snap && <AddBody snap={snap} parents={parents ?? null} onAdd={(body) => post({ type: 'add', body })} />}
          <div className={styles.box}>
            <h3>Events</h3>
            {events.length === 0 ? (
              <p className={styles.note}>Close encounters, collisions, captures and escapes appear here.</p>
            ) : (
              <ol className={styles.log} aria-label="Events, latest first">
                {[...events]
                  .sort((a, b) => b.t - a.t)
                  .map((e, k) => (
                    <li key={`${e.t}-${k}`}>
                      <time>{formatClock(e.t, custom ? undefined : preset.epochTT)}</time>
                      {e.text}
                    </li>
                  ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {snap && parents && <BodyTable snap={snap} parents={parents} selected={selected} onPick={pick} />}

      <div className={styles.buttons}>
        <button type="button" className={figureStyles.toolButton} onClick={copyLink}>
          Copy a link to this system
        </button>
        {copied && (
          <span className={styles.note} style={{ margin: 0, wordBreak: 'break-all' }} role="status">
            {copied}
          </span>
        )}
      </div>
      {!custom && preset.simplified && (
        <details className={styles.box} style={{ marginTop: 12 }}>
          <summary>What’s simplified here?</summary>
          <p>{preset.simplified}</p>
          <p>
            Every body is a point mass pulling by Newton’s law, and bodies that touch merge. Bodies are drawn at least a few pixels across, far bigger
            than they are.
          </p>
        </details>
      )}
    </div>
  );
}

function BodyCard({
  snap,
  index: i,
  parents,
  playing,
  onCircular,
  onDelete,
  onMass,
  onSpeed,
  onTurn,
  onClose,
}: {
  snap: OrrerySnapshot;
  index: number;
  parents: Parentage;
  playing: boolean;
  onCircular: () => void;
  onDelete: () => void;
  onMass: (gm: number) => void;
  onSpeed: (factor: number) => void;
  onTurn: (degrees: number) => void;
  onClose: () => void;
}) {
  const orbit = parents.orbits[i];
  const p = parents.parent[i];
  const gm = snap.gm[i];
  return (
    <div className={styles.box}>
      <h3>
        <span className={styles.swatch} style={{ background: snap.colours[i] }} aria-hidden="true" />
        {snap.names[i]}
      </h3>
      <dl className={styles.facts}>
        <dt>Mass</dt>
        <dd>{formatMass(gm)}</dd>
        {orbit && p >= 0 ? (
          <>
            <dt>Goes round</dt>
            <dd>{snap.names[p]}</dd>
            <dt>Distance</dt>
            <dd>{formatDistance(orbit.r)}</dd>
            <dt>Speed</dt>
            <dd>{formatSpeed(orbit.speed)}</dd>
            {orbit.a > 0 ? (
              <>
                <dt>Orbit size</dt>
                <dd>{formatSize(orbit.a)}</dd>
                <dt>Eccentricity</dt>
                <dd>{orbit.e.toFixed(3)}</dd>
                <dt>Tilt</dt>
                <dd>{(orbit.i / DEG).toFixed(1)}°</dd>
                <dt>Once round</dt>
                <dd>{formatSpan(orbit.period)}</dd>
              </>
            ) : (
              <>
                <dt>Orbit</dt>
                <dd>Not bound: moving too fast to stay (e = {orbit.e.toFixed(2)})</dd>
              </>
            )}
          </>
        ) : (
          <>
            <dt>Orbit</dt>
            <dd>The heaviest body: the others go round it</dd>
          </>
        )}
      </dl>
      <div className={styles.buttons} role="group" aria-label={`Change ${snap.names[i]}`}>
        {p >= 0 && (
          <button type="button" className={figureStyles.toolButton} onClick={onCircular}>
            Make its orbit circular
          </button>
        )}
        <button type="button" className={figureStyles.toolButton} onClick={onDelete} disabled={snap.ids.length < 2}>
          Delete it
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={onClose}>
          Done
        </button>
      </div>
      <div className={styles.buttons} role="group" aria-label="Mass">
        <span className={styles.note} style={{ margin: 0, alignSelf: 'center' }}>
          Mass:
        </span>
        {[0.1, 0.5, 2, 10].map((k) => (
          <button key={k} type="button" className={figureStyles.toolButton} onClick={() => onMass(gm * k)} disabled={gm === 0}>
            × {k}
          </button>
        ))}
      </div>
      {p >= 0 && (
        <div className={styles.buttons} role="group" aria-label="Velocity">
          <span className={styles.note} style={{ margin: 0, alignSelf: 'center' }}>
            Velocity:
          </span>
          {[0.9, 0.99, 1.01, 1.1].map((k) => (
            <button key={k} type="button" className={figureStyles.toolButton} onClick={() => onSpeed(k)}>
              {Math.round(Math.abs(k - 1) * 100)}% {k < 1 ? 'slower' : 'faster'}
            </button>
          ))}
          <button type="button" className={figureStyles.toolButton} onClick={() => onTurn(10)}>
            Turn 10° left
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={() => onTurn(-10)}>
            Turn 10° right
          </button>
        </div>
      )}
      {p >= 0 && <p className={styles.note}>{playing ? 'Pause to drag its velocity arrow in the view from above.' : 'Or drag the arrow in the view from above: it shows its velocity relative to what it goes round.'}</p>}
    </div>
  );
}

function AddBody({ snap, parents, onAdd }: { snap: OrrerySnapshot; parents: Parentage | null; onAdd: (body: NewBodyOnOrbit) => void }) {
  const root = parents ? parents.root : 0;
  const [name, setName] = useState('New world');
  const [mass, setMass] = useState<string>('earth');
  const [parent, setParent] = useState(snap.ids[root]);
  const [values, setValues] = useState({ a: '1', e: '0', i: '0', node: '0', peri: '0', M: '0' });
  const [problem, setProblem] = useState<string | null>(null);
  const ids = useId();
  const parentId = snap.ids.includes(parent) ? parent : snap.ids[root];
  const fields: { key: keyof typeof values; label: string }[] = [
    { key: 'a', label: 'Size of orbit, a (AU)' },
    { key: 'e', label: 'Eccentricity, e' },
    { key: 'i', label: 'Tilt, i (°)' },
    { key: 'node', label: 'Node, Ω (°)' },
    { key: 'peri', label: 'Periapsis, ω (°)' },
    { key: 'M', label: 'Start along it, M (°)' },
  ];
  const add = () => {
    const n = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v.replace('−', '-'))])) as Record<keyof typeof values, number>;
    if (Object.values(n).some((v) => !Number.isFinite(v))) return setProblem('Every orbit value must be a number.');
    if (!name.trim()) return setProblem('Give it a name.');
    const m = MASSES.find((x) => x.id === mass)!;
    setProblem(null);
    onAdd({
      name: name.trim().slice(0, 40),
      gm: m.gm,
      radius: m.radius,
      colour: NEW_COLOURS[snap.ids.length % NEW_COLOURS.length],
      parent: parentId,
      orbit: { a: n.a, e: n.e, i: n.i * DEG, node: n.node * DEG, peri: n.peri * DEG, M: n.M * DEG },
    });
  };
  return (
    <details className={styles.box}>
      <summary>Add a body</summary>
      <div className={styles.form}>
        <label htmlFor={`${ids}-name`}>
          Name
          <input id={`${ids}-name`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <label htmlFor={`${ids}-mass`}>
          Mass
          <select id={`${ids}-mass`} value={mass} onChange={(e) => setMass(e.target.value)}>
            {MASSES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${ids}-parent`}>
          Going round
          <select id={`${ids}-parent`} value={parentId} onChange={(e) => setParent(e.target.value)}>
            {snap.ids.map((id, i) =>
              snap.gm[i] > 0 ? (
                <option key={id} value={id}>
                  {snap.names[i]}
                </option>
              ) : null,
            )}
          </select>
        </label>
        {fields.map((f) => (
          <label key={f.key} htmlFor={`${ids}-${f.key}`}>
            {f.label}
            <input id={`${ids}-${f.key}`} inputMode="decimal" value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className={styles.buttons}>
        <button type="button" className={figureStyles.toolButton} onClick={add} disabled={snap.ids.length >= 50}>
          Add it
        </button>
      </div>
      {problem && (
        <p className={styles.error} role="alert">
          {problem}
        </p>
      )}
      <p className={styles.note}>Its orbit is measured from the body it goes round. Up to 50 bodies.</p>
    </details>
  );
}

function BodyTable({ snap, parents, selected, onPick }: { snap: OrrerySnapshot; parents: Parentage; selected: string | null; onPick: (id: string | null) => void }) {
  return (
    <div className={styles.tableWrap} style={{ marginTop: 16 }}>
      <table className={styles.table}>
        <caption className="visually-hidden">Every body’s orbit, measured now</caption>
        <thead>
          <tr>
            <th scope="col">Body</th>
            <th scope="col">Goes round</th>
            <th scope="col">Orbit size</th>
            <th scope="col">Eccentricity</th>
            <th scope="col">Tilt</th>
            <th scope="col">Once round</th>
          </tr>
        </thead>
        <tbody>
          {snap.ids.map((id, i) => {
            const orbit = parents.orbits[i];
            const p = parents.parent[i];
            return (
              <tr key={id}>
                <td>
                  <span className={styles.swatch} style={{ background: snap.colours[i] }} aria-hidden="true" />
                  <button type="button" className={styles.pick} aria-pressed={selected === id} onClick={() => onPick(selected === id ? null : id)}>
                    {snap.names[i]}
                  </button>
                </td>
                <td>{p >= 0 ? snap.names[p] : '—'}</td>
                <td>{orbit && orbit.a > 0 ? formatSize(orbit.a) : orbit ? 'unbound' : '—'}</td>
                <td>{orbit ? orbit.e.toFixed(3) : '—'}</td>
                <td>{orbit ? `${(orbit.i / DEG).toFixed(1)}°` : '—'}</td>
                <td>{orbit && orbit.a > 0 ? formatSpan(orbit.period) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
