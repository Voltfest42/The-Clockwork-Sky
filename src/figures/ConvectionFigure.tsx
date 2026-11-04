import { useRef, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { CONVECTION_BASE, SUN_SHELLS } from './energy';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Convection or not (Figure 21.3). A parcel of gas nudged upward expands into
 * the lower pressure and cools along the adiabat, its temperature falling as
 * P^∇_ad. If the star's own temperature falls faster with pressure (∇ > ∇_ad),
 * the parcel is left warmer and lighter than the gas around it and keeps
 * rising: the gas convects (Schwarzschild 1906). Otherwise it sinks back and
 * bobs. Then the Sun: Model S's actual gradient against the adiabatic one and
 * the one radiation alone would need; they part where the convection zone
 * begins, at 0.71 of the radius, where helioseismology puts it.
 */

const W = 560;
const H = 300;
const COL = { x: 70, w: 120, top: 20, bottom: 270 };
/** The column spans this drop in ln P, top to bottom. */
const SPAN = 1.2;
/** Temperature at the bottom of the column, K: the Sun's at the base of its convection zone. */
const T_BOTTOM = 2.2e6;
const AD = 0.4;
const START = { gradient: 0.3, cursor: 0.6 };

type Parcel = { s: number; v: number; t: number };
const REST: Parcel = { s: 0.15, v: 0, t: 0 };

export function ConvectionFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [gradient, setGradient] = useState(START.gradient);
  const [parcel, setParcel] = useState<Parcel>(REST);
  const [moving, setMoving] = useState(false);
  const [cursor, setCursor] = useState(START.cursor);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const reset = () => {
    setGradient(START.gradient);
    setParcel(REST);
    setMoving(false);
    setCursor(START.cursor);
  };

  // The parcel starts at s0 (s = ln P below the bottom's, upward positive) in step with its surroundings; at s its
  // temperature has fallen by ∇_ad (s − s0) in ln T and theirs by ∇ (s − s0). Buoyancy follows the difference.
  const s0 = REST.s;
  const lnTParcel = (s: number) => -AD * (s - s0) - gradient * s0;
  const lnTAround = (s: number) => -gradient * s;
  const warmer = (s: number) => lnTParcel(s) - lnTAround(s);
  const unstable = gradient > AD;

  useAnimationFrame(moving && onScreen, (dt) => {
    setParcel((p) => {
      // a = k (T_parcel − T_around)/T, lightly damped, in units of the column per second².
      const a = 40 * warmer(p.s) - 0.6 * p.v;
      const v = p.v + a * dt;
      const s = p.s + v * dt;
      const t = p.t + dt;
      if (s > SPAN || s < 0 || t > 12) {
        setMoving(false);
        return { s: Math.min(SPAN, Math.max(0, s)), v: 0, t };
      }
      return { s, v, t };
    });
  });

  const nudge = () => {
    if (reducedMotion) {
      // No animation: show where it ends up.
      setParcel({ s: unstable ? SPAN : s0, v: 0, t: 1 });
      return;
    }
    setParcel({ s: s0 + 0.04, v: 0.05, t: 0 });
    setMoving(true);
  };

  const y = (s: number) => COL.bottom - (s / SPAN) * (COL.bottom - COL.top);
  const parcelT = T_BOTTOM * Math.exp(lnTParcel(parcel.s));
  const aroundT = T_BOTTOM * Math.exp(lnTAround(parcel.s));
  const diff = parcelT - aroundT;
  const heat = (t: number) => Math.max(0, Math.min(1, (Math.log(t / T_BOTTOM) + SPAN * 0.8) / (SPAN * 0.8)));
  const bands = Array.from({ length: 12 }, (_, i) => {
    const s = ((i + 0.5) / 12) * SPAN;
    return { s, f: heat(T_BOTTOM * Math.exp(lnTAround(s))) };
  });

  const at = SUN_SHELLS.reduce((b, s) => (Math.abs(s.x - cursor) < Math.abs(b.x - cursor) ? s : b));
  const sunPoints = SUN_SHELLS.filter((s) => s.x > 0.005 && s.x < 0.998);
  const verdict = moving
    ? diff > 0
      ? 'warmer than the gas around it, so lighter: it rises'
      : 'cooler than the gas around it, so heavier: it sinks'
    : parcel.s >= SPAN - 1e-6
      ? 'it rose all the way: the gas convects'
      : parcel.t > 0
        ? 'it bobbed and settled back: the gas stays put, and radiation carries the energy'
        : 'press Nudge it up';

  return (
    <Figure
      number={number}
      title="Convection or not"
      description="A parcel of gas nudged upward expands and cools along the adiabat. If the star’s own temperature falls faster with height, the parcel stays warmer than its surroundings and keeps rising: the gas convects. If not, it sinks back. Model S’s temperature gradient follows the one radiation needs from the centre out to 0.71 of the Sun’s radius, then sits on the adiabatic one all the way to the surface: the convection zone, whose base helioseismology puts at 0.713 of the radius."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        {
          label: 'the parcel',
          symbol: <circle r="7" fill="var(--accent)" stroke="var(--text)" />,
        },
        {
          label: 'warmer gas is redder',
          symbol: <rect x="-9" y="-6" width="18" height="12" rx="2" fill="var(--sun)" />,
        },
        {
          label: 'the actual gradient ∇ (Model S)',
          symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="2.5" />,
        },
        {
          label: 'adiabatic ∇_ad',
          symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2.5" strokeDasharray="5 3" />,
        },
        {
          label: 'what radiation needs, ∇_rad',
          symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="2 3" />,
        },
      ]}
      simplified={
        <p>
          The parcel is ideal gas of single atoms (∇_ad = 0.4) moving slowly enough to keep the pressure of its surroundings and quickly enough to
          keep its heat, with a little drag; its bobbing is slowed down to watch. In ionisation zones near the surface, ∇_ad falls to about 0.1, as
          Model S shows. The Sun’s gradients are Model S’s own; ∇_rad is worked out from its opacity, luminosity, pressure and temperature.
        </p>
      }
    >
      <div ref={box}>
        <p className={styles.panelTitle}>A parcel nudged upward</p>
        <div className={styles.controls}>
          <Slider
            label="How fast the star’s temperature falls, ∇"
            value={gradient}
            min={0.1}
            max={0.8}
            step={0.01}
            format={(g) => `${g.toFixed(2)} (adiabat 0.40)`}
            onChange={(g) => {
              setGradient(g);
              setParcel(REST);
              setMoving(false);
            }}
          />
        </div>
        <div className={figureStyles.toolbar}>
          <button type="button" className={styles.toggle} onClick={nudge}>
            Nudge it up
          </button>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`A column of gas whose temperature falls with height at ∇ = ${gradient.toFixed(2)}, with a parcel ${verdict}`}
        >
          {bands.map((b) => (
            <rect
              key={b.s}
              x={COL.x}
              width={COL.w}
              y={y(b.s + SPAN / 24)}
              height={(COL.bottom - COL.top) / 12 + 0.5}
              fill="var(--sun)"
              fillOpacity={0.15 + 0.75 * b.f}
            />
          ))}
          <rect x={COL.x} y={COL.top} width={COL.w} height={COL.bottom - COL.top} fill="none" stroke="var(--border)" />
          <text x={COL.x + COL.w / 2} y={COL.top - 6} fontSize="12" textAnchor="middle" fill="var(--text-muted)">
            higher, lower pressure ↑
          </text>
          <circle cx={COL.x + COL.w / 2} cy={y(parcel.s)} r={13} fill="var(--accent)" stroke="var(--text)" strokeWidth="1.5" />
          <g fontSize="13" fill="var(--text)">
            <text x={COL.x + COL.w + 30} y={60}>
              Parcel: {Math.round(parcelT / 1000).toLocaleString('en-GB')},000 K
            </text>
            <text x={COL.x + COL.w + 30} y={84}>
              Gas around it: {Math.round(aroundT / 1000).toLocaleString('en-GB')},000 K
            </text>
            <text x={COL.x + COL.w + 30} y={112} fontWeight="600" fill={diff >= 0 ? 'var(--accent)' : 'var(--text)'}>
              {Math.abs(diff) < 500
                ? 'Level with the gas around it'
                : diff > 0
                  ? `${Math.round(diff / 1000)},000 K warmer: lighter`
                  : `${Math.round(-diff / 1000)},000 K cooler: heavier`}
            </text>
            <text x={COL.x + COL.w + 30} y={150} fill="var(--text-muted)" fontSize="12">
              {unstable ? 'The star’s gradient is steeper than the adiabat:' : 'The star’s gradient is shallower than the adiabat:'}
            </text>
            <text x={COL.x + COL.w + 30} y={168} fill="var(--text-muted)" fontSize="12">
              {unstable ? 'a rising parcel stays warmer. It convects.' : 'a rising parcel ends up cooler. It is stable.'}
            </text>
          </g>
        </svg>

        <p className={styles.panelTitle} style={{ marginTop: 14 }}>
          Inside the Sun (Model S)
        </p>
        <ProfilePlot
          series={[
            {
              name: 'actual ∇',
              color: 'var(--accent)',
              points: sunPoints.map((s) => ({ x: s.x, y: s.nabla })),
            },
            {
              name: 'adiabatic ∇_ad',
              color: 'var(--series-2)',
              dashed: true,
              points: sunPoints.map((s) => ({ x: s.x, y: s.nablaAd })),
            },
            {
              name: 'radiation needs ∇_rad',
              color: 'var(--text-muted)',
              dashed: true,
              points: sunPoints.filter((s) => s.nablaRad < 1.2).map((s) => ({ x: s.x, y: s.nablaRad })),
            },
          ]}
          zones={[{ from: CONVECTION_BASE, to: 1, label: 'convection zone' }]}
          xLabel="Distance from the centre (fraction of the radius)"
          yLabel="d ln T / d ln P"
          yMin={0}
          yMax={0.8}
          formatValue={(v) => v.toFixed(3)}
          cursor={cursor}
          onCursor={setCursor}
          cursorText={(x) => `${x.toFixed(2)} of the radius`}
          ariaLabel="Model S’s temperature gradient against the adiabatic gradient and the one radiation needs: the actual gradient follows radiation’s out to 0.71 of the radius, then the adiabat"
          height={260}
        >
          {(px, py) => (
            <g>
              <line x1={px(CONVECTION_BASE)} x2={px(CONVECTION_BASE)} y1={py(0)} y2={py(0.8)} stroke="var(--text)" strokeDasharray="3 3" />
              <text x={px(CONVECTION_BASE) - 6} y={py(0.72)} fontSize="12" textAnchor="end" fill="var(--text)">
                0.71 R: they part
              </text>
            </g>
          )}
        </ProfilePlot>
      </div>
      <Caption>
        {`The parcel: ${verdict}. In the Sun at ${cursor.toFixed(2)} of the radius, the gas’s temperature falls as P to the power ${at.nabla.toFixed(3)}; the adiabat is ${at.nablaAd.toFixed(3)}, and radiation alone would need ${at.nablaRad >= 100 ? Math.round(at.nablaRad).toLocaleString('en-GB') : at.nablaRad.toFixed(3)}. ${
          at.x > CONVECTION_BASE
            ? 'Radiation can’t carry the energy here, so the gas convects, and its gradient sits on the adiabat.'
            : 'Radiation can carry the energy here, so the gas stays put.'
        }`}
      </Caption>
    </Figure>
  );
}
