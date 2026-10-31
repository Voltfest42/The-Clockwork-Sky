import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { CENSUS } from '../data/exoplanets';
import { lightYearsFromParsecs } from '../core/stars/distance';
import { Caption, Figure } from '../viz/Figure';
import { allPlanets, countsBy, FACILITY_NAMES, FIRST_YEAR, groupOf, kindOf, LAST_YEAR, METHOD_GROUPS, METHOD_NAMES, planetByName, SOLAR_SYSTEM, type Exoplanet } from './otherWorlds';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The exoplanet census (Figure 19.3): every confirmed planet in the NASA
 * Exoplanet Archive, its mass or its size against its distance from its star,
 * coloured and shaped by how it was found, with the Solar System's planets for
 * comparison. A slider runs the census from 1992 to today; a click, or the
 * arrow keys, pick a planet for its card. The plot is dark in both themes, as
 * the HR diagram is, so the colours read the same.
 */

const W = 640;
const H = 440;
const PAD = { left: 62, right: 14, top: 12, bottom: 44 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;
const BG = '#070b16';

const COLOURS = ['#5aa9ff', '#ffb347', '#7ee07e', '#ff7fc0', '#d0d0d0'];
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross'] as const;

type YAxis = 'mass' | 'radius';
const X_RANGE = [0.004, 3000] as const;
const Y_RANGES: Record<YAxis, readonly [number, number]> = { mass: [0.03, 30000], radius: [0.3, 30] };

const FAMOUS = ['51 Peg b', 'HD 209458 b', 'Kepler-16 b', 'TRAPPIST-1 e', 'Proxima Cen b', 'K2-18 b', 'WASP-39 b', 'HR 8799 b'];

const lx = (a: number) => PAD.left + ((Math.log10(a) - Math.log10(X_RANGE[0])) / (Math.log10(X_RANGE[1]) - Math.log10(X_RANGE[0]))) * PW;
const ly = (v: number, y: YAxis) => {
  const [lo, hi] = Y_RANGES[y];
  return PAD.top + PH - ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * PH;
};

const valueOf = (p: Exoplanet, y: YAxis) => (y === 'mass' ? p.mass : p.radius);

function drawShape(ctx: CanvasRenderingContext2D, shape: (typeof SHAPES)[number], x: number, y: number, r: number) {
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      break;
    case 'square':
      ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
      break;
    case 'triangle':
      ctx.moveTo(x, y - r * 1.2);
      ctx.lineTo(x + r * 1.1, y + r * 0.8);
      ctx.lineTo(x - r * 1.1, y + r * 0.8);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(x, y - r * 1.25);
      ctx.lineTo(x + r * 1.25, y);
      ctx.lineTo(x, y + r * 1.25);
      ctx.lineTo(x - r * 1.25, y);
      ctx.closePath();
      break;
    case 'cross':
      ctx.moveTo(x - r, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r);
      ctx.lineTo(x - r, y + r);
      break;
  }
}

function legendSymbol(k: number) {
  const fill = COLOURS[k];
  switch (SHAPES[k]) {
    case 'circle':
      return <circle r="4" fill={fill} />;
    case 'square':
      return <rect x="-3.6" y="-3.6" width="7.2" height="7.2" fill={fill} />;
    case 'triangle':
      return <path d="M0 -5 L4.6 3.3 L-4.6 3.3 Z" fill={fill} />;
    case 'diamond':
      return <path d="M0 -5 L5 0 L0 5 L-5 0 Z" fill={fill} />;
    default:
      return <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke={fill} strokeWidth="2" />;
  }
}

/** "the end of 2015", or for the census's own year the month it was fetched. */
const byWhen = (year: number) => (year === LAST_YEAR ? CENSUS.asOf : `the end of ${year}`);

const START = { y: 'mass' as YAxis, year: LAST_YEAR, selected: '51 Peg b' };

