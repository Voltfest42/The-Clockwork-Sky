import { useId, useMemo, useState, type ReactNode } from 'react';
import { PAYNE_RANGE, PAYNE_SPECIES, payneCurve, type Abundances, type PayneId } from '../core/spectra/atmosphere';
import { spectralTypeOf } from '../core/stars/hr';
import { Caption, Figure } from '../viz/Figure';
import { formatKelvin, rgb, spectralColour } from '../viz/spectrum/format';
import { SpectrumView } from '../viz/spectrum/SpectrumView';
import { amountLabel, AMOUNTS, DIALS, describeModel, modelSpectrum, nearestRealStar, realSpectrum, SPECTRUM_FROM, SPECTRUM_TO, strongestLines } from './spectra';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Make a spectrum (Figure 12.3): temperature and make-up in, spectrum out,
 * from the toy atmosphere of core/spectra (Saha and Boltzmann at one layer).
 * Drag the temperature through the classes and watch the lines come and go;
 * change an element's amount. A real star of the nearest class from the
 * X-shooter Spectral Library sits beside the model. The second view shows
 * Payne's curves: how strong each kind of line is at each temperature.
 */

const LOG_MIN = Math.log10(2600);
const LOG_MAX = Math.log10(40000);
const START = Math.log10(5772);

const CLASSES = [
  { letter: 'O', kelvin: 35000 },
  { letter: 'B', kelvin: 20000 },
  { letter: 'A', kelvin: 9500 },
  { letter: 'F', kelvin: 6700 },
  { letter: 'G', kelvin: 5772 },
  { letter: 'K', kelvin: 4500 },
  { letter: 'M', kelvin: 3400 },
] as const;

/** The classes' temperature ranges on the main sequence (K), for the strip along Payne's curves. */
const CLASS_EDGES = [
  { letter: 'O', from: 30000, to: 50000 },
  { letter: 'B', from: 10000, to: 30000 },
  { letter: 'A', from: 7300, to: 10000 },
  { letter: 'F', from: 6000, to: 7300 },
  { letter: 'G', from: 5300, to: 6000 },
  { letter: 'K', from: 3900, to: 5300 },
  { letter: 'M', from: 2500, to: 3900 },
];

const SPECIES_STYLE: Record<PayneId, { color: string; dash?: string }> = {
  'H I': { color: '#ef4444' },
  'He I': { color: '#3b82f6' },
  'He II': { color: '#8b5cf6', dash: '6 3' },
  'Mg II': { color: '#14b8a6', dash: '2 3' },
  'Fe II': { color: '#a3a3a3', dash: '6 3' },
  'Ca II': { color: '#f59e0b' },
  'Fe I': { color: '#a3a3a3' },
  'Ca I': { color: '#f59e0b', dash: '2 3' },
  TiO: { color: '#ec4899' },
};

