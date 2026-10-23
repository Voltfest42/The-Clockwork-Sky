import type * as THREE from 'three';
import type { Vec3 } from '../../core/math/vec3';
import { horizonMatrix } from '../../core/sky/frames';
import type { DailyPath } from '../../core/sky/visibility';
import type { SceneContext, SceneController, SceneFactory } from '../../viz/scene3d/engine';

/**
 * The celestial sphere seen from outside: the observer's horizon as a disc
 * through the centre, the stars on a sphere round it, the celestial poles and
 * equator, and the two circles that split the sky into stars that never set,
 * stars that rise and set, and stars that never rise. The scene's frame is the
 * observer's: x east, y north, z up. A small Earth under the observer shows
 * how its axis lines up with the sky's.
 */

export interface SphereStar {
  /** Direction in the mean equator of date. */
  v: Vec3;
  /** Point size, px. */
  size: number;
  path: DailyPath;
}

export interface SphereState {
  /** Radians. */
  latitude: number;
  /** Local sidereal time: how far the sky has turned. Radians. */
  lst: number;
  stars: readonly SphereStar[];
  /** Stars whose daily circles are drawn, with their labels. */
  circles: readonly { v: Vec3; name: string; path: DailyPath }[];
}

/** Colours for the three kinds of daily path (they're also listed by name beside the figure). */
export const PATH_COLOURS: Record<DailyPath, string> = {
  circumpolar: '#5fa8ff',
  'rises-and-sets': '#f4ecd8',
  'never-rises': '#7c869a',
};

const EARTH_RADIUS = 0.07;

function circle(T: typeof THREE, radius: number, z: number, segments = 160): THREE.BufferGeometry {
  const points: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (2 * Math.PI * i) / segments;
    points.push(radius * Math.cos(a), radius * Math.sin(a), z);
  }
  return new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3));
}

function toMatrix4(T: typeof THREE, latitude: number, lst: number): THREE.Matrix4 {
  const m = horizonMatrix(lst, latitude);
  return new T.Matrix4().set(m[0][0], m[0][1], m[0][2], 0, m[1][0], m[1][1], m[1][2], 0, m[2][0], m[2][1], m[2][2], 0, 0, 0, 0, 1);
}

