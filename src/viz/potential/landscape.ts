import type * as THREE from 'three';
import type { Grid } from '../../core/math/contour';
import { contourLines } from '../../core/math/contour';
import type { SceneContext, SceneController, SceneFactory } from '../scene3d/engine';

/**
 * The potential view in 3D: a potential as a landscape, deeper where it is
 * lower, like terrain a marble rolls on. Wells too deep to show are cut off at
 * a floor. The figure adds markers (stars, Lagrange points) and a path draped
 * on the surface. World units: the grid's own across, and the depth scaled to
 * `depth` world units from the top of the view to the floor.
 */

export interface LandscapeMarker {
  id: string;
  label: string;
  x: number;
  y: number;
  /** A sphere's radius in grid units, or 0 for a small dot. */
  r?: number;
  color: string;
  emphasis?: boolean;
}

export interface LandscapeState {
  grid: Grid;
  /** Potentials below `floor` are cut off; `top` is the landscape's rim. */
  floor: number;
  top: number;
  /** The level drawn as a bright line on the surface (the Roche lobes' figure of eight). */
  highlight: number;
  /** Keep only the highlighted level's lines within this distance of the origin. */
  highlightWithin?: number;
  markers: readonly LandscapeMarker[];
  /** A path in the plane, draped on the surface. */
  path: readonly (readonly [number, number])[] | null;
}

/** How deep the floor is, in world units. */
const DEPTH = 0.9;

