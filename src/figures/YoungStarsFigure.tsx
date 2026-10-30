import { useMemo, useState, type ReactNode } from 'react';
import { fromPhysics } from '../core/stars/hr';
import { pmsAt, zamsArrival } from '../core/stellar/pms';
import { Caption, Figure } from '../viz/Figure';
import { physicistRange } from '../viz/hr/axes';
import { HRDiagram, type HRMarker } from '../viz/hr/HRDiagram';
import { Slider } from './Slider';
import { formatAge, trackOf, trackPoints, YOUNG_AGES, YOUNG_MASSES, YOUNG_STARS, zamsLine } from './starBirth';
import styles from './sky/sky.module.css';

/**
 * Arrival on the main sequence (Figure 16.3): young stars' tracks on the HR
 * diagram, from BHAC15's models, as they shrink and heat up until fusion takes
 * over. Ages are marked along them; a slider moves every star to one age, and
 * famous young stars sit beside the tracks.
 */

const START_AGE = 1e6;
const START_MASS = 1;
const RANGE = physicistRange(12000, 2500, 3e-4, 300);

const ageLabel = (years: number) => `${years / 1e6} Myr`;

export function YoungStarsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [age, setAge] = useState(START_AGE);
  const [mass, setMass] = useState<number>(START_MASS);
  const reset = () => {
    setAge(START_AGE);
    setMass(START_MASS);
  };
  const tracks = useMemo(() => YOUNG_MASSES.map((m) => ({ mass: m, track: trackOf(m), points: trackPoints(trackOf(m), 5e5, 2e9) })), []);
  const zams = useMemo(() => zamsLine(), []);
  const now = tracks.map((t) => ({ mass: t.mass, state: pmsAt(t.track, age) }));
  const picked = now.find((n) => n.mass === mass)!.state;
  const arrival = zamsArrival(trackOf(mass));
  const arrived = arrival !== null && age >= arrival;

  const markers: HRMarker[] = YOUNG_STARS.map((s) => ({ id: s.id, label: s.name, point: fromPhysics(s.kelvin, s.luminosity), side: s.id === 'aumic' || s.id === 'pds70' ? 'left' : 'right' }));

  return (
    <Figure
      number={number}
      title="Arrival on the main sequence"
      description="Young stars of 0.1 to 1.4 solar masses on the HR diagram, from BHAC15’s models, from a million years old until they settle on the main sequence, with their ages marked along the way. Small stars come straight down, shrinking at nearly the same temperature; Sun-like stars then turn left, heating up at nearly the same luminosity. A slider sets every star’s age, and five famous young stars sit beside the tracks."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a young star’s track (the chosen one bold)', symbol: <path d="M-10 -8 L-2 6 L10 4" stroke="#cdd6f4" strokeWidth="2" fill="none" /> },
        { label: 'every star at the chosen age', symbol: <circle r="4" fill="var(--series-2)" /> },
        { label: 'the main sequence (zero age)', symbol: <path d="M-10 6 L10 -6" stroke="#f9c74f" strokeWidth="2" strokeDasharray="4 3" /> },
        { label: 'famous young stars', symbol: <circle r="4" fill="none" stroke="#fff" strokeWidth="1.5" /> },
      ]}
      simplified={
        <p>
          The tracks are Baraffe and colleagues’ 2015 models for stars of the Sun’s make-up, starting at half a million years old: the earliest
          stage, when the star is still gathering gas inside its cocoon, isn’t drawn. Heavier stars than 1.4 Suns aren’t in these models; they
          reach the main sequence faster still, and the heaviest arrive while still growing. The main sequence is SSE’s formula for it.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Pick a star" style={{ marginBottom: 6 }}>
        {YOUNG_MASSES.map((m) => (
          <button key={m} type="button" className={styles.toggle} aria-pressed={m === mass} onClick={() => setMass(m)}>
            {m} M☉
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <Slider label="Age" value={age} min={10 ** 5.7} max={1e9} log format={formatAge} onChange={setAge} />
      </div>
      <HRDiagram
        axes="physicist"
        range={RANGE}
        markers={markers}
        ariaLabel={`Young stars’ tracks on the HR diagram at ${formatAge(age)}. The ${mass} M☉ star is at ${picked ? `${Math.round(picked.kelvin)} K and ${picked.luminosity.toPrecision(2)} times the Sun’s luminosity` : 'the end of its track'}.`}
      >
        {(place) => (
          <g>
            <path
              d={zams.map(([, k, l], i) => `${i ? 'L' : 'M'}${place(fromPhysics(k, l)).join(' ')}`).join(' ')}
              stroke="#f9c74f"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="none"
            />
            {tracks.map((t) => {
              const chosen = t.mass === mass;
              const [x0, y0] = place(fromPhysics(t.points[0][1], t.points[0][2]));
              return (
                <g key={t.mass}>
                  <path
                    d={t.points.map(([, k, l], i) => `${i ? 'L' : 'M'}${place(fromPhysics(k, l)).join(' ')}`).join(' ')}
                    stroke="#cdd6f4"
                    strokeOpacity={chosen ? 1 : 0.55}
                    strokeWidth={chosen ? 2.6 : 1.3}
                    fill="none"
                  />
                  <text x={x0 + 4} y={y0 - 4} fontSize="11" fill="#cdd6f4" fontWeight={chosen ? 700 : 400}>
                    {t.mass} M☉
                  </text>
                  {YOUNG_AGES.map((a) => {
                    const s = pmsAt(t.track, a);
                    if (!s) return null;
                    const [x, y] = place(fromPhysics(s.kelvin, s.luminosity));
                    return (
                      <g key={a}>
                        <circle cx={x} cy={y} r={2} fill="#cdd6f4" />
                        {t.mass === 1.4 && a < (zamsArrival(t.track) ?? Infinity) && (
                          <text x={x - 6} y={y - 6} fontSize="10" textAnchor="end" fill="#cdd6f4">
                            {ageLabel(a)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
            <path
              d={now
                .filter((n) => n.state)
                .map((n, i) => `${i ? 'L' : 'M'}${place(fromPhysics(n.state!.kelvin, n.state!.luminosity)).join(' ')}`)
                .join(' ')}
              stroke="var(--series-2)"
              strokeWidth={1.5}
              strokeOpacity={0.8}
              fill="none"
            />
            {now.map((n) => {
              if (!n.state) return null;
              const [x, y] = place(fromPhysics(n.state.kelvin, n.state.luminosity));
              return <circle key={n.mass} cx={x} cy={y} r={n.mass === mass ? 5.5 : 4} fill="var(--series-2)" stroke="#070b16" strokeWidth={1} />;
            })}
          </g>
        )}
      </HRDiagram>
      <div className={styles.card} aria-live="polite">
        {picked ? (
          <p style={{ margin: 0 }}>
            <b>
              {mass} M☉ at {formatAge(age)}:
            </b>{' '}
            {Math.round(picked.kelvin).toLocaleString('en-GB')} K, {picked.luminosity.toPrecision(2)} times the Sun’s luminosity and{' '}
            {picked.radius.toPrecision(2)} times its radius. {arrived ? 'It has reached the main sequence: fusion now holds it up.' : 'Still shrinking, heated by its own squeezing.'}{' '}
            {picked.lithium < 0.5 && `It has burnt ${picked.lithium < 0.01 ? 'all' : `${Math.round((1 - picked.lithium) * 100)}%`} of its lithium.`}
          </p>
        ) : (
          <p style={{ margin: 0 }}>The models start at half a million years and stop at 10 billion.</p>
        )}
        <p style={{ margin: '6px 0 0' }}>
          It reaches the main sequence at about <b>{arrival ? formatAge(arrival) : '—'}</b>.
        </p>
      </div>
      <ul className={styles.hint} style={{ margin: '8px 0 0', paddingLeft: '1.2em' }}>
        {YOUNG_STARS.map((s) => (
          <li key={s.id}>
            <b>{s.name}</b>, {s.age}: {s.note}.
          </li>
        ))}
      </ul>
      <Caption>
        {(() => {
          const settled = YOUNG_MASSES.filter((m) => {
            const z = zamsArrival(trackOf(m));
            return z !== null && age >= z;
          });
          if (!settled.length) return `At ${formatAge(age)} none of these stars has reached the main sequence: all are still shrinking.`;
          if (settled.length === YOUNG_MASSES.length) return `At ${formatAge(age)} every one of these stars is on the main sequence.`;
          return `At ${formatAge(age)} the stars of ${settled[0]} M☉ and more have reached the main sequence; the smaller ones are still shrinking.`;
        })()}
      </Caption>
    </Figure>
  );
}
