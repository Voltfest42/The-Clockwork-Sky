import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { meanFreePath, opacity, dominantOpacity, OPACITY_SOURCE_NAMES, textbookOpacity, type OpacitySource } from '../core/structure/opacity';
import type { Mix } from '../core/structure/eos';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { formatLength, formatOpacity, SUN_SHELLS } from './energy';
import { formatGramsPerCc, formatKelvin } from './holding';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * What blocks the light (Figure 21.2): opacity over the plane of density and
 * temperature, from the analytic fits, with the source that blocks most of
 * the light named in each region, and the Sun's insides from Model S drawn
 * across it. A second view follows the Sun from centre to surface: Model S's
 * tabulated opacity against the textbook fits and this course's refitted ones.
 */

const W = 600;
const H = 380;
const PAD = { left: 62, right: 14, top: 12, bottom: 44 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;
const LOG_T = [3.4, 8.4] as const;
/** Density range, log₁₀ g/cm³. */
const LOG_RHO = [-11, 4] as const;
const NX = 100;
const NY = 75;
const PLOT_BG = '#070b16';
const LABEL = '#e8ecf4';

/** The regions' colours (fixed, as the plot is dark in both themes), from a colour-blind-safe set. */
const SOURCE_RGB: Record<OpacitySource, [number, number, number]> = {
  electron: [86, 180, 233],
  'bound-free': [230, 159, 0],
  'free-free': [204, 121, 167],
  'h-minus': [0, 158, 115],
  molecules: [170, 170, 170],
};
const SOURCES = Object.keys(SOURCE_RGB) as OpacitySource[];

const MIXES: { id: string; name: string; mix: Mix }[] = [
  { id: 'sun', name: 'Metals like the Sun’s', mix: { X: 0.7, Z: 0.02 } },
  { id: 'poor', name: 'Few metals (a twentieth)', mix: { X: 0.75, Z: 0.001 } },
];

type View = 'map' | 'sun';
const START = {
  view: 'map' as View,
  mix: 'sun',
  at: { logT: 6.5, logRho: 0 },
  cursor: 0.5,
};

const sx = (logT: number) => PAD.left + ((logT - LOG_T[0]) / (LOG_T[1] - LOG_T[0])) * PW;
const sy = (logRho: number) => PAD.top + PH - ((logRho - LOG_RHO[0]) / (LOG_RHO[1] - LOG_RHO[0])) * PH;

/** Brightness for an opacity: the more opaque, the darker. */
function shade(kappaCgs: number): number {
  const l = Math.log10(kappaCgs);
  return Math.max(0.22, Math.min(1, 1 - ((l + 1) / 8) * 0.78));
}

interface Grid {
  source: OpacitySource[];
  kappa: number[];
  /** Each region's middle, for its label. */
  centres: {
    source: OpacitySource;
    logT: number;
    logRho: number;
    cells: number;
  }[];
}

function computeGrid(mix: Mix): Grid {
  const source: OpacitySource[] = [];
  const kappa: number[] = [];
  const sums = new Map<OpacitySource, { t: number; r: number; n: number }>();
  for (let j = 0; j < NY; j++) {
    const logRho = LOG_RHO[0] + ((j + 0.5) / NY) * (LOG_RHO[1] - LOG_RHO[0]);
    for (let i = 0; i < NX; i++) {
      const logT = LOG_T[0] + ((i + 0.5) / NX) * (LOG_T[1] - LOG_T[0]);
      const rho = 10 ** logRho * 1000;
      const T = 10 ** logT;
      const s = dominantOpacity(rho, T, mix);
      source.push(s);
      kappa.push(opacity(rho, T, mix) * 10);
      const acc = sums.get(s) ?? { t: 0, r: 0, n: 0 };
      acc.t += logT;
      acc.r += logRho;
      acc.n++;
      sums.set(s, acc);
    }
  }
  const centres = [...sums].map(([s, a]) => ({
    source: s,
    logT: a.t / a.n,
    logRho: a.r / a.n,
    cells: a.n,
  }));
  return { source, kappa, centres };
}

export function OpacityMapFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [view, setView] = useState<View>(START.view);
  const [mixId, setMixId] = useState(START.mix);
  const [at, setAt] = useState(START.at);
  const [cursor, setCursor] = useState(START.cursor);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reset = () => {
    setView(START.view);
    setMixId(START.mix);
    setAt(START.at);
    setCursor(START.cursor);
  };
  const mix = MIXES.find((m) => m.id === mixId)!.mix;
  const grid = useMemo(() => computeGrid(mix), [mix]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || view !== 'map') return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = NX;
    c.height = NY;
    const img = ctx.createImageData(NX, NY);
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        const row = NY - 1 - j; // dense at the top
        const o = (row * NX + i) * 4;
        const [r, g, b] = SOURCE_RGB[grid.source[k]];
        const f = shade(grid.kappa[k]);
        img.data[o] = r * f;
        img.data[o + 1] = g * f;
        img.data[o + 2] = b * f;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [grid, view]);

  const rho = 10 ** at.logRho * 1000;
  const T = 10 ** at.logT;
  const k = opacity(rho, T, mix);
  const src = dominantOpacity(rho, T, mix);
  const path = SUN_SHELLS.map((s) => `${sx(Math.log10(s.T)).toFixed(1)},${sy(Math.log10(s.rho / 1000)).toFixed(1)}`).join(' ');
  const marks = [0, 0.5, 0.71, 0.9, 0.99, 1].map((x) => SUN_SHELLS.reduce((b, s) => (Math.abs(s.x - x) < Math.abs(b.x - x) ? s : b)));

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const logT = LOG_T[0] + ((x - PAD.left) / PW) * (LOG_T[1] - LOG_T[0]);
    const logRho = LOG_RHO[0] + ((PAD.top + PH - y) / PH) * (LOG_RHO[1] - LOG_RHO[0]);
    setAt({
      logT: Math.min(LOG_T[1], Math.max(LOG_T[0], logT)),
      logRho: Math.min(LOG_RHO[1], Math.max(LOG_RHO[0], logRho)),
    });
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 0.5 : 0.1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setAt((a) => ({
      logT: Math.min(LOG_T[1], Math.max(LOG_T[0], a.logT + m[0])),
      logRho: Math.min(LOG_RHO[1], Math.max(LOG_RHO[0], a.logRho + m[1])),
    }));
  };

  const sunAt = SUN_SHELLS.reduce((b, s) => (Math.abs(s.x - cursor) < Math.abs(b.x - cursor) ? s : b));
  const sunMix = { X: sunAt.X, Z: sunAt.Z };
  const fitAt = opacity(sunAt.rho, sunAt.T, sunMix);
  const bookAt = textbookOpacity(sunAt.rho, sunAt.T, sunMix);

  const caption =
    view === 'map'
      ? `At ${formatKelvin(T)} and ${formatGramsPerCc(rho)}, ${OPACITY_SOURCE_NAMES[src]} blocks most of the light: κ = ${formatOpacity(k)}, so light goes ${formatLength(meanFreePath(k, rho))} between absorptions.`
      : `At ${cursor.toFixed(2)} of the Sun’s radius Model S’s tables give ${formatOpacity(sunAt.kappa)}; the textbook fits give ${formatOpacity(bookAt)} and the refitted ones ${formatOpacity(fitAt)}.`;

  return (
    <Figure
      number={number}
      title="What blocks the light"
      description="Opacity, how strongly gas blocks light, over the plane of density and temperature, from the textbook fits: free electrons scattering light in hot, thin gas; ions absorbing it (Kramers’ law, stronger the cooler and denser the gas) through most of a star; the fragile H⁻ ion in cool outer layers such as the Sun’s surface. The Sun’s insides from Model S cross the plane from its centre, where electrons and ions share the work, to its surface, where H⁻ rules. A second view follows the Sun from centre to surface, Model S’s tabulated opacities against the fits."
      height={620}
      tryThis={tryThis}
      onReset={reset}
      legend={
        view === 'map'
          ? [
              ...SOURCES.filter((s) => grid.centres.some((c) => c.source === s)).map((s) => ({
                label: OPACITY_SOURCE_NAMES[s],
                symbol: <rect x="-8" y="-6" width="16" height="12" rx="2" fill={`rgb(${SOURCE_RGB[s].join(',')})`} />,
              })),
              {
                label: 'darker: more opaque',
                symbol: <rect x="-8" y="-6" width="16" height="12" rx="2" fill="#2a2a2a" stroke="var(--border)" />,
              },
              {
                label: 'the Sun, centre to surface',
                symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="#ffffff" strokeWidth="2.5" />,
              },
            ]
          : undefined
      }
      simplified={
        <p>
          The map uses analytic fits for fully ionised gas (electron scattering, Kramers’ bound–free and free–free laws, H⁻ and a floor for
          molecules), with the bound–free law’s correction factor refitted to the Sun’s own opacities, which it then matches within 20% through the
          radiative zone; the textbook form misses them by up to 2.5 times. Real opacities come from tables (OPAL, OP) with millions of spectral
          lines. The fits leave out the iron bump near 200,000 K, the peak where hydrogen and helium are ionising (the tables are up to a hundred
          times higher there, near the Sun’s surface), and conduction by packed electrons in white dwarfs.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Show">
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
            The map
          </button>
          <button type="button" aria-pressed={view === 'sun'} onClick={() => setView('sun')}>
            Along the Sun
          </button>
        </span>
        {view === 'map' && (
          <span className={figureStyles.segmented} role="group" aria-label="Make-up">
            {MIXES.map((m) => (
              <button key={m.id} type="button" aria-pressed={mixId === m.id} onClick={() => setMixId(m.id)}>
                {m.name}
              </button>
            ))}
          </span>
        )}
      </div>

      {view === 'map' ? (
        <div>
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvas}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: `${(PAD.left / W) * 100}%`,
                top: `${(PAD.top / H) * 100}%`,
                width: `${(PW / W) * 100}%`,
                height: `${(PH / H) * 100}%`,
                imageRendering: 'auto',
                background: PLOT_BG,
              }}
            />
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              style={{
                position: 'relative',
                display: 'block',
                touchAction: 'none',
              }}
              role="application"
              tabIndex={0}
              aria-label={`Opacity over density and temperature. Cross-hair at ${formatKelvin(T)} and ${formatGramsPerCc(rho)}: ${OPACITY_SOURCE_NAMES[src]}, ${formatOpacity(k)}. Arrow keys move it.`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                pick(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons) pick(e);
              }}
              onKeyDown={onKey}
            >
              <rect x={PAD.left} y={PAD.top} width={PW} height={PH} fill="none" stroke="var(--border)" />
              {Array.from({ length: LOG_T[1] - LOG_T[0] + 1 }, (_, i) => Math.ceil(LOG_T[0]) + i)
                .filter((e) => e <= LOG_T[1])
                .map((e) => (
                  <g key={`t${e}`}>
                    <line x1={sx(e)} x2={sx(e)} y1={PAD.top + PH} y2={PAD.top + PH + 5} stroke="var(--text-muted)" />
                    <text x={sx(e)} y={PAD.top + PH + 18} fontSize="12" textAnchor="middle" fill="var(--text)">
                      10{'⁰¹²³⁴⁵⁶⁷⁸⁹'[e]}
                    </text>
                  </g>
                ))}
              {[-10, -8, -6, -4, -2, 0, 2, 4].map((e) => (
                <g key={`r${e}`}>
                  <line x1={PAD.left - 5} x2={PAD.left} y1={sy(e)} y2={sy(e)} stroke="var(--text-muted)" />
                  <text x={PAD.left - 8} y={sy(e) + 4} fontSize="12" textAnchor="end" fill="var(--text)">
                    {e === 0
                      ? '1'
                      : `10${e < 0 ? '⁻' : ''}${String(Math.abs(e))
                          .split('')
                          .map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])
                          .join('')}`}
                  </text>
                </g>
              ))}
              <text x={PAD.left + PW / 2} y={H - 6} fontSize="12.5" textAnchor="middle" fill="var(--text)">
                Temperature (K), hotter →
              </text>
              <text transform={`translate(14 ${PAD.top + PH / 2}) rotate(-90)`} fontSize="12.5" textAnchor="middle" fill="var(--text)">
                Density (g/cm³), denser →
              </text>
              {grid.centres
                .filter((c) => c.cells > 120)
                .map((c) => (
                  <text
                    key={c.source}
                    x={sx(c.logT)}
                    y={sy(c.logRho)}
                    fontSize="13"
                    fontWeight="600"
                    textAnchor="middle"
                    fill={LABEL}
                    stroke="#000"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {OPACITY_SOURCE_NAMES[c.source]}
                  </text>
                ))}
              <line x1={sx(5.3)} x2={sx(5.3)} y1={PAD.top} y2={PAD.top + PH} stroke={LABEL} strokeDasharray="4 4" strokeOpacity={0.6} />
              <text x={sx(5.3) + 4} y={PAD.top + 14} fontSize="11" fill={LABEL}>
                iron bump (tables only)
              </text>
              <polyline points={path} fill="none" stroke="#ffffff" strokeWidth="2.5" />
              {marks.map((s) => (
                <g key={s.x}>
                  <circle cx={sx(Math.log10(s.T))} cy={sy(Math.log10(s.rho / 1000))} r={3.5} fill="#ffffff" />
                  <text
                    x={sx(Math.log10(s.T)) + 6}
                    y={sy(Math.log10(s.rho / 1000)) - 5}
                    fontSize="11"
                    fill={LABEL}
                    stroke="#000"
                    strokeWidth="2.5"
                    paintOrder="stroke"
                  >
                    {s.x === 0 ? 'the Sun’s centre' : s.x >= 0.999 ? 'surface' : `${s.x.toFixed(2)} R`}
                  </text>
                </g>
              ))}
              <g transform={`translate(${sx(at.logT)} ${sy(at.logRho)})`}>
                <circle r={7} fill="none" stroke="#ffffff" strokeWidth="2" />
                <line x1={-12} x2={12} stroke="#ffffff" />
                <line y1={-12} y2={12} stroke="#ffffff" />
              </g>
            </svg>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Here</dt>
              <dd>
                {formatKelvin(T)}, {formatGramsPerCc(rho)}
              </dd>
            </div>
            <div>
              <dt>Blocked mostly by</dt>
              <dd>{OPACITY_SOURCE_NAMES[src]}</dd>
            </div>
            <div>
              <dt>Opacity κ</dt>
              <dd>{formatOpacity(k)}</dd>
            </div>
            <div>
              <dt>Mean free path</dt>
              <dd>{formatLength(meanFreePath(k, rho))}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <ProfilePlot
          series={[
            {
              name: 'Model S’s tables',
              color: 'var(--accent)',
              points: SUN_SHELLS.map((s) => ({ x: s.x, y: s.kappa * 10 })),
            },
            {
              name: 'refitted fits (this course)',
              color: 'var(--series-2)',
              dashed: true,
              points: SUN_SHELLS.map((s) => ({
                x: s.x,
                y: opacity(s.rho, s.T, { X: s.X, Z: s.Z }) * 10,
              })),
            },
            {
              name: 'textbook fits',
              color: 'var(--text-muted)',
              dashed: true,
              points: SUN_SHELLS.map((s) => ({
                x: s.x,
                y: textbookOpacity(s.rho, s.T, { X: s.X, Z: s.Z }) * 10,
              })),
            },
          ]}
          xLabel="Distance from the Sun’s centre (fraction of the radius)"
          yLabel="Opacity (cm²/g)"
          yScale="log"
          yMin={0.01}
          yMax={1e6}
          formatValue={(y) => formatOpacity(y / 10)}
          cursor={cursor}
          onCursor={setCursor}
          cursorText={(x) => `${x.toFixed(2)} of the radius`}
          ariaLabel="The Sun’s opacity from centre to surface: Model S’s tables, the refitted fits close beside them inside 0.7 of the radius, and the textbook fits up to 2.5 times off"
          height={300}
        />
      )}
      <Caption>{caption}</Caption>
    </Figure>
  );
}
