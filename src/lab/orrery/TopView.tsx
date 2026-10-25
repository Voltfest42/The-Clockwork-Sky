import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import type { Vec3 } from '../../core/math/vec3';
import { readTokens, useDarkMode } from '../../viz/hooks';
import { formatSize } from './format';
import styles from './Orrery.module.css';

/**
 * The Orrery seen from above (Canvas 2D): the bodies, their trails and, in a
 * turning frame, the Lagrange points, in the frame the lab has chosen. Drag to
 * pan, wheel (once clicked) or pinch to zoom, click a body to pick it. While
 * the system is paused, the picked body's velocity arrow can be dragged.
 * Keyboard: arrows pan, + and − zoom, Home puts the view back.
 */

export interface ViewBody {
  id: string;
  name: string;
  colour: string;
  /** Radius, AU. */
  radius: number;
  /** Position in the view's frame, AU. */
  p: Vec3;
  gm: number;
}

export interface ViewModel {
  bodies: ViewBody[];
  /** Trails by body id: t, x, y, z for each point, in the frame. */
  trails: Map<string, number[]>;
  lagrange: { name: string; x: number; y: number }[] | null;
  /** The picked body's velocity relative to its parent, in the frame's axes (AU/day), and how many AU of arrow per AU/day. */
  arrow: { id: string; v: Vec3; scale: number } | null;
  selected: string | null;
}

interface TopViewProps {
  model: RefObject<ViewModel>;
  /** Changes whenever the model has changed, to redraw. */
  version: number;
  /** Half the view's shorter side, AU. */
  zoom: number;
  /** The point at the view's centre, AU in the frame. */
  pan: readonly [number, number];
  onView: (zoom: number, pan: readonly [number, number]) => void;
  onHome: () => void;
  onPick: (id: string | null) => void;
  /** The velocity arrow was dragged to a new velocity (AU/day, frame axes; z kept). */
  onArrow: (id: string, v: Vec3) => void;
  editable: boolean;
  label: string;
  height: string;
}

const MIN_ZOOM = 1e-6;
const MAX_ZOOM = 1e6;

