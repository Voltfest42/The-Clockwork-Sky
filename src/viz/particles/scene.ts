import type * as THREE from 'three';
import type { Vec3 } from '../../core/math/vec3';
import type { SceneContext, SceneController, SceneFactory } from '../scene3d/engine';
import { rgb } from './colour';

/**
 * The particle view (Chapters 30 and 31, and the Orrery's many-body modes):
 * up to about 100,000 stars as round WebGL points with a custom shader, each
 * with its own colour and size in CSS pixels, drawn through Scene3D (so it
 * gets the keyboard camera, the description and the WebGL fallback). Rings,
 * lines and marked points with labels sit on top, for Jacobi radii, the Sun's
 * place or the way to the Galaxy's centre.
 *
 * Positions are in the scene's own units (pc for a cluster, kpc for a
 * galaxy), z up. A figure that moves its stars passes new position arrays of
 * the same length; they are copied into the existing buffers.
 */

export interface ParticleRing {
  centre: Vec3;
  radius: number;
  colour: string;
  /** Tilted rings: the unit normal of the ring's plane (default z). */
  normal?: Vec3;
  dashed?: boolean;
}

export interface ParticleMarker {
  position: Vec3;
  colour: string;
  /** CSS px. */
  size: number;
  /** Drawn as a hollow ring rather than a dot. */
  hollow?: boolean;
}

export interface ParticleLine {
  points: readonly Vec3[];
  colour: string;
  dashed?: boolean;
}

export interface ParticleLabel {
  text: string;
  position: Vec3;
  priority?: number;
  emphasis?: boolean;
  /** Shift on screen, px (default just right of the point). */
  offset?: readonly [number, number];
}

/** Things drawn over the stars. Rebuilt whenever the object changes identity, so figures memoise it. */
export interface ParticleOverlay {
  rings?: readonly ParticleRing[];
  markers?: readonly ParticleMarker[];
  lines?: readonly ParticleLine[];
  labels?: readonly ParticleLabel[];
}

export interface ParticleState {
  /** x₀, y₀, z₀, x₁, … in scene units. */
  positions: Float32Array;
  /** r, g, b per point, 0–1 (sRGB). */
  colours: Float32Array;
  /** Point sizes in CSS px, per point. */
  sizes: Float32Array;
  /** Brightness of each dot's centre, 0–1 (default 1): fainter for dense clouds, so overlaps add up. */
  opacity?: number;
  /** Add overlapping points' light (a glowing galaxy) rather than drawing them over each other (a cluster). */
  additive?: boolean;
  overlay?: ParticleOverlay;
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
  uniform float uOpacity;
  uniform float uHollow;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    if (uHollow > 0.5) {
      if (d < 0.36) discard;
      gl_FragColor = vec4(vColor, 1.0);
      return;
    }
    gl_FragColor = vec4(vColor, uOpacity * (1.0 - smoothstep(0.3, 0.5, d)));
  }
