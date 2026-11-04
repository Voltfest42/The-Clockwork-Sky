import { useState, type ReactNode } from 'react';
import { M_SUN, R_SUN } from '../core/constants';
import { centralPressureEstimate, centralTemperatureEstimate } from '../core/structure/estimates';
import { Caption, Figure } from '../viz/Figure';
import { CENTRE_STARS, ESTIMATE_MU, formatGramsPerCc, formatKelvin, formatPascals, solar, solarGravity, weightAbove, weightPerMetre } from './holding';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * How hot must the centre be? (Figure 20.1). Left: the Sun as nested shells
 * from Model S; pick one and compare the weight of everything above each
 * square metre of it with the pressure there (they agree: hydrostatic
 * balance). Right: the rough sums for the central pressure, GM²/R⁴, and
 * temperature, GMμm/kR, for any mass and radius, beside detailed models'
 * values for the Sun and Jupiter.
 */

const START = { shell: 0.3, mass: 1, radius: 1 };
const SHELL_COUNT = 10;
const D = 240;

const formatMass = (m: number) => (m < 0.01 ? `${(m * 1047.57).toPrecision(2)} Jupiters` : `${m.toPrecision(2)} M☉`);
const formatRadius = (r: number) => (r < 0.2 ? `${(r * 9.73).toPrecision(2)} Jupiters` : `${r.toPrecision(2)} R☉`);

/** "21 times", "1.1 times", "seven times". */
function ratio(a: number, b: number): string {
  const x = a / b;
  if (x >= 1) return `${x >= 10 ? Math.round(x) : x.toPrecision(2)} times too high`;
  const y = 1 / x;
  return `${y >= 10 ? Math.round(y) : y.toPrecision(2)} times too low`;
}

