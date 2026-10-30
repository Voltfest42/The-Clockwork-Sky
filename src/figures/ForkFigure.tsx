import { useMemo, useState, type ReactNode } from 'react';
import { HYDROGEN_BURNING_LIMIT } from '../core/stellar/brownDwarfs';
import { zoneOf } from '../core/stellar/calibration';
import { fateFromTrack, phasesOf, TYPE_NAMES, type Fate, type FateKind } from '../core/stellar/lives';
import { Caption, Figure } from '../viz/Figure';
import { LifeStrip } from '../viz/phases/LifeStrip';
import type { StripScale } from '../viz/phases/strip';
import { ScatterChart } from '../viz/ScatterChart';
import { useFates, useLife } from '../viz/useStellar';
import { Slider } from './Slider';
import { formatMyr, shortMyr } from './starLives';
import { FATE_NAMES, FATE_STYLE, fateChanges, FORK_METALS, FORK_WINDS, PAIR_INSTABILITY_STARS, UNCERTAIN_ZONES } from './starDeaths';
import styles from './sky/sky.module.css';

/**
 * The fork in the road (Figure 18.4): what every initial mass from 0.01 to
 * 300 Suns leaves behind, and how heavy the remnant is, from the SSE engine
 * with brown dwarfs and pair instability added; metallicity and wind strength
 * move the boundaries. The chosen star's whole life is drawn as a strip.
 */

const START_MASS = 1;
const START_Z = 0.02;
const START_WIND = 1;
const KINDS: FateKind[] = ['brown-dwarf', 'helium-wd', 'co-wd', 'one-wd', 'neutron-star', 'black-hole', 'nothing'];
/** Where "nothing left" is drawn, since it has no mass to plot. */
const NOTHING_Y = 0.012;

const snap = (m: number) => Number(m.toPrecision(3));
const msun = (m: number) => `${m < 1 ? Number(m.toPrecision(2)) : m < 10 ? Number(m.toFixed(2)) : Math.round(m)} M☉`;

