import { AU } from '../core/constants';
import { formatSignificant } from '../core/math/scientific';
import { ARCMIN, ARCSEC, DEG } from '../core/units';
import { DIAMETERS_KM, EVERYDAY_SCALE, MOON_DISTANCE_KM } from '../data/scale';

/** Examples and formatting for the angle figure (Toolkit T2). Sizes and distances in metres, angles in radians. */

/** Arm's length, m. At 57.3 cm, 1 cm spans 1°: that's why the hand rules work. */
export const ARM = 0.573;

interface Example {
  name: string;
  /** Size across, m. */
  size: number;
  /** Distance, m. */
  distance: number;
}

export const EXAMPLES: readonly Example[] = [
  { name: 'Your little finger at arm’s length', size: 0.01, distance: ARM },
  { name: 'Your fist at arm’s length', size: 0.1, distance: ARM },
  { name: 'Your spread hand at arm’s length', size: 0.2, distance: ARM },
  { name: 'The full Moon', size: DIAMETERS_KM.moon * 1e3, distance: MOON_DISTANCE_KM * 1e3 },
  { name: 'The Sun', size: DIAMETERS_KM.sun * 1e3, distance: AU },
  { name: 'Earth, seen from the Moon', size: 12_742e3, distance: MOON_DISTANCE_KM * 1e3 },
  { name: 'A person 1 km away', size: EVERYDAY_SCALE.person, distance: 1_000 },
  { name: 'The Space Station overhead', size: EVERYDAY_SCALE.issAcross, distance: EVERYDAY_SCALE.issAltitudeKm * 1e3 },
  { name: 'Jupiter, when it is closest', size: DIAMETERS_KM.jupiter * 1e3, distance: 4.2 * AU },
];

/** Slider ranges, as powers of ten of metres. */
export const SIZE_RANGE = [-3, 10] as const;
export const DISTANCE_RANGE = [-1, 13] as const;

/** An angle for reading, in the unit that suits it: 0.52°, 5.8′, 47″. */
export function formatAngle(radians: number): string {
  if (radians >= DEG) return `${formatSignificant(radians / DEG, 3)}°`;
  if (radians >= ARCMIN) return `${formatSignificant(radians / ARCMIN, 3)}′`;
  return `${formatSignificant(radians / ARCSEC, 3)}″`;
}
