import { useMemo, useRef, useState, type ReactNode } from 'react';
import { powerOfTen } from '../core/math/scientific';
import { MAGIC } from '../core/nuclear/nuclides';
import { waitingEnergy } from '../core/nuclear/rprocess';
import { abundancesAt, branchPoints, decayToStable, exposureTime } from '../core/nuclear/sprocess';
import { useAnimationFrame, useDarkMode, useOnScreen, useReducedMotion } from '../viz/hooks';
import { Caption, Figure } from '../viz/Figure';
import { ChartOfNuclides, type ChartCell, type ChartLine } from '../viz/nuclides/ChartOfNuclides';
import { viewAround, type ChartView } from '../viz/nuclides/view';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import {
  ELEMENT_NAMES,
  formatExposure,
  formatHalfLife,
  formatNeutronDensity,
  mainComponent,
  nuclideName,
  nuclides,
  nuclideSymbol,
  peaksOf,
  R_DURATION,
  rRun,
  amountColour,
  sNetwork,
  solarByMass,
  sRun,
  S_ONLY,
} from './elements';
import { formatHotKelvin } from './furnace';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Neutron captures step by step (Figure 23.2). The slow process: an iron-56
 * seed exposed to neutrons at a chosen density, through a network of every
 * nucleus between iron and polonium with KADoNiS's cross sections and
 * measured half-lives; its abundances on the chart of nuclides as the
 * exposure grows, the branch points, and σN against mass number beside the
 * Sun's s-only isotopes. The rapid process, a toy: each element's isotopes in
 * the (n,γ) ⇌ (γ,n) balance, waiting at the magic numbers for β decays, the
 * path on the chart, and the pattern it leaves after decaying back, beside
 * the Sun's r-process abundances.
 */

type Mode = 'slow' | 'rapid';
type Show = 'chart' | 'pattern';

const SEC_YEAR = 3.15576e7;
const S_BOUNDS: ChartView = { nMin: 26, nMax: 130, zMin: 24, zMax: 86 };
const R_BOUNDS: ChartView = { nMin: 26, nMax: 178, zMin: 24, zMax: 100 };
const START = {
  mode: 'slow' as Mode,
  show: 'chart' as Show,
  sDensity: 1e8,
  tau: 0.05,
  spread: false,
  rDensity: 1e24,
  T: 1.5e9,
  time: 1,
  averaged: true,
};
const S_VIEW = viewAround(40, 34, 44, S_BOUNDS);
const R_VIEW = { nMin: 26, nMax: 178, zMin: 24, zMax: 100 };

