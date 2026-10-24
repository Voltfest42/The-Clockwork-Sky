import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { litPath } from './phases';
import { onSky } from './sky/legend';
import { galileosVenus, PTOLEMY_CENTRE, venusIn, type VenusView } from './venus';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Venus's phases in two arrangements that put it in exactly the same places
 * on the sky. In Ptolemy's, Venus rides an epicycle that stays between Earth
 * and the Sun, so it is always lit from behind: never more than a fat
 * crescent. Going round the Sun, it shows every phase, small and nearly full
 * beyond the Sun, large and thin on our side. Galileo saw the second.
 */

const SYNODIC = 583.92;
const DAYS_PER_SECOND = 40;
const W = 320;
const H = 240;
const EARTH = { x: 28, y: 115 };
const AU = 150;
const SUN = { x: EARTH.x + AU, y: EARTH.y };
const VENUS_A = 0.723;
const VENUS = '#ffe08a';

/** Venus's disc through a telescope: size from its distance (AU), lit on the Sun's side. */
function Disc({ view, cx, cy, scale = 9 }: { view: VenusView; cx: number; cy: number; scale?: number }) {
  const r = scale / view.distance;
  const path = litPath(Math.PI - view.phaseAngle, r);
  const mirror = view.elongation < 0 ? -1 : 1;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} fill="#2a2f3b" />
      {path && <path d={path} fill={VENUS} transform={`scale(${mirror} 1)`} />}
    </g>
  );
}