`;

export const particleScene: SceneFactory<ParticleState> = (ctx: SceneContext): SceneController<ParticleState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);
  const scale = Math.min(window.devicePixelRatio || 1, 2);

  const material = (hollow: boolean) =>
    new T.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uScale: { value: scale }, uOpacity: { value: 1 }, uHollow: { value: hollow ? 1 : 0 } },
      transparent: true,
      depthWrite: false,
    });

  const starMaterial = material(false);
  let stars: THREE.Points | null = null;
  const overlay = new T.Group();
  root.add(overlay);
  let shownOverlay: ParticleOverlay | undefined;
  let labelIds: string[] = [];

  const buildStars = (state: ParticleState) => {
    if (stars) {
      root.remove(stars);
      stars.geometry.dispose();
    }
    const geometry = new T.BufferGeometry()
      .setAttribute('position', new T.BufferAttribute(Float32Array.from(state.positions), 3).setUsage(T.DynamicDrawUsage))
      .setAttribute('aColor', new T.BufferAttribute(Float32Array.from(state.colours), 3).setUsage(T.DynamicDrawUsage))
      .setAttribute('aSize', new T.BufferAttribute(Float32Array.from(state.sizes), 1).setUsage(T.DynamicDrawUsage));
    stars = new T.Points(geometry, starMaterial);
    stars.frustumCulled = false;
    root.add(stars);
  };

  const copy = (name: string, values: Float32Array) => {
    const attribute = stars!.geometry.getAttribute(name) as THREE.BufferAttribute;
    (attribute.array as Float32Array).set(values);
    attribute.needsUpdate = true;
  };

  const buildOverlay = (o: ParticleOverlay | undefined) => {
    for (const child of [...overlay.children]) {
      overlay.remove(child);
      const node = child as THREE.Line | THREE.Points;
      node.geometry.dispose();
      (node.material as THREE.Material).dispose();
    }
    for (const id of labelIds) ctx.labels.remove(id);
    labelIds = [];
    if (!o) return;
    for (const ring of o.rings ?? []) {
      const n = ring.normal ?? [0, 0, 1];
      // Two axes in the ring's plane
      const u = Math.abs(n[2]) < 0.9 ? new T.Vector3(n[1], -n[0], 0).normalize() : new T.Vector3(1, 0, 0);
      const w = new T.Vector3(...n).cross(u).normalize();
      const points: number[] = [];
      for (let i = 0; i < 160; i++) {
        const a = (2 * Math.PI * i) / 160;
        const c = Math.cos(a) * ring.radius;
        const s = Math.sin(a) * ring.radius;
        points.push(ring.centre[0] + c * u.x + s * w.x, ring.centre[1] + c * u.y + s * w.y, ring.centre[2] + c * u.z + s * w.z);
      }
      const line = new T.LineLoop(
        new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3)),
        ring.dashed ? new T.LineDashedMaterial({ color: ring.colour, dashSize: ring.radius / 20, gapSize: ring.radius / 30 }) : new T.LineBasicMaterial({ color: ring.colour }),
      );
      if (ring.dashed) line.computeLineDistances();
      overlay.add(line);
    }
    for (const l of o.lines ?? []) {
      const line = new T.Line(
        new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(l.points.flatMap((p) => [...p]), 3)),
        l.dashed ? new T.LineDashedMaterial({ color: l.colour, dashSize: 0.5, gapSize: 0.4 }) : new T.LineBasicMaterial({ color: l.colour }),
      );
      if (l.dashed) line.computeLineDistances();
      overlay.add(line);
    }
    for (const m of o.markers ?? []) {
      const point = new T.Points(
        new T.BufferGeometry()
          .setAttribute('position', new T.Float32BufferAttribute([...m.position], 3))
          .setAttribute('aColor', new T.Float32BufferAttribute(rgb(m.colour), 3))
          .setAttribute('aSize', new T.Float32BufferAttribute([m.size], 1)),
        material(!!m.hollow),
      );
      point.frustumCulled = false;
      point.renderOrder = 2;
      overlay.add(point);
    }
    (o.labels ?? []).forEach((label, i) => {
      const id = `particle-label-${i}`;
      ctx.labels.set(id, { text: label.text, position: label.position, priority: label.priority ?? 10, emphasis: label.emphasis, offset: label.offset });
      labelIds.push(id);
    });
  };

  return {
    update(state) {
      const count = state.positions.length / 3;
      const built = stars ? stars.geometry.getAttribute('position').count : -1;
      if (built !== count) buildStars(state);
      else {
        copy('position', state.positions);
        copy('aColor', state.colours);
        copy('aSize', state.sizes);
      }
      starMaterial.uniforms.uOpacity.value = state.opacity ?? 1;
      const additive = state.additive ? T.AdditiveBlending : T.NormalBlending;
      if (starMaterial.blending !== additive) {
        starMaterial.blending = additive;
        starMaterial.needsUpdate = true;
      }
      if (state.overlay !== shownOverlay) {
        shownOverlay = state.overlay;
        buildOverlay(state.overlay);
      }
    },

    beforeRender(context) {
      // Keep the clipping planes in proportion to how far away the camera is
      const d = context.getCamera().distance;
      context.camera.near = d / 1000;
      context.camera.far = d * 100;
      context.camera.updateProjectionMatrix();
    },

    dispose() {
      buildOverlay(undefined);
      stars?.geometry.dispose();
      starMaterial.dispose();
      scene.remove(root);
    },
  };
};
