/**
 * The planet cards (Figure 8.2) and the Solar System figures of Chapter 8:
 * sizes, masses, gravity, days and years, tilts, temperatures, atmospheres
 * and moons of the eight planets and the Moon.
 *
 * Sources: NASA's Planetary Fact Sheets (NSSDCA, nssdc.gsfc.nasa.gov/planetary/
 * factsheet; the summary table and each world's own sheet for sidereal
 * periods, sidereal rotation and atmospheres), checked 25 Oct 2026. Moon
 * counts change as more are found: they are as of MOONS_AS_OF, from the Part I
 * research brief (§9), which checked them against the announcements; the fact
 * sheet's own counts are older.
 */

import { AS_OF, monthYear } from './asOf';

export type WorldId = 'mercury' | 'venus' | 'earth' | 'moon' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

/** When the moon counts were last checked (see asOf.ts). */
export const MOONS_AS_OF = monthYear(AS_OF.moons.checked);

export interface World {
  id: WorldId;
  name: string;
  kind: 'rocky planet' | 'moon' | 'gas giant' | 'ice giant';
  /** Equatorial diameter, km. */
  diameterKm: number;
  /** Mass, Earth = 1. */
  mass: number;
  /** Surface gravity (at the 1-bar level for the giants), Earth = 1. */
  gravity: number;
  /** Sidereal rotation, hours; negative spins backwards. */
  rotationHours: number;
  /** Length of a solar day (noon to noon), hours. */
  dayHours: number;
  /** Sidereal orbital period, days: round the Sun, or for the Moon round Earth. */
  orbitDays: number;
  /** Mean distance from the Sun, AU (the Moon: Earth's). */
  distanceAu: number;
  /** Tilt of the axis to the orbit, degrees. */
  tiltDeg: number;
  /** Mean temperature, °C, and a note when the range is wide. */
  temperatureC: number;
  temperatureNote?: string;
  /** Surface pressure, bar, if there is a surface. */
  pressureBar: number | null;
  atmosphere: string;
  /** Known moons as of MOONS_AS_OF. */
  moons: number;
  moonNote?: string;
  rings: boolean;
  /** One thing to know. */
  note: string;
  /** A plain colour for the globe while its texture loads, and for markers. */
  colour: string;
}

