import { useMemo, useRef, useState, type ReactNode } from 'react';
import { precessionMatrix } from '../core/coords/precession';
import { clamp, wrapPi } from '../core/math/angles';
import { apply, type Vec3 } from '../core/math/vec3';
import { horizonMatrix } from '../core/sky/frames';
import type { SkyCamera } from '../core/sky/projection';
import { countBrighterThan } from '../core/stars/catalogue';
import { starColour } from '../core/stars/photometry';
import { SIDEREAL_RATE } from '../core/time/sidereal';
import { ttFromUt, utFromTt } from '../core/time/deltaT';
import { clockTime, jdFromClockTime, jdNow } from '../core/time/zone';
import { localSiderealTime } from '../core/time/sidereal';
import { DEG } from '../core/units';
import { corePlace, placeZone, usePlace } from '../site/place';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { PlacePicker } from '../viz/place/PlacePicker';
import { DEFAULT_LAYERS, type SkyLayers, type SkyOverlay } from '../viz/sky/draw';
import { refract } from '../viz/sky/model';
import { SkyView } from '../viz/sky/SkyView';
import { formatMoment } from '../viz/time/format';
import { starJ2000 } from './sky/describe';
import { LayerToggles } from './sky/SkyParts';
import { onSky } from './sky/legend';
import { useSkyModel } from './sky/useSkyModel';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/** The longest exposure, hours. */
const MAX_HOURS = 12;
/** Stars down to this magnitude leave trails (a few hundred). */
const TRAIL_LIMIT = 3.6;

const LAYERS: SkyLayers = { ...DEFAULT_LAYERS, constellations: false, constellationNames: false, starNames: false, milkyWay: false };

type Direction = 'N' | 'E' | 'S' | 'W';
const DIRECTION_WORDS: Record<Direction, string> = { N: 'north', E: 'east', S: 'south', W: 'west' };

function cameraFor(direction: Direction, latitude: number): SkyCamera {
  const az = { N: 0, E: 90, S: 180, W: 270 }[direction] * DEG;
  // Facing the visible pole, aim a little below it so the whole circle of trails fits.
  const poleUp = (direction === 'N' && latitude > 0) || (direction === 'S' && latitude < 0);
  const alt = poleUp ? clamp(Math.abs(latitude) * 0.75, 18 * DEG, 60 * DEG) : 24 * DEG;
  return { az, alt, fov: 115 * DEG };
}

/** This evening at 20:00, local time, at a place. */
function eveningStart(zoneOf: ReturnType<typeof placeZone>): number {
  const t = clockTime(zoneOf, jdNow());
  return ttFromUt(jdFromClockTime(zoneOf, { ...t, hour: 20, minute: 0, second: 0 }));
}

