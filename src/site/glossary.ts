/**
 * Plain-language definitions, shown when a reader hovers over or taps a <Term>,
 * and listed on the Glossary page. Part I's terms come from its research brief
 * (docs/part1/research.md §14), Part II’s from its brief (docs/part2/research.md §16).
 */
interface Entry {
  term: string;
  definition: string;
}

export const GLOSSARY = {
  aperture: {
    term: 'Aperture',
    definition: 'The width of a telescope’s main mirror or lens. It sets how much light the telescope collects (with its area) and how fine a detail it can see.',
  },
  blackbody: {
    term: 'Black body',
    definition: 'A perfect glower: an object whose glow depends on its temperature alone. Stars are close to black bodies; hotter ones are bluer and far brighter.',
  },
  'colour-index': {
    term: 'Colour index',
    definition: 'The difference between a star’s magnitudes through two filters, such as B − V (blue minus yellow-green): a measure of its colour, and so of its surface temperature.',
  },
  'diffraction-limit': {
    term: 'Diffraction limit',
    definition: 'The finest detail a telescope can see, set by the spreading of light waves through its opening: about 1.22 times the wavelength divided by its width, in radians.',
  },
  'electromagnetic-spectrum': {
    term: 'Electromagnetic spectrum',
    definition: 'Light of every wavelength: gamma rays, X-rays, ultraviolet, visible light, infrared, microwaves and radio waves. All travel at the speed of light.',
  },
  flux: {
    term: 'Flux',
    definition: 'The power arriving on each square metre, in watts per square metre: how bright a star looks from here, as opposed to how much light it gives out.',
  },
  luminosity: {
    term: 'Luminosity',
    definition: 'The total power a star gives out, in watts or in units of the Sun’s (3.8 × 10²⁶ W). It doesn’t depend on how far away we are.',
  },
  photon: {
    term: 'Photon',
    definition: 'A particle of light. Each carries an energy set by its frequency: blue photons more than red, X-ray photons far more.',
  },
  seeing: {
    term: 'Seeing',
    definition: 'The blurring of starlight by moving pockets of warm and cool air, which smears stars into discs about an arcsecond across, and makes them twinkle.',
  },
  spectrum: {
    term: 'Spectrum',
    definition: 'Light spread out by wavelength, as a prism spreads sunlight into a rainbow; or how much light something gives out at each wavelength.',
  },
  'stefan-boltzmann-law': {
    term: 'Stefan–Boltzmann law',
    definition: 'Each square metre of a hot body gives out σT⁴ watts: double the temperature, sixteen times the power. So a star’s luminosity is 4πR²σT⁴.',
  },
  wavelength: {
    term: 'Wavelength',
    definition: 'The distance from one crest of a wave to the next. For light it sets the colour: about 400 nanometres for violet, 700 for red. Its frequency is how many waves pass each second.',
  },
  'wiens-law': {
    term: 'Wien’s law',
    definition: 'A glowing body’s light peaks at a wavelength of 2.9 millimetres divided by its temperature in kelvin: the hotter it is, the bluer.',
  },
  'absorption-line': {
    term: 'Absorption line',
    definition: 'A dark line in a spectrum, where atoms or molecules in a cooler gas have taken out light of one particular wavelength.',
  },
  'emission-line': {
    term: 'Emission line',
    definition: 'A bright line in a spectrum: light of one particular wavelength given out by atoms in a thin, hot gas.',
  },
  'energy-level': {
    term: 'Energy level',
    definition: 'One of the set energies an electron in an atom can have, like the rungs of a ladder. Jumping between two gives out or takes in a photon of exactly the energy between them.',
  },
  ionisation: {
    term: 'Ionisation',
    definition: 'An atom losing one or more of its electrons, by heat, a collision or a photon. What is left is an ion, with lines of its own.',
  },
  'spectral-class': {
    term: 'Spectral class',
    definition: 'A star’s type by the lines in its spectrum: O, B, A, F, G, K or M, from hottest to coolest, each split from 0 to 9 (the Sun is a G2).',
  },
  'luminosity-class': {
    term: 'Luminosity class',
    definition: 'A second label read from a star’s spectrum, from I (supergiants) through III (giants) to V (main-sequence stars, like the Sun).',
  },
  metallicity: {
    term: 'Metallicity',
    definition: 'The share of a star made of elements heavier than helium, all of which astronomers call metals. The Sun’s is about 1.4% by mass.',
  },
  'doppler-shift': {
    term: 'Doppler shift',
    definition: 'The change in wavelength of light from something moving towards us (shorter, bluer) or away (longer, redder). It gives the speed along the line of sight, the radial velocity.',
  },
  'hr-diagram': {
    term: 'Hertzsprung–Russell diagram',
    definition: 'A plot of stars’ luminosity (or absolute magnitude) against their surface temperature (or colour), hot stars on the left. Most stars fall on the main sequence.',
  },
  'main-sequence': {
    term: 'Main sequence',
    definition: 'The band on the HR diagram where stars spend most of their lives, turning hydrogen into helium in their cores. A star’s place on it is set by its mass.',
  },
  giant: {
    term: 'Giant',
    definition: 'A star near the end of its life, swollen to tens of times the Sun’s width with a cool surface; supergiants, from heavier stars, reach hundreds of times.',
  },
  'lagrange-point': {
    term: 'Lagrange point',
    definition:
      'One of five places where a small body can ride along with two larger ones going round each other, held by their pulls. L4 and L5, 60° ahead of and behind the smaller body, collect Trojan asteroids.',
  },
  'hill-sphere': {
    term: 'Hill sphere',
    definition: 'The region round a planet where its own pull wins over its star’s tide, so moons can stay. Earth’s reaches about 1.5 million km.',
  },
  'three-body-problem': {
    term: 'Three-body problem',
    definition: 'Working out how three bodies move under each other’s gravity. Unlike two bodies, it has no general formula, and most of its motions are chaotic.',
  },
  'absolute-magnitude': {
    term: 'Absolute magnitude',
    definition: 'How bright a star would look from a standard distance of 10 parsecs: a measure of how much light it really gives out. The Sun’s is +4.8.',
  },
  'brown-dwarf': {
    term: 'Brown dwarf',
    definition: 'A ball of gas too small to keep hydrogen fusing in its core, between the heaviest planets and the lightest stars: it glows dimly and cools for ever.',
  },
  'dwarf-planet': {
    term: 'Dwarf planet',
    definition: 'A body that goes round the Sun and is massive enough to be round, but hasn’t cleared its orbit of other bodies: Pluto, Ceres, Eris, Haumea and Makemake.',
  },
  'globular-cluster': {
    term: 'Globular cluster',
    definition: 'A ball of hundreds of thousands of old stars, held together by their own gravity. About 150 orbit the Milky Way.',
  },
  'kirkwood-gap': {
    term: 'Kirkwood gap',
    definition: 'A gap in the asteroid belt where an asteroid would go round the Sun a simple number of times for each of Jupiter’s orbits, so Jupiter’s tugs add up and clear it out.',
  },
  'red-dwarf': {
    term: 'Red dwarf',
    definition: 'A small, cool, faint star, from about a tenth to half the Sun’s mass. Most stars, including most of our neighbours, are red dwarfs.',
  },
  'resonance': {
    term: 'Resonance',
    definition: 'A simple ratio between two orbital periods, such as 2 : 1, so the bodies meet at the same places over and over and their small tugs add up.',
  },
  'snow-line': {
    term: 'Snow line',
    definition: 'The distance from a young star beyond which water freezes into ice. In the young Solar System it lay at about 2.7 AU, in the asteroid belt.',
  },
  'white-dwarf': {
    term: 'White dwarf',
    definition: 'The hot, Earth-sized core left when a star like the Sun has used up its fuel. It no longer makes energy, and slowly cools.',
  },
  'galaxy': {
    term: 'Galaxy',
    definition: 'A vast system of stars, gas and dust held together by gravity. Ours, the Milky Way, has a few hundred billion stars, and the Sun is one of them.',
  },
  altitude: {
    term: 'Altitude',
    definition: 'How high something appears above the horizon, as an angle: 0° on the horizon, 90° straight overhead.',
  },
  analemma: {
    term: 'Analemma',
    definition: 'The figure eight the Sun traces in the sky if you mark where it is at the same clock time every day for a year.',
  },
  aphelion: {
    term: 'Aphelion',
    definition: 'The point of an orbit farthest from the Sun. Earth passes it in early July.',
  },
  arcsecond: {
    term: 'Arcminute, arcsecond',
    definition: 'Small angles: a degree splits into 60 arcminutes (′), and an arcminute into 60 arcseconds (″). The full Moon is about 31′ across.',
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
  constellation: {
    term: 'Constellation',
    definition: 'One of the 88 areas into which astronomers divide the sky, each named after the star pattern in it. Every star belongs to exactly one.',
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
  ellipse: {
    term: 'Ellipse',
    definition: 'An oval curve: the set of points whose distances to two fixed points, the foci, add up to the same total. Every planet’s orbit is one, with the Sun at a focus.',
  },
  equinox: {
    term: 'Equinox',
    definition: 'One of the two moments a year, around 20 March and 22 September, when the Sun crosses the celestial equator, and day and night are nearly equal everywhere.',
  },
  'equation-of-time': {
    term: 'Equation of time',
    definition: 'How far sundial time runs ahead of or behind clock time, from about 14 minutes behind in February to 16 minutes ahead in November.',
  },
  'escape-speed': {
    term: 'Escape speed',
    definition: 'The speed something needs never to fall back: 11.2 km/s from Earth’s surface, if there were no air.',
  },
  'hohmann-transfer': {
    term: 'Hohmann transfer',
    definition: 'The cheapest path between two orbits: half an ellipse that touches the inner orbit at one end and the outer at the other. To Mars it takes about 259 days.',
  },
  focus: {
    term: 'Focus',
    definition: 'One of the two points that define an ellipse. A planet’s orbit has the Sun at one focus.',
  },
  'greatest-elongation': {
    term: 'Greatest elongation',
    definition: 'The moment Mercury or Venus is farthest from the Sun in the sky, east (in the evening) or west (in the morning): up to about 28° for Mercury and 47° for Venus.',
  },
  heliopause: {
    term: 'Heliopause',
    definition: 'The boundary where the wind of particles from the Sun meets the gas between the stars, about 120 AU out. Voyager 1 crossed it in 2012.',
  },
  'inverse-square-law': {
    term: 'Inverse-square law',
    definition: 'A rule in which something weakens with the square of the distance: twice as far, a quarter as strong. Gravity and the brightness of a lamp both follow one.',
  },
  'light-year': {
    term: 'Light-year',
    definition: 'The distance light travels in a year: about 9.46 trillion km.',
  },
  horizon: {
    term: 'Horizon',
    definition: 'The line where the sky meets the ground, all the way round you. Half the celestial sphere is above it at any moment, and half below.',
  },
  magnitude: {
    term: 'Magnitude',
    definition: 'How bright a star looks, on a scale that runs backwards: the brightest stars are magnitude 0 or less, and the faintest the eye can see about 6. Five magnitudes are a factor of 100 in brightness.',
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
  'oort-cloud': {
    term: 'Oort cloud',
    definition: 'A vast, sparse shell of icy bodies thought to surround the Solar System out to about 100,000 AU, the source of long-period comets. It has never been seen directly.',
  },
  opposition: {
    term: 'Opposition',
    definition: 'When a planet is opposite the Sun in our sky, so it rises at sunset and is up all night.',
  },
  'order-of-magnitude': {
    term: 'Order of magnitude',
    definition: 'The nearest power of ten to a number. Two things of the same order of magnitude are within about a factor of ten of each other.',
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
  radian: {
    term: 'Radian',
    definition: 'A unit of angle, about 57.3°. An object spans an angle in radians of its size divided by its distance, when the angle is small.',
  },
  'retrograde-motion': {
    term: 'Retrograde motion',
    definition: 'A planet’s apparent backward loop against the stars, seen when Earth overtakes it, or it overtakes Earth.',
  },
  'proper-motion': {
    term: 'Proper motion',
    definition: 'A star’s slow drift across the sky as it moves through space: for most stars, far too slow to notice in a lifetime.',
  },
  'right-ascension': {
    term: 'Right ascension',
    definition: 'Longitude on the sky, measured eastward along the celestial equator from the point where the Sun crosses it in March. Usually given in hours: 24 hours make a full circle.',
  },
  'semi-major-axis': {
    term: 'Semi-major axis',
    definition: 'Half the longest diameter of an ellipse; for an orbit, the average of the nearest and farthest distances from the Sun. It sets the orbit’s size and, by Kepler’s third law, its period.',
  },
  saros: {
    term: 'Saros',
    definition: 'The cycle of 18 years and 11⅓ days (223 lunar months) after which a very similar eclipse comes round again.',
  },
  'scientific-notation': {
    term: 'Scientific notation',
    definition: 'Writing a number as a number between 1 and 10 times a power of ten: Earth’s width, 12,742 km, is 1.27 × 10⁷ m.',
  },
  'spring-tide': {
    term: 'Spring and neap tides',
    definition: 'The biggest tides of the month, at new and full Moon when the Sun’s and Moon’s pulls line up, and the smallest, at the quarter Moons when they pull at right angles.',
  },
  station: {
    term: 'Station, stationary point',
    definition: 'The moment a planet stops moving against the stars, before starting or ending a stretch of backward (retrograde) motion.',
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