function World({ world, days }: { world: 'ptolemy' | 'copernicus'; days: number }) {
  const view = venusIn(world, days, SYNODIC);
  const theta = (2 * Math.PI * days) / SYNODIC;
  const centre = world === 'ptolemy' ? { x: EARTH.x + PTOLEMY_CENTRE * AU, y: EARTH.y } : SUN;
  const radius = (world === 'ptolemy' ? PTOLEMY_CENTRE : 1) * VENUS_A * AU;
  const V = { x: centre.x + radius * Math.cos(theta), y: centre.y - radius * Math.sin(theta) };
  const title = world === 'ptolemy' ? 'Ptolemy: Venus’s epicycle stays below the Sun' : 'Copernicus: Venus goes round the Sun';
  return (
    <div>
      <p className={styles.panelTitle}>{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={`${title}. Venus is ${Math.round(view.lit * 100)}% lit as seen from Earth.`}>
        {world === 'ptolemy' && <line x1={EARTH.x} y1={EARTH.y} x2={SUN.x} y2={SUN.y} stroke="#7d8db0" strokeDasharray="3 4" />}
        <circle cx={centre.x} cy={centre.y} r={radius} fill="none" stroke={VENUS} strokeOpacity="0.5" />
        {world === 'ptolemy' && <path d={`M ${centre.x - 4} ${centre.y} H ${centre.x + 4} M ${centre.x} ${centre.y - 4} V ${centre.y + 4}`} stroke="#c8d2e8" strokeWidth="1.5" />}
        <line x1={EARTH.x} y1={EARTH.y} x2={V.x} y2={V.y} stroke="#ffffff" strokeOpacity="0.4" />
        <circle cx={SUN.x} cy={SUN.y} r="11" fill="var(--sun)" />
        <circle cx={EARTH.x} cy={EARTH.y} r="6" fill="#5b9bff" />
        <circle cx={V.x} cy={V.y} r="5" fill={VENUS} />
        {/* The side of Venus facing the Sun is lit; the half facing away is dark. */}
        <path
          d={`M ${V.x} ${V.y} m 0 -5 a 5 5 0 0 0 0 10 z`}
          fill="#2a2f3b"
          transform={`rotate(${(-Math.atan2(-(SUN.y - V.y), SUN.x - V.x) * 180) / Math.PI} ${V.x} ${V.y})`}
        />
        <text x={EARTH.x - 4} y={EARTH.y + 20} fontSize="11" fill="var(--sky-text)">
          Earth
        </text>
        <text x={SUN.x + 14} y={SUN.y + 4} fontSize="11" fill="var(--sky-text)">
          Sun
        </text>
        <g transform={`translate(4 ${H - 62})`}>
          <rect width="56" height="56" rx="6" fill="#0d1424" stroke="#3b4c72" />
          <Disc view={view} cx={28} cy={28} scale={6.5} />
        </g>
        <text x={4} y={H - 68} fontSize="10" fill="var(--sky-muted)">
          seen from Earth
        </text>
      </svg>
      <p className={styles.hint}>
        Lit: <b>{Math.round(view.lit * 100)}%</b> · {view.distance < 0.6 ? 'large and near' : view.distance > 1.3 ? 'small and far' : 'middling'}
      </p>
    </div>
  );
}

export function VenusPhasesFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [days, setDays] = useState(60);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);
  const galileo = useMemo(() => galileosVenus(), []);

  useAnimationFrame(playing && onScreen, (dt) => {
    let step = dt * DAYS_PER_SECOND;
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      step = 20;
    }
    setDays((d) => (d + step) % SYNODIC);
  });

  const ptolemy = venusIn('ptolemy', days, SYNODIC);
  const copernicus = venusIn('copernicus', days, SYNODIC);
  const reset = () => {
    setDays(60);
    setPlaying(false);
  };

  return (
    <Figure
      number={number}
      title="Venus in two worlds"
      description="Venus’s phases in Ptolemy’s arrangement and in the Sun-centred one, side by side, with Venus in the same direction from Earth in both. In Ptolemy’s, Venus stays between Earth and the Sun, so it only ever shows a crescent. Going round the Sun, it shows a full set of phases, small and nearly full on the far side of the Sun, large and thin on our side, as Galileo saw in 1610."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'Venus, and the circle it moves on', symbol: onSky(<g><circle r="8" fill="none" stroke={VENUS} strokeOpacity="0.6" /><circle cx="8" r="3" fill={VENUS} /></g>) },
        { label: 'Venus as seen through a telescope, at its true relative size', symbol: onSky(<g><circle r="6" fill="#2a2f3b" /><path d={litPath(2.2, 6)} fill={VENUS} /></g>) },
        { label: 'the centre of Ptolemy’s epicycle, always on the line to the Sun', symbol: onSky(<path d="M-5 0 H5 M0 -5 V5" stroke="#c8d2e8" strokeWidth="1.5" />) },
      ]}
      simplified={
        <p>
          Both views turn with the line from Earth to the Sun, so the Sun stays put; the orbits are circles. Ptolemy never said how far away
          Venus’s epicycle was, only that it stayed below the Sun; any size gives the same directions and the same phases, so the telescope views
          use the same sizes in both. Galileo’s Venus comes from the planets’ positions for those dates.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <label className={styles.slider} style={{ flex: 1, minWidth: 220 }}>
            Days
            <input
              type="range"
              min={0}
              max={583}
              step={1}
              value={Math.round(days)}
              onChange={(e) => {
                setDays(Number(e.target.value));
                setPlaying(false);
              }}
              aria-label="Days since Venus was behind the Sun"
              aria-valuetext={`${Math.round(days)} days since Venus was behind the Sun: ${Math.round(copernicus.lit * 100)}% lit going round the Sun, ${Math.round(ptolemy.lit * 100)}% in Ptolemy’s arrangement`}
            />
            <output>{Math.round(days)} days</output>
          </label>
        </div>
        <div className={styles.split}>
          <World world="ptolemy" days={days} />
          <World world="copernicus" days={days} />
        </div>
        <p className={styles.panelTitle} style={{ marginTop: 14 }}>
          What Galileo could see through his telescope, autumn 1610 to winter 1611 (computed)
        </p>
        <ul className={styles.lists} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', listStyle: 'none', padding: 0 }} aria-label="Venus from October 1610 to January 1611">
          {galileo.map((g) => (
            <li key={g.label} style={{ textAlign: 'center' }}>
              <svg viewBox="-26 -26 52 52" width="52" height="52" style={{ background: '#0d1424', borderRadius: 6 }} role="img" aria-label={`${g.label}: ${Math.round(g.lit * 100)}% lit, ${Math.round(g.diameter)} arcseconds across`}>
                <Disc view={{ lit: g.lit, phaseAngle: Math.acos(2 * g.lit - 1), distance: 1, elongation: g.east ? 1 : -1 }} cx={0} cy={0} scale={g.diameter / 2.6} />
              </svg>
              <p>
                {g.label}
                <br />
                {Math.round(g.lit * 100)}% · {Math.round(g.diameter)}″
              </p>
            </li>
          ))}
        </ul>
      </div>
      <Caption>
        {copernicus.lit > 0.5
          ? `Going round the Sun, Venus is beyond it now: small and ${Math.round(copernicus.lit * 100)}% lit. Ptolemy’s Venus, in the same direction, is only ${Math.round(ptolemy.lit * 100)}% lit, because it is always between us and the Sun. Galileo saw a small, nearly full Venus in the autumn of 1610: Ptolemy’s arrangement can’t do that.`
          : `Venus is on our side of the Sun now, large and a crescent in both arrangements. The difference shows on the far side of its circle, where only a Venus going round the Sun can be nearly full.`}
      </Caption>
    </Figure>
  );
}
