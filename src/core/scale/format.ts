import { AU } from '../constants';
import { formatGrouped, formatInWords, formatScientific, formatSignificant } from '../math/scientific';
import { LIGHT_YEAR } from '../units';

/** Earth's mean diameter, m: the yardstick for "in Earths". */
export const EARTH_DIAMETER = 12_742e3;

/**
 * A length in metres, written in the unit a reader would use for it:
 * 1.7 m, 105 m, 12,756 km, 1.39 million km, 30.1 AU, 4.25 light-years.
 */
export function formatLength(metres: number): string {
  const m = Math.abs(metres);
  if (m === 0) return '0 m';
  if (m < 0.01) return `${formatSignificant(metres * 1000, 2)} mm`;
  if (m < 1) return `${formatSignificant(metres * 100, 2)} cm`;
  if (m < 1e4) return `${formatSignificant(metres, 3)} m`;
  if (m < 1e9) return `${formatGrouped(Number((metres / 1000).toPrecision(5)))} km`;
  if (m < 0.1 * AU) return `${formatInWords(metres / 1000)} km`;
  if (m < 0.2 * LIGHT_YEAR) return `${formatSignificant(metres / AU, 3)} AU`;
  const ly = metres / LIGHT_YEAR;
  return `${formatSignificant(ly, 3)} ${ly === 1 ? 'light-year' : 'light-years'}`;
}

/** A length in kilometres, for the info box: "12,756 km", "1.39 million km", "9.46 trillion km". */
export function formatKilometres(metres: number): string {
  const km = metres / 1000;
  if (Math.abs(km) < 1) return `${formatSignificant(km, 2)} km`;
  if (Math.abs(km) < 1e6) return `${formatGrouped(Number(km.toPrecision(5)))} km`;
  return `${formatInWords(km)} km`;
}

/** A length in Earths (Earth's mean diameter): "109 Earths", "0.27 Earths", "1.3 × 10⁻⁷ Earths". */
export function formatEarths(metres: number): string {
  const n = metres / EARTH_DIAMETER;
  const text = n >= 0.01 && n < 1e6 ? formatSignificant(n, n < 1 ? 2 : 3) : formatScientific(n, 2);
  return `${text} ${text === '1' ? 'Earth' : 'Earths'}`;
}
