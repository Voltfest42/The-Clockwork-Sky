# Part III plan: The Engine Room

*Drafted 4 Nov 2026 (Stage 17). Part of the [master plan](../plan.md). The facts, data, licences and sources are in [research.md](research.md). It follows the Part I and II plans ([part1/plan.md](../part1/plan.md), [part2/plan.md](../part2/plan.md)) in shape and conventions, and builds on what they built.*

## Status

**Planned** (4 Nov 2026, Stage 17). The chapters' sections, "Builds on" lines and Toolkit links are in the course registry, so the "coming soon" pages show them. Nothing in §4–§10 is built yet. **Agreed** (4 Nov 2026): the defaults for all eleven open questions in §13 stand. Next: Stage 18, Chapter 20 and Toolkit T8, T9 and T11.

---

## 1. What Part III does

**Level:** advanced; first-year university physics, or Parts I and II and a willingness to meet calculus. **Maths:** real equations, derivatives and integrals, differential equations solved by stepping, and a little quantum mechanics and relativity, each in a short equation box with the derivation in a deep dive. The Toolkit's five Part III pages support them (§7). The figures still carry the ideas, so a reader who skips the boxes can follow.

**The thread: the limits.** Part I's orbits held gravity off by sideways speed, Part II's stars by the pressure of hot gas. Part III opens the machinery that keeps a star hot, then follows gravity to the places where ordinary pressure gives out: electrons that can't be packed closer, neutrons that can't either, and beyond them nothing at all. The last chapters take gravity's limits to pairs and crowds of stars: Roche lobes that let stars trade mass, orbits that shrink by radiating gravitational waves, clusters that evaporate, and a Galaxy whose outer stars move too fast for what we can see.

**How do we know? From models, checked.** Part III builds physical models from the equations in the reader's browser and holds each against a measurement: the Sun's insides against helioseismology and its neutrinos, white dwarfs against Sirius B's mass and radius, nuclear rates against the elements' abundances, neutron stars against pulsar timing and NICER, black holes against S2's orbit and the Event Horizon Telescope, merging pairs against LIGO's chirps, and the Galaxy against Gaia's stars. Where models disagree or data are argued over (common-envelope efficiency, the neutron star's radius, the Milky Way's dark halo), the figures show the range, not a single answer.

**The arc:**
1. Inside a star: pressure, the way energy gets out, and the nuclear furnace (Chapters 20–22).
2. The making of the elements (23).
3. The limits: degenerate matter, explosions, neutron stars and black holes (24–27).
4. Pairs: mass transfer and gravitational waves (28–29).
5. Crowds: clusters, the Milky Way and colliding galaxies (30–31).

Then both labs, upgraded: the Star Forge makes pairs of stars, the Orrery runs clusters, colliding galaxies and the planets' fate as the Sun dies.

**By the end of Part III, a reader can explain:**
- why a star's centre must be millions of degrees hot, and why a star heats up as it loses energy;
- how energy gets out of a star, and why its mass sets how brightly it shines;
- how stars fuse at "only" millions of degrees, and how they burn hydrogen, helium and heavier fuels;
- where the chemical elements were made, from carbon to gold and uranium;
- what holds up a white dwarf, and why none can be much heavier than 1.4 Suns;
- how massive stars collapse and explode, and what makes a supernova shine for months;
- what neutron stars are made of, and why pulsars are nature's best clocks;
- what happens near a black hole, and why black holes power the brightest things known;
- why stars in pairs lead strange lives, and where cataclysmic variables, X-ray binaries and merging black holes come from;
- what gravitational waves are, and what hundreds of collisions have taught us;
- how star clusters dissolve, how the Milky Way turns, and why we think most of its mass is dark;
- what happens when galaxies collide, and whether the Milky Way will merge with Andromeda.

---

## 2. The Part III page and the start page

**Part III page:** the level and the maths, the outcomes above, the chapter list with reading progress, about 30–40 minutes per chapter, and both labs' version 2 at the end. Chapter 31 is marked optional on its card. Its "Coming soon" card becomes a link when every chapter is written (`partReady`), and the labs' version 2 shows on the Labs page when built.

**Start page:** nothing changes until Part III is out. Then its card and "Where to start" become links by themselves; the hook stays Part I's.

---

## 3. Recurring elements

- **Equation boxes.** Part II's algebra boxes (`Callout kind="maths"`) grow into equation boxes with derivatives and integrals; derivations sit in deep dives. The main ones: hydrostatic equilibrium and mass continuity; the virial theorem; the Kelvin–Helmholtz time; the Lane–Emden equation; radiative diffusion; the Schwarzschild criterion; the Gamow energy and peak; degeneracy pressure and the Chandrasekhar mass; the TOV equation; spin-down (B, τ, Ė); the Schwarzschild radius and effective potential; the Eddington luminosity; the Roche potential and Eggleton's lobe; a ∝ (M₁M₂)⁻² for conservative transfer; Peters' equations and the chirp mass; the relaxation time; v² = GM(r)/r; Kepler's third law for S2.
- **The core's map.** Part III's recurring diagram, as the HR diagram was Part II's: central density against central temperature, on log axes, with the regions where gas pressure, radiation pressure, non-relativistic and relativistic degeneracy dominate, the lines where each fuel ignites, and the regions of pair instability and photodisintegration, all computed from the equations of state. A star's core moves along it as it contracts (Eddington's standard model gives each mass a line of slope 3). It appears in Chapter 20 (contraction heats the core), 22 (ignition and the last days of a massive star), 24 (the degeneracy line; why light stars become white dwarfs and the Chandrasekhar mass) and 25 (pair instability and collapse). Its axes carry arrows ("denser ↑", "hotter →") and its regions are named in text as well as colour.
- **The profile plot.** Quantities against radius or mass inside a star (temperature, density, pressure, luminosity, the mass inside, the gradients), linear or log, with Model S as the Sun's reference; used in Chapters 20, 21, 24 and 26.
- **The chart of nuclides.** Every known nuclide by neutrons and protons, coloured by half-life or decay mode, with the valley of stability and the magic numbers; reactions and neutron-capture paths are layers on it (Chapters 22 and 23).
- **The potential view.** A potential as contours and as a 3D surface (Scene3D): the Roche potential (Chapter 28), a cluster in the Galaxy's tide (30); a 1D effective-potential curve for orbits near a black hole (27).
- **The particle view.** WebGL points for up to ~100,000 stars, coloured by origin or speed, with a keyboard camera and a text description (Chapters 30 and 31, and the Orrery's cluster and galaxy modes).
- **Game-dev analogies** where they fit: radiative diffusion as subsurface scattering, light random-walking through skin or wax (21.1); the shooting method as aiming a projectile and correcting by the miss (T10, 21.4); the core's map as a phase diagram, like water's (20, 22); a pulsar as a rotating cone light (26.3); the effective potential as a heightmap a marble rolls on (27.1); the Roche lobes as terrain with a mountain pass at L1 (28.1); BSE as a state machine of a pair's phases (28); the chirp as procedural audio (29.3); N² gravity as a particle system without a spatial grid (30.1); Toomre's test particles as effects particles that follow a physics proxy without pushing back (31.1); *(stretch)* the ray-traced black hole as a fragment shader marching rays (27.3).
- **"Open this in the Orrery" and "Open this in the Star Forge"** on figures that are small versions of the labs: 27.1 and 30.5 (the Orrery's general relativity), 30.1 (cluster mode), 31.1 (galaxy mode); 28.3 and 28.4 (the Forge's binaries). Part II's Figure 17.2 (the Sun's life) gains a link to the Orrery's "the Sun's death" when it is built.
- **Dated facts.** The merger census and its count, the pulsar count, the magnetar count, NICER's radii, T Coronae Borealis, LVK's next run, Gaia's releases, the Milky Way–Andromeda odds, the rotation-curve debate and record holders (the heaviest merger, the fastest pulsar, the heaviest white dwarf) live in `src/data/`, registered in `asOf.ts` (§9). S2's next pericentre is computed from today in `Dated.tsx`, never written as a date.

---

## 4. Chapters, sections and figures

Each section is a few short paragraphs, usually with one figure. ★ marks the key figures; *(stretch)* marks figures built only if time allows. Every chapter ends with **Check yourself**, with examples below. Every figure has its caption, legend, "Try this", reset and description, and a "What's simplified here?" note when it simplifies (§10).

### Chapter 20 · Holding a star up
*Builds on: Chapters 7, 15, 16 and 17. Toolkit: Rates of change; Adding up small pieces; Estimating with orders of magnitude.*

| § | Content | Figure |
|---|---|---|
| 20.1 | **Weight and pressure.** Every layer of a star carries the weight of the layers above it, and the pressure difference across it holds it up: dP/dr = −Gm(r)ρ/r², dm/dr = 4πr²ρ. Without pressure the Sun would fall in on itself in about 30 minutes. A rough sum says the centre needs about 10¹⁵ Pa and 10⁷ K just to hold the weight, with no nuclear physics at all: the Sun is hot inside because gravity squeezes it. | **20.1 How hot must the centre be?** A star as nested shells; pick a shell and see the weight above it against the pressure difference across it. Sliders for mass and radius give the estimated central pressure and temperature beside the true values for the Sun (Model S), a red dwarf, Sirius A and Jupiter, where the estimate fails (it is cold and degenerate: Chapter 24). |
| 20.2 | **Losing energy, getting hotter.** The virial theorem: for a star in balance, twice its thermal energy equals minus its gravitational energy, so its total energy is negative. A star that radiates loses energy, shrinks and heats up: half of the energy its gravity releases warms it, half escapes as light. This is how protostars reach ignition (Part II, Chapter 16), and how a satellite with air drag speeds up (Part I). | ★ **20.2 The star that heats as it cools.** *Predict first:* "A ball of gas with no fuel shines. Does it cool down or heat up?" A contracting polytrope radiating: bars for gravitational, thermal and radiated energy, its radius, central temperature and luminosity against time; its core climbing its line on the core's map (the map's first appearance). Ends at hydrogen ignition, or at degeneracy for a ball below 0.08 M☉. |
| 20.3 | **Kelvin's clock.** The same theorem gave the 19th century its age of the Sun: shrinking alone could power it for about 30 million years (GM²/RL). Kelvin held to tens of millions; Darwin's geology wanted hundreds; radioactivity and then Eddington's "subatomic energy" (1920) ended the quarrel in the geologists' favour. | Narrative, with the timeline (`only={[20]}`) and an equation box for the Kelvin–Helmholtz time |
| 20.4 | **Why clouds make many stars.** Jeans's criterion falls out of the virial theorem (Part II, Chapter 16). A cold cloud stays cold as it collapses, so its Jeans mass falls and it breaks into ever smaller pieces until the fragments trap their own heat: the opacity limit, about a hundredth of a solar mass. | **20.3 Fragmentation.** The Jeans mass against density for a collapsing cloud at 10 K: fragments within fragments, drawn as a tree, until the gas turns opaque; where brown dwarfs and free-floating planets fit. |
| 20.5 | **A star from one equation.** If pressure follows a power of density (P = Kρ^(1+1/n)), the structure equations become one, the Lane–Emden equation, solved by stepping out from the centre (Toolkit: Solving by stepping). n = 1.5 is a fully convective star or a cold white dwarf; n = 3 is Eddington's standard model. The Sun is close to n = 3: centre 76 g/cm³ and 12 million K, against the real 150 g/cm³ and 15.7 million K. | ★ **20.4 Lane–Emden solver.** Choose n from 0 to 5; watch the solver step out from the centre to the surface (with each step shown on request); density, pressure and mass profiles in the profile plot, scaled to any mass and radius; the analytic solutions for n = 0, 1 and 5 overlaid; the Sun's real profile from Model S beside the polytrope. n = 5 never reaches the surface. |
| Deep dive | Eddington's standard model and the quartic: radiation's share of the pressure grows with mass (0.04% in the Sun, about 40% at 100 M☉), which is why stars much heavier than a hundred Suns are rare and unstable | — |

