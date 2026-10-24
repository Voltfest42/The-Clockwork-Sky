import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { meanAscendingNode, moonPosition } from '../core/ephemeris/moon';
import { sunPosition } from '../core/ephemeris/sun';
import { calendarFromJd, formatYear } from '../core/time/calendar';
import { jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { Scene3D } from '../viz/scene3d/Scene3D';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { MONTHS } from '../viz/time/format';
import { dateText, eclipseName, SEASON_HALF_WIDTH, sunFromNode, yearOfEclipses, yearStartTT } from './eclipseSeasons';
import { ECLIPSE_COLOURS, eclipseScene, type EclipseSceneState } from './eclipseSeasons/scene';
import { onSky } from './sky/legend';
import { dayOfYearOf } from './sunsYear';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Eclipse seasons: the Moon's orbit, tilted 5° to the ecliptic, in 3D, with
 * the line of nodes and the Sun going round once a year; under it, a timeline
 * of the year's new and full Moons, the eclipse seasons (when the Sun is near
 * a node) and the year's real eclipses, from the eclipse finder.
 */

const CAMERA: OrbitCameraState = { target: [0, 0, 0], azimuth: -1.2, elevation: 0.38, distance: 10 };
const INCLINATION = 5.145 * DEG;
const EXAGGERATION = 3;
const DAYS_PER_SECOND = 10;
const SOLAR = '#ffb547';
const LUNAR = '#ef7a5a';

function today(): { year: number; day: number } {
  const date = calendarFromJd(jdNow());
  return { year: date.year, day: dayOfYearOf(date.year, date.month, Math.floor(date.day)) + 0.5 };
}

