import { GM_SUN, R_SUN } from '../constants';
import { PARSEC } from '../units';

/**
 * Do stars collide when galaxies do? (Chapter 31.) A star crossing a crowd
 * of n stars per unit volume hits one if their centres come within the sum
 * of their radii, so its mean free path is 1/(nσ) with σ = π(R₁ + R₂)². Their
 * gravity bends them towards each other and widens the target, by
 * Safronov's factor 1 + v_esc²/v², where v_esc is the escape speed at
 * contact and v their speed before they meet.
 *
 * Units: pc, km/s, solar radii and masses at the edges.
 */

export interface CollisionEstimate {
  /** Mean free path between direct hits, pc. */
  meanFreePath: number;
  /** The chance that one star hits another on the way across. */
  chance: number;
  /** Direct hits expected among all the stars. */
  hits: number;
  /** Gravity's widening of the target. */
  focusing: number;
  /** Hits expected with it. */
  focusedHits: number;
}

/**
 * Collisions among `stars` stars, each crossing `path` pc through `density`
 * stars per pc³ at relative speed `speed` km/s; every star of `radius` solar
 * radii and `mass` solar masses (default the Sun's).
 */
export function stellarCollisions({
  stars,
  density,
  path,
  speed,
  radius = 1,
  mass = 1,
}: {
  stars: number;
  density: number;
  path: number;
  speed: number;
  radius?: number;
  mass?: number;
}): CollisionEstimate {
  const contact = (2 * radius * R_SUN) / PARSEC;
  const sigma = Math.PI * contact * contact;
  const meanFreePath = 1 / (density * sigma);
  const chance = path / meanFreePath;
  // Escape speed at contact for two such stars: √(2G·2M / 2R) = √(2GM/R)
  const vesc = Math.sqrt((2 * GM_SUN * mass) / (radius * R_SUN)) / 1e3;
  const focusing = 1 + (vesc / speed) ** 2;
  return { meanFreePath, chance, hits: chance * stars, focusing, focusedHits: chance * stars * focusing };
}

/** The numbers Chapter 31 quotes: a hundred billion Sun-like stars, each crossing 30 kpc at 0.1 star per pc³. */
export const CROSSING = { stars: 1e11, density: 0.1, path: 30_000 } as const;
