import { useEffect, useMemo, useRef, useState } from 'react';
import { HYDROGEN_BURNING_LIMIT } from '../../core/stellar/brownDwarfs';
import { brownDwarfLife, clampStar, FORGE_LIMITS, FORGE_TYPE_NAMES, stateOf, summarise, type ForgeLife, type ForgeStar } from '../../core/stellar/forge';
import { FATE_NAMES, stateAt } from '../../core/stellar/lives';
import type { SseStep } from '../../core/stellar/sse/evolve';
import { loadGaia } from '../../figures/hrStars';
import { Slider } from '../../figures/Slider';
import { PMS_TRACKS } from '../../figures/starBirth';
import { formatMyr, shortMyr, SUN_AGE } from '../../figures/starLives';
import { Legend } from '../../viz/Figure';
import type { DensityGrid } from '../../viz/hr/HRDiagram';
import { LifeStrip } from '../../viz/phases/LifeStrip';
import { PHASE_SHORT, stripPosition, stripTime, type StripScale } from '../../viz/phases/strip';
import { ScatterChart, type ScatterLine } from '../../viz/ScatterChart';
import { useLifeOf } from '../../viz/useStellar';
import figureStyles from '../../figures/figures.module.css';
import skyStyles from '../../figures/sky/sky.module.css';
import { ClusterMode } from './ClusterMode';
import { formatSuns, formatWind, formatZ, msun, starLabel, STAR_STYLES } from './format';
import { fromQuery, presetState, toQuery, type ForgeState } from './link';
import { findPreset, PRESETS } from './presets';
import { describeNow, forgeRange, withArticle, ZONE_STYLE } from './model';
import { CalibrationMap, DrawnTrue, FateCard, ForgeHR, Inside, LifeTable, type Shown } from './views';
import styles from './StarForge.module.css';

/**
 * The Star Forge: set a star's mass, metals and winds, and follow its whole
 * life, worked out at once by the SSE engine (in the stellar worker) and
 * scrubbed through with a time slider. Up to four stars side by side, or an
 * isochrone over a real cluster. The state can be shared as a link.
 */

type Quantity = 'L' | 'R' | 'T' | 'M';
const QUANTITIES: { id: Quantity; name: string; label: string }[] = [
  { id: 'L', name: 'Luminosity', label: 'Luminosity (Suns)' },
  { id: 'R', name: 'Radius', label: 'Radius (Suns)' },
  { id: 'T', name: 'Temperature', label: 'Surface temperature (K)' },
  { id: 'M', name: 'Mass', label: 'Mass (Suns)' },
];

/** The earliest age the comparison's time axis shows, Myr (ten thousand years). */
const AGE_MIN = 0.01;
const AFTER = 1.0005;

interface Slot {
  life: ForgeLife | null;
  /** The life shown is an earlier star's while this one is worked out. */
  pending: boolean;
  error?: string;
}

/** One star's life: a brown dwarf's at once, a star's from the stellar worker. */
function useForgeLife(star: ForgeStar | null): Slot {
  const brown = star !== null && star.mass < HYDROGEN_BURNING_LIMIT;
  const answer = useLifeOf(star && !brown ? star : null);
  const mass = star?.mass;
  const z = star?.z;
  const wind = star?.wind;
  return useMemo(() => {
    if (mass === undefined || z === undefined || wind === undefined) return { life: null, pending: false };
    if (brown) return { life: summarise({ mass, z, wind }, brownDwarfLife(mass, PMS_TRACKS)), pending: false };
    if (!answer) return { life: null, pending: true };
    const current = answer.m === mass && answer.z === z && answer.wind === wind;
    if (answer.error) return current ? { life: null, pending: false, error: answer.error } : { life: null, pending: true };
    return { life: summarise({ mass: answer.m, z: answer.z, wind: answer.wind }, answer), pending: !current };
  }, [brown, answer, mass, z, wind]);
}

/** A life's span for the time slider: its start, and the moment it becomes a remnant (a brown dwarf's: the end of its track). */
function spanOf(life: ForgeLife): [number, number] {
  const s = life.track.steps;
  return [s[0].t, Number.isFinite(life.death) ? life.death : s[s.length - 1].t];
}

