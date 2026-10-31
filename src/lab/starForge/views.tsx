import { useState, type MouseEvent } from 'react';
import { fromPhysics } from '../../core/stars/hr';
import { HYDROGEN_BURNING_LIMIT } from '../../core/stellar/brownDwarfs';
import { RELIABLE_MAX_MASS, SSE_FITTED, SSE_VALID } from '../../core/stellar/calibration';
import { BROWN_DWARF_KW, FORGE_LIMITS, Z_SUN_TODAY, type ForgeLife, type ForgeStar } from '../../core/stellar/forge';
import { FATE_NAMES } from '../../core/stellar/lives';
import { PISN_ONSET, DIRECT_COLLAPSE_ONSET, type PairFate } from '../../core/stellar/pairInstability';
import type { SseStep } from '../../core/stellar/sse/evolve';
import { formatMyr } from '../../figures/starLives';
import type { AxisRange } from '../../viz/hr/axes';
import { HRDiagram, type DensityGrid, type HRMarker } from '../../viz/hr/HRDiagram';
import { starCss } from '../../viz/star/colour';
import { StarDisc } from '../../viz/star/StarDisc';
import figureStyles from '../../figures/figures.module.css';
import { formatKelvin, formatSuns, msun, starLabel, STAR_STYLES, superscript } from './format';
import { AU_IN_R_SUN, describeNow, fateWords, isGone, isLiving, layersOf, TYPE_NOUNS, withArticle, ZONE_STYLE } from './model';
import styles from './StarForge.module.css';

/** The Star Forge's views of one or several lives: the HR diagram, the star drawn true, its insides, the calibration map, the table and the fate. */


export interface Shown {
  life: ForgeLife;
  /** The state at the chosen time; null before the star exists. */
  now: SseStep | null;
  index: number;
}

// —— The HR diagram ——

