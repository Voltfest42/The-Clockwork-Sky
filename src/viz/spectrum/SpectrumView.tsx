import { useId, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { BANDS } from '../../data/spectrum';
import { niceTicks } from '../ticks';
import { formatWavelength, rgb, spectralColour } from './format';
import styles from './SpectrumView.module.css';

/**
 * The spectrum view: a wavelength axis, linear or logarithmic, with the bands
 * named along the top and the visible strip in its true colours, and layers on
 * it: curves (Planck's law, later real spectra), filters, markers and a
 * draggable cursor for reading off a wavelength. Every spectrum in Part II is
 * drawn with it. Wavelengths are in metres.
 */

export type Scale = 'linear' | 'log';

export interface SpectrumCurve {
  id: string;
  label: string;
  /** CSS colour. */
  color: string;
  /** [wavelength (m), value], in order of wavelength. */
  points: readonly (readonly [number, number])[];
  /** Fills under the curve: the visible part in its true colours, the rest faintly. */
  rainbow?: boolean;
  dashed?: boolean;
}

export interface SpectrumFilter {
  label: string;
  color: string;
  /** Response 0–1 at a wavelength (m). */
  response: (wavelength: number) => number;
  from: number;
  to: number;
}

export interface SpectrumMarker {
  at: number;
  label?: string;
  color?: string;
  dashed?: boolean;
}

export interface SpectrumCursor {
  at: number;
  onChange: (wavelength: number) => void;
  /** The cursor's accessible name: "Wavelength". */
  label: string;
  /** What the cursor is at, in words, for screen readers. */
  valueText: string;
}

interface SpectrumViewProps {
  min: number;
  max: number;
  scale?: Scale;
  width?: number;
  /** Height of the plotting area, in the drawing's units. */
  plotHeight?: number;
  /** The band names along the top. */
  bands?: boolean;
  curves?: readonly SpectrumCurve[];
  filters?: readonly SpectrumFilter[];
  y?: { scale: Scale; min: number; max: number; label: string; format?: (y: number) => string; ticks?: readonly number[] };
  markers?: readonly SpectrumMarker[];
  cursor?: SpectrumCursor;
  /** Label every n-th decade on a log axis. */
  tickEvery?: number;
  xLabel?: string;
  ariaLabel: string;
  /** Extra SVG over the plot, given the axis mappings. */
  children?: (sx: (wavelength: number) => number, sy: (y: number) => number) => ReactNode;
}

const PAD = { left: 52, right: 14 };

export function SpectrumView({
  min,
  max,
  scale = 'log',
  width = 640,
  plotHeight = 180,
  bands = false,
  curves = [],
  filters = [],
  y,
  markers = [],
  cursor,
  tickEvery = 1,
  xLabel = 'Wavelength',
  ariaLabel,
  children,
}: SpectrumViewProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [focused, setFocused] = useState(false);
  const W = width;
  const bandH = bands ? 24 : 0;
  const top = bandH + 8;
  const plotBottom = top + plotHeight;
  const stripH = 12;
  const H = plotBottom + stripH + 40;

  const t = (l: number) => (scale === 'log' ? (Math.log10(l) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) : (l - min) / (max - min));
  const sx = (l: number) => PAD.left + t(l) * (W - PAD.left - PAD.right);
  const fromX = (x: number) => {
    const f = Math.max(0, Math.min(1, (x - PAD.left) / (W - PAD.left - PAD.right)));
    return scale === 'log' ? 10 ** (Math.log10(min) + f * (Math.log10(max) - Math.log10(min))) : min + f * (max - min);
  };
  const yMin = y?.min ?? 0;
  const yMax = y?.max ?? 1;
  const ty = (v: number) =>
    y?.scale === 'log' ? (Math.log10(Math.max(v, yMin)) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin)) : (v - yMin) / (yMax - yMin);
  const sy = (v: number) => plotBottom - Math.max(0, Math.min(1.02, ty(v))) * plotHeight;

  // Ticks along the wavelength axis.
  const xTicks: number[] = [];
  if (scale === 'log') {
    for (let e = Math.ceil(Math.log10(min) - 1e-9); e <= Math.floor(Math.log10(max) + 1e-9); e++) if (e % tickEvery === 0) xTicks.push(10 ** e);
  } else xTicks.push(...niceTicks(min, max));
  const yTicks = !y ? [] : (y.ticks ?? (y.scale === 'log' ? decades(yMin, yMax) : niceTicks(yMin, yMax)));

  // The visible strip, as a gradient positioned along the axis.
  const visFrom = Math.max(380e-9, min);
  const visTo = Math.min(780e-9, max);
  const visible = visTo > visFrom;
  const stops: { offset: number; color: string }[] = [];
  if (visible) for (let nm = 380; nm <= 780; nm += 10) stops.push({ offset: (sx(nm * 1e-9) - sx(visFrom)) / (sx(visTo) - sx(visFrom) || 1), color: rgb(spectralColour(nm)) });

  const pick = (event: PointerEvent<SVGRectElement>) => {
    if (!cursor || (event.type === 'pointermove' && event.buttons !== 1)) return;
    if (event.type === 'pointerdown') event.currentTarget.setPointerCapture?.(event.pointerId);
    const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
    cursor.onChange(fromX(((event.clientX - box.left) / box.width) * W));
  };

  const onKey = (event: KeyboardEvent) => {
    if (!cursor) return;
    const logStep = scale === 'log' ? 0.02 : 0;
    const linStep = (max - min) / 200;
    const move = (k: number) => {
      const next = scale === 'log' ? cursor.at * 10 ** (k * logStep) : cursor.at + k * linStep;
      cursor.onChange(Math.max(min, Math.min(max, next)));
    };
    const handled: Record<string, () => void> = {
      ArrowRight: () => move(1),
      ArrowUp: () => move(1),
      ArrowLeft: () => move(-1),
      ArrowDown: () => move(-1),
      PageUp: () => move(scale === 'log' ? 50 : 20),
      PageDown: () => move(scale === 'log' ? -50 : -20),
      Home: () => cursor.onChange(min),
      End: () => cursor.onChange(max),
    };
    const action = handled[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  const curvePath = (points: SpectrumCurve['points']) =>
    points
      .filter(([l]) => l >= min && l <= max)
      .map(([l, v], i) => `${i ? 'L' : 'M'}${sx(l).toFixed(1)},${sy(v).toFixed(1)}`)
      .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.view} role="group" aria-label={ariaLabel}>
      <defs>
        {visible && (
          <linearGradient id={`rainbow${uid}`} gradientUnits="userSpaceOnUse" x1={sx(visFrom)} x2={sx(visTo)} y1="0" y2="0">
            {stops.map((s) => (
              <stop key={s.offset} offset={Math.max(0, Math.min(1, s.offset))} stopColor={s.color} />
            ))}
          </linearGradient>
        )}
        <clipPath id={`plot${uid}`}>
          <rect x={PAD.left} y={top - 4} width={W - PAD.left - PAD.right} height={plotHeight + 4} />
        </clipPath>
        <clipPath id={`visible${uid}`}>
          <rect x={sx(visFrom)} y={top - 4} width={Math.max(0, sx(visTo) - sx(visFrom))} height={plotHeight + 4} />
        </clipPath>
      </defs>

      {bands &&
        BANDS.filter((b) => b.to > min && b.from < max).map((b) => {
          const x0 = sx(Math.max(b.from, min));
          const x1 = sx(Math.min(b.to, max));
          return (
            <g key={b.id}>
              <rect x={x0} y={0} width={x1 - x0} height={bandH - 4} fill={b.id === 'visible' ? `url(#rainbow${uid})` : b.tint} opacity={b.id === 'visible' ? 1 : 0.16} />
              {x1 - x0 > 34 && b.id !== 'visible' && (
                <text x={(x0 + x1) / 2} y={bandH - 9} className={styles.band} textAnchor="middle">
                  {b.name}
                </text>
              )}
            </g>
          );
        })}

      {/* the plotting area */}
      <rect x={PAD.left} y={top} width={W - PAD.left - PAD.right} height={plotHeight} className={styles.plot} />
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={sy(v)} y2={sy(v)} className={styles.grid} />
          <text x={PAD.left - 6} y={sy(v) + 3.5} className={styles.tick} textAnchor="end">
            {y?.format ? y.format(v) : String(v)}
          </text>
        </g>
      ))}
      {xTicks.map((l) => (
        <line key={l} x1={sx(l)} x2={sx(l)} y1={top} y2={plotBottom} className={styles.grid} />
      ))}
      {y && (
        <text transform={`translate(12 ${top + plotHeight / 2}) rotate(-90)`} className={styles.axis} textAnchor="middle">
          {y.label}
        </text>
      )}

      <g clipPath={`url(#plot${uid})`}>
        {filters.map((f) => {
          const n = 80;
          const pts: string[] = [];
          for (let i = 0; i <= n; i++) {
            const l = f.from + ((f.to - f.from) * i) / n;
            pts.push(`${sx(l).toFixed(1)},${(plotBottom - f.response(l) * plotHeight * 0.92).toFixed(1)}`);
          }
          return (
            <g key={f.label}>
              <polygon points={`${sx(f.from)},${plotBottom} ${pts.join(' ')} ${sx(f.to)},${plotBottom}`} fill={f.color} opacity={0.18} />
              <polyline points={pts.join(' ')} fill="none" stroke={f.color} strokeWidth="1.5" strokeDasharray="4 3" />
            </g>
          );
        })}
        {curves.map((c) => {
          const d = curvePath(c.points);
          if (!d) return null;
          const inside = c.points.filter(([l]) => l >= min && l <= max);
          const area = `${d} L${sx(inside[inside.length - 1][0]).toFixed(1)},${plotBottom} L${sx(inside[0][0]).toFixed(1)},${plotBottom} Z`;
          return (
            <g key={c.id}>
              {c.rainbow && (
                <>
                  <path d={area} fill={c.color} opacity={0.12} />
                  {visible && <path d={area} fill={`url(#rainbow${uid})`} clipPath={`url(#visible${uid})`} opacity={0.85} />}
                </>
              )}
              <path d={d} fill="none" stroke={c.color} strokeWidth="2.25" strokeDasharray={c.dashed ? '5 4' : undefined} strokeLinejoin="round" />
            </g>
          );
        })}
        {children?.(sx, sy)}
      </g>

      {markers
        .filter((m) => m.at >= min && m.at <= max)
        .map((m, i) => (
          <g key={`${m.at}-${i}`}>
            <line x1={sx(m.at)} x2={sx(m.at)} y1={top} y2={plotBottom} stroke={m.color ?? 'var(--text)'} strokeWidth="1.5" strokeDasharray={m.dashed ? '3 3' : undefined} />
            {m.label && (
              <text x={sx(m.at) + (sx(m.at) > W - 120 ? -4 : 4)} y={top + 12 + (i % 3) * 13} className={styles.marker} textAnchor={sx(m.at) > W - 120 ? 'end' : 'start'} fill={m.color ?? 'var(--text)'}>
                {m.label}
              </text>
            )}
          </g>
        ))}

      {/* the visible strip and the wavelength axis */}
      <rect x={PAD.left} y={plotBottom + 2} width={W - PAD.left - PAD.right} height={stripH} className={styles.strip} />
      {visible && <rect x={sx(visFrom)} y={plotBottom + 2} width={sx(visTo) - sx(visFrom)} height={stripH} fill={`url(#rainbow${uid})`} />}
      {xTicks.map((l) => (
        <text key={l} x={sx(l)} y={plotBottom + stripH + 16} className={styles.tick} textAnchor={sx(l) > W - 30 ? 'end' : sx(l) < PAD.left + 20 && sx(l) < 40 ? 'start' : 'middle'}>
          {scale === 'log' ? formatWavelength(l, 1) : formatWavelength(l)}
        </text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} className={styles.axis} textAnchor="middle">
        {xLabel}
      </text>

      {cursor && (
        <>
          <rect
            x={PAD.left}
            y={top}
            width={W - PAD.left - PAD.right}
            height={plotHeight + stripH + 14}
            fill="transparent"
            style={{ cursor: 'ew-resize', touchAction: 'pan-y' }}
            onPointerDown={pick}
            onPointerMove={pick}
          />
          <g
            role="slider"
            tabIndex={0}
            aria-label={cursor.label}
            aria-valuemin={scale === 'log' ? Math.log10(min) : min}
            aria-valuemax={scale === 'log' ? Math.log10(max) : max}
            aria-valuenow={scale === 'log' ? Math.log10(cursor.at) : cursor.at}
            aria-valuetext={cursor.valueText}
            aria-orientation="horizontal"
            onKeyDown={onKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={styles.cursor}
          >
            {focused && <rect x={sx(cursor.at) - 9} y={top - 3} width={18} height={plotHeight + stripH + 8} rx={4} className={styles.focus} />}
            <line x1={sx(cursor.at)} x2={sx(cursor.at)} y1={top} y2={plotBottom + stripH + 2} className={styles.cursorLine} />
            <path d={`M${sx(cursor.at)} ${plotBottom + stripH + 2} l-7 9 h14 z`} className={styles.cursorHandle} />
          </g>
        </>
      )}
    </svg>
  );
}

function decades(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let e = Math.ceil(Math.log10(lo) - 1e-9); e <= Math.floor(Math.log10(hi) + 1e-9); e++) out.push(10 ** e);
  return out;
}
