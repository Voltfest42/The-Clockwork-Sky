import { useMemo, useRef, useState, type ReactNode } from 'react';
import { equatorPole } from '../core/coords/precession';
import { clamp } from '../core/math/angles';
import { angleBetween, apply, scale, type Vec3 } from '../core/math/vec3';
import type { SkyCamera } from '../core/sky/projection';
import { countBrighterThan } from '../core/stars/catalogue';
import { formatYear } from '../core/time/calendar';
import { J2000 } from '../core/time/julian';
import { DEG } from '../core/units';
import { corePlace, usePlace } from '../site/place';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { DEFAULT_LAYERS, type SkyLayers, type SkyOverlay } from '../viz/sky/draw';
import { starLabel } from '../viz/sky/model';
import { SkyView } from '../viz/sky/SkyView';
import { starJ2000 } from './sky/describe';
import { LayerToggles } from './sky/SkyParts';
import { onSky } from './sky/legend';
import { starIndices, useSkyModel } from './sky/useSkyModel';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/** Astronomical years: 10,000 BC is −9999. */
const FIRST = -9999;
const LAST = 16_000;
const TODAY = 2026;

const PRESETS: { year: number; label: string }[] = [
  { year: -2559, label: '2560 BC: the Great Pyramid' },
  { year: -129, label: '130 BC: Hipparchus' },
  { year: TODAY, label: 'Today' },
  { year: 2100, label: 'AD 2100' },
  { year: 13_600, label: 'AD 13,600' },
];

const FEATURED = ['Polaris', 'Thuban', 'Vega', 'Deneb', 'Alderamin', 'Kochab', 'Errai', 'Eltanin', 'Dubhe'];
/** Stars down to this magnitude can be a pole star (Thuban is 3.7). */
const POLE_STAR_LIMIT = 4;

const CHART_CAMERA: SkyCamera = { az: Math.PI, alt: Math.PI / 2, fov: 115 * DEG };
const CHART_LAYERS: SkyLayers = { ...DEFAULT_LAYERS, ground: false, starNames: false, milkyWay: true, planets: false };
const GROUND_LAYERS: SkyLayers = { ...DEFAULT_LAYERS, starNames: false, planets: false };

const jdOfYear = (year: number) => J2000 + (year - 2000) * 365.25;

/** The pole's path through the centuries, as J2000 directions, for the north or south celestial pole. */
function polePath(sign: 1 | -1): Vec3[] {
  const points: Vec3[] = [];
  for (let y = FIRST; y <= LAST; y += 100) points.push(scale(equatorPole(jdOfYear(y)), sign));
  return points;
}
const NORTH_PATH = polePath(1);
const SOUTH_PATH = polePath(-1);
/** Years labelled along the path: 10,000 BC to 2000 BC, then AD 2000 to AD 16,000. */
const TICKS = [-9999, -7999, -5999, -3999, -1999, 2000, 4000, 6000, 8000, 10_000, 12_000, 14_000, 16_000];

