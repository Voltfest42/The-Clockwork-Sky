import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AU, C } from '../core/constants';
import { formatDuration } from '../core/light';
import { formatInWords, formatSignificant } from '../core/math/scientific';
import { jdFromUnixMs } from '../core/time/julian';
import { LIGHT_YEAR } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen } from '../viz/hooks';
import { Scene3D } from '../viz/scene3d/Scene3D';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { followDistance, lightRaceScene, type RaceSceneState } from './lightRace/scene';
import { SPEEDS } from './lightRace/speeds';
import { raceStops, type RaceStop } from './lightRace/stops';
import figureStyles from './figures.module.css';
import styles from './LightRaceFigure.module.css';

/** The planets are placed for the moment the page loaded. */
const STOPS = raceStops(jdFromUnixMs(Date.now()));

const START_CAMERA: OrbitCameraState = { target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: (32 * Math.PI) / 180, distance: followDistance(0) };
const DEFAULT_SPEED = 1;

/** The slider runs on a log scale, from 1 second to the arrival at Proxima Centauri. Position 0 is the moment the light leaves. */
const SLIDER_STEPS = 1000;
function elapsedFromSlider(position: number, end: number): number {
  return position <= 0 ? 0 : 10 ** ((Math.log10(end) * position) / SLIDER_STEPS);
}
function sliderFromElapsed(elapsed: number, end: number): number {
  return elapsed < 1 ? 0 : Math.round((Math.log10(elapsed) / Math.log10(end)) * SLIDER_STEPS);
}

