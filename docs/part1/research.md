# Research brief: Part I, the sky and the Solar System

*Compiled 22 Oct 2026 (Stage 0) as reference material for Part I · The Clockwork. The companion to [plan.md](plan.md). Part I's science is long settled; the work is in getting the numbers right, choosing data we're allowed to use, and designing figures that confront the wrong ideas beginners bring.*

**Marks used below**
- **(checked)** verified against the source on 22 Oct 2026.
- **(std)** a standard reference value or textbook fact, written from knowledge; check the exact figure before it goes on screen.
- **(verify)** likely to change, or uncertain; check it in the stage that uses it.
- **(computed)** worked out here from the values above it.

## TL;DR

- **What beginners get wrong is well documented.** The hardest topics are Moon phases, the seasons and gravity. The most common misconceptions are that Earth's shadow causes the phases and that distance from the Sun causes the seasons (Lelliott & Rollnick 2010, reviewing 103 studies). Part I's key figures for those topics are designed around them (§1).
- **Data with clear licences exists for everything Part I needs:**
  - stars from the **HYG database v4.2** (CC BY-SA 4.0);
  - constellation lines, IAU boundaries and the Milky Way outline from **d3-celestial** (BSD 3-Clause);
  - planet positions from **JPL's approximate Keplerian elements**, with published error tables;
  - eclipse lists from **NASA's eclipse predictions**, with a required credit line (§11).
- **The algorithms are classical and well specified:** Julian dates, sidereal time, coordinate transforms, long-term precession (Vondrák et al. 2011), Meeus's lunar theory and eclipse method, Kepler's equation, and symplectic and adaptive integrators (§12).
- **Timely hooks:**
  - Voyager 1 reaches one light-day from Earth on **18 Nov 2026** (checked).
  - Saturn has **285** known moons and Jupiter **101** (March 2026; checked).
  - The third interstellar visitor, **3I/ATLAS**, was found in July 2025 (std).

---

## 1. How beginners think about the sky

**The big review.** Lelliott & Rollnick (2010), *International Journal of Science Education* 32(13), 1771–1799 (checked: abstract and summaries):
- It reviewed 103 peer-reviewed studies from 1974–2008.
- Five "big ideas" made up over 80% of the research: the shape of the Earth, gravity, day and night, the seasons, and the Earth–Sun–Moon system.
- **Moon phases, the seasons and gravity** were the hardest for learners to understand and explain.
- The most common misconception about phases is that **Earth's shadow falls on the Moon**. About the seasons, it is the **distance theory** (Earth is closer to the Sun in summer).
- Thoroughly planned interventions were the most promising route to conceptual change.

**Other sources**
- *A Private Universe* (Schneps & Sadler, 1987), a short film in which new Harvard graduates explain the seasons with the distance theory (std). It is the classic demonstration that a good education doesn't remove these ideas.
- Comins, *Heavenly Errors* (2001), a catalogue of astronomy misconceptions and where they come from (std).
- Bailey & Slater (2003), "A review of astronomy education research", *Astronomy Education Review* 2(2) (std).
- Plummer (2014) argues that **spatial thinking**, moving between the view from Earth and the view from space, is the main dimension of progress in learning astronomy (*Studies in Science Education* 50(1)) (std).

**Design consequences for Part I**
- **Predict, then reveal.** Key figures ask for a prediction first: "Where will the Moon be at sunset tomorrow?"
- **Two linked viewpoints.** The Earth–Sun–Moon figures always pair a view from space with the view from the ground, linked so that moving one moves the other.
- **Real scale, at least once.** Textbook diagrams are badly out of scale, and that feeds misconceptions (one follow-up study blamed poor diagrams for phase errors). Every exaggerated figure carries a "not to scale" tag, and Chapter 1 shows true scale.
- **Name the misconception and test it.** The seasons figure shows the real perihelion date; the phase figure has an "Earth's shadow" switch.

| Common misconception | Where Part I confronts it |
|---|---|
| Seasons come from Earth's changing distance from the Sun | Fig. 3.2: perihelion in January, opposite seasons in the south, the distance switch |
| The phases are Earth's shadow | Fig. 4.1: the shadow switch shows the shadow only reaches the Moon at a lunar eclipse |
| The Moon is only up at night | Fig. 4.1: the daytime Moon; Check yourself |
| The Moon doesn't rotate | Fig. 4.3 |
| There should be an eclipse every month | Fig. 4.4: the tilted orbit and eclipse seasons |
| Polaris is the brightest star, and is overhead everywhere | Ch. 2: the sky view (Polaris is about 48th in brightness) and the latitude figure |
| The constellations are the same all year | Fig. 2.4: star time and Sun time |
| The Sun is straight overhead at noon, everywhere | Fig. 3.3 |
| Astronauts float because there is no gravity in space | Fig. 7.1 (gravity is ~90% as strong at the ISS); Check yourself |
| An orbit needs a constant forward push | Figs 7.1 and 7.2 |
| The Moon pulls the sea up on one side only | Fig. 7.5: two bulges |
| The Solar System is compact, and the asteroid belt is crowded | Fig. 1.2, the scale model; Fig. 8.4 |
| Stars are small lights, unlike the Sun | Ch. 9 |

---

## 2. Scale and light

