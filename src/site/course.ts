import type { ComponentType } from 'react';
import type { MDXContent } from 'mdx/types';
import { slugify } from './router';

/**
 * The course registry: the parts, the chapters (numbered 1–31 straight through),
 * the Toolkit pages and the labs. The sidebar, the part pages, "Builds on" lines,
 * "Next chapter" links and reading progress all read from here.
 *
 * Parts I and II are planned in detail (docs/part1/plan.md, docs/part2/plan.md),
 * so their chapters list their sections. Part III is an outline (docs/plan.md §3):
 * its chapters get sections and "Builds on" links in its planning stage.
 */

export type PartNumber = 1 | 2 | 3;
export type LabSlug = 'orrery' | 'star-forge';

type LoadMdx = () => Promise<{ default: MDXContent }>;

export interface PartInfo {
  /** The page's address: "part-1". */
  slug: `part-${PartNumber}`;
  number: PartNumber;
  numeral: 'I' | 'II' | 'III';
  title: string;
  /** What the part is about, in a few words. */
  subject: string;
  level: string;
  maths: string;
  /** The thread that runs through the course, as this part takes it up. */
  thread: { name: string; text: string };
  /** Who should start here. */
  startHere: string;
  /** "By the end of this part, you can explain…", once the part is planned in detail. */
  outcomes?: readonly string[];
  /** Reading time, once the part is planned in detail. */
  minutes?: string;
  /** The labs that come with the part, and which version. */
  labs: readonly { slug: LabSlug; version: 1 | 2 }[];
}

export interface ChapterInfo {
  /** The page's address, from the title: "the-turning-sky". */
  slug: string;
  number: number;
  part: PartNumber;
  title: string;
  blurb: string;
  /** Section titles, exactly as written in the chapter's `##` headings. Empty until the part is planned in detail. */
  sections: readonly string[];
  /** The chapters it builds on, by number. [] means none; absent means not planned yet. */
  buildsOn?: readonly number[];
  /** Toolkit pages it first needs, by slug. */
  toolkit?: readonly string[];
  /** Chapter 31 may be left out. */
  optional?: boolean;
  /** Loads the chapter's MDX on demand; absent while the chapter isn't written yet. */
  load?: LoadMdx;
}

export interface ToolkitInfo {
  slug: string;
  /** "T1", "T2", … */
  code: string;
  title: string;
  blurb: string;
  part: PartNumber;
  /** The chapter that first needs it, where that is planned. */
  firstNeeded?: number;
  load?: LoadMdx;
}

export interface LabInfo {
  slug: LabSlug;
  title: string;
  /** The physics it plays with. */
  subject: string;
  blurb: string;
  versions: readonly { version: 1 | 2; part: PartNumber; summary: string }[];
  /** Loads the lab on demand; absent while it isn't built yet. */
  load?: () => Promise<{ default: ComponentType }>;
}

