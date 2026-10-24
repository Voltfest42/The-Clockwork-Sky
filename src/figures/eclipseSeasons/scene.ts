import type * as THREE from 'three';
import type { SceneContext, SceneController, SceneFactory } from '../../viz/scene3d/engine';

/**
 * The Moon's tilted orbit round Earth, in 3D, with the ecliptic plane, the
 * line of nodes where the two planes cross, the Sun's direction going round
 * once a year, and the shadows of Earth and the Moon pointing away from the
 * Sun. Eclipses happen when a shadow falls on the other body: only when the
 * Moon is new or full while the Sun is near the line of nodes.
 *
 * The frame is the ecliptic of date, centred on Earth: z towards the
 * ecliptic's north pole. Not to scale: the Sun is drawn 3 Moon-orbits away
 * instead of 390, and the bodies far too big.
 */

export interface EclipseSceneState {
  /** The Sun's ecliptic longitude: radians. */
  sunLongitude: number;
  /** The Moon's argument of latitude, its angle round the orbit from the ascending node: radians. */
  moonArgument: number;
  /** Longitude of the ascending node: radians. */
  node: number;
  /** The drawn tilt of the Moon's orbit: radians (exaggerated by the figure if asked). */
  inclination: number;
  /** An eclipse is happening: highlight the shadow that causes it. */
  eclipse: 'solar' | 'lunar' | null;
}

export const MOON_ORBIT = 2.6;
const SUN_DISTANCE = 7.5;
const EARTH_RADIUS = 0.32;
const MOON_RADIUS = 0.13;

export const ECLIPSE_COLOURS = {
  orbitNorth: '#c3cbe0',
  orbitSouth: '#5d6a8c',
  nodes: '#ffd166',
  ecliptic: '#d97706',
};

/** A point on the Moon's orbit at argument of latitude u. */
export function orbitPoint(u: number, node: number, inclination: number, r = MOON_ORBIT): [number, number, number] {
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const ci = Math.cos(inclination);
  return [
    r * (Math.cos(node) * cu - Math.sin(node) * su * ci),
    r * (Math.sin(node) * cu + Math.cos(node) * su * ci),
    r * su * Math.sin(inclination),
  ];
}

