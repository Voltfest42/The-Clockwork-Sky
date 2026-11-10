/**
 * Plain-language definitions, shown when a reader hovers over or taps a <Term>,
 * and listed on the Glossary page. Part I's terms come from its research brief
 * (docs/part1/research.md §14), Part II’s from its brief (docs/part2/research.md §16), Part III’s from its brief (docs/part3/research.md §18).
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
  'binary-star': {
    term: 'Binary star',
    definition: 'Two stars orbiting their shared balance point. About half of Sun-like stars have a companion; their orbits give the stars’ masses.',
  },
  'spectroscopic-binary': {
    term: 'Spectroscopic binary',
    definition: 'A pair of stars too close to see apart, found by the Doppler shifts of their lines, which move back and forth as the stars orbit.',
  },
  'eclipsing-binary': {
    term: 'Eclipsing binary',
    definition: 'A pair of stars whose orbit we see nearly edge-on, so that each passes in front of the other and the pair’s light dips. The dips give the stars’ sizes.',
  },
  'light-curve': {
    term: 'Light curve',
    definition: 'A record of how an object’s brightness changes with time: the dips of an eclipsing pair or a transiting planet, the pulses of a variable star.',
  },
  'mass-luminosity-relation': {
    term: 'Mass–luminosity relation',
    definition: 'On the main sequence, heavier stars are far more luminous: roughly as mass to the power 3.5, so twice the mass gives more than ten times the light.',
  },
  core: {
    term: 'Core',
    definition: 'A star’s hot, dense centre, where it makes its power by fusion. The Sun’s core, at 15.7 million degrees, lies within about a quarter of its radius.',
  },
  photosphere: {
    term: 'Photosphere',
    definition: 'A star’s visible surface: the layer, a few hundred kilometres thick in the Sun, where its gas turns transparent and its light escapes.',
  },
  granulation: {
    term: 'Granulation',
    definition: 'The pattern of bright cells on the Sun’s surface, each about 1,000 km across and lasting minutes: the tops of rising columns of hot gas.',
  },
  chromosphere: {
    term: 'Chromosphere',
    definition: 'A thin layer of the Sun’s atmosphere just above its surface, glowing red with hydrogen’s light and hotter than the surface beneath it.',
  },
  corona: {
    term: 'Corona',
    definition: 'The Sun’s outer atmosphere, at 1 to 3 million degrees, seen as a pearly halo during total eclipses and streaming away as the solar wind.',
  },
  sunspot: {
    term: 'Sunspot',
    definition: 'A dark patch on the Sun’s surface, cooler than its surroundings because a strong magnetic field holds back the heat rising from below.',
  },
  'solar-cycle': {
    term: 'Solar cycle',
    definition: 'The Sun’s rise and fall in sunspots and activity over about 11 years; its magnetic field flips each cycle, so the full magnetic cycle is 22 years.',
  },
  'solar-wind': {
    term: 'Solar wind',
    definition: 'The stream of charged gas flowing out from the Sun’s corona in every direction, at 400 to 750 km/s, a million or two tonnes a second.',
  },
  'coronal-mass-ejection': {
    term: 'Coronal mass ejection',
    definition: 'A huge cloud of magnetised gas thrown out from the Sun. When one hits Earth it can light aurorae and disrupt satellites and power grids.',
  },
  fusion: {
    term: 'Fusion',
    definition: 'Joining light atomic nuclei into heavier ones, which releases energy. Stars shine by fusing hydrogen into helium.',
  },
  neutrino: {
    term: 'Neutrino',
    definition: 'A tiny, nearly massless particle made in fusion that passes through almost anything. The Sun’s neutrinos reach us straight from its core.',
  },
  'interstellar-medium': {
    term: 'Interstellar medium',
    definition: 'The gas and dust between the stars: on average about one atom per cubic centimetre, with about 1% of its mass in dust that dims and reddens starlight.',
  },
  'molecular-cloud': {
    term: 'Molecular cloud',
    definition: 'A cold, dense cloud of gas between the stars, 10 to 20 degrees above absolute zero, where hydrogen pairs into molecules. Stars are born in them.',
  },
  'jeans-mass': {
    term: 'Jeans mass',
    definition: 'The mass above which a cloud’s gravity beats its heat and it collapses. It is smaller in colder, denser gas.',
  },
  protostar: {
    term: 'Protostar',
    definition: 'A star still forming: a hot, shrinking ball of gas inside its birth cloud, still gathering mass from a disc around it, and seen only in infrared.',
  },
  't-tauri-star': {
    term: 'T Tauri star',
    definition: 'A young star of about the Sun’s mass or less, a few million years old, out of its cloud but still shrinking towards the main sequence.',
  },
  'initial-mass-function': {
    term: 'Initial mass function',
    definition: 'How many stars are born at each mass. Small stars far outnumber big ones: only about one star in 160 is born heavier than 8 Suns.',
  },
  helioseismology: {
    term: 'Helioseismology',
    definition: 'Mapping the Sun’s inside from its vibrations: sound waves ringing through it, seen as the surface rising and falling every few minutes.',
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
  'red-giant': {
    term: 'Red giant',
    definition: 'A star that has used up the hydrogen in its core and swollen to tens or hundreds of times its old width, its surface cool and red. The Sun will become one in about 5 billion years.',
  },
  'helium-flash': {
    term: 'Helium flash',
    definition: 'The runaway lighting of helium in the tightly packed core of a red giant of less than about 2 solar masses. For a few seconds the core makes as much power as a galaxy, but none of it escapes: it goes into loosening the packed core, which then expands and cools until the runaway stops.',
  },
  'star-cluster': {
    term: 'Star cluster',
    definition: 'A group of stars born together from one cloud, with the same age and make-up, at nearly the same distance: from a few dozen stars in an open cluster to hundreds of thousands in a globular cluster.',
  },
  'turn-off': {
    term: 'Turn-off',
    definition: 'The point on a cluster’s HR diagram where its stars leave the main sequence. The stars there have just run out of hydrogen in their cores, so their lifetime is the cluster’s age.',
  },
  cepheid: {
    term: 'Cepheid',
    definition: 'A yellow giant or supergiant that brightens and fades regularly, every few days to months. The slower it pulses, the more luminous it is, so Cepheids measure distances.',
  },
  'planetary-nebula': {
    term: 'Planetary nebula',
    definition: 'The glowing shell of gas shed by a dying Sun-like star, lit by its hot core, the future white dwarf. Named for its planet-like look in old telescopes; nothing to do with planets.',
  },
  'chandrasekhar-limit': {
    term: 'Chandrasekhar limit',
    definition: 'The heaviest a white dwarf can be, about 1.4 solar masses. Above it the packed electrons can no longer hold the weight, and the star collapses or explodes.',
  },
  supernova: {
    term: 'Supernova',
    definition: 'A star’s explosion, for weeks as bright as a galaxy: the collapse of a heavy star’s core, or a white dwarf blown apart in a pair.',
  },
  'neutron-star': {
    term: 'Neutron star',
    definition: 'The collapsed core of a heavy star: about 1.4 solar masses of neutrons in a ball about 24 km across, as dense as an atomic nucleus.',
  },
  pulsar: {
    term: 'Pulsar',
    definition: 'A spinning neutron star whose beams of radio waves (or light, or X-rays) sweep past Earth like a lighthouse’s, as regular pulses.',
  },
  'black-hole': {
    term: 'Black hole',
    definition: 'An object so compact that nothing, not even light, can escape from inside its horizon, 2GM/c² in radius: about 3 km for each solar mass.',
  },
  isochrone: {
    term: 'Isochrone',
    definition: 'A line on the HR diagram through stars of every mass at one age and make-up: where a cluster’s stars would sit if they were born together that long ago.',
  },
  'stellar-wind': {
    term: 'Stellar wind',
    definition: 'Gas flowing off a star’s surface into space. The Sun’s is gentle; red giants and the most luminous stars can lose most of their mass this way.',
  },
  'wolf-rayet-star': {
    term: 'Wolf–Rayet star',
    definition: 'A very hot, luminous star whose hydrogen envelope has been blown or pulled away, leaving its helium (and heavier) insides bare, with a fierce wind.',
  },
  'pair-instability': {
    term: 'Pair instability',
    definition: 'In the hottest, heaviest stellar cores, light turns into pairs of electrons and positrons, the core loses pressure and shrinks, and its oxygen can burn all at once: enough to make the star pulse, or blow it apart entirely.',
  },
  'hydrostatic-equilibrium': {
    term: 'Hydrostatic equilibrium',
    definition: 'The balance in every layer of a star between the weight of the gas above it and the pressure of the gas below. It holds a star at one size for billions of years.',
  },
  'virial-theorem': {
    term: 'Virial theorem',
    definition: 'In a star or cluster held together by gravity, the heat or motion energy is half the size of the (negative) gravitational energy. So a star that loses energy shrinks and heats up.',
  },
  'kelvin-helmholtz-time': {
    term: 'Kelvin–Helmholtz time',
    definition: 'How long a star could shine by shrinking alone: about GM²/RL, some 30 million years for the Sun, far too short to explain Earth’s age.',
  },
  polytrope: {
    term: 'Polytrope',
    definition: 'A model star in which pressure follows a power of density, P = Kρ^(1+1/n). Its structure comes from a single equation, the Lane–Emden equation.',
  },
  'degeneracy-pressure': {
    term: 'Degeneracy pressure',
    definition: 'The pressure of particles packed as tightly as quantum physics allows: no two electrons can share a state, so squeezed ones must move fast. It doesn’t depend on temperature.',
  },
  opacity: {
    term: 'Opacity',
    definition: 'How strongly matter blocks light passing through it, as a blocking area per kilogram. Light goes about 1/(opacity × density) between absorptions: a fraction of a millimetre inside the Sun.',
  },
  'mean-free-path': {
    term: 'Mean free path',
    definition: 'How far something travels, on average, before it hits or is absorbed by something else. For light at the Sun’s centre, about a twentieth of a millimetre.',
  },
  adiabatic: {
    term: 'Adiabatic',
    definition: 'Without heat flowing in or out, as when a rising parcel of gas expands and cools. If a star’s temperature falls faster with height than that, the gas convects.',
  },
  'coulomb-barrier': {
    term: 'Coulomb barrier',
    definition: 'The electric repulsion two nuclei must get through to fuse: nearly a million electronvolts for two protons, hundreds of times what a proton at the Sun’s centre has. They tunnel through it.',
  },
  tunnelling: {
    term: 'Tunnelling',
    definition: 'A quantum particle passing through a barrier it hasn’t the energy to climb, because it is partly a wave and part of the wave leaks through. It is how protons fuse in stars.',
  },
  'gamow-peak': {
    term: 'Gamow peak',
    definition: 'The narrow window of energies at which fusion actually happens in a star: high enough to tunnel, not so high that almost no nuclei have it. About 6 keV for protons at the Sun’s centre.',
  },
  'pp-chain': {
    term: 'Proton–proton chain',
    definition: 'The way the Sun turns four protons into a helium nucleus, starting with two protons fusing into deuterium, a step so slow that a proton waits billions of years for it.',
  },
  'cno-cycle': {
    term: 'CNO cycle',
    definition: 'The way stars heavier than about 1.3 Suns turn hydrogen into helium, with carbon, nitrogen and oxygen nuclei as catalysts. Its slowest step piles the catalysts up as nitrogen.',
  },
  'binding-energy': {
    term: 'Binding energy',
    definition: 'The energy that holds a nucleus together, and that came out when it formed: the nucleus weighs that much less, by E = mc², than its protons and neutrons apart. Per nucleon it peaks at iron and nickel.',
  },
  'magic-number': {
    term: 'Magic number',
    definition: 'A number of protons or neutrons (2, 8, 20, 28, 50, 82 or 126) that fills a shell of energy levels, making a nucleus extra stable and slow to catch another neutron.',
  },
  's-process': {
    term: 's-process',
    definition: 'The slow neutron-capture process: in red giants, nuclei catch a neutron every few years to centuries, slower than most unstable ones decay, so the path climbs the valley of stability from iron to lead and bismuth.',
  },
  'r-process': {
    term: 'r-process',
    definition: 'The rapid neutron-capture process: in a flood of neutrons, as when neutron stars merge, nuclei catch them in milliseconds, far faster than they decay, then decay back to make about half the elements heavier than iron, and nearly all the gold and uranium.',
  },
  kilonova: {
    term: 'Kilonova',
    definition: 'The glow of the debris thrown out when two neutron stars merge, heated by the decay of the heavy elements the rapid process made in it. It fades from blue to red within days.',
  },
  'fermi-energy': {
    term: 'Fermi energy',
    definition: 'The energy of the fastest electrons in a packed gas, at the top of the “Fermi sea” of filled states. Where it is well above kT, the electrons are packed and push however cold they are.',
  },
  crystallisation: {
    term: 'Crystallisation',
    definition: 'A cooling white dwarf’s carbon and oxygen freezing into a crystal, from the centre outwards, once their electric pull on each other outweighs their heat. The heat it gives out slows the white dwarf’s fading.',
  },
  'core-collapse-supernova': {
    term: 'Core-collapse supernova',
    definition: 'The explosion of a massive star whose iron core has collapsed into a neutron star or a black hole: Types II, Ib and Ic. Nearly all its energy leaves as neutrinos.',
  },
  'type-ia-supernova': {
    term: 'Type Ia supernova',
    definition: 'A carbon–oxygen white dwarf blown apart when its carbon catches fire: no hydrogen in its spectrum, silicon instead, about 0.6 solar masses of radioactive nickel made, and nothing left.',
  },
  'arnetts-rule': {
    term: 'Arnett’s rule',
    definition: 'At its peak, a supernova shines as brightly as its radioactive nickel and cobalt are heating it then, so the peak weighs the nickel the explosion made.',
  },
  'equation-of-state': {
    term: 'Equation of state',
    definition: 'How a material’s pressure depends on its density (and temperature). For the matter inside neutron stars it isn’t known; dozens of models are tested against the stars’ measured masses and radii.',
  },
  'millisecond-pulsar': {
    term: 'Millisecond pulsar',
    definition: 'An old neutron star spun up to hundreds of turns a second by gas from a companion, which also buried its magnetic field: it slows so little that it is among the steadiest clocks known.',
  },
  magnetar: {
    term: 'Magnetar',
    definition: 'A neutron star with a magnetic field of 10¹⁴ to 10¹⁵ gauss, a thousand times an ordinary pulsar’s. It shines on its field’s energy, not its spin, and its crust cracks in bursts and giant flares.',
  },
  'innermost-stable-orbit': {
    term: 'Innermost stable circular orbit',
    definition: 'The closest a body can circle a black hole without plunging in: 6GM/c², three times the horizon’s radius, for one that doesn’t spin. Accretion discs end there.',
  },
  'photon-sphere': {
    term: 'Photon sphere',
    definition: 'Where light can circle a black hole, at 1.5 times its horizon’s radius. Light aimed within 2.6 horizon radii of the centre is captured, which gives the hole its shadow.',
  },
  'accretion-disc': {
    term: 'Accretion disc',
    definition: 'Gas orbiting a star or black hole in a flat disc, spiralling slowly inward as friction carries its angular momentum out, and glowing with the energy it gives up as it falls.',
  },
  convection: {
    term: 'Convection',
    definition: 'Heat carried by moving gas: hot gas rises, cools and sinks again, as warm air rises above a radiator. It carries the energy through the outer third of the Sun and through the whole of a red dwarf.',
  },
  exoplanet: {
    term: 'Exoplanet',
    definition: 'A planet orbiting a star other than the Sun. The first round a Sun-like star, 51 Pegasi b, was found in 1995; thousands are known now.',
  },
  transit: {
    term: 'Transit',
    definition: 'A planet passing in front of its star, as seen from Earth, and blocking a little of its light: Jupiter would dim the Sun by 1%, Earth by 84 parts in a million.',
  },
  'habitable-zone': {
    term: 'Habitable zone',
    definition: 'The range of distances from a star where a planet like Earth could keep liquid water on its surface. Being in it says nothing about whether a planet has life.',
  },
  'transmission-spectrum': {
    term: 'Transmission spectrum',
    definition: 'How deep a planet’s transit is at each wavelength. Where the planet’s air absorbs, the planet looks slightly bigger, so its gases show up as bands.',
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
