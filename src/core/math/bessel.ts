import { polynomial } from './poly';

/**
 * Modified Bessel functions of the first and second kinds, orders 0 and 1,
 * for x > 0, by Abramowitz & Stegun's polynomial approximations 9.8.1–9.8.8
 * (relative errors below about 2 × 10⁻⁷). They give an exponential disc's
 * circular speed (Freeman 1970). The scaled forms, e^(−x) I(x) and e^x K(x),
 * keep products such as I₀K₀ finite far out.
 */

/** e^(−x) I₀(x). */
export function besselI0Scaled(x: number): number {
  const ax = Math.abs(x);
  if (ax < 3.75) {
    const t = (x / 3.75) ** 2;
    return Math.exp(-ax) * polynomial(t, [1, 3.5156229, 3.0899424, 1.2067492, 0.2659732, 0.0360768, 0.0045813]);
  }
  const t = 3.75 / ax;
  return polynomial(t, [0.39894228, 0.01328592, 0.00225319, -0.00157565, 0.00916281, -0.02057706, 0.02635537, -0.01647633, 0.00392377]) / Math.sqrt(ax);
}

/** e^(−x) I₁(x). */
export function besselI1Scaled(x: number): number {
  const ax = Math.abs(x);
  let value: number;
  if (ax < 3.75) {
    const t = (x / 3.75) ** 2;
    value = ax * Math.exp(-ax) * polynomial(t, [0.5, 0.87890594, 0.51498869, 0.15084934, 0.02658733, 0.00301532, 0.00032411]);
  } else {
    const t = 3.75 / ax;
    value = polynomial(t, [0.39894228, -0.03988024, -0.00362018, 0.00163801, -0.01031555, 0.02282967, -0.02895312, 0.01787654, -0.00420059]) / Math.sqrt(ax);
  }
  return x < 0 ? -value : value;
}

/** e^x K₀(x), x > 0. */
export function besselK0Scaled(x: number): number {
  if (x <= 2) {
    const t = (x / 2) ** 2;
    const i0 = besselI0Scaled(x) * Math.exp(x);
    return Math.exp(x) * (-Math.log(x / 2) * i0 + polynomial(t, [-0.57721566, 0.4227842, 0.23069756, 0.0348859, 0.00262698, 0.0001075, 0.0000074]));
  }
  const t = 2 / x;
  return polynomial(t, [1.25331414, -0.07832358, 0.02189568, -0.01062446, 0.00587872, -0.0025154, 0.00053208]) / Math.sqrt(x);
}

/** e^x K₁(x), x > 0. */
export function besselK1Scaled(x: number): number {
  if (x <= 2) {
    const t = (x / 2) ** 2;
    const i1 = besselI1Scaled(x) * Math.exp(x);
    return (Math.exp(x) * (x * Math.log(x / 2) * i1 + polynomial(t, [1, 0.15443144, -0.67278579, -0.18156897, -0.01919402, -0.00110404, -0.00004686]))) / x;
  }
  const t = 2 / x;
  return polynomial(t, [1.25331414, 0.23498619, -0.0365562, 0.01504268, -0.00780353, 0.00325614, -0.00068245]) / Math.sqrt(x);
}

export const besselI0 = (x: number) => besselI0Scaled(x) * Math.exp(Math.abs(x));
export const besselI1 = (x: number) => besselI1Scaled(x) * Math.exp(Math.abs(x));
export const besselK0 = (x: number) => besselK0Scaled(x) * Math.exp(-x);
export const besselK1 = (x: number) => besselK1Scaled(x) * Math.exp(-x);
