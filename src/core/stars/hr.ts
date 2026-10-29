import dwarfs from '../../data/dwarfSequence.json';
import { T_SUN } from '../constants';

/**
 * The Hertzsprung–Russell diagram's two sets of axes, and the conversions
 * between them. Observers plot a colour (Gaia's G_BP − G_RP, or B − V)
 * against an absolute magnitude (M_G or M_V); physicists plot surface
 * temperature against luminosity. Colour gives temperature, and a
 * bolometric correction (BC) turns a magnitude in one band into one over all
 * wavelengths, M_bol = M + BC, and so into luminosity.
 *
 * Both come from Mamajek's mean main-sequence table (Pecaut & Mamajek 2013,
 * version 2022.04.16), interpolated in log T. They are approximate for giants
 * and white dwarfs, and beyond the table (hotter than B8 in Gaia's colours)
 * the colour is extrapolated. Temperatures in kelvin, luminosities in Suns.
 */

/** The Sun's absolute bolometric magnitude (IAU 2015 Resolution B2). */
export const M_BOL_SUN = 4.74;

interface Row {
  logT: number;
  value: number;
}

/** A column of the table as [log T, value] rows, hottest first, skipping blanks. */
function column(values: readonly (number | null)[]): Row[] {
  const rows: Row[] = [];
  dwarfs.teff.forEach((t, i) => {
    const v = values[i];
    if (t !== null && v !== null) rows.push({ logT: Math.log10(t), value: v });
  });
  return rows;
}

const BPRP = column(dwarfs.bprp);
const BV = column(dwarfs.bv);
const BCV = column(dwarfs.bcv);
const GV = column(dwarfs.gv);
const LOGL = column(dwarfs.logL);

/** Interpolates a column at log T, holding the end values beyond the table. */
function at(rows: Row[], logT: number): number {
  if (logT >= rows[0].logT) return rows[0].value;
  for (let i = 1; i < rows.length; i++) {
    if (logT >= rows[i].logT) {
      const f = (logT - rows[i].logT) / (rows[i - 1].logT - rows[i].logT);
      return rows[i].value + f * (rows[i - 1].value - rows[i].value);
    }
  }
  return rows[rows.length - 1].value;
}

const HOTTEST_BPRP = BPRP[0];

/** Gaia's colour G_BP − G_RP for a main-sequence star of a temperature (K). Hotter than the table, extrapolated to a limit of −0.55. */
export function bpRpOf(kelvin: number): number {
  const logT = Math.log10(kelvin);
  if (logT > HOTTEST_BPRP.logT) return Math.max(-0.55, HOTTEST_BPRP.value - 1.1 * (logT - HOTTEST_BPRP.logT));
  return at(BPRP, logT);
}

/** The Johnson colour B − V for a main-sequence star of a temperature (K). */
export function bvOf(kelvin: number): number {
  return at(BV, Math.log10(kelvin));
}

/** The bolometric correction to the V band, BC_V = M_bol − M_V (magnitudes), at a temperature (K). */
export function bcVOf(kelvin: number): number {
  return at(BCV, Math.log10(kelvin));
}

/** The bolometric correction to Gaia's G band, BC_G = M_bol − M_G (magnitudes): BC_V less G − V (taken as 0 for the hottest stars). */
export function bcGOf(kelvin: number): number {
  const logT = Math.log10(kelvin);
  const gv = logT > GV[0].logT ? 0 : at(GV, logT);
  return at(BCV, logT) - gv;
}

/** The luminosity (Suns) of a main-sequence star of a temperature (K). */
export function mainSequenceLuminosity(kelvin: number): number {
  return 10 ** at(LOGL, Math.log10(kelvin));
}

/** Inverts a colour that falls as temperature rises, by bisection in log T between 2,000 and 50,000 K. */
function invert(f: (kelvin: number) => number, colour: number): number {
  let lo = Math.log10(2000);
  let hi = Math.log10(50000);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(10 ** mid) > colour) lo = mid;
    else hi = mid;
  }
  return 10 ** ((lo + hi) / 2);
}

let bpRpTable: number[] | null = null;
const TABLE_FROM = -0.6;
const TABLE_STEP = 0.005;
const TABLE_SIZE = 1201;

/**
 * A star's temperature (K) from Gaia's colour G_BP − G_RP. Worked out by
 * inverting bpRpOf once on a fine grid (every 0.005 mag from −0.6 to 5.4) and
 * interpolating, since figures convert thousands of stars.
 */
