import { useMemo, useRef, useState, type ReactNode } from 'react';
import { calendarFromJd } from '../core/time/calendar';
import { jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { usePlace } from '../site/place';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { LineChart, type ChartMarker, type Series } from '../viz/LineChart';
import { Scene3D } from '../viz/scene3d/Scene3D';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { apsisDays, dayFacts, monthTicks, seasonOf, sunDays, TILTS, type Hemisphere } from './seasons';
import { SEASON_COLOURS, seasonsScene, type SeasonsSceneState } from './seasons/scene';
import { onSky } from './sky/legend';
import { dayLabel, dayOfYearOf, daysInYear } from './sunsYear';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The seasons machine: Earth goes round the Sun with its axis tilted and
 * fixed in space, and panels show what that does at the reader's latitude
 * through the year: the noon Sun's height, the day's length and the sunlight
 * per square metre, beside the same numbers for the other hemisphere. A tilt
 * slider runs from no tilt to Uranus's, and a distance switch shows how small
 * the effect of Earth's changing distance is, and when it peaks.
 */

const CAMERAS: Record<'tilted' | 'above' | 'side', OrbitCameraState> = {
  tilted: { target: [0, 0, 0], azimuth: -1.95, elevation: 0.45, distance: 8.2 },
  above: { target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: 1.5, distance: 9 },
  side: { target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: 0.06, distance: 8.2 },
};

/** Days per second while the year runs. */
const DAYS_PER_SECOND = 20;

const PREDICTIONS = [
  { label: 'In June or July', correct: false },
  { label: 'In December or January', correct: true },
  { label: 'In March or September', correct: false },
  { label: 'Never: the distance doesn’t change', correct: false },
];

function hoursAndMinutes(hours: number): string {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`;
}

function latitudeText(degrees: number, hemisphere: Hemisphere): string {
  if (degrees < 0.05) return '0° (the equator)';
  return `${degrees.toFixed(1)}° ${hemisphere === 'north' ? 'N' : 'S'}`;
}

function today(): { year: number; day: number } {
  const date = calendarFromJd(jdNow());
  return { year: date.year, day: dayOfYearOf(date.year, date.month, Math.floor(date.day)) };
}

export function SeasonsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const place = usePlace();
  const [start] = useState(today);
  const year = start.year;
  const startLatitude = Math.round(Math.abs(place.latitude) * 2) / 2;
  const startHemisphere: Hemisphere = place.latitude >= 0 ? 'north' : 'south';
  const [day, setDay] = useState(start.day);
  const [latitudeDeg, setLatitudeDeg] = useState(startLatitude);
  const [hemisphere, setHemisphere] = useState<Hemisphere>(startHemisphere);
  const [tiltDeg, setTiltDeg] = useState(23.44);
  const [showDistance, setShowDistance] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [camera, setCamera] = useState<OrbitCameraState>(CAMERAS.tilted);
  const [cameraReset, setCameraReset] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  const days = useMemo(() => sunDays(year), [year]);
  const apsides = useMemo(() => apsisDays(year), [year]);
  const n = daysInYear(year);
  const whole = Math.min(n - 1, Math.floor(day));
  const latitude = (hemisphere === 'north' ? 1 : -1) * latitudeDeg * DEG;
  const obliquity = tiltDeg * DEG;
  const revealed = checked !== null;

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * DAYS_PER_SECOND;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 7;
    }
    setDay((d) => (d + step) % n);
  });

  const mine = useMemo(() => days.map((d) => dayFacts(d, latitude, obliquity)), [days, latitude, obliquity]);
  const theirs = useMemo(() => days.map((d) => dayFacts(d, -latitude, obliquity)), [days, latitude, obliquity]);
  const facts = mine[whole];
  const other = theirs[whole];
  const sunDay = days[whole];

  const orbit = useMemo(() => days.map((d) => ({ lon: d.lon, distance: d.distance })), [days]);
  const sceneState = useMemo<SeasonsSceneState>(
    () => ({
      sunLongitude: sunDay.lon,
      distance: sunDay.distance,
      orbit,
      obliquity,
      latitude,
      showDistance: showDistance || revealed,
      perihelion: { ...days[apsides.perihelion.day], label: `Closest, ${dayLabel(year, apsides.perihelion.day)}` },
      aphelion: { ...days[apsides.aphelion.day], label: `Farthest, ${dayLabel(year, apsides.aphelion.day)}` },
    }),
    [sunDay, orbit, obliquity, latitude, showDistance, revealed, days, apsides, year],
  );

  const ticks = useMemo(() => monthTicks(year), [year]);
  const myName = latitudeText(latitudeDeg, hemisphere);
  const otherName = latitudeText(latitudeDeg, hemisphere === 'north' ? 'south' : 'north');
  const series = (pick: (f: (typeof mine)[number]) => number): Series[] => {
    const out: Series[] = [{ name: `${myName} (you)`, color: 'var(--series-1)', points: mine.map((f, i) => ({ x: i, y: pick(f) })) }];
    if (latitudeDeg >= 0.05) out.push({ name: otherName, color: 'var(--series-2)', dashed: true, points: theirs.map((f, i) => ({ x: i, y: pick(f) })) });
    return out;
  };
  const markers: ChartMarker[] = [{ x: whole, label: dayLabel(year, whole), color: 'var(--text)' }];
  if (showDistance || revealed) {
    markers.push({ x: apsides.perihelion.day, label: 'closest', color: 'var(--text-muted)', faint: true });
    markers.push({ x: apsides.aphelion.day, label: 'farthest', color: 'var(--text-muted)', faint: true });
  }
  const sunlightSeries = series((f) => f.sunlight);
  if (showDistance) sunlightSeries.push({ name: 'facing the Sun: distance alone', color: 'var(--series-3)', points: mine.map((f, i) => ({ x: i, y: f.facing })) });
  const sunlightMax = showDistance ? 1450 : Math.max(550, Math.ceil(Math.max(...mine.map((f) => f.sunlight), ...theirs.map((f) => f.sunlight)) / 100) * 100);
  const bigTilt = tiltDeg > 45;
  const midsummer = Math.max(...mine.map((f) => f.sunlight));

  const reset = () => {
    setDay(start.day);
    setLatitudeDeg(startLatitude);
    setHemisphere(startHemisphere);
    setTiltDeg(23.44);
    setShowDistance(false);
    setPlaying(false);
    setCamera(CAMERAS.tilted);
    setCameraReset((k) => k + 1);
    setGuess(null);
    setChecked(null);
  };

  const view = (name: keyof typeof CAMERAS) => {
    setCamera(CAMERAS[name]);
    setCameraReset((k) => k + 1);
  };

  const date = dayLabel(year, whole);
  const season = seasonOf(sunDay.lon, hemisphere);
  const otherSeason = seasonOf(sunDay.lon, hemisphere === 'north' ? 'south' : 'north');
  const nearPerihelion = Math.abs(whole - apsides.perihelion.day) < 25 || Math.abs(whole - apsides.perihelion.day) > n - 25;
  const description = `Earth on ${date}, ${sunDay.distance.toFixed(4)} AU from the Sun, with its axis tilted ${tiltDeg.toFixed(1)}°. ${
    tiltDeg < 0.5
      ? 'With no tilt, the Sun is overhead at the equator every day, and nothing changes through the year but the small swing in distance.'
      : `The ${sunDay.lon < Math.PI ? 'northern' : 'southern'} hemisphere leans towards the Sun.`
  } You, at ${myName}, are marked at noon.`;

  return (
    <Figure
      number={number}
      title="The seasons machine"
      description="Earth going round the Sun in 3D with its axis tilted 23.4° and always pointing the same way in space, with panels for your latitude through the year: how high the noon Sun climbs, how long the day lasts and how much sunlight each square metre gets, beside the same for the other hemisphere. A tilt slider runs from no tilt to Uranus’s 98°, and a distance switch shows Earth’s small change in distance from the Sun, closest in early January."
      height={1300}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'you, at noon, and the circle your latitude turns round in a day', symbol: onSky(<circle r="5" fill={SEASON_COLOURS.you} />) },
        { label: 'Earth’s axis', symbol: onSky(<path d="M-6 9 L6 -9" stroke={SEASON_COLOURS.axis} strokeWidth="2" />) },
        { label: 'the equator', symbol: onSky(<path d="M-11 0 H11" stroke={SEASON_COLOURS.equator} strokeWidth="2" />) },
        { label: 'the tropics, where the Sun can be overhead', symbol: onSky(<path d="M-11 0 H11" stroke={SEASON_COLOURS.tropics} strokeWidth="2" />) },
        { label: 'the polar circles, beyond which a day can last 24 hours', symbol: onSky(<path d="M-11 0 H11" stroke={SEASON_COLOURS.polar} strokeWidth="2" />) },
        { label: 'Earth’s orbit', symbol: onSky(<path d="M-11 0 H11" stroke={SEASON_COLOURS.orbit} strokeWidth="2" />) },
      ]}
      simplified={
        <>
          <p>
            Earth and the Sun are drawn far too big for their distance: at true scale, Earth would be a speck about 107 Sun-widths from the
            Sun. The orbit is drawn at its true, almost circular shape.
          </p>
          <p>
            Sunlight is counted at the top of the atmosphere. On the ground it is less, and the weather follows a few weeks behind the
            sunlight, because oceans and land take time to warm and cool: that’s why the hottest weeks come in July and August in the north, not
            at the June solstice. Changing the tilt changes only the Sun’s path in the sky; the orbit stays the real one.
          </p>
        </>
      }
    >
      <div ref={box}>
        <div className={seasonStyles.predict}>
          <fieldset>
            <legend>Predict first: when in the year is Earth closest to the Sun?</legend>
            {PREDICTIONS.map((p, i) => (
              <label key={p.label} className={figureStyles.checkbox}>
                <input type="radio" name={`perihelion-guess-${number}`} checked={guess === i} onChange={() => setGuess(i)} />
                {p.label}
              </label>
            ))}
            <button type="button" className={figureStyles.toolButton} disabled={guess === null} onClick={() => setChecked(guess)}>
              Check
            </button>
          </fieldset>
          <div aria-live="polite">
            {checked !== null && (
              <p className={seasonStyles.verdict}>
                <span className={PREDICTIONS[checked].correct ? seasonStyles.right : seasonStyles.wrong}>
                  {PREDICTIONS[checked].correct ? '✓ Right.' : '✗ Not quite.'}
                </span>{' '}
                Earth is closest on {dayLabel(year, apsides.perihelion.day)} ({apsides.perihelion.distance.toFixed(4)} AU) and farthest on{' '}
                {dayLabel(year, apsides.aphelion.day)} ({apsides.aphelion.distance.toFixed(4)} AU): in the middle of the northern winter. The
                closest and farthest points are now marked. So distance can’t be what makes the seasons.
              </p>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
              {playing ? '❚❚ Pause' : '▶ Run the year'}
            </button>
            <span className={figureStyles.segmented} role="group" aria-label="Your hemisphere">
              <button type="button" aria-pressed={hemisphere === 'north'} onClick={() => setHemisphere('north')}>
                North
              </button>
              <button type="button" aria-pressed={hemisphere === 'south'} onClick={() => setHemisphere('south')}>
                South
              </button>
            </span>
            <button type="button" className={styles.toggle} aria-pressed={showDistance} onClick={() => setShowDistance(!showDistance)}>
              Distance from the Sun
            </button>
            <span className={figureStyles.segmented} role="group" aria-label="Camera">
              <button type="button" onClick={() => view('tilted')}>
                Tilted view
              </button>
              <button type="button" onClick={() => view('above')}>
                From above
              </button>
              <button type="button" onClick={() => view('side')}>
                Edge on
              </button>
            </span>
          </div>
          <label className={styles.slider}>
            Date
            <input
              type="range"
              min={0}
              max={n - 1}
              step={1}
              value={whole}
              onChange={(e) => {
                setDay(Number(e.target.value));
                setPlaying(false);
              }}
              aria-valuetext={date}
            />
            <output>{date}</output>
          </label>
          <label className={styles.slider}>
            Latitude
            <input
              type="range"
              min={0}
              max={90}
              step={0.5}
              value={latitudeDeg}
              onChange={(e) => setLatitudeDeg(Number(e.target.value))}
              aria-valuetext={myName}
            />
            <output>{myName}</output>
          </label>
          <label className={styles.slider}>
            Tilt
            <input type="range" min={0} max={98} step="any" value={tiltDeg} onChange={(e) => setTiltDeg(Number(e.target.value))} aria-valuetext={`${tiltDeg.toFixed(1)}°`} />
            <output>{tiltDeg.toFixed(1)}°</output>
          </label>
          <div className={styles.presets}>
            <span className={styles.togglesLabel}>Tilt</span>
            {TILTS.map((t) => (
              <button key={t.label} type="button" className={figureStyles.toolButton} aria-pressed={Math.abs(tiltDeg - t.degrees) < 0.01} onClick={() => setTiltDeg(t.degrees)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Scene3D
          label="Earth going round the Sun, with its axis tilted"
          description={description}
          factory={seasonsScene}
          state={sceneState}
          camera={camera}
          limits={{ minDistance: 3, maxDistance: 24 }}
          cameraReset={cameraReset}
          height="clamp(280px, 46vw, 440px)"
          overlay={
            <span className={seasonStyles.sceneBadge}>
              {date} · {season} in the {hemisphere}
            </span>
          }
        />

        <div className={seasonStyles.panels}>
          <div className={seasonStyles.panel}>
            <h4>How high the Sun climbs at noon</h4>
            <LineChart
              series={series((f) => f.noonHeight)}
              xLabel="Month"
              yLabel="Degrees"
              yMin={bigTilt ? -90 : -30}
              yMax={90}
              yTicks={bigTilt ? [-90, -45, 0, 45, 90] : [-30, 0, 30, 60, 90]}
              formatY={(y) => `${y}°`}
              xTicks={ticks}
              xMin={0}
              xMax={n - 1}
              baseline={0}
              markers={markers}
              onPick={(x) => setDay(Math.round(x))}
              width={420}
              height={230}
              ariaLabel={`The noon Sun’s height through the year at ${myName} and ${otherName}. On ${date}: ${facts.noonHeight.toFixed(0)}° and ${other.noonHeight.toFixed(0)}°.`}
            />
          </div>
          <div className={seasonStyles.panel}>
            <h4>How long the day lasts</h4>
            <LineChart
              series={series((f) => f.dayLength)}
              xLabel="Month"
              yLabel="Hours"
              yMin={0}
              yMax={24}
              yTicks={[0, 6, 12, 18, 24]}
              formatY={(y) => `${y} h`}
              xTicks={ticks}
              xMin={0}
              xMax={n - 1}
              markers={markers}
              onPick={(x) => setDay(Math.round(x))}
              width={420}
              height={230}
              ariaLabel={`Day length through the year at ${myName} and ${otherName}. On ${date}: ${hoursAndMinutes(facts.dayLength)} and ${hoursAndMinutes(other.dayLength)}.`}
            />
          </div>
          <div className={seasonStyles.panel}>
            <h4>Sunlight per square metre, averaged over the day</h4>
            <LineChart
              series={sunlightSeries}
              xLabel="Month"
              yLabel="W/m²"
              yMin={0}
              yMax={sunlightMax}
              formatY={(y) => `${y}`}
              xTicks={ticks}
              xMin={0}
              xMax={n - 1}
              markers={markers}
              onPick={(x) => setDay(Math.round(x))}
              width={420}
              height={230}
              ariaLabel={`Daily sunlight per square metre through the year at ${myName} and ${otherName}. On ${date}: ${Math.round(facts.sunlight)} and ${Math.round(other.sunlight)} watts per square metre.`}
            />
          </div>
          <div className={seasonStyles.panel}>
            <h4>The noon Sun’s beam on your ground</h4>
            <Beam height={facts.noonHeight} />
          </div>
        </div>
        <div className={styles.readout}>
          <span>
            Noon Sun: <b>{facts.noonHeight.toFixed(1)}°</b>
          </span>
          <span>
            Day: <b>{facts.dayLength >= 23.99 ? '24 h (the Sun never sets)' : facts.dayLength <= 0.01 ? 'none (it never rises)' : hoursAndMinutes(facts.dayLength)}</b>
          </span>
          <span>
            Sunlight: <b>{Math.round(facts.sunlight)} W/m²</b>
          </span>
          {(showDistance || revealed) && (
            <span>
              Distance: <b>{sunDay.distance.toFixed(4)} AU</b>
            </span>
          )}
        </div>
      </div>
      <Caption>
        <b>
          {date}, {myName}:
        </b>{' '}
        {latitudeDeg < 0.05 ? `it is ${season} by the calendar in the north and ${otherSeason} in the south.` : `${season} here, ${otherSeason} at ${otherName}.`}{' '}
        {facts.noonHeight <= -0.8
          ? 'The Sun stays below the horizon all day: polar night.'
          : `The noon Sun climbs to ${facts.noonHeight.toFixed(0)}° and the Sun is up for ${hoursAndMinutes(facts.dayLength)}, so each square metre gets ${Math.round(facts.sunlight)} W/m² over the day, ${midsummer > 0 ? Math.round((facts.sunlight / midsummer) * 100) : 0}% of the most it gets all year.`}{' '}
        {tiltDeg < 0.5
          ? 'With no tilt there are no seasons: the same Sun, the same day, every day of the year.'
          : nearPerihelion && revealed
            ? 'Earth is near its closest to the Sun now, and yet it is winter in the north.'
            : ''}
      </Caption>
    </Figure>
  );
}

const BW = 400;
const BH = 210;

/**
 * The noon Sun's beam on level ground: a beam 1 m across lands on a strip of
 * ground 1/sin(h) m long, so the higher the Sun, the more energy each square
 * metre gets.
 */
function Beam({ height }: { height: number }) {
  const h = Math.max(0, height) * DEG;
  const groundY = BH - 34;
  const cx = BW / 2;
  const width = 36; // the beam's width, px
  const up = h > 0.01;
  const spread = up ? width / Math.sin(h) : 0;
  const shown = Math.min(spread, BW - 30);
  // The beam comes down from the upper left at the Sun's height h, between two parallel edges that meet the ground spread apart.
  const length = 260;
  const dx = Math.cos(h) * length;
  const dy = Math.sin(h) * length;
  const x1 = cx - spread / 2;
  const x2 = cx + spread / 2;
  const share = up ? Math.sin(h) : 0;
  return (
    <svg viewBox={`0 0 ${BW} ${BH}`} className={seasonStyles.svgLight} role="img" aria-label={up ? `The noon Sun is ${height.toFixed(0)}° up: a beam 1 metre wide spreads over ${(1 / share).toFixed(1)} metres of ground, so each square metre gets ${Math.round(share * 100)}% of the full sunlight.` : 'The Sun doesn’t rise today.'}>
      {up && (
        <polygon
          points={`${x1},${groundY} ${x2},${groundY} ${x2 - dx},${groundY - dy} ${x1 - dx},${groundY - dy}`}
          fill="var(--sun)"
          stroke="var(--sun-edge)"
          strokeWidth="1"
          opacity="0.85"
        />
      )}
      <line x1={10} x2={BW - 10} y1={groundY} y2={groundY} stroke="var(--text-muted)" strokeWidth="2" />
      {up && <line x1={cx - shown / 2} x2={cx + shown / 2} y1={groundY + 5} y2={groundY + 5} stroke="var(--sun-edge)" strokeWidth="4" />}
      <text x={10} y={BH - 10} fontSize="12" fill="var(--text)">
        {up ? `Sun ${height.toFixed(0)}° up: 1 m of beam covers ${(1 / share).toFixed(1)} m of ground` : 'The Sun doesn’t rise today'}
      </text>
      <text x={10} y={16} fontSize="12" fill="var(--text-muted)">
        {up ? `Each square metre gets ${Math.round(share * 100)}% of the full beam` : 'Polar night'}
      </text>
    </svg>
  );
}
