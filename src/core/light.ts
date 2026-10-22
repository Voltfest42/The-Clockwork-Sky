import { SECONDS_PER_DAY, SECONDS_PER_JULIAN_YEAR } from './units';

/**
 * Durations written for reading, such as light travel times. (The travel time
 * itself is units.ts's lightTravelTime.)
 */

/**
 * A duration in seconds, written in the one or two units that suit it:
 * 1.28 s, 8 min 19 s, 4 h 10 min, 23 h 58 min, 4.25 years.
 */
export function formatDuration(seconds: number): string {
  const s = Math.abs(seconds);
  const sign = seconds < 0 ? '−' : '';
  if (s < 10) return `${sign}${trim(s.toFixed(s < 1 ? 3 : 2))} s`;
  if (s < 60) return `${sign}${Math.round(s)} s`;
  if (s < 3600) {
    const total = Math.round(s);
    const m = Math.floor(total / 60);
    const rest = total % 60;
    return `${sign}${m} min${rest ? ` ${rest} s` : ''}`;
  }
  if (s < 2 * SECONDS_PER_DAY) {
    const total = Math.round(s / 60);
    const h = Math.floor(total / 60);
    const rest = total % 60;
    return `${sign}${h} h${rest ? ` ${rest} min` : ''}`;
  }
  if (s < 0.5 * SECONDS_PER_JULIAN_YEAR) return `${sign}${trim((s / SECONDS_PER_DAY).toFixed(1))} days`;
  const years = s / SECONDS_PER_JULIAN_YEAR;
  return `${sign}${trim(years.toFixed(years < 100 ? 2 : 0))} ${years === 1 ? 'year' : 'years'}`;
}

function trim(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}
