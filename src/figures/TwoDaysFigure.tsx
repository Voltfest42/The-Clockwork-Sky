import { useRef, useState, type ReactNode } from 'react';
import { TROPICAL_YEAR, siderealDayFor, starTransitsBy, sunTransitsBy, formatDayClock } from './twoDays';
import { Caption, Figure } from '../viz/Figure';
import { onSky } from './sky/legend';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Earth from above the North Pole, spinning as it goes round the Sun. Both
 * turn anticlockwise. The yellow marker is you; the line out through you is
 * your meridian, pointing at whatever is due south and highest in your sky.
 */

const YEARS = [
  { days: TROPICAL_YEAR, label: 'Real year (365¼ days)' },
  { days: 30, label: 'A 30-day year' },
  { days: 12, label: 'A 12-day year' },
] as const;

/** Simulated hours per real second while playing. */
const HOURS_PER_SECOND = 4;

const W = 640;
const H = 400;
const SUN = { x: 300, y: 215 };
const ORBIT = 150;
const EARTH = 30;

interface Event {
  kind: 'star' | 'sun';
  t: number;
}

export function TwoDaysFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [t, setT] = useState(0); // days since the start, when you face the Sun and the star together
  const [yearIndex, setYearIndex] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const year = YEARS[yearIndex].days;
  const siderealDay = siderealDayFor(year);

  /** Moves to a new time, logging any meridian crossings on the way. */
  const goTo = (next: number) => {
    const found: Event[] = [];
    for (let k = starTransitsBy(t, year) + 1; k <= starTransitsBy(next, year); k++) found.push({ kind: 'star', t: k * siderealDay });
    for (let k = sunTransitsBy(t) + 1; k <= sunTransitsBy(next); k++) found.push({ kind: 'sun', t: k });
    if (found.length) setEvents((list) => [...list, ...found.sort((a, b) => a.t - b.t)].slice(-6));
    setT(next);
  };

  useAnimationFrame(playing && onScreen && !reducedMotion, (dt) => goTo(t + (dt * HOURS_PER_SECOND) / 24));

  const nextStar = () => goTo((starTransitsBy(t, year) + 1) * siderealDay);
  const nextSun = () => goTo(sunTransitsBy(t) + 1);

  const reset = () => {
    setT(0);
    setPlaying(false);
    setEvents([]);
    setYearIndex(2);
  };

  // Angles in the usual maths sense (anticlockwise from +x), with y up; the SVG flips y.
  const orbitAngle = -Math.PI / 2 + (2 * Math.PI * t) / year;
  const earth = { x: SUN.x + ORBIT * Math.cos(orbitAngle), y: SUN.y - ORBIT * Math.sin(orbitAngle) };
  const starDirection = Math.PI / 2; // where the Sun was at the start: straight up
  const spin = starDirection + (2 * Math.PI * t) / siderealDay; // your meridian's direction
  const towardsSun = orbitAngle + Math.PI;
  const at = (angle: number, r: number) => ({ x: earth.x + r * Math.cos(angle), y: earth.y - r * Math.sin(angle) });
  const you = at(spin, EARTH);
  const meridianEnd = at(spin, 125);
  const starEnd = at(starDirection, 125);
  const offStar = Math.abs(Math.atan2(Math.sin(spin - starDirection), Math.cos(spin - starDirection)));
  const offSun = Math.abs(Math.atan2(Math.sin(spin - towardsSun), Math.cos(spin - towardsSun)));
  const facingStar = offStar < 0.02;
  const facingSun = offSun < 0.02;
  const sunExtraMinutes = (24 - siderealDay * 24) * 60;

  const lastStar = [...events].reverse().find((e) => e.kind === 'star');
  const lastSun = [...events].reverse().find((e) => e.kind === 'sun');

  return (
    <Figure
      number={number}
      title="One spin, two days"
      description="A diagram of Earth spinning as it goes round the Sun, seen from above. It times how long Earth takes to bring a distant star back to your meridian (a star day) and to bring the Sun back (a Sun day). The Sun day is about four minutes longer, because Earth has moved along its orbit and must turn a little further. Short made-up years make the difference easy to see."
      height={730}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'you, and your meridian (the line overhead, north to south)', symbol: onSky(<path d="M-10 0 H10" stroke="#ffd166" strokeWidth="2.5" />) },
        { label: 'the direction to a distant star: the same from anywhere on the orbit', symbol: onSky(<path d="M-10 0 H10" stroke="#9fc3ff" strokeWidth="2" strokeDasharray="4 3" />) },
        { label: 'the direction to the Sun', symbol: onSky(<path d="M-10 0 H10" stroke="#d97706" strokeWidth="2" />) },
        { label: 'night side of Earth', symbol: onSky(<circle r="7" fill="#21304f" stroke="var(--text-muted)" />) },
      ]}
      simplified={
        <p>
          Earth and its orbit are drawn far too big, and the short years exaggerate how far Earth moves in a day so the difference is easy to see.
          The orbit is drawn as a circle, and the tilt of Earth’s axis is left out: neither changes the count of turns.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)} disabled={reducedMotion}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={nextStar}>
            Next star crossing
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={nextSun}>
            Next Sun crossing
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
          aria-label={`Earth seen from above its North Pole, ${formatDayClock(t)} after the start. ${facingStar ? 'Your meridian points at the distant star. ' : ''}${facingSun ? 'Your meridian points at the Sun: it is noon. ' : ''}`}
          style={{ display: 'block', background: 'var(--sky-bg)', borderRadius: 'var(--radius)' }}
        >
          <circle cx={SUN.x} cy={SUN.y} r={ORBIT} fill="none" stroke="var(--sky-grid)" strokeWidth="1.5" />
          {/* The distant star, far off the top of the picture. */}
          <text x={W - 16} y={26} textAnchor="end" fontSize="13" fill="#9fc3ff">
            ↑ to a distant star (much farther than this)
          </text>
          <line x1={earth.x} y1={earth.y} x2={starEnd.x} y2={starEnd.y} stroke="#9fc3ff" strokeWidth={facingStar ? 3.5 : 2} strokeDasharray="6 4" />
          <line x1={earth.x} y1={earth.y} x2={SUN.x} y2={SUN.y} stroke="#d97706" strokeWidth={facingSun ? 3.5 : 2} />
          <circle cx={SUN.x} cy={SUN.y} r={26} fill="var(--sun)" />
          <text x={SUN.x} y={SUN.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#5b3b00">
            Sun
          </text>
          {/* Earth, with its night side away from the Sun. */}
          <circle cx={earth.x} cy={earth.y} r={EARTH} fill="#3d6fb5" />
          <path
            d={`M ${at(towardsSun + Math.PI / 2, EARTH).x} ${at(towardsSun + Math.PI / 2, EARTH).y} A ${EARTH} ${EARTH} 0 0 0 ${at(towardsSun - Math.PI / 2, EARTH).x} ${at(towardsSun - Math.PI / 2, EARTH).y} Z`}
            fill="#16213a"
            opacity="0.85"
          />
          <line x1={earth.x} y1={earth.y} x2={meridianEnd.x} y2={meridianEnd.y} stroke="#ffd166" strokeWidth="2.5" />
          <circle cx={you.x} cy={you.y} r="5.5" fill="#ffd166" stroke="#5b3b00" />
          <text x={you.x + 8} y={you.y - 8} fontSize="13" fontWeight="700" fill="#ffd166">
            You
          </text>
          <text x={16} y={H - 40} fontSize="14" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            Time since the start: {formatDayClock(t)}
          </text>
          <text x={16} y={H - 18} fontSize="13" fill="var(--sky-muted)">
            {facingStar ? '★ The star is on your meridian' : facingSun ? '☀ Noon: the Sun is on your meridian' : ' '}
          </text>
        </svg>
        <div className={styles.readout}>
          <span>
            Star day: <b>{formatDayClock(siderealDay)}</b>
          </span>
          <span>
            Sun day: <b>24 h 00 min</b>
          </span>
          <span>
            Difference: <b>{sunExtraMinutes < 60 ? `${sunExtraMinutes.toFixed(1)} min` : `${Math.floor(sunExtraMinutes / 60)} h ${Math.round(sunExtraMinutes % 60)} min`}</b>
          </span>
        </div>
        <ul className={styles.hint} aria-live="polite" style={{ paddingLeft: 18 }}>
          {events.map((e, i) => (
            <li key={`${e.kind}-${e.t}-${i}`}>
              {e.kind === 'star' ? '★ The star crossed your meridian' : '☀ The Sun crossed your meridian (noon)'} at {formatDayClock(e.t)}
            </li>
          ))}
        </ul>
      </div>
      <Caption>
        {lastStar && lastSun && lastStar.t < lastSun.t
          ? `The star came back to your meridian ${formatDayClock(lastSun.t - lastStar.t)} before the Sun did. In that time Earth moved on along its orbit, so it had to turn a little more to face the Sun again.`
          : `In a year of ${year === TROPICAL_YEAR ? '365¼' : year} days, Earth turns ${year === TROPICAL_YEAR ? '366¼' : year + 1} times against the stars, but only ${year === TROPICAL_YEAR ? '365¼' : year} times against the Sun: going once round the Sun cancels one turn. So a star day is ${formatDayClock(siderealDay)}.`}
      </Caption>
    </Figure>
  );
}
