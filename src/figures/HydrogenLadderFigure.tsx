import { useState, type ReactNode } from 'react';
import { jumpEnergy, levelEnergy, lineName, SERIES, wavelength } from '../core/spectra/hydrogen';
import { Caption, Figure } from '../viz/Figure';
import { formatWavelength, rgb, spectralColour } from '../viz/spectrum/format';
import { SpectrumView } from '../viz/spectrum/SpectrumView';
import { describeJump, JUMPS, TOP_LEVEL, type Jump } from './spectra';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Hydrogen's ladder (Figure 12.2): its energy levels by Bohr's model, and the
 * jumps between them. Pick a jump to see the photon it takes in or gives
 * out: the Lyman series (to or from level 1) in the ultraviolet, the Balmer
 * series (level 2) in visible light, the Paschen series (level 3) in the
 * infrared. Exact for hydrogen.
 */

const W = 560;
const H = 300;
const START: Jump = { lower: 2, upper: 3 };

/** The ladder's heights: level 1 at the bottom, then levels 2 to ∞ spread over the top, with a break between. */
function levelY(n: number): number {
  if (n === 1) return 284;
  const e = n === Infinity ? 13.598 : levelEnergy(n);
  return 238 - ((e - 10.2) / (13.598 - 10.2)) * 196;
}

const COLUMN: Record<number, [number, number]> = { 1: [150, 250], 2: [282, 392], 3: [420, 480] };

function photonColour(j: Jump): string {
  const nm = wavelength(j.lower, j.upper) * 1e9;
  return nm >= 380 && nm <= 750 ? rgb(spectralColour(nm)) : '#94a3b8';
}

