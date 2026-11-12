import { useMemo, useState, type ReactNode } from 'react';
import { massInside } from '../core/galaxy/rotation';
import { formatScientific } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { bestHalo, haloMassInside, RATIO_START, ROTATION_GALAXIES } from './crowds';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The rotation curve (Figure 30.3): a galaxy's circular speed built from its
 * parts, the bulge, the stars' disc, the gas and a dark halo, each with its
 * own curve and the total in quadrature, against the measured speeds: the
 * Milky Way's from Gaia-era red giants and five SPARC galaxies'. Slide the
 * stars' mass-to-light ratio and the halo's mass; take the halo away to see
 * where the visible matter falls short.
 */

const START = 'NGC3198';

export function RotationCurveFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [id, setId] = useState(START);
  const galaxy = ROTATION_GALAXIES.find((g) => g.id === id) ?? ROTATION_GALAXIES[0];
  const [ratio, setRatio] = useState(RATIO_START);
  const [halo, setHalo] = useState(galaxy.haloMass);
  const choose = (next: string) => {
    const g = ROTATION_GALAXIES.find((x) => x.id === next)!;
    setId(next);
    setRatio(RATIO_START);
    setHalo(g.haloMass);
  };
  const reset = () => choose(START);

  const parts = useMemo(() => galaxy.parts(ratio, halo), [galaxy, ratio, halo]);
  const last = galaxy.points.reduce((a, b) => (b.r > a.r ? b : a));
  const vModel = parts.total(last.r);
  const vVisible = parts.visible(last.r);
  const mTotal = massInside(last.v, last.r);
  const mHalo = haloMassInside(last.r, halo);
  const stars = ratio * galaxy.starsPerRatio;
  const hasBulge = parts.bulge(last.r) > 1;
  const sets = [...new Set(galaxy.points.map((p) => p.set))];
  const shapes = ['circle', 'square'] as const;
  // A point is missed when the model is off by more than twice its uncertainty and by more than 5%
  const misses = galaxy.points.filter((p) => Math.abs(parts.total(p.r) - p.v) > Math.max(2 * p.error, 0.05 * p.v)).length;

  const caption = `${galaxy.name}, ${galaxy.blurb}. At ${Math.round(last.r)} kpc out, its farthest measured point, it turns at ${Math.round(last.v)} km/s, which takes ${formatScientific(mTotal, 2)} M☉ inside that radius. The stars, at a mass-to-light ratio of ${ratio.toFixed(2)} (${formatScientific(stars, 2)} M☉), and the gas alone would give ${Math.round(Math.max(vVisible, 0))} km/s there. ${halo > 0 ? `With a dark halo of ${formatScientific(halo, 2)} M☉ in all, holding ${formatScientific(mHalo, 2)} M☉ inside ${Math.round(last.r)} kpc, the model gives ${Math.round(vModel)} km/s;` : 'With no dark halo, the model falls short;'} ${misses === 0 ? 'it matches every measured point to within 5% or twice its uncertainty.' : `it misses ${misses} of the ${galaxy.points.length} measured points by more than 5% and twice their uncertainty.`}`;

  const lineFor = (f: (r: number) => number) => (r: number) => (r <= 0.05 ? NaN : f(r));

  return (
    <Figure
      number={number}
      title="The rotation curve"
      description="A galaxy’s rotation speed against distance from its centre, built from its parts: the bulge, the disc of stars, the gas and a dark halo, each with its own curve, adding up in quadrature to the total. Against the measured speeds of the Milky Way (from Gaia-era surveys of red giants) and five galaxies from the SPARC sample, the visible matter alone falls short far out; a dark halo makes up the difference."
      height={860}
      tryThis={tryThis}
      onReset={reset}
      simplified={
        <p>
          Each part is a standard shape: a Hernquist bulge, thin exponential discs (Freeman’s formula), and a Navarro–Frenk–White dark halo whose
          concentration follows its mass as simulations find (Dutton and Macciò 2014). For the SPARC galaxies the stars’ and gas’s speeds are
          SPARC’s own, worked out from their measured light and hydrogen; only the mass-to-light ratio (the bulge’s 1.4 times the disc’s) and the
          halo’s mass are free. The Milky Way’s model stands in for its counted stars and gas (0.5 gives their counted mass). Real halos may have
          cores rather than the cusp this shape has, which is why some dwarfs, like DDO 154, fit badly in the middle; a halo of a different shape
          fits the Milky Way’s fall beyond 20 kpc with much less mass.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Galaxy">
          {ROTATION_GALAXIES.map((g) => (
            <button key={g.id} type="button" aria-pressed={g.id === id} onClick={() => choose(g.id)}>
              {g.name}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        <Slider
          label="Stars’ mass-to-light ratio"
          value={ratio}
          min={0.1}
          max={1.5}
          step={0.05}
          format={(v) => `${v.toFixed(2)} (stars ${formatScientific(v * galaxy.starsPerRatio, 2)} M☉)`}
          onChange={(v) => setRatio(Math.round(v * 20) / 20)}
        />
        <Slider
          label="Dark halo’s mass"
          value={halo}
          min={galaxy.haloRange[0]}
          max={galaxy.haloRange[1]}
          step={galaxy.haloRange[1] / 300}
          format={(v) => (v <= 0 ? 'none' : `${formatScientific(v, 2)} M☉`)}
          onChange={(v) => setHalo(v < galaxy.haloRange[1] / 600 ? 0 : Number(v.toPrecision(3)))}
        />
      </div>
      <div className={figureStyles.toolbar}>
        <button type="button" className={figureStyles.toolButton} onClick={() => setHalo(0)} aria-pressed={halo === 0}>
          No halo
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={() => setHalo(Number(bestHalo(galaxy, ratio).toPrecision(3)))}>
          Best halo for these stars
        </button>
      </div>
      <ScatterChart
        groups={sets.map((set, k) => ({
          name: `measured (${set})`,
          color: k === 0 ? 'var(--text)' : 'var(--muted)',
          shape: shapes[k % 2],
          points: galaxy.points.filter((p) => p.set === set).map((p) => ({ x: p.r, y: p.v, label: `${set}, ${p.r} kpc` })),
        }))}
        lines={[
          { name: 'total', color: 'var(--series-1)', f: lineFor(parts.total) },
          { name: 'visible matter', color: 'var(--series-2)', dashed: true, f: lineFor(parts.visible) },
          { name: 'stars’ disc', color: '#38bdf8', dash: '2 3', f: lineFor(parts.disc) },
          ...(hasBulge ? [{ name: 'bulge', color: '#fbbf24', dash: '2 3', f: lineFor(parts.bulge) }] : []),
          { name: 'gas', color: '#34d399', dash: '2 3', f: lineFor(parts.gas) },
          ...(halo > 0 ? [{ name: 'dark halo', color: '#a78bfa', dash: '8 3 2 3', f: lineFor(parts.halo) }] : []),
        ]}
        xScale="linear"
        yScale="linear"
        xMin={0}
        xMax={galaxy.rMax}
        yMin={0}
        yMax={galaxy.vMax}
        xLabel="Distance from the centre (kpc)"
        yLabel="Rotation speed (km/s)"
        formatX={(x) => String(Math.round(x))}
        formatY={(y) => String(Math.round(y))}
        height={400}
        ariaLabel={`Rotation curve of ${galaxy.name}: the measured speeds and the model’s parts. ${caption}`}
      >
        {(sx, sy) => (
          <g aria-hidden="true">
            {galaxy.points.map((p) =>
              p.error > 0 && p.v - p.error >= 0 && p.v + p.error <= galaxy.vMax ? (
                <line key={`${p.set}-${p.r}`} x1={sx(p.r)} x2={sx(p.r)} y1={sy(p.v - p.error)} y2={sy(p.v + p.error)} stroke="var(--muted)" strokeWidth="1" />
              ) : null,
            )}
          </g>
        )}
      </ScatterChart>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
