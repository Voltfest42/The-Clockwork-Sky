import { AMU, C, G, K_B, L_SUN, M_JUPITER, M_SUN, R_JUPITER, R_SUN } from '../core/constants';
import { formatScientific } from '../core/math/scientific';
import { naturalSpline } from '../core/math/spline';
import { SECONDS_PER_JULIAN_YEAR } from '../core/units';
import { famousStar } from '../data/stars';
import solarModel from '../data/solarModel.json';

/**
 * Helpers for Chapter 20 (holding a star up) and Toolkit T8, T9 and T11: the
 * Sun's insides from Model S in SI units, the weight of its layers, its
 * pressure as a smooth curve, its mass added up shell by shell, the stars of
 * Figure 20.1 and the estimate machine's recipes.
 */

/** Model S's own mass (kg) and radius (m): 1.989 × 10³⁰ kg and 695,990 km. */
export const MODEL_S_MASS = solarModel.mass;
export const MODEL_S_RADIUS = solarModel.radius;

export interface SolarShell {
  /** r/R. */
  x: number;
  /** m, kg, kg/m³, Pa, K. */
  r: number;
  m: number;
  rho: number;
  P: number;
  T: number;
}

export const SOLAR: readonly SolarShell[] = solarModel.shells.map((s) => ({
  x: s.r,
  r: s.r * MODEL_S_RADIUS,
  m: s.m * MODEL_S_MASS,
  rho: s.rho,
  P: s.P,
  T: s.T,
}));

/** The Sun's centre in Model S: 2.35 × 10¹⁶ Pa, 15.67 million K, 154 g/cm³. */
export const SUN_CENTRE = SOLAR[0];

/** A Model S quantity at r/R, by straight-line interpolation between its shells. */
export function solar(x: number, key: 'm' | 'rho' | 'P' | 'T'): number {
  const t = Math.max(0, Math.min(1, x));
  let k = 1;
  while (k < SOLAR.length - 1 && SOLAR[k].x < t) k++;
  const a = SOLAR[k - 1];
  const b = SOLAR[k];
  return a[key] + ((t - a.x) / (b.x - a.x)) * (b[key] - a[key]);
}

/** Gravity at r/R inside the Sun, m/s²: Gm(r)/r². */
export function solarGravity(x: number): number {
  if (x <= 0) return 0;
  const r = x * MODEL_S_RADIUS;
  return (G * solar(x, 'm')) / (r * r);
}

/** The weight of one cubic metre of gas at r/R, N/m³ = Pa per metre: ρg, which is how fast the pressure must fall outward there. */
export function weightPerMetre(x: number): number {
  return solar(x, 'rho') * solarGravity(x);
}

/**
 * The weight of all the layers above r/R, per square metre, Pa: ∫ ρg dr from
 * r to the surface, added up over Model S's shells. By hydrostatic balance it
 * equals the pressure there.
 */
export function weightAbove(x: number): number {
  const pts = [{ x, w: weightPerMetre(x) }, ...SOLAR.filter((s) => s.x > x).map((s) => ({ x: s.x, w: weightPerMetre(s.x) }))];
  let sum = 0;
  for (let i = 1; i < pts.length; i++) sum += 0.5 * (pts[i].w + pts[i - 1].w) * (pts[i].x - pts[i - 1].x) * MODEL_S_RADIUS;
  return sum;
}

const lnP = naturalSpline(
  SOLAR.map((s) => s.x),
  SOLAR.map((s) => Math.log(s.P)),
);

/** Model S's pressure at r/R as a smooth curve (a spline through ln P), Pa. */
export function smoothPressure(x: number): number {
  return Math.exp(lnP.value(x));
}

/** The slope of Model S's pressure, dP/dr, Pa per metre (negative: pressure falls outward). */
export function pressureSlope(x: number): number {
  return (smoothPressure(x) * lnP.slope(x)) / MODEL_S_RADIUS;
}

// ---------- Toolkit T9: the Sun's mass, shell by shell ----------

export interface SumShell {
  /** Inner and outer edge and middle, r/R. */
  from: number;
  to: number;
  mid: number;
  /** Density at the middle, kg/m³, and the shell's mass, kg: 4πr²ρ × thickness. */
  rho: number;
  mass: number;
}

/** The Sun cut into `count` shells of equal thickness: each one's mass as area × thickness × density at its middle, dm = 4πr²ρ dr. */
export function solarShells(count: number): SumShell[] {
  const dr = 1 / count;
  return Array.from({ length: count }, (_, i) => {
    const mid = (i + 0.5) * dr;
    const r = mid * MODEL_S_RADIUS;
    const rho = solar(mid, 'rho');
    return { from: i * dr, to: (i + 1) * dr, mid, rho, mass: 4 * Math.PI * r * r * rho * dr * MODEL_S_RADIUS };
  });
}

// ---------- Figure 20.1: how hot must the centre be? ----------

export interface CentreStar {
  id: string;
  name: string;
  /** Solar masses and radii. */
  mass: number;
  radius: number;
  /** What detailed models give, where the course has them. */
  truth?: { P: number; T: number; source: string };
  note: string;
}

