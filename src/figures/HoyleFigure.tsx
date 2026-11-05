import { useMemo, useState, type ReactNode } from 'react';
import { formatScientific, powerOfTen } from '../core/math/scientific';
import { gamowPeak } from '../core/nuclear/gamow';
import { burnHelium } from '../core/nuclear/helium';
import { HOYLE_ABOVE_THRESHOLD, tripleAlpha, type TripleAlphaOptions } from '../core/nuclear/rates';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { formatHotKelvin, formatShare, HELIUM_CORE, HOYLE_RANGE, LEVELS } from './furnace';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Hoyle's resonance (Figure 22.3). Two helium nuclei make beryllium-8, which
 * falls apart in 10⁻¹⁶ s; carbon forms only if a third arrives in time, and
 * it does so fast enough only because carbon-12 has an energy level, the Hoyle
 * state, 380 keV above three helium nuclei, at the top of the energies at
 * which they meet. Move the state, or take it away, and see the triple-alpha
 * rate fall by powers of ten, the core that must get hotter to burn its
 * helium, and the carbon it leaves: a toy helium core burning at a star's
 * steady power until its helium is gone.
 */

const START = { energy: HOYLE_ABOVE_THRESHOLD, none: false };

const LEV = { W: 250, H: 300, top: 0.56, bottom: -0.16 };
const ly = (e: number) => 20 + ((LEV.top - e) / (LEV.top - LEV.bottom)) * (LEV.H - 50);

