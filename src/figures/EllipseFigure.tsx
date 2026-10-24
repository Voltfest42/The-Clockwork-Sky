import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { apsides, semiMinorAxis } from '../core/orbits/ellipse';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { formatE, ORBIT_PRESETS, presetFor } from './ellipses';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Drawing an ellipse with two pins and a loop of string, as gardeners do:
 * the pencil keeps the string tight, so its distances to the two pins always
 * add up to the same length. The Sun sits at one pin. The eccentricity slider
 * moves the pins apart; presets give real orbits' shapes, to scale.
 */

const W = 560;
const H = 390;
const CX = W / 2;
const CY = H / 2;
const A = 182;
const DRAW_SECONDS = 4;

/** The ellipse's outline from its parameter 0 to `upTo` (radians), as SVG points. */
function outline(a: number, b: number, upTo: number): string {
  const n = Math.max(2, Math.ceil((upTo / (2 * Math.PI)) * 180));
  const out: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (upTo * i) / n;
    out.push(`${(CX + a * Math.cos(t)).toFixed(1)},${(CY - b * Math.sin(t)).toFixed(1)}`);
  }
  return out.join(' ');
}

/** The ellipse with pins and string, for the figure and the Check yourself question. */
export function PinsAndString({ e, t, drawn, onPencil }: { e: number; t: number; drawn: number; onPencil?: (t: number) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const b = A * Math.sqrt(1 - e * e);
  const c = A * e;
  const sun = { x: CX - c, y: CY };
  const pin = { x: CX + c, y: CY };
  const pencil = { x: CX + A * Math.cos(t), y: CY - b * Math.sin(t) };
  const fromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || !onPencil) return;
    const x = ((event.clientX - box.left) / box.width) * W - CX;
    const y = CY - ((event.clientY - box.top) / box.height) * H;
    onPencil((Math.atan2(y / Math.max(b, 1), x / A) + 2 * Math.PI) % (2 * Math.PI));
  };
  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      className={seasonStyles.svg}
      aria-hidden="true"
      onPointerDown={(ev) => {
        if (!onPencil) return;
        dragging.current = true;
        (ev.target as Element).setPointerCapture?.(ev.pointerId);
        fromPointer(ev);
      }}
      onPointerMove={(ev) => dragging.current && fromPointer(ev)}
      onPointerUp={() => (dragging.current = false)}
      style={onPencil ? { cursor: 'grab' } : undefined}
    >
      <circle cx={CX} cy={CY} r={A} fill="none" stroke="#3b4c72" strokeDasharray="3 5" />
      <polyline points={outline(A, b, 2 * Math.PI)} fill="none" stroke="#7d8db0" strokeOpacity="0.35" />
      <polyline points={outline(A, b, drawn)} fill="none" stroke="#ffe08a" strokeWidth="2.5" />
      <polyline points={`${sun.x},${sun.y} ${pencil.x},${pencil.y} ${pin.x},${pin.y}`} fill="none" stroke="#f4a7b9" strokeWidth="1.6" />
      <circle cx={sun.x} cy={sun.y} r="9" fill="var(--sun)" />
      <circle cx={pin.x} cy={pin.y} r="4" fill="#c8d2e8" />
      <circle cx={pencil.x} cy={pencil.y} r="6" fill="#ffffff" stroke="#070b16" strokeWidth="1.5" />
      <text x={sun.x} y={sun.y + 24} textAnchor="middle" fontSize="11" fill="var(--sky-text)">
        Sun (pin 1)
      </text>
      <text x={pin.x} y={pin.y + 20} textAnchor="middle" fontSize="11" fill="var(--sky-muted)">
        pin 2
      </text>
    </svg>
  );
}

