import { useMemo, useState, type ReactNode } from 'react';
import { C, G } from '../core/constants';
import { surfaceGravityRatio } from '../core/compact/pulsar';
import { formatScientific } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { Cutaway } from '../viz/cutaway/Cutaway';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { formatGramsPerCc } from './holding';
import { formatKm1, insideStar, NEUTRON_DRIP, NUCLEAR_DENSITY } from './neutronStars';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Inside a neutron star (Figure 26.1): a star of 1.2, 1.4 or 2.0 Suns built
 * by the TOV solver with the SLy equation of state, cut open to scale with its
 * layers named, from the inner core to the outer crust, and the crust
 * magnified: density against depth through its kilometre.
 */

const MASSES = [1.2, 1.4, 2.0] as const;
const START = { mass: 1.4, layer: 'outer-crust' } as const;

export function InsideNeutronStarFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mass, setMass] = useState<number>(START.mass);
  const [selected, setSelected] = useState<string>(START.layer);
  const reset = () => {
    setMass(START.mass);
    setSelected(START.layer);
  };
  const inside = useMemo(() => insideStar('SLy', mass), [mass]);
  const { star, layers } = inside;
  const R = star.radius;
  const layer = layers.find((l) => l.id === selected) ?? layers[layers.length - 1];
  const crustDepth = Math.max(inside.crust * 1.25, 1200);
  const crustProfile = star.profile
    .filter((p) => R - p.r <= crustDepth && p.rho > 0)
    .map((p) => ({ x: R - p.r, y: p.rho / 1000 }))
    .reverse();
  // The crust's two layers, then the pasta and the core together (the pasta is too thin to label alone).
  const outer = layers.find((l) => l.id === 'outer-crust')!;
  const innerCrust = layers.find((l) => l.id === 'inner-crust')!;
  const zones = [
    { from: 0, to: R - outer.from, label: 'Outer crust' },
    { from: R - innerCrust.to, to: R - innerCrust.from, label: 'Inner crust' },
    { from: R - innerCrust.from, to: crustDepth, label: 'Pasta, then the core' },
  ];
  const share = (x: number) => (x >= 0.01 ? `${(x * 100).toFixed(0)}%` : x >= 1e-4 ? `${Number((x * 100).toPrecision(2))}%` : `${Number((x * 1e6).toPrecision(2))} parts in a million`);
  const teaspoon = (star.rhoC * 5e-6) / 1000; // tonnes
  const escape = Math.sqrt((2 * G * star.mass) / R) / C;
  const gravity = surfaceGravityRatio(star.mass, R);
  const thick = (l: { from: number; to: number }) => l.to - l.from;
  const depthText = (m: number) => (m >= 1000 ? formatKm1(m / 1000) : `${Math.round(m / 10) * 10} m`);

  const caption = `A neutron star of ${inside.mass.toFixed(1)} M☉ (the SLy equation of state) is ${formatKm1(R / 1000)} in radius. Its crust is ${depthText(inside.crust)} thick, ${Math.round((inside.crust / R) * 100)}% of the radius, and holds ${(
    100 *
    layers.filter((l) => l.id === 'outer-crust' || l.id === 'inner-crust' || l.id === 'pasta').reduce((s, l) => s + l.massShare, 0)
  ).toFixed(1)}% of its mass; neutrons drip out of the nuclei ${depthText(inside.outerCrust)} down. ${layer.name}: ${depthText(R - layer.to)} to ${depthText(R - layer.from)} below the surface, ${
    layer.rhoOuter > 0 ? `${formatGramsPerCc(layer.rhoOuter)} to ` : 'from almost nothing to '
  }${formatGramsPerCc(layer.rhoInner)}, ${share(layer.massShare)} of the mass.`;

  return (
    <Figure
      number={number}
      title="Inside a neutron star"
      description="A neutron star of 1.4 Suns, built by the TOV solver, cut open to scale: a core of neutrons with a few per cent of protons and electrons, denser than a nucleus at its centre, under a solid crust about a kilometre thick. The crust’s nuclei grow richer in neutrons with depth until neutrons drip out of them, and at its base they merge into “pasta” before dissolving into the core."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={layers.map((l) => ({ label: l.name.toLowerCase(), symbol: <rect x="-8" y="-6" width="16" height="12" rx="2" fill={l.colour} /> }))}
      simplified={
        <p>
          The star is the SLy equation of state’s, as fitted by Read et al. (2009), with Douchin and Haensel’s crust; the layers’ edges are set by
          density: the neutron drip at 4.3 × 10¹¹ g/cm³, the pasta from about 10¹⁴ g/cm³ (models put it between 0.6 and 1.2 × 10¹⁴), the core where the
          fit’s crust meets its core, and the inner core at twice a nucleus’s density. The atmosphere, centimetres thick, and the ocean of liquid
          metal above the solid crust are too thin to draw. Which exotic particles, if any, fill the inner core is not known.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Mass">
          {MASSES.map((m) => (
            <button key={m} type="button" aria-pressed={mass === m} onClick={() => setMass(m)}>
              {m.toFixed(1)} M☉
            </button>
          ))}
        </span>
      </div>
      <div className={figureStyles.withSide}>
        <div>
          <p className={styles.panelTitle}>Cut open, to scale (the pasta widened to be seen)</p>
          <Cutaway
            layers={layers.map((l) => ({
              id: l.id,
              name: l.name,
              // The pasta, a few tens of metres thick, is widened to a band; the outer crust stops just short of the edge so that it is drawn as a layer, not a rim.
              from: l.id === 'pasta' ? Math.min(l.from / R, l.to / R - 0.012) : l.from / R,
              to: l.id === 'outer-crust' ? 0.9999 : thick(l) > 0 ? l.to / R : l.from / R,
              colour: l.colour,
            }))}
            depth={layer.to / R}
            selected={layer.id}
            onSelect={setSelected}
            atmosphere={0.02}
            surface="#8fa6c9"
            footnote={null}
            ariaLabel={`A neutron star of ${inside.mass.toFixed(1)} solar masses cut open: ${layers.map((l) => `${l.name.toLowerCase()} to ${formatKm1(l.to / 1000)} from the centre`).join(', ')}. Pick a layer.`}
          />
        </div>
        <div className={figureStyles.side}>
          <div className={styles.card} style={{ marginTop: 0 }}>
            <p className={styles.cardTitle}>{layer.name}</p>
            <p>{layer.what}</p>
            <dl className={styles.facts}>
              <div>
                <dt>Depth</dt>
                <dd>
                  {depthText(R - layer.to)} to {depthText(R - layer.from)}
                </dd>
              </div>
              <div>
                <dt>Density</dt>
                <dd>
                  {layer.rhoOuter > 0 ? formatGramsPerCc(layer.rhoOuter) : 'from almost nothing'} to {formatGramsPerCc(layer.rhoInner)}
                </dd>
              </div>
              <div>
                <dt>Share of the mass</dt>
                <dd>{share(layer.massShare)}</dd>
              </div>
            </dl>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>The centre</dt>
              <dd>
                {formatGramsPerCc(star.rhoC)}, {(star.rhoC / NUCLEAR_DENSITY).toFixed(1)} times a nucleus’s
              </dd>
            </div>
            <div>
              <dt>A teaspoon of the centre</dt>
              <dd>{formatScientific(teaspoon, 2)} tonnes</dd>
            </div>
            <div>
              <dt>Gravity at the surface</dt>
              <dd>{formatScientific(gravity, 2)} times Earth’s</dd>
            </div>
            <div>
              <dt>Escape speed</dt>
              <dd>{Math.round(escape * 100)}% of light’s</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className={styles.panelTitle} style={{ marginTop: 12 }}>
        The crust, magnified: density against depth below the surface
      </p>
      <ProfilePlot
        series={[{ name: 'density', color: 'var(--accent)', points: crustProfile }]}
        hideLegend
        xMin={0}
        xMax={crustDepth}
        formatX={(x) => `${Math.round(x).toLocaleString('en-GB')}`}
        xLabel="Depth below the surface (m)"
        yLabel="Density (g/cm³)"
        yScale="log"
        yMin={1e4}
        yMax={1e15}
        zones={zones}
        ariaLabel={`Density through the crust, rising from 10⁴ g/cm³ near the surface to ${formatGramsPerCc(NEUTRON_DRIP)} at the neutron drip, ${depthText(inside.outerCrust)} down, and to ${formatGramsPerCc(NUCLEAR_DENSITY / 2)} at the crust’s base, ${depthText(inside.crust)} down.`}
        height={230}
      >
        {(sx, sy) => (
          <g>
            <line x1={sx(0)} x2={sx(crustDepth)} y1={sy(NUCLEAR_DENSITY / 1000)} y2={sy(NUCLEAR_DENSITY / 1000)} stroke="var(--text-muted)" strokeDasharray="3 3" />
            <text x={sx(crustDepth * 0.62)} y={sy(NUCLEAR_DENSITY / 1000) + 14} fontSize="11" fill="var(--text)" textAnchor="end">
              a nucleus’s density
            </text>
            <line x1={sx(inside.outerCrust)} x2={sx(inside.outerCrust)} y1={sy(1e4)} y2={sy(1e15)} stroke="var(--series-2)" strokeDasharray="4 3" />
            <text x={sx(inside.outerCrust) + 4} y={sy(3e5)} fontSize="11" fill="var(--text)">
              neutron drip
            </text>
          </g>
        )}
      </ProfilePlot>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
