import { useMemo, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { observerRange } from '../viz/hr/axes';
import { HRDiagram } from '../viz/hr/HRDiagram';
import { useIsochrone } from '../viz/useStellar';
import { Slider } from './Slider';
import { AGE_RANGE, CLUSTERS, clusterById, clusterPoints, clusterZ, formatMyr, isochroneHR, turnoffReadout } from './starLives';
import styles from './sky/sky.module.css';

/**
 * Age a cluster (Figure 17.3): Gaia's members of six clusters, corrected for
 * distance and dust, on the observers' HR diagram, with an isochrone from the
 * SSE engine: every star of one age and the cluster's make-up. Slide the age
 * until the isochrone's turn-off, where stars leave the main sequence, matches
 * the cluster's.
 */

const START_CLUSTER = 'pleiades';
const START_AGE = 1000;
const RANGE = observerRange(-0.5, 3.3, -4, 12);

/** Snap the slider to two significant figures, so ages read cleanly and isochrones repeat (and come from the cache). */
const snap = (age: number) => Number(age.toPrecision(2));

export function ClusterAgeFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [id, setId] = useState(START_CLUSTER);
  const [age, setAge] = useState(START_AGE);
  const [shown, setShown] = useState(false);
  const reset = () => {
    setId(START_CLUSTER);
    setAge(START_AGE);
    setShown(false);
  };
  const cluster = clusterById(id);
  const z = clusterZ(cluster);
  const points = useMemo(() => clusterPoints(cluster), [cluster]);
  const layers = useMemo(() => [{ id, points, size: 1.8, alpha: 0.9 }], [id, points]);
  const iso = useIsochrone(snap(age), z);
  const isoPoints = useMemo(() => (iso ? isochroneHR(iso) : []), [iso]);
  const turnoff = turnoffReadout(snap(age), z);
  const [lo, hi] = cluster.age;
  // The name inside a sentence ("the Pleiades"), and its possessive ("the Pleiades’", "M67’s").
  const inSentence = cluster.name.replace(/^The /, 'the ');
  const possessive = inSentence.endsWith('s') ? `${inSentence}’` : `${inSentence}’s`;
  const verdict = age < lo * 0.75 ? 'too young' : age > hi * 1.3 ? 'too old' : 'close';

  return (
    <Figure
      number={number}
      title="Age a cluster"
      description="Gaia’s measurements of the stars in six clusters, the Pleiades, the Hyades, Praesepe, M67, NGC 188 and 47 Tucanae, on the HR diagram, with a line of stars all of one age from the stellar-evolution engine. The heavier stars leave the main sequence first, so the point where a cluster’s stars turn off it gives the cluster’s age: about a hundred million years for the Pleiades, a few billion for M67 and twelve billion for 47 Tucanae."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      starForge={`cluster=${id}&age=${snap(age)}`}
      legend={[
        { label: 'the cluster’s stars (Gaia), in their colours', symbol: <circle r="3" fill="#ffd9a8" /> },
        { label: 'every star of the chosen age (the engine)', symbol: <path d="M-10 6 L0 -2 L10 -8" stroke="#7bdff2" strokeWidth="2.5" fill="none" /> },
        { label: 'the turn-off', symbol: <circle r="5" fill="none" stroke="#7bdff2" strokeWidth="2" /> },
      ]}
      simplified={
        <p>
          Members are chosen from Gaia’s third data release by where they are, how they move across the sky and their distance; a few
          strangers will have slipped in, and stars in pairs sit a little above the main sequence. Each cluster gets one distance and one dimming
          by dust from published work. The line is SSE’s formulas, turned into Gaia’s colours with the colour and brightness corrections of
          main-sequence stars, which suit giants and the coolest dwarfs less well: the lower main sequence and the giants won’t match exactly.
          The turn-off fits best.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Cluster" style={{ marginBottom: 6 }}>
        {CLUSTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.toggle}
            aria-pressed={c.id === id}
            onClick={() => {
              setId(c.id);
              setShown(false);
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <Slider label="Age" value={age} min={AGE_RANGE[0]} max={AGE_RANGE[1]} log step={0.005} format={(a) => formatMyr(snap(a))} onChange={setAge} />
      </div>
      <HRDiagram
        axes="observer"
        range={RANGE}
        layers={layers}
        ariaLabel={`${cluster.name}: ${cluster.members.toLocaleString('en-GB')} stars on the HR diagram, with the stars of an age of ${formatMyr(snap(age))}. Its turn-off is at stars of ${turnoff.mass.toFixed(2)} solar masses.`}
      >
        {(place) => {
          if (!isoPoints.length) return null;
          // Break the line where it jumps (the helium flash, from the red giant's tip to the helium-burning clump).
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
      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          <b>{cluster.name}</b>: {cluster.members.toLocaleString('en-GB')} members, {cluster.distance.toLocaleString('en-GB')} parsecs away
          {cluster.feh > 0.05 ? ', a little richer in metals than the Sun' : cluster.feh < -0.3 ? ', poorer in metals than the Sun' : ''}.
        </p>
        <p style={{ margin: '6px 0 0' }}>
          At <b>{formatMyr(snap(age))}</b>, stars heavier than <b>{turnoff.mass.toFixed(2)} M☉</b> have left the main sequence.
        </p>
        <p style={{ margin: '6px 0 0' }}>
          {shown ? (
            <>
              Published age: <b>{cluster.age[0] === cluster.age[1] ? formatMyr(lo) : `${formatMyr(lo).replace(/ years$/, '')} to ${formatMyr(hi)}`}</b> ({cluster.ageSource}).
            </>
          ) : (
            <button type="button" className={styles.toggle} onClick={() => setShown(true)}>
              Show the published age
            </button>
          )}
        </p>
      </div>
      <Caption>
        {!iso
          ? 'Working out the stars of this age…'
          : shown
            ? `At ${formatMyr(snap(age))} the line is ${verdict === 'close' ? 'close to the published age' : verdict === 'too young' ? 'younger than the published age' : 'older than the published age'} of ${inSentence}.`
            : `The line shows every star of ${formatMyr(snap(age))}: move it until its turn-off sits where ${possessive} stars leave the main sequence.`}
      </Caption>
    </Figure>
  );
}
