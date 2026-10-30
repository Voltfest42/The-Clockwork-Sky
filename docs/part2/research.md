# Research brief: Part II, the stars

*Compiled 28 Oct 2026 (Stage 9) as reference material for Part II · The Stars. The companion to [plan.md](plan.md). Part II's science is settled at the level it teaches; the work is in the numbers, in data we're allowed to ship, in a stellar-evolution engine we can test against its authors' code, and in figures that confront what readers already believe about stars.*

**Marks used below**
- **(checked)** verified against the source on 28 Oct 2026.
- **(std)** a standard reference value or textbook fact, written from knowledge; check the exact figure before it goes on screen.
- **(verify)** likely to change, or uncertain; check it in the stage that uses it.
- **(computed)** worked out here from the values above it.

## TL;DR

- **What readers believe about stars is documented, and it is mostly wrong in the same few ways.** Before instruction, a third of college students say starlight comes from burning and only 7% name fusion; almost none can say how a star forms (Bailey et al. 2009, over 1,000 responses; checked). Students read the HR diagram as a path stars travel (Agan 2004), think red is hotter than blue (71% of non-scientists in one study), and think bigger stars live longer because they have more fuel (the Star Properties Concept Inventory's target). Part II's key figures are built around these (§1).
- **Two licences differ from what the master plan assumed:**
  - **Gaia data are CC BY-NC 3.0 IGO**, not CC BY-SA (ESA's licence page; checked). The HR diagram and the clusters would ship Gaia-derived files under a non-commercial licence.
  - **MIST says "© MIST. All rights reserved"** and states no licence (checked). The Star Forge's optional "detailed models" mode can't use it without permission.
  - **SILSO's sunspot numbers are CC BY-NC 4.0** (checked), as the master plan said.
  - moving-parts.dev has no ads, sponsorship or payments (checked in the Moving Parts source), so non-commercial terms fit, but that is your call (plan §12).
- **The Star Forge's engine is testable.** Hurley's SSE source is in AMUSE's GitHub repository, "the SSE distribution unchanged" (checked), with its default switches and its wind formulas readable (§12). It needs a Fortran compiler: WSL Ubuntu 26.04 is on this machine, without gfortran (checked).
- **Timely hooks, all as of October 2026 (checked):**
  - **6,451 confirmed exoplanets** (NASA Exoplanet Archive, 15 Oct 2026), 1,012 of them from TESS.
  - Solar Cycle 25 **peaked in October 2024**, smoothed sunspot number 160.9 (revised to 161).
  - Parker Solar Probe passed **6.1 million km from the Sun's surface** at 692,000 km/h on 24 Dec 2024.
  - Betelgeuse's companion, **Siwarha**, was first seen in July 2025.
  - The **Nancy Grace Roman Space Telescope launched on 30 Aug 2026**; Rubin's **LSST began on 29 Jun 2026**; ESO's ELT expects first light in **March 2029**.
  - **T Coronae Borealis** had still not erupted.

---

## 1. How readers think about stars

**Bailey, Prather, Johnson & Slater (2009),** "College students' preinstructional ideas about stars and star formation", *Astronomy Education Review* 8, 010110 (doi 10.3847/AER2009038). Open-ended surveys of non-science undergraduates before an introductory course (checked, from the paper's tables):
- *What is a star?* (391 responses): over 80% said a star is made of gas (43% "a ball of gas"); 44% said it is burning; 4% mentioned fusion; 2% gave a complete answer (gas, and fusion).
- *How is the light we see from stars created?* (1,071 responses): 32% burning; 7% fusion; 3% correct.
- *How is a star formed?* (904 responses): nearly half said material comes together somehow, but 0.3% gave a complete answer (gas, pulled in by gravity, heating as it falls, fusion starting).
- *Are all stars the same?* (381 responses): 4% said yes; differences named were mostly size, temperature and colour, and 16% mentioned distance.
- The authors point out that astronomers themselves call fusion "hydrogen burning".

**Other sources**
- **Agan (2004),** "Stellar ideas: exploring students' understanding of stars", *Astronomy Education Review* 3(1), 77–97 (checked: abstract and summaries). Interviews with high-school and first-year students: students without astronomy didn't see the Sun as a star, had no sense of stellar distances, saw stars as burning objects, and read the HR diagram as a trajectory. A semester of high-school astronomy helped a lot.
- **The Star Properties Concept Inventory** (Bailey, Johnson, Prather & Slater 2012, *IJSE* 34, 2257): 23 items on mass, temperature, luminosity, lifetime, fusion and formation, with distractors from known wrong ideas. Introductory courses averaged about 31% before and 51% after (checked: abstract and summaries). The classic wrong idea about lifetime is that a heavier star, with more fuel, lives longer (std).
- **The Light and Spectroscopy Concept Inventory** (Bardar, Prather, Brecher & Slater 2007, *AER* 5(2), 103): 26 items on the spectrum, photon energies, Wien's and Stefan–Boltzmann's laws, Doppler shifts and spectra (checked: description). Known difficulties include thinking radio waves are sound, that kinds of light travel at different speeds, and that X-rays and visible light are different phenomena (std).
- **Red is hot:** about 71% of non-scientists judged red hotter than blue when reading an astronomical image (Arcand, Watzke, Rector et al. 2013, *Studies in Media and Communication* 1(2), 25; arXiv:1308.5237; the authors checked, the percentage from a summary of the paper's body, so verify it before quoting).
- **Reading the HR diagram is hard:** an eye-tracking study found it loads students more than ordinary x–y plots, because of the reversed temperature axis, magnitudes and spectral classes (Langendorf, Schneider & Klein 2022; checked: summary).
- Comins, *Heavenly Errors* (2001), lists star misconceptions too: the Sun is yellow, the Sun is an average star, stars twinkle because they pulse, all stars explode, black holes suck things in (std).

**Design consequences for Part II**
- **Predict, then reveal.** "Which is hotter, a red star or a blue one?" (Fig. 11.1); "Which lives longer, a heavy star or a light one?" (Fig. 17.1).
- **Name "burning" and replace it.** Chapter 15's fuel gauge shows how long the Sun would last as a coal fire, as a shrinking ball and as a fusion reactor.
- **A snapshot is not a path.** Clusters and isochrones (Fig. 17.3) show the HR diagram as a photograph of stars of one age, not a road.
- **Say how we know.** Every number about a star comes from its light, its distance or a companion's orbit, and the figures show which.

| Common misconception | Where Part II confronts it |
|---|---|
| Stars shine because they are burning | Ch. 15: the fuel gauge (Fig. 15.4); Check yourself |
| Red stars are hotter than blue ones | Fig. 11.1, predict first |
| The Sun is yellow | Fig. 11.1 (the Sun's colour above the air) |
| The Sun isn't a star, or is an average one | Ch. 13: the Sun among its neighbours on the HR diagram |
| All stars are the same, at the same distance | Ch. 13; the 100-parsec HR diagram (Fig. 13.2) |
| Telescopes go to space to get closer to the stars | Fig. 10.3; Check yourself |
| A bigger telescope is about magnification | Figs. 10.2 and 10.4 (light and sharpness) |
| Radio waves are sound; X-rays aren't light | Fig. 10.1, the spectrum ruler |
| Dark lines are missing light, or dust | Fig. 12.1, Kirchhoff's three spectra |
| Stars made of different things have different spectra | Fig. 12.3, Payne's curves: temperature, not composition |
| Stars move along the main sequence as they age | Figs. 13.2, 17.2 and 17.3 |
| Heavier stars live longer (more fuel) | Fig. 17.1, predict first |
| Every star ends as a supernova; the Sun will explode or become a black hole | Fig. 18.5, the fork in the road |
| Planetary nebulae have to do with planets | Ch. 18 |
| Black holes suck everything in | Ch. 18: a black hole's companion orbits it like any other star (Fig. 18.4) |
| Exoplanets are photographed | Ch. 19: almost all are found by wobbles and shadows |
| "In the habitable zone" means "has life" | Fig. 19.4; Check yourself |

---

## 2. Light (Chapter 10)

**Constants** (exact in SI since 2019, std): c = 299,792,458 m/s; h = 6.626 070 15 × 10⁻³⁴ J s; k = 1.380 649 × 10⁻²³ J/K; e = 1.602 176 634 × 10⁻¹⁹ C, so 1 eV = 1.602 × 10⁻¹⁹ J; hc = 1,239.84 eV nm.

**The spectrum** (boundaries are conventions; std)

| Band | Wavelength | Photon energy | Reaches the ground? | What it shows in the sky |
|---|---|---|---|---|
| Gamma rays | < 0.01 nm | > 100 keV | No (absorbed above ~30 km) | Nuclear processes, pulsars, gamma-ray bursts |
| X-rays | 0.01–10 nm | 0.1–100 keV | No (absorbed above ~40–100 km) | Million-degree gas: the corona, gas falling into black holes, supernova remnants |
| Ultraviolet | 10–400 nm | 3–100 eV | Only above ~300–310 nm (ozone) | Hot stars, the chromosphere |
| Visible | 400–700 nm | 1.8–3.1 eV | Yes | Stars like the Sun, ionised gas (Hα) |
| Infrared | 0.7 µm–1 mm | 1 meV–1.8 eV | In windows (J, H, K, L, M, N); mostly absorbed by water and CO₂ | Cool stars, dust, young stars in their cocoons, brown dwarfs |
| Microwave / millimetre | 1–10 mm | — | Partly, at high dry sites (ALMA at 5,000 m) | Cold molecular gas and dust |
| Radio | > 1 cm (to ~10–30 m) | < 0.1 meV | Yes, down to the ionosphere's cut-off at ~10–30 MHz | Cold hydrogen (21 cm), pulsars, jets |

- Photon energies (computed): 550 nm → 2.25 eV; 1 nm → 1.24 keV; 21 cm → 5.9 µeV.
- **Discoveries** (std): Newton's prism experiments 1666 (*Opticks* 1704); infrared by William Herschel 1800 (a thermometer beyond the red); ultraviolet by Ritter 1801; radio waves by Hertz 1887; X-rays by Röntgen 1895; gamma rays by Villard 1900; radio from the Milky Way by Jansky 1932; the first X-ray source beyond the Sun, Sco X-1, 1962 (Giacconi). Planck's quantum 1900; Einstein's photons 1905 (Nobel 1921).
- **Counting photons** (computed): a V = 0 star gives about 3.6 × 10⁻⁹ erg cm⁻² s⁻¹ Å⁻¹ at 550 nm, about **1,000 photons per cm² per second per ångström**; through a V filter (~880 Å) about 9 × 10⁵ photons cm⁻² s⁻¹. A dark-adapted pupil (7 mm, 0.385 cm²) catches about 3 × 10⁵ a second from Vega and about 1,400 from a magnitude-6 star.
- **Atmosphere** (std): ozone absorbs below ~300 nm; water vapour and CO₂ block most of the infrared outside the windows; the ionosphere reflects radio below ~10–30 MHz; X-rays and gamma rays are absorbed tens of kilometres up. Rayleigh scattering ∝ λ⁻⁴ makes the sky blue and the low Sun red. *Seeing* at good sites is 0.5–1″; the eye resolves about 1′. The figure of "how far down each kind of light gets" is a classic schematic; there is no single dataset behind it, so the figure should be a sketch from band values, and labelled as such.

**Telescopes** (std unless marked)

| Telescope | Aperture | Year | Notes |
|---|---|---|---|
| Galileo's | ~2–4 cm | 1609 | |
| Newton's reflector | 3.3 cm | 1668 | |
| Herschel's "40-foot" | 1.2 m | 1789 | |
| Hooker, Mount Wilson | 2.5 m | 1917 | Hubble's and Michelson's telescope |
| Hale, Palomar | 5.1 m | 1948 | |
| Keck I and II | 10 m (segmented) | 1993, 1996 | |
| Hubble Space Telescope | 2.4 m | launched 24 Apr 1990 | |
| James Webb Space Telescope | 6.5 m, 25.4 m² | launched 25 Dec 2021 | infrared, at Sun–Earth L2 |
| Vera C. Rubin Observatory | 8.4 m | LSST began 29 Jun 2026 (checked) | |
| Nancy Grace Roman Space Telescope | 2.4 m, wide field | launched 30 Aug 2026 on Falcon Heavy (checked) | microlensing survey, to L2 |
| ESO Extremely Large Telescope | 39 m | first light planned March 2029, science December 2030 (checked) | |
| FAST | 500 m dish | 2016 | radio |
| Arecibo | 305 m | collapsed 1 Dec 2020 | radio |
| ALMA | 66 antennas | 2011–13 | millimetre |
| Event Horizon Telescope | Earth-sized baseline | M87* image 2019, Sgr A* 2022 | 1.3 mm |

- **Light-gathering** (computed): JWST's 25.4 m² is about 660,000 dark-adapted pupils, about 14.5 magnitudes fainter for the same time.
- **Resolution** (std): the Rayleigh criterion θ = 1.22 λ/D, from the Airy pattern of a circular aperture (intensity ∝ [2 J₁(x)/x]²). Values (computed): the eye's 7 mm pupil at 550 nm, 20″ (the eye's real limit, ~1′, is set by the retina); Hubble at 550 nm, 0.058″; JWST at 2 µm, 0.077″; the ELT at 2.2 µm, 0.014″; the EHT at 1.3 mm over ~10,700 km, ~30 µas (it reached ~20–25 µas).
- **The first star measured:** Michelson and Pease measured Betelgeuse at 0.047″ with an interferometer on the Hooker telescope, 13 Dec 1920 (std).
- **Double stars to split** (std; their separations change with their orbits, so compute today's from orbital elements in the stage, using the binary code of §6): Albireo ~35″; Mizar–Alcor ~12′ and Mizar A–B ~14″; ε Lyrae's pairs ~2.3″ and ~2.4″, 208″ apart; Castor A–B ~5″; Sirius A–B ~11″ around 2025; α Centauri A–B a few arcseconds and widening.

---

## 3. Thermal radiation (Chapter 11)

- **Planck's law** B_λ(T) = (2hc²/λ⁵) / (e^{hc/λkT} − 1) (std).
- **Wien's law** λ_peak = b/T, b = 2.897 771 955 × 10⁻³ m K (std). Peaks (computed): you at 310 K, 9.3 µm; Betelgeuse (3,600 K), 805 nm; the Sun (5,772 K), 502 nm; Sirius A (9,940 K), 292 nm; a 40,000 K O star, 72 nm.
- **Stefan–Boltzmann law** F = σT⁴, σ = 5.670 374 419 × 10⁻⁸ W m⁻² K⁻⁴ (std); L = 4πR²σT⁴. In solar units L = R² T⁴ (computed check: the Sun's surface gives 63 MW/m², and 4πR☉² × 63 MW/m² = 3.828 × 10²⁶ W).
- **The Sun's nominal values** (IAU 2015 Resolution B3; std): R☉ = 695,700 km, total solar irradiance S☉ = 1,361 W/m², L☉ = 3.828 × 10²⁶ W, T_eff = 5,772 K, GM☉ = 1.327 124 4 × 10²⁰ m³ s⁻². IAU 2015 B2 sets M_bol = 0 at L₀ = 3.0128 × 10²⁸ W, which makes the Sun's M_bol = 4.74 (std). The code already has R☉, L☉ and GM☉ (`src/core/constants.ts`).
- **Measuring the Sun's power** (computed): 1,361 W/m² × 4π (1 AU)² = 3.83 × 10²⁶ W. Sunlight per square metre (computed): Mercury 9,080 W/m², Earth 1,361, Jupiter 50, Neptune 1.5, Voyager 1 (~172 AU) 0.046.
- **The Sun is white.** Its colour above the atmosphere is close to white (sRGB from its spectrum); it looks yellow low in the sky because the air scatters blue out (std). The course's `blackBodyColour` already does this calculation.
- **No green stars:** a Planck spectrum peaking in the green is broad enough to look white; the Planckian locus never enters the green region of the chromaticity diagram (std).
- **Colour index B − V** (std): Sun 0.65 (0.653, Ramírez et al. 2012); Sirius 0.00; Vega 0.00; Betelgeuse ~1.85; Rigel −0.03; Spica −0.23. T from B − V: Ballesteros (2012), already in `src/core/stars/photometry.ts`. Johnson B and V passbands: Bessell (1990, *PASP* 102, 1181) tables (std).
- **Game engines know Planck too:** Unreal and Unity let a light's colour be set by a temperature in kelvin (std). A good analogy for 11.1.

**Star temperatures, sizes and powers** (std unless marked; check each in the stage, and put the values, with sources, in one data file)

| Star | Class | T_eff (K) | R (R☉) | L (L☉) | M (M☉) | d (pc) |
|---|---|---|---|---|---|---|
| Sun | G2 V | 5,772 | 1 | 1 | 1 | — |
| Proxima Centauri | M5.5 V | ~3,050 | 0.154 | 0.0017 | 0.122 | 1.302 |
| Barnard's star | M4 V | ~3,200 | 0.19 | 0.0035 | 0.16 | 1.83 |
| α Centauri A / B | G2 V / K1 V | 5,790 / 5,260 | 1.22 / 0.86 | 1.5 / 0.50 | 1.08 / 0.91 | 1.35 |
| Sirius A | A1 V | 9,940 | 1.71 | 25 | 2.06 | 2.64 |
| Sirius B | DA white dwarf | ~25,000 | 0.0081 | ~0.025 (computed from R and T) | 1.02 | 2.64 |
| Procyon A / B | F5 IV–V / white dwarf | 6,530 / ~7,700 | 2.05 / 0.012 | 6.9 / 0.0005 | 1.48 / 0.59 | 3.51 |
| Vega | A0 V (pole-on, fast spin) | ~9,600 | ~2.5 | 40 | 2.1 | 7.7 |
| Arcturus | K1.5 III | 4,290 | 25 | 170 | ~1.1 | 11.3 |
| Aldebaran | K5 III | 3,900 | 45 | 440 | 1.2 | 20 |
| Polaris | F7 Ib (Cepheid) | ~6,000 | ~40 | ~1,300 | ~5.4 | ~135 |
| Betelgeuse | M1–2 Ia–Iab | ~3,600 | ~750 (estimates 640–1,000) | ~90,000 (computed from R and T; estimates 60,000–150,000) | ~16–19 | ~170–220 |
| Antares | M1.5 Iab | ~3,600 | ~680 | ~75,000 | ~13–15 | ~170 |
| Rigel | B8 Ia | ~12,100 | ~80 | ~120,000 | ~21 | ~260 |
| Deneb | A2 Ia | ~8,500 | ~200 | ~200,000 | ~19 | ~800 (uncertain) |
| Spica A | B1 III–IV | ~25,000 | 7.5 | ~20,000 | 11 | 77 |

---

## 4. Spectra (Chapter 12)

**Lines** (air wavelengths, nm; std; check against the NIST Atomic Spectra Database)

| Line | λ (nm) | Fraunhofer letter |
|---|---|---|
| O₂ (in our own air) | 759.4, 686.7 | A, B |
| Hα | 656.28 | C |
| Na I D₂, D₁ | 588.995, 589.592 | D |
| He I (the "D₃" line, helium's discovery) | 587.56 | — |
| Fe I | 527.04 | E |
| Mg I b | 516.73, 517.27, 518.36 | b |
| Hβ | 486.13 | F |
| He II | 468.57 | — |
| He I | 447.15 | — |
| Hγ | 434.05 | G′ (G is CH and Fe at 430.8) |
| Ca I | 422.67 | g |
| Hδ | 410.17 | h |
| Ca II H, K | 396.85, 393.37 | H, K |

- **Hydrogen** (std): Rydberg constant for hydrogen 1.096 78 × 10⁷ m⁻¹; 1/λ = R(1/n₁² − 1/n₂²); ionisation energy 13.598 eV. Series: Lyman (n₁ = 1, ultraviolet), Balmer (2, visible), Paschen (3, infrared). Bohr's model 1913.
- **Ionisation energies** (eV; std): H 13.60; He I 24.59, He II 54.42; Na 5.14; Mg 7.65; Ca I 6.11, Ca II 11.87; Fe I 7.90; Ti I 6.83. TiO's dissociation energy ~6.9 eV (std).
- **History** (std): Wollaston saw seven dark lines in 1802; Fraunhofer mapped 574 in 1814; Kirchhoff and Bunsen matched lines to elements in 1859–60 and Kirchhoff stated his three laws (a hot dense body gives a continuous spectrum, a hot thin gas bright lines, a cool gas in front of a hot source dark lines). Helium: a yellow line in the solar prominences seen by Janssen at the eclipse of 18 Aug 1868 and by Lockyer that October, named by Lockyer and Frankland; found on Earth by Ramsay in 1895.
- **Classification** (std): Secchi's classes in the 1860s. At Harvard, Pickering's "computers": Williamina Fleming's A–Q classes (the 1890 Draper catalogue), Antonia Maury's line-width notes (which Hertzsprung used to separate giants), Annie Jump Cannon's OBAFGKM order (1901) and the Henry Draper Catalogue (1918–24, 225,300 stars); Cannon classified about 350,000 stars in her career. Saha's ionisation equation (1920) showed the sequence is temperature. **Cecilia Payne** (thesis 1925, *Stellar Atmospheres*) used it to show stars are overwhelmingly hydrogen and helium; Russell called the result "clearly impossible" at first and confirmed it himself in 1929. The MK luminosity classes I–V (Morgan, Keenan & Kellman 1943). L and T dwarfs (Kirkpatrick et al. 1999; Burgasser et al. 2002), Y dwarfs (Cushing et al. 2011).
- **Where lines peak** (std; the stage's model should reproduce these): He II in O stars (> 30,000 K); He I near B2 (~20,000 K); hydrogen's Balmer lines near A0 (~9,500–10,000 K); Ca II H and K in G and K stars; neutral metals and TiO bands in K and M stars (< ~4,000 K for TiO).
- **The Sun's make-up** (std): present-day photosphere by mass X = 0.7438, Y = 0.2423, Z = 0.0139 (Asplund, Amarsi & Grevesse 2021, *A&A* 653, A141; Z/X = 0.0187). Magg et al. (2022, *A&A* 661, A140) find Z/X = 0.0225. By number, about 92% hydrogen and 8% helium. The **solar abundance problem**: low-Z models disagree with helioseismology (the convection zone's depth, the sound speed); higher Z fits better. It is an open question, and worth a deep dive (§7).
- **Doppler** (std): Doppler 1842; Fizeau for light 1848; Huggins claimed Sirius's motion in 1868; Vogel measured radial velocities photographically from 1888. v = c Δλ/λ for v ≪ c. Examples (std): Barnard's star −110 km/s, Arcturus −5 km/s, Aldebaran +54 km/s. Line widths also show temperature (thermal broadening), pressure (giants' lines are narrower, the basis of the MK classes) and rotation (Altair's lines show ~240 km/s; Vega's only ~20 km/s, because we see it nearly pole-on, though its equator moves at ~200 km/s).

**Real spectra to compare with.** The X-shooter Spectral Library DR3 (Verro et al. 2022, *A&A* 660, A34): 830 spectra of 683 stars, 350–2480 nm at R ~ 10,000, de-reddened, on VizieR (J/A+A/660/A34; checked). ESO's archive data are CC BY 4.0 (ESO's data access policy; checked), but whether XSL's VizieR release carries the same terms is (verify). HST's CALSPEC spectra (Vega, Sirius, the Sun) are another option (terms: verify).

---

## 5. Sorting the stars (Chapter 13)

- **Magnitudes** (std): Hipparchus' six classes; Pogson (1856) fixed five magnitudes as a factor of 100, so one magnitude is 100^{1/5} = 2.512. m₁ − m₂ = −2.5 log₁₀(F₁/F₂); m − M = 5 log₁₀(d / 10 pc). Part I already uses them (Ch. 9, `src/core/stars/distance.ts`: the Sun's M_V = 4.83). Values: Sun −26.74; full Moon −12.7; Venus up to −4.6; Sirius −1.46; Vega 0.03; Polaris 2.0; Pluto ~14; the faintest JWST galaxies ~31.
- **Photometric systems** (std): Johnson UBV (1953); Gaia's G, G_BP and G_RP (very broad bands; Gaia saturates brighter than G ≈ 3, so the brightest stars are missing or poor in Gaia).
- **The diagram** (std): Hertzsprung (1905–11, the Pleiades and Hyades in colour–magnitude form) and Russell (1913–14, absolute magnitude against spectral class). Hot is on the left because the spectral classes were ordered OBAFGKM. About 90% of stars are on the main sequence.
- **Gaia's diagrams:** Gaia Collaboration, Babusiaux et al. (2018, *A&A* 616, A10), the DR2 HR diagrams that showed the white-dwarf sequence's split and fine structure (std). **The Gaia Catalogue of Nearby Stars** (Gaia Collaboration, Smart et al. 2021, *A&A* 649, A6): 331,312 objects within 100 pc (std; VizieR J/A+A/649/A6, which refused connections from here). Gaia's white dwarfs: Gentile Fusillo et al. (2021) list about 359,000 high-confidence candidates in EDR3 (std); the 100-pc sample has some 10,000 or more (verify).
- **What a brightness-limited sample hides** (std, and in Part I): the naked-eye stars are mostly luminous stars seen from far away; a volume-limited sample (all stars within 20 or 100 pc) is mostly red dwarfs. Part I's Ch. 9 counts the 10-pc sample (Reylé et al. 2021). Figure 13.2 should show both.
- **Bolometric corrections and colour → temperature** for putting Gaia stars on the physicists' axes and models on the observers' (std): Mamajek's table of dwarf colours, temperatures and bolometric corrections (O3V–Y, with G_BP − G_RP and M_G; version 2022.04.16; checked), which asks for a citation to Pecaut & Mamajek (2013, *ApJS* 208, 9) and states no licence; Andrae et al. (2018) give BC_G(T_eff) as a polynomial for 3,300–8,000 K; Casagrande et al. (2021, *MNRAS* 507, 2684) give T_eff from G_BP − G_RP with gravity and metallicity terms. White dwarfs need their own relation (DA models; std).
- **Biggest stars:** the largest radii, ~1,500–2,000 R☉ (UY Sct, Stephenson 2-18, WOH G64), are uncertain because the distances, edges and temperatures of red supergiants are (std). Say "the largest known, about 1,500 times the Sun's width, give or take".

---

## 6. Binary stars and stellar masses (Chapter 14)

- **History** (std): Mizar was the first double seen in a telescope (Castelli 1617 in a letter to Galileo; Riccioli 1650). William Herschel showed in 1803 that some doubles orbit each other (Castor). Bessel predicted Sirius's unseen companion from its wobble (1844), and Alvan Graham Clark saw Sirius B on 31 Jan 1862. Goodricke timed Algol's dips in 1783 (2.867 days). Pickering found the first spectroscopic binary, Mizar A, in 1889 (20.5 days).
- **Kepler's third law with masses** (std; Part I's `orbits/ellipse.ts` has it): M₁ + M₂ = a³/P² in M☉, AU and years.
- **α Centauri A and B** (std): P = 79.9 years, a = 17.66″, e = 0.52; masses 1.079 and 0.909 M☉ (Akeson et al. 2021) — the older Pourbaix & Boffin (2016) values are 1.133 and 0.972. Use one consistent solution (verify).
- **Sirius A and B** (std): P = 50.13 years, a = 7.50″, e = 0.59, ϖ = 379 mas, so a = 19.8 AU and M = 3.08 M☉ (computed), split 2.063 and 1.018 M☉ (Bond et al. 2017, *ApJ* 840, 70).
- **How common pairs are** (std): nearly half of Sun-like stars have a companion (Raghavan et al. 2010: 56% single, 33% binary, 11% triple or more); about a quarter of M dwarfs (Winters et al. 2019); almost all O stars, and 70% of them interact (Sana et al. 2012).
- **Precise masses and radii:** Torres, Andersen & Giménez (2010, *A&ARv* 18, 67): about 95 detached eclipsing binaries with masses and radii to 3% (std). Southworth's DEBCat: masses and radii to ~2%, "over 195 systems" in the 2017 VizieR copy (V/152), growing (checked); its terms are a citation of Southworth (2015) (verify).
- **The mass–luminosity relation** (std): Eddington (1924). Textbook pieces: L ∝ M^2.3 below 0.43 M☉, M^4 for 0.43–2 M☉, M^3.5 for 2–55 M☉, roughly ∝ M above. Eker et al. (2018, *MNRAS* 479, 5491) fit six pieces to 509 stars. Twice the Sun's mass gives about 11 times its luminosity (computed, 2^3.5).
- **The mass function**, f(M) = P K³ / (2πG) = M₂³ sin³i / (M₁ + M₂)²: a minimum mass for an unseen companion from the visible star's period and velocity amplitude (std). It is how quiet black holes are found (§10).
- **Eclipses** (std): the dips' lengths give the radii relative to the orbit; their depths give the ratio of surface brightnesses; limb darkening rounds the bottoms. With both stars' velocities, the masses and radii are absolute.

---

## 7. The Sun (Chapter 15)

| Quantity | Value |
|---|---|
| Age | 4.567 billion years (oldest meteorite grains; Connelly et al. 2012) (std) |
| Mass, radius, luminosity, T_eff | nominal values in §3 (std) |
| Rotation | ~25 days at the equator (sidereal 24.5), ~35 near the poles (std) |
| Core | ~15.7 million K, ~150 g/cm³ (standard solar models: BS05, B16) (std) |
| Fusion | 99% of the power within ~0.25 R☉ (std) |
| Radiative zone | to 0.713 R☉, the convection zone's base measured by helioseismology (Christensen-Dalsgaard, Gough & Thompson 1991; Basu & Antia 1997) (std) |
| Photosphere | 5,772 K; limb darkening shows deeper, hotter layers in the middle (std) |
| Granules | ~1,000–1,500 km across, lasting minutes (std); supergranules ~30,000 km, about a day (std) |
| Chromosphere | from a temperature minimum of ~4,400 K up to ~20,000 K (std) |
| Corona | 1–3 million K; seen at total eclipses (Part I, Ch. 4) (std) |
| Solar wind | slow ~400 km/s, fast ~750 km/s; about 1–2 million tonnes a second (std) |
| Mass turned into light | L/c² = 4.26 million tonnes a second (computed) |
| Hydrogen fused | about 600 million tonnes a second (computed: L ÷ 0.71% of c²) |
| Neutrinos at Earth | about 6.5 × 10¹⁰ per cm² per second (computed: two per 26.7 MeV) |

- **Fusion in outline** (std): four protons → helium-4, two positrons and two neutrinos; 26.73 MeV a helium nucleus, 0.71% of the mass; the neutrinos take about 2% of it. Bethe (1939) worked out the pp chain and the CNO cycle (Nobel 1967). Eddington proposed "subatomic energy" in 1920.
- **Other fuels** (computed): coal (~3 × 10⁷ J/kg) would power the Sun for about **5,000 years**; shrinking under gravity (the Kelvin–Helmholtz time GM²/RL) for about **31 million years**; hydrogen fusion for about **10 billion**. Kelvin's ages of the Sun versus Darwin's and the geologists' is Part III's story (Ch. 20); Part II needs only the comparison.
- **The photon's random walk:** estimates of how long the energy takes to get out run from about 10⁴ to 1.7 × 10⁵ years (Mitalas & Sills 1992 gave ~170,000) (std). Present it as a range, with the estimate's method in a deep dive.
- **Sunspots** (std): umbrae ~3,000–4,500 K, penumbrae ~5,500 K; magnetic fields of a few thousand gauss (Hale measured them by the Zeeman effect, 1908); Galileo saw them rotate (1610–13); Schwabe found the ~11-year cycle (1843); Wolf's relative number (1848); the Maunder minimum, 1645–1715; Maunder's butterfly diagram (1904); Hale's polarity law (1919) makes the magnetic cycle ~22 years. Cycle 19 peaked at a smoothed 285 in March 1958 (SILSO V2; std), the highest since records began.
- **Solar Cycle 25** (checked): began December 2019; peaked in **October 2024** at a smoothed 160.9 (SILSO's revised value: 161); the highest monthly mean was 216.0 in August 2024; the 2019 prediction panel had expected 115 in July 2025. SILSO thought a second, higher peak unlikely and expected similar activity well into 2026. Don't write "the next maximum" with a date (CLAUDE.md).
- **Space weather** (std): the Carrington event, 1 Sep 1859 (a flare seen by Carrington and Hodgson; aurorae in the tropics a day later); the Quebec blackout, 13 Mar 1989; the Halloween storms of 2003; the first G5 storm since 2003 on 10–11 May 2024; 38 of 49 new Starlink satellites lost to a minor storm in February 2022. Travel times to Earth: light 8 min 19 s; the fastest particles tens of minutes; a fast CME a day or two (Carrington's took ~17.6 hours); the solar wind ~4 days (computed from its speed).
- **Neutrinos** (std): Davis's chlorine experiment at Homestake (from 1968) caught about a third of the predicted rate (2.56 SNU measured against ~8); Kamiokande saw solar neutrinos come from the Sun's direction (1989); SNO showed in 2001–02 that the total of all flavours matches the solar model, so the "missing" ones had changed flavour. Nobels: Davis and Koshiba 2002; Kajita and McDonald 2015. Borexino measured the pp neutrinos (2014) and the CNO neutrinos (2020). JUNO began taking data in August 2025 and published its first result, on reactor neutrinos, in June 2026 (checked).
- **Helioseismology** (std): the Sun rings in millions of modes with periods near 5 minutes (Leighton 1962; explained by Ulrich 1970 and by Leibacher & Stein 1971); it measures the convection zone's depth, the internal rotation and the sound speed.
- **Missions** (checked unless marked): Parker Solar Probe (launched 12 Aug 2018, std) passed 6.1 million km from the surface at about 692,000 km/h on 24 Dec 2024, and matched it in 2025; Solar Orbiter imaged the Sun's south pole for the first time in March 2025 (released June 2025), with its tilt rising to ~24° in December 2026; DKIST, 4 m, first images January 2020 (std); Aditya-L1 (India, 2023), Proba-3 (ESA's formation-flying artificial eclipses, 2025) and PUNCH (NASA, 2025) (std).
- **The Sun's spectrum and colour** are in §3–4.

---

## 8. Star formation (Chapter 16)

- **The interstellar medium** (std): on average ~1 atom per cm³; phases from hot ionised gas (~10⁶ K, ~0.003 cm⁻³) through warm (~8,000 K, ~0.1–0.5 cm⁻³) and cold neutral (~100 K, ~30 cm⁻³) to molecular clouds (10–20 K, 10²–10⁶ cm⁻³). About 1% of the mass is dust. Molecular hydrogen is invisible, so clouds are traced by CO and dust.
- **Dust dims and reddens** (std): about 1–2 magnitudes of extinction per kiloparsec in V near the plane; R_V = A_V / E(B − V) ≈ 3.1; the extinction curve of Cardelli, Clayton & Mathis (1989) or Fitzpatrick (1999). Infrared passes through: A_K ≈ 0.1 A_V. Trumpler showed in 1930 that dust dims distant clusters (Part I, Ch. 9).
- **Dark clouds** (std): Barnard 68, ~125–150 pc, ~2 M☉, ~16 K, a radius of 12,500 AU (Alves, Lada & Lada 2001; checked in Stage 13: radius, not diameter); the Coalsack; Taurus at ~140 pc; the Orion Nebula at 414 pc (Menten et al. 2007; Gaia ~390 pc).
- **Jeans criterion** (std): a cloud collapses if it is heavier than M_J ∝ T^{3/2} ρ^{−1/2}. For 10 K molecular gas (μ = 2.33) at 10⁴ particles per cm³, M_J ≈ 5 M☉ with the convention M_J = (5kT/Gμm_H)^{3/2} (3/4πρ)^{1/2} (computed); other conventions differ by a factor of a few, so state the one used. Free-fall time t_ff = (3π/32Gρ)^{1/2} ≈ 0.34 Myr at that density (computed). Jeans 1902; Part III does it properly (Ch. 20).
- **Protostars** (std): Class 0, I, II, III objects; discs and bipolar jets (Herbig–Haro objects, 1951–52); T Tauri stars (Joy 1945); HL Tau's disc (ALMA 2014, in Part I's Ch. 8). The virial theorem: a contracting ball of gas keeps half the gravitational energy it releases as heat and radiates the other half (Part III, Ch. 20).
- **Arriving on the main sequence** (std): Hayashi's fully convective tracks (1961) at nearly constant T_eff, then Henyey's radiative tracks (1955) for stars above ~0.5 M☉. Times to the zero-age main sequence: a 1 M☉ star ~30–50 Myr; a 0.1 M☉ star hundreds of millions of years; O stars are already on it while still gathering mass. Published pre-main-sequence tracks: BHAC15 (Baraffe et al. 2015, *A&A* 577, A42; 0.01–1.4 M☉; the site asks only for the citation, no licence stated; checked), MIST (no licence; §12), PARSEC (terms not found; checked).
- **Brown dwarfs** (std unless marked): predicted by Kumar (1962–63) and Hayashi & Nakano (1963); the first confirmed in 1995: Teide 1 in the Pleiades and Gliese 229B (resolved in 2024 into a pair of brown dwarfs of ~38 and ~34 Jupiter masses). The **hydrogen-burning limit is 0.075 M☉ (78.5 Jupiter masses)** at solar metallicity (Chabrier, Baraffe, Phillips & Debras 2023, *A&A* 671, A119; checked), higher at low metallicity. Deuterium burns briefly above ~13 Jupiter masses; lithium above ~0.06 M☉ (the "lithium test"). Classes M → L → T → Y as they cool; the coldest known, WISE 0855−0714, ~285 K. The nearest, Luhman 16 AB, 2.0 pc.
- **Brown-dwarf cooling** (std; verify the coefficients): Burrows et al. (2001, *Rev. Mod. Phys.* 73, 719) fit L ≈ 4 × 10⁻⁵ L☉ (t / 1 Gyr)^{−1.3} (M / 0.05 M☉)^{2.64} (κ / 10⁻² cm² g⁻¹)^{0.35} and T_eff ≈ 1,550 K (t / 1 Gyr)^{−0.32} (M / 0.05 M☉)^{0.83} (κ / 10⁻²)^{0.088}. A power law, good from ~0.01 to ~10 Gyr; no deuterium-burning phase. Tabulated models (ATMO 2020, Sonora) are better; their terms are (verify).
- **The initial mass function** (std): Salpeter (1955) dN/dM ∝ M^{−2.35}; Kroupa (2001) α = 0.3 below 0.08 M☉, 1.3 for 0.08–0.5, 2.3 above; Chabrier (2003) log-normal below 1 M☉. With Kroupa's form from 0.08 to 150 M☉ (computed): **one star in 160 is above 8 M☉**, and they hold 23% of the mass; about 10% of stars are heavier than the Sun, holding 56% of the mass; the mean is 0.59 M☉. A cluster of 1,000 stars has about six future supernovae. Kroupa's slope down to 0.01 M☉ gives about one brown dwarf for every two stars; counts near the Sun find fewer (verify).
- **The heaviest stars** (checked): R136a1 in the Tarantula Nebula, ~200 M☉ (Kalari et al. 2022: 170–230; earlier estimates 250–320; Brands et al. 2022 parameters give ~240). The Orion Nebula Cluster's heaviest, θ¹ Ori C, ~33 M☉ (std).

---

## 9. Stellar lives (Chapter 17)

- **Lifetimes** (std): t ≈ 10 Gyr (M/M☉)^{−2.5}, from fuel ∝ M and burn rate ∝ L ∝ M^{3.5}. In SSE at Z = 0.02, a 1 M☉ star's main sequence lasts roughly 10–11 Gyr (verify against the code in Stage 13). Red dwarfs of 0.1 M☉ last trillions of years: no red dwarf has yet died, because the Galaxy is only ~13 billion years old.
- **The Sun's future** (std): it was ~70% as bright on arrival on the main sequence and brightens ~1% every 100 Myr; in ~1–1.5 Gyr Earth gets too warm for liquid oceans; it leaves the main sequence at ~10–11 Gyr; at the tip of the red-giant branch it reaches ~250 R☉ (1.2 AU; Schröder & Smith 2008: 256 R☉), having lost a quarter to a third of its mass (models differ), so the planets' orbits widen. Whether Earth is swallowed depends on tides and the mass loss: probably, but it is close (the master plan's coupling showcase, Part III). The helium flash comes at the red-giant tip for stars below ~2 M☉. It ends as a ~0.55 M☉ carbon–oxygen white dwarf.
- **Phases** (std): main sequence; the subgiant crossing (the Hertzsprung gap for heavier stars); red-giant branch (shell hydrogen burning, a growing helium core); helium flash or quiet ignition; core helium burning (the red clump, the horizontal branch in old metal-poor clusters, blue loops for heavier stars); early AGB; thermally pulsing AGB with heavy mass loss; planetary nebula; white dwarf. Why giants swell is subtle; the "mirror principle" describes it without explaining it (std). Say so.
- **Clusters to age** (std; check each value, member list and reddening in the stage)

| Cluster | Distance | Age | [Fe/H] |
|---|---|---|---|
| Pleiades (M45) | 136 pc | 110–125 Myr (lithium depletion: 112 ± 5, Dahm 2015) | ~0 |
| Hyades | 47 pc | 625–750 Myr | +0.15 |
| Praesepe (M44) | 186 pc | 600–750 Myr | +0.15 |
| M67 | ~850 pc | ~4 Gyr | ~0 |
| NGC 188 | ~1.8 kpc | ~6–7 Gyr | ~0 |
| 47 Tucanae | ~4.5 kpc | ~11–13 Gyr | −0.7 |
| NGC 6397 | ~2.4 kpc | ~13 Gyr | −2.0 |

- **Cluster members** (checked): Hunt & Reffert (2023, *A&A* 673, A114) found 7,167 clusters in Gaia DR3 (including 134 globulars) with member lists; a 2024 update is J/A+A/686/A42. Gaia-derived, so CC BY-NC 3.0 IGO. Globular-cluster members: Vasiliev & Baumgardt (2021) (verify terms).
- **Cepheids** (std): Goodricke found δ Cephei's variation in 1784 (5.366 days), Pigott η Aquilae's. Henrietta Swan Leavitt listed 1,777 variables in the Magellanic Clouds (1908) and found the period–luminosity law from **25 Cepheids in the Small Magellanic Cloud** (Harvard College Observatory Circular 173, 1912, under Pickering's name). That table is public domain and small: Figure 17.4 can show her own data. Hertzsprung calibrated the law in 1913; Hubble used it to put the Andromeda nebula outside the Milky Way (1924–25; mentioned only as distance, not cosmology). Modern calibration, for example M_V = −2.43 (log P − 1) − 4.05 (Benedict et al. 2007) (std). The κ mechanism: Eddington's valve (1917, 1941), Zhevakin (1953) and Cox & Whitney (1958) identified helium's second ionisation zone. Polaris is a Cepheid (3.97 days); RR Lyrae stars pulse in ~0.5 day; Mira in 332 days.
- **Betelgeuse** (checked unless marked): the Great Dimming of 2019–20 (to ~+1.6 in February 2020) was dust thrown off the star (Montargès et al. 2021, std). Its companion, now named **Siwarha** (α Ori B), was first detected in July 2025 by Howell's team with the 'Alopeke imager on Gemini North, and its wake was reported in January 2026; the companion is a ~6-year orbit that drives the star's long secondary period (std), next at its widest in November 2027 (an "as of" fact, if used). Betelgeuse will explode within roughly 100,000 years; at ~170–220 pc it poses no danger (std).

---

## 10. How stars die (Chapter 18)

- **Planetary nebulae** (std): named by William Herschel in the 1780s for their planet-like discs; they last ~10,000–20,000 years; a few thousand are known in the Galaxy. The hot core lights the shed envelope (Kirchhoff's second law again).
- **White dwarfs** (std): typical mass ~0.6 M☉ in an Earth-sized ball; density ~10⁶ g/cm³, so a teaspoon (5 cm³) weighs ~5 tonnes (computed); held up by degenerate electrons (Part III, Ch. 24); heavier ones are smaller; Chandrasekhar's limit (1930–31; Nobel 1983) is ~1.4 M☉ (5.83/μ_e² M☉ = 1.46 for μ_e = 2). Sirius B: 1.018 M☉ (Bond et al. 2017), 0.0081 R☉ (Joyce et al. 2018). They cool for billions of years (Mestel 1952), and the coolest give the Galaxy's disc an age of ~10 Gyr (std); Gaia saw them crystallise (Tremblay et al. 2019, *Nature*).
- **Supernovae** (std): historical ones in 1006 (the brightest), 1054 (the Crab), 1181, 1572 (Tycho's) and 1604 (Kepler's); Cas A around 1680, unseen. The Galaxy has ~1.6–2 a century (Rozwadowska et al. 2021: 1.63 ± 0.46). **SN 1987A**, 23 Feb 1987, in the Large Magellanic Cloud (51 kpc, 168,000 light-years), from the blue supergiant Sanduleak −69° 202: about **24 neutrinos** (Kamiokande-II 11, IMB 8, Baksan 5) arrived ~3 hours before the light; JWST found signs of its neutron star in 2024 (Fransson et al.). Type Ia supernovae are white dwarfs in pairs (Part III, Ch. 25). Published light curves: SN 1987A (e.g. Hamuy & Suntzeff 1990) and SN 2011fe (Munari et al. 2013; Pereira et al. 2013) (verify data and terms).
- **Novae and T Coronae Borealis** (checked): a white dwarf in a pair can flare as a nova. T CrB erupted in 1866 and 1946; a 2026 *MNRAS* paper using AAVSO data called the next eruption's timing uncertain by months; as of late October 2026 it had not erupted. Part III's binaries chapter is its natural home; if Part II mentions it, it is an "as of" fact.
- **Neutron stars and pulsars** (std): predicted by Baade and Zwicky (1934), two years after the neutron; Jocelyn Bell Burnell found the first pulsar on 28 Nov 1967 (1.337 s; *Nature*, February 1968; Nobel to Hewish and Ryle, 1974); the Crab pulsar spins 30 times a second (33.8 ms) inside the 1054 remnant; radius ~12 km (NICER); the heaviest well-measured: PSR J0952−0607, 2.35 ± 0.17 M☉ (Romani et al. 2022), and PSR J0740+6620, 2.08 ± 0.07 (Fonseca et al. 2021). Part III, Ch. 26 does pulsars properly; Part II meets them.
- **Black holes** (std unless marked): Schwarzschild (1916); Oppenheimer and Snyder (1939). Horizon radius ~3 km per solar mass. **Cygnus X-1**: an X-ray source found in 1964, shown by Webster & Murdin and by Bolton (1972) to orbit an unseen companion too heavy for a neutron star; 21.2 ± 2.2 M☉ (Miller-Jones et al. 2021), 2.2 kpc. **Quiet black holes found by Gaia**: Gaia BH1, 9.6 M☉, 480 pc, with a Sun-like star on a 186-day orbit (El-Badry et al. 2023); Gaia BH2, 8.9 M☉, 1.16 kpc, 1,277 days; **Gaia BH3**, 33 M☉, 590 pc, an 11.6-year orbit with a metal-poor giant (Gaia Collaboration, Panuzzo et al. 2024, *A&A* 686, L2; title and journal checked). Gravitational waves from merging black holes (GW150914, 14 Sep 2015) and Sagittarius A* (4.3 × 10⁶ M☉; Nobel 2020) are Part III.
- **Which star makes which remnant** (std; the plan's figure should state its prescription and show the uncertainty)

| Initial mass (solar metallicity) | Fate |
|---|---|
| below 0.075 M☉ | brown dwarf |
| 0.075–0.5 | helium white dwarf, in theory: none has had time |
| ~0.5–6/8 | carbon–oxygen white dwarf |
| ~6/8–10 | oxygen–neon white dwarf, or an electron-capture supernova |
| ~8/10–20 | core-collapse supernova, neutron star |
| above ~20–25 | black hole, often without a bright supernova; but explosions and failures interleave ("islands of explodability", Sukhbold et al. 2016) |
| helium cores ~35–65 M☉ (low metallicity) | pulsational pair instability: pulses shed mass; black holes capped near ~45 M☉ |
| helium cores ~65–130 M☉ | pair-instability supernova: nothing left (Heger & Woosley 2002: 64–133) |
| helium cores above ~130 M☉ | direct collapse to a black hole |

- Observations agree only roughly: the "red supergiant problem" (no type II-P supernova progenitor heavier than ~17–18 M☉ found; Smartt 2009, 2015). The initial–final mass relation for white dwarfs: Cummings et al. (2018) (std). Winds matter: at solar metallicity massive stars lose most of their mass, so pair instability needs low metallicity.
- **Stardust** (std): AGB stars give back carbon, nitrogen and s-process elements; core-collapse supernovae oxygen, magnesium, silicon and some iron; Type Ia supernovae most of the iron; neutron-star mergers r-process elements such as gold (Part III, Ch. 23). Of the mass a generation of stars is born with (Kroupa), roughly a third is returned within 10 Gyr (verify with the engine in Stage 14).

---

## 11. Other worlds (Chapter 19)

- **History** (std unless marked): γ Cephei b's signal (Campbell, Walker & Yang 1988; confirmed 2003); pulsar planets round PSR B1257+12 (Wolszczan & Frail 1992); **51 Pegasi b**, announced by Mayor and Queloz on 6 Oct 1995 (4.23-day orbit, at least 0.47 Jupiter masses; Nobel 2019); the first transit, HD 209458 b (Charbonneau et al.; Henry et al.; 1999–2000); the first microlensing planet (Bond et al. 2004); the first images (2M1207 b, 2004; HR 8799's planets, 2008); Kepler (7 Mar 2009 – 30 Oct 2018, ~150,000 stars); TESS (from 18 Apr 2018, nearly the whole sky); Proxima b (2016, 11.2 days); TRAPPIST-1's seven (2017, 12.4 pc).
- **The count** (checked): **6,451 confirmed planets** on 15 Oct 2026, 1,012 from TESS, and 8,151 TESS candidates (the Archive's home page). The Archive asks for an acknowledgement and a citation of Christiansen et al. (2025, *PSJ*) in publications (checked); it states no terms for websites. It is an "as of" fact, refreshed by a script (plan §8).
- **Signal sizes** (computed): K = 28.4 m/s (m sin i / M_J)(M*/M☉)^{−2/3}(P / 1 yr)^{−1/3}(1 − e²)^{−1/2}; Jupiter moves the Sun by 12.5 m/s (Part I tests this), Earth by 9 cm/s. Transit depth (R_p/R*)²: Jupiter 1.0%, Earth 84 parts per million. The chance that an Earth-like orbit transits is R☉/1 AU = 0.47%. ESPRESSO aims at ~10 cm/s (std).
- **What's out there** (std): hot Jupiters orbit ~1% of Sun-like stars (Wright et al. 2012); the commonest planets are super-Earths and sub-Neptunes, which the Solar System lacks; the radius valley near 1.5–2 Earth radii (Fulton et al. 2017); the fraction of Sun-like stars with an Earth-sized planet in the habitable zone is uncertain by a factor of several (verify a current range). Each method sees its own kind of planet: wobbles favour heavy and close; transits large and close; imaging young, giant and far; microlensing a few AU from faint stars.
- **The habitable zone** (std; verify the coefficients): Kasting, Whitmire & Reynolds (1993); Kopparapu et al. (2013, *ApJ* 765, 131; 2014, *ApJL* 787, L29): S_eff = S☉ + aT + bT² + cT³ + dT⁴ with T = T_eff − 5,780 K, valid for 2,600–7,200 K; d = (L/S_eff)^{1/2} AU. For the Sun, the conservative zone runs from the runaway greenhouse (~0.95 AU for an Earth mass) to the maximum greenhouse (~1.67 AU). Red dwarfs' zones are close in, where planets are likely tidally locked (Part I, Ch. 4 and 7) and flares are frequent (Ch. 15).
- **Atmospheres** (std unless marked): transmission spectroscopy measures the planet's size at each wavelength; the signal is about 2HR_p/R*² for an atmosphere of scale height H = kT/(μ m_H g). JWST found CO₂ on WASP-39b (2022), and photochemical SO₂; K2-18b shows methane and CO₂ (2023), and the claimed dimethyl sulfide is disputed: a ~3σ MIRI claim (Madhusudhan et al., April 2025) and reanalyses that find no conclusive evidence (checked). TRAPPIST-1 b and c show no thick CO₂ atmospheres (2023).
- **Missions** (checked unless marked): Gaia DR4, due 2 Dec 2026 (in `src/data/gaia.ts`), with astrometric planets expected (std); PLATO's launch slipped from late 2026 to early 2027 (sources say March or April; verify); Roman launched 30 Aug 2026; Ariel ~2029 (std); the Habitable Worlds Observatory is a concept for the 2040s (std).

---

## 12. The Star Forge's engine

**SSE** (Hurley, Pols & Tout 2000, *MNRAS* 315, 543; std unless marked)
- Analytic formulas fitted to Pols et al. (1998) models of 0.5–50 M☉ and Z = 0.0001–0.03, with Tout et al. (1996) for the zero-age main sequence; the formulas are stated valid for **0.1–100 M☉ and Z = 0.0001–0.03** (0.02 solar). A whole life takes about a millisecond.
- **Stellar types** k: 0 deeply or fully convective main sequence (M < 0.7); 1 main sequence; 2 Hertzsprung gap; 3 first giant branch; 4 core helium burning; 5 early AGB; 6 thermally pulsing AGB; 7 naked helium main sequence; 8 naked helium Hertzsprung gap; 9 naked helium giant branch; 10 helium white dwarf; 11 carbon–oxygen white dwarf; 12 oxygen–neon white dwarf; 13 neutron star; 14 black hole; 15 massless remnant.
- **The code** (checked): the SSE package is in AMUSE's repository (`src/amuse_sse/src`, "the SSE distribution unchanged": `sse.f`, `evolv1.f`, `star.f`, `hrdiag.f`, `zcnsts.f`, `zfuncs.f`, `zdata.h`, `mlwind.f`, `mrenv.f`, `deltat.f`, `kick.f`, `ran3.f`, `const_bse.h`, `evolve.in`, a Makefile for `make sse`). Its README asks that the paper be cited and gives the mass and metallicity range. Hurley's own page (astronomy.swin.edu.au/~jhurley/bsedload.html, per ASCL 1303.015) timed out from here. There is no licence beyond the citation request; we only run it, to make test fixtures, and never ship it.
- **Default switches** in `evolve.in` (checked): η (Reimers) = 0.5; bwind = 0; hewind = 0.5 (the comments say 1.0 "normally"); kick dispersion σ = 190 km/s; ifflag = 0 (no Han et al. IFMR); **wdflag = 1** (modified Mestel cooling); bhflag = 0 (no kick for black holes); **nsflag = 1** (neutron-star and black-hole masses from Belczynski et al. 2002); mxns = 3.0 M☉; time-step fractions 0.05 (MS), 0.01 (giants), 0.02 (Hertzsprung gap, helium MS).
- **Winds in `mlwind.f`** (checked): Nieuwenhuijzen & de Jager (1990) above 4,000 L☉, scaled by (Z/0.02)^{1/2}; Reimers (η × 4 × 10⁻¹³ R L/M M☉/yr) for k = 2–9; Vassiliadis & Wood (1993) on the AGB (k = 5, 6), from the Mira period; a Wolf–Rayet-like rate 10⁻¹³ L^{1.5} for stripped stars and for small hydrogen envelopes; an LBV-like rate beyond the Humphreys–Davidson limit (L > 6 × 10⁵ and 10⁻⁵ R L^{1/2} > 1). The largest applies.
- **Remnants and their cooling** (std; verify against the code): white dwarfs cool by a Mestel-type law L ∝ M Z^{0.4} / [A(t + 0.1)]^{1.4} (A the mean atomic mass of the core); radii from a Nauenberg-type mass–radius relation; neutron stars of 10 km with a power-law cooling; black holes of the Schwarzschild radius.
- **Known limits** (std): the post-AGB crossing to a hot white dwarf, and so the planetary nebula phase, is instant (no track); no rotation; the 1990s winds are strong for hot stars compared with Vink et al. (2001); no pair instability; remnant masses predate modern prescriptions (Fryer et al. 2012); the formulas above 50 M☉ are extrapolations and grow unreliable above 100 M☉; Z below 10⁻⁴ is clamped. Modern population codes (COSMIC, COMPAS, SEVN, MOBSE, StarTrack, METISSE) keep SSE's skeleton and replace these.

**Extensions the master plan asks for** (std)
- **Brown dwarfs** below ~0.075 M☉: the Burrows et al. (2001) power-law cooling (§8), joined to SSE's lowest main-sequence stars; 0.075–0.1 M☉ is SSE extrapolated, flagged.
- **Very massive stars** (100–300 M☉): SSE extrapolated (flagged), with pair-instability outcomes from the final helium-core mass (Heger & Woosley 2002; the pulsational range after Woosley 2017 and Belczynski et al. 2016; the gap's lower edge near 45 M☉, Farmer et al. 2019).
- **Ultra-metal-poor stars** (Z < 10⁻⁴, including Population III): not modelled; the input stops at 10⁻⁴ with a note.
- **Optional modern prescriptions** (stretch): Vink et al. (2001) hot-star winds and Fryer et al. (2012) "delayed" or "rapid" remnant masses, so readers can see that the fates are model choices.

**Detailed tracks for comparison** (checked)
- **MIST** (Choi et al. 2016; Dotter 2016): 0.1–300 M☉, [Fe/H] −4 to +0.5, versions 1.0–1.2 and 2.5 (February 2026), tracks, isochrones and packaged grids — but **"© MIST. All rights reserved"** and no licence or citation text on the site. Not usable without permission.
- **PARSEC** (Bressan et al. 2012): no terms found. **BHAC15**: citation only, 0.01–1.4 M☉. **Geneva** grids (Ekström et al. 2012 and later) are on VizieR, whose rules grant free use "in a scientific context" and leave other uses to each catalogue's origin (checked).

**Isochrones and colours.** SSE gives L, R and T_eff along each track; an isochrone is the set of stars of one age across masses (std). To lay them on Gaia's colour–magnitude diagrams they need T_eff → G_BP − G_RP and bolometric corrections (§5), which are where SSE's lower main sequence will look worst, since cool-dwarf colours are hard for any model (std). Extinction and reddening per cluster from the literature (verify).

---

## 13. Data sources and licences

| Data | What we take | Licence or terms | Status |
|---|---|---|---|
| **Gaia DR3** (ESA/Gaia/DPAC) via the **Gaia Catalogue of Nearby Stars** | Colours and absolute magnitudes of stars within 100 pc, reduced to a density grid plus a sample of points | **CC BY-NC 3.0 IGO** ("Gaia data are distributed under the CC BY-NC 3.0 IGO license"); credit ESA/Gaia/DPAC. Our derived file carries the same licence, in its own folder. | (checked) |
| **Gaia cluster members** (Hunt & Reffert 2023, 2024) | Members of 6–8 clusters, colours and magnitudes | Gaia-derived: CC BY-NC 3.0 IGO; cite the paper and VizieR | (checked: catalogue; verify the member tables) |
| **SILSO sunspot number V2** (WDC-SILSO, Royal Observatory of Belgium) | Monthly mean total sunspot number, 1749 on | **CC BY-NC 4.0**; credit "Source: WDC-SILSO, Royal Observatory of Belgium, Brussels", DOI 10.24414/qnza-ac80; don't keep the daily *estimated* numbers | (checked) |
| **RGO/USAF/NOAA sunspot groups** (compiled by D. Hathaway) | Group latitudes and areas for the butterfly diagram, 1874 on | NASA and NOAA records; Hathaway's files are at solarcyclescience.com, the old NASA MSFC pages are frozen | (checked, Stage 12: `bflydata.txt`, 50 bands equal in sin latitude, south to north, rotations 275–2315; areas after 1976 × 1.4) |
| **NASA Exoplanet Archive** (PSCompPars via TAP) | Confirmed planets: period, mass, radius, method, year, host star | Public; acknowledge the Archive and cite Christiansen et al. (2025) | (checked) |
| **X-shooter Spectral Library DR3** | A dozen spectra, one or two per class O–M and some giants | ESO archive data are CC BY 4.0; the VizieR release's terms | (verify) |
| **NIST Atomic Spectra Database** | Wavelengths, energy levels and gf values for ~50 lines | Facts, cited (Kramida et al.); NIST's copyright notice on SRDs | (verify) |
| **A standard solar model** (BS05 or B16) | T, ρ, energy generation and mass against radius | Published tables (Bahcall's and Serenelli's pages) | (checked, Stage 12: Bahcall's page refuses downloads and Serenelli's is gone, so **Model S** is used, Christensen-Dalsgaard et al. 1996, the helioseismic reference, published for use with its citation) |
| **DEBCat** (J. Southworth) | Masses, radii, temperatures and luminosities of ~200 detached eclipsing binaries | Free with citation of Southworth (2015); VizieR V/152 | (checked, Stage 12: the 2017 VizieR copy, 195 systems, through the Harvard mirror; Keele's page was unreachable) |
| **Mamajek's dwarf sequence** (version 2022.04.16) | T_eff, G_BP − G_RP, M_G and BCs, O3V–Y | No licence; asks for a citation to Pecaut & Mamajek (2013) | (checked) |
| **Leavitt (1912)** | Periods and magnitudes of 25 SMC Cepheids | Public domain | (std) |
| **BHAC15** pre-main-sequence tracks (optional) | Tracks for 0.01–1.4 M☉ | Citation only | (checked) |
| **MIST** | — | "All rights reserved" | (checked): not used |
| **SSE Fortran** (Hurley) | Run once to make test fixtures | Citation request; not shipped | (checked) |
| **HYG** (already used) | Famous stars' positions; a fallback HR diagram | CC BY-SA 4.0, kept separate | (checked in Part I) |

**Two non-commercial sources.** Gaia and SILSO allow non-commercial use with credit. The site is free, has no ads and takes no payments, so it qualifies, but adopting non-commercial data is your decision (plan §12). If not, the fallbacks are HYG for the HR diagram (Hipparcos-era, no faint red dwarfs or white dwarfs to speak of) and NOAA's records for the sunspot cycle.

---

## 14. Algorithms

| Job | Method | Accuracy or check | Source |
|---|---|---|---|
| Thermal spectra | Planck's law; photon and energy units | Exact | (std) |
| Colours of blackbodies | Integrate Planck × filter (Bessell's B and V; the eye's CIE functions, already in `photometry.ts`) | Against published blackbody B − V | Bessell 1990 (std) |
| Diffraction | Airy pattern, [2J₁(x)/x]², J₁ by series and asymptotic forms; two stars added incoherently | J₁ against tables; the first zero at 3.8317 | (std) |
| Seeing | A Gaussian (or Moffat) blur of the stated width; adaptive optics as a Strehl-weighted mix | Labelled a simplification of Kolmogorov turbulence | (std) |
| Atomic levels | Bohr / Rydberg for hydrogen; NIST levels for the rest | Balmer wavelengths to 0.01 nm (air) | (std) |
| Line strengths | Saha–Boltzmann populations with partition functions (a few levels from NIST, or polynomial fits) at a reference depth; electron pressure from a simple T_eff–log g relation | Reproduces where each element's lines peak (§4) | Saha 1920; Gray, *Stellar Photospheres* (std) |
| Synthetic spectra | Planck continuum × exp(−τ) with Gaussian (thermal) or Voigt profiles; TiO bands as band heads with a dissociation equilibrium | A toy model, labelled; compared with real XSL spectra | (std) |
| Doppler | λ_obs = λ(1 + v/c) for v ≪ c | Exact for the speeds shown | (std) |
| Magnitudes, distances | Pogson; distance modulus (exists in `distance.ts`) | Exact | (std) |
| Colour ↔ T_eff, BCs | Mamajek's table interpolated; Andrae et al. (2018) and Casagrande et al. (2021) where valid | Round trips | §5 |
| Visual binaries | Campbell elements → Thiele–Innes → position on the sky, through Kepler's equation (exists) | Sirius B's and α Cen B's positions against published ephemerides | (std) |
| Velocity curves | K, e, ω, γ with the true anomaly | Analytic | (std) |
| Eclipses | Overlap of two limb-darkened discs (quadratic law), integrated numerically or by Mandel & Agol's formulas | Against analytic uniform-disc overlap | Mandel & Agol 2002 (std) |
| Mass function | f(M) from P and K; solve for M₂ given M₁ and i | Gaia BH1's ~9.6 M☉ | (std) |
| Mass–luminosity fits | Least squares on log L against log M | Slopes near the textbook ones | §6 |
| Solar interior | Interpolate the model's tables | The model's own values | §7 |
| Jeans mass, free fall | Formulas of §8 | Exact for the stated convention | (std) |
| Extinction | CCM 1989 with R_V = 3.1 | Published A_λ/A_V | (std) |
| Pre-main-sequence | BHAC15 tracks, or Kelvin–Helmholtz contraction at the Hayashi temperature then a radiative track (labelled a sketch) | Times to the ZAMS of §8 | (std) |
| IMF sampling | Inverse-CDF sampling of Kroupa's broken power law, seeded | The fractions of §8 | Kroupa 2001 |
| Stellar evolution | SSE from the paper and the code; brown-dwarf cooling; pair instability | Against Hurley's code: types, transition times, L, R, M, core masses | §12 |
| Isochrones | Evolve ~200 masses to one age; join; convert to Gaia bands | Turn-off ages of known clusters within their ranges | (std) |
| White-dwarf cooling | SSE's; optionally published cooling tracks | The Gaia white-dwarf sequence's shape | (std) |
| Transits | Mandel & Agol (2002) quadratic limb darkening, or numerical integration over the disc | Against the published formulas' test values | (std) |
| Planet wobbles | The velocity curve above, with the planet's mass | Jupiter's 12.5 m/s, Earth's 9 cm/s | (std) |
| Signal and noise | Gaussian noise (seeded), binning, phase folding, a box least-squares search | √N noise reduction; recovers injected transits | Kovács, Zucker & Mazeh 2002 (std) |
| Habitable zone | Kopparapu et al. (2014) polynomials | Their published distances for the Sun | (std) |
| Transmission spectra | Planet radius + a few scale heights × the band strength of H₂O, CH₄ and CO₂ (toy) | Labelled a sketch | (std) |

**Testing** (in the stages that build each piece)
- Planck, Wien and Stefan–Boltzmann against each other (the peak and the integral), and the Sun's numbers.
- The Airy pattern's zeros and the Rayleigh criterion; doubles split at the predicted aperture.
- Balmer wavelengths; Saha–Boltzmann peaks in the right classes.
- Binary positions and velocities against published orbits; eclipse depths against geometry.
- SSE against the original code over a grid of masses and metallicities, every stellar type and transition, including the calibration edges.
- Transit depths and durations against analytic values; Jupiter's and Earth's wobbles.
- The data files' counts, ranges and licences; every "as of" fact registered.

---

## 15. Timeline for Part II

*(std unless marked)*

| Year | Event |
|---|---|
| 1666 | Newton's prism |
| 1783 | Goodricke times Algol |
| 1784 | Goodricke finds δ Cephei varies |
| 1800, 1801 | Herschel finds infrared; Ritter ultraviolet |
| 1803 | Herschel: double stars orbit each other |
| 1814 | Fraunhofer maps the dark lines |
| 1842 | Doppler |
| 1843 | Schwabe's sunspot cycle |
| 1844, 1862 | Bessel predicts Sirius B; Clark sees it |
| 1856 | Pogson's magnitude scale |
| 1859 | Kirchhoff and Bunsen; the Carrington event |
| 1868 | Helium in the Sun |
| 1889 | Pickering's first spectroscopic binary |
| 1901 | Cannon's OBAFGKM |
| 1908, 1912 | Leavitt's variables and her period–luminosity law |
| 1908 | Hale: sunspots are magnetic |
| 1910–13 | Hertzsprung and Russell's diagram |
| 1913 | Bohr's atom |
| 1920 | Saha's ionisation equation; Eddington's "subatomic energy"; Michelson and Pease measure Betelgeuse |
| 1924 | Eddington's mass–luminosity relation |
| 1925 | Cecilia Payne: stars are mostly hydrogen |
| 1930–31 | Chandrasekhar's limit |
| 1934 | Baade and Zwicky: supernovae make neutron stars |
| 1938–39 | Bethe: how the Sun shines |
| 1943 | The MK luminosity classes |
| 1955 | Salpeter's mass function |
| 1961 | Hayashi tracks |
| 1967 | Bell Burnell's pulsar |
| 1968 | Davis's solar neutrinos |
| 1972 | Cygnus X-1, the first black hole |
| 1987 | SN 1987A and its neutrinos |
| 1989–93 | Hipparcos |
| 1992 | Pulsar planets |
| 1995 | 51 Pegasi b; the first brown dwarfs |
| 1999–2000 | The first transiting planet |
| 2001–02 | SNO solves the solar neutrino problem |
| 2009 | Kepler launches |
| 2018 | Gaia's DR2 HR diagram; TESS launches |
| 2019–20 | Betelgeuse's Great Dimming |
| 2021 | JWST launches |
| 2022 | JWST: CO₂ on WASP-39b; Gaia BH1 |
| 2024 | Parker Solar Probe's closest pass; Cycle 25's peak; Gaia BH3 (checked) |
| 2025 | Solar Orbiter sees the Sun's pole; Betelgeuse's companion (checked) |
| 2026 | LSST begins; Roman launches; Gaia DR4 (due 2 Dec) (checked) |

---

## 16. Glossary (Part II terms)

- **Absorption line, emission line:** a dark or bright line at one wavelength in a spectrum.
- **Aperture:** a telescope's diameter, which sets how much light it collects and how sharp it sees.
- **Asymptotic giant branch (AGB):** a late, swollen stage of a Sun-like star, burning helium and hydrogen in shells.
- **Binary star:** two stars orbiting each other; visual, spectroscopic or eclipsing, depending on how we tell.
- **Blackbody (thermal) radiation:** light given out by anything warm, with a spectrum set by its temperature alone.
- **Brown dwarf** *(exists)*.
- **Cepheid:** a pulsating giant whose period gives its luminosity.
- **Chandrasekhar limit:** the heaviest a white dwarf can be, about 1.4 solar masses.
- **Chromosphere, corona:** the Sun's thin layers above the visible surface, hotter than it.
- **Colour index:** the difference between a star's magnitudes in two filters, a measure of its temperature.
- **Coronal mass ejection:** a cloud of magnetised gas thrown out by the Sun.
- **Diffraction limit:** the sharpest a telescope can see, set by its aperture and the wavelength.
- **Doppler shift, radial velocity:** the change in wavelength from motion along the line of sight, and that speed.
- **Electromagnetic spectrum:** light of every wavelength, from gamma rays to radio waves.
- **Energy level:** one of the energies an atom's electron is allowed.
- **Event horizon:** a black hole's boundary of no return.
- **Exoplanet:** a planet orbiting another star.
- **Flux:** the power arriving per square metre: how bright a star looks.
- **Fusion:** joining light nuclei into heavier ones, which releases energy.
- **Granulation:** the boiling pattern of convection cells on the Sun's surface.
- **Habitable zone:** the range of distances from a star where a planet could keep liquid water on its surface.
- **Helium flash:** the runaway ignition of helium in a red giant's core.
- **Hertzsprung–Russell diagram:** stars' luminosity against their temperature (or magnitude against colour).
- **Hot Jupiter, super-Earth, sub-Neptune:** kinds of exoplanet.
- **Hydrogen-burning limit:** the smallest mass, about 0.075 solar masses, that can sustain hydrogen fusion.
- **Initial mass function:** how many stars are born at each mass.
- **Interstellar medium, molecular cloud:** the gas and dust between the stars, and its cold, dense clouds.
- **Ionisation:** an atom losing an electron.
- **Isochrone:** the line on the HR diagram where stars of one age lie.
- **Jeans mass:** the mass above which a cloud collapses under its own gravity.
- **Luminosity:** a star's total power output.
- **Luminosity class:** I (supergiant) to V (main sequence), read from a spectrum's line widths.
- **Main sequence, zero-age main sequence:** the band where stars spend most of their lives fusing hydrogen in their cores, and where they arrive.
- **Mass–luminosity relation:** on the main sequence, heavier stars are far more luminous.
- **Metallicity:** the share of a star's mass in elements heavier than helium.
- **Neutrino:** a nearly massless particle made in fusion that passes through almost anything.
- **Neutron star, pulsar:** the collapsed core of a massive star, and one whose beam sweeps past us.
- **Photon:** a particle of light.
- **Photosphere:** the Sun's visible surface.
- **Planetary nebula:** the glowing shell a dying Sun-like star sheds.
- **Protostar, T Tauri star:** a star still forming, and a young one not yet on the main sequence.
- **Red giant, supergiant:** swollen, cool, luminous stars.
- **Resolution, seeing:** how fine a detail can be seen, and the blurring by our air.
- **Solar cycle, sunspot:** the Sun's ~11-year rhythm of activity, and its dark magnetic spots.
- **Solar wind:** the stream of gas flowing out from the Sun.
- **Spectral class:** O, B, A, F, G, K, M (and L, T, Y), a star's type by its lines, which follows temperature.
- **Spectrum:** light spread out by wavelength.
- **Stefan–Boltzmann law, Wien's law:** a hot body's power per area grows as T⁴; its peak wavelength shrinks as 1/T.
- **Supernova:** an exploding star: a collapsing core (core-collapse) or a white dwarf blown apart (Type Ia).
- **Transit:** a planet passing in front of its star.
- **Turn-off:** the point where a cluster's stars leave the main sequence, which tells its age.
- **Wavelength, frequency:** the length of one wave, and how many pass a second.

---

## 17. Questions readers will ask

- **Why don't stars look coloured?** Our colour vision fails in dim light, so only the brightest stars show colour; a camera shows them all.
- **Why does the Sun look yellow?** Through the air, some blue is scattered out, and against a blue sky it looks warmer. From space it is white.
- **Is the Sun on fire?** No: fire needs oxygen and would last a few thousand years. Fusion in the core powers it.
- **Will the Sun explode, or become a black hole?** Neither. It will swell into a red giant and end as a white dwarf.
- **When will Betelgeuse explode?** Within roughly 100,000 years: maybe tomorrow, probably not in our lifetimes. At ~550–700 light-years it can't hurt us.
- **How do we know what's inside the Sun?** Its neutrinos come straight from the core, and its vibrations map the interior.
- **Why are there no green stars?** A star that peaks in green gives out plenty of red and blue too, so it looks white.
- **How do we know a star's mass?** Only from its pull on something else, usually a companion.
- **Can we see a star that has already died?** For nearby stars, no: their light left recently compared with their lives.
- **Are we made of stardust?** Yes: almost every atom heavier than helium in us was made in stars.
- **Could there be life on exoplanets?** Possibly; we can't tell yet. JWST is starting to read rocky planets' air.
- **Why do stars come only in a limited range of masses?** Too small and fusion never starts; too big and their own light blows them apart.

---

## Sources

**Checked on 28 Oct 2026**
- Gaia data licence: https://www.cosmos.esa.int/web/gaia-users/license
- MIST: https://mist.science/ (redirected from waps.cfa.harvard.edu/MIST/)
- SILSO data and citations: https://www.sidc.be/SILSO/datafiles and https://www.sidc.be/SILSO/citations; Cycle 25's maximum: https://www.sidc.be/article/solar-cycle-25-reached-its-maximum-october-2024 and https://www.stce.be/content/sc25-tracking
- NASA Exoplanet Archive: https://exoplanetarchive.ipac.caltech.edu/ and https://exoplanetarchive.ipac.caltech.edu/docs/acknowledge.html
- SSE in AMUSE: https://github.com/amusecode/amuse/tree/main/src/amuse_sse/src; ASCL entry: https://ascl.net/1303.015
- ESO data access policy (CC BY 4.0): https://archive.eso.org/cms/eso-data-access-policy.html
- XSL DR3: Verro, K. et al. (2022), *A&A* 660, A34
- VizieR rules of usage: https://vizier.cds.unistra.fr/viz-bin/cite/IX/56
- Mamajek's table: https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt
- BHAC15: https://perso.ens-lyon.fr/isabelle.baraffe/BHAC15dir/READ_INFO
- DEBCat: Southworth (2015), arXiv:1411.1219; VizieR V/152
- Hunt, E. L. & Reffert, S. (2023), *A&A* 673, A114
- Chabrier, G., Baraffe, I., Phillips, M. & Debras, F. (2023), *A&A* 671, A119
- Kalari, V. M. et al. (2022) on R136a1: https://www.sciencedaily.com/releases/2022/08/220818163715.htm
- Gaia Collaboration, Panuzzo, P. et al. (2024), *A&A* 686, L2
- Betelgeuse's companion: https://www.jpl.nasa.gov/news/nasa-scientist-finds-predicted-companion-star-to-betelgeuse/
- Parker Solar Probe: https://www.universetoday.com/170215/nasas-parker-solar-probe-makes-its-record-breaking-closest-approach-to-the-sun/
- Solar Orbiter: https://www.mps.mpg.de/first-images-of-the-sun-s-south-pole
- JUNO's first result: https://english.ihep.cas.cn/nw/han/y26/202606/t20260610_1161472.html
- K2-18b: https://iopscience.iop.org/article/10.3847/2041-8213/adc1c8 and https://www.astronomy.com/science/new-study-revisits-signs-of-life-on-k2-18-b/
- ELT: https://www.eso.org/public/announcements/ann25001/
- PLATO: https://www.esa.int/Science_Exploration/Space_Science/Plato and https://www.dlr.de/en/latest/news/2025/plato-mission-to-launch-in-late-2026-onboard-ariane-6
- Roman's launch: https://www.space.com/space-exploration/launches-spacecraft/nasa-roman-space-telescope-launch-success-on-a-spacex-falcon-heavy-rocket-spectacular-launch-video
- LSST: https://survey-strategy.lsst.io/progress
- T CrB: https://arxiv.org/pdf/2607.15245 and https://en.wikipedia.org/wiki/T_Coronae_Borealis
- Bailey, J. M., Prather, E. E., Johnson, B. & Slater, T. F. (2009). College students' preinstructional ideas about stars and star formation. *AER* 8, 010110. https://istardb.org/aerpublications/college-students-preinstructional-ideas-about-stars-and-star-formation/
- Agan, L. (2004). Stellar ideas. *AER* 3(1), 77–97. https://istardb.org/aerpublications/stellar-ideas-exploring-students-understanding-of-stars/
- The LSCI: https://www.physport.org/assessments/assessment.cfm?A=LSCI
- Arcand, K. K., Watzke, M., Rector, T. et al. (2013). Processing color in astronomical imagery. *Studies in Media and Communication* 1(2), 25. https://arxiv.org/abs/1308.5237

**Standard references (from knowledge; check details before quoting)**
- Hurley, J. R., Pols, O. R. & Tout, C. A. (2000). *MNRAS* 315, 543. Hurley, Tout & Pols (2002). *MNRAS* 329, 897.
- Pols, O. R. et al. (1998). *MNRAS* 298, 525. Tout, C. A. et al. (1996). *MNRAS* 281, 257.
- Burrows, A. et al. (2001). *Rev. Mod. Phys.* 73, 719.
- Heger, A. & Woosley, S. E. (2002). *ApJ* 567, 532. Woosley, S. E. (2017). *ApJ* 836, 244. Belczynski, K. et al. (2016). *A&A* 594, A97. Farmer, R. et al. (2019). *ApJ* 887, 53.
- Vink, J. S., de Koter, A. & Lamers, H. J. G. L. M. (2001). *A&A* 369, 574. Fryer, C. L. et al. (2012). *ApJ* 749, 91. Sukhbold, T. et al. (2016). *ApJ* 821, 38.
- Kroupa, P. (2001). *MNRAS* 322, 231. Salpeter, E. E. (1955). *ApJ* 121, 161. Chabrier, G. (2003). *PASP* 115, 763.
- Gaia Collaboration, Smart, R. L. et al. (2021). *A&A* 649, A6. Gaia Collaboration, Babusiaux, C. et al. (2018). *A&A* 616, A10. Gaia Collaboration, Vallenari, A. et al. (2023). *A&A* 674, A1.
- Pecaut, M. J. & Mamajek, E. E. (2013). *ApJS* 208, 9. Andrae, R. et al. (2018). *A&A* 616, A8. Casagrande, L. et al. (2021). *MNRAS* 507, 2684.
- Asplund, M., Amarsi, A. M. & Grevesse, N. (2021). *A&A* 653, A141. Magg, E. et al. (2022). *A&A* 661, A140.
- Bahcall, J. N., Serenelli, A. M. & Basu, S. (2005). *ApJ* 621, L85. Vinyoles, N. et al. (2017). *ApJ* 835, 202.
- Torres, G., Andersen, J. & Giménez, A. (2010). *A&ARv* 18, 67. Eker, Z. et al. (2018). *MNRAS* 479, 5491. Southworth, J. (2015). *ASP Conf. Ser.* 496, 164.
- Raghavan, D. et al. (2010). *ApJS* 190, 1. Sana, H. et al. (2012). *Science* 337, 444.
- Bond, H. E. et al. (2017). *ApJ* 840, 70. Joyce, S. R. G. et al. (2018). *MNRAS* 479, 1612. Akeson, R. et al. (2021). *AJ* 162, 14.
- Mandel, K. & Agol, E. (2002). *ApJ* 580, L171. Kovács, G., Zucker, S. & Mazeh, T. (2002). *A&A* 391, 369.
- Kopparapu, R. K. et al. (2013). *ApJ* 765, 131; (2014). *ApJL* 787, L29.
- Fulton, B. J. et al. (2017). *AJ* 154, 109. Wright, J. T. et al. (2012). *ApJ* 753, 160.
- Cardelli, J. A., Clayton, G. C. & Mathis, J. S. (1989). *ApJ* 345, 245.
- Bessell, M. S. (1990). *PASP* 102, 1181.
- Leavitt, H. S. & Pickering, E. C. (1912). *Harvard College Observatory Circular* 173.
- Montargès, M. et al. (2021). *Nature* 594, 365.
- Miller-Jones, J. C. A. et al. (2021). *Science* 371, 1046. El-Badry, K. et al. (2023). *MNRAS* 518, 1057 and 521, 4323.
- Romani, R. W. et al. (2022). *ApJL* 934, L17. Fonseca, E. et al. (2021). *ApJL* 915, L12.
- Tremblay, P.-E. et al. (2019). *Nature* 565, 202. Gentile Fusillo, N. P. et al. (2021). *MNRAS* 508, 3877.
- Smartt, S. J. (2015). *PASA* 32, e016. Cummings, J. D. et al. (2018). *ApJ* 866, 21.
- Schröder, K.-P. & Smith, R. C. (2008). *MNRAS* 386, 155.
- Mitalas, R. & Sills, K. R. (1992). *ApJ* 401, 759.
- Comins, N. F. (2001). *Heavenly Errors*. Columbia University Press.
- Bailey, J. M. et al. (2012). *IJSE* 34, 2257. Bardar, E. M. et al. (2007). *AER* 5(2), 103.