export const WORLDS: readonly World[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    kind: 'rocky planet',
    diameterKm: 4879,
    mass: 0.055,
    gravity: 0.38,
    rotationHours: 1407.6,
    dayHours: 4222.6,
    orbitDays: 87.969,
    distanceAu: 0.387,
    tiltDeg: 0.034,
    temperatureC: 167,
    temperatureNote: 'from −173 °C at night to 427 °C by day',
    pressureBar: 0,
    atmosphere: 'Almost none: a thin haze of atoms knocked off the surface',
    moons: 0,
    rings: false,
    note: 'It spins three times for every two trips round the Sun, so a day from noon to noon lasts two of its years.',
    colour: '#9c958d',
  },
  {
    id: 'venus',
    name: 'Venus',
    kind: 'rocky planet',
    diameterKm: 12_104,
    mass: 0.815,
    gravity: 0.91,
    rotationHours: -5832.5,
    dayHours: 2802.0,
    orbitDays: 224.701,
    distanceAu: 0.723,
    tiltDeg: 177.4,
    temperatureC: 464,
    pressureBar: 92,
    atmosphere: '96.5% carbon dioxide, 3.5% nitrogen, under clouds of sulphuric acid',
    moons: 0,
    rings: false,
    note: 'A runaway greenhouse: hotter than Mercury, though twice as far from the Sun. It spins backwards, very slowly.',
    colour: '#e3c88f',
  },
  {
    id: 'earth',
    name: 'Earth',
    kind: 'rocky planet',
    diameterKm: 12_756,
    mass: 1,
    gravity: 1,
    rotationHours: 23.934,
    dayHours: 24,
    orbitDays: 365.256,
    distanceAu: 1,
    tiltDeg: 23.44,
    temperatureC: 15,
    pressureBar: 1.014,
    atmosphere: '78% nitrogen, 21% oxygen, 1% argon',
    moons: 1,
    rings: false,
    note: 'The only world known with liquid water on its surface, and life.',
    colour: '#3f72c0',
  },
  {
    id: 'moon',
    name: 'The Moon',
    kind: 'moon',
    diameterKm: 3475,
    mass: 0.0123,
    gravity: 0.165,
    rotationHours: 655.7,
    dayHours: 708.7,
    orbitDays: 27.322,
    distanceAu: 1,
    tiltDeg: 6.7,
    temperatureC: -20,
    temperatureNote: 'from −173 °C at night to 127 °C by day',
    pressureBar: 0,
    atmosphere: 'Almost none',
    moons: 0,
    rings: false,
    note: 'Probably made from the debris of a giant impact on the young Earth. It keeps one face towards us.',
    colour: '#a7a39c',
  },
  {
    id: 'mars',
    name: 'Mars',
    kind: 'rocky planet',
    diameterKm: 6792,
    mass: 0.107,
    gravity: 0.38,
    rotationHours: 24.623,
    dayHours: 24.66,
    orbitDays: 686.98,
    distanceAu: 1.524,
    tiltDeg: 25.19,
    temperatureC: -65,
    pressureBar: 0.006,
    atmosphere: '95% carbon dioxide, 2.8% nitrogen, 2% argon',
    moons: 2,
    rings: false,
    note: 'Dry riverbeds and lake beds show that water once flowed. Its ice caps hold water and carbon dioxide ice.',
    colour: '#c1603a',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    kind: 'gas giant',
    diameterKm: 142_984,
    mass: 317.8,
    gravity: 2.53,
    rotationHours: 9.925,
    dayHours: 9.926,
    orbitDays: 4332.59,
    distanceAu: 5.203,
    tiltDeg: 3.13,
    temperatureC: -110,
    pressureBar: null,
    atmosphere: 'About 90% hydrogen and 10% helium, with clouds of ammonia',
    moons: 115,
    rings: true,
    note: 'More than twice as heavy as all the other planets together. The Great Red Spot is a storm wider than Earth.',
    colour: '#c9a77f',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    kind: 'gas giant',
    diameterKm: 120_536,
    mass: 95.2,
    gravity: 1.07,
    rotationHours: 10.656,
    dayHours: 10.656,
    orbitDays: 10_759.22,
    distanceAu: 9.537,
    tiltDeg: 26.73,
    temperatureC: -140,
    pressureBar: null,
    atmosphere: 'About 96% hydrogen and 3% helium',
    moons: 293,
    rings: true,
    note: 'Less dense than water. Its bright rings are about 280,000 km across but mostly only about 10 m thick.',
    colour: '#d8c08c',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    kind: 'ice giant',
    diameterKm: 51_118,
    mass: 14.5,
    gravity: 0.89,
    rotationHours: -17.24,
    dayHours: 17.24,
    orbitDays: 30_685.4,
    distanceAu: 19.19,
    tiltDeg: 97.77,
    temperatureC: -195,
    pressureBar: null,
    atmosphere: '83% hydrogen, 15% helium, 2% methane, which makes it blue-green',
    moons: 29,
    moonNote: 'counting S/2025 U1, found by the James Webb Space Telescope in 2025',
    rings: true,
    note: 'It lies on its side, so each pole has 42 years of sunlight and then 42 of darkness.',
    colour: '#9fd3dc',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    kind: 'ice giant',
    diameterKm: 49_528,
    mass: 17.1,
    gravity: 1.14,
    rotationHours: 16.11,
    dayHours: 16.11,
    orbitDays: 60_189,
    distanceAu: 30.07,
    tiltDeg: 28.32,
    temperatureC: -200,
    pressureBar: null,
    atmosphere: '80% hydrogen, 19% helium, 1.5% methane',
    moons: 16,
    rings: true,
    note: 'The windiest planet, with winds up to 2,000 km/h. Found by calculation in 1846 (Chapter 7).',
    colour: '#4f73d9',
  },
];

export function worldById(id: WorldId): World {
  const world = WORLDS.find((w) => w.id === id);
  if (!world) throw new Error(`No world ${id}`);
  return world;
}

/** Saturn's main rings, from the inner edge of the C ring to the outer edge of the A ring, km from the centre. */
export const SATURN_RINGS_KM = { inner: 74_500, outer: 136_780 };

/** Known asteroids and other small bodies, beyond the numbered ones in src/data/asteroids.json. */
export const DWARF_PLANETS = ['Ceres', 'Pluto', 'Haumea', 'Makemake', 'Eris'] as const;

/** The known interstellar visitors, with the dates they were found, as of VISITORS_AS_OF; `called` is how the text names them. */
export const INTERSTELLAR_VISITORS = [
  { name: '1I/ʻOumuamua', called: 'ʻOumuamua', found: '19 October 2017' },
  { name: '2I/Borisov', called: 'comet Borisov', found: '30 August 2019' },
  { name: '3I/ATLAS', called: '3I/ATLAS', found: '1 July 2025' },
] as const;

export const VISITORS_AS_OF = monthYear(AS_OF.visitors.checked);

/** Chapter 8's sentence: "Three are known, as of October 2026: ʻOumuamua, found on 19 October 2017; …". */
export function visitorsSentence(): string {
  const counts = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const n: number = INTERSTELLAR_VISITORS.length;
  const list = INTERSTELLAR_VISITORS.map((v, i) => `${i === n - 1 && n > 1 ? 'and ' : ''}${v.called}, ${i === 0 ? 'found on ' : 'on '}${v.found}`);
  const count = counts[n] ?? String(n);
  return `${count[0].toUpperCase()}${count.slice(1)} ${n === 1 ? 'is' : 'are'} known, as of ${VISITORS_AS_OF}: ${list.join('; ')}.`;
}
