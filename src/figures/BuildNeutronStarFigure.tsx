import { useId, useMemo, useState, type ReactNode } from 'react';
import { M_SUN } from '../core/constants';
import { causalityRadiusKm } from '../core/compact/tov';
import { EOS_FITS } from '../data/eos';
import { GW170817_RADIUS, HEAVY_NEUTRON_STARS, NICER_RADII } from '../data/neutronStars';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { formatGramsPerCc } from './holding';
import { curveOf, fitOf, formatKm1, maxMass, neutronStarAt, NS_LOG_RHO, NS_START, NUCLEAR_DENSITY } from './neutronStars';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Build a neutron star (Figure 26.2): the TOV equation stepped out from the
 * centre for ten published equations of state (Read et al.'s piecewise
 * polytropes). The chosen one's mass–radius curve is drawn bold over the
 * others', with the heaviest pulsars' masses as bands, NICER's radii as boxes,
 * GW170817's radius, and the lines no star can cross: causality and the
 * horizon. "Newton only" builds the same star with Newton's gravity, in which
 * pressure weighs nothing and there is no heaviest star.
 */

const R_MIN = 8;
const R_MAX = 16;
const M_MAX = 3.2;

export function BuildNeutronStarFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [eos, setEos] = useState<string>(NS_START.eos);
  const [logRho, setLogRho] = useState<number>(NS_START.logRho);
  const [newton, setNewton] = useState(false);
  const selectId = useId();
  const reset = () => {
    setEos(NS_START.eos);
    setLogRho(NS_START.logRho);
    setNewton(false);
  };
  const fit = fitOf(eos);
  const curve = curveOf(eos);
  const newtonCurve = newton ? curveOf(eos, true) : null;
  const star = useMemo(() => neutronStarAt(eos, logRho), [eos, logRho]);
  const newtonStar = useMemo(() => (newton ? neutronStarAt(eos, logRho, true) : null), [eos, logRho, newton]);
  const mass = star.mass / M_SUN;
  const radius = star.radius / 1000;
  const max = curve.maximum;
  const pastMax = logRho > max.logRhoC;
  const nuclei = star.rhoC / NUCLEAR_DENSITY;
  const others = EOS_FITS.filter((f) => f.id !== eos);
  const heaviest = HEAVY_NEUTRON_STARS[HEAVY_NEUTRON_STARS.length - 1];

  const caption =
    `${fit.name}, with ${formatGramsPerCc(star.rhoC)} at its centre (${nuclei.toFixed(1)} times a nucleus’s density): a neutron star of ${mass.toFixed(2)} M☉, ${formatKm1(radius)} in radius. ` +
    (pastMax
      ? `It is past the heaviest star this equation of state allows, ${max.mass.toFixed(2)} M☉: squeezed harder, it gets lighter, and a nudge would make it collapse into a black hole. `
      : `The heaviest star ${fit.name} allows weighs ${max.mass.toFixed(2)} M☉, ${max.mass >= heaviest.mass ? `enough for ${heaviest.name}’s ${heaviest.mass}` : `too light for ${heaviest.name}’s ${heaviest.mass}`}. `) +
    (max.soundC > 1 ? `Near its limit, sound in its centre would travel faster than light (${max.soundC.toFixed(2)} c), so the fit breaks causality there. ` : '') +
    (newtonStar ? `In Newton’s gravity the same centre holds up ${(newtonStar.mass / M_SUN).toFixed(2)} M☉ in ${formatKm1(newtonStar.radius / 1000)}, and squeezing harder only makes it heavier.` : '');

  // Curves as paths, with the unstable part (past the heaviest star) dashed.
  const curvePath = (points: readonly { radiusKm: number; mass: number }[], sx: (x: number) => number, sy: (y: number) => number) =>
    points.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.radiusKm).toFixed(1)} ${sy(p.mass).toFixed(1)}`).join(' ');

  return (
    <Figure
      number={number}
      title="Build a neutron star"
      description="The TOV equation, general relativity’s version of hydrostatic balance, stepped out from the centre for ten published equations of state. Each gives a curve of mass against radius that ends at a heaviest star, from 1.5 to 2.8 Suns. Pulsars of 2.0 to 2.35 Suns rule out the softest; NICER’s radii of 11 to 14 km and the merger GW170817 narrow the rest. In Newton’s gravity the same matter would hold up far heavier stars: in relativity pressure itself weighs, which is why there is a limit."
      height={980}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the chosen equation of state’s stars (dashed past the heaviest, where they are unstable)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'the nine other equations of state', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="1.5" /> },
        { label: 'Newton’s gravity, the same matter', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2.5" strokeDasharray="5 3" /> },
        { label: 'pulsars’ measured masses (1σ bands)', symbol: <rect x="-9" y="-4" width="18" height="8" fill="var(--series-2)" fillOpacity="0.3" /> },
        { label: 'NICER’s radii (68% boxes, each team’s analysis)', symbol: <rect x="-9" y="-5" width="18" height="10" fill="none" stroke="var(--series-3)" strokeWidth="2" /> },
        { label: 'GW170817’s radius for 1.4 M☉ (90%)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--right)" strokeWidth="3" /> },
        { label: 'no star here: smaller than 2.9GM/c² would need sound faster than light', symbol: <rect x="-9" y="-5" width="18" height="10" fill="var(--text-muted)" fillOpacity="0.25" /> },
      ]}
      simplified={
        <p>
          Each equation of state is Read, Lackey, Owen and Friedman’s (2009) fit to a published one: three polytropes above a shared crust (SLy’s),
          which reproduce the original’s heaviest star and radii to about 1%. The stars don’t spin; spinning at a few hundred turns a second adds a
          few per cent to the heaviest mass. NICER’s and GW170817’s numbers depend on their models and priors, which is why two teams’ boxes for the
          same pulsar differ. The equations of state with hyperons (GNH3, H4) are the soft ones here, but others with hyperons are stiffer. “Newton
          only” takes gravity from the rest mass alone, with no pressure in it.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <label htmlFor={selectId} className={figureStyles.inputLabel}>
          Equation of state
        </label>
        <select id={selectId} value={eos} onChange={(e) => setEos(e.target.value)}>
          {EOS_FITS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}: heaviest {maxMass(f.id).toFixed(2)} M☉
            </option>
          ))}
        </select>
        <button type="button" className={styles.toggle} aria-pressed={newton} onClick={() => setNewton((v) => !v)}>
          Newton only
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={() => setLogRho(Math.floor(max.logRhoC * 100) / 100)}>
          The heaviest star
        </button>
      </div>
      <p className={styles.hint}>{fit.about}.</p>
      <div className={styles.controls}>
        <Slider
          label="Density at the centre"
          value={10 ** logRho * 1000}
          min={10 ** NS_LOG_RHO[0] * 1000}
          max={10 ** NS_LOG_RHO[1] * 1000}
          log
          step={0.01}
          format={formatGramsPerCc}
          onChange={(v) => setLogRho(Math.round(Math.log10(v / 1000) * 100) / 100)}
        />
      </div>

      <div className={figureStyles.withSide}>
        <div>
          <p className={styles.panelTitle}>Mass and radius</p>
          <ScatterChart
            groups={[]}
            xScale="linear"
            yScale="linear"
            xMin={R_MIN}
            xMax={R_MAX}
            yMin={0}
            yMax={M_MAX}
            xLabel="Radius (km)"
            yLabel="Mass (M☉)"
            formatY={(y) => y.toFixed(1)}
            height={420}
            ariaLabel={`Neutron stars’ mass against radius for ten equations of state. ${fit.name}’s stars reach ${max.mass.toFixed(2)} M☉ at ${formatKm1(max.radiusKm)}; this one weighs ${mass.toFixed(2)} M☉ and is ${formatKm1(radius)} in radius. The heaviest pulsars measured weigh 2.01, 2.08 and 2.35 M☉.`}
          >
            {(sx, sy) => {
              // The forbidden corner: left of the causality line R = 2.9GM/c² (the horizon, 2GM/c², is further left still).
              const forbidden = [`M ${sx(R_MIN)} ${sy(0)}`];
              for (let m = 0; m <= M_MAX + 0.01; m += 0.05) forbidden.push(`L ${sx(Math.max(R_MIN, causalityRadiusKm(m)))} ${sy(m)}`);
              forbidden.push(`L ${sx(R_MIN)} ${sy(M_MAX)} Z`);
              return (
                <g>
                  <path d={forbidden.join(' ')} fill="var(--text-muted)" fillOpacity="0.18" />
                  <text x={sx(R_MIN) + 6} y={sy(M_MAX) + 16} fontSize="11" fill="var(--text)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">
                    causality: no star here
                  </text>
                  {HEAVY_NEUTRON_STARS.map((h, k) => (
                    <g key={h.id}>
                      <rect x={sx(R_MIN)} width={sx(R_MAX) - sx(R_MIN)} y={sy(h.mass + h.error)} height={sy(h.mass - h.error) - sy(h.mass + h.error)} fill="var(--series-2)" fillOpacity="0.16" />
                      <line x1={sx(R_MIN)} x2={sx(R_MAX)} y1={sy(h.mass)} y2={sy(h.mass)} stroke="var(--series-2)" strokeWidth="1" strokeDasharray="3 3" />
                      <text x={sx(R_MIN) + 6} y={sy(h.mass) + (k === 0 ? 12 : -4)} fontSize="11" fill="var(--text)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">
                        {h.name.replace('PSR ', '')} {h.mass}
                      </text>
                    </g>
                  ))}
                  {NICER_RADII.map((n) => (
                    <rect key={n.id} x={sx(n.radiusLow)} y={sy(n.massHigh)} width={sx(n.radiusHigh) - sx(n.radiusLow)} height={sy(n.massLow) - sy(n.massHigh)} fill="var(--series-3)" fillOpacity="0.08" stroke="var(--series-3)" strokeWidth="1.5" />
                  ))}
                  <line x1={sx(GW170817_RADIUS.radius - GW170817_RADIUS.error)} x2={sx(GW170817_RADIUS.radius + GW170817_RADIUS.error)} y1={sy(GW170817_RADIUS.mass)} y2={sy(GW170817_RADIUS.mass)} stroke="var(--right)" strokeWidth="3" />
                  {others.map((f) => (
                    <path key={f.id} d={curvePath(curveOf(f.id).points.filter((p) => !p.unstable), sx, sy)} fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeOpacity="0.7" />
                  ))}
                  {newtonCurve && <path d={curvePath(newtonCurve.points, sx, sy)} fill="none" stroke="var(--series-2)" strokeWidth="2.5" strokeDasharray="6 4" />}
                  <path d={curvePath(curve.points.filter((p) => !p.unstable), sx, sy)} fill="none" stroke="var(--accent)" strokeWidth="3" />
                  <path d={curvePath(curve.points.filter((p, i, all) => p.unstable || all[i + 1]?.unstable), sx, sy)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4" />
                  <circle cx={sx(max.radiusKm)} cy={sy(max.mass)} r={4} fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />
                  {newtonStar && newtonStar.radius / 1000 <= R_MAX && newtonStar.mass / M_SUN <= M_MAX && (
                    <circle cx={sx(newtonStar.radius / 1000)} cy={sy(newtonStar.mass / M_SUN)} r={5.5} fill="var(--series-2)" stroke="var(--bg)" strokeWidth="1.5" />
                  )}
                  <circle cx={sx(radius)} cy={sy(mass)} r={6.5} fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
                </g>
              );
            }}
          </ScatterChart>
        </div>
        <div className={figureStyles.side}>
          <dl className={styles.facts}>
            <div>
              <dt>Mass</dt>
              <dd>{mass.toFixed(3)} M☉</dd>
            </div>
            <div>
              <dt>Radius</dt>
              <dd>{formatKm1(radius)}</dd>
            </div>
            <div>
              <dt>Centre</dt>
              <dd>
                {formatGramsPerCc(star.rhoC)}, {nuclei.toFixed(1)} × a nucleus
              </dd>
            </div>
            <div>
              <dt>Sound at the centre</dt>
              <dd>{star.soundC.toFixed(2)} × light’s speed</dd>
            </div>
            <div>
              <dt>How close to a black hole</dt>
              <dd>2GM/Rc² = {star.compactness.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Heaviest {fit.name} star</dt>
              <dd>
                {max.mass.toFixed(2)} M☉ at {formatKm1(max.radiusKm)}
              </dd>
            </div>
            {newtonStar && (
              <div>
                <dt>With Newton’s gravity</dt>
                <dd>
                  {(newtonStar.mass / M_SUN).toFixed(2)} M☉ at {formatKm1(newtonStar.radius / 1000)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
