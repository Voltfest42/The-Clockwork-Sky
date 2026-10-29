import { useId, useMemo } from 'react';
import { modelSpectrum } from '../../figures/spectra';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { formatKelvin, rgb, spectralColour } from '../../viz/spectrum/format';
import { checkBalmerPeak } from './chapter12Answers';
import styles from './checks.module.css';

const isKelvin = (value: unknown): value is number => typeof value === 'number' && value >= 2500 && value <= 40000;

export function BalmerPeak() {
  return (
    <InteractiveQuestion
      id="balmer-peak"
      prompt="In the model of Figure 12.3, set the temperature where hydrogen’s lines (the Balmer lines) are strongest."
      initial={5772}
      isState={isKelvin}
      check={(k) => checkBalmerPeak(k)}
    >
      {(k, set) => <Strip kelvin={k} onKelvin={set} />}
    </InteractiveQuestion>
  );
}

const FROM = 380;
const TO = 700;
const BALMER = [656.28, 486.13, 434.05, 410.17];

function Strip({ kelvin, onKelvin }: { kelvin: number; onKelvin: (k: number) => void }) {
  const id = useId();
  const uid = id.replace(/[^a-zA-Z0-9]/g, '');
  const depth = useMemo(() => modelSpectrum(kelvin, {}, 0, FROM, TO, 0.5).depth, [kelvin]);
  const W = 440;
  const x = (nm: number) => 4 + ((nm - FROM) / (TO - FROM)) * (W - 8);
  return (
    <div style={{ maxWidth: 460 }}>
      <svg viewBox={`0 0 ${W} 52`} width="100%" role="img" aria-label={`The model spectrum at ${formatKelvin(kelvin)}, with hydrogen’s lines marked`}>
        <defs>
          <linearGradient id={`g${uid}`} x1="0" x2="1">
            {Array.from({ length: 33 }, (_, i) => FROM + i * 10).map((nm) => (
              <stop key={nm} offset={(nm - FROM) / (TO - FROM)} stopColor={rgb(spectralColour(nm))} />
            ))}
          </linearGradient>
        </defs>
        <rect x={4} y={4} width={W - 8} height={30} fill={`url(#g${uid})`} />
        {depth
          .filter(([, d]) => d > 0.04)
          .map(([nm, d]) => (
            <rect key={nm} x={x(nm) - 0.6} y={4} width={1.6} height={30} fill="#000" opacity={Math.min(1, d * 1.1)} />
          ))}
        {BALMER.map((nm) => (
          <path key={nm} d={`M${x(nm)} 36 l-4 7 h8 z`} fill="var(--text)" />
        ))}
        <text x={x(656.28)} y={51} fontSize="9" textAnchor="middle" fill="var(--text-muted)">
          Hα
        </text>
        <text x={x(486.13)} y={51} fontSize="9" textAnchor="middle" fill="var(--text-muted)">
          Hβ
        </text>
      </svg>
      <div className={styles.guess}>
        <label htmlFor={id}>Temperature</label>
        <input id={id} type="range" min={3.4} max={4.6} step={0.002} value={Math.log10(kelvin)} onChange={(e) => onKelvin(Math.round(10 ** Number(e.target.value)))} aria-valuetext={formatKelvin(kelvin)} />
        <output htmlFor={id}>{formatKelvin(kelvin)}</output>
      </div>
    </div>
  );
}