export function HotCentreFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [shell, setShell] = useState(START.shell);
  const [mass, setMass] = useState(START.mass);
  const [radius, setRadius] = useState(START.radius);
  const reset = () => {
    setShell(START.shell);
    setMass(START.mass);
    setRadius(START.radius);
  };
  const preset = CENTRE_STARS.find((s) => Math.abs(s.mass / mass - 1) < 1e-6 && Math.abs(s.radius / radius - 1) < 1e-6);
  const P = solar(shell, 'P');
  const weight = weightAbove(shell);
  const perKm = weightPerMetre(shell) * 1000;
  const pEstimate = centralPressureEstimate(mass * M_SUN, radius * R_SUN);
  const tEstimate = centralTemperatureEstimate(mass * M_SUN, radius * R_SUN, ESTIMATE_MU);
  const truth = preset?.truth;

  return (
    <Figure
      number={number}
      title="How hot must the centre be?"
      description="The Sun drawn as nested shells from Model S, the standard model of its insides. Pick a shell: the weight of all the gas above each square metre of it equals the pressure there, so every layer is held up. Beside it, rough sums give the central pressure and temperature any star needs just to hold up its own weight, with no nuclear physics: about 10¹⁵ pascals and 14 million degrees for the Sun, against Model S’s 2.35 × 10¹⁶ pascals and 15.7 million degrees."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the shell you picked', symbol: <circle r="7" fill="none" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'denser gas is darker', symbol: <circle r="7" fill="var(--sun)" fillOpacity={0.9} /> },
        { label: 'weight of the gas above', symbol: <rect x="-9" y="-4" width="18" height="8" rx="2" fill="var(--series-1)" /> },
        { label: 'pressure holding it up', symbol: <rect x="-9" y="-4" width="18" height="8" rx="2" fill="var(--series-2)" /> },
      ]}
      simplified={
        <p>
          The shells are Model S’s, the Sun as it is today. The rough sums drop every number in front (they are estimates to a factor of ten or
          so) and take fully ionised gas like the Sun’s, 0.61 atomic mass units per particle, for every star. Jupiter’s values are from
          interior models, which disagree about its centre’s temperature (20,000–35,000 K). Red dwarfs’ and Sirius A’s centres come from
          models built in Chapter 21.
        </p>
      }
    >
      <div className={figureStyles.withSide}>
        <div>
          <p className={styles.panelTitle}>The Sun, layer by layer (Model S)</p>
          <svg viewBox={`0 0 ${D} ${D}`} width="100%" style={{ maxWidth: 280, display: 'block', margin: '0 auto' }} role="img" aria-label={`The Sun as ${SHELL_COUNT} shells, the one at ${shell.toFixed(2)} of its radius picked`}>
            {Array.from({ length: SHELL_COUNT }, (_, i) => {
              const outer = 1 - i / SHELL_COUNT;
              const rho = solar(outer - 0.5 / SHELL_COUNT, 'rho');
              // Darker for denser: opacity from the log of the density, 0.0002 to 154 g/cm³.
              const shade = 0.25 + 0.7 * Math.max(0, Math.log10(rho / 0.2) / Math.log10(154_000 / 0.2));
              return <circle key={i} cx={D / 2} cy={D / 2} r={(outer * D) / 2 - 1} fill="var(--sun)" fillOpacity={shade} stroke="var(--bg)" strokeWidth="0.75" />;
            })}
            <circle cx={D / 2} cy={D / 2} r={(shell * D) / 2} fill="none" stroke="var(--accent)" strokeWidth="3" />
            <line x1={D / 2} y1={D / 2} x2={D / 2 + (shell * D) / 2} y2={D / 2} stroke="var(--text)" strokeWidth="1" strokeDasharray="3 2" />
          </svg>
          <div className={styles.controls} style={{ marginTop: 8 }}>
            <Slider label="Shell at" value={shell} min={0.02} max={0.98} step={0.01} format={(x) => `${x.toFixed(2)} R☉`} onChange={setShell} />
          </div>
          <svg viewBox="0 0 600 70" width="100%" role="img" aria-label={`Weight above: ${formatPascals(weight)}; pressure: ${formatPascals(P)}`}>
            {[
              { y: 4, label: `Weight above each m²: ${formatPascals(weight)}`, value: weight, color: 'var(--series-1)' },
              { y: 38, label: `Pressure here: ${formatPascals(P)}`, value: P, color: 'var(--series-2)' },
            ].map((b) => (
              <g key={b.label}>
                <text x={0} y={b.y + 10} fontSize="13" fill="var(--text)">
                  {b.label}
                </text>
                <rect x={0} y={b.y + 15} width={600 * Math.min(1, b.value / Math.max(weight, P))} height={12} rx={2} fill={b.color} />
              </g>
            ))}
          </svg>
        </div>
        <div className={figureStyles.side}>
          <dl className={styles.facts}>
            <div>
              <dt>Mass inside</dt>
              <dd>{(solar(shell, 'm') / M_SUN).toFixed(2)} of the Sun’s</dd>
            </div>
            <div>
              <dt>Gravity there</dt>
              <dd>{Math.round(solarGravity(shell)).toLocaleString('en-GB')} m/s², {Math.round(solarGravity(shell) / 9.81)} times Earth’s</dd>
            </div>
            <div>
              <dt>Density</dt>
              <dd>{formatGramsPerCc(solar(shell, 'rho'))}</dd>
            </div>
            <div>
              <dt>Pressure drop across 1 km</dt>
              <dd>{formatPascals(perKm)}, the weight of that kilometre of gas</dd>
            </div>
          </dl>
        </div>
      </div>

      <p className={styles.panelTitle} style={{ marginTop: 14 }}>
        Any star: the rough sums
      </p>
      <div className={styles.presets} role="group" aria-label="Stars">
        {CENTRE_STARS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={styles.toggle}
            aria-pressed={preset?.id === s.id}
            onClick={() => {
              setMass(s.mass);
              setRadius(s.radius);
            }}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className={styles.controls} style={{ marginTop: 8 }}>
        <Slider label="Mass" value={mass} min={0.0005} max={20} log format={formatMass} onChange={setMass} />
        <Slider label="Radius" value={radius} min={0.05} max={20} log format={formatRadius} onChange={setRadius} />
      </div>
      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          Central pressure ~ GM²/R⁴ = <b>{formatPascals(pEstimate)}</b>
          {truth && (
            <>
              ; {truth.source}: {formatPascals(truth.P)} (the estimate is {ratio(pEstimate, truth.P)})
            </>
          )}
          .
        </p>
        <p style={{ margin: '6px 0 0' }}>
          Central temperature ~ GMμm/kR = <b>{formatKelvin(tEstimate)}</b>
          {truth && (
            <>
              ; {truth.source}: {formatKelvin(truth.T)} (the estimate is {ratio(tEstimate, truth.T)})
            </>
          )}
          .
        </p>
        {preset && <p style={{ margin: '6px 0 0' }}>{preset.note}</p>}
      </div>
      <Caption>
        {`At ${shell.toFixed(2)} of the Sun’s radius the gas above weighs ${formatPascals(weight)} on each square metre, and the pressure there is ${formatPascals(P)}: they agree to ${Math.abs((weight / P - 1) * 100).toFixed(1)}%. `}
        {`A star of ${formatMass(mass)} and ${formatRadius(radius)} needs about ${formatPascals(pEstimate)} and ${formatKelvin(tEstimate)} at its centre just to hold itself up.`}
      </Caption>
    </Figure>
  );
}
