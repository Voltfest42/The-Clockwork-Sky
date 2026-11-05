import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { CollapseRun } from '../core/supernova/collapse';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { useCollapse } from '../viz/useStellar';
import { BOUNCE_START, formatFoe, formatSeconds, NEUTRINO_PRESETS, NEUTRINO_RANGE } from './explosions';
import { formatGramsPerCc } from './holding';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Collapse and bounce (Figure 25.1), a toy: a one-dimensional hydrodynamics
 * code, run in the stellar worker, follows an iron core of 1.43 M☉ inside its
 * mantle as it falls in, bounces at nuclear density and drives out a shock
 * that stalls; neutrino heating behind the shock, set by a slider, may revive
 * it. Every shell's distance from the centre against time, the shock among
 * them, and the gas's speed at one moment.
 */

const T_MAX = 0.62;
const LOG_R = [1, 4] as const; // log₁₀ km
const W = 720;
const H = 360;
const PAD = { left: 54, right: 12, top: 10, bottom: 38 };
const INNER = 'var(--series-3)';
const OUTER = 'var(--series-2)';
const MANTLE = 'var(--text-muted)';

/** Where the shock stands in a run that doesn't explode: the median of its radius over the last 0.3 s, km. */
function standingShock(run: CollapseRun): number {
  const late = run.frames.filter((f) => f.t > run.frames[run.frames.length - 1].t - 0.3 && f.shock > 0).map((f) => f.shock / 1000);
  late.sort((a, b) => a - b);
  return late.length ? late[Math.floor(late.length / 2)] : 0;
}

