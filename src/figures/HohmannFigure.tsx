import { useRef, useState, type ReactNode } from 'react';
import { jdFromUnixMs } from '../core/time/julian';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { TRANSFER_PLANETS } from '../data/gravity';
import { arrivalMiss, craftPosition, LAUNCH_LEAD, marsLead, nextWindow, planetPosition, SYNODIC, TRANSFER } from './hohmann';
import { dateLabel } from './retrograde';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Get to Mars: launch a craft on a Hohmann transfer, half an ellipse from
 * Earth's orbit to Mars's that takes about 259 days. It only meets Mars if
 * Mars is about 44° ahead of Earth at launch, which happens every 26 months.
 */

const W = 560;
const H = 380;
const SCALE = 112;
const DAYS_PER_SECOND = 60;
const MAX_DAYS = 1_000;
const EARTH = '#4f8cf5';
const MARS = '#e0663f';
const CRAFT = '#ffffff';

export function HohmannFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [today] = useState(() => Math.floor(jdFromUnixMs(Date.now()) - 0.5) + 0.5);
  const [offset, setOffset] = useState(0);
  const [launch, setLaunch] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  const jd = today + offset;
  const arrival = launch === null ? null : launch + TRANSFER.days;

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * DAYS_PER_SECOND;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 15;
    }
    const next = Math.min(MAX_DAYS, offset + step);
    // Stop at the arrival, and at the end of the slider.
    if (arrival !== null && jd < arrival && today + next >= arrival) {
      setOffset(arrival - today);
      setPlaying(false);
    } else {
      setOffset(next);
      if (next >= MAX_DAYS) setPlaying(false);
    }
  });

  const reset = () => {
    setOffset(0);
    setLaunch(null);
    setPlaying(false);
  };
  const fly = () => {
    setLaunch(jd);
    if (!reducedMotion) setPlaying(true);
  };
  const toWindow = () => {
    setOffset(Math.min(MAX_DAYS, Math.round(nextWindow(jd + 1) - today)));
    setLaunch(null);
    setPlaying(false);
  };

  const cx = W / 2;
  const cy = H / 2;
  const sx = (x: number) => cx + x * SCALE;
  const sy = (y: number) => cy - y * SCALE;
  const earth = planetPosition('earth', jd);
  const mars = planetPosition('mars', jd);
  const craft = launch !== null ? craftPosition(launch, jd) : null;
  const lead = marsLead(jd) / DEG;
  const nextLaunch = nextWindow(jd);
  const miss = launch !== null ? arrivalMiss(launch) / DEG : null;
  const arrived = arrival !== null && jd >= arrival;

  // The transfer's half-ellipse from a launch now (or the actual launch), for drawing.
  const from = launch ?? jd;
  const arc = Array.from({ length: 61 }, (_, i) => craftPosition(from, from + (TRANSFER.days * i) / 60)!)
    .map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
    .join(' ');

  let caption: string;
  if (launch === null)
    caption = `Mars is ${lead.toFixed(0)}° ${lead >= 0 ? 'ahead of' : 'behind'} Earth. For the craft to meet it, Mars must be about ${(LAUNCH_LEAD / DEG).toFixed(0)}° ahead at launch. The next window opens around ${dateLabel(nextLaunch)}.`;
  else if (!arrived) caption = `On the way: ${Math.round(jd - launch)} of ${Math.round(TRANSFER.days)} days. The craft coasts the whole way, slowing as it climbs away from the Sun.`;
  else if (Math.abs(miss!) < 5) caption = `Arrived after ${Math.round(TRANSFER.days)} days, and Mars is there: launched in the window, the craft meets it at the far end of the ellipse.`;
  else caption = `Arrived after ${Math.round(TRANSFER.days)} days, but Mars is ${Math.abs(miss!).toFixed(0)}° ${miss! > 0 ? 'ahead' : 'behind'}, about ${Math.round(Math.abs(miss!) * DEG * TRANSFER_PLANETS.mars.a * 149.6).toLocaleString('en-GB')} million km away along its orbit. Try launching in a window.`;

  return (
    <Figure
      number={number}
      title="Get to Mars"
      description="Earth and Mars go round the Sun, and a spacecraft launched from Earth follows half an ellipse that just reaches Mars’s orbit, a Hohmann transfer of about 259 days. It only meets Mars if Mars is about 44° ahead of Earth at launch, which happens once every 26 months: the launch windows."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'Earth', symbol: onSky(<circle r="5" fill={EARTH} />) },
        { label: 'Mars', symbol: onSky(<circle r="4" fill={MARS} />) },
        { label: 'the transfer orbit (half an ellipse)', symbol: onSky(<path d="M-10 4 Q0 -10 10 4" stroke={CRAFT} strokeWidth="1.5" strokeDasharray="3 3" fill="none" />) },
      ]}
      simplified={
        <p>
          Earth’s and Mars’s orbits are drawn as circles in one plane, with the planets at their average positions, so the windows here can be a
          few weeks from the real ones (Mars’s orbit is noticeably oval). The craft feels only the Sun: no escape from Earth, no capture by Mars,
          no course corrections. Real missions often take faster, costlier paths.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={fly} disabled={launch !== null && !arrived}>
            🚀 Launch now
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={toWindow}>
            Go to the next window
          </button>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={caption}>
          <rect width={W} height={H} fill="#070b16" />
          <circle cx={cx} cy={cy} r={TRANSFER_PLANETS.earth.a * SCALE} fill="none" stroke={EARTH} strokeOpacity={0.5} strokeWidth="1" />
          <circle cx={cx} cy={cy} r={TRANSFER_PLANETS.mars.a * SCALE} fill="none" stroke={MARS} strokeOpacity={0.5} strokeWidth="1" />
          <path d={arc} fill="none" stroke={CRAFT} strokeWidth="1.4" strokeDasharray="4 4" opacity={launch === null ? 0.45 : 0.9} />
          <circle cx={cx} cy={cy} r={10} fill="var(--sun)" />
          <circle cx={sx(earth.x)} cy={sy(earth.y)} r={6} fill={EARTH} />
          <circle cx={sx(mars.x)} cy={sy(mars.y)} r={5} fill={MARS} />
          {craft && <path d={`M${sx(craft.x)} ${sy(craft.y) - 6} l5 10 h-10 Z`} fill={CRAFT} />}
          <text x={14} y={22} fontSize="13" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {dateLabel(jd)} · Mars {Math.abs(lead).toFixed(0)}° {lead >= 0 ? 'ahead of' : 'behind'} Earth
          </text>
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Days from today
          <input
            type="range"
            min={0}
            max={MAX_DAYS}
            step={1}
            value={Math.round(offset)}
            onChange={(e) => {
              const v = Number(e.target.value);
              setOffset(v);
              setPlaying(false);
              if (launch !== null && today + v < launch) setLaunch(null);
            }}
            aria-valuetext={`${dateLabel(jd)}: Mars ${Math.abs(lead).toFixed(0)}° ${lead >= 0 ? 'ahead of' : 'behind'} Earth`}
          />
          <output>{Math.round(offset)} days</output>
        </label>
        <div className={styles.readout}>
          <span>
            The trip: <b>{Math.round(TRANSFER.days)} days</b>
          </span>
          <span>
            Launch when Mars is <b>{(LAUNCH_LEAD / DEG).toFixed(0)}°</b> ahead
          </span>
          <span>
            Windows every <b>{Math.round(SYNODIC)} days</b> (about {(SYNODIC / 30.44).toFixed(0)} months)
          </span>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
