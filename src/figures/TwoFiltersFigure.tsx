import { useMemo, useState, type ReactNode } from 'react';
import { blackBodyBV, filterResponse, FILTER_B, FILTER_V } from '../core/light/filters';
import { peakWavelength, temperatureForPeak } from '../core/light/planck';
import { temperatureFromBV } from '../core/stars/photometry';
import { Caption, Figure } from '../viz/Figure';
import { formatKelvin } from '../viz/spectrum/format';
import { SpectrumView } from '../viz/spectrum/SpectrumView';
import { starCss } from '../viz/star/colour';
import { COLOUR_STARS, describeColour, planckCurve, signed } from './thermal';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Two filters (Figure 11.2): a star's colour measured as the difference
 * between its brightness through a blue (B) and a yellow (V) filter. The
 * hotter the star, the more of its light falls in B. Real stars sit on the
 * scale at their measured B − V; and a spectrum peaking in the green looks
 * white, so there are no green stars.
 */

const START = Math.log10(5772);
const LOG_MIN = 3.398; // 2,500 K
const LOG_MAX = 4.602; // 40,000 K
const GREEN_PEAK = temperatureForPeak(530e-9);
const BV_MIN = -0.45;
const BV_MAX = 2.0;

export function TwoFiltersFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [logT, setLogT] = useState(START);
  const kelvin = 10 ** logT;
  const reset = () => setLogT(START);
  const curve = useMemo(() => {
    const raw = planckCurve(kelvin, 300e-9, 800e-9, 200);
    const top = Math.max(...raw.map(([, v]) => v));
    return raw.map(([l, v]) => [l, v / top] as [number, number]);
  }, [kelvin]);
  const bv = blackBodyBV(kelvin);
  const peak = peakWavelength(kelvin);
  const greenish = Math.abs(peak - 530e-9) < 25e-9;

  const W = 560;
  const bx = (x: number) => 20 + ((x - BV_MIN) / (BV_MAX - BV_MIN)) * (W - 40);

  return (
    <Figure
      number={number}
      title="Two filters"
      description="A black body’s spectrum across the visible band, with the blue (B) and yellow-green (V) filters astronomers measure stars through. Drag the temperature: a hot body is brighter through B, a cool one through V, and the difference, the colour index B − V, measures the temperature without going there. Real stars sit on the scale below at their measured colours. A spectrum peaking in the green still looks white, which is why there are no green stars."
      height={600}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the B filter (blue)', symbol: <rect x="-9" y="-6" width="18" height="12" fill="#2563eb" opacity="0.35" stroke="#2563eb" strokeDasharray="3 2" /> },
        { label: 'the V filter (yellow-green)', symbol: <rect x="-9" y="-6" width="18" height="12" fill="#a16207" opacity="0.35" stroke="#a16207" strokeDasharray="3 2" /> },
        { label: 'the black body’s colour index', symbol: <path d="M0 -9 L6 0 L0 9 L-6 0 Z" fill="var(--text)" /> },
        { label: 'real stars, at their measured B − V', symbol: <circle r="5" fill="var(--text-muted)" /> },
      ]}
      simplified={
        <p>
          The filters are Bessell’s versions of Johnson’s B and V, and the zero of the scale is set by Vega’s colour, as astronomers set it.
          The curve is a perfect black body; real stars’ colours differ a little from a black body’s at the same temperature, because the dark
          lines in their spectra take out more blue light in cool stars, and hot stars’ atmospheres shape their light too.
        </p>
      }
    >
      <div className={styles.controls}>
        <label className={styles.slider}>
          Temperature
          <input type="range" min={LOG_MIN} max={LOG_MAX} step={0.002} value={logT} onChange={(e) => setLogT(Number(e.target.value))} aria-valuetext={`${formatKelvin(kelvin)}: B − V ${signed(bv)}`} />
          <output>{formatKelvin(kelvin)}</output>
        </label>
        <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
          <button type="button" className={figureStyles.toolButton} onClick={() => setLogT(Math.log10(GREEN_PEAK))}>
            Peak in the green
          </button>
          {COLOUR_STARS.map((s) => (
            <button key={s.id} type="button" className={styles.toggle} aria-pressed={Math.abs(Math.log10(s.kelvin) - logT) < 0.002} onClick={() => setLogT(Math.log10(s.kelvin))}>
              {s.name.replace(/^the /, 'The ')}
            </button>
          ))}
        </div>
      </div>
      <SpectrumView
        min={300e-9}
        max={800e-9}
        scale="linear"
        plotHeight={180}
        curves={[{ id: 'body', label: formatKelvin(kelvin), color: 'var(--series-1)', points: curve, rainbow: true }]}
        filters={[
          { label: 'B', color: '#2563eb', response: (l) => filterResponse(FILTER_B, l), from: 360e-9, to: 560e-9 },
          { label: 'V', color: '#a16207', response: (l) => filterResponse(FILTER_V, l), from: 470e-9, to: 700e-9 },
        ]}
        y={{ scale: 'linear', min: 0, max: 1.08, label: 'Brightness', format: () => '' }}
        ariaLabel={`The spectrum of a ${formatKelvin(kelvin)} black body through the B and V filters`}
      >
        {(sx) => (
          <>
            <text x={sx(440e-9)} y={50} fontSize="13" fontWeight="700" textAnchor="middle" fill="#2563eb">
              B
            </text>
            <text x={sx(550e-9)} y={50} fontSize="13" fontWeight="700" textAnchor="middle" fill="#a16207">
              V
            </text>
          </>
        )}
      </SpectrumView>
      <svg viewBox={`0 0 ${W} 78`} className={seasonStyles.svgLight} role="img" aria-label={`The B − V scale: this black body at ${signed(bv)}; ${COLOUR_STARS.map((s) => `${s.name} ${signed(s.BV)}`).join(', ')}`}>
        <defs>
          <linearGradient id={`bv-${number.replace('.', '-')}`} x1="0" x2="1">
            {[-0.4, 0, 0.4, 0.8, 1.2, 1.6, 2.0].map((b) => (
              <stop key={b} offset={(b - BV_MIN) / (BV_MAX - BV_MIN)} stopColor={starCss(temperatureFromBV(b))} />
            ))}
          </linearGradient>
        </defs>
        <rect x={20} y={30} width={W - 40} height={10} rx={3} fill={`url(#bv-${number.replace('.', '-')})`} stroke="var(--border)" />
        {[-0.4, 0, 0.5, 1, 1.5, 2].map((b) => (
          <text key={b} x={bx(b)} y={56} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
            {b < 0 ? `−${-b}` : b}
          </text>
        ))}
        <text x={W / 2} y={73} fontSize="11.5" fontWeight="600" textAnchor="middle" fill="var(--text)">
          B − V: bluer ← → redder
        </text>
        {COLOUR_STARS.map((s, i) => (
          <g key={s.id}>
            <circle cx={bx(s.BV)} cy={35} r={4} fill="var(--text-muted)" stroke="var(--surface)" />
            <text x={bx(s.BV)} y={i % 2 ? 12 : 24} fontSize="10" textAnchor="middle" fill="var(--text)">
              {s.name.replace(/^the /, '')}
            </text>
          </g>
        ))}
        <path d={`M${bx(bv)} 28 l6 7 l-6 7 l-6 -7 z`} fill="var(--text)" />
      </svg>
      <div className={styles.readout} style={{ alignItems: 'center' }}>
        <span>
          B − V: <b>{signed(bv)}</b>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          It looks:
          <svg viewBox="-10 -10 20 20" width="20" height="20" aria-hidden="true">
            <rect x="-10" y="-10" width="20" height="20" rx="4" fill="#070b16" />
            <circle r="7" fill={starCss(kelvin)} />
          </svg>
          <b>{greenish ? 'white, though it peaks in the green' : kelvin < 4000 ? 'orange' : kelvin < 7000 ? 'white' : 'bluish white'}</b>
        </span>
      </div>
      <Caption>
        {greenish
          ? `This body’s spectrum peaks at ${Math.round(peak * 1e9)} nm, in the green, but it is broad: it gives out almost as much red and blue, and the mixture looks white. No star can look green.`
          : describeColour(kelvin)}
      </Caption>
    </Figure>
  );
}
