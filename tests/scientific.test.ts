import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  divideScientific,
  formatInWords,
  formatScientific,
  formatSignificant,
  multiplyScientific,
  normalise,
  orderOfMagnitude,
  powerOfTen,
  superscript,
  toScientific,
  withPrefix,
} from '../src/core/math/scientific';
import { expectNear } from './helpers';

const positive = fc.double({ min: 1e-200, max: 1e200, noNaN: true });

describe('scientific notation (Toolkit T1)', () => {
  it('splits numbers into a front number and a power of ten', () => {
    expect(toScientific(12_742_000)).toEqual({ mantissa: 1.2742, exponent: 7 });
    expect(toScientific(0.000_25)).toEqual({ mantissa: 2.5, exponent: -4 });
    expect(toScientific(-300)).toEqual({ mantissa: -3, exponent: 2 });
    expect(toScientific(0)).toEqual({ mantissa: 0, exponent: 0 });
  });

  it('carries the rounding up into the power', () => {
    expect(toScientific(9.996, 3)).toEqual({ mantissa: 1, exponent: 1 });
    expect(toScientific(99_960, 3)).toEqual({ mantissa: 1, exponent: 5 });
  });

  it('always gives a front number from 1 up to (not including) 10, and the same number back', () => {
    fc.assert(
      fc.property(positive, (x) => {
        const { mantissa, exponent } = toScientific(x);
        expect(mantissa).toBeGreaterThanOrEqual(1);
        expect(mantissa).toBeLessThan(10);
        expect(Math.abs((mantissa * 10 ** exponent) / x - 1)).toBeLessThan(1e-12);
      }),
    );
  });

  it('writes powers with superscript digits', () => {
    expect(superscript(21)).toBe('²¹');
    expect(superscript(-3)).toBe('⁻³');
    expect(powerOfTen(13)).toBe('10¹³');
    expect(formatScientific(149_597_870_700)).toBe('1.5 × 10¹¹');
    expect(formatScientific(149_597_870_700, 3, true)).toBe('1.50 × 10¹¹');
    expect(formatScientific(1e6)).toBe('1 × 10⁶');
    expect(formatScientific(4.99)).toBe('4.99');
    expect(formatScientific(-2.5e-7)).toBe('−2.5 × 10⁻⁷');
  });

  it('puts the order-of-magnitude break at √10, not halfway', () => {
    expect(orderOfMagnitude(31)).toBe(1);
    expect(orderOfMagnitude(32)).toBe(2);
    expect(orderOfMagnitude(109)).toBe(2);
    expect(orderOfMagnitude(9.46e15)).toBe(16);
    expect(() => orderOfMagnitude(0)).toThrow();
  });

  it('multiplies by adding powers and divides by subtracting them', () => {
    const sunlight = divideScientific({ mantissa: 1.5, exponent: 11 }, { mantissa: 3, exponent: 8 });
    expect(sunlight.raw).toEqual({ mantissa: 0.5, exponent: 3 });
    expect(sunlight.result.exponent).toBe(2);
    expectNear(sunlight.result.mantissa, 5, 1e-12, 'mantissa');
    const big = multiplyScientific({ mantissa: 3, exponent: 8 }, { mantissa: 4, exponent: 5 });
    expect(big.raw).toEqual({ mantissa: 12, exponent: 13 });
    expect(big.result.exponent).toBe(14);
    expectNear(big.result.mantissa, 1.2, 1e-12, 'mantissa');
  });

  it('agrees with ordinary multiplication and division', () => {
    const sci = fc.record({ mantissa: fc.double({ min: 1, max: 9.999, noNaN: true }), exponent: fc.integer({ min: -60, max: 60 }) });
    fc.assert(
      fc.property(sci, sci, (a, b) => {
        const x = a.mantissa * 10 ** a.exponent;
        const y = b.mantissa * 10 ** b.exponent;
        for (const [{ result }, expected] of [
          [multiplyScientific(a, b), x * y],
          [divideScientific(a, b), x / y],
        ] as const) {
          expect(result.mantissa).toBeGreaterThanOrEqual(1);
          expect(result.mantissa).toBeLessThan(10);
          expect(Math.abs((result.mantissa * 10 ** result.exponent) / expected - 1)).toBeLessThan(1e-9);
        }
      }),
    );
  });

  it('tidies up front numbers outside 1 to 10', () => {
    expect(normalise({ mantissa: 0.5, exponent: 3 })).toEqual({ mantissa: 5, exponent: 2 });
    expect(normalise({ mantissa: 1000, exponent: -2 }).exponent).toBe(1);
  });

  it('picks SI prefixes', () => {
    expect(withPrefix(1.5e11)).toMatchObject({ prefix: { name: 'giga' } });
    expectNear(withPrefix(1.5e11).value, 150, 1e-9, 'value');
    expect(withPrefix(1000).prefix.symbol).toBe('k');
    expect(withPrefix(0.002).prefix.name).toBe('milli');
    expect(withPrefix(5).prefix.name).toBe('');
  });

  it('writes big numbers in words', () => {
    expect(formatInWords(2.59e13)).toBe('25.9 trillion');
    expect(formatInWords(1_391_400)).toBe('1.39 million');
    expect(formatInWords(999.9e12)).toBe('1 quadrillion');
    expect(formatInWords(12_742)).toBe('12,700');
    expect(formatSignificant(0.000_25)).toBe('0.00025');
    expect(formatSignificant(149_597_870.7)).toBe('150,000,000');
  });
});
