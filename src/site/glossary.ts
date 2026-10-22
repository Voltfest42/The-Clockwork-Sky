/**
 * Plain-language definitions, shown when a reader hovers over or taps a <Term>,
 * and listed on the Glossary page. Part I's terms come from its research brief
 * (docs/part1/research.md §14); each part adds its own.
 */
interface Entry {
  term: string;
  definition: string;
}

export const GLOSSARY = {
  altitude: {
    term: 'Altitude',
    definition: 'How high something appears above the horizon, as an angle: 0° on the horizon, 90° straight overhead.',
  },
  aphelion: {
    term: 'Aphelion',
    definition: 'The point of an orbit farthest from the Sun. Earth passes it in early July.',
  },
  au: {
    term: 'Astronomical unit (AU)',
    definition: 'About the average distance between Earth and the Sun: exactly 149,597,870,700 m, or roughly 150 million km.',
  },
  azimuth: {
    term: 'Azimuth',
    definition: 'Compass direction along the horizon, as an angle: 0° is north, 90° east, 180° south and 270° west.',
  },
  barycentre: {
    term: 'Barycentre',
    definition: 'The balance point, or centre of mass, that two orbiting bodies both circle.',
  },
  'celestial-equator': {
    term: 'Celestial equator',
    definition: 'The circle on the sky halfway between the celestial poles, directly above Earth’s equator.',
  },
  'celestial-pole': {
    term: 'Celestial poles',
    definition: 'The two points on the sky that the stars circle each night, directly above Earth’s North and South Poles.',
  },
  'celestial-sphere': {
    term: 'Celestial sphere',
    definition: 'The imaginary dome of the sky, on which the stars seem to be painted because they are too far away for our eyes to judge their distances.',
  },
  circumpolar: {
    term: 'Circumpolar',
    definition: 'Close enough to a celestial pole never to set: a circumpolar star circles the pole all night, every night.',
  },
  conjunction: {
    term: 'Conjunction',
    definition: 'When a planet lines up with the Sun as seen from Earth, on the same side of the sky.',
  },
  declination: {
    term: 'Declination',
    definition: 'Latitude on the sky: how far north or south of the celestial equator something is, in degrees.',
  },
  deferent: {
    term: 'Deferent',
    definition: 'In Ptolemy’s model, the large circle around Earth that carries the centre of a planet’s epicycle.',
  },
  eccentricity: {
    term: 'Eccentricity',
    definition: 'How stretched an ellipse is: 0 for a circle, approaching 1 for a long, thin one.',
  },
  ecliptic: {
    term: 'Ecliptic',
    definition: 'The Sun’s yearly path around the sky against the stars. It is the plane of Earth’s orbit, seen from inside.',
  },
  elongation: {
    term: 'Elongation',
    definition: 'The angle between a planet and the Sun, as seen from Earth.',
  },
  epicycle: {
    term: 'Epicycle',
    definition: 'In Ptolemy’s model, the small circle a planet moves round, while the circle’s centre travels round the deferent.',
  },
  equant: {
    term: 'Equant',
    definition: 'In Ptolemy’s model, the off-centre point from which the centre of a planet’s epicycle appears to move round at a steady rate.',
  },
  equinox: {
    term: 'Equinox',
    definition: 'One of the two moments a year, around 20 March and 22 September, when the Sun crosses the celestial equator, and day and night are nearly equal everywhere.',
  },
  'escape-speed': {
    term: 'Escape speed',
    definition: 'The speed something needs never to fall back: 11.2 km/s from Earth’s surface, if there were no air.',
  },
  focus: {
    term: 'Focus',
    definition: 'One of the two points that define an ellipse. A planet’s orbit has the Sun at one focus.',
  },
  'light-year': {
    term: 'Light-year',
    definition: 'The distance light travels in a year: about 9.46 trillion km.',
  },
  meridian: {
    term: 'Meridian',
    definition: 'The line across the sky from due north to due south, through the point overhead. The Sun crosses it at noon by the sundial.',
  },
  node: {
    term: 'Node',
    definition: 'One of the two points where a tilted orbit crosses a reference plane, such as where the Moon’s orbit crosses the ecliptic.',
  },
  obliquity: {
    term: 'Obliquity',
    definition: 'The tilt of a planet’s spin axis to its orbit. Earth’s is 23.4°, and it is why we have seasons.',
  },
  opposition: {
    term: 'Opposition',
    definition: 'When a planet is opposite the Sun in our sky, so it rises at sunset and is up all night.',
  },
  parallax: {
    term: 'Parallax',
    definition: 'A nearby object’s apparent shift against a distant background when it is seen from two different places.',
  },
  parsec: {
    term: 'Parsec',
    definition: 'The distance at which 1 AU spans one arcsecond: about 3.26 light-years.',
  },
  penumbra: {
    term: 'Penumbra',
    definition: 'The outer part of a shadow, where the light source is only partly hidden.',
  },
  perihelion: {
    term: 'Perihelion',
    definition: 'The point of an orbit closest to the Sun. Earth passes it in early January.',
  },
  precession: {
    term: 'Precession',
    definition: 'The slow wobble of Earth’s axis, which traces a circle on the sky about every 26,000 years and makes the pole star change.',
  },
  'retrograde-motion': {
    term: 'Retrograde motion',
    definition: 'A planet’s apparent backward loop against the stars, seen when Earth overtakes it, or it overtakes Earth.',
  },
  'right-ascension': {
    term: 'Right ascension',
    definition: 'Longitude on the sky, measured eastward along the celestial equator from the point where the Sun crosses it in March. Usually given in hours: 24 hours make a full circle.',
  },
  saros: {
    term: 'Saros',
    definition: 'The cycle of 18 years and 11⅓ days (223 lunar months) after which a very similar eclipse comes round again.',
  },
  sidereal: {
    term: 'Sidereal',
    definition: 'Measured against the stars. A sidereal day, one turn of the sky, is 23 hours 56 minutes.',
  },
  solstice: {
    term: 'Solstice',
    definition: 'One of the two moments a year, around 21 June and 21 December, when the Sun is farthest north or south of the celestial equator: the longest and shortest days.',
  },
  synodic: {
    term: 'Synodic',
    definition: 'Measured against the Sun, as seen from Earth. A synodic month runs from new Moon to new Moon: 29.5 days.',
  },
  'tidal-locking': {
    term: 'Tidal locking',
    definition: 'Spinning exactly once per orbit, so the same face always points towards the body being orbited, as the Moon does to Earth.',
  },
  umbra: {
    term: 'Umbra',
    definition: 'The dark centre of a shadow, where the light source is completely hidden.',
  },
  zenith: {
    term: 'Zenith',
    definition: 'The point in the sky straight overhead.',
  },
  zodiac: {
    term: 'Zodiac',
    definition: 'The band of constellations along the ecliptic, which the Sun, the Moon and the planets pass through.',
  },
} as const satisfies Record<string, Entry>;

export type GlossaryId = keyof typeof GLOSSARY;