export function CensusFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [y, setY] = useState<YAxis>(START.y);
  const [year, setYear] = useState(START.year);
  const [selected, setSelected] = useState<string | null>(START.selected);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reset = () => {
    setY(START.y);
    setYear(START.year);
    setSelected(START.selected);
  };

  const planets = allPlanets();
  // The planets on the plot now: found by the year, with an orbit and the chosen value.
  const shown = useMemo(
    () =>
      planets.flatMap((p) => {
        const v = valueOf(p, y);
        if (p.year > year || p.a === null || v === null) return [];
        return [{ p, x: lx(p.a), y: ly(v, y), group: groupOf(p.method) }];
      }),
    [planets, y, year],
  );
  const counts = countsBy(year);
  const chosen = selected ? planetByName(selected) ?? null : null;
  const chosenShown = chosen ? shown.find((s) => s.p === chosen) : undefined;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const draw = () => {
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const scale = (c.clientWidth || W) / W;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(W * scale * dpr);
      c.height = Math.round(H * scale * dpr);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath();
      ctx.rect(PAD.left, PAD.top, PW, PH);
      ctx.clip();
      ctx.fillStyle = BG;
      ctx.fillRect(PAD.left, PAD.top, PW, PH);
      ctx.globalAlpha = 0.75;
      // Draw the commonest kind first, so the rarer ones stay visible on top.
      for (const g of [0, 1, 4, 2, 3]) {
        ctx.fillStyle = COLOURS[g];
        ctx.strokeStyle = COLOURS[g];
        ctx.lineWidth = 1.2;
        for (const s of shown) {
          if (s.group !== g) continue;
          drawShape(ctx, SHAPES[g], s.x, s.y, 2.1);
          if (SHAPES[g] === 'cross') ctx.stroke();
          else ctx.fill();
        }
      }
      ctx.restore();
    };
    draw();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    observer?.observe(c);
    return () => observer?.disconnect();
  }, [shown]);

  const toSvg = (e: PointerEvent<SVGSVGElement>): [number, number] => {
    const box = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * W, ((e.clientY - box.top) / box.height) * H];
  };
  const pick = (px: number, py: number) => {
    let best: (typeof shown)[number] | null = null;
    let bestD = 14 * 14;
    for (const s of shown) {
      const d = (s.x - px) ** 2 + (s.y - py) ** 2;
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    if (best) setSelected(best.p.name);
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const dir = dirs[e.key];
    if (!dir) return;
    e.preventDefault();
    const from = chosenShown ?? { x: PAD.left + PW / 2, y: PAD.top + PH / 2, p: null };
    // The nearest planet ahead, within 60° of the arrow's direction.
    let best: (typeof shown)[number] | null = null;
    let bestScore = Infinity;
    for (const s of shown) {
      if (s.p === from.p) continue;
      const dx = s.x - from.x;
      const dy = s.y - from.y;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 0.5) continue;
      const across = Math.abs(dx * dir[1] - dy * dir[0]);
      if (across > along * 1.8) continue;
      const score = along + 2 * across;
      if (score < bestScore) {
        best = s;
        bestScore = score;
      }
    }
    if (best) setSelected(best.p.name);
  };

  const xTicks = [0.01, 0.1, 1, 10, 100, 1000];
  const yTicks = y === 'mass' ? [0.1, 1, 10, 100, 1000, 10000] : [0.5, 1, 2, 4, 10, 20];
  const regionLabels =
    y === 'radius'
      ? [
          { text: 'Hot Jupiters', a: 0.02, v: 17 },
          { text: 'Sub-Neptunes', a: 0.2, v: 2.9 },
          { text: 'Super-Earths', a: 0.006, v: 1.45 },
        ]
      : [
          { text: 'Hot Jupiters', a: 0.012, v: 600 },
          { text: 'Cold giants', a: 6, v: 6000 },
          { text: 'Super-Earths and sub-Neptunes', a: 0.012, v: 4 },
        ];

  return (
    <Figure
      number={number}
      title="The exoplanet census"
      description={`Every confirmed planet in the NASA Exoplanet Archive, ${CENSUS.count.toLocaleString('en-GB')} as of ${CENSUS.asOf}: each planet’s mass or size against its distance from its star, on log axes, coloured and shaped by how it was found, with the Solar System’s planets for comparison. Transits find mostly large planets close in; wobbles find heavy ones; microlensing and imaging find planets far out. A slider runs the census from 1992, when the first planets were found round a pulsar, to today.`}
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        ...METHOD_GROUPS.map((g, k) => ({ label: g.name, symbol: legendSymbol(k) })),
        { label: 'the Solar System’s planets', symbol: <circle r="4.5" fill="none" stroke="var(--text)" strokeWidth="1.5" /> },
      ]}
      simplified={
        <p>
          The values are the Archive’s chosen best ones (its composite table). Masses worked out from a planet’s size by a rule of thumb are left out,
          and so are sizes worked out from masses: only what was measured is plotted. Wobble masses are least masses, m sin i, unless the tilt is
          known. For microlensing planets the distance is the separation seen on the sky. The census shows what each method can find, not what is
          out there: small planets far from their stars are almost all still unseen.
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={figureStyles.toolbar}>
          <div className={figureStyles.segmented} role="group" aria-label="Plot">
            <button type="button" aria-pressed={y === 'mass'} onClick={() => setY('mass')}>
              Mass
            </button>
            <button type="button" aria-pressed={y === 'radius'} onClick={() => setY('radius')}>
              Size
            </button>
          </div>
        </div>
        <Slider label="Found by" value={year} min={FIRST_YEAR} max={LAST_YEAR} step={1} format={(v) => String(Math.round(v))} onChange={(v) => setYear(Math.round(v))} />
        <div className={styles.presets} role="group" aria-label="Famous planets">
          {FAMOUS.map((n) => (
            <button key={n} type="button" className={styles.toggle} aria-pressed={selected === n} onClick={() => setSelected(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}` }}>
        <canvas ref={canvas} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="application"
          aria-roledescription="chart"
          aria-label={`${shown.length.toLocaleString('en-GB')} planets’ ${y === 'mass' ? 'masses' : 'sizes'} against their distance from their stars. Click a planet, or use the arrow keys to move from planet to planet.`}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            const [px, py] = toSvg(e);
            pick(px, py);
          }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'manipulation', cursor: 'crosshair' }}
        >
          <rect x={PAD.left} y={PAD.top} width={PW} height={PH} fill="none" stroke="var(--border)" />
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line x1={lx(t)} x2={lx(t)} y1={PAD.top} y2={PAD.top + PH} stroke="rgba(255,255,255,0.09)" />
              <text x={lx(t)} y={PAD.top + PH + 15} fontSize="11" textAnchor="middle" fill="var(--text-muted)">
                {t.toLocaleString('en-GB')}
              </text>
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD.left} x2={PAD.left + PW} y1={ly(t, y)} y2={ly(t, y)} stroke="rgba(255,255,255,0.09)" />
              <text x={PAD.left - 6} y={ly(t, y) + 4} fontSize="11" textAnchor="end" fill="var(--text-muted)">
                {t.toLocaleString('en-GB')}
              </text>
            </g>
          ))}
          <text x={PAD.left + PW / 2} y={H - 10} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--text)">
            Distance from its star (AU)
          </text>
          <text transform={`translate(15 ${PAD.top + PH / 2}) rotate(-90)`} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--text)">
            {y === 'mass' ? 'Mass (Earth = 1)' : 'Size (Earth = 1)'}
          </text>
          {regionLabels.map((r) => (
            <text key={r.text} x={lx(r.a)} y={ly(r.v, y)} fontSize="11" fill="rgba(255,255,255,0.85)" fontStyle="italic" stroke={BG} strokeWidth="3" paintOrder="stroke" pointerEvents="none">
              {r.text}
            </text>
          ))}
          {SOLAR_SYSTEM.map((w) => {
            const v = y === 'mass' ? w.mass : w.radius;
            // Venus sits just inside Earth and Uranus just inside Neptune: their labels go on the left.
            const left = w.name === 'Venus' || w.name === 'Uranus';
            return (
              <g key={w.name} pointerEvents="none">
                <circle cx={lx(w.a)} cy={ly(v, y)} r={5} fill="none" stroke="#fff" strokeWidth="1.6" />
                <text x={lx(w.a) + (left ? -7 : 7)} y={ly(v, y) + 4} textAnchor={left ? 'end' : 'start'} fontSize="10.5" fill="#fff" stroke={BG} strokeWidth="3" paintOrder="stroke">
                  {w.name}
                </text>
              </g>
            );
          })}
          {chosenShown && (
            <g pointerEvents="none">
              <circle cx={chosenShown.x} cy={chosenShown.y} r={9} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
              <circle cx={chosenShown.x} cy={chosenShown.y} r={12} fill="none" stroke="#fff" strokeWidth="1" />
            </g>
          )}
        </svg>
      </div>
      <div className={styles.readout} aria-live="polite">
        <span>
          Found by {byWhen(year)}: <b>{counts.total.toLocaleString('en-GB')}</b>
        </span>
        {METHOD_GROUPS.map((g, k) => (
          <span key={g.id}>
            {g.name.replace(/ \(.*\)$/, '')}: {counts.groups[k].toLocaleString('en-GB')}
          </span>
        ))}
      </div>
      {chosen && <PlanetCard planet={chosen} shown={Boolean(chosenShown)} y={y} />}
      <Caption>
        {year < 1995
          ? `By ${byWhen(year)}: ${counts.total} planets, all round a pulsar, a dead star, found by the timing of its pulses.`
          : year < 2009
            ? `By ${byWhen(year)}: ${counts.total.toLocaleString('en-GB')} planets, most of them giants found by their wobbles, many of them hot Jupiters.`
            : `By ${byWhen(year)}: ${counts.total.toLocaleString('en-GB')} planets. ${year >= 2014 ? 'Transits now dominate, with Kepler’s thousands of super-Earths and sub-Neptunes, the commonest planets known, which the Solar System lacks.' : 'Kepler’s transits are pouring in.'}`}
      </Caption>
    </Figure>
  );
}

function PlanetCard({ planet: p, shown, y }: { planet: Exoplanet; shown: boolean; y: YAxis }) {
  const facts: [string, string][] = [
    ['Found', `${p.year}, by ${METHOD_NAMES[p.method].toLowerCase()}${p.facility >= 0 ? ` (${FACILITY_NAMES[p.facility]})` : ''}`],
    ['Orbit', [p.period !== null ? (p.period >= 730 ? `${Number((p.period / 365.25).toPrecision(3))} years` : `${Number(p.period.toPrecision(3))} days`) : null, p.a !== null ? `${Number(p.a.toPrecision(3))} AU from its star` : null].filter(Boolean).join(', ') || 'not known'],
    ['Mass', p.mass !== null ? `${p.minimumMass ? 'at least ' : ''}${Number(p.mass.toPrecision(3)).toLocaleString('en-GB')} Earths` : 'not measured'],
    ['Size', p.radius !== null ? `${Number(p.radius.toPrecision(3))} times Earth’s` : 'not measured'],
    ['Star', [p.teff !== null ? `${p.teff.toLocaleString('en-GB')} K` : null, p.distance !== null ? `${Math.round(lightYearsFromParsecs(p.distance)).toLocaleString('en-GB')} light-years away` : null, p.circumbinary ? 'it orbits a pair of stars' : null].filter(Boolean).join(', ') || 'not known'],
  ];
  return (
    <div className={styles.card} aria-live="polite">
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>{p.name}</span>
        <span className={styles.cardSubtitle}>{kindOf(p)}</span>
      </div>
      <dl className={styles.facts}>
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {!shown && <p className={styles.hint}>{p.year > LAST_YEAR ? '' : `Not on the plot: ${valueOf(p, y) === null ? `its ${y === 'mass' ? 'mass' : 'size'} hasn’t been measured` : 'it was found later than the year chosen'}.`}</p>}
    </div>
  );
}
