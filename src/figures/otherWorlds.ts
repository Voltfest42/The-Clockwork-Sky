import { R_EARTH, R_JUPITER, M_JUPITER, M_EARTH } from '../core/constants';
import { DETECTION_SIGMA, fitWobble, measureDip, type DipFit, type WobbleFit } from '../core/exoplanets/detect';
import { fluxAt, habitableZone, zoneOf, type HabitableZone } from '../core/exoplanets/habitable';
import { fullDuration, orbitInStarRadii, radiusRatio, totalDuration, transitLight, transitLimit, type TransitGeometry } from '../core/exoplanets/transit';
import type { Atmosphere, Gas } from '../core/exoplanets/transmission';
import { planetOrbit, starVelocity, wobbleAmplitude } from '../core/exoplanets/wobble';
import type { LimbDarkening } from '../core/binaries/eclipse';
import { Random } from '../core/random';
import type { Series } from '../core/signal/series';
import { mainSequenceLuminosity } from '../core/stars/hr';
import { WORLDS } from '../data/planets';
import census from '../data/exoplanets.json';
import { SUN_AGE, sunAt } from './starLives';

/**
 * The figures of Chapter 19, Other worlds: finding a planet by its wobble and
 * its shadow in simulated measurements (19.1), a transit up close (19.2), the
 * census of every confirmed planet (19.3), habitable zones (19.4) and a toy
 * transmission spectrum (19.5).
 */

export const JUPITER_EARTHS = M_JUPITER / M_EARTH;
export const JUPITER_RADII = R_JUPITER / R_EARTH;

// ---------- 19.1 Find the planet ----------

export interface HostStar {
  id: string;
  name: string;
  /** M☉, R☉, K. */
  mass: number;
  radius: number;
  kelvin: number;
  limb: LimbDarkening;
}

/** Stars to put a planet round. Limb darkening roughly as in the Kepler band (Claret's tables). */
export const HOST_STARS: readonly HostStar[] = [
  { id: 'sun', name: 'A Sun-like star', mass: 1, radius: 1, kelvin: 5772, limb: [0.4, 0.25] },
  { id: 'red-dwarf', name: 'A red dwarf', mass: 0.12, radius: 0.15, kelvin: 3000, limb: [0.3, 0.35] },
  { id: 'f-star', name: 'A hotter F star', mass: 1.4, radius: 1.6, kelvin: 6600, limb: [0.3, 0.3] },
];

export interface PlanetSetup {
  star: string;
  /** Earth masses, Earth radii, days, degrees (90 edge-on). */
  mass: number;
  radius: number;
  period: number;
  tilt: number;
  /** The wobble's precision per measurement, m/s; the light's per half-hour, parts per million. */
  rvPrecision: number;
  lightPrecision: number;
  /** Nights watched: one velocity a night, the light every half hour throughout (from space). */
  nights: number;
}

export interface PlanetPreset extends PlanetSetup {
  id: string;
  name: string;
  note: string;
}

export const PLANET_PRESETS: readonly PlanetPreset[] = [
  {
    id: '51-peg-b',
    name: '51 Pegasi b',
    note: 'Mayor and Queloz’s planet of 1995: half Jupiter’s mass in a 4.2-day orbit, found with ELODIE’s 13 m/s. It doesn’t transit; its size is a guess',
    star: 'sun',
    mass: 150,
    radius: 13,
    period: 4.23,
    tilt: 80,
    rvPrecision: 13,
    lightPrecision: 2000,
    nights: 30,
  },
  {
    id: 'hd-209458-b',
    name: 'HD 209458 b',
    note: 'The first planet seen to transit, in 1999: a puffy hot Jupiter, lighter than Jupiter but wider, dimming its star by 1.5%. (Its star is a little bigger than the Sun, so the planet is drawn smaller here to keep the same dip)',
    star: 'sun',
    mass: 219,
    radius: 13.2,
    period: 3.52,
    tilt: 86.7,
    rvPrecision: 5,
    lightPrecision: 2000,
    nights: 30,
  },
  {
    id: 'jupiter',
    name: 'Jupiter, from afar',
    note: 'Twelve years round the Sun: a big, slow swing, and a transit only once every twelve years',
    star: 'sun',
    mass: JUPITER_EARTHS,
    radius: JUPITER_RADII,
    period: 4332.6,
    tilt: 90,
    rvPrecision: 3,
    lightPrecision: 300,
    nights: 3650,
  },
  {
    id: 'earth-twin',
    name: 'An Earth twin',
    note: 'Earth round a Sun-like star: a swing of 9 cm/s and a dip of 84 parts per million, once a year',
    star: 'sun',
    mass: 1,
    radius: 1,
    period: 365.25,
    tilt: 90,
    rvPrecision: 1,
    lightPrecision: 300,
    nights: 365,
  },
  {
    id: 'red-dwarf-earth',
    name: 'An Earth round a red dwarf',
    note: 'An Earth in its red dwarf’s habitable zone, like Proxima b: an 11-day orbit, a swing of over 1 m/s and a dip of 0.4%',
    star: 'red-dwarf',
    mass: 1,
    radius: 1,
    period: 11.2,
    tilt: 90,
    rvPrecision: 1,
    lightPrecision: 1000,
    nights: 60,
  },
];

