import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { LineChart } from '../viz/LineChart';
import { sunAngleAfter, harbourAngle, LUNAR_DAY_HOURS, MOON_TIDE, stretch, SUN_PULL_RATIO, SUN_TIDE_RATIO, SYNODIC_MONTH, tideHeight, tideRange } from './tides';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The tide maker. Arrows show the Moon's pull across Earth, stronger on the
 * near side; take away the pull at the centre and what is left stretches
 * Earth into two bulges. Add the Sun for spring and neap tides, turn Earth to
 * carry a harbour through both bulges, and read its water level on a chart.
 */

const W = 560;
const H = 340;
const EX = 205;
const EY = H / 2;
const R = 92;
const MOON_X = 478;
const PULL = 34;
const STRETCH = 10;
const BULGE = 14;
const SECONDS_PER_DAY = 10;
const MOON_ARROW = '#f6c453';
const COMBINED = '#ffd2a8';

type Mode = 'pull' | 'stretch';

/** Points inside Earth to draw arrows at, in Earth radii: the centre and two rings. */
const POINTS = [{ x: 0, y: 0 }, ...[0.5, 0.92].flatMap((r) => Array.from({ length: 12 }, (_, i) => ({ x: r * Math.cos((i * Math.PI) / 6), y: r * Math.sin((i * Math.PI) / 6) })))];

function Arrow({ x, y, dx, dy, colour }: { x: number; y: number; dx: number; dy: number; colour: string }) {
  const len = Math.hypot(dx, dy);
  if (len < 1.5) return <circle cx={x} cy={y} r={1.5} fill={colour} />;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(6, len * 0.45);
  const tx = x + dx;
  const ty = y + dy;
  return (
    <g stroke={colour} fill={colour} strokeWidth="1.8">
      <line x1={x} y1={y} x2={tx - ux * head * 0.6} y2={ty - uy * head * 0.6} />
      <path d={`M${tx} ${ty} L${tx - ux * head - uy * head * 0.5} ${ty - uy * head + ux * head * 0.5} L${tx - ux * head + uy * head * 0.5} ${ty - uy * head - ux * head * 0.5} Z`} stroke="none" />
    </g>
  );
}