function timeAt(life: ForgeLife, f: number, scale: StripScale): number {
  const [start, end] = spanOf(life);
  if (f > 1) return Number.isFinite(life.death) ? life.death * 1.0000001 : end;
  return stripTime(Math.min(f, 0.99999), start, end, scale);
}

function valueOf(s: SseStep, q: Quantity): number {
  return q === 'M' ? s.mt : s[q];
}

export function StarForgeLab() {
  const [start] = useState(() => fromQuery(window.location.search));
  const [state, setState] = useState<ForgeState>(start.state);
  const [notes, setNotes] = useState<string[]>(start.notes);
  const [active, setActive] = useState(0);
  const [f, setF] = useState<number | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [scale, setScale] = useState<StripScale>('linear');
  const [ageLog, setAgeLog] = useState<boolean | null>(null);
  const [quantity, setQuantity] = useState<Quantity>('L');
  const [density, setDensity] = useState<DensityGrid | undefined>();
  const [copied, setCopied] = useState<string | null>(null);
  const lastStars = useRef<ForgeStar[]>(state.mode === 'stars' ? state.stars : [{ mass: 1, z: 0.02, wind: 1 }]);

  useEffect(() => {
    let live = true;
    loadGaia().then((g) => live && setDensity(g.hundred.density));
    return () => {
      live = false;
    };
  }, []);

  const stars = state.mode === 'stars' ? state.stars : [];
  const s0 = useForgeLife(stars[0] ?? null);
  const s1 = useForgeLife(stars[1] ?? null);
  const s2 = useForgeLife(stars[2] ?? null);
  const s3 = useForgeLife(stars[3] ?? null);
  const slots = [s0, s1, s2, s3].slice(0, stars.length);
  const sel = Math.min(active, Math.max(0, stars.length - 1));
  // The HR diagram's range, the same object while the lives are, so its canvas isn't redrawn as time is scrubbed.
  const n = stars.length;
  const range = useMemo(() => forgeRange([s0.life, s1.life, s2.life, s3.life].slice(0, n).filter((l): l is ForgeLife => l !== null)), [s0.life, s1.life, s2.life, s3.life, n]);
  const compare = stars.length > 1;
  const preset = state.preset ? findPreset(state.preset) : undefined;

  const load = (next: ForgeState, newNotes: string[] = []) => {
    if (next.mode === 'stars') lastStars.current = next.stars;
    setState(next);
    setNotes(newNotes);
    setActive(0);
    setF(null);
    setAge(null);
    setScale('linear');
    setAgeLog(null);
    setCopied(null);
  };

  const editStar = (patch: Partial<ForgeStar>, typed = false) => {
    if (state.mode !== 'stars') return;
    const c = clampStar({ ...stars[sel], ...patch });
    const next = stars.map((s, i) => (i === sel ? c.star : s));
    lastStars.current = next;
    setState({ mode: 'stars', stars: next, preset: null });
    if (typed || notes.length) setNotes(c.notes);
    setCopied(null);
  };

  // —— Time ——
  const activeSlot = slots[sel];
  const activeLife = activeSlot?.life ?? null;
  const lives = slots.map((s) => s.life);
  const ready = lives.filter((l): l is ForgeLife => l !== null);
  const fShown = f ?? (activeLife && state.preset === 'sun' ? stripPosition(SUN_AGE, 0, activeLife.death, 'linear') : 0.35);
  const ends = ready.map((l) => spanOf(l)[1]);
  const ageMax = ends.length ? Math.max(...ends) * 1.15 : 1e4;
  // Ages run evenly unless the lives differ more than twentyfold.
  const logAge = ageLog ?? (ends.length > 1 && Math.max(...ends) / Math.min(...ends) > 20);
  const ageMin = logAge ? AGE_MIN : 0;
  const defaultAge = ends.length ? Math.max(AGE_MIN * 2, Math.min(...ends) * 0.5) : 1;
  const ageShown = Math.min(ageMax, Math.max(ageMin, age ?? defaultAge));
  const tOf = (life: ForgeLife) => (compare ? ageShown : timeAt(life, fShown, scale));
  const shown: Shown[] = slots.flatMap((s, i) => (s.life ? [{ life: s.life, now: stateOf(s.life, tOf(s.life)), index: i }] : []));
  const activeNow = shown.find((s) => s.index === sel)?.now ?? null;

  // —— Words ——
  const caption = (() => {
    if (!shown.length) return activeSlot?.error ? 'The engine couldn’t follow this star to its end: turn the winds up a little.' : 'Working out its life…';
    if (compare) {
      return `At ${formatMyr(ageShown)}: ${shown.map((s) => `star ${s.index + 1} is ${s.now ? describeNow(s.now) : 'not yet born'}`).join('; ')}.`;
    }
    const s = shown[0];
    if (!s.now) return '';
    const t = tOf(s.life);
    if (fShown > 1) return `After ${formatMyr(s.life.death)}, all that is left is ${s.life.fate.kind === 'nothing' ? 'nothing at all' : describeNow(s.now)}.`;
    return `At ${formatMyr(t)}, it is ${describeNow(s.now)}, ${formatSuns(s.now.L)} times as luminous as the Sun.`;
  })();

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${toQuery(state)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(`Copied: ${url}`);
    } catch {
      setCopied(url);
    }
  };

  return (
    <div className={styles.lab}>
      <div className={styles.presetRow}>
        <label htmlFor="forge-preset">Start from</label>
        <select
          id="forge-preset"
          value={state.preset ?? 'custom'}
          onChange={(e) => {
            if (findPreset(e.target.value)) load(presetState(e.target.value));
          }}
        >
          {!state.preset && <option value="custom">{state.mode === 'cluster' ? 'Your own cluster settings' : compare ? 'Your own stars' : 'Your own star'}</option>}
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className={figureStyles.toolButton} onClick={() => load(state.preset ? presetState(state.preset) : start.state, state.preset ? [] : start.notes)}>
          Start again
        </button>
        <span className={figureStyles.segmented} role="group" aria-label="Make">
          <button type="button" aria-pressed={state.mode === 'stars'} onClick={() => state.mode !== 'stars' && load({ mode: 'stars', stars: lastStars.current, preset: null })}>
            Stars
          </button>
          <button type="button" aria-pressed={state.mode === 'cluster'} onClick={() => state.mode !== 'cluster' && load({ mode: 'cluster', cluster: 'pleiades', age: 120, z: null, preset: 'pleiades' })}>
            A cluster
          </button>
        </span>
      </div>
      {preset ? (
        <>
          <p className={styles.blurb}>{preset.blurb}</p>
          <p className={styles.tryThis}>
            <b>Try this:</b> {preset.tryThis}
          </p>
        </>
      ) : (
        <p className={styles.blurb}>
          {state.mode === 'cluster' ? 'A cluster with an age and make-up of your choosing.' : compare ? 'Your own stars, side by side.' : 'Your own star.'} Choose a preset to start again from one of
          the ready-made stars.
        </p>
      )}
      {notes.length > 0 && (
        <ul className={styles.notes} role="status">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {state.mode === 'cluster' ? (
        <ClusterMode
          cluster={state.cluster}
          age={state.age}
          z={state.z}
          onChange={(c) => setState({ ...state, ...c, preset: null })}
          onForge={(mass, z) => load({ mode: 'stars', stars: [{ mass, z, wind: 1 }], preset: null })}
        />
      ) : (
        <>
          <div className={styles.chips} role="group" aria-label="Stars">
            {stars.map((s, i) => (
              <span key={i} className={styles.chip}>
                <button type="button" aria-pressed={i === sel} onClick={() => setActive(i)} title={compare ? 'Edit this star' : undefined}>
                  <svg width="22" height="10" aria-hidden="true">
                    <line x1="1" x2="21" y1="5" y2="5" stroke={STAR_STYLES[i].chart} strokeWidth="2.5" strokeDasharray={STAR_STYLES[i].dash} />
                  </svg>
                  {compare ? `${i + 1}: ` : ''}
                  {starLabel(s)}
                </button>
                {compare && (
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove star ${i + 1}`}
                    onClick={() => {
                      const next = stars.filter((_, k) => k !== i);
                      lastStars.current = next;
                      setState({ mode: 'stars', stars: next, preset: null });
                      setActive(Math.max(0, Math.min(sel > i ? sel - 1 : sel, next.length - 1)));
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {stars.length < 4 && (
              <button
                type="button"
                className={figureStyles.toolButton}
                onClick={() => {
                  const base = stars[sel];
                  const added = clampStar({ ...base, mass: base.mass * 2 > FORGE_LIMITS.mass[1] ? base.mass / 2 : base.mass * 2 }).star;
                  const next = [...stars, added];
                  lastStars.current = next;
                  setState({ mode: 'stars', stars: next, preset: null });
                  setActive(next.length - 1);
                }}
              >
                + Compare another star
              </button>
            )}
          </div>

          <div className={styles.inputs}>
            <p className={styles.editing}>{compare ? `Star ${sel + 1}:` : 'The star:'}</p>
            <div className={styles.inputRow}>
              {/* Steps of 0.005 in log mass (1.2%), coarser than the three-figure rounding, so the arrow keys always move it. */}
              <Slider label="Mass at birth" value={stars[sel].mass} min={FORGE_LIMITS.mass[0]} max={FORGE_LIMITS.mass[1]} log step={0.005} format={msun} onChange={(m) => editStar({ mass: m })} />
              <NumberField label="or type (M☉)" value={stars[sel].mass} onCommit={(m) => editStar({ mass: m }, true)} />
            </div>
            <div className={styles.inputRow}>
              <Slider label="Metallicity" value={stars[sel].z} min={FORGE_LIMITS.z[0]} max={FORGE_LIMITS.z[1]} log step={0.005} format={formatZ} onChange={(z) => editStar({ z })} />
              <NumberField label="or type Z" value={stars[sel].z} onCommit={(z) => editStar({ z }, true)} />
            </div>
            <Slider label="Winds" value={stars[sel].wind} min={FORGE_LIMITS.wind[0]} max={FORGE_LIMITS.wind[1]} step={0.05} format={formatWind} onChange={(w) => editStar({ wind: w })} />
          </div>

          <div className={styles.time}>
            {compare ? (
              <>
                <Slider label="Age" value={Math.max(ageShown, logAge ? AGE_MIN : 0)} min={ageMin} max={ageMax} log={logAge} step={logAge ? 0.002 : ageMax / 1000} format={formatMyr} onChange={setAge} />
                <div className={skyStyles.toggles} role="group" aria-label="Age runs">
                  <span className={skyStyles.togglesLabel}>Age runs</span>
                  <button type="button" className={skyStyles.toggle} aria-pressed={!logAge} onClick={() => setAgeLog(false)}>
                    Evenly
                  </button>
                  <button type="button" className={skyStyles.toggle} aria-pressed={logAge} onClick={() => setAgeLog(true)}>
                    On a log scale
                  </button>
                </div>
              </>
            ) : (
              <>
                <Slider
                  label="Time"
                  value={fShown}
                  min={0}
                  max={activeLife?.brownDwarf ? 1 : AFTER}
                  step={0.0005}
                  format={() => (activeLife ? (fShown > 1 ? 'Its remnant' : formatMyr(timeAt(activeLife, fShown, scale))) : '…')}
                  onChange={setF}
                />
                <div className={skyStyles.toggles} role="group" aria-label="Time runs">
                  <span className={skyStyles.togglesLabel}>Time runs</span>
                  <button type="button" className={skyStyles.toggle} aria-pressed={scale === 'linear'} onClick={() => setScale('linear')}>
                    Evenly
                  </button>
                  <button type="button" className={skyStyles.toggle} aria-pressed={scale === 'before-end'} onClick={() => setScale('before-end')}>
                    As time before the end
                  </button>
                </div>
                {activeLife && (
                  <div className={skyStyles.presets} role="group" aria-label="Go to">
                    <span className={skyStyles.togglesLabel}>Go to</span>
                    {goTos(activeLife, scale).map((g) => (
                      <button key={g.name} type="button" className={skyStyles.toggle} aria-pressed={Math.abs(g.f - fShown) < 1e-6} onClick={() => setF(g.f)}>
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.main}>
            <div>
              <p className={skyStyles.panelTitle}>On the HR diagram</p>
              {shown.length > 0 && <ForgeHR shown={shown} active={sel} density={density} range={range} />}
              <Legend
                items={[
                  { label: 'Gaia’s stars within 100 parsecs', symbol: <rect x="-8" y="-6" width="16" height="12" fill="rgb(150,175,255)" fillOpacity="0.6" /> },
                  ...shown.map((s) => ({
                    label: compare ? `star ${s.index + 1}’s track` : s.life.remnant && s.life.remnant.kw <= 12 ? 'its track (dashed: the jump to a white dwarf)' : 'its track',
                    symbol: <path d="M-10 6 L0 0 L10 -8" stroke={STAR_STYLES[s.index].chart} strokeWidth="2.2" strokeDasharray={STAR_STYLES[s.index].dash} fill="none" />,
                  })),
                  { label: 'the chosen moment', symbol: <circle r="5" fill="#ffd27a" stroke="var(--accent)" strokeWidth="2" /> },
                ]}
              />
              <p className={styles.caption} aria-live="polite">
                {caption}
              </p>
            </div>
            <div className={styles.panel}>
              <FateCard life={activeLife} now={activeNow} pending={!!activeSlot?.pending} error={activeSlot?.error} />
              {!compare && shown.length > 0 && (
                <div>
                  <p className={skyStyles.panelTitle}>Drawn true, beside the Sun</p>
                  <DrawnTrue shown={shown} active={sel} />
                </div>
              )}
            </div>
          </div>

          {compare && shown.length > 0 && (
            <div className={styles.section}>
              <p className={skyStyles.panelTitle}>Drawn true, beside the Sun, at {formatMyr(ageShown)}</p>
              <DrawnTrue shown={shown} active={sel} />
            </div>
          )}

          <div className={styles.below}>
            <div>
              <div className={figureStyles.toolbar}>
                <span className={figureStyles.segmented} role="group" aria-label="Chart shows">
                  {QUANTITIES.map((x) => (
                    <button key={x.id} type="button" aria-pressed={quantity === x.id} onClick={() => setQuantity(x.id)}>
                      {x.name}
                    </button>
                  ))}
                </span>
              </div>
              {shown.length > 0 && <LifeChart shown={shown} compare={compare} quantity={quantity} scale={scale} f={fShown} age={ageShown} ageLog={logAge} ageMax={ageMax} onPick={(x) => (compare ? setAge(x) : setF(x))} />}
            </div>
            <div>
              <p className={skyStyles.panelTitle}>Inside{compare ? `, star ${sel + 1}` : ''}</p>
              <Inside step={activeNow} />
              <p className={styles.note}>
                SSE gives the core’s mass and size once the star leaves the main sequence, and the depth of its outer convection zone. It doesn’t
                follow the convective cores of heavy main-sequence stars, so they aren’t drawn.
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <p className={skyStyles.panelTitle}>Its life, phase by phase{compare ? '' : ` (${scale === 'linear' ? 'time running evenly' : 'as time before the end'})`}</p>
            {compare && (
              <div className={skyStyles.toggles} role="group" aria-label="Strips run" style={{ marginBottom: 6 }}>
                <span className={skyStyles.togglesLabel}>Time runs</span>
                <button type="button" className={skyStyles.toggle} aria-pressed={scale === 'linear'} onClick={() => setScale('linear')}>
                  Evenly
                </button>
                <button type="button" className={skyStyles.toggle} aria-pressed={scale === 'before-end'} onClick={() => setScale('before-end')}>
                  As time before the end
                </button>
              </div>
            )}
            {shown.map((s) => (
              <div key={s.index}>
                {compare && <p className={styles.stripLabel}>{`${s.index + 1}: ${starLabel(s.life.star)}`}</p>}
                <LifeStrip
                  phases={s.life.phases}
                  scale={s.life.brownDwarf ? 'linear' : scale}
                  now={tOf(s.life)}
                  formatTime={shortMyr}
                  ariaLabel={`${compare ? `Star ${s.index + 1}` : 'The star'}’s phases: ${phaseWords(s.life).join('; ')}.`}
                />
              </div>
            ))}
            {activeLife && (
              <ol className={styles.phaseList} aria-label={compare ? `Star ${sel + 1}’s phases in words` : 'Its phases in words'}>
                {phaseWords(activeLife).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ol>
            )}
          </div>

          <div className={styles.section}>
            <LifeTable lives={lives} active={sel} onPick={setActive} />
          </div>

          <div className={styles.section}>
            <p className={skyStyles.panelTitle}>Where the engine can be trusted (click to forge a star there)</p>
            <CalibrationMap stars={stars} active={sel} onPick={(mass, z) => editStar({ mass, z: Math.min(FORGE_LIMITS.z[1], Math.max(FORGE_LIMITS.z[0], z)) })} />
            <Legend
              items={(Object.keys(ZONE_STYLE) as (keyof typeof ZONE_STYLE)[]).map((k) => ({
                label: ZONE_STYLE[k].name,
                symbol: <rect x="-8" y="-6" width="16" height="12" fill={ZONE_STYLE[k].fill} fillOpacity={0.7} />,
              }))}
            />
            <p className={styles.note}>
              SSE’s formulas were fitted to detailed models of stars from half a Sun to 50 Suns with metallicities Z from 0.0001 to 0.03. Outside that box
              they still give answers, but nothing checked them. Below 0.075 Suns, brown-dwarf models take over; above 100 Suns, pair instability
              decides the end.
            </p>
          </div>
        </>
      )}

      <div className={styles.buttons}>
        <button type="button" className={figureStyles.toolButton} onClick={copyLink}>
          {state.mode === 'cluster' ? 'Copy a link to this cluster' : compare ? 'Copy a link to these stars' : 'Copy a link to this star'}
        </button>
        {copied && (
          <span className={styles.note} style={{ margin: 0, wordBreak: 'break-all' }} role="status">
            {copied}
          </span>
        )}
      </div>
      {preset && (
        <details className={styles.box} style={{ marginTop: 12 }}>
          <summary>What’s simplified here?</summary>
          <p>{preset.simplified}</p>
          <p>
            Every star is single, doesn’t spin and has no magnetic field. Its life comes from SSE’s fitted formulas (Hurley, Pols and Tout, 2000), not
            from solving the equations of its structure.
          </p>
        </details>
      )}
    </div>
  );
}

/** Buttons to jump to the start of each phase, and to the remnant. */
function goTos(life: ForgeLife, scale: StripScale): { name: string; f: number }[] {
  const [start, end] = spanOf(life);
  const out: { name: string; f: number }[] = [];
  for (const p of life.phases) {
    if (p.kw >= 10 && p.kw <= 15) continue;
    const name = PHASE_SHORT[p.kw] ?? FORGE_TYPE_NAMES[p.kw];
    if (out.some((o) => o.name === name)) continue;
    out.push({ name, f: stripPosition(p.start + (p.end - p.start) * 0.02, start, end, scale) });
  }
  if (Number.isFinite(life.death)) out.push({ name: life.fate.kind === 'nothing' ? 'The end' : FATE_NAMES[life.fate.kind], f: AFTER });
  return out;
}

/** "Main sequence: 11 billion years", …, "Then a carbon–oxygen white dwarf of 0.52 M☉, for ever". */
function phaseWords(life: ForgeLife): string[] {
  if (life.brownDwarf) return ['A brown dwarf from birth: it shrinks, fades and cools for ever'];
  const out = life.phases.filter((p) => p.kw < 10).map((p) => `${FORGE_TYPE_NAMES[p.kw]}: ${formatMyr(p.end - p.start)}`);
  out.push(life.fate.kind === 'nothing' ? 'Then nothing at all' : `Then ${withArticle(FATE_NAMES[life.fate.kind])} of ${msun(life.fate.remnant)}, for ever`);
  return out;
}

/** Luminosity, radius, temperature or mass through the life (one star: along its life; several: against age, on a log axis). */
function LifeChart({
  shown,
  compare,
  quantity,
  scale,
  f,
  age,
  ageLog,
  ageMax,
  onPick,
}: {
  shown: readonly Shown[];
  compare: boolean;
  quantity: Quantity;
  scale: StripScale;
  f: number;
  age: number;
  ageLog: boolean;
  ageMax: number;
  onPick: (x: number) => void;
}) {
  const q = QUANTITIES.find((x) => x.id === quantity)!;
  let lo = Infinity;
  let hi = 0;
  for (const s of shown) {
    for (const st of s.life.track.steps) {
      if (st.kw >= 10 && st.kw <= 15) continue;
      const v = valueOf(st, quantity);
      if (v > 0) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      if (quantity === 'M' && !compare && st.mc > 0) lo = Math.min(lo, st.mc);
    }
  }
  const yMin = 10 ** Math.floor(Math.log10(lo) - 0.05);
  const yMax = 10 ** Math.ceil(Math.log10(hi) + 0.05);
  const living = (life: ForgeLife, t: number) => {
    const [start, end] = spanOf(life);
    if (t < start || t > end) return null;
    return stateAt(life.track, Math.min(t, end - (end - start) * 1e-9));
  };

  if (compare) {
    const lines: ScatterLine[] = shown.map((s) => ({
      name: `${s.index + 1}: ${starLabel(s.life.star)}`,
      color: STAR_STYLES[s.index].chart,
      dash: STAR_STYLES[s.index].dash,
      f: (t: number) => {
        const st = living(s.life, t);
        return st ? valueOf(st, quantity) : NaN;
      },
    }));
    return (
      <ScatterChart
        groups={[]}
        lines={lines}
        xScale={ageLog ? 'log' : 'linear'}
        yScale="log"
        xMin={ageLog ? AGE_MIN : 0}
        xMax={ageMax}
        yMin={yMin}
        yMax={yMax}
        xLabel={ageLog ? 'Age (log scale)' : 'Age'}
        yLabel={q.label}
        formatX={shortMyr}
        onPick={onPick}
        height={320}
        ariaLabel={`Each star’s ${q.name.toLowerCase()} against age, until it becomes a remnant.`}
      >
        {(sx) => <line x1={sx(age)} x2={sx(age)} y1={14} y2={278} stroke="var(--accent)" strokeWidth={1.5} />}
      </ScatterChart>
    );
  }

  const s = shown[0];
  const [start, end] = spanOf(s.life);
  const at = (x: number) => living(s.life, stripTime(Math.min(Math.max(x, 0), 0.99999), start, end, s.life.brownDwarf ? 'linear' : scale));
  const lines: ScatterLine[] =
    quantity === 'M'
      ? [
          { name: 'Mass', color: 'var(--series-1)', f: (x) => at(x)?.mt ?? NaN },
          { name: 'Core mass', color: 'var(--series-2)', dash: '8 4', f: (x) => at(x)?.mc ?? NaN },
        ]
      : [{ name: q.name, color: 'var(--series-1)', f: (x) => (at(x) ? valueOf(at(x)!, quantity) : NaN) }];
  const now = f <= 1 ? at(f) : null;
  const before = scale === 'before-end' && !s.life.brownDwarf;
  return (
    <ScatterChart
      groups={[]}
      lines={lines}
      xScale="linear"
      yScale="log"
      xMin={0}
      xMax={1}
      yMin={yMin}
      yMax={yMax}
      xLabel={before ? 'Time left before it becomes a remnant' : 'Age'}
      yLabel={q.label}
      formatX={(x) => (before ? shortMyr(end - stripTime(x, start, end, 'before-end')) : shortMyr(stripTime(x, start, end, 'linear')))}
      highlight={now ? { x: f, y: valueOf(now, quantity), label: 'now', color: 'var(--accent)' } : undefined}
      onPick={(x) => onPick(Math.min(0.99999, x))}
      height={320}
      ariaLabel={`The star’s ${q.name.toLowerCase()} through its life, against ${before ? 'time left' : 'age'}.`}
    />
  );
}

/** A number typed in, applied on Enter or when the field loses focus; the Forge clamps it and says so. */
function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(String(value));
  }
  const commit = () => {
    const v = Number(text.replace('−', '-').replace(',', '.'));
    if (text.trim() === '' || v === value) return;
    onCommit(v);
  };
  return (
    <label className={styles.field}>
      {label}
      <input
        value={text}
        inputMode="decimal"
        size={7}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
    </label>
  );
}