export function temperatureFromBpRp(bpRp: number): number {
  bpRpTable ??= Array.from({ length: TABLE_SIZE }, (_, i) => Math.log10(invert(bpRpOf, TABLE_FROM + i * TABLE_STEP)));
  const f = Math.min(TABLE_SIZE - 1.000001, Math.max(0, (bpRp - TABLE_FROM) / TABLE_STEP));
  const i = Math.floor(f);
  return 10 ** (bpRpTable[i] + (f - i) * (bpRpTable[i + 1] - bpRpTable[i]));
}

/** A star's temperature (K) from its colour B − V, by Mamajek's table. */
export function temperatureFromBVTable(bv: number): number {
  return invert(bvOf, bv);
}

/** Luminosity (Suns) from an absolute bolometric magnitude. */
export function luminosityFromBolometric(mBol: number): number {
  return 10 ** (-0.4 * (mBol - M_BOL_SUN));
}

/** Absolute bolometric magnitude from a luminosity (Suns). */
export function bolometricFromLuminosity(luminosity: number): number {
  return M_BOL_SUN - 2.5 * Math.log10(luminosity);
}

/** A point on the diagram, on both sets of axes. */
export interface HRPoint {
  /** Gaia colour, G_BP − G_RP. */
  bpRp: number;
  /** Absolute magnitude in Gaia's G band. */
  mG: number;
  /** Temperature, K. */
  kelvin: number;
  /** Luminosity, Suns. */
  luminosity: number;
}

/** A Gaia star (colour and absolute magnitude) on both sets of axes. */
export function fromGaia(bpRp: number, mG: number): HRPoint {
  const kelvin = temperatureFromBpRp(bpRp);
  return { bpRp, mG, kelvin, luminosity: luminosityFromBolometric(mG + bcGOf(kelvin)) };
}

/** A star of known temperature (K) and luminosity (Suns) on both sets of axes. */
export function fromPhysics(kelvin: number, luminosity: number): HRPoint {
  return { bpRp: bpRpOf(kelvin), mG: bolometricFromLuminosity(luminosity) - bcGOf(kelvin), kelvin, luminosity };
}

/** A star seen through Johnson's filters (B − V, and M_V) on both sets of axes. */
export function fromJohnson(bv: number, mV: number): HRPoint {
  const kelvin = temperatureFromBVTable(bv);
  return fromPhysics(kelvin, luminosityFromBolometric(mV + bcVOf(kelvin)));
}

/** A star's radius (Suns) from its luminosity (Suns) and temperature (K): R = √L ÷ (T/T☉)². */
export function radiusFrom(luminosity: number, kelvin: number): number {
  return Math.sqrt(luminosity) / (kelvin / T_SUN) ** 2;
}

/** The luminosity (Suns) of a star of a radius (Suns) and temperature (K): the lines of equal size on the diagram. */
export function luminosityFor(radius: number, kelvin: number): number {
  return radius * radius * (kelvin / T_SUN) ** 4;
}

export type Region = 'main-sequence' | 'red-dwarfs' | 'subgiants' | 'giants' | 'supergiants' | 'white-dwarfs' | 'between';

/**
 * Which part of the diagram a temperature (K) and luminosity (Suns) fall in:
 * the main sequence (within a factor of 4 of Mamajek's line; red dwarfs below
 * 3,900 K), white dwarfs (smaller than 1/20 of the Sun), supergiants (over a
 * thousand Suns and ten times the main sequence's luminosity), giants and
 * subgiants (above the main sequence, wider or narrower than 5 Suns), or the
 * thinly peopled gap between the main sequence and the white dwarfs.
 */
export function regionOf(kelvin: number, luminosity: number): Region {
  const radius = radiusFrom(luminosity, kelvin);
  const above = Math.log10(luminosity / mainSequenceLuminosity(kelvin));
  if (radius < 0.05) return 'white-dwarfs';
  if (Math.abs(above) <= 0.6) return kelvin < 3900 ? 'red-dwarfs' : 'main-sequence';
  if (above < 0) return 'between';
  if (luminosity >= 1000 && above > 1) return 'supergiants';
  return radius < 5 ? 'subgiants' : 'giants';
}

/** A star's spectral type from its temperature (K), by the nearest row of Mamajek's main-sequence table: "G2V". */
export function spectralTypeOf(kelvin: number): string {
  let best = 0;
  dwarfs.teff.forEach((t, i) => {
    if (t !== null && Math.abs(Math.log10(t / kelvin)) < Math.abs(Math.log10((dwarfs.teff[best] ?? 1) / kelvin))) best = i;
  });
  return dwarfs.spt[best];
}
