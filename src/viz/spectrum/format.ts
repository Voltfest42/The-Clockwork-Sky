/** Numbers for the spectrum: wavelengths, frequencies, energies and temperatures in the units that read best. */

function sig(x: number, digits = 3): string {
  if (x >= 10 ** digits) return Math.round(x).toLocaleString('en-GB');
  const s = x.toPrecision(digits);
  return s.includes('e') ? String(Number(s)) : s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** A wavelength (m) as "550 nm", "9.3 µm", "21 cm", "3.1 m" or "1.2 km". */
export function formatWavelength(m: number, digits = 3): string {
  if (m >= 1000) return `${sig(m / 1000, digits)} km`;
  if (m >= 1) return `${sig(m, digits)} m`;
  if (m >= 0.01) return `${sig(m * 100, digits)} cm`;
  if (m >= 1e-3) return `${sig(m * 1e3, digits)} mm`;
  if (m >= 1e-6) return `${sig(m * 1e6, digits)} µm`;
  if (m >= 1e-9) return `${sig(m * 1e9, digits)} nm`;
  return `${sig(m * 1e12, digits)} pm`;
}

const PREFIXES = [
  [1e18, 'E'],
  [1e15, 'P'],
  [1e12, 'T'],
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
  [1e-9, 'n'],
] as const;

/** A value with an SI prefix: "540 THz", "5.9 µeV". */
export function withPrefix(x: number, unit: string, digits = 3): string {
  const [scale, prefix] = PREFIXES.find(([s]) => x >= s * 0.9995) ?? PREFIXES[PREFIXES.length - 1];
  return `${sig(x / scale, digits)} ${prefix}${unit}`;
}

/** A frequency (Hz): "545 THz", "1.42 GHz". */
export function formatFrequency(hz: number): string {
  return withPrefix(hz, 'Hz');
}

/** A photon energy in electronvolts: "2.25 eV", "1.24 keV", "5.9 µeV". */
export function formatEnergy(ev: number): string {
  return withPrefix(ev, 'eV');
}

/** A temperature (K): "5,772 K", "310 K", "2.9 billion K". */
export function formatKelvin(k: number): string {
  if (k >= 1e9) return `${sig(k / 1e9)} billion K`;
  if (k >= 1e6) return `${sig(k / 1e6)} million K`;
  if (k >= 100) return `${Math.round(k).toLocaleString('en-GB')} K`;
  return `${sig(k, 2)} K`;
}

/**
 * The colour of pure light of one wavelength (nm), as sRGB 0–255, for drawing
 * the visible strip: Dan Bruton's piecewise approximation of the spectral
 * colours, dimmed towards the ends of the band, where the eye barely sees.
 * (Pure spectral colours lie outside what a screen can show; this keeps their
 * order and rough hue.)
 */
export function spectralColour(nm: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) {
    r = (440 - nm) / 60;
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / 50;
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = (510 - nm) / 20;
  } else if (nm < 580) {
    r = (nm - 510) / 70;
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = (645 - nm) / 65;
  } else r = 1;
  const fade = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
  const encode = (c: number) => Math.round(255 * Math.min(1, Math.max(0, fade * c)) ** 0.8);
  return [encode(r), encode(g), encode(b)];
}

export function rgb([r, g, b]: readonly [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}
