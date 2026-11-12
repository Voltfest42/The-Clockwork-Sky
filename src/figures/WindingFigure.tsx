import { useMemo, useRef, useState, type ReactNode } from 'react';
import { angularSpeed, armStars, innerLindbladSpeed, kalnajsOvals, ovalPoint, ovalStars, windArms, windingPitch } from '../core/galaxy/spiral';
import { MILKY_WAY, MILKY_WAY_MODEL } from '../data/galaxy';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { RATIO_START, ROTATION_GALAXIES } from './crowds';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The winding problem (Figure 30.4): on the left, two arms made of fixed
 * stars, each star going round at the speed the Milky Way's rotation curve
 * gives it, wind up within a few turns; on the right, Kalnajs's nested ovals,
 * each turned a little from the one inside and all turning together, keep a
 * two-armed spiral while their stars move through it. One star in each panel
 * is marked.
 */

const VIEW = 300;
const EXTENT = 16.5;
const T_MAX = 1000;
const P0 = (25 * Math.PI) / 180;
const MW = ROTATION_GALAXIES[0];
const speed = (R: number) => MW.parts(RATIO_START, MILKY_WAY_MODEL.haloMass).total(R);
const STARS = armStars(900, 2, P0, 2, 14, 7);
const OVALS = kalnajsOvals(30, 1.5, 14, 0.15, 0.3);
const PER_OVAL = 30;
/** The ovals' pattern turns at Ω − κ/2 for the Sun's radius. */
const PATTERN_SPEED = innerLindbladSpeed(MILKY_WAY.sunRadius, speed);
/** The marked stars: one on an arm near the Sun's radius, one on the oval nearest it. */
const MARKED_ARM = STARS.reduce((best, s, i) => (Math.abs(s.R - MILKY_WAY.sunRadius) < Math.abs(STARS[best].R - MILKY_WAY.sunRadius) ? i : best), 0);
const MARKED_OVAL = OVALS.reduce((best, o, i) => (Math.abs(o.R - MILKY_WAY.sunRadius) < Math.abs(OVALS[best].R - MILKY_WAY.sunRadius) ? i : best), 0);

const px = (x: number) => VIEW / 2 + (x / EXTENT) * (VIEW / 2);
const py = (y: number) => VIEW / 2 - (y / EXTENT) * (VIEW / 2);

