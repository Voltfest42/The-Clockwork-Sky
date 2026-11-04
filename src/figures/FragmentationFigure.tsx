import { useState, type ReactNode } from 'react';
import { powerOfTen } from '../core/math/scientific';
import { CLOUD_TEMPERATURE, densityForJeansMass, fragmentationAt, jeansMassAt, OPACITY_LIMIT } from '../core/structure/fragmentation';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { formatDensity, formatSolarMass } from './holding';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Fragmentation (Figure 20.3): a cold cloud's Jeans mass against its density
 * as it collapses at 10 K, and the cloud breaking into fragments within
 * fragments, drawn as a tree, until the gas turns opaque at about a hundredth
 * of a solar mass. Bands mark stars, brown dwarfs and planetary masses.
 */

const START = { cloud: 1000, density: 1e4 };
const MAX_DENSITY = 1e12;
const TREE_LEVELS = 6;
const BROWN_DWARF = 0.075;
const DEUTERIUM = 0.013;

const formatCount = (n: number) => (n >= 1e6 ? `${Number((n / 1e6).toPrecision(2))} million` : Math.round(n).toLocaleString('en-GB'));

export function FragmentationFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [cloud, setCloud] = useState(START.cloud);
  const [density, setDensity] = useState(START.density);
  const reset = () => {
    setCloud(START.cloud);
    setDensity(START.density);
  };
  const start = densityForJeansMass(cloud);
  const n = Math.max(start, density);
  const f = fragmentationAt(cloud, n);
  const opaqueAt = densityForJeansMass(OPACITY_LIMIT.high);
  const drawn = Math.min(f.levels, TREE_LEVELS);
  const W = 320;
  const H = 210;
  const rowY = (l: number) => 20 + (l * (H - 50)) / TREE_LEVELS;
  const summary = f.opaque
    ? `The gas is now opaque: fragments of about ${formatSolarMass(OPACITY_LIMIT.high)} trap the heat of their collapse, warm up and stop breaking. The cloud has made about ${formatCount(f.fragments)} seeds, which grow into stars by gathering more gas, or stay brown dwarfs and planet-mass objects.`
    : `At ${formatDensity(n)} the Jeans mass is ${formatSolarMass(f.jeansMass)}, so the cloud has broken into about ${formatCount(f.fragments)} pieces, each still collapsing and breaking up.`;

  return (
    <Figure
      number={number}
      title="Fragmentation"
      description="A cold cloud collapsing at 10 K. As it gets denser its Jeans mass falls, halving with every fourfold rise in density, so it breaks into ever smaller fragments, drawn as a tree, until the gas becomes opaque to its own heat at about a hundredth of the Sun’s mass, the opacity limit. Bands mark the masses of stars, brown dwarfs and planets."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'Jeans mass at 10 K', symbol: <line x1="-9" x2="9" y1="0" y2="0" stroke="var(--series-1)" strokeWidth="3" /> },
        { label: 'the collapsing cloud now', symbol: <circle r="6" fill="var(--accent)" /> },
        { label: 'opacity limit (0.007–0.01 M☉)', symbol: <rect x="-9" y="-5" width="18" height="10" fill="var(--series-3)" fillOpacity={0.35} /> },
      ]}
      simplified={
        <p>
          The cloud stays at exactly 10 K and breaks in two at every halving of the Jeans mass (Hoyle’s picture); real clouds are turbulent and
          magnetic, and fragment unevenly. The Jeans mass is Chapter 16’s. The opacity limit, 0.007–0.01 solar masses, is a published
          estimate (Low and Lynden-Bell 1976; Rees 1976), not computed here.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Cloud" value={cloud} min={10} max={10_000} log format={formatSolarMass} onChange={setCloud} />
        <Slider label="Density" value={n} min={1} max={MAX_DENSITY} log step={0.02} format={formatDensity} onChange={(v) => setDensity(Math.max(v, start))} />
      </div>
      <div className={figureStyles.withSide}>
        <ScatterChart
          groups={[]}
          lines={[{ name: 'Jeans mass at 10 K', color: 'var(--series-1)', f: (x) => jeansMassAt(x) }]}
          xScale="log"
          yScale="log"
          xMin={1}
          xMax={MAX_DENSITY}
          yMin={1e-3}
          yMax={1e5}
          xLabel="Density (molecules per cm³)"
          formatX={(x) => powerOfTen(Math.round(Math.log10(x)))}
          yLabel="Mass (Suns)"
          highlight={{ x: n, y: f.fragmentMass, label: 'now', color: 'var(--accent)' }}
          ariaLabel={`The Jeans mass at ${CLOUD_TEMPERATURE} K falls as the density rises. ${summary}`}
          height={400}
        >
          {(sx, sy) => (
            <g>
              <rect x={sx(1)} y={sy(OPACITY_LIMIT.high)} width={sx(MAX_DENSITY) - sx(1)} height={sy(OPACITY_LIMIT.low) - sy(OPACITY_LIMIT.high)} fill="var(--series-3)" fillOpacity={0.35} />
              {[
                { m: BROWN_DWARF, above: 'stars', below: 'brown dwarfs' },
                { m: DEUTERIUM, below: 'planetary masses' },
              ].map((b) => (
                <g key={b.m}>
                  <line x1={sx(1)} x2={sx(MAX_DENSITY)} y1={sy(b.m)} y2={sy(b.m)} stroke="var(--text-muted)" strokeDasharray="4 3" />
                  {b.above && (
                    <text x={sx(MAX_DENSITY) - 4} y={sy(b.m) - 4} textAnchor="end" fontSize="10.5" fill="var(--text-muted)">
                      {b.above}
                    </text>
                  )}
                  <text x={sx(MAX_DENSITY) - 4} y={sy(b.m) + 12} textAnchor="end" fontSize="10.5" fill="var(--text-muted)">
                    {b.below}
                  </text>
                </g>
              ))}
              <line x1={sx(opaqueAt)} x2={sx(opaqueAt)} y1={sy(1e5)} y2={sy(1e-3)} stroke="var(--series-3)" strokeDasharray="3 3" />
              <text x={sx(opaqueAt) - 4} y={sy(1e4)} textAnchor="end" fontSize="10.5" fill="var(--text)">
                gas turns opaque
              </text>
            </g>
          )}
        </ScatterChart>
        <div>
          <p className={styles.panelTitle}>Fragments within fragments</p>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`A tree of fragments ${f.levels} levels deep: about ${formatCount(f.fragments)} pieces of ${formatSolarMass(f.fragmentMass)}`}>
            {Array.from({ length: drawn + 1 }, (_, l) => {
              const count = 2 ** l;
              return Array.from({ length: count }, (_, k) => {
                const x = ((k + 0.5) / count) * W;
                const y = rowY(l);
                const r = Math.max(1.6, 9 * 0.72 ** l);
                return (
                  <g key={`${l}-${k}`}>
                    {l < drawn && (
                      <>
                        <line x1={x} y1={y} x2={((2 * k + 0.5) / (2 * count)) * W} y2={rowY(l + 1)} stroke="var(--text-muted)" strokeWidth="0.8" />
                        <line x1={x} y1={y} x2={((2 * k + 1.5) / (2 * count)) * W} y2={rowY(l + 1)} stroke="var(--text-muted)" strokeWidth="0.8" />
                      </>
                    )}
                    <circle cx={x} cy={y} r={r} fill={l === drawn && f.opaque ? 'var(--series-3)' : 'var(--accent)'} />
                  </g>
                );
              });
            })}
            <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text)">
              {f.levels > TREE_LEVELS ? `…and ${f.levels - TREE_LEVELS} more level${f.levels - TREE_LEVELS > 1 ? 's' : ''}: ${formatCount(2 ** f.levels)} pieces in all` : `${formatCount(2 ** f.levels)} piece${f.levels ? 's' : ''}`}
            </text>
          </svg>
          <dl className={styles.facts}>
            <div>
              <dt>Jeans mass</dt>
              <dd>{formatSolarMass(f.jeansMass)}</dd>
            </div>
            <div>
              <dt>Levels of splitting</dt>
              <dd>{f.levels}</dd>
            </div>
          </dl>
        </div>
      </div>
      <Caption>{summary}</Caption>
    </Figure>
  );
}