export function EllipseFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [e, setE] = useState(0.5);
  const [t, setT] = useState(Math.PI / 3);
  const [drawn, setDrawn] = useState(2 * Math.PI);
  const [drawing, setDrawing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();

  useAnimationFrame(drawing && onScreen, (dt) => {
    const next = Math.min(2 * Math.PI, drawn + (dt * 2 * Math.PI) / DRAW_SECONDS);
    setDrawn(next);
    setT(next % (2 * Math.PI));
    if (next >= 2 * Math.PI) setDrawing(false);
  });

  const draw = () => {
    if (reducedMotion) {
      setDrawn(2 * Math.PI);
      return;
    }
    setDrawn(0);
    setT(0);
    setDrawing(true);
  };
  const reset = () => {
    setE(0.5);
    setT(Math.PI / 3);
    setDrawn(2 * Math.PI);
    setDrawing(false);
  };

  const b = semiMinorAxis({ a: 1, e });
  const sunToPencil = Math.hypot(Math.cos(t) + e, b * Math.sin(t));
  const pencilToPin = Math.hypot(Math.cos(t) - e, b * Math.sin(t));
  const preset = presetFor(e);
  const { perihelion, aphelion } = apsides({ a: 1, e });

  return (
    <Figure
      number={number}
      title="Draw an ellipse"
      description="An ellipse drawn with two pins and a loop of string: the pencil keeps the string tight, so its distances to the two pins always add up to the same length. The Sun sits at one pin. Moving the pins apart stretches the ellipse; presets show the real shapes of the orbits of Earth (almost a circle), Mars, Mercury, Pluto and Halley’s comet, to scale."
      height={700}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the string, from pin to pencil to pin', symbol: onSky(<path d="M-10 5 L0 -6 L10 5" stroke="#f4a7b9" strokeWidth="1.6" fill="none" />) },
        { label: 'the ellipse drawn so far', symbol: onSky(<path d="M-10 0 H10" stroke="#ffe08a" strokeWidth="2.5" />) },
        { label: 'a circle the same width, for comparison', symbol: onSky(<path d="M-10 0 H10" stroke="#3b4c72" strokeWidth="2" strokeDasharray="3 3" />) },
        { label: 'the Sun, at one pin (a focus)', symbol: onSky(<circle r="5" fill="var(--sun)" />) },
      ]}
    >
      <div ref={box}>
        <div className={figureStyles.toolbar}>
          <button type="button" className={figureStyles.toolButton} onClick={draw} disabled={drawing}>
            ✎ Draw it
          </button>
          <span className={styles.togglesLabel}>Real orbits</span>
          <span className={styles.presets} role="group" aria-label="Real orbits">
            {ORBIT_PRESETS.map((p) => (
              <button key={p.id} type="button" className={styles.toggle} aria-pressed={preset?.id === p.id} onClick={() => setE(p.e)}>
                {p.name}
              </button>
            ))}
          </span>
        </div>
        <PinsAndString e={e} t={t} drawn={drawn} onPencil={(next) => setT(next)} />
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Eccentricity
          <input type="range" min={0} max={0.99} step={0.001} value={e} onChange={(ev) => setE(Number(ev.target.value))} aria-valuetext={`${formatE(e)}${preset ? `, ${preset.name}` : ''}`} />
          <output>{formatE(e)}</output>
        </label>
        <label className={styles.slider}>
          Pencil
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={Math.round((t * 180) / Math.PI) % 360}
            onChange={(ev) => setT((Number(ev.target.value) * Math.PI) / 180)}
            aria-valuetext={`${sunToPencil.toFixed(2)} from the Sun plus ${pencilToPin.toFixed(2)} from pin 2 makes ${(sunToPencil + pencilToPin).toFixed(2)}`}
          />
          <output>{Math.round((t * 180) / Math.PI) % 360}°</output>
        </label>
        <div className={styles.readout}>
          <span>
            Pencil to Sun <b>{sunToPencil.toFixed(2)}</b> + pencil to pin 2 <b>{pencilToPin.toFixed(2)}</b> = <b>{(sunToPencil + pencilToPin).toFixed(2)}</b>, always
          </span>
          <span>
            Nearest the Sun <b>{perihelion.toFixed(2)}</b>, farthest <b>{aphelion.toFixed(2)}</b> (half the width = 1)
          </span>
        </div>
      </div>
      <Caption>
        {preset && preset.id !== 'circle'
          ? `${preset.name}’s orbit, to scale: eccentricity ${formatE(preset.e)}. ${preset.e < 0.05 ? 'It is so close to a circle that you can hardly tell the difference: the Sun is just off-centre.' : preset.e > 0.9 ? 'A long, thin ellipse: the comet swings close round the Sun and then far out, beyond Neptune.' : `Its distance from the Sun swings from ${perihelion.toFixed(2)} to ${aphelion.toFixed(2)} of its average.`}`
          : e === 0
            ? 'With both pins in one place the string traces a circle: an ellipse with eccentricity 0.'
            : `The pins are ${formatE(e)} of the half-width from the centre each. The farther apart they are, the more stretched the ellipse: the eccentricity runs from 0 (a circle) towards 1 (a straight line).`}
      </Caption>
    </Figure>
  );
}
