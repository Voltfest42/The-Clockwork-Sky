import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Random } from '../core/random';
import { lightYearsFromParsecs, parsecsFromParallax } from '../core/stars/distance';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { coinDistanceKm, distanceWords, PARALLAX_STARS, parallaxShift, parallaxWords } from './parallax';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Parallax: Earth goes round the Sun, and a nearby star shifts against far
 * more distant ones, tracing a small ellipse once a year. Above, the geometry
 * from over the Solar System (wildly exaggerated); below, the view through a
 * telescope, magnified so the shift fills it, with a scale in arcseconds.
 */

const W = 560;
const TOP = 230;
const SCOPE = 200;
const SUN = { x: 90, y: TOP / 2 };
const ORBIT = 52;
const SECONDS_PER_YEAR = 6;
const EARTH = '#4f8cf5';
const STAR = '#ffd166';
const SIGHT = '#62d6c4';
/** The custom star's ecliptic latitude, for the shape of its ellipse. */
const CUSTOM_LATITUDE = 30 * DEG;

/** Where the star is drawn above (px from the Sun): nearer stars nearer, on a squeezed log scale from 1 to 1,000 parsecs. */
function starX(parsecs: number): number {
  const f = Math.max(0, Math.min(1, Math.log10(parsecs) / 3));
  return SUN.x + ORBIT + 40 + f * 300;
}

/** Scale bar values for the telescope view, arcseconds. */
const BARS = [1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0005];

