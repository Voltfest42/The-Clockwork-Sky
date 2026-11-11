import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { EVENT_LABELS } from '../core/stellar/bse/evolve';
import { EVENT_WORDS, TYPE_NAMES } from '../core/stellar/bse/outcome';
import { zooSeed, type ZooCell } from '../core/stellar/bse/runs';
import { Caption, Figure } from '../viz/Figure';
import { useBinary, useZooRow } from '../viz/useStellar';
import { ZOO_KINDS, ZOO_MASSES, ZOO_METALLICITIES, ZOO_PERIODS, ZOO_RATIOS, ZOO_START, zooKind } from './binaries28';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The binary zoo (Figure 28.4): what pairs become, from BSE, over a map of
 * the primary’s mass against the orbital period, for a chosen mass ratio,
 * metallicity and common-envelope efficiency. Each cell is a whole life run
 * in the stellar worker, row by row, and classified: merged, cataclysmic
 * variable, Type Ia candidate, double white dwarf, X-ray binary, pulled
 * apart, or a pair of neutron stars or black holes (capitals if they merge
 * within the universe’s age). Pick a cell for its life story.
 */

const CELL_W = 24;
const CELL_H = 18;
const LEFT = 52;
const TOP = 8;
const BOTTOM = 44;
const W = LEFT + CELL_W * ZOO_PERIODS.length + 8;
const H = TOP + CELL_H * ZOO_MASSES.length + BOTTOM;

const fmtMass = (m: number) => (m < 10 ? m.toFixed(1) : m.toFixed(0));
const fmtPeriod = (p: number) => (p < 10 ? p.toFixed(1) : p.toLocaleString('en-GB', { maximumFractionDigits: 0 }));
const letterOf = (c: ZooCell) => {
  const k = zooKind(c.outcome);
  return c.merges ? k.letter.toUpperCase() : k.letter;
};

