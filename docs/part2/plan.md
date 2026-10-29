# Part II plan: The Stars

*Drafted 28 Oct 2026 (Stage 9). Part of the [master plan](../plan.md). The facts, data, licences and sources are in [research.md](research.md). It follows Part I's plan ([part1/plan.md](../part1/plan.md)) in shape and conventions, and builds on what Part I built.*

## Status

**Planned** (28 Oct 2026, Stage 9). The chapters' sections, "Builds on" lines and Toolkit links are in the course registry, so the "coming soon" pages show them. **Agreed** (29 Oct 2026): the defaults for all eight open questions in §12 stand.

**Stage 10 done** (29 Oct 2026): Chapters 10 and 11, Toolkit T5, the light core, the spectrum view, a star drawn true, the famous stars file and the first visual-binary code (see the master plan's Status for details and deviations).

**Stage 11 done** (29 Oct 2026): Chapters 12 and 13, the spectra core, the HR diagram component and its core, Gaia's 100-pc stars, ten X-shooter spectra, NIST's lines and Mamajek's table (see the master plan's Status).

**Stage 12 done** (29 Oct 2026): Chapters 14 and 15 and Toolkit T6, the binaries core, the light-curve view, the binary workbench, the star cutaway with Model S, DEBCat and the sunspot record (see the master plan's Status). Figure 15.3 (the race from the Sun, a stretch) wasn't built, so the fuel gauge is Figure 15.3. Next: Stage 13, the stellar-evolution engine and Chapter 16, which first needs gfortran and make in WSL (§12, question 3).

---

## 1. What Part II does

**Level:** moderate; Part I, or a feel for the Solar System and the sky, is enough. **Maths:** algebra and a handful of named laws, each in a short box (§3). Figures carry the ideas for readers who skip the boxes.

**The thread: heat.** A star is a ball of gas whose pressure holds gravity off, but only for as long as its fuel lasts. Part I ended with the stars as suns, points of light at known distances. Part II finds out what they are.

**How do we know? From starlight, and from companions.** Everything in Part II is read from light: its colour gives a star's temperature, its lines its make-up and motion, its brightness and distance its power. Masses come from orbits, the way Part I weighed the Sun. Each figure shows which measurement a number comes from.

**The arc:**
1. The messenger: what light is and how we catch it (Chapter 10).
2. What starlight says: temperature, make-up and motion (11–12).
3. Putting stars in order: the HR diagram, masses and sizes (13–14).
4. One star up close: the Sun (15).
5. Lives of the stars: birth, life and death (16–18).
6. Other worlds, found with the same tools (19).

Then the Star Forge, where the reader makes stars.

**By the end of Part II, a reader can explain:**
- what light is, why telescopes are big, and why some have to go to space;
- how a star's colour tells its temperature, and how its temperature and size set its power;
- how the lines in a spectrum show what a star is made of and how it moves, and why stars are mostly hydrogen;
- what the Hertzsprung–Russell diagram shows, and why most stars lie on the main sequence;
- how pairs of stars give us stars' masses, and why heavier stars shine far brighter;
- what powers the Sun, and how we know what is inside it;
- how stars are born in cold clouds, and why small stars far outnumber big ones;
- why heavy stars live fast and die young, and how clusters give stars' ages;
- how stars die, and what they leave behind: white dwarfs, neutron stars and black holes;
- how we find planets round other stars, and what we have found.

---

## 2. The Part II page and the start page

**Part II page:** the level and the maths, the outcomes above, the chapter list with reading progress, about 25–35 minutes per chapter, and the Star Forge at the end. Its "Coming soon" card becomes a link when every chapter is written (`partReady`), and the Star Forge's when the lab is built, as Stage 8c set up.

**Start page:** nothing changes until Part II is out. Then its card on the start page and "Where to start" become links by themselves; the hook stays Part I's.

---

## 3. Recurring elements

- **The HR diagram.** One component, used from Chapter 13 to the Star Forge: Gaia's stars within 100 pc as a background, with the observers' axes (colour and absolute magnitude) or the physicists' (temperature and luminosity, hot on the left, with lines of equal radius). Tracks, isochrones, clusters and famous stars are layers on it. Its axes are labelled with arrows ("hotter ←"), because the reversed axis is what trips readers up (research §1).
- **The spectrum view.** One component for every spectrum: the ruler of Chapter 10, Planck curves, filters, lines, real spectra and Doppler shifts.
- **A star drawn true.** A star as a disc in its real colour (from its temperature, by the sky view's colour code), limb-darkened, at its true size against the Sun and the planets' orbits. Used in Chapters 11, 13, 17 and 18 and in the Star Forge.
- **Famous stars.** One data file with each value's source (research §3): the Sun, Proxima, α Centauri, Sirius A and B, Procyon, Vega, Arcturus, Aldebaran, Polaris, Betelgeuse, Antares, Rigel, Deneb, Spica. The same stars come back in every chapter, so readers get to know them. Each links to the sky view to find it tonight.
- **Both hemispheres.** Orion (Betelgeuse and Rigel) is seen from both; the southern examples are α Centauri, the Southern Cross, the Coalsack, the Magellanic Clouds (Leavitt's Cepheids, SN 1987A) and η Carinae.
- **Algebra boxes.** E = hf and c = fλ; θ = 1.22 λ/D; Wien; Stefan–Boltzmann (L = 4πR²σT⁴); the inverse-square law; magnitudes; Doppler; the Rydberg formula; M₁ + M₂ = a³/P²; L ∝ M^3.5; E = mc²; t ∝ M^−2.5; the Jeans mass as a proportion; the transit depth; the wobble's size; the habitable zone's distance. Each is short and optional.
- **Game-dev analogies** where they fit: a light's colour set in kelvin, as game engines do (11.1); photon noise that falls as 1/√N, like a path tracer's noise with more samples (10.2, T6); decibels for magnitudes (T5); SSE as baked lighting, precomputed curves in place of a full simulation (the Star Forge); the Star Forge as a character creator for stars.
- **"Open this in the Star Forge"** on the figures that are small versions of it (17.1, 17.2, 17.3, 18.5), as Part I's figures open the Orrery.
- **Dated facts.** Exoplanet counts, mission dates, record holders (the heaviest neutron star, the coldest brown dwarf), Betelgeuse's companion and the solar cycle live in `src/data/`, registered in `asOf.ts` (§8).

---

## 4. Chapters, sections and figures

Each section is a few short paragraphs, usually with one figure. ★ marks the key figures; *(stretch)* marks figures built only if time allows. Every chapter ends with **Check yourself**; examples are given for each. Every figure has its caption, legend, "Try this", reset and description, and a "What's simplified here?" note when it simplifies (§9).

### Chapter 10 · Light, the messenger
*Builds on: Chapters 1 and 9.*

| § | Content | Figure |
|---|---|---|
| 10.1 | **Waves of light.** Light is a wave of electric and magnetic fields; its wavelength is its colour. Newton split sunlight with a prism (1666); Herschel found infrared beyond the red with a thermometer (1800); the rainbow is a sliver of a spectrum twenty powers of ten wide, from gamma rays to radio, all travelling at the same speed. c = fλ. | ★ **10.1 The spectrum ruler.** A log ruler from 1 pm to 10 km with the bands and objects of the same size (an atom, a virus, a hair, a football pitch). Drag a marker: wavelength, frequency, photon energy and the temperature that glows brightest there (a hook for Chapter 11). A layer for what each band shows in the sky (cold hydrogen at 21 cm, dust in infrared, hot stars in ultraviolet, million-degree gas in X-rays) and what makes it (from nuclei to radio antennas). |
| 10.2 | **Light comes in packets.** Photons: E = hf, so blue photons carry more energy than red, which is why ultraviolet burns and radio doesn't. A camera counts photons. A telescope is a bucket for them: its area grows with the square of its width, and JWST's mirror catches as much as 660,000 eyes. | **10.2 Counting photons.** A star's photons landing one by one on a grid of pixels, at real rates (Vega sends about 300,000 a second into your eye). Choose the bucket (your eye, binoculars, a backyard telescope, Hubble, JWST, the ELT), the star and the exposure; watch the image build up and its noise fall as 1/√N, like a path tracer's. |
| 10.3 | **Why some light never reaches the ground.** The air lets through visible light and radio, and little else: ozone stops ultraviolet, water vapour most infrared, and X-rays and gamma rays never get below a few tens of kilometres. Telescopes go to space to get above the air, not closer to the stars. The air also blurs (seeing) and makes stars twinkle. | **10.3 How far down does light get?** The height each wavelength reaches before the air absorbs it, with mountain tops, aircraft, balloons and satellites marked. Pick a wavelength: where would your telescope have to be? A sketch from band values, labelled. |
| 10.4 | **Sharper eyes.** A wave spreads as it passes through an opening, so every telescope blurs a point into a small disc: the bigger the mirror, the smaller the disc (θ = 1.22 λ/D). Two stars closer than that merge. The air blurs everything to about 1″, so telescopes go to space, correct the blur with adaptive optics, or link dishes across a planet, as the Event Horizon Telescope did. | ★ **10.4 Split the stars.** Two stars through a telescope, drawn from the true diffraction pattern. Change the aperture, the wavelength and the air (none, a good night, a poor one, adaptive optics). Real doubles (ε Lyrae, Castor, α Centauri, Sirius and its white dwarf), with today's separations from their orbits. |
| Deep dive | Why the sky is blue and sunsets are red; why stars twinkle and planets mostly don't | — |

*Check yourself:* Why do we put telescopes in space? (To get above the air, which blocks most kinds of light and blurs the rest; not to get closer.) Which photon carries more energy, red or blue? (Blue.) A telescope twice as wide collects how much more light? (Four times.) Are radio waves a kind of sound? (No: they are light, with long wavelengths.) *Interactive:* in Figure 10.4, find the smallest telescope that splits ε Lyrae's pair, with no air.

### Chapter 11 · Colour is temperature
*Builds on: Chapters 9 and 10. Toolkit: Logarithms and magnitudes.*

| § | Content | Figure |
|---|---|---|
| 11.1 | **Everything glows.** A stove ring glows red, a lamp filament yellow-white; you glow too, in infrared. The shape of the glow depends only on temperature. Hotter is bluer: blue stars are the hottest, red ones the coolest, the opposite of hot and cold taps. Game engines let you set a light's colour in kelvin for this reason. The Sun is white; the air makes it look yellow. | ★ **11.1 Blackbody explorer.** *Predict first:* "Which is hotter, a red star or a blue one?" A temperature slider from 300 K to 100,000 K (log); the spectrum on linear or log axes with the visible band, its peak marked, its total power as a number and a bar, and the colour the eye would see. Presets from you (310 K) and a stove (900 K) to Betelgeuse, the Sun, Sirius, Rigel and a young white dwarf. |
| 11.2 | **A thermometer made of two filters.** Wien's law: the peak's wavelength is 2.9 mm·K divided by the temperature. A star's colour, measured as the difference between its brightness through a blue and a yellow filter (B − V), gives its surface temperature without going there. Why there are no green stars. | **11.2 Two filters.** The B and V filters over the star's spectrum; drag the temperature and watch B − V change, with real stars on the scale (Rigel, Sirius, the Sun, Arcturus, Betelgeuse). Why no star looks green: a curve peaking in the green covers red and blue too. |
| 11.3 | **Hotter is far brighter.** Each square metre of a star gives out σT⁴: double the temperature, sixteen times the power. A star's luminosity depends on its size too: L = 4πR²σT⁴. Betelgeuse is cooler than the Sun but about 90,000 times as luminous, because it is about 750 times as wide; Sirius B is hotter and dimmer, because it is the size of Earth. | ★ **11.3 Size, temperature, power.** Two stars drawn true, side by side; sliders for radius and temperature; their luminosities. A small map of temperature against luminosity with lines of equal size, a first look at Chapter 13's diagram. |
| 11.4 | **How bright it looks, and how bright it is.** Light spreads over ever bigger spheres, so its brightness falls with the square of the distance (Part I, Chapters 7 and 9). Measure sunlight on Earth (1,361 watts a square metre), multiply by the sphere round the Sun, and you have the Sun's power, 3.8 × 10²⁶ watts, the way Chapter 7 weighed it. | ★ **11.4 The inverse-square law.** Light from a source crossing spheres at 1, 2 and 3 units, a square detector catching 1, ¼ and ⅑. Sunlight at each planet and at Voyager 1, in watts a square metre; then "weigh the Sun's power" from Earth's number. |
| Deep dive | Measuring a star's size directly: Michelson and Pease and Betelgeuse (1920), and interferometry today | — |

*Check yourself:* Which is hotter, a red star or a blue one? (Blue.) Betelgeuse is cooler than the Sun, so why is it so much brighter? (It is enormous.) Twice as far from a lamp, how bright does it look? (A quarter.) Why are there no green stars? (A star that peaks in green gives out red and blue too, and looks white.) *Interactive:* in Figure 11.3, make a star as luminous as the Sun at half its temperature (four times the Sun's radius).

### Chapter 12 · Barcodes in starlight
*Builds on: Chapters 10 and 11.*

| § | Content | Figure |
|---|---|---|
| 12.1 | **Dark lines in sunlight.** Fraunhofer mapped 574 dark lines in sunlight (1814). Kirchhoff and Bunsen found each element's own lines in flames (1859–60): a hot dense body gives a continuous spectrum, a thin hot gas bright lines, and a cool gas in front of a hot source dark lines at the same places. Helium was found in the Sun (1868) before it was found on Earth (1895). | ★ **12.1 Kirchhoff's three spectra.** A hot lamp, a cloud of gas and the view through it: move the eye and see a continuous, a bright-line or a dark-line spectrum. Choose the gas (hydrogen, helium, sodium, neon, mercury: street lights and signs). Real wavelengths. |
| 12.2 | **Atoms as ladders.** Bohr's atom (1913): electrons sit on rungs of energy, and a photon is absorbed or given out only if its energy matches a gap. Hydrogen's visible lines, the Balmer series, all start or end on the second rung. Every element has its own ladder, so its own barcode. | **12.2 Hydrogen's ladder.** Hydrogen's levels; click a jump up or down to see the photon's colour and wavelength. The ultraviolet Lyman, visible Balmer and infrared Paschen series; absorption and emission. Exact for hydrogen. |
| 12.3 | **The alphabet of the stars.** Annie Jump Cannon and the Harvard computers sorted a quarter of a million spectra into O, B, A, F, G, K and M (1901–24). Saha (1920) showed the order is temperature: hydrogen's lines are strongest near 10,000 K, because in cooler stars few atoms sit on the second rung and in hotter ones most are ionised. | ★ **12.3 Make a spectrum.** Temperature and make-up in, spectrum out: a Planck continuum with the lines of hydrogen, helium, calcium, sodium, magnesium, iron and titanium oxide from a simple model atmosphere. Drag the temperature through the classes; change an element's abundance ("make the Sun without iron"). Beside it a real star of the nearest class. A second view shows **Payne's curves**: how strong each element's lines are at each temperature. |
| 12.4 | **Stars are made of hydrogen.** Cecilia Payne (1925) used Saha's physics to turn line strengths into amounts: the stars differ in temperature, not make-up, and they are almost all hydrogen and helium. Russell called it impossible, then confirmed it (1929). The Sun is about 74% hydrogen and 24% helium by mass; everything else, the stuff of planets and people, is about 1.4%. | **12.4 What the Sun is made of.** The Sun's elements by number and by mass, on a log scale and as a bar, with what each would weigh in a 1 kg sample of Sun. |
| 12.5 | **Starlight's speedometer.** A star moving away has its lines shifted to the red; one approaching, to the blue (v = c Δλ/λ). The shift gives speed along the line of sight, to metres a second, with no need to see the star move. Line widths tell more: temperature, pressure (giants' lines are narrower) and spin. | ★ **12.5 Doppler shifter.** A star's lines against a laboratory spectrum: set its speed, or measure it from the shift. Real stars (Barnard's star approaching at 110 km/s, Aldebaran receding at 54); a pair of stars whose lines move apart and together, a first look at Chapter 14. |
| Deep dive | Luminosity classes: a star's spectrum tells a giant from a dwarf, and so its distance | — |

*Check yourself:* Why does sunlight have dark lines? (Cooler gas in the Sun's atmosphere absorbs particular colours.) The Sun is mostly hydrogen, so why are its hydrogen lines weak? (At its temperature few hydrogen atoms are on the rung that makes visible lines.) What did Cecilia Payne discover? (Stars are almost all hydrogen and helium.) A star's lines are shifted to the red: what does that tell you? (It is moving away.) *Interactive:* in Figure 12.3, set the temperature where hydrogen's lines are strongest.

### Chapter 13 · Sorting the stars
*Builds on: Chapters 9, 11 and 12. Toolkit: Logarithms and magnitudes.*

| § | Content | Figure |
|---|---|---|
| 13.1 | **Two numbers for every star.** A star's distance and brightness give its luminosity (Chapter 9); its colour or spectrum gives its temperature (Chapters 11 and 12). Magnitudes, the astronomers' backwards log scale, in brief (Toolkit T5). | **13.1 Plot a star.** Pick a star or type its parallax, magnitude and colour: its distance, absolute magnitude and temperature follow, and it lands on an empty diagram. |
| 13.2 | **Hertzsprung and Russell's diagram.** Plot luminosity against temperature (hot on the left, for historical reasons) and nine stars in ten fall on one band, the main sequence. Giants and supergiants lie above it, white dwarfs below. Hertzsprung (1911) and Russell (1913) drew it by hand; Gaia has drawn it for millions of stars. | ★ **13.2 The HR diagram of real stars.** Gaia's stars within 100 pc, as dots over a density map; the observers' axes or the physicists'; the famous stars; click a region for what lives there. Switch between all stars within 20 pc (mostly red dwarfs) and the stars you can see with the naked eye (mostly luminous ones far away): the eye's stars are not typical. |
| 13.3 | **Giants, dwarfs and the Sun.** Lines of equal size on the diagram: supergiants hundreds of times the Sun's width, white dwarfs the size of Earth, the Sun a middling main-sequence star that outshines most of its neighbours. | **13.3 Stars to scale.** The famous stars drawn true, from Sirius B to Betelgeuse, zooming out as they grow; the largest known stars, about 1,500 times the Sun's width, with their uncertainty. |
| 13.4 | **A snapshot, not a path.** Stars don't travel along the main sequence. Each sits nearly still on it for most of its life; what sets the place is mass (Chapter 14); giants are stars that have left it (Chapter 17). | Narrative, pointing ahead to Figures 14.4 and 17.3 |
| Deep dive | Why hot is on the left; the white-dwarf sequence Gaia split in two | — |

*Check yourself:* Which way does temperature run on an HR diagram? (Hotter to the left.) Where are most stars? (On the main sequence.) A star is half the Sun's temperature and 100 times as luminous: how big is it? (40 times the Sun's width: a giant.) Do stars move along the main sequence as they age? (No.) *Interactive:* in Figure 13.2, pick a white dwarf.

### Chapter 14 · Weighing the stars
*Builds on: Chapters 6, 7, 12 and 13. Toolkit: Measurements and uncertainty.*

| § | Content | Figure |
|---|---|---|
| 14.1 | **Stars in pairs.** About half of Sun-like stars have a companion. Herschel saw doubles orbit each other (1803); Bessel predicted Sirius's unseen companion from its wobble (1844), and Clark saw it (1862). An orbit weighs the pair, as in Chapter 7: M₁ + M₂ = a³/P². | ★ **14.1 Binary workbench: the orbit.** Two stars round their balance point, on the sky at any tilt; set the masses, period, shape and tilt, or load Sirius or α Centauri and measure the orbit to weigh them. The same workbench drives 14.2, 14.3, 18.4 and 19.1. |
| 14.2 | **Weighing with the Doppler effect.** Most pairs are too close to see apart, but their lines move apart and together (Mizar A, 1889). The velocity curves give the period, the orbit's shape and the stars' mass ratio, and the masses if we know the tilt. | **14.2 Binary workbench: velocities.** Both stars' velocity curves beside the orbit, linked by a cursor; a double-lined pair to fit. |
| 14.3 | **Eclipses give sizes.** When the orbit is edge-on, the stars eclipse each other (Algol, 1783). The dips' lengths give the stars' sizes; their depths, the ratio of their surface brightnesses. With the velocities, eclipsing pairs give masses and radii to a few per cent. | ★ **14.3 Binary workbench: eclipses.** The light curve beside the orbit and velocities; change the tilt, the sizes and the temperatures; fit a real eclipsing pair from DEBCat, with uncertainties (Toolkit T6). |
| 14.4 | **Heavier means brighter.** On the main sequence, luminosity rises steeply with mass: twice the mass, about eleven times the light (L ∝ M^3.5, Eddington 1924). So the main sequence is a sequence of masses, and mass decides almost everything about a star, including how long it lives (Chapter 17). | ★ **14.4 The mass–luminosity relation.** Real stars with well-measured masses (DEBCat) on log axes; fit a slope; the Sun and the famous stars on it; mass against radius beside it. |

*Check yourself:* How can we weigh a star? (Only by its pull on something else.) Two stars orbit each other once a year at 1 AU: their total mass? (One Sun's.) A main-sequence star twice the Sun's mass is how luminous? (About eleven times.) Why are eclipsing pairs so valuable? (They give sizes as well as masses.) *Interactive:* in Figure 14.3, find the tilt at which the stars start to eclipse.

### Chapter 15 · The Sun up close
*Builds on: Chapters 11, 12 and 13.*

| § | Content | Figure |
|---|---|---|
| 15.1 | **Inside the Sun.** The core, at 15.7 million degrees, where the power is made; the radiative zone, where energy creeps outward over tens of thousands of years; the convection zone, boiling up to the surface; the photosphere's granules, the chromosphere and the million-degree corona (Part I's eclipses). Parker Solar Probe has flown through it, 6.1 million km from the surface. | ★ **15.1 Sun cutaway.** The Sun's layers to scale, with temperature, density and power against depth from a standard solar model; click a layer for what happens there and how we know. The outer atmosphere is drawn not to scale, and labelled. |
| 15.2 | **Sunspots and the 11-year cycle.** Sunspots are cooler patches where magnetic fields hold back the boiling. Galileo watched them turn with the Sun (1610s); Schwabe found the cycle (1843); Hale found the magnetism (1908). Spots appear at mid-latitudes and drift towards the equator: the butterfly diagram. Cycle 25 peaked in October 2024. | ★ **15.2 The sunspot cycle.** Monthly sunspot numbers since 1749 (SILSO), cycles numbered, the Maunder minimum's quiet; the butterfly diagram since 1874 below; pick a cycle for its length and height. |
| 15.3 | **Space weather.** Flares and coronal mass ejections release magnetic energy. They light auroras, upset satellites and power grids: the Carrington event (1859), Quebec (1989), the storm of May 2024. | *(stretch)* **15.3 The race from the Sun.** Light, the fastest particles, a fast coronal mass ejection and the solar wind racing to Earth, after Figure 1.3 |
| 15.4 | **What keeps the Sun shining.** Not fire: a Sun made of coal would burn out in about 5,000 years, and shrinking under its own weight would power it for about 30 million. Only fusion lasts billions: four hydrogen nuclei become one helium nucleus, and 0.7% of the mass becomes energy (E = mc²). The Sun turns 4 million tonnes of itself into light every second. | **15.4 Fuel gauge.** How long the Sun would last on coal, on gravity and on fusion, on a log scale of time with the age of Earth marked: only one fuel fits. |
| 15.5 | **Messages from the core.** Neutrinos fly straight out of the core: 65 billion pass through each square centimetre of you every second. Davis caught a third of those expected (1968 on); SNO showed in 2002 that the rest had changed type on the way. The Sun also rings like a bell, and its vibrations map its insides. | Narrative |
| Deep dive | How long light takes to get out, and why the estimates differ; the solar abundance problem, still open | — |

*Check yourself:* Why are sunspots dark? (They are cooler than their surroundings, though still hotter than a lamp filament.) What powers the Sun? (Fusion of hydrogen into helium, not burning.) How long is the sunspot cycle? (About 11 years.) How do we know what happens in the core? (Its neutrinos come straight out, and its vibrations map the interior.) *Interactive:* in Figure 15.2, find the cycle with the most sunspots.

### Chapter 16 · Born in the dark
*Builds on: Chapters 8, 13 and 14.*

| § | Content | Figure |
|---|---|---|
| 16.1 | **The space between the stars.** About one atom per cubic centimetre, a better vacuum than any laboratory's, with a sprinkling of dust that dims and reddens starlight. Dark clouds such as Barnard 68 block the stars behind them, which shine through in infrared. Hot young stars light up their gas, which glows red with hydrogen's line (Kirchhoff's bright lines). | **16.1 Dust dims and reddens.** A star's light through a cloud of dust: the spectrum dimmed more at blue than at red, the star fainter and redder, and the infrared getting through. |
| 16.2 | **Clouds that collapse.** In cold molecular clouds, at 10–20 K, gravity can beat pressure: a cloud heavier than its Jeans mass collapses, in a few hundred thousand years, and breaks into many stars. | ★ **16.2 Collapse or not.** A cloud's mass, size and temperature; its heat against its gravity as two bars; the Jeans mass; the verdict, with the collapse time. Real clouds as presets, from the thin gas between stars to a dense core. |
| 16.3 | **From protostar to star.** A protostar heats as it shrinks, wrapped in dust and seen only in infrared, with a disc (Part I, Chapter 8) and jets. Young stars come down onto the main sequence over millions of years; fusion starts and a star is born. | ★ **16.3 Arrival on the main sequence.** Young stars' tracks on the HR diagram, from 0.1 to a few solar masses, with ages along them; real young stars beside them. |
| 16.4 | **Failed stars.** Below 0.075 solar masses, about 79 Jupiters, the core never gets hot enough to fuse hydrogen for long: a brown dwarf, which cools for ever, through classes M, L, T and Y. Predicted in 1963, first found in 1995. | **16.4 Cooling for ever.** Brightness against age for objects from 10 Jupiter masses to 0.2 solar masses: stars level off; brown dwarfs fade. |
| 16.5 | **Many small stars, few big ones.** Clouds make many more small stars than big ones (Salpeter 1955): only one star in 160 is heavier than 8 Suns, but those few give out most of the light. | ★ **16.5 A new cluster's star masses.** Draw a cluster of 100 to 100,000 stars from the initial mass function (seeded); the masses as a histogram on log axes; who holds the numbers, the mass and the light; how many will explode as supernovae. |

*Check yourself:* Why are star-forming clouds cold? (Cold gas pushes back less, so gravity can win.) What is a brown dwarf? (Too small to fuse hydrogen; it cools for ever.) Are most stars bigger or smaller than the Sun? (Smaller.) Why do we look at newborn stars in infrared? (Dust blocks their visible light.) *Interactive:* in Figure 16.2, find the smallest cloud that collapses at 10 K.

### Chapter 17 · A star's life
*Builds on: Chapters 13, 14, 15 and 16.*

| § | Content | Figure |
|---|---|---|
| 17.1 | **Living fast, dying young.** A heavier star has more fuel but burns it far faster, so it dies sooner: the Sun lasts about 10 billion years, a star of 10 Suns a few tens of millions, a red dwarf trillions. No red dwarf has ever died. | ★ **17.1 Lifetimes.** *Predict first:* "Which lives longer, a heavy star or a light one?" Main-sequence lifetime against mass from the stellar-evolution engine, on log axes, with the famous stars, the Sun's age and the Galaxy's. |
| 17.2 | **When the hydrogen runs out.** The core shrinks and heats; hydrogen burns in a shell around it; the star swells into a red giant. Sun-like stars then light helium in a flash, settle, swell again on the asymptotic giant branch and shed their outer layers. The Sun will swell to about 250 times its width, as wide as Earth's orbit is now; whether Earth survives is close. | ★ **17.2 The Sun's life.** The Sun's track on the HR diagram from the engine; scrub through time; the Sun drawn true beside the planets' orbits; luminosity, size and temperature against time; the phases on a timeline; "you are here" at 4.6 billion years. |
| 17.3 | **Clusters as snapshots.** A cluster's stars were born together, so they show stars of one age and every mass. The heavier ones leave the main sequence first, so the turn-off gives the cluster's age. | ★ **17.3 Age a cluster.** Gaia's members of real clusters (the Pleiades, the Hyades, Praesepe, M67, NGC 188, 47 Tucanae) with the engine's isochrones; slide the age to fit the turn-off. |
| 17.4 | **Stars that breathe.** Some stars pulse. Leavitt found that the slower a Cepheid pulses, the brighter it is (1912), which made them yardsticks for distance, out to the Andromeda nebula. Polaris is a Cepheid; Mira pulses over a year; Betelgeuse dimmed in 2019–20, behind a dust cloud of its own making. | ★ **17.4 Leavitt's law.** Leavitt's own 25 Cepheids, as she plotted them; a light curve of δ Cephei; set a period and read the luminosity, then the distance. |
| Deep dive | Why giants swell, and why it's hard to say why | — |

*Check yourself:* Which lives longer, a 10-solar-mass star or the Sun? (The Sun, by hundreds of times.) How do we know a cluster's age? (From where its stars leave the main sequence.) What will the Sun become? (A red giant, then a white dwarf.) Why do Cepheids measure distances? (Their period tells their luminosity.) *Interactive:* in Figure 17.3, set the age of the Pleiades.

### Chapter 18 · How stars die
*Builds on: Chapters 12, 14 and 17.*

| § | Content | Figure |
|---|---|---|
| 18.1 | **A gentle end.** Stars like the Sun shed their outer layers, and the hot core lights them up as a planetary nebula, which has nothing to do with planets. The core is a white dwarf: the Sun's mass in a ball the size of Earth, a teaspoon of it weighing tonnes, cooling for billions of years. | **18.1 White dwarfs as clocks.** The white dwarfs in Gaia's HR diagram with cooling tracks and their ages: the coolest are about 10 billion years old, which dates the Galaxy's disc. |
| 18.2 | **Exploding stars.** A star heavier than about 8 Suns burns to iron at its centre, and the core collapses in under a second. The rebound and the neutrinos blow the star apart in a supernova that outshines a galaxy for weeks. In 1987 one went off in the Large Magellanic Cloud, and its neutrinos reached Earth hours before its light. | *(stretch)* **18.2 A supernova's light.** Real light curves of SN 1987A and of a white-dwarf supernova (SN 2011fe) against a galaxy's brightness, with the neutrinos' arrival marked |
| 18.3 | **Neutron stars.** The collapsed core is a ball of neutrons the size of a city, as dense as an atomic nucleus. Jocelyn Bell Burnell found the first pulsar in 1967; the Crab's spins 30 times a second at the heart of the supernova of 1054. | **18.3 Dead stars to scale.** The zoom of Figure 1.1 from Earth to a white dwarf, to a neutron star over a city and a black hole's horizon, with what a teaspoon of each weighs |
| 18.4 | **Finding black holes.** Beyond about 3 solar masses nothing can stop the collapse. A black hole gives out no light, but its companion's orbit weighs it: Cygnus X-1 (21 Suns) and, since 2022, quiet ones found by Gaia, such as Gaia BH3, 33 Suns and 590 pc away. | ★ **18.4 Weigh the invisible companion.** The binary workbench's velocity curve of a visible star with a dark partner: from its period and speed, the companion's smallest possible mass; heavier than 3 Suns and dark means a black hole. Gaia BH1, Cygnus X-1, a white dwarf companion, a faint red dwarf. |
| 18.5 | **The fork in the road.** Mass decides the end: brown dwarf, white dwarf (helium, carbon–oxygen or oxygen–neon), neutron star, black hole, or, for the heaviest metal-poor stars, nothing at all. The boundaries are uncertain, and metallicity and winds move them. | ★ **18.5 The fork in the road.** Initial mass from 0.01 to 300 Suns and metallicity in; the final remnant and its mass out, as a curve against initial mass with the uncertain zones shaded, and the star's whole life as a strip. |
| 18.6 | **Stardust.** Dying stars give back gas enriched with carbon, oxygen, iron and more, from which later stars and planets form; the Sun is one of them, and we are made of it. Where each element comes from is Part III's Chapter 23. | *(stretch)* **18.6 Given back.** For a generation of stars (Figure 16.5's), the mass returned to space against the mass locked in remnants, over time |

*Check yourself:* Will the Sun explode as a supernova? (No: it will end as a white dwarf.) What is a planetary nebula? (A dying star's shed layers lit by its hot core.) How can we find a black hole that gives out no light? (By its pull on a companion.) Why did SN 1987A's neutrinos arrive before its light? (They left the collapsing core at once; the light came out when the blast reached the surface, hours later.) *Interactive:* in Figure 18.5, find the lightest star that leaves a neutron star.

### Chapter 19 · Other worlds
*Builds on: Chapters 7, 12 and 14. Toolkit: Measurements and uncertainty.*

| § | Content | Figure |
|---|---|---|
| 19.1 | **A wobble in Pegasus.** A planet tugs its star round their balance point (Chapter 7), and the star's lines shift back and forth (Chapter 12). In 1995 Mayor and Queloz found 51 Pegasi b this way: a Jupiter in a four-day orbit, which nobody expected. Jupiter moves the Sun at 12.5 m/s; Earth at 9 cm/s. | ★ **19.1 Find the planet.** One planet seen two ways at once: the star's velocity curve and its light curve, with realistic noise. Set the planet's mass, size, orbit and tilt, the star, the instrument's precision and the number of nights; fold the data (Toolkit T6) and see whether the planet stands out. |
| 19.2 | **Shadows.** If the orbit is edge-on, the planet blocks a little starlight once an orbit: Jupiter 1%, Earth 84 parts in a million. Kepler (2009–18) and TESS (from 2018) found thousands this way. The dip gives the size; with the wobble's mass, the density: rock or gas. | **19.2 A transit up close.** A planet crossing a limb-darkened star, the light curve drawn as it goes; grazing transits; how often a random orbit lines up. |
| 19.3 | **What we've found.** Over 6,000 planets (as of October 2026): hot Jupiters; super-Earths and sub-Neptunes, the commonest kind, which the Solar System lacks; worlds round red dwarfs and round pairs of stars (Kepler-16, in the Orrery). Each method sees its own kind, so the census is not a fair sample. | ★ **19.3 The exoplanet census.** Every confirmed planet's mass or size against its orbit, coloured and shaped by how it was found, with the Solar System's planets; a slider from 1992 to today to watch the census grow; click a planet for its card. |
| 19.4 | **Where water could be liquid.** Each star has a habitable zone, where a planet could keep liquid water on its surface, from its luminosity (d ∝ √L). Red dwarfs' zones are close in, where planets turn one face to the star and flares are common. "In the zone" means only that water could be liquid. | ★ **19.4 Habitable zones.** The zone round any star, with the Solar System and known planets in their zones (TRAPPIST-1's, Proxima b); the zone moving outward as the Sun brightens (Chapter 17). |
| 19.5 | **Reading other worlds' air.** During a transit, starlight filters through the planet's atmosphere, and each gas leaves its lines (Chapter 12). JWST found carbon dioxide on WASP-39b in 2022; claims of life's gases are still disputed. | **19.5 Starlight through an atmosphere.** A toy transmission spectrum: the planet's size at each wavelength for a puffy hot Jupiter or a small rocky world, with water, methane and carbon dioxide; why the puffy ones are easiest |

*Check yourself:* Why are hot Jupiters the easiest planets to find? (Heavy and close: big wobbles, frequent deep transits.) How much of the Sun's light does Earth block in a transit? (About 1 part in 12,000.) Does "in the habitable zone" mean a planet has life? (No.) Which method gives a planet's mass, and which its size? (The wobble, at least its least mass; the transit.) *Interactive:* in Figure 19.1, make an Earth twin detectable.

**Count:** 10 chapters, 26 key figures, 17 smaller ones and 3 stretch figures, plus two Toolkit figures.

---

## 5. The Star Forge, version 1

The lab at the end of Part II, at `/star-forge/`, built in Stage 16 on the engine and views of Stages 13–14. Figures 17.1, 17.2, 17.3 and 18.5 open it with a matching star ("Open this in the Star Forge").

**Inputs**
- **Mass**, 0.01–300 M☉ on a log slider, or typed.
- **Metallicity**, Z = 0.0001–0.03 (SSE's "solar" is 0.02; the page says why that differs from today's 0.014).
- **Wind strength**, a multiplier on every wind, from none to three times.
- *(stretch)* **Modern prescriptions**: Vink et al. (2001) hot-star winds and Fryer et al. (2012) remnant masses, against SSE's own (research §12).

**What the reader sees**
- the track on the HR diagram, over Gaia's stars;
- the star drawn true beside the Sun and the planets' orbits, zooming out as it swells;
- the star's insides as a cutaway: core, envelope, the convective part (SSE gives these);
- luminosity, radius, temperature, mass and core mass against time, on log axes, with a "time before the end" option so the last stages aren't squeezed;
- the phases on a timeline, in words;
- its fate: brown dwarf, white dwarf (helium, carbon–oxygen or oxygen–neon), neutron star, black hole, or nothing.

**Comparisons and clusters**
- Up to four stars at once, overlaid, with a table.
- **Cluster mode:** isochrones for an age and metallicity, over Gaia's clusters from Figure 17.3.

**Where the engine is trustworthy.** A **calibration map** of mass against metallicity shows where SSE is fitted to detailed models (0.5–50 M☉), where it is extrapolated (0.1–0.5 and 50–100 M☉), where other models take over (brown dwarfs; pair instability), and where nothing here is reliable (Z below 10⁻⁴, and above ~150 M☉). The reader's star is marked on it, and the boundary teaches something: models are fitted to what we can test.

**Presets** (each with a blurb, "Try this" and "What's simplified")

| Preset | What it shows |
|---|---|
| The Sun | The 10-billion-year main sequence, the red giant, the helium flash, the white dwarf |
| Sirius A | A heavier star's quicker life |
| A red dwarf (0.12 M☉) | Trillions of years, and no giant phase |
| A brown dwarf (0.05 M☉) | Fading for ever |
| Betelgeuse (about 18 M☉) | Red supergiant, supernova, neutron star |
| 25 M☉ at solar and at low metallicity | Winds decide between a neutron star and a black hole |
| 100 M☉, solar metallicity | Winds strip a giant star |
| 150 M☉, metal-poor | Pair instability: nothing left |
| The Pleiades, M67 | Isochrones against real clusters |

**Engine** (`src/core/stellar/`)
- **SSE** in TypeScript from Hurley, Pols & Tout (2000) and the published code's logic and defaults (research §12). One life takes about a millisecond, so it runs on the main thread; isochrones of a few hundred stars may go to a worker if they are slow on phones.
- **Brown dwarfs** below 0.075 M☉: Burrows et al. (2001) power-law cooling, joined to SSE's lowest stars.
- **Pair instability** from the final helium-core mass (Heger & Woosley 2002; Woosley 2017; Belczynski et al. 2016).
- **The calibration map's zones**, from the papers' stated ranges.

**Tests**
- **Against Hurley's code:** reference tracks for 15 masses (0.1–100 M☉) at 6 metallicities, with every stellar type and transition: types, transition times, L, R, M and core masses at fixed checkpoints, and the remnant's type and mass, to tight tolerances (the code is deterministic for single stars). The fixtures come from the original Fortran, compiled once in WSL (§12, question 3).
- Properties: mass never grows; lifetimes fall with mass; tracks are continuous where the paper says they are.
- The Sun at 4.57 billion years within about 10% of its luminosity and radius (SSE's Z = 0.02); brown dwarfs against Burrows et al.'s values; pair instability's mass ranges; isochrone turn-offs against the known clusters' ages.

**Robustness**
- Inputs clamped with a message; presets and a reset; "Copy a link to this star" (the state in the address, as the Orrery does); `?preset=` in the address.

---

## 6. Toolkit pages for Part II

| Page | Content | First needed |
|---|---|---|
| **T5 Logarithms and magnitudes** | Scales that multiply instead of add; a logarithm as "how many factors of ten"; log axes; decibels in game audio; magnitudes and why they run backwards; adding two stars' light; the distance modulus. Figure **T5.1 The magnitude ladder**: brightness from the Sun to JWST's faintest galaxies, ×2.512 a step and ×100 every five; pick two objects to compare. | Chapter 11 (and 13) |
| **T6 Measurements and uncertainty** | Every measurement has an error bar; random and systematic errors; averaging N measurements shrinks random error by √N; how errors combine (a³/P² triples a's relative error, as in Chapter 7's cosmic scale); signal to noise; 3σ and 5σ; fitting by making the misfit small. Figure **T6.1 Find the signal**: a noisy light curve with a hidden transit; bin it, fold it at trial periods, and watch false alarms appear when you try enough. | Chapter 14 (and 19) |

---

## 7. Building blocks introduced in Part II

| Component | Specification | Stage |
|---|---|---|
| **Light core** (`core/light/`) | Planck's law in wavelength and frequency, photons, Wien and Stefan–Boltzmann; synthetic photometry through tabulated filters (Johnson B and V, Gaia's bands); the Airy pattern (Bessel J₁) and a seeing blur | 10 |
| **Spectrum view** (`viz/spectrum/`) | Linear or log wavelength axis with bands and the visible strip in colour; curves, filters, lines and real spectra as layers; a cursor reading wavelength, frequency, energy and Wien temperature; keyboard and a live text description | 10 |
| **A star drawn true** (`viz/star/`) | A disc in its true colour with limb darkening, optional spots, at true size against the Sun and the planets' orbits | 10 |
| **Spectra core** (`core/spectra/`) | Hydrogen's levels; ionisation and excitation by Saha–Boltzmann with simple partition functions; line profiles; a toy synthetic spectrum with TiO bands; Doppler shifts | 11 |
| **HR diagram** (`viz/hr/`) | Canvas 2D; observers' or physicists' axes with lines of equal radius; layers for the Gaia density grid, points, famous stars, tracks, isochrones, clusters and zones; pick by click or keyboard, an "In view" list, a live description; colour ↔ temperature and bolometric corrections in `core/stars/hr.ts` | 11 |
| **Binaries core** (`core/binaries/`) | Visual orbits on the sky (Campbell → Thiele–Innes, through Part I's Kepler solver); velocity curves; eclipses of limb-darkened discs; the mass function | 12 |
| **Light-curve view** (`viz/lightCurve/`) | Brightness against time or phase, with noise, error bars, binning, folding and a model overlay; eclipses, transits, Cepheids, supernovae | 12 |
| **Binary workbench** | The orbit, velocity curves and light curve of one system, linked by a cursor; presets and real data; fitting with uncertainties | 12 |
| **Star cutaway** (`viz/cutaway/`) | A star's interior as nested shells to scale, with profiles beside; the Sun from a solar model; any star from the engine's core and envelope | 12 |
| **Stellar evolution** (`core/stellar/`) | SSE; brown-dwarf cooling; pair instability; the calibration map; isochrones; the initial mass function; pre-main-sequence tracks; the Jeans mass and extinction (`core/ism/`) | 13 |
| **Life strip** (`viz/phases/`) | A star's phases as a timeline with log or "time before the end" scaling | 14 |
| **Exoplanet core** (`core/exoplanets/`) | Transits (Mandel & Agol), wobbles, seeded noise, folding and a box search, habitable zones, a toy transmission spectrum | 15 |

**Reused from Part I:** the figure frame, Check yourself, charts (line, scatter and histogram with log axes), Scene3D, the scale zoom (Figure 18.3), the sky view (to find the famous stars), the time control, the photometry code (B − V → temperature → colour), parallax and the distance modulus, Kepler's equation, the n-body worker (not needed in Part II's figures), `Dated.tsx` and `asOf.ts`.

---

## 8. Data pipeline

Scripts in `scripts/` download the raw data once into `scripts/.cache/` (not committed) and write compact files to `src/data/`, each with its source and licence. Non-commercial and share-alike files sit in their own folders with their own READMEs, like `src/data/hyg/`.

| Script or file | Output | Licence | Size target | Stage |
|---|---|---|---|---|
| `src/data/stars.ts` | The famous stars, each value with its source | Facts, cited | small | 10 |
| `src/data/spectra/lines.ts` | ~50 lines: wavelengths, levels, gf values (NIST ASD) | Facts, cited | small | 11 |
| `build-spectra.ts` | ~12 XSL DR3 spectra, resampled | CC BY 4.0 (verify) | ≤ 120 kB gzipped | 11 |
| `build-hr.ts` | Gaia's 100-pc stars: a density grid plus a sample of points with colour and M_G → `src/data/gaia/` | **CC BY-NC 3.0 IGO** | ≤ 250 kB gzipped | 11 |
| `src/data/dwarfSequence.ts` | Mamajek's colours, temperatures and corrections | Cited | small | 11 |
| `build-debcat.ts` | Masses, radii, temperatures, luminosities of 195 pairs (VizieR V/152) | Cited | 13 kB | 12 |
| `src/data/binaries.ts` | Orbits of Sirius, α Centauri, Castor, ε Lyrae, Mizar A, Algol, Gaia BH1, Cygnus X-1 | Facts, cited | small | 12 |
| `build-solar-model.ts` | Model S, 117 shells | Cited | 3 kB | 12 |
| `build-sunspots.ts` | SILSO monthly numbers since 1749 → `src/data/silso/`; the butterfly diagram as a latitude–time grid | **CC BY-NC 4.0**; RGO/USAF/NOAA records (Hathaway) | 38 kB | 12 |
| `scripts/sse/` | Hurley's code run in WSL over a grid of masses and metallicities → `tests/fixtures/sse/` | Fixtures only | test only | 13 |
| `build-pms.ts` (optional) | BHAC15 tracks for 0.1–1.4 M☉ | Cited | < 20 kB | 13 |
| `build-clusters.ts` | Members of 6–7 clusters with distances and reddening → `src/data/gaia/` | **CC BY-NC 3.0 IGO** | < 80 kB | 14 |
| `src/data/leavitt.ts` | Leavitt's 25 Cepheids (1912) | Public domain | small | 14 |
| `src/data/supernovae.ts` | SN 1987A's and SN 2011fe's light curves | Cited (verify) | small | 14 |
| `fetch-exoplanets.ts` | Every confirmed planet: period, mass, radius, method, year, host → `src/data/exoplanets.json` | Public, acknowledged | ≤ 80 kB gzipped | 15 |

**Dated facts to register in `asOf.ts`:** the exoplanet census and count (every 6 months); mission dates (PLATO's launch, the ELT's first light; 12); the solar cycle's state (12); record holders (the heaviest star, neutron star and stellar black hole, the coldest brown dwarf; 24); Betelgeuse's companion (24); K2-18b's disputed gases (12). Each value lives in `src/data/`, not in the prose, and nothing says "the next" with a fixed date.

---

## 9. Faithfulness: what's exact and what's simplified

| Figure or engine | Plan |
|---|---|
| Spectrum ruler | Exact ranges and conversions; the "what it shows" layer is descriptive |
| Counting photons | Real photon rates; Poisson noise, seeded; a perfect detector (no read noise, no sky) |
| How far down light gets | A sketch from band values, labelled; the real absorption is band by band and changes with weather |
| Split the stars | Exact diffraction for a clear circular aperture; seeing as a Gaussian blur and adaptive optics as a simple mix, both labelled |
| Blackbody explorer, two filters | Exact Planck curves; real stars aren't blackbodies (lines, the Balmer jump), said in the note; real stars' colours from their measured B − V |
| Size, temperature, power; the inverse-square law | Exact |
| Kirchhoff's spectra | True wavelengths; line strengths schematic |
| Hydrogen's ladder | Bohr's levels, exact for hydrogen's wavelengths |
| Make a spectrum, Payne's curves | A one-layer Saha–Boltzmann toy atmosphere at one pressure, labelled; real spectra beside it for honesty |
| Doppler shifter | Exact for v ≪ c |
| The HR diagram | Real Gaia data; colour ↔ temperature and bolometric corrections approximate, especially for white dwarfs and the coolest stars |
| Stars to scale | Literature radii, with their uncertainties for supergiants |
| Binary workbench | Exact Keplerian orbits; spherical stars; no reflection, ellipsoidal or Doppler-beaming effects |
| Mass–luminosity | Real measurements |
| Sun cutaway | A standard solar model; outer atmosphere not to scale |
| Sunspot cycle | Real data |
| Fuel gauge | Order-of-magnitude, with exact arithmetic |
| Dust | The CCM extinction law with R_V = 3.1 |
| Collapse or not | The Jeans criterion only, no dynamics (the collapse is Part III's) |
| Arrival on the main sequence | Published tracks where licensed, or a labelled sketch |
| Cooling for ever | Power-law fits, with no deuterium burning |
| A new cluster's star masses | Exact sampling of a model mass function |
| Lifetimes, the Sun's life, the fork in the road, the Star Forge | SSE's fitted formulas, with the calibration map; no rotation; the post-AGB crossing and planetary nebula phase not modelled (drawn as a dashed jump); fates near boundaries uncertain and shaded |
| Age a cluster | SSE isochrones on real clusters; colours of cool dwarfs approximate; one distance and reddening per cluster from the literature |
| Leavitt's law | Leavitt's own data and a modern calibration |
| White dwarfs as clocks | SSE's cooling law, or published cooling tracks (verify) |
| Dead stars to scale | Typical radii from theory and measurement |
| Weigh the invisible companion | The exact mass function |
| Find the planet, transits | Exact Keplerian wobble; Mandel & Agol transits; white noise only (no stellar activity) |
| The census | Real data; selection effects shown, not corrected |
| Habitable zones | Kopparapu et al.'s limits |
| Starlight through an atmosphere | A toy model, labelled |

Every figure that simplifies gets its **"What's simplified here?"** note, collected on the About page.

---

## 10. Stages 10–16

Each stage is one session and ends as the master plan says (§11): tests, Status, commit, push, deploy, stop.

| Stage | Focus | Done when |
|---|---|---|
| **10** | **Chapters 10 and 11.** The light core; the spectrum view; a star drawn true; the famous stars file; Figures 10.1–10.4 and 11.1–11.4; Toolkit T5; the Part II glossary's first terms; Check yourself. | Chapters 10 and 11 and T5 are live |
| **11** | **Chapters 12 and 13.** The spectra core; the line list; XSL spectra; the HR diagram component and Gaia's 100-pc data; Mamajek's sequence; Figures 12.1–12.5 and 13.1–13.3; Check yourself. | Chapters 12 and 13 are live |
| **12** | **Chapters 14 and 15.** The binaries core, the light-curve view and the binary workbench; DEBCat; the star cutaway with a solar model; the sunspot data; Figures 14.1–14.4 and 15.1, 15.2, 15.4 (stretch 15.3); Toolkit T6; Check yourself. | Chapters 14 and 15 and T6 are live |
| **13** | **The stellar-evolution engine and Chapter 16.** See below. | The SSE tests pass against Hurley's code; Chapter 16 is live |
| **14** | **Chapters 17 and 18.** The life strip; isochrones; the cluster data; Leavitt's Cepheids; Figures 17.1–17.4 and 18.1, 18.3–18.5 (stretch 18.2, 18.6); "Open this in the Star Forge" links (to its coming-soon page until Stage 16); Check yourself. | Chapters 17 and 18 are live |
| **15** | **Chapter 19.** The exoplanet core; the census script; Figures 19.1–19.5; Check yourself. | All of Part II's chapters are live |
| **16** | **The Star Forge v1 and Part II polish.** See below. | Part II is complete and listed |

**Stage 13 · The engine and Chapter 16**
- Before it: gfortran and make in WSL Ubuntu (§12, question 3). Fetch Hurley's SSE (his page, or AMUSE's unchanged copy), record its version, build it, and write the fixture grid with a script.
- SSE in TypeScript: metallicity constants, landmark times and luminosities, the stellar types and their L, R and core masses, winds, remnants, time steps; tested against the fixtures.
- Brown-dwarf cooling, pair instability and the calibration map; the initial mass function; the Jeans mass and extinction; pre-main-sequence tracks.
- Figures 16.1–16.5; Check yourself.
- *If it overruns:* Chapter 16 moves to Stage 15, beside Chapter 19, and Stage 14's chapters link to it as planned.

**Stage 16 · The Star Forge v1 and Part II polish**
- The lab (§5): inputs, views, comparisons, cluster mode, the calibration map, presets, links, the page's explanation of the engine and its limits, and what it shows without JavaScript.
- Polish: an accuracy and copy pass with your review; the glossary, the timeline and the About page (sources, credits including the non-commercial ones, simplifications, tests); cross-browser (WebKit here); accessibility in both themes; performance on the slow-phone profile; every "as of" fact checked.
- In the Moving Parts project, update the card ("Parts I and II of III", "19 chapters · The Orrery · The Star Forge"), then deploy both.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| **SSE ported with subtle bugs** | Fixtures from Hurley's own code across every stellar type and the calibration edges; property tests; one stage mostly for the engine |
| **No Fortran compiler here** | WSL Ubuntu is installed; gfortran and make need one `apt install` (§12) |
| **Licences** | Gaia and SILSO are non-commercial (your call, §12); MIST isn't used; every source checked in its stage, credited on the About page, and kept in its own folder where its licence differs |
| **Experts will check the numbers** | Values from the research brief with sources; uncertain ones shown as ranges; the calibration map and "What's simplified" notes say where the models stop |
| **The HR diagram's data is heavy** | A density grid plus a sample of points, loaded only near the figure, within a size budget |
| **Toy models mistaken for the real thing** | The spectrum model and the transmission spectrum are labelled, and real spectra sit beside the model |
| **Too much for Part II** | Stretch figures marked; Chapter 16 has a fallback stage; the Star Forge's modern prescriptions are a stretch |
| **Dated facts go stale** | Registered in `asOf.ts`, whose test fails when one is overdue |
| **Readers who skipped Part I** | Each chapter's "Builds on" links back, and the boxes recap what they need |

---

## 12. Open questions (decided 29 Oct 2026: the defaults below stand)

1. **Non-commercial data.** Gaia (CC BY-NC 3.0 IGO) for the HR diagram and the clusters, and SILSO (CC BY-NC 4.0) for the sunspot cycle. The site is free, with no ads or payments, so it qualifies. *My default: use them, in their own folders with their licences, credited on the About page.* The alternatives are HYG for the HR diagram (Hipparcos-era: few faint red dwarfs or white dwarfs) and NOAA's records for the sunspots.
2. **The Star Forge's "detailed models" mode.** MIST says "All rights reserved" and gives no licence. *My default: leave it out of version 1.* The calibration map and the optional modern prescriptions show that the formulas are models. You could ask the MIST team for permission for version 2.
3. **A Fortran compiler for the SSE fixtures.** WSL Ubuntu 26.04 is installed without one. *My default: at the start of Stage 13, with your OK, install gfortran and make in WSL* (`sudo apt install gfortran make`, which needs your password, so you may prefer to run it yourself), build Hurley's code, and keep only its outputs as fixtures.
4. **Real spectra.** *My default: a dozen spectra from the X-shooter Spectral Library beside the toy model*, if its terms check out in Stage 11 (ESO's archive is CC BY 4.0); otherwise the model alone, labelled.
5. **Young stars' tracks (Figure 16.3).** *My default: BHAC15's tracks (citation only) for 0.1–1.4 M☉ and a labelled sketch above that.*
6. **Supernova light curves (Figure 18.2, stretch).** *My default: published photometry of SN 1987A and SN 2011fe*, since Part III builds the model (Chapter 25); if the data's terms are unclear, the figure waits for Part III.
7. **Section titles.** They are now the chapters' planned headings in the registry, and become their addresses' fragments when written. Change any you like before Stage 10.
8. **The Moving Parts card** at the end of Stage 16: *my default: yes*, as in §10, so the plan approves it.
