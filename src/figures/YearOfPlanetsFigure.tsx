import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { Wanderer } from '../core/ephemeris/wanderers';
import { apply } from '../core/math/vec3';
import { constellationAt } from '../core/sky/charts';
import { azAlt, type SkyCamera } from '../core/sky/projection';
import { calendarFromJd, formatYear } from '../core/time/calendar';
import { jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { DEFAULT_LAYERS, type SkyLayers, type SkyOverlay } from '../viz/sky/draw';
import { SkyView } from '../viz/sky/SkyView';
import { LayerToggles } from './sky/SkyParts';
import { onSky } from './sky/legend';
import { useSkyModel } from './sky/useSkyModel';
import { backwardRuns, planetYear, sideOfSun, summarise, TRACK_COLOURS, WANDERER_NAMES, WANDERERS } from './planetYear';
import { dayLabel, dayOfYearOf, daysInYear, noonOfDay } from './sunsYear';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The five naked-eye planets' paths against the stars over one year, on a
 * chart fixed to the stars along the ecliptic. Thick stretches are where a
 * planet moves backwards. The chart follows one planet; a table gives how far
 * each gets from the Sun and when it goes backwards.
 */

const LAYERS: SkyLayers = { ...DEFAULT_LAYERS, ground: false, starNames: false, ecliptic: true, moon: false };
const FOV = 100 * DEG;
const DAYS_PER_SECOND = 20;
const FIRST_YEAR = -2999;
const LAST_YEAR = 2999;

function today(): { year: number; day: number } {
  const date = calendarFromJd(jdNow());
  return { year: date.year, day: dayOfYearOf(date.year, date.month, Math.floor(date.day)) };
}

export function YearOfPlanetsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [start] = useState(today);
  const [year, setYear] = useState(start.year);
  const [day, setDay] = useState(start.day);
  const [playing, setPlaying] = useState(false);
  const [centre, setCentre] = useState<Wanderer>('venus');
  const [shown, setShown] = useState<Record<Wanderer, boolean>>({ mercury: true, venus: true, mars: true, jupiter: true, saturn: true });
  const [follow, setFollow] = useState(true);
  const [manualCamera, setManualCamera] = useState<SkyCamera | null>(null);
  const [layers, setLayers] = useState<SkyLayers>(LAYERS);
  const [selected, setSelected] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);
  const n = daysInYear(year);
  const whole = Math.min(n - 1, Math.floor(day));
  const jdTT = noonOfDay(year, whole);
  const { data, model } = useSkyModel(box, { jdTT, mode: 'chart', bodies: true });

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * DAYS_PER_SECOND;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 10;
    }
    setDay((d) => (d + step) % n);
  });

  const tracks = useMemo(() => planetYear(year), [year]);
  const summaries = useMemo(() => tracks.map(summarise), [tracks]);
  const track = tracks.find((t) => t.planet === centre)!;

  const followCamera = useMemo<SkyCamera>(() => {
    const local = model ? apply(model.frames.fromJ2000, track.directions[whole]) : null;
    return { az: local ? azAlt(local).az : 0, alt: 0, fov: FOV };
  }, [model, track, whole]);
  const camera = follow || !manualCamera ? followCamera : manualCamera;

  const overlays = useMemo<SkyOverlay[]>(() => {
    if (!model) return [];
    const M = model.frames.fromJ2000;
    const out: SkyOverlay[] = [];
    for (const t of tracks) {
      if (!shown[t.planet]) continue;
      const colour = TRACK_COLOURS[t.planet];
      const points = t.directions.map((v) => apply(M, v));
      out.push({ kind: 'path', points, colour, width: 1.5 });
      for (const [a, b] of backwardRuns(t)) out.push({ kind: 'path', points: points.slice(a, b + 1), colour, width: 4.5 });
      for (let m = 1; m <= 12; m++) out.push({ kind: 'marker', at: points[dayOfYearOf(year, m, 1)], shape: 'dot', colour, size: 3.5 });
      out.push({ kind: 'marker', at: points[0], shape: 'cross', colour, size: 4, label: `${WANDERER_NAMES[t.planet]}, 1 Jan` });
    }
    return out;
  }, [model, tracks, shown, year]);

  const reset = () => {
    setYear(start.year);
    setDay(start.day);
    setPlaying(false);
    setCentre('venus');
    setShown({ mercury: true, venus: true, mars: true, jupiter: true, saturn: true });
    setFollow(true);
    setManualCamera(null);
    setLayers(LAYERS);
    setSelected(null);
  };

  const changeYear = (next: number) => {
    const y = Math.max(FIRST_YEAR, Math.min(LAST_YEAR, next));
    setYear(y);
    setDay((d) => Math.min(d, daysInYear(y) - 1));
  };

  const date = dayLabel(year, whole);
  const where = data ? constellationAt(data.constellations, track.directions[whole]) : null;
  const backwardsNow = track.retrograde[whole];
  const centreSummary = summaries.find((s) => s.planet === centre)!;

  return (
    <Figure
      number={number}
      title="A year of planets"
      description="A chart of the stars along the ecliptic with the paths of Mercury, Venus, Mars, Jupiter and Saturn over one year. They all stay close to the ecliptic, the Sun’s path. Mercury and Venus never get far from the Sun, while Mars, Jupiter and Saturn can be anywhere along it. Thick stretches mark where a planet moves backwards for a while."
      height={940}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a planet’s path over the year, with a dot on the 1st of each month', symbol: onSky(<g><path d="M-10 3 Q0 -6 10 3" stroke="#ff8a5c" strokeWidth="1.5" fill="none" /><circle cx="0" cy="-1.5" r="2" fill="#ff8a5c" /></g>) },
        { label: 'thick: moving backwards (westwards) against the stars', symbol: onSky(<path d="M-10 0 H10" stroke="#ff8a5c" strokeWidth="4.5" />) },
        { label: 'where the path starts, on 1 January', symbol: onSky(<path d="M-4 0 H4 M0 -4 V4" stroke="#ff8a5c" strokeWidth="2" />) },
        { label: 'the ecliptic: the Sun’s yearly path', symbol: onSky(<path d="M-11 0 H11" stroke="rgb(240,186,90)" strokeWidth="2" strokeDasharray="4 3" />) },
        { label: 'the Sun', symbol: onSky(<circle r="5" fill="var(--sun)" />) },
      ]}
      simplified={
        <p>
          The chart shows the stars as if the sky were black at every hour: in reality the planets near the Sun are lost in its glare, and you
          see each one only when it is up at night. Positions come from JPL’s orbital elements and are good to a small fraction of a degree.
          Dates are in Universal Time (Greenwich).
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
            <button type="button" className={figureStyles.toolButton} onClick={() => changeYear(start.year)}>
              This year
            </button>
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
              aria-valuetext={`${date} ${formatYear(year)}`}
            />
            <output>{date}</output>
          </label>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <span className={styles.togglesLabel}>Follow</span>
            <span className={figureStyles.segmented} role="group" aria-label="Planet the chart follows">
              {WANDERERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={centre === p}
                  onClick={() => {
                    setCentre(p);
                    setFollow(true);
                  }}
                >
                  {WANDERER_NAMES[p]}
                </button>
              ))}
            </span>
          </div>
          <LayerToggles
            layers={layers}
            onLayers={setLayers}
            toggles={[
              { key: 'constellations', label: 'Figures' },
              { key: 'constellationNames', label: 'Constellation names' },
              { key: 'ecliptic', label: 'Ecliptic' },
            ]}
          >
            {WANDERERS.map((p) => (
              <button key={p} type="button" className={styles.toggle} aria-pressed={shown[p]} onClick={() => setShown({ ...shown, [p]: !shown[p] })}>
                {WANDERER_NAMES[p]}’s path
              </button>
            ))}
          </LayerToggles>
        </div>
        <SkyView
          model={model}
          camera={camera}
          onCamera={(c) => setManualCamera(c)}
          onUserCamera={() => setFollow(false)}
          home={followCamera}
          layers={layers}
          overlays={overlays}
          selected={selected}
          onSelect={setSelected}
          label={`The planets’ paths against the stars in ${formatYear(year)}, centred on ${WANDERER_NAMES[centre]} on ${date}`}
          description={`${WANDERER_NAMES[centre]} is in ${where?.name ?? '…'}, ${sideOfSun(track.fromSun[whole])}.`}
          aspect={0.5}
          minHeight={260}
          maxHeight={480}
          overlay={
            <>
              {date} {formatYear(year)} · {WANDERER_NAMES[centre]} in <b>{where?.name ?? '…'}</b>
            </>
          }
        />
        <div className={styles.readout}>
          <span>
            {WANDERER_NAMES[centre]}: <b>{sideOfSun(track.fromSun[whole])}</b>
          </span>
          <span>
            Moving <b>{backwardsNow ? 'backwards (west)' : 'forwards (east)'}</b> against the stars
          </span>
        </div>
        <table className={seasonStyles.table}>
          <caption>The planets in {formatYear(year)} (dates in UT)</caption>
          <thead>
            <tr>
              <th scope="col">Planet</th>
              <th scope="col">Farthest from the Sun</th>
              <th scope="col">Moves backwards</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.planet} aria-current={s.planet === centre ? 'true' : undefined} className={s.planet === centre ? seasonStyles.current : undefined}>
                <th scope="row">
                  <button type="button" className={seasonStyles.link} onClick={() => setCentre(s.planet)} aria-label={`Follow ${WANDERER_NAMES[s.planet]}`}>
                    <span className={styles.swatch} style={{ background: TRACK_COLOURS[s.planet] }} aria-hidden="true" />
                    {WANDERER_NAMES[s.planet]}
                  </button>
                </th>
                <td>
                  {Math.round(s.farthest.angle / DEG)}°{s.farthest.angle > 175 * DEG ? ' (opposite the Sun)' : ''}, {dayLabel(year, s.farthest.day)}
                </td>
                <td>
                  {s.backwards.length === 0
                    ? 'not this year'
                    : s.backwards.map((b) => `${dayLabel(year, b.from)} to ${dayLabel(year, Math.min(n - 1, b.to + 1))}`).join('; ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption>
        <b>
          {date} {formatYear(year)}:
        </b>{' '}
        {WANDERER_NAMES[centre]} is in {where?.name ?? '…'}, {sideOfSun(track.fromSun[whole])}
        {backwardsNow ? ', and moving backwards against the stars.' : '.'}{' '}
        {centre === 'mercury' || centre === 'venus'
          ? `It never gets more than ${Math.round(centreSummary.farthest.angle / DEG)}° from the Sun this year, so it is only ever seen in the evening or the morning twilight.`
          : `Over the year it gets as far as ${Math.round(centreSummary.farthest.angle / DEG)}° from the Sun${centreSummary.farthest.angle > 175 * DEG ? ': opposite it, and up all night' : ''}.`}
      </Caption>
    </Figure>
  );
}
