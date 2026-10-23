import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { clamp } from '../../core/math/angles';
import { MAX_FOV, MIN_FOV, type SkyCamera } from '../../core/sky/projection';
import { readTokens, useDarkMode } from '../hooks';
import { drawSky, type DrawResult, type SkyLayers, type SkyOverlay } from './draw';
import type { SkyModel } from './model';
import { compassWord } from './words';
import styles from './SkyView.module.css';

/**
 * The sky view: a planetarium drawn on a canvas. Drag to look around, pinch
 * or (once the view has been clicked) scroll to zoom, click a star or planet
 * to pick it. With the keyboard, focus the view and use the arrow keys to
 * look around, + and − to zoom, and Home to look back where the view started.
 * It redraws only when something changes.
 */

interface SkyViewProps {
  /** null while the star data loads. */
  model: SkyModel | null;
  camera: SkyCamera;
  onCamera: (camera: SkyCamera) => void;
  /** Where Home points the camera. */
  home: SkyCamera;
  layers: SkyLayers;
  overlays?: readonly SkyOverlay[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** Star indices that are always labelled. */
  featured?: readonly number[];
  /** What the view is, for screen readers: "The sky from London". */
  label: string;
  /** A sentence describing the view's state, added to the automatic description. */
  description?: string;
  /** Height as a fraction of the width, within the limits below. */
  aspect?: number;
  minHeight?: number;
  maxHeight?: number;
  minFov?: number;
  maxFov?: number;
  /** Called with what's drawn, after each draw. */
  onDrawn?: (result: DrawResult) => void;
  /** Shown over the view's corner: a clock, a readout. */
  overlay?: ReactNode;
  /** Called when the reader moves the camera. */
  onUserCamera?: () => void;
  /** Shows the "In view" buttons under the view. */
  inViewButtons?: boolean;
}

const TOKENS = ['--sky-bg', '--sky-text', '--sky-muted', '--sun'] as const;
// Stable defaults: new arrays on every render would redraw the view on every render.
const NO_OVERLAYS: readonly SkyOverlay[] = [];
const NO_STARS: readonly number[] = [];
const DEG = Math.PI / 180;

export function SkyView({
  model,
  camera,
  onCamera,
  home,
  layers,
  overlays = NO_OVERLAYS,
  selected,
  onSelect,
  featured = NO_STARS,
  label,
  description,
  aspect = 0.62,
  minHeight = 300,
  maxHeight = 560,
  minFov = MIN_FOV,
  maxFov = MAX_FOV,
  onDrawn,
  overlay,
  onUserCamera,
  inViewButtons = true,
}: SkyViewProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 640, height: 400 });
  const [engaged, setEngaged] = useState(false);
  const [drawn, setDrawn] = useState<DrawResult | null>(null);
  const dark = useDarkMode();
  const helpId = useId();
  const descriptionId = useId();
  const onDrawnRef = useRef(onDrawn);
  useEffect(() => {
    onDrawnRef.current = onDrawn;
  });

  const setCamera = (c: SkyCamera) => {
    onUserCamera?.();
    onCamera({
      az: ((c.az % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
      alt: clamp(c.alt, -Math.PI / 2, Math.PI / 2),
      fov: clamp(c.fov, minFov, maxFov),
    });
  };

  useEffect(() => {
    const element = wrap.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(240, Math.round(entry.contentRect.width));
      setSize({ width, height: Math.round(clamp(width * aspect, minHeight, maxHeight)) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [aspect, minHeight, maxHeight]);

  // Draw whenever anything changes, at most once a frame.
  useEffect(() => {
    const element = canvas.current;
    if (!element || !model) return;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    const id = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (element.width !== Math.round(size.width * dpr)) element.width = Math.round(size.width * dpr);
      if (element.height !== Math.round(size.height * dpr)) element.height = Math.round(size.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glow.current ??= document.createElement('canvas');
      const t = readTokens(element, TOKENS);
      const result = drawSky(ctx, model, {
        camera,
        width: size.width,
        height: size.height,
        layers,
        overlays,
        selected,
        featured,
        glow: glow.current,
        colours: { sky: t['--sky-bg'] || '#070b16', text: t['--sky-text'] || '#e2e8f5', muted: t['--sky-muted'] || '#9aa8c4', sun: t['--sun'] || '#fde68a' },
      });
      setDrawn(result);
      onDrawnRef.current?.(result);
    });
    return () => cancelAnimationFrame(id);
  }, [model, camera, size, layers, overlays, selected, featured, dark]);

  // The wheel zooms once the view has been clicked, so scrolling past it still scrolls the page.
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  });
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!engaged && !event.ctrlKey) return;
      event.preventDefault();
      const factor = Math.exp(clamp(event.deltaY / (event.deltaMode === 1 ? 12 : 400), -0.5, 0.5));
      setCamera({ ...cameraRef.current, fov: cameraRef.current.fov * factor });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  });

  const pointers = useRef(new Map<number, [number, number]>());
  const pinch = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  /** Radians per pixel near the centre of the view. */
  const radiansPerPixel = () => (4 * Math.tan(camera.fov / 4)) / size.width;

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    setEngaged(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.current.size === 1) drag.current = { x: event.clientX, y: event.clientY, moved: false };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a[0] - b[0], a[1] - b[1]);
      drag.current = null;
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const last = pointers.current.get(event.pointerId)!;
    pointers.current.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > 0) {
        setCamera({ ...camera, fov: (camera.fov * pinch.current) / d });
        pinch.current = d;
      }
      return;
    }
    const start = drag.current;
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) start.moved = true;
    if (!start.moved) return;
    const k = radiansPerPixel();
    setCamera({ ...camera, az: camera.az - (event.clientX - last[0]) * k, alt: camera.alt + (event.clientY - last[1]) * k });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const start = drag.current;
    if (start && !start.moved && pointers.current.size === 0 && drawn) {
      const box = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      let best: string | null = null;
      let bestScore = Infinity;
      for (const t of drawn.targets) {
        const d = Math.hypot(t.x - x, t.y - y);
        if (d > Math.max(14, t.r + 6)) continue;
        const score = d - t.priority * 0.05;
        if (score < bestScore) {
          bestScore = score;
          best = t.id;
        }
      }
      onSelect(best);
    }
    if (pointers.current.size === 0) drag.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.altKey || event.metaKey || event.ctrlKey) return;
    const step = camera.fov / 10;
    const keys: Record<string, () => SkyCamera> = {
      ArrowLeft: () => ({ ...camera, az: camera.az - step }),
      ArrowRight: () => ({ ...camera, az: camera.az + step }),
      ArrowUp: () => ({ ...camera, alt: camera.alt + step }),
      ArrowDown: () => ({ ...camera, alt: camera.alt - step }),
      '+': () => ({ ...camera, fov: camera.fov / 1.25 }),
      '=': () => ({ ...camera, fov: camera.fov / 1.25 }),
      '-': () => ({ ...camera, fov: camera.fov * 1.25 }),
      '_': () => ({ ...camera, fov: camera.fov * 1.25 }),
      Home: () => home,
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    setCamera(action());
  };

  const horizonMode = model?.mode === 'horizon';
  const where = horizonMode
    ? `Looking ${compassWord(camera.az)} (azimuth ${Math.round(((camera.az / DEG) + 360) % 360)}°), ${Math.round(camera.alt / DEG)}° ${camera.alt >= 0 ? 'above' : 'below'} the horizon`
    : `Centred ${Math.round(90 - camera.alt / DEG)}° from the chart’s pole`;
  const inView = drawn?.inView ?? [];
  const autoDescription = model
    ? `${where}; the view is ${Math.round(camera.fov / DEG)}° wide. ${
        inView.length ? `In view: ${inView.slice(0, 10).map((t) => t.name).join(', ')}.` : 'No bright named stars or planets in view.'
      }${drawn?.constellationsInView.length ? ` Constellations: ${drawn.constellationsInView.slice(0, 8).join(', ')}.` : ''}`
    : 'Loading the stars…';

  return (
    <div className={styles.sky}>
      <div
        ref={wrap}
        className={styles.view}
        tabIndex={0}
        role="group"
        aria-roledescription="sky view"
        aria-label={label}
        aria-describedby={`${descriptionId} ${helpId}`}
        onKeyDown={onKeyDown}
      >
        <canvas
          ref={canvas}
          className={styles.canvas}
          style={{ height: size.height }}
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setEngaged(false)}
        />
        {!model && <p className={styles.loading}>Loading the stars…</p>}
        {overlay && <div className={styles.overlay}>{overlay}</div>}
        <div className={styles.zoomButtons}>
          <button type="button" onClick={() => setCamera({ ...camera, fov: camera.fov / 1.5 })} disabled={camera.fov <= minFov + 1e-9} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => setCamera({ ...camera, fov: camera.fov * 1.5 })} disabled={camera.fov >= maxFov - 1e-9} aria-label="Zoom out">
            −
          </button>
        </div>
      </div>
      <p id={descriptionId} className="visually-hidden" aria-live="polite">
        {description ? `${description} ` : ''}
        {autoDescription}
      </p>
      {inViewButtons && inView.length > 0 && (
        <div className={styles.inView} role="group" aria-label="In view">
          <span className={styles.inViewLabel}>In view:</span>
          {inView.slice(0, 8).map((t) => (
            <button key={t.id} type="button" aria-pressed={selected === t.id} onClick={() => onSelect(selected === t.id ? null : t.id)}>
              {t.name}
            </button>
          ))}
        </div>
      )}
      <p id={helpId} className={styles.help}>
        Drag to look around; pinch, or click the view and scroll, to zoom; click a star or planet to pick it. With the keyboard: focus the view,
        then use the arrow keys to look around, <kbd>+</kbd> and <kbd>−</kbd> to zoom, and <kbd>Home</kbd> to look back.
      </p>
    </div>
  );
}
