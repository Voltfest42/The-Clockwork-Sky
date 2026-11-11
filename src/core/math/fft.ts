/**
 * The fast Fourier transform: Cooley and Tukey's radix-2 algorithm, in place,
 * on separate real and imaginary arrays whose length is a power of two.
 *
 * Conventions: the forward transform is X_k = Σ_n x_n e^(−2πi kn/N), the
 * inverse divides by N, so `fft` then `ifft` gives the input back. Bin k of a
 * series sampled every dt seconds is the frequency k/(N dt) Hz (and N − k is
 * −k/(N dt)).
 */

/** The smallest power of two at least n. */
export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function transform(re: Float64Array, im: Float64Array, sign: 1 | -1): void {
  const n = re.length;
  if (im.length !== n) throw new Error('fft: real and imaginary parts differ in length');
  if (n & (n - 1)) throw new Error(`fft: length ${n} is not a power of two`);
  // Bit-reversed order
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  // Butterflies
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const theta = (sign * 2 * Math.PI) / size;
    const wr = Math.cos(theta);
    const wi = Math.sin(theta);
    for (let start = 0; start < n; start += size) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = start + k;
        const b = a + half;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/** The forward transform, in place. */
export function fft(re: Float64Array, im: Float64Array): void {
  transform(re, im, -1);
}

/** The inverse transform, in place, divided by N. */
export function ifft(re: Float64Array, im: Float64Array): void {
  transform(re, im, 1);
  const n = re.length;
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] /= n;
  }
}

/** The frequency of bin k of an N-point transform of samples dt apart, Hz: negative in the upper half. */
export function binFrequency(k: number, n: number, dt: number): number {
  return (k <= n / 2 ? k : k - n) / (n * dt);
}
