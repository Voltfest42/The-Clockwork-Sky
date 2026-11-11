import { useMemo, useState, type ReactNode } from 'react';
import { rocheLobe, transferTrack, type TransferPoint } from '../core/binaries/roche';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { TRANSFER_START } from './binaries28';
import { Slider } from './Slider';
import styles from './sky/sky.module.css';

/**
 * The orbit as mass changes hands (Figure 28.2): a donor gives mass to its
 * companion. If nothing leaves the pair, its angular momentum J = M₁M₂√(Ga/M)
 * is fixed, so the separation goes as (M₁M₂)⁻²: it shrinks while the donor is
 * the heavier star, is smallest when the masses are equal, and widens after.
 * If the companion keeps only part of what it is given, the rest carries off
 * angular momentum and the orbit widens less. The pair is drawn to scale with
 * both Roche lobes.
 */

const fmt = (x: number, d = 2) => x.toFixed(d);

/** The track’s value at donor/companion ratio q, by interpolation in log q (NaN outside it). */
function along(track: TransferPoint[], q: number, key: 'a' | 'p' | 'rl1' | 'rl2'): number {
  const lq = Math.log(q);
  for (let i = 1; i < track.length; i++) {
    const a = Math.log(track[i - 1].m1 / track[i - 1].m2);
    const b = Math.log(track[i].m1 / track[i].m2);
    if ((lq <= a && lq >= b) || (lq >= a && lq <= b)) {
      const t = a === b ? 0 : (lq - a) / (b - a);
      return track[i - 1][key] + t * (track[i][key] - track[i - 1][key]);
    }
  }
  return NaN;
}

