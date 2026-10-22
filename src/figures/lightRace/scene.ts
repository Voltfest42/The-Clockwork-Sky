import type * as THREE from 'three';
import { AU, C } from '../../core/constants';
import { formatDuration } from '../../core/light';
import type { SceneContext, SceneController, SceneFactory } from '../../viz/scene3d/engine';
import { SUN_RADIUS_AU, type RaceStop } from './stops';

/** What the light-race scene needs from the figure. */
export interface RaceSceneState {
  stops: readonly RaceStop[];
  /** Seconds since the light left the Sun. */
  elapsed: number;
  /** Keep the camera far enough out to see the whole sphere of light. */
  follow: boolean;
}

/** How far out the camera sits, for a sphere of light of radius r (AU). */
export function followDistance(radiusAu: number): number {
  return 3.4 * Math.max(radiusAu, 0.7);
}

const BODY_COLOURS: Record<string, string> = {
  mercury: '#b9b2a8',
  venus: '#e8d3a2',
  earth: '#4f8fe0',
  mars: '#d9734e',
  jupiter: '#d8b48a',
  saturn: '#e6d08f',
  uranus: '#9fe0e6',
  neptune: '#6b8ef0',
  'voyager-1': '#e2e8f5',
  proxima: '#ff8a65',
};

/**
 * The Sun, the planets' orbits (circles at their average distances), the
 * planets, Voyager 1 and Proxima Centauri, and a sphere of light growing from
 * the Sun at the speed of light. Units: AU, in the ecliptic frame (z = north).
 */
export const lightRaceScene: SceneFactory<RaceSceneState> = (ctx: SceneContext): SceneController<RaceSceneState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);

  const sun = new T.Mesh(new T.SphereGeometry(1, 32, 16), new T.MeshBasicMaterial({ color: ctx.theme.sun }));
  root.add(sun);

  // The sphere of light, and its circle where it crosses the planets' plane.
  const shellMaterial = new T.MeshBasicMaterial({ color: ctx.theme.sun, transparent: true, opacity: 0.045, depthWrite: false, side: T.DoubleSide });
  const shell = new T.Mesh(new T.SphereGeometry(1, 64, 32), shellMaterial);
  root.add(shell);
  const ring = new T.LineLoop(circleGeometry(T, 1, 256), new T.LineBasicMaterial({ color: ctx.theme.sun, transparent: true, opacity: 0.95 }));
  root.add(ring);

  const orbitMaterial = new T.LineBasicMaterial({ color: ctx.theme.grid });
  const markers = new Map<string, { mesh: THREE.Mesh; stop: RaceStop }>();
  let built = false;
  let state: RaceSceneState | null = null;

  const build = (stops: readonly RaceStop[]) => {
    for (const stop of stops) {
      if (stop.kind === 'planet') root.add(new T.LineLoop(circleGeometry(T, stop.distanceAu, 256), orbitMaterial));
      const mesh = new T.Mesh(new T.SphereGeometry(1, 16, 8), new T.MeshBasicMaterial({ color: BODY_COLOURS[stop.id] ?? ctx.theme.text }));
      mesh.position.set(...stop.position);
      root.add(mesh);
      markers.set(stop.id, { mesh, stop });
    }
    built = true;
  };

  return {
    update(next) {
      if (!built) build(next.stops);
      state = next;
      const r = Math.max(1e-9, (C * next.elapsed) / AU);
      shell.scale.setScalar(r);
      ring.scale.setScalar(r);
      shell.visible = ring.visible = next.elapsed > 0;
      if (next.follow) {
        const camera = ctx.getCamera();
        ctx.setCamera({ ...camera, target: [0, 0, 0], distance: followDistance(r) });
      }
      // Labels: every stop, the Sun, and the light front.
      const passed = next.stops.filter((s) => s.arrival <= next.elapsed);
      const latest = passed[passed.length - 1];
      for (const stop of next.stops) {
        ctx.labels.set(stop.id, {
          text: stop.name,
          position: stop.position,
          priority: stop.kind === 'planet' ? 20 - next.stops.indexOf(stop) : 25,
          emphasis: stop === latest,
        });
      }
      ctx.labels.set('sun', { text: 'Sun', position: [0, 0, 0], priority: 40, offset: [8, 10] });
    },

    beforeRender() {
      // Keep things visible: nothing is drawn smaller than a few pixels, whatever the zoom.
      const camera = ctx.camera.position;
      const atLeast = (position: THREE.Vector3, trueRadius: number, px: number) =>
        Math.max(trueRadius, px * ctx.worldPerPixel(camera.distanceTo(position)));
      sun.scale.setScalar(atLeast(sun.position, SUN_RADIUS_AU, 6));
      for (const { mesh, stop } of markers.values()) {
        mesh.scale.setScalar(atLeast(mesh.position, stop.radiusAu, stop.kind === 'craft' ? 2.5 : 3.5));
      }
      // The light label sits on the ring, on the side facing the camera.
      if (state) {
        const r = (C * state.elapsed) / AU;
        const azimuth = ctx.getCamera().azimuth;
        ctx.labels.set('light', {
          text: `Light: ${formatDuration(state.elapsed)}`,
          position: [r * Math.cos(azimuth + 0.5), r * Math.sin(azimuth + 0.5), 0],
          priority: 50,
          emphasis: true,
          visible: state.elapsed > 0,
        });
      }
    },

    onTheme(theme) {
      (sun.material as THREE.MeshBasicMaterial).color.set(theme.sun);
      shellMaterial.color.set(theme.sun);
      (ring.material as THREE.LineBasicMaterial).color.set(theme.sun);
      orbitMaterial.color.set(theme.grid);
    },

    dispose() {
      ctx.labels.clear();
    },
  };
};

/** A circle of radius r in the x–y plane. */
function circleGeometry(T: typeof THREE, r: number, segments: number): THREE.BufferGeometry {
  const points: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (2 * Math.PI * i) / segments;
    points.push(r * Math.cos(a), r * Math.sin(a), 0);
  }
  return new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3));
}