export function LightRaceFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const stops = STOPS;
  const end = stops[stops.length - 1].arrival;
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(SPEEDS[DEFAULT_SPEED].factor);
  const [follow, setFollow] = useState(true);
  const [cameraReset, setCameraReset] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);

  useAnimationFrame(playing && onScreen, (dt) => {
    const next = Math.min(end, elapsed + dt * speed);
    setElapsed(next);
    if (next >= end) setPlaying(false);
  });

  const state = useMemo<RaceSceneState>(() => ({ stops, elapsed, follow }), [stops, elapsed, follow]);

  const passed = stops.filter((s) => s.arrival <= elapsed);
  const latest = passed[passed.length - 1];
  const next = stops.find((s) => s.arrival > elapsed);
  const distance = C * elapsed;

  const reset = () => {
    setElapsed(0);
    setPlaying(false);
    setSpeed(SPEEDS[DEFAULT_SPEED].factor);
    setFollow(true);
    setCameraReset((n) => n + 1);
  };

  const play = () => {
    if (elapsed >= end) setElapsed(0);
    setPlaying((p) => !p);
  };

  const jump = (stop: RaceStop) => {
    setPlaying(false);
    setElapsed(stop.arrival);
  };

  // The caption changes only when the light passes something, so a screen reader isn't flooded while it plays.
  const caption = !latest
    ? `A flash of light is about to leave the Sun. Press play, or pick a stop below. It will reach Earth in ${formatDuration(stops[2].arrival)}.`
    : next
      ? `The light has passed ${listNames(passed)}. It reached ${latest.name} ${formatDuration(latest.arrival)} after leaving the Sun. Next: ${next.name}, ${formatDuration(next.arrival - latest.arrival)} later.`
      : `The light has reached Proxima Centauri, ${formatDuration(end)} after leaving the Sun. In all that time it never slowed down: space is that big.`;

  const description =
    `A 3D view of the Solar System, ${follow ? 'zoomed out to keep the light in view' : 'zoomed by hand'}. ` +
    (elapsed === 0
      ? 'The light hasn’t left the Sun yet.'
      : `A sphere of light centred on the Sun has spread ${formatAu(distance / AU)} from it, ${formatDuration(elapsed)} after leaving. ` +
        (latest ? `It has passed ${listNames(passed)}.` : `It hasn’t reached ${stops[0].name} yet.`) +
        (next ? ` ${next.name} is next.` : ''));

  return (
    <Figure
      number={number}
      title="Light’s race"
      description="A 3D view of the Solar System in which a flash of light leaves the Sun and spreads outwards at its true speed. It reaches Earth in 8 minutes 19 seconds, Neptune in about 4 hours, Voyager 1 in about a day and Proxima Centauri, the nearest star, in about 4.2 years. A time slider and a list of stops jump to each arrival."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the sphere of light', symbol: <circle r="8" fill="none" stroke="var(--sun-edge)" strokeWidth="2" /> },
        { label: 'a planet’s orbit', symbol: <circle r="8" fill="none" stroke="var(--text-muted)" strokeWidth="1" /> },
        { label: 'a planet, spacecraft or star (dots never shrink below a few pixels)', symbol: <circle r="3.5" fill="var(--text)" /> },
      ]}
      simplified={
        <>
          <p>
            Distances are true. Each planet is drawn at its average distance from the Sun, where it is on average at today’s date (Chapter 6 shows why
            real orbits run a little ahead and behind), on a circle rather than its slightly stretched real orbit. Planets and spacecraft are drawn at
            least a few pixels wide so you can find them: at their true size they would be invisible.
          </p>
          <p>
            Voyager 1’s distance is worked out from its speed, about 3.6 AU a year, so it is good to a fraction of an AU for years either side of
            2026. Light really leaves the Sun all the time, of course: think of this as following one flash.
          </p>
        </>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={`${figureStyles.toolButton} ${styles.play}`} onClick={play} aria-pressed={playing}>
            {playing ? '❚❚ Pause' : elapsed >= end ? '↺ Again' : '▶ Play'}
          </button>
          <span className={styles.speedLabel} id={`speed-${number}`}>
            Speed:
          </span>
          <div className={`${figureStyles.segmented} ${styles.speeds}`} role="group" aria-labelledby={`speed-${number}`}>
            {SPEEDS.map((s) => (
              <button key={s.factor} type="button" aria-pressed={speed === s.factor} onClick={() => setSpeed(s.factor)}>
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" className={figureStyles.toolButton} aria-pressed={follow} onClick={() => setFollow((f) => !f)}>
            {follow ? '✓ ' : ''}Follow the light
          </button>
        </div>

        <Scene3D
          label="3D view of the Solar System, with light spreading from the Sun"
          description={description}
          factory={lightRaceScene}
          state={state}
          camera={START_CAMERA}
          limits={{ minDistance: 0.02, maxDistance: 3e6 }}
          cameraReset={cameraReset}
          onUserCamera={(kind) => {
            if (kind === 'zoom') setFollow(false);
          }}
          overlay={
            <div className={styles.clock} aria-hidden="true">
              <span className={styles.clockTime}>{formatDuration(elapsed)}</span>
              <span className={styles.clockDistance}>{formatAu(distance / AU)}</span>
            </div>
          }
        />

        <label className={styles.scrub}>
          <span>Time since the light left the Sun</span>
          <input
            type="range"
            min={0}
            max={SLIDER_STEPS}
            value={sliderFromElapsed(elapsed, end)}
            onChange={(e) => {
              setPlaying(false);
              setElapsed(elapsedFromSlider(Number(e.target.value), end));
            }}
            aria-valuetext={`${formatDuration(elapsed)}: ${formatAu(distance / AU)} from the Sun`}
          />
          <output className={styles.scrubValue}>{formatDuration(elapsed)}</output>
        </label>

        <ol className={styles.stops}>
          {stops.map((stop) => {
            const reached = stop.arrival <= elapsed;
            return (
              <li key={stop.id} className={reached ? styles.reached : undefined}>
                <button type="button" onClick={() => jump(stop)}>
                  <span className={styles.stopMark} aria-hidden="true">
                    {reached ? '✓' : '○'}
                  </span>
                  <span className={styles.stopName}>
                    <span className="visually-hidden">Jump to </span>
                    {stop.name}
                  </span>
                  <span className={styles.stopTime}>
                    <span className="visually-hidden">: light takes </span>
                    {formatDuration(stop.arrival)}
                  </span>
                  <span className={styles.stopDistance}>
                    <span className="visually-hidden">, </span>
                    {formatAu(stop.distanceAu)}
                  </span>
                </button>
                {reached && <span className="visually-hidden">(passed)</span>}
              </li>
            );
          })}
        </ol>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

/** A distance in AU for reading: 0.39 AU, 30.1 AU, 172 AU, 268,770 AU. */
function formatAu(au: number): string {
  if (au < 1e-3) return `${formatInWords((au * AU) / 1000)} km`;
  if (au >= 1e5) return `${formatSignificant(au, 3)} AU (${formatSignificant((au * AU) / LIGHT_YEAR, 3)} light-years)`;
  return `${formatSignificant(au, au < 10 ? 2 : 3)} AU`;
}

/** The stops passed so far, in a few words: "Mercury and Venus", "the first 5 planets, out to Jupiter". */
function listNames(stops: readonly RaceStop[]): string {
  const names = stops.map((s) => s.name);
  const last = stops[stops.length - 1];
  if (names.length <= 1) return names.join('');
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  if (last.kind === 'planet') return names.length === 8 ? 'all eight planets' : `the first ${names.length} planets, out to ${last.name}`;
  return `all eight planets and ${names.slice(8).join(' and ')}`;
}