export const START_PRESET = '51-peg-b';
export const MAX_NIGHTS = 3650;
export const CADENCE = 1 / 48;

export const starById = (id: string) => HOST_STARS.find((s) => s.id === id) ?? HOST_STARS[0];

/** The orbit's radius (AU) by Kepler's third law, a³ = M P² (M in M☉, P in years). */
export function orbitAu(starMass: number, periodDays: number): number {
  return Math.cbrt(starMass * (periodDays / 365.25) ** 2);
}

/** The transit's geometry for a setup. */
export function geometryOf(s: PlanetSetup): TransitGeometry {
  const star = starById(s.star);
  return { k: radiusRatio(s.radius, star.radius), aOverR: orbitInStarRadii(orbitAu(star.mass, s.period), star.radius), i: s.tilt, period: s.period, limb: star.limb };
}

/** When the first transit falls (days after the start): three-tenths of an orbit in, so it isn't at the edge. */
export const firstTransit = (period: number) => 0.3 * period;

// Unit-normal noise, drawn once, so the dots stay put as the planet changes.
let lightNoise: Float64Array | null = null;
let rvNoise: Float64Array | null = null;
let rvJitter: Float64Array | null = null;
function noise() {
  if (!lightNoise || !rvNoise || !rvJitter) {
    const r = new Random(1901);
    lightNoise = Float64Array.from({ length: MAX_NIGHTS / CADENCE }, () => r.normal());
    const q = new Random(1902);
    rvNoise = Float64Array.from({ length: MAX_NIGHTS }, () => q.normal());
    rvJitter = Float64Array.from({ length: MAX_NIGHTS }, () => q.uniform(0, 0.35));
  }
  return { lightNoise, rvNoise, rvJitter };
}

export interface Campaign {
  velocities: Series;
  light: Series;
  /** Mid-transit time of the first transit (days), and the transit's length (days; a central transit's if the orbit misses). */
  t0: number;
  duration: number;
  transits: boolean;
  /** How many transits fall within the nights watched. */
  transitCount: number;
  /** The true swing (m/s) and depth (fraction). */
  k: number;
  depth: number;
  wobble: WobbleFit;
  dip: DipFit;
}

/** A season of measurements of a planet's star: velocities, one a night, and light every half hour; with the planet's two signals measured at its known period. */
export function campaign(s: PlanetSetup): Campaign {
  const star = starById(s.star);
  const { lightNoise, rvNoise, rvJitter } = noise();
  const nights = Math.max(1, Math.min(MAX_NIGHTS, Math.round(s.nights)));
  const g = geometryOf(s);
  const orbit = planetOrbit(s.mass, star.mass, s.period, s.tilt);
  const t0 = firstTransit(s.period);
  const k = wobbleAmplitude(s.mass, star.mass, s.period, s.tilt);

  const rvTimes = new Float64Array(nights);
  const rvValues = new Float64Array(nights);
  for (let n = 0; n < nights; n++) {
    rvTimes[n] = n + 0.3 + rvJitter[n];
    rvValues[n] = starVelocity(orbit, rvTimes[n] - t0) + s.rvPrecision * rvNoise[n];
  }

  const transits = s.tilt > transitLimit(g.aOverR, g.k);
  const duration = transits ? totalDuration(g) : totalDuration({ ...g, i: 90 });
  const count = Math.round(nights / CADENCE);
  const times = new Float64Array(count);
  const values = new Float64Array(count);
  const sigma = s.lightPrecision * 1e-6;
  for (let j = 0; j < count; j++) {
    const t = j * CADENCE;
    times[j] = t;
    let light = 1;
    if (transits) {
      const p = (t - t0) / s.period;
      const offset = (p - Math.round(p)) * s.period;
      if (Math.abs(offset) < duration / 2 + CADENCE) light = transitLight(g, offset, 200);
    }
    values[j] = light + sigma * lightNoise[j];
  }
  let transitCount = 0;
  if (transits) for (let t = t0; t < nights; t += s.period) transitCount++;

  const velocities = { times: rvTimes, values: rvValues };
  const light = { times, values };
  return {
    velocities,
    light,
    t0,
    duration,
    transits,
    transitCount,
    k,
    depth: transits ? 1 - transitLight(g, 0, 400) : 0,
    wobble: fitWobble(velocities, s.period, s.rvPrecision),
    // Measured over the transit's flat bottom (or the middle half of a grazing one), where the dip is deepest.
    dip: measureDip(light, s.period, t0, transits && fullDuration(g) > 0 ? fullDuration(g) : duration / 2, sigma),
  };
}

