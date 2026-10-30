import { useMemo, useState, type ReactNode } from 'react';
import { formatScientific, superscript } from '../core/math/scientific';
import { coolClassOf } from '../core/stellar/brownDwarfs';
import { pmsAt } from '../core/stellar/pms';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { Slider } from './Slider';
import { COOLING_END, COOLING_MASSES, coolingCurve, coolingKind, coolingLuminosity, coolingTemperature, formatAge, jupiters, trackOf, type CoolingKind } from './starBirth';
import styles from './sky/sky.module.css';

/**
 * Cooling for ever (Figure 16.4): luminosity against age for objects from 10
 * Jupiters to a fifth of the Sun. Stars level off once fusion holds them up;
 * brown dwarfs never do, and fade for ever. BHAC15's models, carried on by
 * Burrows et al.'s power law where the models stop.
 */

const COLOURS: Record<CoolingKind, string> = { 'brown-dwarf': 'var(--series-3)', limit: 'var(--series-2)', star: 'var(--series-1)' };
const START_AGE = 1e9;
const START_MASS = 0.05;

const name = (m: number) => (m < 0.1 ? `${m} M☉ (${jupiters(m)} Jupiters)` : `${m} M☉`);

export function BrownDwarfFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [age, setAge] = useState(START_AGE);
  const [mass, setMass] = useState<number>(START_MASS);
  const reset = () => {
    setAge(START_AGE);
    setMass(START_MASS);
  };
  const curves = useMemo(() => COOLING_MASSES.map((m) => ({ mass: m, ...coolingCurve(m) })), []);
  const L = coolingLuminosity(mass, age);
  const table = pmsAt(trackOf(mass), age);
  const kelvin = coolingTemperature(mass, age);
  const kind = coolingKind(mass);
  const verdict =
    kind === 'star'
      ? 'a star: fusion holds its light steady'
      : kind === 'limit'
        ? 'right at the limit: models differ on whether it keeps fusing'
        : 'a brown dwarf: it fuses no hydrogen to speak of, and fades for ever';

  return (
    <Figure
      number={number}
      title="Cooling for ever"
      description="How bright objects from 10 Jupiter masses to a fifth of the Sun’s mass are as they age, from a million to ten billion years, on logarithmic scales. Stars fade at first, then level off when fusion takes over; brown dwarfs, below about 75 Jupiters, keep fading, cooling through the classes M, L, T and Y."
      height={620}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'stars (0.08 M☉ and more)', symbol: <path d="M-10 0 H10" stroke="var(--series-1)" strokeWidth="2.5" /> },
        { label: 'at the hydrogen-burning limit', symbol: <path d="M-10 0 H10" stroke="var(--series-2)" strokeWidth="2.5" /> },
        { label: 'brown dwarfs', symbol: <path d="M-10 0 H10" stroke="var(--series-3)" strokeWidth="2.5" /> },
        { label: 'carried on by a power-law fit', symbol: <path d="M-10 0 H10" stroke="var(--series-3)" strokeWidth="2" strokeDasharray="4 3" /> },
      ]}
      simplified={
        <p>
          Solid lines are Baraffe and colleagues’ 2015 models (BHAC15), for the Sun’s make-up. They stop where their model atmospheres do, for
          the coolest brown dwarfs; the dashed lines carry them on with Burrows and colleagues’ 2001 fit, L ∝ t<sup>−1.3</sup>, joined to the
          models’ last point. The early flat stretches of the lightest brown dwarfs are deuterium burning, which the fit leaves out.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Pick an object" style={{ marginBottom: 6 }}>
        {COOLING_MASSES.map((m) => (
          <button key={m} type="button" className={styles.toggle} aria-pressed={m === mass} onClick={() => setMass(m)}>
            {m < 0.1 ? (
              <>
                {jupiters(m)} M<sub>J</sub>
              </>
            ) : (
              `${m} M☉`
            )}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <Slider label="Age" value={age} min={1e6} max={COOLING_END} log format={formatAge} onChange={setAge} />
      </div>
      <ScatterChart
        groups={[]}
        xScale="log"
        yScale="log"
        xMin={5e5}
        xMax={COOLING_END}
        yMin={1e-8}
        yMax={1}
        xLabel="Age (years)"
        yLabel="Luminosity (Suns)"
        formatX={(x) => `10${superscript(Math.round(Math.log10(x)))}`}
        formatY={(y) => (y >= 1 ? '1' : `10${superscript(Math.round(Math.log10(y)))}`)}
        height={340}
        ariaLabel={`Luminosity against age. The ${name(mass)} object at ${formatAge(age)} gives out ${formatScientific(L, 2)} of the Sun’s light.`}
      >
        {(sx, sy) => (
          <g>
            {curves.map((c) => {
              const chosen = c.mass === mass;
              const colour = COLOURS[coolingKind(c.mass)];
              const path = (pts: [number, number][]) => pts.map(([t, l], i) => `${i ? 'L' : 'M'}${sx(t).toFixed(1)} ${sy(Math.max(l, 1e-8)).toFixed(1)}`).join(' ');
              const end = c.fit.length ? c.fit[c.fit.length - 1] : c.model[c.model.length - 1];
              return (
                <g key={c.mass}>
                  <path d={path(c.model)} stroke={colour} strokeWidth={chosen ? 3 : 1.5} strokeOpacity={chosen ? 1 : 0.7} fill="none" />
                  {c.fit.length > 0 && <path d={path(c.fit)} stroke={colour} strokeWidth={chosen ? 2.5 : 1.3} strokeOpacity={chosen ? 1 : 0.7} strokeDasharray="5 4" fill="none" />}
                  <text x={sx(end[0]) - 3} y={sy(end[1]) - 4} fontSize="10" textAnchor="end" fill={colour} fontWeight={chosen ? 700 : 400}>
                    {c.mass < 0.1 ? `${jupiters(c.mass)}` : `${c.mass}`}
                  </text>
                </g>
              );
            })}
            <line x1={sx(age)} x2={sx(age)} y1={sy(1)} y2={sy(1e-8)} stroke="var(--text)" strokeDasharray="3 3" />
            {Number.isFinite(L) && <circle cx={sx(age)} cy={sy(L)} r={5} fill={COLOURS[kind]} stroke="var(--bg)" strokeWidth={1.5} />}
          </g>
        )}
      </ScatterChart>
      <p className={styles.hint} style={{ margin: '2px 0 6px' }}>
        Lines are labelled at their right-hand end: in Jupiter masses below 0.1 M☉, in solar masses above.
      </p>
      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          <b>{name(mass)}</b> is {verdict}. At {formatAge(age)} it gives out {L >= 0.01 ? L.toPrecision(2) : formatScientific(L, 2)} of the Sun’s light
          {Number.isFinite(kelvin) ? `, at about ${Math.round(kelvin / 10) * 10} K: class ${coolClassOf(kelvin)}` : ''}.
          {table && table.lithium < 0.5 && mass < 0.1 ? ` It has burnt ${table.lithium < 0.01 ? 'all' : `${Math.round((1 - table.lithium) * 100)}%`} of its lithium.` : ''}
        </p>
      </div>
      <Caption>
        Stars level off within a billion years; brown dwarfs keep fading. Below about 0.075 solar masses, 78 Jupiters, the core never gets hot
        enough to keep hydrogen fusing.
      </Caption>
    </Figure>
  );
}
