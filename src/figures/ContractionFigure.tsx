import { useMemo, useRef, useState, type ReactNode } from 'react';
import { formatScientific } from '../core/math/scientific';
import { SOLAR_MIX } from '../core/structure/eos';
import { CoreMap } from '../viz/coremap/CoreMap';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import {
  CONTRACTION_MASSES,
  CONTRACTION_PREDICTIONS,
  CONTRACTION_PRESETS,
  contractionOf,
  energyShares,
  formatTemperature,
  formatYears,
  outcomeText,
  solarLuminosities,
  solarRadii,
  years,
} from './contraction';
import { formatGramsPerCc, SUN_CENTRE } from './holding';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The star that heats as it cools (Figure 20.2): a ball of gas with no fuel,
 * shining. A predict-first question, then the contraction: the energy gravity
 * releases split between heat and light, the radius, central temperature and
 * luminosity against time, and the core climbing its line on the core's map
 * (the map's first appearance) until hydrogen ignites, or packed electrons
 * stop it as a brown dwarf.
 */

type Plot = 'tC' | 'radius' | 'luminosity';
const PLOTS: { id: Plot; name: string }[] = [
  { id: 'tC', name: 'Central temperature' },
  { id: 'radius', name: 'Radius' },
  { id: 'luminosity', name: 'Luminosity' },
];

const START_MASS = 1;
const LOG_T: [number, number] = [5, 7.6];
const LOG_RHO: [number, number] = [-4, 4];

const formatMass = (m: number) => `${m < 0.1 ? m.toPrecision(2) : m.toFixed(2)} M☉${m < 0.08 ? ` (${Math.round(m * 1047.57)} Jupiters)` : ''}`;
/** "210", "25", "0.66", "4.6 × 10⁻⁵". */
const formatSuns = (x: number) => (x >= 100 ? Math.round(x).toLocaleString('en-GB') : x >= 0.001 ? String(Number(x.toPrecision(2))) : formatScientific(x, 2));
const shortYears = (y: number) => (y >= 1e9 ? `${Number((y / 1e9).toPrecision(2))} Gyr` : y >= 1e6 ? `${Number((y / 1e6).toPrecision(2))} Myr` : y >= 1e3 ? `${Number((y / 1e3).toPrecision(2))} kyr` : `${Math.round(y)} yr`);

export function ContractionFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mass, setMass] = useState(START_MASS);
  const [index, setIndex] = useState(0);
  const [plot, setPlot] = useState<Plot>('tC');
  const [playing, setPlaying] = useState(false);
  const [guess, setGuess] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const pending = useRef(0);

  const track = useMemo(() => contractionOf(mass), [mass]);
  const last = track.states.length - 1;
  const i = Math.min(index, last);
  const s = track.states[i];
  const shares = energyShares(track, s);
  const reset = () => {
    setMass(START_MASS);
    setIndex(0);
    setPlot('tC');
    setPlaying(false);
    setGuess(null);
    setChecked(null);
  };
  const choose = (m: number) => {
    setMass(m);
    setIndex(0);
    setPlaying(false);
  };

  useAnimationFrame(playing && onScreen, (dt) => {
    pending.current += dt;
    const every = reducedMotion ? 0.5 : 1 / 45;
    if (pending.current < every) return;
    const steps = reducedMotion ? Math.ceil(last / 10) : Math.floor(pending.current / every);
    pending.current = 0;
    setIndex((k) => {
      const next = Math.min(last, k + steps);
      if (next >= last) setPlaying(false);
      return next;
    });
  });

  const timed = track.states.slice(1);
  const x0 = Math.log10(years(timed[0].age));
  const x1 = Math.log10(years(timed[timed.length - 1].age));
  const series = {
    tC: { name: 'Central temperature', y: (t: (typeof timed)[number]) => t.tC, label: 'Central temperature (K)', min: 1e4, max: 3e7 },
    radius: { name: 'Radius', y: solarRadii, label: 'Radius (Suns)', min: 0.03, max: 100 },
    luminosity: { name: 'Luminosity', y: solarLuminosities, label: 'Luminosity (Suns)', min: 1e-6, max: 1e3 },
  }[plot];
  const atEnd = i === last;
  const preset = CONTRACTION_PRESETS.find((p) => Math.abs(p.mass / mass - 1) < 1e-6);
  const heatingNote =
    i === 0
      ? 'It starts as a ball of cool gas, a few hundred thousand degrees inside.'
      : shares.packing < 0.1
        ? `Gravity has released ${formatScientific(shares.released, 2)} J: ${Math.round(shares.radiated * 100)}% radiated away, ${Math.round(shares.heat * 100)}% heating the gas. Losing energy, it gets hotter.`
        : `Packed electrons now take ${Math.round(shares.packing * 100)}% of the energy released, as pressure that needs no heat: ${Math.round(shares.heat * 100)}% heats the gas, ${Math.round(shares.radiated * 100)}% has been radiated.`;

  return (
    <Figure
      number={number}
      title="The star that heats as it cools"
      description="A ball of gas with no fuel, shining. Losing energy, it shrinks, and its centre gets hotter: half of the energy its gravity releases heats the gas, half escapes as light. Bars show the energy, and charts its radius, central temperature and luminosity against time, while its centre climbs a line on the core’s map, central density against central temperature. A Sun-like ball reaches hydrogen ignition at about 12 million degrees after 50 million years; one lighter than about 0.08 Suns is stopped by its packed electrons first and becomes a brown dwarf."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'its centre’s path', symbol: <line x1="-9" x2="9" y1="0" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'its centre now', symbol: <circle r="6" fill="var(--accent)" /> },
        { label: 'heat gained', symbol: <rect x="-9" y="-4" width="18" height="8" rx="2" fill="var(--series-2)" /> },
        { label: 'radiated away', symbol: <rect x="-9" y="-4" width="18" height="8" rx="2" fill="var(--series-3)" /> },
        { label: 'packed electrons', symbol: <rect x="-9" y="-4" width="18" height="8" rx="2" fill="var(--series-1)" /> },
      ]}
      simplified={
        <p>
          The ball is a polytrope of index 1.5, fully convective as young stars and brown dwarfs are, shrinking through balanced states: its
          energy bookkeeping is exact for such a ball. Its gas is ions, electrons that become partly degenerate (by Paczyński’s interpolation)
          and light. Its surface stays near one temperature, as young stars’ do, taken from Baraffe and colleagues’ models; real opacity and
          the switch to a radiative core in Sun-like stars are left out, so its times are the Kelvin–Helmholtz estimate. Hydrogen ignites when
          a simple fit to the pp chain’s rate could pay for the light. In this model the dividing line falls at 0.084 solar masses; detailed
          models put it at 0.075. A failed star is followed until its centre has cooled to half its hottest.
        </p>
      }
    >
      <div className={seasonStyles.predict}>
        <fieldset>
          <legend>Predict first: a ball of gas has no fuel, but it shines. As it loses energy, does it cool down or heat up?</legend>
          {CONTRACTION_PREDICTIONS.map((p, k) => (
            <label key={p.id} className={figureStyles.checkbox}>
              <input type="radio" name={`contraction-guess-${number}`} checked={guess === k} onChange={() => setGuess(k)} />
              {p.label}
            </label>
          ))}
          <button type="button" className={figureStyles.toolButton} disabled={guess === null} onClick={() => setChecked(guess)}>
            Check
          </button>
        </fieldset>
        <div aria-live="polite">
          {checked !== null && (
            <p className={seasonStyles.verdict}>
              <span className={CONTRACTION_PREDICTIONS[checked].correct ? seasonStyles.right : seasonStyles.wrong}>
                {CONTRACTION_PREDICTIONS[checked].correct ? '✓ Right.' : '✗ Not quite.'}
              </span>{' '}
              It heats up. Losing energy, it shrinks, and its gravity squeezes it harder: half of the energy released heats the gas, and only
              half escapes as light. Press play and watch the centre’s temperature.
            </p>
          )}
        </div>
      </div>

      <div className={styles.presets} role="group" aria-label="Balls of gas">
        {CONTRACTION_PRESETS.map((p) => (
          <button key={p.id} type="button" className={styles.toggle} aria-pressed={preset?.id === p.id} onClick={() => choose(p.mass)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls} style={{ marginTop: 8 }}>
        <Slider label="Mass" value={mass} min={CONTRACTION_MASSES[0]} max={CONTRACTION_MASSES[1]} log step={0.01} format={formatMass} onChange={(m) => choose(Number(m.toPrecision(3)))} />
        <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={figureStyles.toolButton}
            onClick={() => {
              if (atEnd) setIndex(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? 'Pause' : atEnd ? 'Play again' : 'Play'}
          </button>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Slider
              label="Time"
              value={i}
              min={0}
              max={last}
              step={1}
              format={(k) => (k === 0 ? 'the start' : formatYears(years(track.states[Math.round(k)].age)))}
              onChange={(k) => {
                setPlaying(false);
                setIndex(Math.round(k));
              }}
            />
          </div>
        </div>
      </div>

      <div ref={box} className={figureStyles.withSide}>
        <div>
          <p className={styles.panelTitle}>The core’s map</p>
          <CoreMap
            mix={SOLAR_MIX}
            logT={LOG_T}
            logRho={LOG_RHO}
            tracks={[{ name: 'path', color: 'var(--accent)', points: track.states.map((t) => ({ T: Math.max(t.tC, 1e4), rho: t.rhoC })) }]}
            points={[{ T: SUN_CENTRE.T, rho: SUN_CENTRE.rho, label: 'The Sun’s centre today' }]}
            marker={{ T: Math.max(s.tC, 1e4), rho: s.rhoC, label: formatTemperature(s.tC) }}
            ariaLabel={`The core’s map: central density against central temperature. The centre of a ball of ${formatMass(mass)} is at ${formatTemperature(s.tC)} and ${formatGramsPerCc(s.rhoC)}.`}
            height={340}
          />
        </div>
        <div className={figureStyles.side}>
          <div>
            <p className={styles.panelTitle}>Where gravity’s energy has gone</p>
            <svg viewBox="0 0 300 118" width="100%" role="img" aria-label={heatingNote}>
              {[
                { y: 0, label: 'Heat gained', value: shares.heat, color: 'var(--series-2)' },
                { y: 38, label: 'Radiated away', value: shares.radiated, color: 'var(--series-3)' },
                { y: 76, label: 'Packed electrons', value: shares.packing, color: 'var(--series-1)' },
              ].map((b) => (
                <g key={b.label}>
                  <text x={0} y={b.y + 11} fontSize="12" fill="var(--text)">
                    {b.label}: {Math.round(Math.max(0, b.value) * 100)}%
                  </text>
                  <rect x={0} y={b.y + 16} width={300} height={14} rx={3} fill="var(--border)" fillOpacity={0.5} />
                  <rect x={0} y={b.y + 16} width={Math.max(0, Math.min(1, b.value)) * 300} height={14} rx={3} fill={b.color} />
                </g>
              ))}
            </svg>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Time</dt>
              <dd>{i === 0 ? 'the start' : formatYears(years(s.age))}</dd>
            </div>
            <div>
              <dt>Radius</dt>
              <dd>{formatSuns(solarRadii(s))} Suns</dd>
            </div>
            <div>
              <dt>Centre</dt>
              <dd>
                {formatTemperature(s.tC)}, {formatGramsPerCc(s.rhoC)}
              </dd>
            </div>
            <div>
              <dt>Luminosity</dt>
              <dd>
                {formatSuns(solarLuminosities(s))} Suns, surface {Math.round(s.teff).toLocaleString('en-GB')} K
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className={figureStyles.toolbar} style={{ marginTop: 10 }}>
        <span className={figureStyles.segmented} role="group" aria-label="Plot against time">
          {PLOTS.map((p) => (
            <button key={p.id} type="button" aria-pressed={plot === p.id} onClick={() => setPlot(p.id)}>
              {p.name}
            </button>
          ))}
        </span>
      </div>
      <ProfilePlot
        series={[{ name: series.name, color: 'var(--accent)', points: timed.map((t) => ({ x: Math.log10(years(t.age)), y: series.y(t) })) }]}
        hideLegend
        xMin={x0}
        xMax={x1}
        yScale="log"
        yMin={series.min}
        yMax={series.max}
        xLabel="Time since the start (log scale)"
        yLabel={series.label}
        formatX={(x) => shortYears(10 ** x)}
        cursor={i === 0 ? undefined : Math.log10(years(s.age))}
        ariaLabel={`${series.name} against time for a ball of ${formatMass(mass)}`}
        height={240}
      />
      <Caption>{atEnd ? outcomeText(track) : heatingNote}</Caption>
    </Figure>
  );
}