export function EclipseSeasonsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [start] = useState(today);
  const [year, setYear] = useState(start.year);
  const [day, setDay] = useState(start.day);
  const [playing, setPlaying] = useState(false);
  const [exaggerate, setExaggerate] = useState(true);
  const [cameraReset, setCameraReset] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  const data = useMemo(() => yearOfEclipses(year), [year]);
  const jdTT = yearStartTT(year) + day;

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * DAYS_PER_SECOND;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 3;
    }
    setDay((d) => (d + step) % data.days);
  });

  const sun = sunPosition(jdTT);
  const moon = moonPosition(jdTT);
  const node = meanAscendingNode(jdTT);
  const fromNode = sunFromNode(jdTT);
  const current = data.eclipses.find((e) => Math.abs(e.day - day) < 0.6) ?? null;
  const d = moon.lon - node;
  const moonArgument = Math.atan2(Math.sin(d), Math.cos(d) * Math.cos(INCLINATION));
  const sceneState = useMemo<EclipseSceneState>(
    () => ({
      sunLongitude: sun.lon,
      moonArgument,
      node,
      inclination: INCLINATION * (exaggerate ? EXAGGERATION : 1),
      eclipse: current?.kind ?? null,
    }),
    [sun.lon, moonArgument, node, exaggerate, current],
  );

  const reset = () => {
    setYear(start.year);
    setDay(start.day);
    setPlaying(false);
    setExaggerate(true);
    setCameraReset((k) => k + 1);
  };

  const changeYear = (y: number) => {
    setYear(Math.max(1, Math.min(2999, y)));
    setPlaying(false);
  };

  const inSeason = Math.abs(fromNode.angle) < SEASON_HALF_WIDTH;
  const nextPhase = data.phases.find((p) => p.day >= day - 0.5);
  const nextEclipse = data.eclipses.find((e) => e.day >= day - 0.5);
  const date = `${dateText(jdTT)} ${formatYear(year)}`;
  const description = `${date}: the Sun is ${Math.abs(fromNode.angle / DEG).toFixed(0)}° from the Moon’s ${fromNode.node} node${
    current ? `, and there is a ${eclipseName(current).toLowerCase()}` : ''
  }. The Moon is ${Math.abs(moon.lat / DEG).toFixed(1)}° ${moon.lat >= 0 ? 'north' : 'south'} of the ecliptic.`;

  return (
    <Figure
      number={number}
      title="Eclipse seasons"
      description="The Moon’s orbit round Earth in 3D, tilted 5° to the ecliptic, with the line of nodes where the two planes cross and the Sun’s direction going round once a year. A timeline shows the year’s new and full Moons, the two eclipse seasons when the Sun is near a node, and the year’s real eclipses: they only happen when a new or full Moon falls in an eclipse season."
      height={1050}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'the Moon’s orbit, north of the ecliptic', symbol: onSky(<path d="M-11 0 H11" stroke={ECLIPSE_COLOURS.orbitNorth} strokeWidth="2" />) },
        { label: '…and south of it', symbol: onSky(<path d="M-11 0 H11" stroke={ECLIPSE_COLOURS.orbitSouth} strokeWidth="2" />) },
        { label: 'the line of nodes', symbol: onSky(<path d="M-11 0 H11" stroke={ECLIPSE_COLOURS.nodes} strokeWidth="2" strokeDasharray="4 3" />) },
        { label: 'the ecliptic plane', symbol: onSky(<rect x="-10" y="-6" width="20" height="12" fill={ECLIPSE_COLOURS.ecliptic} opacity="0.35" />) },
        { label: 'new Moon / full Moon', symbol: onSky(<g><circle cx="-5" r="4" fill="#2a2d36" stroke="#9aa8c4" /><circle cx="6" r="4" fill="#ece9df" /></g>) },
        { label: 'an eclipse season: the Sun within about 17° of a node', symbol: onSky(<rect x="-10" y="-6" width="20" height="12" fill="#3a3216" stroke="#ffd166" strokeWidth="1" />) },
        { label: 'a solar eclipse / a lunar eclipse', symbol: onSky(<g><circle cx="-5" r="4.5" fill="none" stroke={SOLAR} strokeWidth="2" /><circle cx="6" r="4.5" fill="none" stroke={LUNAR} strokeWidth="2" /></g>) },
      ]}
      simplified={
        <p>
          In 3D the Sun is drawn three Moon-orbits away instead of about 390, and Earth and the Moon far too big. The Moon’s tilt is drawn three
          times too steep unless you switch that off: at its true 5° the tilt is hard to see. The node used for the eclipse seasons is the
          average one; the real node wobbles back and forth by a degree or two. The eclipses themselves, their dates and kinds, come from the
          eclipse finder, which is checked against NASA’s list; it can miss a penumbral eclipse so slight that nobody would see it.
        </p>
      }
    >
      <div ref={box}>
        <div className={styles.controls}>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
              {playing ? '❚❚ Pause' : '▶ Run the year'}
            </button>
            <span className={figureStyles.stepper} role="group" aria-label="Year">
              <button type="button" aria-label="Previous year" onClick={() => changeYear(year - 1)}>
                −
              </button>
              <output aria-live="polite">{formatYear(year)}</output>
              <button type="button" aria-label="Next year" onClick={() => changeYear(year + 1)}>
                +
              </button>
            </span>
            <button type="button" className={styles.toggle} aria-pressed={exaggerate} onClick={() => setExaggerate(!exaggerate)}>
              Steeper tilt (×3)
            </button>
          </div>
          <label className={styles.slider}>
            Date
            <input
              type="range"
              min={0}
              max={data.days - 0.25}
              step={0.25}
              value={Math.floor(day * 4) / 4}
              onChange={(e) => {
                setDay(Number(e.target.value));
                setPlaying(false);
              }}
              aria-valuetext={date}
            />
            <output>{dateText(jdTT)}</output>
          </label>
        </div>

        <Scene3D
          label="The Moon’s tilted orbit round Earth, with the Sun’s direction"
          description={description}
          factory={eclipseScene}
          state={sceneState}
          camera={CAMERA}
          limits={{ minDistance: 4, maxDistance: 22 }}
          cameraReset={cameraReset}
          height="clamp(260px, 42vw, 400px)"
          overlay={
            <span className={seasonStyles.sceneBadge}>
              {dateText(jdTT)} · Sun {Math.abs(fromNode.angle / DEG).toFixed(0)}° from a node
            </span>
          }
        />

        <div className={seasonStyles.timelineWrap} tabIndex={0} role="region" aria-label="Timeline of the year (scrolls sideways on small screens)">
          <Timeline
            data={data}
            day={day}
            onDay={(d) => {
              setDay(d);
              setPlaying(false);
            }}
          />
        </div>

        <h4 className={styles.panelTitle} style={{ marginTop: 10 }}>
          Eclipses in {formatYear(year)} (dates in UT)
        </h4>
        <ul className={seasonStyles.list}>
          {data.eclipses.map((e) => (
            <li key={e.k}>
              <button
                type="button"
                className={seasonStyles.link}
                onClick={() => {
                  setDay(e.day);
                  setPlaying(false);
                }}
              >
                {dateText(e.jdTT)}: {eclipseName(e).toLowerCase()}
              </button>{' '}
              <span className={styles.cardSubtitle}>
                (Sun {Math.abs(sunFromNode(e.jdTT).angle / DEG).toFixed(0)}° from the {sunFromNode(e.jdTT).node} node; Saros {e.saros})
              </span>
            </li>
          ))}
        </ul>
      </div>
      <Caption>
        <b>{date}:</b>{' '}
        {current
          ? `a ${eclipseName(current).toLowerCase()}. The ${current.kind === 'solar' ? 'new' : 'full'} Moon is in line with the Sun and Earth, because the Sun is only ${Math.abs(fromNode.angle / DEG).toFixed(0)}° from the ${fromNode.node} node.`
          : inSeason
            ? `the Sun is ${Math.abs(fromNode.angle / DEG).toFixed(0)}° from the ${fromNode.node} node: an eclipse season. A new or full Moon in the next few weeks will bring an eclipse.`
            : `the Sun is ${Math.abs(fromNode.angle / DEG).toFixed(0)}° from the nearest node, outside an eclipse season, so ${nextPhase ? `the ${nextPhase.name} Moon on ${dateText(nextPhase.jdTT)} passes ${nextPhase.name === 'new' ? 'above or below the Sun' : 'above or below Earth’s shadow'}` : 'new and full Moons pass above or below the line'}: no eclipse.`}{' '}
        {nextEclipse && !current ? `Next eclipse: ${eclipseName(nextEclipse).toLowerCase()} on ${dateText(nextEclipse.jdTT)}.` : ''}
      </Caption>
    </Figure>
  );
}

