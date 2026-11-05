import { useMemo, useState, type ReactNode } from 'react';
import { liquidDropTerms, massesWithModel, valleyZ } from '../core/nuclear/liquidDrop';
import { MASS_EXCESS_H, MASS_EXCESS_N, mainKind, mostBoundByMass, type Nuclide } from '../core/nuclear/nuclides';
import { Caption, Figure } from '../viz/Figure';
import { ChartOfNuclides, type ChartLine } from '../viz/nuclides/ChartOfNuclides';
import { viewAround, type ChartView } from '../viz/nuclides/view';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import {
  bindingColour,
  bindingPerNucleon,
  BINDING_RANGE,
  DECAY_COLOURS,
  DECAY_NAMES,
  DECAY_WORDS,
  ELEMENT_NAMES,
  FAMOUS,
  formatHalfLife,
  formatMeV,
  formatPerHydrogen,
  halfLifeColour,
  massModel,
  nuclideName,
  nuclides,
  nuclideSymbol,
  sequential,
  solarLogEps,
} from './elements';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The chart of nuclides (Figure 23.1): every known nucleus by its protons and
 * neutrons, coloured by half-life, decay or binding energy per nucleon, with
 * the magic numbers, the valley of stability and the predicted drip lines; a
 * card for the nucleus under the cursor. A second view draws the binding
 * energy per nucleon against mass number, measured and from the liquid drop,
 * and splits the drop into its terms.
 */

type Layer = 'half-life' | 'decay' | 'binding';
type View = 'chart' | 'curve';

const BOUNDS: ChartView = { nMin: 0, nMax: 178, zMin: 0, zMax: 118 };
const VIEWS: readonly { id: string; name: string; view: ChartView }[] = [
  { id: 'all', name: 'Everything', view: { nMin: 0, nMax: 178, zMin: 0, zMax: 118 } },
  { id: 'light', name: 'Up to calcium', view: viewAround(14, 12, 30, BOUNDS) },
  { id: 'iron', name: 'Around iron', view: viewAround(30, 26, 26, BOUNDS) },
  { id: 'heavy', name: 'The heaviest', view: viewAround(140, 88, 64, BOUNDS) },
];
const START = { layer: 'decay' as Layer, view: 'chart' as View, cursor: { Z: 26, N: 30 }, chartView: VIEWS[0].view, magic: true, valley: false, drip: false, terms: false, A: 56 };

