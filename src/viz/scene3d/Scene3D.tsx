import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useDarkMode, useOnScreen, useReducedMotion } from '../hooks';
import type { OrbitCameraState, OrbitLimits } from './orbitCamera';
import type { SceneEngine, SceneFactory } from './engine';
import styles from './Scene3D.module.css';

/**
 * A 3D view, drawn with three.js. three.js is loaded only when a Scene3D first
 * comes near the screen, and only by pages that have one.
 *
 * The figure owns its state and passes it in; the scene's controller (from
 * `factory`, a stable module-level function) turns that state into objects.
 * Turn the camera by dragging or with the arrow keys, zoom with the wheel (once
 * the view has focus), a pinch, or + and −; Home puts the camera back. The view
 * renders only when something changes, pauses off screen, and never plays by
 * itself: `running` comes from the figure, which respects reduced motion.
 */

interface Scene3DProps<S> {
  /** What the view is, for screen readers: "3D view of the Solar System". */
  label: string;
  /** What the view shows right now, in words. Read by screen readers in place of the picture. */
  description: string;
  factory: SceneFactory<S>;
  state: S;
  /** Whether the controller's frame() runs every frame (while on screen). */
  running?: boolean;
  /** Where the camera starts, and where Home and `cameraReset` put it back. */
  camera: OrbitCameraState;
  limits?: Partial<OrbitLimits>;
  /** Changing this puts the camera back at `camera` (for the figure's Reset). */
  cameraReset?: number;
  onUserCamera?: (kind: 'rotate' | 'zoom') => void;
  /** Height of the view, as a CSS length. */
  height?: string;
  /** Shown over the view's corner, e.g. a clock. */
  overlay?: ReactNode;
}

export function Scene3D<S>({
  label,
  description,
  factory,
  state,
  running = false,
  camera,
  limits,
  cameraReset = 0,
  onUserCamera,
  height = 'clamp(280px, 56vw, 480px)',
  overlay,
}: Scene3DProps<S>) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const engine = useRef<SceneEngine<S> | null>(null);
  const near = useOnScreen(host, '400px');
  const onScreen = useOnScreen(host, '0px');
  const reducedMotion = useReducedMotion();
  const dark = useDarkMode();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const requested = useRef(false);
  const [engineModule, setEngineModule] = useState<typeof import('./engine') | null>(null);
  const descriptionId = useId();
  const helpId = useId();

  // The latest props, for the engine's callbacks and its first state.
  const latest = useRef({ state, camera, limits, onUserCamera, reducedMotion });
  useEffect(() => {
    latest.current = { state, camera, limits, onUserCamera, reducedMotion };
  });

  // Load three.js once the view comes near the screen.
  useEffect(() => {
    if (!near || requested.current) return;
    requested.current = true;
    import('./engine')
      .then((module) => setEngineModule(() => module))
      .catch(() => setFailed(true));
  }, [near]);

  // Build the scene once three.js has arrived.
  useEffect(() => {
    if (!engineModule || !host.current || !canvas.current || !labelLayer.current) return;
    let created: SceneEngine<S>;
    try {
      const initial = latest.current;
      created = new engineModule.SceneEngine<S>(host.current, canvas.current, labelLayer.current, factory, {
        camera: initial.camera,
        limits: initial.limits,
        reducedMotion: initial.reducedMotion,
        onUserCamera: (kind) => latest.current.onUserCamera?.(kind),
      });
      created.setState(initial.state);
    } catch (error) {
      console.warn('The 3D view could not start:', error);
      queueMicrotask(() => setFailed(true));
      return;
    }
    engine.current = created;
    queueMicrotask(() => setReady(true));
    return () => {
      created.dispose();
      engine.current = null;
      setReady(false);
    };
  }, [engineModule, factory]);

  useEffect(() => {
    engine.current?.setState(state);
  }, [state, ready]);

  useEffect(() => {
    engine.current?.setRunning(running);
  }, [running, ready]);

  useEffect(() => {
    engine.current?.setVisible(onScreen);
  }, [onScreen, ready]);

  useEffect(() => {
    engine.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion, ready]);

  useEffect(() => {
    engine.current?.refreshTheme();
  }, [dark, ready]);

  useEffect(() => {
    if (cameraReset) engine.current?.resetCamera(latest.current.camera);
  }, [cameraReset]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.altKey || event.metaKey || event.ctrlKey) return;
    if (engine.current?.handleKey(event.key)) event.preventDefault();
  };

  return (
    <div className={styles.wrap}>
      <div
        ref={host}
        className={styles.view}
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-roledescription="3D view"
        aria-label={label}
        aria-describedby={`${descriptionId} ${helpId}`}
        onKeyDown={onKeyDown}
      >
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <div ref={labelLayer} className={styles.labels} aria-hidden="true" />
        {!ready && (
          <p className={styles.status}>
            {failed
              ? 'Your browser couldn’t start the 3D view (it needs WebGL). The description below says what it shows.'
              : 'Loading the 3D view…'}
          </p>
        )}
        {overlay && <div className={styles.overlay}>{overlay}</div>}
      </div>
      <p id={descriptionId} className={failed ? styles.fallbackText : 'visually-hidden'}>
        {description}
      </p>
      <p id={helpId} className={styles.help}>
        Drag to turn the view; pinch, or click it and scroll, to zoom. With the keyboard: focus the view, then use the arrow keys to turn,{' '}
        <kbd>+</kbd> and <kbd>−</kbd> to zoom, and <kbd>Home</kbd> to put the camera back.
      </p>
    </div>
  );
}
