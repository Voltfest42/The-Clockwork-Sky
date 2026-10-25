import { useMemo, useRef, useState, type ReactNode } from 'react';
import { PLANETS, type PlanetName } from '../core/ephemeris/meanLongitude';
import { jdFromUnixMs } from '../core/time/julian';
import { MOONS_AS_OF } from '../data/planets';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { threeFigures } from './planetCards';
import { dateLabel } from './retrograde';
import { onSky } from './sky/legend';
import { BELTS, distanceBetween, lightTime, orbitPath, PLANET_WORLDS, planetAt, sizeRow, VIEW_NAMES, VIEW_REACH, type DistanceView } from './solarSystem';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The Solar System today: the planets where they really are (from the
 * planetary model), seen from above, at four zooms; or side by side at their
 * true sizes against the edge of the Sun. Pick a planet for its card.
 */

const W = 560;
const H = 460;
const SIZES_H = 250;
const SUN_PX = 500;
/** Simulated days per second of play, for each view. */
const SPEED: Record<DistanceView, number> = { inner: 20, jupiter: 120, neptune: 2500, kuiper: 5000 };
const VIEWS = Object.keys(VIEW_REACH) as DistanceView[];
const BELT = '#8a7a5c';
const KUIPER = '#5c7a8a';
const SELECTED = '#ffffff';

function annulus(cx: number, cy: number, r0: number, r1: number): string {
  const circle = (r: number) => `M${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} Z`;
  return `${circle(r1)} ${circle(r0)}`;
}

