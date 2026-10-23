import * as THREE from 'three';
import type { Vec3 } from '../../core/math/vec3';
import {
  cameraKey,
  cameraPosition,
  DEFAULT_LIMITS,
  dragRotation,
  rotate,
  wheelZoom,
  zoom,
  type OrbitCameraState,
  type OrbitLimits,
} from './orbitCamera';
import styles from './Scene3D.module.css';

/**
 * The three.js side of Scene3D. This module is the only one that imports
 * three, and Scene3D loads it on demand, so pages without a 3D scene never
 * download it.
 *
 * A figure supplies a SceneFactory: given the context (three, the scene, the
 * camera, the theme, the label layer), it builds its objects and returns a
 * controller that the engine calls when the figure's state changes, on every
 * frame while the figure runs, and just before each render.
 */

export type ThreeModule = typeof THREE;

/** Colours from the design tokens, as CSS colour strings. Sky scenes stay night-dark in both themes. */
export interface SceneTheme {
  sky: string;
  text: string;
  muted: string;
  grid: string;
  sun: string;
  accent: string;
  series1: string;
  series2: string;
}

export interface SceneLabel {
  text: string;
  /** World position the label points at. */
  position: Vec3;
  /** Higher wins when labels overlap. */
  priority?: number;
  /** Hidden labels stay registered but aren't shown. */
  visible?: boolean;
  /** Shift on screen from the projected point, px. Defaults to just right of it. */
  offset?: readonly [number, number];
  /** Brighter, for the label of the thing the figure is about. */
  emphasis?: boolean;
}

export interface LabelLayer {
  set(id: string, label: SceneLabel): void;
  remove(id: string): void;
  clear(): void;
}

export interface SceneContext {
  THREE: ThreeModule;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  theme: SceneTheme;
  labels: LabelLayer;
  reducedMotion: boolean;
  /** The view's size in CSS pixels. */
  size: { width: number; height: number };
  getCamera(): OrbitCameraState;
  setCamera(state: OrbitCameraState): void;
  /** Asks for a new frame (scenes only render when something changed). */
  invalidate(): void;
  /** How many world units one pixel spans at a distance from the camera: for drawing things at a minimum on-screen size. */
  worldPerPixel(distance: number): number;
}

export interface SceneController<S> {
  /** The figure's state changed. */
  update?(state: S, ctx: SceneContext): void;
  /** Called every frame while the figure runs (and is on screen), with the time since the last frame in seconds. */
  frame?(dt: number, ctx: SceneContext): void;
  /** Just before each render, after the camera has moved: resize markers, adjust clipping planes. */
  beforeRender?(ctx: SceneContext): void;
  /** The theme changed (light or dark mode). */
  onTheme?(theme: SceneTheme, ctx: SceneContext): void;
  dispose?(): void;
}

export type SceneFactory<S> = (ctx: SceneContext) => SceneController<S>;

export interface EngineOptions {
  camera: OrbitCameraState;
  limits?: Partial<OrbitLimits>;
  reducedMotion: boolean;
  /** The reader turned or zoomed the camera. */
  onUserCamera?: (kind: 'rotate' | 'zoom') => void;
}

/** Reads the theme from the design tokens on an element. */
export function readTheme(element: Element): SceneTheme {
  const style = getComputedStyle(element);
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    sky: get('--sky-bg', '#070b16'),
    text: get('--sky-text', '#e2e8f5'),
    muted: get('--sky-muted', '#9aa8c4'),
    grid: get('--sky-grid', '#2a3a5e'),
    sun: get('--sun', '#fde68a'),
    accent: get('--accent', '#6b9bff'),
    series1: get('--series-1', '#4f84f5'),
    series2: get('--series-2', '#d97706'),
  };
}

