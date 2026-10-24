/**
 * Finding where a function crosses zero, and where it peaks, by scanning in
 * fixed steps and then bisecting each bracket. The functions are smooth
 * quantities of time (an angle, a rate), so a step much shorter than the
 * fastest change finds every crossing. Units are whatever the caller's are.
 */

/** Where f changes sign between a and b (with f(a) and f(b) of opposite signs), to within tol. */
export function bisect(f: (x: number) => number, a: number, b: number, tol: number, fa = f(a)): number {
  let lo = a;
  let hi = b;
  let flo = fa;
  for (let i = 0; i < 200 && hi - lo > tol; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm === 0) return mid;
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

export interface Crossing {
  x: number;
  /** +1 where f goes from negative to positive, −1 the other way. */
  direction: 1 | -1;
}

/**
 * Every crossing of zero of f in [from, to], found by sampling every `step`
 * and bisecting to `tol`. A jump of f by more than `maxJump` between samples
 * (an angle wrapping round from +π to −π) is not counted as a crossing.
 */
export function crossings(f: (x: number) => number, from: number, to: number, step: number, tol: number, maxJump = Infinity): Crossing[] {
  const out: Crossing[] = [];
  let x0 = from;
  let f0 = f(x0);
  while (x0 < to) {
    const x1 = Math.min(to, x0 + step);
    const f1 = f(x1);
    if (f0 !== 0 && f1 !== 0 && Math.sign(f0) !== Math.sign(f1) && Math.abs(f1 - f0) <= maxJump) {
      out.push({ x: bisect(f, x0, x1, tol, f0), direction: f1 > 0 ? 1 : -1 });
    } else if (f1 === 0) {
      out.push({ x: x1, direction: f0 < 0 ? 1 : -1 });
    }
    x0 = x1;
    f0 = f1;
  }
  return out;
}
