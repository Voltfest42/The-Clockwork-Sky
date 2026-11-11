import { useState, type ReactNode } from 'react';
import { powerOfTen } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { DETECTORS, describeFrequency, formatDuration, formatLength, SOURCES, type WaveSource } from './ripples';
import { Slider } from './Slider';
import styles from './sky/sky.module.css';

/**
 * The gravitational-wave spectrum (Figure 29.5), after Figure 10.1's ruler
 * of light: sixteen powers of ten of frequency, from nanohertz to kilohertz,
 * with each kind of detector's reach as an analytic curve of characteristic
 * strain and the sources that sing there. A marker reads off a frequency's
 * period, wavelength, and who listens and who sings.
 */

const MIN = 1e-10;
const MAX = 1e4;
const START = 100;
const STOPS = [
  { name: 'Pulsar timing', f: 3e-9 },
  { name: 'LISA', f: 3e-3 },
  { name: 'LIGO', f: 100 },
] as const;

const DETECTOR_COLOURS: Record<string, string> = { pta: 'var(--series-3)', lisa: 'var(--series-2)', ligo: 'var(--series-1)' };
const SOURCE_COLOURS = ['#e11d48', '#0d9488', '#ca8a04', '#64748b', '#9333ea'];

/** A source's curve as a function: log-log interpolation along its points, NaN outside them. */
function sourceLine(s: WaveSource): (f: number) => number {
  const pts = s.points;
  return (f: number) => {
    for (let i = 1; i < pts.length; i++) {
      if (f >= pts[i - 1].f && f <= pts[i].f) {
        const t = Math.log(f / pts[i - 1].f) / Math.log(pts[i].f / pts[i - 1].f);
        return Math.exp(Math.log(pts[i - 1].h) + t * Math.log(pts[i].h / pts[i - 1].h));
      }
    }
    return NaN;
  };
}

