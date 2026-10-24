import { G } from '../core/constants';
import { SECONDS_PER_DAY } from '../core/units';

/**
 * Weighing with an orbit (Figure 7.3): Newton's form of Kepler's third law,
 * M = 4π² a³ / (G P²), gives the mass an orbit goes round from its size and
 * period. Strictly it is the two bodies' masses together.
 */

/** The mass (kg) that an orbit of semi-major axis a (km) and period P (days) goes round. */
export function massFromOrbit(aKm: number, periodDays: number): number {
  const a = aKm * 1000;
  const P = periodDays * SECONDS_PER_DAY;
  return (4 * Math.PI ** 2 * a ** 3) / (G * P * P);
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** "5.97 × 10²⁴" for a number in scientific notation with three significant figures (or `digits`). */
export function scientific(x: number, digits = 3): string {
  if (x === 0) return '0';
  let exponent = Math.floor(Math.log10(Math.abs(x)));
  let mantissa = (x / 10 ** exponent).toFixed(digits - 1);
  if (Math.abs(Number(mantissa)) >= 10) {
    exponent += 1;
    mantissa = (x / 10 ** exponent).toFixed(digits - 1);
  }
  const power = String(exponent)
    .replace('-', '⁻')
    .replace(/\d/g, (d) => SUPERSCRIPT[Number(d)]);
  return `${mantissa} × 10${power}`;
}

/** A period (days) as a clock reading: "92.8 minutes", "7.65 hours", "27.32 days", "11.86 years". */
export function formatPeriodDays(days: number): string {
  const hours = days * 24;
  if (hours < 2) return `${(hours * 60).toFixed(1)} minutes`;
  if (days < 2) return `${hours.toFixed(2)} hours`;
  if (days < 730) return `${days.toFixed(days < 100 ? 2 : 1)} days`;
  return `${(days / 365.25).toFixed(2)} years`;
}

/** "384,400 km", "1.50 × 10⁸ km". */
export function formatKm(km: number): string {
  if (km >= 1e7) return `${scientific(km)} km`;
  return `${Math.round(km).toLocaleString('en-GB')} km`;
}

/** How far a measured mass is from the accurate one, as a signed percentage ("+1.2%", "−8%"). */
export function percentOff(measured: number, accurate: number): string {
  const p = ((measured - accurate) / accurate) * 100;
  const sign = p > 0 ? '+' : p < 0 ? '−' : '';
  const a = Math.abs(p);
  return `${sign}${a < 10 ? a.toFixed(1) : Math.round(a)}%`;
}