export function HydrogenLadderFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [jump, setJump] = useState<Jump>(START);
  const [absorb, setAbsorb] = useState(false);
  const reset = () => {
    setJump(START);
    setAbsorb(false);
  };
  const same = (j: Jump) => j.lower === jump.lower && j.upper === jump.upper;
  const lambda = wavelength(jump.lower, jump.upper);
  const selectedNm = lambda * 1e9;

  return (
    <Figure
      number={number}
      title="Hydrogen’s ladder"
      description="Hydrogen’s energy levels as the rungs of a ladder, from level 1 (the ground) to the point where the electron goes free. A jump between two rungs takes in or gives out a photon whose energy matches the gap. Jumps to or from level 1 make the Lyman series in the ultraviolet, level 2 the Balmer series in visible light, and level 3 the Paschen series in the infrared. Pick a jump to see its photon’s energy, wavelength and colour."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'an energy level (a rung)', symbol: <line x1="-10" x2="10" stroke="var(--text)" strokeWidth="2" /> },
        { label: 'a jump, in the colour of its photon (grey: invisible)', symbol: <path d="M0 8 V-6 M-4 -2 L0 -8 L4 -2" stroke="#ef4444" strokeWidth="2" fill="none" /> },
      ]}
    >
      <div className={styles.controls}>
        <div className={figureStyles.segmented} role="group" aria-label="Absorb or emit">
          <button type="button" aria-pressed={!absorb} onClick={() => setAbsorb(false)}>
            Give out light (emission)
          </button>
          <button type="button" aria-pressed={absorb} onClick={() => setAbsorb(true)}>
            Take in light (absorption)
          </button>
        </div>
        {SERIES.map((s) => (
          <div key={s.name} className={styles.toggles} role="group" aria-label={`The ${s.name} series`}>
            <span className={styles.togglesLabel}>
              {s.name} ({s.region}):
            </span>
            {JUMPS.filter((j) => j.lower === s.lower).map((j) => (
              <button key={j.upper} type="button" className={styles.toggle} aria-pressed={same(j)} onClick={() => setJump(j)} aria-label={`${lineName(j.lower, j.upper)}: between levels ${j.lower} and ${j.upper}`}>
                {lineName(j.lower, j.upper)}
              </button>
            ))}
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svgLight} role="img" aria-label={`Hydrogen’s levels with the ${lineName(jump.lower, jump.upper)} jump between levels ${jump.lower} and ${jump.upper}`}>
        <defs>
          <marker id="ladder-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        {[...Array.from({ length: TOP_LEVEL }, (_, k) => k + 1), Infinity].map((n) => (
          <g key={n}>
            <line x1={110} x2={W - 50} y1={levelY(n)} y2={levelY(n)} stroke={n === Infinity ? 'var(--text-muted)' : 'var(--text)'} strokeWidth={n === Infinity ? 1 : 1.6} strokeDasharray={n === Infinity ? '4 3' : undefined} />
            {(n <= 4 || n === Infinity) && (
              <text x={104} y={levelY(n) + 4} fontSize="11" textAnchor="end" fill="var(--text)">
                {n === Infinity ? 'free (13.6 eV)' : `level ${n} · ${levelEnergy(n).toFixed(1)} eV`}
              </text>
            )}
          </g>
        ))}
        <path d="M110 258 l8 -5 l8 10 l8 -10 l8 5" fill="none" stroke="var(--text-muted)" />
        <text x={W - 46} y={levelY(5) + 4} fontSize="10" fill="var(--text-muted)">
          5, 6…
        </text>
        {SERIES.map((s) => (
          <text key={s.name} x={(COLUMN[s.lower][0] + COLUMN[s.lower][1]) / 2} y={14} fontSize="11.5" fontWeight="600" textAnchor="middle" fill="var(--text)">
            {s.name}
          </text>
        ))}
        {JUMPS.map((j) => {
          const [a, b] = COLUMN[j.lower];
          const count = TOP_LEVEL - j.lower;
          const x = a + ((j.upper - j.lower - 0.5) / count) * (b - a);
          const on = same(j);
          const [y1, y2] = absorb ? [levelY(j.lower), levelY(j.upper)] : [levelY(j.upper), levelY(j.lower)];
          return (
            <line
              key={`${j.lower}-${j.upper}`}
              x1={x}
              x2={x}
              y1={y1}
              y2={y2 + (y2 > y1 ? -3 : 3)}
              stroke={photonColour(j)}
              strokeWidth={on ? 4 : 1.6}
              opacity={on ? 1 : 0.45}
              markerEnd="url(#ladder-arrow)"
              style={{ cursor: 'pointer' }}
              onClick={() => setJump(j)}
            />
          );
        })}
      </svg>
      <SpectrumView
        min={80e-9}
        max={2000e-9}
        scale="log"
        bands
        plotHeight={50}
        markers={JUMPS.map((j) => ({ at: wavelength(j.lower, j.upper), color: same(j) ? 'var(--accent)' : 'var(--text-muted)', dashed: !same(j), label: same(j) ? lineName(j.lower, j.upper) : undefined }))}
        ariaLabel={`Where hydrogen’s lines fall in the spectrum, ${lineName(jump.lower, jump.upper)} at ${formatWavelength(lambda)} marked`}
      />
      <div className={styles.readout} style={{ alignItems: 'center' }}>
        <span>
          Photon: <b>{jumpEnergy(jump.lower, jump.upper).toFixed(2)} eV</b>
        </span>
        <span>
          Wavelength: <b>{formatWavelength(lambda)}</b>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Colour:
          <svg viewBox="-10 -10 20 20" width="20" height="20" aria-hidden="true">
            <rect x="-10" y="-10" width="20" height="20" rx="4" fill={selectedNm >= 380 && selectedNm <= 750 ? rgb(spectralColour(selectedNm)) : '#475569'} />
          </svg>
          <b>{selectedNm < 380 ? 'ultraviolet' : selectedNm > 750 ? 'infrared' : visibleName(selectedNm)}</b>
        </span>
      </div>
      <Caption>{describeJump(jump, absorb)}</Caption>
    </Figure>
  );
}

function visibleName(nm: number): string {
  if (nm < 450) return 'violet';
  if (nm < 495) return 'blue-green';
  if (nm < 570) return 'green';
  if (nm < 590) return 'yellow';
  if (nm < 620) return 'orange';
  return 'red';
}
