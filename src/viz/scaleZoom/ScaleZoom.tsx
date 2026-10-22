import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ZOOM_CAMERA, ZOOM_MAX, ZOOM_MIN, type ZoomObject } from '../../core/scale/catalogue';
import { formatLength } from '../../core/scale/format';
import { clamp } from '../../core/math/angles';
import { powerOfTen } from '../../core/math/scientific';
import { fadeWindow } from '../../core/scale/zoom';
import { readTokens, useDarkMode } from '../hooks';
import { drawZoom, hitTest, makeZoomScene, type Drawn, type ZoomColours } from './draw';
import styles from './ScaleZoom.module.css';

/**
 * The scale zoom: a log-scale camera from a view 1 m across to one 10²¹ m
 * across, over a catalogue of real objects. Zoom with the slider (arrows,
 * Page Up and Page Down, Home and End), the ×10 buttons, the mouse wheel once
 * the view has been clicked, or a pinch. Click or tap an object to pick it.
 */

interface ScaleZoomProps {
  objects: readonly ZoomObject[];
  power: number;
  onPower: (power: number) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** Called when the reader starts zooming by hand, so a tour can stop. */
  onManual?: () => void;
}

const TOKENS = ['--sky-bg', '--sky-text', '--sky-muted', '--sky-grid', '--sun'] as const;

export function ScaleZoom({ objects, power, onPower, selected, onSelect, onManual }: ScaleZoomProps) {
  const scene = useMemo(() => makeZoomScene(objects, ZOOM_CAMERA), [objects]);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawnRef = useRef<Drawn[]>([]);
  const [size, setSize] = useState({ width: 640, height: 360 });
  const [engaged, setEngaged] = useState(false);
  const dark = useDarkMode();
  const sliderId = useId();
  const hintId = useId();

  const set = (p: number) => onPower(clamp(Math.round(p * 100) / 100, ZOOM_MIN, ZOOM_MAX));
  const zoomTo = (p: number) => {
    onManual?.();
    set(p);
  };

  // Keep the canvas the size of its box.
  useEffect(() => {
    const element = wrap.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(200, Math.round(entry.contentRect.width));
      setSize({ width, height: Math.round(clamp(width * 0.56, 260, 460)) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Draw whenever anything changes.
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    const id = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(size.width * dpr);
      element.height = Math.round(size.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = readTokens(element, TOKENS);
      const colours: ZoomColours = {
        sky: t['--sky-bg'] || '#070b16',
        text: t['--sky-text'] || '#e2e8f5',
        muted: t['--sky-muted'] || '#9aa8c4',
        grid: t['--sky-grid'] || '#2a3a5e',
        sun: t['--sun'] || '#fde68a',
        highlight: '#ffd166',
      };
      drawnRef.current = drawZoom(ctx, scene, power, size.width, size.height, colours, selected);
    });
    return () => cancelAnimationFrame(id);
  }, [scene, power, size, selected, dark]);

  // The wheel zooms once the view has been clicked, so scrolling past the figure still scrolls the page.
  const powerRef = useRef(power);
  useEffect(() => {
    powerRef.current = power;
  });
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!engaged && !event.ctrlKey) return;
      event.preventDefault();
      onManual?.();
      const decades = clamp(event.deltaY / (event.deltaMode === 1 ? 12 : 400), -0.5, 0.5);
      set(powerRef.current + decades);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  });

  // Pinch to zoom.
  const pointers = useRef(new Map<number, [number, number]>());
  const pinch = useRef<number | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    setEngaged(true);
    pointers.current.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.current.size === 1) down.current = { x: event.clientX, y: event.clientY };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a[0] - b[0], a[1] - b[1]);
      down.current = null;
    }
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > 0) {
        onManual?.();
        set(powerRef.current - Math.log10(d / pinch.current));
        pinch.current = d;
      }
    }
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const start = down.current;
    if (start && pointers.current.size === 0 && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) {
      const box = event.currentTarget.getBoundingClientRect();
      onSelect(hitTest(drawnRef.current, event.clientX - box.left, event.clientY - box.top));
    }
    if (pointers.current.size === 0) down.current = null;
  };

  const onSliderKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = event.key === 'PageUp' ? 1 : event.key === 'PageDown' ? -1 : 0;
    if (step) {
      event.preventDefault();
      zoomTo(Math.round(power) === power ? power + step : step > 0 ? Math.ceil(power) : Math.floor(power));
    }
  };

  const visible = objects
    .filter((o) => fadeWindow(power, o.label[0], o.label[1]) > 0.5)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);
  const width = 10 ** power;

  return (
    <div className={styles.zoom}>
      <div ref={wrap} className={styles.view}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          style={{ height: size.height }}
          role="img"
          aria-label={`A view ${formatLength(width)} across (about ${powerOfTen(Math.round(power))} m). In view: ${visible.map((o) => o.name).join(', ') || 'empty space'}.`}
          aria-describedby={hintId}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => {
            pointers.current.clear();
            pinch.current = null;
            setEngaged(false);
          }}
        />
        <div className={styles.counter} aria-hidden="true">
          <span className={styles.times}>×10</span>
          <span className={styles.count}>{power.toFixed(1)}</span>
        </div>
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.step} onClick={() => zoomTo(power - 1)} disabled={power <= ZOOM_MIN} aria-label="÷10: zoom in ten times">
          ÷10
        </button>
        <label htmlFor={sliderId} className={styles.sliderLabel}>
          Zoom
        </label>
        <input
          id={sliderId}
          className={styles.slider}
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.05}
          value={power}
          onChange={(e) => zoomTo(Number(e.target.value))}
          onKeyDown={onSliderKey}
          aria-valuetext={`10 to the power ${power.toFixed(1)} metres across: ${formatLength(width)}`}
        />
        <button type="button" className={styles.step} onClick={() => zoomTo(power + 1)} disabled={power >= ZOOM_MAX} aria-label="×10: zoom out ten times">
          ×10
        </button>
      </div>
      <p className={styles.readout}>
        <span>
          View: <b>{formatLength(width)}</b> across
        </span>
        <span className={styles.sci}>
          = 10<sup>{power.toFixed(1)}</sup> m, {power.toFixed(1)} steps of ×10 from 1 m
        </span>
      </p>
      <p id={hintId} className={styles.hint}>
        Use the slider, or <kbd>Page Up</kbd> and <kbd>Page Down</kbd> on it for whole steps of ×10. Click the view, then scroll to zoom; on a touch
        screen, pinch. Click or tap anything to see how big it is.
      </p>
      {visible.length > 0 && (
        <div className={styles.inView}>
          <span className={styles.inViewLabel} id={`${sliderId}-in-view`}>
            In view:
          </span>
          <ul aria-labelledby={`${sliderId}-in-view`}>
            {visible.map((o) => (
              <li key={o.id}>
                <button type="button" aria-pressed={selected === o.id} onClick={() => onSelect(selected === o.id ? null : o.id)}>
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
