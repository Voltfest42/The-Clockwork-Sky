/** c[0] + c[1]·x + c[2]·x² + …, by Horner's rule. Units are the caller's. */
export function polynomial(x: number, c: readonly number[]): number {
  let sum = 0;
  for (let i = c.length - 1; i >= 0; i--) sum = sum * x + c[i];
  return sum;
}