| Quantity | Value |
|---|---|
| Speed of light, c | 299,792,458 m/s, exact (std) |
| Astronomical unit (AU) | 149,597,870,700 m, exact since IAU 2012 Resolution B2 (std) |
| Light-year | 9.4607 × 10¹⁵ m = 63,241 AU (std) |
| Parsec | 3.0857 × 10¹⁶ m = 3.2616 light-years = 206,265 AU (std) |
| Earth's diameter | 12,742 km mean; 12,756 km at the equator (std) |
| Moon's diameter | 3,475 km (std) |
| Sun's diameter | 1,391,400 km (IAU 2015 nominal radius 695,700 km) (std) |
| Jupiter's diameter | 142,984 km at the equator (std) |
| Earth–Moon distance | 384,400 km on average; light takes 1.28 s (std) |
| Sun–Earth | 1 AU; light takes 499 s = 8 min 19 s (std) |
| Sun–Neptune | 30.07 AU; light takes about 4 h 10 min (computed) |
| Voyager 1 | One light-day (about 25.9 billion km) from Earth on **18 Nov 2026**, 06:16 UTC, per NASA's announcement of 17 Jun 2026. It crossed the heliopause in August 2012. (checked) |
| Proxima Centauri | 4.25 light-years (1.302 pc); parallax 768.07 mas (Gaia DR3) (std) |
| Milky Way | Stellar disc ~100,000 light-years across. The Sun is 8.2–8.3 kpc (~27,000 light-years) from the centre (GRAVITY 2019, 2021) and orbits at ~230 km/s, once every ~230 million years (std) |

