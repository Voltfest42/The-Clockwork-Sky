/**
 * The error function, and the share of a Maxwellian crowd slower than a
 * given speed, which Chandrasekhar's dynamical friction needs (Chapter 31).
 */

/**
 * erf(x), good to about 10⁻¹³: its Taylor series up to |x| = 3 (whose
 * alternating terms cost about four digits at the top), and beyond it
 * 1 − erfc(x) from erfc's continued fraction, evaluated from the tail.
 */
export function erf(x: number): number {
  if (x < 0) return -erf(-x);
  if (x <= 3) {
    // erf(x) = 2/√π Σ (−1)ⁿ x^(2n+1) / (n! (2n+1))
    let term = x;
    let sum = x;
    const x2 = x * x;
    for (let n = 1; n < 80; n++) {
      term *= -x2 / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
    }
    return (2 / Math.sqrt(Math.PI)) * sum;
  }
  return 1 - erfc(x);
}

/** erfc(x) = 1 − erf(x), for x > 3 by the continued fraction erfc(x) = e^(−x²)/√π · 1/(x + ½/(x + 1/(x + 3⁄2/(x + …)))). */
export function erfc(x: number): number {
  if (x <= 3) return 1 - erf(x);
  let t = x;
  for (let k = 60; k >= 1; k--) t = x + k / 2 / t;
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / t;
}

/**
 * The share of a Maxwellian crowd (one-dimensional dispersion σ) moving
 * slower than speed v, with X = v / (√2 σ):
 *
 *   F(X) = erf(X) − (2X/√π) e^(−X²).
 *
 * Only the slower field stars brake a body passing through (Chandrasekhar
 * 1943). For small X the two terms nearly cancel, so the series
 * F = (2/√π) Σ (−1)ⁿ⁺¹ 2n X^(2n+1) / (n! (2n+1)), which starts at
 * 4X³/(3√π), is used below X = 1.
 */
export function slowerShare(X: number): number {
  if (X <= 0) return 0;
  if (X >= 1) return erf(X) - ((2 * X) / Math.sqrt(Math.PI)) * Math.exp(-X * X);
  const X2 = X * X;
  // term_n = (−1)ⁿ X^(2n+1) / n!, and F adds term_n · (1/(2n+1) − 1)
  let term = X;
  let sum = 0;
  for (let n = 1; n < 40; n++) {
    term *= -X2 / n;
    const add = term * (1 / (2 * n + 1) - 1);
    sum += add;
    if (Math.abs(add) < 1e-18 * Math.abs(sum)) break;
  }
  return (2 / Math.sqrt(Math.PI)) * sum;
}
