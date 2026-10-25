/**
 * The young Solar System's disc in the classic "minimum-mass solar nebula"
 * of Hayashi (1981): the least gas and dust that could have made the planets,
 * spread smoothly. A textbook model, not a measurement.
 *
 * - Temperature: T = 280 K × (r / 1 AU)^(−1/2) × (L / L☉)^(1/4), the
 *   temperature of a dark grain in the Sun's light (no heating from the disc
 *   itself, which made the inner disc hotter early on).
 * - Solids per square centimetre: 7.1 g × (r / 1 AU)^(−3/2) of rock and metal;
 *   beyond the snow line water freezes too, and the total jumps to 30 g.
 * - Gas: 1,700 g × (r / 1 AU)^(−3/2), about 99% of the mass.
 *
 * Distances in AU, temperatures in kelvins, luminosity in units of today's Sun.
 */

/** The disc's temperature at 1 AU, K. */
export const T_AT_1AU = 280;
/** Water ice forms below this temperature in the disc (Hayashi's value). */
export const WATER_ICE_K = 170;

/** The disc's temperature (K) at r AU from a star of luminosity L (in Suns). */
export function discTemperature(r: number, luminosity = 1): number {
  if (!(r > 0)) throw new RangeError('The distance must be positive');
  return T_AT_1AU * r ** -0.5 * luminosity ** 0.25;
}

/** Where (AU) the disc has cooled to a temperature: r = (280 K / T)² × √L. */
export function radiusAtTemperature(kelvin: number, luminosity = 1): number {
  return (T_AT_1AU / kelvin) ** 2 * Math.sqrt(luminosity);
}

/** The snow line (AU): where water freezes. 2.7 AU for today's Sun. */
export function snowLine(luminosity = 1): number {
  return radiusAtTemperature(WATER_ICE_K, luminosity);
}

/** Solid material, grams per square centimetre of disc, at r AU: rock and metal inside the snow line, and ice as well beyond it. */
export function solidDensity(r: number, luminosity = 1): number {
  return (r < snowLine(luminosity) ? 7.1 : 30) * r ** -1.5;
}

/** Gas, grams per square centimetre of disc, at r AU. */
export function gasDensity(r: number): number {
  return 1700 * r ** -1.5;
}

export interface Material {
  name: string;
  /** Roughly where it turns solid in a disc of gas, K. */
  freezesK: number;
  colour: string;
}

/**
 * What turns solid where, roughly: condensation temperatures in a gas of the
 * Sun's make-up (Lodders 2003, rounded; Hayashi's 170 K for water).
 */
export const MATERIALS: readonly Material[] = [
  { name: 'Metal and rock', freezesK: 1300, colour: '#c9875a' },
  { name: 'Water ice', freezesK: WATER_ICE_K, colour: '#7fc8f8' },
  { name: 'Methane ice', freezesK: 40, colour: '#c3a6f0' },
];
