/**
 * Working with a gravitational-wave detector's strain: windows, the noise's
 * spectrum (Welch's method), whitening and band-passing, the analytic signal,
 * the spectrogram, and the match between a model and data, as LIGO's own
 * tutorials do it (gwosc.org). Pure arithmetic on sampled series: times in
 * seconds, frequencies in hertz, sample rates in samples per second. Strain
 * is dimensionless.
 */
import { fft, ifft, nextPowerOfTwo } from '../math/fft';

/** A Hann window of n points (zero at both ends). */
export function hann(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

/** A Tukey window: flat in the middle, with a Hann taper over `alpha` of its length, split between the ends. */
export function tukey(n: number, alpha: number): Float64Array {
  const w = new Float64Array(n).fill(1);
  const edge = Math.floor((alpha * (n - 1)) / 2);
  for (let i = 0; i < edge; i++) {
    const v = 0.5 - 0.5 * Math.cos((Math.PI * i) / edge);
    w[i] = v;
    w[n - 1 - i] = v;
  }
  return w;
}

/**
 * The one-sided power spectral density of a series by Welch's method: Hann-windowed segments of `segment` samples
 * (a power of two), overlapping by half, their periodograms averaged. Returns the PSD (strain²/Hz) at frequencies
 * k·fs/segment for k = 0 … segment/2.
 */
export function welchPsd(x: ArrayLike<number>, fs: number, segment: number): { freqs: Float64Array; psd: Float64Array } {
  const w = hann(segment);
  const norm = w.reduce((s, v) => s + v * v, 0);
  const half = segment / 2;
  const psd = new Float64Array(half + 1);
  let count = 0;
  const re = new Float64Array(segment);
  const im = new Float64Array(segment);
  for (let start = 0; start + segment <= x.length; start += half) {
    for (let i = 0; i < segment; i++) {
      re[i] = x[start + i] * w[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k <= half; k++) psd[k] += (re[k] * re[k] + im[k] * im[k]) * (k === 0 || k === half ? 1 : 2);
    count++;
  }
  for (let k = 0; k <= half; k++) psd[k] /= count * norm * fs;
  const freqs = Float64Array.from({ length: half + 1 }, (_, k) => (k * fs) / segment);
  return { freqs, psd };
}

/** A smooth band: 1 between lo and hi, falling to 0 over `roll` Hz outside them by half a cosine. */
export function bandMask(f: number, lo: number, hi: number, roll: number): number {
  const a = Math.abs(f);
  if (a >= lo && a <= hi) return 1;
  if (a < lo - roll || a > hi + roll) return 0;
  const d = a < lo ? lo - a : a - hi;
  return 0.5 + 0.5 * Math.cos((Math.PI * d) / roll);
}

/**
 * Whitens a series and band-passes it: divides its Fourier transform by the noise's amplitude spectral density
 * `asd(f)` (strain/√Hz) and keeps the band [lo, hi] Hz. The series is tapered at its ends (a Tukey window over
 * `taper` of its length) and zero-padded to a power of two. Whitening weighs every frequency by how quiet the
 * detector is there, so a signal stands out of the noise as it would to a matched filter.
 */
export function whiten(x: ArrayLike<number>, fs: number, asd: (f: number) => number, lo: number, hi: number, taper = 0.1, roll = 8): Float64Array {
  const n = x.length;
  const size = nextPowerOfTwo(n);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const w = tukey(n, taper);
  for (let i = 0; i < n; i++) re[i] = x[i] * w[i];
  fft(re, im);
  for (let k = 0; k < size; k++) {
    const f = (k <= size / 2 ? k : size - k) * (fs / size);
    const m = bandMask(f, lo, hi, roll);
    const g = m > 0 ? m / asd(f) : 0;
    re[k] *= g;
    im[k] *= g;
  }
  ifft(re, im);
  return re.slice(0, n);
}

/** The Hilbert transform of a real series (the imaginary part of its analytic signal): every component turned a quarter-cycle. */
export function hilbert(x: ArrayLike<number>): Float64Array {
  const n = x.length;
  const size = nextPowerOfTwo(n);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let i = 0; i < n; i++) re[i] = x[i];
  fft(re, im);
  // Analytic signal: keep positive frequencies, doubled; drop negative ones
  for (let k = 1; k < size / 2; k++) {
    re[k] *= 2;
    im[k] *= 2;
  }
  for (let k = size / 2 + 1; k < size; k++) {
    re[k] = 0;
    im[k] = 0;
  }
  ifft(re, im);
  return im.slice(0, n);
}

/**
 * Raises a narrow-band signal by an octave without changing its timing: from its analytic signal A e^(iφ), the real
 * part of A e^(2iφ). For a chirp that is the same chirp at twice the pitch, for small speakers.
 */
export function octaveUp(x: ArrayLike<number>): Float64Array {
  const q = hilbert(x);
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const a = Math.hypot(x[i], q[i]);
    out[i] = a > 0 ? (x[i] * x[i] - q[i] * q[i]) / a : 0;
  }
  return out;
}