export function WanderingPoleFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const place = usePlace();
  const where = corePlace(place);
  const north = where.latitude >= 0;
  const [year, setYear] = useState(TODAY);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<'chart' | 'ground'>('chart');
  const [spin, setSpin] = useState(0); // hours the sky has turned in the view from the ground
  const [spinning, setSpinning] = useState(false);
  const groundCamera = useMemo<SkyCamera>(() => ({ az: north ? 0 : Math.PI, alt: clamp(Math.abs(where.latitude) * 0.8, 15 * DEG, 60 * DEG), fov: 110 * DEG }), [north, where.latitude]);
  const [camera, setCamera] = useState<SkyCamera>(CHART_CAMERA);
  const [layers, setLayers] = useState<SkyLayers>(CHART_LAYERS);
  const [selected, setSelected] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  const jdTT = jdOfYear(year) + (mode === 'ground' ? spin / 24 : 0);
  const { data, model } = useSkyModel(box, { jdTT, place: where, mode: mode === 'chart' ? 'chart' : 'horizon', daylight: false, bodies: false });

  // Play moves through the centuries at 400 years a second (with reduced motion, 500 years every half second).
  useAnimationFrame((playing || spinning) && onScreen, (dt) => {
    if (spinning) setSpin((h) => h + dt * 2);
    if (!playing) return;
    let step = dt * 400;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 500;
    }
    const next = Math.min(LAST, Math.round(year + step));
    setYear(next);
    if (next >= LAST) setPlaying(false);
  });

  const featured = useMemo(() => starIndices(data, FEATURED), [data]);
  const sign = mode === 'ground' && !north ? -1 : 1;
  const poleNow = useMemo(() => scale(equatorPole(jdOfYear(year)), sign), [year, sign]);

  // The nearest bright star to the pole in this year, with the stars' own motions.
  const poleStar = useMemo(() => {
    if (!data) return null;
    const n = countBrighterThan(data.stars, POLE_STAR_LIMIT);
    let best = { i: -1, separation: Infinity };
    for (let i = 0; i < n; i++) {
      const separation = angleBetween(starJ2000(data, i, year), poleNow);
      if (separation < best.separation) best = { i, separation };
    }
    return { name: starLabel(data.stars, best.i), separation: best.separation, index: best.i };
  }, [data, year, poleNow]);

  const overlays = useMemo<SkyOverlay[]>(() => {
    if (!model) return [];
    const M = model.frames.fromJ2000;
    const path = (sign > 0 ? NORTH_PATH : SOUTH_PATH).map((v) => apply(M, v));
    const ticks: SkyOverlay[] = TICKS.map((y) => ({
      kind: 'text',
      at: apply(M, scale(equatorPole(jdOfYear(y)), sign)),
      text: formatYear(y, 'always'),
      colour: 'rgba(255, 209, 102, 0.85)',
      small: true,
    }));
    return [
      { kind: 'path', points: path, colour: 'rgba(255, 209, 102, 0.75)', width: 1.5, dash: [5, 4] },
      ...ticks,
      { kind: 'marker', at: apply(M, poleNow), shape: 'ring', colour: '#ffd166', size: 8, label: `Pole in ${formatYear(year)}` },
    ];
  }, [model, poleNow, sign, year]);

  const reset = () => {
    setYear(TODAY);
    setPlaying(false);
    setSpinning(false);
    setSpin(0);
    setMode('chart');
    setCamera(CHART_CAMERA);
    setLayers(CHART_LAYERS);
    setSelected(null);
  };

  const switchMode = (m: 'chart' | 'ground') => {
    setMode(m);
    setSpinning(false);
    setCamera(m === 'chart' ? CHART_CAMERA : groundCamera);
    setLayers(m === 'chart' ? CHART_LAYERS : GROUND_LAYERS);
    setSelected(null);
  };

  const separationText = poleStar ? `${(poleStar.separation / DEG).toFixed(poleStar.separation < 2 * DEG ? 2 : 1)}°` : '';
  const verdict = !poleStar
    ? ''
    : poleStar.separation < 2.5 * DEG
      ? `${poleStar.name} is the pole star, ${separationText} from the pole.`
      : poleStar.separation < 6 * DEG
        ? `${poleStar.name} is the nearest bright star to the pole, ${separationText} away: a rough pole star.`
        : `No bright star is near the pole: the nearest, ${poleStar.name}, is ${separationText} away.`;

  return (
    <Figure
      number={number}
      title="The wandering pole"
      description="A star chart showing the path of the north celestial pole among the stars from 10,000 BC to AD 16,000, as Earth’s axis slowly wobbles (precession, one turn in about 26,000 years). It marks the pole stars of different ages: Thuban when the pyramids were built, Polaris today, Vega around AD 13,600. A second view shows the sky from your place in any year."
      height={670}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the celestial pole’s path, 10,000 BC to AD 16,000', symbol: onSky(<path d="M-10 4 Q 0 -8 10 4" fill="none" stroke="#ffd166" strokeWidth="1.5" strokeDasharray="4 3" />) },
        { label: 'the pole in the year shown', symbol: onSky(<circle r="6" fill="none" stroke="#ffd166" strokeWidth="2" />) },
        { label: 'a star: bigger is brighter', symbol: onSky(<circle r="3.5" fill="#fff" />) },
        { label: 'a constellation figure (it moves with its stars)', symbol: onSky(<path d="M-9 4 L-2 -5 L5 2 L10 -6" fill="none" stroke="#76a0eb" strokeWidth="1.5" />) },
      ]}
      simplified={
        <>
          <p>
            The pole’s path comes from the precession model of Vondrák, Capitaine and Wallace (2011), which follows Earth’s axis for 200,000
            years either way. It isn’t quite a circle: the ecliptic itself slowly tilts too, so the loop doesn’t close.
          </p>
          <p>
            Each star moves in a straight line through space at its measured speed. Over 26,000 years that is a very good guess for most stars,
            but the stars’ real paths curve round the Galaxy, and the speeds of distant stars are less certain. The chart is fixed to the ecliptic
            of the year 2000.
          </p>
        </>
      }
    >
      <div ref={box}>
        <div className={styles.controls}>
          <label className={styles.slider}>
            Year
            <input
              type="range"
              min={FIRST}
              max={LAST}
              step={50}
              value={year}
              onChange={(e) => {
                setPlaying(false);
                setYear(Number(e.target.value));
              }}
              aria-valuetext={formatYear(year, 'always')}
            />
            <output>{formatYear(year, 'always')}</output>
          </label>
          <div className={styles.presets}>
            <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => (year >= LAST ? (setYear(FIRST), setPlaying(true)) : setPlaying(!playing))}>
              {playing ? '❚❚ Pause' : year >= LAST ? '↺ Again from 10,000 BC' : '▶ Play the centuries'}
            </button>
            {PRESETS.map((p) => (
              <button
                key={p.year}
                type="button"
                className={figureStyles.toolButton}
                aria-pressed={year === p.year}
                onClick={() => {
                  setPlaying(false);
                  setYear(p.year);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <span className={figureStyles.segmented} role="group" aria-label="View">
              <button type="button" aria-pressed={mode === 'chart'} onClick={() => switchMode('chart')}>
                Chart round the pole
              </button>
              <button type="button" aria-pressed={mode === 'ground'} onClick={() => switchMode('ground')}>
                From {place.name.length < 16 ? place.name : 'your place'}
              </button>
            </span>
            {mode === 'ground' && (
              <button type="button" className={figureStyles.toolButton} aria-pressed={spinning} onClick={() => setSpinning(!spinning)}>
                {spinning ? '❚❚ Stop the sky' : '▶ Turn the sky'}
              </button>
            )}
            <LayerToggles layers={layers} onLayers={setLayers} toggles={[{ key: 'constellations', label: 'Figures' }, { key: 'starNames', label: 'Star names' }]} />
          </div>
        </div>
        <SkyView
          model={model}
          camera={camera}
          onCamera={setCamera}
          home={mode === 'chart' ? CHART_CAMERA : groundCamera}
          layers={layers}
          overlays={overlays}
          featured={featured}
          selected={selected}
          onSelect={setSelected}
          inViewButtons={false}
          label={mode === 'chart' ? `The sky round the north celestial pole in ${formatYear(year, 'always')}` : `The sky from ${place.name} in ${formatYear(year, 'always')}`}
          description={verdict}
          overlay={<>{formatYear(year, 'always')}</>}
        />
      </div>
      <Caption>
        <b>{formatYear(year, 'always')}:</b> {verdict}{' '}
        {mode === 'ground' && 'The sky turns about the pole of that year, so that is where the stars wheel.'}
        {year === -2559 && ' The builders of the Great Pyramid aligned it to true north, and Thuban was close to the pole.'}
        {year === 13_600 && ' Vega, the fifth-brightest star, will be a brilliant but rough pole star, about 6° off.'}
      </Caption>
    </Figure>
  );
}