export function TopView({ model, version, zoom, pan, onView, onHome, onPick, onArrow, editable, label, height }: TopViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 420 });
  const dark = useDarkMode();
  const [focused, setFocused] = useState(false);
  const drag = useRef<{ kind: 'pan' | 'arrow'; x: number; y: number; pan: readonly [number, number]; moved: boolean; id?: string } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const [arrowTip, setArrowTip] = useState<[number, number] | null>(null);
  const view = useRef({ zoom, pan, onView });
  useEffect(() => {
    view.current = { zoom, pan, onView };
  });

  useEffect(() => {
    const element = box.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(size.width, size.height) / 2 / zoom;
  const toScreen = (x: number, y: number): [number, number] => [size.width / 2 + (x - pan[0]) * scale, size.height / 2 - (y - pan[1]) * scale];

  // The arrow's tip on screen, for dragging.
  const tipOf = (): [number, number] | null => {
    const m = model.current;
    if (!editable || !m?.arrow) return null;
    const body = m.bodies.find((b) => b.id === m.arrow!.id);
    if (!body) return null;
    const [bx, by] = toScreen(body.p[0], body.p[1]);
    return [bx + m.arrow.v[0] * m.arrow.scale * scale, by - m.arrow.v[1] * m.arrow.scale * scale];
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const frame = requestAnimationFrame(() => {
      const m = model.current;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(size.width * ratio);
      c.height = Math.round(size.height * ratio);
      const g = c.getContext('2d');
      if (!g || !m) return;
      const t = readTokens(c, ['--sky-bg', '--sky-text', '--sky-muted', '--sky-grid', '--accent']);
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      g.fillStyle = t['--sky-bg'] || '#070b16';
      g.fillRect(0, 0, size.width, size.height);

      // Trails, fading towards their old ends.
      g.lineWidth = 1.4;
      for (const body of m.bodies) {
        const trail = m.trails.get(body.id);
        if (!trail || trail.length < 8) continue;
        g.strokeStyle = body.colour;
        const count = trail.length / 4;
        const chunks = 4;
        for (let c0 = 0; c0 < chunks; c0++) {
          const from = Math.floor((c0 * count) / chunks);
          const to = Math.min(count - 1, Math.floor(((c0 + 1) * count) / chunks));
          if (to <= from) continue;
          g.globalAlpha = 0.15 + (0.5 * (c0 + 1)) / chunks;
          g.beginPath();
          for (let k = from; k <= to; k++) {
            const [sx, sy] = toScreen(trail[4 * k + 1], trail[4 * k + 2]);
            if (k === from) g.moveTo(sx, sy);
            else g.lineTo(sx, sy);
          }
          if (to === count - 1) {
            const [sx, sy] = toScreen(body.p[0], body.p[1]);
            g.lineTo(sx, sy);
          }
          g.stroke();
        }
      }
      g.globalAlpha = 1;

      // Lagrange points.
      if (m.lagrange) {
        g.strokeStyle = t['--sky-muted'] || '#9aa8c4';
        g.fillStyle = t['--sky-muted'] || '#9aa8c4';
        g.font = '12px system-ui, sans-serif';
        for (const p of m.lagrange) {
          const [sx, sy] = toScreen(p.x, p.y);
          g.beginPath();
          g.moveTo(sx - 5, sy);
          g.lineTo(sx + 5, sy);
          g.moveTo(sx, sy - 5);
          g.lineTo(sx, sy + 5);
          g.stroke();
          g.fillText(p.name, sx - 6, sy + 18);
        }
      }

      // Bodies, heaviest last so they sit on top; labels by weight, skipping any that would overlap.
      const order = [...m.bodies].sort((a, b) => a.gm - b.gm);
      const placed: [number, number, number, number][] = [];
      const labels: { text: string; x: number; y: number; selected: boolean }[] = [];
      for (const body of order) {
        const [sx, sy] = toScreen(body.p[0], body.p[1]);
        const r = Math.max(body.radius * scale, body.gm === 0 ? 2 : 3.5);
        g.fillStyle = body.colour;
        g.beginPath();
        g.arc(sx, sy, r, 0, 2 * Math.PI);
        g.fill();
        if (body.id === m.selected) {
          g.strokeStyle = t['--sky-text'] || '#fff';
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(sx, sy, r + 5, 0, 2 * Math.PI);
          g.stroke();
        }
      }
      for (const body of [...order].reverse()) {
        const [sx, sy] = toScreen(body.p[0], body.p[1]);
        if (sx < -50 || sy < -20 || sx > size.width + 50 || sy > size.height + 20) continue;
        const selected = body.id === m.selected;
        const w = body.name.length * 6.6 + 4;
        const r = Math.max(body.radius * scale, 3.5);
        const box4: [number, number, number, number] = [sx + r + 3, sy - r - 15, w, 14];
        const overlaps = placed.some((p) => box4[0] < p[0] + p[2] && box4[0] + box4[2] > p[0] && box4[1] < p[1] + p[3] && box4[1] + box4[3] > p[1]);
        if (overlaps && !selected) continue;
        placed.push(box4);
        labels.push({ text: body.name, x: box4[0], y: box4[1] + 11, selected });
      }
      g.font = '12px system-ui, sans-serif';
      for (const l of labels) {
        g.fillStyle = l.selected ? t['--sky-text'] || '#fff' : t['--sky-muted'] || '#9aa8c4';
        g.fillText(l.text, l.x, l.y);
      }

      // The velocity arrow.
      const tip = arrowTip ?? tipOf();
      if (tip && m.arrow) {
        const body = m.bodies.find((b) => b.id === m.arrow!.id);
        if (body) {
          const [bx, by] = toScreen(body.p[0], body.p[1]);
          const accent = t['--accent'] || '#6b9bff';
          g.strokeStyle = accent;
          g.fillStyle = accent;
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(tip[0], tip[1]);
          g.stroke();
          const a = Math.atan2(tip[1] - by, tip[0] - bx);
          g.beginPath();
          g.moveTo(tip[0], tip[1]);
          g.lineTo(tip[0] - 10 * Math.cos(a - 0.4), tip[1] - 10 * Math.sin(a - 0.4));
          g.lineTo(tip[0] - 10 * Math.cos(a + 0.4), tip[1] - 10 * Math.sin(a + 0.4));
          g.closePath();
          g.fill();
          g.beginPath();
          g.arc(tip[0], tip[1], 7, 0, 2 * Math.PI);
          g.globalAlpha = 0.35;
          g.fill();
          g.globalAlpha = 1;
        }
      }

      // A scale bar: a round number of AU (or km) about a fifth of the width.
      const target = size.width / 5 / scale;
      const p10 = Math.pow(10, Math.floor(Math.log10(target)));
      const nice = [1, 2, 5, 10].map((k) => k * p10).filter((v) => v <= target).pop() ?? p10;
      const px = nice * scale;
      g.strokeStyle = t['--sky-text'] || '#e2e8f5';
      g.fillStyle = t['--sky-text'] || '#e2e8f5';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(14, size.height - 16);
      g.lineTo(14 + px, size.height - 16);
      g.moveTo(14, size.height - 21);
      g.lineTo(14, size.height - 11);
      g.moveTo(14 + px, size.height - 21);
      g.lineTo(14 + px, size.height - 11);
      g.stroke();
      g.font = '12px system-ui, sans-serif';
      g.fillText(formatSize(nice), 14, size.height - 26);
    });
    return () => cancelAnimationFrame(frame);
    // toScreen and tipOf read the same values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, size, zoom, pan, arrowTip, editable, dark, model]);

  const setZoom = (factor: number, about?: [number, number]) => {
    const { zoom: z, pan: p, onView: report } = view.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
    if (!about) return report(next, p);
    // Keep the point under the pointer where it is.
    const k = next / z;
    report(next, [about[0] + (p[0] - about[0]) * k, about[1] + (p[1] - about[1]) * k]);
  };

  // The wheel zooms only once the view has focus, so the page still scrolls past it.
  useEffect(() => {
    const element = box.current;
    if (!element || !focused) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const s = Math.min(rect.width, rect.height) / 2 / view.current.zoom;
      const about: [number, number] = [view.current.pan[0] + (event.clientX - rect.left - rect.width / 2) / s, view.current.pan[1] - (event.clientY - rect.top - rect.height / 2) / s];
      setZoom(Math.exp(event.deltaY * 0.0015), about);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [focused]);

  const local = (event: PointerEvent) => {
    const rect = box.current!.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top] as [number, number];
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    box.current?.focus();
    const [x, y] = local(event);
    pointers.current.set(event.pointerId, { x, y });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
      return;
    }
    const tip = tipOf();
    if (tip && Math.hypot(tip[0] - x, tip[1] - y) < 14) {
      drag.current = { kind: 'arrow', x, y, pan, moved: false, id: model.current?.arrow?.id };
      setArrowTip(tip);
      return;
    }
    drag.current = { kind: 'pan', x, y, pan, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const [x, y] = local(event);
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x, y });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0) onView(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (pinch.current.zoom * pinch.current.distance) / d)), pan);
      return;
    }
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(x - d.x, y - d.y) > 3) d.moved = true;
    if (d.kind === 'arrow') setArrowTip([x, y]);
    else if (d.moved) onView(zoom, [d.pan[0] - (x - d.x) / scale, d.pan[1] + (y - d.y) / scale]);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const [x, y] = local(event);
    if (d.kind === 'arrow') {
      setArrowTip(null);
      const m = model.current;
      const body = m?.bodies.find((b) => b.id === d.id);
      if (m?.arrow && body && d.moved) {
        const [bx, by] = toScreen(body.p[0], body.p[1]);
        const k = m.arrow.scale * scale;
        onArrow(body.id, [(x - bx) / k, -(y - by) / k, m.arrow.v[2]]);
      }
      return;
    }
    if (d.moved) return;
    // A click: pick the nearest body within reach.
    const m = model.current;
    let best: string | null = null;
    let bestD = 16;
    for (const body of m?.bodies ?? []) {
      const [sx, sy] = toScreen(body.p[0], body.p[1]);
      const dd = Math.hypot(sx - x, sy - y) - Math.max(0, body.radius * scale - 4);
      if (dd < bestD) {
        bestD = dd;
        best = body.id;
      }
    }
    onPick(best);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const step = zoom * 0.1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[event.key]) {
      onView(zoom, [pan[0] + moves[event.key][0], pan[1] + moves[event.key][1]]);
    } else if (event.key === '+' || event.key === '=' || event.key === 'PageUp') {
      setZoom(1 / 1.25);
    } else if (event.key === '-' || event.key === '_' || event.key === 'PageDown') {
      setZoom(1.25);
    } else if (event.key === 'Home') {
      onHome();
    } else return;
    event.preventDefault();
  };

  return (
    <div
      ref={box}
      className={styles.view}
      style={{ height }}
      tabIndex={0}
      role="application"
      aria-roledescription="top-down view"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
    </div>
  );
}