/** `range` from forgeRange, kept the same object while the lives are, so the diagram's canvas is redrawn only when it changes. */
export function ForgeHR({ shown, active, density, range }: { shown: readonly Shown[]; active: number; density?: DensityGrid; range: AxisRange }) {
  // The Sun today, unless a star sits on top of it.
  const onSun = shown.some((s) => s.now && Math.abs(Math.log10(s.now.T / 5772)) < 0.03 && Math.abs(Math.log10(s.now.L)) < 0.2);
  const markers: HRMarker[] = onSun ? [] : [{ id: 'sun', label: 'the Sun today', point: fromPhysics(5772, 1), side: 'left' }];
  for (const s of shown) {
    if (!s.now || isGone(s.now.kw)) continue;
    markers.push({
      id: `star${s.index}`,
      label: shown.length > 1 ? `${s.index + 1}` : `now: ${TYPE_NOUNS[s.now.kw].replace(/^an? /, '')}`,
      point: fromPhysics(s.now.T, s.now.L),
      highlight: s.index === active,
    });
  }
  const words = shown
    .map((s) => {
      const where = !s.now ? 'not yet born' : isGone(s.now.kw) ? `${withArticle(FATE_NAMES[s.life.fate.kind])}, off the diagram` : `${TYPE_NOUNS[s.now.kw]} at ${formatKelvin(s.now.T)} and ${formatSuns(s.now.L)} Suns`;
      return `${shown.length > 1 ? `Star ${s.index + 1}` : 'The star'}, ${starLabel(s.life.star)}: ${where}`;
    })
    .join('. ');
  return (
    <HRDiagram axes="physicist" range={range} density={density} radiusLines markers={markers} ariaLabel={`The HR diagram with the star’s track over Gaia’s stars within 100 parsecs. ${words}.`}>
      {(place) => (
        <g>
          {shown.map((s) => {
            const style = STAR_STYLES[s.index];
            const at = (x: SseStep) => place(fromPhysics(x.T, x.L));
            const path = (steps: readonly SseStep[]) => {
              let d = '';
              let last: [number, number] | null = null;
              for (const x of steps) {
                const p = at(x);
                if (last && Math.abs(p[0] - last[0]) < 0.6 && Math.abs(p[1] - last[1]) < 0.6) continue;
                d += `${d ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
                last = p;
              }
              return d;
            };
            const living = s.life.track.steps.filter((x) => isLiving(x.kw));
            const dead = s.life.track.steps.filter((x) => x.kw >= 10 && x.kw <= 12);
            const width = s.index === active ? 2.2 : 1.6;
            return (
              <g key={s.index}>
                <path d={path(living)} stroke="#070b16" strokeWidth={width + 2.5} strokeOpacity={0.6} fill="none" />
                <path d={path(living)} stroke={style.hr} strokeWidth={width} strokeDasharray={style.dash} fill="none" />
                {living.length > 0 && dead.length > 0 && (
                  <path d={`M${at(living[living.length - 1]).join(' ')} L${at(dead[0]).join(' ')}`} stroke={style.hr} strokeWidth={1.2} strokeDasharray="3 5" fill="none" />
                )}
                {dead.length > 0 && <path d={path(dead)} stroke={style.hr} strokeWidth={width} strokeDasharray={style.dash} fill="none" />}
              </g>
            );
          })}
        </g>
      )}
    </HRDiagram>
  );
}

// —— Drawn true ——

const PLANETS = [
  { name: 'Mercury', au: 0.387 },
  { name: 'Venus', au: 0.723 },
  { name: 'Earth', au: 1 },
  { name: 'Mars', au: 1.524 },
  { name: 'Jupiter', au: 5.2 },
  { name: 'Saturn', au: 9.58 },
  { name: 'Uranus', au: 19.2 },
  { name: 'Neptune', au: 30.1 },
];

/** A disc, a ring or a dot for whatever the star is now. */
function Body({ cx, cy, r, step }: { cx: number; cy: number; r: number; step: SseStep }) {
  if (step.kw === 14) return <circle cx={cx} cy={cy} r={Math.max(1.5, r)} fill="#000" stroke="#cdd6f4" strokeWidth={1} />;
  if (step.kw === 15) return null;
  if (step.kw === 13) return <circle cx={cx} cy={cy} r={Math.max(1, r)} fill="#b8c0ff" />;
  return <StarDisc cx={cx} cy={cy} r={Math.max(0.9, r)} kelvin={Math.min(40000, Math.max(1500, step.T))} />;
}

const W = 340;

export function DrawnTrue({ shown, active }: { shown: readonly Shown[]; active: number }) {
  if (shown.length === 1) {
    const s = shown[0].now;
    if (!s) return null;
    const R = s.R;
    const half = Math.max(R * 1.3, R + 3.4);
    const k = (W / 2 - 6) / half;
    const c = W / 2;
    const sunX = c + (R + 1.6) * k;
    const orbits = PLANETS.filter((p) => p.au * AU_IN_R_SUN < half * 1.35);
    const bar = half > 60 ? { len: AU_IN_R_SUN, label: '1 AU (Earth’s distance from the Sun)' } : half > 6 ? { len: 1, label: 'the Sun’s radius' } : null;
    return (
      <svg viewBox={`0 0 ${W} ${W}`} className={styles.true} role="img" aria-label={`${describeNow(s)}, drawn to scale beside the Sun${orbits.length ? ` and the orbits of ${orbits.map((p) => p.name).join(', ')}, as if it stood where the Sun does` : ''}.`}>
        {orbits.map((p) => (
          <g key={p.name}>
            <circle cx={c} cy={c} r={p.au * AU_IN_R_SUN * k} fill="none" stroke="#8ecae6" strokeOpacity={p.au * AU_IN_R_SUN < R ? 0.35 : 0.85} strokeDasharray={p.au * AU_IN_R_SUN < R ? '3 4' : undefined} />
            <text x={c + p.au * AU_IN_R_SUN * k * 0.71 + 3} y={c - p.au * AU_IN_R_SUN * k * 0.71 - 3} fontSize="10.5" fill="#cdd6f4" stroke="#070b16" strokeWidth={3} paintOrder="stroke">
              {p.name}
            </text>
          </g>
        ))}
        <Body cx={c} cy={c} r={R * k} step={s} />
        <StarDisc cx={sunX} cy={c} r={Math.max(0.9, k)} kelvin={5772} title="The Sun" />
        <text x={sunX} y={c + Math.max(k, 2) + 13} fontSize="10.5" textAnchor="middle" fill="#cdd6f4" stroke="#070b16" strokeWidth={3} paintOrder="stroke">
          the Sun
        </text>
        {bar && (
          <g>
            <line x1={12} x2={12 + bar.len * k} y1={W - 14} y2={W - 14} stroke="#cdd6f4" strokeWidth={2} />
            <text x={12} y={W - 20} fontSize="10.5" fill="#cdd6f4">
              {bar.label}
            </text>
          </g>
        )}
      </svg>
    );
  }
  const cells = shown.length + 1;
  const width = 640;
  const height = 190;
  const cell = width / cells;
  const maxR = Math.max(1, ...shown.map((x) => (x.now ? x.now.R : 0)));
  const k = Math.min(cell / 2 - 8, 70) / maxR;
  const cy = 82;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={styles.trueRow} role="img" aria-label={`The stars drawn to scale beside the Sun. ${shown.map((x) => `Star ${x.index + 1}: ${x.now ? describeNow(x.now) : 'not yet born'}`).join('. ')}.`}>
      {shown.map((x, i) => (
        <g key={x.index}>
          {x.now && <Body cx={cell * (i + 0.5)} cy={cy} r={x.now.R * k} step={x.now} />}
          <text x={cell * (i + 0.5)} y={height - 26} fontSize="12" fontWeight={x.index === active ? 700 : 500} textAnchor="middle" fill="#fff">
            {x.index + 1}
          </text>
          <text x={cell * (i + 0.5)} y={height - 10} fontSize="10.5" textAnchor="middle" fill="#cdd6f4">
            {x.now ? (isGone(x.now.kw) ? FATE_NAMES[x.life.fate.kind].toLowerCase() : `${formatSuns(x.now.R)} R☉`) : 'not yet born'}
          </text>
        </g>
      ))}
      <StarDisc cx={cell * (cells - 0.5)} cy={cy} r={Math.max(0.9, k)} kelvin={5772} title="The Sun" />
      <text x={cell * (cells - 0.5)} y={height - 26} fontSize="12" textAnchor="middle" fill="#fff">
        the Sun
      </text>
      <text x={cell * (cells - 0.5)} y={height - 10} fontSize="10.5" textAnchor="middle" fill="#cdd6f4">
        1 R☉
      </text>
    </svg>
  );
}

// —— Inside ——

const pct = (x: number) => (x >= 0.1 ? `${Math.round(x * 100)}%` : x >= 0.001 ? `${Number((x * 100).toPrecision(1))}%` : 'under 0.1%');

export function Inside({ step }: { step: SseStep | null }) {
  const [by, setBy] = useState<'r' | 'm'>('r');
  if (!step) return null;
  const layers = layersOf(step);
  const size = 240;
  const c = 12;
  const R = size - 2 * c;
  const colour = starCss(Math.min(40000, Math.max(1500, step.T)));
  const wedge = (f0: number, f1: number) => {
    const r0 = Math.max(f0 * R, 0);
    const r1 = Math.max(f1 * R, f1 > 0 ? 1.5 : 0);
    return `M${c + r1} ${size - c} A${r1} ${r1} 0 0 0 ${c} ${size - c - r1} L${c} ${size - c - r0} A${r0} ${r0} 0 0 1 ${c + r0} ${size - c} Z`;
  };
  return (
    <div>
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Layers drawn by">
          <button type="button" aria-pressed={by === 'r'} onClick={() => setBy('r')}>
            By size
          </button>
          <button type="button" aria-pressed={by === 'm'} onClick={() => setBy('m')}>
            By mass
          </button>
        </span>
      </div>
      {layers.length === 0 ? (
        <p className={styles.note}>
          {step.kw === 14
            ? 'A black hole has no inside that can be seen or drawn: its horizon hides it.'
            : step.kw === 15
              ? 'Nothing is left to look inside.'
              : step.kw === 13
                ? 'A neutron star: mostly neutrons, packed as tightly as an atom’s nucleus, under a crust of iron. SSE gives only its mass and size.'
                : 'A white dwarf: the bare core, held up by its electrons, cooling for ever. SSE gives only its mass and size.'}
        </p>
      ) : (
        <div className={styles.inside}>
          <svg viewBox={`0 0 ${size} ${size}`} className={styles.insideSvg} role="img" aria-label={`The star’s insides ${by === 'r' ? 'by size' : 'by mass'}: ${layers.map((l) => `${l.name}, ${pct(l.r[1] - l.r[0])} of the radius and ${pct(l.m[1] - l.m[0])} of the mass`).join('; ')}.`}>
            <rect width={size} height={size} rx="8" fill="#070b16" />
            <path d={wedge(0, 1)} fill={colour} />
            {[...layers].reverse().map((l) => (
              <path key={l.name} d={wedge(0, by === 'r' ? l.r[1] : l.m[1])} fill={l.colour} stroke="#070b16" strokeWidth={0.8} />
            ))}
          </svg>
          <ul className={styles.layerList}>
            {layers.map((l) => (
              <li key={l.name}>
                <span className={styles.swatchSquare} style={{ background: l.colour }} aria-hidden="true" />
                <span>
                  <b>{l.name}</b>: {pct(l.r[1] - l.r[0])} of the radius, {pct(l.m[1] - l.m[0])} of the mass
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// —— The calibration map ——

const MAP = { w: 640, h: 290, left: 58, right: 12, top: 10, bottom: 40 };
const MAP_MASS: [number, number] = [0.01, 300];
const MAP_Z: [number, number] = [1e-5, 0.06];

export function CalibrationMap({ stars, active, onPick }: { stars: readonly ForgeStar[]; active: number; onPick: (mass: number, z: number) => void }) {
  const lx = (m: number) => MAP.left + ((Math.log10(m) - Math.log10(MAP_MASS[0])) / (Math.log10(MAP_MASS[1]) - Math.log10(MAP_MASS[0]))) * (MAP.w - MAP.left - MAP.right);
  const ly = (z: number) => MAP.top + ((Math.log10(MAP_Z[1]) - Math.log10(z)) / (Math.log10(MAP_Z[1]) - Math.log10(MAP_Z[0]))) * (MAP.h - MAP.top - MAP.bottom);
  const rect = (m0: number, m1: number, z0: number, z1: number, zone: keyof typeof ZONE_STYLE) => (
    <rect x={lx(m0)} y={ly(z1)} width={lx(m1) - lx(m0)} height={ly(z0) - ly(z1)} fill={ZONE_STYLE[zone].fill} fillOpacity={0.55} stroke="var(--surface)" strokeWidth={1} />
  );
  const [z0, z1] = FORGE_LIMITS.z;
  const click = (e: MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * MAP.w;
    const y = ((e.clientY - box.top) / box.height) * MAP.h;
    if (x < MAP.left || x > MAP.w - MAP.right || y < MAP.top || y > MAP.h - MAP.bottom) return;
    const fx = (x - MAP.left) / (MAP.w - MAP.left - MAP.right);
    const fy = (y - MAP.top) / (MAP.h - MAP.top - MAP.bottom);
    const mass = 10 ** (Math.log10(MAP_MASS[0]) + fx * (Math.log10(MAP_MASS[1]) - Math.log10(MAP_MASS[0])));
    const z = 10 ** (Math.log10(MAP_Z[1]) - fy * (Math.log10(MAP_Z[1]) - Math.log10(MAP_Z[0])));
    onPick(mass, z);
  };
  const label = (x: number, y: number, text: string, anchor: 'start' | 'middle' = 'middle') => (
    <text x={x} y={y} fontSize="11" textAnchor={anchor} fill="var(--text)" pointerEvents="none">
      {text}
    </text>
  );
  // Labels for zones too narrow to write across.
  const upright = (x: number, y: number, text: string) => (
    <text transform={`translate(${x + 4} ${y}) rotate(-90)`} fontSize="11" textAnchor="middle" fill="var(--text)" pointerEvents="none">
      {text}
    </text>
  );
  const massTicks = [0.01, 0.1, 1, 10, 100];
  const zTicks = [1e-5, 1e-4, 1e-3, 0.01];
  return (
    <svg viewBox={`0 0 ${MAP.w} ${MAP.h}`} className={styles.map} onClick={click} role="img" aria-label={`Where the engine can be trusted, by mass and metallicity: fitted to detailed models from ${SSE_FITTED.mass[0]} to ${SSE_FITTED.mass[1]} Suns; stretched from the hydrogen-burning limit to ${SSE_FITTED.mass[0]} and from ${SSE_FITTED.mass[1]} to ${SSE_VALID.mass[1]}; other models for brown dwarfs and from ${SSE_VALID.mass[1]} to ${RELIABLE_MAX_MASS}; nothing reliable above ${RELIABLE_MAX_MASS} Suns or outside Z = ${z0} to ${z1}. ${stars.map((s, i) => `Star ${i + 1} is at ${msun(s.mass)}, Z = ${s.z}`).join('; ')}.`}>
      <rect x={MAP.left} y={MAP.top} width={MAP.w - MAP.left - MAP.right} height={MAP.h - MAP.top - MAP.bottom} fill={ZONE_STYLE.unreliable.fill} fillOpacity={0.35} />
      {rect(MAP_MASS[0], HYDROGEN_BURNING_LIMIT, z0, z1, 'other-model')}
      {rect(HYDROGEN_BURNING_LIMIT, SSE_FITTED.mass[0], z0, z1, 'extrapolated')}
      {rect(SSE_FITTED.mass[0], SSE_FITTED.mass[1], z0, z1, 'fitted')}
      {rect(SSE_FITTED.mass[1], SSE_VALID.mass[1], z0, z1, 'extrapolated')}
      {rect(SSE_VALID.mass[1], RELIABLE_MAX_MASS, z0, z1, 'other-model')}
      {label(lx(0.027), ly(0.0022), 'brown')}
      {label(lx(0.027), ly(0.0022) + 13, 'dwarfs')}
      {label(lx(5), ly(0.0022), 'fitted to detailed models')}
      {label(lx(0.2), ly(0.0022), 'stretched')}
      {upright(lx(71), ly(0.0022), 'stretched')}
      {upright(lx(123), ly(0.0022), 'pair instability')}
      {upright(lx(212), ly(0.0022), 'unreliable')}
      {label(lx(1), ly(3e-5), 'too few metals: nothing here is reliable')}
      <line x1={MAP.left} x2={MAP.w - MAP.right} y1={ly(0.02)} y2={ly(0.02)} stroke="var(--text)" strokeOpacity={0.5} strokeDasharray="4 4" pointerEvents="none" />
      {label(MAP.left + 4, ly(0.02) - 4, 'SSE’s Sun, Z = 0.02', 'start')}
      <line x1={MAP.left} x2={MAP.w - MAP.right} y1={ly(Z_SUN_TODAY)} y2={ly(Z_SUN_TODAY)} stroke="var(--text)" strokeOpacity={0.35} strokeDasharray="1 3" pointerEvents="none" />
      {massTicks.map((m) => (
        <g key={m}>
          <line x1={lx(m)} x2={lx(m)} y1={MAP.h - MAP.bottom} y2={MAP.h - MAP.bottom + 4} stroke="var(--text-muted)" />
          <text x={lx(m)} y={MAP.h - MAP.bottom + 15} fontSize="11" textAnchor="middle" fill="var(--text-muted)">
            {m}
          </text>
        </g>
      ))}
      {zTicks.map((z) => (
        <text key={z} x={MAP.left - 6} y={ly(z) + 4} fontSize="11" textAnchor="end" fill="var(--text-muted)">
          {z < 0.001 ? `10${superscript(Math.round(Math.log10(z)))}` : z}
        </text>
      ))}
      <text x={(MAP.left + MAP.w - MAP.right) / 2} y={MAP.h - 6} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--text)">
        Mass at birth (Suns)
      </text>
      <text transform={`translate(13 ${(MAP.top + MAP.h - MAP.bottom) / 2}) rotate(-90)`} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--text)">
        Metallicity, Z
      </text>
      {stars.map((s, i) => (
        <g key={i} pointerEvents="none">
          <circle cx={lx(s.mass)} cy={ly(s.z)} r={i === active ? 8 : 6} fill="var(--surface)" stroke="var(--text)" strokeWidth={i === active ? 2.5 : 1.5} />
          <text x={lx(s.mass)} y={ly(s.z) + 4} fontSize="10" fontWeight="700" textAnchor="middle" fill="var(--text)">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

// —— The table ——

export function LifeTable({ lives, active, onPick }: { lives: readonly (ForgeLife | null)[]; active: number; onPick: (i: number) => void }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">Each star’s life in numbers</caption>
        <thead>
          <tr>
            <th scope="col">Star</th>
            <th scope="col">Leaves behind</th>
            <th scope="col">Main sequence</th>
            <th scope="col">Becomes a remnant after</th>
            <th scope="col">Largest</th>
            <th scope="col">Brightest</th>
          </tr>
        </thead>
        <tbody>
          {lives.map((life, i) => (
            <tr key={i}>
              <td>
                <svg width="22" height="10" aria-hidden="true" style={{ marginRight: 6 }}>
                  <line x1="1" x2="21" y1="5" y2="5" stroke={STAR_STYLES[i].chart} strokeWidth="2.5" strokeDasharray={STAR_STYLES[i].dash} />
                </svg>
                <button type="button" className={styles.pick} aria-pressed={i === active} onClick={() => onPick(i)}>
                  {i + 1}: {life ? starLabel(life.star) : '…'}
                </button>
              </td>
              {life ? (
                <>
                  <td>{fateWords(life)}</td>
                  <td>{life.brownDwarf ? 'never reaches it' : formatMyr(life.msEnd)}</td>
                  <td>{Number.isFinite(life.death) ? formatMyr(life.death) : 'never: it fades for ever'}</td>
                  <td>{formatSuns(life.largest.R)} R☉</td>
                  <td>{formatSuns(life.brightest.L)} L☉</td>
                </>
              ) : (
                <td colSpan={5}>Working out its life…</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// —— The fate ——

const PAIR_WORDS: Record<PairFate, string> = {
  'core-collapse': '',
  pulsational: 'heavy enough for pair instability to make the core pulse and throw off mass, which caps the black hole at about 45 Suns',
  'pair-instability': 'inside the pair-instability range, so the whole star is blown apart and nothing is left',
  'direct-collapse': 'so heavy that it collapses whole into a black hole',
};

export function FateCard({ life, now, pending, error }: { life: ForgeLife | null; now: SseStep | null; pending: boolean; error?: string }) {
  if (error) {
    return (
      <div className={styles.box} role="status">
        <h3>The engine stopped</h3>
        <p>
          SSE couldn’t follow this star to its end. Without winds, its formulas for stars above about 90 Suns stall while the star burns helium:
          they ask for ever smaller steps. Turn the winds up a little, to a tenth or more.
        </p>
      </div>
    );
  }
  if (!life) return <div className={styles.box}>Working out its life…</div>;
  const f = life.fate;
  const zone =
    life.zone === 'fitted'
      ? 'The engine’s formulas are fitted to detailed models of stars like this one.'
      : life.zone === 'extrapolated'
        ? 'Here the engine’s formulas are stretched beyond the models they were fitted to: treat the details with care.'
        : life.zone === 'other-model'
          ? life.brownDwarf
            ? 'Brown dwarfs follow published cooling models, not SSE.'
            : 'Above 100 Suns SSE’s formulas are held at their edge, and other models decide the end.'
          : 'Nothing here is reliable this far out: no models have been tested on stars like this.';
  return (
    <div className={styles.box} aria-live="polite" aria-busy={pending}>
      <h3>{starLabel(life.star)}</h3>
      {now && (
        <p>
          <b>Now:</b> {describeNow(now)}
          {now.kw < 13 || now.kw === BROWN_DWARF_KW ? `, ${formatKelvin(now.T)}, ${formatSuns(now.L)} times the Sun’s luminosity, ${msun(now.mt)}.` : '.'}
        </p>
      )}
      <p>
        <b>Its end:</b>{' '}
        {f.kind === 'brown-dwarf'
          ? 'it never fuses hydrogen for long, so it shrinks, fades and cools for ever.'
          : f.kind === 'nothing'
            ? `after ${formatMyr(f.death)}, nothing at all.`
            : `after ${formatMyr(f.death)}${f.death > 13000 ? ', longer than the Galaxy has existed' : ''}, ${withArticle(FATE_NAMES[f.kind])} of ${msun(f.remnant)}.`}
      </p>
      {f.pair !== 'core-collapse' && (
        <p>
          Its helium core ends at {msun(f.heCore)}: {PAIR_WORDS[f.pair]}.
        </p>
      )}
      {life.other && (
        <p>
          <b>Other models:</b> if it kept its mass, as nearly metal-free stars may, its helium core would end near {msun(life.other.heCore)}
          {life.other.pair === 'core-collapse' ? ', and it would collapse to a black hole' : `: ${PAIR_WORDS[life.other.pair]}`} (Heger and Woosley, 2002).
          {life.other.pair === 'pair-instability' ? ` Pair-instability supernovae need helium cores of ${PISN_ONSET}–${DIRECT_COLLAPSE_ONSET} Suns.` : ''}
        </p>
      )}
      <p className={styles.note}>{zone}</p>
    </div>
  );
}
