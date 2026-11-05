import { useMemo, useState, type ReactNode } from 'react';
import { FUELS, ignitionLine } from '../core/nuclear/ignition';
import { SOLAR_MIX } from '../core/structure/eos';
import { CARBON_SPREAD, STAR_15, yearsLeftAtStart } from '../data/burningStages';
import { CoreMap, type CoreLine } from '../viz/coremap/CoreMap';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { CLOCK_RANGE, formatHotKelvin, formatSolarLuminosity, formatTimeLeft, FUEL_NAMES, MASSIVE_STARS, onionAt, stageAt } from './furnace';
import { formatGramsPerCc, SUN_CENTRE } from './holding';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The last days of a massive star (Figure 22.4): a clock counting down to the
 * collapse on a log scale, the star's layers growing like an onion's, the
 * light and the neutrinos it gives out, and its centre's path across the
 * core's map through each fuel's ignition line, for stars of 15 and 25 solar
 * masses (Woosley, Heger & Weaver 2002, Table I).
 */

const LOG_T = [7, 9.8] as const;
const LOG_RHO = [-0.5, 8.5] as const;
const LINE_COLOURS = ['var(--series-1)', 'var(--series-2)', 'var(--text)', 'var(--series-3)', 'var(--accent)', 'var(--text-muted)'];
/** Clock position 0–1 → log₁₀ years left. */
const logLeft = (p: number) => CLOCK_RANGE[0] + (CLOCK_RANGE[1] - CLOCK_RANGE[0]) * p;
const progressOf = (years: number) => (Math.log10(years) - CLOCK_RANGE[0]) / (CLOCK_RANGE[1] - CLOCK_RANGE[0]);
const DAY = 1 / 365.25;
const START = { mass: 15, progress: 0.05 };
/** Where fuel is burning, in the onion. */
const BURN = '#ffd21f';

