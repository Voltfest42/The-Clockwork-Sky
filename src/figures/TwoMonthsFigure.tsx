import { useRef, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { onSky } from './sky/legend';
import { formatDays, newMoonsBy, SIDEREAL_MONTH, SIDEREAL_YEAR, starAlignmentsBy, synodicMonthFor } from './twoMonths';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Earth going round the Sun, and the Moon round Earth, seen from above. Both
 * go anticlockwise. The dashed line points from Earth to a distant star, in
 * the same direction wherever Earth is; the orange line points at the Sun.
 */

const YEARS = [
  { days: SIDEREAL_YEAR, label: 'Real year' },
  { days: 120, label: 'A 120-day year' },
] as const;

/** Simulated days per real second while playing. */
const DAYS_PER_SECOND = 4;

const W = 640;
const H = 450;
const SUN = { x: 320, y: 215 };
const ORBIT = 145;
const MOON_ORBIT = 58;
const EARTH = 16;
const MOON = 7;

interface Event {
  kind: 'star' | 'sun';
  t: number;
}

export function TwoMonthsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [t, setT] = useState(0);
  const [yearIndex, setYearIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const year = YEARS[yearIndex].days;
  const synodic = synodicMonthFor(year);

  const goTo = (next: number) => {
    const found: Event[] = [];
    for (let k = starAlignmentsBy(t) + 1; k <= starAlignmentsBy(next); k++) found.push({ kind: 'star', t: k * SIDEREAL_MONTH });
    for (let k = newMoonsBy(t, year) + 1; k <= newMoonsBy(next, year); k++) found.push({ kind: 'sun', t: k * synodic });
    if (found.length) setEvents((list) => [...list, ...found.sort((a, b) => a.t - b.t)].slice(-6));
    setT(next);
  };

  useAnimationFrame(playing && onScreen && !reducedMotion, (dt) => goTo(t + dt * DAYS_PER_SECOND));

  const reset = () => {
    setT(0);
    setPlaying(false);
    setEvents([]);
    setYearIndex(0);
  };

  // Angles anticlockwise from +x, with y up; the SVG flips y.
  const earthAngle = -Math.PI / 2 + (2 * Math.PI * t) / year;
  const earth = { x: SUN.x + ORBIT * Math.cos(earthAngle), y: SUN.y - ORBIT * Math.sin(earthAngle) };
  const starDirection = Math.PI / 2; // the Moon starts lined up with the Sun and with a star straight "up"
  const moonAngle = starDirection + (2 * Math.PI * t) / SIDEREAL_MONTH;
  const moon = { x: earth.x + MOON_ORBIT * Math.cos(moonAngle), y: earth.y - MOON_ORBIT * Math.sin(moonAngle) };
  const towardsSun = earthAngle + Math.PI;
  const offStar = Math.abs(Math.atan2(Math.sin(moonAngle - starDirection), Math.cos(moonAngle - starDirection)));
  const offSun = Math.abs(Math.atan2(Math.sin(moonAngle - towardsSun), Math.cos(moonAngle - towardsSun)));
  const facingStar = offStar < 0.03;
  const newMoon = offSun < 0.03;
  const starEnd = { x: earth.x + 130 * Math.cos(starDirection), y: earth.y - 130 * Math.sin(starDirection) };
  // The Moon's lit half faces the Sun.
  const sunFromMoon = Math.atan2(-(SUN.y - moon.y), SUN.x - moon.x);
  const litStart = { x: moon.x + MOON * Math.cos(sunFromMoon + Math.PI / 2), y: moon.y - MOON * Math.sin(sunFromMoon + Math.PI / 2) };
  const litEnd = { x: moon.x + MOON * Math.cos(sunFromMoon - Math.PI / 2), y: moon.y - MOON * Math.sin(sunFromMoon - Math.PI / 2) };

  const lastStar = [...events].reverse().find((e) => e.kind === 'star');
  const lastSun = [...events].reverse().find((e) => e.kind === 'sun');

  return (
    <Figure
      number={number}
      title="One orbit, two months"
      description="A diagram of the Moon going round Earth as Earth goes round the Sun, seen from above. It times how long the Moon takes to line up again with a distant star (27.3 days, a sidereal month) and with the Sun (29.5 days, from new Moon to new Moon). The Moon needs the extra two days because Earth has moved along its orbit."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'the direction to a distant star: the same from anywhere', symbol: onSky(<path d="M-10 0 H10" stroke="#9fc3ff" strokeWidth="2" strokeDasharray="4 3" />) },
        { label: 'the direction to the Sun', symbol: onSky(<path d="M-10 0 H10" stroke="#d97706" strokeWidth="2" />) },
        { label: 'the Moon, lit on the side facing the Sun', symbol: onSky(<g><circle r="6" fill="#3a3d47" /><path d="M0 -6 A6 6 0 0 0 0 6 Z" fill="#ece9df" /></g>) },
      ]}
      simplified={
        <p>
          The Moon’s orbit is drawn about 25 times too big compared with Earth’s, and both orbits as circles in one plane. The 120-day year
          exaggerates how far Earth moves in a month, so the difference is easy to see.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)} disabled={reducedMotion}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={() => goTo((starAlignmentsBy(t) + 1) * SIDEREAL_MONTH)}>
            Next star alignment
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={() => goTo((newMoonsBy(t, year) + 1) * synodic)}>
            Next new Moon
          </button>
          <span className={figureStyles.segmented} role="group" aria-label="Length of the year">
            {YEARS.map((y, i) => (
              <button
                key={y.label}
                type="button"
                aria-pressed={yearIndex === i}
                onClick={() => {
                  setYearIndex(i);
                  setT(0);
                  setEvents([]);
                }}
              >
                {y.label}
              </button>
            ))}
          </span>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`The Moon ${formatDays(t)} after the start. ${facingStar ? 'It is lined up with the distant star. ' : ''}${newMoon ? 'It is lined up with the Sun: new Moon. ' : ''}`}
          style={{ display: 'block', background: 'var(--sky-bg)', borderRadius: 'var(--radius)' }}
        >
          <circle cx={SUN.x} cy={SUN.y} r={ORBIT} fill="none" stroke="var(--sky-grid)" strokeWidth="1.5" />
          <text x={W - 16} y={H - 16} textAnchor="end" fontSize="13" fill="#9fc3ff">
            The dashed line points to a distant star, far beyond the top
          </text>
          <circle cx={earth.x} cy={earth.y} r={MOON_ORBIT} fill="none" stroke="#3b4c72" strokeDasharray="3 4" />
          <line x1={earth.x} y1={earth.y} x2={starEnd.x} y2={starEnd.y} stroke="#9fc3ff" strokeWidth={facingStar ? 3.5 : 2} strokeDasharray="6 4" />
          <line x1={earth.x} y1={earth.y} x2={SUN.x} y2={SUN.y} stroke="#d97706" strokeWidth={newMoon ? 3.5 : 2} />
          <circle cx={SUN.x} cy={SUN.y} r={26} fill="var(--sun)" />
          <text x={SUN.x} y={SUN.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#5b3b00">
            Sun
          </text>
          <circle cx={earth.x} cy={earth.y} r={EARTH} fill="#3d6fb5" />
          <circle cx={moon.x} cy={moon.y} r={MOON} fill="#3a3d47" />
          <path d={`M ${litStart.x} ${litStart.y} A ${MOON} ${MOON} 0 0 1 ${litEnd.x} ${litEnd.y} Z`} fill="#ece9df" />
          <text x={moon.x + 10} y={moon.y - 10} fontSize="12" fill="#e2e8f5">
            Moon
          </text>
          <text x={16} y={28} fontSize="14" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            Time since the start: {formatDays(t)}
          </text>
          <text x={16} y={50} fontSize="13" fill="var(--sky-muted)">
            {facingStar ? '★ The Moon is lined up with the star' : newMoon ? '● New Moon: the Moon is lined up with the Sun' : ' '}
          </text>
        </svg>
        <div className={styles.readout}>
          <span>
            Against the stars: <b>{formatDays(SIDEREAL_MONTH)}</b>
          </span>
          <span>
            New Moon to new Moon: <b>{formatDays(synodic)}</b>
          </span>
        </div>
        <ul className={styles.hint} aria-live="polite" style={{ paddingLeft: 18 }}>
          {events.map((e, i) => (
            <li key={`${e.kind}-${e.t}-${i}`}>
              {e.kind === 'star' ? '★ Lined up with the star' : '● New Moon'} at {formatDays(e.t)}
            </li>
          ))}
        </ul>
      </div>
      <Caption>
        {lastStar && lastSun && lastStar.t < lastSun.t
          ? `The Moon lined up with the star ${formatDays(lastSun.t - lastStar.t)} before it lined up with the Sun again. Meanwhile Earth had moved along its orbit, so the Sun’s direction had moved too, and the Moon had further to go.`
          : `The Moon goes once round Earth against the stars in ${formatDays(SIDEREAL_MONTH)}, but from new Moon to new Moon takes ${formatDays(synodic)}: the same idea as the star day and the Sun day in Chapter 2.`}
      </Caption>
    </Figure>
  );
}
