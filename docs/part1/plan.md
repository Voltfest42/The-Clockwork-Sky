# Part I plan: The Clockwork

*Drafted 22 Oct 2026 (Stage 0). Part of the [master plan](../plan.md). The facts, data, licences and sources are in [research.md](research.md).*

## Status

**In progress.** Part I is built in Stages 1–8 (§10). Stage 1 (Foundations) and Stage 2 (Chapter 1 and the 3D basics) are done (22 Oct 2026; details in the master plan's Status). Next: Stage 3, Chapter 2 and the sky view.

---

## 1. What Part I does

**Level:** no background needed. **Maths:** arithmetic, ratios and powers of ten. The Toolkit covers the rest (§6).

**The arc:**
1. The sky as you see it (Chapters 2–4).
2. The sky as a machine (5–6).
3. The machine's law (7).
4. The machine's parts (8).
5. Beyond the machine: the stars are suns (9).

Chapter 1 sets the scale for all of it.

**How do we know?** Everything in Part I was worked out by people measuring angles and times, first with their eyes and later with telescopes. The figures let readers make the same measurements: the angle of Venus from the Sun, the period of Io, the shift of a nearby star.

**By the end of Part I, a reader can explain:**
- why the stars turn overhead, and how the sky depends on where you are and the time of year;
- why we have seasons, and why distance from the Sun isn't the reason;
- why the Moon has phases, and why eclipses happen only in some months;
- why planets sometimes move backward, and how that led to a Sun-centred system;
- Kepler's three laws, and how to read a planet's year from its distance;
- why an orbit is a fall that keeps missing, and how a computer calculates one;
- how to weigh the Sun, Jupiter or Earth from an orbit;
- why there are two tides a day;
- what's in the Solar System, and roughly how it formed;
- how we measure the distance to a star, and where we are in the Milky Way.

---

## 2. The landing page and the Part I page

**Landing page (the whole course)**
- **Hook:** "On Christmas night 1758, Johann Palitzsch, a farmer near Dresden, found a faint smudge in his telescope. Fifty-three years earlier Edmond Halley had predicted that a comet would come back, and he had died sixteen years before it did. The sky had become a machine you could calculate." That sets up the course's title.
- **The three parts as zoom levels:** the Solar System, the stars, and the inside of stars and what they leave behind. Each has a level, the maths needed and a start link.
- **How to use the figures**, readable in 30 seconds: drag, scrub time, step, reset, "Try this", and the "not to scale" tag.
- **Where to start:** Part I if you're new to astronomy; Part II if you know the Solar System; Part III if you know some physics.

**Part I page:** the level and maths, the outcomes above, the chapter list with reading progress, about 20–30 minutes per chapter, and the Orrery at the end.

---

## 3. Recurring elements

- **Your place and time.** Every sky figure works for any place on Earth and any date from 3000 BC to AD 3000.
  - The default place is **London (51.5° N)** until the reader picks another (open question, §12).
  - A city list spans both hemispheres: Tromsø, Stockholm, London, New York, Cairo, Singapore, Nairobi, Sydney, Ushuaia, plus the North Pole, the equator and the South Pole.
  - Readers can enter a latitude and longitude, or use "Use my location", which asks permission and stays in the browser.
  - The default time is now.
- **The sky view.** One planetarium used throughout Chapters 2–5 and 9. It is always night-dark.
- **The Sun–Earth–Moon scene.** One 3D scene used for the seasons, the phases and eclipses (Chapters 3–4). It is always paired with the view from the ground, linked so that moving one moves the other.
- **The orbit view and the n-body engine.** The same code draws Kepler's ellipses (Chapter 6), runs Newton's cannon (7), moves Jupiter's moons (8) and powers the Orrery.
- **The observers.** The history is told through the people who made the measurements: Aristarchus, Eratosthenes, Hipparchus, Ptolemy, Copernicus, Tycho, Kepler, Galileo, Newton, Halley, Bessel. A timeline appears in Chapters 5 and 7 and on the About page.
- **Both hemispheres.** Examples and Check yourself questions use northern and southern places, so seasons and pole stars aren't northern-only.

---

## 4. Chapters, sections and figures

Each section is a few short paragraphs, usually with one figure. ★ marks the key figures. *(stretch)* marks figures built only if time allows. Every chapter ends with **Check yourself**; examples are given for each.

### Chapter 1 · A sense of scale
*Builds on: nothing. Toolkit: Powers of ten.*

| § | Content | Figure |
|---|---|---|
| 1.1 | **Ten times bigger, again and again.** Scientific notation as a zoom: from a person to the Milky Way in 21 steps of ×10. | ★ **1.1 The zoom.** A continuous zoom from 1 m to 10²¹ m with real objects drawn at their true sizes and spacing. A ×10 counter. Click any object for its size in metres, in kilometres and in Earths. |
| 1.2 | **A Solar System on a football pitch.** Scale models: if the Sun is a 10 cm grapefruit, Earth is a grain of sand 11 m away, Neptune is 323 m away, and the nearest star is a cherry 2,900 km away. Space is mostly empty. | ★ **1.2 Build a scale model.** Choose what the Sun is (a marble, a grapefruit, a beach ball, a house). See each planet as an everyday object and its distance in steps, football pitches or kilometres, and where Proxima Centauri would be. |
| 1.3 | **Light as a measuring stick.** Light-seconds, light-minutes, light-hours and light-years. Looking out is looking back in time. Voyager 1 reaches one light-day from Earth on 18 November 2026, the first spacecraft to get that far (set the tense by when the chapter is written). | **1.3 Light's race.** A pulse of light leaves the Sun and passes the planets and Voyager 1 at real speed or sped up, then (very sped up) reaches Proxima Centauri. Travel times are shown at each stop. |
| — | **Where we're going.** The three parts as three zoom levels. | Links to the parts |

*Check yourself:* How many Earths fit across the Sun? (About 109.) If Earth were 1 m from the Sun, how far would Neptune be? (30 m.) If the Sun vanished, when would we notice? (After about 8 minutes, the light's travel time; gravity's change travels at the same speed.)

### Chapter 2 · The turning sky
*Builds on: Chapter 1. Toolkit: Angles in the sky.*

| § | Content | Figure |
|---|---|---|
| 2.1 | **The sky as a dome.** The celestial sphere: the stars are too far away to judge depth, so they look painted on a dome, the original skybox. Horizon, zenith, meridian; altitude and azimuth; measuring angles with your hand. | ★ **2.1 The sky tonight.** The planetarium for your place and time: about 9,000 naked-eye stars in their true colours and brightness, constellation figures and names, the Sun, the Moon and planets, the Milky Way band. Drag to look around, zoom, switch lines, labels and grids on and off, change the time. |
| 2.2 | **Everything turns about the pole.** Stars rise in the east and set in the west, circling the celestial poles. Some never set. The sky turns because Earth spins. | **2.2 Star trails.** Run a night with trails on and look north, south, east and west: arcs around the pole. |
| 2.3 | **Where you stand changes the sky.** The pole's height equals your latitude. At the North Pole the stars circle the horizon; at the equator they rise straight up. The southern sky has no bright pole star. | ★ **2.3 Inside and outside.** Side by side: your sky from inside the dome, and the celestial sphere from outside with a small Earth, your horizon plane and the stars' daily circles. Drag the latitude and watch which stars never set and which never rise. |
| 2.4 | **Star time and Sun time.** A day by the stars is 23 h 56 min, 4 minutes shorter than a day by the Sun, so each star rises 4 minutes earlier every night and the evening constellations change with the seasons. | **2.4 One spin, two days.** Earth from above, spinning as it orbits. Mark when a distant star, and then the Sun, return to your meridian. |
| 2.5 | **The slow wobble.** Earth's axis traces a circle every ~26,000 years. Thuban was the pole star when the pyramids were planned, Polaris is now, and Vega will be. Hipparchus found the wobble around 130 BC. | **2.5 The wandering pole.** The north celestial pole's path from 10,000 BC to AD 16,000. Drag the year and the sky view shows that year's sky, with the stars' own motions included. |
| Deep dive | Right ascension and declination; how the sky view is drawn (stereographic projection) | — |

*Check yourself:* From Sydney, can you see Polaris? (No.) A star rises at 22:00 tonight; when does it rise a month from now? (About 20:00.) *Interactive:* set your latitude so that the North Star sits on the horizon. (The equator.)

### Chapter 3 · The Sun's year
*Builds on: Chapter 2.*

| § | Content | Figure |
|---|---|---|
| 3.1 | **The Sun's path among the stars.** Over a year the Sun moves about 1° a day along the ecliptic, through the zodiac, because Earth goes round it. By the official boundaries there are 13 zodiac constellations, including Ophiuchus. | **3.1 The Sun's year.** The sky view with daylight switched off: the Sun's position against the stars, day by day, and the constellation it is in today. |
| 3.2 | **Why we have seasons.** The tilt, not the distance. Earth is closest to the Sun in early January and gets about 7% more sunlight then, during northern winter. The tilt changes how high the Sun climbs and how long it stays up, and so how much sunlight each square metre gets. | ★ **3.2 The seasons machine.** Earth circles the Sun in 3D with its axis tilted 23.4°, and your latitude marked. *Predict first:* "When is Earth closest to the Sun?" Panels show noon Sun height, day length and sunlight per square metre through the year, plus the same beam falling on flat and slanted ground. Tilt slider from 0° (no seasons) to 98° (Uranus); a distance switch shows the small 7% swing and its timing; a hemisphere switch. |
| 3.3 | **Solstices, equinoxes and the midnight Sun.** The Sun's daily path changes through the year: high and long in summer, low and short in winter. The sunrise point slides along the horizon, and monuments mark it (Stonehenge, Newgrange). Polar day and night lie beyond the polar circles. | **3.3 The Sun's daily path.** The Sun's arc across your sky on any date; sunrise and sunset directions through the year; above 66.6° the arcs stop crossing the horizon. The noon Sun is overhead only in the tropics, and only on some days. |
| 3.4 | **Calendars.** The year is 365.2422 days. Julian leap years overshoot by a day every 128 years; Gregorian rules (1582) by a day in about 3,200. Sweden once had a 30 February (1712). | **3.4 Calendar drift.** How far the calendar slips against the equinox over 2,000 years with no leap years, with Julian rules and with Gregorian rules. |
| 3.5 | *(stretch)* **The analemma.** Photograph the Sun at the same clock time every day for a year and it traces a figure eight, from the tilt plus Earth's elliptical orbit. | *(stretch)* **3.5 Build the analemma**, with switches for the tilt and the ellipse |
| Deep dive | Milankovitch cycles: the tilt, the wobble and the orbit's shape over tens of thousands of years, and the ice ages | A small chart |

*Check yourself:* When is Earth closest to the Sun? (Early January.) What season is it in Sydney in December? (Summer.) Without the tilt, would there be seasons? (Almost none.) *Interactive:* set the date when the noon Sun is highest where you live.

### Chapter 4 · The Moon
*Builds on: Chapters 2 and 3.*

| § | Content | Figure |
|---|---|---|
| 4.1 | **Half lit, always.** The Sun always lights half the Moon. The phase is how much of that lit half faces us. Earth's shadow has nothing to do with it. | ★ **4.1 The phase machine.** Sun, Earth and Moon from above, with the view from Earth beside them. Drag the Moon round its orbit to see its phase, when it rises and sets (the full Moon rises at sunset) and where it is in your sky at any hour, the daytime Moon included. An "Earth's shadow" switch shows that the shadow only reaches the Moon during a lunar eclipse. *Predict first:* "Where will the Moon be at sunset in three days?" |
| 4.2 | **Two kinds of month.** The Moon circles Earth in 27.3 days relative to the stars, but new Moon to new Moon takes 29.5, the same idea as Chapter 2's two days. It moves about 13° east a day and rises about 50 minutes later. | **4.2 One orbit, two months.** The mechanism of Figure 2.4, with the Moon |
| 4.3 | **The face we always see.** The Moon spins exactly once per orbit, which is tidal locking (explained in Chapter 7). A slight rocking (libration) shows us 59% of its surface. | **4.3 Spinning or not?** A Moon that doesn't rotate against one that rotates once per orbit, seen from above and from Earth. *(stretch)* libration. |
| 4.4 | **Eclipses.** Solar and lunar. There isn't one every month because the Moon's orbit is tilted 5°, so eclipses need a new or full Moon near a node, which happens in two eclipse seasons a year. Some are total and some annular because the Moon's distance varies. The Sun is ~400 times wider than the Moon and ~390 times farther away. | ★ **4.4 Eclipse seasons.** The tilted lunar orbit in 3D with its node line. Run the year: eclipses happen only when a new or full Moon falls near a node. The year's real eclipses are listed and marked. **4.5 Shadows:** umbra and penumbra, total, annular and partial eclipses, and why the Moon turns red in Earth's shadow (drawn not to scale, and labelled). |
| 4.5 | **The Saros.** Eclipses repeat after 18 years and 11⅓ days. The Babylonians knew the cycle, and the Antikythera mechanism has a dial for it. | Narrative. *(stretch)* **4.6** a Saros series as a timeline |

*Check yourself:* What phase is the Moon in during a solar eclipse? (New.) Why isn't there an eclipse every month? (The orbit is tilted.) At about what time does the full Moon rise? (At sunset.) *Interactive:* put the Moon where it would be at first quarter.

### Chapter 5 · Wanderers
*Builds on: Chapters 2–4.*

| § | Content | Figure |
|---|---|---|
| 5.1 | **Stars that wander.** Five planets are visible to the eye. They stay near the ecliptic; Venus is the morning and evening star; Mercury never strays far from the Sun. | **5.1 A year of planets.** The sky view with the planets' tracks over a year against the stars |
| 5.2 | **Backward loops.** Every 26 months Mars stops, moves backward for about ten weeks, then carries on. It happens when Earth overtakes it. | ★ **5.2 Retrograde loops.** Split view: Earth and Mars seen from above, and Mars against the stars as seen from Earth, linked by lines of sight. Mars, Jupiter, Saturn or Venus, with real positions for any year. |
| 5.3 | **Circles on circles.** Ptolemy's model (about AD 150): a deferent, an epicycle and an equant. It predicted planets well enough for 1,400 years. A model can fit well and still be wrong. | ★ **5.3 Tune Ptolemy.** Adjust a Ptolemaic model for Mars (epicycle size, speeds, equant offset) to match its real path over 15 years. A score shows how close you get, and "best fit" shows how close Ptolemy got. |
| 5.4 | **The Sun in the middle.** Aristarchus suggested it around 270 BC; Copernicus worked it out in 1543. Retrograde loops become natural, and the order and relative distances of the planets follow from geometry. | **5.4 Measure Venus's orbit.** At greatest elongation Venus is about 46° from the Sun, and a right triangle gives its distance: 0.72 AU. Drag Venus to find the right angle. |
| 5.5 | **What Galileo saw (1610).** Jupiter's moons; a full set of Venus phases, impossible in Ptolemy's arrangement (but allowed in Tycho's); mountains on the Moon; countless stars in the Milky Way. | **5.5 Venus in two worlds.** Venus's phases and sizes under Ptolemy's arrangement and under the Sun-centred one, side by side, with Galileo's observations |
| 5.6 | **Tycho's data.** Tycho Brahe measured positions to about 1 arcminute without a telescope, at Uraniborg on Hven. His compromise model, and the data Kepler inherited. | Narrative, with the timeline |

*Check yourself:* Why does Mars sometimes move backward? (Earth is overtaking it.) What did the phases of Venus prove? (Venus orbits the Sun; they ruled out Ptolemy's arrangement, but not Tycho's.) Which planets can never be seen at midnight? (Mercury and Venus.)

### Chapter 6 · Kepler's laws
*Builds on: Chapter 5. Toolkit: Ratios and scaling.*

| § | Content | Figure |
|---|---|---|
| 6.1 | **Mars refuses a circle.** Tycho's Mars was 8 arcminutes off every circle Kepler tried. The first law (1609): orbits are ellipses with the Sun at one focus. | ★ **6.1 Draw an ellipse.** Two pins and a string, with an eccentricity slider. Real orbits drawn to scale: Earth (0.017, nearly a circle), Mars (0.09), Mercury (0.21), Halley's comet (0.97). |
| 6.2 | **Equal areas in equal times.** The second law: a planet moves fastest near the Sun and slowest far away. | ★ **6.2 Sweeping areas.** A planet sweeps wedges in equal times. Drag the eccentricity: the wedges change shape but stay equal in area. Speed readout. |
| 6.3 | **The harmonic law.** The third law (1619): P² = a³, in years and AU. | ★ **6.3 The planets on one line.** Period against distance on log–log axes: planets, dwarf planets and comets fall on one line; Jupiter's moons on a parallel line, which is the hook for Chapter 7. Drop a new planet anywhere and read its year. |
| 6.4 | **Where will the planet be?** Kepler's equation links time and position. A computer solves it by refining a guess, which is how the sky view places the planets. | *(deep dive)* **6.4 Solving Kepler's equation:** step through Newton's method on the ellipse |

*Check yourself:* A planet 4 AU from the Sun: how long is its year? (8 years.) Where does a comet move fastest? (Nearest the Sun.) *Interactive:* drag the eccentricity until the orbit looks like Halley's comet's.

### Chapter 7 · Newton's gravity
*Builds on: Chapter 6. Toolkit: Solving by stepping.*

| § | Content | Figure |
|---|---|---|
| 7.1 | **The falling Moon.** Newton's leap: the force that drops an apple also holds the Moon. The Moon is 60 Earth radii away, and it falls 1/3600 as fast as an apple: the inverse-square law. | ★ **7.1 Newton's cannon.** Fire from a mountain top at increasing speeds: the ball falls back, goes into orbit (7.9 km/s) or escapes (11.2 km/s). Computed live. Astronauts are falling too, which is why they float. |
| 7.2 | **Orbits, one step at a time.** Velocity moves the planet; gravity bends the velocity. A computer repeats this in small steps, like a game engine's physics tick. The obvious way (Euler) spirals outward; leapfrog stays on track. | ★ **7.2 Step by step.** One planet; choose the step size and the method (Euler, leapfrog, RK4). Watch the orbit drift and the energy error grow or stay bounded. The Orrery runs on this idea. |
| 7.3 | **Weighing the Sun.** Newton's version of Kepler's third law: an orbit's size and period give the mass it circles, once G is known (Cavendish, 1798). | ★ **7.3 The cosmic scale.** Pick a pair: Sun and Earth, Earth and Moon, Earth and the ISS, Jupiter and Io, Mars and Phobos, Pluto and Charon. Measure the orbit and the period on the figure, and compute the mass. |
| 7.4 | **Both bodies move.** Two bodies orbit their shared balance point, the barycentre. Earth and Moon's is inside Earth; Pluto and Charon's is in the space between them; Jupiter makes the Sun wobble around a point just outside its surface, which is how many exoplanets are found (Part II). | **7.4 The barycentre.** Two bodies and a mass-ratio slider |
| 7.5 | **Tides.** The Moon pulls the near side of Earth harder than the centre, and the centre harder than the far side, which gives two bulges. Spring and neap tides; tidal locking; the Moon receding 3.8 cm a year as Earth's day slowly lengthens. | ★ **7.5 Tide maker.** Arrows of the Moon's pull across Earth, then the same arrows minus the average pull: what's left stretches Earth. Add the Sun for spring and neap tides. |
| 7.6 | **Gravity's victories.** Halley's comet came back on schedule (1758–59); Neptune was found where the mathematics said (1846); spacecraft follow the same rules. | *(stretch)* **7.6 Get to Mars:** a Hohmann transfer, and why launch windows come every 26 months |

*Check yourself:* If the Moon were twice as far away, how would Earth's pull on it change? (A quarter as strong.) Why do astronauts on the ISS float? (They are falling around Earth; gravity there is about 90% of what it is on the ground.) Is the Moon falling? (Yes.) Why are there two tides a day, not one? (Two bulges.)

### Chapter 8 · A tour of the Solar System
*Builds on: Chapters 1 and 7.*

| § | Content | Figure |
|---|---|---|
| 8.1 | **The family portrait.** Sizes and distances: rocky planets inside, giants outside. Where everything is today. | ★ **8.1 The Solar System today.** A top-down view with today's real positions; switch between true-scale sizes and true-scale distances; click a planet to open its card. |
| 8.2 | **Rocky worlds.** Mercury, Venus (a runaway greenhouse), Earth, the Moon, Mars: atmospheres, temperatures, water. | ★ **8.2 Planet cards.** Compare any two worlds: size, gravity (your weight there), day and year (your age there), temperature, atmosphere and moons, with a 3D globe of each. |
| 8.3 | **Giants and their moons.** Jupiter; Saturn and its rings; Uranus on its side; Neptune. Moons with hidden oceans (Europa, Enceladus), Titan's lakes, and Io's volcanoes, powered by tides. | **8.3 Jupiter's clockwork moons.** The Galilean moons in their 1 : 2 : 4 resonance, integrated live. Count the orbits. |
| 8.4 | **Small worlds.** Asteroids, the Kirkwood gaps and the Trojans; the Kuiper belt and Pluto (a dwarf planet since 2006); comets and meteor showers; the Oort cloud; visitors from other stars ('Oumuamua 2017, Borisov 2019, 3I/ATLAS 2025). | ★ **8.4 Gaps in the belt.** A histogram of the known asteroids by distance from the Sun, with gaps where an asteroid's year would be a simple fraction of Jupiter's. Switch on the resonance markers. A second view shows how empty the belt really is: on average about a million kilometres between asteroids (verify). |
| 8.5 | **How it all formed.** A collapsing cloud and a spinning disc; the snow line; planetesimals; giant impacts (one made the Moon); 4.57 billion years ago, dated by meteorites; giant planets that moved. | **8.5 The snow line.** Temperature across the young disc: which materials freeze where, so rocky planets form inside and giants outside. |

*Check yourself:* Which planet has the most known moons? (Saturn, as of 2026.) Why are the giant planets far from the Sun? (Beyond the snow line there was more solid material.) Would a spacecraft have to dodge through the asteroid belt? (No: the asteroids are about a million kilometres apart on average.)

### Chapter 9 · The stars are suns
*Builds on: Chapters 1, 6 and 7.*

| § | Content | Figure |
|---|---|---|
| 9.1 | **How far is a star?** Parallax: hold up a thumb and blink. Earth's orbit is the baseline. Bessel measured 61 Cygni in 1838. The parsec. Gaia has measured parallaxes for over a billion stars. | ★ **9.1 Parallax.** Earth goes round the Sun, and a nearby star shifts against the distant ones (exaggerated, with the true angle shown). Slide the distance and measure the shift to get the distance. Real values for Proxima Centauri, Sirius, Vega and Betelgeuse. |
| 9.2 | **Our neighbours.** The stars within about 30 light-years are mostly small red dwarfs, with a few white and brown dwarfs. The Sun is brighter than most of them. | ★ **9.2 The neighbourhood.** A 3D map of the stars within 10 parsecs, coloured by type, with the Sun at the centre. Fly around; click a star. |
| 9.3 | **The Sun from far away.** From Alpha Centauri, the Sun would be one of the brightest stars in the sky; beyond about 55 light-years, too faint to see without a telescope. Brightness falls with the square of the distance, a preview of Part II. | **9.3 Move the Sun away.** The Sun's brightness compared with real stars as you move it outward |
| 9.4 | **Our place in the Milky Way.** The pale band across the sky. Herschel's star counts (1785); Shapley's globular clusters (1918) moved us off-centre. The Galaxy is about 100,000 light-years across, and the Sun takes about 230 million years to go round it. Part II starts here. | **9.4** The zoom from Figure 1.1, now from the Sun out to the whole Galaxy, plus the Milky Way band in the sky view |

*Check yourself:* A star has a parallax of 0.1″. How far away is it? (10 parsecs, about 33 light-years.) Are most nearby stars like the Sun? (No: most are red dwarfs.)

**Count:** 9 chapters, 21 key figures, about 17 smaller ones and 4 stretch figures.

---

## 5. The Orrery, version 1

The lab at the end of Part I, built in Stage 8. It can also be opened straight from Figures 7.2, 7.4 and 8.3 with a matching preset ("Open this in the Orrery").

**Presets**

| Preset | What it shows | Initial conditions |
|---|---|---|
| The Solar System today | The real thing; time-warp for centuries | JPL Horizons state vectors at a fixed epoch, fetched by a script |
| Earth and Moon | The barycentre, the month | Horizons |
| Jupiter's Galilean moons | The 1 : 2 : 4 resonance | Horizons (Jupiter-centred) |
| Sun, Jupiter and the Trojans | L4 and L5, tadpole and horseshoe orbits in the rotating frame | Built from Jupiter's orbit |
| The figure-eight | Three equal stars chasing each other on one curve | Chenciner & Montgomery (2000), Simó's numbers (std) |
| The Pythagorean problem | Masses 3, 4 and 5 released at rest at the corners of a 3-4-5 triangle: chaos, then an ejection | Burrau (1913); Szebehely & Peters (1967) (std) |
| A planet in a binary | Kepler-16, Tatooine's sky | Doyle et al. 2011 (verify) |
| TRAPPIST-1 | Seven planets in a resonant chain | Agol et al. 2021 (verify) |
| A comet meets Jupiter | Gravity assists and captures | Built from Jupiter's orbit |
| "What if Jupiter were 100 times heavier?" | The Solar System with Jupiter's mass changed: instability | Horizons, edited |

**Building a system**
- Add a body with a mass preset (Earth, Neptune, Jupiter, Sun, a red dwarf) or a typed mass.
- Set its orbit by size, shape and tilt (a, e, i and the angles) around a chosen parent, or drag its velocity arrow.
- "Make it circular" sets the circular speed for the current distance. Delete any body; undo.

**Views**
- Top-down (Canvas 2D) or 3D (Scene3D).
- Follow any body, with trails of chosen length.
- A **rotating frame** that turns with a chosen pair, which reveals the Lagrange points and horseshoe orbits.
- Time warp from real time to thousands of years per second (capped by system size).

**Readouts**
- Each body's live orbital elements and period.
- The total **energy and angular-momentum error**, with a short note on what it means.
- An event log: close encounters, collisions (bodies merge, conserving momentum) and escapes.

**Engine** (in a Web Worker; units AU, days and solar masses)
- **WHFast-style Wisdom–Holman** (Jacobi coordinates, Kepler drift by universal variables) for planetary systems with one dominant mass.
- **IAS15-style** adaptive 15th-order integrator for close encounters and chaotic few-body systems.
- **Leapfrog** for teaching.
- Chosen automatically (switching to IAS15 when bodies come close), with a manual override.

**Tests**
- Two-body orbits against Kepler's solution.
- Energy and angular momentum conservation.
- The figure-eight returns to its starting shape after one period.
- The Solar System preset against Horizons positions after 100 years.
- WH and IAS15 agree on quiet systems.

**Robustness**
- Up to ~50 bodies in version 1, with mass, distance and speed checked on entry.
- Collisions are handled, and runaway time steps are caught.
- Every preset has a reset.
- *(Stretch)* "Copy a link to this system", with the state encoded in the URL.

---

## 6. Toolkit pages for Part I

Short, one idea each, with a small figure. Chapters link to them when first needed.

| Page | Content | First needed |
|---|---|---|
| **T1 Powers of ten** | Scientific notation, multiplying and dividing powers, orders of magnitude, prefixes (kilo, mega, giga) | Chapter 1 |
| **T2 Angles in the sky** | Degrees, arcminutes and arcseconds; the hand at arm's length; the small-angle rule (size = distance × angle in radians) | Chapter 2 |
| **T3 Ratios and scaling** | What happens when you double something; square and cube laws (P² = a³); reading log–log plots | Chapter 6 |
| **T4 Solving by stepping** | Turning "how things change" into small steps; why step size matters; why some methods drift | Chapter 7 |

---

## 7. Building blocks introduced in Part I

| Component | Specification | Stage |
|---|---|---|
| **Course registry** (`site/course.ts`) | Parts, chapters (slug, number, title, blurb, sections, "Builds on", lazy MDX), Toolkit pages, labs. The sidebar, part pages, "Next chapter" and progress all read from it. | 1 |
| **Check yourself** | Multiple choice with a per-answer explanation; an interactive question type that embeds a figure in "question mode" and checks its state; results kept in local storage | 1 |
| **Scene3D** | three.js wrapper, lazy-loaded. Orbit-style camera for mouse, touch and keyboard (arrows rotate, +/− zoom); an HTML label layer projected from 3D points; theme tokens; pauses off-screen (Rulebook's `useWhenVisible`); with reduced motion, no auto-play; a text description for screen readers; resize handling | 2 |
| **Scale zoom** | Log-scale camera from 10⁰ to 10²¹ m over a catalogue of objects with real sizes and distances; wheel, slider and keyboard; labels that fade by scale | 2 |
| **Sky view** | Canvas 2D stereographic projection; stars with magnitude-based size and B−V colour; constellation lines, names and (optional) boundaries; the Milky Way outline; alt-az, equatorial and ecliptic grids; horizon and compass points; a simple twilight colour from the Sun's altitude; the Sun, the Moon (with phase) and planets; drag, zoom, keyboard; overlays for trails, paths and markers; an "outside view" mode drawn with Scene3D | 3 |
| **Time control** | Now, a date-time field (with BC dates), play and pause, speed (×1 to a year per second), step by sidereal day, solar day, month or year; shared by all figures on a page | 3 |
| **Place picker** | City list, latitude and longitude, optional geolocation; remembered in the browser | 3 |
| **Sun–Earth–Moon scene** | Scene3D with a lit, textured, tilted Earth, a Moon lit by the Sun, camera presets (above, side, from the surface), and a linked inset of the ground view | 4 |
| **Orbit view** | Ellipses with foci, apsides and swept areas, trails, drag handles; 2D in SVG or Canvas, 3D in Scene3D; rotating frame | 5 |
| **Charts** | Rulebook's charts plus log axes and a histogram | 5 |
| **n-body worker** | Typed-array state, a message protocol (load, run, pause, step, edit), diagnostics, integrators | 6 (teaching), 8 (WH, IAS15) |
| **Planet globe** | A textured, lit sphere with tilt and rotation; rings for Saturn | 7 |

---

## 8. Data pipeline

Scripts in `scripts/` download the raw data once into `scripts/.cache/` (not committed) and write compact files to `src/data/`, with a header noting source and licence.

| Script | Output | Size target | Stage |
|---|---|---|---|
| `build-stars.ts` | Stars to V ≈ 6.5 from HYG v4.2: RA, Dec, proper motion, V, B−V, distance, HIP, designations, proper names, constellation. **CC BY-SA 4.0.** | ≤ 250 kB gzipped | 3 |
| `build-constellations.ts` | Lines, boundaries and the Milky Way outline from d3-celestial (**BSD 3-Clause**), simplified | ≤ 150 kB gzipped | 3 |
| `fetch-horizons.ts` | Reference positions for the ephemeris tests (Sun, Moon, planets over 1800–2050, plus some ancient dates), and Orrery state vectors | Fixtures in `tests/fixtures/` | 3, 8 |
| `fetch-eclipses.ts` | NASA eclipse list, 1900–2100 (type, date, time), for tests and figures, with Espenak's credit | Small | 4 |
| `build-asteroids.ts` | Histogram of semi-major axes of numbered asteroids (JPL SBDB) | < 10 kB | 7 |
| `build-neighbours.ts` | Stars within 10 pc (HYG distances, checked against the 10-parsec sample) | < 20 kB | 7 |
| Planet textures | Solar System Scope (**CC BY 4.0**), resized to 1–2k, WebP | ≤ 1.5 MB total, loaded on demand | 7 |

Every source and licence goes on the About page and in `src/data/README.md`.

---

## 9. Faithfulness: what's exact and what's simplified

| Figure or engine | Plan |
|---|---|
| Star positions | HYG (Hipparcos-based) positions with linear proper motion; precession by Vondrák et al. (2011); nutation and aberration ignored (under 20″) |
| Sun, Moon, planets | Meeus's solar formula (~0.01°), Meeus's truncated ELP-2000/82 lunar series (~10″), Standish's planetary elements (errors per JPL's table: up to 10′ for Saturn in 1800–2050, more in antiquity). Planets are hidden outside 3000 BC–AD 3000, with a note. |
| The sky's look | Stereographic projection; brightness mapped for the eye; colours from B−V; refraction by Bennett's formula; a simple twilight colour, not a physical atmosphere; no light pollution or extinction |
| Seasons | Exact geometry; sunlight per square metre at the top of the atmosphere. Not temperature: no climate, oceans or seasonal lag. |
| Phases and eclipses | Real geometry from the lunar model. Eclipses found by Meeus's method and checked against NASA's list. Shadow cones drawn not to scale, and labelled. |
| Retrograde loops | Real positions from the planetary model |
| Ptolemy | Deferent, epicycle and equant in the ecliptic plane only (no latitude theory); parameters tunable; scored against real positions |
| Kepler's laws | Exact two-body ellipses |
| Newton's cannon | Point-mass Earth, no air, no rotation |
| Step by step | Exactly the methods named |
| The cosmic scale | The exact formula; readers measure from the figure, so the answer carries their measurement error, which is the point |
| Tides | The equilibrium tide (static bulges). Real oceans respond dynamically; the text says so. |
| Planet globes | Real imagery, tilts and rotation rates; atmospheres not modelled |
| Jupiter's moons | n-body integration of Jupiter and its four large moons from Horizons; no Sun and no oblateness (labelled) |
| Asteroid belt | Real semi-major axes of the numbered asteroids |
| Snow line | The textbook disc temperature law T ∝ r^(−1/2) (Hayashi 1981): a model, and labelled |
| Parallax | Angles exaggerated on screen, with the true values shown |
| The neighbourhood | Real positions and types from the catalogue |
| The Orrery | Real integrators and Newtonian gravity for point masses; collisions merge bodies; no tides and no relativity (those come in version 2) |

Every figure that simplifies gets a short **"What's simplified here?"** note, collected on the About page.

---

## 10. Stages 1–8

Each stage is one session and ends as described in the master plan (§11): tests, Status update, commit, push, deploy, stop.

| Stage | Focus | Done when |
|---|---|---|
| **1** | **Foundations.** See below. | sky.moving-parts.dev serves the landing page and Part I's structure; unit and end-to-end tests pass; the repository is pushed |
| **2** | **Chapter 1 and the 3D basics.** Scene3D; the scale zoom; Figures 1.1–1.3; Toolkit T1 and T2; the landing page's content (hook, the parts as zoom levels, how to use the figures); Check yourself for Chapter 1. | Chapter 1, two Toolkit pages and the landing page are live |
| **3** | **Chapter 2 and the sky view.** See below. | Chapter 2 is live; the ephemeris tests pass |
| **4** | **Chapters 3 and 4.** The Sun–Earth–Moon scene; sunlight per square metre, day length, noon height and sunrise direction; phases (Meeus ch. 49); the eclipse finder (Meeus ch. 54) tested against NASA's list for 1900–2100; Figures 3.1–3.4 and 4.1–4.5 (stretch: 3.5, 4.6); Check yourself. | Chapters 3 and 4 are live; the eclipse tests pass |
| **5** | **Chapters 5 and 6.** The orbit view; the Ptolemy model with its fit score; Figures 5.1–5.5 and 6.1–6.4; the history timeline; Toolkit T3; Check yourself. | Chapters 5 and 6 are live |
| **6** | **Chapter 7.** The n-body core (typed arrays, worker protocol, Euler, RK4 and leapfrog, energy and angular-momentum diagnostics); Figures 7.1–7.5 (stretch: 7.6); Toolkit T4; Check yourself. | Chapter 7 is live; the integrator tests pass |
| **7** | **Chapters 8 and 9.** Planet globes and textures; the planet-card data file (with "as of" dates); the Solar System today; the Galilean resonance; the asteroid histogram; the snow line; parallax; the 3D neighbourhood; moving the Sun away; the zoom out to the Galaxy; Check yourself. | All of Part I's chapters are live |
| **8** | **The Orrery v1 and Part I polish.** See below. | Part I is complete and listed on moving-parts.dev |

**Stage 1 · Foundations**
- `git init`, and (with your OK) create the GitHub repository and push.
- Copy the scaffold from Rulebook and rename it: configs, site shell, figure frame and player, charts, styles, test setup, end-to-end helpers, infrastructure.
- Build the course registry, sidebar grouped by part, part pages, Toolkit and Labs index pages, Glossary and About skeletons, "coming soon" chapter pages, and the Check yourself component.
- Core code with tests: units and constants; vectors and angles; Julian dates and calendars; ΔT; sidereal time; coordinate transforms. Tests use Meeus's worked examples and round-trip properties.
- The CDK stack `ClockworkSkySite` with a certificate and alias for sky.moving-parts.dev, and a first deploy.
- README.

**Stage 3 · Chapter 2 and the sky view**
- Star and constellation data scripts; star brightness and colour.
- Precession (Vondrák) and proper motion.
- Sun (Meeus ch. 25), Moon (Meeus ch. 47) and planets (Standish, with Kepler's equation), tested against Horizons fixtures.
- The sky view with its outside mode; the time control and place picker.
- Figures 2.1–2.5; Toolkit links; Check yourself.
- *If it overruns:* the Moon and planets move to Stage 4, and the sky view shows them from then on.

**Stage 8 · The Orrery v1 and Part I polish**
- The WHFast-style and IAS15-style integrators with tests.
- The Orrery: presets (with the Horizons script), editor, views, readouts and events.
- Polish:
  - an accuracy and copy pass with your review;
  - responsive and cross-browser checks;
  - accessibility in both themes and by keyboard;
  - end-to-end tests for every Part I page and the Orrery;
  - performance: bundle sizes, lazy loading, and a mid-range phone profile with CPU throttling.
- In the Moving Parts project, turn the card into a link (tag "Part I of III", contents "9 chapters · The Orrery"), then deploy both.

**If a stage overruns:** Stages 3 (the sky view and ephemerides) and 8 (the Orrery's integrators) carry the most risk. Stage 3 has the fallback above. In Stage 8, the IAS15-style integrator alone can run every preset (slower on long runs, but accurate), so the WHFast-style one can wait for the Orrery's version 2. Stretch figures wait until Stage 8 is done.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| The sky view is slow on phones | Canvas 2D for ~9,000 stars (cheap), WebGL only in 3D scenes, redraw only on change, tested under a throttled mid-range phone profile |
| Bugs in time and dates (time zones, daylight saving, BC years, leap seconds) | Julian Date (TT) internally, our own calendar code, Meeus's worked examples and Horizons fixtures in the tests, an explicit time zone shown in every time control |
| Ephemeris errors | Each model tested against Horizons within its published accuracy; planets hidden outside their valid range |
| Licence obligations | HYG's derived file shared under CC BY-SA 4.0 with attribution; the BSD notice for d3-celestial; Espenak's credit line; texture credits; all listed on the About page and in `src/data/README.md` |
| Beginners lost in 3D | The view from space always paired with the view from the ground, camera presets, a "reset view" button, and figures that start simple and reveal options gradually |
| Readers in the southern hemisphere left out | Every sky figure works at any latitude; southern examples throughout |
| Privacy | Geolocation only on request, never sent anywhere; the place is remembered only in the browser |
| Too much for Part I | Stretch figures marked; Chapter 9's figures can shrink to parallax plus the neighbourhood; the Orrery's preset list can shrink |

---

## 12. Open questions (my defaults apply unless you say otherwise)

1. **Default place:** London (51.5° N) until the reader picks one. Alternatives: ask on first visit, or pick another city.
2. **Planet textures:** Solar System Scope (CC BY 4.0), since one consistent set looks better. The alternative is NASA's public-domain imagery.
3. **Opening the Orrery from chapters:** figures in Chapters 7 and 8 get an "Open this in the Orrery" link with a matching preset. *(My default: yes.)*
