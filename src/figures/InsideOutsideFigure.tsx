import { useMemo, useRef, useState, type ReactNode } from 'react';
import { precessionMatrix } from '../core/coords/precession';
import { clamp } from '../core/math/angles';
import { apply } from '../core/math/vec3';
import type { SkyCamera } from '../core/sky/projection';
import { dailyPath, type DailyPath } from '../core/sky/visibility';
import { countBrighterThan, findStarByName } from '../core/stars/catalogue';
import { ttFromUt, utFromTt } from '../core/time/deltaT';
import { J2000, julianEpoch } from '../core/time/julian';
import { localSiderealTime } from '../core/time/sidereal';
import { jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { usePlace } from '../site/place';
import { Caption, Figure } from '../viz/Figure';
import { Scene3D } from '../viz/scene3d/Scene3D';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { DEFAULT_LAYERS, type SkyLayers } from '../viz/sky/draw';
import { starLabel } from '../viz/sky/model';
import { SkyView } from '../viz/sky/SkyView';
import { useSkyClock } from '../viz/time/useSkyClock';
import { PATH_COLOURS, sphereScene, type SphereState } from './insideOutside/sphereScene';
import { starJ2000 } from './sky/describe';
import { onSky } from './sky/legend';
import { starIndices, useSkyModel } from './sky/useSkyModel';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

const OUTSIDE_CAMERA: OrbitCameraState = { target: [0, 0, 0.05], azimuth: -2.25, elevation: 0.32, distance: 3.6 };
const LAYERS: SkyLayers = { ...DEFAULT_LAYERS, starNames: true, milkyWay: false, equator: true };
/** Stars on the outside view: down to this magnitude. */
const SPHERE_LIMIT = 3.2;
/** Stars whose daily circles are drawn. */
const CIRCLE_STARS = ['Polaris', 'Dubhe', 'Vega', 'Sirius', 'Canopus', 'Acrux'];

function insideCamera(latitude: number): SkyCamera {
  return { az: latitude >= 0 ? 0 : Math.PI, alt: clamp(Math.abs(latitude) * 0.55 + 8 * DEG, 15 * DEG, 52 * DEG), fov: 120 * DEG };
}

const PATH_HEADINGS: Record<DailyPath, string> = {
  circumpolar: 'Never set',
  'rises-and-sets': 'Rise and set',
  'never-rises': 'Never rise',
};

function formatLatitude(deg: number): string {
  if (Math.abs(deg) < 0.05) return '0° (the equator)';
  return `${Math.abs(deg).toFixed(1)}° ${deg > 0 ? 'N' : 'S'}`;
}

/** Fractions of the whole sky that never set, rise and set, and never rise, from latitude φ: (1 − cos φ)/2, cos φ, (1 − cos φ)/2. */
function skyShares(latitude: number) {
  const c = Math.cos(latitude);
  return { circumpolar: (1 - c) / 2, 'rises-and-sets': c, 'never-rises': (1 - c) / 2 };
}

const nowTT = () => ttFromUt(jdNow());

export function InsideOutsideFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const place = usePlace();
  const startLatitude = Math.round(place.latitude * 2) / 2;
  const [latitudeDeg, setLatitudeDeg] = useState(startLatitude);
  const latitude = latitudeDeg * DEG;
  const [camera, setCamera] = useState<SkyCamera>(() => insideCamera(startLatitude * DEG));
  const [cameraMoved, setCameraMoved] = useState(false);
  const [cameraReset, setCameraReset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const clock = useSkyClock(box, nowTT, { speed: 3600 });
  const where = useMemo(() => ({ latitude, longitude: place.longitude * DEG }), [latitude, place.longitude]);
  const { data, model } = useSkyModel(box, { jdTT: clock.jdTT, place: where, mode: 'horizon', daylight: false });
  const lst = localSiderealTime(utFromTt(clock.jdTT), where.longitude);
  const featured = useMemo(() => starIndices(data, ['Polaris', 'Polaris Australis']), [data]);

  // Bright stars in the equator of date, worked out again only when the year changes.
  const year = Math.round(julianEpoch(clock.jdTT));
  const ofDate = useMemo(() => {
    if (!data) return null;
    const P = precessionMatrix(J2000 + (year - 2000) * 365.25);
    const n = countBrighterThan(data.stars, SPHERE_LIMIT);
    return Array.from({ length: n }, (_, i) => ({ i, v: apply(P, starJ2000(data, i, year)) }));
  }, [data, year]);

  const sphereStars = useMemo(
    () => (ofDate && data ? ofDate.map(({ i, v }) => ({ v, size: data.stars.mag[i] < 1.5 ? 6 : 4, path: dailyPath(Math.asin(v[2]), latitude) })) : []),
    [ofDate, data, latitude],
  );
  const circles = useMemo(() => {
    if (!ofDate || !data) return [];
    return CIRCLE_STARS.map((name) => findStarByName(data.stars, name))
      .filter((i) => i >= 0 && i < ofDate.length)
      .map((i) => ({ v: ofDate[i].v, name: starLabel(data.stars, i), path: dailyPath(Math.asin(ofDate[i].v[2]), latitude) }));
  }, [ofDate, data, latitude]);
  const sphereState = useMemo<SphereState>(() => ({ latitude, lst, stars: sphereStars, circles }), [latitude, lst, sphereStars, circles]);

  // The brightest named stars, sorted by what they do from this latitude.
  const groups = useMemo(() => {
    const out: Record<DailyPath, string[]> = { circumpolar: [], 'rises-and-sets': [], 'never-rises': [] };
    if (!ofDate || !data) return out;
    for (const { i, v } of ofDate) {
      if (data.stars.mag[i] > 1.6 && data.stars.names.get(i) !== 'Polaris') continue;
      const name = data.stars.names.get(i);
      if (name) out[dailyPath(Math.asin(v[2]), latitude)].push(name);
    }
    return out;
  }, [ofDate, data, latitude]);

  const changeLatitude = (deg: number) => {
    setLatitudeDeg(deg);
    if (!cameraMoved) setCamera(insideCamera(deg * DEG));
  };

  const reset = () => {
    setLatitudeDeg(startLatitude);
    setCamera(insideCamera(startLatitude * DEG));
    setCameraMoved(false);
    setCameraReset((n) => n + 1);
    setSelected(null);
    clock.setPlaying(false);
    clock.setJdTT(nowTT());
  };

  const shares = skyShares(latitude);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const poleName = latitude >= 0 ? 'north' : 'south';
  const description =
    Math.abs(latitudeDeg) > 89.9
      ? `At the ${poleName} pole the celestial pole is straight overhead. The stars circle parallel to the horizon: half the sky never sets and the other half never rises.`
      : Math.abs(latitudeDeg) < 0.05
        ? 'On the equator both celestial poles sit on the horizon, due north and due south. Every star rises straight up in the east and sets straight down in the west, and is up for half of each day.'
        : `The ${poleName} celestial pole stands ${Math.abs(latitudeDeg).toFixed(1)}° above the ${poleName}ern horizon, the same as your latitude. The sky turns about the axis through it. Stars within ${Math.abs(latitudeDeg).toFixed(0)}° of that pole never set (${pct(shares.circumpolar)} of the sky); the same share round the other pole never rises.`;

  return (
    <Figure
      number={number}
      title="Inside and outside"
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'never sets from here', symbol: onSky(<circle r="5" fill={PATH_COLOURS.circumpolar} />) },
        { label: 'rises and sets', symbol: onSky(<circle r="5" fill={PATH_COLOURS['rises-and-sets']} />) },
        { label: 'never rises from here', symbol: onSky(<circle r="5" fill={PATH_COLOURS['never-rises']} />) },
        { label: 'the sky’s axis, through the celestial poles', symbol: onSky(<path d="M-10 6 L10 -6" stroke="#ffd166" strokeWidth="2" />) },
        { label: 'the celestial equator', symbol: onSky(<path d="M-11 0 H11" stroke="#5ad2d2" strokeWidth="2" />) },
        { label: 'your horizon', symbol: onSky(<path d="M-11 0 H11" stroke="#8cbe8c" strokeWidth="3" />) },
      ]}
      simplified={
        <p>
          In the view from outside, Earth is drawn huge and the sky tiny: really, Earth is a speck at the centre of a sphere of stars so far away
          that your horizon and Earth’s centre see the same sky. Only the stars down to magnitude {SPHERE_LIMIT} are shown there. Refraction,
          which lifts stars near the horizon by about half a degree, is left out of the split into three groups.
        </p>
      }
    >
      <div ref={box}>
        <div className={styles.controls}>
          <label className={styles.slider}>
            Latitude
            <input
              type="range"
              min={-90}
              max={90}
              step={0.5}
              value={latitudeDeg}
              onChange={(e) => changeLatitude(Number(e.target.value))}
              aria-valuetext={formatLatitude(latitudeDeg)}
            />
            <output>{formatLatitude(latitudeDeg)}</output>
          </label>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <button type="button" className={figureStyles.toolButton} aria-pressed={clock.playing} onClick={() => clock.setPlaying(!clock.playing)}>
              {clock.playing ? '❚❚ Stop the sky' : '▶ Turn the sky'}
            </button>
            {[
              ['North Pole', 90],
              [place.name.length < 18 ? place.name : 'Your place', Math.round(place.latitude * 2) / 2],
              ['Equator', 0],
              ['Sydney', -34],
              ['South Pole', -90],
            ].map(([label, lat]) => (
              <button key={label as string} type="button" className={figureStyles.toolButton} onClick={() => changeLatitude(lat as number)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.split}>
          <div>
            <p className={styles.panelTitle}>Inside: your sky, facing the {poleName} pole</p>
            <SkyView
              model={model}
              camera={camera}
              onCamera={setCamera}
              onUserCamera={() => setCameraMoved(true)}
              home={insideCamera(latitude)}
              layers={LAYERS}
              featured={featured}
              selected={selected}
              onSelect={setSelected}
              inViewButtons={false}
              aspect={0.85}
              minHeight={280}
              maxHeight={440}
              label={`Your sky from latitude ${formatLatitude(latitudeDeg)}`}
            />
          </div>
          <div>
            <p className={styles.panelTitle}>Outside: the celestial sphere round you</p>
            <Scene3D
              label="The celestial sphere seen from outside"
              description={description}
              factory={sphereScene}
              state={sphereState}
              camera={OUTSIDE_CAMERA}
              limits={{ minDistance: 1.6, maxDistance: 9 }}
              cameraReset={cameraReset}
              height="clamp(280px, 40vw, 440px)"
            />
          </div>
        </div>
        <div className={styles.lists}>
          {(['circumpolar', 'rises-and-sets', 'never-rises'] as const).map((path) => (
            <div key={path}>
              <h4>
                <span className={styles.swatch} style={{ background: PATH_COLOURS[path], boxShadow: '0 0 0 1.5px #070b16' }} aria-hidden="true" />
                {PATH_HEADINGS[path]}: {pct(shares[path])} of the sky
              </h4>
              <p>{groups[path].length ? groups[path].join(', ') : 'none of the brightest stars'}</p>
            </div>
          ))}
        </div>
      </div>
      <Caption>
        <b>Latitude {formatLatitude(latitudeDeg)}:</b> {description}
      </Caption>
    </Figure>
  );
}
