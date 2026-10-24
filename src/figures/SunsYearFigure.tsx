import { useMemo, useRef, useState, type ReactNode } from 'react';
import { sunGeocentric } from '../core/ephemeris/bodies';
import { seasonTime } from '../core/ephemeris/seasons';
import { apply } from '../core/math/vec3';
import { azAlt, type SkyCamera } from '../core/sky/projection';
import { constellationAt } from '../core/sky/charts';
import { calendarFromJd, formatYear } from '../core/time/calendar';
import { utFromTt } from '../core/time/deltaT';
import { jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { DEFAULT_LAYERS, type SkyLayers, type SkyOverlay } from '../viz/sky/draw';
import { SkyView } from '../viz/sky/SkyView';
import { MONTHS } from '../viz/time/format';
import { LayerToggles } from './sky/SkyParts';
import { onSky } from './sky/legend';
import { useSkyModel } from './sky/useSkyModel';
import { dailyMotion, dayLabel, dayOfYearOf, daysInYear, noonOfDay, signAt, signMatches, sunsConstellations } from './sunsYear';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The Sun's path against the stars over a year, on a chart fixed to the stars
 * (daylight switched off, so the stars behind the Sun show). The chart follows
 * the Sun along the ecliptic; the constellation it is in is outlined, and a
 * table lists when it enters each of the 13 it crosses.
 */

const LAYERS: SkyLayers = { ...DEFAULT_LAYERS, ground: false, starNames: false, boundaries: true, ecliptic: true, planets: false, moon: false };
const FOV = 85 * DEG;
/** Days of sky per second while playing. */
const DAYS_PER_SECOND = 8;
const FIRST_YEAR = -2999;
const LAST_YEAR = 2999;

/** Where the figure opens: today. */
function today(): { year: number; day: number } {
  const date = calendarFromJd(jdNow());
  return { year: date.year, day: dayOfYearOf(date.year, date.month, Math.floor(date.day)) };
}

export function SunsYearFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [start] = useState(today);
  const [year, setYear] = useState(start.year);
  const [day, setDay] = useState(start.day);
  const [playing, setPlaying] = useState(false);
  const [follow, setFollow] = useState(true);
  const [layers, setLayers] = useState<SkyLayers>(LAYERS);
  const [manualCamera, setManualCamera] = useState<SkyCamera | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);
  const n = daysInYear(year);
  const jdTT = noonOfDay(year, day);
  const { data, model } = useSkyModel(box, { jdTT, mode: 'chart', bodies: true });

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
  const whole = Math.floor(day);

  const stays = useMemo(() => (data ? sunsConstellations(data.constellations, year) : []), [data, year]);
  const sunJ2000 = sunGeocentric(noonOfDay(year, whole));
  const current = data ? constellationAt(data.constellations, sunJ2000) : null;

  const sunLocal = model ? apply(model.frames.fromJ2000, sunJ2000) : null;
  const sunAz = sunLocal ? azAlt(sunLocal).az : 0;
  const followCamera = useMemo<SkyCamera>(() => ({ az: sunAz, alt: 0, fov: FOV }), [sunAz]);
  const camera = follow || !manualCamera ? followCamera : manualCamera;

  // The Sun's place on the 1st of every month, the outline of the constellation it is in, and the equinox and solstice points.
  const overlays = useMemo<SkyOverlay[]>(() => {
    if (!model) return [];
    const M = model.frames.fromJ2000;
    const out: SkyOverlay[] = [];
    for (let m = 1; m <= 12; m++) {
      const at = apply(M, sunGeocentric(noonOfDay(year, dayOfYearOf(year, m, 1))));
      out.push({ kind: 'marker', at, shape: 'dot', colour: 'rgba(253, 230, 138, 0.9)', size: 3, label: `1 ${MONTHS[m - 1].slice(0, 3)}` });
    }
    for (const [point, label] of [
      ['march-equinox', 'March equinox'],
      ['june-solstice', 'June solstice'],
      ['september-equinox', 'September equinox'],
      ['december-solstice', 'December solstice'],
    ] as const) {
      out.push({ kind: 'marker', at: apply(M, sunGeocentric(seasonTime(year, point))), shape: 'cross', colour: '#5ad2d2', size: 5, label });
    }
    if (current) for (const ring of current.boundaries) out.push({ kind: 'path', points: ring.map((v) => apply(M, v)), colour: 'rgba(255, 209, 102, 0.95)', width: 2, closed: true });
    return out;
  }, [model, year, current]);

  const reset = () => {
    setYear(start.year);
    setDay(start.day);
    setPlaying(false);
    setFollow(true);
    setManualCamera(null);
    setLayers(LAYERS);
    setSelected(null);
  };

  const jumpTo = (point: 'march-equinox' | 'june-solstice' | 'september-equinox' | 'december-solstice') => {
    const date = calendarFromJd(utFromTt(seasonTime(year, point)));
    setDay(dayOfYearOf(year, date.month, Math.floor(date.day)));
    setPlaying(false);
  };

  const changeYear = (next: number) => {
    const y = Math.max(FIRST_YEAR, Math.min(LAST_YEAR, next));
    setYear(y);
    setDay((d) => Math.min(d, daysInYear(y) - 1));
  };

  const motion = dailyMotion(jdTT);
  const sign = signAt(jdTT);
  const date = dayLabel(year, whole);
  const inName = current?.name ?? '…';
  const stayOf = stays.find((s) => s.constellation.id === current?.id && s.from <= whole && s.to >= whole);

  return (
    <Figure
      number={number}
      title="The Sun’s year"
      description="A chart of the stars along the ecliptic, the Sun’s yearly path, with the daylight switched off so the stars behind the Sun show. Day by day the Sun moves about 1° east against the stars, through the 13 constellations that the ecliptic crosses, Ophiuchus included. The constellation it is in is outlined, and a table lists the date it enters each one."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the Sun, drawn at its true size', symbol: onSky(<circle r="5" fill="var(--sun)" />) },
        { label: 'the ecliptic: the Sun’s yearly path', symbol: onSky(<path d="M-11 0 H11" stroke="rgb(240,186,90)" strokeWidth="2" strokeDasharray="4 3" />) },
        { label: 'the Sun on the 1st of each month', symbol: onSky(<circle r="3" fill="rgba(253,230,138,0.9)" />) },
        { label: 'an equinox or solstice point', symbol: onSky(<path d="M-5 0 H5 M0 -5 V5" stroke="#5ad2d2" strokeWidth="2" />) },
        { label: 'the constellation the Sun is in, by the IAU boundaries', symbol: onSky(<rect x="-8" y="-6" width="16" height="12" fill="none" stroke="#ffd166" strokeWidth="2" />) },
      ]}
      simplified={
        <p>
          You can never see this view: the Sun’s light, scattered by the air, hides the stars around it. The chart shows them as if the sky were
          black, which is what you would see from space, or during a total eclipse. Dates are in Universal Time (Greenwich). The Sun crosses each
          boundary at a different hour each year, and about a day later every 72 years as precession carries the calendar along, so tables of
          entry dates differ by a day or so.
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
            <button type="button" className={figureStyles.toolButton} onClick={() => changeYear(-99)}>
              100 BC
            </button>
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
            <span className={styles.togglesLabel}>Go to</span>
            <button type="button" className={figureStyles.toolButton} onClick={() => setDay(start.year === year ? start.day : dayOfYearOf(year, 1, 1))}>
              {start.year === year ? 'Today' : '1 January'}
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={() => jumpTo('march-equinox')}>
              March equinox
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={() => jumpTo('june-solstice')}>
              June solstice
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={() => jumpTo('september-equinox')}>
              September equinox
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={() => jumpTo('december-solstice')}>
              December solstice
            </button>
          </div>
          <LayerToggles
            layers={layers}
            onLayers={setLayers}
            toggles={[
              { key: 'constellations', label: 'Figures' },
              { key: 'constellationNames', label: 'Constellation names' },
              { key: 'boundaries', label: 'Boundaries' },
              { key: 'starNames', label: 'Star names' },
              { key: 'ecliptic', label: 'Ecliptic' },
              { key: 'equator', label: 'Celestial equator' },
            ]}
          >
            <button type="button" className={styles.toggle} aria-pressed={follow} onClick={() => setFollow(!follow)}>
              Follow the Sun
            </button>
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
          label={`The stars behind the Sun on ${date} ${formatYear(year)}`}
          description={`The Sun is in ${inName}.`}
          aspect={0.5}
          minHeight={260}
          maxHeight={460}
          overlay={
            <>
              {date} {formatYear(year)} · Sun in <b>{inName}</b>
            </>
          }
        />
        <div className={styles.readout}>
          <span>
            The Sun is in: <b>{inName}</b>
            {stayOf ? ` (${dayLabel(year, stayOf.from)} to ${dayLabel(year, stayOf.to)})` : ''}
          </span>
          <span>
            Astrologers’ sign for this date: <b>{sign}</b>
          </span>
          <span>
            Moving <b>{motion.toFixed(2)}°</b> a day
          </span>
        </div>
        <table className={seasonStyles.table}>
          <caption>
            The Sun’s constellations in {formatYear(year)}, by the IAU boundaries (dates in UT)
          </caption>
          <thead>
            <tr>
              <th scope="col">Constellation</th>
              <th scope="col">Enters</th>
              <th scope="col">Days</th>
            </tr>
          </thead>
          <tbody>
            {stays.map((s, i) => {
              const next = stays[i + 1];
              const days = s.enters !== null && next?.enters != null ? Math.round(next.enters - s.enters) : s.to - s.from + 1;
              const isNow = s === stayOf;
              return (
                <tr key={`${s.constellation.id}-${s.from}`} aria-current={isNow ? 'true' : undefined} className={isNow ? seasonStyles.current : undefined}>
                  <th scope="row">
                    <button type="button" className={seasonStyles.link} onClick={() => setDay(s.from)} aria-label={`Go to ${s.constellation.name}, ${dayLabel(year, s.from)}`}>
                      {s.constellation.name}
                    </button>
                  </th>
                  <td>{s.enters === null ? '(from the year before)' : dayLabel(year, Math.floor(s.enters))}</td>
                  <td>{days}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Caption>
        <b>
          {date} {formatYear(year)}:
        </b>{' '}
        the Sun is in {inName}
        {current?.id === 'Oph' ? ', the 13th constellation of the zodiac, which astrology leaves out' : ''}. It moves {motion.toFixed(2)}° east a
        day against the stars, {motion > 1 ? 'a little faster than average, because Earth is near the Sun in early January' : motion < 0.97 ? 'a little slower than average, because Earth is far from the Sun in early July' : 'about one Sun-width every half day'}.
        {current && !signMatches(sign, current.id) ? ` Its sign by date is ${sign}: the signs were fixed about 2,000 years ago, and precession has since moved the sky by almost a whole sign.` : ''}
      </Caption>
    </Figure>
  );
}
