/**
 * Sizes and distances for Chapter 1's figures: the zoom (Figure 1.1), the scale
 * model (1.2) and light's race (1.3). SI units (metres) unless a field says
 * otherwise. Sources are listed in src/data/README.md and on the About page.
 *
 * Values marked "as of" change over time; the date says when they were true.
 */

/** Diameters of the Sun, the planets and the Moon, km: equatorial (NASA Planetary Fact Sheets; the Sun from the IAU 2015 nominal radius). */
export const DIAMETERS_KM = {
  sun: 1_391_400,
  mercury: 4_879,
  venus: 12_104,
  earth: 12_756,
  moon: 3_475,
  mars: 6_792,
  jupiter: 142_984,
  saturn: 120_536,
  uranus: 51_118,
  neptune: 49_528,
} as const;

/** Earth's mean diameter, km (the "Earths" in "11.2 Earths across"). */
export const EARTH_MEAN_DIAMETER_KM = 12_742;

/** The Moon's average distance from Earth, km. */
export const MOON_DISTANCE_KM = 384_400;

/** Display names, for the planets and the Moon. */
export const BODY_NAMES = {
  sun: 'The Sun',
  mercury: 'Mercury',
  venus: 'Venus',
  earth: 'Earth',
  moon: 'The Moon',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
} as const;

/** Regions of the Solar System, as distances from the Sun in AU. */
export const REGIONS_AU = {
  /** The main asteroid belt (most of it). */
  asteroidBelt: [2.2, 3.2],
  /** The Kuiper belt. */
  kuiperBelt: [30, 50],
  /** Where the solar wind meets interstellar gas, in the direction Voyager 1 went: it crossed at about 121.6 AU in August 2012. */
  heliopause: 121.6,
  /** The Oort cloud, inferred from long-period comets and never seen directly: a rough range. */
  oortCloud: [2_000, 100_000],
} as const;

/** A spacecraft's distance, with the date it applies to. */
export interface Milestone {
  /** ISO date-time, UTC. */
  when: string;
  /** What happens then. */
  what: string;
}

/**
 * Voyager 1. On 18 November 2026 at 06:16 UTC it is one light-day
 * (25.9 billion km, 173.1 AU) from Earth, per NASA's announcement of
 * 17 June 2026: the first spacecraft to get that far.
 *
 * From the Sun it is then about 172.4 AU (computed: in November Earth is on
 * the side of the Sun away from Voyager, which adds about 0.8 AU; a test
 * checks the two agree), and it moves outwards at about 3.57 AU a year
 * (16.9 km/s). Its direction is RA 17h 13m, Dec +12.0° (J2000), in Ophiuchus:
 * about 35° north of the planets' plane.
 */
export const VOYAGER_1 = {
  lightDay: { when: '2026-11-18T06:16:00Z', what: 'Voyager 1 is one light-day from Earth' } satisfies Milestone,
  /** Distance from the Sun at the light-day milestone, AU. */
  sunDistanceAu: 172.4,
  /** Outward speed, AU per Julian year. */
  auPerYear: 3.57,
  /** Direction, J2000 right ascension (hours) and declination (degrees). */
  raHours: 17.22,
  decDegrees: 12.0,
  /** It crossed the heliopause, into interstellar space, on 25 August 2012. */
  heliopauseCrossing: '2012-08-25',
  launched: '1977-09-05',
} as const;

/**
 * The nearest stars and a few famous ones further out: J2000 position, distance
 * and size. Distances from parallaxes (Gaia DR3 for Proxima; Hipparcos for the
 * bright stars), positions from SIMBAD; sizes in solar radii from
 * interferometry (Boyajian et al. 2012 for the dwarfs).
 */
export interface StarFact {
  id: string;
  name: string;
  raHours: number;
  decDegrees: number;
  distanceLy: number;
  /** Radius, in units of the Sun's radius. Absent for clusters and nebulae, which use `acrossLy`. */
  radiusSun?: number;
  /** The size of a cluster or nebula, light-years. */
  acrossLy?: number;
  fact: string;
}