export const PARTS: readonly PartInfo[] = [
  {
    slug: 'part-1',
    number: 1,
    numeral: 'I',
    title: 'The Clockwork',
    subject: 'The sky and the Solar System',
    level: 'Beginner',
    maths: 'Arithmetic, ratios and powers of ten.',
    thread: { name: 'Motion', text: 'An orbit is a fall that keeps missing. Sideways speed holds gravity off for ever.' },
    startHere: 'Start here if you’re new to astronomy.',
    outcomes: [
      'why the stars turn overhead, and how the sky depends on where you are and the time of year;',
      'why we have seasons, and why distance from the Sun isn’t the reason;',
      'why the Moon has phases, and why eclipses happen only in some months;',
      'why planets sometimes move backward, and how that led to a Sun-centred system;',
      'Kepler’s three laws, and how to read a planet’s year from its distance;',
      'why an orbit is a fall that keeps missing, and how a computer calculates one;',
      'how to weigh the Sun, Jupiter or Earth from an orbit;',
      'why there are two tides a day;',
      'what’s in the Solar System, and roughly how it formed;',
      'how we measure the distance to a star, and where we are in the Milky Way.',
    ],
    minutes: 'about 20–30 minutes each',
    labs: [{ slug: 'orrery', version: 1 }],
  },
  {
    slug: 'part-2',
    number: 2,
    numeral: 'II',
    title: 'The Stars',
    subject: 'Stars as physical objects',
    level: 'Moderate',
    maths: 'Algebra and a handful of named laws, in short boxes.',
    thread: {
      name: 'Heat',
      text: 'A star is a ball of gas whose pressure holds gravity off, but only for as long as its fuel lasts.',
    },
    startHere: 'Start here if you know the Solar System.',
    outcomes: [
      'what light is, why telescopes are big, and why some have to go to space;',
      'how a star’s colour tells its temperature, and how its temperature and size set its power;',
      'how the lines in a spectrum show what a star is made of and how it moves, and why stars are mostly hydrogen;',
      'what the Hertzsprung–Russell diagram shows, and why most stars lie on the main sequence;',
      'how pairs of stars give us stars’ masses, and why heavier stars shine far brighter;',
      'what powers the Sun, and how we know what is inside it;',
      'how stars are born in cold clouds, and why small stars far outnumber big ones;',
      'why heavy stars live fast and die young, and how clusters give stars’ ages;',
      'how stars die, and what they leave behind: white dwarfs, neutron stars and black holes;',
      'how we find planets round other stars, and what we have found.',
    ],
    minutes: 'about 25–35 minutes each',
    labs: [{ slug: 'star-forge', version: 1 }],
  },
  {
    slug: 'part-3',
    number: 3,
    numeral: 'III',
    title: 'The Engine Room',
    subject: 'Inside the stars, and the extremes',
    level: 'Advanced',
    maths: 'Calculus, differential equations solved by stepping, and a little quantum mechanics and relativity.',
    thread: {
      name: 'The limits',
      text: 'When the fuel runs out, stranger forces take over. Quantum (degeneracy) pressure holds up white dwarfs and neutron stars, up to a limit. Beyond that limit nothing can, and the result is a black hole.',
    },
    startHere: 'Start here if you know some physics.',
    labs: [
      { slug: 'orrery', version: 2 },
      { slug: 'star-forge', version: 2 },
    ],
  },
];

/** A chapter, with its slug made from its title. */
function chapter(info: Omit<ChapterInfo, 'slug' | 'sections'> & { sections?: readonly string[] }): ChapterInfo {
  return { ...info, slug: slugify(info.title), sections: info.sections ?? [] };
}