/** Kepler asked for three transits before a planet counted. */
export const TRANSITS_NEEDED = 3;

export interface Verdict {
  wobble: boolean;
  transit: boolean;
}

/** Whether each signal stands out: 7.1σ, and for transits at least three of them. */
export function verdictOf(c: Campaign): Verdict {
  return { wobble: c.wobble.significance >= DETECTION_SIGMA, transit: c.transits && c.transitCount >= TRANSITS_NEEDED && c.dip.significance >= DETECTION_SIGMA };
}

/** An Earth twin seen edge-on round a Sun-like star, with an instrument's precision and nights watched: the setup the interactive question checks. */
export function earthTwin(rvPrecision: number, lightPrecision: number, nights: number): PlanetSetup {
  const twin = PLANET_PRESETS.find((p) => p.id === 'earth-twin')!;
  return { ...twin, rvPrecision, lightPrecision, nights };
}

/** Indices of at most `max` of n points, evenly spread, for drawing. */
export function thinned(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, k) => k);
  const step = n / max;
  return Array.from({ length: max }, (_, k) => Math.floor(k * step));
}

// ---------- 19.2 A transit up close ----------

export const CLOSE_UP = { aOverR: 10, period: 3 } as const;

export const TRANSIT_PLANETS = [
  { id: 'earth', name: 'Earth', radius: 1 },
  { id: 'neptune', name: 'Neptune', radius: 3.88 },
  { id: 'jupiter', name: 'Jupiter', radius: JUPITER_RADII },
] as const;

/** The light curve of a transit across a Sun-like star, hours from mid-transit, for a planet of radius (R⊕) at impact parameter b. */
export function closeUpGeometry(radiusEarths: number, b: number, limb: LimbDarkening): TransitGeometry {
  return { k: radiusRatio(radiusEarths, 1), aOverR: CLOSE_UP.aOverR, i: (Math.acos(b / CLOSE_UP.aOverR) * 180) / Math.PI, period: CLOSE_UP.period, limb };
}

/** The chance (0–1) that a planet a AU from a Sun-like star transits, for an orbit tilted at random: R☉ / a. */
export const lineUpChance = (au: number) => Math.min(1, 1 / orbitInStarRadii(au, 1));

// ---------- 19.3 The census ----------

export interface Exoplanet {
  name: string;
  host: string;
  method: number;
  year: number;
  facility: number;
  period: number | null;
  a: number | null;
  mass: number | null;
  minimumMass: boolean;
  radius: number | null;
  teff: number | null;
  logL: number | null;
  distance: number | null;
  circumbinary: boolean;
}

export const METHOD_NAMES: readonly string[] = census.methods;
export const FACILITY_NAMES: readonly string[] = census.facilities;
export const CENSUS_FETCHED: string = census.fetched;

let planets: Exoplanet[] | null = null;
/** Every confirmed planet, unpacked from the census file (grouped by host star). */
export function allPlanets(): Exoplanet[] {
  if (planets) return planets;
  const out: Exoplanet[] = [];
  let j = 0;
  census.hosts.forEach((host, h) => {
    for (let n = 0; n < census.planets[h]; n++, j++) {
      const suffix = census.suffix[j];
      out.push({
        name: suffix.startsWith('=') ? suffix.slice(1) : `${host} ${suffix}`,
        host,
        method: census.method[j],
        year: census.year[j],
        facility: census.facility[j],
        period: census.period[j],
        a: census.a[j],
        mass: census.mass[j],
        minimumMass: census.massKind[j] === 1,
        radius: census.radius[j],
        teff: census.teff[h],
        logL: census.logL[h],
        distance: census.distance[h],
        circumbinary: census.circumbinary[j] === 1,
      });
    }
  });
  planets = out;
  return out;
}