export function NuclidesFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [layer, setLayer] = useState<Layer>(START.layer);
  const [view, setView] = useState<View>(START.view);
  const [cursor, setCursor] = useState(START.cursor);
  const [chartView, setChartView] = useState<ChartView>(START.chartView);
  const [magic, setMagic] = useState(START.magic);
  const [valley, setValley] = useState(START.valley);
  const [drip, setDrip] = useState(START.drip);
  const [terms, setTerms] = useState(START.terms);
  const [A, setA] = useState(START.A);
  const reset = () => {
    setLayer(START.layer);
    setView(START.view);
    setCursor(START.cursor);
    setChartView(START.chartView);
    setMagic(START.magic);
    setValley(START.valley);
    setDrip(START.drip);
    setTerms(START.terms);
    setA(START.A);
  };

  const table = nuclides();
  const cells = useMemo(
    () =>
      table.list.map((n) => ({
        Z: n.Z,
        N: n.N,
        colour:
          layer === 'decay'
            ? DECAY_COLOURS[mainKind(n)]
            : layer === 'half-life'
              ? n.halfLife === Infinity
                ? 'var(--text)'
                : n.halfLife === null
                  ? '#b8b8b0'
                  : halfLifeColour(n.halfLife)
              : n.massExcess === null || n.Z === 0
                ? '#b8b8b0'
                : bindingColour(bindingPerNucleon(n)!),
      })),
    [table, layer],
  );
  const lines = useMemo(() => {
    const out: ChartLine[] = [];
    if (valley) out.push({ points: valleyLine(), colour: 'var(--text-warm)', width: 2.5, label: 'valley of stability' });
    if (drip) {
      const d = dripLines();
      out.push({ points: d.neutron, colour: 'var(--accent)', width: 2, dashed: true, label: 'neutron drip line (predicted)' });
      out.push({ points: d.proton, colour: 'var(--accent)', width: 2, dashed: true, label: 'proton drip line' });
    }
    return out;
  }, [valley, drip]);

  const n = table.get(cursor.Z, cursor.N);
  const A0 = cursor.Z + cursor.N;
  const caption = view === 'chart' ? chartCaption(n, cursor, layer) : curveCaption(A, terms);
  const known = table.list.length;
  const stable = table.list.filter((x) => x.halfLife === Infinity).length;

  return (
    <Figure
      number={number}
      title="The chart of nuclides"
      description={`Every known nucleus, ${known.toLocaleString('en-GB')} of them, as a square on a chart of neutrons (across) against protons (up). Only ${stable} are stable, in a narrow valley that starts along the diagonal and bends towards extra neutrons in heavy nuclei; the rest decay, by beta decay on either side of the valley and by alpha decay or fission among the heaviest. Lines mark the magic numbers of protons and neutrons, 2, 8, 20, 28, 50, 82 and 126, which make nuclei extra stable. A second view draws the binding energy per nucleon against mass, rising to a peak at iron and nickel and falling beyond.`}
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={
        view === 'curve'
          ? [
              { label: 'measured: the most tightly bound nucleus of each mass', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-1)" strokeWidth="3" /> },
              { label: 'the liquid drop', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2.5" strokeDasharray="5 3" /> },
            ]
          : layer === 'decay'
            ? (['stable', 'beta-minus', 'beta-plus', 'alpha', 'proton', 'neutron', 'fission', 'unknown'] as const).map((k) => ({
                label: DECAY_NAMES[k],
                symbol: <rect x="-7" y="-7" width="14" height="14" fill={DECAY_COLOURS[k]} />,
              }))
            : layer === 'half-life'
              ? [
                  { label: 'stable', symbol: <rect x="-7" y="-7" width="14" height="14" fill="var(--text)" /> },
                  { label: 'a microsecond or less', symbol: <rect x="-7" y="-7" width="14" height="14" fill={sequential(0)} /> },
                  { label: 'a second', symbol: <rect x="-7" y="-7" width="14" height="14" fill={halfLifeColour(1)} /> },
                  { label: 'a year', symbol: <rect x="-7" y="-7" width="14" height="14" fill={halfLifeColour(3.156e7)} /> },
                  { label: 'a billion years or more', symbol: <rect x="-7" y="-7" width="14" height="14" fill={sequential(1)} /> },
                  { label: 'not measured', symbol: <rect x="-7" y="-7" width="14" height="14" fill="#b8b8b0" /> },
                ]
              : [
                  { label: `${BINDING_RANGE[0] / 1000} MeV per nucleon or less`, symbol: <rect x="-7" y="-7" width="14" height="14" fill={sequential(0)} /> },
                  { label: '8 MeV', symbol: <rect x="-7" y="-7" width="14" height="14" fill={bindingColour(8000)} /> },
                  { label: `${BINDING_RANGE[1] / 1000} MeV, the iron peak`, symbol: <rect x="-7" y="-7" width="14" height="14" fill={sequential(1)} /> },
                ]
      }
      simplified={
        <p>
          Ground states only: the 1,900 or so long-lived excited states (isomers) are left out. Masses are AME2020’s, a quarter of them
          extrapolated from their neighbours’ trends rather than measured, and the card says which. The predicted drip line comes from the
          course’s own mass formula (the liquid drop with a shell correction, fitted to the measured masses, good to about 2 MeV): real
          predictions differ by ten neutrons or more, and the neutron drip line has been reached only up to neon.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Show">
          <button type="button" aria-pressed={view === 'chart'} onClick={() => setView('chart')}>
            The chart
          </button>
          <button type="button" aria-pressed={view === 'curve'} onClick={() => setView('curve')}>
            The binding curve
          </button>
        </span>
        {view === 'chart' && (
          <span className={figureStyles.segmented} role="group" aria-label="Colour by">
            {(
              [
                ['decay', 'Decay'],
                ['half-life', 'Half-life'],
                ['binding', 'Binding energy'],
              ] as const
            ).map(([id, name]) => (
              <button key={id} type="button" aria-pressed={layer === id} onClick={() => setLayer(id)}>
                {name}
              </button>
            ))}
          </span>
        )}
      </div>

      {view === 'chart' ? (
        <div className={figureStyles.withSide}>
          <div>
            <div className={styles.toggles} style={{ marginBottom: 8 }}>
              <span className={styles.togglesLabel}>Mark</span>
              <button type="button" className={styles.toggle} aria-pressed={magic} onClick={() => setMagic(!magic)}>
                Magic numbers
              </button>
              <button type="button" className={styles.toggle} aria-pressed={valley} onClick={() => setValley(!valley)}>
                Valley of stability
              </button>
              <button type="button" className={styles.toggle} aria-pressed={drip} onClick={() => setDrip(!drip)}>
                Drip lines
              </button>
            </div>
            <ChartOfNuclides
              cells={cells}
              view={chartView}
              onView={setChartView}
              cursor={cursor}
              onCursor={setCursor}
              lines={lines}
              magic={magic}
              bounds={BOUNDS}
              ariaLabel={`The chart of nuclides, coloured by ${layer === 'decay' ? 'how each nucleus decays' : layer === 'half-life' ? 'half-life' : 'binding energy per nucleon'}`}
              cursorText={cursorSummary(n, cursor)}
            />
            <div className={styles.toggles} style={{ marginTop: 8 }}>
              <span className={styles.togglesLabel}>View</span>
              {VIEWS.map((v) => (
                <button key={v.id} type="button" className={styles.toggle} aria-pressed={sameView(chartView, v.view)} onClick={() => setChartView(v.view)}>
                  {v.name}
                </button>
              ))}
            </div>
          </div>
          <div className={figureStyles.side}>
            <label className={styles.slider}>
              Go to
              <select style={{ flex: 1, minWidth: 0 }}
                value={FAMOUS.find((f) => f.Z === cursor.Z && f.A === A0) ? `${cursor.Z}-${A0}` : ''}
                onChange={(e) => {
                  const f = FAMOUS.find((x) => `${x.Z}-${x.A}` === e.target.value);
                  if (!f) return;
                  setCursor({ Z: f.Z, N: f.A - f.Z });
                  const cols = chartView.nMax - chartView.nMin + 1;
                  setChartView(viewAround(f.A - f.Z, f.Z, Math.min(cols, 40), BOUNDS));
                }}
              >
                <option value="">Choose a nucleus</option>
                {FAMOUS.map((f) => (
                  <option key={`${f.Z}-${f.A}`} value={`${f.Z}-${f.A}`}>
                    {nuclideSymbol(f.Z, f.A)}, {nuclideName(f.Z, f.A)}
                  </option>
                ))}
              </select>
            </label>
            <NuclideCard n={n} cursor={cursor} />
            {FAMOUS.find((f) => f.Z === cursor.Z && f.A === A0) && (
              <p className={figureStyles.note} style={{ margin: 0 }}>
                {capitalise(FAMOUS.find((f) => f.Z === cursor.Z && f.A === A0)!.why)}.
              </p>
            )}
          </div>
        </div>
      ) : (
        <BindingCurve A={A} setA={setA} terms={terms} setTerms={setTerms} />
      )}
      <Caption>{caption}</Caption>
    </Figure>
  );
}

const sameView = (a: ChartView, b: ChartView) => a.nMin === b.nMin && a.nMax === b.nMax && a.zMin === b.zMin && a.zMax === b.zMax;

function NuclideCard({ n, cursor }: { n: Nuclide | undefined; cursor: { Z: number; N: number } }) {
  const A = cursor.Z + cursor.N;
  if (!n) {
    return (
      <div className={styles.card}>
        <p className={styles.cardTitle}>
          {cursor.Z === 0 ? `${cursor.N} neutrons` : `${ELEMENT_NAMES[cursor.Z] ?? 'element ' + cursor.Z}-${A}`} <span className={styles.cardSubtitle}>({cursor.Z} protons, {cursor.N} neutrons)</span>
        </p>
        <p className={figureStyles.note} style={{ margin: '6px 0 0' }}>
          Not known: nobody has made or seen this nucleus{cursor.N > cursor.Z * 1.6 + 10 ? ', and it may be past the neutron drip line, unbound' : ''}.
        </p>
      </div>
    );
  }
  const b = bindingPerNucleon(n);
  const sun = solarLogEps(n.Z);
  const sunShare = sun && n.abundance !== null ? sun.value + Math.log10(n.abundance / 100) : null;
  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>
        {n.Z === 0 ? 'The neutron' : capitalise(nuclideName(n.Z, n.A))} <span className={styles.cardSubtitle}>{nuclideSymbol(n.Z, n.A)}</span>
      </p>
      <dl className={styles.facts}>
        <div>
          <dt>Protons, neutrons</dt>
          <dd>
            {n.Z}, {n.N}
          </dd>
        </div>
        <div>
          <dt>Half-life</dt>
          <dd>{formatHalfLife(n.halfLife, n.halfLifeBound)}</dd>
        </div>
        <div>
          <dt>Decay</dt>
          <dd>
            {n.halfLife === Infinity
              ? 'none'
              : n.decays
                  .filter((d) => d.kind !== 'stable')
                  .map((d) => `${DECAY_WORDS[d.kind]}${d.share !== null && d.share < 100 ? ` (${Number(d.share.toPrecision(3))}%)` : ''}`)
                  .join('; ') || 'not known'}
          </dd>
        </div>
        {b !== null && n.Z > 0 && (
          <div>
            <dt>Binding</dt>
            <dd>
              {formatMeV(b)} per nucleon{n.fromSystematics ? ' (estimated)' : ''}
            </dd>
          </div>
        )}
        {n.massExcess !== null && (
          <div>
            <dt>Mass</dt>
            <dd>
              {(n.A + n.massExcess / 931_494.102_42).toFixed(n.fromSystematics ? 3 : 5)} u{n.fromSystematics ? ', from its neighbours’ trend' : ''}
            </dd>
          </div>
        )}
        {n.abundance !== null && (
          <div>
            <dt>On Earth</dt>
            <dd>
              {Number(n.abundance.toPrecision(3))}% of {ELEMENT_NAMES[n.Z]}
            </dd>
          </div>
        )}
        {sunShare !== null && (
          <div>
            <dt>In the Sun</dt>
            <dd>{formatPerHydrogen(sunShare)}</dd>
          </div>
        )}
        {n.spin && (
          <div>
            <dt>Spin, parity</dt>
            <dd>{n.spin}</dd>
          </div>
        )}
        {n.discovered !== null && (
          <div>
            <dt>Found</dt>
            <dd>{n.discovered}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function cursorSummary(n: Nuclide | undefined, cursor: { Z: number; N: number }): string {
  const A = cursor.Z + cursor.N;
  if (!n) return `${cursor.Z} protons and ${cursor.N} neutrons: not known.`;
  return `${capitalise(nuclideName(n.Z, A))}, ${n.Z} protons and ${n.N} neutrons: ${n.halfLife === Infinity ? 'stable' : `half-life ${formatHalfLife(n.halfLife, n.halfLifeBound)}, ${DECAY_NAMES[mainKind(n)]}`}.`;
}

function chartCaption(n: Nuclide | undefined, cursor: { Z: number; N: number }, layer: Layer): string {
  const A = cursor.Z + cursor.N;
  if (!n) return `${cursor.Z} protons and ${cursor.N} neutrons: no such nucleus is known.`;
  const name = capitalise(nuclideName(n.Z, A));
  const magicZ = [2, 8, 20, 28, 50, 82, 126].includes(n.Z);
  const magicN = [2, 8, 20, 28, 50, 82, 126].includes(n.N);
  const magic = magicZ && magicN ? ' It is doubly magic: both its protons and its neutrons close a shell.' : magicZ || magicN ? ` Its ${magicZ ? 'protons' : 'neutrons'} close a shell (a magic number).` : '';
  const b = bindingPerNucleon(n);
  if (layer === 'binding' && b !== null && n.Z > 0) {
    return `${name}: each of its ${A} nucleons is bound by ${formatMeV(b)}${n.fromSystematics ? ' (estimated)' : ''}. The most tightly bound nucleus of all is nickel-62, at 8.795 MeV.${magic}`;
  }
  if (n.halfLife === Infinity) {
    return `${name} is stable${n.abundance !== null ? `: ${Number(n.abundance.toPrecision(3))}% of the ${ELEMENT_NAMES[n.Z]} on Earth` : ''}.${magic}`;
  }
  return `${name} ${n.halfLife === null ? 'has no measured half-life' : `has a half-life of ${formatHalfLife(n.halfLife, n.halfLifeBound)}`}: ${DECAY_WORDS[mainKind(n)]}.${magic}`;
}

// ---------- Lines ----------

let valleyCache: [number, number][] | undefined;
function valleyLine(): [number, number][] {
  valleyCache ??= Array.from({ length: 290 }, (_, i) => {
    const A = i + 1;
    const Z = valleyZ(A);
    return [A - Z, Z] as [number, number];
  });
  return valleyCache;
}

let dripCache: { neutron: [number, number][]; proton: [number, number][] } | undefined;
/** The drip lines: for each element, the last nucleus that still binds two more neutrons (or protons), from measured masses and the course's mass formula beyond. */
function dripLines() {
  if (dripCache) return dripCache;
  const table = nuclides();
  const masses = massesWithModel(table, massModel());
  const neutron: [number, number][] = [];
  const proton: [number, number][] = [];
  for (let Z = 8; Z <= 110; Z++) {
    const start = Math.round(valleyZ(2.5 * Z) > 0 ? 2.5 * Z - valleyZ(2.5 * Z) : Z);
    let N = start;
    for (let k = 0; k < 120; k++) {
      const a = masses(Z, N + 2);
      const b = masses(Z, N);
      if (a === null || b === null || b + 2 * MASS_EXCESS_N - a <= 0) break;
      N += 2;
    }
    neutron.push([N, Z]);
    let P = start;
    for (let k = 0; k < 120; k++) {
      const a = masses(Z, P - 1);
      const lower = masses(Z - 2, P - 1);
      if (a === null || lower === null || lower + 2 * MASS_EXCESS_H - a <= 0) break;
      P -= 1;
    }
    proton.push([P, Z]);
  }
  dripCache = { neutron, proton };
  return dripCache;
}

// ---------- The binding curve ----------

function BindingCurve({ A, setA, terms, setTerms }: { A: number; setA: (A: number) => void; terms: boolean; setTerms: (t: boolean) => void }) {
  const data = useMemo(() => mostBoundByMass(nuclides()), []);
  const measured = data.map((n) => ({ x: n.A, y: bindingPerNucleon(n)! / 1000 }));
  const drop = useMemo(
    () =>
      Array.from({ length: 269 }, (_, i) => {
        const a = i + 4;
        const Z = Math.round(valleyZ(a));
        return { a, t: liquidDropTerms(Z, a - Z) };
      }),
    [],
  );
  const series = terms
    ? [
        { name: 'volume', color: 'var(--series-1)', points: drop.map(({ a, t }) => ({ x: a, y: t.volume / a })) },
        { name: 'surface', color: 'var(--series-2)', points: drop.map(({ a, t }) => ({ x: a, y: t.surface / a })) },
        { name: 'repulsion (Coulomb)', color: 'var(--series-3)', points: drop.map(({ a, t }) => ({ x: a, y: t.coulomb / a })) },
        { name: 'neutron–proton imbalance', color: 'var(--text-warm)', dashed: true, points: drop.map(({ a, t }) => ({ x: a, y: t.asymmetry / a })) },
        { name: 'all together', color: 'var(--text)', points: drop.map(({ a, t }) => ({ x: a, y: (t.total - t.pairing) / a })) },
      ]
    : [
        { name: 'measured', color: 'var(--series-1)', points: measured },
        { name: 'liquid drop', color: 'var(--series-2)', dashed: true, points: drop.map(({ a, t }) => ({ x: a, y: (t.total - t.pairing) / a })) },
      ];
  // Labels, with offsets that keep the light nuclei's apart.
  const marks = [
    [2, 4, '⁴He', -12, 4],
    [6, 12, '¹²C', 14, 16],
    [8, 16, '¹⁶O', 4, -10],
    [28, 62, '⁶²Ni', 0, -10],
    [82, 208, '²⁰⁸Pb', 0, -10],
    [92, 238, '²³⁸U', 0, -10],
  ] as const;
  return (
    <div>
      <div className={styles.toggles} style={{ marginBottom: 8 }}>
        <button type="button" className={styles.toggle} aria-pressed={terms} onClick={() => setTerms(!terms)}>
          Split into the drop’s terms
        </button>
      </div>
      <ProfilePlot
        hideLegend
        series={series}
        xMin={1}
        xMax={272}
        formatX={(x) => String(Math.round(x))}
        xLabel="Mass number A (protons + neutrons)"
        yLabel={terms ? 'MeV per nucleon, each term' : 'Binding energy per nucleon, MeV'}
        yMin={terms ? -9 : 0}
        yMax={terms ? 17 : 9.5}
        formatValue={(y) => `${y.toFixed(2)} MeV`}
        cursor={A}
        onCursor={(x) => setA(Math.max(1, Math.min(272, Math.round(x))))}
        cursorText={(x) => `A = ${Math.round(x)}`}
        ariaLabel={
          terms
            ? 'The liquid drop’s terms per nucleon against mass number: the volume term holds each nucleon by 15.8 MeV; the surface costs most in light nuclei, the protons’ repulsion and the imbalance most in heavy ones'
            : 'Binding energy per nucleon against mass number: it rises steeply to 7 MeV by helium-4, to a peak of 8.8 MeV at iron and nickel, and falls slowly to 7.6 MeV at uranium'
        }
        height={320}
      >
        {(sx, sy) =>
          !terms &&
          marks.map(([Z, a, label, dx, dy]) => {
            const n = nuclides().get(Z, a - Z)!;
            const y = bindingPerNucleon(n)! / 1000;
            return (
              <g key={label}>
                <circle cx={sx(a)} cy={sy(y)} r={3.5} fill="var(--series-1)" />
                <text x={sx(a) + dx} y={sy(y) + dy} fontSize="12" textAnchor="middle" fill="var(--text)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">
                  {label}
                </text>
              </g>
            );
          })
        }
      </ProfilePlot>
    </div>
  );
}

function curveCaption(A: number, terms: boolean): string {
  const table = nuclides();
  const best = mostBoundByMass(table).find((n) => n.A === A);
  const Z = Math.round(valleyZ(A));
  const t = liquidDropTerms(Z, A - Z);
  if (terms) {
    return `At A = ${A}, the drop holds each nucleon by ${(t.volume / A).toFixed(1)} MeV, and loses ${(-t.surface / A).toFixed(1)} MeV of it to the surface, ${(-t.coulomb / A).toFixed(1)} MeV to the protons’ repulsion and ${(-t.asymmetry / A).toFixed(1)} MeV to the extra neutrons: ${((t.total - t.pairing) / A).toFixed(2)} MeV left. ${A < 56 ? 'The surface’s cost falls as nuclei grow, so binding rises.' : 'The repulsion’s cost grows with the protons, so binding falls.'}`;
  }
  if (!best) return `No nucleus of mass ${A} is known.`;
  const b = bindingPerNucleon(best)! / 1000;
  return `A = ${A}: the most tightly bound is ${nuclideName(best.Z, A)}, at ${b.toFixed(3)} MeV per nucleon; the liquid drop gives ${((t.total - t.pairing) / A).toFixed(2)} MeV. ${A < 50 ? 'Fusing lighter nuclei into it releases energy.' : A <= 66 ? 'This is the iron peak, the most tightly bound nuclei of all; nickel-62 tops it.' : 'Fusing nuclei this heavy costs energy; splitting them releases it.'}`;
}

