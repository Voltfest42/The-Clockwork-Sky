/**
 * The five Lagrange points of two bodies on circular orbits about each other:
 * where a third, light body can ride along with them, held in place by their
 * pulls and the turning of the frame. L1, L2 and L3 lie on the line through
 * the two bodies and are unstable; L4 and L5 make equilateral triangles with
 * them and, for mass ratios below about 1/25, are stable.
 *
 * The frame turns with the pair: its origin is their centre of mass, +x points
 * from the heavier body to the lighter, +y along the lighter body's motion.
 * Distances are fractions of the pair's separation.
 */

export interface LagrangePoint {
  name: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  x: number;
  y: number;
}

/**
 * The points for a mass ratio q = m₂/(m₁ + m₂), the lighter body's share
 * (0 < q ≤ ½). The collinear points solve the balance of the two pulls and
 * the centrifugal push, by Newton's method from Hill's approximation.
 */
export function lagrangePoints(q: number): LagrangePoint[] {
  if (!(q > 0 && q <= 0.5)) throw new RangeError('The mass ratio must be between 0 and ½.');
  const x1 = -q; // the heavier body
  const x2 = 1 - q; // the lighter one
  // The net pull along the line at x, in the turning frame (units: G(m₁ + m₂) = 1, separation 1).
  const force = (x: number) => x - ((1 - q) * (x - x1)) / Math.abs(x - x1) ** 3 - (q * (x - x2)) / Math.abs(x - x2) ** 3;
  const solve = (start: number) => {
    let x = start;
    for (let k = 0; k < 100; k++) {
      const h = 1e-7;
      const f = force(x);
      const d = (force(x + h) - force(x - h)) / (2 * h);
      const next = x - f / d;
      if (Math.abs(next - x) < 1e-15) return next;
      x = next;
    }
    return x;
  };
  const hill = Math.cbrt(q / 3);
  return [
    { name: 'L1', x: solve(x2 - hill), y: 0 },
    { name: 'L2', x: solve(x2 + hill), y: 0 },
    { name: 'L3', x: solve(x1 - 1 + (5 * q) / 12), y: 0 },
    { name: 'L4', x: 0.5 - q, y: Math.sqrt(3) / 2 },
    { name: 'L5', x: 0.5 - q, y: -Math.sqrt(3) / 2 },
  ];
}

/** The radius of a body's Hill sphere (L): where its own pull wins over its parent's tide. Semi-major axis a in L. */
export function hillRadius(a: number, e: number, gmBody: number, gmParent: number): number {
  return a * (1 - e) * Math.cbrt(gmBody / (3 * gmParent));
}
