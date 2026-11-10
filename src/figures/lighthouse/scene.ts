import type * as THREE from 'three';
import type { SceneContext, SceneController, SceneFactory } from '../../viz/scene3d/engine';

/**
 * The pulsar lighthouse in 3D (Figure 26.3): a neutron star with its spin axis
 * up (z), its magnetic axis tilted by α and turning with the star, a cone of
 * radio waves round each end of it, and our line of sight at ζ from the spin
 * axis, in the x–z plane. A beam that covers our line of sight lights up.
 * Not to scale: the beams reach far beyond the star.
 */

export interface LighthouseState {
  /** Radians. */
  alpha: number;
  zeta: number;
  rho: number;
  phase: number;
  /** Which beam is on us now: 0 none, 1 or 2. */
  onUs: 0 | 1 | 2;
}

const STAR = 0.22;
const BEAM = 1.7;

function line(T: typeof THREE, points: number[], color: string, dashed = false): THREE.Line {
  const geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3));
  const material = dashed ? new T.LineDashedMaterial({ color, dashSize: 0.06, gapSize: 0.05 }) : new T.LineBasicMaterial({ color });
  const l = new T.Line(geometry, material);
  if (dashed) l.computeLineDistances();
  return l;
}

/** A cone with its tip at the origin opening along +z (or −z), half-angle rho, length len. */
function beamGeometry(T: typeof THREE, rho: number, len: number, down: boolean): THREE.BufferGeometry {
  const g = new T.ConeGeometry(len * Math.tan(rho), len, 48, 1, true);
  g.translate(0, -len / 2, 0);
  g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
  return g;
}

export const lighthouseScene: SceneFactory<LighthouseState> = (ctx: SceneContext): SceneController<LighthouseState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);

  const star = new T.Mesh(new T.SphereGeometry(STAR, 40, 24), new T.MeshBasicMaterial({ color: '#cfe0ff' }));
  root.add(star);
  // A band round the star's equator, so its turning shows.
  const band = new T.Mesh(new T.TorusGeometry(STAR * 1.002, 0.012, 8, 64), new T.MeshBasicMaterial({ color: '#5b7bb5' }));
  root.add(band);

  const spinAxis = line(T, [0, 0, -1.5, 0, 0, 1.5], '#e2e8f5');
  root.add(spinAxis);

  // The turning part: the magnetic axis and its beams, tilted by α inside a group turned by the phase.
  const turning = new T.Group();
  root.add(turning);
  const tilted = new T.Group();
  turning.add(tilted);
  const magAxis = line(T, [0, 0, -1.25, 0, 0, 1.25], '#f59e0b');
  tilted.add(magAxis);
  // A meridian marking on the star, so its spin is visible even with the beams aligned.
  const marker = new T.Mesh(new T.SphereGeometry(0.035, 12, 8), new T.MeshBasicMaterial({ color: '#f59e0b' }));
  marker.position.set(0, 0, STAR);
  tilted.add(marker);
  const beamMaterials = [0, 1].map(() => new T.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false }));
  let beams: THREE.Mesh[] = [];
  let builtRho = NaN;

  const sightGroup = new T.Group();
  root.add(sightGroup);
  let sight: THREE.Line | null = null;
  const tip = new T.Mesh(new T.ConeGeometry(0.05, 0.14, 16), new T.MeshBasicMaterial({ color: '#2dd4bf' }));
  sightGroup.add(tip);

  return {
    update(state) {
      if (state.rho !== builtRho) {
        builtRho = state.rho;
        for (const b of beams) {
          tilted.remove(b);
          b.geometry.dispose();
        }
        beams = [false, true].map((down, i) => new T.Mesh(beamGeometry(T, state.rho, BEAM, down), beamMaterials[i]));
        for (const b of beams) tilted.add(b);
      }
      tilted.rotation.set(0, state.alpha, 0);
      turning.rotation.set(0, 0, state.phase);
      beamMaterials.forEach((m, i) => {
        const lit = state.onUs === i + 1;
        m.opacity = lit ? 0.6 : 0.2;
        m.color.set(lit ? '#ffd166' : '#f59e0b');
      });
      // Our line of sight: in the x–z plane, ζ from the spin axis.
      if (sight) {
        sightGroup.remove(sight);
        sight.geometry.dispose();
      }
      const dir: [number, number, number] = [Math.sin(state.zeta), 0, Math.cos(state.zeta)];
      sight = line(T, [0, 0, 0, dir[0] * 2.3, dir[1] * 2.3, dir[2] * 2.3], state.onUs ? '#ffd166' : '#2dd4bf', true);
      sightGroup.add(sight);
      tip.position.set(dir[0] * 2.3, dir[1] * 2.3, dir[2] * 2.3);
      tip.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(...dir));
      ctx.labels.set('earth', { text: state.onUs ? 'to Earth: a pulse!' : 'to Earth', position: [dir[0] * 2.45, 0, dir[2] * 2.45], priority: 90, emphasis: true });
      ctx.labels.set('spin', { text: 'spin axis', position: [0, 0, 1.55], priority: 80 });
      const m = [Math.sin(state.alpha) * Math.cos(state.phase), Math.sin(state.alpha) * Math.sin(state.phase), Math.cos(state.alpha)] as const;
      ctx.labels.set('mag', { text: 'magnetic axis', position: [m[0] * 1.3, m[1] * 1.3, m[2] * 1.3], priority: 70 });
      ctx.invalidate();
    },
    dispose() {
      ctx.labels.clear();
      for (const b of beams) b.geometry.dispose();
      sight?.geometry.dispose();
    },
  };
};
