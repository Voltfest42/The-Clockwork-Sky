import { equatorialFromGalacticVector } from '../core/coords/galactic';
import type { Vec3 } from '../core/math/vec3';

/**
 * The Milky Way in the sky (Figure 9.5): the galactic equator, the midline of
 * the Galaxy's disc as seen from inside it, and the direction of its centre,
 * as J2000 equatorial unit vectors for the sky view.
 */

/** The Galactic Centre's direction (l = 0, b = 0: next to Sagittarius A*). */
export const GALACTIC_CENTRE: Vec3 = equatorialFromGalacticVector([1, 0, 0]);

/** The opposite direction, the anticentre, in Taurus and Auriga. */
export const GALACTIC_ANTICENTRE: Vec3 = equatorialFromGalacticVector([-1, 0, 0]);

/** The north galactic pole, in Coma Berenices. */
export const GALACTIC_NORTH: Vec3 = equatorialFromGalacticVector([0, 0, 1]);

/** Points round the galactic equator. */
export function galacticEquator(points = 180): Vec3[] {
  return Array.from({ length: points }, (_, i) => {
    const l = (2 * Math.PI * i) / points;
    return equatorialFromGalacticVector([Math.cos(l), Math.sin(l), 0]);
  });
}
