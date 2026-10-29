import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fractionalYear } from '../core/binaries/visual';
import { rayleighLimit, seeingAt } from '../core/light/diffraction';
import { ARCSEC } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { formatWavelength } from '../viz/spectrum/format';
import { onSky } from './sky/legend';
import { AIR_CHOICES, airFor, blurWidth, formatAperture, formatArcsec, isSplit, PAIRS, pairToday, profile, renderPair, WAVELENGTHS, type AirChoice, type Optics } from './splitStars';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Split the stars (Figure 10.4): a real double star through a telescope,
 * drawn from the diffraction pattern of its aperture and the blur of the air.
 * A wider mirror makes each star's image smaller; the air blurs everything to
 * about an arcsecond unless the telescope is in space or corrects the air.
 */

const N = 168;
const START = { pair: 'epsilon-lyrae-1', logD: Math.log10(0.03), wavelength: 'green', air: 'none' as AirChoice };
/** 5 mm to 40 m, on a round grid of log₁₀ steps. */
const LOG_D_MIN = -2.3;
const LOG_D_MAX = 1.6;

export function SplitStarsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [pairId, setPairId] = useState(START.pair);
  const [logD, setLogD] = useState(START.logD);
  const [waveId, setWaveId] = useState<string>(START.wavelength);
  const [airId, setAirId] = useState<AirChoice>(START.air);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [now] = useState(() => Date.now());

  const pair = PAIRS.find((p) => p.id === pairId)!;
  const aperture = 10 ** logD;
  const wavelength = WAVELENGTHS.find((w) => w.id === waveId)!.value;
  const optics: Optics = useMemo(() => ({ wavelength, aperture, air: airFor(airId, wavelength) }), [wavelength, aperture, airId]);
  const layout = useMemo(() => pairToday(pair, now), [pair, now]);
  const blur = blurWidth(optics);
  const fov = Math.max(2.8 * layout.separation, 7 * blur);
  const split = useMemo(() => isSplit(optics, layout), [optics, layout]);
  const line = useMemo(() => profile(optics, layout, 300), [optics, layout]);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const img = renderPair(optics, layout, fov, N);
    let max = 0;
    for (const v of img) max = Math.max(max, v);
    const decades = Math.min(5, Math.max(2.5, 2.5 - Math.log10(layout.ratio) / 2));
    const data = ctx.createImageData(N, N);
    for (let p = 0; p < img.length; p++) {
      const v = Math.max(0, Math.min(1, (Math.log10(Math.max(img[p], 1e-30) / max) + decades) / decades));
      const g = v ** 1.4;
      data.data[4 * p] = 7 + g * 248;
      data.data[4 * p + 1] = 11 + g * 241;
      data.data[4 * p + 2] = 22 + g * 218;
      data.data[4 * p + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
  }, [optics, layout, fov]);

  const reset = () => {
    setPairId(START.pair);
    setLogD(START.logD);
    setWaveId(START.wavelength);
    setAirId(START.air);
  };

  const limit = rayleighLimit(wavelength, aperture);
  const seeing = optics.air.kind === 'none' ? 0 : seeingAt(optics.air.fwhm, wavelength);
  const year = Math.floor(fractionalYear(now));
  const verdict = split ? 'split: you see two stars' : 'not split: one blob';
  const caption = `${pair.name} in ${year}: ${pair.primary.name} and ${pair.secondary.name} are ${formatArcsec(layout.separation)} apart. A ${formatAperture(aperture)} telescope at ${formatWavelength(wavelength)} blurs each star to about ${formatArcsec(limit)}${
    seeing > limit ? `, and the air to ${formatArcsec(seeing)}` : ''
  }${optics.air.kind === 'adaptive' ? `, with adaptive optics putting ${Math.round(optics.air.strehl * 100)}% of the light back in the sharp core` : ''}: ${verdict}.`;

  // The profile chart.
  const PW = 320;
  const PH = 90;
  let pmax = 0;
  for (const [, v] of line) pmax = Math.max(pmax, v);
  const s0 = line[0][0];
  const s1 = line[line.length - 1][0];
  const px = (s: number) => 8 + ((s - s0) / (s1 - s0)) * (PW - 16);
  const py = (v: number) => PH - 14 - (v / pmax) * (PH - 24);
  const barArcsec = niceBar(fov / ARCSEC / 4);

  return (
    <Figure
      number={number}
      title="Split the stars"
      description="A real double star seen through a telescope: each star is blurred into a small disc with faint rings by the telescope’s own opening, and further by the air. Choose the pair (the double double ε Lyrae, Castor, α Centauri, or Sirius and its faint white dwarf, at today’s separations from their orbits), the telescope’s width, the colour of light and the air. A wider telescope splits closer pairs, but the air blurs everything to about an arcsecond unless the telescope is in space or uses adaptive optics."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'starlight, on a log scale so faint rings and companions show', symbol: onSky(<circle r="5" fill="#f4f4f0" />) },
        { label: 'brightness along the line through both stars', symbol: <path d="M-10 6 Q-6 -10 -2 4 Q2 -6 6 4 L10 6" stroke="var(--series-1)" strokeWidth="2" fill="none" /> },
      ]}
      simplified={
        <>
          <p>
            Diffraction is exact for a clear circular opening; real telescopes have a secondary mirror and its supports in the way, which add
            spikes and change the rings a little. The air’s blur is the average over a long exposure through standard (Kolmogorov) turbulence:
            a snapshot would show a shimmering cloud of speckles instead. Adaptive optics is a simple mix, with a share of the light (more at
            longer wavelengths) put back into the sharp core.
          </p>
          <p>
            Separations come from each pair’s orbit in the Sixth Catalog of Orbits of Visual Binary Stars; the long orbits of ε Lyrae’s pairs
            are preliminary. “Split” means the brightness dips between the stars; your eye and the telescope’s quality decide in practice.
          </p>
        </>
      }
    >
      <div className={styles.presets} role="group" aria-label="Double star" style={{ marginBottom: 8 }}>
        {PAIRS.map((p) => (
          <button key={p.id} type="button" className={styles.toggle} aria-pressed={p.id === pairId} onClick={() => setPairId(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <label className={styles.slider}>
          Telescope width
          <input
            type="range"
            min={LOG_D_MIN}
            max={LOG_D_MAX}
            step={0.005}
            value={logD}
            onChange={(e) => setLogD(Number(e.target.value))}
            aria-valuetext={`${formatAperture(aperture)}: ${verdict}`}
          />
          <output>{formatAperture(aperture)}</output>
        </label>
        <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
          <span className={figureStyles.segmented} role="group" aria-label="Colour of light">
            {WAVELENGTHS.map((w) => (
              <button key={w.id} type="button" aria-pressed={w.id === waveId} onClick={() => setWaveId(w.id)}>
                {w.name}
              </button>
            ))}
          </span>
        </div>
        <div className={styles.toggles} role="group" aria-label="The air">
          <span className={styles.togglesLabel}>Air:</span>
          {AIR_CHOICES.map((a) => (
            <button key={a.id} type="button" className={styles.toggle} aria-pressed={a.id === airId} onClick={() => setAirId(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.split} style={{ alignItems: 'start' }}>
        <div style={{ position: 'relative', maxWidth: 320, width: '100%', justifySelf: 'center' }}>
          <canvas
            ref={canvas}
            width={N}
            height={N}
            role="img"
            aria-label={`${pair.name} through the telescope: ${verdict}`}
            style={{ width: '100%', aspectRatio: '1', display: 'block', borderRadius: 'var(--radius)', imageRendering: 'auto' }}
          />
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
            <text x="50" y="7" fontSize="5" textAnchor="middle" fill="#9aa8c4">
              N
            </text>
            <text x="4" y="52" fontSize="5" fill="#9aa8c4">
              E
            </text>
            <line x1={6} x2={6 + (barArcsec / (fov / ARCSEC)) * 100} y1={94} y2={94} stroke="#e2e8f5" strokeWidth="0.8" />
            <text x={6} y={91} fontSize="4.5" fill="#e2e8f5">
              {barArcsec >= 1 ? `${barArcsec}″` : `${barArcsec * 1000} mas`}
            </text>
          </svg>
        </div>
        <div>
          <svg viewBox={`0 0 ${PW} ${PH}`} className={seasonStyles.svgLight} role="img" aria-label={`Brightness along the line through both stars: ${split ? 'it dips between them' : 'no dip between them'}`}>
            <line x1={8} x2={PW - 8} y1={PH - 14} y2={PH - 14} stroke="var(--border)" />
            <polyline points={line.map(([s, v]) => `${px(s).toFixed(1)},${py(v).toFixed(1)}`).join(' ')} fill="none" stroke="var(--series-1)" strokeWidth="2" />
            <text x={px(0)} y={PH - 3} fontSize="10" textAnchor="middle" fill="var(--text-muted)">
              {pair.primary.name.split(' ').pop()}
            </text>
            <text x={px(layout.separation)} y={PH - 3} fontSize="10" textAnchor="middle" fill="var(--text-muted)">
              {pair.secondary.name.split(' ').pop()}
            </text>
          </svg>
          <div className={styles.readout} style={{ flexDirection: 'column', gap: 3 }}>
            <span>
              Apart today: <b>{formatArcsec(layout.separation)}</b> (magnitudes {pair.primary.V.toFixed(2).replace('-', '−')} and {pair.secondary.V.toFixed(2)})
            </span>
            <span>
              The telescope’s limit, 1.22 λ/D: <b>{formatArcsec(limit)}</b>
            </span>
            {seeing > 0 && (
              <span>
                The air’s blur: <b>{formatArcsec(seeing)}</b>
                {optics.air.kind === 'adaptive' ? `, ${Math.round(optics.air.strehl * 100)}% corrected` : ''}
              </span>
            )}
            <span>
              Verdict: <b>{split ? 'split' : 'not split'}</b>
            </span>
          </div>
          <p className={styles.hint}>{pair.note}</p>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

/** A round length for the scale bar, near a target in arcseconds. */
function niceBar(target: number): number {
  const p = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 5].map((m) => m * p).reduce((best, v) => (Math.abs(Math.log10(v / target)) < Math.abs(Math.log10(best / target)) ? v : best), p);
}
