import { boxModel, boxSearch, measure, periodGrid, sampleTimes, standardDeviation, type BoxResult, type Series } from '../core/signal/series';

/**
 * Find the signal (Figure T6.1): sixty days of a star's light, measured every
 * half hour to 4 parts in 1,000, with a planet's transit hidden in it: 5 parts
 * in 1,000 deep, 3.6 hours long, every 4.3 days. The same times with noise
 * alone show the false alarms a search makes when it tries enough periods.
 * All seeded, so the figure is the same for every reader.
 */

export const SIGNAL = { span: 60, cadence: 1 / 48, sigma: 0.004, period: 4.3, t0: 1.1, duration: 0.15, depth: 0.005 } as const;

const TIMES = sampleTimes(0, SIGNAL.span, SIGNAL.cadence);

export const WITH_PLANET: Series = measure(TIMES, boxModel(SIGNAL.period, SIGNAL.t0, SIGNAL.duration, SIGNAL.depth), SIGNAL.sigma, 61);
export const NOISE_ONLY: Series = measure(TIMES, () => 1, SIGNAL.sigma, 62);

export const TRIAL_PERIODS = periodGrid(1, 15, 1500);

const cache = new Map<Series, BoxResult[]>();

/** The box search over 1,500 trial periods from 1 to 15 days (computed once for each series). */
export function periodogram(series: Series): BoxResult[] {
  let result = cache.get(series);
  if (!result) {
    result = boxSearch(series, TRIAL_PERIODS, SIGNAL.duration, SIGNAL.sigma);
    cache.set(series, result);
  }
  return result;
}

/** The highest peak of a periodogram. */
export function bestPeak(results: readonly BoxResult[]): BoxResult {
  return results.reduce((a, b) => (b.significance > a.significance ? b : a));
}

/** The measured scatter of single points. */
export function pointScatter(series: Series): number {
  return standardDeviation(series.values);
}