export function ForkFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [mass, setMass] = useState(START_MASS);
  const [z, setZ] = useState(START_Z);
  const [wind, setWind] = useState(START_WIND);
  const [scale, setScale] = useState<StripScale>('before-end');
  const reset = () => {
    setMass(START_MASS);
    setZ(START_Z);
    setWind(START_WIND);
    setScale('before-end');
  };
  const m = snap(mass);
  const fates = useFates(z, wind);
  const brown = m < HYDROGEN_BURNING_LIMIT;
  const track = useLife(brown ? 1 : m, z, wind);
  const ready = brown || (track !== null && track.m === m);
  const fate: Fate | null = brown ? { mass: m, kind: 'brown-dwarf', remnant: m, heCore: 0, pair: 'core-collapse', death: Infinity } : ready ? fateFromTrack(track!) : null;
  const phases = useMemo(() => (track && !brown ? phasesOf(track) : []), [track, brown]);
  const changes = fates ? fateChanges(fates) : [];
  const zone = zoneOf(m, z);

  const groups = KINDS.map((k) => ({
    name: FATE_NAMES[k],
    color: FATE_STYLE[k].color,
    shape: FATE_STYLE[k].shape,
    points: (fates ?? []).filter((f) => f.kind === k).map((f) => ({ x: f.mass, y: f.kind === 'nothing' ? NOTHING_Y : Math.max(NOTHING_Y, f.remnant), label: `${msun(f.mass)} → ${FATE_NAMES[f.kind]}` })),
  })).filter((g) => g.points.length);

  return (
    <Figure
      number={number}
      title="The fork in the road"
      description="What a star leaves behind, against the mass it was born with, from the stellar-evolution engine: below 0.075 Suns a brown dwarf; then white dwarfs of helium, carbon and oxygen, or oxygen and neon; above about 8 Suns a neutron star; above about 20, a black hole. The heaviest metal-poor stars may leave nothing at all. Make-up and winds move the boundaries, and the uncertain zones are shaded. The chosen star’s whole life is shown as a strip."
      height={980}
      tryThis={tryThis}
      onReset={reset}
      starForge={`mass=${m}&z=${z}`}
      legend={[
        { label: 'uncertain: models disagree', symbol: <rect x="-9" y="-7" width="18" height="14" fill="var(--text-muted)" fillOpacity="0.18" /> },
        { label: 'pair-instability supernovae, by other models (metal-poor only)', symbol: <rect x="-9" y="-7" width="18" height="14" fill="#d62828" fillOpacity="0.18" /> },
        { label: 'the chosen star', symbol: <circle r="7" fill="none" stroke="var(--accent)" strokeWidth="2.5" /> },
      ]}
      simplified={
        <p>
          The engine is SSE (Hurley, Pols &amp; Tout 2000) with its own winds and Belczynski et al.’s (2002) neutron-star and black-hole masses, and
          the stars are single and don’t spin. Below 0.075 Suns brown dwarfs keep their mass. Pair instability is applied to the final helium core
          (Heger &amp; Woosley 2002; Woosley 2017); SSE’s formulas stop growing above 100 Suns, and their strong winds strip even metal-poor giants
          before their cores get heavy enough to be blown apart, so the band where other models leave nothing is drawn from those models.
          Light stars’ fates are what they will be: no star below about 0.8 Suns has yet had time to die.
        </p>
      }
    >
      <div className={styles.controls}>
        <Slider label="Mass at birth" value={mass} min={0.01} max={300} log format={(x) => msun(snap(x))} onChange={setMass} />
        <div className={styles.toggles} role="group" aria-label="Make-up">
          <span className={styles.togglesLabel}>Metals</span>
          {FORK_METALS.map((x) => (
            <button key={x.z} type="button" className={styles.toggle} aria-pressed={z === x.z} onClick={() => setZ(x.z)}>
              {x.name}
            </button>
          ))}
        </div>
        <div className={styles.toggles} role="group" aria-label="Winds">
          <span className={styles.togglesLabel}>Winds</span>
          {FORK_WINDS.map((x) => (
            <button key={x.wind} type="button" className={styles.toggle} aria-pressed={wind === x.wind} onClick={() => setWind(x.wind)}>
              {x.name}
            </button>
          ))}
        </div>
      </div>
      <ScatterChart
        groups={groups}
        xScale="log"
        yScale="log"
        xMin={0.01}
        xMax={300}
        yMin={0.008}
        yMax={100}
        xLabel="Mass at birth (Suns)"
        yLabel="Mass left behind (Suns)"
        highlight={fate ? { x: m, y: fate.kind === 'nothing' ? NOTHING_Y : Math.max(NOTHING_Y, fate.remnant), label: FATE_NAMES[fate.kind], color: 'var(--accent)' } : undefined}
        onPick={setMass}
        height={400}
        ariaLabel={`What stars leave behind against their mass at birth. ${changes.map((c) => `${FATE_NAMES[c.to]} from about ${msun(c.mass)}`).join('; ')}.`}
      >
        {(sx, sy) => (
          <g pointerEvents="none">
            {z === 0.02 &&
              UNCERTAIN_ZONES.map((u) => (
                <g key={u.name}>
                  <rect x={sx(u.from)} y={sy(100)} width={sx(Math.min(u.to, 300)) - sx(u.from)} height={sy(0.008) - sy(100)} fill="var(--text-muted)" fillOpacity={0.14} />
                </g>
              ))}
            {z !== 0.02 && <rect x={sx(100)} y={sy(100)} width={sx(300) - sx(100)} height={sy(0.008) - sy(100)} fill="var(--text-muted)" fillOpacity={0.14} />}
            {z <= 0.001 && <rect x={sx(PAIR_INSTABILITY_STARS.from)} y={sy(100)} width={sx(PAIR_INSTABILITY_STARS.to) - sx(PAIR_INSTABILITY_STARS.from)} height={sy(0.008) - sy(100)} fill="#d62828" fillOpacity={0.16} />}
            <rect x={sx(0.01)} y={sy(100)} width={sx(HYDROGEN_BURNING_LIMIT) - sx(0.01)} height={sy(0.008) - sy(100)} fill="#b5835a" fillOpacity={0.1} />
            <text x={sx(0.012)} y={sy(60)} fontSize="11" fill="var(--text-muted)">
              brown dwarfs
            </text>
            <text x={sx(120)} y={sy(NOTHING_Y) - 8} fontSize="10.5" fill="var(--text-muted)" textAnchor="end">
              nothing left ↓
            </text>
          </g>
        )}
      </ScatterChart>
      <div className={styles.card} aria-live="polite">
        {fate ? (
          <>
            <p style={{ margin: 0 }}>
              <b>
                A star of {msun(m)} ends as {fate.kind === 'nothing' ? 'nothing at all' : `a ${FATE_NAMES[fate.kind].toLowerCase()}`}
                {fate.kind !== 'nothing' && fate.kind !== 'brown-dwarf' ? ` of ${msun(fate.remnant)}` : ''}.
              </b>{' '}
              {fate.kind === 'brown-dwarf'
                ? 'It never fuses hydrogen for long: it cools for ever.'
                : `It becomes a remnant after ${formatMyr(fate.death)}${fate.death > 13000 ? ', longer than the Galaxy has existed' : ''}.`}
            </p>
            {fate.pair !== 'core-collapse' && (
              <p style={{ margin: '6px 0 0' }}>
                Its helium core ends at {msun(fate.heCore)}: {fate.pair === 'pulsational' ? 'heavy enough for pair instability to make it pulse and shed mass, capping the black hole near 45 Suns.' : fate.pair === 'pair-instability' ? 'pair instability blows the whole star apart.' : 'so heavy that it collapses whole.'}
              </p>
            )}
            <p style={{ margin: '6px 0 0' }}>
              {zone === 'fitted'
                ? 'The engine’s formulas are fitted to detailed models here.'
                : zone === 'extrapolated'
                  ? 'Here the engine’s formulas are stretched beyond the models they were fitted to.'
                  : zone === 'other-model'
                    ? brown
                      ? 'Brown dwarfs follow their own models, not the engine’s.'
                      : 'Above 100 Suns the engine’s formulas are held at their edge; treat this with care.'
                    : 'Nothing here is reliable this far out.'}
            </p>
          </>
        ) : (
          <p style={{ margin: 0 }}>Working out its life…</p>
        )}
      </div>
      {!brown && phases.length > 0 && (
        <>
          <div className={styles.toggles} role="group" aria-label="Time runs" style={{ marginTop: 10 }}>
            <span className={styles.togglesLabel}>Its life, with time running</span>
            <button type="button" className={styles.toggle} aria-pressed={scale === 'linear'} onClick={() => setScale('linear')}>
              Evenly
            </button>
            <button type="button" className={styles.toggle} aria-pressed={scale === 'before-end'} onClick={() => setScale('before-end')}>
              As time before the end
            </button>
          </div>
          <LifeStrip
            phases={phases}
            scale={scale}
            formatTime={shortMyr}
            ariaLabel={`The life of a star of ${msun(m)}: ${phases.map((p) => `${TYPE_NAMES[p.kw]}${p.kw < 10 ? ` for ${formatMyr(p.end - p.start)}` : ''}`).join('; ')}.`}
          />
        </>
      )}
      <Caption>
        {fates
          ? `With ${FORK_METALS.find((x) => x.z === z)!.phrase} and ${FORK_WINDS.find((x) => x.wind === wind)!.phrase}: ${changes
              .filter((c) => c.to !== 'brown-dwarf' && c.from !== 'brown-dwarf')
              .map((c) => `${FATE_NAMES[c.to].toLowerCase()}s from about ${msun(c.mass)}`)
              .join(', ')}.`
          : 'Working out every star’s fate…'}
      </Caption>
    </Figure>
  );
}
