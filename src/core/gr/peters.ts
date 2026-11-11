/**
 * How long gravitational waves take to bring a pair of compact stars together
 * (Peters 1964), to leading order. SI units: masses in kg, separations in m,
 * times in s.
 */
import { C, G } from '../constants';

/**
 * The time to merge from a circular orbit of separation a: T = (5/256) c⁵ a⁴ / (G³ m₁ m₂ (m₁ + m₂)). For an
 * eccentric orbit this is multiplied by (1 − e²)^(7/2), a fit good to a few per cent for e below about 0.8 that
 * merges eccentric orbits faster, as Peters' full integral does.
 */
export function mergerTime(m1: number, m2: number, a: number, e = 0): number {
  const circular = ((5 / 256) * C ** 5 * a ** 4) / (G ** 3 * m1 * m2 * (m1 + m2));
  return circular * (1 - e * e) ** 3.5;
}
