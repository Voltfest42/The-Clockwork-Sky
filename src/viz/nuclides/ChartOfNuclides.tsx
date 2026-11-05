import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { MAGIC, SYMBOLS } from '../../core/nuclear/nuclides';
import { readTokens, useDarkMode } from '../hooks';
import styles from './ChartOfNuclides.module.css';
import { CHART_H, CHART_W, cellSize, PAD, PLOT_H, PLOT_W, viewAround, type ChartView } from './view';

/**
 * The chart of nuclides (Part III): every nucleus as a square, neutrons N
 * across and protons Z up, drawn on a canvas. The figure decides each
 * square's colour (half-life, decay, binding energy, abundance) and can lay
 * lines over it (the valley of stability, drip lines, a capture path). The
 * magic numbers are marked as pairs of lines either side of their rows and
 * columns. A cursor picks one nucleus: by click, by the arrow keys when the
 * chart has focus (Shift for steps of ten), and the view follows it; drag to
 * pan, + and − to zoom. The figure shows the cursor's nucleus in words.
 */

export interface ChartCell {
  Z: number;
  N: number;
  /** CSS colour; a var(--token) is read from the theme. */
  colour: string;
  /** An outline, e.g. for branch points or the seed. */
  outline?: string;
}

export type { ChartView };

export interface ChartLine {
  /** Points as [N, Z], in cell units (cell centres at whole numbers). */
  points: readonly (readonly [number, number])[];
  colour: string;
  width?: number;
  dashed?: boolean;
  label?: string;
}


interface ChartOfNuclidesProps {
  cells: readonly ChartCell[];
  view: ChartView;
  onView: (view: ChartView) => void;
  cursor: { Z: number; N: number };
  onCursor: (cursor: { Z: number; N: number }) => void;
  lines?: readonly ChartLine[];
  /** Mark the magic numbers. */
  magic?: boolean;
  /** The whole chart's extent, which panning and zooming stay within. */
  bounds: ChartView;
  ariaLabel: string;
  /** What the cursor is on, read out as it moves. */
  cursorText: string;
}

