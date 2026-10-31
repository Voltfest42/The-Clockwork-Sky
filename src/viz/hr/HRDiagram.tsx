import { useEffect, useId, useMemo, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { bcGOf, luminosityFor, luminosityFromBolometric, temperatureFromBpRp, type HRPoint } from '../../core/stars/hr';
import { HR_HEIGHT, HR_WIDTH, PAD, placeOf, PLOT_H, PLOT_W, pointAt, RANGES, type Axes, type AxisRange } from './axes';
import { starCss } from '../star/colour';
import styles from './HRDiagram.module.css';

export type { Axes } from './axes';

/**
 * The Hertzsprung–Russell diagram, used from Chapter 13 to the Star Forge.
 * Observers' axes (Gaia's colour against absolute magnitude) or physicists'
 * (temperature against luminosity, with lines of equal size); hot is on the
 * left either way, and the axes say so with arrows, because the reversed axis
 * is what trips readers up. Layers: a density map of many stars (drawn on a
 * canvas), points coloured by temperature, and labelled markers (SVG). The
 * plot is dark in both themes, so stars show in their own colours.
 *
 * A click, or Enter after moving the cross-hair with the arrow keys, picks a
 * place on the diagram.
 */

export interface DensityGrid {
  x0: number;
  dx: number;
  nx: number;
  y0: number;
  dy: number;
  ny: number;
  /** Stars per cell, rows of M_G, columns of G_BP − G_RP. */
  counts: readonly number[];
}

export interface HRLayer {
  id: string;
  points: readonly HRPoint[];
  /** Dot radius, in the drawing's units. */
  size?: number;
  alpha?: number;
}

export interface HRMarker {
  id: string;
  label: string;
  point: HRPoint;
  highlight?: boolean;
  /** Which side of the dot the label goes. */
  side?: 'left' | 'right';
}

interface HRDiagramProps {
  axes: Axes;
  density?: DensityGrid;
  layers?: readonly HRLayer[];
  markers?: readonly HRMarker[];
  /** A zoomed range (see physicistRange); the axes' full range by default. */
  range?: AxisRange;
  /** Draw lines of equal radius (physicists' axes only). */
  radiusLines?: boolean;
  cursor?: HRPoint | null;
  onCursor?: (p: HRPoint) => void;
  onPick?: (p: HRPoint) => void;
  ariaLabel: string;
  /** Extra SVG, given the axis mappings from a point to the drawing. */
  children?: (place: (p: HRPoint) => [number, number]) => ReactNode;
}

const PLOT_BG = '#070b16';
/** The default for no layers, one array for every render, so the canvas isn't redrawn for nothing. */
const NO_LAYERS: readonly HRLayer[] = [];
const DENSITY = [150, 175, 255];

/** The density grid's cell corners on the physicists' axes, worked out once per grid. */
function cornersFor(grid: DensityGrid): { kelvin: number[]; bc: number[] } {
  const kelvin: number[] = [];
  const bc: number[] = [];
  for (let i = 0; i <= grid.nx; i++) {
    const t = temperatureFromBpRp(grid.x0 + i * grid.dx);
    kelvin.push(t);
    bc.push(bcGOf(t));
  }
  return { kelvin, bc };
}

export function HRDiagram({ axes, range, density, layers = NO_LAYERS, markers = [], radiusLines = false, cursor, onCursor, onPick, ariaLabel, children }: HRDiagramProps) {
  const r = range ?? RANGES[axes];
  const canvas = useRef<HTMLCanvasElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const corners = useMemo(() => (density ? cornersFor(density) : null), [density]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const draw = () => {
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const scale = (c.clientWidth || HR_WIDTH) / HR_WIDTH;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(HR_WIDTH * scale * dpr);
      c.height = Math.round(HR_HEIGHT * scale * dpr);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, HR_WIDTH, HR_HEIGHT);
      ctx.save();
      ctx.beginPath();
      ctx.rect(PAD.left, PAD.top, PLOT_W, PLOT_H);
      ctx.clip();
      ctx.fillStyle = PLOT_BG;
      ctx.fillRect(PAD.left, PAD.top, PLOT_W, PLOT_H);

      if (density && corners) {
        let max = 1;
        for (const n of density.counts) if (n > max) max = n;
        const logMax = Math.log10(max + 1);
        for (let j = 0; j < density.ny; j++) {
          for (let i = 0; i < density.nx; i++) {
            const n = density.counts[j * density.nx + i];
            if (!n) continue;
            // The bluest colours no longer give a temperature (bpRpOf levels off), so they are left off the physicists' axes.
            if (axes === 'physicist' && corners.kelvin[i] > 30000) continue;
            const alpha = Math.min(1, 0.12 + (0.88 * Math.log10(n + 1)) / logMax);
            ctx.fillStyle = `rgba(${DENSITY[0]}, ${DENSITY[1]}, ${DENSITY[2]}, ${alpha.toFixed(3)})`;
            const mg0 = density.y0 + j * density.dy;
            const mg1 = mg0 + density.dy;
            if (axes === 'observer') {
              const [x0, y0] = placeOf(axes, { bpRp: density.x0 + i * density.dx, mG: mg0, kelvin: 1, luminosity: 1 }, r);
              const [x1, y1] = placeOf(axes, { bpRp: density.x0 + (i + 1) * density.dx, mG: mg1, kelvin: 1, luminosity: 1 }, r);
              ctx.fillRect(x0, y0, x1 - x0 + 0.4, y1 - y0 + 0.4);
            } else {
              const quad = [
                [i, mg0],
                [i + 1, mg0],
                [i + 1, mg1],
                [i, mg1],
              ].map(([k, mg]) => placeOf(axes, { bpRp: 0, mG: 0, kelvin: corners.kelvin[k], luminosity: luminosityFromBolometric(mg + corners.bc[k]) }, r));
              ctx.beginPath();
              ctx.moveTo(quad[0][0], quad[0][1]);
              for (const [x, y] of quad.slice(1)) ctx.lineTo(x, y);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }

      for (const layer of layers) {
        const size = layer.size ?? 1.6;
        ctx.globalAlpha = layer.alpha ?? 0.85;
        for (const p of layer.points) {
          const [x, y] = placeOf(axes, p, r);
          ctx.fillStyle = starCss(Math.min(40000, Math.max(1500, p.kelvin)));
          ctx.beginPath();
          ctx.arc(x, y, size, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };
    draw();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    observer?.observe(c);
    return () => observer?.disconnect();
  }, [axes, density, corners, layers, r]);

  const toSvg = (e: PointerEvent<SVGSVGElement>): [number, number] => {
    const box = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * HR_WIDTH, ((e.clientY - box.top) / box.height) * HR_HEIGHT];
  };
  const inPlot = (x: number, y: number) => x >= PAD.left && x <= PAD.left + PLOT_W && y >= PAD.top && y <= PAD.top + PLOT_H;

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 30 : 8;
    const [cx, cy] = cursor ? placeOf(axes, cursor, r) : [PAD.left + PLOT_W / 2, PAD.top + PLOT_H / 2];
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      onCursor?.(pointAt(axes, cx + dx, cy + dy, r));
    } else if ((e.key === 'Enter' || e.key === ' ') && onPick) {
      e.preventDefault();
      onPick(cursor ?? pointAt(axes, cx, cy, r));
    }
  };

  const ticks = axes === 'observer' ? observerTicks(r) : physicistTicks(r);
  const place = (p: HRPoint) => placeOf(axes, p, r);

  return (
    <div className={styles.wrap}>
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
      <svg
        viewBox={`0 0 ${HR_WIDTH} ${HR_HEIGHT}`}
        className={styles.svg}
        role={onPick ? 'application' : 'img'}
        aria-label={ariaLabel}
        aria-roledescription={onPick ? 'diagram' : undefined}
        tabIndex={onPick ? 0 : undefined}
        onKeyDown={onPick ? onKey : undefined}
        onPointerDown={
          onPick
            ? (e) => {
                const [x, y] = toSvg(e);
                if (!inPlot(x, y)) return;
                const p = pointAt(axes, x, y, r);
                onCursor?.(p);
                onPick(p);
              }
            : undefined
        }
      >
        <defs>
          <clipPath id={`plot${uid}`}>
            <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>
        <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="none" stroke="var(--border)" />
        {ticks.x.map((t) => (
          <g key={`x${t.label}`}>
            <line x1={t.at} x2={t.at} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="rgba(255,255,255,0.08)" />
            <text x={t.at} y={PAD.top + PLOT_H + 15} fontSize="11" textAnchor="middle" fill="var(--text-muted)">
              {t.label}
            </text>
          </g>
        ))}
        {ticks.y.map((t) => (
          <g key={`y${t.label}`}>
            <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={t.at} y2={t.at} stroke="rgba(255,255,255,0.08)" />
            <text x={PAD.left - 6} y={t.at + 4} fontSize="11" textAnchor="end" fill="var(--text-muted)">
              {t.label}
            </text>
          </g>
        ))}
        <text x={PAD.left + PLOT_W / 2} y={HR_HEIGHT - 12} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--text)">
          {axes === 'observer' ? 'Colour, G_BP − G_RP: ← bluer, hotter · redder, cooler →' : 'Surface temperature (K): ← hotter · cooler →'}
        </text>
        <text transform={`translate(14 ${PAD.top + PLOT_H / 2}) rotate(-90)`} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--text)">
          {axes === 'observer' ? 'Absolute magnitude, M_G: brighter ↑' : 'Luminosity (Suns): brighter ↑'}
        </text>
        <g clipPath={`url(#plot${uid})`}>
          {axes === 'physicist' && radiusLines && <RadiusLines r={r} />}
          {children?.(place)}
          {markers.map((m) => {
            const [x, y] = place(m.point);
            // Flip a label to the other side of its dot rather than let the plot's edge cut it off.
            const width = m.label.length * (m.highlight ? 7.4 : 6.6);
            const preferRight = (m.side ?? 'right') === 'right';
            const right = preferRight ? x + 8 + width <= PAD.left + PLOT_W : x - 8 - width < PAD.left;
            return (
              <g key={m.id}>
                <circle cx={x} cy={y} r={m.highlight ? 7 : 4.5} fill={starCss(Math.min(40000, Math.max(1500, m.point.kelvin)))} stroke={m.highlight ? 'var(--accent)' : '#fff'} strokeWidth={m.highlight ? 2.5 : 1.2} />
                <text x={x + (right ? 8 : -8)} y={y + 4} fontSize={m.highlight ? 12.5 : 11} fontWeight={m.highlight ? 700 : 500} textAnchor={right ? 'start' : 'end'} fill="#fff" stroke={PLOT_BG} strokeWidth="3" paintOrder="stroke">
                  {m.label}
                </text>
              </g>
            );
          })}
          {cursor && (
            <g pointerEvents="none">
              {(() => {
                const [x, y] = place(cursor);
                return (
                  <>
                    <line x1={x - 12} x2={x + 12} y1={y} y2={y} stroke="var(--accent)" strokeWidth="2" />
                    <line x1={x} x2={x} y1={y - 12} y2={y + 12} stroke="var(--accent)" strokeWidth="2" />
                    <circle cx={x} cy={y} r={5} fill="none" stroke="#fff" strokeWidth="1.5" />
                  </>
                );
              })()}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

const RADII = [0.001, 0.01, 0.1, 1, 10, 100, 1000];

function RadiusLines({ r: range }: { r: AxisRange }) {
  const [hottest, coolest] = range.x;
  const [faintest] = range.y;
  // Across the plot, or the full diagram's width if that's wider (the lines are straight, and clipped).
  const ends = [Math.max(45000, 10 ** hottest), Math.min(2200, 10 ** coolest)];
  return (
    <g>
      {RADII.map((r) => {
        const pts = ends.map((t) => placeOf('physicist', { bpRp: 0, mG: 0, kelvin: t, luminosity: luminosityFor(r, t) }, range));
        // Label each line at the plot's right-hand edge, or, if it leaves through the bottom, just above the bottom edge.
        const atEdge = placeOf('physicist', { bpRp: 0, mG: 0, kelvin: 10 ** coolest, luminosity: luminosityFor(r, 10 ** coolest) }, range);
        const inside = atEdge[1] > PAD.top + 12 && atEdge[1] < PAD.top + PLOT_H - 4;
        const lowT = 5772 * (10 ** (faintest + 0.35) / (r * r)) ** 0.25;
        const low = placeOf('physicist', { bpRp: 0, mG: 0, kelvin: lowT, luminosity: luminosityFor(r, lowT) }, range);
        const [x, y, anchor] = inside ? [PAD.left + PLOT_W - 4, atEdge[1] - 4, 'end' as const] : [low[0] + 4, low[1] - 4, 'start' as const];
        return (
          <g key={r}>
            <line x1={pts[0][0]} y1={pts[0][1]} x2={pts[1][0]} y2={pts[1][1]} stroke="rgba(255,255,255,0.35)" strokeDasharray="5 4" />
            <text x={x} y={y} fontSize="10.5" textAnchor={anchor} fill="rgba(255,255,255,0.75)">
              {r >= 1 ? r.toLocaleString('en-GB') : r} R☉
            </text>
          </g>
        );
      })}
    </g>
  );
}

function observerTicks(r: AxisRange) {
  const within = (v: number, [a, b]: readonly [number, number]) => v >= Math.min(a, b) - 1e-9 && v <= Math.max(a, b) + 1e-9;
  const yStep = Math.abs(r.y[1] - r.y[0]) > 15 ? 5 : 2;
  const xs: number[] = [];
  for (let v = -1; v <= 5; v += 0.5) if (within(v, r.x)) xs.push(v);
  const ys: number[] = [];
  for (let v = -10; v <= 20; v += yStep) if (within(v, r.y)) ys.push(v);
  const x = xs.map((v) => ({ at: placeOf('observer', { bpRp: v, mG: 0, kelvin: 1, luminosity: 1 }, r)[0], label: v < 0 ? `−${-v}` : `${v}` }));
  const y = ys.map((v) => ({ at: placeOf('observer', { bpRp: 0, mG: v, kelvin: 1, luminosity: 1 }, r)[1], label: v < 0 ? `−${-v}` : `${v}` }));
  return { x, y };
}

function physicistTicks(r: AxisRange) {
  const full = r === RANGES.physicist;
  const [hot, cool] = [10 ** r.x[0], 10 ** r.x[1]];
  // A range wider than the full diagram's (the Star Forge's, with white dwarfs and brown dwarfs) gets sparser ticks.
  const wide = r.x[0] - r.x[1] > RANGES.physicist.x[0] - RANGES.physicist.x[1] + 0.05;
  const temps = (
    full
      ? [40000, 20000, 10000, 6000, 4000, 3000]
      : wide
        ? [200000, 100000, 50000, 20000, 10000, 5000, 3000, 2000, 1000, 500]
        : [40000, 20000, 15000, 10000, 8000, 6000, 5000, 4000, 3000, 2500]
  ).filter((t) => t <= hot * 1.001 && t >= cool * 0.999);
  const x = temps.map((t) => ({ at: placeOf('physicist', { bpRp: 0, mG: 0, kelvin: t, luminosity: 1 }, r)[0], label: t.toLocaleString('en-GB') }));
  const decades: number[] = [];
  for (let e = Math.ceil(r.y[0]); e <= Math.floor(r.y[1]); e++) decades.push(e);
  const every = full ? 2 : decades.length > 7 ? 2 : 1;
  const y = decades
    .filter((e) => e % every === 0)
    .map((e) => ({ at: placeOf('physicist', { bpRp: 0, mG: 0, kelvin: 5772, luminosity: 10 ** e }, r)[1], label: (10 ** e).toLocaleString('en-GB', { maximumSignificantDigits: 1 }) }));
  return { x, y };
}
