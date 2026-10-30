import { G, M_SUN, R_SUN } from '../core/constants';
import { binaryState, companionMass, massFunction, semiAmplitudes, type BinaryOrbit } from '../core/binaries/orbit';
import { Random } from '../core/random';
import { fromPhysics, type HRPoint } from '../core/stars/hr';
import { HYDROGEN_BURNING_LIMIT } from '../core/stellar/brownDwarfs';
import { imfDensity, kroupa } from '../core/stellar/imf';
import { coolingAgeFor, fateOf, FATE_NAMES, whiteDwarf, Z_SUN_SSE, type Fate, type FateKind } from '../core/stellar/lives';
import { famousStar } from '../data/stars';

/** Helpers for Chapter 18's figures: white dwarfs cooling, dead stars to scale, dark companions and the fork in the road. */

const C = 299_792_458;

// —— Figure 18.1: white dwarfs as clocks ——

/** White-dwarf masses for the cooling tracks, M☉ (most are near 0.6). */
export const WD_MASSES = [0.5, 0.6, 0.8, 1.0, 1.2] as const;

/** Cooling ages marked along the tracks, Myr. */
export const WD_AGES = [10, 100, 1000, 3000, 10000] as const;

/** A white dwarf's cooling track: [cooling age (Myr), temperature (K), luminosity (L☉)], from 1 Myr to 14 Gyr. */
export function coolingTrack(mass: number, n = 90): [number, number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const age = 10 ** (0 + (Math.log10(14000) * i) / (n - 1));
    const w = whiteDwarf(mass, age, Z_SUN_SSE);
    return [age, w.T, w.L];
  });
}

/** Where a white dwarf of a mass and cooling age sits on the HR diagram. */
export function whiteDwarfPoint(mass: number, age: number): HRPoint {
  const w = whiteDwarf(mass, age, Z_SUN_SSE);
  return fromPhysics(w.T, w.L);
}

/** Real white dwarfs: Sirius B and Procyon B, from the famous stars. */
export const KNOWN_WHITE_DWARFS = ['sirius-b', 'procyon-b'].map((id) => {
  const s = famousStar(id);
  return { id, name: s.name, mass: s.mass.value, kelvin: s.temperature.value, luminosity: s.luminosity.value };
});

/** The faintest white dwarfs in the disc are near 1/30,000 of the Sun's luminosity (the end of Gaia's white-dwarf sequence within 100 pc). */
export const FAINTEST_WD_LUMINOSITY = 10 ** -4.5;

/** How old the faintest white dwarfs are, by SSE's cooling law for a typical 0.6 M☉, Myr. */
export const faintestCoolingAge = () => coolingAgeFor(0.6, FAINTEST_WD_LUMINOSITY);

// —— Figure 18.2: dead stars to scale ——

/** Diameters (km) and masses (M☉) of the things the zoom compares. */
export interface ScaleThing {
  id: string;
  name: string;
  /** Diameter, km (for Manhattan, its length). */
  size: number;
  mass?: number;
  kind: 'planet' | 'white-dwarf' | 'neutron-star' | 'black-hole' | 'city';
  note: string;
}

/** A black hole's horizon diameter (km) for a mass (M☉): twice the Schwarzschild radius 2GM/c². */
export const horizonDiameter = (mass: number) => (4 * G * M_SUN * mass) / (C * C) / 1000;

const siriusB = famousStar('sirius-b');

export const SCALE_THINGS: readonly ScaleThing[] = [
  { id: 'earth', name: 'Earth', size: 12_742, mass: 3.0e-6, kind: 'planet', note: 'for comparison' },
  { id: 'sirius-b', name: 'Sirius B', size: Math.round(2 * siriusB.radius.value * (R_SUN / 1000)), mass: siriusB.mass.value, kind: 'white-dwarf', note: 'a white dwarf: the Sun’s mass in a ball the size of Earth' },
  { id: 'manhattan', name: 'Manhattan', size: 21.6, kind: 'city', note: 'an island 21.6 km long, for scale' },
  { id: 'neutron-star', name: 'A neutron star', size: 24, mass: 1.4, kind: 'neutron-star', note: 'about 1.4 Suns in a ball 24 km across' },
  { id: 'bh-10', name: 'A black hole of 10 Suns', size: horizonDiameter(10), mass: 10, kind: 'black-hole', note: 'the edge (event horizon) of a black hole like Gaia BH1' },
  { id: 'bh-1', name: 'The Sun as a black hole', size: horizonDiameter(1), mass: 1, kind: 'black-hole', note: 'what the Sun would be if squeezed inside its horizon: it never will be' },
];

/** A teaspoon, 5 cm³, of a body of a mass (M☉) and diameter (km): its mass in kg at the body's mean density. */
export function teaspoon(mass: number, diameterKm: number): number {
  const r = (diameterKm * 1000) / 2;
  return (mass * M_SUN) / ((4 / 3) * Math.PI * r ** 3) * 5e-6;
}