export function TransferOrbitFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [m1, setM1] = useState<number>(TRANSFER_START.m1);
  const [m2, setM2] = useState<number>(TRANSFER_START.m2);
  const [beta, setBeta] = useState<number>(TRANSFER_START.beta);
  const [given, setGiven] = useState(0.5);
  const reset = () => {
    setM1(TRANSFER_START.m1);
    setM2(TRANSFER_START.m2);
    setBeta(TRANSFER_START.beta);
    setGiven(0.5);
  };
  // The donor is stripped to a fifth of its mass (the core it would keep is about that)
  const down = m1 * 0.2;
  const conservative = useMemo(() => transferTrack(m1, m2, 1, down), [m1, m2, down]);
  const chosen = useMemo(() => transferTrack(m1, m2, beta, down), [m1, m2, beta, down]);
  const now = chosen[Math.round(given * (chosen.length - 1))];
  const qNow = now.m1 / now.m2;
  const qStart = m1 / m2;
  const qEnd = chosen[chosen.length - 1].m1 / chosen[chosen.length - 1].m2;
  const smallest = conservative.reduce((a, b) => (b.a < a.a ? b : a));
  const lost = m1 - now.m1 - (now.m2 - m2);

  const caption = `${fmt(m1, 1)} M☉ gives mass to ${fmt(m2, 1)} M☉, which keeps ${Math.round(beta * 100)}% of it. Now the donor has ${fmt(now.m1)} M☉ and its companion ${fmt(now.m2)} M☉${lost > 0.005 ? `, and ${fmt(lost)} M☉ has left the pair` : ''}: the separation is ${fmt(now.a)} times what it was and the period ${fmt(now.p)} times. ${beta === 1 ? `With nothing lost, the orbit is smallest when the masses are equal, ${fmt(smallest.a)} times its start.` : `Keeping everything, the orbit would be smallest at equal masses, ${fmt(smallest.a)} times its start.`} The donor’s Roche lobe is now ${fmt(now.rl1)} of the starting separation, ${now.rl1 < chosen[0].rl1 ? 'smaller' : 'larger'} than at the start (${fmt(chosen[0].rl1)}).`;

  // The pair to scale, centred on the centre of mass
  const VIEW = 300;
  const span = Math.max(...chosen.map((p) => p.a)) * 1.35 + 0.6;
  const px = VIEW / span;
  const cx = VIEW / 2;
  const x1 = cx - (now.a * now.m2) / (now.m1 + now.m2) * px;
  const x2 = cx + (now.a * now.m1) / (now.m1 + now.m2) * px;

  return (
    <Figure
      number={number}
      title="The orbit as mass changes hands"
      description="A donor star gives mass to its companion. If nothing leaves the pair, its angular momentum is fixed, and the separation shrinks while the donor is the heavier star, reaches its smallest when the two masses are equal, and widens after; the donor’s Roche lobe follows. If the companion keeps only part of what it is given, the rest leaves the pair and carries angular momentum away, and the orbit widens less."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      simplified={
        <p>
          The stars are points on a circular orbit, and mass moves slowly compared with the orbit. Mass that leaves the pair is assumed to leave
          from the companion with its orbital speed (“isotropic re-emission”), one of several assumptions in use; BSE’s own default
          takes it from the donor. The Roche lobes are Eggleton’s (1983) volume-equivalent radii. Whether the transfer stays slow is the
          stars’ business, not the orbit’s: Figure 28.3 runs real stars.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Donor at the start" value={m1} min={0.8} max={20} log step={0.005} format={(v) => `${fmt(v, 1)} M☉`} onChange={(v) => setM1(Number(v.toPrecision(2)))} />
        <Slider label="Companion at the start" value={m2} min={0.3} max={20} log step={0.005} format={(v) => `${fmt(v, 1)} M☉`} onChange={(v) => setM2(Number(v.toPrecision(2)))} />
        <Slider label="Share the companion keeps" value={beta} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setBeta(Math.round(v * 20) / 20)} />
        <Slider label="Mass given so far" value={given} min={0} max={1} step={0.01} format={(v) => `${fmt(v * (m1 - down))} M☉`} onChange={(v) => setGiven(Math.round(v * 100) / 100)} />
      </div>
      <div className={styles.split}>
        <div>
          <p className={styles.panelTitle}>Against the mass ratio, as the transfer goes on (right to left)</p>
          <ScatterChart
            groups={[]}
            lines={[
              { name: 'separation, nothing lost', color: 'var(--series-1)', f: (x) => along(conservative, x, 'a') },
              ...(beta < 1 ? [{ name: 'separation, with the share kept', color: 'var(--series-2)', f: (x: number) => along(chosen, x, 'a') }] : []),
              { name: 'period, with the share kept', color: 'var(--series-2)', dashed: true, f: (x) => along(chosen, x, 'p') },
              { name: 'the donor’s Roche lobe', color: 'var(--series-3)', dash: '2 3', f: (x) => along(chosen, x, 'rl1') },
            ]}
            xScale="log"
            yScale="log"
            xMin={Math.min(0.05, qEnd * 0.8)}
            xMax={Math.max(20, qStart * 1.2)}
            yMin={0.05}
            yMax={50}
            xLabel="Mass ratio, donor ÷ companion"
            yLabel="As a multiple of the starting separation or period"
            formatX={(x) => (x < 1 ? x.toPrecision(1) : String(Math.round(x)))}
            formatY={(y) => (y < 1 ? y.toPrecision(1) : String(Math.round(y)))}
            highlight={{ x: qNow, y: now.a, label: 'now', color: 'var(--series-2)' }}
            height={340}
            ariaLabel={`Separation, period and the donor’s Roche lobe against the mass ratio, from ${fmt(qStart)} down to ${fmt(qEnd)}. ${caption}`}
          >
            {(sx, sy) => <line x1={sx(1)} x2={sx(1)} y1={sy(0.05)} y2={sy(50)} stroke="var(--text-muted)" strokeDasharray="3 4" />}
          </ScatterChart>
        </div>
        <div>
          <p className={styles.panelTitle}>The pair now, to scale, with their Roche lobes</p>
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width="100%" style={{ maxWidth: 360, display: 'block', background: 'var(--sky-bg)', borderRadius: 6 }} role="img" aria-label={`The pair to scale: separation ${fmt(now.a)} times the start, the donor’s lobe ${fmt(now.rl1)} and the companion’s ${fmt(now.rl2)} of the starting separation.`}>
            <circle cx={x1} cy={VIEW / 2} r={now.rl1 * px} fill="#f97316" fillOpacity="0.35" stroke="#f97316" />
            <circle cx={x2} cy={VIEW / 2} r={now.rl2 * px} fill="#93c5fd" fillOpacity="0.3" stroke="#93c5fd" />
            <line x1={cx - 4} x2={cx + 4} y1={VIEW / 2} y2={VIEW / 2} stroke="#e2e8f5" />
            <line x1={cx} x2={cx} y1={VIEW / 2 - 4} y2={VIEW / 2 + 4} stroke="#e2e8f5" />
            <text x={x1} y={VIEW / 2 - now.rl1 * px - 6} textAnchor="middle" fontSize="12" fill="#fed7aa">
              donor {fmt(now.m1, 2)} M☉
            </text>
            <text x={x2} y={VIEW / 2 + now.rl2 * px + 16} textAnchor="middle" fontSize="12" fill="#bfdbfe">
              companion {fmt(now.m2, 2)} M☉
            </text>
            <line x1={10} x2={10 + chosen[0].a * px} y1={VIEW - 14} y2={VIEW - 14} stroke="#9aa8c4" strokeWidth="2" />
            <text x={10} y={VIEW - 20} fontSize="11" fill="#9aa8c4">
              the starting separation
            </text>
          </svg>
          <p className={styles.hint}>
            Mass ratio {fmt(qNow)} now; Eggleton’s lobe for the donor is {fmt(rocheLobe(qNow), 3)} of the separation.
          </p>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
