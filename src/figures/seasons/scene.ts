import type * as THREE from 'three';
import type { SceneContext, SceneController, SceneFactory } from '../../viz/scene3d/engine';

/**
 * The seasons machine in 3D: the Sun at the centre, Earth's orbit, and Earth
 * on it with its axis tilted and always pointing the same way in space. Earth
 * is lit by the Sun, so its day and night halves show, and carries its
 * equator, tropics and polar circles, the reader's latitude (the circle a
 * place goes round in a day) and a marker for the reader at noon.
 *
 * The frame is the ecliptic: x towards the March equinox direction, z towards
 * the ecliptic's north pole. One AU is ORBIT_RADIUS units; Earth and the Sun
 * are drawn far too big.
 */

export interface SeasonsSceneState {
  /** The Sun's ecliptic longitude seen from Earth (radians): Earth is on the opposite side. */
  sunLongitude: number;
  /** Earth–Sun distance, AU. */
  distance: number;
  /** The orbit, sampled through the year: Sun longitude and distance per day. */
  orbit: readonly { lon: number; distance: number }[];
  /** Tilt of Earth's axis, radians. */
  obliquity: number;
  /** The reader's latitude, radians. */
  latitude: number;
  /** Show the closest and farthest points of the orbit. */
  showDistance: boolean;
  perihelion: { lon: number; distance: number; label: string } | null;
  aphelion: { lon: number; distance: number; label: string } | null;
}

export const ORBIT_RADIUS = 3;
const EARTH_RADIUS = 0.62;
const SUN_RADIUS = 0.6;

export const SEASON_COLOURS = {
  you: '#ffd166',
  axis: '#e2e8f5',
  tropics: '#f4a259',
  polar: '#7fc8f8',
  equator: '#9fe0a0',
  orbit: '#5a6f99',
};

/** Earth's centre for a Sun longitude and distance: opposite the Sun. */
export function earthPosition(sunLongitude: number, distance: number): [number, number, number] {
  return [-ORBIT_RADIUS * distance * Math.cos(sunLongitude), -ORBIT_RADIUS * distance * Math.sin(sunLongitude), 0];
}

function circlePoints(T: typeof THREE, radius: number, z: number, segments = 96): THREE.BufferGeometry {
  const points: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (2 * Math.PI * i) / segments;
    points.push(radius * Math.cos(a), radius * Math.sin(a), z);
  }
  return new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3));
}