/** One row of the map (one primary mass), computed by the worker. Rows go from the lightest at the bottom. */
function ZooRowCells({ i, q, z, alpha, sigma }: { i: number; q: number; z: number; alpha: number; sigma: number }) {
  // Until this row’s answer comes, the newest one it has had (for the last settings), as every figure does
  const fresh = useZooRow({ m1: ZOO_MASSES[i], q, z, periods: ZOO_PERIODS, alpha, sigma });
  const y = TOP + (ZOO_MASSES.length - 1 - i) * CELL_H;
  if (!fresh) return <rect x={LEFT} y={y} width={CELL_W * ZOO_PERIODS.length} height={CELL_H} fill="#1b2438" />;
  return (
    <g>
      {fresh.map((c, j) => {
        const k = zooKind(c.outcome);
        const x = LEFT + j * CELL_W;
        return (
          <g key={j}>
            <rect x={x} y={y} width={CELL_W - 1} height={CELL_H - 1} fill={k.colour} />
            <text x={x + CELL_W / 2 - 0.5} y={y + CELL_H / 2 + 4} textAnchor="middle" fontSize="11" fontWeight={c.merges ? 800 : 500} fill={c.outcome === 'bbh' || c.outcome === 'dwd' || c.outcome === 'nsbh' || c.outcome === 'dns' ? '#0b1020' : '#f8fafc'}>
              {letterOf(c)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function BinaryZooFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [q, setQ] = useState<number>(ZOO_START.q);
  const [z, setZ] = useState<number>(ZOO_START.z);
  const [alpha, setAlpha] = useState<number>(ZOO_START.alpha);
  const [sel, setSel] = useState({ i: 3, j: 10 });
  const sigma = 190;
  const reset = () => {
    setQ(ZOO_START.q);
    setZ(ZOO_START.z);
    setAlpha(ZOO_START.alpha);
    setSel({ i: 3, j: 10 });
  };
  const m1 = ZOO_MASSES[sel.i];
  const period = ZOO_PERIODS[sel.j];
  const run = useBinary({ m1, m2: q * m1, period, ecc: 0, z, alpha, sigma, seed: zooSeed(m1, period) });

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const moves: Record<string, [number, number]> = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setSel((s) => ({ i: Math.min(ZOO_MASSES.length - 1, Math.max(0, s.i + m[0])), j: Math.min(ZOO_PERIODS.length - 1, Math.max(0, s.j + m[1])) }));
  };
  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const y = ((e.clientY - box.top) / box.height) * H;
    const j = Math.floor((x - LEFT) / CELL_W);
    const i = ZOO_MASSES.length - 1 - Math.floor((y - TOP) / CELL_H);
    if (j >= 0 && j < ZOO_PERIODS.length && i >= 0 && i < ZOO_MASSES.length) setSel({ i, j });
  };

  const outcome = run?.outcome;
  const kind = outcome ? zooKind(outcome.outcome) : null;
  const pairWords = `${fmtMass(m1)} + ${fmtMass(q * m1)} M☉ in a ${fmtPeriod(period)}-day orbit`;
  const story = run ? run.events.filter((e) => e.label !== 1 && e.label !== 10 && e.label !== 12 && e.label !== 13) : [];
  const end = outcome ? `${TYPE_NAMES[outcome.kw[0]]}${outcome.kw[1] !== 15 && outcome.kw[0] !== 15 ? ` and ${TYPE_NAMES[outcome.kw[1]]}` : outcome.kw[0] === 15 ? '' : ''}` : '';
  const finalWords = outcome
    ? outcome.kw[0] === 15 && outcome.kw[1] === 15
      ? 'nothing left'
      : outcome.kw[0] === 15
        ? `a ${TYPE_NAMES[outcome.kw[1]]} of ${outcome.m[1].toFixed(2)} M☉`
        : outcome.kw[1] === 15
          ? `a ${TYPE_NAMES[outcome.kw[0]]} of ${outcome.m[0].toFixed(2)} M☉`
          : `a ${end}`
    : '';
  const mergeWords = outcome?.mergeTime !== undefined ? ` Gravitational waves would bring them together in ${formatTime(outcome.mergeTime)}${outcome.merges ? ', within the universe’s age' : ', longer than the universe has existed'}.` : '';
  const caption = run && kind ? `${pairWords}, at Z = ${z} and α = ${alpha}: ${kind.name}. After 13.8 billion years it is ${finalWords}.${mergeWords} ${kind.about}` : `${pairWords}: running BSE…`;

  return (
    <Figure
      number={number}
      title="The binary zoo"
      description="What pairs of stars become, from Hurley’s binary-star code: a map of the heavier star’s mass against the orbital period, each cell a whole life classified. Close pairs of light stars merge; wider ones make cataclysmic variables, white dwarfs that explode as Type Ia supernova candidates, and pairs of white dwarfs; the widest never touch. Heavy pairs make X-ray binaries, are pulled apart by supernova kicks, or end as pairs of black holes. How efficiently the orbit unbinds a shared envelope, among the least-known numbers in astrophysics, moves the boundaries."
      height={1100}
      tryThis={tryThis}
      onReset={reset}
      legend={ZOO_KINDS.map((k) => ({
        label: `${k.letter ? `${k.letter}: ` : 'blank: '}${k.name}`,
        symbol: <rect x="-7" y="-6" width="14" height="12" fill={k.colour} />,
      }))}
      simplified={
        <p>
          Each cell is one BSE run (Hurley, Tout &amp; Pols 2002) from the zero-age main sequence on a circular orbit, followed for 13.8 billion
          years, with binary.in’s switches except the common-envelope efficiency α; supernova kicks are drawn from a Maxwellian of 190 km/s,
          one seeded draw per cell, so a cell’s fate may hang on its kick. The classes are this course’s, from BSE’s events and
          final types, in the order of the legend after the first two; a pair can pass through several. BSE’s recipes for stability, common
          envelopes and kicks are the field’s biggest uncertainties (modern codes such as COSMIC and COMPAS differ), and its formulae are fitted
          only up to 100 M☉. Capital letters for pairs of neutron stars or black holes mean gravitational waves merge them within the
          universe’s age, by Peters’ formula.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Mass ratio">
          {ZOO_RATIOS.map((r) => (
            <button key={r} type="button" aria-pressed={q === r} onClick={() => setQ(r)}>
              companion {r} × primary
            </button>
          ))}
        </span>
        <span className={figureStyles.segmented} role="group" aria-label="Metallicity">
          {ZOO_METALLICITIES.map((m) => (
            <button key={m.z} type="button" aria-pressed={z === m.z} onClick={() => setZ(m.z)}>
              {m.name}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        <Slider
          label="Common-envelope efficiency α (BSE’s paper: 3)"
          value={alpha}
          min={0.1}
          max={5}
          log
          step={0.01}
          format={(v) => String(v)}
          onChange={(v) => setAlpha(Number(v < 1 ? v.toFixed(1) : v.toFixed(1)))}
        />
      </div>
      <p className={styles.panelTitle}>
        The heavier star’s mass against the period, every cell a whole life (rows fill in as the worker runs them)
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', background: 'var(--sky-bg)', borderRadius: 6, cursor: 'pointer' }}
        role="img"
        aria-label={`Map of outcomes. Use the arrow keys to move the cursor. Selected: ${caption}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onClick={onClick}
      >
        {ZOO_MASSES.map((_, i) => (
          <ZooRowCells key={i} i={i} q={q} z={z} alpha={alpha} sigma={sigma} />
        ))}
        <rect x={LEFT + sel.j * CELL_W - 1.5} y={TOP + (ZOO_MASSES.length - 1 - sel.i) * CELL_H - 1.5} width={CELL_W + 2} height={CELL_H + 2} fill="none" stroke="#ffffff" strokeWidth="2.5" />
        {ZOO_MASSES.map((m, i) =>
          i % 2 === 0 ? (
            <text key={m} x={LEFT - 6} y={TOP + (ZOO_MASSES.length - 1 - i) * CELL_H + CELL_H / 2 + 4} textAnchor="end" fontSize="11" fill="#cdd6f4">
              {fmtMass(m)}
            </text>
          ) : null,
        )}
        {[1, 10, 100, 1000, 10000].map((p) => {
          const j = (Math.log10(p) / 4) * (ZOO_PERIODS.length - 1);
          return (
            <text key={p} x={LEFT + j * CELL_W + CELL_W / 2} y={TOP + ZOO_MASSES.length * CELL_H + 14} textAnchor="middle" fontSize="11" fill="#cdd6f4">
              {p.toLocaleString('en-GB')}
            </text>
          );
        })}
        <text x={LEFT + (CELL_W * ZOO_PERIODS.length) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="#e2e8f5">
          Orbital period at birth (days)
        </text>
        <text transform={`translate(13 ${TOP + (CELL_H * ZOO_MASSES.length) / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#e2e8f5">
          Heavier star (M☉)
        </text>
      </svg>
      <div className={styles.card} aria-live="polite">
        <p className={styles.cardTitle}>
          {pairWords}
          {kind ? `: ${kind.name}` : ''}
        </p>
        {run ? (
          <ol style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: '0.9rem' }}>
            {story.map((e, k) => (
              <li key={k}>
                {formatTime(e.t)}: {EVENT_WORDS[EVENT_LABELS[e.label]]}
                {e.label === 2 ? (e.kw[0] === 15 || e.kw[1] === 15 ? ` (the merged star: a ${TYPE_NAMES[e.kw[e.kw[0] === 15 ? 1 : 0]]})` : ` (${TYPE_NAMES[e.kw[0]]} and ${TYPE_NAMES[e.kw[1]]})`) : ''}
              </li>
            ))}
            <li>After 13.8 billion years: {finalWords}.</li>
          </ol>
        ) : (
          <p className={styles.hint}>Running BSE…</p>
        )}
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

function formatTime(myr: number): string {
  if (myr >= 1000) return `${(myr / 1000).toPrecision(3)} billion years`;
  if (myr >= 1) return `${myr.toPrecision(3)} million years`;
  return `${Math.round(myr * 1000).toLocaleString('en-GB')} years`;
}
