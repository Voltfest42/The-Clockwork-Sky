import { useId, useMemo, useState, type ReactNode } from 'react';
import { powerOfTen } from '../core/math/scientific';
import { cnApproach, CN_SPECIES, hydrogenBurning, type StepId } from '../core/nuclear/ppcno';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { burningAt, CATALYST_YEARS, formatHotKelvin, formatPower, formatShare, formatWait, MAKEUPS, NUCLIDES, STEP_ARROWS, type NuclideId } from './furnace';
import { formatGramsPerCc } from './holding';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The pp chains and the CNO cycle (Figure 22.2): a small reaction network
 * burning steadily at a chosen temperature, drawn on a strip of the chart of
 * nuclides (protons up, neutrons across) with each arrow as thick as the flow
 * through it. Each step's waiting time, the pp chains' three branches, the
 * heat each way of burning makes, and the temperature at which the CNO cycle
 * takes over. A second view follows the cycle's catalysts from the Sun's
 * starting carbon and nitrogen into its balance, nearly all nitrogen.
 */

type View = 'reactions' | 'catalysts';
const T_RANGE = [10e6, 30e6] as const;
const START = { T: 15.7e6, makeup: 'newborn', view: 'reactions' as View };

const W = 400;
const H = 378;
const CELL = 40;
const ORIGIN = { x: 30, y: H - 24 };
const cellX = (N: number) => ORIGIN.x + N * CELL + CELL / 2;
const cellY = (Z: number) => ORIGIN.y - (Z - 1) * CELL - CELL / 2;

const CATALYST_COLOURS = ['var(--series-2)', 'var(--text-muted)', 'var(--series-3)', 'var(--accent)', 'var(--text-muted)', 'var(--series-1)'];