export function TideFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mode, setMode] = useState<Mode>('pull');
  const [withSun, setWithSun] = useState(false);
  const [bulges, setBulges] = useState(false);
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(3);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = (dt * LUNAR_DAY_HOURS) / SECONDS_PER_DAY;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 1;
    }
    setHours((h) => (h + step) % LUNAR_DAY_HOURS);
  });

  const reset = () => {
    setMode('pull');
    setWithSun(false);
    setBulges(false);
    setDays(0);
    setHours(3);
    setPlaying(false);
  };

  const sunAngle = sunAngleAfter(days);
  // The drawing's y axis points down, so angles are measured clockwise on screen; flip y for the maths.
  const harbour = harbourAngle(hours);
  const range = tideRange(sunAngle, withSun);
  const moonOnly = tideRange(0, false);
  const height = tideHeight(harbour, sunAngle, withSun);
  const sunDir = { x: Math.cos(sunAngle), y: -Math.sin(sunAngle) };

  const water = useMemo(() => {
    const sunAngle = sunAngleAfter(days);
    const pts: string[] = [];
    for (let i = 0; i <= 180; i++) {
      const a = (2 * Math.PI * i) / 180;
      const r = R + (BULGE * tideHeight(a, sunAngle, withSun)) / MOON_TIDE;
      pts.push(`${i ? 'L' : 'M'}${(EX + r * Math.cos(a)).toFixed(1)} ${(EY - r * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ') + ' Z';
  }, [days, withSun]);

  const series = useMemo(() => {
    const sunAngle = sunAngleAfter(days);
    const points = Array.from({ length: 200 }, (_, i) => {
      const h = (LUNAR_DAY_HOURS * i) / 199;
      return { x: h, y: tideHeight(harbourAngle(h), sunAngle, withSun) };
    });
    return [{ name: 'Water level at the harbour', color: 'var(--series-1)', points }];
  }, [days, withSun]);

  const arrows = POINTS.map((p, i) => {
    const m = stretch(p.x, p.y, 0);
    const s = withSun && mode === 'stretch' ? stretch(p.x, p.y, sunAngle) : { x: 0, y: 0 };
    const base = mode === 'pull' ? PULL : 0;
    const dx = base + STRETCH * (m.x + SUN_TIDE_RATIO * s.x);
    const dy = STRETCH * (m.y + SUN_TIDE_RATIO * s.y);
    return <Arrow key={i} x={EX + p.x * R} y={EY - p.y * R} dx={dx} dy={-dy} colour={withSun && mode === 'stretch' ? COMBINED : MOON_ARROW} />;
  });

  const kind = !withSun ? null : range > 0.9 * tideRange(0, true) ? 'spring' : range < 1.15 * tideRange(Math.PI / 2, true) ? 'neap' : null;
  let caption: string;
  if (mode === 'pull')
    caption = withSun
      ? `These are the Moon’s pull alone. The Sun pulls Earth about ${Math.round(SUN_PULL_RATIO)} times harder, but almost equally all the way across, so it stretches Earth less than half as much. Switch to “Minus the average” to see.`
      : 'The Moon pulls the near side of Earth harder than the centre, and the centre harder than the far side. Every part of Earth falls towards the Moon, but not equally.';
  else if (!withSun)
    caption = 'Take away the pull at the centre, which moves Earth as a whole, and what is left stretches it: towards the Moon on the near side, away from it on the far side, and squeezed in round the middle. Two bulges, so two high tides a day.';
  else if (kind === 'spring') caption = `Sun and Moon in line (new or full Moon): their stretches add up. Spring tides, about ${Math.round((100 * range) / moonOnly)}% of the Moon’s alone.`;
  else if (kind === 'neap') caption = `Sun and Moon at right angles (first or last quarter): the Sun’s stretch partly cancels the Moon’s. Neap tides, about ${Math.round((100 * range) / moonOnly)}% of the Moon’s alone.`;
  else caption = `${days.toFixed(1)} days after new Moon, the tides are ${Math.round((100 * range) / moonOnly)}% of the Moon’s alone. They swing from spring to neap and back twice a month.`;

  const hh = Math.floor(hours);
  const mm = Math.floor((hours - hh) * 60);
  return (
    <Figure
      number={number}
      title="Tide maker"
      description="Earth with arrows showing the Moon’s pull at points across it: stronger on the side facing the Moon, weaker on the far side. Take away the pull at Earth’s centre and the arrows that are left point outward towards and away from the Moon and inward round the middle, stretching the oceans into two bulges, so a harbour passes two high tides a day. Adding the Sun gives spring tides at new and full Moon and neap tides at the quarters."
      height={880}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        mode === 'stretch' && withSun
          ? { label: 'the Moon’s and the Sun’s stretches added together', symbol: onSky(<path d="M-8 0 H5 M2 -4 L8 0 L2 4" stroke={COMBINED} strokeWidth="1.8" fill="none" />) }
          : { label: mode === 'pull' ? 'the Moon’s pull' : 'the stretch: the pull minus the pull at the centre', symbol: onSky(<path d="M-8 0 H5 M2 -4 L8 0 L2 4" stroke={MOON_ARROW} strokeWidth="1.8" fill="none" />) },
        { label: 'the oceans, bulges hugely exaggerated', symbol: onSky(<circle r="7" fill="#2f6db5" />) },
        { label: 'the harbour', symbol: onSky(<circle r="4" fill="#ffffff" stroke="#070b16" />) },
      ]}
      simplified={
        <p>
          The Moon is drawn far too close, and the differences between the arrows and the bulges are exaggerated. The heights are the
          equilibrium tide: the shape the oceans would take if they could keep up, with the Moon and Sun over the equator. Real oceans can’t keep
          up. The tide sloshes round each ocean basin, and coasts funnel it, so real tides range from a few centimetres to 16 metres in the Bay of
          Fundy, and high water can come hours after the Moon is overhead. The solid Earth stretches a little too, which is left out.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Arrows">
            <button type="button" aria-pressed={mode === 'pull'} onClick={() => setMode('pull')}>
              The Moon’s pull
            </button>
            <button type="button" aria-pressed={mode === 'stretch'} onClick={() => setMode('stretch')}>
              Minus the average
            </button>
          </span>
          <span className={styles.presets}>
            <button type="button" className={styles.toggle} aria-pressed={bulges} onClick={() => setBulges(!bulges)}>
              Show the bulges
            </button>
            <button type="button" className={styles.toggle} aria-pressed={withSun} onClick={() => setWithSun(!withSun)}>
              Add the Sun
            </button>
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={caption}>
          <rect width={W} height={H} fill="#070b16" />
          {bulges && <path d={water} fill="#2f6db5" />}
          <circle cx={EX} cy={EY} r={bulges ? R - 6 : R} fill={bulges ? '#4d6b3c' : '#2f6db5'} />
          <circle cx={EX} cy={EY} r={R} fill="none" stroke="#8fb4ff" strokeWidth="1" strokeDasharray={bulges ? '3 3' : undefined} />
          {arrows}
          <circle cx={EX + R * Math.cos(harbour)} cy={EY - R * Math.sin(harbour)} r={5} fill="#ffffff" stroke="#070b16" strokeWidth="1.5" />
          <circle cx={MOON_X} cy={EY} r={18} fill="#c8ccd6" />
          <text x={MOON_X} y={EY + 36} textAnchor="middle" fontSize="12" fill="var(--sky-text)">
            Moon
          </text>
          <text x={MOON_X} y={EY + 51} textAnchor="middle" fontSize="11" fill="var(--sky-muted)">
            (60 Earth radii away)
          </text>
          {withSun && (
            <g>
              <circle cx={EX + 140 * sunDir.x} cy={EY + 140 * sunDir.y} r={11} fill="var(--sun)" />
              <text x={EX + 140 * sunDir.x} y={EY + 140 * sunDir.y + (sunDir.y > 0.5 ? -16 : 26)} textAnchor="middle" fontSize="11" fill="var(--sky-text)">
                to the Sun
              </text>
            </g>
          )}
          <text x={14} y={22} fontSize="13" fill="var(--sky-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            Harbour: {height >= 0 ? '+' : '−'}
            {Math.abs(height).toFixed(2)} m · {hh} h {String(mm).padStart(2, '0')} min after the Moon was overhead
          </text>
        </svg>
        <div className={figureStyles.toolbar} style={{ marginTop: 10, marginBottom: 0 }}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ Stop turning' : '▶ Turn Earth'}
          </button>
        </div>
        <label className={styles.slider}>
          Hours
          <input
            type="range"
            min={0}
            max={LUNAR_DAY_HOURS}
            step={0.05}
            value={hours}
            onChange={(e) => {
              setHours(Number(e.target.value));
              setPlaying(false);
            }}
            aria-valuetext={`${hh} hours ${mm} minutes after the Moon was overhead; the water is ${Math.abs(height).toFixed(2)} metres ${height >= 0 ? 'above' : 'below'} its level without tides`}
          />
          <output>
            {hh} h {String(mm).padStart(2, '0')}
          </output>
        </label>
        {withSun && (
          <label className={styles.slider}>
            Days after new Moon
            <input
              type="range"
              min={0}
              max={SYNODIC_MONTH}
              step={0.1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-valuetext={`${days.toFixed(1)} days after new Moon: tides ${Math.round((100 * range) / moonOnly)}% of the Moon’s alone`}
            />
            <output>{days.toFixed(1)} days</output>
          </label>
        )}
        <div className={styles.readout}>
          <span>
            High to low water: <b>{range.toFixed(2)} m</b>
            {kind && ` (${kind} tide)`}
          </span>
          <span>
            The Sun’s stretch: <b>{Math.round(SUN_TIDE_RATIO * 100)}%</b> of the Moon’s
          </span>
        </div>
        <div className={figureStyles.below}>
          <LineChart
            series={series}
            xLabel="Hours after the Moon was overhead"
            yLabel="Water level (m)"
            xMin={0}
            xMax={LUNAR_DAY_HOURS}
            yMin={-0.4}
            yMax={0.6}
            yTicks={[-0.4, -0.2, 0, 0.2, 0.4, 0.6]}
            formatY={(y) => y.toFixed(1)}
            xTicks={[0, 6, 12, 18, 24].map((v) => ({ value: v, label: String(v) }))}
            baseline={0}
            markers={[{ x: hours, label: 'now' }]}
            onPick={(h) => {
              setHours(Math.max(0, Math.min(LUNAR_DAY_HOURS, h)));
              setPlaying(false);
            }}
            dots={false}
            height={200}
            hideLegend
            ariaLabel={`The water level at the harbour over a day of 24 hours 50 minutes: two high tides, about 12 hours 25 minutes apart, and two low tides, with a range of ${range.toFixed(2)} metres.`}
          />
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
