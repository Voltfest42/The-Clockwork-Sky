import type { Vec3 } from '../math/vec3';

/**
 * The sky view's camera and its stereographic projection, which maps the
 * celestial sphere onto the screen as seen from its centre. Stereographic
 * projection keeps small shapes true (a constellation looks the same anywhere
 * on the screen) and maps circles on the sky to circles on the screen, so the
 * horizon and the stars' daily paths stay round.
 *
 * Directions are unit vectors in a "local" right-handed frame. In the view
 * from the ground that frame is east, north, up; the camera's azimuth is
 * measured from +y (north) through +x (east), and its altitude towards +z
 * (the zenith). The screen's right always lies level with the local frame's
 * equator, so the horizon never tilts. Angles in radians.
 */

export interface SkyCamera {
  /** Where the centre of the view points: azimuth from +y towards +x. */
  az: number;
  /** …and altitude towards +z. */
  alt: number;
  /** Width of the view, as an angle on the sky. */
  fov: number;
}

export interface CameraBasis {
  /** The screen's right, up and into-the-screen directions, in the local frame. */
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

/** The narrowest and widest views. */
export const MIN_FOV = (2 * Math.PI) / 180;
export const MAX_FOV = Math.PI;

/** The direction with an azimuth and altitude, as a unit vector in the local frame. */
export function localDirection(az: number, alt: number): Vec3 {
  const c = Math.cos(alt);
  return [c * Math.sin(az), c * Math.cos(az), Math.sin(alt)];
}

/** The azimuth (from +y through +x, [0, 2π)) and altitude of a local direction. */
export function azAlt(v: Vec3): { az: number; alt: number } {
  let az = Math.atan2(v[0], v[1]);
  if (az < 0) az += 2 * Math.PI;
  return { az, alt: Math.atan2(v[2], Math.hypot(v[0], v[1])) };
}

/** The camera's screen directions for a view centred on (az, alt). Defined even straight up or down. */
export function cameraBasis(az: number, alt: number): CameraBasis {
  const forward = localDirection(az, alt);
  const right: Vec3 = [Math.cos(az), -Math.sin(az), 0];
  // up = right × forward
  const up: Vec3 = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];
  return { right, up, forward };
}

/**
 * Projects a unit vector onto the plane of the view: X to the right and Y up,
 * in units where the centre of the view is 0 and a point 90° away is at
 * distance 2. Also returns how far the point is towards the view's centre
 * (cos of its angle from the centre), for culling.
 */
export function project(v: Vec3, basis: CameraBasis): { X: number; Y: number; depth: number } {
  const x = v[0] * basis.right[0] + v[1] * basis.right[1] + v[2] * basis.right[2];
  const y = v[0] * basis.up[0] + v[1] * basis.up[1] + v[2] * basis.up[2];
  const z = v[0] * basis.forward[0] + v[1] * basis.forward[1] + v[2] * basis.forward[2];
  const k = 2 / (1 + z);
  return { X: k * x, Y: k * y, depth: z };
}

/** The inverse of project: the unit vector at a point (X, Y) of the view. */
export function unproject(X: number, Y: number, basis: CameraBasis): Vec3 {
  const rho2 = X * X + Y * Y;
  const d = 4 + rho2;
  const x = (4 * X) / d;
  const y = (4 * Y) / d;
  const z = (4 - rho2) / d;
  return [
    x * basis.right[0] + y * basis.up[0] + z * basis.forward[0],
    x * basis.right[1] + y * basis.up[1] + z * basis.forward[1],
    x * basis.right[2] + y * basis.up[2] + z * basis.forward[2],
  ];
}

/** Pixels per projection unit for a view `fov` wide that is `width` pixels across. */
export function projectionScale(fov: number, width: number): number {
  return width / 2 / (2 * Math.tan(fov / 4));
}

/** The angle from the centre of the view to a projected point at distance ρ (projection units). Radians. */
export function angleFromCentre(rho: number): number {
  return 2 * Math.atan(rho / 2);
}

/**
 * Where the local frame's equator (the horizon, in the view from the ground)
 * falls on the projection plane, for a camera at altitude `alt`. It's a circle
 * centred on the vertical axis, or the line Y = 0 when the camera looks level.
 * `groundInside` says whether the part below the horizon is inside the circle.
 */
export function horizonOnScreen(alt: number): { kind: 'line' } | { kind: 'circle'; centreY: number; radius: number; groundInside: boolean } {
  const b = Math.sin(alt);
  if (Math.abs(b) < 1e-9) return { kind: 'line' };
  const a = Math.cos(alt);
  return { kind: 'circle', centreY: (2 * a) / b, radius: 2 / Math.abs(b), groundInside: b < 0 };
}
