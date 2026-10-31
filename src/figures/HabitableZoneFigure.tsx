import { useMemo, useState, type ReactNode } from 'react';
import { fluxAt, habitableZone, zoneFlux, ZONE_TEMPERATURES } from '../core/exoplanets/habitable';
import { starCss } from '../viz/star/colour';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { formatMyr, SUN_AGE } from './starLives';
import { starOfTemperature, sunAtAge, zonePlanets, zoneSystems, zoneWord } from './otherWorlds';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Habitable zones (Figure 19.4): the distances from a star where a planet like
 * Earth could keep liquid water on its surface, by Kopparapu et al.'s (2014)
 * limits. One system at a time, drawn from above with its planets; the Sun's
 * zone moving outward as it brightens over its life; or every known planet,
 * by the starlight it gets and its star's temperature.
 */

const SIZE = 340;
const C = SIZE / 2;
const RMAX = 150;
const LABELLED = ['TRAPPIST-1 e', 'Proxima Cen b', 'Kepler-186 f', 'K2-18 b', 'Kepler-442 b', 'LHS 1140 b', 'Kepler-62 f'];
const START = { view: 'system' as 'system' | 'all', system: 'solar-system', age: SUN_AGE, kelvin: 4000 };

/** "6.7 times the starlight Earth gets", or "the starlight Earth gets" for Earth itself. */
const starlight = (flux: number) => (Math.abs(flux - 1) < 0.005 ? 'the starlight Earth gets' : `${flux >= 10 ? Math.round(flux) : Number(flux.toPrecision(2))} times the starlight Earth gets`);

const au = (a: number) => (a < 0.1 ? a.toFixed(3) : a.toFixed(2));