export const planetByName = (name: string) => allPlanets().find((p) => p.name === name);

/** The kinds of method the census figure shows apart: transits, wobbles, microlensing, imaging, and the rest together. */
export const METHOD_GROUPS = [
  { id: 'transit', name: 'Transit', methods: [0] },
  { id: 'wobble', name: 'Wobble (radial velocity)', methods: [1] },
  { id: 'microlensing', name: 'Microlensing', methods: [2] },
  { id: 'imaging', name: 'Direct imaging', methods: [3] },
  { id: 'other', name: 'Other (timing, astrometry)', methods: [4, 5, 6, 7] },
] as const;

export const groupOf = (method: number) => METHOD_GROUPS.findIndex((g) => (g.methods as readonly number[]).includes(method));

/** How many planets were found by each group of methods by the end of a year. */
export function countsBy(year: number): { total: number; groups: number[] } {
  const groups = METHOD_GROUPS.map(() => 0);
  let total = 0;
  for (const p of allPlanets()) {
    if (p.year > year) continue;
    total++;
    groups[groupOf(p.method)]++;
  }
  return { total, groups };
}

/** The Solar System's planets, for the census: mass (M⊕), radius (R⊕), orbit (AU) and period (days). */
export const SOLAR_SYSTEM = WORLDS.filter((w) => w.kind !== 'moon').map((w) => ({
  name: w.name,
  mass: w.mass,
  radius: w.diameterKm / 2 / (R_EARTH / 1000),
  a: w.distanceAu,
  period: w.orbitDays,
}));

export const FIRST_YEAR = 1992;
export const LAST_YEAR = Math.max(...census.year);

/** A planet's kind by its size or mass, roughly: as the chapter names them. */
export function kindOf(p: { radius: number | null; mass: number | null; period: number | null }): string {
  const r = p.radius;
  const m = p.mass;
  const hot = p.period !== null && p.period < 10;
  if (r !== null) {
    if (r < 1.25) return 'Earth-sized';
    if (r < 2) return 'a super-Earth';
    if (r < 4) return 'a sub-Neptune';
    if (r < 8) return 'Neptune-sized';
    return hot ? 'a hot Jupiter' : 'a giant';
  }
  if (m !== null) {
    if (m < 2) return 'Earth-mass';
    if (m < 10) return 'a super-Earth or sub-Neptune';
    if (m < 50) return 'Neptune-mass';
    return hot ? 'a hot Jupiter' : 'a giant';
  }
  return 'of unknown size';
}

// ---------- 19.4 Habitable zones ----------

export interface ZoneSystem {
  id: string;
  name: string;
  /** L☉ and K. */
  luminosity: number;
  kelvin: number;
  planets: { name: string; a: number; note?: string }[];
}

const fromCensus = (host: string, id: string, name: string): ZoneSystem => {
  const ps = allPlanets().filter((p) => p.host === host && p.a !== null);
  const first = ps[0];
  return {
    id,
    name,
    luminosity: 10 ** (first.logL ?? 0),
    kelvin: first.teff ?? 5772,
    planets: ps.sort((x, y) => x.a! - y.a!).map((p) => ({ name: p.name.slice(host.length + 1) || p.name, a: p.a! })),
  };
};

/** The Solar System today, and four systems from the census. */
export function zoneSystems(): ZoneSystem[] {
  return [
    {
      id: 'solar-system',
      name: 'The Solar System',
      luminosity: 1,
      kelvin: 5772,
      planets: WORLDS.filter((w) => w.kind === 'rocky planet').map((w) => ({ name: w.name, a: w.distanceAu })),
    },
    fromCensus('TRAPPIST-1', 'trappist-1', 'TRAPPIST-1'),
    fromCensus('Proxima Cen', 'proxima', 'Proxima Centauri'),
    fromCensus('Kepler-186', 'kepler-186', 'Kepler-186'),
    fromCensus('Kepler-62', 'kepler-62', 'Kepler-62'),
  ];
}

/** A main-sequence star of a temperature (K), with its luminosity from Mamajek's sequence. */
export function starOfTemperature(kelvin: number): { luminosity: number; kelvin: number } {
  return { luminosity: mainSequenceLuminosity(kelvin), kelvin };
}