export interface Spectrogram {
  /** The centre of each column, s from the series' start. */
  times: Float64Array;
  /** The frequency of each row, Hz. */
  freqs: Float64Array;
  /** Power, column by column: power[column][row]. */
  power: Float64Array[];
}

/** A spectrogram: the power in Hann-windowed slices of `window` samples (a power of two), `hop` samples apart, up to `fMax` Hz. */
export function spectrogram(x: ArrayLike<number>, fs: number, window: number, hop: number, fMax = fs / 2): Spectrogram {
  const w = hann(window);
  const rows = Math.min(window / 2, Math.floor((fMax * window) / fs)) + 1;
  const freqs = Float64Array.from({ length: rows }, (_, k) => (k * fs) / window);
  const times: number[] = [];
  const power: Float64Array[] = [];
  const re = new Float64Array(window);
  const im = new Float64Array(window);
  for (let start = 0; start + window <= x.length; start += hop) {
    for (let i = 0; i < window; i++) {
      re[i] = x[start + i] * w[i];
      im[i] = 0;
    }
    fft(re, im);
    const col = new Float64Array(rows);
    for (let k = 0; k < rows; k++) col[k] = re[k] * re[k] + im[k] * im[k];
    power.push(col);
    times.push((start + window / 2) / fs);
  }
  return { times: Float64Array.from(times), freqs, power };
}

export interface MatchResult {
  /** The overlap, 0 to 1: how much of the data, in the window, the model can explain (1 only with no noise). */
  overlap: number;
  /** How many samples the model must move later to line up best (negative: earlier). */
  shift: number;
  /** The phase the model must be turned by, radians. */
  phase: number;
  /** The amplitude the model must be multiplied by. */
  scale: number;
}

/**
 * How well a model matches data within a window: the model is slid by up to `maxShift` samples and turned through
 * any phase (with its Hilbert transform as the quarter-turned copy), and the best normalised overlap
 * ⟨d, h⟩ / (|d| |h|) over the window [from, to) is returned with the shift, phase and amplitude that give it. Both
 * series should be whitened alike and share a sample rate; the model may be any length, and is zero outside itself.
 */
export function match(data: ArrayLike<number>, model: ArrayLike<number>, from: number, to: number, maxShift: number): MatchResult {
  const q = hilbert(model);
  let dd = 0;
  for (let i = from; i < to; i++) dd += data[i] * data[i];
  let best: MatchResult = { overlap: 0, shift: 0, phase: 0, scale: 0 };
  for (let s = -maxShift; s <= maxShift; s++) {
    let c = 0;
    let si = 0;
    let hh = 0;
    for (let i = from; i < to; i++) {
      const j = i - s;
      if (j < 0 || j >= model.length) continue;
      c += data[i] * model[j];
      si += data[i] * q[j];
      hh += model[j] * model[j];
    }
    if (hh === 0 || dd === 0) continue;
    const overlap = Math.hypot(c, si) / Math.sqrt(dd * hh);
    if (overlap > best.overlap) best = { overlap, shift: s, phase: Math.atan2(-si, c), scale: Math.hypot(c, si) / hh };
  }
  return best;
}

/** The model as the match lines it up: shifted, turned and scaled (the same length as the data). */
export function alignModel(model: ArrayLike<number>, length: number, m: MatchResult): Float64Array {
  const q = hilbert(model);
  const out = new Float64Array(length);
  const cos = Math.cos(m.phase);
  const sin = Math.sin(m.phase);
  for (let i = 0; i < length; i++) {
    const j = i - m.shift;
    if (j < 0 || j >= model.length) continue;
    out[i] = m.scale * (model[j] * cos - q[j] * sin);
  }
  return out;
}
