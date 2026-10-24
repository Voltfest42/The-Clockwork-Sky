import { useMemo, useState, type ReactNode } from 'react';
import { calendarFromJd } from '../core/time/calendar';
import { jdNow } from '../core/time/zone';
import { Caption, Figure } from '../viz/Figure';
import { MONTHS } from '../viz/time/format';
import { analemmaPoint } from './analemma';
import { dayLabel, dayOfYearOf } from './sunsYear';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Build the analemma: the Sun's place at the same clock time every day for a
 * year, drawn as the equation of time (across) against the Sun's declination
 * (up), with the two causes, the tilt and the ellipse, switched on or off.
 */

const W = 560;
const H = 380;
const PAD = { left: 56, right: 20, top: 16, bottom: 44 };
const X_RANGE = 20; // minutes either side
const Y_RANGE = 25; // degrees either side
const YEAR = 2026; // only for the dates' labels: the model is the same every year

const sx = (minutes: number) => PAD.left + ((minutes + X_RANGE) / (2 * X_RANGE)) * (W - PAD.left - PAD.right);
const sy = (degrees: number) => PAD.top + ((Y_RANGE - degrees) / (2 * Y_RANGE)) * (H - PAD.top - PAD.bottom);

function today(): number {
  const date = calendarFromJd(jdNow());
  return dayOfYearOf(YEAR, date.month, Math.min(28, Math.floor(date.day)));
}

export function AnalemmaFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [start] = useState(today);
  const [day, setDay] = useState(start);
  const [tilt, setTilt] = useState(true);
  const [ellipse, setEllipse] = useState(true);

  const points = useMemo(() => Array.from({ length: 365 }, (_, d) => analemmaPoint(d, { tilt, ellipse })), [tilt, ellipse]);
  const now = points[day];
  const date = dayLabel(YEAR, day);
  const minutes = Math.abs(now.equationOfTime);
  const mm = Math.floor(minutes);
  const ss = Math.round((minutes - mm) * 60);
  const sundial = minutes < 0.1 ? 'agrees with the clock' : `is ${mm} min ${String(ss % 60).padStart(2, '0')} s ${now.equationOfTime > 0 ? 'ahead of' : 'behind'} the clock`;

  const reset = () => {
    setDay(start);
    setTilt(true);
    setEllipse(true);
  };

  const shape =
    tilt && ellipse
      ? 'Both together give the real, lopsided figure eight: a small loop in the north and a big one in the south.'
      : tilt
        ? 'The tilt alone gives a neat, symmetrical figure eight.'
        : ellipse
          ? 'The ellipse alone gives no eight at all: the Sun stays on the equator and just slides to and fro.'
          : 'With neither, the Sun comes back to the same spot every day: the sundial and the clock always agree.';

  return (
    <Figure
      number={number}
      title="Build the analemma"
      description="A chart of the Sun’s place at the same clock time every day for a year: up and down with the seasons, and to and fro as sundial time runs ahead of and behind clock time. Together the two motions trace a figure eight, the analemma. Switches turn off its two causes, the tilt of Earth’s axis and the ellipse of its orbit."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the Sun at the same clock time each day', symbol: <circle r="3" fill="var(--series-1)" /> },
        { label: 'the chosen day', symbol: <circle r="6" fill="var(--sun)" stroke="var(--sun-edge)" strokeWidth="1.5" /> },
      ]}
      simplified={
        <p>
          Earth’s orbit is a simple ellipse with today’s shape and timing, and the tilt is a steady 23.44°. On the sky the eight is about six
          times taller than it is wide: here the sideways scale, in minutes of time, is stretched to make it readable (a minute is a quarter of a
          degree). Photographs of the analemma also tilt it, depending on your latitude.
        </p>
      }
    >
      <div>
        <div className={styles.controls}>
          <label className={styles.slider}>
            Date
            <input type="range" min={0} max={364} step={1} value={day} onChange={(e) => setDay(Number(e.target.value))} aria-valuetext={date} />
            <output>{date}</output>
          </label>
          <div className={styles.toggles} role="group" aria-label="Causes">
            <span className={styles.togglesLabel}>Causes</span>
            <button type="button" className={styles.toggle} aria-pressed={tilt} onClick={() => setTilt(!tilt)}>
              Tilted axis
            </button>
            <button type="button" className={styles.toggle} aria-pressed={ellipse} onClick={() => setEllipse(!ellipse)}>
              Elliptical orbit
            </button>
          </div>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={seasonStyles.svgLight}
          role="img"
          aria-label={`The analemma${tilt ? '' : ' without the tilt'}${ellipse ? '' : ' without the ellipse'}. On ${date} the sundial ${sundial} and the Sun is ${Math.abs(now.declination).toFixed(1)}° ${now.declination >= 0 ? 'north' : 'south'} of the equator.`}
        >
          {[-20, -10, 0, 10, 20].map((m) => (
            <g key={`x${m}`}>
              <line x1={sx(m)} x2={sx(m)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--border)" />
              <text x={sx(m)} y={H - PAD.bottom + 15} fontSize="11" fill="var(--text-muted)" textAnchor="middle">
                {m > 0 ? `+${m}` : m}
              </text>
            </g>
          ))}
          {[-20, -10, 0, 10, 20].map((d) => (
            <g key={`y${d}`}>
              <line x1={PAD.left} x2={W - PAD.right} y1={sy(d)} y2={sy(d)} stroke={d === 0 ? 'var(--text-muted)' : 'var(--border)'} />
              <text x={PAD.left - 6} y={sy(d) + 4} fontSize="11" fill="var(--text-muted)" textAnchor="end">
                {d > 0 ? `${d}° N` : d < 0 ? `${-d}° S` : '0°'}
              </text>
            </g>
          ))}
          <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} fontSize="12" fontWeight="600" fill="var(--text)" textAnchor="middle">
            Sundial minus clock time, minutes (sundial ahead → right)
          </text>
          <text transform={`translate(14 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} fontSize="12" fontWeight="600" fill="var(--text)" textAnchor="middle">
            The Sun’s declination
          </text>
          {points.map((p, d) => (
            <circle key={d} cx={sx(p.equationOfTime)} cy={sy(p.declination)} r="2.2" fill="var(--series-1)" opacity="0.8" />
          ))}
          {MONTHS.map((name, m) => {
            const p = points[dayOfYearOf(YEAR, m + 1, 1)];
            return (
              <text key={name} x={sx(p.equationOfTime) + 6} y={sy(p.declination) + 4} fontSize="10.5" fill="var(--text-muted)">
                1 {name.slice(0, 3)}
              </text>
            );
          })}
          <circle cx={sx(now.equationOfTime)} cy={sy(now.declination)} r="7" fill="var(--sun)" stroke="var(--sun-edge)" strokeWidth="2" />
        </svg>
        <div className={styles.readout}>
          <span>
            The sundial <b>{sundial}</b>
          </span>
          <span>
            Sun: <b>
              {Math.abs(now.declination).toFixed(1)}° {now.declination >= 0 ? 'north' : 'south'}
            </b>{' '}
            of the equator
          </span>
        </div>
      </div>
      <Caption>
        <b>{date}:</b> the sundial {sundial}. {shape}
      </Caption>
    </Figure>
  );
}
