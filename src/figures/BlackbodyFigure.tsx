import { useMemo, useState, type ReactNode } from 'react';
import { T_SUN } from '../core/constants';
import { fractionBetween, peakWavelength, surfaceFlux, VISIBLE } from '../core/light/planck';
import { superscript } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { formatKelvin, formatWavelength } from '../viz/spectrum/format';
import { SpectrumView } from '../viz/spectrum/SpectrumView';
import { starCss } from '../viz/star/colour';
import { describeGlow, DRAPER_POINT, formatPower, GLOWS, planckCurve } from './thermal';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The blackbody explorer (Figure 11.1): the glow of anything warm, from
 * Planck's law. Hotter bodies are brighter at every wavelength, peak at
 * shorter wavelengths and look bluer: blue stars are the hottest.
 */

const LOG_MIN = 2.477; // 300 K, on the slider's grid
const LOG_MAX = 5;
const START = Math.log10(T_SUN);
const PREDICTIONS = [
  { label: 'The red star', correct: false },
  { label: 'The blue star', correct: true },
  { label: 'Neither: colour has nothing to do with temperature', correct: false },
];

export function BlackbodyFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [logT, setLogT] = useState(START);
  const [axes, setAxes] = useState<'linear' | 'log'>('linear');
  const [guess, setGuess] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);
  const kelvin = 10 ** logT;
  const reset = () => {
    setLogT(START);
    setAxes('linear');
    setGuess(null);
    setChecked(null);
  };

  const linear = axes === 'linear';
  const min = linear ? 100e-9 : 10e-9;
  const max = linear ? 3e-6 : 1e-3;
  const curve = useMemo(() => planckCurve(kelvin, min, max, 300), [kelvin, min, max]);
  const sun = useMemo(() => planckCurve(T_SUN, min, max, 300), [min, max]);
  // Linear axes: scaled to the taller of this curve and the Sun's, so the growth with temperature shows. Log axes: fixed.
  const top = linear ? Math.max(...curve.map(([, v]) => v), ...sun.map(([, v]) => v)) * 1.08 : 1e22;
  const peak = peakWavelength(kelvin);
  const visible = fractionBetween(VISIBLE.from, VISIBLE.to, kelvin);
  const flux = surfaceFlux(kelvin);
  const seen = kelvin >= DRAPER_POINT;
  const preset = GLOWS.find((g) => Math.abs(Math.log10(g.kelvin) - logT) < 0.002);

  // The total-power bar, on a log scale from 300 K to 100,000 K.
  const barFraction = (Math.log10(flux) - Math.log10(surfaceFlux(300))) / (Math.log10(surfaceFlux(1e5)) - Math.log10(surfaceFlux(300)));

  return (
    <Figure
      number={number}
      title="The blackbody explorer"
      description="The glow of a warm body, from Planck’s law, at any temperature from 300 K (about yours) to 100,000 K (a newborn white dwarf): its spectrum, where it peaks, how much power each square metre gives out, and the colour the eye would see. Hotter bodies are brighter at every wavelength, peak at shorter wavelengths and look bluer: blue stars are hotter than red ones."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the spectrum at this temperature (visible part in its colours)', symbol: <path d="M-10 8 Q-4 -12 10 4" stroke="var(--series-1)" strokeWidth="2.25" fill="none" /> },
        { label: 'the Sun, for comparison', symbol: <path d="M-10 8 Q-4 -12 10 4" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="4 3" fill="none" /> },
        { label: 'the peak (Wien’s law)', symbol: <path d="M0 -9 V9" stroke="var(--text)" strokeWidth="1.5" strokeDasharray="3 3" /> },
      ]}
      simplified={
        <p>
          These are perfect black bodies. Real stars come close but not exactly: their atmospheres’ dark lines and bands take bites out of the
          spectrum (Chapter 12), and hot stars give out less ultraviolet than a black body would. The colour shown is the colour of the light,
          with its brightness evened out; a body below about 800 K gives out too little visible light for the eye to see at all.
        </p>
      }
    >
      <div className={seasonStyles.predict}>
        <fieldset>
          <legend>Predict first: two stars, one red and one blue. Which is hotter?</legend>
          {PREDICTIONS.map((p, i) => (
            <label key={p.label} className={figureStyles.checkbox}>
              <input type="radio" name={`hot-guess-${number}`} checked={guess === i} onChange={() => setGuess(i)} />
              {p.label}
            </label>
          ))}
          <button
            type="button"
            className={figureStyles.toolButton}
            disabled={guess === null}
            onClick={() => {
              setChecked(guess);
              setLogT(Math.log10(GLOWS.find((g) => g.id === 'rigel')!.kelvin));
            }}
          >
            Check, and show Rigel
          </button>
        </fieldset>
        <div aria-live="polite">
          {checked !== null && (
            <p className={seasonStyles.verdict}>
              <span className={PREDICTIONS[checked].correct ? seasonStyles.right : seasonStyles.wrong}>{PREDICTIONS[checked].correct ? '✓ Right.' : '✗ Not quite.'}</span> The blue
              star is hotter, the opposite of hot and cold taps. Blue-white Rigel’s surface is about 12,100 K; red Betelgeuse’s about 3,600 K.
              The hotter a body, the shorter the wavelength where its glow peaks.
            </p>
          )}
        </div>
      </div>

      <div className={styles.presets} role="group" aria-label="Temperature of" style={{ marginBottom: 8 }}>
        {GLOWS.map((g) => (
          <button key={g.id} type="button" className={styles.toggle} aria-pressed={preset?.id === g.id} onClick={() => setLogT(Math.log10(g.kelvin))}>
            {g.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <label className={styles.slider}>
          Temperature
          <input type="range" min={LOG_MIN} max={LOG_MAX} step={0.001} value={logT} onChange={(e) => setLogT(Number(e.target.value))} aria-valuetext={`${formatKelvin(kelvin)}: peaks at ${formatWavelength(peak)}`} />
          <output>{formatKelvin(kelvin)}</output>
        </label>
        <span className={figureStyles.segmented} role="group" aria-label="Axes">
          <button type="button" aria-pressed={linear} onClick={() => setAxes('linear')}>
            Ordinary axes
          </button>
          <button type="button" aria-pressed={!linear} onClick={() => setAxes('log')}>
            Log axes
          </button>
        </span>
      </div>
      <SpectrumView
        min={min}
        max={max}
        scale={linear ? 'linear' : 'log'}
        bands={!linear}
        plotHeight={200}
        curves={[
          { id: 'sun', label: 'the Sun', color: 'var(--series-2)', points: sun, dashed: true },
          { id: 'body', label: formatKelvin(kelvin), color: 'var(--series-1)', points: curve, rainbow: true },
        ]}
        y={
          linear
            ? { scale: 'linear', min: 0, max: top, label: 'Brightness', format: () => '' }
            : { scale: 'log', min: 1, max: top, label: 'Brightness (log)', ticks: [1, 1e5, 1e10, 1e15, 1e20], format: (v) => `10${superscript(Math.round(Math.log10(v)))}` }
        }
        markers={peak >= min && peak <= max ? [{ at: peak, label: `peak ${formatWavelength(peak)}`, dashed: true }] : []}
        ariaLabel={`The spectrum of a black body at ${formatKelvin(kelvin)}, on ${linear ? 'ordinary' : 'logarithmic'} axes`}
      />
      {linear && peak > max && <p className={styles.hint}>The peak, at {formatWavelength(peak)}, is off the chart to the right, in the infrared: try the log axes.</p>}
      <div className={styles.split} style={{ alignItems: 'center', marginTop: 8 }}>
        <div className={styles.readout} style={{ flexDirection: 'column', gap: 4 }}>
          <span>
            Peak (Wien’s law): <b>{formatWavelength(peak)}</b>
          </span>
          <span>
            Power per square metre, σT⁴: <b>{formatPower(flux)}</b>
          </span>
          <svg viewBox="0 0 220 12" width="220" height="12" role="img" aria-label={`Power per square metre on a log scale: ${formatPower(flux)}`}>
            <rect width="220" height="12" rx="3" fill="var(--border)" />
            <rect width={Math.max(3, 220 * barFraction)} height="12" rx="3" fill="var(--series-2)" />
          </svg>
          <span>
            Visible light: <b>{visible < 0.001 ? 'almost none' : `${Math.round(visible * 100)}% of the power`}</b>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'center' }}>
          <svg viewBox="-30 -30 60 60" width="84" height="84" role="img" aria-label={seen ? `The colour the eye would see: ${colourWords(kelvin)}` : 'Too cool to see: no visible glow'}>
            <rect x={-30} y={-30} width={60} height={60} rx={8} fill="#070b16" />
            {seen ? <circle r={20} fill={starCss(kelvin, Math.min(1, 0.35 + (Math.log10(kelvin) - Math.log10(DRAPER_POINT)) / 0.8))} /> : <circle r={20} fill="none" stroke="#56607a" strokeDasharray="3 3" />}
          </svg>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '14em' }}>{seen ? `What the eye sees: ${colourWords(kelvin)}` : 'Too cool to see: it glows only in infrared'}</span>
        </div>
      </div>
      <Caption>{describeGlow(kelvin)}</Caption>
    </Figure>
  );
}

function colourWords(kelvin: number): string {
  if (kelvin < 1500) return 'dull red';
  if (kelvin < 3000) return 'orange';
  if (kelvin < 4500) return 'orange-yellow';
  if (kelvin < 7000) return 'white, faintly warm';
  if (kelvin < 12_000) return 'white with a hint of blue';
  return 'blue-white';
}
