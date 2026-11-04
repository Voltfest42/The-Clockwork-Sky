import { useMemo, useState, type ReactNode } from 'react';
import { M_SUN, R_SUN } from '../core/constants';
import { analyticTheta, idealGasTemperature, polytrope, polytropeProfile, solveLaneEmden } from '../core/structure/laneEmden';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot, type ProfileSeries } from '../viz/profile/ProfilePlot';
import { ESTIMATE_MU, formatGramsPerCc, formatKelvin, formatPascals, SOLAR, SUN_CENTRE } from './holding';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The Lane–Emden solver (Figure 20.4): choose the index n and watch the
 * solver step out from the centre to the surface; the solution θ(ξ) beside
 * the exact ones for n = 0, 1 and 5; the density, pressure and mass inside,
 * scaled to any mass and radius, beside the Sun's real profile from Model S.
 */

type View = 'theta' | 'density' | 'pressure' | 'mass';
const VIEWS: { id: View; name: string }[] = [
  { id: 'theta', name: 'The solution θ' },
  { id: 'density', name: 'Density' },
  { id: 'pressure', name: 'Pressure' },
  { id: 'mass', name: 'Mass inside' },
];

const START = { n: 3, view: 'theta' as View, mass: 1, radius: 1 };
/** How far out n = 5 is drawn: it never reaches a surface. */
const N5_REACH = 20;

