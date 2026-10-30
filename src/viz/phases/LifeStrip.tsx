import type { Phase } from '../../core/stellar/lives';
import { FILL, isRemnant, PHASE_SHORT, stripPosition, type StripScale } from './strip';

/**
 * A star's life as a strip: one block per phase, in order, on a time axis that
 * is either plain (each phase as wide as it lasts) or "time before the end"
 * (logarithmic in the time left before the star becomes a remnant, so the last
 * stages, which take a thousandth of the life, get room). The remnant, which
 * lasts for ever, is a block of its own at the end. A marker shows a moment.
 *
 * Times are in Myr, as the engine gives them.
 */

const W = 640;
const BAR_TOP = 6;
const BAR_H = 34;
const H = 78;
const LEFT = 4;
const RIGHT = W - 4;
/** The remnant's block, a fixed share of the width. */
const REMNANT_W = 92;

export function LifeStrip({ phases, scale, now, ariaLabel, formatTime }: { phases: readonly Phase[]; scale: StripScale; now?: number; ariaLabel: string; formatTime: (myr: number) => string }) {
  if (!phases.length) return null;
  const last = phases[phases.length - 1];
  const remnant = isRemnant(last.kw) ? last : null;
  const living = remnant ? phases.slice(0, -1) : phases;
  const start = living[0]?.start ?? 0;
  const end = remnant ? remnant.start : last.end;
  const lifeRight = remnant ? RIGHT - REMNANT_W : RIGHT;
  const x = (t: number) => LEFT + stripPosition(Math.min(t, end), start, end, scale) * (lifeRight - LEFT);
  const ticks = scale === 'linear' ? linearTicks(start, end) : beforeEndTicks(start, end);
  const nowX = now === undefined ? null : remnant && now >= end ? lifeRight + REMNANT_W / 2 : x(now);
  // Merge neighbouring blocks with the same short name (the two AGB types).
  const blocks: { name: string; kw: number; x0: number; x1: number }[] = [];
  for (const p of living) {
    const name = PHASE_SHORT[p.kw] ?? '';
    const x0 = x(p.start);
    const x1 = x(p.end);
    const prev = blocks[blocks.length - 1];
    if (prev && prev.name === name) prev.x1 = x1;
    else blocks.push({ name, kw: p.kw, x0, x1 });
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block' }} role="img" aria-label={ariaLabel}>
      {blocks.map((b, i) => (
        <g key={i}>
          <rect x={b.x0} y={BAR_TOP} width={Math.max(0.8, b.x1 - b.x0)} height={BAR_H} fill={FILL[b.kw] ?? '#ccc'} stroke="#1b1f2a" strokeWidth={0.6} />
          {b.x1 - b.x0 > b.name.length * 6.4 + 6 && (
            <text x={(b.x0 + b.x1) / 2} y={BAR_TOP + BAR_H / 2 + 4} fontSize="11.5" textAnchor="middle" fill="#14161d">
              {b.name}
            </text>
          )}
        </g>
      ))}
      {remnant && (
        <g>
          <rect x={lifeRight + 6} y={BAR_TOP} width={REMNANT_W - 6} height={BAR_H} fill={FILL[remnant.kw]} stroke="#1b1f2a" strokeWidth={0.6} rx={4} />
          <text x={lifeRight + 3 + REMNANT_W / 2} y={BAR_TOP + BAR_H / 2 + 4} fontSize="11" textAnchor="middle" fill={remnant.kw === 14 ? '#fff' : '#14161d'}>
            {PHASE_SHORT[remnant.kw]} →
          </text>
        </g>
      )}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={BAR_TOP + BAR_H} y2={BAR_TOP + BAR_H + 5} stroke="var(--text-muted)" />
          <text x={x(t)} y={BAR_TOP + BAR_H + 17} fontSize="10.5" textAnchor={x(t) < 40 ? 'start' : 'middle'} fill="var(--text-muted)">
            {scale === 'linear' ? formatTime(t) : `${formatTime(end - t)} left`}
          </text>
        </g>
      ))}
      {nowX !== null && (
        <g>
          <line x1={nowX} x2={nowX} y1={BAR_TOP - 4} y2={BAR_TOP + BAR_H + 4} stroke="var(--text)" strokeWidth={2.5} />
          <path d={`M ${nowX - 5} ${BAR_TOP - 6} L ${nowX + 5} ${BAR_TOP - 6} L ${nowX} ${BAR_TOP} Z`} fill="var(--text)" />
        </g>
      )}
    </svg>
  );
}

function linearTicks(start: number, end: number): number[] {
  const span = end - start;
  const step = 10 ** Math.floor(Math.log10(span / 4));
  const nice = [1, 2, 5, 10].map((k) => k * step).find((s) => span / s <= 6) ?? step * 10;
  const out: number[] = [];
  for (let t = Math.ceil(start / nice) * nice; t < end - nice * 0.3; t += nice) out.push(t);
  return out;
}

function beforeEndTicks(start: number, end: number): number[] {
  const out: number[] = [];
  const span = end - start;
  for (let p = Math.floor(Math.log10(span)); p >= Math.log10(span) - 4; p--) {
    const t = end - 10 ** p;
    if (t > start) out.push(t);
  }
  return out;
}