/** A mass in kg, in words: "27 grams", "13 tonnes", "2 billion tonnes". */
export function formatKg(kg: number): string {
  const sig = (x: number) => Number(x.toPrecision(2)).toLocaleString('en-GB');
  if (kg < 1) return `${sig(kg * 1000)} grams`;
  if (kg < 1000) return `${sig(kg)} kg`;
  const t = kg / 1000;
  if (t < 1e6) return `${sig(t)} tonnes`;
  if (t < 1e9) return `${sig(t / 1e6)} million tonnes`;
  if (t < 1e12) return `${sig(t / 1e9)} billion tonnes`;
  return `${sig(t / 1e12)} trillion tonnes`;
}

/** The zoom's view width at a slider value (0 wide to 1 close), km: 40,000 km down to 120 km. */
export const ZOOM_WIDTHS: [number, number] = [40_000, 120];
export const zoomWidth = (f: number) => ZOOM_WIDTHS[0] * (ZOOM_WIDTHS[1] / ZOOM_WIDTHS[0]) ** f;

// —— Figure 18.3: weigh the invisible companion ——

export interface DarkPair {
  id: string;
  name: string;
  /** The visible star, its mass (M☉) and what it is. */
  visible: string;
  m1: number;
  /** The unseen companion's true mass (M☉) and what it is. */
  m2: number;
  companion: string;
  period: number;
  e: number;
  /** Tilt, degrees from face-on (0) to edge-on (90). */
  i: number;
  omega: number;
  note: string;
}

export const DARK_PAIRS: readonly DarkPair[] = [
  { id: 'gaia-bh1', name: 'Gaia BH1', visible: 'a Sun-like star', m1: 0.93, m2: 9.62, companion: 'a black hole', period: 185.6, e: 0.45, i: 53.4, omega: 12.8, note: '480 parsecs away in Ophiuchus, found by Gaia’s measurements of the star’s wobble (El-Badry et al. 2023)' },
  { id: 'gaia-bh3', name: 'Gaia BH3', visible: 'an old, metal-poor giant', m1: 0.76, m2: 32.7, companion: 'a black hole', period: 4253, e: 0.73, i: 69.4, omega: 77, note: '590 parsecs away in Aquila: the heaviest black hole known from a star in our Galaxy (Gaia Collaboration 2024)' },
  { id: 'cyg-x1', name: 'Cygnus X-1', visible: 'a blue supergiant', m1: 40.6, m2: 21.2, companion: 'a black hole', period: 5.5998, e: 0.019, i: 27.5, omega: 0, note: '2,200 parsecs away; its companion was the first black hole widely accepted, in 1972 (masses: Miller-Jones et al. 2021)' },
  { id: 'white-dwarf', name: 'A white-dwarf companion', visible: 'a Sun-like star', m1: 1.0, m2: 0.6, companion: 'a white dwarf', period: 3, e: 0, i: 60, omega: 0, note: 'an invented pair: a dead companion too light to be a black hole' },
  { id: 'red-dwarf', name: 'A faint red dwarf', visible: 'a Sun-like star', m1: 1.0, m2: 0.3, companion: 'a red dwarf, too faint to see beside its bright partner', period: 30, e: 0.2, i: 80, omega: 90, note: 'an invented pair: an ordinary small star' },
];

/** The heaviest a neutron star can be, M☉: above about 2.3, nothing known holds it up (the heaviest measured is about 2.35). */
export const NEUTRON_STAR_MAX = 3;

export function darkOrbit(p: Pick<DarkPair, 'm1' | 'm2' | 'period' | 'e' | 'i' | 'omega'>): BinaryOrbit {
  return { m1: p.m1, m2: p.m2, period: p.period, e: p.e, i: p.i, omega: p.omega };
}

/** The visible star's radial velocity (km/s) over two orbits: [time (days), velocity]. */
export function velocityCurve(orbit: BinaryOrbit, n = 240): [number, number][] {
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = (2 * orbit.period * k) / n;
    return [t, binaryState(orbit, t / orbit.period).v1];
  });
}

/** Seeded measurements of the visible star's velocity (km/s) on random nights over two orbits, with an error of `sigma`. */
export function velocityMeasurements(orbit: BinaryOrbit, n = 18, sigma = 1, seed = 18): [number, number][] {
  const random = new Random(seed);
  return Array.from({ length: n }, () => {
    const t = random.uniform(0, 2 * orbit.period);
    return [t, binaryState(orbit, t / orbit.period).v1 + sigma * random.normal()] as [number, number];
  }).sort((a, b) => a[0] - b[0]);
}

export type Verdict = 'black-hole' | 'neutron-star-or-black-hole' | 'light';

export interface DarkReadout {
  k: number;
  f: number;
  /** The least the companion can weigh (edge-on), M☉. */
  minimum: number;
  verdict: Verdict;
}

