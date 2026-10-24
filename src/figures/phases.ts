import { SYNODIC_MONTH } from '../core/ephemeris/lunation';
import { wrapPi } from '../core/math/angles';
import { DEG } from '../core/units';

/**
 * The phase machine's geometry, in an idealised setting: an observer on the
 * equator at an equinox, with the Moon's orbit in the plane of the equator.
 * Then the Sun rises at 06:00 and sets at 18:00, and everything on the sky
 * moves along one arc from east to west, so the Moon's place in the sky
 * follows from its elongation (how far east of the Sun it is) and the time of
 * day alone. Angles in radians; times in hours.
 */

/** The elongation for a Moon `age` days after new Moon. */
export function elongationOfAge(age: number): number {
  return (2 * Math.PI * age) / SYNODIC_MONTH;
}

/** The age (days after new Moon, 0 to 29.53) for an elongation. */
export function ageOfElongation(elongation: number): number {
  const e = ((elongation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return (e / (2 * Math.PI)) * SYNODIC_MONTH;
}

/** The lit fraction of the disc we see: 0 at new Moon, 1 at full. */
export function illuminated(elongation: number): number {
  return (1 - Math.cos(elongation)) / 2;
}

/** The hour angle of the Sun at a clock time (hours): 0 at noon, negative in the morning. Radians, (−π, π]. */
export function sunHourAngle(hour: number): number {
  return wrapPi((hour - 12) * 15 * DEG);
}

/** The Moon's hour angle: it trails the Sun across the sky by its elongation. */
export function moonHourAngle(hour: number, elongation: number): number {
  return wrapPi(sunHourAngle(hour) - elongation);
}

/** Altitude on the idealised sky for an hour angle: 90° overhead at 0, on the horizon at ±90°. Radians. */
export function altitudeOf(hourAngle: number): number {
  return Math.PI / 2 - Math.abs(hourAngle);
}

/** When the Moon rises, crosses the meridian (highest) and sets, in clock hours (0 to 24), for an elongation. */
export function moonTimes(elongation: number): { rise: number; highest: number; set: number } {
  const lag = (ageOfElongation(elongation) / SYNODIC_MONTH) * 24;
  const at = (h: number) => (((h + lag) % 24) + 24) % 24;
  return { rise: at(6), highest: at(12), set: at(18) };
}

/** "18:00" from hours. */
export function hourText(hours: number): string {
  const total = Math.round((((hours % 24) + 24) % 24) * 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * The lit part of the Moon's disc as seen from Earth, as an SVG path for a
 * disc of radius r centred at the origin, drawn with the lit side on the
 * right (mirror it for a waning Moon, or from the southern hemisphere): a
 * half circle for the lit limb, closed by the terminator, half an ellipse.
 */
export function litPath(elongation: number, r: number): string {
  if (illuminated(elongation) < 0.002) return '';
  const rx = r * Math.abs(Math.cos(elongation));
  const crescent = Math.cos(elongation) > 0;
  return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx} ${r} 0 0 ${crescent ? 0 : 1} 0 ${-r} Z`;
}

/** Whether the lit side is on the right as seen from the northern hemisphere (a waxing Moon). */
export function litOnRight(elongation: number): boolean {
  const e = ((elongation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return e < Math.PI;
}