/** Disposes every geometry, material and texture under an object. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
      m.dispose();
    }
  });
}

function sameLabel(a: SceneLabel, b: SceneLabel): boolean {
  return (
    a.text === b.text &&
    a.position[0] === b.position[0] &&
    a.position[1] === b.position[1] &&
    a.position[2] === b.position[2] &&
    (a.priority ?? 0) === (b.priority ?? 0) &&
    (a.visible ?? true) === (b.visible ?? true) &&
    !!a.emphasis === !!b.emphasis &&
    (a.offset?.[0] ?? 8) === (b.offset?.[0] ?? 8) &&
    (a.offset?.[1] ?? -8) === (b.offset?.[1] ?? -8)
  );
}

class Labels implements LabelLayer {
  private readonly entries = new Map<string, { label: SceneLabel; element: HTMLSpanElement; width: number }>();

  private readonly host: HTMLElement;
  private readonly onChange: () => void;

  constructor(host: HTMLElement, onChange: () => void) {
    this.host = host;
    this.onChange = onChange;
  }

  set(id: string, label: SceneLabel) {
    let entry = this.entries.get(id);
    // Setting a label to what it already is does nothing, so a scene can set labels before every render without looping.
    if (entry && sameLabel(entry.label, label)) return;
    if (!entry) {
      const element = document.createElement('span');
      element.className = styles.label;
      this.host.appendChild(element);
      entry = { label, element, width: 0 };
      this.entries.set(id, entry);
    }
    if (entry.element.textContent !== label.text) {
      entry.element.textContent = label.text;
      entry.width = 0;
    }
    entry.element.classList.toggle(styles.emphasis, !!label.emphasis);
    entry.label = label;
    this.onChange();
  }

  remove(id: string) {
    this.entries.get(id)?.element.remove();
    this.entries.delete(id);
    this.onChange();
  }

  clear() {
    for (const entry of this.entries.values()) entry.element.remove();
    this.entries.clear();
    this.onChange();
  }

  /** Projects every label onto the screen and hides the ones that are behind the camera, off screen, or overlapped. */
  layout(camera: THREE.Camera, width: number, height: number) {
    const placed: [number, number, number, number][] = [];
    const v = new THREE.Vector3();
    const sorted = [...this.entries.values()].sort((a, b) => (b.label.priority ?? 0) - (a.label.priority ?? 0));
    for (const entry of sorted) {
      const { label, element } = entry;
      v.set(label.position[0], label.position[1], label.position[2]).project(camera);
      const [dx, dy] = label.offset ?? [8, -8];
      const x = ((v.x + 1) / 2) * width + dx;
      const y = ((1 - v.y) / 2) * height + dy;
      if (entry.width === 0) entry.width = element.offsetWidth || label.text.length * 7;
      const box: [number, number, number, number] = [x, y - 9, x + entry.width, y + 9];
      const show =
        label.visible !== false &&
        v.z > -1 &&
        v.z < 1 &&
        x > 0 &&
        x + entry.width < width &&
        y > 0 &&
        y < height &&
        !placed.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1]);
      element.style.display = show ? '' : 'none';
      if (show) {
        placed.push(box);
        element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y - 9)}px)`;
      }
    }
  }

  dispose() {
    this.clear();
  }
}

/**
 * One live 3D scene: renderer, camera and controls, an HTML label layer and a
 * render loop that runs only while something is moving and the view is on
 * screen.
 */
export class SceneEngine<S> {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-3, 1e3);
  private readonly labels: Labels;
  private readonly ctx: SceneContext;
  private readonly controller: SceneController<S>;
  private readonly limits: OrbitLimits;
  private orbit: OrbitCameraState;
  private home: OrbitCameraState;
  private running = false;
  private visible = true;
  private needsRender = true;
  private frameId: number | null = null;
  private lastTime: number | null = null;
  private readonly pointers = new Map<number, [number, number]>();
  private pinch: number | null = null;
  private readonly resizeObserver: ResizeObserver;
  private disposed = false;

  private readonly host: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly options: EngineOptions;

  constructor(host: HTMLElement, canvas: HTMLCanvasElement, labelHost: HTMLElement, factory: SceneFactory<S>, options: EngineOptions) {
    this.host = host;
    this.canvas = canvas;
    this.options = options;
    // Throws if WebGL isn't available; Scene3D shows its fallback then.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.camera.up.set(0, 0, 1);
    this.limits = { ...DEFAULT_LIMITS, ...options.limits };
    this.orbit = options.camera;
    this.home = options.camera;
    this.labels = new Labels(labelHost, () => this.invalidate());
    const theme = readTheme(host);
    this.renderer.setClearColor(theme.sky);

    this.ctx = {
      THREE,
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      theme,
      labels: this.labels,
      reducedMotion: options.reducedMotion,
      size: { width: 1, height: 1 },
      getCamera: () => this.orbit,
      setCamera: (state) => {
        this.orbit = { ...state, distance: Math.min(Math.max(state.distance, this.limits.minDistance), this.limits.maxDistance) };
        this.invalidate();
      },
      invalidate: () => this.invalidate(),
      worldPerPixel: (distance) => (2 * distance * Math.tan((this.camera.fov * Math.PI) / 360)) / Math.max(1, this.ctx.size.height),
    };

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.controller = factory(this.ctx);
    this.invalidate();
  }

  setState(state: S) {
    this.controller.update?.(state, this.ctx);
    this.invalidate();
  }

  setRunning(running: boolean) {
    this.running = running;
    this.lastTime = null;
    this.invalidate();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.lastTime = null;
    if (visible) this.invalidate();
  }

  setReducedMotion(reduced: boolean) {
    this.ctx.reducedMotion = reduced;
  }

  refreshTheme() {
    const theme = readTheme(this.host);
    this.ctx.theme = theme;
    this.renderer.setClearColor(theme.sky);
    this.controller.onTheme?.(theme, this.ctx);
    this.invalidate();
  }

  /** Puts the camera back where it started, or at a new home. */
  resetCamera(home?: OrbitCameraState) {
    if (home) this.home = home;
    this.orbit = this.home;
    this.invalidate();
  }

  /** A key pressed while the view has focus. Returns true if it was a camera key. */
  handleKey(key: string): boolean {
    if (key === 'Home') {
      this.resetCamera();
      return true;
    }
    const next = cameraKey(this.orbit, key, this.limits);
    if (!next) return false;
    this.options.onUserCamera?.(next.distance !== this.orbit.distance ? 'zoom' : 'rotate');
    this.orbit = next;
    this.invalidate();
    return true;
  }

  invalidate() {
    this.needsRender = true;
    this.schedule();
  }

  dispose() {
    this.disposed = true;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.controller.dispose?.();
    disposeTree(this.scene);
    this.labels.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private schedule() {
    if (this.disposed || this.frameId !== null || !this.visible) return;
    if (!this.needsRender && !this.running) return;
    this.frameId = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number) => {
    this.frameId = null;
    if (this.disposed || !this.visible) return;
    if (this.running) {
      const dt = this.lastTime === null ? 0 : Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.controller.frame?.(dt, this.ctx);
      this.needsRender = true;
    }
    if (this.needsRender) this.render();
    this.schedule();
  };

  private render() {
    this.needsRender = false;
    const [x, y, z] = cameraPosition(this.orbit);
    this.camera.position.set(x, y, z);
    this.camera.near = this.orbit.distance * 1e-3;
    this.camera.far = this.orbit.distance * 1e4;
    this.camera.lookAt(this.orbit.target[0], this.orbit.target[1], this.orbit.target[2]);
    this.camera.updateProjectionMatrix();
    this.controller.beforeRender?.(this.ctx);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);
    this.labels.layout(this.camera, this.ctx.size.width, this.ctx.size.height);
  }

  private resize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.ctx.size = { width, height };
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    // Clicking the view gives it focus, so the keys and the wheel work at once.
    this.host.focus({ preventScroll: true });
    this.canvas.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = Math.hypot(a[0] - b[0], a[1] - b[1]);
    }
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    const last = this.pointers.get(event.pointerId);
    if (!last) return;
    const now: [number, number] = [event.clientX, event.clientY];
    this.pointers.set(event.pointerId, now);
    if (this.pointers.size === 1) {
      const [dAz, dEl] = dragRotation(now[0] - last[0], now[1] - last[1], this.ctx.size.height);
      this.orbit = rotate(this.orbit, dAz, dEl, this.limits);
      this.options.onUserCamera?.('rotate');
      this.invalidate();
    } else if (this.pointers.size === 2 && this.pinch) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > 0) {
        this.orbit = zoom(this.orbit, this.pinch / d, this.limits);
        this.pinch = d;
        this.options.onUserCamera?.('zoom');
        this.invalidate();
      }
    }
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
  };

  /** The wheel zooms only when the view has focus (or with Ctrl), so scrolling past the figure still scrolls the page. */
  private readonly onWheel = (event: WheelEvent) => {
    if (document.activeElement !== this.host && !event.ctrlKey) return;
    event.preventDefault();
    this.orbit = zoom(this.orbit, wheelZoom(event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY), this.limits);
    this.options.onUserCamera?.('zoom');
    this.invalidate();
  };
}
