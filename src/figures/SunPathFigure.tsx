import { useMemo, useRef, useState, type ReactNode } from 'react';
import { seasonTime, type SeasonPoint } from '../core/ephemeris/seasons';
import { localDirection, type SkyCamera } from '../core/sky/projection';
import { altAz } from '../core/sky/riseSet';
import { kindOfDay, noonAltitude, polarCircle, sunriseAzimuth } from '../core/sky/sunlight';
import { calendarFromJd } from '../core/time/calendar';
import { utFromTt } from '../core/time/deltaT';
import { clockTime, jdNow, type Zone } from '../core/time/zone';
import { meanObliquity } from '../core/coords/transforms';
import { DEG } from '../core/units';
import { usePlace } from '../site/place';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { PlacePicker } from '../viz/place/PlacePicker';
import { DEFAULT_LAYERS, type SkyLayers, type SkyOverlay } from '../viz/sky/draw';
import { SkyView } from '../viz/sky/SkyView';
import { MONTHS } from '../viz/time/format';
import { onSky } from './sky/legend';
import { useSkyModel } from './sky/useSkyModel';
import { clockText, dayOfSun, dayPath, localMidnight, sunDeclination } from './sunPath';
import { dayLabel, dayOfYearOf, daysInYear } from './sunsYear';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The Sun's path across your sky on any day of the year, with the paths on
 * the solstices and the equinox for comparison, and where the Sun rises and
 * sets through the year along the horizon. The sky view shows the whole sky
 * from straight up, or faces the equator.
 */

const LAYERS: SkyLayers = { ...DEFAULT_LAYERS, constellations: false, constellationNames: false, starNames: false, milkyWay: false, planets: false, moon: false, stars: false, grid: 'altaz' };
const PATH_COLOURS = { today: '#ffd166', june: '#ff9f70', equinox: '#5ad2d2', december: '#93acff' };
const HOURS_PER_SECOND = 3;

type ViewKind = 'whole' | 'facing';

/**
 * The whole sky, looking straight up with the horizon round the edge (north at the top in the north, south at the top in the south,
 * so the Sun's paths cross the lower half), or the view facing the equator.
 */
function cameraFor(latitude: number, kind: ViewKind): SkyCamera {
  const az = latitude >= 0 ? Math.PI : 0;
  if (kind === 'whole') return { az, alt: Math.PI / 2, fov: Math.PI };
  const polar = Math.abs(latitude) > 60 * DEG;
  return { az, alt: polar ? 20 * DEG : 28 * DEG, fov: 150 * DEG };
}

const COMPASS_16 = ['north', 'north-north-east', 'north-east', 'east-north-east', 'east', 'east-south-east', 'south-east', 'south-south-east', 'south', 'south-south-west', 'south-west', 'west-south-west', 'west', 'west-north-west', 'north-west', 'north-north-west'];

function today(): { year: number; day: number } {
  const date = calendarFromJd(jdNow());
  return { year: date.year, day: dayOfYearOf(date.year, date.month, Math.floor(date.day)) };
}

/** The day of the year (in a time zone) of an equinox or solstice. */
function seasonDay(year: number, point: SeasonPoint, zone: Zone): number {
  const date = clockTime(zone, utFromTt(seasonTime(year, point)));
  return dayOfYearOf(year, date.month, date.day);
}

/** "north-east (49°)". */
function direction(az: number): string {
  return `${COMPASS_16[Math.round(((az / DEG + 360) % 360) / 22.5) % 16]} (${Math.round(az / DEG)}°)`;
}