*Check yourself:* Why is the Sun's centre so hot? (Gravity's squeeze needs that pressure; fusion only pays for the light it loses.) A star with no fuel keeps shining: does it cool or heat up? (It heats up, by shrinking.) How long could gravity alone power the Sun? (About 30 million years, far too short for geology.) Which polytrope is a fully convective star? (n = 1.5.) *Interactive:* in Figure 20.4, find the index n whose star has the Sun's central density when given the Sun's mass and radius (about 3.3; the accepted range from the solver).

### Chapter 21 · Getting the energy out
*Builds on: Chapters 11, 14, 15 and 20. Toolkit: Differential equations.*

| § | Content | Figure |
|---|---|---|
| 21.1 | **A photon's random walk.** Light in the Sun's interior travels a fraction of a millimetre to a few centimetres before it is absorbed and given out again in a random direction. After N steps it has gone only √N steps' worth, so the energy takes tens to hundreds of thousands of years to diffuse out; the 8 minutes is only the last leg. Subsurface scattering in skin and wax, which game engines model as diffusion, is the same physics. | ★ **21.1 The random walk.** A seeded random walk through a slab, step by step, then thousands at once: the distance gone grows as √N. The Sun's mean free path at each depth from Model S's density and opacity; the escape time added up shell by shell, with the published range of estimates. |
| 21.2 | **What blocks the light.** Opacity: free electrons scatter light (κ = 0.35 cm²/g in the Sun); bound and free electrons absorb it, more strongly the cooler and denser the gas (Kramers' law); in cool outer layers the fragile H⁻ ion does most of the blocking; an iron bump near 200,000 K drives some stars' pulsations. Radiative diffusion: the luminosity carried is set by the temperature gradient and the opacity. | **21.2 What blocks the light.** Opacity over the density–temperature plane from the textbook fits, labelled, with the dominant source named in each region and the Sun's interior path from Model S drawn across it. |
| 21.3 | **When convection takes over.** If radiation would need a steeper temperature fall than a rising parcel of gas cools by expanding, the gas turns over (Schwarzschild 1906). The Sun convects in its outer 29%; stars over about 1.2 Suns have convective cores (their CNO burning crowds the power into the middle, Chapter 22); stars under a third of a Sun convect throughout. | ★ **21.3 Convection or not.** A parcel nudged upward: it keeps rising if it stays warmer than its surroundings. Then the Sun's real temperature gradient against the adiabatic one, from Model S: where the two lines meet, the gas is convecting, and they meet at 0.713 R☉, where helioseismology puts the base of the convection zone. |
| 21.4 | **Four equations make a star.** Mass, balance, energy and transport, with the gas's pressure, its opacity and its nuclear energy rate (Chapter 22 opens that box), and two ends to satisfy: the centre and the surface. Mass and composition decide the rest (Vogt and Russell, 1926–27). The solver shoots from both ends and corrects its guesses until they meet in the middle, as research codes such as MESA do in thousands of layers. | ★ **21.4 Build a star.** Mass (0.3–20 M☉) and composition (X, Z) in; the solver iterates in a worker, each try drawn; out come the radius, luminosity and surface temperature, the profiles in the profile plot, the convective zones, and the star's place on the HR diagram. "Build a main sequence" runs a range of masses and lays the line on Gaia's stars and the mass–luminosity relation on DEBCat's (Part II). The Sun built from scratch, against Model S. |
| 21.5 | **The thermostat.** Radiation's leak sets a main-sequence star's luminosity (L ∝ M³/κ for constant opacity, whatever its radius), and fusion adjusts to supply it: if the core overheats it expands, cools and slows its burning. In packed (degenerate) gas, pressure doesn't depend on temperature and the thermostat fails, which is why helium lights in a flash (Part II, Chapter 17; Chapter 24 says why). | Narrative, with an equation box for homology and the 21.4 solver's numbers |
| Deep dive | Mixing-length theory, and why the Sun's convection is calibrated rather than computed | — |

*Check yourself:* How long does the Sun's energy take to get out? (Tens of thousands of years or more; the 8 minutes is the trip from the surface.) What sets a main-sequence star's luminosity: its fusion or its leakiness to light? (The leakiness; fusion follows.) Where in the Sun does the gas convect? (The outer 29% by radius.) Why do heavier stars have convective cores? (CNO burning concentrates their power at the centre.) *Interactive:* in Figure 21.4, build a star of twice the Sun's mass and read its luminosity (the range from the solver, about 10–20 L☉).

### Chapter 22 · The nuclear furnace
*Builds on: Chapters 12, 15, 20 and 21. Toolkit: Estimating with orders of magnitude.*

| § | Content | Figure |
|---|---|---|
| 22.1 | **Too cold for fusion.** Two protons repel; to touch they need about 1 MeV, and at the Sun's centre a typical one has about 1 keV. Classically, essentially none would ever fuse. Quantum mechanics lets them tunnel through the barrier (Gamow 1928; Atkinson and Houtermans 1929), rarely. | Narrative, with an equation box for the barrier and the tunnelling factor |
| 22.2 | **The Gamow peak.** Fast protons are rare and slow ones can't tunnel, so fusion happens in a narrow window of energy, about 6 keV for protons at 15.7 million K. Heavier nuclei repel more and need hotter cores, and the rates climb steeply with temperature: the pp rate as about T⁴, CNO's as T^16–20, carbon burning's as T^30. | ★ **22.1 The Gamow peak.** The Maxwell–Boltzmann tail, the tunnelling probability and their product on log axes; choose the reaction (p + p, p + ¹²C, p + ¹⁴N, ¹²C + ¹²C, ¹⁶O + ¹⁶O) and the temperature; the peak's energy and width, and how fast the rate climbs; a "classical" switch shows the rate with no tunnelling (nothing). |
| 22.3 | **Four protons make helium.** The pp chains: the first step needs a weak interaction (a proton turning into a neutron), so a proton in the Sun's core waits about ten billion years, which is why the Sun lasts so long; the rest follow in seconds to millennia. The CNO cycle uses carbon as a catalyst and turns it into nitrogen on the way; it wins above about 1.3 Suns. The Sun's core makes about 280 W per cubic metre, less than your body: the Sun is bright because it is big. | ★ **22.2 The pp chains and the CNO cycle.** A small reaction network at a chosen temperature and density: the reactions as arrows between nuclei on a strip of the chart of nuclides, thickness for flow; each step's waiting time; the branches' shares; slide the temperature from 10 to 30 million K and watch CNO overtake the pp chains; the CNO catalysts piling up as nitrogen. |
| 22.4 | **Hoyle's resonance.** Helium burning needs three nuclei at once: two make beryllium-8, which falls apart in 10⁻¹⁶ s, and a third must arrive in time. It works only because carbon-12 has an energy level just above three helium nuclei, which Hoyle predicted (1953) and Fowler's group confirmed. The next step, carbon to oxygen, is the most important uncertain rate in astrophysics. | **22.3 Hoyle's resonance.** The energy levels of three helium nuclei, beryllium-8 and carbon-12, with the Hoyle state 380 keV above the threshold; the triple-alpha rate with and without it, many powers of ten apart; its T^40 sensitivity. |
| 22.5 | **The last days of a massive star.** After helium: carbon, neon, oxygen and silicon, each hotter and faster, from millions of years to a day; the star grows layers like an onion, with iron at the centre. Neutrinos carry the core's energy off directly, faster than light can diffuse out, so the core races while the surface hardly changes. | ★ **22.4 The last days of a massive star.** A clock in time before the collapse (log scale), the onion's layers growing, the photon and neutrino luminosities, and the core's path on the core's map through each fuel's ignition line, for 15 and 25 M☉ (published models' stages, with their spread). |
| Deep dive | Neutrinos from the Sun's core: pp, ⁷Be, ⁸B and CNO, and what Borexino measured | — |