export const CHAPTERS: readonly ChapterInfo[] = [
  // ---------- Part I · The Clockwork ----------
  chapter({
    number: 1,
    part: 1,
    title: 'A sense of scale',
    blurb: 'Powers of ten from a person to the Milky Way, a Solar System on a football pitch, and light as a measuring stick.',
    sections: ['Ten times bigger, again and again', 'A Solar System on a football pitch', 'Light as a measuring stick', 'Where we’re going'],
    buildsOn: [],
    toolkit: ['powers-of-ten'],
    load: () => import('../content/chapter1.mdx'),
  }),
  chapter({
    number: 2,
    part: 1,
    title: 'The turning sky',
    blurb: 'The sky as a dome, why the stars wheel about the pole, how the sky changes with latitude, star time and Sun time, and the slow wobble of Earth’s axis.',
    sections: ['The sky as a dome', 'Everything turns about the pole', 'Where you stand changes the sky', 'Star time and Sun time', 'The slow wobble'],
    buildsOn: [1],
    toolkit: ['angles-in-the-sky'],
    load: () => import('../content/chapter2.mdx'),
  }),
  chapter({
    number: 3,
    part: 1,
    title: 'The Sun’s year',
    blurb: 'The Sun’s path through the zodiac, why we have seasons (the tilt, not the distance), solstices and the midnight Sun, calendars, and the analemma.',
    sections: ['The Sun’s path among the stars', 'Why we have seasons', 'Solstices, equinoxes and the midnight Sun', 'Calendars', 'The analemma'],
    buildsOn: [2],
    load: () => import('../content/chapter3.mdx'),
  }),
  chapter({
    number: 4,
    part: 1,
    title: 'The Moon',
    blurb: 'Phases, two kinds of month, the face we always see, and why eclipses come only in some months.',
    sections: ['Half lit, always', 'Two kinds of month', 'The face we always see', 'Eclipses', 'The Saros'],
    buildsOn: [2, 3],
    load: () => import('../content/chapter4.mdx'),
  }),
  chapter({
    number: 5,
    part: 1,
    title: 'Wanderers',
    blurb: 'Planets and their backward loops, Ptolemy’s circles on circles, and how Copernicus, Galileo and Tycho put the Sun in the middle.',
    sections: ['Stars that wander', 'Backward loops', 'Circles on circles', 'The Sun in the middle', 'What Galileo saw', 'Tycho’s data'],
    buildsOn: [2, 3, 4],
    load: () => import('../content/chapter5.mdx'),
  }),
  chapter({
    number: 6,
    part: 1,
    title: 'Kepler’s laws',
    blurb: 'Orbits are ellipses, planets sweep equal areas in equal times, and a planet’s year follows from its distance.',
    sections: ['Mars refuses a circle', 'Equal areas in equal times', 'The harmonic law', 'Where will the planet be?'],
    buildsOn: [5],
    toolkit: ['ratios-and-scaling'],
    load: () => import('../content/chapter6.mdx'),
  }),
  chapter({
    number: 7,
    part: 1,
    title: 'Newton’s gravity',
    blurb: 'The falling Moon, orbits computed step by step, weighing the Sun, balance points, and why there are two tides a day.',
    sections: ['The falling Moon', 'Orbits, one step at a time', 'Weighing the Sun', 'Both bodies move', 'Tides', 'Gravity’s victories'],
    buildsOn: [6],
    toolkit: ['solving-by-stepping'],
    load: () => import('../content/chapter7.mdx'),
  }),
  chapter({
    number: 8,
    part: 1,
    title: 'A tour of the Solar System',
    blurb: 'Rocky worlds, the giant planets and their moons, asteroids, comets and resonances, and how it all formed.',
    sections: ['The family portrait', 'Rocky worlds', 'Giants and their moons', 'Small worlds', 'How it all formed'],
    buildsOn: [1, 7],
    load: () => import('../content/chapter8.mdx'),
  }),
  chapter({
    number: 9,
    part: 1,
    title: 'The stars are suns',
    blurb: 'How far away the stars are, our stellar neighbours, the Sun seen from afar, and our place in the Milky Way.',
    sections: ['How far is a star?', 'Our neighbours', 'The Sun from far away', 'Our place in the Milky Way'],
    buildsOn: [1, 6, 7],
    load: () => import('../content/chapter9.mdx'),
  }),

  // ---------- Part II · The Stars ----------
  chapter({
    number: 10,
    part: 2,
    title: 'Light, the messenger',
    blurb: 'Waves and photons, the electromagnetic spectrum, why some light never reaches the ground, and how telescopes collect and resolve light.',
    sections: ['Waves of light', 'Light comes in packets', 'Why some light never reaches the ground', 'Sharper eyes'],
    buildsOn: [1, 9],
    load: () => import('../content/chapter10.mdx'),
  }),
  chapter({
    number: 11,
    part: 2,
    title: 'Colour is temperature',
    blurb: 'Hotter is bluer and far brighter; luminosity against apparent brightness; the inverse-square law.',
    sections: ['Everything glows', 'A thermometer made of two filters', 'Hotter is far brighter', 'How bright it looks, and how bright it is'],
    buildsOn: [9, 10],
    toolkit: ['logarithms-and-magnitudes'],
    load: () => import('../content/chapter11.mdx'),
  }),
  chapter({
    number: 12,
    part: 2,
    title: 'Barcodes in starlight',
    blurb: 'Atoms and their energy levels, absorption and emission lines, spectral classes, Cecilia Payne’s discovery that stars are mostly hydrogen, and Doppler shifts.',
    sections: ['Dark lines in sunlight', 'Atoms as ladders', 'The alphabet of the stars', 'Stars are made of hydrogen', 'Starlight’s speedometer'],
    buildsOn: [10, 11],

    load: () => import('../content/chapter12.mdx'),
  }),
  chapter({
    number: 13,
    part: 2,
    title: 'Sorting the stars',
    blurb: 'Magnitudes, absolute magnitude, and the Hertzsprung–Russell diagram: the main sequence, giants and white dwarfs.',
    sections: ['Two numbers for every star', 'Hertzsprung and Russell’s diagram', 'Giants, dwarfs and the Sun', 'A snapshot, not a path'],
    buildsOn: [9, 11, 12],
    toolkit: ['logarithms-and-magnitudes'],

    load: () => import('../content/chapter13.mdx'),
  }),
  chapter({
    number: 14,
    part: 2,
    title: 'Weighing the stars',
    blurb: 'Visual, spectroscopic and eclipsing binaries give stars’ masses and sizes, and the mass–luminosity relation.',
    sections: ['Stars in pairs', 'Weighing with the Doppler effect', 'Eclipses give sizes', 'Heavier means brighter'],
    buildsOn: [6, 7, 12, 13],
    toolkit: ['measurements-and-uncertainty'],
    load: () => import('../content/chapter14.mdx'),
  }),
  chapter({
    number: 15,
    part: 2,
    title: 'The Sun up close',
    blurb: 'Its layers, granulation, sunspots and the 11-year cycle, flares and space weather, solar neutrinos, and fusion in outline.',
    sections: ['Inside the Sun', 'Sunspots and the 11-year cycle', 'Space weather', 'What keeps the Sun shining', 'Messages from the core'],
    buildsOn: [11, 12, 13],
    load: () => import('../content/chapter15.mdx'),
  }),
  chapter({
    number: 16,
    part: 2,
    title: 'Born in the dark',
    blurb: 'Gas and dust between the stars, collapsing clouds, protostars, discs and jets, brown dwarfs, and why small stars far outnumber big ones.',
    sections: ['The space between the stars', 'Clouds that collapse', 'From protostar to star', 'Failed stars', 'Many small stars, few big ones'],
    buildsOn: [8, 13, 14],
    load: () => import('../content/chapter16.mdx'),
  }),
  chapter({
    number: 17,
    part: 2,
    title: 'A star’s life',
    blurb: 'Lifetimes, what happens when the hydrogen runs out, red giants, star clusters as snapshots, ages from the turn-off, and pulsating stars.',
    sections: ['Living fast, dying young', 'When the hydrogen runs out', 'Clusters as snapshots', 'Stars that breathe'],
    buildsOn: [13, 14, 15, 16],
    load: () => import('../content/chapter17.mdx'),
  }),
  chapter({
    number: 18,
    part: 2,
    title: 'How stars die',
    blurb: 'Planetary nebulae and white dwarfs, supernovae, neutron stars and pulsars, black holes, and the elements returned to space.',
    sections: ['A gentle end', 'Exploding stars', 'Neutron stars', 'Finding black holes', 'The fork in the road', 'Stardust'],
    buildsOn: [12, 14, 17],
    load: () => import('../content/chapter18.mdx'),
  }),
  chapter({
    number: 19,
    part: 2,
    title: 'Other worlds',
    blurb: 'Finding exoplanets by their wobbles and transits, what we’ve found, habitable zones, and reading atmospheres.',
    sections: ['A wobble in Pegasus', 'Shadows', 'What we’ve found', 'Where water could be liquid', 'Reading other worlds’ air'],
    buildsOn: [7, 12, 14],
    toolkit: ['measurements-and-uncertainty'],
  }),

  // ---------- Part III · The Engine Room ----------
  chapter({
    number: 20,
    part: 3,
    title: 'Holding a star up',
    blurb: 'Hydrostatic equilibrium, the virial theorem, the Kelvin–Helmholtz timescale and the age-of-the-Sun puzzle, Jeans collapse, and polytropes.',
  }),
  chapter({
    number: 21,
    part: 3,
    title: 'Getting the energy out',
    blurb: 'A photon’s random walk, opacity, convection and when it starts, and the four equations of stellar structure.',
  }),
  chapter({
    number: 22,
    part: 3,
    title: 'The nuclear furnace',
    blurb: 'Quantum tunnelling and the Gamow peak, the pp chains and the CNO cycle, triple-alpha, the late burning stages and neutrino cooling.',
  }),
  chapter({
    number: 23,
    part: 3,
    title: 'Where the elements come from',
    blurb: 'Binding energy and the iron peak, slow and rapid neutron capture, and the origin of every element.',
  }),
  chapter({
    number: 24,
    part: 3,
    title: 'Matter at its limit',
    blurb: 'Degeneracy pressure, white dwarfs (heavier ones are smaller), the Chandrasekhar mass, and white dwarfs that cool and crystallise.',
  }),
  chapter({
    number: 25,
    part: 3,
    title: 'Stellar explosions',
    blurb: 'Core collapse and the neutrinos of SN 1987A, the types of supernova, light curves powered by radioactive nickel, and pair-instability supernovae.',
  }),
  chapter({
    number: 26,
    part: 3,
    title: 'Neutron stars',
    blurb: 'Their structure and maximum mass, pulsars as clocks, spin-down, and magnetars.',
  }),
  chapter({
    number: 27,
    part: 3,
    title: 'Black holes',
    blurb: 'Horizons, orbits and light near a black hole, accretion discs and jets, X-ray binaries, and imaging the shadow.',
  }),
  chapter({
    number: 28,
    part: 3,
    title: 'Two stars are stranger than one',
    blurb: 'The Roche potential, mass transfer and what it does to the orbit, the Algol paradox, common envelopes, and the binary zoo.',
  }),
  chapter({
    number: 29,
    part: 3,
    title: 'Ripples in spacetime',
    blurb: 'Gravitational waves: the Hulse–Taylor pulsar, LIGO’s detections, chirps, neutron-star mergers and kilonovae.',
  }),
  chapter({
    number: 30,
    part: 3,
    title: 'Crowds of stars',
    blurb: 'Star clusters and how they evaporate, the Milky Way’s structure, the rotation curve and dark matter, and the black hole at the centre.',
  }),
  chapter({
    number: 31,
    part: 3,
    title: 'Colliding galaxies',
    blurb: 'Tidal tails and bridges, galaxy mergers, active nuclei, and the door to cosmology.',
    optional: true,
  }),
];

