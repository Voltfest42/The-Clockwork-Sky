import { useMemo } from 'react';
import { fromPhysics } from '../../core/stars/hr';
import { TYPE_NAMES, type BinaryStep } from '../../core/stellar/bse/outcome';
import type { BinaryRun } from '../../core/stellar/bse/runs';
import { zooKind } from '../../figures/binaries28';
import type { AxisRange } from '../../viz/hr/axes';
import { HRDiagram, type DensityGrid, type HRMarker } from '../../viz/hr/HRDiagram';
import { FILL, PHASE_SHORT } from '../../viz/phases/strip';
import { ScatterChart, type ScatterLine } from '../../viz/ScatterChart';
import { StarDisc } from '../../viz/star/StarDisc';
import { niceTicks } from '../../viz/ticks';
import {
  article,
  formatAge,
  formatPeriod,
  formatSeparation,
  kickWords,
  logStart,
  PAIR_STATE_NAMES,
  pairPhases,
  pairState,
  speedWords,
  transferEpisodes,
  valueAt,
  type Segment,
} from './binary';
import { STAR_STYLES } from './format';
import { CHARTS, INSTANTS, lobeOutline, PAIR_FILL, pairLayout, scaleBar, shortAge, VIEW_H, VIEW_W, type ChartKind } from './pairDrawing';
import styles from './StarForge.module.css';

/**
 * The Star Forge's views of a pair: the two stars to scale with their Roche
 * lobes, both tracks on the HR diagram, quantities against time with the mass
 * transfers shaded, each star's phases and the pair's as strips, the outcome
 * in words, and how much the outcome hangs on the uncertain physics.
 */

const alive = (k: number) => k !== 15;

// —— The pair to scale ——

function Body({ s, k, x, y, r }: { s: BinaryStep; k: 0 | 1; x: number; y: number; r: number }) {
  const title = `Star ${k + 1}: ${TYPE_NAMES[s.kw[k]]}, ${s.m[k].toFixed(2)} M☉`;
  if (s.kw[k] === 14) {
    return (
      <g>
        <circle cx={x} cy={y} r={Math.max(r, 3)} fill="#000" stroke="#f59e0b" strokeWidth={1.5}>
          <title>{title}</title>
        </circle>
      </g>
    );
  }
  if (s.kw[k] === 13) {
    return (
      <circle cx={x} cy={y} r={Math.max(r, 2.5)} fill="#b8c0ff" stroke="#e0e7ff" strokeWidth={1}>
        <title>{title}</title>
      </circle>
    );
  }
  return <StarDisc cx={x} cy={y} r={r} kelvin={Math.min(60000, s.T[k])} title={title} />;
}

