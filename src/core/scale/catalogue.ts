import { AU, R_EARTH } from '../constants';
import { galacticFromEquatorial } from '../coords/galactic';
import { eclipticFromEquatorial, meanObliquity } from '../coords/transforms';
import { meanLongitude, moonMeanLongitude, MEAN_ORBITS, PLANETS, type PlanetName } from '../ephemeris/meanLongitude';
import { J2000, jdFromUnixMs } from '../time/julian';
import { DAYS_PER_JULIAN_YEAR, DEG, LIGHT_YEAR, HOUR_ANGLE } from '../units';
import { BODY_NAMES, DIAMETERS_KM, EVERYDAY_SCALE, MILKY_WAY, MOON_DISTANCE_KM, REGIONS_AU, STARS, VOYAGER_1 } from '../../data/scale';
import { PositionTree, type TreeNode, type Vec2 } from './tree';
import type { CameraStop } from './zoom';

/**
 * The scale zoom's catalogue (Figure 1.1): real objects at their true sizes,
 * placed at their true distances from their parents for a given date.
 *
 * Everything is drawn flat, seen from above:
 * - the person, the football pitch and Earth from straight above the person;
 * - the Moon, the planets and Voyager 1 in the plane of the planets' orbits,
 *   from above Earth's north pole, at their average positions on the date;
 * - the stars and the Milky Way in the plane of the Galaxy, from above its
 *   north pole, with the centre to the right of the Sun.
 * Objects above or below those planes are swung down into them, keeping their
 * true distance, so distances stay true even though directions are flattened.
 */

export type ZoomKind = 'person' | 'pitch' | 'body' | 'star' | 'ring' | 'circle' | 'fuzzy' | 'craft' | 'galaxy' | 'marker';

export interface ZoomObject extends TreeNode {
  name: string;
  kind: ZoomKind;
  /** Size across, m. For a ring, the outer diameter; for a craft, its own size. 0 for a marker. */
  diameter: number;
  /** A ring's inner radius, m. */
  innerRadius?: number;
  /** A pitch's length and width, m. */
  extent?: Vec2;
  /** Draw its orbit, a circle round its parent through its centre. */
  orbit?: boolean;
  /** The powers (view widths of 10^power m) over which it's labelled, and fades in and out. */
  label: Vec2;
  /** Higher wins when labels collide. */
  priority: number;
  /** The power to go to, to see it best. */
  goTo: number;
  /** A sentence about it, for the info box. */
  fact: string;
  /** How far it is from what it belongs to, in words, for the info box. */
  where?: string;
  /** Size across in light-years, when that is the natural unit. */
  acrossLy?: number;
}

/** The camera's stops: on the person (and Earth) up close, then the Sun, then the Galaxy's centre. */
export const ZOOM_CAMERA: readonly CameraStop[] = [
  { power: 0, anchor: 'person' },
  { power: 9.3, anchor: 'person' },
  { power: 10.1, anchor: 'sun' },
  { power: 19.4, anchor: 'sun' },
  { power: 20.6, anchor: 'galaxy' },
];

/** The zoom runs from a view 1 m across to one 10²¹ m across. */
export const ZOOM_MIN = 0;
export const ZOOM_MAX = 21;

const polar = (r: number, angle: number): Vec2 => [r * Math.cos(angle), r * Math.sin(angle)];
const km = (x: number) => x * 1000;

/** Label windows and best views for the planets. */
const PLANET_VIEWS: Record<PlanetName, { label: Vec2; goTo: number; fact: string }> = {
  mercury: { label: [10.6, 12.8], goTo: 11.4, fact: 'The smallest planet and the closest to the Sun, a little bigger than the Moon.' },
  venus: { label: [10.8, 13.0], goTo: 11.6, fact: 'Almost Earth’s twin in size, wrapped in clouds over a surface hot enough to melt lead.' },
  earth: {
    label: [5.8, 13.2],
    goTo: 7.3,
    fact: 'Home. Everyone who has ever lived has lived on this ball, apart from a few hundred astronauts for a while.',
  },
  mars: { label: [11.0, 13.3], goTo: 11.8, fact: 'About half Earth’s width: a cold desert with the tallest volcano in the Solar System.' },
  jupiter: {
    label: [11.6, 14.0],
    goTo: 12.4,
    fact: 'The biggest planet: 11 Earths across, and more than twice as massive as all the other planets together.',
  },
  saturn: { label: [12.0, 14.3], goTo: 12.7, fact: 'The ringed giant. Its main rings are about 280,000 km across but mostly only about 10 m thick.' },
  uranus: { label: [12.4, 14.6], goTo: 13.0, fact: 'An ice giant that spins on its side, about 4 Earths across.' },
  neptune: {
    label: [12.7, 14.9],
    goTo: 13.3,
    fact: 'The farthest planet, 30 times as far from the Sun as Earth. It takes 165 years to go round once.',
  },
};