export function PpCnoFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [T, setT] = useState(START.T);
  const [makeupId, setMakeupId] = useState(START.makeup);
  const [view, setView] = useState<View>(START.view);
  const [selected, setSelected] = useState<StepId>('pp');
  const [cursor, setCursor] = useState(6);
  const reset = () => {
    setT(START.T);
    setMakeupId(START.makeup);
    setView(START.view);
    setSelected('pp');
    setCursor(6);
  };
  const headId = `arrow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const makeup = MAKEUPS.find((m) => m.id === makeupId)!;
  const h = useMemo(() => hydrogenBurning(burningAt(T, makeup)), [T, makeup]);
  const approach = useMemo(() => cnApproach(burningAt(T, makeup), CATALYST_YEARS, 90), [T, makeup]);
  const total = h.ppPower + h.cnoPower;
  const maxFlow = Math.max(...h.steps.map((s) => s.flow));
  const step = h.steps.find((s) => s.id === selected)!;
  const winner = h.cnoPower > h.ppPower ? 'the CNO cycle' : 'the pp chains';

  const arrowWidth = (flow: number) => {
    const f = Math.log10(flow / maxFlow);
    return Math.max(0.6, 1 + 4.5 * Math.max(0, (f + 8) / 8));
  };

  const atYears = 10 ** cursor;
  const sharesAt = approach.shares[approach.years.reduce((b, y, i) => (Math.abs(Math.log10(Math.max(y, 1)) - cursor) < Math.abs(Math.log10(Math.max(approach.years[b], 1)) - cursor) ? i : b), 1)];

  const caption =
    view === 'reactions'
      ? `At ${formatHotKelvin(T)} and ${formatGramsPerCc(makeup.rho)}, the pp chains make ${formatPower(h.ppPower)} and the CNO cycle ${formatPower(h.cnoPower)}: ${winner} ${h.cnoPower > h.ppPower ? 'wins' : 'win'}, with ${formatShare(Math.max(h.ppPower, h.cnoPower) / total)} of the heat. The pp chains end by ppI ${formatShare(h.branches.ppI)}, ppII ${formatShare(h.branches.ppII)} and ppIII ${formatShare(h.branches.ppIII)}. ${step.label}: a nucleus waits ${formatWait(step.wait)}.`
      : `After ${formatYears(atYears)} at ${formatHotKelvin(T)}, the cycle’s catalysts are ${CN_SPECIES.map((s, i) => `${s} ${formatShare(sharesAt[i])}`)
          .filter((_, i) => i !== 1 && i !== 4)
          .join(', ')}: ${
          sharesAt[3] > 0.9
            ? 'the carbon has piled up as nitrogen-14, the slowest step’s nucleus.'
            : sharesAt[0] > sharesAt[3]
              ? 'most is still the Sun’s starting carbon.'
              : 'the carbon is turning into nitrogen-14, the slowest step’s nucleus.'
        }`;

  return (
    <Figure
      number={number}
      title="The pp chains and the CNO cycle"
      description="Four protons become a helium nucleus in two ways. In the pp chains, two protons fuse into deuterium, which takes a slow weak interaction: a proton at the Sun’s centre waits about six billion years for it, and every later step is quick. The chains end in three branches. In the CNO cycle, carbon, nitrogen and oxygen nuclei catalyse the same change, and its rate climbs far more steeply with temperature: it overtakes the pp chains near 20 million K. Its slowest step, nitrogen-14 catching a proton, piles the catalysts up as nitrogen."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'pp chains', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="3" /> },
        { label: 'CNO cycle', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-1)" strokeWidth="3" /> },
        { label: 'thicker: more reactions per second', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text)" strokeWidth="5" /> },
        { label: 'the step chosen', symbol: <rect x="-8" y="-6" width="16" height="12" rx="2" fill="none" stroke="var(--text)" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          Steady burning at one temperature and density: every short-lived nucleus sits where it is made as fast as it is destroyed (³He takes a
          million years or so to get there at the Sun’s centre, longer further out). Rates from measured S-factors (Solar Fusion III for p + p and
          ¹⁴N + p) through the Gamow peak, with weak screening; only the CN cycle, as oxygen joins it too slowly to matter here. The make-up of
          carbon and nitrogen is the Sun’s.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Show">
          <button type="button" aria-pressed={view === 'reactions'} onClick={() => setView('reactions')}>
            The reactions
          </button>
          <button type="button" aria-pressed={view === 'catalysts'} onClick={() => setView('catalysts')}>
            Catalysts over time
          </button>
        </span>
        <span className={figureStyles.segmented} role="group" aria-label="Make-up">
          {MAKEUPS.map((m) => (
            <button key={m.id} type="button" aria-pressed={makeupId === m.id} onClick={() => setMakeupId(m.id)}>
              {m.name}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        <Slider label="Temperature" value={T} min={T_RANGE[0]} max={T_RANGE[1]} step={0.1e6} format={formatHotKelvin} onChange={setT} />
      </div>

      {view === 'reactions' ? (
        <div className={figureStyles.withSide}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`A strip of the chart of nuclides from hydrogen to oxygen, with the pp chains and the CN cycle as arrows: at ${formatHotKelvin(T)} ${winner} carry most of the flow`}>
            <text x={ORIGIN.x + 4.5 * CELL} y={H - 4} fontSize="12" textAnchor="middle" fill="var(--text-muted)">
              neutrons →
            </text>
            <text transform={`translate(14 ${H / 2}) rotate(-90)`} fontSize="12" textAnchor="middle" fill="var(--text-muted)">
              protons →
            </text>
            {Object.entries(NUCLIDES).map(([key, n]) => (
              <g key={key}>
                <rect x={cellX(n.N) - CELL / 2 + 3} y={cellY(n.Z) - CELL / 2 + 3} width={CELL - 6} height={CELL - 6} rx={5} fill="var(--surface)" stroke="var(--border)" />
                <text x={cellX(n.N)} y={cellY(n.Z) + 5} fontSize="14" textAnchor="middle" fill="var(--text)">
                  {n.label}
                </text>
              </g>
            ))}
            <defs>
              {(['pp', 'cno'] as const).map((c) => (
                <marker key={c} id={`${headId}-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill={c === 'pp' ? 'var(--series-2)' : 'var(--series-1)'} />
                </marker>
              ))}
            </defs>
            {h.steps.map((s) => {
              const [from, to] = STEP_ARROWS[s.id] as [NuclideId, NuclideId];
              const a = NUCLIDES[from];
              const b = NUCLIDES[to];
              const x1 = cellX(a.N);
              const y1 = cellY(a.Z);
              const x2 = cellX(b.N);
              const y2 = cellY(b.Z);
              const len = Math.hypot(x2 - x1, y2 - y1);
              const ux = (x2 - x1) / len;
              const uy = (y2 - y1) / len;
              const pad = CELL * 0.38;
              const colour = s.chain === 'pp' ? 'var(--series-2)' : 'var(--series-1)';
              return (
                <g key={s.id} onClick={() => setSelected(s.id)} style={{ cursor: 'pointer' }}>
                  <line
                    x1={x1 + ux * pad}
                    y1={y1 + uy * pad}
                    x2={x2 - ux * pad}
                    y2={y2 - uy * pad}
                    stroke={colour}
                    strokeWidth={arrowWidth(s.flow)}
                    strokeOpacity={s.flow > 0 ? 0.9 : 0.25}
                    markerEnd={`url(#${headId}-${s.chain})`}
                  />
                  {selected === s.id && (
                    <line x1={x1 + ux * pad} y1={y1 + uy * pad} x2={x2 - ux * pad} y2={y2 - uy * pad} stroke="var(--text)" strokeWidth={arrowWidth(s.flow) + 5} strokeOpacity={0.25} />
                  )}
                </g>
              );
            })}
            <text x={cellX(6.5)} y={cellY(8.6)} fontSize="12" textAnchor="middle" fill="var(--series-1)" fontWeight="600">
              CN cycle
            </text>
            <text x={cellX(2.6)} y={cellY(5.6)} fontSize="12" textAnchor="middle" fill="var(--series-2)" fontWeight="600">
              pp chains
            </text>
          </svg>
          <div className={figureStyles.side}>
            <div>
              <p className={styles.panelTitle}>Heat made</p>
              <svg viewBox="0 0 280 74" width="100%" role="img" aria-label={`The pp chains make ${formatShare(h.ppPower / total)} of the heat and the CNO cycle ${formatShare(h.cnoPower / total)}`}>
                {[
                  { y: 0, label: `pp chains: ${formatPower(h.ppPower)}`, share: h.ppPower / total, color: 'var(--series-2)' },
                  { y: 38, label: `CNO cycle: ${formatPower(h.cnoPower)}`, share: h.cnoPower / total, color: 'var(--series-1)' },
                ].map((b) => (
                  <g key={b.y}>
                    <text x={0} y={b.y + 11} fontSize="12" fill="var(--text)">
                      {b.label} ({formatShare(b.share)})
                    </text>
                    <rect x={0} y={b.y + 16} width={280} height={12} rx={3} fill="var(--border)" fillOpacity={0.5} />
                    <rect x={0} y={b.y + 16} width={Math.max(1, b.share * 280)} height={12} rx={3} fill={b.color} />
                  </g>
                ))}
              </svg>
            </div>
            <dl className={styles.facts}>
              <div>
                <dt>ppI (³He + ³He)</dt>
                <dd>{formatShare(h.branches.ppI)}</dd>
              </div>
              <div>
                <dt>ppII (by ⁷Be + e⁻)</dt>
                <dd>{formatShare(h.branches.ppII)}</dd>
              </div>
              <div>
                <dt>ppIII (by ⁸B)</dt>
                <dd>{formatShare(h.branches.ppIII)}</dd>
              </div>
              <div>
                <dt>Lost to neutrinos</dt>
                <dd>
                  pp {formatShare(h.neutrinoShare.pp)}, CNO {formatShare(h.neutrinoShare.cno)}
                </dd>
              </div>
            </dl>
            <label className={styles.slider}>
              Step
              <select value={selected} onChange={(e) => setSelected(e.target.value as StepId)}>
                {h.steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <p className={figureStyles.note} style={{ margin: 0 }}>
              {step.label}: a nucleus waits <b>{formatWait(step.wait)}</b>; {formatFlow(step.flow)} reactions per kilogram per second.
            </p>
          </div>
        </div>
      ) : (
        <ProfilePlot
          series={CN_SPECIES.map((name, i) => ({ name, color: CATALYST_COLOURS[i], dashed: i === 1 || i === 4, points: approach.years.slice(1).map((y, k) => ({ x: Math.log10(y), y: approach.shares[k + 1][i] })) })).filter(
            (_, i) => i !== 1 && i !== 4,
          )}
          xMin={3}
          xMax={10}
          formatX={(x) => (Number.isInteger(x) ? `${powerOfTen(x)}` : '')}
          xLabel="Years at this temperature (log scale)"
          yLabel="Share of the catalysts"
          yMin={0}
          yMax={1}
          formatValue={(y) => formatShare(y)}
          cursor={cursor}
          onCursor={setCursor}
          cursorText={(x) => formatYears(10 ** x)}
          ariaLabel={`The CN cycle’s catalysts over time at ${formatHotKelvin(T)}: carbon-12 turns into nitrogen-14, which ends with ${formatShare(approach.shares[approach.shares.length - 1][3])} of them`}
          height={300}
        />
      )}
      <Caption>{caption}</Caption>
    </Figure>
  );
}

function formatFlow(n: number): string {
  const e = Math.floor(Math.log10(n));
  return `${(n / 10 ** e).toFixed(1)} × ${powerOfTen(e)}`;
}

function formatYears(y: number): string {
  if (y >= 1e9) return `${Number((y / 1e9).toPrecision(2))} billion years`;
  if (y >= 1e6) return `${Number((y / 1e6).toPrecision(2))} million years`;
  return `${Number(y.toPrecision(2)).toLocaleString('en-GB')} years`;
}