export const sphereScene: SceneFactory<SphereState> = (ctx: SceneContext): SceneController<SphereState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);

  // ---------- fixed to the observer ----------
  const ground = new T.Mesh(
    new T.CircleGeometry(1, 128),
    new T.MeshBasicMaterial({ color: '#2f5a3a', transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false }),
  );
  root.add(ground);
  const horizonRing = new T.LineLoop(circle(T, 1, 0), new T.LineBasicMaterial({ color: '#8cbe8c' }));
  root.add(horizonRing);
  // The meridian: north, the zenith, south.
  const meridianPoints: number[] = [];
  for (let i = 0; i <= 80; i++) {
    const a = (Math.PI * i) / 80;
    meridianPoints.push(0, Math.cos(a), Math.sin(a));
  }
  const meridian = new T.Line(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(meridianPoints, 3)), new T.LineDashedMaterial({ color: '#8cbe8c', dashSize: 0.04, gapSize: 0.03 }));
  meridian.computeLineDistances();
  root.add(meridian);
  const zenith = new T.Mesh(new T.SphereGeometry(0.018, 12, 8), new T.MeshBasicMaterial({ color: '#c8f0c8' }));
  zenith.position.set(0, 0, 1);
  root.add(zenith);

  // A small Earth under the observer, whose axis is tipped like the sky's.
  const earth = new T.Group();
  earth.position.set(0, 0, -EARTH_RADIUS);
  const globe = new T.Mesh(new T.SphereGeometry(EARTH_RADIUS, 32, 16), new T.MeshBasicMaterial({ color: '#3d6fb5' }));
  earth.add(globe);
  const earthAxis = new T.Line(
    new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, -EARTH_RADIUS * 1.6, 0, 0, EARTH_RADIUS * 1.6], 3)),
    new T.LineBasicMaterial({ color: '#e2e8f5' }),
  );
  earth.add(earthAxis);
  root.add(earth);
  const observer = new T.Mesh(new T.SphereGeometry(0.012, 10, 6), new T.MeshBasicMaterial({ color: '#ffd166' }));
  root.add(observer);

  // ---------- fixed to the sky, turned by the sidereal time ----------
  const sky = new T.Group();
  sky.matrixAutoUpdate = false;
  root.add(sky);
  const axis = new T.Line(
    new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, -1.25, 0, 0, 1.25], 3)),
    new T.LineBasicMaterial({ color: '#ffd166' }),
  );
  sky.add(axis);
  const equator = new T.LineLoop(circle(T, 1, 0), new T.LineBasicMaterial({ color: '#5ad2d2', transparent: true, opacity: 0.8 }));
  sky.add(equator);
  const capMaterial = new T.LineBasicMaterial({ color: PATH_COLOURS.circumpolar });
  const neverMaterial = new T.LineBasicMaterial({ color: PATH_COLOURS['never-rises'] });
  let caps: THREE.Line[] = [];
  let circles: THREE.Line[] = [];
  let circlesBuilt: SphereState['circles'] | null = null;
  let coloured: readonly SphereStar[] | null = null;
  let colouredFor = NaN;

  const starGeometry = new T.BufferGeometry();
  const starMaterial = new T.PointsMaterial({ size: 4, sizeAttenuation: false, vertexColors: true });
  const stars = new T.Points(starGeometry, starMaterial);
  sky.add(stars);

  let lastLatitude = NaN;
  let starsBuilt: readonly SphereStar[] | null = null;

  const setLabels = (state: SphereState) => {
    const m = horizonMatrix(state.lst, state.latitude);
    const local = (v: Vec3): Vec3 => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
    const north = local([0, 0, 1.25]);
    const south = local([0, 0, -1.25]);
    ctx.labels.set('ncp', { text: 'North celestial pole', position: north, priority: 85, emphasis: true });
    ctx.labels.set('scp', { text: 'South celestial pole', position: south, priority: 85, emphasis: true });
    ctx.labels.set('zenith', { text: 'Zenith', position: [0, 0, 1.04], priority: 70 });
    ctx.labels.set('you', { text: 'You', position: [0, 0, 0], priority: 75, offset: [8, 14] });
    for (const [name, x, y] of [
      ['N', 0, 1.08],
      ['E', 1.08, 0],
      ['S', 0, -1.08],
      ['W', -1.08, 0],
    ] as const) {
      ctx.labels.set(`compass-${name}`, { text: name, position: [x, y, 0], priority: 80, offset: [-4, 4], emphasis: true });
    }
    state.circles.forEach((c, i) => {
      ctx.labels.set(`circle-${i}`, { text: c.name, position: local(c.v), priority: 50 });
    });
  };

  return {
    update(state) {
      if (state.latitude !== lastLatitude) {
        lastLatitude = state.latitude;
        // The tilt of Earth's axis matches the sky's: the pole stands at altitude φ above the north point.
        earth.rotation.set(-(Math.PI / 2 - state.latitude), 0, 0);
        // The circles that bound the never-setting and never-rising caps: declination ±(90° − |φ|).
        for (const c of caps) {
          sky.remove(c);
          c.geometry.dispose();
        }
        const colat = Math.PI / 2 - Math.abs(state.latitude);
        const north = state.latitude >= 0;
        const capCircle = (dec: number, material: THREE.LineBasicMaterial) => new T.LineLoop(circle(T, Math.cos(dec), Math.sin(dec)), material);
        caps = colat > 0.002 ? [capCircle(north ? colat : -colat, capMaterial), capCircle(north ? -colat : colat, neverMaterial)] : [];
        for (const c of caps) sky.add(c);
      }
      if (starsBuilt !== state.stars) {
        starsBuilt = state.stars;
        const positions = new Float32Array(state.stars.length * 3);
        state.stars.forEach((s, i) => positions.set(s.v, 3 * i));
        starGeometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      }
      if (coloured !== state.stars || colouredFor !== state.latitude) {
        // Colours follow the latitude: which stars set depends on where you stand.
        coloured = state.stars;
        colouredFor = state.latitude;
        const colours = new Float32Array(state.stars.length * 3);
        const colour = new T.Color();
        state.stars.forEach((s, i) => {
          colour.set(PATH_COLOURS[s.path]);
          colours.set([colour.r, colour.g, colour.b], 3 * i);
        });
        starGeometry.setAttribute('color', new T.Float32BufferAttribute(colours, 3));
      }
      if (circlesBuilt !== state.circles) {
        // Daily circles for the chosen stars.
        circlesBuilt = state.circles;
        for (const c of circles) {
          sky.remove(c);
          c.geometry.dispose();
          (c.material as THREE.Material).dispose();
        }
        circles = state.circles.map((c) => {
          const dec = Math.asin(c.v[2]);
          return new T.LineLoop(circle(T, Math.cos(dec), Math.sin(dec)), new T.LineBasicMaterial({ color: PATH_COLOURS[c.path], transparent: true, opacity: 0.9 }));
        });
        for (const c of circles) sky.add(c);
      }
      sky.matrix.copy(toMatrix4(T, state.latitude, state.lst));
      sky.matrixWorldNeedsUpdate = true;
      setLabels(state);
    },
    beforeRender() {
      // Points can't be smaller than a pixel or two, whatever the zoom.
      starMaterial.size = Math.max(3, Math.min(6, 9 / ctx.getCamera().distance));
    },
    dispose() {
      ctx.labels.clear();
      for (const c of [...caps, ...circles]) c.geometry.dispose();
    },
  };
};