/** The stars' label windows, nearest first. */
const STAR_VIEWS: Record<string, { label: Vec2; goTo: number; priority: number }> = {
  proxima: { label: [16.2, 18.2], goTo: 17.0, priority: 70 },
  'alpha-cen': { label: [16.6, 18.2], goTo: 17.0, priority: 65 },
  barnard: { label: [16.6, 18.3], goTo: 17.2, priority: 50 },
  sirius: { label: [16.8, 18.7], goTo: 17.4, priority: 60 },
  vega: { label: [17.3, 19.1], goTo: 18.0, priority: 55 },
  pleiades: { label: [18.5, 20.0], goTo: 19.3, priority: 50 },
  betelgeuse: { label: [18.6, 20.0], goTo: 19.3, priority: 45 },
  'orion-nebula': { label: [18.8, 20.3], goTo: 19.5, priority: 48 },
};

/** Voyager 1's distance from the Sun at a Julian Date (TT), AU: straight-line motion from the light-day milestone, good for decades either side. */
export function voyagerSunDistanceAu(jdTT: number): number {
  const milestone = jdFromUnixMs(Date.parse(VOYAGER_1.lightDay.when));
  return VOYAGER_1.sunDistanceAu + (VOYAGER_1.auPerYear * (jdTT - milestone)) / DAYS_PER_JULIAN_YEAR;
}

/** Voyager 1's direction, in ecliptic longitude and latitude (radians). */
export function voyagerDirection(): { lon: number; lat: number } {
  return eclipticFromEquatorial({ ra: VOYAGER_1.raHours * HOUR_ANGLE, dec: VOYAGER_1.decDegrees * DEG }, meanObliquity(J2000));
}

