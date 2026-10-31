import { useMemo } from 'react';
import { dyingMass } from '../../core/stellar/lives';
import { Slider } from '../../figures/Slider';
import { CLUSTERS, clusterById, clusterPoints, clusterZ, formatMyr, isochroneHR, turnoffReadout } from '../../figures/starLives';
import { observerRange } from '../../viz/hr/axes';
import { Legend } from '../../viz/Figure';
import { HRDiagram } from '../../viz/hr/HRDiagram';
import { useIsochrone } from '../../viz/useStellar';
import figureStyles from '../../figures/figures.module.css';
import skyStyles from '../../figures/sky/sky.module.css';
import { formatZ, msun } from './format';
import { AGE_LIMITS } from './link';
import styles from './StarForge.module.css';

/**
 * Clusters mode: an isochrone (every star of one age and metallicity, from the
 * engine) over one of Figure 17.3's clusters from Gaia, with the turn-off, the
 * heaviest star still shining, and the cluster's published age.
 */

const RANGE = observerRange(-0.6, 3.4, -6, 12);
/** Ages snap to two significant figures, so isochrones repeat and come from the cache. */
const snapAge = (age: number) => Number(age.toPrecision(2));

export function ClusterMode({
  cluster: id,
  age,
  z: zOwn,
  onChange,
  onForge,
}: {
  cluster: string;
  age: number;
  z: number | null;
  onChange: (next: { cluster?: string; age?: number; z?: number | null }) => void;
  onForge: (mass: number, z: number) => void;
}) {
  const cluster = clusterById(id);
  const z = zOwn ?? Number(clusterZ(cluster).toPrecision(3));
  const points = useMemo(() => clusterPoints(cluster), [cluster]);
  const layers = useMemo(() => [{ id, points, size: 1.8, alpha: 0.9 }], [id, points]);
  const a = snapAge(age);
  const iso = useIsochrone(a, z);
  const isoPoints = useMemo(() => (iso ? isochroneHR(iso) : []), [iso]);
  const turnoff = turnoffReadout(a, z);
  const heaviest = useMemo(() => dyingMass(a, z), [a, z]);
  const [lo, hi] = cluster.age;
  const inSentence = cluster.name.replace(/^The /, 'the ');

  return (
    <div>
      <div className={skyStyles.presets} role="group" aria-label="Cluster" style={{ marginBottom: 8 }}>
        {CLUSTERS.map((c) => (
          <button key={c.id} type="button" className={skyStyles.toggle} aria-pressed={c.id === id} onClick={() => onChange({ cluster: c.id, z: null })}>
            {c.name}
          </button>
        ))}
      </div>
      <div className={styles.inputs}>
        <Slider label="Age" value={a} min={AGE_LIMITS[0]} max={AGE_LIMITS[1]} log step={0.005} format={(x) => formatMyr(snapAge(x))} onChange={(x) => onChange({ age: snapAge(x) })} />
        <Slider label="Metallicity" value={z} min={0.0001} max={0.03} log step={0.01} format={formatZ} onChange={(x) => onChange({ z: Number(x.toPrecision(2)) })} />
        <div className={styles.buttons} style={{ marginTop: 0 }}>
          <button type="button" className={figureStyles.toolButton} onClick={() => onChange({ z: null })} disabled={zOwn === null}>
            Use the cluster’s own metals
          </button>
        </div>
      </div>
      <div className={styles.main}>
        <div>
          <HRDiagram
            axes="observer"
            range={RANGE}
            layers={layers}
            ariaLabel={`${cluster.name}: ${cluster.members.toLocaleString('en-GB')} stars measured by Gaia, with every star of ${formatMyr(a)} and ${formatZ(z)} from the engine. Its turn-off is at stars of ${msun(turnoff.mass)}.`}
          >
            {(place) => {
              if (!isoPoints.length) return null;
              let d = '';
              let prev: [number, number] | null = null;
              for (const p of isoPoints) {
                const xy = place(p);
                d += `${prev && Math.hypot(xy[0] - prev[0], xy[1] - prev[1]) < 45 ? 'L' : 'M'}${xy[0].toFixed(1)} ${xy[1].toFixed(1)}`;
                prev = xy;
              }
              const to = iso?.reduce((best, p) => (p.kw <= 1 && p.mass > best.mass ? p : best), iso[0]);
              const toXY = to ? place(isoPoints[iso!.indexOf(to)]) : null;
              return (
                <g>
                  <path d={d} stroke="#070b16" strokeWidth={5} fill="none" strokeOpacity={0.7} />
                  <path d={d} stroke="#7bdff2" strokeWidth={2.5} fill="none" />
                  {toXY && <circle cx={toXY[0]} cy={toXY[1]} r={7} fill="none" stroke="#7bdff2" strokeWidth={2} />}
                </g>
              );
            }}
          </HRDiagram>
          <Legend
            items={[
              { label: 'the cluster’s stars (Gaia), in their colours', symbol: <circle r="3" fill="#ffd9a8" /> },
              { label: 'every star of the chosen age (the engine)', symbol: <path d="M-10 6 L0 -2 L10 -8" stroke="#7bdff2" strokeWidth="2.5" fill="none" /> },
              { label: 'the turn-off', symbol: <circle r="5" fill="none" stroke="#7bdff2" strokeWidth="2" /> },
            ]}
          />
        </div>
        <div className={styles.panel}>
          <div className={styles.box} aria-live="polite">
            <h3>{cluster.name}</h3>
            <p>
              {cluster.members.toLocaleString('en-GB')} members, {cluster.distance.toLocaleString('en-GB')} parsecs away; its own metals give {formatZ(Number(clusterZ(cluster).toPrecision(3)))}.
            </p>
            <p>
              At <b>{formatMyr(a)}</b>, stars heavier than <b>{msun(turnoff.mass)}</b> have left the main sequence, and the heaviest still shining at all
              is about <b>{msun(heaviest)}</b>.
            </p>
            <p>
              Published age: <b>{lo === hi ? formatMyr(lo) : `${formatMyr(lo).replace(/ years$/, '')} to ${formatMyr(hi)}`}</b> ({cluster.ageSource}).
            </p>
            <p className={styles.note}>{iso ? `The line has ${iso.length} stars, each run by the engine to ${formatMyr(a)}.` : 'Working out the stars of this age…'}</p>
            <div className={styles.buttons}>
              <button type="button" className={figureStyles.toolButton} onClick={() => onForge(Number(turnoff.mass.toPrecision(3)), z)}>
                Forge the turn-off star
              </button>
            </div>
          </div>
          <div className={styles.box}>
            <h3>Reading a cluster</h3>
            <p>
              Every star in {inSentence} was born at about the same time from the same cloud, so they differ only in mass. Heavier stars use up their
              hydrogen sooner and peel off the main sequence first: where the cluster’s stars turn off it is a clock.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
