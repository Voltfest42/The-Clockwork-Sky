/**
 * The people and moments of Part I, for the history timeline in Chapters 5
 * and 7 and on the About page. From the Part I research brief
 * (docs/part1/research.md §6 and §13). Years use astronomical numbering
 * (1 BC = year 0), so "c. 270 BC" is −269; `when` is how the year is shown.
 */

export interface TimelineEvent {
  /** Astronomical year, for ordering and for picking a range. */
  year: number;
  /** The date as shown: "c. 270 BC", "1609". */
  when: string;
  /** Who, where there is one person to name. */
  who?: string;
  what: string;
  /** The chapter that tells the story. */
  chapter?: number;
}

export const TIMELINE: readonly TimelineEvent[] = [
  { year: -3199, when: 'c. 3200 BC', what: 'Newgrange’s roof-box is aligned to the midwinter sunrise.', chapter: 3 },
  { year: -2799, when: 'c. 2800 BC', what: 'Thuban is the pole star.', chapter: 2 },
  { year: -2499, when: 'c. 2500 BC', what: 'Stonehenge’s sarsen circle is raised, aligned to the solstices.', chapter: 3 },
  { year: -599, when: '1st millennium BC', what: 'Babylonian astronomers record eclipses and use the 223-month cycle, the Saros.', chapter: 4 },
  { year: -269, when: 'c. 270 BC', who: 'Aristarchus of Samos', what: 'measures the sizes and distances of the Sun and Moon, and proposes that Earth goes round the Sun.', chapter: 5 },
  { year: -239, when: 'c. 240 BC', who: 'Eratosthenes', what: 'measures Earth’s circumference.' },
  { year: -129, when: 'c. 130 BC', who: 'Hipparchus', what: 'makes a star catalogue and discovers precession.', chapter: 2 },
  { year: -99, when: 'c. 100 BC', what: 'The Antikythera mechanism is built, with a dial for the Saros.', chapter: 4 },
  { year: 150, when: 'c. AD 150', who: 'Ptolemy', what: 'writes the Almagest: epicycles, deferents and the equant.', chapter: 5 },
  { year: 1543, when: '1543', who: 'Copernicus', what: 'publishes De revolutionibus, with the Sun in the middle.', chapter: 5 },
  { year: 1572, when: '1572, 1577', who: 'Tycho Brahe', what: 'shows that a new star and a comet lie beyond the Moon: the heavens change.', chapter: 5 },
  { year: 1576, when: '1576–1597', who: 'Tycho Brahe', what: 'measures the planets from Uraniborg, on the island of Hven, to a minute or two of arc.', chapter: 5 },
  { year: 1582, when: '1582', what: 'The Gregorian calendar.', chapter: 3 },
  { year: 1609, when: '1609', who: 'Kepler', what: 'publishes Astronomia nova: orbits are ellipses, and sweep equal areas in equal times.', chapter: 6 },
  { year: 1610, when: '1610', who: 'Galileo', what: 'sees Jupiter’s moons, the Milky Way’s stars and the phases of Venus through a telescope.', chapter: 5 },
  { year: 1619, when: '1619', who: 'Kepler', what: 'finds the harmonic law: the square of the period follows the cube of the distance.', chapter: 6 },
  { year: 1666, when: 'c. 1666', who: 'Newton', what: 'wonders whether the pull that drops an apple reaches the Moon, weakened by the square of the distance.', chapter: 7 },
  { year: 1676, when: '1676', who: 'Rømer', what: 'times light’s journey across Earth’s orbit with Jupiter’s moons.', chapter: 8 },
  { year: 1687, when: '1687', who: 'Newton', what: 'publishes the Principia: one law of gravity for apples, moons and planets.', chapter: 7 },
  { year: 1705, when: '1705', who: 'Halley', what: 'predicts that his comet will return.', chapter: 7 },
  { year: 1758, when: '1758', who: 'Palitzsch', what: 'sees Halley’s comet come back, on Christmas night.', chapter: 7 },
  { year: 1759, when: '1759', what: 'Halley’s comet passes the Sun on 13 March, within the month Clairaut, Lalande and Lepaute allowed for Jupiter’s and Saturn’s pulls.', chapter: 7 },
  { year: 1781, when: '1781', who: 'William Herschel', what: 'finds Uranus, the first planet unknown to the ancients.', chapter: 8 },
  { year: 1785, when: '1785', who: 'William Herschel', what: 'maps the Milky Way by counting stars.', chapter: 9 },
  { year: 1798, when: '1798', who: 'Cavendish', what: 'weighs the Earth.', chapter: 7 },
  { year: 1801, when: '1801', who: 'Giuseppe Piazzi', what: 'finds Ceres, the first asteroid.', chapter: 8 },
  { year: 1838, when: '1838', who: 'Bessel', what: 'measures the first distance to a star, 61 Cygni.', chapter: 9 },
  { year: 1846, when: '1846', what: 'Neptune is found where Le Verrier predicted.', chapter: 7 },
  { year: 1866, when: '1866', who: 'Daniel Kirkwood', what: 'notices gaps in the asteroid belt and explains them by Jupiter’s resonances.', chapter: 8 },
  { year: 1918, when: '1918', who: 'Harlow Shapley', what: 'maps the globular clusters and moves the centre of the Galaxy to Sagittarius, far from the Sun.', chapter: 9 },
  { year: 1925, when: '1925', who: 'Walter Hohmann', what: 'works out the cheapest path from one planet’s orbit to another’s.', chapter: 7 },
  { year: 1930, when: '1930', who: 'Clyde Tombaugh', what: 'finds Pluto.', chapter: 8 },
  { year: 1989, when: '1989', who: 'Jacques Laskar', what: 'shows that the planets’ orbits are chaotic over tens of millions of years.', chapter: 8 },
  { year: 2006, when: '2006', what: 'The International Astronomical Union defines a planet, and Pluto becomes a dwarf planet.', chapter: 8 },
  { year: 2013, when: '2013', what: 'ESA launches Gaia, which measures the parallaxes of over a billion stars.', chapter: 9 },
  { year: 2017, when: '2017', what: 'ʻOumuamua, the first known visitor from another star, passes through the Solar System.', chapter: 8 },
];

/** The events from one year to another (astronomical years, inclusive). */
export function timelineBetween(from: number, to: number): TimelineEvent[] {
  return TIMELINE.filter((e) => e.year >= from && e.year <= to);
}
