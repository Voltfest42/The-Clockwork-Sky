import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { moonAge } from '../core/ephemeris/lunation';
import { phaseNameOf } from '../core/ephemeris/phase';
import { SYNODIC_MONTH } from '../core/ephemeris/lunation';
import { ttFromUt } from '../core/time/deltaT';
import { jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { ageOfElongation, altitudeOf, elongationOfAge, hourText, illuminated, litOnRight, litPath, moonHourAngle, moonTimes, sunHourAngle } from './phases';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The phase machine: the Sun, Earth and the Moon from above the North Pole,
 * with the Moon draggable round its orbit, beside the Moon as it looks from
 * Earth and where it is in your sky at the chosen hour. The Sun lights half of
 * the Moon all the time; the phase is how much of that half faces us. An
 * "Earth's shadow" switch shows where the shadow really falls.
 */

const W = 460;
const H = 400;
const EARTH = { x: 250, y: 200 };
const EARTH_R = 34;
const ORBIT = 150;
const MOON_R = 15;

/** A point at an angle (anticlockwise from +x, y up) and distance from Earth's centre, in SVG coordinates. */
const at = (angle: number, r: number) => ({ x: EARTH.x + r * Math.cos(angle), y: EARTH.y - r * Math.sin(angle) });

const PREDICTIONS = [
  { label: 'Higher, and farther from where the Sun set', correct: true },
  { label: 'In the same place', correct: false },
  { label: 'Lower, closer to where the Sun set', correct: false },
  { label: 'Not in the sky at all', correct: false },
];

const START = { age: 2, hour: 18 };

type Hemisphere = 'north' | 'south';

function whereInSky(hourAngle: number, hemisphere: Hemisphere): string {
  const alt = altitudeOf(hourAngle) / DEG;
  if (alt < 0) return 'below the horizon';
  if (alt > 80) return 'almost overhead';
  const side = hourAngle < 0 ? 'east' : 'west';
  const toward = hemisphere === 'north' ? 'south' : 'north';
  return `${Math.round(alt)}° up${alt > 60 ? `, high in the ${toward}-${side}` : ` in the ${side}`}`;
}

export function PhaseMachineFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [age, setAge] = useState(START.age);
  const [hour, setHour] = useState(START.hour);
  const [shadow, setShadow] = useState(false);
  const [hemisphere, setHemisphere] = useState<Hemisphere>('north');
  const [guess, setGuess] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const e = elongationOfAge(age);
  const moonAngle = Math.PI + e; // the Sun is off to the left, at angle π
  const observerAngle = Math.PI + sunHourAngle(hour);
  const moon = at(moonAngle, ORBIT);
  const you = at(observerAngle, EARTH_R);
  const phase = phaseNameOf(e);
  const lit = illuminated(e);
  const times = moonTimes(e);
  const sunHA = sunHourAngle(hour);
  const moonHA = moonHourAngle(hour, e);
  const sunUp = altitudeOf(sunHA) > 0;
  const moonUp = altitudeOf(moonHA) > 0;

  const setFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((event.clientX - box.left) / box.width) * W - EARTH.x;
    const y = EARTH.y - ((event.clientY - box.top) / box.height) * H;
    if (Math.hypot(x, y) < EARTH_R) return;
    setAge(Math.round(ageOfElongation(Math.atan2(y, x) - Math.PI) * 4) / 4);
  };

  const onKey = (event: KeyboardEvent<SVGGElement>) => {
    const step = event.shiftKey ? 0.25 : 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') setAge((a) => (a + step) % SYNODIC_MONTH);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') setAge((a) => (a - step + SYNODIC_MONTH) % SYNODIC_MONTH);
    else if (event.key === 'Home') setAge(0);
    else return;
    event.preventDefault();
  };

  const reset = () => {
    setAge(START.age);
    setHour(START.hour);
    setShadow(false);
    setHemisphere('north');
    setGuess(null);
    setChecked(null);
  };

  const today = () => setAge(Math.round(moonAge(ttFromUt(jdNow())) * 4) / 4);
  const ageText = `${age.toFixed(age % 1 ? 2 : 0)} ${age === 1 ? 'day' : 'days'} after new Moon`;
  const shadowHitsMoon = Math.abs(Math.sin(e)) * ORBIT < EARTH_R && Math.cos(e) < 0;

  return (
    <Figure
      number={number}
      title="The phase machine"
      description="The Sun, Earth and the Moon seen from above the North Pole, with the Sun far off to the left. Whatever the phase, the Sun lights the half of the Moon that faces it. Beside it, the Moon as you see it from Earth, and where it is in your sky at the chosen hour. Drag the Moon round its orbit to see its phase change from new to full and back, when it rises and sets, and why you can often see it in the daytime."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'sunlight, from the far left', symbol: onSky(<path d="M-10 0 H8 M4 -4 L9 0 L4 4" stroke="var(--sun)" strokeWidth="2" fill="none" />) },
        { label: 'the half of the Moon the Sun lights', symbol: onSky(<path d="M0 -7 A7 7 0 0 0 0 7 Z" fill="#ece9df" />) },
        { label: 'you, and your horizon', symbol: onSky(<path d="M-10 0 H10" stroke="#ffd166" strokeWidth="2.5" />) },
        { label: 'Earth’s shadow (with the switch on)', symbol: onSky(<rect x="-10" y="-5" width="20" height="10" fill="#000" stroke="#56607a" />) },
      ]}
      simplified={
        <>
          <p>
            The Moon’s orbit is drawn far too small: it is really 30 Earth-widths across, and the Sun is 400 times farther away still. The Moon
            and Earth are drawn too big, and the orbit as a circle.
          </p>
          <p>
            The sky and the times are for an idealised place: on the equator, at an equinox, with the Moon’s orbit in the plane of the equator.
            Then the Sun rises at 06:00 and sets at 18:00, and the Moon rises about 50 minutes later each day. Elsewhere and at other times of
            year the times shift, but the pattern stays the same.
          </p>
        </>
      }
    >
      <div>
        <div className={seasonStyles.predict}>
          <fieldset>
            <legend>Predict first: the Moon is a thin crescent in the west at sunset, as shown. Where will it be at sunset three days later?</legend>
            {PREDICTIONS.map((p, i) => (
              <label key={p.label} className={figureStyles.checkbox}>
                <input type="radio" name={`moon-guess-${number}`} checked={guess === i} onChange={() => setGuess(i)} />
                {p.label}
              </label>
            ))}
            <button
              type="button"
              className={figureStyles.toolButton}
              disabled={guess === null}
              onClick={() => {
                setChecked(guess);
                setAge(START.age + 3);
                setHour(18);
              }}
            >
              Check, and move on three days
            </button>
          </fieldset>
          <div aria-live="polite">
            {checked !== null && (
              <p className={seasonStyles.verdict}>
                <span className={PREDICTIONS[checked].correct ? seasonStyles.right : seasonStyles.wrong}>{PREDICTIONS[checked].correct ? '✓ Right.' : '✗ Not quite.'}</span>{' '}
                In three days the Moon moves about 37° further round its orbit, east of the Sun, so at sunset it stands higher, farther from where
                the Sun went down, and it has grown fatter. Each evening it is about 12° further east.
              </p>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <label className={styles.slider}>
            Moon
            <input
              type="range"
              min={0}
              max={29.5}
              step={0.25}
              value={age}
              onChange={(ev) => setAge(Number(ev.target.value))}
              aria-valuetext={`${ageText}: ${phase}`}
            />
            <output>{age.toFixed(1)} days</output>
          </label>
          <label className={styles.slider}>
            Time
            <input type="range" min={0} max={23.75} step={0.25} value={hour} onChange={(ev) => setHour(Number(ev.target.value))} aria-valuetext={hourText(hour)} />
            <output>{hourText(hour)}</output>
          </label>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <button type="button" className={styles.toggle} aria-pressed={shadow} onClick={() => setShadow(!shadow)}>
              Earth’s shadow
            </button>
            <span className={figureStyles.segmented} role="group" aria-label="Your hemisphere">
              <button type="button" aria-pressed={hemisphere === 'north'} onClick={() => setHemisphere('north')}>
                North
              </button>
              <button type="button" aria-pressed={hemisphere === 'south'} onClick={() => setHemisphere('south')}>
                South
              </button>
            </span>
            <button type="button" className={figureStyles.toolButton} onClick={today}>
              Tonight’s Moon
            </button>
            {[
              ['New', 0],
              ['First quarter', SYNODIC_MONTH / 4],
              ['Full', SYNODIC_MONTH / 2],
              ['Last quarter', (3 * SYNODIC_MONTH) / 4],
            ].map(([label, a]) => (
              <button key={label} type="button" className={figureStyles.toolButton} onClick={() => setAge(a as number)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.split}>
          <div>
            <p className={styles.panelTitle}>From above the North Pole</p>
            <svg
              ref={svg}
              viewBox={`0 0 ${W} ${H}`}
              className={seasonStyles.svg}
              onPointerDown={(ev) => {
                dragging.current = true;
                (ev.target as Element).setPointerCapture?.(ev.pointerId);
                setFromPointer(ev);
              }}
              onPointerMove={(ev) => dragging.current && setFromPointer(ev)}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
              aria-labelledby={`${number}-above`}
            >
              <title id={`${number}-above`}>{`The Moon ${ageText}, ${phase}, seen from above with the Sun to the left`}</title>
              {/* Sunlight from the left. */}
              {[60, 130, 200, 270, 340].map((y) => (
                <g key={y} stroke="var(--sun)" strokeWidth="1.5" opacity="0.7" fill="none">
                  <path d={`M 8 ${y} H 44`} />
                  <path d={`M 38 ${y - 5} L 45 ${y} L 38 ${y + 5}`} />
                </g>
              ))}
              <text x="10" y="26" fontSize="13" fill="var(--sun)">
                Sunlight
              </text>
              <circle cx={EARTH.x} cy={EARTH.y} r={ORBIT} fill="none" stroke="#3b4c72" strokeWidth="1.5" strokeDasharray="4 4" />
              {shadow && (
                <g>
                  <polygon
                    points={`${EARTH.x},${EARTH.y - EARTH_R} ${W},${EARTH.y - EARTH_R * 0.7} ${W},${EARTH.y + EARTH_R * 0.7} ${EARTH.x},${EARTH.y + EARTH_R}`}
                    fill="#000"
                    opacity="0.75"
                  />
                  <text x={W - 8} y={EARTH.y + EARTH_R + 16} fontSize="12" fill="#c3cbe0" textAnchor="end">
                    Earth’s shadow
                  </text>
                </g>
              )}
              {/* Earth, lit on the left, with you on it and your horizon. */}
              <circle cx={EARTH.x} cy={EARTH.y} r={EARTH_R} fill="#16213a" />
              <path d={`M ${EARTH.x} ${EARTH.y - EARTH_R} A ${EARTH_R} ${EARTH_R} 0 0 0 ${EARTH.x} ${EARTH.y + EARTH_R} Z`} fill="#3d6fb5" />
              <line
                x1={you.x - 60 * Math.sin(observerAngle)}
                y1={you.y - 60 * Math.cos(observerAngle)}
                x2={you.x + 60 * Math.sin(observerAngle)}
                y2={you.y + 60 * Math.cos(observerAngle)}
                stroke="#ffd166"
                strokeWidth="2"
              />
              <circle cx={you.x} cy={you.y} r="5" fill="#ffd166" stroke="#5b3b00" />
              <text x={EARTH.x} y={EARTH.y + 5} fontSize="12" textAnchor="middle" fill="#e2e8f5">
                Earth
              </text>
              {/* The Moon: always lit on the side facing the Sun. */}
              <g
                tabIndex={0}
                role="slider"
                aria-label="The Moon’s place in its orbit"
                aria-valuemin={0}
                aria-valuemax={29.5}
                aria-valuenow={age}
                aria-valuetext={`${ageText}: ${phase}`}
                onKeyDown={onKey}
                className={seasonStyles.focusable}
                style={{ cursor: 'grab' }}
              >
                <circle cx={moon.x} cy={moon.y} r={MOON_R + 10} fill="transparent" />
                <circle cx={moon.x} cy={moon.y} r={MOON_R} fill={shadowHitsMoon && shadow ? '#5a2a1c' : '#3a3d47'} />
                <path d={`M ${moon.x} ${moon.y - MOON_R} A ${MOON_R} ${MOON_R} 0 0 0 ${moon.x} ${moon.y + MOON_R} Z`} fill={shadowHitsMoon && shadow ? '#8c3b22' : '#ece9df'} />
              </g>
              <text x={moon.x} y={moon.y - MOON_R - 8} fontSize="12" textAnchor="middle" fill="#e2e8f5">
                Moon
              </text>
            </svg>
          </div>
          <div>
            <p className={styles.panelTitle}>From Earth: the Moon, and your sky at {hourText(hour)}</p>
            <MoonDisc elongation={e} hemisphere={hemisphere} />
            <YourSky sunHA={sunHA} moonHA={moonHA} elongation={e} hemisphere={hemisphere} />
          </div>
        </div>

        <div className={styles.readout}>
          <span>
            Phase: <b>{phase}</b>, {Math.round(lit * 100)}% lit
          </span>
          <span>
            Rises <b>{hourText(times.rise)}</b>, highest <b>{hourText(times.highest)}</b>, sets <b>{hourText(times.set)}</b>
          </span>
          <span>
            At {hourText(hour)}: <b>{whereInSky(moonHA, hemisphere)}</b>
          </span>
        </div>
      </div>
      <Caption>
        <b>
          {ageText[0].toUpperCase() + ageText.slice(1)}, {phase}:
        </b>{' '}
        the Sun lights the half of the Moon that faces it, and {Math.round(lit * 100)}% of the side facing us is lit. The Moon rises at about{' '}
        {hourText(times.rise)} and sets at about {hourText(times.set)}.{' '}
        {moonUp && sunUp ? 'Right now both the Sun and the Moon are up: a daytime Moon. ' : ''}
        {shadow
          ? shadowHitsMoon
            ? 'Earth’s shadow points at the Moon now, at full Moon. It only falls on the Moon if the Moon is also close to the ecliptic, which happens a few times a year: a lunar eclipse.'
            : 'Earth’s shadow points away from the Sun, and misses the Moon except near full Moon: it has nothing to do with the phases.'
          : ''}
      </Caption>
    </Figure>
  );
}

/** The Moon as it looks from Earth: lit on the right while waxing in the north, on the left in the south. */
function MoonDisc({ elongation, hemisphere }: { elongation: number; hemisphere: Hemisphere }) {
  const r = 46;
  const mirror = litOnRight(elongation) !== (hemisphere === 'north');
  return (
    <svg viewBox="-80 -60 160 120" className={seasonStyles.svg} style={{ maxHeight: 140 }} role="img" aria-label={`The Moon as seen from Earth: ${phaseNameOf(elongation)}, ${Math.round(illuminated(elongation) * 100)}% lit`}>
      <circle r={r} fill="#2a2d36" />
      <path d={litPath(elongation, r)} fill="#ece9df" transform={mirror ? 'scale(-1 1)' : undefined} />
      <text x="-74" y="54" fontSize="10" fill="#9aa8c4">
        {hemisphere === 'north' ? 'facing south' : 'facing north'}
      </text>
    </svg>
  );
}

const SKY_W = 300;
const SKY_H = 150;

/**
 * Your sky as one arc from the eastern horizon, over the top, to the western
 * horizon (the idealised sky of the equator), with the Sun and the Moon on it.
 * Facing south from the north, east is on the left; facing north from the
 * south, it is on the right.
 */
function YourSky({ sunHA, moonHA, elongation, hemisphere }: { sunHA: number; moonHA: number; elongation: number; hemisphere: Hemisphere }) {
  const R = 118;
  const cx = SKY_W / 2;
  const base = SKY_H - 22;
  const flip = hemisphere === 'north' ? 1 : -1;
  const place = (ha: number) => ({ x: cx + flip * R * Math.sin(ha), y: base - R * Math.cos(ha) });
  const sunAlt = altitudeOf(sunHA) / DEG;
  const sky = sunAlt > 0 ? '#3d6ea8' : sunAlt > -12 ? '#1d2c55' : '#070b16';
  const sun = place(sunHA);
  const moon = place(moonHA);
  const mirror = litOnRight(elongation) !== (hemisphere === 'north');
  return (
    <svg viewBox={`0 0 ${SKY_W} ${SKY_H}`} className={seasonStyles.svg} style={{ marginTop: 8 }} role="img" aria-label={`Your sky: the Sun is ${sunAlt > 0 ? 'up' : 'down'} and the Moon is ${altitudeOf(moonHA) > 0 ? 'up' : 'down'}.`}>
      <rect width={SKY_W} height={base} fill={sky} />
      <path d={`M ${cx - R} ${base} A ${R} ${R} 0 0 1 ${cx + R} ${base}`} fill="none" stroke="rgba(226,232,245,0.35)" strokeDasharray="3 4" />
      {Math.abs(sunHA) < Math.PI / 2 && <circle cx={sun.x} cy={sun.y} r="11" fill="var(--sun)" />}
      {Math.abs(moonHA) < Math.PI / 2 && (
        <g transform={`translate(${moon.x} ${moon.y})`}>
          <circle r="10" fill="#2a2d36" stroke="rgba(236,233,223,0.35)" />
          <path d={litPath(elongation, 10)} fill="#ece9df" transform={mirror ? 'scale(-1 1)' : undefined} />
        </g>
      )}
      <rect y={base} width={SKY_W} height={SKY_H - base} fill="#22372a" />
      <text x={8} y={SKY_H - 6} fontSize="11" fill="#c8f0c8">
        {hemisphere === 'north' ? 'East' : 'West'}
      </text>
      <text x={SKY_W - 8} y={SKY_H - 6} fontSize="11" fill="#c8f0c8" textAnchor="end">
        {hemisphere === 'north' ? 'West' : 'East'}
      </text>
      <text x={cx} y={SKY_H - 6} fontSize="11" fill="#c8f0c8" textAnchor="middle">
        {hemisphere === 'north' ? 'South' : 'North'}
      </text>
    </svg>
  );
}
