import { useMemo, useState, type ReactNode } from 'react';
import { danbyStart, eccentricAnomaly, type KeplerStep } from '../core/ephemeris/kepler';
import { DEG } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { onSky } from './sky/legend';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * How a computer solves Kepler's equation, M = E − e sin E: guess E, see how
 * far E − e sin E is from M, and improve the guess with Newton's method (slide
 * down the tangent to where it crosses zero). Left: each guess as a point on
 * the circle round the orbit and the planet's place it implies. Right: the
 * equation's curve with Newton's tangents. Below: the guesses and how far off
 * each is.
 */

const STARTS = {
  danby: { label: 'Danby’s guess', start: (M: number, e: number) => danbyStart(M, e) },
  mean: { label: 'E = M', start: (M: number) => M },
  far: { label: 'A poor guess', start: (M: number, e: number) => M - e },
} as const;
type Start = keyof typeof STARTS;

const W = 300;
const H = 260;
const R = 105;
const CX = W / 2;
const CY = H / 2;
const GW = 320;
const GH = 260;

/** A miss in readable units: degrees, arcseconds, or "below 10⁻¹²". */
function formatMiss(radians: number): string {
  const d = Math.abs(radians) / DEG;
  if (d >= 0.1) return `${d.toFixed(2)}°`;
  const s = d * 3600;
  if (s >= 0.01) return `${s.toFixed(2)}″`;
  if (Math.abs(radians) < 1e-12) return 'under 10⁻¹² rad (done)';
  return `${Math.abs(radians).toExponential(1).replace('e-', ' × 10⁻').replace(/(\d+)$/, (m) => m.split('').map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join(''))} rad`;
}

