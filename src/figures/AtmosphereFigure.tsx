import { useMemo, useState, type ReactNode } from 'react';
import { absorptionHeight, PLATFORMS, whereToObserve } from '../core/light/atmosphere';
import { bandOf } from '../data/spectrum';
import { Caption, Figure } from '../viz/Figure';
import { formatWavelength } from '../viz/spectrum/format';
import { SpectrumView } from '../viz/spectrum/SpectrumView';
import { colourName } from './spectrumRuler';
import styles from './sky/sky.module.css';

/**
 * How far down does light get? (Figure 10.3): the height at which the air has
 * absorbed about half the light of each wavelength coming from space, with
 * the places a telescope can go. Visible light and radio reach the ground;
 * almost everything else is stopped high up. A sketch from band values.
 */

const MIN = 1e-12;
const MAX = 1e3;
const TOP = 200; // km
const START = 1e-9;
/** Heights are drawn on a square-root scale, so mountain tops and satellites both fit. */
const h2y = (km: number) => Math.sqrt(Math.min(km, TOP));
const TICKS = [0, 5, 20, 50, 100, 200];

export function AtmosphereFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [at, setAt] = useState(START);
  const reset = () => setAt(START);
  const curve = useMemo(() => {
    const pts: [number, number][] = [];
    for (let e = Math.log10(MIN); e <= Math.log10(MAX) + 1e-9; e += 0.01) pts.push([10 ** e, h2y(absorptionHeight(10 ** e))]);
    return pts;
  }, []);
  const height = absorptionHeight(at);
  const where = whereToObserve(at);
  const band = bandOf(at);
  const colour = colourName(at);
  const name = `${formatWavelength(at)} (${band.name.toLowerCase()}${colour ? `, ${colour}` : ''})`;
  const caption =
    height < 0.5
      ? `${name} reaches the ground: a telescope can sit at sea level, though a high, dry site sees it better.`
      : `${name} is absorbed about ${Math.round(height)} km up. To see it, your telescope must go on ${where.name}.`;

  return (
    <Figure
      number={number}
      title="How far down does light get?"
      description="For each wavelength, from gamma rays to radio, the height at which the air has absorbed about half of the light coming from space. Visible light and radio reach the ground, and a few infrared windows reach high mountains; gamma rays, X-rays and ultraviolet are stopped tens of kilometres up, which is why telescopes for them must fly on balloons, rockets or satellites."
      height={520}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'where the air has absorbed half the light: below the line, no light gets through', symbol: <path d="M-10 4 L-3 -6 L4 2 L10 -4 V10 H-10 Z" fill="var(--series-2)" opacity="0.4" stroke="var(--series-2)" strokeWidth="1.5" /> },
        { label: 'places to put a telescope', symbol: <path d="M-10 0 H10" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="3 2" /> },
      ]}
      simplified={
        <p>
          A sketch, not a measurement, drawn from typical values band by band. Real absorption changes line by line across the spectrum, and
          with the weather: infrared is absorbed mostly by water vapour, so the windows open wider at high, dry sites and on dry nights. Long
          radio waves are not absorbed but turned back by the ionosphere. Heights are drawn on a square-root scale, so the ground and
          satellites both fit.
        </p>
      }
    >
      <SpectrumView
        min={MIN}
        max={MAX}
        bands
        plotHeight={230}
        y={{ scale: 'linear', min: 0, max: h2y(TOP), label: 'Height, km', ticks: TICKS.map(h2y), format: (v) => String(Math.round(v * v)) }}
        ariaLabel="How far down light from space gets, by wavelength"
        cursor={{ at, onChange: setAt, label: 'Wavelength', valueText: caption }}
      >
        {(sx, sy) => (
          <>
            <path
              d={`${curve.map(([l, y], i) => `${i ? 'L' : 'M'}${sx(l).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')} L${sx(MAX)},${sy(0)} L${sx(MIN)},${sy(0)} Z`}
              fill="var(--series-2)"
              opacity={0.3}
            />
            <path d={curve.map(([l, y], i) => `${i ? 'L' : 'M'}${sx(l).toFixed(1)},${sy(y).toFixed(1)}`).join(' ')} fill="none" stroke="var(--series-2)" strokeWidth="2" />
            {PLATFORMS.filter((p) => p.height > 0 && Number.isFinite(p.height)).map((p) => (
              <g key={p.id}>
                <line x1={sx(MIN)} x2={sx(MAX)} y1={sy(h2y(p.height))} y2={sy(h2y(p.height))} stroke="var(--text-muted)" strokeDasharray="4 3" />
                <text x={sx(MAX) - 4} y={sy(h2y(p.height)) - 3} fontSize="10" textAnchor="end" fill="var(--text)">
                  {p.id === 'mountain' ? 'mountain tops' : p.id === 'aircraft' ? 'aircraft' : p.id === 'balloon' ? 'balloons' : 'rockets'}
                </text>
              </g>
            ))}
            <text x={sx(1e-6)} y={sy(h2y(TOP)) + 12} fontSize="10" textAnchor="middle" fill="var(--text)">
              satellites: above it all
            </text>
            <circle cx={sx(at)} cy={sy(h2y(height))} r={4.5} fill="var(--text)" />
          </>
        )}
      </SpectrumView>
      <div className={styles.readout}>
        <span>
          Absorbed at: <b>{height < 0.5 ? 'nowhere: it reaches the ground' : `about ${Math.round(height)} km up`}</b>
        </span>
        <span>
          Observe it from: <b>{where.name}</b>
        </span>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
