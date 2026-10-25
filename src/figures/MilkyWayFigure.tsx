import { useMemo, useRef, useState, type ReactNode } from 'react';
import { apply } from '../core/math/vec3';
import { azAlt, type SkyCamera } from '../core/sky/projection';
import { ttFromUt, utFromTt } from '../core/time/deltaT';
import { clockTime, jdFromClockTime, jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { corePlace, placeZone, usePlace } from '../site/place';
import { Caption, Figure } from '../viz/Figure';
import { PlacePicker } from '../viz/place/PlacePicker';
import { DEFAULT_LAYERS, type SkyLayers, type SkyOverlay } from '../viz/sky/draw';
import { SkyView } from '../viz/sky/SkyView';
import { TimeControl } from '../viz/time/TimeControl';
import { useSkyClock } from '../viz/time/useSkyClock';
import { GALACTIC_ANTICENTRE, GALACTIC_CENTRE, galacticEquator } from './milkyWay';
import { LayerToggles } from './sky/SkyParts';
import { onSky } from './sky/legend';
import { useSkyModel } from './sky/useSkyModel';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The Milky Way in the sky: the pale band is the disc of our own Galaxy seen
 * from inside, and its midline (the galactic equator) runs right round the
 * sky. The centre lies in Sagittarius. The sky view, from the reader's place,
 * with the band, the midline and the direction of the centre marked.
 */

/** The whole sky, looking straight up with the horizon round the edge, so the band shows wherever it is. */
const HOME: SkyCamera = { az: Math.PI, alt: Math.PI / 2, fov: Math.PI };
const PLANE = '#f28cb1';
const CENTRE = '#ffd166';
const LAYERS: SkyLayers = { ...DEFAULT_LAYERS, starNames: false, constellationNames: true, milkyWay: true, planets: false };

/** 22:00 tonight, in the place's own time. */
function tonightTT(place: ReturnType<typeof usePlace>): number {
  const zone = placeZone(place);
  const t = clockTime(zone, jdNow());
  return ttFromUt(jdFromClockTime(zone, { ...t, hour: 22, minute: 0, second: 0 }));
}

function signedDegrees(radians: number): string {
  const d = Math.round(radians / DEG);
  return `${d < 0 ? '−' : ''}${Math.abs(d)}°`;
}

export function MilkyWayFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const place = usePlace();
  const [camera, setCamera] = useState<SkyCamera>(HOME);
  const [layers, setLayers] = useState<SkyLayers>(LAYERS);
  const [showPlane, setShowPlane] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const clock = useSkyClock(box, () => tonightTT(place), { speed: 600 });
  const where = corePlace(place);
  const { model } = useSkyModel(box, { jdTT: clock.jdTT, place: where, mode: 'horizon', daylight: false, bodies: false });
  const equator = useMemo(() => galacticEquator(240), []);

  const reset = () => {
    setCamera(HOME);
    setLayers(LAYERS);
    setShowPlane(true);
    setSelected(null);
    clock.setPlaying(false);
    clock.setJdTT(tonightTT(place));
  };

  const centreLocal = model ? apply(model.frames.fromJ2000, GALACTIC_CENTRE) : null;
  const centreAlt = centreLocal ? azAlt([centreLocal[0], centreLocal[1], centreLocal[2]]).alt : null;
  const overlays: SkyOverlay[] = useMemo(() => {
    if (!model || !showPlane) return [];
    const M = model.frames.fromJ2000;
    return [
      { kind: 'path', points: equator.map((v) => apply(M, v)), colour: PLANE, width: 1.5, dash: [6, 5], closed: true },
      { kind: 'marker', at: apply(M, GALACTIC_CENTRE), label: 'Centre of the Galaxy', colour: CENTRE, shape: 'cross', size: 9 },
      { kind: 'marker', at: apply(M, GALACTIC_ANTICENTRE), label: 'Directly away from the centre', colour: CENTRE, shape: 'ring', size: 7 },
    ];
  }, [model, showPlane, equator]);

  const lookAtCentre = () => {
    if (!centreLocal) return;
    const { az, alt } = azAlt([centreLocal[0], centreLocal[1], centreLocal[2]]);
    setCamera((c) => ({ ...c, az, alt: Math.max(alt, 15 * DEG) }));
  };

  /** 22:00 on the day shown. */
  const tonight = () => {
    const zone = placeZone(place);
    const t = clockTime(zone, utFromTt(clock.jdTT));
    clock.setJdTT(ttFromUt(jdFromClockTime(zone, { ...t, hour: 22, minute: 0, second: 0 })));
  };

  const caption =
    centreAlt === null
      ? 'Loading the stars…'
      : `${place.name}: the Milky Way is the disc of our own Galaxy seen edge-on from inside, so it rings the whole sky. Its centre, in Sagittarius, is ${
          centreAlt > 0 ? `${signedDegrees(centreAlt)} above the horizon` : `${signedDegrees(-centreAlt)} below the horizon, so the fainter part of the band, looking away from the centre, is up`
        }. (Stars are drawn as if it were night.)`;

  return (
    <Figure
      number={number}
      title="The Milky Way from inside"
      description="The night sky from your place, with the Milky Way’s pale band, the midline of the Galaxy’s disc (the galactic equator) right round the sky, and the direction of the Galaxy’s centre in Sagittarius and the opposite direction in Taurus. The band is brightest and widest towards the centre, which is best seen on summer evenings in the northern hemisphere and on winter evenings in the southern."
      height={860}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the Milky Way', symbol: onSky(<ellipse rx="10" ry="4" fill="rgb(176,196,255)" opacity="0.5" />) },
        { label: 'the midline of the Galaxy’s disc', symbol: onSky(<line x1="-10" y1="0" x2="10" y2="0" stroke={PLANE} strokeWidth="1.5" strokeDasharray="4 3" />) },
        { label: 'towards the centre of the Galaxy', symbol: onSky(<path d="M-6 0 H6 M0 -6 V6" stroke={CENTRE} strokeWidth="2" />) },
        { label: 'directly away from the centre', symbol: onSky(<circle r="5" fill="none" stroke={CENTRE} strokeWidth="1.5" />) },
      ]}
      simplified={
        <p>
          The band is a smoothed outline from star maps, not a photograph, and the stars are shown as if the sky were dark, whatever the time. The
          real Milky Way needs a dark sky far from towns, and its dark lanes, clouds of dust between us and the stars beyond, are left out.
        </p>
      }
    >
      <div ref={box}>
        <div className={styles.controls}>
          <PlacePicker />
          <TimeControl clock={clock} place={place}>
            <button type="button" className={figureStyles.toolButton} onClick={tonight}>
              At 22:00
            </button>
          </TimeControl>
          <LayerToggles
            layers={layers}
            onLayers={setLayers}
            toggles={[
              { key: 'constellations', label: 'Figures' },
              { key: 'constellationNames', label: 'Constellation names' },
              { key: 'milkyWay', label: 'Milky Way' },
              { key: 'ground', label: 'Ground' },
            ]}
          />
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <button type="button" className={figureStyles.toolButton} aria-pressed={showPlane} onClick={() => setShowPlane(!showPlane)}>
              {showPlane ? 'Hide' : 'Show'} the Galaxy’s midline
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={lookAtCentre} disabled={!model}>
              Look towards the centre
            </button>
          </div>
        </div>
        <SkyView
          model={model}
          camera={camera}
          onCamera={setCamera}
          home={HOME}
          layers={layers}
          overlays={overlays}
          selected={selected}
          onSelect={setSelected}
          label={`The Milky Way from ${place.name}`}
          inViewButtons={false}
          overlay={centreAlt === null ? null : <>Centre of the Galaxy {signedDegrees(centreAlt)}</>}
        />
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
