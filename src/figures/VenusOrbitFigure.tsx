import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { greatestElongations } from '../core/ephemeris/wanderers';
import { jdNow } from '../core/time/zone';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { onSky } from './sky/legend';
import { dateLabel } from './retrograde';
import { greatestElongationFor, radiusFromElongation, triangle } from './venus';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Measuring Venus's (or Mercury's) orbit from Earth, as Copernicus did. Drag
 * the planet round its orbit and watch its angle from the Sun as seen from
 * Earth. At the greatest angle, the line of sight just grazes the orbit, the
 * angle at the planet is a right angle, and the triangle's shape fixes the
 * orbit's size.
 */

const W = 420;
const H = 400;
const SUN = { x: 210, y: 200 };
const UNIT = 178;
const EARTH = { x: SUN.x, y: SUN.y + UNIT };
const PLANETS = {
  venus: { name: 'Venus', a: 0.723_33, colour: '#ffe08a' },
  mercury: { name: 'Mercury', a: 0.387_1, colour: '#a9bed6' },
} as const;
type Inner = keyof typeof PLANETS;
const START_ANGLE = 160;

export function VenusOrbitFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [planet, setPlanet] = useState<Inner>('venus');
  const [angle, setAngle] = useState(START_ANGLE);
  const [widest, setWidest] = useState(0);
  const [now] = useState(jdNow);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const { name, a, colour } = PLANETS[planet];

  const geometry = triangle(a, angle * DEG);
  const elong = geometry.elongation / DEG;
  const most = greatestElongationFor(a) / DEG;
  const atMost = Math.abs(geometry.atPlanet / DEG - 90) < 1.5;
  const real = useMemo(() => greatestElongations(planet, now, now + (planet === 'venus' ? 900 : 300)).slice(0, 4), [planet, now]);

  const move = (next: number) => {
    const wrapped = ((Math.round(next) % 360) + 360) % 360;
    setAngle(wrapped);
    setWidest((w) => Math.max(w, triangle(a, wrapped * DEG).elongation / DEG));
  };
  const fromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((event.clientX - box.left) / box.width) * W - SUN.x;
    const y = SUN.y - ((event.clientY - box.top) / box.height) * H;
    move(Math.atan2(y, x) / DEG);
  };
  const reset = () => {
    setPlanet('venus');
    setAngle(START_ANGLE);
    setWidest(0);
  };

  const P = { x: SUN.x + UNIT * a * Math.cos(angle * DEG), y: SUN.y - UNIT * a * Math.sin(angle * DEG) };
  // Lines of sight extend past the planet.
  const sightLen = 1.5;
  const dx = (P.x - EARTH.x) / (UNIT * geometry.distance);
  const dy = (P.y - EARTH.y) / (UNIT * geometry.distance);
  const sightEnd = { x: EARTH.x + dx * UNIT * sightLen, y: EARTH.y + dy * UNIT * sightLen };
  // The angle arc at Earth, between the Sun (straight up) and the planet.
  const arcR = 46;
  const arcEnd = { x: EARTH.x + dx * arcR, y: EARTH.y + dy * arcR };
  // The angle's label sits just outside the arc, halfway between the two lines.
  const bisector = (() => {
    const bx = dx;
    const by = dy - 1;
    const len = Math.hypot(bx, by) || 1;
    return { x: bx / len, y: by / len };
  })();
  const labelAt = { x: EARTH.x + bisector.x * (arcR + 24), y: EARTH.y + bisector.y * (arcR + 24) };
  const rightAngle = (() => {
    const u = { x: (SUN.x - P.x) / (UNIT * a), y: (SUN.y - P.y) / (UNIT * a) };
    const v = { x: -dx, y: -dy };
    const s = 11;
    return `M ${P.x + u.x * s} ${P.y + u.y * s} L ${P.x + (u.x + v.x) * s} ${P.y + (u.y + v.y) * s} L ${P.x + v.x * s} ${P.y + v.y * s}`;
  })();

  return (
    <Figure
      number={number}
      title={`Measure ${name}’s orbit`}
      description="Earth, the Sun and Venus seen from above. Venus can be dragged round its orbit, and the figure shows its angle from the Sun as seen from Earth. The angle is greatest, about 46°, when the line of sight from Earth just touches Venus’s orbit, making a right angle at Venus. That right-angled triangle, drawn to scale, gives Venus’s distance from the Sun: 0.72 of Earth’s."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the line of sight from Earth to the planet', symbol: onSky(<path d="M-10 6 L10 -6" stroke={colour} strokeWidth="2" />) },
        { label: 'the line from Earth to the Sun', symbol: onSky(<path d="M-10 0 H10" stroke="#fde68a" strokeWidth="2" />) },
        { label: 'the angle from the Sun, as seen from Earth', symbol: onSky(<path d="M-6 6 A 10 10 0 0 1 6 -2" stroke="#ffffff" strokeWidth="1.5" fill="none" />) },
        { label: 'a right angle at the planet', symbol: onSky(<path d="M-4 4 V-4 H4" stroke="#62d6c4" strokeWidth="2" fill="none" />) },
      ]}
      simplified={
        <p>
          The orbits are drawn as circles, in one plane, to scale. Venus’s real orbit is almost a circle, so its greatest angle from the Sun is
          always 45°–47°. Mercury’s orbit is noticeably oval, so its greatest angle ranges from 18° to 28° depending on where in its orbit it
          is, which this circle can’t show: Copernicus averaged several.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Planet">
          {(Object.keys(PLANETS) as Inner[]).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={planet === p}
              onClick={() => {
                setPlanet(p);
                setWidest(0);
              }}
            >
              {PLANETS[p].name}
            </button>
          ))}
        </span>
      </div>
      <div className={figureStyles.withSide}>
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className={seasonStyles.svg}
          aria-hidden="true"
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as Element).setPointerCapture?.(e.pointerId);
            fromPointer(e);
          }}
          onPointerMove={(e) => dragging.current && fromPointer(e)}
          onPointerUp={() => (dragging.current = false)}
          style={{ cursor: 'grab' }}
        >
          <circle cx={SUN.x} cy={SUN.y} r={UNIT} fill="none" stroke="#5b9bff" strokeOpacity="0.5" />
          <circle cx={SUN.x} cy={SUN.y} r={UNIT * a} fill="none" stroke={colour} strokeOpacity="0.55" strokeDasharray="4 4" />
          <line x1={EARTH.x} y1={EARTH.y} x2={SUN.x} y2={SUN.y} stroke="#fde68a" strokeWidth="1.5" />
          <line x1={SUN.x} y1={SUN.y} x2={P.x} y2={P.y} stroke="#9aa8c4" strokeDasharray="3 3" />
          <line x1={EARTH.x} y1={EARTH.y} x2={sightEnd.x} y2={sightEnd.y} stroke={colour} strokeWidth="2" />
          <path d={`M ${EARTH.x} ${EARTH.y - arcR} A ${arcR} ${arcR} 0 0 ${P.x > SUN.x ? 1 : 0} ${arcEnd.x} ${arcEnd.y}`} stroke="#ffffff" strokeWidth="1.5" fill="none" />
          <text x={labelAt.x} y={labelAt.y + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffffff">
            {elong.toFixed(1)}°
          </text>
          {atMost && <path d={rightAngle} stroke="#62d6c4" strokeWidth="2" fill="none" />}
          <circle cx={SUN.x} cy={SUN.y} r="14" fill="var(--sun)" />
          <text x={SUN.x} y={SUN.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#5b3b00">
            Sun
          </text>
          <circle cx={EARTH.x} cy={EARTH.y} r="7" fill="#5b9bff" />
          <text x={EARTH.x + 12} y={EARTH.y + 4} fontSize="12" fill="var(--sky-text)">
            Earth
          </text>
          <circle cx={P.x} cy={P.y} r="8" fill={colour} stroke="#070b16" strokeWidth="1.5" />
          <text x={P.x + 11} y={P.y - 9} fontSize="12" fill="var(--sky-text)">
            {name}
          </text>
          <text x={12} y={22} fontSize="12" fill="var(--sky-muted)">
            Drag {name}
          </text>
        </svg>
        <div className={figureStyles.side}>
          <label className={styles.slider}>
            {name}
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={angle}
              onChange={(e) => move(Number(e.target.value))}
              aria-label={`${name}’s place round its orbit`}
              aria-valuetext={`${elong.toFixed(1)}° from the Sun${atMost ? ', its greatest' : ''}`}
            />
          </label>
          <div className={figureStyles.summary} aria-live="polite">
            <p>
              Angle from the Sun, seen from Earth: <b>{elong.toFixed(1)}°</b>
            </p>
            <p>
              Angle at {name}, between the Sun and Earth: <b>{(geometry.atPlanet / DEG).toFixed(1)}°</b>
            </p>
            <p>
              Greatest angle found so far: <b>{widest > 0 ? `${widest.toFixed(1)}°` : '–'}</b>
            </p>
            {widest > most - 0.6 && (
              <p>
                At {most.toFixed(1)}° the triangle has a right angle at {name}. Draw it to scale with the Earth–Sun side as 1, and the Sun–{name} side
                measures <b>{radiusFromElongation(most * DEG).toFixed(2)}</b>: {name}’s orbit is {radiusFromElongation(most * DEG).toFixed(2)} times the size of Earth’s.
              </p>
            )}
          </div>
          <div className={styles.lists} style={{ gridTemplateColumns: '1fr', marginTop: 0 }}>
            <div>
              <h4>{name}’s next greatest angles from the Sun</h4>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {real.map((g) => (
                  <li key={g.jdTT}>
                    {dateLabel(g.jdTT)}: {(g.angle / DEG).toFixed(1)}° {g.side}, {g.side === 'east' ? 'in the evening' : 'in the morning'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Caption>
        {atMost
          ? `${name} is at its greatest angle from the Sun, ${most.toFixed(1)}°. The line of sight just grazes its orbit, so it meets the line from the Sun at a right angle. That fixes the triangle’s shape, and the orbit’s size: ${radiusFromElongation(most * DEG).toFixed(2)} of Earth’s.`
          : geometry.elongation < 5 * DEG
            ? `${name} is nearly in line with the Sun, lost in its glare: it can’t be seen.`
            : `${name} is ${elong.toFixed(0)}° from the Sun. Drag it round until the angle is as big as it gets.`}
      </Caption>
    </Figure>
  );
}