const TW = 680;
const TH = 168;
const LEFT = 12;
const RIGHT = 12;
const LINE_Y = 76;

/** The year as a strip: eclipse seasons shaded, new and full Moons on a line, eclipses ringed and named. */
function Timeline({ data, day, onDay }: { data: ReturnType<typeof yearOfEclipses>; day: number; onDay: (day: number) => void }) {
  const x = (d: number) => LEFT + (d / data.days) * (TW - LEFT - RIGHT);
  const pick = (event: PointerEvent<SVGSVGElement>) => {
    if (event.type === 'pointermove' && event.buttons !== 1) return;
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * TW;
    onDay(Math.max(0, Math.min(data.days - 0.25, ((px - LEFT) / (TW - LEFT - RIGHT)) * data.days)));
  };
  const summary = data.eclipses.length
    ? `${data.eclipses.length} eclipses: ${data.eclipses.map((e) => `${eclipseName(e).toLowerCase()} on ${dateText(e.jdTT)}`).join(', ')}.`
    : 'No eclipses.';
  return (
    <svg viewBox={`0 0 ${TW} ${TH}`} className={seasonStyles.timeline} role="img" aria-label={`Timeline of ${data.year}. Eclipse seasons: ${data.seasons.map((s) => `around ${MONTHS[Math.min(11, Math.floor(((s.from + s.to) / 2 / data.days) * 12))]}`).join(', ')}. ${summary}`} onPointerDown={pick} onPointerMove={pick} style={{ background: 'var(--sky-bg)', borderRadius: 'var(--radius)', cursor: 'crosshair', touchAction: 'pan-y' }}>
      {data.seasons.map((s) => (
        <g key={s.from}>
          <rect x={x(s.from)} y={40} width={Math.max(1, x(s.to) - x(s.from))} height={72} fill="#3a3216" stroke="#ffd166" strokeOpacity="0.5" />
          <text x={(x(s.from) + x(s.to)) / 2} y={124} fontSize="10" fill="#ffd166" textAnchor="middle">
            {s.node} node
          </text>
        </g>
      ))}
      <line x1={LEFT} x2={TW - RIGHT} y1={LINE_Y} y2={LINE_Y} stroke="#2a3a5e" />
      {data.phases.map((p) => (
        <circle key={p.k} cx={x(p.day)} cy={LINE_Y} r={4.5} fill={p.name === 'new' ? '#2a2d36' : '#ece9df'} stroke={p.name === 'new' ? '#9aa8c4' : 'none'} />
      ))}
      {data.eclipses.map((e) => {
        const solar = e.kind === 'solar';
        const label = `${e.type[0].toUpperCase() + e.type.slice(1)} ${e.kind}`;
        return (
          <g key={e.k}>
            <circle cx={x(e.day)} cy={LINE_Y} r={9} fill="none" stroke={solar ? SOLAR : LUNAR} strokeWidth="2.5" />
            <text x={x(e.day)} y={solar ? 30 : 102} fontSize="10.5" fontWeight="600" fill={solar ? SOLAR : LUNAR} textAnchor={x(e.day) < 60 ? 'start' : x(e.day) > TW - 60 ? 'end' : 'middle'}>
              {label}
            </text>
          </g>
        );
      })}
      {MONTHS.map((m, i) => {
        const d = dayOfYearOf(data.year, i + 1, 1);
        return (
          <g key={m}>
            <line x1={x(d)} x2={x(d)} y1={136} y2={142} stroke="#9aa8c4" />
            <text x={x(d) + 3} y={156} fontSize="10.5" fill="#9aa8c4">
              {m.slice(0, 3)}
            </text>
          </g>
        );
      })}
      <line x1={x(day)} x2={x(day)} y1={10} y2={142} stroke="#e2e8f5" strokeWidth="2" />
    </svg>
  );
}