export function SolarSystemFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  // Noon today: a day's 0h UT minus ΔT would be the evening before.
  const [today] = useState(() => Math.floor(jdFromUnixMs(Date.now()) - 0.5) + 1);
  const [mode, setMode] = useState<'distances' | 'sizes'>('distances');
  const [view, setView] = useState<DistanceView>('jupiter');
  const [selected, setSelected] = useState<PlanetName>('earth');
  const [offset, setOffset] = useState(0);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  useAnimationFrame(playing && onScreen && mode === 'distances', (dt) => {
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      setOffset((o) => o + SPEED[view] / 2);
      return;
    }
    setOffset((o) => o + SPEED[view] * dt);
  });

  const reset = () => {
    setMode('distances');
    setView('jupiter');
    setSelected('earth');
    setOffset(0);
    setPlaying(false);
  };

  const jd = today + offset;
  const orbits = useMemo(() => Object.fromEntries(PLANETS.map((p) => [p, orbitPath(p, today)])) as Record<PlanetName, { x: number; y: number }[]>, [today]);
  const positions = Object.fromEntries(PLANETS.map((p) => [p, planetAt(p, jd)])) as Record<PlanetName, ReturnType<typeof planetAt>>;
  const world = PLANET_WORLDS.find((w) => w.id === selected)!;
  const fromSun = positions[selected].r;
  const fromEarth = selected === 'earth' ? 0 : distanceBetween(selected, 'earth', jd);
  const date = dateLabel(jd);

  const reach = VIEW_REACH[view];
  const scale = (H / 2 - 18) / reach;
  const cx = W / 2;
  const cy = H / 2;
  const sx = (x: number) => cx + x * scale;
  const sy = (y: number) => cy - y * scale;
  const inView = PLANETS.filter((p) => positions[p].r <= reach * 1.02);
  // Labels go on in order of interest (the picked planet, Earth, then the biggest), skipping any that would overlap one already placed.
  const labelled = new Set<PlanetName>();
  const dots = PLANETS.map((p) => [sx(positions[p].x) - 6, sy(positions[p].y) - 6, sx(positions[p].x) + 6, sy(positions[p].y) + 6] as [number, number, number, number]);
  const boxes: [number, number, number, number][] = [[cx - 12, cy - 12, cx + 12, cy + 12], ...dots];
  for (const p of [...PLANETS].sort((a, b) => rank(b) - rank(a))) {
    const w = PLANET_WORLDS.find((x) => x.id === p)!;
    const x = sx(positions[p].x) + 10;
    const y = sy(positions[p].y) - 8;
    const box: [number, number, number, number] = [x - 2, y - 11, x + 7 * w.name.length, y + 3];
    if (boxes.some((b, i) => i - 1 !== PLANETS.indexOf(p) && box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    boxes.push(box);
    labelled.add(p);
  }
  function rank(p: PlanetName): number {
    return (p === selected ? 1e7 : 0) + (p === 'earth' ? 1e6 : 0) + PLANET_WORLDS.find((x) => x.id === p)!.diameterKm;
  }

  const row = sizeRow(SUN_PX, 40, 12);

  const caption =
    mode === 'distances'
      ? `${date}. ${VIEW_NAMES[view]}: ${inView.length === 8 ? 'all eight planets' : inView.map((p) => PLANET_WORLDS.find((w) => w.id === p)!.name).join(', ')}, seen from above, where they really are. The planets are drawn as dots far bigger than they are; at this scale even Jupiter would be ${((142_984 / 149_597_870.7) * scale).toFixed(2)} pixels across.`
      : `The planets side by side at their true sizes, against the edge of the Sun. Jupiter is about a tenth of the Sun’s width, and Earth about a tenth of Jupiter’s. The distances between them are left out: at this scale Earth would sit 107 Sun-widths from the Sun, and Neptune 3,200.`;

  return (
    <Figure
      number={number}
      title="The Solar System today"
      description="The eight planets seen from above, at their real positions today, with their orbits, the asteroid belt and the Kuiper belt, at four zooms from the inner planets out to the Kuiper belt. A switch shows the planets side by side at their true sizes against the edge of the Sun instead. Picking a planet opens its card: how far it is from the Sun and from Earth today, how big it is, its year and its moons."
      height={820}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'the Sun', symbol: onSky(<circle r="6" fill="var(--sun)" />) },
        { label: 'a planet (picked: ringed)', symbol: onSky(<><circle r="4" fill="#4f8cf5" /><circle r="7.5" fill="none" stroke={SELECTED} strokeWidth="1.2" /></>) },
        { label: 'an orbit', symbol: onSky(<circle r="8" fill="none" stroke="#5c6b8a" strokeWidth="1" />) },
        { label: 'the asteroid belt', symbol: onSky(<circle r="6" fill="none" stroke={BELT} strokeWidth="4" opacity="0.7" />) },
        { label: 'the Kuiper belt', symbol: onSky(<circle r="6" fill="none" stroke={KUIPER} strokeWidth="4" opacity="0.7" />) },
      ]}
      simplified={
        <p>
          Positions come from JPL’s planetary model (good to a fraction of a degree) and are seen from above the plane of Earth’s orbit, with each
          planet’s small tilt flattened. In the distances view the Sun and planets are drawn as dots far bigger than they really are; in the sizes
          view the distances are left out. The belts are drawn as plain bands from 2.1 to 3.3 AU and from 30 to 50 AU.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Show">
            <button type="button" aria-pressed={mode === 'distances'} onClick={() => setMode('distances')}>
              True distances
            </button>
            <button
              type="button"
              aria-pressed={mode === 'sizes'}
              onClick={() => {
                setMode('sizes');
                setPlaying(false);
              }}
            >
              True sizes
            </button>
          </span>
          {mode === 'distances' && (
            <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
              {playing ? '❚❚ Pause' : '▶ Play'}
            </button>
          )}
        </div>
        {mode === 'distances' && (
          <div className={styles.presets} role="group" aria-label="Zoom" style={{ marginBottom: 10 }}>
            {VIEWS.map((v) => (
              <button key={v} type="button" className={styles.toggle} aria-pressed={view === v} onClick={() => setView(v)}>
                {VIEW_NAMES[v]}
              </button>
            ))}
          </div>
        )}
        {mode === 'distances' ? (
          <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={caption}>
            <rect width={W} height={H} fill="#070b16" />
            <clipPath id="solar-system-clip">
              <rect width={W} height={H} />
            </clipPath>
            <g clipPath="url(#solar-system-clip)">
              <path d={annulus(cx, cy, BELTS.asteroids[0] * scale, BELTS.asteroids[1] * scale)} fill={BELT} fillOpacity={0.28} fillRule="evenodd" />
              {view !== 'inner' && view !== 'jupiter' && (
                <path d={annulus(cx, cy, BELTS.kuiper[0] * scale, BELTS.kuiper[1] * scale)} fill={KUIPER} fillOpacity={0.3} fillRule="evenodd" />
              )}
              {PLANETS.map((p) => (
                <path
                  key={p}
                  d={orbits[p].map((q, i) => `${i ? 'L' : 'M'}${sx(q.x).toFixed(1)} ${sy(q.y).toFixed(1)}`).join(' ') + 'Z'}
                  fill="none"
                  stroke={p === selected ? '#8fa3c8' : '#3e4a66'}
                  strokeWidth={p === selected ? 1.4 : 1}
                />
              ))}
              <circle cx={cx} cy={cy} r={view === 'inner' ? 9 : 6} fill="var(--sun)" />
              {PLANETS.map((p) => {
                const w = PLANET_WORLDS.find((x) => x.id === p)!;
                const x = sx(positions[p].x);
                const y = sy(positions[p].y);
                const big = p === 'jupiter' || p === 'saturn';
                return (
                  <g key={p} onClick={() => setSelected(p)} style={{ cursor: 'pointer' }}>
                    <circle cx={x} cy={y} r={14} fill="transparent" />
                    <circle cx={x} cy={y} r={big ? 6 : 4.5} fill={w.colour} />
                    {p === selected && <circle cx={x} cy={y} r={big ? 10 : 8.5} fill="none" stroke={SELECTED} strokeWidth="1.3" />}
                    {labelled.has(p) && (
                      <text x={x + 10} y={y - 8} fontSize="12" fill={p === selected ? 'var(--sky-text)' : 'var(--sky-muted)'}>
                        {w.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
            <text x={14} y={22} fontSize="13" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {date}
            </text>
            <text x={14} y={H - 14} fontSize="12" fill="var(--sky-muted)">
              {reach >= 10 ? `${Math.round(reach)}` : reach} AU from the Sun to the edge
            </text>
          </svg>
        ) : (
          <svg viewBox={`0 0 ${W} ${SIZES_H}`} className={seasonStyles.svg} role="img" aria-label={caption}>
            <rect width={W} height={SIZES_H} fill="#070b16" />
            <clipPath id="solar-sizes-clip">
              <rect width={W} height={SIZES_H} />
            </clipPath>
            <circle cx={40 - SUN_PX} cy={SIZES_H / 2} r={SUN_PX} fill="var(--sun)" clipPath="url(#solar-sizes-clip)" />
            <text x={6} y={SIZES_H / 2 + 4} fontSize="12" fill="#3a2a00">
              Sun
            </text>
            {row.map((p, i) => {
              const w = PLANET_WORLDS.find((x) => x.id === p.id)!;
              const below = i % 2 === 0;
              const ty = below ? SIZES_H / 2 + Math.max(p.r, 6) + 16 : SIZES_H / 2 - Math.max(p.r, 6) - 8;
              return (
                <g key={p.id} onClick={() => setSelected(p.id)} style={{ cursor: 'pointer' }}>
                  <circle cx={p.x} cy={SIZES_H / 2} r={Math.max(p.r, 8)} fill="transparent" />
                  <circle cx={p.x} cy={SIZES_H / 2} r={p.r} fill={w.colour} />
                  {p.id === 'saturn' && (
                    <ellipse cx={p.x} cy={SIZES_H / 2} rx={p.r * 2.27} ry={p.r * 0.5} fill="none" stroke="#d8c08c" strokeOpacity={0.7} strokeWidth={p.r * 0.35} />
                  )}
                  {p.id === selected && <circle cx={p.x} cy={SIZES_H / 2} r={p.r + 4} fill="none" stroke={SELECTED} strokeWidth="1.3" />}
                  <text x={p.x} y={ty} fontSize="12" textAnchor="middle" fill={p.id === selected ? 'var(--sky-text)' : 'var(--sky-muted)'}>
                    {w.name}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        <div className={styles.presets} role="group" aria-label="Planet" style={{ marginTop: 10 }}>
          {PLANET_WORLDS.map((w) => (
            <button key={w.id} type="button" className={styles.toggle} aria-pressed={w.id === selected} onClick={() => setSelected(w.id)}>
              {w.name}
            </button>
          ))}
        </div>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h4 className={styles.cardTitle}>
              {world.name} <span className={styles.cardSubtitle}>· {world.kind}</span>
            </h4>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>From the Sun, {date}</dt>
              <dd>
                {fromSun.toFixed(2)} AU ({Math.round(fromSun * 149.6).toLocaleString('en-GB')} million km): sunlight takes {lightTime(fromSun)}
              </dd>
            </div>
            {selected !== 'earth' && (
              <div>
                <dt>From Earth</dt>
                <dd>
                  {fromEarth.toFixed(2)} AU: light takes {lightTime(fromEarth)}
                </dd>
              </div>
            )}
            <div>
              <dt>Width</dt>
              <dd>
                {world.diameterKm.toLocaleString('en-GB')} km{selected !== 'earth' && ` (${threeFigures(world.diameterKm / 12_756)} × Earth)`}
              </dd>
            </div>
            <div>
              <dt>A year</dt>
              <dd>{world.orbitDays < 1000 ? `${Math.round(world.orbitDays)} days` : `${(world.orbitDays / 365.25).toFixed(1)} Earth years`}</dd>
            </div>
            <div>
              <dt>Known moons ({MOONS_AS_OF})</dt>
              <dd>{world.moons}</dd>
            </div>
          </dl>
          <p className={styles.hint}>{world.note}</p>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
