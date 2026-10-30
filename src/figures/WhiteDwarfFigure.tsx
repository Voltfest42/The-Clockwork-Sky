import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fromPhysics } from '../core/stars/hr';
import { whiteDwarf, Z_SUN_SSE } from '../core/stellar/lives';
import { Caption, Figure } from '../viz/Figure';
import { physicistRange } from '../viz/hr/axes';
import { HRDiagram, type DensityGrid } from '../viz/hr/HRDiagram';
import { loadGaia } from './hrStars';
import { Slider } from './Slider';
import { formatMyr } from './starLives';
import { coolingTrack, faintestCoolingAge, FAINTEST_WD_LUMINOSITY, KNOWN_WHITE_DWARFS, WD_AGES, WD_MASSES, whiteDwarfPoint } from './starDeaths';
import styles from './sky/sky.module.css';

/**
 * White dwarfs as clocks (Figure 18.1): Gaia's stars within 100 parsecs on
 * the physicists' HR diagram, zoomed onto the white dwarfs, with cooling
 * tracks for white dwarfs of 0.5 to 1.2 solar masses (SSE's cooling law) and
 * their ages marked. A slider draws the white dwarfs of one cooling age.
 */

const RANGE = physicistRange(60000, 2600, 1e-5, 3);
const START_AGE = 1000;
const START_MASS = 0.6;

