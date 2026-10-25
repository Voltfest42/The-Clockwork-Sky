import type * as THREE from 'three';
import type { Vec3 } from '../../core/math/vec3';
import type { SceneContext, SceneController, SceneFactory } from '../../viz/scene3d/engine';

/**
 * The stars within 10 parsecs in 3D (Figure 9.2), in galactic axes with the
 * Sun at the centre: x towards the Galaxy's centre, z towards its north pole,
 * one scene unit a parsec. Each star is a round dot coloured by its class and
 * sized by how much light it gives out, on a stalk down to the galactic plane
 * so its height above or below it shows. Rings in the plane mark 2 to 10 pc.
 */

export interface NeighbourPoint {
  position: Vec3;
  colour: string;
  /** Dot size, CSS px. */
  size: number;
  /** A name to label, or null for none. */
  label: string | null;
  /** Higher-priority labels win when they overlap. */
  priority: number;
}

export interface NeighbourhoodState {
  points: readonly NeighbourPoint[];
  /** Which points show. */
  shown: readonly boolean[];
  selected: number | null;
  onPick: (index: number | null) => void;
}

const RINGS = [2, 4, 6, 8, 10];

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
      if (d > 0.5 || d < 0.36) discard;
      gl_FragColor = vec4(vColor, 1.0);
    } else {
      if (d > 0.5) discard;
      gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.38, 0.5, d));
    }
  }
`;

export const neighbourhoodScene: SceneFactory<NeighbourhoodState> = (ctx: SceneContext): SceneController<NeighbourhoodState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);
  const scale = Math.min(window.devicePixelRatio || 1, 2);

  const pointMaterial = (ring: boolean) =>
    new T.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uScale: { value: scale }, uRing: { value: ring ? 1 : 0 } },
      transparent: true,
      depthWrite: false,
    });

  // The galactic plane: rings every 2 parsecs, and a line towards the Galaxy's centre.
  const grid = new T.Group();
  root.add(grid);
  const gridMaterial = new T.LineBasicMaterial({ color: ctx.theme.grid });
  for (const r of RINGS) {
    const points: number[] = [];
    for (let i = 0; i < 128; i++) {
      const a = (2 * Math.PI * i) / 128;
      points.push(r * Math.cos(a), r * Math.sin(a), 0);
    }
    grid.add(new T.LineLoop(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3)), gridMaterial));
    ctx.labels.set(`ring-${r}`, { text: `${r} pc`, position: [r * Math.cos(-0.8), r * Math.sin(-0.8), 0], priority: 5, offset: [4, 4] });
  }
  grid.add(new T.Line(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 11, 0, 0], 3)), gridMaterial));
  ctx.labels.set('centre', { text: 'Towards the Galaxy’s centre', position: [11, 0, 0], priority: 30 });

  const sun = new T.Points(
    new T.BufferGeometry()
      .setAttribute('position', new T.Float32BufferAttribute([0, 0, 0], 3))
      .setAttribute('aColor', new T.Float32BufferAttribute(new T.Color(ctx.theme.sun).toArray(), 3))
      .setAttribute('aSize', new T.Float32BufferAttribute([11], 1)),
    pointMaterial(false),
  );
  root.add(sun);
  ctx.labels.set('sun', { text: 'Sun', position: [0, 0, 0], priority: 100, emphasis: true });

  let stars: THREE.Points | null = null;
  let stalks: THREE.LineSegments | null = null;
  const highlight = new T.Points(
    new T.BufferGeometry()
      .setAttribute('position', new T.Float32BufferAttribute([0, 0, 0], 3))
      .setAttribute('aColor', new T.Float32BufferAttribute([1, 1, 1], 3))
      .setAttribute('aSize', new T.Float32BufferAttribute([22], 1)),
    pointMaterial(true),
  );
  highlight.visible = false;
  root.add(highlight);

  let builtFor: readonly NeighbourPoint[] | null = null;
  let current: NeighbourhoodState | null = null;

  const build = (points: readonly NeighbourPoint[]) => {
    for (const old of [stars, stalks]) {
      if (!old) continue;
      root.remove(old);
      old.geometry.dispose();
    }
    const positions = new Float32Array(points.length * 3);
    const colours = new Float32Array(points.length * 3);
    const sizes = new Float32Array(points.length);
    const lines = new Float32Array(points.length * 6);
    const c = new T.Color();
    points.forEach((p, i) => {
      positions.set(p.position, 3 * i);
      c.set(p.colour).toArray(colours, 3 * i);
      sizes[i] = p.size;
      lines.set([p.position[0], p.position[1], p.position[2], p.position[0], p.position[1], 0], 6 * i);
    });
    stars = new T.Points(
      new T.BufferGeometry()
        .setAttribute('position', new T.BufferAttribute(positions, 3))
        .setAttribute('aColor', new T.BufferAttribute(colours, 3))
        .setAttribute('aSize', new T.BufferAttribute(sizes, 1)),
      pointMaterial(false),
    );
    stalks = new T.LineSegments(
      new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(lines, 3)),
      new T.LineBasicMaterial({ color: ctx.theme.grid, transparent: true, opacity: 0.6 }),
    );
    root.add(stalks, stars);
    builtFor = points;
  };

  return {
    update(state) {
      current = state;
      if (builtFor !== state.points) build(state.points);
      const size = stars!.geometry.getAttribute('aSize') as THREE.BufferAttribute;
      const stalkPositions = stalks!.geometry.getAttribute('position') as THREE.BufferAttribute;
      state.points.forEach((p, i) => {
        const on = state.shown[i];
        size.setX(i, on ? p.size : 0);
        // A hidden star's stalk shrinks to nothing.
        stalkPositions.setXYZ(2 * i, p.position[0], p.position[1], on ? p.position[2] : 0);
        if (p.label) ctx.labels.set(`star-${i}`, { text: p.label, position: p.position, priority: p.priority, visible: on, emphasis: state.selected === i });
      });
      size.needsUpdate = true;
      stalkPositions.needsUpdate = true;
      const picked = state.selected === null ? null : state.points[state.selected];
      highlight.visible = !!picked && state.shown[state.selected!];
      if (picked) {
        (highlight.geometry.getAttribute('position') as THREE.BufferAttribute).setXYZ(0, ...picked.position);
        highlight.geometry.getAttribute('position').needsUpdate = true;
      }
    },

    onClick(x, y, context) {
      if (!current) return;
      const v = new T.Vector3();
      let best = -1;
      let bestDistance = 14;
      current.points.forEach((p, i) => {
        if (!current!.shown[i]) return;
        v.set(...p.position).project(context.camera);
        if (v.z < -1 || v.z > 1) return;
        const sx = ((v.x + 1) / 2) * context.size.width;
        const sy = ((1 - v.y) / 2) * context.size.height;
        const d = Math.hypot(sx - x, sy - y);
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      current.onPick(best < 0 ? null : best);
    },

    onTheme(theme) {
      gridMaterial.color.set(theme.grid);
      if (stalks) (stalks.material as THREE.LineBasicMaterial).color.set(theme.grid);
    },

    dispose() {
      ctx.labels.clear();
    },
  };
};
