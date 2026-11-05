import { useMemo, useState, type ReactNode } from 'react';
import { gasShareOf, standardTrack } from '../core/supernova/pairs';
import { CoreMap } from '../viz/coremap/CoreMap';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { usePairCore, usePairMap } from '../viz/useStellar';
import { MODEL_THRESHOLD, OUTCOME_COLOURS, OUTCOME_EDGES, OUTCOME_NAMES, PAIR_LOG_RHO, PAIR_LOG_T, PAIR_MASSES, PAIR_START, pairOutcome } from './explosions';
import { formatHotKelvin } from './furnace';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The pair-instability wedge (Figure 25.4): the core's map for oxygen, with
 * the region where light making electron–positron pairs softens the gas below
 * Γ₁ = 4/3 (computed in the stellar worker from the exact equation of state
 * of ions, pairs and light), the paths helium cores of 10 to 200 M☉ take
 * across it by Eddington's standard model, each core's Γ₁ at its centre and
 * on average as it heats, and what published models say each one does.
 */

const OXYGEN_MIX = { X: 0, Z: 1 };
const NO_MASSES: readonly number[] = [];
const MASS_RANGE = [10, 200] as const;

export function PairWedgeFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mass, setMass] = useState<number>(PAIR_START.mass);
  const reset = () => setMass(PAIR_START.mass);
  const map = usePairMap({ logT: PAIR_LOG_T, logRho: PAIR_LOG_RHO, masses: NO_MASSES });
  const history = usePairCore(mass, PAIR_LOG_T);
  const fresh = history?.massSolar === mass;
  const outcome = pairOutcome(mass);
  const tracks = useMemo(
    () => PAIR_MASSES.map((m) => ({ name: String(m), color: 'var(--text-muted)', dashed: true, points: standardTrack(m, PAIR_LOG_T, 30) })),
    [],
  );
  const chosen = useMemo(() => standardTrack(mass, PAIR_LOG_T, 30), [mass]);
  const beta = gasShareOf(mass);
  const wedgePath = (sx: (x: number) => number, sy: (y: number) => number) => {
    if (!map) return '';
    const cols = map.wedge.filter((c) => c.top !== null);
    if (cols.length < 2) return '';
    const top = cols.map((c, k) => `${k ? 'L' : 'M'}${sx(c.logT).toFixed(1)} ${sy(c.top!).toFixed(1)}`).join(' ');
    return `${top} L${sx(cols[cols.length - 1].logT).toFixed(1)} ${sy(PAIR_LOG_RHO[0]).toFixed(1)} L${sx(cols[0].logT).toFixed(1)} ${sy(PAIR_LOG_RHO[0]).toFixed(1)} Z`;
  };
  const wedgeT = map ? map.wedge.filter((c) => c.top !== null) : [];
  const least = fresh ? history!.least : undefined;
  const unstable = fresh ? history!.unstable : undefined;
  // Where the centre is inside the wedge: the temperatures where Γ₁ at the centre is below 4/3.
  const inside = fresh ? history!.points.filter((p) => p.centre < 4 / 3) : [];

  const caption = !fresh
    ? `Working out the path of a helium core of ${Math.round(mass)} M☉…`
    : `A core of ${Math.round(mass)} M☉, ${Math.round((1 - beta) * 100)}% held up by light, heats along its line as it contracts. ${
        inside.length
          ? `Its centre passes through the wedge from ${formatHotKelvin(inside[0].T)} to ${formatHotKelvin(inside[inside.length - 1].T)}, and its average Γ₁ falls to ${least!.average.toFixed(3)} at ${formatHotKelvin(least!.T)}, ${unstable ? 'below 4/3: it can’t hold itself up' : 'still above 4/3: it holds'}.`
          : `Its centre stays outside the wedge: its average Γ₁ never falls below ${least!.average.toFixed(3)}.`
      } Published models: ${OUTCOME_NAMES[outcome]}.`;

  // The outcome strip, on a log scale of mass.
  const stripX = (m: number) => 10 + ((Math.log10(m) - Math.log10(MASS_RANGE[0])) / (Math.log10(MASS_RANGE[1]) - Math.log10(MASS_RANGE[0]))) * 540;
  const bands = [
    { from: MASS_RANGE[0], to: OUTCOME_EDGES.pulses, kind: 'collapse' as const, label: 'collapse' },
    { from: OUTCOME_EDGES.pulses, to: OUTCOME_EDGES.destroyed, kind: 'pulses' as const, label: 'pulses' },
    { from: OUTCOME_EDGES.destroyed, to: OUTCOME_EDGES.whole, kind: 'destroyed' as const, label: 'destroyed' },
    { from: OUTCOME_EDGES.whole, to: MASS_RANGE[1], kind: 'whole' as const, label: 'collapses whole' },
  ];

  return (
    <Figure
      number={number}
      title="The pair-instability wedge"
      description="Above about a billion kelvin, in gas thin enough, light makes pairs of electrons and positrons. Squeezing the gas then makes more pairs instead of raising its pressure, so it gives way: its adiabatic exponent falls below 4/3, inside a wedge on the core’s map. The heaviest helium cores, held up mostly by light, heat along lines that run through the wedge; when enough of a core is inside it, the core collapses, burns its oxygen at once and blows itself apart. Published models: cores of 35–65 Suns pulse, 65–135 are destroyed, heavier ones collapse whole."
      height={1020}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'where Γ₁ < 4/3: pairs soften the gas', symbol: <rect x="-9" y="-6" width="18" height="12" fill="var(--accent)" fillOpacity="0.3" stroke="var(--accent)" /> },
        { label: 'this core’s centre as it heats', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: `cores of ${PAIR_MASSES.join(', ')} M☉, heavier ones lower`, symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="6 4" /> },
        { label: 'Γ₁ at the centre', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="4 3" /> },
        { label: 'Γ₁ averaged over the core, by pressure', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
      ]}
      simplified={
        <p>
          The wedge is exact for fully ionised oxygen with electrons, positrons and light in equilibrium (Fermi–Dirac integrals done numerically).
          The cores are Eddington’s standard model, a polytrope of index 3 with a fixed share of light, which leaves out how the real core’s
          structure changes as it contracts; its average Γ₁ first dips below 4/3 for a core of about {MODEL_THRESHOLD} Suns, against about 35 in
          detailed models, and general relativity, which raises the bar a little, is left out. The outcomes are Heger and Woosley’s (2002) and
          Woosley’s (2017) models for stars without rotation; their edges are uncertain by several solar masses, and depend on the carbon-to-oxygen
          rate (Chapter 22).
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Helium core" value={mass} min={MASS_RANGE[0]} max={MASS_RANGE[1]} log step={0.005} format={(m) => `${Math.round(m)} M☉`} onChange={(m) => setMass(Math.round(m))} />
      </div>

      <svg viewBox="0 0 560 66" width="100%" role="img" aria-label={`What published models say helium cores do, from 10 to 200 Suns: collapse below 35, pulses to 65, destroyed to 135, collapse whole above. This core, ${Math.round(mass)} M☉: ${OUTCOME_NAMES[outcome]}.`}>
        {bands.map((b) => (
          <g key={b.kind}>
            <rect x={stripX(b.from)} y={6} width={stripX(b.to) - stripX(b.from)} height={20} fill={OUTCOME_COLOURS[b.kind]} fillOpacity={b.kind === outcome ? 0.55 : 0.22} stroke="var(--border)" />
            <text x={(stripX(b.from) + stripX(b.to)) / 2} y={20} fontSize="11" textAnchor="middle" fill="var(--text)">
              {b.label}
            </text>
          </g>
        ))}
        <line x1={stripX(mass)} x2={stripX(mass)} y1={2} y2={30} stroke="var(--text)" strokeWidth="2.5" />
        <line x1={stripX(MODEL_THRESHOLD)} x2={stripX(MODEL_THRESHOLD)} y1={26} y2={34} stroke="var(--text-muted)" strokeWidth="2" />
        {[10, 20, 50, 100, 200].map((m, k, all) => (
          <text key={m} x={stripX(m)} y={46} fontSize="10.5" textAnchor={k === 0 ? 'start' : k === all.length - 1 ? 'end' : 'middle'} fill="var(--text-muted)">
            {m} M☉
          </text>
        ))}
        <text x={stripX(MODEL_THRESHOLD) + 4} y={60} fontSize="10.5" fill="var(--text-muted)">
          ▲ this figure’s cores first dip below 4/3
        </text>
      </svg>

      <div className={figureStyles.withSide}>
        <div aria-busy={!map}>
          <p className={styles.panelTitle}>The core’s map for oxygen</p>
          <CoreMap
            mix={OXYGEN_MIX}
            logT={PAIR_LOG_T}
            logRho={PAIR_LOG_RHO}
            tracks={[...tracks, { name: 'chosen', color: 'var(--accent)', points: chosen }]}
            marker={least ? { T: least.T, rho: chosen.reduce((b, p) => (Math.abs(Math.log(p.T / least.T)) < Math.abs(Math.log(b.T / least.T)) ? p : b), chosen[0]).rho, label: `${Math.round(mass)} M☉: least Γ₁` } : undefined}
            ariaLabel={`The core’s map for oxygen, with the wedge where Γ₁ falls below 4/3${wedgeT.length ? `, from ${formatHotKelvin(10 ** wedgeT[0].logT)} to ${formatHotKelvin(10 ** wedgeT[wedgeT.length - 1].logT)} and below about 10⁶ g/cm³` : ''}, and helium cores’ paths: heavier cores run lower, through the wedge.`}
            height={360}
          >
            {(sx, sy) => (
              <g>
                <path d={wedgePath(sx, sy)} fill="var(--accent)" fillOpacity={0.25} stroke="var(--accent)" strokeWidth="1.5" />
              </g>
            )}
          </CoreMap>
        </div>
        <div className={figureStyles.side}>
          <dl className={styles.facts}>
            <div>
              <dt>Held up by light</dt>
              <dd>{Math.round((1 - beta) * 100)}%</dd>
            </div>
            <div>
              <dt>Least average Γ₁</dt>
              <dd>{least ? `${least.average.toFixed(3)} at ${formatHotKelvin(least.T)}` : '…'}</dd>
            </div>
            <div>
              <dt>Holds itself up?</dt>
              <dd>{unstable === undefined ? '…' : unstable ? 'no: below 4/3' : 'yes'}</dd>
            </div>
            <div>
              <dt>Published models</dt>
              <dd>{OUTCOME_NAMES[outcome]}</dd>
            </div>
          </dl>
        </div>
      </div>

      <p className={styles.panelTitle} style={{ marginTop: 12 }}>
        Γ₁ as the {Math.round(mass)} M☉ core heats
      </p>
      <ProfilePlot
        series={
          fresh
            ? [
                { name: 'at the centre', color: 'var(--series-2)', dashed: true, points: history!.points.map((p) => ({ x: Math.log10(p.T), y: p.centre })) },
                { name: 'averaged over the core', color: 'var(--accent)', points: history!.points.map((p) => ({ x: Math.log10(p.T), y: p.average })) },
              ]
            : []
        }
        hideLegend
        xMin={PAIR_LOG_T[0]}
        xMax={PAIR_LOG_T[1]}
        formatX={(x) => ({ 8: '10⁸', 9: '10⁹', 10: '10¹⁰' })[x] ?? ''}
        xLabel="Central temperature (K, log scale)"
        yLabel="Γ₁"
        yMin={1.24}
        yMax={1.42}
        formatY={(y) => y.toFixed(2)}
        ariaLabel={fresh ? `Γ₁ at the centre and averaged over the ${Math.round(mass)} solar-mass core against its central temperature: both dip as pairs appear and rise again; the average ${unstable ? 'falls below' : 'stays above'} 4/3.` : 'Working out the core’s path.'}
        height={220}
      >
        {(sx, sy) => (
          <g>
            <line x1={sx(PAIR_LOG_T[0])} x2={sx(PAIR_LOG_T[1])} y1={sy(4 / 3)} y2={sy(4 / 3)} stroke="var(--text)" strokeDasharray="5 3" />
            <text x={sx(PAIR_LOG_T[0]) + 4} y={sy(4 / 3) - 5} fontSize="11" fill="var(--text)">
              4/3: below it, the core can’t hold itself up
            </text>
          </g>
        )}
      </ProfilePlot>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
