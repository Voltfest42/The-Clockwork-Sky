import type * as THREE from 'three';
import type { SceneContext, SceneController, SceneFactory } from '../../viz/scene3d/engine';

/**
 * Figure T7.1's small 3D view: two arrows a and b lying in a floor (the x–y
 * plane), the parallelogram they span, and their cross product a × b standing
 * up from the floor, as long as the parallelogram's area. Units are the
 * figure's: the floor runs from −5 to 5.
 */

export interface DotCrossState {
  a: readonly [number, number];
  b: readonly [number, number];
}

const SCALE = 0.2; // world units per unit of the figure

export const dotCrossScene: SceneFactory<DotCrossState> = (ctx: SceneContext): SceneController<DotCrossState> => {
  const { THREE: T, scene } = ctx;
  const root = new T.Group();
  scene.add(root);
  const grid = new T.GridHelper(2, 10, '#3b4a6b', '#2a3a5e');
  grid.rotation.x = Math.PI / 2;
  root.add(grid);

  const arrow = (color: string) => {
    const h = new T.ArrowHelper(new T.Vector3(1, 0, 0), new T.Vector3(0, 0, 0), 1, color, 0.12, 0.07);
    root.add(h);
    return h;
  };
  const aArrow = arrow('#6b9bff');
  const bArrow = arrow('#f59e0b');
  const cArrow = arrow('#2dd4bf');
  const sheetGeometry = new T.BufferGeometry();
  const sheet = new T.Mesh(sheetGeometry, new T.MeshBasicMaterial({ color: '#b794f6', transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false }));
  root.add(sheet);

  const set = (h: THREE.ArrowHelper, v: readonly [number, number, number]) => {
    const len = Math.hypot(...v);
    h.visible = len > 1e-6;
    if (!h.visible) return;
    h.setDirection(new T.Vector3(v[0] / len, v[1] / len, v[2] / len));
    h.setLength(len, Math.min(0.12, len * 0.35), Math.min(0.07, len * 0.2));
  };

  return {
    update(state) {
      const a: [number, number, number] = [state.a[0] * SCALE, state.a[1] * SCALE, 0];
      const b: [number, number, number] = [state.b[0] * SCALE, state.b[1] * SCALE, 0];
      // a × b, with the same scale for its length as the parallelogram's area (units², shown in units).
      const cz = (state.a[0] * state.b[1] - state.a[1] * state.b[0]) * SCALE * 0.35;
      set(aArrow, a);
      set(bArrow, b);
      set(cArrow, [0, 0, cz]);
      sheetGeometry.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, a[0], a[1], 0, a[0] + b[0], a[1] + b[1], 0, 0, 0, 0, a[0] + b[0], a[1] + b[1], 0, b[0], b[1], 0], 3));
      sheetGeometry.computeBoundingSphere();
      ctx.labels.set('a', { text: 'a', position: [a[0] * 1.08, a[1] * 1.08, 0], priority: 80, emphasis: true });
      ctx.labels.set('b', { text: 'b', position: [b[0] * 1.08, b[1] * 1.08, 0], priority: 80, emphasis: true });
      ctx.labels.set('c', { text: 'a × b', position: [0, 0, cz + Math.sign(cz || 1) * 0.08], priority: 90, emphasis: true, visible: Math.abs(cz) > 1e-3 });
      ctx.invalidate();
    },
    dispose() {
      ctx.labels.clear();
      sheetGeometry.dispose();
    },
  };
};