export function MakeSpectrumFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [logT, setLogT] = useState(START);
  const [view, setView] = useState<'spectrum' | 'payne'>('spectrum');
  const [abundances, setAbundances] = useState<Abundances>({});
  const [showReal, setShowReal] = useState(true);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const kelvin = 10 ** logT;
  const reset = () => {
    setLogT(START);
    setView('spectrum');
    setAbundances({});
    setShowReal(true);
  };

  const model = useMemo(() => modelSpectrum(kelvin, abundances), [kelvin, abundances]);
  const real = nearestRealStar(kelvin, abundances.Fe ?? 1);
  const realPoints = useMemo(() => realSpectrum(real.id), [real.id]);
  const labels = useMemo(() => strongestLines(kelvin, abundances), [kelvin, abundances]);
  const type = spectralTypeOf(kelvin);
  const noIron = abundances.Fe === 0 && Object.keys(abundances).length === 1;

  const W = 640;
  const sx = (nm: number) => 52 + ((nm - SPECTRUM_FROM) / (SPECTRUM_TO - SPECTRUM_FROM)) * (W - 66);

  return (
    <Figure
      number={number}
      title="Make a spectrum"
      description="A model star’s spectrum, worked out from its temperature and make-up: a black body’s smooth glow with dark lines taken out by hydrogen, helium, sodium, magnesium, calcium, iron and titanium oxide, each as strong as Saha’s and Boltzmann’s laws say at that temperature. Drag the temperature from 2,600 K to 40,000 K and watch the lines change, through the classes O, B, A, F, G, K and M. Change any element’s amount. A real star of the nearest class is drawn beside the model. A second view shows Payne’s curves: how strong each kind of line is at each temperature."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      legend={
        view === 'spectrum'
          ? [
              { label: 'the model star', symbol: <rect x="-9" y="-6" width="18" height="12" fill="#f59e0b" opacity="0.5" stroke="var(--series-1)" /> },
              { label: 'a real star of the nearest class (X-shooter Spectral Library)', symbol: <line x1="-10" x2="10" stroke="var(--text)" strokeWidth="1.5" strokeDasharray="4 2" /> },
              { label: 'the model’s lines as a photograph would show them', symbol: <rect x="-9" y="-5" width="18" height="10" fill="#22c55e" /> },
            ]
          : PAYNE_SPECIES.map((s) => ({ label: s.label, symbol: <line x1="-10" x2="10" stroke={SPECIES_STYLE[s.id].color} strokeWidth="2.5" strokeDasharray={SPECIES_STYLE[s.id].dash} /> }))
      }
      simplified={
        <p>
          The model is one layer of gas at one temperature and a main-sequence star’s pressure, with fifty of the strongest lines and a sketch of
          titanium oxide’s bands. Real stars have layers at different temperatures, thousands of lines, and lines widened by pressure and spin,
          so the model gets where lines come and go right but not their exact depths. Real spectra are drawn beside it for honesty; they are not
          corrected for dust, which reddens the hottest ones a little.
        </p>
      }
    >
      <div className={styles.controls}>
        <label className={styles.slider}>
          Temperature
          <input
            type="range"
            min={LOG_MIN}
            max={LOG_MAX}
            step={0.002}
            value={logT}
            onChange={(e) => setLogT(Number(e.target.value))}
            aria-valuetext={`${formatKelvin(kelvin)}, class ${type}`}
          />
          <output>
            {formatKelvin(kelvin)} · {type}
          </output>
        </label>
        <div className={styles.toggles} role="group" aria-label="Jump to a class">
          <span className={styles.togglesLabel}>Class:</span>
          {CLASSES.map((c) => (
            <button key={c.letter} type="button" className={styles.toggle} aria-pressed={type.startsWith(c.letter)} onClick={() => setLogT(Math.log10(c.kelvin))}>
              {c.letter}
            </button>
          ))}
        </div>
        <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
          <div className={figureStyles.segmented} role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'spectrum'} onClick={() => setView('spectrum')}>
              Spectrum
            </button>
            <button type="button" aria-pressed={view === 'payne'} onClick={() => setView('payne')}>
              Payne’s curves
            </button>
          </div>
          {view === 'spectrum' && (
            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={showReal} onChange={(e) => setShowReal(e.target.checked)} />
              Show a real star
            </label>
          )}
          <button type="button" className={figureStyles.toolButton} aria-pressed={noIron} onClick={() => (noIron ? setAbundances({}) : (setAbundances({ Fe: 0 }), setLogT(START)))}>
            Make the Sun without iron
          </button>
        </div>
        <div className={styles.toggles} role="group" aria-label="How much of each element">
          <span className={styles.togglesLabel}>Make-up:</span>
          {DIALS.map((d) => (
            <label key={d.symbol} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: '0.82rem' }}>
              {d.name}
              <select
                value={abundances[d.symbol] ?? 1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAbundances((a) => {
                    const next = { ...a };
                    if (v === 1) delete next[d.symbol];
                    else next[d.symbol] = v;
                    return next;
                  });
                }}
              >
                {AMOUNTS.map((x) => (
                  <option key={x} value={x}>
                    {amountLabel(x)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {view === 'spectrum' ? (
        <>
          <SpectrumView
            min={SPECTRUM_FROM * 1e-9}
            max={SPECTRUM_TO * 1e-9}
            scale="linear"
            plotHeight={200}
            curves={[
              { id: 'model', label: 'Model', color: 'var(--series-1)', points: model.points, rainbow: true },
              ...(showReal ? [{ id: 'real', label: real.name, color: 'var(--text)', points: realPoints, dashed: true }] : []),
            ]}
            y={{ scale: 'linear', min: 0, max: 1.12, label: 'Brightness', format: () => '' }}
            markers={labels.map(({ line }) => ({ at: line.nm * 1e-9, label: line.name, color: 'var(--text-muted)', dashed: true }))}
            ariaLabel={`The model spectrum at ${formatKelvin(kelvin)}${showReal ? `, with ${real.name}’s` : ''}`}
          />
          <svg viewBox={`0 0 ${W} 34`} className={seasonStyles.svgLight} role="img" aria-label="The model’s spectrum as a photograph: a rainbow with its dark lines">
            <defs>
              <linearGradient id={`strip${uid}`} x1="0" x2="1">
                {Array.from({ length: 38 }, (_, i) => SPECTRUM_FROM + (i * (SPECTRUM_TO - SPECTRUM_FROM)) / 37).map((nm) => (
                  <stop key={nm} offset={(nm - SPECTRUM_FROM) / (SPECTRUM_TO - SPECTRUM_FROM)} stopColor={rgb(spectralColour(nm))} />
                ))}
              </linearGradient>
            </defs>
            <rect x={sx(SPECTRUM_FROM)} y={4} width={sx(SPECTRUM_TO) - sx(SPECTRUM_FROM)} height={26} fill={`url(#strip${uid})`} />
            {model.depth
              .filter(([, d]) => d > 0.04)
              .map(([nm, d]) => (
                <rect key={nm} x={sx(nm) - 0.6} y={4} width={1.6} height={26} fill="#000" opacity={Math.min(1, d * 1.1)} />
              ))}
          </svg>
        </>
      ) : (
        <PayneCurves kelvin={kelvin} />
      )}
      <Caption>
        {describeModel(kelvin, abundances)}
        {view === 'spectrum' && showReal ? ` Beside it: ${real.name}, class ${real.spectralClass}, ${real.note}.` : ''}
      </Caption>
    </Figure>
  );
}

function PayneCurves({ kelvin }: { kelvin: number }) {
  const curves = useMemo(() => PAYNE_SPECIES.map((s) => ({ ...s, points: payneCurve(s.id) })), []);
  const rows = useMemo(() => labelRows(curves.map((c) => c.points.reduce((a, b) => (b[1] > a[1] ? b : a))[0])), [curves]);
  const W = 640;
  const H = 300;
  const left = 44;
  const right = 16;
  const top = 30;
  const bottom = 40;
  const [lo, hi] = PAYNE_RANGE;
  const sx = (t: number) => left + ((Math.log10(hi) - Math.log10(t)) / (Math.log10(hi) - Math.log10(lo))) * (W - left - right);
  const sy = (v: number) => top + (1 - v) * (H - top - bottom);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svgLight} role="img" aria-label={`Payne’s curves: hydrogen’s lines peak near 10,000 K, neutral helium’s near 18,000 K, ionised helium’s above 35,000 K, ionised calcium’s near 5,500 K, neutral iron’s near 4,200 K and titanium oxide’s in the coolest stars. The current temperature, ${formatKelvin(kelvin)}, is marked.`}>
      {CLASS_EDGES.map((c, i) => (
        <g key={c.letter}>
          <rect x={sx(c.to)} y={top - 22} width={sx(c.from) - sx(c.to)} height={16} fill={i % 2 ? 'var(--surface)' : 'var(--bg)'} stroke="var(--border)" />
          <text x={(sx(c.to) + sx(c.from)) / 2} y={top - 10} fontSize="11.5" fontWeight="700" textAnchor="middle" fill="var(--text)">
            {c.letter}
          </text>
        </g>
      ))}
      <line x1={left} x2={W - right} y1={sy(0)} y2={sy(0)} stroke="var(--border)" />
      {[40000, 20000, 10000, 6000, 4000, 3000].map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={sy(0)} y2={sy(0) + 5} stroke="var(--text-muted)" />
          <text x={sx(t)} y={sy(0) + 17} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
            {t.toLocaleString('en-GB')} K
          </text>
        </g>
      ))}
      <text x={W / 2} y={H - 6} fontSize="11.5" fontWeight="600" textAnchor="middle" fill="var(--text)">
        Surface temperature: ← hotter · cooler →
      </text>
      <text transform={`translate(14 ${(top + H - bottom) / 2}) rotate(-90)`} fontSize="11.5" fontWeight="600" textAnchor="middle" fill="var(--text)">
        Line strength (each to its peak)
      </text>
      {curves.map((c, i) => {
        const style = SPECIES_STYLE[c.id];
        const peak = c.points.reduce((a, b) => (b[1] > a[1] ? b : a));
        return (
          <g key={c.id}>
            <path d={c.points.map(([t, v], i) => `${i ? 'L' : 'M'}${sx(t).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')} fill="none" stroke={style.color} strokeWidth="2.2" strokeDasharray={style.dash} />
            <text x={Math.min(W - right - 30, Math.max(left + 20, sx(peak[0])))} y={sy(1) + 12 + rows[i] * 14} fontSize="10.5" fontWeight="600" textAnchor="middle" fill="var(--text)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">
              {c.id}
            </text>
          </g>
        );
      })}
      <line x1={sx(kelvin)} x2={sx(kelvin)} y1={sy(1.04)} y2={sy(0)} stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

/** Rows for labels at the curves' peaks (K), so labels closer than about 12% in temperature don't overlap. */
function labelRows(peaks: number[]): number[] {
  const order = peaks.map((p, i) => [p, i] as const).sort((a, b) => a[0] - b[0]);
  const last: number[] = [];
  const rows = new Array<number>(peaks.length).fill(0);
  for (const [p, i] of order) {
    let row = 0;
    while (last[row] !== undefined && Math.abs(Math.log10(p / last[row])) < 0.05) row++;
    last[row] = p;
    rows[i] = row;
  }
  return rows;
}
