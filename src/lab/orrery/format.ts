import { formatScientific } from '../../core/math/scientific';
import { calendarFromJd, formatYear } from '../../core/time/calendar';
import { gmToAuDay, GM_SUN_AU_DAY } from '../../core/nbody/system';
import { MONTHS } from '../../viz/time/format';

/**
 * Words and numbers for the Orrery's readouts. Inputs are the engine's units:
 * AU, days, AU/day and G·m in AU³/day².
 */

const KM_PER_AU = 149_597_870.7;
const SECONDS_PER_DAY = 86_400;

/** The time-warp settings: simulated days per real second, from real time to ten thousand years a second. */
export const RATES: readonly { days: number; label: string }[] = [
  { days: 1 / SECONDS_PER_DAY, label: 'real time' },
  { days: 1 / 24, label: 'an hour a second' },
  { days: 0.25, label: '6 hours a second' },
  { days: 1, label: 'a day a second' },
  { days: 4, label: '4 days a second' },
  { days: 7, label: 'a week a second' },
  { days: 30, label: 'a month a second' },
  { days: 60, label: '2 months a second' },
  { days: 365.25 / 4, label: '3 months a second' },
  { days: 200, label: '200 days a second' },
  { days: 365.25, label: 'a year a second' },
  { days: 365.25 * 5, label: '5 years a second' },
  { days: 365.25 * 20, label: '20 years a second' },
  { days: 365.25 * 100, label: 'a century a second' },
  { days: 365.25 * 1000, label: '1,000 years a second' },
  { days: 365.25 * 10_000, label: '10,000 years a second' },
];

/**
 * The fastest time warp for a system: about 3,000 laps of its fastest orbit a
 * second (more and even the trails can't keep up), and never below a day a
 * second. Returns an index into RATES.
 */
export function maxRateIndex(timescale: number): number {
  const cap = Math.max(1, 3000 * timescale);
  let best = 0;
  RATES.forEach((r, i) => {
    if (r.days <= cap) best = i;
  });
  return best;
}

/** The setting nearest a rate in days per second. */
export function nearestRate(days: number): number {
  let best = 0;
  RATES.forEach((r, i) => {
    if (Math.abs(Math.log(r.days / days)) < Math.abs(Math.log(RATES[best].days / days))) best = i;
  });
  return best;
}

/** A distance: "4,670 km", "0.0026 AU (384,000 km)", "5.20 AU". */
export function formatDistance(au: number): string {
  const km = au * KM_PER_AU;
  if (Math.abs(km) < 1e6) return `${round3(km).toLocaleString('en-GB')} km`;
  if (Math.abs(au) < 0.1) return `${au.toPrecision(2)} AU (${round3(km).toLocaleString('en-GB')} km)`;
  if (Math.abs(au) >= 1000) return `${Math.round(au).toLocaleString('en-GB')} AU`;
  return `${au.toPrecision(3)} AU`;
}

/** A distance for a table column: AU above 0.01 AU, kilometres below. */
export function formatSize(au: number): string {
  if (!Number.isFinite(au)) return '—';
  if (Math.abs(au) < 0.01) return `${round3(au * KM_PER_AU).toLocaleString('en-GB')} km`;
  return `${au.toPrecision(3)} AU`;
}

const round3 = (x: number) => {
  if (x === 0) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(Math.abs(x))) - 2);
  return Math.round(x / p) * p;
};

/** A length of time in days: "7.15 days", "11.9 years", "5 hours". */
export function formatSpan(days: number): string {
  if (!Number.isFinite(days)) return '—';
  const a = Math.abs(days);
  if (a < 1 / 24) return `${(days * 1440).toPrecision(2)} minutes`;
  if (a < 1) return `${(days * 24).toPrecision(2)} hours`;
  if (a < 400) return `${days.toPrecision(3)} days`;
  return `${(days / 365.25).toPrecision(3)} years`;
}

/** The clock: a calendar date for a real system, else days or years since the start. */
export function formatClock(days: number, epochTT?: number): string {
  if (epochTT !== undefined) {
    const d = calendarFromJd(epochTT + days);
    return `${Math.floor(d.day)} ${MONTHS[d.month - 1]} ${formatYear(d.year)}`;
  }
  if (Math.abs(days) < 1000) return `Day ${days.toFixed(1)}`;
  return `Year ${(days / 365.25).toFixed(1)}`;
}

/** A mass from G·m: in Earths, Jupiters or Suns, whichever reads best. */
export function formatMass(gm: number): string {
  if (gm === 0) return 'weighs nothing (a test particle)';
  const suns = gm / GM_SUN_AU_DAY;
  const earths = gm / EARTH_GM;
  const jupiters = gm / JUPITER_GM;
  if (suns >= 0.08) return `${suns.toPrecision(3)} Suns`;
  if (jupiters >= 0.5) return `${jupiters.toPrecision(3)} Jupiters`;
  if (earths >= 0.001) return `${earths.toPrecision(3)} Earths`;
  return `${formatScientific(earths, 2)} Earths`;
}

export const EARTH_GM = gmToAuDay(398_600.435507e9);
export const JUPITER_GM = gmToAuDay(126_686_531.9e9);

/** A fractional error as a power of ten: "3 × 10⁻¹⁰", or "less than 10⁻¹⁵". */
export function formatError(x: number): string {
  const a = Math.abs(x);
  if (!Number.isFinite(a)) return '—';
  if (a < 1e-15) return 'below 10⁻¹⁵';
  return formatScientific(a, 1);
}

/** A speed in AU/day as km/s. */
export function formatSpeed(auPerDay: number): string {
  const kms = (auPerDay * KM_PER_AU) / SECONDS_PER_DAY;
  return `${kms < 10 ? kms.toFixed(2) : kms.toFixed(1)} km/s`;
}