const proxima = famousStar('proxima');
const siriusA = famousStar('sirius-a');

export const CENTRE_STARS: readonly CentreStar[] = [
  {
    id: 'sun',
    name: 'The Sun',
    mass: 1,
    radius: 1,
    truth: { P: SUN_CENTRE.P, T: SUN_CENTRE.T, source: 'Model S' },
    note: 'Model S, the standard model of the Sun’s insides, checked against its vibrations.',
  },
  {
    id: 'red-dwarf',
    name: 'Proxima Centauri',
    mass: proxima.mass.value,
    radius: proxima.radius.value,
    note: 'A red dwarf of an eighth of the Sun’s mass. Smaller and denser, it needs a higher central pressure but less heat. Chapter 21 builds stars like it from scratch.',
  },
  {
    id: 'sirius-a',
    name: 'Sirius A',
    mass: siriusA.mass.value,
    radius: siriusA.radius.value,
    note: 'Twice the Sun’s mass, so its centre must be hotter: about 20 million degrees. Chapter 21 builds stars like it from scratch.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    mass: M_JUPITER / M_SUN,
    radius: R_JUPITER / R_SUN,
    truth: { P: 4e12, T: 2e4, source: 'interior models (20,000–35,000 K)' },
    note: 'The pressure estimate works, but the temperature is seven times too high. Jupiter’s centre is held up mostly by electrons packed too tightly to squeeze, which push back however cold they are (Chapter 24).',
  },
];

/** Fully ionised gas like the Sun's: the mean mass per particle used for the estimates, in atomic mass units. */
export const ESTIMATE_MU = 0.61;

// ---------- Toolkit T11: the estimate machine ----------

export interface Factor {
  /** "G", "M²", "1/R⁴". */
  label: string;
  /** The quantity and its value, for the card: "Newton’s constant, 6.7 × 10⁻¹¹ m³ kg⁻¹ s⁻²". */
  meaning: string;
  value: number;
  power: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** The estimate as a formula. */
  formula: string;
  factors: readonly Factor[];
  /** Converts the estimate to the unit shown, and names it. */
  unit: { scale: number; name: string };
  truth: { value: number; low?: number; high?: number; label: string };
  /** What the comparison teaches. */
  lesson: string;
}

const G_FACTOR = { meaning: 'Newton’s constant of gravity, 6.67 × 10⁻¹¹ m³ kg⁻¹ s⁻²', value: G };
const M_FACTOR = { meaning: 'the Sun’s mass, 1.99 × 10³⁰ kg', value: M_SUN };
const R_FACTOR = { meaning: 'the Sun’s radius, 6.96 × 10⁸ m', value: R_SUN };
const RHO_MEAN = M_SUN / ((4 / 3) * Math.PI * R_SUN ** 3);
const YEAR = SECONDS_PER_JULIAN_YEAR;

/** The Sun's gravitational energy from Model S, J (negative): −∫ G m dm / r. */
export function solarGravitationalEnergy(): number {
  let sum = 0;
  for (let i = 1; i < SOLAR.length; i++) {
    const a = SOLAR[i - 1];
    const b = SOLAR[i];
    const fa = a.r > 0 ? (G * a.m * a.rho * 4 * Math.PI * a.r * a.r) / a.r : 0;
    const fb = (G * b.m * b.rho * 4 * Math.PI * b.r * b.r) / b.r;
    sum += 0.5 * (fa + fb) * (b.r - a.r);
  }
  return -sum;
}