export function WaveSpectrumFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [at, setAt] = useState(START);
  const reset = () => setAt(START);
  const d = describeFrequency(at);
  const lines = SOURCES.filter((s) => s.points.length > 1);
  const dots = SOURCES.filter((s) => s.points.length === 1);
  const caption = `At ${formatHz(at)}, one cycle takes ${formatDuration(d.period)} and the waves are ${formatLength(d.wavelength)} long${d.wavelength > 9.46e15 ? ` (${(d.wavelength / 9.4607e15).toPrecision(2)} light-years)` : ''}. Two Suns’ worth of mass would have to orbit ${formatLength(d.orbitForTwoSuns)} apart to sing at this pitch. ${
    d.detectors.length ? `Listening here: ${d.detectors.map((x) => x.name).join('; ')}.` : 'No detector listens here.'
  } ${d.sources.length ? `Singing here: ${d.sources.map((s) => s.name[0].toLowerCase() + s.name.slice(1)).join('; ')}.` : ''}`;

  return (
    <Figure
      number={number}
      title="The gravitational-wave spectrum"
      description="A ruler of gravitational waves’ frequencies on a scale of powers of ten, from a tenth of a nanohertz to ten kilohertz, with how faint a wave each kind of detector can hear (pulsar timing arrays at nanohertz, the LISA spacecraft at millihertz, LIGO and its partners at tens to thousands of hertz) and the sources that sing in each band: pairs of supermassive black holes, white dwarfs in the Galaxy, and merging black holes and neutron stars. Drag the marker to read a frequency’s period and wavelength."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a detector’s reach: sources above its curve can be heard', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text)" strokeWidth="2.5" /> },
        { label: 'a source sweeping up in frequency as it spirals in', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text)" strokeWidth="1.8" strokeDasharray="5 3" /> },
        { label: 'the marker: drag it, or use the slider', symbol: <line x1="0" y1="-9" x2="0" y2="9" stroke="var(--accent)" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          The curves are analytic: Advanced LIGO at its design sensitivity (Sathyaprakash and Schutz’s fit), LISA’s planned noise with the
          Galaxy’s unresolved white dwarfs (Robson, Cornish and Liu 2019), and only the shape of a pulsar timing array’s reach, scaled so that the
          background it has found just rises above it. Strains are characteristic strains, the usual currency for comparing a source with a
          detector (a source must lie well above a curve to be heard clearly; factors of two depend on conventions). Sources are averaged over
          their orientation. The million-Sun pair is placed 1 Gpc away without the stretching of its waves on the way.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Go to">
        {STOPS.map((s) => (
          <button key={s.name} type="button" className={styles.toggle} aria-pressed={Math.abs(Math.log10(at / s.f)) < 0.01} onClick={() => setAt(s.f)}>
            {s.name}
          </button>
        ))}
      </div>
      <ScatterChart
        groups={dots.map((s, i) => ({ name: s.name, color: SOURCE_COLOURS[(lines.length + i) % SOURCE_COLOURS.length], shape: 'diamond' as const, points: s.points.map((p) => ({ x: p.f, y: p.h, label: s.name })) }))}
        lines={[
          ...DETECTORS.map((det) => ({ name: det.name, color: DETECTOR_COLOURS[det.id], f: (f: number) => (f >= det.from && f <= det.to ? det.noise(f) : NaN) })),
          ...lines.map((s, i) => ({ name: s.name, color: SOURCE_COLOURS[i % SOURCE_COLOURS.length], dash: '5 3', f: sourceLine(s) })),
        ]}
        xScale="log"
        yScale="log"
        xMin={MIN}
        xMax={MAX}
        yMin={1e-25}
        yMax={1e-12}
        xLabel="Frequency of the waves (Hz)"
        yLabel="Characteristic strain"
        formatX={(x) => powerOfTen(Math.round(Math.log10(x)))}
        formatY={(y) => powerOfTen(Math.round(Math.log10(y)))}
        onPick={(f) => setAt(Number(f.toPrecision(2)))}
        height={460}
        ariaLabel={`Characteristic strain against frequency from 10⁻¹⁰ to 10⁴ Hz: pulsar timing arrays’ reach at nanohertz, LISA’s at millihertz and LIGO’s at tens to thousands of hertz, with the sources. ${caption}`}
      >
        {(sx, sy) => (
          <g pointerEvents="none">
            {[
              { name: 'pulsar timing', from: 1e-9, to: 3e-7 },
              { name: 'space', from: 2e-5, to: 0.5 },
              { name: 'ground', from: 10, to: 5000 },
            ].map((b) => (
              <g key={b.name}>
                <rect x={sx(b.from)} y={sy(1e-12)} width={sx(b.to) - sx(b.from)} height={14} fill="var(--accent)" fillOpacity="0.12" />
                <text x={(sx(b.from) + sx(b.to)) / 2} y={sy(1e-12) + 11} fontSize="10.5" textAnchor="middle" fill="var(--text)">
                  {b.name}
                </text>
              </g>
            ))}
            <line x1={sx(at)} x2={sx(at)} y1={sy(1e-12)} y2={sy(1e-25)} stroke="var(--accent)" strokeWidth="2" />
          </g>
        )}
      </ScatterChart>
      <div className={styles.controls}>
        <Slider label="Frequency" value={at} min={MIN} max={MAX} log step={0.01} format={formatHz} onChange={(v) => setAt(Number(v.toPrecision(2)))} />
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>One cycle takes</dt>
          <dd>{formatDuration(d.period)}</dd>
        </div>
        <div>
          <dt>Wavelength</dt>
          <dd>
            {formatLength(d.wavelength)}
            {d.wavelength > 9.46e15 ? ` (${(d.wavelength / 9.4607e15).toPrecision(2)} light-years)` : ''}
          </dd>
        </div>
        <div>
          <dt>Two Suns orbiting at this pitch</dt>
          <dd>{formatLength(d.orbitForTwoSuns)} apart</dd>
        </div>
      </dl>
      {[...d.detectors, ...d.sources].map((x) => (
        <div key={x.id} className={styles.card} style={{ marginTop: 6 }}>
          <div className={styles.cardHead}>
            <h4 className={styles.cardTitle}>{x.name}</h4>
            <span className={styles.cardSubtitle}>{DETECTORS.includes(x as (typeof DETECTORS)[number]) ? 'listens here' : 'sings here'}</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>{x.what}</p>
        </div>
      ))}
      <Caption>{caption}</Caption>
    </Figure>
  );
}

function formatHz(f: number): string {
  const n = (x: number) => String(Number(x.toPrecision(2)));
  if (f >= 1000) return `${n(f / 1000)} kHz`;
  if (f >= 1) return `${n(f)} Hz`;
  if (f >= 1e-3) return `${n(f * 1e3)} mHz`;
  if (f >= 1e-6) return `${n(f * 1e6)} µHz`;
  if (f >= 1e-9) return `${n(f * 1e9)} nHz`;
  return `${n(f * 1e12)} pHz`;
}
