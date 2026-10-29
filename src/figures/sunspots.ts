import butterfly from '../data/silso/butterfly.json';
import sunspots from '../data/silso/sunspots.json';

/**
 * The sunspot record (Figure 15.2): SILSO's monthly sunspot numbers since
 * 1749 and their 13-month smoothing, the official dates of every cycle's
 * minimum and maximum, and Hathaway's butterfly diagram, sunspot area by
 * latitude for every solar rotation since 1874.
 */

export interface Cycle {
  n: number;
  /** Decimal years of the minimum that starts it, the maximum, and the next minimum (the end), if it has come. */
  start: number;
  peak: number | null;
  end: number | null;
  /** The smoothed sunspot number at the maximum. */
  height: number | null;
  startMonth: [number, number];
  peakMonth: [number, number] | null;
}

const decimal = ([y, m]: readonly [number, number] | readonly number[]) => y + (m - 0.5) / 12;

export const CYCLES: readonly Cycle[] = sunspots.cycles.map((c, k, all) => ({
  n: c.n,
  start: decimal(c.min),
  peak: c.max ? decimal(c.max) : null,
  end: all[k + 1] ? decimal(all[k + 1].min) : null,
  height: c.maxSn,
  startMonth: c.min as [number, number],
  peakMonth: c.max as [number, number] | null,
}));

/** The monthly series as points (decimal year, number), leaving out months with no number. */
export const MONTHLY: readonly { x: number; y: number }[] = sunspots.monthly.map((y, k) => ({ x: 1749 + (k + 0.5) / 12, y })).filter((p) => p.y >= 0);
export const SMOOTHED: readonly { x: number; y: number }[] = sunspots.smoothed.map((y, k) => ({ x: 1749 + (k + 0.5) / 12, y })).filter((p) => p.y >= 0);

/** The last month in the record, as [year, month]. */
export const LAST_MONTH: [number, number] = [1749 + Math.floor((sunspots.monthly.length - 1) / 12), ((sunspots.monthly.length - 1) % 12) + 1];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthName([year, month]: readonly [number, number]): string {
  return `${MONTHS[month - 1]} ${year}`;
}

/** The cycle with the highest maximum. */
export function tallestCycle(): Cycle {
  return CYCLES.reduce((a, b) => ((b.height ?? 0) > (a.height ?? 0) ? b : a));
}

/** A cycle's story for the figure's caption. */
export function describeCycle(c: Cycle): string {
  const length = c.end !== null ? `was ${(c.end - c.start).toFixed(1)} years long` : 'is still going';
  const peak = c.peakMonth ? `It peaked in ${monthName(c.peakMonth)} at a smoothed ${c.height!.toLocaleString('en-GB', { maximumFractionDigits: 1 })} sunspots` : 'It hasn’t peaked yet';
  return `Cycle ${c.n} began at the minimum of ${monthName(c.startMonth)} and ${length}. ${peak}${c.n === tallestCycle().n ? ', the highest since the counts began.' : '.'}`;
}

/** The average length of the finished cycles, years. */
export function meanCycleLength(): number {
  const done = CYCLES.filter((c) => c.end !== null);
  return done.reduce((a, c) => a + (c.end! - c.start), 0) / done.length;
}

// —— The butterfly diagram ——

export const FIRST_ROTATION: number = butterfly.firstRotation;
export const BANDS: number = butterfly.bands;
export const ROTATIONS: readonly string[] = butterfly.rotations;

/** The start of a Carrington rotation as a decimal year (rotation 1 began on 9 November 1853; each lasts 27.2753 days). */
export function rotationYear(cr: number): number {
  const jd = 2398167.4 + 27.2753 * (cr - 1);
  return 2000 + (jd - 2451545) / 365.25;
}

/** A band's middle latitude, degrees (bands are even in sin(latitude), south to north). */
export function bandLatitude(band: number): number {
  return (Math.asin(-1 + (2 * (band + 0.5)) / BANDS) * 180) / Math.PI;
}

/** The mean latitude (degrees, north or south ignored) of the spots in a span of years, weighted by area. */
export function meanSpotLatitude(from: number, to: number): number {
  let sum = 0;
  let weight = 0;
  ROTATIONS.forEach((row, k) => {
    const year = rotationYear(FIRST_ROTATION + k);
    if (year < from || year >= to) return;
    for (let b = 0; b < BANDS; b++) {
      const level = parseInt(row[b], 16);
      if (!level) continue;
      const area = 2 ** (level - 1);
      sum += Math.abs(bandLatitude(b)) * area;
      weight += area;
    }
  });
  return weight ? sum / weight : NaN;
}