/** The two stars from above at one moment, to scale, with their Roche lobes while they orbit. */
export function PairView({ step: s, label }: { step: BinaryStep; label: string }) {
  const layout = pairLayout(s);
  const q = Number((s.m[0] / Math.max(s.m[1], 1e-6)).toPrecision(3));
  const outline = useMemo(() => (layout.lobes ? lobeOutline(q) : []), [q, layout.lobes]);
  const cy = VIEW_H / 2;
  const cx = VIEW_W / 2;
  const across = VIEW_W / layout.px;
  const bar = scaleBar(across);
  const state = pairState(s);
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" style={{ display: 'block', background: 'var(--sky-bg)', borderRadius: 6 }} role="img" aria-label={label}>
      {layout.lobes &&
        outline.map((line, i) => (
          <path
            key={i}
            d={line.map(([x, y], j) => `${j ? 'L' : 'M'}${(cx + x * s.sep * layout.px).toFixed(1)} ${(cy - y * s.sep * layout.px).toFixed(1)}`).join('')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.4"
          />
        ))}
      {layout.stars.map(({ k, x, r }) => (
        <g key={k}>
          <Body s={s} k={k} x={x} y={cy} r={r} />
          <text x={x} y={cy - Math.max(r, 4) - 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#e2e8f5">
            {k + 1}
          </text>
        </g>
      ))}
      {state === 'unbound' && (
        <g stroke="#9aa8c4" strokeWidth="1.5" fill="none">
          <path d={`M ${120} ${cy} L ${VIEW_W / 2 - 20} ${cy}`} strokeDasharray="4 4" />
          <path d={`M ${VIEW_W - 120} ${cy} L ${VIEW_W / 2 + 20} ${cy}`} strokeDasharray="4 4" />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="#9aa8c4" stroke="none">
            flying apart
          </text>
        </g>
      )}
      {state === 'gone' && (
        <text x={cx} y={cy} textAnchor="middle" fontSize="13" fill="#9aa8c4">
          Nothing is left.
        </text>
      )}
      {state !== 'gone' && (
        <g>
          <line x1={10} x2={10 + bar * layout.px} y1={VIEW_H - 12} y2={VIEW_H - 12} stroke="#9aa8c4" strokeWidth="1.5" />
          <text x={10} y={VIEW_H - 18} fontSize="11" fill="#9aa8c4">
            {formatSeparation(bar)}
            {state === 'unbound' ? ' (each star to its own scale; the gap isn’t)' : ''}
          </text>
        </g>
      )}
    </svg>
  );
}

// —— The HR diagram ——

/** Both stars' tracks while they burn, the past drawn bolder, and each star now. */
export function PairHR({ run, step, t, density, range }: { run: BinaryRun; step: BinaryStep; t: number; density?: DensityGrid; range: AxisRange }) {
  const markers: HRMarker[] = [];
  for (const k of [0, 1] as const) {
    if (step.kw[k] > 9) continue;
    markers.push({ id: `s${k}`, label: `${k + 1}`, point: fromPhysics(step.T[k], step.L[k]), highlight: true, side: k === 0 ? 'right' : 'left' });
  }
  const words = ([0, 1] as const)
    .map((k) => (step.kw[k] > 9 ? `star ${k + 1} is ${step.kw[k] === 15 ? 'gone' : `${article(TYPE_NAMES[step.kw[k]])}, off the diagram`}` : `star ${k + 1} is at ${Math.round(step.T[k]).toLocaleString('en-GB')} K and ${Number(step.L[k].toPrecision(2)).toLocaleString('en-GB')} Suns`))
    .join('; ');
  return (
    <HRDiagram axes="physicist" range={range} density={density} radiusLines markers={markers} ariaLabel={`Both stars’ tracks on the HR diagram over Gaia’s stars within 100 parsecs: ${words}.`}>
      {(place) => (
        <g>
          {([0, 1] as const).map((k) => {
            const style = STAR_STYLES[k];
            const path = (steps: readonly BinaryStep[]) => {
              let d = '';
              let last: [number, number] | null = null;
              let prev: BinaryStep | null = null;
              for (const x of steps) {
                if (x.kw[k] > 9) {
                  prev = null;
                  continue;
                }
                const p = place(fromPhysics(x.T[k], x.L[k]));
                if (last && prev && Math.abs(p[0] - last[0]) < 0.6 && Math.abs(p[1] - last[1]) < 0.6) continue;
                d += `${prev ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
                last = p;
                prev = x;
              }
              return d;
            };
            const past = run.steps.filter((x) => x.t <= t);
            return (
              <g key={k}>
                <path d={path(run.steps)} stroke={style.hr} strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray={style.dash} fill="none" />
                <path d={path(past)} stroke="#070b16" strokeWidth={4.2} strokeOpacity={0.6} fill="none" />
                <path d={path(past)} stroke={style.hr} strokeWidth={2.2} strokeDasharray={style.dash} fill="none" />
              </g>
            );
          })}
        </g>
      )}
    </HRDiagram>
  );
}

// —— Charts against time ——

const bound = (s: BinaryStep) => alive(s.kw[0]) && alive(s.kw[1]) && s.sep > 0 && s.ecc >= 0 && s.ecc < 1;

/** One quantity against time, both stars' where it has two, with the mass transfers shaded and the moment marked. */
export function PairChart({ run, kind, t, tEnd, log, onPick }: { run: BinaryRun; kind: ChartKind; t: number; tEnd: number; log: boolean; onPick: (t: number) => void }) {
  const steps = run.steps;
  const xMin = log ? logStart(tEnd) : 0;
  const lines: ScatterLine[] = [];
  const of = (get: (s: BinaryStep) => number) => (x: number) => (x > tEnd ? NaN : valueAt(steps, x, get));
  let yLabel: string;
  let yScale: 'log' | 'linear' = 'log';
  let values: number[] = [];
  const collect = (get: (s: BinaryStep) => number) => {
    for (const s of steps) {
      if (s.t > tEnd) break;
      const v = get(s);
      if (Number.isFinite(v) && v > 0) values.push(v);
    }
  };
  if (kind === 'masses') {
    yLabel = 'Mass (M☉)';
    for (const k of [0, 1] as const) {
      const get = (s: BinaryStep) => (alive(s.kw[k]) ? s.m[k] : NaN);
      lines.push({ name: `star ${k + 1}`, color: STAR_STYLES[k].chart, dash: STAR_STYLES[k].dash, f: of(get) });
      collect(get);
    }
  } else if (kind === 'radii') {
    yLabel = 'Radius (R☉)';
    for (const k of [0, 1] as const) {
      const get = (s: BinaryStep) => (alive(s.kw[k]) ? s.R[k] : NaN);
      const lobe = (s: BinaryStep) => (bound(s) && s.rrl[k] > 0 ? s.R[k] / s.rrl[k] : NaN);
      lines.push({ name: `star ${k + 1}`, color: STAR_STYLES[k].chart, dash: STAR_STYLES[k].dash, f: of(get) });
      lines.push({ name: `star ${k + 1}’s Roche lobe`, color: STAR_STYLES[k].chart, dash: '1 3', f: of(lobe) });
      collect(get);
      collect(lobe);
    }
    // Compact remnants shrink to kilometres; the chart stops at a ten-thousandth of the Sun's radius
    values = values.filter((v) => v > 1e-4);
  } else if (kind === 'period') {
    yLabel = 'Orbital period (days)';
    const get = (s: BinaryStep) => (bound(s) ? s.period : NaN);
    lines.push({ name: 'period', color: 'var(--accent)', f: of(get) });
    collect(get);
  } else if (kind === 'separation') {
    yLabel = 'Separation (R☉)';
    const get = (s: BinaryStep) => (bound(s) ? s.sep : NaN);
    lines.push({ name: 'separation', color: 'var(--accent)', f: of(get) });
    collect(get);
  } else {
    yLabel = 'Eccentricity';
    yScale = 'linear';
    const get = (s: BinaryStep) => (bound(s) ? s.ecc : NaN);
    lines.push({ name: 'eccentricity', color: 'var(--accent)', f: of(get) });
  }
  let yMin = 0;
  let yMax = 1;
  if (yScale === 'log') {
    const lo = values.length ? Math.min(...values) : 0.1;
    const hi = values.length ? Math.max(...values) : 10;
    yMin = 10 ** Math.floor(Math.log10(lo) - 0.05);
    yMax = 10 ** Math.ceil(Math.log10(hi) + 0.05);
    if (yMax / yMin < 100) yMax = yMin * 100;
  }
  const episodes = transferEpisodes(run, tEnd);
  const name = CHARTS.find((c) => c.id === kind)!.name.toLowerCase();
  return (
    <ScatterChart
      groups={[]}
      lines={lines}
      xScale={log ? 'log' : 'linear'}
      yScale={yScale}
      xMin={xMin}
      xMax={tEnd}
      yMin={yMin}
      yMax={yMax}
      xLabel={log ? 'Time since birth (log scale)' : 'Time since birth'}
      yLabel={yLabel}
      formatX={shortAge}
      onPick={onPick}
      height={320}
      ariaLabel={`The pair’s ${name} against time${episodes.length ? `, with ${episodes.length} episode${episodes.length > 1 ? 's' : ''} of mass transfer shaded` : ''}; now ${formatAge(t)}.`}
    >
      {(sx) => (
        <g>
          {episodes.map(([a, b], i) => {
            const x0 = sx(Math.max(a, xMin));
            const x1 = sx(Math.min(b, tEnd));
            return x1 > x0 - 1 ? <rect key={i} x={x0} y={14} width={Math.max(1.5, x1 - x0)} height={264} fill="var(--accent)" fillOpacity={0.14} /> : null;
          })}
          {t >= xMin && <line x1={sx(t)} x2={sx(t)} y1={14} y2={278} stroke="var(--text)" strokeWidth={1.5} />}
        </g>
      )}
    </ScatterChart>
  );
}

// —— Strips ——

const STRIP_W = 640;
const STRIP_LEFT = 62;
const ROW_H = 26;
const ROW_GAP = 6;

const segmentName = (s: Segment) => (typeof s.kind === 'string' ? PAIR_STATE_NAMES[s.kind] : (PHASE_SHORT[s.kind] ?? (s.kind === 0 ? 'Main sequence' : '')));
const segmentFill = (s: Segment) => (typeof s.kind === 'string' ? PAIR_FILL[s.kind] : (FILL[s.kind === 0 ? 1 : s.kind] ?? '#ccc'));

/** Star 1's phases, star 2's and the pair's, on one time axis, with the common envelopes and supernovae ticked and the moment marked; click to go there. */
export function PairStrips({ run, t, tEnd, log, onPick }: { run: BinaryRun; t: number; tEnd: number; log: boolean; onPick: (t: number) => void }) {
  const phases = pairPhases(run, tEnd);
  const xMin = log ? logStart(tEnd) : 0;
  const right = STRIP_W - 6;
  const x = (v: number) => {
    const c = Math.min(tEnd, Math.max(xMin, v));
    const f = log ? (Math.log10(c) - Math.log10(xMin)) / (Math.log10(tEnd) - Math.log10(xMin)) : (c - xMin) / (tEnd - xMin);
    return STRIP_LEFT + f * (right - STRIP_LEFT);
  };
  // Neighbouring phases with the same short name (BSE's two kinds of AGB star) are one block
  const merged = (segments: Segment[]) =>
    segments.reduce<Segment[]>((out, seg) => {
      const last = out[out.length - 1];
      if (last && segmentName(last) === segmentName(seg)) last.end = seg.end;
      else out.push({ ...seg });
      return out;
    }, []);
  const rows: { name: string; segments: Segment[] }[] = [
    { name: 'Star 1', segments: merged(phases.stars[0]) },
    { name: 'Star 2', segments: merged(phases.stars[1]) },
    { name: 'The pair', segments: phases.pair },
  ];
  const H = rows.length * (ROW_H + ROW_GAP) + 28;
  const ticks = log ? logTicks(xMin, tEnd) : niceTicks(0, tEnd).filter((v) => v <= tEnd);
  const instants = run.events.filter((e) => INSTANTS.some((m) => m.label === e.label) && e.t <= tEnd);
  const pick = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * STRIP_W;
    if (px < STRIP_LEFT) return;
    const f = (px - STRIP_LEFT) / (right - STRIP_LEFT);
    onPick(log ? 10 ** (Math.log10(xMin) + f * (Math.log10(tEnd) - Math.log10(xMin))) : xMin + f * (tEnd - xMin));
  };
  const words = rows.map((r) => `${r.name}: ${r.segments.map((s) => `${segmentName(s)} from ${formatAge(s.start)}`).join(', ')}`).join('. ');
  return (
    <svg viewBox={`0 0 ${STRIP_W} ${H}`} width="100%" style={{ display: 'block', maxWidth: STRIP_W, cursor: 'pointer' }} role="img" aria-label={`Each star’s phases and the pair’s, against time. ${words}.`} onClick={pick}>
      {rows.map((row, i) => {
        const y = i * (ROW_H + ROW_GAP) + 4;
        return (
          <g key={row.name}>
            <text x={0} y={y + ROW_H / 2 + 4} fontSize="11.5" fill="var(--text)" fontWeight={600}>
              {row.name}
            </text>
            {row.segments.map((s, j) => {
              const x0 = x(s.start);
              const x1 = x(s.end);
              const label = segmentName(s);
              return (
                <g key={j}>
                  <rect x={x0} y={y} width={Math.max(0.8, x1 - x0)} height={ROW_H} fill={segmentFill(s)} stroke="#1b1f2a" strokeWidth={0.5}>
                    <title>{`${row.name}: ${label}, ${formatAge(s.start)} to ${formatAge(s.end)}`}</title>
                  </rect>
                  {x1 - x0 > label.length * 6 + 6 && (
                    <text x={(x0 + x1) / 2} y={y + ROW_H / 2 + 4} fontSize="10.5" textAnchor="middle" fill={typeof s.kind === 'number' && s.kind === 14 ? '#fff' : '#14161d'} pointerEvents="none">
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
      {instants.map((e, i) => (
        <line key={i} x1={x(e.t)} x2={x(e.t)} y1={2} y2={3 * (ROW_H + ROW_GAP)} stroke="#b91c1c" strokeWidth={2} strokeDasharray={INSTANTS.find((m) => m.label === e.label)!.dash} pointerEvents="none" />
      ))}
      {run.supernovae
        .filter((k) => k.t <= tEnd)
        .map((k, i) => {
          const y = k.star * (ROW_H + ROW_GAP) + 4;
          return (
            <g key={`sn${i}`} pointerEvents="none">
              <path d={`M ${x(k.t)} ${y - 1} l 4 6 l -4 6 l -4 -6 Z`} fill="#b91c1c" />
              <title>{`Star ${k.star + 1}’s supernova at ${formatAge(k.t)}`}</title>
            </g>
          );
        })}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={H - 24} y2={H - 19} stroke="var(--text-muted)" />
          <text x={x(v)} y={H - 7} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
            {shortAge(v)}
          </text>
        </g>
      ))}
      <line x1={x(t)} x2={x(t)} y1={0} y2={H - 22} stroke="var(--text)" strokeWidth={2.2} pointerEvents="none" />
    </svg>
  );
}

function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let p = Math.ceil(Math.log10(lo) - 1e-9); p <= Math.floor(Math.log10(hi) + 1e-9); p++) out.push(10 ** p);
  return out;
}

// —— The outcome ——

/** What the pair became, in words: its class in the zoo, what is left, the gravitational-wave merger and the kicks. */
export function OutcomeCard({ run, pending }: { run: BinaryRun | null; pending: boolean }) {
  if (!run) {
    return (
      <div className={styles.box} aria-busy="true">
        <h3>How it ends</h3>
        <p>Running BSE…</p>
      </div>
    );
  }
  const o = run.outcome;
  const kind = zooKind(o.outcome);
  const end = run.steps[run.steps.length - 1];
  const left = ([0, 1] as const).filter((k) => alive(end.kw[k]));
  const remains =
    left.length === 0
      ? 'nothing at all'
      : left.length === 1
        ? `${article(TYPE_NAMES[end.kw[left[0]]])} of ${end.m[left[0]].toFixed(2)} M☉, alone`
        : `${article(TYPE_NAMES[end.kw[0]])} of ${end.m[0].toFixed(2)} M☉ and ${article(TYPE_NAMES[end.kw[1]])} of ${end.m[1].toFixed(2)} M☉${bound(end) ? `, ${formatPeriod(end.period)} apart` : ', no longer bound'}`;
  const compact = o.mergeTime !== undefined && o.formed !== undefined;
  // BSE follows gravitational waves only inside 10 R☉: a wider pair that Peters' formula merges is still in orbit at the run's end
  const mergedSince = compact && o.merges && left.length === 2;
  const speed = speedWords(run.supernovae);
  const pairNames = o.outcome === 'bbh' ? 'black holes' : o.outcome === 'dns' ? 'neutron stars' : 'neutron star and black hole';
  return (
    <div className={styles.box} aria-live="polite" aria-busy={pending}>
      <h3>How it ends: {kind.name}</h3>
      <p>{kind.about}</p>
      {mergedSince ? (
        <p>
          After {formatAge(end.t)}: <b>the {pairNames} have merged</b>. (BSE follows gravitational waves only inside 10 solar radii, so its own run
          leaves them in orbit, {formatPeriod(end.period)} apart.)
        </p>
      ) : (
        <p>
          After {formatAge(end.t)}: <b>{remains}</b>.
        </p>
      )}
      {compact && (
        <p>
          The {pairNames} formed at {formatAge(o.formed!)}; gravitational waves bring them together <b>{formatAge(o.mergeTime!)}</b> later
          {o.merges ? ', within the universe’s age.' : ', longer than the universe has existed.'}
        </p>
      )}
      {run.supernovae.map((k, i) => (
        <p key={i}>{kickWords(k, i === 0)}</p>
      ))}
      {speed && <p>{speed}</p>}
      {run.warnings.length > 0 && <p className={styles.note}>BSE warned: {run.warnings.join('; ')}</p>}
      {pending && <p className={styles.note}>Working out the new pair…</p>}
    </div>
  );
}

// —— Sensitivity ——

/** One outcome as a chip: its letter and name, coloured as on Figure 28.4's map. */
export function OutcomeChip({ run, label, current }: { run: BinaryRun | null; label: string; current: boolean }) {
  const kind = run ? zooKind(run.outcome.outcome) : null;
  const letter = kind ? (run!.outcome.merges ? kind.letter.toUpperCase() : kind.letter) : '';
  return (
    <li className={styles.chipOutcome} aria-current={current ? 'true' : undefined}>
      <span className={styles.chipSwatch} style={{ background: kind?.colour ?? 'transparent' }} aria-hidden="true">
        {letter}
      </span>
      <span>
        <b>{label}</b>
        <br />
        {kind ? kind.name : 'running…'}
        {run && run.outcome.merges ? ', merging' : ''}
      </span>
    </li>
  );
}