export const STARS: readonly StarFact[] = [
  {
    id: 'proxima',
    name: 'Proxima Centauri',
    raHours: 14 + 29 / 60 + 42.95 / 3600,
    decDegrees: -(62 + 40 / 60 + 46.2 / 3600),
    distanceLy: 4.25,
    radiusSun: 0.154,
    fact: 'The nearest star to the Sun: a small, dim red dwarf with at least one planet.',
  },
  {
    id: 'alpha-cen',
    name: 'α Centauri A and B',
    raHours: 14 + 39 / 60 + 36.5 / 3600,
    decDegrees: -(60 + 50 / 60 + 2 / 3600),
    distanceLy: 4.37,
    radiusSun: 1.22,
    fact: 'A pair of Sun-like stars, orbiting each other every 80 years. Proxima circles them both, far out.',
  },
  {
    id: 'barnard',
    name: 'Barnard’s Star',
    raHours: 17 + 57 / 60 + 48.5 / 3600,
    decDegrees: 4 + 41 / 60 + 36 / 3600,
    distanceLy: 5.96,
    radiusSun: 0.19,
    fact: 'A red dwarf that moves across our sky faster than any other star: the width of the full Moon in 180 years.',
  },
  {
    id: 'sirius',
    name: 'Sirius',
    raHours: 6 + 45 / 60 + 8.9 / 3600,
    decDegrees: -(16 + 42 / 60 + 58 / 3600),
    distanceLy: 8.6,
    radiusSun: 1.71,
    fact: 'The brightest star in the night sky: hotter and bigger than the Sun, and close.',
  },
  {
    id: 'vega',
    name: 'Vega',
    raHours: 18 + 36 / 60 + 56.3 / 3600,
    decDegrees: 38 + 47 / 60 + 1 / 3600,
    distanceLy: 25,
    radiusSun: 2.5,
    fact: 'A bright white star of the northern summer sky, spinning so fast it bulges at its equator.',
  },
  {
    id: 'pleiades',
    name: 'The Pleiades',
    raHours: 3 + 47 / 60 + 24 / 3600,
    decDegrees: 24 + 7 / 60,
    distanceLy: 444,
    acrossLy: 16,
    fact: 'A young cluster of more than a thousand stars, six or seven of them visible to the eye. Its crowded core is about 16 light-years across.',
  },
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    raHours: 5 + 55 / 60 + 10.3 / 3600,
    decDegrees: 7 + 24 / 60 + 25 / 3600,
    distanceLy: 550,
    radiusSun: 760,
    fact: 'A red supergiant in Orion. Its distance (about 550–700 light-years) and size are uncertain, but put it at the Sun and it would reach past Mars.',
  },
  {
    id: 'orion-nebula',
    name: 'The Orion Nebula',
    raHours: 5 + 35 / 60 + 17 / 3600,
    decDegrees: -(5 + 23 / 60 + 28 / 3600),
    distanceLy: 1_350,
    acrossLy: 24,
    fact: 'A cloud of glowing gas where new stars are forming, visible to the eye as the middle “star” of Orion’s sword.',
  },
];

/**
 * The Milky Way. The Sun is about 26,700 light-years (8.2 kpc) from the centre
 * (GRAVITY Collaboration 2019 and 2021 found 8.18 and 8.28 kpc), and the
 * stellar disc is roughly 100,000 light-years across (it has no sharp edge).
 * The Sun goes round at about 230 km/s, once every 220 million years or so.
 */
export const MILKY_WAY = {
  sunFromCentreLy: 26_700,
  discAcrossLy: 100_000,
  /** Sagittarius A*, the black hole at the centre: about 4.2 million Suns (GRAVITY 2019). Its event horizon is about 25 million km across. */
  blackHoleMassSuns: 4.2e6,
  blackHoleAcrossKm: 2.5e7,
} as const;

/** Everyday things on Earth, for the low end of the zoom. */
export const EVERYDAY_SCALE = {
  /** A person, lying on the grass: m. */
  person: 1.7,
  /** A football pitch, the size FIFA recommends: m. */
  pitch: [105, 68],
  /** The Kármán line, a conventional edge of space, km above sea level. */
  karmanLineKm: 100,
  /** The International Space Station: about 109 m across, orbiting at about 420 km (as of 2026; it slowly sinks and is boosted back up). */
  issAcross: 109,
  issAltitudeKm: 420,
  /** Mount Everest's height, m (the 2020 China–Nepal survey). */
  everest: 8_849,
} as const;