/** The catalogue for a date (Julian Date, TT), which sets where the Moon, the planets and Voyager 1 are drawn. */
export function zoomCatalogue(jdTT: number): ZoomObject[] {
  const objects: ZoomObject[] = [];
  const earthRadius = R_EARTH;

  // ---------- the Galaxy ----------
  objects.push({
    id: 'galaxy',
    parent: null,
    offset: [0, 0],
    name: 'The Milky Way',
    kind: 'galaxy',
    diameter: MILKY_WAY.discAcrossLy * LIGHT_YEAR,
    acrossLy: MILKY_WAY.discAcrossLy,
    label: [19.9, 22],
    priority: 90,
    goTo: 21,
    fact: 'Our galaxy: a few hundred billion stars in a flat disc with spiral arms, all going round its centre. The Sun takes about 220 million years to go round once.',
  });
  objects.push({
    id: 'sgr-a',
    parent: 'galaxy',
    offset: [0, 0],
    name: 'Sagittarius A*',
    kind: 'craft',
    diameter: km(MILKY_WAY.blackHoleAcrossKm),
    label: [20.2, 22],
    priority: 40,
    goTo: 20.8,
    fact: 'The black hole at the centre of the Milky Way, about 4 million times the Sun’s mass. Its event horizon would fit inside Mercury’s orbit.',
    where: 'At the centre of the Galaxy, about 26,700 light-years from the Sun',
  });

  // ---------- the Sun's neighbourhood ----------
  objects.push({
    id: 'sun',
    parent: 'galaxy',
    // The centre is in direction l = 0 from the Sun, so the Sun is at l = 180° from the centre.
    offset: [-MILKY_WAY.sunFromCentreLy * LIGHT_YEAR, 0],
    name: BODY_NAMES.sun,
    kind: 'star',
    diameter: km(DIAMETERS_KM.sun),
    label: [8.8, 15.4],
    priority: 100,
    goTo: 10.2,
    fact: 'Our star: 109 Earths across, and 99.8% of all the mass in the Solar System.',
    where: 'About 26,700 light-years from the centre of the Milky Way',
  });
  objects.push({
    id: 'you-are-here',
    parent: 'sun',
    offset: [0, 0],
    name: 'The Sun (you are here)',
    kind: 'marker',
    diameter: 0,
    label: [15.4, 22],
    priority: 95,
    goTo: 17.0,
    fact: 'From here on out, the whole Solar System, Oort cloud and all, is smaller than a pixel.',
  });

  for (const star of STARS) {
    const view = STAR_VIEWS[star.id];
    const { lon } = galacticFromEquatorial({ ra: star.raHours * HOUR_ANGLE, dec: star.decDegrees * DEG });
    const fuzzy = star.acrossLy !== undefined;
    objects.push({
      id: star.id,
      parent: 'sun',
      offset: polar(star.distanceLy * LIGHT_YEAR, lon),
      name: star.name,
      kind: fuzzy ? 'fuzzy' : 'star',
      diameter: fuzzy ? star.acrossLy! * LIGHT_YEAR : 2 * star.radiusSun! * km(DIAMETERS_KM.sun / 2),
      acrossLy: star.acrossLy,
      label: view.label,
      priority: view.priority,
      goTo: view.goTo,
      fact: star.fact,
      where: `${star.distanceLy.toLocaleString('en-GB')} light-years from the Sun`,
    });
  }

  objects.push({
    id: 'oort-cloud',
    parent: 'sun',
    offset: [0, 0],
    name: 'The Oort cloud (estimated)',
    kind: 'ring',
    diameter: 2 * REGIONS_AU.oortCloud[1] * AU,
    innerRadius: REGIONS_AU.oortCloud[0] * AU,
    label: [14.9, 17.2],
    priority: 60,
    goTo: 16.4,
    fact: 'A vast, sparse shell of icy bodies, the source of long-period comets. Nobody has seen it directly: its size is worked out from the comets’ orbits.',
    where: `Roughly ${REGIONS_AU.oortCloud[0].toLocaleString('en-GB')} to ${REGIONS_AU.oortCloud[1].toLocaleString('en-GB')} AU from the Sun`,
  });
  objects.push({
    id: 'heliopause',
    parent: 'sun',
    offset: [0, 0],
    name: 'The heliopause',
    kind: 'circle',
    diameter: 2 * REGIONS_AU.heliopause * AU,
    label: [14.0, 15.4],
    priority: 55,
    goTo: 14.6,
    fact: 'Where the wind of particles from the Sun meets the gas between the stars. Voyager 1 crossed it in August 2012. (It isn’t really a circle: it’s squashed on one side and stretched on the other.)',
    where: `About ${REGIONS_AU.heliopause} AU from the Sun, where Voyager 1 crossed it`,
  });

  const voyagerAu = voyagerSunDistanceAu(jdTT);
  objects.push({
    id: 'voyager-1',
    parent: 'sun',
    offset: polar(voyagerAu * AU, voyagerDirection().lon),
    name: 'Voyager 1',
    kind: 'craft',
    diameter: 3.7,
    label: [14.0, 15.6],
    priority: 65,
    goTo: 14.6,
    fact: 'Launched in 1977, it is the farthest spacecraft from Earth, still sending data back across the void with a 22-watt radio.',
    where: `About ${Math.round(voyagerAu)} AU from the Sun`,
  });
  objects.push({
    id: 'kuiper-belt',
    parent: 'sun',
    offset: [0, 0],
    name: 'The Kuiper belt',
    kind: 'ring',
    diameter: 2 * REGIONS_AU.kuiperBelt[1] * AU,
    innerRadius: REGIONS_AU.kuiperBelt[0] * AU,
    label: [13.2, 14.6],
    priority: 45,
    goTo: 13.6,
    fact: 'A belt of icy worlds beyond Neptune, Pluto among them.',
    where: `About ${REGIONS_AU.kuiperBelt[0]}–${REGIONS_AU.kuiperBelt[1]} AU from the Sun`,
  });
  objects.push({
    id: 'asteroid-belt',
    parent: 'sun',
    offset: [0, 0],
    name: 'The asteroid belt',
    kind: 'ring',
    diameter: 2 * REGIONS_AU.asteroidBelt[1] * AU,
    innerRadius: REGIONS_AU.asteroidBelt[0] * AU,
    label: [11.7, 13.0],
    priority: 40,
    goTo: 12.1,
    fact: 'Most of the Solar System’s rocky leftovers orbit here, between Mars and Jupiter. They’re so spread out that spacecraft fly through without steering round anything.',
    where: `About ${REGIONS_AU.asteroidBelt[0]}–${REGIONS_AU.asteroidBelt[1]} AU from the Sun`,
  });

  // ---------- the planets ----------
  for (const planet of PLANETS) {
    const view = PLANET_VIEWS[planet];
    const a = MEAN_ORBITS[planet].a;
    objects.push({
      id: planet,
      parent: 'sun',
      offset: polar(a * AU, meanLongitude(planet, jdTT)),
      name: BODY_NAMES[planet],
      kind: 'body',
      diameter: km(DIAMETERS_KM[planet]),
      orbit: true,
      label: view.label,
      priority: planet === 'earth' ? 90 : 80 - PLANETS.indexOf(planet),
      goTo: view.goTo,
      fact: view.fact,
      where: `${a < 2 ? a.toFixed(2) : a.toFixed(1)} AU from the Sun on average`,
    });
  }

  // ---------- Earth and its neighbourhood ----------
  objects.push({
    id: 'moon',
    parent: 'earth',
    offset: polar(km(MOON_DISTANCE_KM), moonMeanLongitude(jdTT)),
    name: BODY_NAMES.moon,
    kind: 'body',
    diameter: km(DIAMETERS_KM.moon),
    orbit: true,
    label: [8.2, 10.6],
    priority: 75,
    goTo: 9.0,
    fact: 'About a quarter of Earth’s width. Twelve people have walked on it, between 1969 and 1972.',
    where: `${MOON_DISTANCE_KM.toLocaleString('en-GB')} km from Earth on average`,
  });
  objects.push({
    id: 'iss',
    parent: 'earth',
    // Drawn on the left of Earth, at its height above the ground.
    offset: [-(earthRadius + km(EVERYDAY_SCALE.issAltitudeKm)), 0],
    name: 'The International Space Station',
    kind: 'craft',
    diameter: EVERYDAY_SCALE.issAcross,
    label: [6.9, 8.0],
    priority: 50,
    goTo: 7.3,
    fact: 'About the size of a football pitch, going round Earth every 93 minutes. Its altitude slowly sinks and is boosted back up.',
    where: `About ${EVERYDAY_SCALE.issAltitudeKm} km above the ground`,
  });
  objects.push({
    id: 'atmosphere',
    parent: 'earth',
    offset: [0, 0],
    name: 'The edge of space',
    kind: 'ring',
    diameter: 2 * (earthRadius + km(EVERYDAY_SCALE.karmanLineKm)),
    innerRadius: earthRadius,
    label: [6.9, 7.7],
    priority: 45,
    goTo: 7.2,
    fact: 'Nine-tenths of the air is in the lowest 16 km. The Kármán line, 100 km up, is a conventional edge of space.',
    where: `${EVERYDAY_SCALE.karmanLineKm} km above sea level`,
  });
  objects.push({
    id: 'pitch',
    parent: 'earth',
    offset: [0, 0],
    name: 'A football pitch',
    kind: 'pitch',
    diameter: EVERYDAY_SCALE.pitch[0],
    extent: EVERYDAY_SCALE.pitch,
    label: [1.4, 3.4],
    priority: 60,
    goTo: 2.3,
    fact: `${EVERYDAY_SCALE.pitch[0]} m by ${EVERYDAY_SCALE.pitch[1]} m, the size FIFA recommends. Section 1.2 builds the Solar System on one.`,
  });
  objects.push({
    id: 'person',
    parent: 'earth',
    // Seen from straight above, the person is at the centre of Earth's disc.
    offset: [0, 0],
    name: 'You',
    kind: 'person',
    diameter: EVERYDAY_SCALE.person,
    label: [-1, 1.6],
    priority: 100,
    goTo: 0.65,
    fact: 'A person lying on the grass in the middle of a football pitch, seen from above: the start of the zoom.',
  });

  // Check the tree once, so a bad parent fails loudly here rather than while drawing.
  new PositionTree(objects);
  return objects;
}