/** What the velocity curve alone says about the companion: the mass function and the companion's least mass, given the visible star's mass. */
export function weighCompanion(orbit: BinaryOrbit): DarkReadout {
  const k = semiAmplitudes(orbit).k1;
  const f = massFunction(orbit.period, k, orbit.e);
  const minimum = companionMass(f, orbit.m1, 90);
  const verdict: Verdict = minimum > NEUTRON_STAR_MAX ? 'black-hole' : minimum > 1.4 ? 'neutron-star-or-black-hole' : 'light';
  return { k, f, minimum, verdict };
}

// —— Figure 18.4: the fork in the road ——

/** Metallicities offered, on SSE's scale, with names. */
export const FORK_METALS = [
  { z: 0.0001, name: 'Almost none (Z = 0.0001)', phrase: 'almost no metals' },
  { z: 0.001, name: 'Poor (0.001)', phrase: 'few metals' },
  { z: 0.004, name: 'The Small Magellanic Cloud’s (0.004)', phrase: 'the Small Magellanic Cloud’s metals' },
  { z: 0.02, name: 'The Sun’s (0.02)', phrase: 'the Sun’s metals' },
  { z: 0.03, name: 'Rich (0.03)', phrase: 'more metals than the Sun' },
] as const;

export const FORK_WINDS = [
  { wind: 1, name: 'SSE’s own', phrase: 'SSE’s own winds' },
  { wind: 0.5, name: 'Half', phrase: 'winds at half strength' },
  { wind: 0.2, name: 'A fifth', phrase: 'winds at a fifth' },
] as const;

/** Colours for the fates, distinct in both themes; each also has its own shape. */
export const FATE_STYLE: Record<FateKind, { color: string; shape: 'circle' | 'square' | 'diamond' | 'triangle' }> = {
  'brown-dwarf': { color: '#b5835a', shape: 'square' },
  'helium-wd': { color: '#9aa5b1', shape: 'circle' },
  'co-wd': { color: 'var(--series-1)', shape: 'circle' },
  'one-wd': { color: 'var(--series-3)', shape: 'diamond' },
  'neutron-star': { color: 'var(--series-2)', shape: 'triangle' },
  'black-hole': { color: 'var(--text)', shape: 'square' },
  nothing: { color: '#d62828', shape: 'diamond' },
};

export { FATE_NAMES };

/** The initial masses where the fate changes, from a fate curve: [mass between the two, from, to]. */
export function fateChanges(fates: readonly Fate[]): { mass: number; from: FateKind; to: FateKind }[] {
  const out: { mass: number; from: FateKind; to: FateKind }[] = [];
  for (let i = 1; i < fates.length; i++) {
    if (fates[i].kind !== fates[i - 1].kind) out.push({ mass: Math.sqrt(fates[i].mass * fates[i - 1].mass), from: fates[i - 1].kind, to: fates[i].kind });
  }
  return out;
}

/**
 * Zones of initial mass where the fate is uncertain, at solar metallicity (research §10): between white dwarfs
 * and neutron stars (electron-capture supernovae, 6–10 M☉); where black holes begin, with explosions and failures
 * interleaved (18–30 M☉); and above 100 M☉, where SSE's formulas are held at their edge.
 */
export const UNCERTAIN_ZONES = [
  { from: 6, to: 10, name: 'white dwarf or neutron star' },
  { from: 18, to: 30, name: 'neutron star or black hole' },
  { from: 100, to: 300, name: 'beyond SSE’s formulas' },
] as const;

/** Where other models put pair-instability supernovae that leave nothing: nearly metal-free stars of about 140–260 M☉ (Heger & Woosley 2002). */
export const PAIR_INSTABILITY_STARS = { from: 140, to: 260 } as const;

// —— Stardust ——

/**
 * Where a generation of stars' mass is after `age` Myr: given back to space by winds and explosions, locked in
 * remnants, or still in living stars (and brown dwarfs), as shares of the mass it was born with. Stars drawn from
 * Kroupa's mass function (0.01–150 M☉) at solar metallicity; a star that has died has given back all but its
 * remnant, and one still living is counted whole.
 */
export function generationBudget(age: number, n = 300): { returned: number; locked: number; living: number } {
  const imf = kroupa();
  const lo = Math.log(0.01);
  const hi = Math.log(150);
  let total = 0;
  let returned = 0;
  let locked = 0;
  for (let i = 0; i < n; i++) {
    const m = Math.exp(lo + ((hi - lo) * (i + 0.5)) / n);
    // Mass in this slice of log mass: dN/dm × m × m d(ln m).
    const mass = imfDensity(imf, m) * m * m;
    total += mass;
    if (m < HYDROGEN_BURNING_LIMIT) continue;
    const f = fateOf(m);
    if (f.death > age) continue;
    returned += mass * (1 - f.remnant / m);
    locked += mass * (f.remnant / m);
  }
  return { returned: returned / total, locked: locked / total, living: 1 - (returned + locked) / total };
}
