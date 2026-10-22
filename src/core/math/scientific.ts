/**
 * Powers of ten: scientific notation, orders of magnitude and SI prefixes.
 * Numbers are plain JavaScript numbers; nothing here has units.
 */

/** A number written as mantissa × 10^exponent, with 1 ≤ |mantissa| < 10 (or both 0). */
export interface Scientific {
  mantissa: number;
  exponent: number;
}

/**
 * Scientific notation for a finite number, with the mantissa rounded to
 * `digits` significant figures. Rounding can carry the mantissa up to 10
 * (9.996 → 10.0), in which case it becomes 1 and the exponent goes up.
 */
export function toScientific(x: number, digits = 15): Scientific {
  if (!Number.isFinite(x)) throw new RangeError(`toScientific needs a finite number, not ${x}`);
  if (x === 0) return { mantissa: 0, exponent: 0 };
  // toExponential does the rounding and the carry exactly as printed.
  const [m, e] = Math.abs(x)
    .toExponential(Math.max(0, Math.min(digits, 100) - 1))
    .split('e');
  return { mantissa: Math.sign(x) * Number(m), exponent: Number(e) };
}

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

/** An integer written in superscript digits: 21 → "²¹", −3 → "⁻³". */
export function superscript(n: number): string {
  return String(Math.round(n))
    .split('')
    .map((c) => SUPERSCRIPTS[c] ?? c)
    .join('');
}

/** A power of ten as text: 13 → "10¹³". */
export function powerOfTen(exponent: number): string {
  return `10${superscript(exponent)}`;
}

/**
 * A number in scientific notation for reading: 149_597_870_700 → "1.50 × 10¹¹".
 * Trailing zeros are dropped unless `fixed` is set. A mantissa of 1 is kept
 * ("1 × 10⁶"), so the reader sees the pattern.
 */
export function formatScientific(x: number, digits = 3, fixed = false): string {
  const { mantissa, exponent } = toScientific(x, digits);
  let m = mantissa.toFixed(Math.max(0, digits - 1));
  if (!fixed && m.includes('.')) m = m.replace(/\.?0+$/, '');
  return exponent === 0 ? m.replace('-', '−') : `${m.replace('-', '−')} × ${powerOfTen(exponent)}`;
}

/**
 * The order of magnitude: the nearest power of ten, judged on a log scale, so
 * the break between 10 and 100 is at √1000 ≈ 31.6, not at 55. Needs x > 0.
 */
export function orderOfMagnitude(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) throw new RangeError(`orderOfMagnitude needs a positive number, not ${x}`);
  return Math.round(Math.log10(x));
}

/** Multiplying two numbers in scientific notation: multiply the mantissas, add the exponents, then tidy up. */
export function multiplyScientific(a: Scientific, b: Scientific): { raw: Scientific; result: Scientific } {
  const raw = { mantissa: a.mantissa * b.mantissa, exponent: a.exponent + b.exponent };
  return { raw, result: normalise(raw) };
}

/** Dividing: divide the mantissas, subtract the exponents, then tidy up. */
export function divideScientific(a: Scientific, b: Scientific): { raw: Scientific; result: Scientific } {
  if (b.mantissa === 0) throw new RangeError('Division by zero');
  const raw = { mantissa: a.mantissa / b.mantissa, exponent: a.exponent - b.exponent };
  return { raw, result: normalise(raw) };
}

/** Brings a mantissa back into [1, 10) by moving powers of ten into the exponent. */
export function normalise({ mantissa, exponent }: Scientific): Scientific {
  if (mantissa === 0) return { mantissa: 0, exponent: 0 };
  const shift = Math.floor(Math.log10(Math.abs(mantissa)));
  let m = mantissa / 10 ** shift;
  let e = exponent + shift;
  // Guard against rounding in log10 near exact powers of ten.
  if (Math.abs(m) >= 10) {
    m /= 10;
    e += 1;
  } else if (Math.abs(m) < 1) {
    m *= 10;
    e -= 1;
  }
  return { mantissa: m, exponent: e };
}

export interface Prefix {
  symbol: string;
  name: string;
  exponent: number;
}

/** The SI prefixes in steps of a thousand, from nano to yotta. */
export const PREFIXES: readonly Prefix[] = [
  { symbol: 'n', name: 'nano', exponent: -9 },
  { symbol: 'µ', name: 'micro', exponent: -6 },
  { symbol: 'm', name: 'milli', exponent: -3 },
  { symbol: '', name: '', exponent: 0 },
  { symbol: 'k', name: 'kilo', exponent: 3 },
  { symbol: 'M', name: 'mega', exponent: 6 },
  { symbol: 'G', name: 'giga', exponent: 9 },
  { symbol: 'T', name: 'tera', exponent: 12 },
  { symbol: 'P', name: 'peta', exponent: 15 },
  { symbol: 'E', name: 'exa', exponent: 18 },
  { symbol: 'Z', name: 'zetta', exponent: 21 },
  { symbol: 'Y', name: 'yotta', exponent: 24 },
];

/**
 * The largest prefix that keeps the number at 1 or more: 1.5 × 10¹¹ → 150 G.
 * Returns the number in that prefix's units and the prefix.
 */
export function withPrefix(x: number): { value: number; prefix: Prefix } {
  const size = Math.abs(x);
  let chosen = PREFIXES[3];
  for (const p of PREFIXES) if (size >= 10 ** p.exponent * (1 - 1e-12)) chosen = p;
  if (size > 0 && size < 1e-9) chosen = PREFIXES[0];
  return { value: x / 10 ** chosen.exponent, prefix: chosen };
}

/** A whole number with thousands separators: 1234567 → "1,234,567". */
export function formatGrouped(x: number, decimals = 0): string {
  return x.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).replace('-', '−');
}

/**
 * A number rounded to a few significant figures and written out for reading:
 * 149_597_870.7 → "150,000,000"; 0.000_25 → "0.00025".
 */
export function formatSignificant(x: number, digits = 3): string {
  if (x === 0) return '0';
  const rounded = Number(x.toPrecision(digits));
  const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(rounded))));
  return formatGrouped(rounded, Math.min(decimals, 20))
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

/**
 * Large numbers in words, as a reader would say them: 2.59 × 10¹³ → "25.9 trillion".
 * Below a million it returns the plain grouped number.
 */
export function formatInWords(x: number, digits = 3): string {
  const words: [number, string][] = [
    [1e24, 'septillion'],
    [1e21, 'sextillion'],
    [1e18, 'quintillion'],
    [1e15, 'quadrillion'],
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million'],
  ];
  const size = Math.abs(x);
  for (const [value, word] of words) {
    if (size >= value * 0.9995) {
      const n = Number((x / value).toPrecision(digits));
      if (Math.abs(n) >= 1000 && value < 1e24) continue;
      return `${formatSignificant(n, digits)} ${word}`;
    }
  }
  return formatSignificant(x, digits);
}
