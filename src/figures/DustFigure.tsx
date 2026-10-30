import { useMemo, useState, type ReactNode } from 'react';
import { superscript } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { formatKelvin } from '../viz/spectrum/format';
import { SpectrumView } from '../viz/spectrum/SpectrumView';
import { Slider } from './Slider';
import { DUST_PRESETS, DUST_STARS, dustedSpectrum, dustReadout } from './starBirth';
import styles from './sky/sky.module.css';

/**
 * Dust dims and reddens (Figure 16.1): a star's light through a cloud of dust,
 * by the extinction law of Cardelli, Clayton & Mathis. Blue light is dimmed more
 * than red, so the star looks fainter and redder; infrared gets through where
 * visible light can't.
 */

const MIN = 0.1e-6;
const MAX = 5e-6;
const Y_MIN = 1e-8;

function share(x: number): string {
  if (x > 0.995) return 'all of it';
  if (x >= 0.01) return `${Math.round(x * 100)}%`;
  const exp = Math.floor(Math.log10(x));
  return `1 part in ${exp >= -6 ? Math.round(1 / x).toLocaleString('en-GB') : `10${superscript(-exp)}`}`;
}

const rgb = ([r, g, b]: readonly number[], k = 1) => `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;

export function DustFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [starId, setStarId] = useState<string>('sun');
  const [av, setAv] = useState(0);
  const reset = () => {
    setStarId('sun');
    setAv(0);
  };
  const star = DUST_STARS.find((s) => s.id === starId)!;
  const clear = useMemo(() => dustedSpectrum(star.kelvin, 0, MIN, MAX), [star.kelvin]);
  const dusted = useMemo(() => dustedSpectrum(star.kelvin, av, MIN, MAX), [star.kelvin, av]);
  const r = dustReadout(star.kelvin, av);
  const preset = DUST_PRESETS.find((p) => Math.abs(p.av - av) < 0.05);
  // The disc dims with the visible light let through, but never quite to black, so its colour still shows.
  const dim = av === 0 ? 1 : Math.max(0.18, r.vShare ** 0.25);

  return (
    <Figure
      number={number}
      title="Dust dims and reddens"
      description="A star’s spectrum seen through dust, from no dust to 30 magnitudes of it (the centre of the Galaxy). Dust dims blue and ultraviolet light far more than red, so the star looks fainter and redder; infrared light gets through when almost no visible light does."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the star’s light without dust', symbol: <path d="M-10 8 Q-4 -12 10 4" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="4 3" fill="none" /> },
        { label: 'what gets through the dust (visible part in its colours)', symbol: <path d="M-10 8 Q-4 -12 10 4" stroke="var(--series-1)" strokeWidth="2.25" fill="none" /> },
      ]}
      simplified={
        <p>
          The star is a black body, and the dust follows Cardelli, Clayton and Mathis’s average law for the Milky Way (R<sub>V</sub> = 3.1),
          measured from 0.125 to 3.3 micrometres and carried on beyond. Real dust varies from cloud to cloud: dense clouds’ larger grains dim
          the colours more evenly. Dust also glows in far infrared with the light it soaks up, which isn’t drawn.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Star" style={{ marginBottom: 6 }}>
        {DUST_STARS.map((s) => (
          <button key={s.id} type="button" className={styles.toggle} aria-pressed={s.id === starId} onClick={() => setStarId(s.id)}>
            {s.name}
          </button>
        ))}
      </div>
      <div className={styles.presets} role="group" aria-label="How much dust" style={{ marginBottom: 6 }}>
        {DUST_PRESETS.map((p) => (
          <button key={p.id} type="button" className={styles.toggle} aria-pressed={preset?.id === p.id} onClick={() => setAv(p.av)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <Slider label="Dust (A_V)" value={av} min={0} max={30} step={0.1} format={(v) => `${v.toFixed(1)} magnitudes`} onChange={setAv} />
      </div>
      <SpectrumView
        min={MIN}
        max={MAX}
        scale="log"
        bands
        plotHeight={190}
        curves={[
          { id: 'clear', label: 'without dust', color: 'var(--series-2)', points: clear, dashed: true },
          { id: 'dusted', label: 'through the dust', color: 'var(--series-1)', points: dusted.map(([l, v]) => [l, Math.max(v, Y_MIN * 1.0001)] as const), rainbow: true },
        ]}
        y={{ scale: 'log', min: Y_MIN, max: 2, label: 'Brightness (log)', ticks: [1e-8, 1e-6, 1e-4, 1e-2, 1], format: (v) => (v >= 1 ? '1' : `10${superscript(Math.round(Math.log10(v)))}`) }}
        ariaLabel={`The spectrum of ${star.name.toLowerCase()} (${formatKelvin(star.kelvin)}) through ${av.toFixed(1)} magnitudes of dust`}
      />
      <div className={styles.split} style={{ alignItems: 'center', marginTop: 8 }}>
        <div className={styles.readout} style={{ flexDirection: 'column', gap: 4 }}>
          <span>
            Visible light (V) let through: <b>{share(r.vShare)}</b>
          </span>
          <span>
            Infrared (K, 2.2 µm) let through: <b>{share(r.kShare)}</b>
          </span>
          <span>
            Reddened by: <b>{r.reddening.toFixed(2)} magnitudes in B − V</b>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'center' }}>
          {[
            { label: 'Without dust', fill: rgb(r.clearColour) },
            { label: 'Through the dust', fill: rgb(r.colour, dim) },
          ].map((d) => (
            <figure key={d.label} style={{ margin: 0, textAlign: 'center' }}>
              <svg viewBox="-30 -30 60 60" width="72" height="72" role="img" aria-label={`${d.label}: the star’s colour`}>
                <rect x={-30} y={-30} width={60} height={60} rx={8} fill="#070b16" />
                <circle r={18} fill={d.fill} />
              </svg>
              <figcaption style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <Caption>
        {av === 0
          ? 'No dust: the star as it is. Add dust and watch the blue end fall first.'
          : `Through ${av.toFixed(1)} magnitudes of dust: ${share(r.vShare)} of the visible light and ${share(r.kShare)} of the infrared get through, and the star looks ${r.reddening.toFixed(1)} magnitudes redder in B − V.`}
      </Caption>
    </Figure>
  );
}
