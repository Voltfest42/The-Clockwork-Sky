/**
 * Elliptic integrals, for the exact precession of orbits and bending of light
 * round a black hole (core/gr/schwarzschild.ts).
 */

/** The complete elliptic integral of the first kind K(k), by the arithmetic–geometric mean: K = π / 2AGM(1, √(1 − k²)). */
export function ellipticK(k: number): number {
  let a = 1;
  let b = Math.sqrt(1 - k * k);
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-15 * a; i++) {
    const m = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = m;
  }
  return Math.PI / (2 * a);
}

/**
 * Carlson's symmetric integral R_F(x, y, z) = ½∫₀^∞ dt / √((t + x)(t + y)(t + z)),
 * by his duplication theorem (Carlson 1995, Numer. Algorithms 10, 13). At most
 * one argument may be zero.
 */
export function carlsonRF(x: number, y: number, z: number): number {
  let xn = x;
  let yn = y;
  let zn = z;
  for (let i = 0; i < 100; i++) {
    const mu = (xn + yn + zn) / 3;
    const dx = 1 - xn / mu;
    const dy = 1 - yn / mu;
    const dz = 1 - zn / mu;
    if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) < 1e-4) {
      const e2 = dx * dy - dz * dz;
      const e3 = dx * dy * dz;
      return (1 - e2 / 10 + e3 / 14 + (e2 * e2) / 24 - (3 * e2 * e3) / 44) / Math.sqrt(mu);
    }
    const sx = Math.sqrt(xn);
    const sy = Math.sqrt(yn);
    const sz = Math.sqrt(zn);
    const lambda = sx * sy + sx * sz + sy * sz;
    xn = (xn + lambda) / 4;
    yn = (yn + lambda) / 4;
    zn = (zn + lambda) / 4;
  }
  return 1 / Math.sqrt((xn + yn + zn) / 3);
}

/**
 * ∫_y^x dt / √((t − a)(b − t)(c − t)) for a ≤ y < x ≤ b < c, exactly, through
 * Carlson's R_F (Carlson 1988, Math. Comp. 51, 267).
 */
export function cubicIntegral(a: number, b: number, c: number, y: number, x: number): number {
  const X1 = Math.sqrt(x - a);
  const X2 = Math.sqrt(Math.max(0, b - x));
  const X3 = Math.sqrt(c - x);
  const Y1 = Math.sqrt(Math.max(0, y - a));
  const Y2 = Math.sqrt(b - y);
  const Y3 = Math.sqrt(c - y);
  const d = x - y;
  const U12 = (X1 * X2 * Y3 + Y1 * Y2 * X3) / d;
  const U13 = (X1 * X3 * Y2 + Y1 * Y3 * X2) / d;
  const U23 = (X2 * X3 * Y1 + Y2 * Y3 * X1) / d;
  return 2 * carlsonRF(U12 * U12, U13 * U13, U23 * U23);
}
