import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import type { OrbitCameraState } from '../viz/scene3d/orbitCamera';
import { Scene3D } from '../viz/scene3d/Scene3D';
import { dotCrossScene, type DotCrossState } from './dotCross/scene';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Dot and cross (Figure T7.1): two arrows a and b to drag (or set by length
 * and direction). Their sum a + b, by the parallelogram; their dot product as
 * b's shadow on a, |a| × the shadow's length; and their cross product, an
 * arrow standing up from the floor in a small 3D view, as long as the
 * parallelogram's area, pointing up when b is anticlockwise from a.
 */

const RANGE = 5;
const START = { a: [3, 1] as [number, number], b: [1, 3] as [number, number] };
const CAMERA: OrbitCameraState = { target: [0, 0, 0.2], azimuth: -0.8, elevation: 0.45, distance: 2.5 };

type Show = 'sum' | 'dot' | 'cross';

export function DotCrossFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [a, setA] = useState<[number, number]>(START.a);
  const [b, setB] = useState<[number, number]>(START.b);
  const [show, setShow] = useState<Show>('dot');
  const [cameraReset, setCameraReset] = useState(0);
  const dragging = useRef<'a' | 'b' | null>(null);
  const reset = () => {
    setA(START.a);
    setB(START.b);
    setShow('dot');
    setCameraReset((n) => n + 1);
  };
  const len = (v: readonly [number, number]) => Math.hypot(v[0], v[1]);
  const dir = (v: readonly [number, number]) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
  const fromPolar = (r: number, deg: number): [number, number] => [round(r * Math.cos((deg * Math.PI) / 180)), round(r * Math.sin((deg * Math.PI) / 180))];
  const dot = a[0] * b[0] + a[1] * b[1];
  const cross = a[0] * b[1] - a[1] * b[0];
  const la = len(a);
  const lb = len(b);
  let angle = Math.abs(dir(b) - dir(a));
  if (angle > 180) angle = 360 - angle;
  const shadow = la > 0 ? dot / la : 0;
  const state: DotCrossState = useMemo(() => ({ a, b }), [a, b]);

  const S = 200 / RANGE / 1.1;
  const px = (v: number) => v * S;
  const arrowHead = (v: readonly [number, number], color: string) => {
    const L = len(v);
    if (L < 1e-6) return null;
    const ux = v[0] / L;
    const uy = v[1] / L;
    const tipX = px(v[0]);
    const tipY = -px(v[1]);
    const back = 12;
    const side = 6;
    return <path d={`M ${tipX} ${tipY} L ${tipX - back * ux - side * uy} ${tipY + back * uy - side * ux} L ${tipX - back * ux + side * uy} ${tipY + back * uy + side * ux} Z`} fill={color} />;
  };
  const arrow = (v: readonly [number, number], color: string, width = 3, from: readonly [number, number] = [0, 0], dash?: string) => (
    <g>
      <line x1={px(from[0])} y1={-px(from[1])} x2={px(from[0] + v[0])} y2={-px(from[1] + v[1])} stroke={color} strokeWidth={width} strokeDasharray={dash} />
      {from[0] === 0 && from[1] === 0 && arrowHead(v, color)}
    </g>
  );

  const toUnits = (event: PointerEvent<SVGSVGElement>): [number, number] => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width - 0.5) * 420;
    const y = (0.5 - (event.clientY - box.top) / box.height) * 420;
    return [clamp(round(x / S)), clamp(round(y / S))];
  };
  const down = (event: PointerEvent<SVGSVGElement>) => {
    const p = toUnits(event);
    const da = Math.hypot(p[0] - a[0], p[1] - a[1]);
    const db = Math.hypot(p[0] - b[0], p[1] - b[1]);
    dragging.current = da <= db ? 'a' : 'b';
    (dragging.current === 'a' ? setA : setB)(p);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    (dragging.current === 'a' ? setA : setB)(toUnits(event));
  };

  const fmt = (x: number) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2).replace(/\.?0+$/, '').replace('-', '−'));
  const caption =
    `a = (${fmt(a[0])}, ${fmt(a[1])}) and b = (${fmt(b[0])}, ${fmt(b[1])}), ${Math.round(angle)}° apart. ` +
    `Their sum is (${fmt(a[0] + b[0])}, ${fmt(a[1] + b[1])}). ` +
    `Their dot product is ${fmt(a[0])} × ${fmt(b[0])} + ${fmt(a[1])} × ${fmt(b[1])} = ${fmt(dot)}: b’s shadow on a is ${fmt(shadow)} long${dot < -1e-9 ? ', pointing backwards' : ''}, times a’s length ${fmt(la)}. ` +
    `Their cross product is ${fmt(cross)}, ${Math.abs(cross) < 1e-9 ? 'nothing: they point along one line' : `pointing ${cross > 0 ? 'up' : 'down'} out of the floor, as long as the parallelogram’s area`}.`;

  return (
    <Figure
      number={number}
      title="Dot and cross"
      description="Two arrows, a and b, drawn from the same point. Their sum is the diagonal of the parallelogram they make. Their dot product is the length of b’s shadow on a times a’s length: largest when they point the same way, zero when they are at right angles, negative when they point apart. Their cross product is an arrow at right angles to both, as long as the parallelogram’s area, shown standing up in a small 3D view."
      height={980}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-1)" strokeWidth="3" /> },
        { label: 'b', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="3" /> },
        { label: 'a + b, or b’s shadow on a', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-3)" strokeWidth="3" /> },
        { label: 'a × b (in the 3D view)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--right)" strokeWidth="3" /> },
      ]}
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Show">
          {(
            [
              ['sum', 'Sum'],
              ['dot', 'Dot product'],
              ['cross', 'Cross product'],
            ] as const
          ).map(([id, name]) => (
            <button key={id} type="button" aria-pressed={show === id} onClick={() => setShow(id)}>
              {name}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        <Slider label="a’s length" value={la} min={0} max={RANGE} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => setA(fromPolar(v, dir(a)))} />
        <Slider label="a’s direction" value={(dir(a) + 360) % 360} min={0} max={359} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => setA(fromPolar(la, v))} />
        <Slider label="b’s length" value={lb} min={0} max={RANGE} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => setB(fromPolar(v, dir(b)))} />
        <Slider label="b’s direction" value={(dir(b) + 360) % 360} min={0} max={359} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => setB(fromPolar(lb, v))} />
      </div>
      <div className={styles.split}>
        <div>
          <p className={styles.panelTitle}>Drag the arrows’ tips</p>
          <svg
            viewBox="-210 -210 420 420"
            width="100%"
            style={{ maxWidth: 420, display: 'block', touchAction: 'none', cursor: 'crosshair' }}
            role="img"
            aria-label={`Arrows a and b on a grid. ${caption}`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={() => (dragging.current = null)}
            onPointerCancel={() => (dragging.current = null)}
          >
            <rect x="-210" y="-210" width="420" height="420" rx="8" fill="var(--surface)" stroke="var(--border)" />
            {Array.from({ length: 2 * RANGE + 1 }, (_, i) => i - RANGE).map((g) => (
              <g key={g}>
                <line x1={px(g)} x2={px(g)} y1={-px(RANGE)} y2={px(RANGE)} stroke="var(--border)" strokeWidth={g === 0 ? 1.5 : 1} />
                <line y1={px(g)} y2={px(g)} x1={-px(RANGE)} x2={px(RANGE)} stroke="var(--border)" strokeWidth={g === 0 ? 1.5 : 1} />
              </g>
            ))}
            {(show === 'sum' || show === 'cross') && (
              <path d={`M 0 0 L ${px(a[0])} ${-px(a[1])} L ${px(a[0] + b[0])} ${-px(a[1] + b[1])} L ${px(b[0])} ${-px(b[1])} Z`} fill="var(--series-3)" fillOpacity={show === 'cross' ? 0.22 : 0.08} stroke="var(--series-3)" strokeDasharray="4 3" />
            )}
            {show === 'sum' && arrow([a[0] + b[0], a[1] + b[1]], 'var(--series-3)', 3)}
            {show === 'dot' && la > 0 && (
              <g>
                <line x1={px(b[0])} y1={-px(b[1])} x2={px((shadow * a[0]) / la)} y2={-px((shadow * a[1]) / la)} stroke="var(--text-muted)" strokeDasharray="3 3" />
                <line x1={0} y1={0} x2={px((shadow * a[0]) / la)} y2={-px((shadow * a[1]) / la)} stroke="var(--series-3)" strokeWidth="7" strokeOpacity="0.55" strokeLinecap="round" />
              </g>
            )}
            {arrow(a, 'var(--series-1)')}
            {arrow(b, 'var(--series-2)')}
            <text x={px(a[0]) + 8} y={-px(a[1]) - 6} fontSize="15" fontWeight="700" fill="var(--series-1)">
              a
            </text>
            <text x={px(b[0]) + 8} y={-px(b[1]) - 6} fontSize="15" fontWeight="700" fill="var(--text-warm)">
              b
            </text>
          </svg>
        </div>
        <div>
          <p className={styles.panelTitle}>The cross product, standing up</p>
          <Scene3D
            label="3D view of a, b and their cross product"
            description={`a and b lie in the floor; their cross product, ${fmt(cross)}, ${Math.abs(cross) < 1e-9 ? 'is zero' : `stands ${cross > 0 ? 'up from' : 'down through'} the floor at right angles to both`}.`}
            factory={dotCrossScene}
            state={state}
            camera={CAMERA}
            limits={{ minDistance: 1.8, maxDistance: 8 }}
            cameraReset={cameraReset}
            height="clamp(240px, 40vw, 360px)"
          />
          <dl className={styles.facts}>
            <div>
              <dt>a + b</dt>
              <dd>
                ({fmt(a[0] + b[0])}, {fmt(a[1] + b[1])})
              </dd>
            </div>
            <div>
              <dt>a · b</dt>
              <dd>
                {fmt(dot)} = |a||b| cos {Math.round(angle)}°
              </dd>
            </div>
            <div>
              <dt>a × b</dt>
              <dd>
                {fmt(cross)} (up the third axis) = |a||b| sin {Math.round(angle)}°{cross < 0 ? ', downwards' : ''}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

function round(x: number): number {
  return Math.round(x * 10) / 10;
}

function clamp(x: number): number {
  return Math.max(-RANGE, Math.min(RANGE, x));
}
