import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { RetrogradeLoop } from '../core/ephemeris/wanderers';
import { apply } from '../core/math/vec3';
import { azAlt, type SkyCamera } from '../core/sky/projection';
import { constellationAt } from '../core/sky/charts';
import { jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { DEFAULT_LAYERS, type SkyLayers, type SkyOverlay } from '../viz/sky/draw';
import { SkyView } from '../viz/sky/SkyView';
import { onSky } from './sky/legend';
import { useSkyModel } from './sky/useSkyModel';
import { TRACK_COLOURS, WANDERER_NAMES } from './planetYear';
import { dateLabel, halfWindow, LOOP_PLANETS, loopAfter, loopBefore, orbitOutline, sampleLoop, sightDirection, spread, type LoopPlanet } from './retrograde';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * A planet's backward loop, two ways at once. Left: Earth and the planet from
 * above the Solar System, with numbered lines of sight from Earth through the
 * planet out to the distant stars. Right: the planet's path on the real star
 * chart over the same weeks, with the same numbers. Real positions for any
 * year from 3000 BC to AD 3000.
 */

const LAYERS: SkyLayers = { ...DEFAULT_LAYERS, ground: false, starNames: true, ecliptic: true, moon: false, planets: false };
const STEPS = 7;
const DAYS_PER_SECOND = 15;
const SIZE = 360;
const C = SIZE / 2;
const RIM = 160;
const EARTH_COLOUR = '#5b9bff';

export function RetrogradeFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [now] = useState(jdNow);
  const [planet, setPlanet] = useState<LoopPlanet>('mars');
  const [loop, setLoop] = useState<RetrogradeLoop>(() => loopAfter('mars', now - 200));
  const [offset, setOffset] = useState(() => -halfWindow('mars', loop));
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [manualCamera, setManualCamera] = useState<SkyCamera | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  const half = halfWindow(planet, loop);
  const from = loop.middle - half;
  const to = loop.middle + half;
  const t = loop.middle + offset;
  const { data, model } = useSkyModel(box, { jdTT: t, mode: 'chart', bodies: true });

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * DAYS_PER_SECOND;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 7;
    }
    setOffset((o) => {
      const next = o + step;
      if (next > half) {
        setPlaying(false);
        return half;
      }
      return next;
    });
  });

  const samples = useMemo(() => sampleLoop(planet, from, to, 1), [planet, from, to]);
  const marks = useMemo(() => Array.from({ length: STEPS }, (_, i) => samples[Math.round((i * (samples.length - 1)) / (STEPS - 1))]), [samples]);
  const orbits = useMemo(() => ({ earth: orbitOutline('earth', loop.middle), planet: orbitOutline(planet, loop.middle) }), [planet, loop.middle]);
  const index = Math.max(0, Math.min(samples.length - 1, Math.round(t - from)));
  const current = samples[index];

  // The diagram's scale: the planet's orbit (or Earth's, for Venus) fills the circle inside the rim.
  const extent = Math.max(1.02, ...orbits.planet.map((p) => Math.hypot(p.x, p.y)));
  const k = (RIM - 18) / extent;
  const toSvg = (p: { x: number; y: number }) => ({ x: C + k * p.x, y: C - k * p.y });
  // A line of sight's direction among the distant stars, as a point on the ring (as if they were infinitely far away)…
  const direction = (s: (typeof samples)[number]) => {
    const d = sightDirection(s.earth, s.planet);
    return { x: C + RIM * d.x, y: C - RIM * d.y };
  };
  // …and the line itself, from Earth through the planet and on, out of the picture.
  const sightEnd = (s: (typeof samples)[number]) => {
    const d = sightDirection(s.earth, s.planet);
    const e = toSvg(s.earth);
    return { x: e.x + 2 * SIZE * d.x, y: e.y - 2 * SIZE * d.y };
  };

  // The sky chart, centred on the loop, wide enough for the whole path.
  const middleDirection = samples[Math.floor(samples.length / 2)].direction;
  const fov = Math.min(100, Math.max(16, (2.4 * spread(samples.map((s) => s.direction))) / DEG)) * DEG;
  const home = useMemo<SkyCamera>(() => {
    if (!model) return { az: 0, alt: 0, fov };
    const { az, alt } = azAlt(apply(model.frames.fromJ2000, middleDirection));
    return { az, alt, fov };
  }, [model, middleDirection, fov]);
  const camera = manualCamera ?? home;

  const colour = TRACK_COLOURS[planet];
  const overlays = useMemo<SkyOverlay[]>(() => {
    if (!model) return [];
    const M = model.frames.fromJ2000;
    const points = samples.map((s) => apply(M, s.direction));
    const out: SkyOverlay[] = [{ kind: 'path', points, colour, width: 2 }];
    const a = Math.max(0, Math.round(loop.begins.jdTT - from));
    const b = Math.min(points.length - 1, Math.round(loop.ends.jdTT - from));
    out.push({ kind: 'path', points: points.slice(a, b + 1), colour, width: 4.5 });
    marks.forEach((m, i) => out.push({ kind: 'marker', at: apply(M, m.direction), shape: 'dot', colour: '#ffffff', size: 5, label: String(i + 1) }));
    out.push({ kind: 'marker', at: points[index], shape: 'ring', colour, size: 8, label: WANDERER_NAMES[planet] });
    return out;
  }, [model, samples, marks, index, colour, planet, loop, from]);

  const choosePlanet = (p: LoopPlanet) => {
    const next = loopAfter(p, now - 200);
    setPlanet(p);
    setLoop(next);
    setOffset(-halfWindow(p, next));
    setPlaying(false);
    setManualCamera(null);
  };
  const chooseLoop = (next: RetrogradeLoop) => {
    setLoop(next);
    setOffset(-halfWindow(planet, next));
    setPlaying(false);
    setManualCamera(null);
  };
  const reset = () => {
    choosePlanet('mars');
    setSelected(null);
  };

  const backwards = t > loop.begins.jdTT && t < loop.ends.jdTT;
  const nearStation = Math.min(Math.abs(t - loop.begins.jdTT), Math.abs(t - loop.ends.jdTT)) < 2.5;
  const motion = nearStation ? 'standing still' : backwards ? 'moving backwards (west)' : 'moving forwards (east)';
  const middleName = planet === 'venus' ? 'inferior conjunction (between us and the Sun)' : 'opposition (opposite the Sun)';
  const where = data ? constellationAt(data.constellations, current.direction) : null;
  const overtaking =
    planet === 'venus' ? 'Venus, on its smaller, faster orbit, is overtaking Earth on the inside' : `Earth, on its smaller, faster orbit, is overtaking ${WANDERER_NAMES[planet]} on the inside`;

  const E = toSvg(current.earth);
  const P = toSvg(current.planet);
  const end = sightEnd(current);
  const pointing = direction(current);

  return (
    <Figure
      number={number}
      title="Retrograde loops"
      description="Two linked views of a planet’s backward loop. On the left, Earth and the planet go round the Sun, seen from above, with numbered lines of sight from Earth through the planet to the distant stars. On the right, the planet’s path on a star chart over the same weeks: it slows, stops, moves backwards for a while and then carries on. The loop happens when Earth overtakes the planet."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'Earth, and its orbit', symbol: onSky(<circle r="5" fill={EARTH_COLOUR} />) },
        { label: 'the planet, and its path', symbol: onSky(<circle r="5" fill={colour} />) },
        { label: 'a line of sight from Earth through the planet, at equal steps of time', symbol: onSky(<path d="M-10 6 L10 -6" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.2" />) },
        { label: 'on the outer ring: the direction it points among the distant stars, numbered', symbol: onSky(<g><circle r="8" fill="none" stroke="#3b4c72" strokeDasharray="2 3" /><circle cx="0" cy="-8" r="2.5" fill="#fff" /></g>) },
        { label: 'thick: the backward stretch', symbol: onSky(<path d="M-10 0 H10" stroke={colour} strokeWidth="4.5" />) },
        { label: 'the ecliptic', symbol: onSky(<path d="M-11 0 H11" stroke="rgb(240,186,90)" strokeWidth="2" strokeDasharray="4 3" />) },
      ]}
      simplified={
        <p>
          Positions are real, from JPL’s orbital elements. The view from above flattens the orbits into one plane; the small tilts of the
          planets’ orbits are why the loop on the sky is a loop or a zigzag rather than a back-and-forth along one line. The distant stars are
          hundreds of thousands of times farther away than the planets, so the outer ring only shows directions: each number sits where its
          line of sight points, wherever Earth is. On the sky chart, as on any map of the sky seen from inside, east is to the left.
        </p>
      }
    >
      <div ref={box}>
        <div className={styles.controls}>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <span className={figureStyles.segmented} role="group" aria-label="Planet">
              {LOOP_PLANETS.map((p) => (
                <button key={p} type="button" aria-pressed={planet === p} onClick={() => choosePlanet(p)}>
                  {WANDERER_NAMES[p]}
                </button>
              ))}
            </span>
            <button type="button" className={figureStyles.toolButton} onClick={() => chooseLoop(loopBefore(planet, loop.middle - 1))} disabled={loop.middle < 628_000}>
              ← Previous loop
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={() => chooseLoop(loopAfter(planet, loop.middle + 1))} disabled={loop.middle > 2_814_500}>
              Next loop →
            </button>
          </div>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={figureStyles.toolButton}
              aria-pressed={playing}
              onClick={() => {
                if (!playing && offset >= half) setOffset(-half);
                setPlaying(!playing);
              }}
            >
              {playing ? '❚❚ Pause' : '▶ Play'}
            </button>
            <label className={styles.slider} style={{ flex: 1, minWidth: 220 }}>
              Date
              <input
                type="range"
                min={-half}
                max={half}
                step={1}
                value={Math.round(offset)}
                onChange={(e) => {
                  setOffset(Number(e.target.value));
                  setPlaying(false);
                }}
                aria-valuetext={`${dateLabel(t)}: ${WANDERER_NAMES[planet]} is ${motion}`}
              />
              <output>{dateLabel(t)}</output>
            </label>
          </div>
        </div>
        <div className={styles.split} style={{ marginTop: 10 }}>
          <div>
            <p className={styles.panelTitle}>From above the Solar System</p>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={seasonStyles.svg} role="img" aria-label={`Earth and ${WANDERER_NAMES[planet]} from above on ${dateLabel(t)}. ${overtaking}.`}>
              <circle cx={C} cy={C} r={RIM} fill="none" stroke="#3b4c72" strokeDasharray="2 5" />
              <text x={8} y={16} fontSize="10" fill="var(--sky-muted)">
                Outer ring: directions to the distant stars
              </text>
              <polyline points={orbits.earth.map((p) => `${toSvg(p).x.toFixed(1)},${toSvg(p).y.toFixed(1)}`).join(' ')} fill="none" stroke={EARTH_COLOUR} strokeOpacity="0.5" />
              <polyline points={orbits.planet.map((p) => `${toSvg(p).x.toFixed(1)},${toSvg(p).y.toFixed(1)}`).join(' ')} fill="none" stroke={colour} strokeOpacity="0.5" />
              {marks.map((m, i) => {
                const e = toSvg(m.earth);
                const p = toSvg(m.planet);
                const r = direction(m);
                const far = sightEnd(m);
                return (
                  <g key={m.jdTT}>
                    <line x1={e.x} y1={e.y} x2={far.x} y2={far.y} stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1" />
                    <circle cx={e.x} cy={e.y} r="2.5" fill={EARTH_COLOUR} />
                    <circle cx={p.x} cy={p.y} r="2.5" fill={colour} />
                    <circle cx={r.x} cy={r.y} r="3" fill="#ffffff" />
                    <text x={C + (r.x - C) * 1.08} y={C + (r.y - C) * 1.08 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">
                      {i + 1}
                    </text>
                  </g>
                );
              })}
              <line x1={E.x} y1={E.y} x2={end.x} y2={end.y} stroke={colour} strokeWidth="2" />
              <circle cx={pointing.x} cy={pointing.y} r="6" fill="none" stroke={colour} strokeWidth="2" />
              <circle cx={C} cy={C} r="9" fill="var(--sun)" />
              <circle cx={E.x} cy={E.y} r="6" fill={EARTH_COLOUR} />
              <circle cx={P.x} cy={P.y} r="6" fill={colour} />
              <text x={E.x + 9} y={E.y + 14} fontSize="11" fill="var(--sky-text)">
                Earth
              </text>
              <text x={P.x + 9} y={P.y - 8} fontSize="11" fill="var(--sky-text)">
                {WANDERER_NAMES[planet]}
              </text>
            </svg>
          </div>
          <div>
            <p className={styles.panelTitle}>The same weeks on the sky, from Earth</p>
            <SkyView
              model={model}
              camera={camera}
              onCamera={(c) => setManualCamera(c)}
              home={home}
              layers={LAYERS}
              overlays={overlays}
              selected={selected}
              onSelect={setSelected}
              label={`${WANDERER_NAMES[planet]}’s path against the stars from ${dateLabel(from)} to ${dateLabel(to)}`}
              description={`${WANDERER_NAMES[planet]} is in ${where?.name ?? '…'}, ${motion}.`}
              aspect={1}
              minHeight={260}
              maxHeight={420}
            />
          </div>
        </div>
        <div className={styles.readout}>
          <span>
            {WANDERER_NAMES[planet]} is <b>{motion}</b>
          </span>
          <span>
            Backwards from <b>{dateLabel(loop.begins.jdTT)}</b> to <b>{dateLabel(loop.ends.jdTT)}</b> ({Math.round(loop.days)} days, {(loop.arc / DEG).toFixed(0)}°)
          </span>
          <span>
            {planet === 'venus' ? 'Inferior conjunction' : 'Opposition'}: <b>{dateLabel(loop.middle)}</b>
          </span>
        </div>
      </div>
      <Caption>
        <b>{dateLabel(t)}:</b> {WANDERER_NAMES[planet]} is in {where?.name ?? '…'}, {motion}.{' '}
        {backwards
          ? `${overtaking}, so the line of sight swings backwards against the stars, as a slower car seems to slide backwards when you pass it.`
          : t < loop.begins.jdTT
            ? `${planet === 'venus' ? 'Venus is catching Earth up' : `Earth is catching ${WANDERER_NAMES[planet]} up`}; the backward stretch comes around ${middleName}.`
            : `The overtaking is over, and ${WANDERER_NAMES[planet]} moves east against the stars again.`}
      </Caption>
    </Figure>
  );
}