export function KeplerSolverFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [Mdeg, setMdeg] = useState(30);
  const [e, setE] = useState(0.5);
  const [start, setStart] = useState<Start>('mean');
  const [shown, setShown] = useState(1);
  const M = Mdeg * DEG;

  const steps = useMemo(() => {
    const out: KeplerStep[] = [];
    eccentricAnomaly(M, e, { start: STARTS[start].start(M, e), emit: (s) => out.push(s) });
    return out;
  }, [M, e, start]);
  const visible = steps.slice(0, Math.min(shown, steps.length));
  const last = visible[visible.length - 1];

  const reset = () => {
    setMdeg(30);
    setE(0.5);
    setStart('mean');
    setShown(1);
  };
  const change = (f: () => void) => {
    f();
    setShown(1);
  };

  // Left: the orbit (Sun at the right focus) and its circle; each guess E is an angle at the centre.
  const b = R * Math.sqrt(1 - e * e);
  const sun = { x: CX + R * e, y: CY };
  const onCircle = (E: number) => ({ x: CX + R * Math.cos(E), y: CY - R * Math.sin(E) });
  const onOrbit = (E: number) => ({ x: CX + R * Math.cos(E), y: CY - b * Math.sin(E) });

  // Right: f(E) = E − e sin E − M over a window round the answer.
  const answer = steps[steps.length - 1].E;
  const span = Math.max(0.6, e + 0.4);
  const lo = Math.min(answer - span, ...visible.map((s) => s.E - 0.1));
  const hi = Math.max(answer + span, ...visible.map((s) => s.E + 0.1));
  const f = (E: number) => E - e * Math.sin(E) - M;
  const fLo = Math.min(f(lo), f(hi), -0.2);
  const fHi = Math.max(f(lo), f(hi), 0.2);
  const gx = (E: number) => 40 + ((E - lo) / (hi - lo)) * (GW - 56);
  const gy = (v: number) => GH - 30 - ((v - fLo) / (fHi - fLo)) * (GH - 46);
  const curve = Array.from({ length: 121 }, (_, i) => {
    const E = lo + ((hi - lo) * i) / 120;
    return `${gx(E).toFixed(1)},${gy(f(E)).toFixed(1)}`;
  }).join(' ');

  const done = Math.abs(last.residual) < 1e-12;

  return (
    <Figure
      number={number}
      title="Solving Kepler’s equation"
      description="Newton’s method on Kepler’s equation, step by step. On the left, each guess for the eccentric anomaly is a point on the circle round the orbit, and the planet’s place it implies on the ellipse. On the right, the curve E − e sin E − M, which must be made zero, with the tangent lines Newton’s method slides down. A table shows each guess and how far off it is: within three or four steps the answer is exact to the last digit."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a guess, numbered, on the circle round the orbit', symbol: onSky(<g><circle r="4" fill="#f4a7b9" /></g>) },
        { label: 'where that guess puts the planet on the ellipse', symbol: onSky(<circle r="4" fill="#62d6c4" />) },
        { label: 'the tangent Newton’s method follows to the next guess', symbol: onSky(<path d="M-10 6 L10 -6" stroke="#ffe08a" strokeWidth="1.5" strokeDasharray="3 2" />) },
      ]}
    >
      <div className={figureStyles.toolbar}>
        <button type="button" className={figureStyles.toolButton} onClick={() => setShown((s) => Math.min(steps.length, s + 1))} disabled={shown >= steps.length}>
          Next guess →
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={() => setShown((s) => Math.max(1, s - 1))} disabled={shown <= 1}>
          ← Back
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={() => setShown(steps.length)}>
          All the way
        </button>
        <span className={figureStyles.segmented} role="group" aria-label="Starting guess">
          {(Object.keys(STARTS) as Start[]).map((k) => (
            <button key={k} type="button" aria-pressed={start === k} onClick={() => change(() => setStart(k))}>
              {STARTS[k].label}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.split}>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={`The orbit and its circle, with ${visible.length} guesses for where the planet is.`}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#3b4c72" strokeDasharray="3 4" />
          <ellipse cx={CX} cy={CY} rx={R} ry={b} fill="none" stroke="#c8d2e8" strokeWidth="1.3" />
          <line x1={CX} y1={CY} x2={onCircle(M).x} y2={onCircle(M).y} stroke="#7d8db0" strokeDasharray="2 3" />
          <text x={CX + 0.72 * R * Math.cos(M) + 4} y={CY - 0.72 * R * Math.sin(M) + 12} fontSize="10" fill="var(--sky-muted)">
            M
          </text>
          {visible.map((s) => {
            const c = onCircle(s.E);
            const o = onOrbit(s.E);
            const isLast = s === last;
            return (
              <g key={s.iteration} opacity={isLast ? 1 : 0.55}>
                <line x1={CX} y1={CY} x2={c.x} y2={c.y} stroke="#f4a7b9" strokeWidth={isLast ? 1.5 : 1} />
                <line x1={c.x} y1={c.y} x2={o.x} y2={o.y} stroke="#f4a7b9" strokeDasharray="2 2" />
                <circle cx={c.x} cy={c.y} r="4" fill="#f4a7b9" />
                <circle cx={o.x} cy={o.y} r={isLast ? 5 : 3.5} fill="#62d6c4" />
                <text x={c.x + (c.x >= CX ? 7 : -7)} y={c.y - 5} fontSize="11" fontWeight="700" textAnchor={c.x >= CX ? 'start' : 'end'} fill="#f4a7b9">
                  {s.iteration}
                </text>
              </g>
            );
          })}
          <line x1={sun.x} y1={sun.y} x2={onOrbit(last.E).x} y2={onOrbit(last.E).y} stroke="#ffffff" strokeOpacity="0.6" />
          <circle cx={sun.x} cy={sun.y} r="7" fill="var(--sun)" />
          <circle cx={CX} cy={CY} r="2" fill="#c8d2e8" />
        </svg>
        <svg viewBox={`0 0 ${GW} ${GH}`} className={seasonStyles.svg} role="img" aria-label={`The curve E − e sin E − M, which crosses zero at the answer, with Newton’s tangents for ${visible.length - 1} steps.`}>
          <line x1={40} x2={GW - 16} y1={gy(0)} y2={gy(0)} stroke="#7d8db0" />
          <text x={GW - 18} y={gy(0) - 5} fontSize="10" textAnchor="end" fill="var(--sky-muted)">
            zero: the answer
          </text>
          <polyline points={curve} fill="none" stroke="#c8d2e8" strokeWidth="1.8" />
          {visible.slice(0, -1).map((s, i) => {
            const next = visible[i + 1];
            return (
              <g key={s.iteration}>
                <line x1={gx(s.E)} y1={gy(0)} x2={gx(s.E)} y2={gy(s.residual)} stroke="#f4a7b9" strokeDasharray="2 2" />
                <line x1={gx(s.E)} y1={gy(s.residual)} x2={gx(next.E)} y2={gy(0)} stroke="#ffe08a" strokeWidth="1.5" strokeDasharray={next.bisected ? '1 3' : '4 2'} />
              </g>
            );
          })}
          {visible.map((s) => (
            <g key={s.iteration}>
              <circle cx={gx(s.E)} cy={gy(s.residual)} r="3.5" fill="#f4a7b9" />
              <text x={gx(s.E)} y={gy(0) + 14} fontSize="10" textAnchor="middle" fill="#f4a7b9">
                {s.iteration}
              </text>
            </g>
          ))}
          <text x={8} y={18} fontSize="11" fill="var(--sky-muted)">
            E − e sin E − M
          </text>
        </svg>
      </div>
      <label className={styles.slider} style={{ marginTop: 10 }}>
        Time (M)
        <input type="range" min={0} max={359} step={1} value={Mdeg} onChange={(ev) => change(() => setMdeg(Number(ev.target.value)))} aria-label="Mean anomaly, the time since perihelion as an angle" aria-valuetext={`${Mdeg}°`} />
        <output>{Mdeg}°</output>
      </label>
      <label className={styles.slider}>
        Eccentricity
        <input type="range" min={0} max={0.99} step={0.01} value={e} onChange={(ev) => change(() => setE(Number(ev.target.value)))} aria-valuetext={e.toFixed(2)} />
        <output>{e.toFixed(2)}</output>
      </label>
      <table className={seasonStyles.table}>
        <caption>The guesses</caption>
        <thead>
          <tr>
            <th scope="col">Guess</th>
            <th scope="col">E</th>
            <th scope="col">Off by</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.iteration}>
              <th scope="row">{s.iteration === 0 ? 'start' : `${s.iteration}${s.bisected ? ' (halved)' : ''}`}</th>
              <td style={{ fontVariantNumeric: 'tabular-nums' }}>{(s.E / DEG).toFixed(8)}°</td>
              <td>{formatMiss(s.residual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Caption>
        {done
          ? `Done in ${last.iteration} step${last.iteration === 1 ? '' : 's'}: E = ${(last.E / DEG).toFixed(6)}°, and the equation balances to the last digit a computer keeps. Each Newton step roughly doubles the number of correct digits.`
          : shown === 1
            ? `Starting guess: E = ${(last.E / DEG).toFixed(2)}°, off by ${formatMiss(last.residual)}. Press “Next guess”: Newton’s method follows the curve’s slope down to zero.${
                start === 'danby' && Math.abs(Mdeg - 180) < 40
                  ? ' Near aphelion Danby’s guess is at its worst: the answer is close to M there, but his nudge is always 0.85 e, and at 180° it jumps from ahead of M to behind it.'
                  : ''
              }`
            : `After ${last.iteration} step${last.iteration === 1 ? '' : 's'} the guess is off by ${formatMiss(last.residual)}.`}
      </Caption>
    </Figure>
  );
}