export function HabitableZoneFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [view, setView] = useState(START.view);
  const [systemId, setSystemId] = useState(START.system);
  const [age, setAge] = useState(START.age);
  const [kelvin, setKelvin] = useState(START.kelvin);
  const reset = () => {
    setView(START.view);
    setSystemId(START.system);
    setAge(START.age);
    setKelvin(START.kelvin);
  };
  const systems = useMemo(() => zoneSystems(), []);
  const custom = systemId === 'any';
  const base = systems.find((s) => s.id === systemId);
  const sun = systemId === 'solar-system' ? sunAtAge(age) : null;
  const today = useMemo(() => sunAtAge(SUN_AGE), []);
  const star = custom ? starOfTemperature(kelvin) : sun ?? { luminosity: base!.luminosity, kelvin: base!.kelvin };
  const zone = habitableZone(star.luminosity, star.kelvin);
  const planets = custom ? [] : base!.planets;
  const outerMost = Math.max(zone.optimisticOuter, ...planets.map((p) => p.a));
  const scale = RMAX / (outerMost * 1.08);
  const inZone = planets.filter((p) => zoneWord(star.luminosity, star.kelvin, p.a) === 'in the zone');
  const systemName = custom ? `A ${kelvin.toLocaleString('en-GB')} K star` : base!.name;

  return (
    <Figure
      number={number}
      title="Habitable zones"
      description="The habitable zone round a star: the range of distances where a planet like Earth could keep liquid water on its surface, by Kopparapu et al.’s limits. Round the Sun it runs from 0.95 to 1.68 AU, with Earth inside and Venus too close; round a red dwarf such as TRAPPIST-1 it lies a few hundredths of an AU out, where three of its seven planets orbit. As the Sun brightens over its life, its zone moves outward, past Earth. A second view shows every known planet by the starlight it receives and its star’s temperature."
      height={820}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the habitable zone (conservative)', symbol: <rect x="-8" y="-6" width="16" height="12" fill="color-mix(in srgb, var(--series-3) 55%, transparent)" /> },
        { label: 'the optimistic edges', symbol: <rect x="-8" y="-6" width="16" height="12" fill="color-mix(in srgb, var(--series-3) 22%, transparent)" stroke="var(--series-3)" strokeDasharray="2 2" /> },
        { label: 'a planet', symbol: <circle r="4" fill="var(--text)" /> },
      ]}
      simplified={
        <p>
          The limits are Kopparapu et al.’s (2014) for a planet of Earth’s mass, from climate models of a planet with water and carbon dioxide: the
          runaway greenhouse inside, the most a carbon-dioxide greenhouse can warm outside. The optimistic edges are where Venus and Mars may once
          have had water. Clouds, a planet’s size and its air move the edges; being in the zone says nothing about whether a planet has air, water
          or life. The Sun’s brightening is the stellar-evolution engine’s, scaled so that today’s Sun is exactly as bright as it is.
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={figureStyles.toolbar}>
          <div className={figureStyles.segmented} role="group" aria-label="Show">
            <button type="button" aria-pressed={view === 'system'} onClick={() => setView('system')}>
              One system
            </button>
            <button type="button" aria-pressed={view === 'all'} onClick={() => setView('all')}>
              Every known planet
            </button>
          </div>
        </div>
        {view === 'system' && (
          <>
            <div className={styles.presets} role="group" aria-label="System">
              {systems.map((s) => (
                <button key={s.id} type="button" className={styles.toggle} aria-pressed={systemId === s.id} onClick={() => setSystemId(s.id)}>
                  {s.name}
                </button>
              ))}
              <button type="button" className={styles.toggle} aria-pressed={custom} onClick={() => setSystemId('any')}>
                Any star
              </button>
            </div>
            {systemId === 'solar-system' && (
              <Slider label="The Sun’s age" value={age} min={0} max={11000} step={10} format={(t) => (t < 1 ? 'just born' : formatMyr(t))} onChange={setAge} />
            )}
            {custom && (
              <Slider label="Star’s temperature (main sequence)" value={kelvin} min={ZONE_TEMPERATURES[0]} max={ZONE_TEMPERATURES[1]} step={10} format={(t) => `${Math.round(t).toLocaleString('en-GB')} K`} onChange={setKelvin} />
            )}
          </>
        )}
      </div>

      {view === 'system' ? (
        <>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${systemName} from above: the habitable zone from ${au(zone.inner)} to ${au(zone.outer)} AU${planets.length ? `, with ${planets.map((p) => p.name).join(', ')}` : ''}.`} style={{ width: '100%', maxWidth: 440, display: 'block', margin: '0 auto' }}>
            <rect width={SIZE} height={SIZE} fill="#05070f" rx="8" />
            <circle cx={C} cy={C} r={zone.optimisticOuter * scale} fill="color-mix(in srgb, var(--series-3) 22%, transparent)" stroke="var(--series-3)" strokeDasharray="3 3" />
            <circle cx={C} cy={C} r={zone.outer * scale} fill="color-mix(in srgb, var(--series-3) 55%, #05070f)" />
            <circle cx={C} cy={C} r={zone.inner * scale} fill="color-mix(in srgb, var(--series-3) 22%, #05070f)" />
            <circle cx={C} cy={C} r={zone.optimisticInner * scale} fill="#05070f" stroke="var(--series-3)" strokeDasharray="3 3" />
            <circle cx={C} cy={C} r={5} fill={starCss(Math.min(12000, Math.max(2000, star.kelvin)))} />
            {planets.map((p, k) => {
              const r = p.a * scale;
              const angle = -Math.PI / 4 + k * 0.9;
              const x = C + r * Math.cos(angle);
              const y = C + r * Math.sin(angle);
              return (
                <g key={p.name}>
                  <circle cx={C} cy={C} r={r} fill="none" stroke="rgba(255,255,255,0.35)" />
                  <circle cx={x} cy={y} r={4} fill="#fff" />
                  <text x={x + 6} y={y - 5} fontSize="11" fill="#fff" stroke="#05070f" strokeWidth="3" paintOrder="stroke">
                    {p.name}
                  </text>
                </g>
              );
            })}
            <line x1={14} x2={14 + scale * niceBar(outerMost)} y1={SIZE - 16} y2={SIZE - 16} stroke="#fff" strokeWidth="2" />
            <text x={14} y={SIZE - 22} fontSize="11" fill="#fff">
              {niceBar(outerMost)} AU
            </text>
          </svg>
          <div className={styles.readout}>
            <span>
              Star: <b>{Math.round(star.kelvin).toLocaleString('en-GB')} K</b>, {Math.abs(star.luminosity - 1) < 0.005 ? 'as bright as the Sun' : <><b>{star.luminosity < 0.01 ? star.luminosity.toPrecision(2) : Number(star.luminosity.toPrecision(3))}</b> times the Sun’s power</>}
            </span>
            <span>
              Zone: <b>{au(zone.inner)}–{au(zone.outer)} AU</b> (optimistic {au(zone.optimisticInner)}–{au(zone.optimisticOuter)})
            </span>
          </div>
          {planets.length > 0 && (
            <ul className={styles.lists} style={{ listStyle: 'none', paddingLeft: 0 }} aria-label="Planets">
              {planets.map((p) => (
                <li key={p.name}>
                  <b>{p.name}</b>, {au(p.a)} AU: {starlight(fluxAt(star.luminosity, p.a))}, {zoneWord(star.luminosity, star.kelvin, p.a)}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <AllPlanets />
      )}
      <Caption>
        {view === 'all'
          ? 'Every known planet with a measured orbit round a star of 2,600 to 7,200 K, by the starlight it gets. Most planets found are far too hot; the few in the zone are mostly round red dwarfs, where small planets are easiest to find.'
          : sun
            ? age < SUN_AGE - 300
              ? `The young Sun, ${formatMyr(age)} old, gave out ${Math.round((100 * sun.luminosity) / today.luminosity)}% of today’s power, so its zone was closer in: ${au(zone.inner)}–${au(zone.outer)} AU.`
              : age <= SUN_AGE + 300
                ? `The Sun today: its zone runs from ${au(zone.inner)} to ${au(zone.outer)} AU, with Earth inside it, Venus too close and Mars near the outer edge.`
                : zone.inner > 1
                  ? `At ${formatMyr(age)} the Sun is ${(sun.luminosity / today.luminosity).toFixed(2)} times as bright as today, and its zone has moved out past Earth: ${au(zone.inner)}–${au(zone.outer)} AU. Earth’s oceans will have boiled away.`
                  : `At ${formatMyr(age)} the Sun has brightened and its zone has moved out to ${au(zone.inner)}–${au(zone.outer)} AU; Earth is near its inner edge.`
            : custom
              ? `Round a ${Math.round(kelvin).toLocaleString('en-GB')} K star on the main sequence the zone runs from ${au(zone.inner)} to ${au(zone.outer)} AU: ${zone.outer < 0.3 ? 'so close that a planet there would be likely to turn one face to its star for ever.' : zone.inner > 1.5 ? 'farther out than Earth is from the Sun, and the star lives only a few billion years.' : 'much as round the Sun.'}`
              : `${systemName}: the zone runs from ${au(zone.inner)} to ${au(zone.outer)} AU${inZone.length ? `, with ${inZone.map((p) => p.name).join(', ')} in it.` : ', and none of its known planets is in it.'}`}
      </Caption>
    </Figure>
  );
}

/** A round length for the scale bar, about a third of the drawing's radius. */
function niceBar(outer: number): number {
  const target = outer / 3;
  const p = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 5, 10].map((m) => m * p).reduce((best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best));
}

function AllPlanets() {
  const points = useMemo(() => zonePlanets(), []);
  const small = points.filter((p) => p.small);
  const large = points.filter((p) => !p.small);
  const temps = Array.from({ length: 47 }, (_, k) => 2600 + k * 100);
  const solar = [
    { x: fluxAt(1, 0.723), y: 5772, label: 'Venus' },
    { x: 1, y: 5772, label: 'Earth' },
    { x: fluxAt(1, 1.524), y: 5772, label: 'Mars' },
  ];
  return (
    <ScatterChart
      groups={[
        { name: 'Larger planets', color: 'color-mix(in srgb, var(--text-muted) 70%, transparent)', shape: 'circle', points: large.map((p) => ({ x: p.flux, y: p.kelvin, label: p.name })) },
        { name: 'Planets that may be rocky', color: 'var(--series-1)', shape: 'diamond', points: small.map((p) => ({ x: p.flux, y: p.kelvin, label: p.name })) },
        { name: 'The Sun’s rocky planets', color: 'var(--series-2)', shape: 'square', points: solar },
      ]}
      xScale="log"
      yScale="linear"
      xMin={0.05}
      xMax={5}
      yMin={2500}
      yMax={7300}
      xLabel="Starlight received (Earth = 1): more →"
      yLabel="Star’s temperature (K)"
      formatY={(t) => t.toLocaleString('en-GB')}
      labelled={[...LABELLED, 'Venus', 'Earth', 'Mars']}
      height={420}
      ariaLabel={`${points.length} known planets by the starlight they receive and their stars’ temperatures, with the habitable zone shaded.`}
    >
      {(sx, sy) => {
        const band = (a: (t: number) => number, b: (t: number) => number) =>
          [...temps.map((t) => `${sx(Math.min(5, Math.max(0.05, a(t))))},${sy(t)}`), ...[...temps].reverse().map((t) => `${sx(Math.min(5, Math.max(0.05, b(t))))},${sy(t)}`)].join(' ');
        return (
          <g pointerEvents="none">
            <polygon points={band((t) => zoneFlux('recentVenus', t), (t) => zoneFlux('earlyMars', t))} fill="color-mix(in srgb, var(--series-3) 16%, transparent)" stroke="var(--series-3)" strokeDasharray="3 3" />
            <polygon points={band((t) => zoneFlux('runawayGreenhouse', t), (t) => zoneFlux('maximumGreenhouse', t))} fill="color-mix(in srgb, var(--series-3) 30%, transparent)" />
          </g>
        );
      }}
    </ScatterChart>
  );
}