export const seasonsScene: SceneFactory<SeasonsSceneState> = (ctx: SceneContext): SceneController<SeasonsSceneState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);
  scene.add(new T.AmbientLight('#ffffff', 0.12));
  const light = new T.PointLight('#ffffff', 3.2, 0, 0);
  root.add(light);

  const sun = new T.Mesh(new T.SphereGeometry(SUN_RADIUS, 32, 16), new T.MeshBasicMaterial({ color: ctx.theme.sun }));
  root.add(sun);

  const orbitMaterial = new T.LineBasicMaterial({ color: SEASON_COLOURS.orbit });
  let orbit: THREE.LineLoop | null = null;
  let orbitFor: SeasonsSceneState['orbit'] | null = null;

  // Earth: a group tilted by the obliquity; inside it, the globe and its circles, with z along the axis.
  const earth = new T.Group();
  root.add(earth);
  const tilted = new T.Group();
  earth.add(tilted);
  const globe = new T.Mesh(new T.SphereGeometry(EARTH_RADIUS, 48, 24), new T.MeshLambertMaterial({ color: '#3f72c0' }));
  tilted.add(globe);
  const axis = new T.Line(
    new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, -EARTH_RADIUS * 1.7, 0, 0, EARTH_RADIUS * 1.7], 3)),
    new T.LineBasicMaterial({ color: SEASON_COLOURS.axis }),
  );
  tilted.add(axis);
  const latitudeLines = new T.Group();
  tilted.add(latitudeLines);
  const you = new T.Mesh(new T.SphereGeometry(0.045, 12, 8), new T.MeshBasicMaterial({ color: SEASON_COLOURS.you }));
  earth.add(you);

  const apsisDots = {
    perihelion: new T.Mesh(new T.SphereGeometry(0.06, 10, 6), new T.MeshBasicMaterial({ color: '#ff9f70' })),
    aphelion: new T.Mesh(new T.SphereGeometry(0.06, 10, 6), new T.MeshBasicMaterial({ color: '#93acff' })),
  };
  root.add(apsisDots.perihelion, apsisDots.aphelion);
  let built = { obliquity: NaN, latitude: NaN };

  const ring = (latitude: number, colour: string, width = 1) => {
    const r = EARTH_RADIUS * 1.004;
    const line = new T.LineLoop(circlePoints(T, r * Math.cos(latitude), r * Math.sin(latitude)), new T.LineBasicMaterial({ color: colour, linewidth: width }));
    latitudeLines.add(line);
  };

  const buildLatitudes = (obliquity: number, latitude: number) => {
    for (const child of [...latitudeLines.children]) {
      latitudeLines.remove(child);
      (child as THREE.Line).geometry.dispose();
      ((child as THREE.Line).material as THREE.Material).dispose();
    }
    // With a tilt over 90° the axis is upside down; the circles depend only on the angle from the orbit's pole.
    const tilt = obliquity > Math.PI / 2 ? Math.PI - obliquity : obliquity;
    ring(0, SEASON_COLOURS.equator);
    if (tilt > 0.002) {
      ring(tilt, SEASON_COLOURS.tropics);
      ring(-tilt, SEASON_COLOURS.tropics);
      ring(Math.PI / 2 - tilt, SEASON_COLOURS.polar);
      ring(-(Math.PI / 2 - tilt), SEASON_COLOURS.polar);
    }
    // The reader's latitude, a little outside the globe so it shows over the others.
    const r = EARTH_RADIUS * 1.012;
    latitudeLines.add(
      new T.LineLoop(circlePoints(T, r * Math.cos(latitude), r * Math.sin(latitude), 128), new T.LineBasicMaterial({ color: SEASON_COLOURS.you })),
    );
  };

  return {
    update(state) {
      if (orbitFor !== state.orbit) {
        orbitFor = state.orbit;
        if (orbit) {
          root.remove(orbit);
          orbit.geometry.dispose();
        }
        const points: number[] = [];
        for (const d of state.orbit) points.push(...earthPosition(d.lon, d.distance));
        orbit = new T.LineLoop(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3)), orbitMaterial);
        root.add(orbit);
      }
      if (built.obliquity !== state.obliquity || built.latitude !== state.latitude) {
        built = { obliquity: state.obliquity, latitude: state.latitude };
        buildLatitudes(state.obliquity, state.latitude);
      }
      // The axis tips by the obliquity towards the June solstice side (the Sun's longitude 90°), and keeps that direction all year.
      tilted.rotation.set(-state.obliquity, 0, 0);
      const position = earthPosition(state.sunLongitude, state.distance);
      earth.position.set(...position);

      // You, at noon: on your latitude, on the meridian that faces the Sun.
      const pole = new T.Vector3(0, Math.sin(state.obliquity), Math.cos(state.obliquity));
      const toSun = new T.Vector3(-position[0], -position[1], 0).normalize();
      const across = toSun.clone().sub(pole.clone().multiplyScalar(toSun.dot(pole)));
      if (across.lengthSq() < 1e-9) across.set(1, 0, 0);
      across.normalize();
      const at = across.multiplyScalar(Math.cos(state.latitude)).add(pole.clone().multiplyScalar(Math.sin(state.latitude))).multiplyScalar(EARTH_RADIUS * 1.03);
      you.position.copy(at);

      // Labels: the seasons' points round the orbit, Earth, you, and (with the distance switch) the closest and farthest points.
      for (const [id, lon, text] of [
        ['march', 0, 'March equinox'],
        ['june', Math.PI / 2, 'June solstice'],
        ['september', Math.PI, 'September equinox'],
        ['december', (3 * Math.PI) / 2, 'December solstice'],
      ] as const) {
        const p = earthPosition(lon, 1.12);
        ctx.labels.set(id, { text, position: [p[0], p[1], 0], priority: 40, offset: [-40, 4] });
      }
      ctx.labels.set('sun', { text: 'Sun', position: [0, 0, SUN_RADIUS], priority: 60, offset: [-12, -10] });
      ctx.labels.set('you', { text: 'You, at noon', position: [position[0] + at.x, position[1] + at.y, position[2] + at.z], priority: 80, emphasis: true });
      ctx.labels.set('pole', {
        text: 'North Pole',
        position: [position[0] + pole.x * EARTH_RADIUS * 1.75, position[1] + pole.y * EARTH_RADIUS * 1.75, position[2] + pole.z * EARTH_RADIUS * 1.75],
        priority: 70,
      });

      for (const [id, apsis] of [
        ['perihelion', state.perihelion],
        ['aphelion', state.aphelion],
      ] as const) {
        const dot = apsisDots[id];
        dot.visible = state.showDistance && !!apsis;
        if (!dot.visible || !apsis) {
          ctx.labels.remove(id);
          continue;
        }
        const p = earthPosition(apsis.lon, apsis.distance);
        dot.position.set(...p);
        ctx.labels.set(id, { text: apsis.label, position: p, priority: 75, emphasis: true, offset: [8, 14] });
      }
    },

    onTheme(theme) {
      (sun.material as THREE.MeshBasicMaterial).color.set(theme.sun);
    },

    dispose() {
      ctx.labels.clear();
    },
  };
};
