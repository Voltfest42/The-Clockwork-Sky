import { normalizeRadians } from './angles';

/**
 * Small 3D vectors and rotation matrices, as plain tuples. Units are whatever
 * the caller uses (metres, AU, unit vectors); angles are in radians.
 *
 * Rotations are active and right-handed: rotateZ(v, θ) turns the vector v by θ
 * anticlockwise about +z, seen from +z looking back at the origin. To express a
 * fixed vector in a frame that is itself turned by θ, rotate it by −θ.
 */
export type Vec3 = readonly [number, number, number];

/** A 3×3 matrix as three rows. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(v: Vec3, k: number): Vec3 {
  return [v[0] * k, v[1] * k, v[2] * k];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** The vector's length. */
export function norm(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

/** A unit vector along v. The zero vector stays zero. */
export function normalize(v: Vec3): Vec3 {
  const length = norm(v);
  return length === 0 ? [0, 0, 0] : scale(v, 1 / length);
}

export function distance(a: Vec3, b: Vec3): number {
  return norm(sub(a, b));
}

/** The angle between two vectors, in radians [0, π]. Accurate for tiny and near-π angles. */
export function angleBetween(a: Vec3, b: Vec3): number {
  return Math.atan2(norm(cross(a, b)), dot(a, b));
}

/**
 * A vector from spherical coordinates: longitude (from +x towards +y) and
 * latitude (towards +z), in radians, and a length r.
 */
export function fromSpherical(lon: number, lat: number, r = 1): Vec3 {
  const cosLat = Math.cos(lat);
  return [r * cosLat * Math.cos(lon), r * cosLat * Math.sin(lon), r * Math.sin(lat)];
}

/** Spherical coordinates of a vector: longitude in [0, 2π), latitude in [−π/2, π/2], and length. */
export function toSpherical(v: Vec3): { lon: number; lat: number; r: number } {
  return { lon: normalizeRadians(Math.atan2(v[1], v[0])), lat: Math.atan2(v[2], Math.hypot(v[0], v[1])), r: norm(v) };
}

// ---------- rotations ----------

/** Rotates v by angle (radians) about the x axis. */
export function rotateX(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
}

/** Rotates v by angle (radians) about the y axis. */
export function rotateY(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]];
}

/** Rotates v by angle (radians) about the z axis. */
export function rotateZ(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
}

/** The matrix that rotates vectors by angle (radians) about x, as rotateX does. */
export function rotationX(angle: number): Mat3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ];
}

/** The matrix that rotates vectors by angle (radians) about y, as rotateY does. */
export function rotationY(angle: number): Mat3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c],
  ];
}

/** The matrix that rotates vectors by angle (radians) about z, as rotateZ does. */
export function rotationZ(angle: number): Mat3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
}

export const IDENTITY: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** m·v. */
export function apply(m: Mat3, v: Vec3): Vec3 {
  return [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
}

/** a·b: applying the result applies b first, then a. */
export function multiply(a: Mat3, b: Mat3): Mat3 {
  const t = transpose(b);
  return [
    [dot(a[0], t[0]), dot(a[0], t[1]), dot(a[0], t[2])],
    [dot(a[1], t[0]), dot(a[1], t[1]), dot(a[1], t[2])],
    [dot(a[2], t[0]), dot(a[2], t[1]), dot(a[2], t[2])],
  ];
}

/** The transpose, which for a rotation is its inverse. */
export function transpose(m: Mat3): Mat3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ];
}

export function determinant(m: Mat3): number {
  return dot(m[0], cross(m[1], m[2]));
}
