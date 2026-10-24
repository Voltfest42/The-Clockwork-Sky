import { TIDE_BODIES } from '../data/gravity';

/**
 * Tides (Figure 7.5). What raises them is the difference in a body's pull
 * across Earth: subtract the pull at Earth's centre from the pull at each
 * point and what is left stretches Earth along the line to the body. Close to
 * Earth that leftover is, very nearly, G M / d³ (3 (r·d̂) d̂ − r) for a point
 * r from Earth's centre: it falls off with the cube of the distance d.
 *
 * Heights are the equilibrium tide, the static shape the oceans would take if
 * they could keep up, at the equator with the Moon and the Sun overhead there:
 * ζ = (M / M⊕) (R⊕ / d)³ R⊕ (3 cos² ψ − 1) / 2, in metres, where ψ is the
 * angle from the point under the body.
 */

const { moon, sun, earth } = TIDE_BODIES;

/** How strong the Sun's tide is next to the Moon's: (M☉ / M☾) (d☾ / d☉)³, about 0.46. */
export const SUN_TIDE_RATIO = (sun.mass / moon.mass) * (moon.distance / sun.distance) ** 3;

/** How much harder the Sun pulls on Earth than the Moon does: (M☉ / M☾) (d☾ / d☉)², about 178. */
export const SUN_PULL_RATIO = (sun.mass / moon.mass) * (moon.distance / sun.distance) ** 2;

/** The Moon's equilibrium tide: the height (m) of the bulge under it, above the undisturbed sea level. */
export const MOON_TIDE = (moon.mass / earth.mass) * (earth.radius / moon.distance) ** 3 * earth.radius * 1000;

/** The same for the Sun. */
export const SUN_TIDE = MOON_TIDE * SUN_TIDE_RATIO;

/** A lunar day: from the Moon overhead to the Moon overhead again, hours. */
export const LUNAR_DAY_HOURS = 24 + 50 / 60;

/** The synodic month, new Moon to new Moon, days. */
export const SYNODIC_MONTH = 29.530_59;

const p2 = (c: number) => (3 * c * c - 1) / 2;

/**
 * The equilibrium tide's height (m) at a point on the equator `angle` radians
 * round (anticlockwise, seen from above the North Pole) from the point under
 * the Moon, with the Sun in direction `sunAngle` measured the same way, or
 * without the Sun.
 */
export function tideHeight(angle: number, sunAngle: number, withSun: boolean): number {
  return MOON_TIDE * p2(Math.cos(angle)) + (withSun ? SUN_TIDE * p2(Math.cos(angle - sunAngle)) : 0);
}

/** The difference between high and low water round the equator (m), with the Sun in direction `sunAngle` (radians from the Moon's). */
export function tideRange(sunAngle: number, withSun: boolean): number {
  let hi = -Infinity;
  let lo = Infinity;
  for (let i = 0; i < 720; i++) {
    const h = tideHeight((2 * Math.PI * i) / 720, sunAngle, withSun);
    hi = Math.max(hi, h);
    lo = Math.min(lo, h);
  }
  return hi - lo;
}

/**
 * The stretching pull at a point (x, y) inside Earth (in Earth radii from its
 * centre) from a body in direction `towards` (radians): 3 (r·d̂) d̂ − r, in
 * units where the stretch at the surface under the body is 2.
 */
export function stretch(x: number, y: number, towards: number): { x: number; y: number } {
  const dx = Math.cos(towards);
  const dy = Math.sin(towards);
  const along = x * dx + y * dy;
  return { x: 3 * along * dx - x, y: 3 * along * dy - y };
}

/** The harbour's angle from the point under the Moon (radians) after `hours` of Earth's turning, starting with the Moon overhead. */
export function harbourAngle(hours: number): number {
  return (2 * Math.PI * hours) / LUNAR_DAY_HOURS;
}

/**
 * The Sun's direction from Earth, in radians anticlockwise from the Moon's
 * (seen from above the North Pole), a number of days after new Moon. The Moon
 * moves anticlockwise, ahead of the Sun, so the Sun falls behind it: 0 at new
 * Moon, −π/2 at first quarter, −π at full Moon.
 */
export function sunAngleAfter(days: number): number {
  return (-2 * Math.PI * days) / SYNODIC_MONTH;
}