export function WindingFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);
  const reset = () => {
    setT(0);
    setPlaying(false);
  };

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * 100;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 50;
    }
    const next = Math.min(T_MAX, t + step);
    setT(next);
    if (next >= T_MAX) setPlaying(false);
  });

  const arms = useMemo(() => windArms(STARS, t, speed), [t]);
  const ovalDots = useMemo(() => ovalStars(OVALS, PER_OVAL, t, PATTERN_SPEED, speed), [t]);
  const turns = (angularSpeed(speed(MILKY_WAY.sunRadius), MILKY_WAY.sunRadius) * t) / (2 * Math.PI);
  const pitch = (windingPitch(MILKY_WAY.sunRadius, t, speed, P0) * 180) / Math.PI;
  const patternTurns = (PATTERN_SPEED * t) / (2 * Math.PI);
  const markedOvalStar = MARKED_OVAL * PER_OVAL;
  const ovalLaps = ((angularSpeed(speed(OVALS[MARKED_OVAL].R), OVALS[MARKED_OVAL].R) - PATTERN_SPEED) * t) / (2 * Math.PI);

  const caption =
    t === 0
      ? `Two arms of stars with a pitch of 25°, like a real spiral’s, beside thirty nested ovals, each turned a little further than the one inside it, whose stars crowd into two arms. Every star goes round at the speed the Milky Way’s rotation curve gives it.`
      : `After ${Math.round(t)} million years the stars at the Sun’s distance have gone round ${turns.toFixed(1)} times. The arms made of fixed stars have wound up to a pitch of ${pitch < 10 ? pitch.toFixed(1) : Math.round(pitch)}° there. The ovals’ pattern has turned ${patternTurns.toFixed(2)} times as a whole and kept its shape, while its stars have moved through it: the marked star has gone ${ovalLaps.toFixed(1)} times round its oval, in and out of the arms.`;

  const panel = (title: string, children: ReactNode, label: string) => (
    <div>
      <p className={styles.panelTitle}>{title}</p>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width="100%" style={{ maxWidth: VIEW, display: 'block', background: 'var(--sky-bg)', borderRadius: 6 }} role="img" aria-label={label}>
        <circle cx={px(0)} cy={py(0)} r={(MILKY_WAY.sunRadius / EXTENT) * (VIEW / 2)} fill="none" stroke="#475569" strokeDasharray="3 4" />
        <circle cx={px(0)} cy={py(0)} r={3} fill="#fde68a" />
        {children}
        <text x={8} y={VIEW - 10} fontSize="11" fill="#9aa8c4">
          dashed: the Sun’s distance, 8.2 kpc
        </text>
      </svg>
    </div>
  );

  return (
    <Figure
      number={number}
      title="The winding problem"
      description="Two arms made of the same stars, each going round at the speed the Milky Way’s rotation curve gives it, wind into a tight coil within a few hundred million years, because the inner stars lap the outer ones. Beside them, nested ovals each turned a little from the one inside crowd their stars into a two-armed spiral; the ovals turn together, so the spiral keeps its shape while the stars move through it."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a star', symbol: <><circle r="10" fill="#070b16" /><circle r="2.5" fill="#cbd5e1" /></> },
        { label: 'the marked star', symbol: <><circle r="10" fill="#070b16" /><circle r="4.5" fill="#f59e0b" /></> },
        { label: 'an oval orbit', symbol: <><circle r="10" fill="#070b16" /><ellipse rx="8" ry="5" fill="none" stroke="#38bdf8" /></> },
      ]}
      simplified={
        <p>
          A sketch of motions, not of forces: the stars move on circles (left) or fixed ovals (right) and don’t pull on each other. In a real galaxy,
          the ovals only line up into a lasting pattern because the arms’ own gravity holds them, Lin and Shu’s density wave; with the Milky Way’s
          rotation curve the ovals would drift apart a few times more slowly than fixed arms wind, so here they are made to turn together at the
          speed of the Sun’s oval. Whether real arms last for billions of years or keep breaking and reforming is still argued.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} onClick={() => (t >= T_MAX ? (setT(0), setPlaying(true)) : setPlaying((p) => !p))} aria-pressed={playing}>
            {playing ? 'Pause' : t >= T_MAX ? 'Play again' : 'Play a billion years'}
          </button>
        </div>
        <div className={styles.controls}>
          <Slider label="Time" value={t} min={0} max={T_MAX} step={10} format={(v) => `${Math.round(v)} million years`} onChange={(v) => setT(Math.round(v / 10) * 10)} />
        </div>
        <div className={styles.split}>
          {panel(
            'Arms of fixed stars',
            <>
              {STARS.map((_, i) => (
                <circle key={i} cx={px(arms[2 * i])} cy={py(arms[2 * i + 1])} r={1.3} fill="#cbd5e1" />
              ))}
              <circle cx={px(arms[2 * MARKED_ARM])} cy={py(arms[2 * MARKED_ARM + 1])} r={4.5} fill="#f59e0b" stroke="#000" strokeWidth="0.5" />
            </>,
            `Arms of fixed stars after ${Math.round(t)} million years, wound to a pitch of ${Math.round(pitch)}° at the Sun’s distance.`,
          )}
          {panel(
            'A pattern of nested ovals',
            <>
              {OVALS.map((o, k) => (
                <path
                  key={k}
                  d={Array.from({ length: 61 }, (_, j) => {
                    const [x, y] = ovalPoint(o, (2 * Math.PI * j) / 60, PATTERN_SPEED * t);
                    return `${j ? 'L' : 'M'} ${px(x).toFixed(1)} ${py(y).toFixed(1)}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#38bdf8"
                  strokeOpacity="0.6"
                  strokeWidth="0.9"
                />
              ))}
              {Array.from({ length: ovalDots.length / 2 }, (_, i) => (
                <circle key={i} cx={px(ovalDots[2 * i])} cy={py(ovalDots[2 * i + 1])} r={1} fill="#cbd5e1" />
              ))}
              <circle cx={px(ovalDots[2 * markedOvalStar])} cy={py(ovalDots[2 * markedOvalStar + 1])} r={4.5} fill="#f59e0b" stroke="#000" strokeWidth="0.5" />
            </>,
            `Thirty nested ovals after ${Math.round(t)} million years: the two-armed pattern has turned as a whole and kept its shape.`,
          )}
        </div>
        <Caption>{caption}</Caption>
      </div>
    </Figure>
  );
}