export const eclipseScene: SceneFactory<EclipseSceneState> = (ctx: SceneContext): SceneController<EclipseSceneState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);
  scene.add(new T.AmbientLight('#ffffff', 0.08));
  const light = new T.DirectionalLight('#ffffff', 2.6);
  root.add(light);
  root.add(light.target);

  // The ecliptic plane: a faint disc and its rim.
  const plane = new T.Mesh(
    new T.CircleGeometry(MOON_ORBIT * 1.35, 96),
    new T.MeshBasicMaterial({ color: ECLIPSE_COLOURS.ecliptic, transparent: true, opacity: 0.08, side: T.DoubleSide, depthWrite: false }),
  );
  root.add(plane);
  const rimPoints: number[] = [];
  for (let i = 0; i < 128; i++) {
    const a = (2 * Math.PI * i) / 128;
    rimPoints.push(MOON_ORBIT * 1.35 * Math.cos(a), MOON_ORBIT * 1.35 * Math.sin(a), 0);
  }
  root.add(new T.LineLoop(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(rimPoints, 3)), new T.LineBasicMaterial({ color: ECLIPSE_COLOURS.ecliptic, transparent: true, opacity: 0.45 })));

  const earth = new T.Mesh(new T.SphereGeometry(EARTH_RADIUS, 40, 20), new T.MeshLambertMaterial({ color: '#3f72c0' }));
  root.add(earth);
  const moon = new T.Mesh(new T.SphereGeometry(MOON_RADIUS, 24, 12), new T.MeshLambertMaterial({ color: '#e8e4d8' }));
  root.add(moon);
  const sun = new T.Mesh(new T.SphereGeometry(0.5, 32, 16), new T.MeshBasicMaterial({ color: ctx.theme.sun }));
  root.add(sun);

  // The Moon's orbit in two halves: north of the ecliptic (bright) and south (dim).
  const north = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({ color: ECLIPSE_COLOURS.orbitNorth }));
  const south = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({ color: ECLIPSE_COLOURS.orbitSouth }));
  root.add(north, south);
  const nodeLine = new T.Line(new T.BufferGeometry(), new T.LineDashedMaterial({ color: ECLIPSE_COLOURS.nodes, dashSize: 0.12, gapSize: 0.08 }));
  root.add(nodeLine);

  // Shadows: cones pointing away from the Sun. Built along +x, then turned.
  const shadowMaterial = (opacity: number) => new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity, depthWrite: false });
  const earthShadow = new T.Mesh(new T.CylinderGeometry(EARTH_RADIUS * 0.7, EARTH_RADIUS, MOON_ORBIT * 1.3, 32, 1, true), shadowMaterial(0.4));
  earthShadow.geometry.rotateZ(Math.PI / 2).translate(-(MOON_ORBIT * 1.3) / 2, 0, 0);
  const moonShadow = new T.Mesh(new T.ConeGeometry(MOON_RADIUS, MOON_ORBIT, 24, 1, true), shadowMaterial(0.4));
  moonShadow.geometry.rotateZ(Math.PI / 2).translate(-MOON_ORBIT / 2, 0, 0);
  const earthShadowGroup = new T.Group();
  earthShadowGroup.add(earthShadow);
  const moonShadowGroup = new T.Group();
  moonShadowGroup.add(moonShadow);
  root.add(earthShadowGroup, moonShadowGroup);

  let built = { node: NaN, inclination: NaN };

  const buildOrbit = (node: number, inclination: number) => {
    const half = (from: number) => {
      const points: number[] = [];
      for (let i = 0; i <= 96; i++) points.push(...orbitPoint(from + (Math.PI * i) / 96, node, inclination));
      return new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3));
    };
    north.geometry.dispose();
    north.geometry = half(0);
    south.geometry.dispose();
    south.geometry = half(Math.PI);
    const a = orbitPoint(0, node, inclination, MOON_ORBIT * 1.3);
    const b = orbitPoint(Math.PI, node, inclination, MOON_ORBIT * 1.3);
    nodeLine.geometry.dispose();
    nodeLine.geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([...a, ...b], 3));
    nodeLine.computeLineDistances();
  };

  return {
    update(state) {
      if (built.node !== state.node || built.inclination !== state.inclination) {
        built = { node: state.node, inclination: state.inclination };
        buildOrbit(state.node, state.inclination);
      }
      const sunDir = new T.Vector3(Math.cos(state.sunLongitude), Math.sin(state.sunLongitude), 0);
      sun.position.copy(sunDir.clone().multiplyScalar(SUN_DISTANCE));
      light.position.copy(sunDir.clone().multiplyScalar(20));
      const m = orbitPoint(state.moonArgument, state.node, state.inclination);
      moon.position.set(...m);

      // The shadows are built along −x; turning +x to the Sun points them straight away from it.
      earthShadowGroup.rotation.set(0, 0, state.sunLongitude);
      moonShadowGroup.position.set(...m);
      moonShadowGroup.rotation.set(0, 0, state.sunLongitude);
      (earthShadow.material as THREE.MeshBasicMaterial).opacity = state.eclipse === 'lunar' ? 0.75 : 0.35;
      (moonShadow.material as THREE.MeshBasicMaterial).opacity = state.eclipse === 'solar' ? 0.85 : 0.35;
      (moon.material as THREE.MeshLambertMaterial).color.set(state.eclipse === 'lunar' ? '#b5532f' : '#e8e4d8');

      const asc = orbitPoint(0, state.node, state.inclination, MOON_ORBIT * 1.32);
      const desc = orbitPoint(Math.PI, state.node, state.inclination, MOON_ORBIT * 1.32);
      ctx.labels.set('asc', { text: 'Ascending node', position: asc, priority: 60, emphasis: true });
      ctx.labels.set('desc', { text: 'Descending node', position: desc, priority: 60, emphasis: true });
      ctx.labels.set('sun', { text: 'Sun (far away)', position: [sun.position.x, sun.position.y, 0.55], priority: 70 });
      ctx.labels.set('moon', { text: state.eclipse ? `Moon: ${state.eclipse} eclipse` : 'Moon', position: [m[0], m[1], m[2] + 0.15], priority: 80, emphasis: !!state.eclipse });
      ctx.labels.set('earth', { text: 'Earth', position: [0, 0, EARTH_RADIUS + 0.12], priority: 75 });
    },

    onTheme(theme) {
      (sun.material as THREE.MeshBasicMaterial).color.set(theme.sun);
    },

    dispose() {
      ctx.labels.clear();
    },
  };
};
