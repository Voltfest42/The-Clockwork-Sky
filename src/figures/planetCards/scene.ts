import type { SceneContext, SceneController, SceneFactory } from '../../viz/scene3d/engine';
import { createGlobe, TextureCache, type Globe, type GlobeSpec } from '../../viz/scene3d/globe';
import type { OrbitCameraState } from '../../viz/scene3d/orbitCamera';

/**
 * Two worlds side by side at their true relative sizes (Figure 8.2), lit from
 * the front left, each with its own tilt and, while the figure plays, its own
 * spin rate. The larger world has radius 1; the camera looks along +y.
 */

export interface CardGlobe extends GlobeSpec {
  id: string;
  name: string;
  /** Hours for one turn about its axis (sidereal). */
  rotationHours: number;
}

export interface PlanetPairState {
  left: CardGlobe;
  right: CardGlobe;
  /** Simulated hours per real second while playing. */
  hoursPerSecond: number;
}

/** The gap between the two globes, scene units. */
const GAP = 0.35;

/** Where each globe's centre goes, for radii scaled so the larger is 1. */
export function pairLayout(left: number, right: number): { left: number; right: number; width: number; centre: number } {
  const l = -(left + GAP / 2);
  const r = right + GAP / 2;
  const width = 2 * left + 2 * right + GAP;
  return { left: l, right: r, width, centre: (l - left + r + right) / 2 };
}

/** A camera that fits both globes, rings included, across a view about 1.6 times as wide as tall. */
export function pairCamera(left: CardGlobe, right: CardGlobe): OrbitCameraState {
  const reach = (g: CardGlobe) => (g.rings ? g.rings.outer : g.radius);
  const layout = pairLayout(reach(left), reach(right));
  const halfWidth = layout.width / 2;
  const tanHalf = Math.tan((22.5 * Math.PI) / 180);
  const distance = 1.25 * Math.max(halfWidth / (tanHalf * 1.6), Math.max(reach(left), reach(right)) / tanHalf);
  return { target: [layout.centre, 0, 0], azimuth: -Math.PI / 2, elevation: 0.12, distance };
}

export const planetPairScene: SceneFactory<PlanetPairState> = (ctx: SceneContext): SceneController<PlanetPairState> => {
  const { THREE: T, scene } = ctx;
  const textures = new TextureCache(T, () => ctx.invalidate());
  scene.add(new T.AmbientLight('#ffffff', 0.35));
  const sun = new T.DirectionalLight('#ffffff', 2.6);
  sun.position.set(-3, -4, 1.6);
  scene.add(sun);

  let globes: { left: Globe; right: Globe } | null = null;
  let built: { left: string; right: string } | null = null;
  let state: PlanetPairState | null = null;
  const spin = { left: 0.6, right: 0.6 };

  const place = (s: PlanetPairState) => {
    const layout = pairLayout(s.left.rings ? s.left.rings.outer : s.left.radius, s.right.rings ? s.right.rings.outer : s.right.radius);
    // The layout leaves room for rings either side of a ringed globe.
    const leftCentre = layout.left;
    globes!.left.group.position.set(leftCentre, 0, 0);
    globes!.right.group.position.set(layout.right, 0, 0);
    ctx.labels.set('left', { text: s.left.name, position: [leftCentre, 0, -s.left.radius], priority: 50, offset: [-16, 16] });
    ctx.labels.set('right', { text: s.right.name, position: [layout.right, 0, -s.right.radius], priority: 50, offset: [-16, 16] });
  };

  return {
    update(s) {
      state = s;
      if (!built || built.left !== s.left.id || built.right !== s.right.id || !globes) {
        if (globes) {
          for (const g of [globes.left, globes.right]) {
            scene.remove(g.group);
            g.dispose();
          }
        }
        globes = { left: createGlobe(T, s.left, textures), right: createGlobe(T, s.right, textures) };
        scene.add(globes.left.group, globes.right.group);
        built = { left: s.left.id, right: s.right.id };
      }
      place(s);
      globes.left.setSpin(spin.left);
      globes.right.setSpin(spin.right);
    },

    frame(dt) {
      if (!state || !globes) return;
      const hours = dt * state.hoursPerSecond;
      spin.left = (spin.left + (2 * Math.PI * hours) / Math.abs(state.left.rotationHours)) % (2 * Math.PI);
      spin.right = (spin.right + (2 * Math.PI * hours) / Math.abs(state.right.rotationHours)) % (2 * Math.PI);
      globes.left.setSpin(spin.left);
      globes.right.setSpin(spin.right);
    },

    dispose() {
      if (globes) for (const g of [globes.left, globes.right]) g.dispose();
      textures.dispose();
      ctx.labels.clear();
    },
  };
};
