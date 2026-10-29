import { useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { Cutaway } from '../viz/cutaway/Cutaway';
import { LineChart } from '../viz/LineChart';
import { Slider } from './Slider';
import { formatDensity, formatTemperature, LAYERS, layerAt, PROFILES, profileValue, SHELLS, solarAt, type Profile } from './sun';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The Sun cut open (Figure 15.1): its layers to scale from a standard solar
 * model (Model S), with the outer atmosphere beyond the edge not to scale.
 * Slide a marker from the centre to the surface to read the temperature,
 * density, and the shares of the mass and power inside; the chart beside it
 * draws one of those against depth. Pick a layer for what happens there and
 * how we know.
 */

const START = { depth: 0.1, profile: 'T' as Profile, layer: 'core' };

export function SunCutawayFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [depth, setDepth] = useState(START.depth);
  const [profile, setProfile] = useState<Profile>(START.profile);
  const [layerId, setLayerId] = useState(START.layer);
  const reset = () => {
    setDepth(START.depth);
    setProfile(START.profile);
    setLayerId(START.layer);
  };
  const layer = LAYERS.find((l) => l.id === layerId)!;
  const p = PROFILES.find((x) => x.id === profile)!;
  const T = solarAt(depth, 'T');
  const rho = solarAt(depth, 'rho');
  const m = solarAt(depth, 'm');
  const L = Math.min(1, solarAt(depth, 'L'));
  const here = layerAt(depth);
  const pick = (id: string) => {
    setLayerId(id);
    const l = LAYERS.find((x) => x.id === id)!;
    if (l.to <= 1) setDepth(Math.min(0.999, (l.from + l.to) / 2));
  };

  return (
    <Figure
      number={number}
      title="Sun cutaway"
      description="The Sun cut open, its layers to scale from a standard solar model: the core, where 99% of the power is made inside a quarter of the radius; the radiative zone; the convection zone, the outer 29% of the radius; and the visible surface. Beyond the edge, not to scale, the chromosphere and the million-degree corona. Slide from the centre to the surface to read the temperature (15.7 million K at the centre, 5,772 K at the surface), the density, and how much of the mass and power lies inside."
      height={620}
      tryThis={tryThis}
      onReset={reset}
      notToScale
      legend={LAYERS.map((l) => ({ label: l.name.toLowerCase(), symbol: <rect x="-7" y="-7" width="14" height="14" rx="3" fill={l.colour} stroke="var(--border)" /> }))}
      simplified={
        <p>
          The insides come from Model S (Christensen-Dalsgaard and colleagues, 1996), the standard model helioseismologists compare the Sun
          with; it matches the Sun’s measured vibrations to a fraction of a per cent. The layers’ edges are the model’s: the convection zone’s base
          at 0.712 of the radius against the measured 0.713. The chromosphere and corona are drawn far thicker than they are, and the corona has
          no sharp edge.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Distance from the centre" value={depth} min={0} max={1} step={0.001} format={(r) => `${Math.round(r * 1000) / 10}% of the radius`} onChange={setDepth} />
        <div className={figureStyles.toolbar}>
          <span className={styles.togglesLabel}>Chart:</span>
          <div className={figureStyles.segmented} role="group" aria-label="Chart against depth">
            {PROFILES.map((x) => (
              <button key={x.id} type="button" aria-pressed={profile === x.id} onClick={() => setProfile(x.id)}>
                {x.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={figureStyles.withSide}>
        <LineChart
          series={[{ name: p.name, color: 'var(--series-1)', points: SHELLS.map((s) => ({ x: s.r, y: profileValue(s, profile) })) }]}
          xLabel="Distance from the centre (share of the radius)"
          yLabel={p.axis}
          xMin={0}
          xMax={1}
          yMin={0}
          yMax={p.max}
          formatX={(x) => `${Math.round(x * 100)}%`}
          formatY={p.format}
          markers={[{ x: depth, color: 'var(--accent)' }]}
          onPick={setDepth}
          dots={false}
          hideLegend
          width={420}
          height={280}
          ariaLabel={`${p.name}, against distance from the Sun’s centre`}
        />
        <Cutaway layers={LAYERS} depth={depth} selected={layerId} onSelect={pick} size={260} ariaLabel="The Sun cut open: pick a layer" />
      </div>
      <div className={styles.readout}>
        <span>
          Temperature: <b>{formatTemperature(T)}</b>
        </span>
        <span>
          Density: <b>{formatDensity(rho)}</b>
        </span>
        <span>
          Mass inside: <b>{Math.round(m * 1000) / 10}%</b>
        </span>
        <span>
          Power made inside: <b>{Math.round(L * 1000) / 10}%</b>
        </span>
      </div>
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>{layer.name}</h4>
        <p style={{ margin: '4px 0' }}>{layer.what}</p>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          <b>How we know:</b> {layer.howWeKnow}
        </p>
      </div>
      <Caption>{`${Math.round(depth * 1000) / 10}% of the way out, in the ${here.name.toLowerCase()}: ${formatTemperature(T)}, ${formatDensity(rho)} density. ${Math.round(m * 100)}% of the Sun’s mass lies inside this point, and ${Math.round(L * 100)}% of its power is made inside it.`}</Caption>
    </Figure>
  );
}