export function NeutronCaptureFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mode, setMode] = useState<Mode>(START.mode);
  const [show, setShow] = useState<Show>(START.show);
  const [sDensity, setSDensity] = useState(START.sDensity);
  const [tau, setTau] = useState(START.tau);
  const [spread, setSpread] = useState(START.spread);
  const [rDensity, setRDensity] = useState(START.rDensity);
  const [T, setT] = useState(START.T);
  const [time, setTime] = useState(START.time);
  const [averaged, setAveraged] = useState(START.averaged);
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<ChartView>(S_VIEW);
  const [cursor, setCursor] = useState({ Z: 26, N: 30 });
  const [rCursor, setRCursor] = useState(130);
  const [sCursor, setSCursor] = useState(88);
  const wrap = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(wrap);
  const reduced = useReducedMotion();
  const dark = useDarkMode();
  const tick = useRef(0);
  const reset = () => {
    setMode(START.mode);
    setShow(START.show);
    setSDensity(START.sDensity);
    setTau(START.tau);
    setSpread(START.spread);
    setRDensity(START.rDensity);
    setT(START.T);
    setTime(START.time);
    setAveraged(START.averaged);
    setPlaying(false);
    setView(S_VIEW);
    setCursor({ Z: 26, N: 30 });
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setPlaying(false);
    setView(m === 'slow' ? S_VIEW : R_VIEW);
    setCursor(m === 'slow' ? { Z: 26, N: 30 } : { Z: 48, N: 82 });
  };

  // Play: the exposure (slow) or the time (rapid) runs on; in steps when the reader wants less motion.
  useAnimationFrame(playing && onScreen, (dt) => {
    tick.current += dt;
    if (reduced && tick.current < 0.6) return;
    const step = reduced ? tick.current : dt;
    tick.current = 0;
    if (mode === 'slow') {
      const next = Math.min(4, tau + step * 0.25);
      setTau(Number(next.toFixed(3)));
      if (next >= 4) setPlaying(false);
    } else {
      const next = Math.min(R_DURATION, time + step * 1.5);
      setTime(Number(next.toFixed(3)));
      if (next >= R_DURATION) setPlaying(false);
    }
  });

  const table = nuclides();
  const net = sNetwork();
  const slow = useMemo(() => (mode === 'slow' ? sRun(sDensity) : null), [mode, sDensity]);
  const rapid = useMemo(() => (mode === 'rapid' ? rRun(rDensity, T) : null), [mode, rDensity, T]);

  // ---- The slow process ----
  const Y = useMemo(() => (slow ? abundancesAt(slow, tau) : null), [slow, tau]);
  const branches = useMemo(() => (mode === 'slow' ? branchPoints(net, sDensity) : []), [net, mode, sDensity]);
  const reached = useMemo(() => {
    if (!Y) return new Set<number>();
    const s = new Set<number>();
    net.nuclei.forEach((x, i) => Y[i] > 1e-7 && s.add(x.Z * 1000 + x.N));
    return s;
  }, [Y, net]);
  const sCells = useMemo<ChartCell[]>(() => {
    if (!Y) return [];
    const cells: ChartCell[] = [];
    for (const n of table.list) {
      if (n.Z < S_BOUNDS.zMin || n.Z > S_BOUNDS.zMax || n.N > S_BOUNDS.nMax) continue;
      if (n.halfLife === Infinity) cells.push({ Z: n.Z, N: n.N, colour: 'var(--border)' });
    }
    net.nuclei.forEach((x, i) => {
      const y = Y[i];
      if (y < 1e-7) return;
      const branch = branches.some((b) => b.Z === x.Z && b.N === x.N);
      cells.push({ Z: x.Z, N: x.N, colour: amountColour((Math.log10(y) + 7) / 7, dark), outline: branch ? 'var(--text-warm)' : undefined });
    });
    return cells;
  }, [Y, net, table, branches, dark]);
  const front = useMemo(() => {
    if (!Y) return null;
    let best = -1;
    net.nuclei.forEach((x, i) => {
      if (x.A > 58 && (best < 0 || Y[i] > Y[best])) best = i;
    });
    return best >= 0 ? net.nuclei[best] : null;
  }, [Y, net]);
  const reachedBranches = branches.filter((b) => reached.has(b.Z * 1000 + b.N)).length;
  const meanCaptures = Y ? net.nuclei.reduce((s, x, i) => s + (x.A - 56) * Y[i], 0) : 0;

  // σN by mass number, after the unstable nuclei decay, and the Sun's s-only isotopes scaled to the main component at samarium-150.
  const sPattern = useMemo(() => {
    if (!slow || !Y) return null;
    const stable = spread ? mainComponent(sDensity) : decayToStable(net, Y);
    const byA = new Map<number, number>();
    for (const [k, y] of stable) {
      const i = net.index.get(k);
      if (i === undefined) continue;
      const x = net.nuclei[i];
      byA.set(x.A, (byA.get(x.A) ?? 0) + x.sigma * y);
    }
    const main = mainComponent(sDensity);
    const sm150 = main.get(62 * 1000 + 88)! * net.nuclei[net.index.get(62 * 1000 + 88)!].sigma;
    const sun150 = S_ONLY.find((s) => s.Z === 62 && s.A === 150)!;
    const sigma150 = net.nuclei[net.index.get(62 * 1000 + 88)!].sigma;
    const scale = sm150 / (sigma150 * sun150.N);
    const sun = S_ONLY.filter((s) => s.A >= 60)
      .map((s) => {
        const i = net.index.get(s.Z * 1000 + s.A - s.Z);
        return i === undefined ? null : { Z: s.Z, A: s.A, y: net.nuclei[i].sigma * s.N * scale };
      })
      .filter((x): x is { Z: number; A: number; y: number } => x !== null);
    const points = [...byA.entries()].filter(([A]) => A >= 56).sort((a, b) => a[0] - b[0]).map(([A, y]) => ({ x: A, y }));
    return { points, sun };
  }, [slow, Y, spread, sDensity, net]);

  // ---- The rapid process ----
  const rIndex = rapid ? nearestTime(rapid.run.times, time) : 0;
  const rCells = useMemo<ChartCell[]>(() => {
    if (!rapid) return [];
    const cells: ChartCell[] = [];
    for (const n of table.list) if (n.halfLife === Infinity && n.Z >= R_BOUNDS.zMin) cells.push({ Z: n.Z, N: n.N, colour: 'var(--border)' });
    const k = rIndex;
    rapid.run.chains.forEach((ch, i) => {
      const y = rapid.run.elements[k][i];
      if (y < 1e-6) return;
      ch.share.forEach((p, j) => {
        if (p * y < 1e-6) return;
        cells.push({ Z: ch.Z, N: ch.nFrom + j, colour: amountColour((Math.log10(p * y) + 6) / 6, dark) });
      });
    });
    return cells;
  }, [rapid, rIndex, table, dark]);
  const rLines = useMemo<ChartLine[]>(() => (rapid ? [{ points: rapid.run.chains.map((c) => [c.waitingN, c.Z] as [number, number]), colour: 'var(--text-warm)', width: 2, label: 'the waiting points' }] : []), [rapid]);
  const rPattern = useMemo(() => {
    if (!rapid) return null;
    const pattern = averaged ? rapid.patterns.averaged[rIndex] : rapid.patterns.frozen[rIndex];
    const sun = solarByMass('r');
    // Scale the toy to the Sun's second peak (A = 120–140).
    const sum = (m: Map<number, number>) => [...m].filter(([A]) => A >= 120 && A <= 140).reduce((s, [, y]) => s + y, 0);
    const scale = sum(pattern) > 0 ? sum(sun) / sum(pattern) : 1;
    // Smoothed over five mass numbers: the toy leaves one isotope per element, a comb the real process smooths out.
    const smooth = (A: number) => [-2, -1, 0, 1, 2].reduce((s, d) => s + (pattern.get(A + d) ?? 0), 0) / 5;
    const points = Array.from({ length: 181 }, (_, i) => i + 60).map((A) => ({ x: A, y: smooth(A) * scale }));
    const sunPoints = [...sun].filter(([A, y]) => A >= 69 && y > 0).map(([A, y]) => ({ x: A, y }));
    return { points, sun: sunPoints, peaks: peaksOf(pattern) };
  }, [rapid, rIndex, averaged]);
  const busiest = useMemo(() => {
    if (!rapid) return null;
    let best = 0;
    rapid.run.elements[rIndex].forEach((y, i) => {
      if (i < rapid.run.chains.length - 1 && y > rapid.run.elements[rIndex][best]) best = i;
    });
    return rapid.run.chains[best];
  }, [rapid, rIndex]);

  // ---- Captions ----
  const years = (t: number) => exposureTime(t, sDensity) / SEC_YEAR;
  let caption: string;
  if (mode === 'slow') {
    if (show === 'chart') {
      const magicNote = front && (MAGIC as readonly number[]).includes(front.N) ? `: its ${front.N} neutrons close a shell, and it catches another only rarely (σ = ${Number(front.sigma.toPrecision(2))} mb), so the flow piles up there` : '';
      caption = `After an exposure of ${formatExposure(tau)} (about ${formatYearsShort(years(tau))} at ${formatNeutronDensity(sDensity)}), each iron seed has caught ${meanCaptures.toFixed(1)} neutrons on average. ${front ? `Beyond iron, most nuclei are now ${nuclideName(front.Z, front.A)} (${front.Z} protons, ${front.N} neutrons)${magicNote}.` : ''} ${reachedBranches ? `${reachedBranches} branch point${reachedBranches === 1 ? '' : 's'} reached so far at this density.` : ''}`;
    } else {
      caption = `σN against mass number ${spread ? 'for exposures spread as the Sun’s main component (τ₀ = 0.3 per mb)' : `after an exposure of ${formatExposure(tau)}`}: it falls in steps where the path crosses N = 50, 82 and 126, and is nearly flat between them. The Sun’s s-only isotopes are scaled to the main component at samarium-150.`;
    }
  } else {
    const at = rapid!.run.times[rIndex];
    const Sa = waitingEnergy(rDensity, T) / 1000;
    const fallen = rapid!.patterns.fissioned[rIndex];
    if (show === 'chart') {
      caption = `After ${formatSeconds(at)} at ${formatNeutronDensity(rDensity)} and ${formatHotKelvin(T)}, each element’s isotopes pile up where a neutron is bound by about ${Sa.toFixed(1)} MeV, far from the valley. ${busiest ? `Most nuclei are now ${ELEMENT_NAMES[busiest.Z]}, waiting at ${nuclideName(busiest.Z, busiest.Z + busiest.waitingN)} (N = ${busiest.waitingN}${(MAGIC as readonly number[]).includes(busiest.waitingN) ? ', a magic number' : ''}) for a β decay: about ${formatHalfLife(Math.LN2 / busiest.betaRate)}.` : ''}${fallen > 0.01 ? ` ${Math.round(fallen * 100)}% have reached the heaviest elements and are taken to split.` : ''}`;
    } else {
      caption = `${averaged ? `Bursts of every length up to ${formatSeconds(at)}` : `One burst stopped at ${formatSeconds(at)}`}, decayed back to stability: ${rPattern!.peaks.length ? `peaks near A = ${rPattern!.peaks.join(', ')}` : 'no clear peaks yet'}. The Sun’s rapid-process abundances peak near 80, 130 and 195.`;
    }
  }

  const nAt = table.get(cursor.Z, cursor.N);

  return (
    <Figure
      number={number}
      title="Neutron captures step by step"
      description="An iron seed catches neutrons. In the slow process, inside red giants, a neutron arrives every few years to centuries, slower than most radioactive nuclei decay, so the path climbs the valley of stability one nucleus at a time, from iron to lead and bismuth. It piles up at nuclei with magic numbers of neutrons, 50, 82 and 126, which hardly catch neutrons: the product of cross section and abundance falls in steps there. In the rapid process, in merging neutron stars, neutrons arrive in milliseconds, the path runs far out on the neutron-rich side and waits at the magic numbers, and decaying back it leaves peaks near masses 80, 130 and 195."
      height={980}
      tryThis={tryThis}
      onReset={reset}
      legend={
        show === 'chart'
          ? [
              { label: 'few nuclei', symbol: <rect x="-7" y="-7" width="14" height="14" fill={amountColour(0, dark)} /> },
              { label: 'many nuclei', symbol: <rect x="-7" y="-7" width="14" height="14" fill={amountColour(1, dark)} /> },
              { label: 'stable nuclei', symbol: <rect x="-7" y="-7" width="14" height="14" fill="var(--border)" /> },
              ...(mode === 'slow'
                ? [{ label: 'branch point: decay and capture compete', symbol: <rect x="-7" y="-7" width="14" height="14" fill="none" stroke="var(--text-warm)" strokeWidth="2.5" /> }]
                : [{ label: 'the waiting points', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-warm)" strokeWidth="2.5" /> }]),
            ]
          : [
              { label: mode === 'slow' ? 'σN, this run' : 'this run, decayed back (smoothed over five masses)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-1)" strokeWidth="3" /> },
              { label: mode === 'slow' ? 'the Sun’s s-only isotopes' : 'the Sun’s rapid-process abundances', symbol: <circle r="4" fill="var(--series-2)" /> },
            ]
      }
      simplified={
        mode === 'slow' ? (
          <p>
            A single neutron density and kT = 30 keV throughout, with laboratory half-lives (some change in a star’s heat: lutetium-176’s
            short-lived excited state, which feeds hafnium-176 in stars, is left out, so hafnium-176 gets none). Real s-process sites are red
            giants’ pulses at 10⁷–10¹¹ neutrons per cm³ and 8–30 keV. Cross sections from KADoNiS, estimated from neighbours for 2 stable and
            some short-lived nuclei. Iron is the only seed, so the weak component below A = 90, made in massive stars, is short; and lead-208,
            half of whose s-process share comes from stars poor in metals, is short by half.
          </p>
        ) : (
          <p>
            A toy, and labelled one. Each element’s isotopes are held in the (n,γ) ⇌ (γ,n) balance at a fixed neutron density and temperature,
            without partition functions; masses far from stability come from the course’s own mass formula, and unmeasured β half-lives from a
            rule fitted to measured ones (good to a factor of three or so). No fission, no β-delayed neutrons and no late captures as the
            neutrons run out: those smooth the real pattern. This one leaves one isotope per element, a comb, so it is drawn smoothed over five mass numbers. Its first peak is much weaker than the Sun’s: one set of conditions can’t make the whole pattern, and real events differ. Real r-process events last about a second; with
            this toy’s slow waiting points the flow takes about 20.
          </p>
        )
      }
    >
      <div ref={wrap}>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Process">
            <button type="button" aria-pressed={mode === 'slow'} onClick={() => switchMode('slow')}>
              The slow process
            </button>
            <button type="button" aria-pressed={mode === 'rapid'} onClick={() => switchMode('rapid')}>
              The rapid process (a toy)
            </button>
          </span>
          <span className={figureStyles.segmented} role="group" aria-label="Show">
            <button type="button" aria-pressed={show === 'chart'} onClick={() => setShow('chart')}>
              On the chart
            </button>
            <button type="button" aria-pressed={show === 'pattern'} onClick={() => setShow('pattern')}>
              The pattern
            </button>
          </span>
          <button type="button" className={figureStyles.toolButton} onClick={() => setPlaying(!playing)} aria-pressed={playing}>
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
        <div className={styles.controls}>
          {mode === 'slow' ? (
            <>
              <Slider label="Neutron exposure" value={tau} min={0} max={4} step={0.01} format={(t) => `${formatExposure(t)} (${formatYearsShort(years(t))})`} onChange={setTau} />
              <Slider label="Neutron density" value={sDensity} min={1e7} max={1e11} log step={0.1} format={formatNeutronDensity} onChange={setSDensity} />
            </>
          ) : (
            <>
              <Slider label="Time" value={time} min={0} max={R_DURATION} step={0.05} format={formatSeconds} onChange={setTime} />
              <Slider label="Neutron density" value={rDensity} min={1e20} max={1e28} log step={0.1} format={formatNeutronDensity} onChange={setRDensity} />
              <Slider label="Temperature" value={T} min={1e9} max={2e9} step={0.05e9} format={formatHotKelvin} onChange={setT} />
            </>
          )}
        </div>
        {show === 'pattern' && (
          <div className={styles.toggles} style={{ marginBottom: 8 }}>
            {mode === 'slow' ? (
              <button type="button" className={styles.toggle} aria-pressed={spread} onClick={() => setSpread(!spread)}>
                Exposures spread as in the Sun
              </button>
            ) : (
              <button type="button" className={styles.toggle} aria-pressed={averaged} onClick={() => setAveraged(!averaged)}>
                Bursts of every length
              </button>
            )}
          </div>
        )}

        {show === 'chart' ? (
          <div className={figureStyles.withSide}>
            <ChartOfNuclides
              cells={mode === 'slow' ? sCells : rCells}
              view={view}
              onView={setView}
              cursor={cursor}
              onCursor={setCursor}
              lines={mode === 'rapid' ? rLines : []}
              bounds={mode === 'slow' ? S_BOUNDS : R_BOUNDS}
              ariaLabel={mode === 'slow' ? 'The slow process on the chart of nuclides, from iron to bismuth' : 'The rapid process on the chart of nuclides, far on the neutron-rich side'}
              cursorText={nAt ? `${nuclideName(nAt.Z, nAt.A)}` : `${cursor.Z} protons, ${cursor.N} neutrons`}
            />
            <div className={figureStyles.side}>
              <div className={styles.card}>
                <p className={styles.cardTitle}>
                  Under the cursor: {cursor.Z > 0 ? nuclideName(cursor.Z, cursor.Z + cursor.N) : 'neutrons'} <span className={styles.cardSubtitle}>{nuclideSymbol(cursor.Z, cursor.Z + cursor.N)}</span>
                </p>
                <dl className={styles.facts}>
                  <div>
                    <dt>Half-life</dt>
                    <dd>{nAt ? formatHalfLife(nAt.halfLife, nAt.halfLifeBound) : 'not known'}</dd>
                  </div>
                  {mode === 'slow' && (
                    <SlowFacts Z={cursor.Z} N={cursor.N} Y={Y} density={sDensity} reached={reached.has(cursor.Z * 1000 + cursor.N)} />
                  )}
                </dl>
              </div>
              {mode === 'slow' && branches.length > 0 && (
                <p className={figureStyles.note}>
                  Branch points at {formatNeutronDensity(sDensity)}:{' '}
                  {branches
                    .filter((b) => reached.has(b.Z * 1000 + b.N))
                    .slice(0, 8)
                    .map((b) => `${b.symbol} (${Math.round(b.decayShare * 100)}% decay)`)
                    .join(', ') || 'none reached yet'}
                  .
                </p>
              )}
            </div>
          </div>
        ) : mode === 'slow' && sPattern ? (
          <ProfilePlot
            hideLegend
            series={[{ name: 'σN', color: 'var(--series-1)', points: sPattern.points }]}
            xMin={56}
            xMax={210}
            formatX={(x) => String(Math.round(x))}
            xLabel="Mass number A"
            yLabel="σN, mb per seed (log scale)"
            yScale="log"
            yMin={1e-4}
            yMax={10}
            formatValue={(y) => (y > 0 ? `${Number(y.toPrecision(2))} mb` : 'none')}
            cursor={sCursor}
            onCursor={(x) => setSCursor(Math.round(x))}
            cursorText={(x) => `A = ${Math.round(x)}`}
            ariaLabel="σN against mass number for the slow process, falling in steps at the magic neutron numbers, with the Sun’s s-only isotopes"
            height={320}
          >
            {(sx, sy) => (
              <g>
                {[
                  [88, 'N = 50'],
                  [138, 'N = 82'],
                  [208, 'N = 126'],
                ].map(([A, label]) => (
                  <g key={label}>
                    <line x1={sx(A as number)} x2={sx(A as number)} y1={sy(10)} y2={sy(1e-4)} stroke="var(--text-muted)" strokeDasharray="3 3" />
                    <text x={sx(A as number) - 4} y={sy(5)} fontSize="11" textAnchor="end" fill="var(--text-muted)">
                      {label}
                    </text>
                  </g>
                ))}
                {sPattern.sun.map((p) => (
                  <circle key={`${p.Z}-${p.A}`} cx={sx(p.A)} cy={sy(p.y)} r={3.5} fill="var(--series-2)" />
                ))}
              </g>
            )}
          </ProfilePlot>
        ) : rPattern ? (
          <ProfilePlot
            hideLegend
            series={[{ name: 'this run', color: 'var(--series-1)', points: rPattern.points }]}
            xMin={60}
            xMax={240}
            formatX={(x) => String(Math.round(x))}
            xLabel="Mass number A"
            yLabel="Per million silicon (log; smoothed)"
            yScale="log"
            yMin={1e-3}
            yMax={100}
            formatValue={(y) => (y > 1e-3 ? Number(y.toPrecision(2)).toString() : 'none')}
            cursor={rCursor}
            onCursor={(x) => setRCursor(Math.round(x))}
            cursorText={(x) => `A = ${Math.round(x)}`}
            ariaLabel={`The pattern the rapid process leaves after decaying back, with ${rPattern.peaks.length ? `peaks near ${rPattern.peaks.join(', ')}` : 'no peaks yet'}, beside the Sun’s rapid-process abundances`}
            height={320}
          >
            {(sx, sy) => (
              <g>
                {rPattern.sun.map((p) => (
                  <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3} fill="var(--series-2)" />
                ))}
              </g>
            )}
          </ProfilePlot>
        ) : null}
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

function SlowFacts({ Z, N, Y, density, reached }: { Z: number; N: number; Y: Float64Array | null; density: number; reached: boolean }) {
  const net = sNetwork();
  const i = net.index.get(Z * 1000 + N);
  if (i === undefined) return null;
  const x = net.nuclei[i];
  const captureYears = 1 / (density * x.sigma * 1e-27 * 2.396e8) / SEC_YEAR;
  return (
    <>
      <div>
        <dt>Catches a neutron</dt>
        <dd>
          every {formatYearsShort(captureYears)} (σ = {Number(x.sigma.toPrecision(3))} mb{x.measured ? '' : ', estimated'})
        </dd>
      </div>
      <div>
        <dt>Abundance</dt>
        <dd>{Y && reached ? `${formatShareOfSeeds(Y[i])} of the seeds` : 'none yet'}</dd>
      </div>
    </>
  );
}

const formatShareOfSeeds = (y: number) => (y >= 0.01 ? `${Math.round(y * 100)}%` : `${powerOfTen(Math.floor(Math.log10(y)))} or so`);

function formatYearsShort(y: number): string {
  if (y < 1) return `${Number((y * 365.25).toPrecision(2))} days`;
  if (y < 1e4) return `${Number(y.toPrecision(2)).toLocaleString('en-GB')} years`;
  if (y < 1e6) return `${Number((y / 1000).toPrecision(2))} thousand years`;
  return `${Number((y / 1e6).toPrecision(2))} million years`;
}

function formatSeconds(t: number): string {
  if (t < 1) return `${Number((t * 1000).toPrecision(2))} ms`;
  return `${Number(t.toPrecision(3))} s`;
}

function nearestTime(times: readonly number[], t: number): number {
  let best = 0;
  times.forEach((x, i) => {
    if (Math.abs(x - t) < Math.abs(times[best] - t)) best = i;
  });
  return best;
}