export const TOOLKIT: readonly ToolkitInfo[] = [
  {
    slug: 'powers-of-ten',
    code: 'T1',
    title: 'Powers of ten',
    blurb: 'Scientific notation, multiplying and dividing powers, orders of magnitude, and prefixes from kilo to giga.',
    part: 1,
    firstNeeded: 1,
    load: () => import('../content/toolkit/powers-of-ten.mdx'),
  },
  {
    slug: 'angles-in-the-sky',
    code: 'T2',
    title: 'Angles in the sky',
    blurb: 'Degrees, arcminutes and arcseconds, your hand at arm’s length, and the small-angle rule.',
    part: 1,
    firstNeeded: 2,
    load: () => import('../content/toolkit/angles-in-the-sky.mdx'),
  },
  {
    slug: 'ratios-and-scaling',
    code: 'T3',
    title: 'Ratios and scaling',
    blurb: 'What happens when you double something, square and cube laws, powers and roots, and reading log–log plots.',
    part: 1,
    firstNeeded: 6,
    load: () => import('../content/toolkit/ratios-and-scaling.mdx'),
  },
  {
    slug: 'solving-by-stepping',
    code: 'T4',
    title: 'Solving by stepping',
    blurb: 'Turning “how things change” into small steps, why the step size matters, and why some methods drift.',
    part: 1,
    firstNeeded: 7,
    load: () => import('../content/toolkit/solving-by-stepping.mdx'),
  },
  {
    slug: 'logarithms-and-magnitudes',
    code: 'T5',
    title: 'Logarithms and magnitudes',
    blurb: 'Scales that multiply instead of add, and why astronomers’ magnitudes run backwards.',
    part: 2,
    firstNeeded: 11,
    load: () => import('../content/toolkit/logarithms-and-magnitudes.mdx'),
  },
  {
    slug: 'measurements-and-uncertainty',
    code: 'T6',
    title: 'Measurements and uncertainty',
    blurb: 'Error bars, how uncertainties combine, and telling a real signal from noise.',
    part: 2,
    firstNeeded: 14,
    load: () => import('../content/toolkit/measurements-and-uncertainty.mdx'),
  },
  {
    slug: 'vectors',
    code: 'T7',
    title: 'Vectors',
    blurb: 'Quantities with a direction: adding and scaling them, and the dot and cross products.',
    part: 3,
  },
  {
    slug: 'rates-of-change',
    code: 'T8',
    title: 'Rates of change',
    blurb: 'Derivatives as slopes and speeds, and the few rules you need to work them out.',
    part: 3,
  },
  {
    slug: 'adding-up-small-pieces',
    code: 'T9',
    title: 'Adding up small pieces',
    blurb: 'Integrals as sums of thin slices: a star’s mass from its density, energy from power.',
    part: 3,
  },
  {
    slug: 'differential-equations',
    code: 'T10',
    title: 'Differential equations',
    blurb: 'Equations about change, and how a computer solves them one step at a time.',
    part: 3,
  },
  {
    slug: 'estimating-with-orders-of-magnitude',
    code: 'T11',
    title: 'Estimating with orders of magnitude',
    blurb: 'Back-of-the-envelope physics: getting within a factor of ten, and why that is often enough.',
    part: 3,
  },
];

