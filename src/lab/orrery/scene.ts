import type * as THREE from 'three';
import type { Vec3 } from '../../core/math/vec3';
import { disposeTree, type SceneContext, type SceneController, type SceneFactory } from '../../viz/scene3d/engine';
import type { ViewModel } from './TopView';

/**
 * The Orrery in 3D (Scene3D): the same bodies, trails and Lagrange points as
 * the top-down view, in the same frame, with the x–y plane (the ecliptic, for
 * the Solar System) drawn as rings. One scene unit is `unit` AU, so every
 * system fills the view at the start. Bodies are dots at least a few pixels
 * across; click one to pick it.
 */

export interface OrreryScene3DState {
  model: ViewModel;
  /** Changes whenever the model has changed. */
  version: number;
  /** AU per scene unit. */
  unit: number;
  /** The rings' spacing, AU. */
  ring: number;
  onPick: (id: string | null) => void;
}

const VERTEX = `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uScale;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_PointSize = aSize * uScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  varying vec3 vColor;
  uniform float uRing;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (uRing > 0.5) {
      if (d > 0.5 || d < 0.38) discard;
      gl_FragColor = vec4(vColor, 1.0);
    } else {
      if (d > 0.5) discard;
      gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.4, 0.5, d));
    }
  }
`;

export const orreryScene: SceneFactory<OrreryScene3DState> = (ctx: SceneContext): SceneController<OrreryScene3DState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const material = (ring: boolean) =>
    new T.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms: { uScale: { value: ratio }, uRing: { value: ring ? 1 : 0 } }, transparent: true, depthWrite: false });

  const grid = new T.Group();
  root.add(grid);
  const gridMaterial = new T.LineBasicMaterial({ color: ctx.theme.grid });
  let gridFor = '';

  let bodies: THREE.Points | null = null;
  const trails = new T.Group();
  root.add(trails);
  const highlight = new T.Points(
    new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0], 3)).setAttribute('aColor', new T.Float32BufferAttribute([1, 1, 1], 3)).setAttribute('aSize', new T.Float32BufferAttribute([20], 1)),
    material(true),
  );
  highlight.visible = false;
  root.add(highlight);
  const lagrange = new T.Group();
  root.add(lagrange);
  let current: OrreryScene3DState | null = null;
  let labelled = new Set<string>();

  const scaled = (p: Vec3, unit: number): Vec3 => [p[0] / unit, p[1] / unit, p[2] / unit];

  const buildGrid = (ring: number, unit: number) => {
    const key = `${ring}/${unit}`;
    if (key === gridFor) return;
    gridFor = key;
    for (const child of [...grid.children]) {
      grid.remove(child);
      disposeTree(child);
    }
    for (let k = 1; k <= 4; k++) {
      const r = (k * ring) / unit;
      const points: number[] = [];
      for (let i = 0; i < 128; i++) {
        const a = (2 * Math.PI * i) / 128;
        points.push(r * Math.cos(a), r * Math.sin(a), 0);
      }
      grid.add(new T.LineLoop(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3)), gridMaterial));
    }
  };

  return {
    update(state) {
      current = state;
      const { model, unit } = state;
      buildGrid(state.ring, unit);

      // Bodies.
      if (bodies) {
        root.remove(bodies);
        bodies.geometry.dispose();
      }
      const n = model.bodies.length;
      const positions = new Float32Array(3 * n);
      const colours = new Float32Array(3 * n);
      const sizes = new Float32Array(n);
      const c = new T.Color();
      model.bodies.forEach((b, i) => {
        positions.set(scaled(b.p, unit), 3 * i);
        c.set(b.colour).toArray(colours, 3 * i);
        sizes[i] = b.gm === 0 ? 4 : 7;
      });
      bodies = new T.Points(
        new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(positions, 3)).setAttribute('aColor', new T.BufferAttribute(colours, 3)).setAttribute('aSize', new T.BufferAttribute(sizes, 1)),
        material(false),
      );
      root.add(bodies);

      // Trails, one line each.
      for (const child of [...trails.children]) {
        trails.remove(child);
        (child as THREE.Line).geometry.dispose();
        ((child as THREE.Line).material as THREE.Material).dispose();
      }
      for (const b of model.bodies) {
        const t = model.trails.get(b.id);
        if (!t || t.length < 8) continue;
        const pts = new Float32Array((t.length / 4 + 1) * 3);
        for (let k = 0; k < t.length / 4; k++) pts.set([t[4 * k + 1] / unit, t[4 * k + 2] / unit, t[4 * k + 3] / unit], 3 * k);
        pts.set(scaled(b.p, unit), pts.length - 3);
        trails.add(new T.Line(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(pts, 3)), new T.LineBasicMaterial({ color: b.colour, transparent: true, opacity: 0.6 })));
      }

      // Labels: the heaviest bodies win when they overlap.
      const seen = new Set<string>();
      const byMass = [...model.bodies].sort((a, b) => b.gm - a.gm);
      byMass.forEach((b, rank) => {
        seen.add(b.id);
        ctx.labels.set(`body-${b.id}`, { text: b.name, position: scaled(b.p, unit), priority: b.id === model.selected ? 1000 : 100 - rank, emphasis: b.id === model.selected });
      });
      for (const id of labelled) if (!seen.has(id)) ctx.labels.remove(`body-${id}`);
      labelled = seen;

      const picked = model.bodies.find((b) => b.id === model.selected);
      highlight.visible = !!picked;
      if (picked) {
        (highlight.geometry.getAttribute('position') as THREE.BufferAttribute).setXYZ(0, ...scaled(picked.p, unit));
        highlight.geometry.getAttribute('position').needsUpdate = true;
      }

      // Lagrange points, as small crosses in the plane.
      for (const child of [...lagrange.children]) {
        lagrange.remove(child);
        disposeTree(child);
      }
      for (let k = 1; k <= 5; k++) ctx.labels.remove(`lagrange-${k}`);
      model.lagrange?.forEach((p, k) => {
        const x = p.x / unit;
        const y = p.y / unit;
        const s = 0.03;
        lagrange.add(
          new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([x - s, y, 0, x + s, y, 0, x, y - s, 0, x, y + s, 0], 3)), new T.LineBasicMaterial({ color: ctx.theme.muted })),
        );
        ctx.labels.set(`lagrange-${k + 1}`, { text: p.name, position: [x, y, 0], priority: 50 });
      });
      ctx.invalidate();
    },

    onClick(x, y, context) {
      if (!current) return;
      const v = new T.Vector3();
      let best: string | null = null;
      let bestDistance = 16;
      for (const b of current.model.bodies) {
        v.set(...scaled(b.p, current.unit)).project(context.camera);
        if (v.z < -1 || v.z > 1) continue;
        const d = Math.hypot(((v.x + 1) / 2) * context.size.width - x, ((1 - v.y) / 2) * context.size.height - y);
        if (d < bestDistance) {
          bestDistance = d;
          best = b.id;
        }
      }
      current.onPick(best);
    },

    onTheme(theme) {
      gridMaterial.color.set(theme.grid);
    },

    dispose() {
      ctx.labels.clear();
      disposeTree(root);
    },
  };
};