*Check yourself:* How can protons fuse at only 15 million degrees? (Quantum tunnelling through their repulsion.) Why does the Sun last ten billion years? (The first step of the pp chain needs a slow weak interaction.) Why do heavy stars burn by the CNO cycle? (Their hotter cores favour it, as its rate climbs far more steeply with temperature.) Why did Hoyle predict an energy level in carbon? (Without it stars couldn't make enough carbon.) *Interactive:* in Figure 22.2, find the temperature at which the CNO cycle overtakes the pp chains (about 17–18 million K; the range from the network).

### Chapter 23 · Where the elements come from
*Builds on: Chapters 12, 18 and 22.*

| § | Content | Figure |
|---|---|---|
| 23.1 | **The iron peak.** A nucleus's binding energy per particle rises to a peak near iron and nickel and falls beyond: fusing light nuclei releases energy, fusing past iron costs it. The liquid-drop picture explains the curve, and magic numbers of protons and neutrons (2, 8, 20, 28, 50, 82, 126) make some nuclei extra stable. | ★ **23.1 The chart of nuclides.** All 3,340 known nuclides by protons and neutrons, coloured by half-life or decay mode, with the valley of stability, the magic numbers and the drip lines; binding energy per nucleon as a layer and as a curve; click a nuclide for its card (mass, half-life, decay, its share of the Sun). |
| 23.2 | **Slow neutron captures.** In giant stars free neutrons are captured every few years to centuries, slower than most radioactive decays, so the path climbs the valley of stability one step at a time to lead and bismuth. It piles up where nuclei hate to capture (the magic numbers), so σN is flat between them. Technetium, which has no stable isotope, in red giants' spectra (Merrill 1952) shows it happens now. | ★ **23.2 Neutron captures step by step.** On the chart of nuclides, an iron seed captures neutrons: the slow process along the valley (real cross sections and half-lives, branch points shown), or the rapid process far out at 10²⁴ neutrons per cm³ (a toy, labelled), then the decay back to stability; the abundance pattern built, against the Sun's s- and r-process shares. |
| 23.3 | **Rapid neutron captures.** In merging neutron stars, and perhaps in some collapsing stars, neutrons arrive in milliseconds: the path runs far from stability, waits at the magic numbers and decays back as three peaks, near masses 80, 130 and 195. GW170817's kilonova glowed red with the lanthanides it made; JWST found tellurium in another (2023). | Uses 23.2 (r-process mode) |
| 23.4 | **Every element's birthplace.** Hydrogen and most helium come from the Big Bang (Part III stops at that door); lithium, beryllium and boron from cosmic rays; carbon, nitrogen and the slow-process elements from giant stars; oxygen to calcium from exploding massive stars; much of the iron from exploding white dwarfs; gold, platinum and uranium from merging neutron stars. B²FH and Cameron (1957) worked it out. | ★ **23.3 Every element's birthplace.** The periodic table coloured by origin (published shares), with the Sun's abundances beside it on a log scale; click an element for where it was made, how we know, and how much of it is in the Sun and in you. |
| Deep dive | Where gold comes from: mergers, collapsars or magnetar flares, still argued | — |

*Check yourself:* Why do stars stop fusing at iron? (Beyond the iron peak fusion costs energy.) What does technetium in a star's spectrum prove? (The star is making elements now.) Why are there peaks in the abundances of heavy elements? (Neutron captures pile up at the magic numbers.) Where was the gold in a ring made? (Most likely in merging neutron stars.) *Interactive:* in Figure 23.2, run the slow process and find the first magic number where it piles up (N = 50).

### Chapter 24 · Matter at its limit
*Builds on: Chapters 18, 20 and 22.*

| § | Content | Figure |
|---|---|---|
| 24.1 | **Packed electrons.** No two electrons share a state (Pauli), and confined ones must move fast (Heisenberg), so squeezed electrons push back however cold they are: degeneracy pressure, P ∝ n^(5/3). Where it takes over, a core no longer heats as it shrinks, and the thermostat of Chapter 21 fails (the helium flash). Fowler (1926) saw that it holds up white dwarfs. | ★ **24.1 Filling the Fermi sea.** Electrons filling momentum states, shown as a slice through the Fermi sphere; squeeze the box and more states, faster electrons and more pressure are needed; a temperature slider smears the edge; pressure against density with the ideal-gas and degenerate limits, and the degeneracy line added to the core's map. |
| 24.2 | **Heavier is smaller.** More mass needs more pressure, so the electrons are packed tighter: white dwarfs shrink as they gain mass (R ∝ M^−⅓). Sirius B, at 1.02 Suns, is smaller than Earth; Procyon B, at 0.59, is larger. | ★ **24.2 Build a white dwarf.** *Predict first:* "Is a heavier white dwarf bigger or smaller?" The central density from 10⁴ to 10¹² g/cm³; Chandrasekhar's exact equation of state in the stepping solver; the mass–radius curve traced as you go, the radius falling to nothing at the limit; measured white dwarfs (Sirius B, Procyon B, 40 Eridani B, the Moon-sized ZTF J1901+1458); helium, carbon–oxygen or iron composition. |
| 24.3 | **Chandrasekhar's limit.** Packed hard enough, the electrons move near light's speed and their pressure grows only as n^(4/3): beyond a fixed mass, about 1.4 Suns, no white dwarf can stand (Chandrasekhar 1930, against Eddington). Iron cores hold less (1.26 by the same sum), which matters in Chapter 25. | Uses 24.2, pushed to the limit, with an equation box for M_Ch |
| 24.4 | **Embers that crystallise.** A white dwarf has no fuel: it cools for billions of years (Mestel 1952). As it cools its carbon and oxygen freeze into a crystal, releasing heat that slows the cooling; Gaia saw the pile-up (2019), and some heavy white dwarfs pause for billions of years as neon sinks. | **24.3 Cooling and crystallising.** Luminosity against age from Mestel's law, with crystallisation's delay switchable; the Gaia white dwarfs within 100 pc (Part II) with the pile-up and the Q branch marked. |
| — | — | *(stretch)* **24.4 One curve from Jupiter to Sirius B.** Radius against mass for cold balls of hydrogen, helium, carbon and iron (Zapolsky and Salpeter's physics, approximated): growing like rocks, peaking near a few Jupiter masses, shrinking like white dwarfs to the limit; Part I's planets and Part II's brown dwarfs on it. |

*Check yourself:* What holds up a white dwarf? (Electrons that can't be packed closer, whatever the temperature.) Why are heavier white dwarfs smaller? (More weight needs electrons packed tighter.) What happens above about 1.4 solar masses? (Electron pressure can't hold it; it collapses or explodes.) Do white dwarfs shine by fusion? (No: they are cooling embers.) *Interactive:* in Figure 24.2, find the mass of a white dwarf the size of Earth (about 0.9 M☉; the range from the solver).

### Chapter 25 · Stellar explosions
*Builds on: Chapters 18, 22, 23 and 24.*

| § | Content | Figure |
|---|---|---|
| 25.1 | **A core that can't hold.** The iron core grows past what its electrons can hold; electron captures and the splitting of iron by hot light steal its pressure, and it collapses in a few tenths of a second to nuclear density, where it stiffens and bounces. The bounce's shock stalls; neutrinos, carrying 99% of the energy, revive it (Bethe and Wilson 1985). SN 1987A's 24 neutrinos were that energy arriving. | ★ **25.1 Collapse and bounce.** A one-dimensional toy hydrodynamics code: a core of 1.4 M☉ collapsing, the inner part falling together, the bounce at nuclear density, the shock moving out and stalling; switch on neutrino heating behind the shock and set its strength to see whether the star explodes. Labelled a toy. |
| 25.2 | **The kinds of supernova.** Spectra sort them: Type II with hydrogen, Ib with helium but no hydrogen, Ic with neither, Ia with silicon. Ib and Ic are stars stripped by winds or companions (Chapter 28); Ia are white dwarfs. | **25.2 Supernova spectra, sorted.** A decision tree from the lines in a spectrum to the type, with sketched spectra (labelled) and what each type means for the star that exploded. |
| 25.3 | **White dwarfs that explode.** A carbon–oxygen white dwarf pushed near its limit ignites carbon in degenerate matter, the thermostat fails, and the whole star burns in a second, leaving nothing. How it gets there is argued: a companion feeding it, two white dwarfs merging, or a helium shell setting off a double detonation, now with two calcium shells in a remnant to show for it (2025). | Narrative; links to Chapter 28 |
| 25.4 | **Light from radioactive nickel.** The explosion makes nickel-56, which decays to cobalt in about 9 days and to iron in about 111: those decays, not the blast, make the light for months. The peak's brightness gives the nickel's mass (Arnett's rule); the width, how long light takes to get out. SN 1987A's tail and the γ-rays of its cobalt were the proof. | ★ **25.3 Light from radioactive nickel.** Arnett's model with sliders for nickel mass, ejected mass, speed and opacity; the decay power, the light curve and the γ-rays leaking out; SN 2011fe (Type Ia) and SN 1987A beside it; a hydrogen-rich plateau option (Popov). |
| 25.5 | **Stars that leave nothing behind.** In the heaviest metal-poor stars, light hot enough to make electron–positron pairs softens the core; it collapses, burns its oxygen at once and blows the whole star apart (pair instability). This leaves a gap in black holes' masses from about 50 to 130 Suns, which LIGO tests (Chapter 29). SN 2018ibb is the best candidate seen. | ★ **25.4 The pair-instability wedge.** The core's map with the region where pairs soften the gas (computed from the equation of state of ions, light and pairs) and helium cores' tracks from 10 to 200 M☉; the outcome bands (pulsing, destroyed, collapsed) from published models. |

*Check yourself:* Why does an iron core collapse? (Its electrons can't hold it, and captures and the splitting of iron take its pressure away.) Where does most of a core-collapse supernova's energy go? (Into neutrinos.) What powers a Type Ia supernova's light for months? (Radioactive nickel and cobalt.) Why can a very heavy star leave nothing behind? (Pair instability blows it apart.) *Interactive:* in Figure 25.3, set the nickel mass that matches SN 2011fe's peak (about 0.5 M☉; the range from the model).

### Chapter 26 · Neutron stars
*Builds on: Chapters 18, 24 and 25. Toolkit: Vectors.*

| § | Content | Figure |
|---|---|---|
| 26.1 | **A nucleus the size of a city.** Electrons squeezed into protons make neutrons; a neutron star is a crust of ever stranger nuclei a kilometre deep over a core of neutrons with a few per cent of protons and electrons, denser than an atomic nucleus, superfluid inside. | **26.1 Inside a neutron star.** The star cutaway (Part II) with the crust drawn to scale and its layers named (iron, neutron-rich nuclei, the neutron drip, "pasta", the core), with densities. |
| 26.2 | **The heaviest neutron star.** In general relativity pressure itself weighs, so a neutron star needs a stiffer equation of state than Newton would say, and there is a heaviest one. Nobody knows the equation of state, so the limit is measured: pulsars of 2.0–2.35 Suns exist; NICER's radii of 11–13 km and GW170817 narrow it down. | ★ **26.2 Build a neutron star.** The TOV equation in the stepping solver with ten published equations of state (piecewise polytropes); the mass–radius curves; measured masses as bands and NICER's radii as regions; a "Newton only" switch; the causality line. |
| 26.3 | **Lighthouses.** A pulsar's beam comes out along its magnetic axis, tilted to its spin axis; we see a pulse each time the beam sweeps across us, as from a lighthouse (Pacini 1967; Gold 1968). Whether we see it at all depends on the angles. | ★ **26.3 The pulsar lighthouse.** A Scene3D neutron star with its spin axis, tilted magnetic axis and two beam cones, and our line of sight; the pulse train we receive, with interpulses when both beams reach us; tilt the axes and watch the pulse appear, split or vanish. Keyboard camera and description. |
| 26.4 | **Clocks that slow down.** A spinning magnet radiates, so pulsars slow: from a pulsar's period and its rate of change come its magnetic field, its age and its power. The Crab's spin-down lights its whole nebula. Old pulsars spun up again by a companion (Chapter 28) are millisecond pulsars, steady enough to rival atomic clocks. | ★ **26.4 The P–Ṗ diagram.** Pulsars' periods against their spin-down rates on log axes, with lines of equal field, age and power, the death line, and young pulsars, millisecond pulsars and magnetars marked; drag a pulsar to see it age down its line, or recycle it; real pulsars (§13, question 2). |
| 26.5 | **Magnetars.** Some neutron stars have fields of 10¹⁴–10¹⁵ gauss; their quakes make flares that can outshine the Galaxy's other X-ray sources for a moment, and one made a fast radio burst seen from the Galaxy (2020). | Uses 26.4 |

*Check yourself:* Why do pulsars pulse? (They spin, sweeping a beam past us.) What is a neutron star made of? (Mostly neutrons, with a crust of nuclei and some protons and electrons.) Why is there a heaviest neutron star? (In relativity pressure adds to gravity; beyond a limit nothing holds it up.) Where do millisecond pulsars come from? (Old pulsars spun up by a companion.) *Interactive:* in Figure 26.2, find an equation of state that can't hold up the 2.35 M☉ pulsar.

### Chapter 27 · Black holes
*Builds on: Chapters 7, 10, 18 and 26. Toolkit: Vectors.*

| § | Content | Figure |
|---|---|---|
| 27.1 | **Where escape needs light speed.** Michell's dark stars (1784); Schwarzschild's solution (1916): the horizon at 2GM/c², 3 km per solar mass, a boundary in spacetime, not a surface. Far from a black hole its pull is like any other mass's: it doesn't suck. | Narrative, with an equation box for the Schwarzschild radius |
| 27.2 | **Orbits near a black hole.** General relativity adds a term to the effective potential: orbits precess (Mercury's 43″ a century, S2's 12′ an orbit), and inside three horizon radii no circular orbit is stable: matter spirals in and plunges. | ★ **27.1 Orbits near a black hole.** *Predict first:* "Does a black hole pull a distant star in faster than a star of the same mass would?" A geodesic integrator beside Newton's orbit; set the energy and angular momentum, or drag the start; the effective potential with the orbit's energy as a line; precession, zoom-whirl orbits, the innermost stable orbit and the plunge. |
| 27.3 | **Light near a black hole.** Light bends (1.75″ at the Sun's edge, 1919); at 1.5 horizon radii it can circle; aimed closer than 2.6 radii it falls in, which makes the shadow. | **27.2 Bending light.** Light rays passed by a black hole at different aims: bent, looped or captured; the shadow's size from the capture limit; deflection against the weak-field rule. *(stretch)* **27.3 A ray-traced black hole.** A WebGL shader tracing light round a black hole with a thin disc, Doppler-brightened on one side, from any inclination. |
| 27.4 | **The brightest engines.** Gas falling to the innermost orbit gives up 6% of its rest-mass energy, up to 42% round a spinning hole, against fusion's 0.7%. Discs round stellar black holes shine in X-rays (Cygnus X-1), round giant ones in ultraviolet as quasars; jets come from the spin and magnetic fields. The Eddington limit caps the light. | ★ **27.4 The accretion disc.** A thin disc's temperature from its inner edge outward and its spectrum as a sum of black bodies (Part II's spectrum view), for a stellar and a supermassive black hole; the efficiency of each fuel as bars; spin the hole to move the inner edge in; the Eddington limit. |
| 27.5 | **Seeing the shadow.** The Event Horizon Telescope linked dishes across Earth to resolve 20–25 µas (Part II, Chapter 10): M87\*'s ring in 2019, Sgr A\*'s in 2022, both the size relativity predicts for their masses; M87\*'s polarisation turned the other way between 2017 and 2021. | Narrative, with the computed and measured sizes |

*Check yourself:* Does a black hole suck everything near it in? (No: outside a few horizon radii orbits are as stable as round any star.) What happens inside three horizon radii? (No stable circular orbit; gas plunges.) Why are discs round black holes so bright? (Falling that deep releases far more energy per kilogram than fusion.) What does the EHT image show? (The shadow, ringed by light bent round the hole.) *Interactive:* in Figure 27.1, find the smallest stable circular orbit (six GM/c²).

### Chapter 28 · Two stars are stranger than one
*Builds on: Chapters 7, 14, 17, 24 and 26. Toolkit: Vectors.*

| § | Content | Figure |
|---|---|---|
| 28.1 | **The Roche potential.** In the frame turning with a pair, gravity and the centrifugal effect make a landscape with two hollows joined by a pass at L1 (Part I's Lagrange points). A star that swells to fill its hollow, its Roche lobe, spills gas over the pass; the Coriolis effect swings the stream round, to hit the companion or form a disc. | ★ **28.1 Roche potential explorer.** The potential as contours and a 3D landscape (the potential view); the mass-ratio slider; the Lagrange points; a star swelling to fill its lobe; gas released at L1 followed in the turning frame, hitting the companion or circling it. |
| 28.2 | **Mass transfer changes the orbit.** If no mass or angular momentum is lost, the orbit shrinks while the giving star is the heavier, is smallest when the masses are equal, and widens after. Whether the transfer runs away depends on how the donor's radius and its lobe respond. | **28.2 The orbit as mass changes hands.** Separation, period and both Roche lobes against the mass ratio for conservative and non-conservative transfer, with the minimum at equal masses. |
| 28.3 | **The Algol paradox.** In Algol the lighter star is the more evolved, though heavier stars evolve faster. The answer (Crawford, Hoyle 1955): it was once the heavier, swelled first, and gave most of its mass away. | ★ **28.3 The Algol paradox, step by step.** BSE runs an Algol-like pair from birth: both on the main sequence; the heavier swells and fills its lobe; the masses swap and the orbit shrinks then widens; today's Algol. The pair to scale with their lobes, both stars on the HR diagram, masses and period against time, the events as a strip. |
| 28.4 | **Common envelopes.** When transfer runs away, the giver's envelope swallows both stars; drag pulls them together, and the orbital energy released may throw the envelope off, leaving a tight pair, or not, and they merge. How efficiently is among the least-known numbers in astrophysics. | Narrative, with an equation box for the energy budget (α and λ); α is a slider in Figure 28.4 |
| 28.5 | **The binary zoo.** Mass transfer, envelopes, kicks and mergers make cataclysmic variables and novae (T Coronae Borealis's next eruption is awaited), X-ray binaries, millisecond pulsars, blue stragglers, stripped stars, pairs of white dwarfs that may become Type Ia supernovae, and pairs of black holes that will merge. | ★ **28.4 The binary zoo.** A map of outcomes from BSE: initial period (1 day to 10,000 days) against the primary's mass for a chosen mass ratio and metallicity, each cell a classified fate (merger, cataclysmic variable, X-ray binary, double white dwarf, Type Ia, double neutron star, double black hole merging within the age of the universe…), computed cell by cell in the worker; the common-envelope efficiency as a slider; click a cell to open that pair in the Star Forge. |

*Check yourself:* Why is Algol's lighter star the more evolved? (It was the heavier and gave its mass away.) What happens to the orbit as the heavier star gives mass to the lighter? (It shrinks until the masses are equal, then widens.) What is a common envelope? (A shared envelope that drags two stars together.) Where do millisecond pulsars come from? (Neutron stars spun up by gas from a companion.) *Interactive:* in Figure 28.1, set a mass ratio at which the stream misses the companion and forms a disc.

### Chapter 29 · Ripples in spacetime
*Builds on: Chapters 26, 27 and 28.*

| § | Content | Figure |
|---|---|---|
| 29.1 | **A clock in orbit.** The Hulse–Taylor pulsar (1974) orbits another neutron star every 7.75 hours, and the orbit shrinks exactly as gravitational waves carrying energy away predict (to 0.2%); they'll merge in about 300 million years. The double pulsar confirms it to 0.013%. | ★ **29.1 The shrinking orbit.** Peters' equations for a pair of compact stars: the orbit shrinking and rounding with time on a log scale, the period's decay and the famous shift of periastron time for the Hulse–Taylor pulsar with the measured ratio, the merger time; other pairs to try (the double pulsar, two white dwarfs, the Sun and Jupiter). |
| 29.2 | **What a gravitational wave is.** A ripple that stretches space one way and squeezes it the other, in two polarisations, at light's speed (GW170817 showed it to 10⁻¹⁵). A strain of 10⁻²¹ changes LIGO's 4 km arms by about a thousandth of a proton's width, measured by laser interferometry (Part II's Michelson again). | **29.2 Stretch and squeeze.** A ring of floating masses stretched by the plus and cross polarisations, and an interferometer's arms answering, exaggerated (not to scale); the real strain as a number. |
| 29.3 | **The chirp.** As two black holes spiral in they orbit faster and the waves rise in pitch and loudness, until the merger and a ringing down; how fast the pitch rises gives the chirp mass. GW150914 (2015): two black holes of about 36 and 29 Suns became one of 62, turning three Suns into waves in a fifth of a second. | ★ **29.3 Make a chirp, and hear it.** Masses in, waveform out: the inspiral, a joined merger and ringdown, its frequency against time and a spectrogram; play it through the speakers (Web Audio, only on a click; an octave up for small speakers), with a visual for those who can't hear it; GW150914's real strain from both detectors (GWOSC) beside the model, to see and hear. |
| 29.4 | **Hundreds of collisions.** By 2026, 390 candidates (GWTC-5.0): mostly black holes of 10–40 Suns, a few neutron stars, a gap where pair instability should leave none (Chapter 25), with GW231123 in it, perhaps a merger of mergers; GW250114, the loudest, confirmed Hawking's area law. | ★ **29.4 The merger census.** Every event's two masses with their uncertainties, the pair-instability gap and the neutron-star range shaded; a histogram of the heavier mass; a slider through the observing runs since 2015 to watch the census grow; click an event for its card. |
| 29.5 | **Merging neutron stars.** GW170817 (2017), 40 Mpc away: the chirp, a γ-ray burst 1.7 s later, and a kilonova glowing with fresh heavy elements (Chapter 23); a limit on neutron stars' radii (Chapter 26). | **29.5 The gravitational-wave spectrum.** Sources and detectors by frequency, from pulsar timing at nanohertz through LISA at millihertz to LIGO at hundreds of hertz, with analytic sensitivity curves, after Figure 10.1's spectrum ruler. *(stretch)* **29.6 A kilonova's colours:** blue then red as lanthanide-rich ejecta take over (a toy). |

*Check yourself:* What did the Hulse–Taylor pulsar show? (Its orbit shrinks just as gravitational waves carrying energy away predict.) Why does a chirp rise in pitch? (The orbit shrinks and speeds up.) What sets how fast it rises? (The chirp mass.) Can we hear gravitational waves? (Not directly; we turn the strain into sound.) *Interactive:* in Figure 29.3, find the chirp mass that matches GW150914's sweep (about 30 M☉ as measured; the accepted range from the model).

### Chapter 30 · Crowds of stars
*Builds on: Chapters 7, 9, 17 and 27. Toolkit: Vectors.*

| § | Content | Figure |
|---|---|---|
| 30.1 | **A cluster is a gas of stars.** The virial theorem again: a cluster's stars move fast enough to balance its gravity. Close passes slowly reshuffle their energies (relaxation, about 15 million years for a thousand stars in a parsec): heavy stars sink to the middle, light ones are flung out, and a core that loses energy shrinks and heats, like a star. Every star pulls on every other, so the cost grows as N². | Narrative, with equation boxes for the crossing and relaxation times |
| 30.2 | **Clusters evaporate.** Stars that gain enough energy cross the Jacobi radius, where the Galaxy's tide wins, and drift off along the cluster's orbit as two tails; Gaia found the Hyades' tails across 800 pc (2019). Most open clusters dissolve within a few hundred million years. | ★ **30.1 A cluster evaporates.** 500–2,000 stars (a Plummer sphere, equal masses or Kroupa's) in the Galaxy's tide, every star pulling every other, in a worker; the particle view; mass segregation as colour, the tails forming through L1 and L2; bound mass, half-mass radius and energy error against time in relaxation times. Opens in the Orrery. |
| 30.3 | **The shape of the Milky Way.** A bar and bulge, thin and thick discs, a halo of old stars and globular clusters, all built partly from swallowed galaxies (Gaia–Enceladus, 8–11 billion years ago); the Sun at 8.2 kpc, going round at 230 km/s once every 220 million years. | **30.2 The Galaxy from outside.** A model Milky Way in the particle view with its components switchable, the Sun marked, after Figure 9.5's zoom. |
| 30.4 | **The rotation curve.** Stars and gas far out should orbit slower, as the planets do; they don't (Rubin and Ford, 1970s; neutral hydrogen beyond the stars): galaxies hold far more mass than they show. Most astronomers call it dark matter; a few argue gravity changes instead. The Milky Way's own curve from Gaia falls gently beyond the Sun, and how much dark mass that implies is argued over now. | ★ **30.3 The rotation curve.** Build a galaxy's speed from its parts: bulge, stellar disc, gas and a dark halo, each with its own curve and the total; slide the stars' mass-to-light ratio and the halo's mass; the Milky Way's measured curve (Gaia era) and SPARC galaxies (NGC 3198 and others); "no halo" to see where the visible matter falls short. |
| 30.5 | **Spiral arms.** A disc turning faster inside than out would wind arms up within a few turns. Arms are patterns, waves of crowding the stars pass through like cars through a jam (Lin and Shu 1964), or short-lived ones that keep reforming; both are argued. | **30.4 The winding problem.** Arms of fixed stars wound up by the measured rotation curve over a billion years, beside a pattern of nested, slightly turned orbits that keeps its spiral (Kalnajs). |
| 30.6 | **The black hole at the centre.** S2 orbits Sagittarius A\* every 16 years, coming within 120 AU at 2.5% of light's speed: Kepler's third law weighs the hole at about 4.3 million Suns, and its orbit precesses by 12′ each lap, as general relativity says (2020). Genzel and Ghez shared the 2020 Nobel Prize. | ★ **30.5 S2's orbit.** S2's orbit on the sky from its published elements, played through the years with the next pericentre computed from today; weigh Sagittarius A\* with a ruler and a stopwatch as in Figure 7.3; the precession (exaggerated, not to scale) and the redshift curve at pericentre with relativity's extra. Opens in the Orrery. |

*Check yourself:* Why do clusters lose stars? (Encounters give some stars enough speed to escape the Galaxy's tide.) What does a flat rotation curve mean? (Mass keeps growing beyond the visible stars.) Are spiral arms made of the same stars all the time? (No: stars move through them.) How was Sagittarius A\* weighed? (From the orbits of stars like S2, by Kepler's third law.) *Interactive:* in Figure 30.5, weigh Sagittarius A\* from S2's orbit (about 4.3 million M☉; the accepted range from the figure).

### Chapter 31 · Colliding galaxies *(optional)*
*Builds on: Chapters 7, 27 and 30.*

| § | Content | Figure |
|---|---|---|
| 31.1 | **Bridges and tails.** Toomre and Toomre (1972) put rings of test stars round two point masses and passed them by each other: tides pulled out bridges and long tails like those of the Antennae and the Mice (Part I's tides, on a grand scale). | ★ **31.1 Galaxy collision.** Two disc galaxies of up to 100,000 stars (Toomre's method with extended halos) in the particle view; masses, tilts, the closest approach and the direction of spin; the Antennae, the Mice, a ring galaxy from a head-on hit and a flyby as presets; time warp. Opens in the Orrery. |
| 31.2 | **Stars don't collide.** Even when galaxies merge, the space between stars is so vast that only a handful of a hundred billion would hit another. Gas clouds do collide, and burst into star formation; dynamical friction makes the galaxies sink together and merge into one, often an elliptical. | Uses 31.1, with friction on or off |
| 31.3 | **The Milky Way and Andromeda.** Andromeda is falling towards us at about 110 km/s; the textbook said a collision in about 4 billion years. With Gaia's and Hubble's motions, M33 and the Large Magellanic Cloud, the odds of a merger within 10 billion years are about even (2025). | ★ **31.2 Will we collide?** The Local Group's big galaxies as extended masses with friction; their measured masses and velocities sampled within their uncertainties, seeded; the fraction of futures that merge within 10 billion years, the paths fanning out; narrow an uncertainty to see the odds move. |
| 31.4 | **Engines in the middle.** Quasars (3C 273, 1963) are giant black holes swallowing gas (Chapter 27), and mergers feed them; every big galaxy has one, its mass tracking its galaxy's. | Narrative |
| 31.5 | **The door to cosmology.** 3C 273's light is stretched by 16%: galaxies' light reddens the farther they are (Hubble 1929). Behind that door are the expanding universe and the Big Bang, which this course leaves for another. | Narrative |

*Check yourself:* Why do colliding galaxies grow tails? (Tides stretch them, as the Moon stretches the sea.) Do stars crash when galaxies collide? (Almost never.) Will the Milky Way merge with Andromeda? (Perhaps: about even odds within ten billion years.) What powers a quasar? (Gas falling into a supermassive black hole.) *Interactive:* in Figure 31.1, set up a collision that makes a ring galaxy.

**Count:** 12 chapters, 32 key figures, 13 smaller ones and 3 stretch figures, plus five Toolkit figures.

---

## 5. The Star Forge, version 2: pairs of stars

The Forge gains a **Binaries mode** beside Stars and Clusters, at `/star-forge/?mode=binary`, built in Stage 28 on the BSE port of Stage 24. Figures 28.3 and 28.4 open it with a matching pair.

**Inputs**
- Both masses (0.1–100 M☉ each; log sliders or typed), the orbital period (0.1 day to 10⁵ days) or separation, the eccentricity (0–0.95), and metallicity.
- The uncertain physics, as sliders with BSE's own values marked: the common-envelope efficiency α (0.1–5), supernova kick dispersion (0–400 km/s, with "reroll the kick": a seeded draw), wind strength (as in v1), tides on or off.
- Presets (each with a blurb, "Try this" and "What's simplified"): Algol; a cataclysmic variable; a millisecond pulsar from a low-mass X-ray binary; Cygnus X-1-like; a double white dwarf that merges (a Type Ia candidate); a single-degenerate Type Ia; the Hulse–Taylor pulsar's ancestors; a GW150914-like pair of black holes (low metallicity); a blue straggler from a merger; a stripped-envelope supernova.

**What the reader sees**
- the pair to scale with both Roche lobes, filled or not, and the stars drawn true (Part II's view), at any moment;
- both tracks on the HR diagram;
- masses, radii and Roche-lobe radii against time, with mass-transfer episodes shaded; separation, period and eccentricity against time;
- the events as strips for each star and the pair (BSE's own event list: type changes, Roche-lobe overflow, common envelope, merger, supernova with its kick, disruption);
- the outcome classified in words (cataclysmic variable, X-ray binary, double white dwarf, Type Ia, double neutron star, double black hole…), with the gravitational-wave merger time where it applies (Peters, Chapter 29) and the system's speed after kicks.

**Where it can be trusted.** A note and a calibration panel: BSE is 2002 physics; its mass-transfer stability, common-envelope and kick recipes are the field's biggest uncertainties, and modern codes (COSMIC, COMPAS and others) differ; the sliders show how much outcomes depend on them.

**Population mode** *(stretch)*: a thousand to ten thousand pairs drawn from published distributions, run in the worker, their outcomes as histograms (white dwarf pairs' periods, black-hole masses against GWTC's, Chapter 29).

**Engine** (`src/core/stellar/bse/`)
- `evolv2`, `comenv`, `kick`, `mix`, `gntage`, `dgcore`, `corerd`, `instar`, `rl` and `ran3`, ported line by line on top of the existing SSE port, with Hurley's names and comments as in Stage 13.
- `binary.in`'s defaults as distributed for the fixtures; the Forge's own defaults are a separate, documented choice (§13, question 4).

**Tests**
- **Against Hurley's code:** fixtures from BSE compiled in WSL over a grid (masses 0.5–80 M☉, mass ratios 0.1–0.9, periods 1–10⁴ days, e = 0 and 0.5, three metallicities, kicks off): every row of BSE's event table (`bpp`) and the per-step state (`bcm`), the same events in the same order with times, masses, radii and separations to tight tolerances; plus a few with kicks on, through the ported `ran3` with the same seed.
- Properties: total mass never grows; angular momentum changes only by the modelled losses; a wide pair evolves as two single stars (the SSE port's tracks); the outcome classifier agrees with BSE's final types.

---

## 6. The Orrery, version 2

Built in Stage 29 on the engines of Stages 26, 27 and Part I.

**Many-body modes** (a toggle beside the planetary systems, which keep their v1 interface)
- **Clusters:** 100–2,000 stars, Plummer or King, equal masses or Kroupa's, optional Galactic tide; Hermite integration with block steps and softening in the worker; the particle view; Lagrangian radii, bound mass, mass segregation and energy error; presets: a young open cluster dissolving, core collapse of equal masses, the Hyades' tails.
- **Galaxies:** Toomre's method with extended halos and dynamical friction, up to 100,000 test stars; presets: the Antennae, the Mice, the Cartwheel, a flyby, the Milky Way and Andromeda.

**General relativity**, a switch for planetary systems: the first post-Newtonian correction about the dominant mass; Mercury's 43″ a century appears in the Solar System preset's precession readout; a new S2 preset round Sagittarius A\* shows 12′ an orbit.

**The Sun's death** (the master plan's coupling showcase): the Solar System with the Sun following SSE's 1 M☉ track, its mass falling and its radius drawn; the planets' orbits widen as the Sun loses mass; tides in the giant's envelope (Zahn's equilibrium tide, after Mustill and Villaver 2012) drag the inner planets in; the reader varies the Sun's wind (as in the Forge) and the tide's strength and sees whether Earth is swallowed. The question is engulfment, not escape (research §14).

**Also:** the integrator's automatic switch can switch back once a close pass is over (version 1's switch is one-way); *(stretch)* self-gravitating galaxies on the GPU with WebGPU where available.

**Tests:** clusters' energy error and virial ratio, escapers past the Jacobi radius, the relaxation time's scaling with N; Toomre's tails for his published parameters; Mercury's and S2's precession; adiabatic orbit widening a ∝ 1/M; the engulfment boundary against the published one for SSE's mass loss.

---

## 7. Toolkit pages for Part III

| Page | Content | First needed |
|---|---|---|
| **T7 Vectors** | Arrows with length and direction; adding and scaling them; components; the dot product (how much one points along another: a pulsar's beam and our line of sight) and the cross product (angular momentum, why orbits stay in a plane); rotating frames' centrifugal and Coriolis effects. Figure **T7.1 Dot and cross**: drag two arrows; their sum, their dot product as a shadow, their cross product as a perpendicular arrow in a small 3D view. | Chapter 26 (and 27, 28, 30) |
| **T8 Rates of change** | A derivative as a slope and as a speed; small changes (dy ≈ y′ dx); the rules for powers, products and chains; the log slope d ln y / d ln x, how steeply one thing grows with another (rates as T^ν). Figure **T8.1 Slopes**: a curve with a tangent you slide (the Sun's pressure from Model S, or a falling ball); zoom in until the curve looks straight. | Chapter 20 |
| **T9 Adding up small pieces** | An integral as a sum of thin slices; a star's mass from its density shell by shell (dm = 4πr²ρ dr); energy from power; area under a curve. Figure **T9.1 Shells**: the Sun's mass added up from Model S's density, with the number of shells as a slider, converging on one solar mass. | Chapter 20 |
| **T10 Differential equations** | Equations about change; order; starting values against conditions at both ends; stepping recalled (Toolkit T4) and adaptive steps; the shooting method; stiff equations in a sentence (reaction networks). Figure **T10.1 Shooting**: hit a target with Newton's cannon (Part I) by adjusting the angle from each miss; then the same trick for a star's surface. | Chapter 21 |
| **T11 Estimating with orders of magnitude** | Back-of-the-envelope physics: keep powers of ten, check the units, drop factors of two; when a factor of ten is good enough; the Sun's centre from G, M and R. Figure **T11.1 The estimate machine**: pick a quantity (central pressure, central temperature, free-fall time, Kelvin–Helmholtz time, a photon's escape) and build its estimate from factors on a ruler of powers of ten, against the true value. | Chapter 20 (and 22) |

---

## 8. Building blocks introduced in Part III

| Component | Specification | Stage |
|---|---|---|
| **Structure core** (`core/structure/`) | A stepping ODE solver (RK4 and adaptive RK45, with `emit`); the Lane–Emden equation with series starts; polytropes scaled to M and R; virial sequences; equations of state (ideal gas + radiation; Chandrasekhar's T = 0 Fermi gas; Fermi–Dirac integrals for finite temperature and pairs); analytic opacities; the four-equation ZAMS solver (fitting method, Newton on four guesses) | 18–19, 22 |
| **Profile plot** (`viz/profile/`) | Quantities against radius or mass, linear or log, with zones shaded and a reference model beside; a cursor and a live description | 18 |
| **The core's map** (`viz/coremap/`) | Central density against temperature with computed regions and lines as layers; tracks and a moving core marker | 18, extended in 20, 22 |
| **Nuclear core** (`core/nuclear/`) | Gamow factors and peaks; Caughlan & Fowler and NACRE rate fits; small stiff networks (implicit Euler or Rosenbrock); binding energies; the s-process and toy r-process networks | 19–21 |
| **Chart of nuclides** (`viz/nuclides/`) | Canvas 2D grid of every nuclide by N and Z; colour layers; paths and flows as overlays; zoom, pan, keyboard cursor and a nuclide card | 20–21 |
| **Supernova core** (`core/supernova/`) | Arnett's light curves with γ-ray leakage; Popov's plateaus; a 1D Lagrangian hydrodynamics toy; the pair-instability Γ₁ | 22 |
| **Compact objects** (`core/compact/`) | White-dwarf structure and cooling with crystallisation; TOV with piecewise polytropes; pulsar spin-down and beam geometry | 22–23 |
| **Relativity** (`core/gr/`) | Schwarzschild geodesics (timelike and null), effective potentials, the ISCO and photon sphere; thin-disc temperatures and spectra; Peters' equations; chirp waveforms; the first post-Newtonian force for the Orrery | 23, 25, 29 |
| **Roche geometry** (`core/binaries/roche.ts`) and **potential view** (`viz/potential/`) | The potential, Eggleton's lobe, the L1 stream in the turning frame; contours in SVG or canvas and a 3D surface in Scene3D | 24 |
| **BSE** (`core/stellar/bse/`) | §5; run in the stellar worker with the Part II requests protocol extended to pairs and grids | 24 |
| **Audio** (`viz/audio/`) | Web Audio playback of a waveform (only on a click), with a visual playhead and a text alternative | 25 |
| **Many-body engine** (`core/nbody/cluster.ts`, `restricted.ts`) | Plummer and King initial conditions; softened Hermite with block steps; Hill's tidal field; Lagrangian radii and escapers; test particles in moving halos with dynamical friction; the Local Group Monte Carlo | 26–27 |
| **Particle view** (`viz/particles/`) | three.js points with a custom shader for up to ~100,000 stars in Scene3D, colour by a property, keyboard camera, description | 26 |
| **Galaxy core** (`core/galaxy/`) | Rotation-curve components (Hernquist, exponential disc, NFW, isothermal) and fits; Kalnajs's spiral; S2 through Part II's visual-orbit code | 26 |

**Reused from Parts I and II:** the figure frame, Check yourself, the charts, Scene3D, the spectrum view, the HR diagram, the star cutaway, the star drawn true, the life strip, the n-body and Orrery engines (IAS15, Wisdom–Holman, Lagrange points), the visual-orbit and binaries cores, the SSE port and its worker, Model S, Gaia's 100-pc stars and DEBCat, `Dated.tsx` and `asOf.ts`.

---

## 9. Data pipeline

Scripts in `scripts/` download raw data once into `scripts/.cache/` (not committed) and write compact files to `src/data/`, each with its source and licence. Files under their own licences sit in their own folders with READMEs, like `src/data/gaia/`.

| Script or file | Output | Licence | Size target | Stage |
|---|---|---|---|---|
| `build-solar-model.ts` (extended) | Model S's Γ₁ (and opacity, if the file has it) added | Cited | +1 kB | 19 |
| `src/data/rates.ts` | Rate fits for the reactions the figures use | Facts, cited | small | 19–20 |
| `src/data/burningStages.ts` | Woosley, Heger & Weaver's stages for 15 and 25 M☉ | Facts, cited | small | 20 |
| `build-nuclides.ts` | Every nuclide's Z, N, mass excess, binding energy, half-life and decay modes, from the IAEA's LiveChart (ENSDF, NUBASE2020, AME2020) → `src/data/nuclides.json` | IAEA terms, with acknowledgement | ≤ 60 kB gzipped | 21 |
| `build-kadonis.ts` | 30 keV cross sections of 357 isotopes → `src/data/kadonis.json` | Citation (Dillmann et al.) | small | 21 |
| `src/data/abundances.ts`, `origins.ts` | The Sun's isotopic abundances with s/r shares; each element's origins | Published tables, cited (verify) | small | 21 |
| `src/data/whiteDwarfs.ts`, `neutronStars.ts`, `eos.ts` | Measured masses and radii; Read et al.'s parameters | Facts, cited | small | 22–23 |
| `src/data/supernovae.ts` | SN 1987A's and SN 2011fe's bolometric light curves | Published photometry (verify) | small | 22 |
| `build-pulsars.ts` | P, Ṗ, type and binarity → `src/data/atnf/` (with permission), or `src/data/pulsars.ts` (famous pulsars from their papers) | ATNF's permission, or facts | ≤ 40 kB gzipped | 23 |
| `scripts/bse/` | Hurley's BSE in WSL with a driver over a grid → `tests/fixtures/bse/` | Fixtures only | test only | 24 |
| `fetch-gwtc.ts` | The cumulative catalogue → `src/data/gwosc/events.json`; GW150914's strain from both detectors, whitened and band-passed, a second or so → `gw150914.json` | **CC BY 4.0**, own folder | ≤ 40 kB gzipped | 25 |
| `src/data/rotationCurves.ts`, `build-sparc.ts` | The Milky Way's curve (Eilers 2019, Ou 2024); a handful of SPARC galaxies with their stars and gas → `src/data/sparc/` | Facts, cited; SPARC by citation (verify) | small | 26 |
| `src/data/s2.ts`, `localGroup.ts`, `galaxies.ts` | S2's elements; the Local Group's masses and motions with errors; collision presets | Facts, cited | small | 26–27 |
| `src/data/records.ts` (extended) | The heaviest merger, the fastest pulsar, the heaviest white dwarf | Facts, cited | small | 23–25 |

**Dated facts to register in `asOf.ts`:** the merger census and count (every 6 months); LVK's next run (12); the pulsar count (12); the magnetar count (24); NICER's radii (24); T Coronae Borealis (6, until it erupts); the rotation-curve debate (24); the Milky Way–Andromeda odds (24); records (24); Gaia's releases (already registered). Each value lives in `src/data/`, not in the prose, and nothing says "the next" with a fixed date.

---

## 10. Faithfulness: what's exact and what's simplified

| Figure or engine | Plan |
|---|---|
| How hot must the centre be?, the estimate machine | Order-of-magnitude, labelled; the true values from Model S |
| The star that heats as it cools | A polytrope sequence: exact energy bookkeeping; no real opacity or convection, so its timescale is the Kelvin–Helmholtz estimate |
| Fragmentation | The Jeans criterion and the opacity limit as published estimates; no dynamics |
| Lane–Emden | Exact (to the solver's tolerance); polytropes are idealised stars, said in the note |
| The random walk | Exact random walk; the Sun's mean free path from Model S with an approximate opacity |
| Opacity map | Textbook analytic fits, labelled; real opacities from tables (OPAL, OP) differ by tens of per cent |
| Convection or not | Model S's own gradients |
| Build a star | The four equations with ideal gas + radiation, analytic opacities and simple rates, labelled; the Sun within tens of per cent of Model S; no evolution, no rotation |
| The Gamow peak | Exact for non-resonant rates |
| pp and CNO, Hoyle's resonance | Published rate fits; a small network, steady burning at fixed T and ρ |
| The last days | Published models' stages, with their spread; the core's map's regions exact |
| Chart of nuclides | Evaluated data |
| Neutron captures | The s-process with real cross sections and half-lives in a simple steady flow; the r-process a toy (waiting points and a mass formula), labelled |
| Every element's birthplace | Published shares, which are models, said in the note |
| Fermi sea, build a white dwarf | Exact at T = 0 for a pure composition; no Coulomb or relativistic gravity corrections (said, with their size) |
| Cooling and crystallising | Mestel's law with a latent-heat delay; real cooling models are tabulated |
| Collapse and bounce | A toy hydrodynamics code with a stiffening Γ-law and a parametrised neutrino heating, labelled |
| Supernova spectra | Sketched spectra, labelled |
| Radioactive light | Arnett's model (one-zone, constant opacity), the standard first approximation |
| Pair-instability wedge | Exact Γ₁ for ions + radiation + pairs; tracks from Eddington's standard model; outcomes from published models |
| Build a neutron star | Exact TOV for each published equation of state's fit |
| Lighthouse, P–Ṗ | Geometric beams; dipole spin-down with a fixed moment of inertia |
| Orbits near a black hole, bending light | Exact Schwarzschild geodesics; no spin |
| Accretion disc | Shakura–Sunyaev with a black-body spectrum; no relativistic corrections to the spectrum, said |
| Roche explorer, orbit as mass changes hands | Exact Roche geometry and point-mass orbits |
| Algol, the zoo, the Star Forge v2 | BSE's 2002 recipes, tested against Hurley's code; the uncertain parameters shown as sliders |
| The shrinking orbit | Peters' equations, exact to leading order |
| Stretch and squeeze | Exact geometry, amplitude exaggerated (not to scale) |
| Make a chirp | Leading-order (or higher) inspiral with a phenomenological merger and ringdown, labelled; real data beside it |
| The merger census | Real data, with their uncertainties |
| The gravitational-wave spectrum | Analytic sensitivity curves |
| A cluster evaporates, Orrery clusters | Direct summation, softened; a smooth Galactic tide; no stellar evolution or primordial binaries (said) |
| The Galaxy from outside | A model, labelled |
| The rotation curve | Real data; component models and fits |
| The winding problem | Kinematic sketches |
| S2's orbit | Published elements; relativistic effects computed and exaggerated where marked |
| Galaxy collision, will we collide? | Restricted method: stars feel but don't pull; halos as rigid extended masses with friction; uncertainties sampled from published values |
| The Sun's death in the Orrery | SSE's mass loss and radius; an equilibrium tide; no planetary interiors or the Sun's rotation |

Every figure that simplifies gets its **"What's simplified here?"** note, collected on the About page.

---

## 11. Stages 18–29

Each stage is one session and ends as the master plan says (§11): tests, Status, commit, push, deploy, stop. Part III's figures are engines, so most stages take one chapter rather than two.

| Stage | Focus | Done when |
|---|---|---|
| **18** | **Chapter 20** and Toolkit **T8, T9, T11**. The structure core's solver, Lane–Emden and polytrope sequences; the profile plot; the core's map (contraction tracks); Figures 20.1–20.4, T8.1, T9.1, T11.1; Check yourself. | Chapter 20 and three Toolkit pages are live |
| **19** | **Chapter 21** and Toolkit **T10**. Opacities, equations of state, pp and CNO energy rates, the ZAMS solver in a worker; Model S's Γ₁; Figures 21.1–21.4, T10.1. *If the solver fights back:* Eddington's standard model carries Figure 21.4 (with the mass–luminosity relation from the quartic), and the full solver moves to Stage 20. | Chapter 21 and T10 are live |
| **20** | **Chapter 22.** The nuclear core: Gamow peaks, rate fits, a small stiff network; the core's map's ignition lines; burning stages; Figures 22.1–22.4. | Chapter 22 is live |
| **21** | **Chapter 23.** The chart of nuclides with the IAEA data; KADoNiS; the s-process and toy r-process; abundances and origins; Figures 23.1–23.3. | Chapter 23 is live |
| **22** | **Chapters 24 and 25.** Chandrasekhar's equation of state and the white-dwarf solver; cooling; the toy collapse; Arnett's light curves; the pair-instability Γ₁; Figures 24.1–24.3 (stretch 24.4) and 25.1–25.4. *If it overruns:* Figure 25.1 becomes a homologous-collapse sketch, or Chapter 25 moves to Stage 23. | Chapters 24 and 25 are live |
| **23** | **Chapters 26 and 27** and Toolkit **T7**. TOV with piecewise polytropes; spin-down and the lighthouse; the pulsar data (§13, question 2); Schwarzschild geodesics and light; the disc; Figures 26.1–26.4, 27.1, 27.2, 27.4 (stretch 27.3), T7.1. | Chapters 26 and 27 and T7 are live |
| **24** | **The BSE engine and Chapter 28.** See below. | BSE's tests pass against Hurley's code; Chapter 28 is live |
| **25** | **Chapter 29.** Peters' equations; the chirp and Web Audio; GWOSC's catalogue and GW150914's strain; sensitivity curves; Figures 29.1–29.5 (stretch 29.6). | Chapter 29 is live |
| **26** | **Chapter 30.** The many-body engine in a worker; the particle view; rotation-curve models and data; the spiral sketches; S2; Figures 30.1–30.5. | Chapter 30 is live |
| **27** | **Chapter 31** *(optional)*. The restricted galaxy engine; the Local Group Monte Carlo; Figures 31.1–31.2. If Chapter 31 is cut (§13, question 1), this stage goes and the galaxy engine moves to Stage 29. | Chapter 31 is live |
| **28** | **The Star Forge v2** (§5): binaries mode, presets, links from Chapter 28, its tests in the browser. | The Forge's binaries mode is live |
| **29** | **The Orrery v2 and final polish** (§6): many-body modes, general relativity, the Sun's death; an accuracy and copy pass with your review; the glossary, the timeline and the About page; cross-browser (WebKit here); accessibility; performance on the slow-phone profile; every "as of" fact checked; the Moving Parts card. | Part III is complete, and so is the course |

**Stage 24 · The BSE engine and Chapter 28**
- Before it: fetch AMUSE's BSE at commit 9f8c7af, record it, write a driver (`fixture.f`) that runs EVOLV2 over the grid and prints every step, and build it in WSL with gfortran (installed; running the downloaded Fortran needs your approval in the session, as in Stage 13).
- BSE in TypeScript on the SSE port; tested against the fixtures.
- Roche geometry and the potential view; Figures 28.1–28.4; Check yourself.
- *If it overruns:* Chapter 28 moves to Stage 25 beside Chapter 29, and Figure 28.4's grid can start coarse.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| **Scope:** twelve chapters of engines and two labs | One chapter per stage where the engines are heavy; stretch figures marked; Chapter 31 optional; fallbacks named for Stages 19, 22 and 24 |
| **BSE ported with subtle bugs** | Fixtures from Hurley's code over a grid with every binary channel; the SSE port already matches step for step; `ran3` ported exactly for kicks |
| **The ZAMS solver won't converge** across masses | Start from homology scalings; damped Newton; Eddington's standard model as a fallback for the figure |
| **Toy models mistaken for research results** (r-process, collapse, Build a star) | "Toy" in the title or the note, real data beside them, and the grown-up codes named |
| **Experts will check the numbers** | Values from the brief with sources; uncertain ones as ranges; the debated topics shown as debated |
| **Licences:** ATNF's terms, SPARC's and the supernova data's unstated ones | §13 asks; fallbacks from papers' own tables; credits on the About page; GWOSC's in its own folder |
| **Performance:** n-body and particles on phones | Workers, fewer stars on small screens, pausing off-screen, the slow-phone profile in Stage 29 |
| **Audio** | Only on a click, never autoplay; a visual and a text alternative; volume control |
| **Dated facts go stale** (the merger count rises monthly in a run) | Registered in `asOf.ts`; the census rebuilt by its script |
| **Readers who skipped Parts I and II** | "Builds on" links back; equation boxes recap what they need |

---

## 13. Open questions (decided 4 Nov 2026: the defaults below stand)

1. **Does Chapter 31 stay?** *My default: yes, as the optional closing chapter, in a stage of its own (27).* Its engine is the one the Orrery v2's galaxy mode needs anyway, so the extra cost is the text and two figures; it ends at the door to cosmology without teaching it, and the Milky Way–Andromeda question is fresh (2025). If you cut it, Stage 27 goes, the galaxy engine moves to Stage 29, and Chapter 30 closes the course with a short look outward.
2. **ATNF's pulsar data.** Its terms don't clearly allow shipping a derived file (research §8). *My default: ask ATNF for permission to ship each pulsar's P, Ṗ and type, credited* (an email from you, since it's outward-facing; I can draft it). Meanwhile Figure 26.4 is built so that its data can be either the catalogue's or about sixty famous pulsars taken from their papers.
3. **Nuclear data.** *My default: the IAEA's LiveChart data (teaching use allowed with acknowledgement) and KADoNiS's cross sections (citation), each credited*; the stage confirms AME2020's per-article licence and keeps the derived file in its own folder if needed.
4. **The Star Forge's binary defaults.** `binary.in` and the paper use α = 3; `bse.f`'s comment and most modern codes use 1. *My default: the fixtures use `binary.in` exactly; the Forge opens at α = 1 with BSE's 3 marked on the slider, and says why it differs.*
5. **Supernova light curves.** *My default: SN 1987A's and SN 2011fe's published bolometric light curves, cited*; if their terms are unclear, the model alone with the published peaks and tails as markers.
6. **SPARC's rotation curves** (no licence stated, citation asked). *My default: use a handful (NGC 3198 and three or four others), cited*; otherwise the Milky Way's curve alone.
7. **A Fortran compiler.** gfortran is in WSL (Stage 13). *My default: as in Stage 13, you approve compiling and running Hurley's downloaded code in the Stage 24 session.*
8. **Sound.** *My default: Web Audio for Figure 29.3*, only on a click, with a visual and text alternative.
9. **WebGPU.** Most browsers have it now, but not Firefox on Linux or Android (research §14). *My default: WebGL and workers as the main path; WebGPU only for the Orrery's stretch.*
10. **Section titles.** They are now the chapters' planned headings in the registry (§4), and become their addresses' fragments when written. Change any you like before Stage 18.
11. **The Moving Parts card** at the end of Stage 29 ("Parts I–III", the chapter count and both labs). *My default: yes*, so the plan approves it.
