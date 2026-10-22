import { clamp } from '../../core/math/angles';
import type { Vec3 } from '../../core/math/vec3';

/**
 * An orbit-style camera, as pure maths: it circles a target point at some
 * distance, looking at it. World axes are z-up (the plane of a scene is x–y),
 * as in the ecliptic and galactic frames of src/core. Angles in radians;
 * distance in the scene's own units.
 */
export interface OrbitCameraState {
  target: Vec3;
  /** Angle round the z axis, from +x towards +y. */
  azimuth: number;
  /** Angle above the x–y plane, −π/2 to π/2. */
  elevation: number;
  distance: number;
}

export interface OrbitLimits {
  minDistance: number;
  maxDistance: number;
  /** The camera never goes quite over the poles, so "up" stays defined. */
  maxElevation: number;
}

export const DEFAULT_LIMITS: OrbitLimits = { minDistance: 1e-6, maxDistance: 1e12, maxElevation: (89 * Math.PI) / 180 };

/** Where the camera is, in world coordinates. */
export function cameraPosition({ target, azimuth, elevation, distance }: OrbitCameraState): Vec3 {
  const c = Math.cos(elevation);
  return [target[0] + distance * c * Math.cos(azimuth), target[1] + distance * c * Math.sin(azimuth), target[2] + distance * Math.sin(elevation)];
}

/** Turns the camera round the target. */
export function rotate(state: OrbitCameraState, dAzimuth: number, dElevation: number, limits: OrbitLimits = DEFAULT_LIMITS): OrbitCameraState {
  return {
    ...state,
    azimuth: state.azimuth + dAzimuth,
    elevation: clamp(state.elevation + dElevation, -limits.maxElevation, limits.maxElevation),
  };
}

/** Moves the camera towards (factor < 1) or away from (factor > 1) the target. */
export function zoom(state: OrbitCameraState, factor: number, limits: OrbitLimits = DEFAULT_LIMITS): OrbitCameraState {
  if (!(factor > 0)) return state;
  return { ...state, distance: clamp(state.distance * factor, limits.minDistance, limits.maxDistance) };
}

/** How much one key press turns or zooms. */
export const KEY_TURN = (5 * Math.PI) / 180;
export const KEY_ZOOM = 1.2;

/**
 * The camera after a key press, or null if the key isn't a camera key.
 * Arrows turn, + and − (or Page Up and Page Down) zoom. Home is handled by the
 * scene, which knows where "home" is.
 */
export function cameraKey(state: OrbitCameraState, key: string, limits: OrbitLimits = DEFAULT_LIMITS): OrbitCameraState | null {
  switch (key) {
    case 'ArrowLeft':
      return rotate(state, -KEY_TURN, 0, limits);
    case 'ArrowRight':
      return rotate(state, KEY_TURN, 0, limits);
    case 'ArrowUp':
      return rotate(state, 0, KEY_TURN, limits);
    case 'ArrowDown':
      return rotate(state, 0, -KEY_TURN, limits);
    case '+':
    case '=':
    case 'PageUp':
      return zoom(state, 1 / KEY_ZOOM, limits);
    case '-':
    case '_':
    case 'PageDown':
      return zoom(state, KEY_ZOOM, limits);
    default:
      return null;
  }
}

/** Turning per pixel dragged: half a turn across a 600-pixel view. */
export function dragRotation(dx: number, dy: number, viewHeight: number): [number, number] {
  const perPixel = Math.PI / Math.max(300, viewHeight);
  return [-dx * perPixel, dy * perPixel];
}

/** Zoom factor for a wheel movement (deltaY in pixels): 10% per notch of 100 px. */
export function wheelZoom(deltaY: number): number {
  return Math.exp(clamp(deltaY, -500, 500) * 0.001);
}
