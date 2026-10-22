import { expect } from 'vitest';
import { wrapPi } from '../src/core/math/angles';
import { ARCSEC } from '../src/core/units';

/** Expects two angles (radians) to agree around the circle, to within a tolerance in arcseconds. */
export function expectAngle(actual: number, expected: number, toleranceArcsec: number, label = 'angle'): void {
  const off = Math.abs(wrapPi(actual - expected)) / ARCSEC;
  expect(off, `${label} is off by ${off.toFixed(4)}″`).toBeLessThanOrEqual(toleranceArcsec);
}

/** Expects |actual − expected| ≤ tolerance, with both values in the failure message. */
export function expectNear(actual: number, expected: number, tolerance: number, label = 'value'): void {
  expect(Math.abs(actual - expected), `${label}: ${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}
