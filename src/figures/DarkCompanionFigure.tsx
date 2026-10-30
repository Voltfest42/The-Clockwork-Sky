import { useMemo, useState, type ReactNode } from 'react';
import { binaryState } from '../core/binaries/orbit';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { Slider } from './Slider';
import { DARK_PAIRS, darkOrbit, NEUTRON_STAR_MAX, velocityMeasurements, weighCompanion, type DarkPair } from './starDeaths';
import styles from './sky/sky.module.css';

/**
 * Weigh the invisible companion (Figure 18.3): a visible star's velocity
 * towards and away from us as it circles an unseen partner, with measurements
 * on random nights. From the period and the size of the swing alone comes the
 * mass function, and from it the least the partner can weigh. Heavier than
 * about 3 Suns and giving out no light means a black hole.
 */

const START = 'gaia-bh1';

const msun = (m: number) => `${m < 10 ? m.toFixed(2) : m.toFixed(1)} M☉`;
const days = (d: number) => (d >= 730 ? `${(d / 365.25).toFixed(1)} years` : `${d < 10 ? d.toFixed(2) : Math.round(d)} days`);

export function DarkCompanionFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const start = DARK_PAIRS.find((p) => p.id === START)!;
  const [preset, setPreset] = useState<string | null>(START);
  const [pair, setPair] = useState<DarkPair>(start);
  const choose = (p: DarkPair) => {
    setPreset(p.id);
    setPair(p);
  };
  const reset = () => choose(start);
  const edit = (change: Partial<DarkPair>) => {
    setPreset(null);
    setPair((p) => ({ ...p, ...change }));
  };
  const orbit = darkOrbit(pair);
  const r = weighCompanion(orbit);
  const measured = useMemo(() => velocityMeasurements(darkOrbit(pair)), [pair]);
  const vmax = Math.max(10, r.k * 1.25 * (1 + pair.e));
  const named = DARK_PAIRS.find((p) => p.id === preset);

  const verdict =
    r.verdict === 'black-hole'
      ? 'That is too heavy for a neutron star, and a star that heavy would outshine its partner. It must be a black hole.'
      : r.verdict === 'neutron-star-or-black-hole'
        ? 'That is heavier than a white dwarf can be. If it gives out no light, it is a neutron star or a black hole.'
        : 'That is light enough to be a faint star or a white dwarf. The velocities alone can’t tell; look for its light.';

  return (
    <Figure
      number={number}
      title="Weigh the invisible companion"
      description="A star’s velocity towards and away from us as it orbits a partner we can’t see, with measurements on random nights. The period and the size of the swing give the least mass the partner can have. For Gaia BH1, a Sun-like star swinging by 67 km/s every 186 days, the partner is at least 5.6 Suns and gives out no light: a black hole. Cygnus X-1, Gaia BH3, a white dwarf and a faint red dwarf are other partners to weigh."
      height={860}
      tryThis={tryThis}
      onReset={reset}
      simplified={
        <p>
          The orbits are exact Kepler orbits with the published periods, shapes and tilts; the measurements are simulated with an error of 1 km/s.
          The visible star’s mass comes from its spectrum and brightness, and is taken as known here. Cygnus X-1’s companion is dark in visible light
          but bright in X-rays, from gas falling onto it.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Pair" style={{ marginBottom: 6 }}>
        {DARK_PAIRS.map((p) => (
          <button key={p.id} type="button" className={styles.toggle} aria-pressed={preset === p.id} onClick={() => choose(p)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <Slider label="Hidden companion’s mass" value={pair.m2} min={0.1} max={50} log format={msun} onChange={(m2) => edit({ m2 })} />
        <Slider label="Tilt from face-on" value={pair.i} min={5} max={90} step={0.5} format={(i) => `${Math.round(i)}°`} onChange={(i) => edit({ i })} />
        <Slider label="Period" value={pair.period} min={1} max={5000} log format={days} onChange={(period) => edit({ period })} />
      </div>
      <ScatterChart
        groups={[{ name: 'Measurements', color: 'var(--series-2)', shape: 'circle', points: measured.map(([t, v], k) => ({ x: t, y: v, label: `night ${k + 1}` })) }]}
        lines={[{ name: 'The visible star’s velocity', color: 'var(--series-1)', f: (t) => binaryState(orbit, t / orbit.period).v1 }]}
        xScale="linear"
        yScale="linear"
        xMin={0}
        xMax={2 * pair.period}
        yMin={-vmax}
        yMax={vmax}
        xLabel={pair.period >= 730 ? 'Time (years)' : 'Time (days)'}
        yLabel="Velocity away from us (km/s)"
        formatX={(t) => (pair.period >= 730 ? String(Number((t / 365.25).toFixed(1))) : String(Number(t.toPrecision(3))))}
        height={300}
        ariaLabel={`The visible star’s velocity over two orbits of ${days(pair.period)}: it swings ${r.k.toFixed(1)} km/s either side.`}
      >
        {(sx, sy) => <line x1={sx(0)} x2={sx(2 * pair.period)} y1={sy(0)} y2={sy(0)} stroke="var(--text-muted)" strokeDasharray="3 3" />}
      </ScatterChart>
      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          <b>Measured:</b> a period of {days(pair.period)} and a swing of <b>{r.k.toFixed(1)} km/s</b>
          {pair.e > 0.05 ? ` on an orbit of eccentricity ${pair.e.toFixed(2)}` : ''}. The mass function, P K³ (1 − e²)<sup>3/2</sup> / 2πG, is{' '}
          <b>{r.f < 0.1 ? r.f.toFixed(3) : r.f.toFixed(2)} M☉</b>: the companion can’t weigh less than that whatever the visible star.
        </p>
        <p style={{ margin: '6px 0 0' }}>
          With the visible star ({pair.visible}) at {msun(pair.m1)}, the companion weighs <b>at least {msun(r.minimum)}</b>, if we see the orbit
          edge-on. {verdict}
        </p>
        <p style={{ margin: '6px 0 0' }}>
          Its true mass, with the orbit tilted {Math.round(pair.i)}° from face-on, is {msun(pair.m2)}: {named ? named.companion : pair.m2 > NEUTRON_STAR_MAX ? 'a black hole, if it is dark' : pair.m2 > 1.4 ? 'too heavy for a white dwarf' : 'light enough to be a star or a white dwarf'}.{' '}
          {named ? `${named.name}: ${named.note}.` : ''}
        </p>
      </div>
      <Caption>
        {`A swing of ${r.k.toFixed(1)} km/s every ${days(pair.period)} means a companion of at least ${msun(r.minimum)}.`}
      </Caption>
    </Figure>
  );
}
