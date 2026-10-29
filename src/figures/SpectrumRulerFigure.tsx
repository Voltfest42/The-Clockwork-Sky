import { useState, type ReactNode } from 'react';
import { SAME_SIZE, SPECTRUM_STOPS } from '../data/spectrum';
import { Caption, Figure } from '../viz/Figure';
import { SpectrumView } from '../viz/spectrum/SpectrumView';
import { describeWavelength, rulerCaption } from './spectrumRuler';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The spectrum ruler (Figure 10.1): sixteen powers of ten of wavelength, from
 * a picometre to ten kilometres, with the bands, things of the same size, and
 * a marker to drag: its frequency, photon energy and the temperature that
 * glows brightest there, and what that kind of light shows in the sky.
 */

const START = 550e-9;
const MIN = 1e-12;
const MAX = 1e4;

export function SpectrumRulerFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [at, setAt] = useState(START);
  const [layer, setLayer] = useState<'sky' | 'makes'>('sky');
  const reset = () => {
    setAt(START);
    setLayer('sky');
  };
  const d = describeWavelength(at);

  return (
    <Figure
      number={number}
      title="The spectrum ruler"
      description="A ruler of light’s wavelengths on a scale of powers of ten, from a picometre (gamma rays) to ten kilometres (long radio waves), with the bands named, things of the same size along it, and the visible rainbow a thin sliver in the middle. Drag the marker to read the wavelength’s frequency, the energy of each photon, the temperature that glows brightest there, and what that kind of light shows in the sky."
      height={560}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the marker: drag it, or use the arrow keys', symbol: <path d="M0 -9 V5 M-6 9 L0 3 L6 9 Z" stroke="var(--text)" strokeWidth="2" fill="var(--text)" /> },
        { label: 'things about as big as the wavelength', symbol: <path d="M0 -8 V8" stroke="var(--text-muted)" strokeWidth="1.5" /> },
      ]}
      simplified={
        <p>
          The boundaries between the bands are conventions, not physics: they blur into each other. Every kind of light travels at the same
          speed, c = 299,792,458 m/s, so wavelength and frequency are two ways of saying the same thing.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Go to" style={{ marginBottom: 8 }}>
        {SPECTRUM_STOPS.map((s) => (
          <button key={s.name} type="button" className={styles.toggle} aria-pressed={Math.abs(Math.log10(at / s.wavelength)) < 0.005} onClick={() => setAt(s.wavelength)}>
            {s.name}
          </button>
        ))}
      </div>
      <SpectrumView
        min={MIN}
        max={MAX}
        bands
        plotHeight={86}
        tickEvery={2}
        ariaLabel="The spectrum ruler, from 1 picometre to 10 kilometres"
        cursor={{ at, onChange: setAt, label: 'Wavelength', valueText: `${d.wavelength}, ${d.band.name.toLowerCase()}${d.colour ? `, ${d.colour}` : ''}` }}
      >
        {(sx) =>
          SAME_SIZE.map((s, i) => (
            <g key={s.name}>
              <line x1={sx(s.size)} x2={sx(s.size)} y1={i % 2 ? 66 : 50} y2={118} stroke="var(--text-muted)" strokeWidth="1.25" />
              <text x={sx(s.size)} y={i % 2 ? 62 : 46} fontSize="10" textAnchor={i === SAME_SIZE.length - 1 ? 'end' : 'middle'} fill="var(--text-muted)">
                {s.name.replace(/^an? /, '')}
              </text>
            </g>
          ))
        }
      </SpectrumView>
      <dl className={styles.facts} style={{ marginTop: 6 }}>
        <div>
          <dt>Wavelength</dt>
          <dd>
            <b>{d.wavelength}</b>: {d.band.name.toLowerCase()}
            {d.colour ? ` (${d.colour})` : ''}
            {d.like ? `, about the size of ${d.like}` : ''}
          </dd>
        </div>
        <div>
          <dt>Frequency</dt>
          <dd>{d.frequency} (waves a second)</dd>
        </div>
        <div>
          <dt>Each photon carries</dt>
          <dd>{d.energy}</dd>
        </div>
        <div>
          <dt>Glows brightest here</dt>
          <dd>a body at {d.glow}</dd>
        </div>
      </dl>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h4 className={styles.cardTitle}>{d.band.name}</h4>
          <span className={figureStyles.segmented} role="group" aria-label="Show">
            <button type="button" aria-pressed={layer === 'sky'} onClick={() => setLayer('sky')}>
              In the sky
            </button>
            <button type="button" aria-pressed={layer === 'makes'} onClick={() => setLayer('makes')}>
              What makes it
            </button>
          </span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>{layer === 'sky' ? d.band.sky : d.band.makes}</p>
      </div>
      <Caption>{rulerCaption(at)}</Caption>
    </Figure>
  );
}
