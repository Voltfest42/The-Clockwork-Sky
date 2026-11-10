import { useId, useState, type PointerEvent, type ReactNode } from 'react';
import { deathLinePdot, pdotForAge, pdotForField, pdotForPower, recyclingPath, RECYCLED, spinUpLinePdot, equilibriumPeriod } from '../core/compact/pulsar';
import { powerOfTen } from '../core/math/scientific';
import { KIND_NAMES, PULSAR_SET, type PulsarKind, type PulsarRecord } from '../data/pulsars';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import {
  AGE_LINES,
  FIELD_LINES,
  formatGauss,
  formatPeriod,
  formatYears,
  KIND_STYLES,
  OWN_LOG_AGE,
  OWN_START,
  ownPosition,
  ownTrack,
  P_RANGE,
  PDOT_RANGE,
  POWER_LINES,
  pulsarFacts,
  splitPulsars,
  type OwnPulsar,
} from './neutronStars';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The P–Ṗ diagram (Figure 26.4): pulsars' periods against how fast they slow,
 * on log axes, with lines of equal magnetic field, characteristic age and
 * spin-down power, the death line and the spin-up line. The pulsars are
 * `PULSAR_SET`'s (sixty famous ones from their papers, until the ATNF
 * catalogue can be used); pick one for its card. The reader's own pulsar is
 * born where they choose, ages down its line of constant field to the
 * graveyard, and can be recycled by a companion into a millisecond pulsar.
 */

const START_PULSAR = 'PSR B0531+21';
type LineSet = 'field' | 'age' | 'power';