export function LastDaysFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mass, setMass] = useState(START.mass);
  const [progress, setProgress] = useState(START.progress);
  const reset = () => {
    setMass(START.mass);
    setProgress(START.progress);
  };
  const star = MASSIVE_STARS.find((s) => s.mass === mass)!;
  const other = MASSIVE_STARS.find((s) => s.mass !== mass)!;
  const starts = yearsLeftAtStart(star);
  const yearsLeft = 10 ** logLeft(progress);
  const i = stageAt(star, yearsLeft);
  // The last quarter of silicon burning, or of its last day, as the iron core grows and falls in.
  const collapseAt = Math.min(DAY, star.stages[star.stages.length - 1].years) / 4;
  const collapsing = yearsLeft < collapseAt;
  const stage = star.stages[i];
  const layers = onionAt(star, collapsing ? 6 : i);
  const lines: CoreLine[] = useMemo(
    // The late fuels burn only in dense cores; below 1,000 g/cm³ their lines mean nothing.
    () => FUELS.map((f, k) => ({ name: f.id, label: f.name, color: LINE_COLOURS[k], points: ignitionLine(f.id, k === 0 ? LOG_RHO : k === 1 ? [1, LOG_RHO[1]] : [3, LOG_RHO[1]], 26) })),
    [],
  );

  // The 15-Sun model's luminosities between its moments, interpolated on log scales.
  const luminosityAt = (years: number, key: 'photons' | 'neutrinos') => {
    const pts = STAR_15.luminosities!;
    let a = pts[0];
    let b = pts[pts.length - 1];
    for (let k = 1; k < pts.length; k++) {
      if (years >= pts[k].yearsLeft) {
        a = pts[k - 1];
        b = pts[k];
        break;
      }
    }
    if (years >= pts[0].yearsLeft) return pts[0][key];
    if (years <= pts[pts.length - 1].yearsLeft) return pts[pts.length - 1][key];
    const f = (Math.log(years) - Math.log(a.yearsLeft)) / (Math.log(b.yearsLeft) - Math.log(a.yearsLeft));
    return Math.exp(Math.log(a[key]) + f * (Math.log(b[key]) - Math.log(a[key])));
  };
  const neutrinoAt = (years: number) => luminosityAt(years, 'neutrinos');
  const lumXs = Array.from({ length: 90 }, (_, k) => -Math.log10(STAR_15.luminosities![0].yearsLeft) + (k / 89) * (Math.log10(STAR_15.luminosities![0].yearsLeft) - Math.log10(DAY)));

  const spread = stage.fuel === 'C' ? ` (other codes: up to ${CARBON_SPREAD} times longer or shorter)` : '';
  const caption = `${formatTimeLeft(yearsLeft)} before the collapse of a star of ${mass} Suns: ${
    collapsing
      ? `the silicon in its core is gone, and an iron core of ${star.ironCore} solar masses, with no fuel left to burn, is about to fall in.`
      : `its core burns ${FUEL_NAMES[stage.fuel]} at ${formatHotKelvin(stage.T)} and ${formatGramsPerCc(stage.rho)}, a stage that lasts ${formatTimeLeft(stage.years)} in all${spread}.`
  } It shines with ${formatSolarLuminosity(stage.L * 3.828e26)}${mass === 15 ? `, while neutrinos carry off ${formatSolarLuminosity(neutrinoAt(yearsLeft))}` : ''}.`;

  const maxMass = star.stages[0].mass;
  const R0 = 92;
  const radius = (m: number) => R0 * Math.sqrt(m / maxMass);

  return (
    <Figure
      number={number}
      title="The last days of a massive star"
      description="A star of 15 Suns burns hydrogen in its core for 11 million years and helium for 2 million. Then the pace quickens: carbon for 2,000 years, neon for under a year, oxygen for two and a half years, silicon for 18 days, each fuel lighting as the core contracts and heats past its ignition line. The star grows layers like an onion, with iron at the centre. From carbon on, neutrinos carry off the core’s heat far faster than light can leak out, so the core races while the surface hardly changes; a day before the collapse they carry off millions of times the star’s light."
      height={980}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: `this star’s centre, stage by stage`, symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: `${other.mass} Suns, for comparison`, symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="2.5" strokeDasharray="6 4" /> },
        { label: 'where each fuel lights', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text)" strokeWidth="1.5" /> },
        { label: 'light', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2.5" /> },
        { label: 'neutrinos', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-1)" strokeWidth="2.5" /> },
        { label: 'burning: the core, and shells', symbol: <circle r="6" fill="none" stroke={BURN} strokeWidth="2.5" strokeDasharray="3 2" /> },
      ]}
      notToScale
      simplified={
        <p>
          The stages are Woosley, Heger and Weaver’s models (2002), with the gaps between stages left out of the clock; other codes’ carbon
          burning lasts up to three times longer or shorter. Neutrino and light luminosities are from Woosley’s 15-solar-mass model. The onion is
          drawn by mass, not size: its iron cores, the 15-Sun star’s silicon and helium cores and the 25-Sun star’s helium and carbon–oxygen cores
          are published or from the course’s SSE port; its other edges are rough. Ignition lines are where each fuel’s burning first pays for the
          light (for hydrogen and helium) or the neutrinos (from carbon on) a core loses, from textbook rates and an approximate neutrino law, and
          sit within about 10% of Woosley, Heger and Weaver’s.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Star">
          {MASSIVE_STARS.map((s) => (
            <button key={s.mass} type="button" aria-pressed={mass === s.mass} onClick={() => setMass(s.mass)}>
              {s.mass} Suns
            </button>
          ))}
        </span>
        <span className={styles.toggles} role="group" aria-label="Jump to">
          <span className={styles.togglesLabel}>Jump to</span>
          {star.stages.map((s, k) => (
            <button key={s.fuel} type="button" className={styles.toggle} aria-pressed={!collapsing && i === k} onClick={() => setProgress(progressOf(starts[k]) + 0.004)}>
              {FUEL_NAMES[s.fuel][0].toUpperCase() + FUEL_NAMES[s.fuel].slice(1)}
            </button>
          ))}
          <button type="button" className={styles.toggle} aria-pressed={collapsing} onClick={() => setProgress(progressOf(collapseAt / 2))}>
            Collapse
          </button>
        </span>
      </div>
      <div className={styles.controls}>
        <Slider label="Time before the collapse" value={progress} min={0} max={1} step={0.002} format={(p) => formatTimeLeft(10 ** logLeft(p))} onChange={setProgress} />
      </div>

      <svg viewBox="0 0 560 46" width="100%" role="img" aria-label={`The clock, on a log scale of time before the collapse: ${star.stages.map((s) => `${FUEL_NAMES[s.fuel]} ${formatTimeLeft(s.years)}`).join(', ')}`}>
        {star.stages.map((s, k) => {
          const x0 = Math.max(0, progressOf(starts[k])) * 560;
          const x1 = k + 1 < starts.length ? progressOf(starts[k + 1]) * 560 : 560;
          return (
            <g key={s.fuel}>
              <rect x={x0} y={4} width={Math.max(0, x1 - x0)} height={18} fill={LINE_COLOURS[k]} fillOpacity={k === i && !collapsing ? 0.55 : 0.2} stroke="var(--border)" />
              <text x={(x0 + x1) / 2} y={17} fontSize="11" textAnchor="middle" fill="var(--text)">
                {s.fuel}
              </text>
            </g>
          );
        })}
        <line x1={progress * 560} x2={progress * 560} y1={0} y2={26} stroke="var(--text)" strokeWidth="2.5" />
        {[
          { e: 6, label: 'a million years' },
          { e: 3, label: '1,000 years' },
          { e: 0, label: 'a year' },
          { e: -2, label: '4 days' },
        ].map((t) => (
          <text key={t.e} x={progressOf(10 ** t.e) * 560} y={40} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
            {t.label}
          </text>
        ))}
      </svg>

      <div className={figureStyles.withSide}>
        <CoreMap
          mix={SOLAR_MIX}
          logT={LOG_T}
          logRho={LOG_RHO}
          lines={lines}
          tracks={[
            { name: `${other.mass}`, color: 'var(--text-muted)', dashed: true, points: other.stages.map((s) => ({ T: s.T, rho: s.rho })) },
            { name: `${star.mass}`, color: 'var(--accent)', points: star.stages.map((s) => ({ T: s.T, rho: s.rho })) },
          ]}
          points={[{ T: SUN_CENTRE.T, rho: SUN_CENTRE.rho, label: 'The Sun’s centre' }]}
          marker={{ T: stage.T, rho: stage.rho, label: `${FUEL_NAMES[stage.fuel]} burning` }}
          ariaLabel={`The core’s map with the lines where hydrogen, helium, carbon, neon, oxygen and silicon light. The centre of a star of ${mass} Suns climbs to the upper right, burning ${FUEL_NAMES[stage.fuel]} at ${formatHotKelvin(stage.T)} and ${formatGramsPerCc(stage.rho)}.`}
          height={380}
        />
        <div className={figureStyles.side}>
          <svg viewBox="0 0 270 220" width="100%" role="img" aria-label={`The star’s layers by mass, outside in: ${layers.map((l) => l.name).join('; ')}. Burning: ${layers.filter((l) => l.burning).map((l) => l.name).join('; ') || 'nothing'}.`}>
            {layers.map((l) => (
              <circle key={l.id} cx={100} cy={105} r={radius(l.outer)} fill={l.color} fillOpacity={0.6} stroke="var(--bg)" strokeWidth="1" />
            ))}
            {layers.map((l, k) => {
              if (!l.burning) return null;
              const inner = layers[k + 1];
              // A core burns at its centre; a shell at its base, the edge of the layer inside it.
              return inner ? (
                <circle key={`${l.id}-burn`} cx={100} cy={105} r={radius(inner.outer)} fill="none" stroke={BURN} strokeWidth="2.5" strokeDasharray="3 2" />
              ) : (
                <circle key={`${l.id}-burn`} cx={100} cy={105} r={Math.max(3, radius(l.outer) * 0.35)} fill={BURN} />
              );
            })}
            {layers.map((l, k) => {
              const y = 16 + k * 30;
              const r = radius(l.outer) - Math.max(2, (radius(l.outer) - (layers[k + 1] ? radius(layers[k + 1].outer) : 0)) / 2);
              return (
                <g key={`${l.id}-label`}>
                  <line x1={100 + r * 0.72} y1={105 - r * 0.7} x2={204} y2={y - 4} stroke="var(--text-muted)" strokeWidth="0.8" />
                  <text x={206} y={y} fontSize="11" fill="var(--text)">
                    {l.short}
                  </text>
                </g>
              );
            })}
            <text x={2} y={214} fontSize="10" fill="var(--text-muted)">
              drawn by mass; out to {Number(maxMass.toPrecision(3))} M☉
            </text>
          </svg>
          <dl className={styles.facts}>
            <div>
              <dt>Core burns</dt>
              <dd>{collapsing ? 'nothing: iron' : FUEL_NAMES[stage.fuel]}</dd>
            </div>
            <div>
              <dt>Centre</dt>
              <dd>
                {formatHotKelvin(stage.T)}, {formatGramsPerCc(stage.rho)}
              </dd>
            </div>
            <div>
              <dt>Stage lasts</dt>
              <dd>{formatTimeLeft(stage.years)}</dd>
            </div>
            <div>
              <dt>Star</dt>
              <dd>
                {stage.mass} M☉, {Math.round(stage.R).toLocaleString('en-GB')} R☉
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <p className={styles.panelTitle} style={{ marginTop: 12 }}>
        Light and neutrinos, 15 Suns
      </p>
      <ProfilePlot
        series={[
          {
            name: 'light',
            color: 'var(--series-2)',
            points: lumXs.map((x) => ({ x, y: luminosityAt(10 ** -x, 'photons') })),
          },
          {
            name: 'neutrinos',
            color: 'var(--series-1)',
            points: lumXs.map((x) => ({ x, y: luminosityAt(10 ** -x, 'neutrinos') })),
          },
        ]}
        xMin={-CLOCK_RANGE[0]}
        xMax={-CLOCK_RANGE[1]}
        formatX={(x) => (Number.isInteger(x) ? formatTimeLeft(10 ** -x) : '')}
        xLabel="Time before the collapse (log scale)"
        yLabel="Luminosity (W)"
        yScale="log"
        yMin={1e28}
        yMax={1e40}
        cursor={-logLeft(progress)}
        onCursor={(x) => setProgress(Math.min(1, Math.max(0, progressOf(10 ** -x))))}
        cursorText={(x) => formatTimeLeft(10 ** -x)}
        formatValue={(y) => formatSolarLuminosity(y)}
        ariaLabel="A 15-solar-mass star’s light stays near 30,000 to 90,000 Suns while its neutrino luminosity climbs from a few per cent of it to millions of times it before the collapse"
        height={240}
      />
      <Caption>{caption}</Caption>
    </Figure>
  );
}
