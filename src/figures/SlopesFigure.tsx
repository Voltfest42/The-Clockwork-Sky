import { useState, type ReactNode } from 'react';
import { formatScientific } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { MODEL_S_RADIUS, pressureSlope, smoothPressure, weightPerMetre } from './holding';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Slopes (Figure T8.1): a curve with a tangent you slide along it, and a zoom
 * that closes in on the point until the curve looks straight. Two curves: a
 * ball dropped from 100 m (its slope is its speed) and the Sun's pressure from
 * Model S (its slope is the weight of each metre of gas, ρg: Chapter 20).
 */

type Curve = 'ball' | 'sun';
const G0 = 9.81;
const BALL_TIME = Math.sqrt(200 / G0);

interface CurveSpec {
  name: string;
  xMax: number;
  f: (x: number) => number;
  slope: (x: number) => number;
  xLabel: string;
  yLabel: string;
  formatX: (x: number) => string;
  start: number;
}

const CURVES: Record<Curve, CurveSpec> = {
  ball: {
    name: 'A falling ball',
    xMax: BALL_TIME,
    f: (t) => 100 - 0.5 * G0 * t * t,
    slope: (t) => -G0 * t,
    xLabel: 'Time (s)',
    yLabel: 'Height (m)',
    formatX: (x) => `${x.toFixed(1)}`,
    start: 2,
  },
  sun: {
    name: 'The Sun’s pressure',
    xMax: 1,
    // Pressure in units of 10¹⁶ Pa against r/R.
    f: (x) => smoothPressure(x) / 1e16,
    slope: (x) => (pressureSlope(x) * MODEL_S_RADIUS) / 1e16,
    xLabel: 'Distance from the centre (fraction of the radius)',
    yLabel: 'Pressure (10¹⁶ Pa)',
    formatX: (x) => x.toFixed(2),
    start: 0.2,
  },
};

const ZOOMS = [1, 3, 10, 30, 100, 300, 1000];

export function SlopesFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [curve, setCurve] = useState<Curve>('ball');
  const [at, setAt] = useState(CURVES.ball.start);
  const [zoom, setZoom] = useState(0);
  const reset = () => {
    setCurve('ball');
    setAt(CURVES.ball.start);
    setZoom(0);
  };
  const c = CURVES[curve];
  const z = ZOOMS[zoom];
  const half = c.xMax / 2 / z;
  const x0 = Math.max(0, Math.min(c.xMax - 2 * half, at - half));
  const x1 = x0 + 2 * half;
  const y = c.f(at);
  const m = c.slope(at);
  const samples = Array.from({ length: 241 }, (_, k) => {
    const x = x0 + ((x1 - x0) * k) / 240;
    return { x, y: c.f(x) };
  });
  const ys = samples.map((p) => p.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const pad = (hi - lo) * 0.08 || Math.abs(y) * 0.01 || 1;
  // The worst gap between the curve and its tangent across the window, as a share of the window's height.
  const gap = Math.max(...samples.map((p) => Math.abs(p.y - (y + m * (p.x - at))))) / (hi - lo + 2 * pad);
  const tangent = [x0, x1].map((x) => ({ x, y: y + m * (x - at) }));

  let reading: string;
  if (curve === 'ball') {
    reading = `At ${at.toFixed(2)} s the ball is ${y.toFixed(1)} m up, and its height is falling at ${Math.abs(m).toFixed(1)} m every second: that slope is its speed. (Exactly gt = ${(G0 * at).toFixed(1)} m/s.)`;
  } else {
    const perMetre = -pressureSlope(at);
    reading = `At ${at.toFixed(2)} of the radius the pressure falls by ${formatScientific(perMetre, 3)} Pa for every metre outward. One cubic metre of gas there weighs ${formatScientific(weightPerMetre(at), 3)} newtons: the slope is the weight it holds up.`;
  }

  return (
    <Figure
      number={number}
      title="Slopes"
      description="A curve with a tangent line touching it at one point, which you slide along the curve; its slope is the rate of change there. Zoom in on the point and the curve looks more and more like its tangent. Two curves: the height of a ball falling from 100 metres, whose slope is its speed, and the pressure inside the Sun from Model S, whose slope equals the weight of each cubic metre of gas."
      height={560}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the curve', symbol: <line x1="-9" x2="9" y1="0" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'its tangent at the point', symbol: <line x1="-9" x2="9" y1="0" y2="0" stroke="var(--series-2)" strokeWidth="3" strokeDasharray="4 3" /> },
      ]}
      simplified={curve === 'sun' ? <p>The Sun’s pressure is a smooth curve (a spline) through Model S’s 117 tabulated shells.</p> : undefined}
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Curve">
          {(Object.keys(CURVES) as Curve[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={curve === k}
              onClick={() => {
                setCurve(k);
                setAt(CURVES[k].start);
                setZoom(0);
              }}
            >
              {CURVES[k].name}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        <Slider label="Point at" value={at} min={0} max={c.xMax} step={c.xMax / 400} format={(x) => (curve === 'ball' ? `${x.toFixed(2)} s` : `${x.toFixed(3)} R☉`)} onChange={setAt} />
        <Slider label="Zoom" value={zoom} min={0} max={ZOOMS.length - 1} step={1} format={(k) => `×${ZOOMS[Math.round(k)].toLocaleString('en-GB')}`} onChange={(k) => setZoom(Math.round(k))} />
      </div>
      <ProfilePlot
        series={[
          { name: 'curve', color: 'var(--accent)', points: samples },
          { name: 'tangent', color: 'var(--series-2)', dashed: true, points: tangent },
        ]}
        hideLegend
        xMin={x0}
        xMax={x1}
        yMin={lo - pad}
        yMax={hi + pad}
        xLabel={c.xLabel}
        yLabel={c.yLabel}
        formatX={(x) => (z >= 100 ? x.toFixed(curve === 'ball' ? 3 : 4) : z >= 10 ? x.toFixed(curve === 'ball' ? 2 : 3) : c.formatX(x))}
        formatY={(v) => String(Number(v.toPrecision(z >= 30 ? 6 : 3)))}
        ariaLabel={`${c.name}, zoomed ×${z}, with its tangent at the point`}
        height={280}
      >
        {(sx, sy) => <circle cx={sx(at)} cy={sy(y)} r="5" fill="var(--text)" />}
      </ProfilePlot>
      <p className={styles.hint}>
        {gap < 0.002
          ? `At ×${z.toLocaleString('en-GB')} the curve and its tangent are indistinguishable here: close enough in, every smooth curve looks straight.`
          : `At ×${z.toLocaleString('en-GB')} the curve strays from its tangent by up to ${Math.round(gap * 100)}% of the view. Zoom in further.`}
      </p>
      <Caption>{reading}</Caption>
    </Figure>
  );
}