export function LaneEmdenFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [n, setN] = useState(START.n);
  const [view, setView] = useState<View>(START.view);
  const [mass, setMass] = useState(START.mass);
  const [radius, setRadius] = useState(START.radius);
  const [showSteps, setShowSteps] = useState(false);
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState(0.5);
  const reset = () => {
    setN(START.n);
    setView(START.view);
    setMass(START.mass);
    setRadius(START.radius);
    setShowSteps(false);
    setStep(0);
    setCursor(0.5);
  };

  const sol = useMemo(() => solveLaneEmden(n, n === 5 ? { xiMax: N5_REACH } : {}), [n]);
  const surface = sol.reachesSurface;
  const p = surface ? polytrope(sol, mass * M_SUN, radius * R_SUN) : null;
  const profile = p ? polytropeProfile(sol, p, ESTIMATE_MU) : [];
  const steps = sol.steps;
  const shown = showSteps ? Math.min(step, steps.length - 1) : steps.length - 1;
  const exact = analyticTheta(n, 0) !== undefined;
  const reach = surface ? sol.xi1 : N5_REACH;
  const isSun = mass === 1 && radius === 1;
  const physical = view !== 'theta' && surface;

  let series: ProfileSeries[];
  let yScale: 'linear' | 'log' = 'linear';
  let yMin = 0;
  let yMax = 1;
  let yLabel = 'θ';
  let xLabel = 'ξ, distance from the centre in the solution’s own units';
  let xMax = reach;
  if (view === 'theta' || !surface) {
    const cut = steps[shown].xi;
    series = [
      {
        name: `θ, stepped (n = ${n})`,
        color: 'var(--accent)',
        points: Array.from(sol.xi)
          .map((x, k) => ({ x, y: sol.theta[k] }))
          .filter((q) => !showSteps || q.x <= cut),
      },
    ];
    if (exact) {
      series.push({
        name: 'the exact solution',
        color: 'var(--text-muted)',
        dashed: true,
        points: Array.from({ length: 201 }, (_, k) => {
          const x = (reach * k) / 200;
          return { x, y: Math.max(0, analyticTheta(n, x)!) };
        }),
      });
    }
  } else {
    xLabel = 'Distance from the centre (fraction of the radius)';
    xMax = 1;
    const sun = (pick: (s: (typeof SOLAR)[number]) => number) => SOLAR.map((s) => ({ x: s.x, y: pick(s) }));
    if (view === 'density') {
      yScale = 'log';
      yMin = 1e-3;
      yMax = 1e3;
      yLabel = 'Density (g/cm³)';
      series = [
        { name: `polytrope n = ${n}`, color: 'var(--accent)', points: profile.map((q) => ({ x: q.r, y: q.rho / 1000 })) },
        { name: 'the Sun (Model S)', color: 'var(--series-2)', dashed: true, points: sun((s) => s.rho / 1000) },
      ];
    } else if (view === 'pressure') {
      yScale = 'log';
      yMin = 1e8;
      yMax = 1e18;
      yLabel = 'Pressure (Pa)';
      series = [
        { name: `polytrope n = ${n}`, color: 'var(--accent)', points: profile.map((q) => ({ x: q.r, y: q.P })) },
        { name: 'the Sun (Model S)', color: 'var(--series-2)', dashed: true, points: sun((s) => s.P) },
      ];
    } else {
      yLabel = 'Mass inside (fraction)';
      series = [
        { name: `polytrope n = ${n}`, color: 'var(--accent)', points: profile.map((q) => ({ x: q.r, y: q.m })) },
        { name: 'the Sun (Model S)', color: 'var(--series-2)', dashed: true, points: sun((s) => s.m / SOLAR[SOLAR.length - 1].m) },
      ];
    }
  }

  const tC = p ? idealGasTemperature(p.pC, p.rhoC, ESTIMATE_MU) : 0;
  const contrastText = Number(sol.densityContrast.toPrecision(4)).toLocaleString('en-GB');
  const s = steps[shown];
  const caption = !surface
    ? `n = 5 never reaches a surface: θ falls as (1 + ξ²/3)^−½ and never reaches zero. Its mass is finite, but its radius is infinite. Any n below 5 has a surface.`
    : showSteps
      ? `Step ${shown} of ${steps.length - 1}: at ξ = ${s.xi.toPrecision(4)}, θ = ${s.theta.toPrecision(4)}, after a step of ${s.h.toPrecision(2)}. The solver lengthens its steps where θ changes slowly and shortens them where it bends.`
      : `n = ${n}: the surface is at ξ₁ = ${sol.xi1.toPrecision(5)}, reached in ${steps.length - 1} steps. The centre is ${contrastText} times as dense as the average.${
          isSun ? ` With the Sun’s mass and radius its centre would be ${formatGramsPerCc(p!.rhoC)} and ${formatKelvin(tC)}; the real Sun’s is ${formatGramsPerCc(SUN_CENTRE.rho)} and ${formatKelvin(SUN_CENTRE.T)}.` : ''
        }`;

  return (
    <Figure
      number={number}
      title="Lane–Emden solver"
      description="A polytrope, a model star whose pressure follows a power n of its density, solved by stepping out from the centre until the density reaches zero at the surface. Choose n from 0 to 5: the solution beside the exact ones for n = 0, 1 and 5, and the density, pressure and mass inside, scaled to any mass and radius, beside the Sun’s real profile from Model S. n = 3, Eddington’s standard model, gives the Sun a centre of 76 g/cm³ and 12 million degrees, against the real 150 g/cm³ and 15.7 million; n = 5 never reaches a surface."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      simplified={
        <p>
          The solution is exact to the solver’s tolerance (one part in ten billion). Polytropes are idealised stars: their pressure follows
          density by one rule throughout, with no layers of different make-up, no fusion and no separate rules for heat flow. The temperatures
          are for an ideal gas of 0.61 atomic mass units per particle, like the Sun’s outer layers; the Sun’s helium-rich core is heavier per
          particle.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Index n" value={n} min={0} max={5} step={0.05} format={(v) => v.toFixed(2)} onChange={(v) => {
          setN(Math.round(v * 20) / 20);
          setStep(0);
        }} />
      </div>
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Show">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)} disabled={v.id !== 'theta' && !surface}>
              {v.name}
            </button>
          ))}
        </span>
        <button type="button" className={styles.toggle} aria-pressed={showSteps} onClick={() => {
          setShowSteps((x) => !x);
          setView('theta');
          setStep(0);
        }}>
          Show each step
        </button>
      </div>
      {showSteps && (
        <div className={styles.controls}>
          <Slider label="Step" value={shown} min={0} max={steps.length - 1} step={1} format={(k) => `${Math.round(k)} of ${steps.length - 1}`} onChange={(k) => setStep(Math.round(k))} />
        </div>
      )}
      <ProfilePlot
        series={series}
        xLabel={xLabel}
        yLabel={yLabel}
        xMax={xMax}
        yScale={yScale}
        yMin={yMin}
        yMax={yMax}
        formatX={(x) => (xMax > 30 ? String(Math.round(x)) : String(Number(x.toPrecision(2))))}
        cursor={physical ? cursor : undefined}
        onCursor={physical ? setCursor : undefined}
        cursorText={(x) => {
          const q = profile[Math.round(x * (profile.length - 1))];
          return q ? `${x.toFixed(2)} of the radius: ${formatGramsPerCc(q.rho)}, ${formatPascals(q.P)}, ${Math.round(q.m * 100)}% of the mass inside` : `${x.toFixed(2)}`;
        }}
        ariaLabel={physical ? `${yLabel} against distance from the centre for an n = ${n} polytrope and the Sun` : `The Lane–Emden solution θ against ξ for n = ${n}`}
        height={280}
      >
        {(sx, sy) =>
          showSteps && view === 'theta' ? (
            <g>
              {steps.slice(0, shown + 1).map((q, k) => (
                <circle key={k} cx={sx(q.xi)} cy={sy(q.theta)} r={k === shown ? 4.5 : 2.5} fill={k === shown ? 'var(--text)' : 'var(--accent)'} />
              ))}
            </g>
          ) : null
        }
      </ProfilePlot>
      <div className={styles.controls} style={{ marginTop: 10 }}>
        <Slider label="Mass" value={mass} min={0.1} max={50} log format={(m) => `${m.toPrecision(2)} M☉`} onChange={(m) => setMass(Number(m.toPrecision(2)))} disabled={!surface} />
        <Slider label="Radius" value={radius} min={0.1} max={50} log format={(r) => `${r.toPrecision(2)} R☉`} onChange={(r) => setRadius(Number(r.toPrecision(2)))} disabled={!surface} />
      </div>
      {p && (
        <dl className={styles.facts}>
          <div>
            <dt>Surface ξ₁</dt>
            <dd>{sol.xi1.toPrecision(6)}</dd>
          </div>
          <div>
            <dt>Centre ÷ average density</dt>
            <dd>{contrastText}</dd>
          </div>
          <div>
            <dt>Central density</dt>
            <dd>
              {formatGramsPerCc(p.rhoC)}
              {isSun ? ` (the Sun: ${formatGramsPerCc(SUN_CENTRE.rho)})` : ''}
            </dd>
          </div>
          <div>
            <dt>Central pressure</dt>
            <dd>
              {formatPascals(p.pC)}
              {isSun ? ` (the Sun: ${formatPascals(SUN_CENTRE.P)})` : ''}
            </dd>
          </div>
          <div>
            <dt>Central temperature</dt>
            <dd>
              {formatKelvin(tC)}
              {isSun ? ` (the Sun: ${formatKelvin(SUN_CENTRE.T)})` : ''}
            </dd>
          </div>
        </dl>
      )}
      <Caption>{caption}</Caption>
    </Figure>
  );
}