export const landscapeScene: SceneFactory<LandscapeState> = (ctx: SceneContext): SceneController<LandscapeState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);
  const surfaceMaterial = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
  const wireMaterial = new T.LineBasicMaterial({ color: '#8fa3c8', transparent: true, opacity: 0.22 });
  const highlightMaterial = new T.LineBasicMaterial({ color: '#f59e0b' });
  const pathMaterial = new T.LineBasicMaterial({ color: '#2dd4bf' });
  let built: THREE.Object3D[] = [];

  const clear = () => {
    for (const o of built) {
      root.remove(o);
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      if (m.material && !(m.material === surfaceMaterial || m.material === wireMaterial || m.material === highlightMaterial || m.material === pathMaterial)) {
        (m.material as THREE.Material).dispose();
      }
    }
    built = [];
  };

  return {
    update(state) {
      const { grid, floor, top } = state;
      const height = (phi: number) => -DEPTH * (Math.min(Math.max(phi, floor), top) - top) / (floor - top);
      const value = (i: number, j: number) => grid.values[j * grid.nx + i];
      const xAt = (i: number) => grid.x0 + ((grid.x1 - grid.x0) * i) / (grid.nx - 1);
      const yAt = (j: number) => grid.y0 + ((grid.y1 - grid.y0) * j) / (grid.ny - 1);
      clear();

      // The surface, coloured from deep blue in the wells to pale on the rim
      const positions = new Float32Array(grid.nx * grid.ny * 3);
      const colors = new Float32Array(grid.nx * grid.ny * 3);
      const deep = new T.Color('#1d3b8f');
      const rim = new T.Color('#c7d4ee');
      const c = new T.Color();
      for (let j = 0; j < grid.ny; j++) {
        for (let i = 0; i < grid.nx; i++) {
          const k = j * grid.nx + i;
          const z = height(value(i, j));
          positions.set([xAt(i), yAt(j), z], k * 3);
          c.copy(deep).lerp(rim, 1 + z / DEPTH);
          colors.set([c.r, c.g, c.b], k * 3);
        }
      }
      const index: number[] = [];
      for (let j = 0; j < grid.ny - 1; j++) {
        for (let i = 0; i < grid.nx - 1; i++) {
          const a = j * grid.nx + i;
          index.push(a, a + 1, a + grid.nx, a + 1, a + grid.nx + 1, a + grid.nx);
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      geometry.setIndex(index);
      const mesh = new T.Mesh(geometry, surfaceMaterial);
      root.add(mesh);
      built.push(mesh);

      // A light grid on the surface, every few samples, so its shape reads
      const wire: number[] = [];
      const every = Math.max(1, Math.round(grid.nx / 32));
      for (let j = 0; j < grid.ny; j += every) {
        for (let i = 0; i + every < grid.nx; i += every) wire.push(xAt(i), yAt(j), height(value(i, j)) + 0.002, xAt(i + every), yAt(j), height(value(i + every, j)) + 0.002);
      }
      for (let i = 0; i < grid.nx; i += every) {
        for (let j = 0; j + every < grid.ny; j += every) wire.push(xAt(i), yAt(j), height(value(i, j)) + 0.002, xAt(i), yAt(j + every), height(value(i, j + every)) + 0.002);
      }
      const wireGeometry = new T.BufferGeometry();
      wireGeometry.setAttribute('position', new T.Float32BufferAttribute(wire, 3));
      const wires = new T.LineSegments(wireGeometry, wireMaterial);
      root.add(wires);
      built.push(wires);

      // The highlighted level, lifted a little off the surface
      const lift = (x: number, y: number, phi: number) => [x, y, height(phi) + 0.01];
      const highlight: number[] = [];
      for (const line of contourLines(grid, state.highlight)) {
        if (state.highlightWithin !== undefined && !line.every(([x, y]) => Math.hypot(x, y) < state.highlightWithin!)) continue;
        for (let k = 1; k < line.length; k++) highlight.push(...lift(line[k - 1][0], line[k - 1][1], state.highlight), ...lift(line[k][0], line[k][1], state.highlight));
      }
      const highlightGeometry = new T.BufferGeometry();
      highlightGeometry.setAttribute('position', new T.Float32BufferAttribute(highlight, 3));
      const highlightLines = new T.LineSegments(highlightGeometry, highlightMaterial);
      root.add(highlightLines);
      built.push(highlightLines);

      // The path, draped on the surface by sampling the grid
      if (state.path && state.path.length > 1) {
        const sample = (x: number, y: number) => {
          const fi = ((x - grid.x0) / (grid.x1 - grid.x0)) * (grid.nx - 1);
          const fj = ((y - grid.y0) / (grid.y1 - grid.y0)) * (grid.ny - 1);
          const i = Math.min(grid.nx - 2, Math.max(0, Math.floor(fi)));
          const j = Math.min(grid.ny - 2, Math.max(0, Math.floor(fj)));
          const u = Math.min(1, Math.max(0, fi - i));
          const v = Math.min(1, Math.max(0, fj - j));
          const z = (a: number) => height(a);
          return (z(value(i, j)) * (1 - u) + z(value(i + 1, j)) * u) * (1 - v) + (z(value(i, j + 1)) * (1 - u) + z(value(i + 1, j + 1)) * u) * v;
        };
        const pts = state.path.map(([x, y]) => new T.Vector3(x, y, sample(x, y) + 0.015));
        const pathGeometry = new T.BufferGeometry().setFromPoints(pts);
        const path = new T.Line(pathGeometry, pathMaterial);
        root.add(path);
        built.push(path);
      }

      // Markers: spheres for the stars, dots for the Lagrange points, each labelled
      ctx.labels.clear();
      for (const m of state.markers) {
        const fi = Math.round(((m.x - grid.x0) / (grid.x1 - grid.x0)) * (grid.nx - 1));
        const fj = Math.round(((m.y - grid.y0) / (grid.y1 - grid.y0)) * (grid.ny - 1));
        const inside = fi >= 0 && fi < grid.nx && fj >= 0 && fj < grid.ny;
        const z = inside ? height(value(fi, fj)) : 0;
        const r = m.r && m.r > 0 ? m.r : 0.018;
        const sphere = new T.Mesh(new T.SphereGeometry(r, 24, 16), new T.MeshBasicMaterial({ color: m.color }));
        sphere.position.set(m.x, m.y, m.r ? -DEPTH + r : z + 0.02);
        root.add(sphere);
        built.push(sphere);
        ctx.labels.set(m.id, { text: m.label, position: [m.x, m.y, (m.r ? -DEPTH + 2 * r : z) + 0.06], priority: m.emphasis ? 90 : 50, emphasis: m.emphasis });
      }
      ctx.invalidate();
    },
    dispose() {
      clear();
      surfaceMaterial.dispose();
      wireMaterial.dispose();
      highlightMaterial.dispose();
      pathMaterial.dispose();
      ctx.labels.clear();
    },
  };
};
