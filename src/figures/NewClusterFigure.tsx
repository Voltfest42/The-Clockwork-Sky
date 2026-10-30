import { useMemo, useState, type ReactNode } from 'react';
import { Random } from '../core/random';
import { drawCluster } from '../core/stellar/imf';
import { Caption, Figure } from '../viz/Figure';
import { Histogram } from '../viz/Histogram';
import { Slider } from './Slider';
import { IMF, MASS_CLASSES, massHistogram, summariseCluster, SUPERNOVA_MASS } from './starBirth';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * A new cluster's star masses (Figure 16.5): a cluster drawn from Kroupa's
 * initial mass function, seeded. The masses as a histogram on log axes; who
 * holds the numbers, the mass and the light; and how many will explode.
 */

const START_STARS = 1000;
const START_SEED = 1;

const CLASS_FILL: Record<string, { fill: string; opacity: number }> = {
  bd: { fill: 'var(--text-muted)', opacity: 0.6 },
  red: { fill: 'var(--series-3)', opacity: 1 },
  sunlike: { fill: 'var(--series-2)', opacity: 1 },
  heavy: { fill: 'var(--series-1)', opacity: 0.55 },
  massive: { fill: 'var(--series-1)', opacity: 1 },
};

function percent(x: number): string {
  if (x === 0) return '0%';
  if (x < 0.001) return 'under 0.1%';
  if (x < 0.01) return `${(x * 100).toFixed(1)}%`;
  return `${Math.round(x * 100)}%`;
}

const solar = (x: number) => (x >= 1 ? `${Number(x.toPrecision(3))}` : `${Number(x.toPrecision(2))}`);

export function NewClusterFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [stars, setStars] = useState(START_STARS);
  const [seed, setSeed] = useState(START_SEED);
  const reset = () => {
    setStars(START_STARS);
    setSeed(START_SEED);
  };
  const masses = useMemo(() => drawCluster(IMF, stars, new Random(seed)), [stars, seed]);
  const s = useMemo(() => summariseCluster(masses), [masses]);
  const bins = useMemo(() => massHistogram(masses), [masses]);
  const rows = [
    { id: 'number', label: 'By number' },
    { id: 'mass', label: 'By mass' },
    { id: 'light', label: 'By light' },
  ] as const;

  return (
    <Figure
      number={number}
      title="A new cluster’s star masses"
      description="A newborn cluster of 100 to 100,000 stars, each mass drawn at random from Kroupa’s initial mass function, shown as a histogram on logarithmic axes. Small stars outnumber big ones by far: only about one star in 160 is heavier than 8 Suns. Bars show who holds the numbers, the mass and the light; the few heavy stars give out most of the light, and they are the ones that will explode as supernovae."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={MASS_CLASSES.map((c) => ({
        label: c.name,
        symbol: <rect x="-9" y="-5" width="18" height="10" rx="2" fill={CLASS_FILL[c.id].fill} fillOpacity={CLASS_FILL[c.id].opacity} />,
      }))}
      simplified={
        <p>
          The masses follow Kroupa’s 2001 mass function from 0.01 to 150 Suns, drawn exactly but at random, so each cluster differs a little.
          Real clusters may lose their lightest members and their brown dwarfs are hard to count. Each star’s light is its light when it
          first settles on the main sequence (SSE’s formula), and brown dwarfs’ light, far too little to show, is left out. “Over 8 Suns” is
          the usual rough line for stars that end as supernovae.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Stars" value={stars} min={100} max={100000} log step={0.01} format={(n) => Math.round(n).toLocaleString('en-GB')} onChange={(n) => setStars(Math.round(n))} />
        <button type="button" className={figureStyles.toolButton} onClick={() => setSeed(seed + 1)}>
          Draw another cluster
        </button>
      </div>
      <Histogram
        bins={bins}
        xMin={-2}
        xMax={Math.log10(150)}
        yScale="log"
        xLabel="Mass (Suns)"
        yLabel="Objects"
        formatX={(x) => solar(10 ** x)}
        color="var(--series-2)"
        markers={[
          { x: Math.log10(0.08), label: 'stars from here', color: 'var(--text)', dashed: true },
          { x: 0, label: 'the Sun', color: 'var(--text)' },
          { x: Math.log10(SUPERNOVA_MASS), label: 'supernovae', color: 'var(--series-1)', dashed: true },
        ]}
        height={250}
        ariaLabel={`Masses of a cluster of ${s.stars.toLocaleString('en-GB')} stars and ${s.brownDwarfs.toLocaleString('en-GB')} brown dwarfs, on logarithmic axes. The heaviest star is ${solar(s.heaviest)} solar masses.`}
      />
      <svg viewBox="0 0 600 112" width="100%" style={{ display: 'block', margin: '6px 0' }} role="img" aria-label="Shares of the number, the mass and the light, by mass class: see the table below.">
        {rows.map((row, k) => {
          let x = 110;
          return (
            <g key={row.id}>
              <text x={0} y={k * 36 + 22} fontSize="12" fill="var(--text)">
                {row.label}
              </text>
              {s.shares.map((c) => {
                const w = 490 * c[row.id];
                const at = x;
                x += w;
                return (
                  <g key={c.id}>
                    <rect x={at} y={k * 36 + 8} width={w} height={22} fill={CLASS_FILL[c.id].fill} fillOpacity={CLASS_FILL[c.id].opacity} />
                    {w > 48 && (
                      <text x={at + w / 2} y={k * 36 + 23} fontSize="10.5" textAnchor="middle" fill="var(--bg)" fontWeight={600}>
                        {percent(c[row.id])}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ overflowX: 'auto' }}>
        <table className={seasonStyles.table}>
          <caption className="visually-hidden">Shares of the cluster’s objects, mass and light by mass class</caption>
          <thead>
            <tr>
              <th scope="col">Mass class</th>
              <th scope="col">Number</th>
              <th scope="col">Mass</th>
              <th scope="col">Light</th>
            </tr>
          </thead>
          <tbody>
            {s.shares.map((c) => (
              <tr key={c.id}>
                <th scope="row">{c.name}</th>
                <td>{percent(c.number)}</td>
                <td>{percent(c.mass)}</td>
                <td>{c.id === 'bd' ? '—' : percent(c.light)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          <b>
            {s.stars.toLocaleString('en-GB')} stars and {s.brownDwarfs.toLocaleString('en-GB')} brown dwarfs
          </b>
          , {Math.round(s.totalMass).toLocaleString('en-GB')} Suns in all. The heaviest star is {solar(s.heaviest)} Suns.{' '}
          {s.supernovae === 0
            ? 'None is heavy enough to explode as a supernova.'
            : `${s.supernovae.toLocaleString('en-GB')} ${s.supernovae === 1 ? 'is' : 'are'} heavy enough to explode as supernovae, within about 40 million years.`}
        </p>
      </div>
      <Caption>
        Most of the cluster’s stars are red dwarfs, and most of its light comes from the handful over 8 Suns. Draw small clusters several
        times: whether they get a heavy star at all is luck.
      </Caption>
    </Figure>
  );
}