export function BounceFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [L, setL] = useState<number>(BOUNCE_START.L);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);
  const answer = useCollapse(L);
  const fresh = answer?.neutrinoLuminosity === L;
  const run = answer;
  const reset = () => {
    setL(BOUNCE_START.L);
    setIndex(0);
    setPlaying(false);
  };

  const last = run ? run.frames.length - 1 : 0;
  const i = Math.min(index, last);
  useAnimationFrame(playing && onScreen && !!run, (dt) => {
    pending.current += dt;
    const every = reducedMotion ? 0.5 : 1 / 30;
    if (pending.current < every) return;
    const steps = reducedMotion ? Math.ceil(last / 10) : Math.max(1, Math.floor(pending.current / every));
    pending.current = 0;
    setIndex((k) => {
      const next = Math.min(last, k + steps);
      if (next >= last) setPlaying(false);
      return next;
    });
  });

  const sx = (t: number) => PAD.left + (t / T_MAX) * (W - PAD.left - PAD.right);
  const sy = (km: number) => {
    const v = Math.max(LOG_R[0], Math.min(LOG_R[1], Math.log10(Math.max(km, 1))));
    return H - PAD.bottom - ((v - LOG_R[0]) / (LOG_R[1] - LOG_R[0])) * (H - PAD.top - PAD.bottom);
  };
  const paths = useMemo(() => {
    if (!run) return [];
    const nShells = run.mass.length;
    const out: { d: string; colour: string; width: number }[] = [];
    for (let j = 0; j < nShells; j += 1) {
      const m = run.mass[j];
      const colour = m <= run.innerCore + 1e-9 ? INNER : m <= 1.431 ? OUTER : MANTLE;
      const d = run.frames.map((f, k) => `${k ? 'L' : 'M'}${sx(f.t).toFixed(1)} ${sy(f.r[j] / 1000).toFixed(1)}`).join(' ');
      out.push({ d, colour, width: j % 10 === 9 ? 1.4 : 0.6 });
    }
    return out;
  }, [run]);
  const shockPath = useMemo(() => {
    if (!run) return '';
    let started = false;
    return run.frames
      .map((f) => {
        if (!(f.shock > 0)) return '';
        const s = `${started ? 'L' : 'M'}${sx(f.t).toFixed(1)} ${sy(f.shock / 1000).toFixed(1)}`;
        started = true;
        return s;
      })
      .join(' ');
  }, [run]);

  const frame = run?.frames[i];
  const bounced = run ? Number.isFinite(run.bounce) && frame!.t >= run.bounce : false;
  const shockKm = frame && frame.shock > 0 ? frame.shock / 1000 : 0;
  const standing = run ? standingShock(run) : 0;
  const atEnd = i === last;
  const velocity = frame ? Array.from(frame.r, (r, j) => ({ x: Math.log10(Math.max(1, r / 1000)), y: frame.v[j] / 1000 })) : [];
  const outcome = run
    ? run.exploded
      ? `With neutrinos of ${L} × 10⁵² erg/s heating the gas behind it, the shock is revived and breaks out: the star explodes, with ${formatFoe(run.explosionEnergy)} in its outgoing layers.`
      : `${L > 0 ? `Heating of ${L} × 10⁵² erg/s isn’t enough: the` : 'Without neutrino heating, the'} shock stalls about ${Math.round(standing / 10) * 10} km out, held back by the gas still falling in, and in this run the star doesn’t explode.`
    : '';
  const caption = !run
    ? 'Running the toy…'
    : !bounced
      ? `${formatSeconds(frame!.t)} after the core’s pressure gives way: it is falling in, its centre at ${formatGramsPerCc(frame!.rho[0])}. The inner ${run.innerCore.toFixed(2)} M☉ falls together, faster and faster, until it bounces at ${formatSeconds(run.bounce)}.`
      : atEnd
        ? outcome
        : `${formatSeconds(frame!.t - run.bounce)} after the bounce: the centre has stiffened at ${formatGramsPerCc(Math.max(...frame!.rho))}, and the shock ${shockKm > 0 ? `is ${Math.round(shockKm)} km out` : 'is forming'}. ${outcome}`;

  return (
    <Figure
      number={number}
      title="Collapse and bounce"
      description="A toy simulation of an iron core’s last second. Its pressure gives way and it falls in; the inner part falls together, faster and faster, until at nuclear density it stiffens and bounces, sending out a shock. The shock spends its energy splitting the iron it runs into and stalls a few hundred kilometres out, while gas keeps falling onto it. Neutrinos from the hot new neutron star heat the gas behind it: weak heating leaves the shock stalled, strong heating revives it, and the star explodes."
      height={960}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'shells of the inner core, which bounces as one', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke={INNER} strokeWidth="2" /> },
        { label: 'the rest of the iron core', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke={OUTER} strokeWidth="2" /> },
        { label: 'the mantle outside it', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke={MANTLE} strokeWidth="2" /> },
        { label: 'the shock', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3.5" /> },
      ]}
      simplified={
        <p>
          A toy, not a supernova model. One dimension (real explosions need three, where turbulence helps the shock); Newtonian gravity; a
          made-up equation of state, softened between 10⁸ g/cm³ and nuclear density to stand in for electron captures, stiff above it; the
          splitting of iron as a fixed cost of 8.8 MeV per nucleon; neutrinos as a “light bulb” of fixed luminosity heating the gas behind the
          shock, which cools by its own neutrinos; and the settled neutron star held fixed after the bounce. Its starting core is a polytrope inside
          a warm mantle, its bounce comes at 0.11 s and its inner core is 0.6 M☉, as in detailed models; its shock stalls further out than
          theirs (100–200 km), and it explodes above about 2 × 10⁵² erg/s. Research codes, such as Burrows and Vartanyan’s, follow the neutrinos
          themselves.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Neutrino heating">
        {NEUTRINO_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.toggle}
            aria-pressed={L === p.L}
            onClick={() => {
              setL(p.L);
              // The end of whichever run comes back.
              setIndex(Infinity);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls} style={{ marginTop: 8 }}>
        <Slider label="Neutrino heating" value={L} min={NEUTRINO_RANGE[0]} max={NEUTRINO_RANGE[1]} step={0.5} format={(v) => (v === 0 ? 'none' : `${v} × 10⁵² erg/s`)} onChange={(v) => setL(Math.round(v * 2) / 2)} />
        <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={figureStyles.toolButton}
            disabled={!run}
            onClick={() => {
              if (atEnd) setIndex(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? 'Pause' : atEnd ? 'Play again' : 'Play'}
          </button>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Slider
              label="Time"
              value={i}
              min={0}
              max={Math.max(1, last)}
              step={1}
              disabled={!run}
              format={(k) => (run ? formatSeconds(run.frames[Math.min(last, Math.round(k))].t) : '0 s')}
              onChange={(k) => {
                setPlaying(false);
                setIndex(Math.round(k));
              }}
            />
          </div>
        </div>
      </div>

      <div ref={box}>
        <p className={styles.panelTitle}>Every shell’s distance from the centre</p>
        <div className={styles.card} aria-live="polite" aria-busy={!fresh} style={{ padding: 0, overflow: 'hidden' }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            role="img"
            aria-label={
              run
                ? `Shells’ distances from the centre against time, on a log scale from 10 to 10,000 km. They fall in until the bounce at ${formatSeconds(run.bounce)}; the shock then moves out to a few hundred kilometres${run.exploded ? ' and, revived by the neutrinos, out through the mantle' : ' and stalls there'}.`
                : 'Running the toy simulation.'
            }
          >
            {[1, 2, 3, 4].map((e) => (
              <g key={e}>
                <line x1={PAD.left} x2={W - PAD.right} y1={sy(10 ** e)} y2={sy(10 ** e)} stroke="var(--border)" strokeOpacity={0.6} />
                <text x={PAD.left - 6} y={sy(10 ** e) + 4} fontSize="11" fill="var(--text-muted)" textAnchor="end">
                  {(10 ** e).toLocaleString('en-GB')}
                </text>
              </g>
            ))}
            {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((t) => (
              <text key={t} x={sx(t)} y={H - PAD.bottom + 15} fontSize="11" fill="var(--text-muted)" textAnchor="middle">
                {t.toFixed(1)}
              </text>
            ))}
            <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} fontSize="11.5" fill="var(--text)" textAnchor="middle">
              Time (s)
            </text>
            <text transform={`translate(13 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} fontSize="11.5" fill="var(--text)" textAnchor="middle">
              Distance (km, log scale)
            </text>
            <g opacity={fresh ? 1 : 0.4}>
              {paths.map((p, k) => (
                <path key={k} d={p.d} stroke={p.colour} strokeWidth={p.width} fill="none" strokeOpacity={0.85} />
              ))}
              <path d={shockPath} stroke="var(--accent)" strokeWidth={3.5} fill="none" strokeLinejoin="round" />
              {run && Number.isFinite(run.bounce) && (
                <g>
                  <line x1={sx(run.bounce)} x2={sx(run.bounce)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--text)" strokeDasharray="3 3" />
                  <text x={sx(run.bounce) + 4} y={PAD.top + 12} fontSize="11" fill="var(--text)">
                    bounce
                  </text>
                </g>
              )}
            </g>
            {frame && <line x1={sx(frame.t)} x2={sx(frame.t)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--text)" strokeWidth="2" />}
          </svg>
          {!fresh && <p style={{ margin: '4px 10px' }}>Running the toy with {L === 0 ? 'no heating' : `${L} × 10⁵² erg/s`}…</p>}
        </div>
      </div>

      <div className={figureStyles.withSide} style={{ marginTop: 10 }}>
        <div>
          <p className={styles.panelTitle}>The gas’s speed at {frame ? formatSeconds(frame.t) : '0 s'} (inwards below zero)</p>
          <ProfilePlot
            series={[{ name: 'speed', color: 'var(--accent)', points: velocity }]}
            hideLegend
            xMin={1}
            xMax={4}
            formatX={(x) => (Number.isInteger(x) ? (10 ** x).toLocaleString('en-GB') : '')}
            xLabel="Distance from the centre (km, log scale)"
            yLabel="Speed (km/s)"
            yMin={-70000}
            yMax={40000}
            formatY={(y) => Number(y).toLocaleString('en-GB')}
            ariaLabel={frame ? `The gas’s speed against distance at ${formatSeconds(frame.t)}: ${bounced ? `the shock, ${Math.round(shockKm)} km out, is where infalling gas is suddenly slowed` : 'all of it falling in, fastest at the edge of the inner core'}.` : 'Waiting for the toy.'}
            height={230}
          >
            {(px, py) => (
              <g>
                <line x1={px(1)} x2={px(4)} y1={py(0)} y2={py(0)} stroke="var(--text-muted)" />
                {shockKm > 10 && <line x1={px(Math.log10(shockKm))} x2={px(Math.log10(shockKm))} y1={py(-70000)} y2={py(40000)} stroke="var(--accent)" strokeDasharray="4 3" />}
              </g>
            )}
          </ProfilePlot>
        </div>
        <div className={figureStyles.side}>
          <dl className={styles.facts}>
            <div>
              <dt>Bounce</dt>
              <dd>{run ? `at ${formatSeconds(run.bounce)}` : '…'}</dd>
            </div>
            <div>
              <dt>Inner core</dt>
              <dd>{run ? `${run.innerCore.toFixed(2)} M☉` : '…'}</dd>
            </div>
            <div>
              <dt>Densest</dt>
              <dd>{frame ? formatGramsPerCc(Math.max(...frame.rho)) : '…'}</dd>
            </div>
            <div>
              <dt>Shock</dt>
              <dd>{bounced && shockKm > 0 ? `${Math.round(shockKm).toLocaleString('en-GB')} km out` : '—'}</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>{run ? (run.exploded ? `explodes, ${formatFoe(run.explosionEnergy)}` : 'stalls') : '…'}</dd>
            </div>
          </dl>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
