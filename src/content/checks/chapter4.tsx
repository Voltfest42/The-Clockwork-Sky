import { useId, useRef, type PointerEvent } from 'react';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { checkFirstQuarter } from './chapter4Answers';
import seasonStyles from '../../figures/seasons.module.css';
import styles from './checks.module.css';

const isAngle = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value < 360;

export function FirstQuarter() {
  return (
    <InteractiveQuestion
      id="first-quarter"
      prompt="Drag the Moon to where it is at first quarter. The view is from above the North Pole, with the Sun far off to the left."
      initial={200}
      isState={isAngle}
      check={(e) => checkFirstQuarter(e)}
    >
      {(e, setE) => <MoonOrbit elongation={e} onElongation={setE} />}
    </InteractiveQuestion>
  );
}

const W = 300;
const H = 220;
const C = { x: 170, y: 110 };
const R = 80;

function MoonOrbit({ elongation, onElongation }: { elongation: number; onElongation: (e: number) => void }) {
  const id = useId();
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const angle = Math.PI + (elongation * Math.PI) / 180;
  const moon = { x: C.x + R * Math.cos(angle), y: C.y - R * Math.sin(angle) };
  const set = (event: PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((event.clientX - box.left) / box.width) * W - C.x;
    const y = C.y - ((event.clientY - box.top) / box.height) * H;
    const e = ((((Math.atan2(y, x) - Math.PI) * 180) / Math.PI) % 360 + 360) % 360;
    onElongation(Math.round(e / 5) * 5 % 360);
  };
  return (
    <div>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className={seasonStyles.svg}
        style={{ maxWidth: 360 }}
        onPointerDown={(ev) => {
          dragging.current = true;
          (ev.target as Element).setPointerCapture?.(ev.pointerId);
          set(ev);
        }}
        onPointerMove={(ev) => dragging.current && set(ev)}
        onPointerUp={() => (dragging.current = false)}
        aria-hidden="true"
      >
        {[40, 110, 180].map((y) => (
          <path key={y} d={`M 6 ${y} H 34 M 28 ${y - 5} L 35 ${y} L 28 ${y + 5}`} stroke="var(--sun)" strokeWidth="1.5" fill="none" />
        ))}
        <circle cx={C.x} cy={C.y} r={R} fill="none" stroke="#3b4c72" strokeDasharray="4 4" />
        <circle cx={C.x} cy={C.y} r={20} fill="#16213a" />
        <path d={`M ${C.x} ${C.y - 20} A 20 20 0 0 0 ${C.x} ${C.y + 20} Z`} fill="#3d6fb5" />
        <circle cx={moon.x} cy={moon.y} r={11} fill="#3a3d47" />
        <path d={`M ${moon.x} ${moon.y - 11} A 11 11 0 0 0 ${moon.x} ${moon.y + 11} Z`} fill="#ece9df" />
        <path d={`M ${C.x + 30} ${C.y - 30} A 42 42 0 0 0 ${C.x - 30} ${C.y - 30}`} stroke="#9aa8c4" fill="none" />
        <text x={C.x} y={C.y - 46} fontSize="10" fill="#9aa8c4" textAnchor="middle">
          the Moon goes round this way ←
        </text>
      </svg>
      <div className={styles.guess}>
        <label htmlFor={id}>Moon</label>
        <input
          id={id}
          type="range"
          min={0}
          max={355}
          step={5}
          value={elongation}
          onChange={(ev) => onElongation(Number(ev.target.value))}
          aria-valuetext={`${elongation}° round its orbit from new Moon`}
        />
        <output htmlFor={id}>{elongation}° from new</output>
      </div>
    </div>
  );
}
