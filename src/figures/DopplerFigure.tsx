import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { Caption, Figure } from '../viz/Figure';
import { rgb, spectralColour } from '../viz/spectrum/format';
import { describeDoppler, DOPPLER_WINDOW, LAB_LINES, modelSpectrum, PAIR, pairVelocities, RADIAL_VELOCITIES, shiftedNm } from './spectra';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The Doppler shifter (Figure 12.5): a star's spectrum, close up round
 * sodium's D lines, under a laboratory's sodium lamp. Set the star's speed
 * along the line of sight, or press a real star; its lines slide to the red
 * when it moves away and to the blue when it comes closer. A pair of stars
 * in orbit shows two sets of lines moving apart and together.
 */

const [FROM, TO] = DOPPLER_WINDOW;
const W = 560;
const MAX = 300;

export function DopplerFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [kms, setKms] = useState(0);
  const [pair, setPair] = useState(false);
  const [phase, setPhase] = useState(0.15);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const reduced = useReducedMotion();
  const reset = () => {
    setKms(0);
    setPair(false);
    setPhase(0.15);
    setPlaying(false);
  };
  useAnimationFrame(pair && playing && onScreen, (dt) => setPhase((p) => (p + dt / 6) % 1));

  const velocities = pair ? pairVelocities(phase) : [kms];
  const star = RADIAL_VELOCITIES.find((s) => Math.abs(s.kms - kms) < 0.05);
  // The model's absorption at rest for a Sun-like star, at fine resolution, shifted per star.
  const rest = useMemo(() => modelSpectrum(5772, {}, 0, FROM - 3, TO + 3, 0.02).depth, []);
  const x = (nm: number) => 10 + ((nm - FROM) / (TO - FROM)) * (W - 20);

  const depthAt = (nm: number) => {
    let transmission = 1;
    for (const v of velocities) {
      const back = nm / (1 + (v * 1000) / 299_792_458);
      const i = Math.round((back - (FROM - 3)) / 0.02);
      const d = rest[Math.max(0, Math.min(rest.length - 1, i))]?.[1] ?? 0;
      transmission *= 1 - d / velocities.length;
    }
    return 1 - transmission;
  };
  const columns = Array.from({ length: 400 }, (_, i) => FROM + ((i + 0.5) * (TO - FROM)) / 400);

  return (
    <Figure
      number={number}
      title="Doppler shifter"
      description="A close-up of a star’s spectrum round sodium’s two yellow D lines, with a laboratory sodium lamp’s lines above for comparison. Set the star’s speed along the line of sight: moving away, its lines shift to longer, redder wavelengths; coming closer, to shorter, bluer ones, by the fraction v/c. Real stars: Barnard’s star approaches at 110 km/s, Arcturus at 5 km/s, and Aldebaran recedes at 54 km/s. A pair of stars in orbit shows two sets of lines moving apart and together."
      height={470}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the laboratory’s sodium lines, at rest', symbol: <rect x="-2" y="-8" width="4" height="16" fill="#fbbf24" /> },
        { label: 'the star’s dark lines', symbol: <rect x="-2" y="-8" width="4" height="16" fill="#111" stroke="var(--border)" /> },
        { label: 'where the lines would be at rest', symbol: <line y1="-8" y2="8" stroke="var(--text-muted)" strokeDasharray="3 2" /> },
      ]}
      simplified={
        <p>
          v = c Δλ/λ holds for speeds far below light’s, which all stars’ are. Every star is drawn with the Sun’s spectrum from the toy model of Figure
          12.3, at a resolution a professional spectrograph would reach, so the shift is easy to see; Barnard’s star, a cool red dwarf, really
          has far broader sodium lines. Measured speeds also include Earth’s own motion round the
          Sun, up to 30 km/s, which astronomers subtract.
        </p>
      }
    >
      <div ref={ref} className={styles.controls}>
        <label className={styles.slider}>
          Speed away from us
          <input
            type="range"
            min={-MAX}
            max={MAX}
            step={0.1}
            value={kms}
            disabled={pair}
            onChange={(e) => setKms(Number(e.target.value))}
            aria-valuetext={`${kms > 0 ? '+' : kms < 0 ? '−' : ''}${Math.abs(kms).toFixed(1)} km/s, ${kms > 0 ? 'moving away' : kms < 0 ? 'approaching' : 'at rest'}`}
          />
          <output>
            {kms > 0 ? '+' : kms < 0 ? '−' : ''}
            {Math.abs(kms).toFixed(1)} km/s
          </output>
        </label>
        <div className={styles.toggles} role="group" aria-label="Real stars">
          <span className={styles.togglesLabel}>Real stars:</span>
          {RADIAL_VELOCITIES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.toggle}
              aria-pressed={!pair && Math.abs(kms - s.kms) < 0.05}
              onClick={() => {
                setPair(false);
                setKms(s.kms);
              }}
            >
              {s.name}
            </button>
          ))}
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={pair}
            onClick={() => {
              setPair(!pair);
              setPlaying(!pair && !reduced);
            }}
          >
            A pair of stars in orbit
          </button>
          {pair && (
            <>
              <button type="button" className={figureStyles.toolButton} onClick={() => setPlaying(!playing)}>
                {playing ? 'Pause' : 'Play'}
              </button>
              <label className={styles.slider} style={{ minWidth: 200 }}>
                Orbit
                <input type="range" min={0} max={1} step={0.005} value={phase} onChange={(e) => setPhase(Number(e.target.value))} aria-valuetext={`${Math.round(phase * PAIR.periodDays * 24)} hours into a ${PAIR.periodDays}-day orbit`} />
              </label>
            </>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} 150`} className={seasonStyles.svgLight} role="img" aria-label={`The laboratory’s sodium lines above the star’s spectrum, ${pair ? 'two stars’ lines split by their orbit' : `shifted by ${kms.toFixed(1)} km/s`}`}>
        <text x={10} y={12} fontSize="11" fill="var(--text)">
          Laboratory sodium lamp
        </text>
        <rect x={10} y={16} width={W - 20} height={34} fill="#000" />
        {LAB_LINES.map((nm) => (
          <rect key={nm} x={x(nm) - 1.5} y={16} width={3} height={34} fill="#fbbf24" />
        ))}
        <text x={10} y={68} fontSize="11" fill="var(--text)">
          {pair ? 'Two Sun-like stars in orbit' : star ? star.name : 'A Sun-like star'}
        </text>
        {columns.map((nm) => (
          <rect key={nm} x={x(nm) - 0.8} y={72} width={((W - 20) / 400) * 1.05} height={40} fill={rgb(spectralColour(nm))} opacity={1 - 0.94 * depthAt(nm)} />
        ))}
        <rect x={10} y={72} width={W - 20} height={40} fill="none" stroke="var(--border)" />
        {LAB_LINES.map((nm) => (
          <g key={nm}>
            <line x1={x(nm)} x2={x(nm)} y1={50} y2={71} stroke="var(--text-muted)" strokeDasharray="3 2" />
            <path d={`M${x(nm)} 113 l-3.5 6 h7 z`} fill="var(--text-muted)" />
          </g>
        ))}
        {[586, 587, 588, 589, 590, 591, 592].map((nm) => (
          <g key={nm}>
            <line x1={x(nm)} x2={x(nm)} y1={116} y2={121} stroke="var(--text-muted)" />
            <text x={x(nm)} y={133} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
              {nm} nm
            </text>
          </g>
        ))}
        <text x={W / 2} y={147} fontSize="11" textAnchor="middle" fill="var(--text)">
          ← bluer · redder →
        </text>
      </svg>
      <div className={styles.readout}>
        {velocities.map((v, i) => (
          <span key={i}>
            {pair ? `Star ${i + 1}: ` : 'D₂ line at '}
            <b>{shiftedNm(LAB_LINES[0], v).toFixed(3)} nm</b> ({v >= 0 ? '+' : '−'}
            {Math.abs(v).toFixed(1)} km/s)
          </span>
        ))}
      </div>
      <Caption>
        {pair
          ? `Two stars circle each other every ${PAIR.periodDays} days. When one comes towards us the other moves away, so their lines split, then merge as they cross our line of sight: star 1 at ${velocities[0] >= 0 ? '+' : '−'}${Math.abs(velocities[0]).toFixed(0)} km/s, star 2 at ${velocities[1] >= 0 ? '+' : '−'}${Math.abs(velocities[1]).toFixed(0)} km/s. Chapter 14 weighs stars this way.`
          : describeDoppler(kms)}
      </Caption>
    </Figure>
  );
}