export function ChartOfNuclides({ cells, view, onView, cursor, onCursor, lines = [], magic = true, bounds, ariaLabel, cursorText }: ChartOfNuclidesProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const dark = useDarkMode();
  const readout = `chart-readout-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const drag = useRef<{ x: number; y: number; view: ChartView; moved: boolean } | null>(null);

  const size = cellSize(view);
  const cols = view.nMax - view.nMin + 1;
  const rows = view.zMax - view.zMin + 1;
  const x0 = PAD.left + (PLOT_W - cols * size) / 2;
  const y0 = PAD.top + (PLOT_H - rows * size) / 2;
  const cx = (N: number) => x0 + (N - view.nMin) * size;
  const cy = (Z: number) => y0 + (view.zMax - Z) * size;

  useEffect(() => {
    const c = canvas.current;
    const w = wrap.current;
    if (!c || !w) return;
    const draw = () => {
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const tokens = readTokens(w, ['--text', '--text-muted', '--border', '--surface', '--accent', '--bg', '--text-warm'] as const);
      const resolve = (colour: string) => {
        const m = colour.match(/^var\((--[a-z0-9-]+)\)$/);
        return m ? (tokens[m[1] as keyof typeof tokens] ?? colour) : colour;
      };
      const scale = (c.clientWidth || CHART_W) / CHART_W;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(CHART_W * scale * dpr);
      c.height = Math.round(CHART_H * scale * dpr);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, CHART_W, CHART_H);
      ctx.fillStyle = tokens['--surface'];
      ctx.fillRect(0, 0, CHART_W, CHART_H);

      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, cols * size, rows * size);
      ctx.clip();
      const gap = size > 6 ? Math.min(1.5, size * 0.08) : 0;
      for (const cell of cells) {
        if (cell.N < view.nMin || cell.N > view.nMax || cell.Z < view.zMin || cell.Z > view.zMax) continue;
        ctx.fillStyle = resolve(cell.colour);
        ctx.fillRect(cx(cell.N) + gap / 2, cy(cell.Z) + gap / 2, size - gap, size - gap);
      }
      for (const cell of cells) {
        if (!cell.outline || cell.N < view.nMin || cell.N > view.nMax || cell.Z < view.zMin || cell.Z > view.zMax) continue;
        ctx.strokeStyle = resolve(cell.outline);
        ctx.lineWidth = Math.max(1.2, Math.min(2.5, size * 0.12));
        ctx.strokeRect(cx(cell.N) + 1, cy(cell.Z) + 1, size - 2, size - 2);
      }
      // Labels inside the squares, when they are big enough to read.
      if (size >= 24) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const cell of cells) {
          if (cell.N < view.nMin || cell.N > view.nMax || cell.Z < view.zMin || cell.Z > view.zMax || cell.Z === 0) continue;
          const fill = resolve(cell.colour);
          ctx.fillStyle = isDark(fill) ? '#ffffff' : '#111111';
          ctx.font = `600 ${Math.min(13, size * 0.32)}px system-ui, sans-serif`;
          ctx.fillText(`${SYMBOLS[cell.Z]}${cell.Z + cell.N}`, cx(cell.N) + size / 2, cy(cell.Z) + size / 2);
        }
      }
      if (magic) {
        ctx.strokeStyle = tokens['--text-muted'];
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        // Small squares: one faint line through each magic row and column; big ones: a line either side.
        const thin = size < 8;
        if (thin) ctx.globalAlpha = 0.6;
        const edges = (p: number) => (thin ? [p + size / 2] : [p, p + size]);
        for (const m of MAGIC) {
          if (m >= view.nMin - 1 && m <= view.nMax + 1) {
            for (const edge of edges(cx(m))) {
              ctx.beginPath();
              ctx.moveTo(edge, y0);
              ctx.lineTo(edge, y0 + rows * size);
              ctx.stroke();
            }
          }
          if (m >= view.zMin - 1 && m <= view.zMax + 1) {
            for (const edge of edges(cy(m))) {
              ctx.beginPath();
              ctx.moveTo(x0, edge);
              ctx.lineTo(x0 + cols * size, edge);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }
      for (const line of lines) {
        ctx.strokeStyle = resolve(line.colour);
        ctx.lineWidth = line.width ?? 2;
        ctx.setLineDash(line.dashed ? [6, 4] : []);
        ctx.beginPath();
        line.points.forEach(([N, Z], i) => {
          const px = cx(N) + size / 2;
          const py = cy(Z) + size / 2;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // The cursor: a thick ring in the accent colour with a contrasting edge.
      if (cursor.N >= view.nMin && cursor.N <= view.nMax && cursor.Z >= view.zMin && cursor.Z <= view.zMax) {
        const s = Math.max(size, 7);
        const px = cx(cursor.N) + size / 2 - s / 2;
        const py = cy(cursor.Z) + size / 2 - s / 2;
        ctx.lineWidth = 4;
        ctx.strokeStyle = tokens['--surface'];
        ctx.strokeRect(px - 2, py - 2, s + 4, s + 4);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = tokens['--accent'];
        ctx.strokeRect(px - 2, py - 2, s + 4, s + 4);
      }
      ctx.restore();

      // Axes: magic numbers as ticks, and labels.
      ctx.fillStyle = tokens['--text-muted'];
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const ticks = (lo: number, hi: number) => {
        const step = niceStep((hi - lo) / 8);
        const out: number[] = [];
        for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
        return out;
      };
      for (const N of ticks(view.nMin, view.nMax)) ctx.fillText(String(N), cx(N) + size / 2, y0 + rows * size + 4);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const Z of ticks(view.zMin, view.zMax)) ctx.fillText(String(Z), x0 - 5, cy(Z) + size / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('neutrons N →', PAD.left + PLOT_W / 2, CHART_H - 4);
      ctx.save();
      ctx.translate(12, PAD.top + PLOT_H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('protons Z →', 0, 0);
      ctx.restore();
      // Line labels at their ends.
      ctx.font = '600 11px system-ui, sans-serif';
      for (const line of lines) {
        if (!line.label || !line.points.length) continue;
        const visible = line.points.filter(([N, Z]) => N >= view.nMin && N <= view.nMax && Z >= view.zMin && Z <= view.zMax);
        const end = visible[visible.length - 1];
        if (!end) continue;
        const px = Math.min(cx(end[0]) + size, x0 + cols * size - 4);
        const py = Math.max(cy(end[1]) - 4, y0 + 12);
        ctx.textAlign = 'right';
        ctx.lineWidth = 3;
        ctx.strokeStyle = tokens['--surface'];
        ctx.strokeText(line.label, px, py);
        ctx.fillStyle = resolve(line.colour);
        ctx.fillText(line.label, px, py);
      }
    };
    draw();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    observer?.observe(c);
    return () => observer?.disconnect();
  }, [cells, view, cursor, lines, magic, dark, size, cols, rows, x0, y0]); // eslint-disable-line react-hooks/exhaustive-deps

  const cellAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * CHART_W;
    const py = ((event.clientY - box.top) / box.height) * CHART_H;
    const N = view.nMin + Math.floor((px - x0) / size);
    const Z = view.zMax - Math.floor((py - y0) / size);
    if (N < view.nMin || N > view.nMax || Z < view.zMin || Z > view.zMax) return null;
    return { Z, N };
  };

  const pan = (dN: number, dZ: number, from = view) => {
    const w = from.nMax - from.nMin;
    const h = from.zMax - from.zMin;
    const nMin = Math.max(bounds.nMin, Math.min(from.nMin + dN, bounds.nMax - w));
    const zMin = Math.max(bounds.zMin, Math.min(from.zMin + dZ, bounds.zMax - h));
    return { nMin, nMax: nMin + w, zMin, zMax: zMin + h };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, view, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const box = event.currentTarget.getBoundingClientRect();
    const unit = (size * box.width) / CHART_W;
    const dN = Math.round((d.x - event.clientX) / unit);
    const dZ = Math.round((event.clientY - d.y) / unit);
    if (Math.abs(event.clientX - d.x) + Math.abs(event.clientY - d.y) > 5) d.moved = true;
    if (d.moved && (dN || dZ)) onView(pan(dN, dZ, d.view));
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) {
      const cell = cellAt(event);
      if (cell) onCursor(cell);
    }
  };

  const zoom = (factor: number) => {
    const columns = Math.round((view.nMax - view.nMin + 1) * factor);
    onView(viewAround(cursor.N, cursor.Z, columns, bounds));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = { ArrowRight: [step, 0], ArrowLeft: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (event.key in moves) {
      event.preventDefault();
      const [dN, dZ] = moves[event.key];
      const next = {
        N: Math.max(bounds.nMin, Math.min(bounds.nMax, cursor.N + dN)),
        Z: Math.max(bounds.zMin, Math.min(bounds.zMax, cursor.Z + dZ)),
      };
      onCursor(next);
      // Keep the cursor in view, with a margin.
      const margin = Math.min(3, Math.floor((view.nMax - view.nMin) / 6));
      let shiftN = 0;
      let shiftZ = 0;
      if (next.N > view.nMax - margin) shiftN = next.N - (view.nMax - margin);
      if (next.N < view.nMin + margin) shiftN = next.N - (view.nMin + margin);
      if (next.Z > view.zMax - margin) shiftZ = next.Z - (view.zMax - margin);
      if (next.Z < view.zMin + margin) shiftZ = next.Z - (view.zMin + margin);
      if (shiftN || shiftZ) onView(pan(shiftN, shiftZ));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoom(0.6);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoom(1 / 0.6);
    }
  };

  return (
    <div className={styles.outer}>
      <div
        ref={wrap}
        className={styles.wrap}
        role="application"
        tabIndex={0}
        aria-label={`${ariaLabel}. Arrow keys move the cursor (Shift for ten at a time); + and − zoom; drag to pan.`}
        aria-describedby={readout}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
      >
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
      </div>
      <p id={readout} className="visually-hidden" aria-live="polite">
        {cursorText}
      </p>
      <div className={styles.zoom}>
        <button type="button" onClick={() => zoom(0.6)} aria-label="Zoom in on the cursor">
          +
        </button>
        <button type="button" onClick={() => zoom(1 / 0.6)} aria-label="Zoom out">
          −
        </button>
      </div>
    </div>
  );
}

function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

/** Whether a colour is dark enough to need white text on it. */
function isDark(colour: string): boolean {
  const rgb = colour.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  let r: number, g: number, b: number;
  if (rgb) [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  else if (/^#[0-9a-f]{6}$/i.test(colour)) [r, g, b] = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16));
  else return false;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}