/**
 * One line per power of ten, for the zoom's caption: what a view of that size
 * shows. Index n is for a view 10^n m across.
 */
export const RUNGS: readonly string[] = [
  'A person is a little under 2 m long.',
  'About the size of a house, or a city bus.',
  'A football pitch: 105 m by 68 m.',
  'A kilometre: about a 12-minute walk.',
  'Planes cruise about 11 km up, a little above the top of Mount Everest (8.8 km).',
  '100 km up is the conventional edge of space, the Kármán line.',
  'The Space Station orbits about 420 km up.',
  'Earth, 12,742 km across. The air and the Space Station hug its edge.',
  'Light crosses 300,000 km in a second. The Moon is 384,400 km away, 30 Earths.',
  'The Moon’s orbit, 769,000 km across. The Sun is wider still: 1.39 million km.',
  'The Sun, seen whole. Its light takes 8 minutes 19 seconds to reach Earth.',
  'The inner planets: Mercury and Venus go round the Sun inside Earth’s orbit.',
  'Earth’s orbit is 300 million km across: 2 AU. Mars, the asteroid belt and Jupiter are next.',
  'All eight planets. Neptune is 30 AU out, about 4 light-hours.',
  'The Kuiper belt, the heliopause and Voyager 1, the farthest spacecraft.',
  '10¹⁵ m is a tenth of a light-year. Even the inner Oort cloud is out here.',
  'A light-year is 9.46 × 10¹⁵ m, or 63,000 AU. The Oort cloud may reach out about 1.5 light-years.',
  'The nearest stars, a few light-years away. Proxima Centauri is 4.25 light-years off.',
  'Our neighbourhood, about 100 light-years across. Every star here is too small to see.',
  'A thousand light-years: the Pleiades, Betelgeuse and the Orion Nebula.',
  'The Sun is about 26,700 light-years from the centre of the Milky Way.',
  'The Milky Way’s disc, about 100,000 light-years across.',
];
