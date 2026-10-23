import { useId, useState, type ReactNode } from 'react';
import { calendarFromJd, daysInMonth } from '../../core/time/calendar';
import { ttFromUt, utFromTt } from '../../core/time/deltaT';
import { clockTime, jdFromClockTime, jdNow, type ClockTime } from '../../core/time/zone';
import { placeZone, type ChosenPlace } from '../../site/place';
import { MONTHS, STEP_LABELS, stepTime, zoneLabel, type StepUnit } from './format';
import { SPEEDS, type SkyClock } from './useSkyClock';
import styles from './controls.module.css';

/**
 * The time control shared by the sky figures: the date and clock time at the
 * reader's place (with its time zone always shown), Now, play and pause, the
 * speed, and steps of an hour, a star day, a Sun day, a month or a year.
 * Years can be BC; dates before 15 October 1582 are in the Julian calendar.
 */

interface TimeControlProps {
  clock: SkyClock;
  place: ChosenPlace;
  /** Which step units to offer. */
  steps?: readonly StepUnit[];
  /** Which speeds to offer (seconds of sky time per second). */
  speeds?: readonly number[];
  /** Hide the play button and speed (for figures that only step). */
  noPlay?: boolean;
  children?: ReactNode;
}

export function TimeControl({ clock, place, steps = ['hour', 'sidereal', 'solar', 'month', 'year'], speeds, noPlay, children }: TimeControlProps) {
  const zone = placeZone(place);
  const now = clockTime(zone, utFromTt(clock.jdTT));
  const [unit, setUnit] = useState<StepUnit>(steps[0]);
  const id = useId();
  const minYear = calendarFromJd(clock.min).year;
  const maxYear = calendarFromJd(clock.max).year;
  const era = now.year <= 0 ? 'BC' : 'AD';
  const yearNumber = now.year <= 0 ? 1 - now.year : now.year;
  const [yearText, setYearText] = useState<string | null>(null);

  const set = (change: Partial<ClockTime>) => {
    const t = { ...now, ...change };
    t.day = Math.min(Math.max(1, t.day), daysInMonth(t.year, t.month));
    clock.setJdTT(ttFromUt(jdFromClockTime(zone, t)));
  };

  const commitYear = (text: string, eraNow: 'AD' | 'BC') => {
    const n = Math.round(Number(text));
    if (!Number.isFinite(n) || n < 1) return;
    const year = eraNow === 'BC' ? 1 - n : n;
    if (year < minYear || year > maxYear) return;
    set({ year });
  };

  const speedOptions = SPEEDS.filter((s) => !speeds || speeds.includes(s.seconds));
  const julian = clock.jdTT < 2_299_160.5;

  return (
    <div className={styles.time} role="group" aria-label="Date and time">
      <div className={styles.row}>
        <label className={styles.field}>
          <span className="visually-hidden">Day</span>
          <input
            className={styles.day}
            type="number"
            min={1}
            max={daysInMonth(now.year, now.month)}
            value={now.day}
            onChange={(e) => e.target.value && set({ day: Number(e.target.value) })}
          />
        </label>
        <label className={styles.field}>
          <span className="visually-hidden">Month</span>
          <select value={now.month} onChange={(e) => set({ month: Number(e.target.value) })}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className="visually-hidden">Year</span>
          <input
            className={styles.year}
            type="number"
            min={1}
            value={yearText ?? yearNumber}
            onChange={(e) => {
              setYearText(e.target.value);
              commitYear(e.target.value, era);
            }}
            onBlur={() => setYearText(null)}
          />
        </label>
        <label className={styles.field}>
          <span className="visually-hidden">Era</span>
          <select value={era} onChange={(e) => commitYear(String(yearNumber), e.target.value as 'AD' | 'BC')}>
            <option value="AD">AD</option>
            <option value="BC">BC</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className="visually-hidden">Time</span>
          <input
            type="time"
            value={`${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              if (Number.isFinite(h) && Number.isFinite(m)) set({ hour: h, minute: m, second: 0 });
            }}
          />
        </label>
        <span className={styles.zone}>{zoneLabel(place, clock.jdTT)}</span>
        <button type="button" className={styles.button} onClick={() => clock.setJdTT(ttFromUt(jdNow()))}>
          Now
        </button>
      </div>
      <div className={styles.row}>
        {!noPlay && (
          <>
            <button
              type="button"
              className={styles.button}
              aria-pressed={clock.playing}
              onClick={() => clock.setPlaying(!clock.playing)}
              disabled={clock.jdTT >= clock.max}
            >
              {clock.playing ? '❚❚ Pause' : '▶ Play'}
            </button>
            <label className={styles.field}>
              <span className={styles.label}>Speed</span>
              <select value={clock.speed} onChange={(e) => clock.setSpeed(Number(e.target.value))}>
                {speedOptions.map((s) => (
                  <option key={s.seconds} value={s.seconds}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <span className={styles.stepGroup} role="group" aria-labelledby={`${id}-step`}>
          <span id={`${id}-step`} className={styles.label}>
            Step
          </span>
          <button
            type="button"
            className={styles.button}
            aria-label={`Back ${STEP_LABELS[unit]}`}
            onClick={() => clock.setJdTT(stepTime(clock.jdTT, unit, -1, place))}
          >
            ◀
          </button>
          <select aria-label="Step size" value={unit} onChange={(e) => setUnit(e.target.value as StepUnit)}>
            {steps.map((s) => (
              <option key={s} value={s}>
                {STEP_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.button}
            aria-label={`Forward ${STEP_LABELS[unit]}`}
            onClick={() => clock.setJdTT(stepTime(clock.jdTT, unit, 1, place))}
          >
            ▶
          </button>
        </span>
        {children}
      </div>
      {julian && <p className={styles.note}>Dates before 15 October 1582 are in the Julian calendar, as people wrote them at the time.</p>}
    </div>
  );
}