export const RECIPES: readonly Recipe[] = [
  {
    id: 'pressure',
    name: 'Central pressure',
    formula: 'P ~ GM² / R⁴',
    factors: [
      { label: 'G', ...G_FACTOR, power: 1 },
      { label: 'M²', ...M_FACTOR, power: 2 },
      { label: '1/R⁴', ...R_FACTOR, power: -4 },
    ],
    unit: { scale: 1, name: 'Pa' },
    truth: { value: SUN_CENTRE.P, label: 'Model S' },
    lesson:
      'Twenty times too low. The estimate spreads the Sun’s mass evenly, but most of it is crowded into the middle, where the weight presses hardest. A factor of ten or twenty is still useful: it says the centre is at least a hundred billion times Earth’s air pressure.',
  },
  {
    id: 'temperature',
    name: 'Central temperature',
    formula: 'T ~ GMμm / kR',
    factors: [
      { label: 'G', ...G_FACTOR, power: 1 },
      { label: 'M', ...M_FACTOR, power: 1 },
      { label: 'μm', meaning: 'the mean mass of a particle of the Sun’s ionised gas, 0.61 atomic mass units, 1.0 × 10⁻²⁷ kg', value: ESTIMATE_MU * AMU, power: 1 },
      { label: '1/k', meaning: 'Boltzmann’s constant, 1.38 × 10⁻²³ J/K, which turns energy into temperature', value: K_B, power: -1 },
      { label: '1/R', ...R_FACTOR, power: -1 },
    ],
    unit: { scale: 1, name: 'K' },
    truth: { value: SUN_CENTRE.T, label: 'Model S' },
    lesson: 'Within 15%: each particle needs about as much heat energy as gravity would give it falling in. No nuclear physics went in, so the Sun’s heat is gravity’s doing; fusion only pays for the light it loses.',
  },
  {
    id: 'free-fall',
    name: 'Free-fall time',
    formula: 't ~ 1 / √(Gρ)',
    factors: [
      { label: '1/√G', ...G_FACTOR, power: -0.5 },
      { label: '1/√ρ', meaning: 'the Sun’s mean density, 1,410 kg/m³', value: RHO_MEAN, power: -0.5 },
    ],
    unit: { scale: 60, name: 'minutes' },
    truth: { value: Math.sqrt((3 * Math.PI) / (32 * G * RHO_MEAN)), label: 'the exact sum for a ball of even density' },
    lesson: 'Within a factor of two: without its pressure, the Sun would fall in on itself in about half an hour. That it hasn’t for 4.6 billion years shows how precisely pressure balances weight.',
  },
  {
    id: 'kelvin-helmholtz',
    name: 'Kelvin–Helmholtz time',
    formula: 't ~ GM² / RL',
    factors: [
      { label: 'G', ...G_FACTOR, power: 1 },
      { label: 'M²', ...M_FACTOR, power: 2 },
      { label: '1/R', ...R_FACTOR, power: -1 },
      { label: '1/L', meaning: 'the Sun’s luminosity, 3.83 × 10²⁶ W', value: L_SUN, power: -1 },
    ],
    unit: { scale: 1e6 * YEAR, name: 'million years' },
    truth: { value: -solarGravitationalEnergy() / 2 / L_SUN, label: 'half the Sun’s gravitational energy in Model S, radiated at today’s rate' },
    lesson: 'Close: shrinking could pay for sunlight for some tens of millions of years, and no longer. Earth is 4.5 billion years old, so something else must power the Sun.',
  },
  {
    id: 'photon',
    name: 'A photon’s escape',
    formula: 't ~ R² / ℓc',
    factors: [
      { label: 'R²', ...R_FACTOR, power: 2 },
      { label: '1/ℓ', meaning: 'a typical step between absorptions inside the Sun, about 1 cm', value: 0.01, power: -1 },
      { label: '1/c', meaning: 'the speed of light, 3.0 × 10⁸ m/s', value: C, power: -1 },
    ],
    unit: { scale: YEAR, name: 'years' },
    truth: { value: Math.sqrt(1e4 * 1.7e5) * YEAR, low: 1e4 * YEAR, high: 1.7e5 * YEAR, label: 'careful sums, shell by shell: 10,000 to 170,000 years' },
    lesson:
      'Low, but in the right range: deep inside, the steps are much shorter than a centimetre, and short steps cost the most. Either way, sunlight’s energy takes thousands of years or more to get out, not eight minutes (Chapter 21).',
  },
];

/** The estimate a recipe gives (SI), and its running product after each factor. */
export function runRecipe(recipe: Recipe): { value: number; running: number[] } {
  let value = 1;
  const running: number[] = [];
  for (const f of recipe.factors) {
    value *= f.value ** f.power;
    running.push(value);
  }
  return { value, running };
}

// ---------- Formatting ----------

/** "2.35 × 10¹⁶ Pa". */
export function formatPascals(p: number): string {
  return `${formatScientific(p, 3)} Pa`;
}

/** "15.7 million K", "20,000 K". */
export function formatKelvin(t: number): string {
  if (t >= 1e6) return `${Number((t / 1e6).toPrecision(3))} million K`;
  return `${Number(t.toPrecision(2)).toLocaleString('en-GB')} K`;
}

/** A density in g/cm³ (water is 1), from kg/m³: "154 g/cm³", "0.0045 g/cm³". */
export function formatGramsPerCc(rho: number): string {
  const g = rho / 1000;
  if (g >= 1000) return `${formatScientific(g, 2)} g/cm³`;
  if (g >= 10) return `${Math.round(g).toLocaleString('en-GB')} g/cm³`;
  return `${Number(g.toPrecision(2))} g/cm³`;
}

/** How many times Earth's air pressure at sea level. */
export const atmospheres = (p: number) => p / 101_325;

/** A mass in solar masses, with Jupiters for the smallest: "1,000 M☉", "0.01 M☉ (10 Jupiters)". */
export function formatSolarMass(m: number): string {
  if (m >= 100) return `${Number(m.toPrecision(2)).toLocaleString('en-GB')} M☉`;
  if (m >= 0.1) return `${Number(m.toPrecision(2))} M☉`;
  return `${Number(m.toPrecision(2))} M☉ (${Math.round(m * 1047.57)} Jupiters)`;
}

/** Molecules per cubic centimetre: "300 per cm³", "2.9 × 10⁹ per cm³". */
export function formatDensity(n: number): string {
  const e = Math.floor(Math.log10(n));
  if (e < 6) return `${Number(n.toPrecision(2)).toLocaleString('en-GB')} per cm³`;
  return `${Number((n / 10 ** e).toPrecision(2))} × 10${String(e).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])} per cm³`;
}