export function SunPathFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const place = usePlace();
  // The place and its time zone as plain numbers and strings, so the memos below can depend on them.
  const latitude = place.latitude * DEG;
  const longitude = place.longitude * DEG;
  const zoneName = place.timeZone;
  const where = useMemo(() => ({ latitude, longitude }), [latitude, longitude]);
  const zone = useMemo<Zone>(() => ({ name: zoneName, longitude }), [zoneName, longitude]);
  const [start] = useState(today);
  const year = start.year;
  const n = daysInYear(year);
  const [day, setDay] = useState(start.day);
  const [hour, setHour] = useState(12);
  const [playing, setPlaying] = useState(false);
  const [viewKind, setViewKind] = useState<ViewKind>('whole');
  const [cameraState, setCamera] = useState<{ camera: SkyCamera; latitude: number; kind: ViewKind } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  const home = cameraFor(where.latitude, viewKind);
  // The camera follows the place's hemisphere and the chosen view until the reader turns it.
  const camera = cameraState && cameraState.latitude === where.latitude && cameraState.kind === viewKind ? cameraState.camera : home;

  const midnight = localMidnight(year, day, zone);
  const jdTT = midnight + hour / 24;
  const { model } = useSkyModel(box, { jdTT, place: where, mode: 'horizon', daylight: false, bodies: true });

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * HOURS_PER_SECOND;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 1;
    }
    setHour((h) => (h + step) % 24);
  });

  // The reference paths (solstices and the March equinox) and the rising and setting points through the year.
  const reference = useMemo(() => {
    const paths: { key: keyof typeof PATH_COLOURS; label: string; points: ReturnType<typeof dayPath> }[] = [
      { key: 'june', label: 'June solstice', points: dayPath('sun', localMidnight(year, seasonDay(year, 'june-solstice', zone), zone), where) },
      { key: 'equinox', label: 'equinoxes', points: dayPath('sun', localMidnight(year, seasonDay(year, 'march-equinox', zone), zone), where) },
      { key: 'december', label: 'December solstice', points: dayPath('sun', localMidnight(year, seasonDay(year, 'december-solstice', zone), zone), where) },
    ];
    const marks: SkyOverlay[] = [];
    for (let m = 1; m <= 12; m++) {
      const t = localMidnight(year, dayOfYearOf(year, m, 21), zone) + 0.5;
      const rise = sunriseAzimuth(sunDeclination(t), where.latitude);
      if (rise === null) continue;
      for (const az of [rise, 2 * Math.PI - rise]) {
        marks.push({ kind: 'marker', at: localDirection(az, 0), shape: 'dot', colour: 'rgba(255, 209, 102, 0.9)', size: 3, label: MONTHS[m - 1].slice(0, 3) });
      }
    }
    return { paths, marks };
  }, [year, zone, where]);

  const todayPath = useMemo(() => dayPath('sun', midnight, where), [midnight, where]);
  const sun = useMemo(() => dayOfSun(midnight, where), [midnight, where]);

  const overlays = useMemo<SkyOverlay[]>(
    () => [
      ...reference.paths.map((p): SkyOverlay => ({ kind: 'path', points: p.points, colour: PATH_COLOURS[p.key], width: 1.5, dash: [6, 5] })),
      ...reference.marks,
      { kind: 'path', points: todayPath, colour: PATH_COLOURS.today, width: 3 },
      // In the view from straight up the horizon is the rim, so the compass points go just inside it.
      ...(viewKind === 'whole'
        ? (['N', 'E', 'S', 'W'] as const).map((text, i): SkyOverlay => ({ kind: 'text', at: localDirection(i * (Math.PI / 2), 6 * DEG), text, colour: '#8cbe8c' }))
        : []),
    ],
    [reference, todayPath, viewKind],
  );

  const reset = () => {
    setDay(start.day);
    setHour(12);
    setPlaying(false);
    setCamera(null);
    setViewKind('whole');
    setSelected(null);
  };

  const date = dayLabel(year, day);
  const declination = sunDeclination(midnight + 0.5);
  const obliquity = meanObliquity(midnight);
  const kind = kindOfDay(declination, where.latitude);
  const now = altAz('sun', jdTT, where);
  const tropical = Math.abs(where.latitude) <= obliquity;
  const fromOverhead = 90 - noonAltitude(declination, where.latitude) / DEG;
  const overheadAt = `${Math.abs(declination / DEG).toFixed(1)}° ${declination >= 0 ? 'N' : 'S'}`;
  const beyondPolarCircle = Math.abs(where.latitude) > polarCircle(obliquity);

  let story: string;
  if (kind === 'polar-day') {
    story = `The Sun never sets today: it circles the sky, lowest at about ${clockText(sun.transit + 0.5, zone)} and highest, ${(sun.transitAltitude / DEG).toFixed(0)}° up, at ${clockText(sun.transit, zone)}. This is the midnight Sun.`;
  } else if (kind === 'polar-night') {
    story = `The Sun never rises today: even at noon it stays ${Math.abs(sun.transitAltitude / DEG).toFixed(0)}° below the horizon. This is the polar night${Math.abs(sun.transitAltitude / DEG) < 6 ? ', though there is twilight at midday' : ''}.`;
  } else {
    const riseAz = sun.rise !== null ? altAz('sun', sun.rise, where).az : null;
    const setAz = sun.set !== null ? altAz('sun', sun.set, where).az : null;
    const length = sun.rise !== null && sun.set !== null ? (sun.set > sun.rise ? sun.set - sun.rise : sun.set + 1 - sun.rise) * 24 : null;
    story =
      `The Sun rises at ${sun.rise !== null ? clockText(sun.rise, zone) : '—'}${riseAz !== null ? ` in the ${direction(riseAz)}` : ''}, ` +
      `climbs to ${(sun.transitAltitude / DEG).toFixed(0)}° at ${clockText(sun.transit, zone)} and sets at ${sun.set !== null ? clockText(sun.set, zone) : '—'}${setAz !== null ? ` in the ${direction(setAz)}` : ''}` +
      (length !== null ? `: ${Math.floor(length)} h ${String(Math.round((length % 1) * 60) % 60).padStart(2, '0')} min of daylight.` : '.');
  }
  const overhead = tropical
    ? fromOverhead < 0.3
      ? ' At noon today the Sun is straight overhead here.'
      : ` Here, between the tropics, the noon Sun can be overhead; today it is overhead at ${overheadAt} and ${fromOverhead.toFixed(0)}° from overhead here.`
    : ` The noon Sun is never overhead this far from the equator; today it is overhead at ${overheadAt}.`;

  return (
    <Figure
      number={number}
      title="The Sun’s daily path"
      description="Your whole sky, with the horizon round the edge, and the Sun’s path across it on a day you choose, and its paths on the June solstice, the equinoxes and the December solstice for comparison. Dots along the horizon mark where the Sun rises and sets on the 21st of each month. In summer the path is long and high, in winter short and low; beyond the polar circles it stops crossing the horizon at all."
      height={820}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the Sun’s path on the chosen day', symbol: onSky(<path d="M-11 0 H11" stroke={PATH_COLOURS.today} strokeWidth="3" />) },
        { label: 'June solstice', symbol: onSky(<path d="M-11 0 H11" stroke={PATH_COLOURS.june} strokeWidth="2" strokeDasharray="4 3" />) },
        { label: 'equinoxes (March and September)', symbol: onSky(<path d="M-11 0 H11" stroke={PATH_COLOURS.equinox} strokeWidth="2" strokeDasharray="4 3" />) },
        { label: 'December solstice', symbol: onSky(<path d="M-11 0 H11" stroke={PATH_COLOURS.december} strokeWidth="2" strokeDasharray="4 3" />) },
        { label: 'where the Sun rises and sets on the 21st of each month', symbol: onSky(<circle r="3" fill="rgba(255,209,102,0.9)" />) },
      ]}
      simplified={
        <p>
          The sky is drawn dark and empty so the paths stand out, and the ground is flat to the horizon, with no hills or buildings. Refraction is
          included: it lifts the Sun by about half a degree at the horizon, so the day is a few minutes longer than the geometry says, and the
          midnight Sun reaches a little south of the Arctic Circle.
        </p>
      }
    >
      <div ref={box}>
        <div className={styles.controls}>
          <PlacePicker />
          <label className={styles.slider}>
            Date
            <input type="range" min={0} max={n - 1} step={1} value={day} onChange={(e) => setDay(Number(e.target.value))} aria-valuetext={date} />
            <output>{date}</output>
          </label>
          <label className={styles.slider}>
            Time
            <input
              type="range"
              min={0}
              max={23.75}
              step={0.25}
              value={Math.floor(hour * 4) / 4}
              onChange={(e) => {
                setHour(Number(e.target.value));
                setPlaying(false);
              }}
              aria-valuetext={clockText(jdTT, zone)}
            />
            <output>{clockText(jdTT, zone)}</output>
          </label>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
              {playing ? '❚❚ Pause' : '▶ Run the day'}
            </button>
            <span className={styles.togglesLabel}>Go to</span>
            <button type="button" className={figureStyles.toolButton} onClick={() => setDay(seasonDay(year, 'june-solstice', zone))}>
              June solstice
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={() => setDay(seasonDay(year, 'march-equinox', zone))}>
              March equinox
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={() => setDay(seasonDay(year, 'december-solstice', zone))}>
              December solstice
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={() => setDay(start.day)}>
              Today
            </button>
            <span className={figureStyles.segmented} role="group" aria-label="View">
              <button type="button" aria-pressed={viewKind === 'whole'} onClick={() => setViewKind('whole')}>
                Whole sky
              </button>
              <button type="button" aria-pressed={viewKind === 'facing'} onClick={() => setViewKind('facing')}>
                Facing the equator
              </button>
            </span>
          </div>
        </div>
        <div style={viewKind === 'whole' ? { maxWidth: 640, margin: '0 auto' } : undefined}>
        <SkyView
          model={model}
          camera={camera}
          onCamera={(c) => setCamera({ camera: c, latitude: where.latitude, kind: viewKind })}
          home={home}
          layers={LAYERS}
          overlays={overlays}
          selected={selected}
          onSelect={setSelected}
          label={`The Sun’s path from ${place.name} on ${date}`}
          description={story}
          inViewButtons={false}
          aspect={viewKind === 'whole' ? 1 : 0.55}
          minHeight={280}
          maxHeight={viewKind === 'whole' ? 640 : 480}
          overlay={
            <>
              {clockText(jdTT, zone)} · Sun {(now.alt / DEG).toFixed(0)}°
            </>
          }
        />
        </div>
        <div className={styles.readout}>
          <span>
            Noon height: <b>{(sun.transitAltitude / DEG).toFixed(1)}°</b>
          </span>
          <span>
            Sun overhead at noon at: <b>{overheadAt}</b>
          </span>
          {beyondPolarCircle && (
            <span>
              <b>Beyond the polar circle</b>
            </span>
          )}
        </div>
      </div>
      <Caption>
        <b>
          {place.name}, {date}:
        </b>{' '}
        {story}
        {overhead}
      </Caption>
    </Figure>
  );
}
