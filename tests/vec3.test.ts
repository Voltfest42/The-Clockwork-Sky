import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  angleBetween,
  apply,
  cross,
  determinant,
  dot,
  fromSpherical,
  IDENTITY,
  multiply,
  norm,
  normalize,
  rotateX,
  rotateY,
  rotateZ,
  rotationX,
  rotationY,
  rotationZ,
  toSpherical,
  transpose,
  type Mat3,
  type Vec3,
} from '../src/core/math/vec3';

const coord = fc.double({ min: -1e3, max: 1e3, noNaN: true });
const vector = fc.tuple(coord, coord, coord) as fc.Arbitrary<Vec3>;
const angle = fc.double({ min: -10, max: 10, noNaN: true });

function expectVectorClose(a: Vec3, b: Vec3, digits = 9) {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], digits);
}

function expectMatrixClose(a: Mat3, b: Mat3, digits = 12) {
  for (let i = 0; i < 3; i++) expectVectorClose(a[i], b[i], digits);
}

describe('vectors', () => {
  it('follows the right-hand rule', () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(dot([1, 2, 3], [4, -5, 6])).toBe(12);
    expect(norm([3, 4, 12])).toBe(13);
    expect(normalize([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('measures tiny angles accurately', () => {
    expect(angleBetween([1, 0, 0], [1, 1e-12, 0])).toBeCloseTo(1e-12, 20);
    expect(angleBetween([1, 0, 0], [-1, 1e-12, 0])).toBeCloseTo(Math.PI - 1e-12, 12);
  });

  it('round-trips spherical coordinates', () => {
    const lon = fc.double({ min: 0, max: 2 * Math.PI - 1e-9, noNaN: true });
    const lat = fc.double({ min: -1.57, max: 1.57, noNaN: true });
    fc.assert(
      fc.property(lon, lat, fc.double({ min: 1e-3, max: 1e6, noNaN: true }), (l, b, r) => {
        const back = toSpherical(fromSpherical(l, b, r));
        expect(back.r / r).toBeCloseTo(1, 12);
        expect(back.lat).toBeCloseTo(b, 9);
        expect(Math.cos(back.lon - l)).toBeCloseTo(1, 9);
      }),
    );
  });
});

describe('rotations', () => {
  it('turns +x towards +y about z, and so on cyclically', () => {
    expectVectorClose(rotateZ([1, 0, 0], Math.PI / 2), [0, 1, 0], 15);
    expectVectorClose(rotateX([0, 1, 0], Math.PI / 2), [0, 0, 1], 15);
    expectVectorClose(rotateY([0, 0, 1], Math.PI / 2), [1, 0, 0], 15);
  });

  it('matrices match the vector rotations, preserve lengths and are proper', () => {
    const pairs = [
      [rotationX, rotateX],
      [rotationY, rotateY],
      [rotationZ, rotateZ],
    ] as const;
    fc.assert(
      fc.property(vector, angle, (v, a) => {
        for (const [matrix, rotate] of pairs) {
          const m = matrix(a);
          expectVectorClose(apply(m, v), rotate(v, a), 9);
          expect(norm(rotate(v, a))).toBeCloseTo(norm(v), 9);
          expect(determinant(m)).toBeCloseTo(1, 12);
          expectMatrixClose(multiply(m, transpose(m)), IDENTITY);
          expectVectorClose(rotate(rotate(v, a), -a), v, 9);
        }
      }),
    );
  });

  it('composes: (a·b)v = a(bv)', () => {
    fc.assert(
      fc.property(vector, angle, angle, (v, a, b) => {
        const ab = multiply(rotationX(a), rotationZ(b));
        expectVectorClose(apply(ab, v), rotateX(rotateZ(v, b), a), 9);
      }),
    );
  });
});