export const LABS: readonly LabInfo[] = [
  {
    slug: 'orrery',
    title: 'The Orrery',
    subject: 'Orbital mechanics',
    blurb: 'Build any planetary system, from the Solar System to three-body chaos, and watch gravity run it.',
    versions: [
      {
        version: 1,
        part: 1,
        summary:
          'Presets from the Solar System today to the figure-eight three-body orbit; add your own bodies; top-down and 3D views, a rotating frame, time warp, and live checks on the simulation’s own error.',
      },
      {
        version: 2,
        part: 3,
        summary: 'Star clusters, colliding galaxies, a correction for general relativity, and the fate of the planets as the Sun swells and loses mass.',
      },
    ],
    load: () => import('../lab/orrery/Orrery'),
  },
  {
    slug: 'star-forge',
    title: 'The Star Forge',
    subject: 'Stellar evolution',
    blurb: 'Set a star’s mass and make-up, and follow its whole life, from the main sequence to what it leaves behind.',
    versions: [
      {
        version: 1,
        part: 2,
        summary:
          'Any single star from brown dwarfs to the most massive: its track on the HR diagram, its size and colour beside the Sun’s, its life on a timeline, and its fate.',
      },
      {
        version: 2,
        part: 3,
        summary: 'Pairs of stars: mass transfer, common envelopes, mergers and supernova kicks, with the outcome classified.',
      },
    ],
  },
];