export function HoyleFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [energy, setEnergy] = useState(START.energy);
  const [none, setNone] = useState(START.none);
  const [cursor, setCursor] = useState(8);
  const reset = () => {
    setEnergy(START.energy);
    setNone(START.none);
    setCursor(8);
  };
  const shift = Math.round((energy - HOYLE_ABOVE_THRESHOLD) * 200) / 200;
  const options: TripleAlphaOptions = none ? { noHoyle: true } : { hoyleShift: shift };
  const ashes = useMemo(() => burnHelium(HELIUM_CORE.rho, HELIUM_CORE.years, none ? { noHoyle: true } : { hoyleShift: shift }), [none, shift]);
  const real = useMemo(() => burnHelium(HELIUM_CORE.rho, HELIUM_CORE.years), []);

  const xs = Array.from({ length: 101 }, (_, i) => 7.7 + i / 100);
  const rateAt = (x: number, o: TripleAlphaOptions) => tripleAlpha(10 ** x, o);
  const T8 = 1e8;
  const factor = tripleAlpha(T8, options) / tripleAlpha(T8);
  const nu = Math.log(tripleAlpha(T8 * 1.001, options) / tripleAlpha(T8 * 0.999, options)) / Math.log(1.001 / 0.999);
  // The window of energies at which a helium nucleus meets beryllium-8 at the core's starting temperature.
  const window = gamowPeak({ name: '⁸Be + α', z1: 4, z2: 2, a1: 8, a2: 4 }, ashes.startT);
  // gamowPeak works in keV; the level diagram in MeV.
  const wLo = LEVELS.be8 + (window.E0 - window.width / 2) / 1000;
  const wHi = LEVELS.be8 + (window.E0 + window.width / 2) / 1000;
  const stateE = LEVELS.be8 + (HOYLE_ABOVE_THRESHOLD - LEVELS.be8) + shift;

  const times = (x: number) => (x < 1e4 ? Number(x.toPrecision(1)).toLocaleString('en-GB') : powerOfTen(Math.round(Math.log10(x))));
  const factorText =
    Math.abs(Math.log10(factor)) < 0.05
      ? 'as in nature'
      : factor < 1
        ? `about ${times(1 / factor)} times slower than nature’s`
        : `about ${times(factor)} times faster than nature’s`;
  const caption = none
    ? `With no Hoyle state, carbon forms only off resonance, ${factorText} at 100 million K. The core must heat to ${formatHotKelvin(ashes.startT)} to burn its helium in 100 million years, and there carbon catches helium as fast as it forms: it ends with ${formatShare(ashes.C)} carbon, ${formatShare(ashes.O)} oxygen and ${formatShare(ashes.Ne)} neon.`
    : `With the Hoyle state ${Math.round(energy * 200) * 5} keV above three helium nuclei${Math.abs(shift) < 0.001 ? ' (as in nature)' : ''}, triple-alpha runs ${factorText} at 100 million K and climbs as T to the power ${Math.round(nu)}. The core burns its helium from ${formatHotKelvin(ashes.startT)} to ${formatHotKelvin(ashes.endT)} and leaves ${formatShare(ashes.C)} carbon, ${formatShare(ashes.O)} oxygen and ${formatShare(ashes.Ne)} neon.`;

  return (
    <Figure
      number={number}
      title="Hoyle’s resonance"
      description="Two helium nuclei make beryllium-8, which falls apart in a ten-thousand-trillionth of a second; carbon forms only when a third helium nucleus arrives in time. It does so fast enough only because carbon-12 has an energy level, the Hoyle state, 380 keV above three separate helium nuclei, just above the energies at which they meet in a red giant’s core. Moved up by 60 keV, it would make carbon some 300 times more slowly, and a helium core would end almost without carbon; without it, helium would burn to oxygen and neon."
      height={720}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'triple-alpha, as chosen', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'with the Hoyle state where it is', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="5 3" /> },
        { label: 'without the Hoyle state', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="2 3" /> },
        { label: 'energies at which helium meets ⁸Be', symbol: <rect x="-8" y="-6" width="16" height="12" rx="2" fill="var(--series-2)" fillOpacity={0.25} /> },
        { label: 'carbon', symbol: <rect x="-8" y="-6" width="16" height="12" rx="2" fill="var(--text)" fillOpacity={0.8} /> },
        { label: 'oxygen', symbol: <rect x="-8" y="-6" width="16" height="12" rx="2" fill="var(--series-1)" fillOpacity={0.8} /> },
        { label: 'neon', symbol: <rect x="-8" y="-6" width="16" height="12" rx="2" fill="var(--series-3)" fillOpacity={0.8} /> },
      ]}
      simplified={
        <p>
          Caughlan and Fowler’s triple-alpha rate (1988), with the Hoyle state moved by changing its energy alone (its strength kept, although in
          nature that would change too), or left out to leave their off-resonance part; ¹²C(α,γ)¹⁶O from deBoer and colleagues (2017), uncertain
          by 10–20%. The helium core is one zone of pure helium at 10⁴ g/cm³, burning at the steady power that would burn half of it in 100 million
          years by triple-alpha alone, heating up as the helium runs low: a toy. Real cores mix as they burn and end with about 20–40% carbon.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider
          label="The Hoyle state’s energy above three helium nuclei"
          value={energy}
          min={HOYLE_RANGE[0]}
          max={HOYLE_RANGE[1]}
          step={0.005}
          format={(e) => `${Math.round(e * 200) * 5} keV${Math.abs(e - HOYLE_ABOVE_THRESHOLD) < 0.0026 ? ' (nature’s)' : ''}`}
          onChange={setEnergy}
          disabled={none}
        />
      </div>
      <div className={figureStyles.toolbar}>
        <button type="button" className={styles.toggle} aria-pressed={none} onClick={() => setNone((n) => !n)}>
          No Hoyle state
        </button>
      </div>
      <div className={figureStyles.withSide}>
        <ProfilePlot
          series={[
            { name: 'with the Hoyle state where it is', color: 'var(--text-muted)', dashed: true, points: xs.map((x) => ({ x, y: rateAt(x, {}) })) },
            { name: 'without the Hoyle state', color: 'var(--series-2)', dashed: true, points: xs.map((x) => ({ x, y: rateAt(x, { noHoyle: true }) })) },
            { name: 'as chosen', color: 'var(--accent)', points: xs.map((x) => ({ x, y: rateAt(x, options) })) },
          ]}
          xMin={7.7}
          xMax={8.7}
          formatX={(x) => (Math.abs(x - 8) < 1e-9 ? '100 million K' : Math.abs(x - 8.5) < 1e-9 ? '316 million K' : '')}
          xLabel="Temperature (log scale)"
          yLabel="Triple-alpha rate"
          yScale="log"
          yMin={1e-40}
          yMax={1e-6}
          formatValue={(y) => formatScientific(y, 2)}
          cursor={cursor}
          onCursor={setCursor}
          cursorText={(x) => formatHotKelvin(10 ** x)}
          ariaLabel={`The triple-alpha rate against temperature: as chosen it runs ${factorText} at 100 million K`}
          height={300}
          width={460}
        />
        <svg viewBox={`0 0 ${LEV.W} ${LEV.H}`} width="100%" role="img" aria-label={`Energy levels: beryllium-8 92 keV above three helium nuclei, ${none ? 'no Hoyle state' : `the Hoyle state ${Math.round(energy * 200) * 5} keV above them`}, and the window of energies at which helium meets beryllium-8 near ${Math.round((wLo + wHi) * 500)} keV`}>
          <rect x={10} y={ly(Math.min(LEV.top, wHi))} width={LEV.W - 20} height={ly(Math.max(LEV.bottom, wLo)) - ly(Math.min(LEV.top, wHi))} fill="var(--series-2)" fillOpacity={0.18} />
          <text x={14} y={ly(Math.min(LEV.top, wHi)) + 12} fontSize="10.5" fill="var(--text-muted)">
            where helium meets ⁸Be
          </text>
          <line x1={14} x2={84} y1={ly(0)} y2={ly(0)} stroke="var(--text)" strokeWidth="2" />
          <text x={49} y={ly(0) + 16} fontSize="11.5" textAnchor="middle" fill="var(--text)">
            3 ⁴He
          </text>
          <text x={49} y={ly(0) + 30} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
            0
          </text>
          <line x1={94} x2={164} y1={ly(LEVELS.be8)} y2={ly(LEVELS.be8)} stroke="var(--text)" strokeWidth="2" />
          <text x={129} y={ly(LEVELS.be8) + 16} fontSize="11.5" textAnchor="middle" fill="var(--text)">
            ⁸Be + ⁴He
          </text>
          <text x={129} y={ly(LEVELS.be8) + 30} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
            +92 keV
          </text>
          <line x1={174} x2={240} y1={ly(HOYLE_ABOVE_THRESHOLD)} y2={ly(HOYLE_ABOVE_THRESHOLD)} stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4 3" />
          {!none && <line x1={174} x2={240} y1={ly(stateE)} y2={ly(stateE)} stroke="var(--accent)" strokeWidth="3" />}
          {!none && (
            <text x={LEV.W - 2} y={ly(stateE) - 6} fontSize="11.5" textAnchor="end" fontWeight="600" fill="var(--text)">
              Hoyle state, +{Math.round(energy * 200) * 5} keV
            </text>
          )}
          <line x1={207} x2={207} y1={ly(none ? HOYLE_ABOVE_THRESHOLD : stateE) + 4} y2={LEV.H - 26} stroke="var(--text-muted)" markerEnd="none" strokeDasharray="2 2" />
          <text x={207} y={LEV.H - 12} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
            ¹²C ↓ 7.27 MeV, γ
          </text>
          <text x={10} y={14} fontSize="10.5" fill="var(--text-muted)">
            energy, not to scale below 0
          </text>

        </svg>
      </div>
      <div className={figureStyles.below}>
        <p className={styles.panelTitle}>What a helium core makes</p>
        <svg viewBox="0 0 560 92" width="100%" role="img" aria-label={`The helium core ends with ${formatShare(ashes.C)} carbon, ${formatShare(ashes.O)} oxygen and ${formatShare(ashes.Ne)} neon; with nature’s Hoyle state, ${formatShare(real.C)} carbon`}>
          {[
            { y: 0, label: 'As chosen', a: ashes },
            { y: 46, label: 'With nature’s Hoyle state', a: real },
          ].map((row) => {
            let x = 0;
            return (
              <g key={row.label}>
                <text x={0} y={row.y + 12} fontSize="12" fill="var(--text)">
                  {row.label}: carbon {formatShare(row.a.C)}, oxygen {formatShare(row.a.O)}, neon {formatShare(row.a.Ne)}
                </text>
                {[
                  { v: row.a.C, c: 'var(--text)', n: 'carbon' },
                  { v: row.a.O, c: 'var(--series-1)', n: 'oxygen' },
                  { v: row.a.Ne, c: 'var(--series-3)', n: 'neon' },
                ].map((s) => {
                  const w = s.v * 560;
                  const el = <rect key={s.n} x={x} y={row.y + 18} width={Math.max(0, w)} height={16} fill={s.c} fillOpacity={0.8} />;
                  x += w;
                  return el;
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
