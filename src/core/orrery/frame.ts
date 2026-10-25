import { cross, normalize, type Vec3 } from '../math/vec3';

/**
 * The frames the Orrery can show a system in: centred on the system's centre
 * of mass or on one body, and either fixed to the stars or turning with a
 * pair of bodies. In a turning frame the pair stands still, with the heavier
 * one on the left and the lighter on the right (+x), and the frame's origin
 * is their centre of mass, so their Lagrange points stay put.
 *
 * Positions in the system's units (AU in the Orrery).
 */

export interface FrameSpec {
  /** The body to centre on, by id; null for the whole system's centre of mass. */
  centre: string | null;
  /** A pair of bodies to turn with, by id, or null for a frame fixed to the stars. */
  rotate: readonly [string, string] | null;
}

export interface Frame {
  origin: Vec3;
  /** The frame's x, y and z axes as unit vectors, or null when it doesn't turn. */
  axes: readonly [Vec3, Vec3, Vec3] | null;
}

export const FIXED_FRAME: FrameSpec = { centre: null, rotate: null };

const at = (a: Float64Array, i: number): Vec3 => [a[3 * i], a[3 * i + 1], a[3 * i + 2]];

/** The frame now, for bodies with these ids, G·m, positions and velocities. A body that is missing (merged away) falls back to the centre of mass. */
export function frameOf(spec: FrameSpec, ids: readonly string[], gm: Float64Array, x: Float64Array, v: Float64Array): Frame {
  if (spec.rotate) {
    let a = ids.indexOf(spec.rotate[0]);
    let b = ids.indexOf(spec.rotate[1]);
    if (a >= 0 && b >= 0 && a !== b) {
      if (gm[b] > gm[a]) [a, b] = [b, a];
      const m = gm[a] + gm[b];
      const xa = at(x, a);
      const xb = at(x, b);
      const origin: Vec3 = m > 0 ? [(gm[a] * xa[0] + gm[b] * xb[0]) / m, (gm[a] * xa[1] + gm[b] * xb[1]) / m, (gm[a] * xa[2] + gm[b] * xb[2]) / m] : xa;
      const d: Vec3 = [xb[0] - xa[0], xb[1] - xa[1], xb[2] - xa[2]];
      const u: Vec3 = [v[3 * b] - v[3 * a], v[3 * b + 1] - v[3 * a + 1], v[3 * b + 2] - v[3 * a + 2]];
      const ex = normalize(d);
      let ez = cross(d, u);
      ez = Math.hypot(...ez) > 0 ? normalize(ez) : [0, 0, 1];
      const ey = cross(ez, ex);
      return { origin, axes: [ex, ey, ez] };
    }
  }
  const c = spec.centre === null ? -1 : ids.indexOf(spec.centre);
  if (c >= 0) return { origin: at(x, c), axes: null };
  let m = 0;
  const o = [0, 0, 0];
  for (let i = 0; i < gm.length; i++) {
    m += gm[i];
    for (let k = 0; k < 3; k++) o[k] += gm[i] * x[3 * i + k];
  }
  return { origin: m > 0 ? [o[0] / m, o[1] / m, o[2] / m] : [0, 0, 0], axes: null };
}

/** A position in the frame. */
export function toFrame(frame: Frame, p: Vec3): Vec3 {
  const d: Vec3 = [p[0] - frame.origin[0], p[1] - frame.origin[1], p[2] - frame.origin[2]];
  if (!frame.axes) return d;
  const [ex, ey, ez] = frame.axes;
  return [ex[0] * d[0] + ex[1] * d[1] + ex[2] * d[2], ey[0] * d[0] + ey[1] * d[1] + ey[2] * d[2], ez[0] * d[0] + ez[1] * d[1] + ez[2] * d[2]];
}

/** A direction (a velocity, say) in the frame's axes, without the frame's own turning. */
export function directionToFrame(frame: Frame, d: Vec3): Vec3 {
  if (!frame.axes) return d;
  const [ex, ey, ez] = frame.axes;
  return [ex[0] * d[0] + ex[1] * d[1] + ex[2] * d[2], ey[0] * d[0] + ey[1] * d[1] + ey[2] * d[2], ez[0] * d[0] + ez[1] * d[1] + ez[2] * d[2]];
}

/** A direction in the frame's axes back in the system's. */
export function directionFromFrame(frame: Frame, d: Vec3): Vec3 {
  if (!frame.axes) return d;
  const [ex, ey, ez] = frame.axes;
  return [ex[0] * d[0] + ey[0] * d[1] + ez[0] * d[2], ex[1] * d[0] + ey[1] * d[1] + ez[1] * d[2], ex[2] * d[0] + ey[2] * d[1] + ez[2] * d[2]];
}