export function StarTrailsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const place = usePlace();
  const where = corePlace(place);
  const zone = placeZone(place);
  const [start] = useState(() => eveningStart(zone));
  const [hours, setHours] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [direction, setDirection] = useState<Direction>(where.latitude >= 0 ? 'N' : 'S');
  const [camera, setCamera] = useState<SkyCamera>(() => cameraFor(where.latitude >= 0 ? 'N' : 'S', where.latitude));
  const [layers, setLayers] = useState<SkyLayers>(LAYERS);
  const [selected, setSelected] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const stepClock = useRef(0);
  const jdTT = start + hours / 24;
  const { data, model } = useSkyModel(box, { jdTT, place: where, mode: 'horizon', daylight: false, bodies: false });

  // The exposure runs at 1.5 hours a second; with reduced motion it jumps an hour at a time.
  useAnimationFrame(playing && onScreen, (dt) => {
    let next: number;
    if (reducedMotion) {
      stepClock.current += dt;
      if (stepClock.current < 0.7) return;
      stepClock.current = 0;
      next = Math.floor(hours + 1e-9) + 1;
    } else next = hours + 1.5 * dt;
    next = Math.min(MAX_HOURS, next);
    setHours(next);
    if (next >= MAX_HOURS) setPlaying(false);
  });

  // Each star's direction in the equator of date, once; then its trail is just the sky turning about the pole.
  const ofDate = useMemo(() => {
    if (!data) return null;
    const n = countBrighterThan(data.stars, TRAIL_LIMIT);
    const P = precessionMatrix(start);
    const epoch = 2000 + (start - 2_451_545) / 365.25;
    return Array.from({ length: n }, (_, i) => ({ v: apply(P, starJ2000(data, i, epoch)), mag: data.stars.mag[i], bv: data.stars.bv[i] }));
  }, [data, start]);

  const lst0 = localSiderealTime(utFromTt(start), where.longitude);
  const turned = (hours / 24) * SIDEREAL_RATE * 2 * Math.PI; // radians the sky has turned
  const shown = Math.round(hours * 20) / 20; // recompute trails every 3 minutes of exposure
  const overlays = useMemo<SkyOverlay[]>(() => {
    if (!ofDate) return [];
    const angle = (shown / 24) * SIDEREAL_RATE * 2 * Math.PI;
    const steps = Math.max(1, Math.ceil(angle / DEG));
    const bright: Float64Array[] = [];
    const brightColours: string[] = [];
    const faint: Float64Array[] = [];
    const faintColours: string[] = [];
    const matrices = Array.from({ length: steps + 1 }, (_, k) => horizonMatrix(lst0 + (angle * k) / steps, where.latitude));
    for (const star of ofDate) {
      const path = new Float64Array(3 * (steps + 1));
      for (let k = 0; k <= steps; k++) {
        let local: Vec3 = apply(matrices[k], star.v);
        if (local[2] > -0.05) local = refract(local);
        path[3 * k] = local[0];
        path[3 * k + 1] = local[1];
        path[3 * k + 2] = local[2];
      }
      const [r, g, b] = starColour(star.bv);
      const colour = `rgb(${r},${g},${b})`;
      if (star.mag < 1.6) {
        bright.push(path);
        brightColours.push(colour);
      } else {
        faint.push(path);
        faintColours.push(colour);
      }
    }
    const pole = apply(horizonMatrix(lst0, where.latitude), [0, 0, where.latitude >= 0 ? 1 : -1]);
    return [
      { kind: 'trails', paths: faint, colours: faintColours, width: 1, alpha: 0.75 },
      { kind: 'trails', paths: bright, colours: brightColours, width: 2, alpha: 0.9 },
      { kind: 'marker', at: pole, shape: 'cross', colour: '#ffd166', size: 6, label: where.latitude >= 0 ? 'North celestial pole' : 'South celestial pole' },
    ];
  }, [ofDate, shown, lst0, where.latitude]);

  const look = (d: Direction) => {
    setDirection(d);
    setCamera(cameraFor(d, where.latitude));
  };

  const reset = () => {
    setHours(0);
    setPlaying(false);
    setSelected(null);
    setLayers(LAYERS);
    look(where.latitude >= 0 ? 'N' : 'S');
  };

  const degreesTurned = (turned / DEG).toFixed(0);
  // A heading button stays pressed only while the view is still where it put it, as in Figure 2.1; turned by hand, the
  // words describe the nearest compass point instead.
  const aimed = cameraFor(direction, where.latitude);
  const onHeading = Math.abs(wrapPi(camera.az - aimed.az)) < 1e-6 && Math.abs(camera.alt - aimed.alt) < 1e-6;
  const facing: Direction = onHeading ? direction : (['N', 'E', 'S', 'W'] as const)[Math.round(((camera.az / DEG) % 360 + 360) % 360 / 90) % 4];
  const facingPole = (facing === 'N' && where.latitude > 0) || (facing === 'S' && where.latitude < 0);
  const shape =
    Math.abs(where.latitude) > 89 * DEG
      ? 'At the pole, every trail is a circle parallel to the horizon: nothing rises or sets.'
      : Math.abs(where.latitude) < 1 * DEG && (facing === 'E' || facing === 'W')
        ? `On the equator the trails go straight ${facing === 'E' ? 'up from' : 'down to'} the horizon.`
        : facingPole
          ? 'Facing the pole, the trails are circles round it, and the stars near it never set.'
          : facing === 'E'
            ? 'Facing east, the stars rise at a slant, all in parallel.'
            : facing === 'W'
              ? 'Facing west, they set at the same slant.'
              : 'Facing away from the pole, the trails are arcs that rise in the east and set in the west.';

  return (
    <Figure
      number={number}
      title="Star trails"
      description="A long-exposure photograph of the night sky, computed from the star catalogue. As the night runs, every star draws an arc about the celestial pole, 15° for every hour: circles round the pole facing north, rising slants facing east, arches facing south and setting slants facing west, from wherever you choose to stand."
      height={680}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a star’s trail during the exposure, in its own colour', symbol: onSky(<path d="M-10 6 A 12 12 0 0 1 8 -8" fill="none" stroke="#ffd2a1" strokeWidth="2" />) },
        { label: 'the celestial pole', symbol: onSky(<path d="M-6 0 H6 M0 -6 V6" stroke="#ffd166" strokeWidth="2" />) },
        { label: 'the horizon, with the ground below it', symbol: onSky(<path d="M-11 0 H11 M-11 5 H11" stroke="#8cbe8c" strokeWidth="2" />) },
      ]}
      simplified={
        <p>
          A real long exposure only shows trails while the sky is dark, so a summer night at high latitudes gives short trails or none. Here the
          daylight is switched off so the trails can run for twelve hours. Only the stars down to magnitude {TRAIL_LIMIT} leave trails, and the
          Moon and planets are left out.
        </p>
      }
    >
      <div ref={box}>
        <div className={styles.controls}>
          <PlacePicker />
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => (hours >= MAX_HOURS ? (setHours(0), setPlaying(true)) : setPlaying(!playing))}>
              {playing ? '❚❚ Pause' : hours >= MAX_HOURS ? '↺ Run again' : '▶ Run the night'}
            </button>
            <label className={styles.slider} style={{ flex: '1 1 260px' }}>
              Exposure
              <input
                type="range"
                min={0}
                max={MAX_HOURS}
                step={0.25}
                value={hours}
                onChange={(e) => {
                  setPlaying(false);
                  setHours(Number(e.target.value));
                }}
                aria-valuetext={`${hours.toFixed(2)} hours`}
              />
              <output>{hours.toFixed(1)} h</output>
            </label>
          </div>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <span className={styles.togglesLabel}>Face</span>
            <span className={figureStyles.segmented}>
              {(['N', 'E', 'S', 'W'] as const).map((d) => (
                <button key={d} type="button" aria-label={`Face ${DIRECTION_WORDS[d]}`} aria-pressed={onHeading && direction === d} onClick={() => look(d)}>
                  {d}
                </button>
              ))}
            </span>
            <LayerToggles layers={layers} onLayers={setLayers} toggles={[{ key: 'constellations', label: 'Figures' }, { key: 'starNames', label: 'Star names' }]} />
          </div>
        </div>
        <SkyView
          model={model}
          camera={camera}
          onCamera={setCamera}
          home={cameraFor(direction, where.latitude)}
          layers={layers}
          overlays={overlays}
          selected={selected}
          onSelect={setSelected}
          inViewButtons={false}
          label={`Star trails seen from ${place.name}, facing ${onHeading ? '' : 'roughly '}${DIRECTION_WORDS[facing]}`}
          description={`An exposure of ${hours.toFixed(1)} hours starting ${formatMoment(start, place, false)}: the sky has turned ${degreesTurned}°. ${shape}`}
          overlay={
            <>
              {hours.toFixed(1)} h exposure · sky turned {degreesTurned}°
            </>
          }
        />
      </div>
      <Caption>
        <b>
          {hours.toFixed(1)} hours from {formatMoment(start, place, false).split(', ')[1]}:
        </b>{' '}
        {hours < 0.25 ? 'Press Run the night to open the shutter.' : `the sky has turned ${degreesTurned}° about the pole, 15° an hour. ${shape}`}
      </Caption>
    </Figure>
  );
}
