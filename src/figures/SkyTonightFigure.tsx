import { useMemo, useRef, useState, type ReactNode } from 'react';
import { moonPhaseName } from '../core/ephemeris/phase';
import { normalizeRadians } from '../core/math/angles';
import { azAlt, type SkyCamera } from '../core/sky/projection';
import { daylight as daylightStage } from '../core/sky/visibility';
import { ttFromUt, utFromTt } from '../core/time/deltaT';
import { clockTime, jdFromClockTime, jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { corePlace, placeZone, usePlace } from '../site/place';
import { Caption, Figure } from '../viz/Figure';
import { PlacePicker } from '../viz/place/PlacePicker';
import { DEFAULT_LAYERS, PLANET_COLOURS, type SkyLayers } from '../viz/sky/draw';
import { starLabel } from '../viz/sky/model';
import { SkyView } from '../viz/sky/SkyView';
import { TimeControl } from '../viz/time/TimeControl';
import { useSkyClock } from '../viz/time/useSkyClock';
import { describePick } from './sky/describe';
import { LayerToggles, PickedCard } from './sky/SkyParts';
import { onSky } from './sky/legend';
import { useSkyModel } from './sky/useSkyModel';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

const HOME: SkyCamera = { az: Math.PI, alt: 28 * DEG, fov: 100 * DEG };

const LOOK: { label: string; az: number; alt: number }[] = [
  { label: 'N', az: 0, alt: 25 * DEG },
  { label: 'E', az: 90 * DEG, alt: 25 * DEG },
  { label: 'S', az: 180 * DEG, alt: 25 * DEG },
  { label: 'W', az: 270 * DEG, alt: 25 * DEG },
  { label: 'Up', az: 180 * DEG, alt: 90 * DEG },
];

const DIRECTION_NAMES: Record<string, string> = { N: 'north', E: 'east', S: 'south', W: 'west', Up: 'straight up' };

/** The moment shown when the figure opens: now. */
const nowTT = () => ttFromUt(jdNow());

export function SkyTonightFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const place = usePlace();
  const [camera, setCamera] = useState<SkyCamera>(HOME);
  const [layers, setLayers] = useState<SkyLayers>(DEFAULT_LAYERS);
  const [daylight, setDaylight] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const clock = useSkyClock(box, nowTT, { speed: 600 });
  const where = corePlace(place);
  const { model } = useSkyModel(box, { jdTT: clock.jdTT, place: where, mode: 'horizon', daylight });

  const reset = () => {
    setCamera(HOME);
    setLayers(DEFAULT_LAYERS);
    setDaylight(true);
    setSelected(null);
    clock.setPlaying(false);
    clock.setJdTT(nowTT());
  };

  /** Tonight at 22:00 local time (or now, if it's already the middle of the night). */
  const tonight = () => {
    const zone = placeZone(place);
    const t = clockTime(zone, utFromTt(clock.jdTT));
    if (t.hour >= 22 || t.hour < 4) return;
    clock.setJdTT(ttFromUt(jdFromClockTime(zone, { ...t, hour: 22, minute: 0, second: 0 })));
  };

  const lookAt = (local: [number, number, number] | readonly [number, number, number]) => {
    const { az, alt } = azAlt([local[0], local[1], local[2]]);
    setCamera((c) => ({ ...c, az, alt: Math.max(alt, c.fov > 1.2 ? 10 * DEG : alt) }));
  };

  const facts = model && selected ? describePick(model, selected, where.latitude) : null;
  const findOptions = useMemo(() => {
    if (!model) return [];
    const bodies = model.bodies.map((b) => ({ id: `body:${b.name}`, name: b.label }));
    const stars = [...model.data.stars.names.entries()]
      .filter(([i]) => model.data.stars.mag[i] < 2.1 || model.data.stars.names.get(i) === 'Polaris')
      .map(([i]) => ({ id: `star:${i}`, name: starLabel(model.data.stars, i) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...bodies, ...stars];
  }, [model]);

  // The caption: what time of day it is, and what's up.
  const sun = model?.bodies.find((b) => b.name === 'sun');
  const moon = model?.bodies.find((b) => b.name === 'moon');
  const sunAlt = model?.sunAltitude ?? null;
  const stage = sunAlt === null ? null : daylightStage(sunAlt);
  let starsUp = 0;
  if (model) for (let i = 0; i < model.data.stars.count; i++) if (model.starLocal[3 * i + 2] > 0 && model.starMag[i] <= model.limit) starsUp++;
  const planetsUp = model?.bodies.filter((b) => b.name !== 'sun' && b.name !== 'moon' && b.local[2] > 0 && b.magnitude < 6).map((b) => b.label) ?? [];

  return (
    <Figure
      number={number}
      title="The sky tonight"
      description="A live map of the sky from where you are, at the time you choose: the stars down to magnitude 6.5, coloured by temperature, the constellation figures, the Milky Way, the Sun, the Moon in its phase and the planets, above a horizon with the compass points. You can change the place and the time, turn the view to any direction, find a star or planet by name, and run the clock to watch the sky turn."
      height={820}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a star: bigger is brighter, coloured by its temperature', symbol: onSky(<circle r="4" fill="#ffd2a1" />) },
        { label: 'a planet', symbol: onSky(<circle r="4.5" fill={PLANET_COLOURS.jupiter} stroke="#000" strokeWidth="0.5" />) },
        { label: 'a constellation figure', symbol: onSky(<path d="M-9 4 L-2 -5 L5 2 L10 -6" fill="none" stroke="#76a0eb" strokeWidth="1.5" />) },
        { label: 'the horizon, with the ground below it', symbol: onSky(<path d="M-11 0 H11 M-11 5 H11" stroke="#8cbe8c" strokeWidth="2" />) },
        { label: 'the Milky Way', symbol: onSky(<ellipse rx="10" ry="4" fill="rgb(176,196,255)" opacity="0.5" />) },
      ]}
      simplified={
        <>
          <p>
            The stars are the 8,900 in the HYG catalogue down to magnitude 6.5, the faintest a sharp eye sees under a perfectly dark sky. Real skies
            are rarely that dark: from a town you might see a few hundred. Star dots grow with brightness, but squeezed, so Sirius doesn’t swamp
            the screen.
          </p>
          <p>
            Positions are good to well under a Moon’s width: the stars move with their own motions, the Sun, the Moon and the planets come from
            published formulas, and refraction lifts things near the horizon. The tiny wobbles called nutation and aberration (under 20″) are left
            out. The daytime and twilight colours are a simple sketch, not a model of the atmosphere, and there is no haze, light pollution or
            weather.
          </p>
        </>
      }
    >
      <div ref={box}>
        <div className={styles.controls}>
          <PlacePicker />
          <TimeControl clock={clock} place={place}>
            <button type="button" className={figureStyles.toolButton} onClick={tonight}>
              Tonight at 22:00
            </button>
          </TimeControl>
          <LayerToggles
            layers={layers}
            onLayers={setLayers}
            daylight={daylight}
            onDaylight={setDaylight}
            toggles={[
              { key: 'constellations', label: 'Figures' },
              { key: 'constellationNames', label: 'Constellation names' },
              { key: 'starNames', label: 'Star names' },
              { key: 'boundaries', label: 'Boundaries' },
              { key: 'milkyWay', label: 'Milky Way' },
              { key: 'grid', label: 'Altitude grid' },
              { key: 'equator', label: 'Celestial equator' },
              { key: 'ecliptic', label: 'Ecliptic' },
              { key: 'daylight', label: 'Daylight' },
              { key: 'ground', label: 'Ground' },
            ]}
          />
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <span className={styles.togglesLabel}>Look</span>
            <span className={figureStyles.segmented}>
              {LOOK.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  aria-label={`Look ${DIRECTION_NAMES[d.label]}`}
                  aria-pressed={Math.abs(normalizeRadians(camera.az - d.az)) < 1e-6 && Math.abs(camera.alt - d.alt) < 1e-6}
                  onClick={() => setCamera((c) => ({ ...c, az: d.az, alt: d.alt }))}
                >
                  {d.label}
                </button>
              ))}
            </span>
            <label className={figureStyles.inputLabel}>
              Find
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id || !model) return;
                  const f = describePick(model, id, where.latitude);
                  if (f) lookAt(f.local);
                  setSelected(id);
                }}
              >
                <option value="">Choose…</option>
                {findOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <SkyView
          model={model}
          camera={camera}
          onCamera={setCamera}
          home={HOME}
          layers={layers}
          selected={selected}
          onSelect={setSelected}
          label={`The sky from ${place.name}`}
          overlay={
            model ? (
              <>
                {stage === 'day' ? 'Daytime' : stage ? stage[0].toUpperCase() + stage.slice(1) : ''}
                {sun ? ` · Sun ${(sunAlt! / DEG).toFixed(0)}°` : ''}
              </>
            ) : null
          }
        />

        <div aria-live="polite">
          {facts ? (
            <PickedCard facts={facts} onLook={() => lookAt(facts.local)} onClose={() => setSelected(null)} />
          ) : (
            <p className={styles.hint}>Click a star or planet, or use Find, to see what it is.</p>
          )}
        </div>
      </div>
      <Caption>
        {model && sunAlt !== null ? (
          <>
            <b>
              {place.name}, {stage === 'day' ? 'daytime' : stage}:
            </b>{' '}
            {stage === 'day' && daylight
              ? 'the Sun is up and its light, scattered by the air, hides the stars. Switch Daylight off, or press Tonight, to see them.'
              : `${starsUp.toLocaleString('en-GB')} stars are above the horizon${daylight && model.limit < 6.4 ? ' and bright enough to see in this light' : ''}.`}{' '}
            {moon && moon.local[2] > 0 ? `The Moon is up, ${moonPhaseName(clock.jdTT)}. ` : ''}
            {planetsUp.length ? `Planets up: ${planetsUp.join(', ')}.` : ''}
            {!model.planetsShown && ' (Planets are only shown from 3000 BC to AD 3000.)'}
          </>
        ) : (
          'Loading the stars…'
        )}
      </Caption>
    </Figure>
  );
}
