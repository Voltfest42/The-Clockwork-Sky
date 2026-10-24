import { useRef, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { onSky } from './sky/legend';
import { SIDEREAL_MONTH } from './twoMonths';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Two Moons going round Earth, seen from above: one that doesn't spin at all,
 * keeping its face pointing the same way in space, and one that spins once
 * per orbit, as the real Moon does. Under each, the face Earth sees.
 */

const DAYS_PER_SECOND = 3;
const PANEL = 260;
const ORBIT = 88;
const MOON_R = 22;

type Kind = 'still' | 'locked';

/** Where the Moon's "face" points (anticlockwise from +x), for a Moon at an orbital angle. */
function facing(kind: Kind, orbitAngle: number): number {
  // Both start with the face pointing at Earth.
  return kind === 'still' ? Math.PI : orbitAngle + Math.PI;
}

/** How far round from the face's centre Earth looks at the Moon: 0 when it sees the face square on. */
function faceOffset(kind: Kind, orbitAngle: number): number {
  const towardEarth = orbitAngle + Math.PI;
  return Math.atan2(Math.sin(towardEarth - facing(kind, orbitAngle)), Math.cos(towardEarth - facing(kind, orbitAngle)));
}

export function SpinFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * DAYS_PER_SECOND;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 1;
    }
    setT((d) => (d + step) % SIDEREAL_MONTH);
  });

  const orbitAngle = (2 * Math.PI * t) / SIDEREAL_MONTH;
  const reset = () => {
    setT(0);
    setPlaying(false);
  };
  const stillOffset = faceOffset('still', orbitAngle) / (Math.PI / 180);
  const seenStill = Math.abs(stillOffset) < 90 ? (Math.abs(stillOffset) < 20 ? 'the face, square on' : 'the face, from the side') : Math.abs(stillOffset) > 160 ? 'the back' : 'mostly the back';

  return (
    <Figure
      number={number}
      title="Spinning or not?"
      description="Two Moons going round Earth, seen from above. The left one doesn’t spin, so its face keeps pointing the same way in space, and from Earth you would see every side of it in turn over a month. The right one spins exactly once per orbit, like the real Moon, so its face always points at Earth."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'the Moon’s face: the side that started out facing Earth', symbol: onSky(<g><circle r="8" fill="#c9c4b5" /><circle cx="0" cy="0" r="3.5" fill="#5b4f3a" /></g>) },
        { label: 'the direction the face points', symbol: onSky(<path d="M-9 0 H7 M3 -4 L8 0 L3 4" stroke="#ffd166" strokeWidth="2" fill="none" />) },
      ]}
      simplified={
        <p>
          The orbit is drawn as a circle and far too small, and the Moon far too big. The real Moon’s orbit is slightly elliptical and tilted,
          so it rocks a little as seen from Earth (libration), which over time shows us 59% of its surface rather than exactly half.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
        </div>
        <label className={styles.slider}>
          Days
          <input
            type="range"
            min={0}
            max={27.25}
            step={0.25}
            value={Math.floor(t * 4) / 4}
            onChange={(e) => {
              setT(Number(e.target.value));
              setPlaying(false);
            }}
            aria-valuetext={`${t.toFixed(1)} days into the orbit`}
          />
          <output>{t.toFixed(1)} days</output>
        </label>
        <div className={styles.split} style={{ marginTop: 10 }}>
          {(['still', 'locked'] as const).map((kind) => (
            <div key={kind}>
              <p className={styles.panelTitle}>{kind === 'still' ? 'A Moon that doesn’t spin' : 'A Moon that spins once per orbit (the real one)'}</p>
              <MoonOrbit kind={kind} orbitAngle={orbitAngle} />
              <SeenFromEarth offset={faceOffset(kind, orbitAngle)} label={kind === 'still' ? 'Seen from Earth: ' + seenStill : 'Seen from Earth: always the face'} />
            </div>
          ))}
        </div>
      </div>
      <Caption>
        <b>{t.toFixed(1)} days into the orbit:</b>{' '}
        {Math.abs(stillOffset) < 20
          ? 'both Moons show Earth the same face.'
          : `the Moon that doesn’t spin now shows Earth ${seenStill}; the one that spins once per orbit still shows the face. To keep one face towards Earth, a Moon has to turn once each time it goes round.`}
      </Caption>
    </Figure>
  );
}

function MoonOrbit({ kind, orbitAngle }: { kind: Kind; orbitAngle: number }) {
  const c = PANEL / 2;
  const mx = c + ORBIT * Math.cos(orbitAngle);
  const my = c - ORBIT * Math.sin(orbitAngle);
  const face = facing(kind, orbitAngle);
  const fx = mx + MOON_R * 0.55 * Math.cos(face);
  const fy = my - MOON_R * 0.55 * Math.sin(face);
  const tip = { x: mx + (MOON_R + 18) * Math.cos(face), y: my - (MOON_R + 18) * Math.sin(face) };
  return (
    <svg viewBox={`0 0 ${PANEL} ${PANEL}`} className={seasonStyles.svg} role="img" aria-label={kind === 'still' ? 'The Moon that doesn’t spin, from above: its face points the same way all the time.' : 'The Moon that spins once per orbit, from above: its face always points at Earth.'}>
      <circle cx={c} cy={c} r={ORBIT} fill="none" stroke="#3b4c72" strokeDasharray="3 4" />
      <circle cx={c} cy={c} r={16} fill="#3d6fb5" />
      <text x={c} y={c + 4} fontSize="10" textAnchor="middle" fill="#e2e8f5">
        Earth
      </text>
      <circle cx={mx} cy={my} r={MOON_R} fill="#c9c4b5" />
      <circle cx={fx} cy={fy} r={7} fill="#5b4f3a" />
      <line x1={mx} y1={my} x2={tip.x} y2={tip.y} stroke="#ffd166" strokeWidth="2" />
      <path
        d={`M ${tip.x - 7 * Math.cos(face - 0.5)} ${tip.y + 7 * Math.sin(face - 0.5)} L ${tip.x} ${tip.y} L ${tip.x - 7 * Math.cos(face + 0.5)} ${tip.y + 7 * Math.sin(face + 0.5)}`}
        stroke="#ffd166"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

/** The Moon as seen from Earth: the face's mark slides across and round the back as `offset` (radians) grows. */
function SeenFromEarth({ offset, label }: { offset: number; label: string }) {
  const r = 34;
  const visible = Math.cos(offset) > 0;
  const x = r * 0.75 * Math.sin(-offset);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
      <svg viewBox="-45 -45 90 90" width="90" height="90" className={seasonStyles.svg} style={{ width: 90, flex: 'none' }} aria-hidden="true">
        <circle r={r} fill="#c9c4b5" />
        {visible && <ellipse cx={x} cy={0} rx={13 * Math.cos(offset)} ry={13} fill="#5b4f3a" />}
      </svg>
      <p className={styles.hint} style={{ margin: 0 }}>
        {label}
      </p>
    </div>
  );
}