/** Addresses taken by pages other than chapters, which chapter slugs must not clash with. */
export const RESERVED_PAGES = ['toolkit', 'labs', 'glossary', 'about'] as const;

export function findChapter(slug: string): ChapterInfo | undefined {
  return CHAPTERS.find((c) => c.slug === slug);
}

export function chapterNumbered(number: number): ChapterInfo | undefined {
  return CHAPTERS.find((c) => c.number === number);
}

export function chaptersOf(part: PartNumber): readonly ChapterInfo[] {
  return CHAPTERS.filter((c) => c.part === part);
}

/** Whether a part is out: every one of its chapters is written. Until then the start page shows it as coming soon. */
export function partReady(part: PartInfo): boolean {
  return chaptersOf(part.number).every((c) => c.load !== undefined);
}

export function findPart(slug: string): PartInfo | undefined {
  return PARTS.find((p) => p.slug === slug);
}

export function partNumbered(number: PartNumber): PartInfo {
  return PARTS[number - 1];
}

/** A Toolkit page by its slug ("powers-of-ten") or its page address ("toolkit/powers-of-ten"). */
export function findToolkitPage(slug: string): ToolkitInfo | undefined {
  const bare = slug.replace(/^toolkit\//, '');
  return TOOLKIT.find((t) => t.slug === bare);
}

export function toolkitPage(t: ToolkitInfo): string {
  return `toolkit/${t.slug}`;
}

export function findLab(slug: string): LabInfo | undefined {
  return LABS.find((l) => l.slug === slug);
}

/** The id of a section heading, from its title. */
export function sectionId(title: string): string {
  return slugify(title);
}

/** Which part a page belongs to, if any: for opening the right group in the sidebar. */
export function partOfPage(page: string): PartNumber | null {
  const part = findPart(page);
  if (part) return part.number;
  const item = findChapter(page) ?? (page.startsWith('toolkit/') ? findToolkitPage(page) : undefined);
  if (item) return item.part;
  return findLab(page)?.versions[0].part ?? null;
}