/**
 * The Sun at an age (Myr since it reached the main sequence), and its zone:
 * SSE's track, scaled so that today's Sun (4.57 billion years) has exactly the
 * Sun's luminosity and temperature (SSE gives 0.96 L☉ and 5,750 K).
 */
export function sunAtAge(myr: number): { luminosity: number; kelvin: number; zone: HabitableZone } {
  const now = sunAt(SUN_AGE);
  const s = sunAt(myr);
  const luminosity = s.L / now.L;
  const kelvin = (s.T * 5772) / now.T;
  return { luminosity, kelvin, zone: habitableZone(luminosity, kelvin) };
}

/** When (Myr) the Sun's zone moves out past Earth: its inner edge reaches 1 AU. */
export function earthLeavesZone(): number {
  let lo = SUN_AGE;
  let hi = 11000;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (sunAtAge(mid).zone.inner < 1) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const ZONE_WORDS = {
  'too-hot': 'too hot: closer in than the zone',
  optimistic: 'in the optimistic zone',
  conservative: 'in the zone',
  'too-cold': 'too cold: beyond the zone',
} as const;

/** Where a planet a AU from a star sits. */
export const zoneWord = (luminosity: number, kelvin: number, a: number) => ZONE_WORDS[zoneOf(fluxAt(luminosity, a), kelvin)];

/** Known planets for the "every planet" view: those with a star's temperature in Kopparapu's range, a known orbit, and starlight from a twentieth of Earth's to 5 times. */
export function zonePlanets(): { name: string; flux: number; kelvin: number; small: boolean }[] {
  const out: { name: string; flux: number; kelvin: number; small: boolean }[] = [];
  for (const p of allPlanets()) {
    if (p.a === null || p.teff === null || p.logL === null) continue;
    if (p.teff < 2500 || p.teff > 7300) continue;
    const flux = fluxAt(10 ** p.logL, p.a);
    if (flux < 0.05 || flux > 5) continue;
    const small = (p.radius !== null && p.radius < 1.6) || (p.radius === null && p.mass !== null && p.mass < 3);
    out.push({ name: p.name, flux, kelvin: p.teff, small });
  }
  return out;
}

// ---------- 19.5 Starlight through an atmosphere ----------

export interface AtmospherePreset extends Atmosphere {
  id: string;
  name: string;
  note: string;
}

/** Planets to look through: values as published (rounded), the gases a guess at what each has. */
export const ATMOSPHERES: readonly AtmospherePreset[] = [
  {
    id: 'hot-jupiter',
    name: 'A puffy hot Jupiter (like WASP-39 b)',
    note: 'A third of Jupiter’s mass, wider than Jupiter, at about 1,100 K: a scale height near 1,000 km',
    massEarths: 89,
    radiusEarths: 14.3,
    kelvin: 1100,
    mu: 2.3,
    starRadiusSuns: 0.93,
    gases: ['H2O', 'CO2'],
    cloudTop: null,
  },
  {
    id: 'sub-neptune',
    name: 'A sub-Neptune (like K2-18 b)',
    note: 'Nine Earth masses, 2.4 Earths wide, round a red dwarf, cool enough for methane',
    massEarths: 8.9,
    radiusEarths: 2.4,
    kelvin: 270,
    mu: 2.3,
    starRadiusSuns: 0.44,
    gases: ['CH4', 'CO2'],
    cloudTop: null,
  },
  {
    id: 'rocky',
    name: 'A rocky world round a red dwarf (like TRAPPIST-1 e)',
    note: 'An Earth-sized rock with an Earth-like air of nitrogen, round a star a ninth of the Sun’s width',
    massEarths: 0.69,
    radiusEarths: 0.92,
    kelvin: 250,
    mu: 29,
    starRadiusSuns: 0.119,
    gases: ['H2O', 'CO2'],
    cloudTop: null,
  },
  {
    id: 'earth',
    name: 'Earth, seen across the Sun',
    note: 'Our own air, as an alien astronomer would see it during a transit',
    massEarths: 1,
    radiusEarths: 1,
    kelvin: 288,
    mu: 29,
    starRadiusSuns: 1,
    gases: ['H2O', 'CO2'],
    cloudTop: null,
  },
];

export const ALL_GASES: readonly Gas[] = ['H2O', 'CH4', 'CO2'];

/** The cloud deck's height when clouds are on, in scale heights above the planet's radius. */
export const CLOUD_TOP = 3;
