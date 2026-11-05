import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { interpolate } from '../core/compact/cooling';
import { fromPhysics } from '../core/stars/hr';
import { Caption, Figure } from '../viz/Figure';
import { physicistRange } from '../viz/hr/axes';
import { HRDiagram, type DensityGrid } from '../viz/hr/HRDiagram';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { loadGaia } from './hrStars';
import { COOLING_AGES, COOLING_MASSES, COOLING_START, delayAt, formatAnyKelvin, formatFaint, formatYears, freezingLine, track } from './limits';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Cooling and crystallising (Figure 24.3): a white dwarf's luminosity against
 * its age by Mestel's law, with and without the heat its core gives out as it
 * freezes, and its path across the HR diagram over Gaia's white dwarfs within
 * 100 parsecs, with the line where freezing begins and the Q branch marked.
 */

const RANGE = physicistRange(60000, 2600, 1e-5, 3);
const TRACK = '#ffd27a';
const FROZEN = '#7bdff2';
const AGE_TICKS: Record<number, string> = { 7: '10 Myr', 8: '100 Myr', 9: '1 Gyr', 10: '10 Gyr' };

export function CrystalliseFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mass, setMass] = useState<number>(COOLING_START.mass);
  const [age, setAge] = useState<number>(COOLING_START.age);
  const [crystallise, setCrystallise] = useState<boolean>(COOLING_START.crystallise);
  const [density, setDensity] = useState<DensityGrid | undefined>();
  const reset = () => {
    setMass(COOLING_START.mass);
    setAge(COOLING_START.age);
    setCrystallise(COOLING_START.crystallise);
  };
  useEffect(() => {
    let live = true;
    loadGaia().then((g) => live && setDensity(g.hundred.density));
    return () => {
      live = false;
    };
  }, []);

  const chosen = track(mass, crystallise);
  const plain = track(mass, false);
  const frozenTrack = track(mass, true);
  const line = useMemo(() => freezingLine(), []);
  const L = interpolate(chosen, age, 'L');
  const Teff = interpolate(chosen, age, 'Teff');
  const Tc = interpolate(chosen, age, 'Tc');
  const frozen = crystallise ? interpolate(chosen, age, 'frozen') : 0;
  const delay = crystallise ? delayAt(mass, age) : 0;
  const starts = plain.freezingStarts;
  const lx = (t: { points: { age: number; L: number }[] }) => t.points.filter((p) => p.age >= COOLING_AGES[0] / 2).map((p) => ({ x: Math.log10(p.age), y: p.L }));

  const caption = `After ${formatYears(age)}, a ${mass} M☉ white dwarf ${crystallise ? 'that crystallises' : 'that didn’t crystallise'} shines with ${formatFaint(L)} light, ${(Math.round(Teff / 10) * 10).toLocaleString('en-GB')} K at its surface; its core is at ${formatAnyKelvin(Tc)}. ${
    age < starts.age
      ? `Its centre will start to freeze at ${formatAnyKelvin(starts.Tc)}, after ${formatYears(starts.age)}.`
      : crystallise
        ? `${Math.round(frozen * 100)}% of its mass has frozen into a crystal, and the heat that gave out has put its cooling ${formatYears(delay)} behind: a white dwarf that didn’t freeze was this bright ${formatYears(delay)} sooner.`
        : `Its centre would have started to freeze ${formatYears(age - starts.age)} ago; without the heat that gives out, it fades faster.`
  }`;

  return (
    <Figure
      number={number}
      title="Cooling and crystallising"
      description="A white dwarf has no fuel: it fades as its core’s heat leaks out through a thin skin of ordinary gas, quickly while it is young and more and more slowly after. Once its core is cool enough, its carbon and oxygen freeze into a crystal from the centre outwards, giving out heat that slows the fading by billions of years. On the HR diagram, the line where freezing begins runs through a pile-up of white dwarfs Gaia found in 2019; the heaviest ones, near it, also gather in the Q branch, where some pause for billions of years."
      height={1080}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'stars within 100 parsecs (Gaia), denser where brighter', symbol: <rect x="-8" y="-6" width="16" height="12" fill="rgb(150,175,255)" fillOpacity="0.6" /> },
        { label: 'cooling paths (the chosen mass bold)', symbol: <path d="M-10 -8 L10 8" stroke={TRACK} strokeWidth="2" /> },
        { label: 'where the centre starts to freeze', symbol: <path d="M-10 4 L10 -4" stroke={FROZEN} strokeWidth="2.5" strokeDasharray="5 3" /> },
        { label: 'crystallising', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'without crystallisation', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="6 4" /> },
      ]}
      simplified={
        <p>
          Cooling follows Mestel’s law (1952), L ∝ M T<sub>c</sub><sup>7/2</sup>, with the constant SSE’s version of it uses (Hurley, Pols and Tout
          2000). The ions freeze at a Coulomb coupling of 175, with the density inside from Figure 24.2’s cold white dwarf, and give out 0.77 kT
          each as they freeze; the crystal then holds twice the heat per ion. The separation of oxygen from carbon as they freeze, which roughly
          doubles the delay, the neon that sinks in the Q branch’s white dwarfs, neutrinos in the youngest and the faster cooling of an old crystal
          are left out. Mestel’s law cools white dwarfs too fast at the faint end: SSE’s tuned law, fitted to detailed models (Figure 18.1), takes
          about 9 billion years to bring a 0.6 M☉ white dwarf to 1/30,000 of the Sun’s light, this one 3 to 5. Its freezing line also runs hotter
          than detailed models’ for the heaviest white dwarfs, whose freezing Gaia sees in the Q branch, drawn here where Gaia’s white dwarfs of
          about 1.1 Suns gather, between about 11,000 and 8,000 K.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="White dwarf’s mass">
          {COOLING_MASSES.map((m) => (
            <button key={m} type="button" aria-pressed={mass === m} onClick={() => setMass(m)}>
              {m} M☉
            </button>
          ))}
        </span>
        <span className={styles.toggles}>
          <button type="button" className={styles.toggle} aria-pressed={crystallise} onClick={() => setCrystallise((c) => !c)}>
            Crystallisation
          </button>
        </span>
      </div>
      <div className={styles.controls}>
        <Slider label="Cooling for" value={age} min={COOLING_AGES[0]} max={COOLING_AGES[1]} log step={0.005} format={formatYears} onChange={(a) => setAge(Number(a.toPrecision(3)))} />
      </div>

      <p className={styles.panelTitle}>Fading with age</p>
      <ProfilePlot
        series={[
          { name: 'without crystallisation', color: 'var(--text-muted)', dashed: true, points: lx(plain) },
          { name: 'crystallising', color: 'var(--accent)', points: lx(frozenTrack) },
        ]}
        xMin={7}
        xMax={Math.log10(COOLING_AGES[1])}
        formatX={(x) => AGE_TICKS[x] ?? ''}
        xLabel="Cooling age (log scale)"
        yLabel="Luminosity (Suns)"
        yScale="log"
        yMin={1e-6}
        yMax={0.3}
        cursor={Math.log10(age)}
        onCursor={(x) => setAge(Number((10 ** x).toPrecision(3)))}
        cursorText={(x) => formatYears(10 ** x)}
        formatValue={(y) => formatFaint(y)}
        ariaLabel={`A ${mass} solar-mass white dwarf’s luminosity against its age on log scales: it fades steadily, and once its centre freezes, after ${formatYears(starts.age)}, the crystallising one fades more slowly. After ${formatYears(age)} it has ${formatFaint(L)} light.`}
        height={250}
      >
        {(sx, sy) => (
          <g>
            <line x1={sx(Math.log10(starts.age))} x2={sx(Math.log10(starts.age))} y1={sy(0.3)} y2={sy(1e-6)} stroke={FROZEN} strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={sx(Math.log10(starts.age)) + 4} y={sy(0.12)} fontSize="11" fill="var(--text)">
              freezing begins
            </text>
          </g>
        )}
      </ProfilePlot>

      <div className={figureStyles.withSide} style={{ marginTop: 10 }}>
        <HRDiagram
          axes="physicist"
          range={RANGE}
          density={density}
          radiusLines
          ariaLabel={`White dwarfs on the HR diagram with their cooling paths and the line where their centres start to freeze, from about 5,000 K at the surface for 0.5 Suns to 25,000 K for 1.25. The ${mass} solar-mass white dwarf is at ${Math.round(Teff)} K and ${formatFaint(L)} light.`}
        >
          {(place) => (
            <g>
              {COOLING_MASSES.map((m) => {
                const t = track(m, crystallise);
                const d = t.points
                  .filter((p) => p.L < 10)
                  .map((p, i) => `${i ? 'L' : 'M'}${place(fromPhysics(p.Teff, p.L)).join(' ')}`)
                  .join(' ');
                const bold = m === mass;
                return <path key={m} d={d} stroke={TRACK} strokeOpacity={bold ? 1 : 0.5} strokeWidth={bold ? 2.6 : 1.3} fill="none" />;
              })}
              <path d={line.map((p, i) => `${i ? 'L' : 'M'}${place(fromPhysics(p.T, p.L)).join(' ')}`).join(' ')} stroke={FROZEN} strokeWidth="2.5" strokeDasharray="6 4" fill="none" />
              {(() => {
                const [x, y] = place(fromPhysics(line[0].T, line[0].L));
                return (
                  <text x={x + 6} y={y + 14} fontSize="11" fill={FROZEN} stroke="#070b16" strokeWidth={3} paintOrder="stroke">
                    freezing begins
                  </text>
                );
              })()}
              {(() => {
                // The Q branch: where Gaia's white dwarfs of about 1.1 Suns gather, roughly 11,000–8,000 K.
                const q = track(1.1, false).points.filter((p) => p.Teff < 11500 && p.Teff > 8000);
                if (q.length < 2) return null;
                const d = q.map((p, i) => `${i ? 'L' : 'M'}${place(fromPhysics(p.Teff, p.L)).join(' ')}`).join(' ');
                const [x, y] = place(fromPhysics(q[0].Teff, q[0].L));
                return (
                  <g>
                    <path d={d} stroke="#ff9ad5" strokeWidth={9} strokeOpacity={0.35} strokeLinecap="round" fill="none" />
                    <text x={x - 8} y={y - 8} fontSize="11" fill="#ff9ad5" textAnchor="end" stroke="#070b16" strokeWidth={3} paintOrder="stroke">
                      Q branch
                    </text>
                  </g>
                );
              })()}
              {(() => {
                const [x, y] = place(fromPhysics(Teff, L));
                return <circle cx={x} cy={y} r={6} fill="var(--accent)" stroke="#070b16" strokeWidth={1.5} />;
              })()}
            </g>
          )}
        </HRDiagram>
        <div className={figureStyles.side}>
          <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 200 }} role="img" aria-label={`A cut through the white dwarf: ${Math.round(frozen * 100)}% of its mass has frozen.`}>
            <circle cx={100} cy={100} r={92} fill="var(--accent)" fillOpacity={0.25} stroke="var(--border)" />
            {/* The frozen core by mass: a sphere holding that share of the mass, drawn by volume for simplicity. */}
            {frozen > 0 && <circle cx={100} cy={100} r={92 * Math.cbrt(frozen)} fill={FROZEN} fillOpacity={0.75} />}
            <text x={100} y={104} fontSize="12" fill="var(--text)" textAnchor="middle" fontWeight={600}>
              {frozen > 0 ? `${Math.round(frozen * 100)}% frozen` : 'all liquid'}
            </text>
          </svg>
          <dl className={styles.facts}>
            <div>
              <dt>Core</dt>
              <dd>{formatAnyKelvin(Tc)}</dd>
            </div>
            <div>
              <dt>Surface</dt>
              <dd>{(Math.round(Teff / 10) * 10).toLocaleString('en-GB')} K</dd>
            </div>
            <div>
              <dt>Light</dt>
              <dd>{formatFaint(L)}</dd>
            </div>
            <div>
              <dt>Freezing began</dt>
              <dd>{age >= starts.age ? `${formatYears(starts.age)} in` : `not yet (at ${formatYears(starts.age)})`}</dd>
            </div>
            {crystallise && age > starts.age && (
              <div>
                <dt>Kept back by freezing</dt>
                <dd>{formatYears(Math.max(0, delay))}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