export function ParallaxFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [starId, setStarId] = useState<string>('proxima');
  const [logD, setLogD] = useState(Math.log10(1000 / 768.07));
  const [t, setT] = useState(Math.PI / 2);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  useAnimationFrame(playing && onScreen, (dt) => {
    if (reducedMotion) {
      pending.current += dt;
      if (pending.current < 0.5) return;
      pending.current = 0;
      setT((x) => (x + Math.PI / 6) % (2 * Math.PI));
      return;
    }
    setT((x) => (x + (2 * Math.PI * dt) / SECONDS_PER_YEAR) % (2 * Math.PI));
  });

  const preset = PARALLAX_STARS.find((s) => s.id === starId) ?? null;
  const parsecs = 10 ** logD;
  const p = 1 / parsecs;
  const latitude = preset ? preset.latitude : CUSTOM_LATITUDE;
  const name = preset ? preset.name : 'The star';

  const choose = (id: string) => {
    const s = PARALLAX_STARS.find((x) => x.id === id)!;
    setStarId(id);
    setLogD(Math.log10(parsecsFromParallax(s.mas / 1000)));
  };
  const reset = () => {
    choose('proxima');
    setT(Math.PI / 2);
    setPlaying(false);
  };

  // Above: Earth round the Sun, and its line of sight through the star to the far background.
  const earth = { x: SUN.x + ORBIT * Math.sin(t), y: SUN.y + ORBIT * Math.cos(t) };
  const star = { x: starX(parsecs), y: SUN.y };
  const back = W - 18;
  const sightY = earth.y + ((star.y - earth.y) * (back - earth.x)) / (star.x - earth.x);
  // The two extremes, six months apart, for the shift on the background.
  const extreme = (y: number) => y + ((star.y - y) * (back - SUN.x)) / (star.x - SUN.x);

  // Below: the telescope, magnified so the ellipse spans most of the view.
  const bar = BARS.find((b) => b <= p * 0.9) ?? BARS[BARS.length - 1];
  // Magnified so the ellipse is as wide as it can be while its height still fits the view.
  const pxPerArcsec = Math.min(W * 0.32, (SCOPE / 2 - 28) / Math.max(Math.abs(Math.sin(latitude)), 0.01)) / p;
  const shift = parallaxShift(p, latitude, t);
  const background = useMemo(() => {
    const random = new Random(9);
    return Array.from({ length: 70 }, () => ({ x: random.uniform(8, W - 8), y: random.uniform(8, SCOPE - 8), r: random.uniform(0.6, 1.6) }));
  }, []);
  const ellipse = { rx: p * pxPerArcsec, ry: Math.max(0.6, p * Math.abs(Math.sin(latitude)) * pxPerArcsec) };
  const centre = { x: W / 2, y: SCOPE / 2 };

  const ly = lightYearsFromParsecs(parsecs);
  const coin = coinDistanceKm(p);
  const caption = `${name}: a parallax of ${parallaxWords(p)}, so it is ${distanceWords(p)} away. Over a year it traces a tiny ellipse ${parallaxWords(2 * p)} wide, the size of a coin seen from ${coin < 100 ? coin.toFixed(1) : Math.round(coin).toLocaleString('en-GB')} km.${
    preset ? ` ${preset.note}` : ''
  }`;

  return (
    <Figure
      number={number}
      title="Parallax"
      description="Above, Earth goes round the Sun and a nearby star sits far beyond it, with Earth’s line of sight through the star reaching the much more distant stars behind: as Earth moves, the star seems to shift against them. Below, the view through a telescope, magnified until the shift shows: the star traces a small ellipse once a year, as wide as twice its parallax. The parallax gives the distance: 1 divided by the parallax in arcseconds is the distance in parsecs. Real values for Proxima Centauri, Sirius, 61 Cygni, Vega and Betelgeuse."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'Earth, and its orbit', symbol: onSky(<><circle r="8" fill="none" stroke="#3e4a66" /><circle cx="8" r="3.5" fill={EARTH} /></>) },
        { label: 'the nearby star', symbol: onSky(<circle r="4" fill={STAR} />) },
        { label: 'the line of sight to it', symbol: onSky(<line x1="-10" y1="5" x2="10" y2="-5" stroke={SIGHT} strokeWidth="1.5" />) },
        { label: 'the star’s yearly ellipse, magnified', symbol: onSky(<ellipse rx="9" ry="4" fill="none" stroke={STAR} strokeOpacity="0.6" strokeDasharray="3 2" />) },
      ]}
      simplified={
        <p>
          Above, the star is drawn hundreds of thousands of times too close: Proxima Centauri is 268,000 times farther from the Sun than Earth is.
          Below, the view is magnified until the shift fills it, with a scale bar to measure by. The real star also creeps steadily across the sky
          by its own motion, and wobbles if it has a companion; astronomers measure and take out both.
        </p>
      }
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? '❚❚ Pause' : '▶ Play a year'}
          </button>
          <span className={styles.presets} role="group" aria-label="Star">
            {PARALLAX_STARS.map((s) => (
              <button key={s.id} type="button" className={styles.toggle} aria-pressed={starId === s.id} onClick={() => choose(s.id)}>
                {s.name}
              </button>
            ))}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${TOP + SCOPE + 8}`} className={seasonStyles.svg} role="img" aria-label={caption}>
          <rect width={W} height={TOP + SCOPE + 8} fill="#070b16" />
          <clipPath id="parallax-top">
            <rect width={W} height={TOP} />
          </clipPath>
          <g clipPath="url(#parallax-top)">
            <rect x={back - 4} y={6} width={14} height={TOP - 12} fill="#1a2238" />
            <text x={back - 8} y={18} fontSize="11" textAnchor="end" fill="var(--sky-muted)">
              distant stars
            </text>
            <circle cx={SUN.x} cy={SUN.y} r={ORBIT} fill="none" stroke="#3e4a66" />
            <line x1={SUN.x} y1={SUN.y - ORBIT} x2={back} y2={extreme(SUN.y - ORBIT)} stroke={SIGHT} strokeOpacity={0.25} strokeDasharray="3 4" />
            <line x1={SUN.x} y1={SUN.y + ORBIT} x2={back} y2={extreme(SUN.y + ORBIT)} stroke={SIGHT} strokeOpacity={0.25} strokeDasharray="3 4" />
            <line x1={earth.x} y1={earth.y} x2={back} y2={sightY} stroke={SIGHT} strokeWidth="1.5" />
            <circle cx={back + 3} cy={sightY} r={4} fill="none" stroke={STAR} strokeWidth="1.5" />
            <circle cx={SUN.x} cy={SUN.y} r={8} fill="var(--sun)" />
            <circle cx={earth.x} cy={earth.y} r={5} fill={EARTH} />
            <circle cx={star.x} cy={star.y} r={4.5} fill={STAR} />
            <text x={star.x} y={star.y + 20} fontSize="12" textAnchor="middle" fill="var(--sky-text)">
              {name}
            </text>
            <text x={SUN.x} y={SUN.y + ORBIT + 18} fontSize="11" textAnchor="middle" fill="var(--sky-muted)">
              Earth’s orbit
            </text>
          </g>
          <line x1={0} y1={TOP} x2={W} y2={TOP} stroke="#2a3550" />
          <g transform={`translate(0 ${TOP + 4})`}>
            {background.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#c9d3ec" opacity={0.75} />
            ))}
            <ellipse cx={centre.x} cy={centre.y} rx={ellipse.rx} ry={ellipse.ry} fill="none" stroke={STAR} strokeOpacity={0.5} strokeDasharray="4 3" />
            <circle cx={centre.x} cy={centre.y} r={1.5} fill="var(--sky-muted)" />
            <circle cx={centre.x + shift.east * pxPerArcsec} cy={centre.y - shift.north * pxPerArcsec} r={5} fill={STAR} />
            <line x1={14} y1={SCOPE - 16} x2={14 + bar * pxPerArcsec} y2={SCOPE - 16} stroke="var(--sky-text)" strokeWidth="2" />
            <text x={14} y={SCOPE - 22} fontSize="11.5" fill="var(--sky-text)">
              {bar >= 0.01 ? bar : bar.toFixed(4).replace(/0+$/, '')}″
            </text>
            <text x={14} y={18} fontSize="11.5" fill="var(--sky-muted)">
              Through a telescope, magnified
            </text>
          </g>
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Distance
          <input
            type="range"
            min={0}
            max={3}
            step={0.005}
            value={logD}
            onChange={(e) => {
              setLogD(Number(e.target.value));
              setStarId('custom');
            }}
            aria-valuetext={`${ly < 100 ? ly.toFixed(1) : Math.round(ly)} light-years: a parallax of ${parallaxWords(p)}`}
          />
          <output>{ly < 100 ? ly.toFixed(1) : Math.round(ly).toLocaleString('en-GB')} ly</output>
        </label>
        <div className={styles.readout}>
          <span>
            Parallax: <b>{parallaxWords(p)}</b>
          </span>
          <span>
            Distance = 1 ÷ parallax = <b>{distanceWords(p)}</b>
          </span>
          {preset && (
            <span>
              Source: <b>{preset.source}</b>
            </span>
          )}
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
