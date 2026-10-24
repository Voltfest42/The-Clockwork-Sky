import { useId, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { onSky } from './sky/legend';
import { DIAGRAM, lunarDiagram, solarDiagram } from './shadows';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Shadows: the umbra and penumbra behind the Moon (a solar eclipse) and
 * behind Earth (a lunar eclipse), drawn side on and far out of scale, with
 * the view from the ground beside them. The Moon's distance decides whether a
 * central solar eclipse is total or annular; its offset from the line decides
 * whether an eclipse is total, partial or missed.
 */

const W = DIAGRAM.width;
const H = DIAGRAM.height;
const MID = H / 2;
const PERIGEE = 356.4;
const APOGEE = 406.7;
const SOLAR = DIAGRAM.solar;
const LUNAR = DIAGRAM.lunar;

type Kind = 'solar' | 'lunar';

const SOLAR_PRESETS: { label: string; offset: number; distance?: number }[] = [
  { label: 'Total', distance: 360, offset: 0 },
  { label: 'Annular', distance: 404, offset: 0 },
  { label: 'Partial', distance: 384.4, offset: 0.6 },
];
const LUNAR_PRESETS: { label: string; offset: number; distance?: number }[] = [
  { label: 'Total', offset: 0 },
  { label: 'Partial', offset: 0.42 },
  { label: 'Penumbral', offset: 0.72 },
  { label: 'Missed', offset: 1 },
];

const points = (list: { x: number; y: number }[]) => list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export function ShadowsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [kind, setKind] = useState<Kind>('solar');
  const [distance, setDistance] = useState(360);
  const [offset, setOffset] = useState(0);
  const offsetId = useId();

  const reset = () => {
    setKind('solar');
    setDistance(360);
    setOffset(0);
  };

  let picture: ReactNode;
  let inset: ReactNode;
  let story: string;
  if (kind === 'solar') {
    const { moon, shadow, observer, view, seen } = solarDiagram(distance, offset);
    story =
      seen === 'total'
        ? 'The tip of the Moon’s dark shadow, the umbra, reaches Earth. From inside it the Moon covers the whole Sun: a total eclipse, and the sky goes dark enough to see the Sun’s faint outer atmosphere, the corona.'
        : seen === 'annular'
          ? 'The Moon is far away, so its umbra ends before it reaches Earth. Beyond the tip, the Moon looks smaller than the Sun and leaves a ring of sunlight round it: an annular eclipse.'
          : seen === 'partial'
            ? 'Only the outer shadow, the penumbra, falls on the marked place: from there the Moon covers part of the Sun, a partial eclipse.'
            : 'The Moon passes too far above or below the line: its shadow misses the marked place, and there is no eclipse there.';
    picture = (
      <>
        <polygon points={points(shadow.penumbra)} fill="#58617a" opacity="0.45" />
        <polygon points={points(shadow.umbra)} fill="#000" opacity="0.9" />
        <polygon points={points(shadow.antumbra)} fill="#1a2238" opacity="0.8" />
        <circle cx={SOLAR.sun.x} cy={MID} r={SOLAR.sun.r} fill="var(--sun)" />
        <circle cx={SOLAR.earth.x} cy={MID} r={SOLAR.earth.r} fill="#3d6fb5" />
        <circle cx={moon.x} cy={moon.y} r={moon.r} fill="#c9c4b5" />
        <circle cx={observer.x} cy={observer.y} r="4" fill="#ffd166" stroke="#5b3b00" />
        <text x={SOLAR.sun.x} y={MID + SOLAR.sun.r + 18} fontSize="12" fill="#e2e8f5" textAnchor="middle">
          Sun
        </text>
        <text x={moon.x} y={moon.y - moon.r - 8} fontSize="12" fill="#e2e8f5" textAnchor="middle">
          Moon
        </text>
        <text x={SOLAR.earth.x} y={MID + SOLAR.earth.r + 18} fontSize="12" fill="#e2e8f5" textAnchor="middle">
          Earth
        </text>
        <text x={Math.min(shadow.apex.x, W - 60)} y={22} fontSize="11" fill="#c3cbe0" textAnchor="middle">
          {shadow.apex.x < SOLAR.earth.x - SOLAR.earth.r ? 'umbra ends here ↓' : ''}
        </text>
      </>
    );
    const R = 54;
    const scale = R / view.light;
    const sign = offset >= 0 ? -1 : 1;
    inset = (
      <svg viewBox="-100 -100 200 200" className={seasonStyles.svg} role="img" aria-label={`The Sun seen from the marked place: ${seen === 'none' ? 'no eclipse' : `${seen} eclipse`}.`}>
        <rect x="-100" y="-100" width="200" height="200" fill={seen === 'total' ? '#05070f' : seen === 'none' ? '#3d6ea8' : '#2f5585'} />
        {seen === 'total' && <circle r={R * 1.6} fill={`url(#${offsetId}-corona)`} />}
        <defs>
          <radialGradient id={`${offsetId}-corona`}>
            <stop offset="55%" stopColor="#f4f0ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f4f0ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r={R} fill="var(--sun)" />
        <circle cy={sign * view.separation * scale} r={view.body * scale} fill="#14161c" />
      </svg>
    );
  } else {
    const { moon, moonOffset, umbra, penumbra, shadow, seen } = lunarDiagram(offset);
    story =
      seen === 'total'
        ? 'The whole Moon is inside Earth’s umbra. No sunlight reaches it directly, but Earth’s air bends a little sunlight into the shadow and scatters the blue out of it, so the Moon glows a dim coppery red: a total lunar eclipse.'
        : seen === 'partial'
          ? 'Part of the Moon is in Earth’s umbra, which takes a dark, curved bite out of it: a partial lunar eclipse. The curve of the shadow is the curve of Earth.'
          : seen === 'penumbral'
            ? 'The Moon is only in the penumbra, where Earth hides part of the Sun. It dims a little, hardly enough to notice: a penumbral eclipse.'
            : 'The Moon passes above or below Earth’s shadow, as it does at most full Moons: no eclipse.';
    const moonColour = seen === 'total' ? '#9c3b20' : seen === 'penumbral' ? '#b8b3a5' : '#e8e4d8';
    // A few rays of sunlight that graze Earth's air and bend into the shadow.
    const rays = [-1, 1].map((side) => {
      const top = { x: LUNAR.earth.x, y: MID + side * (LUNAR.earth.r + 2) };
      return `M ${LUNAR.sun.x} ${MID + side * (LUNAR.sun.r * 0.6)} L ${top.x} ${top.y} L ${LUNAR.moonX + 10} ${MID + side * 6}`;
    });
    picture = (
      <>
        <polygon points={points(shadow.penumbra)} fill="#58617a" opacity="0.45" />
        <polygon points={points(shadow.umbra)} fill="#000" opacity="0.9" />
        {rays.map((d) => (
          <path key={d} d={d} fill="none" stroke="#ff8a50" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.85" />
        ))}
        <circle cx={LUNAR.sun.x} cy={MID} r={LUNAR.sun.r} fill="var(--sun)" />
        <circle cx={LUNAR.earth.x} cy={MID} r={LUNAR.earth.r + 3} fill="none" stroke="#7fc8f8" strokeWidth="2" opacity="0.7" />
        <circle cx={LUNAR.earth.x} cy={MID} r={LUNAR.earth.r} fill="#3d6fb5" />
        <circle cx={moon.x} cy={moon.y} r={moon.r} fill={moonColour} />
        <text x={LUNAR.sun.x + 10} y={MID + LUNAR.sun.r + 18} fontSize="12" fill="#e2e8f5" textAnchor="middle">
          Sun
        </text>
        <text x={LUNAR.earth.x} y={MID + LUNAR.earth.r + 20} fontSize="12" fill="#e2e8f5" textAnchor="middle">
          Earth
        </text>
        <text x={moon.x} y={moon.y - moon.r - 8} fontSize="12" fill="#e2e8f5" textAnchor="middle">
          Moon
        </text>
      </>
    );
    const k = 1.25; // inset units per drawing unit
    inset = (
      <svg viewBox="-100 -100 200 200" className={seasonStyles.svg} role="img" aria-label={`The Moon in Earth’s shadow, seen from Earth: ${seen === 'none' ? 'no eclipse' : `${seen} eclipse`}.`}>
        <defs>
          <clipPath id={`${offsetId}-moon`}>
            <circle cy={-moonOffset * k} r={moon.r * k} />
          </clipPath>
        </defs>
        <circle r={penumbra * k} fill="#1c2235" stroke="#58617a" strokeDasharray="3 3" />
        <circle r={umbra * k} fill="#2b1410" stroke="#7a3a26" />
        <circle cy={-moonOffset * k} r={moon.r * k} fill={seen === 'penumbral' ? '#b8b3a5' : '#e8e4d8'} />
        <circle r={umbra * k} fill="#9c3b20" clipPath={`url(#${offsetId}-moon)`} />
        <text x="0" y="94" fontSize="10" fill="#9aa8c4" textAnchor="middle">
          Earth’s shadow, where the Moon is
        </text>
      </svg>
    );
  }

  return (
    <Figure
      number={number}
      title="Shadows"
      description="Side views of the shadows behind the Moon and behind Earth: a dark inner cone, the umbra, where the Sun is completely hidden, inside a lighter outer one, the penumbra, where it is partly hidden. Beside each, the view from the ground: a total, annular or partial eclipse of the Sun, and the Moon turning red in Earth’s shadow."
      height={680}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={[
        { label: 'umbra: the light is completely hidden', symbol: onSky(<rect x="-10" y="-6" width="20" height="12" fill="#000" stroke="#56607a" />) },
        { label: 'penumbra: the light is partly hidden', symbol: onSky(<rect x="-10" y="-6" width="20" height="12" fill="#58617a" opacity="0.7" />) },
        { label: 'beyond the umbra’s tip: a ring of light is left', symbol: onSky(<rect x="-10" y="-6" width="20" height="12" fill="#1a2238" stroke="#56607a" />) },
        { label: 'sunlight bent into Earth’s shadow by its air', symbol: onSky(<path d="M-10 4 L2 -2 L10 2" stroke="#ff8a50" strokeWidth="2" strokeDasharray="3 2" fill="none" />) },
        { label: 'the place the view is from', symbol: onSky(<circle r="4" fill="#ffd166" stroke="#5b3b00" />) },
      ]}
      simplified={
        <p>
          Nothing here is to scale. The Sun is really 400 times wider than the Moon and 390 times farther away, and the Moon is 30 Earth-widths
          from Earth; drawn true, the shadows would be needles far too thin to see. The sizes are chosen so that the geometry still works out:
          the Moon’s umbra just reaches Earth when the Moon is closer than about 380,000 km, as it really does. Earth’s air is drawn as a thin
          blue ring; the bending of light in it is much exaggerated.
        </p>
      }
    >
      <div>
        <div className={styles.controls}>
          <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
            <span className={figureStyles.segmented} role="group" aria-label="Kind of eclipse">
              {(['solar', 'lunar'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => {
                    setKind(k);
                    setOffset(0);
                  }}
                >
                  {k === 'solar' ? 'Solar eclipse' : 'Lunar eclipse'}
                </button>
              ))}
            </span>
            {(kind === 'solar' ? SOLAR_PRESETS : LUNAR_PRESETS).map((p) => (
              <button
                key={p.label}
                type="button"
                className={figureStyles.toolButton}
                onClick={() => {
                  setOffset(p.offset);
                  if (p.distance !== undefined) setDistance(p.distance);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {kind === 'solar' && (
            <label className={styles.slider}>
              Moon’s distance
              <input
                type="range"
                min={PERIGEE}
                max={APOGEE}
                step={0.1}
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                aria-valuetext={`${Math.round(distance * 1000).toLocaleString('en-GB')} km`}
              />
              <output>{Math.round(distance * 1000).toLocaleString('en-GB')} km</output>
            </label>
          )}
          <label className={styles.slider} htmlFor={offsetId}>
            Moon above or below the line
            <input id={offsetId} type="range" min={-1} max={1} step={0.01} value={offset} onChange={(e) => setOffset(Number(e.target.value))} aria-valuetext={`${Math.round(offset * 100)}%`} />
            <output>{offset === 0 ? 'on the line' : `${offset > 0 ? 'above' : 'below'}`}</output>
          </label>
        </div>
        <div className={figureStyles.withSide}>
          <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={`Side view of the shadows in a ${kind} eclipse. ${story}`}>
            {picture}
          </svg>
          <div className={figureStyles.side}>
            <p className={styles.panelTitle}>{kind === 'solar' ? 'The Sun, from the marked place' : 'The Moon, from Earth'}</p>
            <div style={{ maxWidth: 220 }}>{inset}</div>
          </div>
        </div>
      </div>
      <Caption>{story}</Caption>
    </Figure>
  );
}