**Powers of ten.** From 1 m (a person) to 10²¹ m (the Milky Way's disc) is 21 factors of ten (computed). The Eames film *Powers of Ten* (1977) is the classic precedent; we can mention it but not use it.

**Scale model: the Sun as a 10 cm grapefruit**, a scale of about 1 : 14 billion (computed):

| Object | Size in the model | Distance in the model |
|---|---|---|
| Earth | 0.9 mm, a grain of sand | 10.8 m from the Sun |
| Moon | 0.25 mm | 2.8 cm from Earth |
| Jupiter | 1.0 cm, a pea | 56 m |
| Neptune | 3.6 mm | 323 m |
| Proxima Centauri | 1.5 cm, a cherry | about 2,900 km |

---

## 3. The turning sky

- **Celestial sphere:** the sky looks like a dome because the stars are too far away for our eyes to judge depth. It's the original skybox. **Horizon, zenith, meridian**; **altitude** (degrees above the horizon) and **azimuth** (compass direction).
- **Angles by hand:** at arm's length, a fist covers about 10°, a finger about 1–2°. The Moon and the Sun are both about 0.5° across (std).
- **Sidereal day** = 23 h 56 min 4.09 s, so each star rises about 3 min 56 s earlier every day, two hours earlier a month (std).
- **Latitude:** the celestial pole's altitude equals the observer's latitude. Seen from latitude φ (north), a star of declination δ (std):
  - is circumpolar (never sets) if δ > 90° − φ;
  - never rises if δ < −(90° − φ).
- **Constellations:** 88 official ones (IAU list 1922, boundaries by Delporte 1930) (std). Polaris is only about the 48th-brightest star (std; verify the rank against the star data).
- **Precession:**
  - Earth's axis traces a circle in about 25,800 years, about 50.3″ a year (std).
  - Hipparchus found it around 130 BC by comparing his star positions with older ones (std).
  - Thuban (α Draconis) was the pole star around 2800 BC, when the pyramids were being planned (std; verify how close it came).
  - Polaris will be closest to the pole, about 0.45°, around AD 2100 (verify).
  - Vega will be within about 5° of the pole around AD 14,000 (verify).
- **Proper motion** shifts the fastest nearby stars by degrees over the 26,000 years the "wandering pole" figure spans (Arcturus moves about 2.3″ a year, a degree in about 1,600 years) (std). The figure includes it.

---

## 4. The Sun's year

- **Obliquity:** 23.44° (23.4393° at J2000, decreasing by about 0.47″ a year) (std).
- **Perihelion** falls around 2–5 January at 0.9833 AU, **aphelion** around 3–6 July at 1.0167 AU (std). Earth therefore gets about **7% more sunlight in January than in July** (computed: (1.0167/0.9833)² ≈ 1.069), during *northern* winter.
- **Noon altitude** of the Sun: h = 90° − |φ − δ☉| (std).
- **Day length:** cos H₀ = (sin h₀ − sin φ sin δ) / (cos φ cos δ), where H₀ is half the day as an hour angle and h₀ = −0.833° for the Sun (refraction plus the solar disc) (std; Meeus ch. 15).
- **Polar circles** lie at 90° − ε ≈ 66.56° (std). Refraction gives a midnight Sun slightly south of the Arctic Circle.
- **The zodiac:** by the IAU boundaries the Sun crosses 13 constellations, including Ophiuchus from about 29 Nov to 17 Dec (std; verify the dates against the boundary data).
- **Years:** tropical (equinox to equinox) 365.24219 days, sidereal 365.25636 days, anomalistic (perihelion to perihelion) 365.25964 days (std).
- **Calendars**
  - The Julian calendar's 365.25 days drifts one day every ~128 years. The Gregorian 365.2425 days drifts one day in about 3,200 years (computed).
  - Thursday 4 October 1582 was followed by Friday 15 October 1582 (std).
  - Sweden's attempt to change gradually went wrong, and 1712 had a **30 February** to return to the Julian calendar. Sweden switched for good in 1753 (std).
- **Equation of time:** sundial time runs up to about 14 minutes behind clock time (February) and about 16 minutes ahead (early November). The cause is the tilt plus the elliptical orbit. The analemma is its picture (std).
- **Milankovitch cycles** (std). Hays, Imbrie & Shackleton (1976) matched them to ice ages in deep-sea sediments (std).
  - Obliquity varies between 22.1° and 24.5° over about 41,000 years.
  - The axis precesses (~26,000 years); combined with the orbit's precession, the seasons' timing relative to perihelion cycles in 19,000–23,000 years.
  - The orbit's eccentricity varies between nearly 0 and about 0.06, with periods of about 100,000 and 405,000 years.
- **Monuments** (std):
  - Stonehenge's main axis points to the midsummer sunrise and midwinter sunset (sarsen phase about 2500 BC).
  - Newgrange (about 3200 BC) lets the midwinter sunrise in through its roof-box.

---

## 5. The Moon

| Quantity | Value |
|---|---|
| Sidereal month (relative to the stars) | 27.321662 days (std) |
| Synodic month (new Moon to new Moon) | 29.530589 days (std) |
| Draconic month (node to node) | 27.212221 days (std) |
| Anomalistic month (perigee to perigee) | 27.554550 days (std) |
| Orbital tilt to the ecliptic | 5.145° (std) |
| Nodes regress once every | 18.61 years (std) |
| Eccentricity | 0.0549 on average (std) |
| Distance | 384,400 km on average; perigee 356,400–370,400 km; apogee 404,000–406,700 km (std) |
| Apparent diameter | Moon 29.3′–34.1′; Sun 31.6′–32.7′ (std) |
| Moonrise | about 50 minutes later each day, on average (std) |
| Libration | lets us see 59% of the surface over time (std) |
| Recession | 3.8 cm a year, measured by lunar laser ranging (std) |

**Eclipses**
- An eclipse needs a new or full Moon close to a node. The Sun returns to the same node every **eclipse year**, 346.62 days (std).
- Each **eclipse season** lasts about a month (the Sun must be within roughly 15–18° of a node for a solar eclipse; computed from the Sun's motion relative to the node). That is longer than a synodic month, so every season has at least one solar eclipse. Hence there are at least two solar eclipses a year, and at most seven eclipses of both kinds (std).
- **The coincidence:** the Sun is about 400 times wider than the Moon and about 390 times farther away (computed), so they look almost the same size. That is why both total and annular eclipses happen.
- The Moon turns **red** in a total lunar eclipse because sunlight bent through Earth's atmosphere, with its blue scattered out, still reaches it (std).
- **Saros:** 223 synodic months = 6,585.32 days = 18 years 11⅓ days (10⅓ with five leap years). That is almost exactly 242 draconic and 239 anomalistic months, so a Saros later the Sun, Moon and node line up again at nearly the same distance (std). The Babylonians used the 223-month cycle, and the Antikythera mechanism has a Saros dial (Freeth et al. 2006) (std).
- **Recent and upcoming eclipses** (verify every one against the NASA catalogue in Stage 4):
  - 3 Mar 2026: total lunar.
  - 12 Aug 2026: total solar (Greenland, Iceland, Spain).
  - 28 Aug 2026: partial lunar.
  - 2 Aug 2027: total solar, up to about 6 min 23 s near Luxor.
  - 22 Jul 2028: total solar (Australia, New Zealand).
  - 31 Dec 2028: total lunar.

---

## 6. Planets, and the road to a Sun-centred system

| Planet | Synodic period | Typical retrograde | Greatest elongation |
|---|---|---|---|
| Mercury | 115.88 days | ~3 weeks, about 3 times a year | 18°–28° |
| Venus | 583.92 days | ~6 weeks | 45°–47° |
| Mars | 779.94 days | ~60–80 days | — |
| Jupiter | 398.88 days | ~4 months | — |
| Saturn | 378.09 days | ~4½ months | — |

*(std)* Mars was at opposition on 16 Jan 2025; the next is on 19 Feb 2027 (verify). At greatest elongation, Venus, the Sun and Earth form a right angle at Venus, so sin(elongation) = Venus's distance in AU: sin 46.3° ≈ 0.723 (computed). Copernicus measured relative distances this way.

**History** (std throughout)

- **Aristarchus of Samos** (c. 310–230 BC)
  - *On the Sizes and Distances of the Sun and Moon*: at half Moon he measured an angle of 87° (the true value is 89.85°) and concluded the Sun is 18–20 times farther away than the Moon (it is ~390 times).
  - Archimedes (*The Sand Reckoner*) reports that he proposed a Sun-centred system.
- **Eratosthenes** (c. 240 BC) measured Earth's circumference as about 250,000 stadia.
- **Hipparchus** (c. 190–120 BC) made a star catalogue, discovered precession and developed trigonometry.
- **Ptolemy** (c. AD 150), the *Almagest*
  - Each planet rides an **epicycle** whose centre moves along a **deferent**, centred off Earth (an eccentric).
  - The motion is uniform as seen from the **equant**, a point opposite Earth across the deferent's centre.
  - It predicted positions to within a few degrees, good enough for about 1,400 years.
- **Copernicus**, *De revolutionibus orbium coelestium* (1543): retrograde loops follow naturally, and the planets' order and relative distances follow from geometry. Still circles, so it was no more accurate than Ptolemy.
- **Tycho Brahe**
  - Saw the new star of 1572 (a supernova) and the comet of 1577, both showing that the heavens change.
  - Worked at the Uraniborg observatory on the island of Hven (1576–1597), measuring positions to about 1–2′ without a telescope.
  - His **Tychonic system** (the Sun and Moon circle Earth, the planets circle the Sun) predicts the same phases of Venus as Copernicus. Galileo's observations ruled out Ptolemy's arrangement, not Tycho's.
- **Kepler**
  - Mars's position in Tycho's data was 8′ off any circular model. The result was ellipses: *Astronomia nova* (1609), first two laws; *Harmonices mundi* (1619), third law; *Rudolphine Tables* (1627).
- **Galileo**
  - *Sidereus nuncius* (March 1610): Jupiter's four large moons (January 1610), mountains on the Moon, countless stars in the Milky Way.
  - A full set of Venus phases, with size changes, observed late in 1610.

---

## 7. Kepler's laws and Kepler's equation

**The three laws**
1. Orbits are ellipses with the Sun at one focus.
2. The line from the Sun to a planet sweeps equal areas in equal times.
3. P² = a³ with P in years and a in AU. Newton's general form is P² = 4π² a³ / G(M + m).

| Body | a (AU) | e | Period |
|---|---|---|---|
| Mercury | 0.387 | 0.2056 | 87.97 days |
| Venus | 0.723 | 0.0068 | 224.70 days |
| Earth (Earth–Moon barycentre) | 1.000 | 0.0167 | 365.256 days |
| Mars | 1.524 | 0.0934 | 686.98 days |
| Jupiter | 5.203 | 0.0484 | 11.86 years |
| Saturn | 9.537 | 0.0539 | 29.46 years |
| Uranus | 19.19 | 0.0473 | 84.01 years |
| Neptune | 30.07 | 0.0086 | 164.8 years |
| Pluto | 39.5 | 0.2488 | 248 years |
| Halley's comet | 17.8 | 0.967 | ~76 years |

*(std; the planets' values are JPL's J2000 mean elements; recheck from the element table when it is coded)*

**Kepler's equation** M = E − e sin E connects time (the mean anomaly M) with position (the eccentric anomaly E). It has no closed-form solution, so it is solved by refining a guess (std):
- Newton's method: E ← E − (E − e sin E − M) / (1 − e cos E).
- Start from E₀ = M + 0.85 e·sign(sin M) (Danby 1988). It converges in a handful of steps.
- For e close to 1, safeguard the step (fall back to bisection).
- Hyperbolic orbits (interstellar visitors) use M = e sinh F − F.
- JPL's own recipe starts from E₀ = M + e sin M and iterates to 10⁻⁶ degrees (checked).

---

## 8. Newton's gravity

| Quantity | Value |
|---|---|
| G | 6.67430(15) × 10⁻¹¹ m³ kg⁻¹ s⁻² (CODATA 2018, unchanged in 2022) (std) |
| GM☉ | 1.32712440041 × 10²⁰ m³ s⁻² (std); M☉ = 1.9884 × 10³⁰ kg (computed) |
| GM⊕ | 3.986004418 × 10¹⁴ m³ s⁻² (std); M⊕ = 5.9722 × 10²⁴ kg (std) |
| Moon's mass | 7.342 × 10²² kg, 1/81.3 of Earth's (std) |
| Circular-orbit speed at Earth's surface (no air) | 7.91 km/s (computed) |
| Escape speed from Earth | 11.19 km/s (computed) |
| ISS | ~400–420 km up, ~92.7-minute orbit, ~7.66 km/s (verify); gravity there is ~89% of the surface value (computed) |

**The Moon test** (*Principia*, Book III, Prop. IV) (computed). The Moon's centripetal acceleration is 4π²r/T² = 0.00272 m/s². It sits 60.3 Earth radii away, and g/60.3² = 0.00270 m/s². They agree to about 1%, so the force that drops an apple also holds the Moon, weakened by the square of the distance.

**Newton's cannon** is the thought experiment and drawing in *A Treatise of the System of the World* (1728, published after Newton's death) (std).

**Weighing with an orbit:** M ≈ 4π² a³ / (G P²). All values computed with the data above.

| Pair | a | P | Mass found |
|---|---|---|---|
| Sun from Earth | 1 AU | 1 sidereal year | 1.99 × 10³⁰ kg |
| Earth from the Moon | 384,400 km | 27.32 days | 6.03 × 10²⁴ kg (Earth plus Moon) |
| Earth from the ISS | 6,791 km | 92.7 min | 5.99 × 10²⁴ kg |
| Jupiter from Io | 421,700 km | 1.769 days | 1.90 × 10²⁷ kg |
| Mars from Phobos | 9,376 km | 7.65 h | 6.42 × 10²³ kg |
| Pluto and Charon | 19,596 km | 6.387 days | 1.46 × 10²² kg (both together) |

G itself came from **Cavendish** (1798), who measured the density of the Earth with a torsion balance (std).

**Barycentres** (computed)
- Earth–Moon: 4,670 km from Earth's centre, about 1,700 km below the surface.
- Sun–Jupiter: about 742,000 km from the Sun's centre, 1.07 solar radii, just outside the surface.
- Pluto–Charon: about 2,130 km from Pluto's centre, outside Pluto (radius 1,188 km). That's why the pair is sometimes called a double dwarf planet.

**Tides**
- What raises tides is the *difference* in pull across Earth, which falls off as 1/distance³ (std).
- The Sun's tidal effect is about 46% of the Moon's: (M☉/M☾)(d☾/d☉)³ ≈ 0.46 (computed).
- Spring tides come at new and full Moon, neap tides at the quarters (std).
- Tidal friction lengthens the day by about 2.3 ms per century; about 1.8 ms is observed once post-glacial rebound is included (Stephenson et al. 2016) (std).
- The Moon recedes 3.8 cm a year (§5).
- Tidal locking explains why we see one face of the Moon (std).
- Tidal heating powers Io's volcanoes. Peale, Cassen & Reynolds (1979) predicted them just days before Voyager 1 saw them (std).

**Gravity's victories** (std)
- Halley (1705) predicted the comet of 1682 would return in 1758. **Johann Georg Palitzsch**, a farmer and amateur astronomer, saw it on **25 December 1758**.
  - Clairaut, Lalande and Lepaute had calculated that Jupiter and Saturn would delay it, and predicted perihelion around 13 April 1759 ± 30 days. It came on 13 March 1759.
- Le Verrier predicted an unseen planet from Uranus's wanderings. Galle and d'Arrest found Neptune on **23 September 1846**, within about 1° of the prediction.
- **Hohmann transfer** to Mars: about 259 days. Launch windows open every ~26 months, the Earth–Mars synodic period.
- Mercury's perihelion advances 43″ per century more than Newton predicts. General relativity explains it, a hook for Part III.

---

## 9. The Solar System

| Planet | Diameter (km) | Mass (Earth = 1) | Gravity (g) | Rotation | Year | Axial tilt | Moons* | Mean temperature |
|---|---|---|---|---|---|---|---|---|
| Mercury | 4,879 | 0.055 | 0.38 | 58.6 days | 88.0 days | 0.03° | 0 | 167 °C |
| Venus | 12,104 | 0.815 | 0.91 | 243 days, backwards | 224.7 days | 177.4° | 0 | 464 °C |
| Earth | 12,756 | 1 | 1.00 | 23.93 h | 365.26 days | 23.44° | 1 | 15 °C |
| Mars | 6,792 | 0.107 | 0.38 | 24.62 h | 687.0 days | 25.19° | 2 | −65 °C |
| Jupiter | 142,984 | 317.8 | 2.53 | 9.93 h | 11.86 years | 3.13° | 101 | −110 °C |
| Saturn | 120,536 | 95.2 | 1.07 | 10.66 h | 29.46 years | 26.73° | 285 | −140 °C |
| Uranus | 51,118 | 14.5 | 0.89 | 17.24 h, backwards | 84.0 years | 97.77° | 28–29 | −195 °C |
| Neptune | 49,528 | 17.1 | 1.14 | 16.11 h | 164.8 years | 28.32° | 16 | −200 °C |

*(std, from the NASA Planetary Fact Sheets; verify each value in Stage 7.)* \*Moon counts as of March 2026 (checked):
- Jupiter has 101 and Saturn 285, after 11 new moons were announced that month.
- Uranus has 28, or 29 counting S/2025 U1, which JWST found in 2025.
- Neptune has 16.

**Other worlds of note** (std)
- Venus's solar day is 116.75 days, and Mercury spins three times for every two orbits.
- Europa (ocean evidence from the Galileo magnetometer) and Enceladus (Cassini saw its plumes in 2005) have oceans under their ice.
- Titan has lakes of methane and ethane (Cassini–Huygens).
- Io, Europa and Ganymede are locked in a **1 : 2 : 4 resonance** (periods 1.769, 3.551 and 7.155 days), the Laplace resonance.
- Saturn's main rings are about 280,000 km across but mostly only about 10 m thick.

**Small bodies**
- **Dwarf planets:** five are recognized by the IAU (Ceres, Pluto, Haumea, Makemake, Eris). Pluto was reclassified on 24 Aug 2006 (std).
- **Asteroids:** well over a million are known (verify the current count from the Minor Planet Center).
  - **Kirkwood gaps** sit where an asteroid's period would be a simple fraction of Jupiter's: 2.50 AU (3:1), 2.82 AU (5:2), 2.95 AU (7:3) and 3.27 AU (2:1). Daniel Kirkwood noticed them in 1866–67 (std).
  - Jupiter's **Trojans** gather around L4 and L5, with more than 15,000 known (verify).
- **Kuiper belt:** about 30–50 AU (std).
- **Oort cloud:** inferred from long-period comets, roughly 2,000–100,000 AU, never directly observed (std).
- **Interstellar visitors** (std):
  - 1I/ʻOumuamua, found 19 Oct 2017;
  - 2I/Borisov, 30 Aug 2019;
  - 3I/ATLAS, 1 Jul 2025.
- **Meteor showers** happen when Earth crosses the debris trail of a comet (std).

**Formation** (std)
- **Age:** 4.567 billion years, from the oldest solids in meteorites (calcium–aluminium-rich inclusions; Connelly et al. 2012).
- **Collapse:** a collapsing cloud fragment forms a spinning disc, as ALMA's 2014 image of HL Tau's disc shows.
- **The snow line:** beyond about 2.7 AU (in the classic minimum-mass nebula of Hayashi 1981), water freezes. Solids are more plentiful there, so giant planets can grow big enough to gather gas.
- **Collisions:** planetesimals grow into planets, and a giant impact formed the Moon.
- **Migration:** the giant planets moved after forming, in the Nice model (Tsiganis, Gomes, Morbidelli and Levison, *Nature* 2005) and the Grand Tack (Walsh et al. 2011).
- **Chaos:** the Solar System is chaotic over a few million years (Laskar 1989). Over the next 5 billion years there is about a 1% chance that Mercury's orbit becomes unstable (Laskar & Gastineau 2009).

---

## 10. Distances to the stars

**Parallax:** distance in parsecs = 1 / (parallax in arcseconds). It is the basis of every other distance in astronomy (std).

**The first measurements** (std)
- Bessel measured 61 Cygni in 1838 at 0.314″; the modern value is 0.286″.
- Henderson measured α Centauri and Struve measured Vega at about the same time.

| Star | Parallax | Distance | Notes |
|---|---|---|---|
| Proxima Centauri | 768.07 mas | 4.25 light-years | The nearest star; a red dwarf |
| α Centauri A and B | ~750 mas | 4.37 light-years | A Sun-like pair |
| Barnard's Star | 547 mas | 5.96 light-years | The fastest proper motion, 10.4″ a year |
| Sirius | 379 mas | 8.6 light-years | The brightest star in the night sky |
| 61 Cygni A | 286 mas | 11.4 light-years | Bessel's star |
| Vega | 130 mas | 25 light-years | |
| Betelgeuse | ~5–7 mas | ~550–700 light-years | Uncertain: a big, variable star |

*(std; recheck against the HYG data and Gaia DR3 in Stage 7)*

**Gaia** (ESA) launched in December 2013. Data Release 3 (June 2022) has positions for about 1.8 billion sources and parallaxes for about 1.5 billion (std). DR4 is expected in December 2026 (verify).

**The 10-parsec sample** (Reylé et al. 2021, *A&A* 650, A201) lists about 540 stars and brown dwarfs within 10 pc. Most are red (M) dwarfs; there are a few dozen brown dwarfs and about twenty white dwarfs (verify the counts). The Sun is brighter than about 90% of its neighbours (verify).

**The Sun from far away** (computed). The Sun's absolute magnitude is +4.83.
- At α Centauri's distance (1.34 pc) it would shine at about magnitude +0.5, among the brightest stars.
- It would fade below naked-eye visibility (magnitude ~6) beyond about 17 pc, or 55 light-years.

**Our place in the Galaxy** (std)
- Herschel's star gauging (1785) gave a flattened disc with the Sun near the centre.
- Shapley (1918) used globular clusters to put the centre far away in Sagittarius. His distance was too large, because dust dims distant stars, as Trumpler showed in 1930.

---

## 11. Data sources and licences

| Data | What we take | Licence or terms | Status |
|---|---|---|---|
| **HYG database v4.2**, David Nash, astronexus.com | Stars to magnitude ~6.5 (~9,000): positions, proper motions, V magnitude, B−V colour, distance, Hipparcos number, Bayer/Flamsteed designations, IAU proper names (v4.2 added 34) | **CC BY-SA 4.0** from v4.0 on (earlier versions CC BY-SA 2.5). Our derived star file is CC BY-SA 4.0 too, with attribution. | (checked) |
| **d3-celestial**, Olaf Frohn | `constellations.lines.json` (from the IAU constellation pages, with Frohn's edits), `constellations.bounds.json` (Davenhall & Leggett 1989, VizieR VI/49), `mw.json` (Milky Way outline, J. R. Vieira) | **BSD 3-Clause** for the repository; there is no separate data licence. Keep the copyright notice. | (checked) |
| Yale Bright Star Catalogue (BSC5) | Not used: HYG covers it | Probably public domain, but no definitive statement found | (checked) |
| **JPL Approximate Positions of the Planets**, E. M. Standish | Keplerian elements and rates: Table 1 (1800–2050); Tables 2a and 2b (3000 BC–AD 3000, with extra b, c, s, f terms for Jupiter to Neptune). Covers the Earth–Moon barycentre, not Earth itself; Pluto has been removed. | NASA/JPL, public | (checked) |
| **JPL Horizons** | Reference positions for tests; state vectors for the Orrery's Solar System preset (fetched once by a script) | Public service | (std) |
| **NASA eclipse predictions**, Fred Espenak | Lists of solar and lunar eclipses for tests and figures | "Permission is freely granted to reproduce this data when accompanied by an acknowledgment": **"Eclipse Predictions by Fred Espenak, NASA/GSFC"**. The page is dated 2010, so recheck the current terms in Stage 4. | (checked) |
| **NASA Planetary Fact Sheets** (NSSDCA) | Planet cards | Public domain (NASA) | (std) |
| **JPL Small-Body Database** query API | Semi-major axes of numbered asteroids, reduced to a histogram (only the histogram is committed) | NASA/JPL, public; credit the Minor Planet Center as the source of the orbits | (std) |
| **Solar System Scope** textures | Planet globes | **CC BY 4.0**, according to Qt's attribution page and others; confirm on solarsystemscope.com before use. Alternative: NASA imagery (public domain). | (checked, secondary sources) |
| **10-parsec sample** (Reylé et al. 2021) or HYG distances | The stellar neighbourhood figure | CDS/VizieR: free to use with citation | (verify) |
| ESO's Milky Way panorama, or Gaia's all-sky map | Optional background image for the Milky Way band | ESO: CC BY 4.0 (std). Gaia: CC BY-SA 3.0 IGO (std). | (verify) |

---

## 12. Algorithms

| Job | Method | Accuracy | Source |
|---|---|---|---|
| Calendar ↔ Julian Day | Meeus's algorithm, Julian and Gregorian calendars, astronomical year numbering | Exact | Meeus 1998, ch. 7 (std) |
| ΔT = TT − UT | About 69 s in 2026; Espenak & Meeus polynomials for historical dates, uncertain by hours in antiquity | Seconds today | Espenak & Meeus 2006 (std; verify today's value) |
| Sidereal time | IAU 1982 GMST: θ₀ = 280.46061837° + 360.98564736629° (JD − 2451545.0) + 0.000387933 T² − T³/38,710,000 | ~0.1 s | Meeus 12.4 (std) |
| Coordinate transforms | Ecliptic ↔ equatorial ↔ horizontal | Exact | Meeus ch. 13 (std) |
| Refraction | Bennett: R = 1 / tan(h + 7.31/(h + 4.4)) arcminutes, h in degrees | ~0.1′ | Bennett 1982; Meeus 16.4 (std) |
| Rise and set | h₀ = −0.567° for stars and planets, −0.833° for the Sun; the Moon's depends on its distance | ~1 minute | Meeus ch. 15 (std) |
| Precession | Vondrák, Capitaine & Wallace (2011), valid ±200,000 years | Far better than needed | *A&A* 534, A22 (std) |
| Proper motion | Linear in position | Good to ±10,000 years for most bright stars; flagged beyond | (std) |
| Nutation, aberration | Ignored (at most ~17″ and ~20″) | — | Stated in "What's simplified" |
| Sun | Low-accuracy solar coordinates | ~0.01° | Meeus ch. 25 (std) |
| Moon | Truncated ELP-2000/82 series | ~10″ in longitude, ~4″ in latitude | Meeus ch. 47 (std) |
| Planets | Standish's elements and Kepler's equation | Heliocentric longitude errors, 1800–2050: Mercury 15″, Venus 20″, Earth–Moon barycentre 20″, Mars 40″, Jupiter 400″, Saturn 600″, Uranus 50″, Neptune 10″. Over 3000 BC–AD 3000: up to 100″ for Mars, 600–2000″ for the giants. | JPL (checked) |
| Moon phases | New, quarter and full Moon times | Minutes | Meeus ch. 49 (std) |
| Eclipses | Find candidates at new and full Moon near a node; classify with γ (closest approach of the shadow axis) and u (umbra radius) | Type and time to minutes; tested against the NASA list | Meeus ch. 54 (std) |
| Kepler's equation | Newton's method with Danby's starter; hyperbolic form; safeguards near e = 1 | To 10⁻¹² rad | §7 (std) |
| Teaching integrators | Euler (energy drifts), RK4 (accurate but slowly drifting), leapfrog (kick-drift-kick, symplectic: energy error stays bounded) | — | (std) |
| Orrery integrators | Wisdom–Holman map in the WHFast style; IAS15 (adaptive 15th order, error below double-precision round-off) | — | Wisdom & Holman 1991; Rein & Tamayo 2015; Rein & Spiegel 2015 (std) |
| Sky projection | Stereographic (keeps constellation shapes); field of view from about 5° to 180° | — | (std) |
| Star brightness | Flux ∝ 10^(−0.4 m), mapped to disc size and opacity with perceptual compression, so a magnitude-6 star stays visible and Sirius doesn't swamp the screen | — | (std) |
| Star colour | B−V → temperature: T = 4600 K × [1/(0.92(B−V) + 1.7) + 1/(0.92(B−V) + 0.62)]; temperature → sRGB through a Planck spectrum and the CIE 1931 colour-matching functions (analytic fits), normalized for brightness | — | Ballesteros 2012; Wyman, Sloan & Shirley 2013 (std) |

**Testing** (in the stages that build each piece)
- Calendar and Julian-day conversions against Meeus's worked examples.
- Sidereal time and coordinates against published values, with round-trip property tests.
- Sun, Moon and planet positions against Horizons fixtures within the accuracies above.
- Eclipses: every NASA-listed eclipse from 1900 to 2100 is found, with the right type (hybrid eclipses may be called either).
- Kepler's equation: residuals below 10⁻¹² across e ∈ [0, 0.99].
- Integrators: energy and angular momentum conservation, and Kepler orbits against the analytic solution.

---

## 13. Timeline for Part I

*(std throughout)*

| Year | Event |
|---|---|
| c. 3200 BC | Newgrange's roof-box aligned to the midwinter sunrise |
| c. 2800 BC | Thuban is the pole star |
| c. 2500 BC | Stonehenge's sarsen circle, aligned to the solstices |
| 1st millennium BC | Babylonian astronomers record eclipses and use the 223-month cycle |
| c. 270 BC | Aristarchus measures the Sun and Moon and proposes a Sun-centred system |
| c. 240 BC | Eratosthenes measures Earth's circumference |
| c. 130 BC | Hipparchus: star catalogue and precession |
| c. 100 BC | The Antikythera mechanism, with its Saros dial |
| c. AD 150 | Ptolemy's *Almagest* |
| 1543 | Copernicus, *De revolutionibus* |
| 1572, 1577 | Tycho's new star and comet |
| 1582 | The Gregorian calendar |
| 1609 | Kepler's first two laws; Galileo turns a telescope to the sky (1609–10) |
| 1610 | Galileo: Jupiter's moons and the phases of Venus |
| 1619 | Kepler's third law |
| 1676 | Rømer times light with Jupiter's moons |
| 1687 | Newton's *Principia* |
| 1705 | Halley predicts his comet's return |
| 1758 | Palitzsch sees the comet on 25 December |
| 1785 | Herschel maps the Milky Way by star counts |
| 1798 | Cavendish weighs the Earth |
| 1838 | Bessel measures the first stellar parallax |
| 1846 | Neptune is found where Le Verrier predicted |
| 1866–67 | Kirkwood explains the gaps in the asteroid belt |
| 1918 | Shapley moves the Sun away from the Galaxy's centre |
| 1922, 1930 | The 88 IAU constellations and their boundaries |
| 1989 | Laskar shows the Solar System is chaotic |
| 2006 | Pluto becomes a dwarf planet |
| 2012 | Voyager 1 crosses the heliopause; the AU is defined exactly |
| 2013 | Gaia launches |
| 2017, 2019, 2025 | Interstellar visitors 1I, 2I and 3I |
| 2026 | Voyager 1 reaches one light-day (18 Nov); Saturn passes 280 known moons |

---

## 14. Glossary (Part I terms)

- **Altitude, azimuth:** height above the horizon in degrees, and compass direction.
- **AU:** the average Earth–Sun distance, 149.6 million km.
- **Barycentre:** the balance point two orbiting bodies both circle.
- **Celestial sphere, celestial poles, celestial equator:** the imaginary dome of the sky, the points it turns about, and the circle halfway between them.
- **Circumpolar:** close enough to the pole never to set.
- **Conjunction, opposition:** a planet lined up with the Sun (on the same side, or opposite, as seen from Earth).
- **Declination, right ascension:** latitude and longitude on the sky.
- **Deferent, epicycle, equant:** the parts of Ptolemy's model.
- **Eccentricity:** how stretched an ellipse is (0 = a circle).
- **Ecliptic:** the Sun's yearly path on the sky; the plane of Earth's orbit.
- **Elongation:** angle between a planet and the Sun, as seen from Earth.
- **Equinox, solstice:** the dates when day and night are equal everywhere, and when the Sun is farthest north or south.
- **Escape speed:** the speed needed never to fall back.
- **Focus:** one of the two points that define an ellipse; the Sun sits at one.
- **Light-year, parsec:** the distance light travels in a year; the distance at which Earth's orbit spans 1″ (3.26 light-years).
- **Meridian, zenith:** the north–south line through the overhead point, and the overhead point itself.
- **Node:** where a tilted orbit crosses the ecliptic.
- **Obliquity:** the tilt of Earth's axis to its orbit.
- **Parallax:** a nearby object's apparent shift when seen from two places.
- **Perihelion, aphelion (apsides):** the closest and farthest points of an orbit around the Sun.
- **Precession:** the slow wobble of Earth's axis.
- **Retrograde motion:** a planet's apparent backward loop.
- **Saros:** the 18-year eclipse cycle.
- **Sidereal, synodic:** measured against the stars, or against the Sun.
- **Tidal locking:** spinning once per orbit, so one face always points inward.
- **Umbra, penumbra:** the full and partial parts of a shadow.
- **Zodiac:** the constellations along the ecliptic.

---

## 15. Questions readers will ask

These are material for deep dives and Check yourself.

- **Why don't we feel Earth spinning?** The motion is steady. Only changes in motion are felt.
- **Why don't we fly off?** At the equator we move at 1,670 km/h, but the centripetal acceleration needed is only 0.3% of g.
- **Is the Moon falling?** Yes, all the time, and it keeps missing.
- **Why is the Moon sometimes up in the daytime?** For about half of each month it is above the horizon for part of the day.
- **Why do the planets all lie near one line in the sky?** They formed in one flat disc.
- **Is the Solar System stable for ever?** It is chaotic, but probably stable for billions of years (§9).
- **Could we see an eclipse from Mars?** Partly: Phobos is too small to cover the Sun, so it transits it.
- **Why is Polaris special, if it isn't bright?** Only because it sits near the pole, for now.

---

## Sources

**Checked on 22 Oct 2026**
- JPL Solar System Dynamics, *Approximate Positions of the Planets* (E. M. Standish): https://ssd.jpl.nasa.gov/planets/approx_pos.html
- HYG database: https://astronexus.com/hyg and https://codeberg.org/astronexus/hyg
- d3-celestial (O. Frohn): https://github.com/ofrohn/d3-celestial
- NASA Eclipse Resources page (reuse terms): https://eclipse.gsfc.nasa.gov/resource.html
- Voyager 1 at one light-day: https://earthsky.org/space/voyager-1-1-light-day-from-earth-november-17-18-2026/ and https://iflscience.com/its-official-voyager-1-will-cross-the-1-light-day-threshold-on-november-18-2026-82733
- Moon counts: Sky & Telescope, *A Guide to Planetary Satellites*, https://skyandtelescope.org/astronomy-news/solar-system/a-guide-to-planetary-satellites/, and news reports of the March 2026 announcements
- Solar System Scope texture licence (secondary): https://doc.qt.io/qt-6/qt3d-attribution-solar-system-scope.html
- Lelliott, A. & Rollnick, M. (2010). Big ideas: a review of astronomy education research 1974–2008. *IJSE* 32(13), 1771–1799. https://istardb.org/aerpublications/big-ideas-a-review-of-astronomy-education-research-1974-2008/

**Standard references (from knowledge; check details before quoting)**
- Meeus, J. (1998). *Astronomical Algorithms*, 2nd ed. Willmann-Bell.
- Vondrák, J., Capitaine, N. & Wallace, P. (2011). New precession expressions, valid for long time intervals. *A&A* 534, A22.
- Espenak, F. & Meeus, J. (2006). *Five Millennium Canon of Solar Eclipses: −1999 to +3000*. NASA/TP-2006-214141.
- Danby, J. M. A. (1988). *Fundamentals of Celestial Mechanics*, 2nd ed. Willmann-Bell.
- Wisdom, J. & Holman, M. (1991). Symplectic maps for the N-body problem. *AJ* 102, 1528.
- Rein, H. & Tamayo, D. (2015). WHFast. *MNRAS* 452, 376.
- Rein, H. & Spiegel, D. S. (2015). IAS15. *MNRAS* 446, 1424.
- Bennett, G. G. (1982). The calculation of astronomical refraction in marine navigation. *J. Navigation* 35, 255.
- Ballesteros, F. J. (2012). New insights into black bodies. *EPL* 97, 34008.
- Wyman, C., Sloan, P.-P. & Shirley, P. (2013). Simple analytic approximations to the CIE XYZ colour matching functions. *JCGT* 2(2).
- Reylé, C. et al. (2021). The 10 parsec sample in the Gaia era. *A&A* 650, A201.
- Gaia Collaboration, Vallenari, A. et al. (2023). Gaia Data Release 3. *A&A* 674, A1.
- GRAVITY Collaboration (2019) *A&A* 625, L10; (2021) *A&A* 647, A59.
- Hayashi, C. (1981). *Prog. Theor. Phys. Suppl.* 70, 35.
- Tsiganis, K. et al. (2005). *Nature* 435, 459. Walsh, K. J. et al. (2011). *Nature* 475, 206.
- Laskar, J. (1989). *Nature* 338, 237. Laskar, J. & Gastineau, M. (2009). *Nature* 459, 817.
- Hays, J. D., Imbrie, J. & Shackleton, N. J. (1976). *Science* 194, 1121.
- Stephenson, F. R., Morrison, L. V. & Hohenkerk, C. Y. (2016). *Proc. R. Soc. A* 472, 20160404.
- Peale, S. J., Cassen, P. & Reynolds, R. T. (1979). *Science* 203, 892.
- Freeth, T. et al. (2006). *Nature* 444, 587.
- Connelly, J. N. et al. (2012). *Science* 338, 651.
- Comins, N. F. (2001). *Heavenly Errors*. Columbia University Press.
- Plummer, J. D. (2014). Spatial thinking as the dimension of progress in an astronomy learning progression. *Studies in Science Education* 50(1), 1–45.
- Bailey, J. M. & Slater, T. F. (2003). A review of astronomy education research. *Astronomy Education Review* 2(2), 20–45.
- NASA Planetary Fact Sheets: https://nssdc.gsfc.nasa.gov/planetary/factsheet/
- JPL Horizons: https://ssd.jpl.nasa.gov/horizons/
