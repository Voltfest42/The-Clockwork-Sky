/**
 * GW150914's data and the chirp model held up against them (Figure 29.3 and
 * Chapter 29's interactive question). The strain from both LIGO detectors is
 * GWOSC's, whitened and band-passed by scripts/fetch-gwtc.ts; the model is
 * whitened by the same noise spectrum and band, then slid and turned to fit
 * Hanford's data as well as it can, as a matched filter would.
 */
import { M_SUN } from '../core/constants';
import { chirp, type Chirp } from '../core/gr/chirp';
import { alignModel, match, whiten, type MatchResult } from '../core/signal/strain';
import { PARSEC } from '../core/units';
import data from '../data/gwosc/gw150914.json';

export type Detector = 'H1' | 'L1';

export const GW150914 = {
  sampleRate: data.sampleRate,
  /** The data's first sample, s before the event's catalogue time (GPS 1126259462.4). */
  start: data.gpsStart - data.eventGps,
  H1: Float64Array.from(data.H1),
  L1: Float64Array.from(data.L1),
  band: [data.band[0], data.band[1]] as const,
  /** Livingston heard it 6.9 ms before Hanford, and its arms are turned so the signal comes out inverted (Abbott et al. 2016). */
  livingstonLead: 0.0069,
} as const;

/** GW150914 as LIGO and Virgo first reported it (Abbott et al. 2016; GWTC-1): 35.6 and 30.6 M☉ at the source, 440 Mpc away, redshift 0.09. */
export const GW150914_SOURCE = { m1: 35.6, m2: 30.6, mpc: 440, z: 0.09 } as const;

/** The noise's amplitude spectral density, strain/√Hz, interpolated from the stored 0.25 Hz steps (huge outside 20–400 Hz). */
export function asd(det: Detector, f: number): number {
  const table = det === 'H1' ? data.asdH1 : data.asdL1;
  const k = (Math.abs(f) - data.asdFrom) / data.asdStep;
  if (k < 0 || k > table.length - 1) return 1e-15;
  const i = Math.min(table.length - 2, Math.floor(k));
  const t = k - i;
  return (table[i] * (1 - t) + table[i + 1] * t) * 1e-23;
}

/** The time of sample i of the data, s from the event's catalogue time. */
export function dataTime(i: number): number {
  return GW150914.start + i / GW150914.sampleRate;
}

/** A model chirp for masses at the source (M☉) at GW150914's distance and redshift, at the data's sample rate. */
export function modelChirp(m1: number, m2: number, distanceMpc: number = GW150914_SOURCE.mpc, z: number = GW150914_SOURCE.z): Chirp {
  return chirp({ m1: m1 * M_SUN, m2: m2 * M_SUN, distance: distanceMpc * 1e6 * PARSEC, redshift: z, fLow: 22, sampleRate: GW150914.sampleRate, ringTimes: 10 });
}

/** The window the match looks in: from 0.35 s before the event's catalogue time to 0.08 s after, in samples. */
const WINDOW = [-0.35, 0.08] as const;

export interface DataFit {
  /** The model, whitened and band-passed like the data, as long as the data, lined up and scaled to fit it. */
  fitted: Float64Array;
  match: MatchResult;
  /** Where the model's peak falls when lined up, s from the event's catalogue time. */
  peakAt: number;
}

/**
 * Fits a model chirp to one detector's data: places its peak at the event's time, whitens it by that detector's
 * noise, then slides it up to 0.1 s and turns its phase for the best overlap within the window.
 */
export function fitToData(model: Chirp, det: Detector): DataFit {
  const fs = GW150914.sampleRate;
  const n = GW150914.H1.length;
  // Place the model in a series as long as the data, its peak at the event's catalogue time (or cut, if longer)
  const placed = new Float64Array(n);
  const peakIndex = Math.round((0 - GW150914.start) * fs);
  const modelPeak = Math.round(-model.t0 * fs);
  for (let i = 0; i < model.h.length; i++) {
    const j = peakIndex - modelPeak + i;
    if (j >= 0 && j < n) placed[j] = model.h[i];
  }
  const white = whiten(placed, fs, (f) => asd(det, f), GW150914.band[0], GW150914.band[1], 0.02);
  const series = det === 'H1' ? GW150914.H1 : GW150914.L1;
  const from = Math.round((WINDOW[0] - GW150914.start) * fs);
  const to = Math.round((WINDOW[1] - GW150914.start) * fs);
  const m = match(series, white, from, to, Math.round(0.1 * fs));
  return { fitted: alignModel(white, n, m), match: m, peakAt: m.shift / fs };
}