export function PulsarDiagramFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [picked, setPicked] = useState<string>(START_PULSAR);
  const [own, setOwn] = useState<OwnPulsar>(OWN_START);
  const [lines, setLines] = useState<Record<LineSet, boolean>>({ field: true, age: true, power: false });
  const selectId = useId();
  const reset = () => {
    setPicked(START_PULSAR);
    setOwn(OWN_START);
    setLines({ field: true, age: true, power: false });
  };
  const pulsars = PULSAR_SET.pulsars;
  const { plotted, unmeasured } = splitPulsars(pulsars);
  const pulsar = pulsars.find((p) => p.name === picked) ?? pulsars[0];
  const facts = pulsar.Pdot !== null ? pulsarFacts({ P: pulsar.P, Pdot: pulsar.Pdot }) : null;
  const now = ownPosition(own);
  const track = ownTrack(own);
  const recycle = own.recycled ? null : recyclingPath(now.P, now.B);
  const ownFacts = pulsarFacts(now);
  const kinds = (Object.keys(KIND_STYLES) as PulsarKind[]).sort((a, b) => KIND_STYLES[a].order - KIND_STYLES[b].order);
  const label = (p: PulsarRecord) => p.nickname ?? p.name.replace('PSR ', '');

  const doRecycle = () => {
    const end = recyclingPath(now.P, now.B);
    const last = end[end.length - 1];
    setOwn({ ...own, recycled: { P: last.P, B: RECYCLED.field }, logAge: 6 });
  };

  const caption = `${own.recycled ? 'Your recycled pulsar' : 'Your pulsar'}, ${formatYears(10 ** own.logAge)} ${own.recycled ? 'after its companion spun it up' : 'after its birth'}, turns every ${formatPeriod(now.P)} and slows by ${powerOfTenText(now.Pdot)} seconds a second: a field of ${formatGauss(now.B)}, a characteristic age of ${formatYears(ownFacts.age)}, and ${formatWatts(
    ownFacts.power,
  )} from its slowing. ${now.dead ? 'It is past the death line: too slow to make the pairs that make radio waves, it has fallen silent. A companion could recycle it.' : 'It is still above the death line, shining.'}`;

  // Clicking the chart picks the nearest pulsar, in log space.
  const pickNear = (sx: (x: number) => number, sy: (y: number) => number) => (event: PointerEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const view = svg.viewBox.baseVal;
    const x = ((event.clientX - box.left) / box.width) * view.width;
    const y = ((event.clientY - box.top) / box.height) * view.height;
    let best: PulsarRecord | null = null;
    let bestD = 18 ** 2;
    for (const p of plotted) {
      const d = (sx(p.P) - x) ** 2 + (sy(p.Pdot) - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best) setPicked(best.name);
  };

  return (
    <Figure
      number={number}
      title="The P–Ṗ diagram"
      description="Pulsars’ periods against how fast they slow down, on logarithmic axes, with lines of equal magnetic field and characteristic age. Young pulsars sit high on the left, ordinary ones in the middle, magnetars high on the right, and millisecond pulsars, spun up by a companion, low on the far left. A pulsar slows along a line of constant field until it crosses the death line and falls silent."
      height={1080}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'your pulsar and its path', symbol: <circle r="6" fill="none" stroke="var(--accent)" strokeWidth="2.5" /> },
        { label: 'the death line (the graveyard below it, shaded)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text)" strokeWidth="2" /> },
        { label: 'the spin-up line: the fastest a companion can spin it', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-1)" strokeWidth="2" strokeDasharray="7 3 2 3" /> },
      ]}
      simplified={
        <p>
          Fields, ages and powers assume a magnetic dipole spinning in empty space, with a moment of inertia of 10³⁸ kg m² and a radius of 10 km;
          real pulsars’ magnetospheres are full of plasma, which changes the numbers by a factor of a few. Characteristic ages assume a pulsar was
          born spinning much faster than now and slows by its dipole alone: the Crab’s is 1,260 years, its true age 972. The field of a recycled
          pulsar is set to {formatGauss(RECYCLED.field)}, spun up by gas arriving at a tenth of the Eddington rate, and its path is a sketch. The death
          line is one of several in the literature. The pulsars are {pulsars.length} famous ones, not the catalogue’s 4,500: the ATNF Pulsar Catalogue’s
          data can’t yet be shipped with this course. Millisecond pulsars’ Ṗ is as measured, without the corrections for their motion that some need.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <label htmlFor={selectId} className={figureStyles.inputLabel}>
          Pulsar
        </label>
        <select id={selectId} value={picked} onChange={(e) => setPicked(e.target.value)}>
          {kinds.map((k) => (
            <optgroup key={k} label={KIND_NAMES[k]}>
              {pulsars
                .filter((p) => p.kind === k)
                .map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.nickname ? `${p.name} (${p.nickname})` : p.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <span className={styles.toggles} role="group" aria-label="Lines">
          {(
            [
              ['field', 'Equal field'],
              ['age', 'Equal age'],
              ['power', 'Equal power'],
            ] as const
          ).map(([id, name]) => (
            <button key={id} type="button" className={styles.toggle} aria-pressed={lines[id]} onClick={() => setLines({ ...lines, [id]: !lines[id] })}>
              {name}
            </button>
          ))}
        </span>
      </div>

      <ScatterChart
        groups={kinds.map((k) => ({
          name: KIND_NAMES[k],
          color: KIND_STYLES[k].colour,
          shape: KIND_STYLES[k].shape,
          points: plotted.filter((p) => p.kind === k).map((p) => ({ x: p.P, y: p.Pdot, label: label(p) })),
        }))}
        xScale="log"
        yScale="log"
        xMin={P_RANGE[0]}
        xMax={P_RANGE[1]}
        yMin={PDOT_RANGE[0]}
        yMax={PDOT_RANGE[1]}
        xLabel="Period, P (s)"
        yLabel="Slowing, Ṗ (s/s)"
        formatX={(x) => (x < 1 ? String(Number(x.toPrecision(1))) : String(Math.round(x)))}
        formatY={(y) => powerOfTen(Math.round(Math.log10(y)))}
        labelled={['the Crab pulsar', 'the Vela pulsar', 'CP 1919', 'B1937+21', 'SGR 1806−20', 'Geminga'].filter((l) => l !== label(pulsar))}
        highlight={pulsar.Pdot !== null ? { x: pulsar.P, y: pulsar.Pdot, label: label(pulsar), color: 'var(--text)' } : undefined}
        height={500}
        ariaLabel={`${pulsars.length} pulsars’ periods against their spin-down rates. ${label(pulsar)} is picked: ${formatPeriod(pulsar.P)}${pulsar.Pdot !== null ? `, slowing by ${powerOfTenText(pulsar.Pdot)} s/s` : ', slowing not measured'}. Your pulsar is at ${formatPeriod(now.P)}, ${powerOfTenText(now.Pdot)} s/s.`}
      >
        {(sx, sy) => {
          const xs = Array.from({ length: 61 }, (_, i) => 10 ** (Math.log10(P_RANGE[0]) + ((Math.log10(P_RANGE[1]) - Math.log10(P_RANGE[0])) * i) / 60));
          const path = (f: (P: number) => number) => {
            const parts: string[] = [];
            let pen = false;
            for (const P of xs) {
              const y = f(P);
              if (!(y >= PDOT_RANGE[0] && y <= PDOT_RANGE[1])) {
                pen = false;
                continue;
              }
              parts.push(`${pen ? 'L' : 'M'} ${sx(P).toFixed(1)} ${sy(y).toFixed(1)}`);
              pen = true;
            }
            return parts.join(' ');
          };
          // Where a line leaves the plot, for its label.
          const labelAt = (f: (P: number) => number, text: string, key: string, color: string) => {
            let last: { x: number; y: number } | null = null;
            for (const P of xs) {
              const y = f(P);
              if (y >= PDOT_RANGE[0] * 3 && y <= PDOT_RANGE[1] / 3) last = { x: sx(P), y: sy(y) };
            }
            return last ? (
              <text key={key} x={Math.min(last.x, sx(P_RANGE[1]) - 4)} y={last.y - 4} fontSize="10.5" fill={color} textAnchor="end">
                {text}
              </text>
            ) : null;
          };
          const grave = [`M ${sx(P_RANGE[0])} ${sy(PDOT_RANGE[0])}`];
          for (const P of xs) grave.push(`L ${sx(P)} ${sy(Math.max(PDOT_RANGE[0], Math.min(PDOT_RANGE[1], deathLinePdot(P))))}`);
          grave.push(`L ${sx(P_RANGE[1])} ${sy(PDOT_RANGE[0])} Z`);
          const trackPath = (pts: readonly { P: number; Pdot: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.P).toFixed(1)} ${sy(Math.max(PDOT_RANGE[0], p.Pdot)).toFixed(1)}`).join(' ');
          return (
            <g>
              <rect x={sx(P_RANGE[0])} y={sy(PDOT_RANGE[1])} width={sx(P_RANGE[1]) - sx(P_RANGE[0])} height={sy(PDOT_RANGE[0]) - sy(PDOT_RANGE[1])} fill="transparent" onPointerDown={pickNear(sx, sy)} style={{ cursor: 'pointer' }} />
              <path d={grave.join(' ')} fill="var(--text-muted)" fillOpacity="0.14" pointerEvents="none" />
              <text x={sx(8)} y={sy(3e-19)} fontSize="12" fill="var(--text-muted)" textAnchor="middle" pointerEvents="none">
                the graveyard
              </text>
              <g pointerEvents="none">
                {lines.field &&
                  FIELD_LINES.map((B) => (
                    <g key={`B${B}`}>
                      <path d={path((P) => pdotForField(P, B))} fill="none" stroke="var(--series-3)" strokeWidth="1" strokeDasharray="5 4" />
                      {labelAt((P) => pdotForField(P, B), `${powerOfTen(Math.log10(B))} G`, `lB${B}`, 'var(--series-3)')}
                    </g>
                  ))}
                {lines.age &&
                  AGE_LINES.map((t) => (
                    <g key={`t${t}`}>
                      <path d={path((P) => pdotForAge(P, t))} fill="none" stroke="var(--series-2)" strokeWidth="1" strokeDasharray="2 3" />
                      {labelAt((P) => pdotForAge(P, t), formatYears(t).replace(' years', ' yr'), `lt${t}`, 'var(--text-warm)')}
                    </g>
                  ))}
                {lines.power &&
                  POWER_LINES.map((E) => (
                    <g key={`E${E}`}>
                      <path d={path((P) => pdotForPower(P, E))} fill="none" stroke="var(--right)" strokeWidth="1" strokeDasharray="8 3" />
                      {labelAt((P) => pdotForPower(P, E), `${powerOfTen(Math.log10(E))} W`, `lE${E}`, 'var(--right)')}
                    </g>
                  ))}
                <path d={path(deathLinePdot)} fill="none" stroke="var(--text)" strokeWidth="2" />
                <path d={path(spinUpLinePdot)} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeDasharray="7 3 2 3" />
                {unmeasured.map((p) => (
                  <g key={p.name}>
                    <line x1={sx(p.P)} x2={sx(p.P)} y1={sy(PDOT_RANGE[0])} y2={sy(PDOT_RANGE[0]) - 12} stroke={KIND_STYLES[p.kind].colour} strokeWidth="2" />
                    <title>{`${label(p)}: ${formatPeriod(p.P)}, slowing not measured`}</title>
                  </g>
                ))}
                <path d={trackPath(track)} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
                {recycle && now.dead && <path d={trackPath(recycle)} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="2 4" />}
                <circle cx={sx(now.P)} cy={sy(Math.max(PDOT_RANGE[0], now.Pdot))} r={7} fill="none" stroke="var(--accent)" strokeWidth="3" />
              </g>
            </g>
          );
        }}
      </ScatterChart>

      <div className={figureStyles.withSide}>
        <div>
          <p className={styles.panelTitle}>Your pulsar</p>
          <div className={styles.controls}>
            {!own.recycled && (
              <>
                <Slider label="Born turning every" value={own.P0} min={0.005} max={0.5} log step={0.01} format={formatPeriod} onChange={(v) => setOwn({ ...own, P0: Number(v.toPrecision(2)) })} />
                <Slider label="Magnetic field" value={own.B} min={1e10} max={1e15} log step={0.05} format={formatGauss} onChange={(v) => setOwn({ ...own, B: Number(v.toPrecision(2)) })} />
              </>
            )}
            <Slider
              label={own.recycled ? 'Time since it was spun up' : 'Age'}
              value={10 ** own.logAge}
              min={10 ** OWN_LOG_AGE[0]}
              max={10 ** OWN_LOG_AGE[1]}
              log
              step={0.05}
              format={formatYears}
              onChange={(v) => setOwn({ ...own, logAge: Math.round(Math.log10(v) * 20) / 20 })}
            />
          </div>
          <div className={figureStyles.toolbar}>
            <button type="button" className={figureStyles.toolButton} disabled={!!own.recycled} onClick={doRecycle}>
              Recycle it: a companion spins it up
            </button>
            {own.recycled && (
              <button type="button" className={figureStyles.toolButton} onClick={() => setOwn({ ...OWN_START, P0: own.P0, B: own.B })}>
                Start again
              </button>
            )}
          </div>
          <p className={styles.hint}>
            A companion’s gas buries the field (to {formatGauss(RECYCLED.field)}) and spins it up to {formatPeriod(equilibriumPeriod(RECYCLED.field, RECYCLED.eddingtonShare))}.
          </p>
        </div>
        <div className={figureStyles.side}>
          <div className={styles.card} style={{ marginTop: 0 }}>
            <p className={styles.cardTitle}>
              {pulsar.nickname ? `${pulsar.nickname[0].toUpperCase()}${pulsar.nickname.slice(1)}` : pulsar.name} {pulsar.nickname && <span className={styles.cardSubtitle}>{pulsar.name}</span>}
            </p>
            <p>{pulsar.note}</p>
            <dl className={styles.facts}>
              <div>
                <dt>Period</dt>
                <dd>
                  {formatPeriod(pulsar.P)} ({Number((1 / pulsar.P).toPrecision(3)).toLocaleString('en-GB')} turns a second)
                </dd>
              </div>
              {facts ? (
                <>
                  <div>
                    <dt>Slowing</dt>
                    <dd>{powerOfTenText(pulsar.Pdot!)} s/s</dd>
                  </div>
                  <div>
                    <dt>Field</dt>
                    <dd>{formatGauss(facts.B)}</dd>
                  </div>
                  <div>
                    <dt>Characteristic age</dt>
                    <dd>{formatYears(facts.age)}</dd>
                  </div>
                  <div>
                    <dt>Power from slowing</dt>
                    <dd>{formatWatts(facts.power)}</dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt>Slowing</dt>
                  <dd>not measured</dd>
                </div>
              )}
              <div>
                <dt>From</dt>
                <dd>{pulsar.source}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

/** "4.2 × 10⁻¹³". */
function powerOfTenText(x: number): string {
  const e = Math.floor(Math.log10(x));
  const m = x / 10 ** e;
  const mm = Number(m.toFixed(1));
  return mm === 1 ? powerOfTen(e) : `${mm} × ${powerOfTen(e)}`;
}

/** A power in watts, with the Sun's for scale: "4.3 × 10³¹ W (110,000 Suns)". */
function formatWatts(W: number): string {
  const suns = W / 3.828e26;
  const sunText = suns >= 1 ? `${Number(suns.toPrecision(2)).toLocaleString('en-GB')} Suns` : suns >= 1e-3 ? `${Number(suns.toPrecision(2))} of the Sun’s` : null;
  return `${powerOfTenText(W)} W${sunText ? ` (${sunText})` : ''}`;
}
