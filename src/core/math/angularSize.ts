/**
 * How big things look: the angle an object spans, from its size and distance.
 * Sizes and distances in metres (any one unit will do, as long as both use it);
 * angles in radians.
 */

/** The exact angle a ball or a flat object of this size spans, seen face-on from its centre's distance: 2·atan(size / 2d). */
export function angularSize(size: number, distance: number): number {
  if (!(distance > 0)) throw new RangeError(`angularSize needs a positive distance, not ${distance}`);
  return 2 * Math.atan(size / (2 * distance));
}

/** The small-angle rule: angle ≈ size ÷ distance, in radians. Good to 1% for angles under about 20° (the error is about θ²/12). */
export function smallAngle(size: number, distance: number): number {
  if (!(distance > 0)) throw new RangeError(`smallAngle needs a positive distance, not ${distance}`);
  return size / distance;
}

/** The small-angle rule turned round: size ≈ distance × angle (radians). */
export function sizeFromAngle(angle: number, distance: number): number {
  return distance * angle;
}

/** How far the small-angle rule is out, as a fraction of the exact angle (positive: the rule gives too much). */
export function smallAngleError(size: number, distance: number): number {
  const exact = angularSize(size, distance);
  return exact === 0 ? 0 : smallAngle(size, distance) / exact - 1;
}