export function WhiteDwarfFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [age, setAge] = useState(START_AGE);
  const [mass, setMass] = useState<number>(START_MASS);
  const [density, setDensity] = useState<DensityGrid | undefined>();
  const reset = () => {
    setAge(START_AGE);
    setMass(START_MASS);
  };
  useEffect(() => {
    let live = true;
    loadGaia().then((g) => live && setDensity(g.hundred.density));
    return () => {
      live = false;
    };
  }, []);
  const tracks = useMemo(() => WD_MASSES.map((m) => ({ mass: m, points: coolingTrack(m) })), []);
  const now = whiteDwarf(mass, age, Z_SUN_SSE);
  const faintest = faintestCoolingAge();

  return (
    <Figure
      number={number}
      title="White dwarfs as clocks"
      description="The white dwarfs among the stars within 100 parsecs, from Gaia, on the HR diagram, with the paths white dwarfs of different masses follow as they cool, and their ages along them. A white dwarf makes no new energy, so it fades at a known rate: the faintest in the Milky Way’s disc have been cooling for about 9 billion years, which dates the disc."
      height={820}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'stars within 100 parsecs (Gaia), denser where brighter', symbol: <rect x="-8" y="-6" width="16" height="12" fill="rgb(150,175,255)" fillOpacity="0.6" /> },
        { label: 'a cooling white dwarf’s path (the chosen mass bold)', symbol: <path d="M-10 -8 L10 8" stroke="#ffd27a" strokeWidth="2" /> },
        { label: 'white dwarfs of the chosen cooling age', symbol: <path d="M-10 4 L10 -4" stroke="#7bdff2" strokeWidth="2.5" /> },
      ]}
      simplified={
        <p>
          The paths are SSE’s modified Mestel cooling law for carbon–oxygen white dwarfs (Hurley, Pols &amp; Tout 2000), a simple formula; detailed
          models add the heat released as the core crystallises, which Gaia has seen as a pile-up of white dwarfs, and slow the cooling.
          Gaia’s colours are turned into temperatures and luminosities with main-sequence stars’ corrections, which fit white dwarfs only
          roughly.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="White dwarf’s mass" style={{ marginBottom: 6 }}>
        {WD_MASSES.map((m) => (
          <button key={m} type="button" className={styles.toggle} aria-pressed={m === mass} onClick={() => setMass(m)}>
            {m} M☉
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <Slider label="Cooling for" value={age} min={1} max={14000} log format={(a) => formatMyr(a)} onChange={setAge} />
      </div>
      <HRDiagram
        axes="physicist"
        range={RANGE}
        density={density}
        radiusLines
        markers={KNOWN_WHITE_DWARFS.map((w) => ({ id: w.id, label: w.name, point: fromPhysics(w.kelvin, w.luminosity), side: 'left' as const }))}
        ariaLabel={`White dwarfs on the HR diagram with cooling paths. A ${mass} solar-mass white dwarf that has cooled for ${formatMyr(age)} is at ${Math.round(now.T).toLocaleString('en-GB')} K and ${now.L.toPrecision(2)} times the Sun’s luminosity.`}
      >
        {(place) => (
          <g>
            {tracks.map((t) => {
              const chosen = t.mass === mass;
              const d = t.points.map(([, k, l], i) => `${i ? 'L' : 'M'}${place(fromPhysics(k, l)).join(' ')}`).join(' ');
              const [x0, y0] = place(whiteDwarfPoint(t.mass, 3));
              return (
                <g key={t.mass}>
                  <path d={d} stroke="#ffd27a" strokeOpacity={chosen ? 1 : 0.55} strokeWidth={chosen ? 2.6 : 1.3} fill="none" />
                  {chosen && (
                    <text x={x0 + 8} y={y0 + 4} fontSize="11.5" fill="#ffd27a" fontWeight={700} stroke="#070b16" strokeWidth={3} paintOrder="stroke">
                      {t.mass} M☉
                    </text>
                  )}
                  {chosen &&
                    WD_AGES.map((a) => {
                      const [x, y] = place(whiteDwarfPoint(t.mass, a));
                      return (
                        <g key={a}>
                          <circle cx={x} cy={y} r={3} fill="#ffd27a" />
                          <text x={x + 6} y={y - 5} fontSize="10.5" fill="#fff" stroke="#070b16" strokeWidth={3} paintOrder="stroke">
                            {a >= 1000 ? `${a / 1000} Gyr` : `${a} Myr`}
                          </text>
                        </g>
                      );
                    })}
                </g>
              );
            })}
            <path d={WD_MASSES.map((m, i) => `${i ? 'L' : 'M'}${place(whiteDwarfPoint(m, age)).join(' ')}`).join(' ')} stroke="#7bdff2" strokeWidth={2.5} fill="none" />
            {(() => {
              const [x, y] = place(whiteDwarfPoint(mass, age));
              return <circle cx={x} cy={y} r={6} fill="#7bdff2" stroke="#070b16" strokeWidth={1.5} />;
            })()}
          </g>
        )}
      </HRDiagram>
      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          <b>
            A {mass} M☉ white dwarf, {formatMyr(age)} after it formed:
          </b>{' '}
          {Math.round(now.T).toLocaleString('en-GB')} K, {now.L < 0.01 ? `1/${Number((1 / now.L).toPrecision(2)).toLocaleString('en-GB')}` : now.L.toPrecision(2)} of the Sun’s luminosity,{' '}
          {(Math.round((now.R * 695_700) / 100) * 100).toLocaleString('en-GB')} km in radius ({(now.R * 109.1).toFixed(1)} Earths).
        </p>
        <p style={{ margin: '6px 0 0' }}>
          The faintest white dwarfs in the disc, about 1/{Number((1 / FAINTEST_WD_LUMINOSITY).toPrecision(1)).toLocaleString('en-GB')} of the Sun’s luminosity, have been cooling
          for about {formatMyr(faintest)} by this law: the disc must be at least that old, plus the time their stars took to die.
        </p>
      </div>
      <Caption>
        {`After ${formatMyr(age)}, white dwarfs have cooled to ${Math.round(whiteDwarf(1.2, age).T).toLocaleString('en-GB')} K (1.2 M☉) to ${Math.round(whiteDwarf(0.5, age).T).toLocaleString('en-GB')} K (0.5 M☉). Heavier ones are smaller, so at the same temperature they are fainter.`}
      </Caption>
    </Figure>
  );
}
