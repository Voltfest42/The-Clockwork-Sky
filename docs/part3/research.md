# Research brief: Part III, the engine room

*Compiled 4 Nov 2026 (Stage 17) as reference material for Part III · The Engine Room. The companion to [plan.md](plan.md). Part III's physics is textbook physics (Kippenhahn, Weigert & Weiss; Hansen, Kawaler & Trimble; Clayton; Shapiro & Teukolsky; Binney & Tremaine), so the work is in the numbers that change (catalogue counts, records, measurements still being argued over), in data we're allowed to ship, in a binary-evolution engine we can test against its authors' code, and in solvers small enough to run in a browser yet honest enough for an expert to read.*

**Marks used below**
- **(checked)** verified against the source on 4 Nov 2026.
- **(std)** a standard reference value or textbook fact, written from knowledge; check the exact figure before it goes on screen.
- **(verify)** likely to change, or uncertain; check it in the stage that uses it.
- **(computed)** worked out here from the values above it (`numbers.py` in the Stage 17 session; each is recomputed by a unit test when its figure is built).

## TL;DR

- **The licences are mostly fine, with one real question.**
  - **GWOSC's data are CC BY 4.0** (checked): the merger catalogue and GW150914's strain can ship, with GWOSC's acknowledgement and a citation.
  - **The ATNF Pulsar Catalogue states no open licence** (checked): its programs and databases "remain the property of" ATNF/CSIRO under CSIRO's legal notice, and free access is "for bona fide research purposes". CSIRO's site-wide notice allows copies for personal use, research and study, and asks for consent otherwise (checked). Shipping a derived P–Ṗ file needs ATNF's permission (plan §13, question 2). The catalogue is at **v2.9.0 (6 Oct 2026), 4,503 pulsars** (checked).
  - **Nuclear data are usable for teaching with acknowledgement:** the IAEA's terms let content be "adapted, translated, copied … for … teaching purposes" and in non-commercial products with acknowledgement (checked), and its LiveChart API serves every nuclide's ground state as CSV (checked). AME2020 and NUBASE2020 are open-access papers in *Chinese Physics C* under the journal's CC BY 3.0 policy (checked as a site-wide statement; per article: verify). **KADoNiS v0.3** (357 isotopes' neutron-capture cross sections) is online with tab-separated downloads and asks for a citation (checked).
- **The binary-evolution engine is testable, and shares its single-star core with Part II's port.** Hurley's BSE is in AMUSE's repository at the same commit as the SSE fixtures (9f8c7af, 20 Mar 2025), and its copies of the shared SSE routines (hrdiag, star, zfuncs, zcnsts, mlwind, mrenv, deltat, evolv1, zdata.h) are identical to SSE's (checked by diff). So the port needs only the binary routines: `evolv2.f` (2,340 lines), `comenv.f`, `kick.f`, `mix.f`, `gntage.f`, `dgcore.f`, `corerd.f`, `instar.f`, `rl.f` and `ran3.f`, about 3,600 lines of Fortran (checked).
- **BSE's "defaults" disagree with themselves**, as SSE's did: `binary.in` sets the common-envelope efficiency α = 3.0 and the Eddington factor to 10, while `bse.f`'s comments call 1.0 "normal" for both (checked). Readers should meet α as a slider: it is among the least-known numbers in astrophysics.
- **Timely hooks, as of 4 Nov 2026 (checked):**
  - **GWTC-5.0** (26 May 2026): 161 new candidates from O4b, **390 in the cumulative catalogue**, every new one a pair of black holes. O4 ran from 24 May 2023 to 18 Nov 2025 with about 250 candidates found in real time; O5 is planned to start in late 2027 (verify).
  - **GW250114**, signal-to-noise 80, tested Hawking's area law to high credibility (*PRL* 135, Sep 2025); **GW231123** is the heaviest merger, 190–265 M☉ in total, with its lighter black hole in the pair-instability gap.
  - **The Milky Way and Andromeda:** only about **even odds of a merger within 10 billion years** (Sawala et al. 2025, *Nature Astronomy*), against the textbook certainty.
  - **The Milky Way's rotation curve is argued over:** Gaia-based curves fall from about 230 km/s at 5 kpc to about 170 km/s at 28 kpc (Ou et al. 2024); one study calls the outer fall Keplerian (Jiao et al. 2023: 2.1 × 10¹¹ M☉ in all), a 2026 review says other tracers favour a heavier halo. It is an honest open question for Chapter 30.
  - **M87\*'s polarisation flipped** between 2017 and 2021 while its ring stayed the same size (EHT, Sep 2025).
  - **Sub-Chandrasekhar white dwarfs explode:** two calcium shells in SNR 0509−67.5 match a double detonation (Das et al. 2025).
  - **Gaia DR4 is due on 2 Dec 2026** (ESA, checked), before Part III's Galaxy chapters are built; DR5 not before the end of 2030.
  - **T Coronae Borealis had still not erupted** (Wikipedia citing October 2026; the next proposed window, 8 Feb 2027 ± 8 days, is one author's; checked). Chapter 28 is its home; if it has erupted by then, the text says when.
- **Corrections to the master plan:** the Solar System showcase's open question is whether Earth is **swallowed** by the red-giant Sun (tides against mass loss), not whether it escapes (§14); GWTC's licence is now checked; ATNF's is the open one.

---

## 1. How readers think about the engine room

Part III's readers know some physics, and the education research on them is thinner than for Parts I and II: most studies are of first-year physics students meeting quantum mechanics or relativity, not stellar astrophysics. What exists, and what teachers of these courses report, points the same way: the wrong ideas are about energy and about what "pressure", "fusion" and "black hole" mean.

**Sources**
- **Bailey et al. (2009, 2012)** (Part II brief §1, checked there): before instruction a third of students say stars shine by burning, 7% name fusion, and almost none can say how a star forms.
- **Quantum tunnelling:** students think a particle loses energy by tunnelling, or that tunnelling means it "has enough energy really" (McKagan, Perkins & Wieman 2008, *Phys. Rev. ST Phys. Educ. Res.* 4, 020103; std, verify).
- **General relativity:** the rubber-sheet picture misleads, because the sheet needs gravity underneath to sag; students read curvature as space only, not spacetime (Kersting, Henriksen, Bøe & Angell 2018, *Phys. Rev. Phys. Educ. Res.* 14, 010130, the ReleQuant project in Oslo; std, verify).
- **Black holes** (Comins 2001, *Heavenly Errors*; std): they suck everything in; nothing can be seen of them; the horizon is a surface; a black hole is a hole.
- **Negative heat capacity** is counter-intuitive enough that physicists argued over it (Lynden-Bell & Wood 1968; std). A star or a cluster that loses energy heats up; a satellite with drag speeds up (Part I).

**Design consequences for Part III**
- **Predict first** where the answer surprises: "A star with no fuel shines; does it cool or heat up?" (Fig. 20.2); "Is a heavier white dwarf bigger or smaller?" (Fig. 24.2); "Does a black hole pull you in faster than a star of the same mass?" (Fig. 27.1).
- **Separate heat from fusion.** The Sun's centre is hot because gravity squeezes it; fusion only pays for the light (Figs. 20.1, 21.4 and the thermostat in §21.5).
- **Show the classical answer failing.** At the Sun's centre no proton has enough energy to touch another; the Gamow peak shows how tunnelling wins anyway (Fig. 22.1).
- **Spacetime without a rubber sheet.** Orbits and light paths are computed and drawn as paths, with the effective potential as a curve of energy against distance, not as a sagging sheet.

| Common misconception | Where Part III confronts it |
|---|---|
| The Sun's centre is hot because of fusion | Fig. 20.1 (gravity alone needs ~10⁷ K); §21.5, the thermostat |
| A star that loses energy cools down | Fig. 20.2, predict first |
| Sunlight left the core eight minutes ago | Fig. 21.1, the random walk |
| Fusion happens because the nuclei have enough energy to overcome their repulsion | Figs. 22.1 and 22.2 |
| Stars burn their fuel faster when it's hotter, so they'd run away | §21.5 and Fig. 22.4: the thermostat, and where it fails (degenerate cores) |
| All the elements were made in supernovae (or in the Big Bang) | Fig. 23.3, every element's birthplace |
| A heavier white dwarf is bigger | Fig. 24.2, predict first |
| White dwarfs shine by fusion | Fig. 24.3: embers cooling |
| Pulsars pulsate | Fig. 26.3, the lighthouse |
| Neutron stars are made only of neutrons | Fig. 26.1 |
| Black holes suck everything in | Fig. 27.1: outside a few horizon radii, orbits are Newtonian |
| Nothing escapes a black hole, so we can't see one | Fig. 27.4: discs round black holes are the brightest things known |
| The horizon is a surface you'd hit | §27.1 |
| Gravitational waves are sound; LIGO hears them | Figs. 29.2 and 29.3 (we turn the strain into sound for our ears) |
| Spacetime is a rubber sheet | §27.2, §29.2 |
| A star in a pair lives as it would alone | Fig. 28.3, the Algol paradox |
| The Galaxy turns like a wheel, and its arms are fixed bands of stars | Fig. 30.4, the winding problem |
| Dark matter is dark gas, or black holes, or settled | §30.4: the evidence and the open questions |
| When galaxies collide, their stars crash | §31.2, computed |

---

## 2. Holding a star up (Chapter 20)

- **Hydrostatic equilibrium** (std): dP/dr = −G m(r) ρ / r², dm/dr = 4πr²ρ. The Sun's free-fall time without pressure, (3π/32Gρ̄)^½, is **about 30 minutes** (computed: 1,770 s), so a star holds its balance to exquisite precision for billions of years.
- **Estimates** (computed, for Toolkit T11): P_c ~ GM²/R⁴ gives 10¹⁵ Pa; Model S has 2.3 × 10¹⁶ Pa (std; from `solarModel.json`). A strict lower bound, P_c > GM²/(8πR⁴) = 4.5 × 10¹³ Pa (std; computed). T_c ~ GMμm_H/(kR) gives **1.4 × 10⁷ K** with μ = 0.61, against Model S's 15.7 million K: the Sun's centre has to be about that hot just to hold the Sun up, with no nuclear physics at all.
- **The virial theorem** (std): for a star in balance, 2K + Ω = 0 (from hydrostatic equilibrium multiplied by 4πr³ and integrated: 3∫P dV = −Ω). For an ideal monatomic gas the total energy is E = Ω/2 = −K: lose energy, shrink, heat up. Half of the gravitational energy released heats the gas and half is radiated. The same theorem makes a satellite with air drag speed up (Part I, Chapter 7), and makes clusters' cores collapse (Chapter 30).
- **Kelvin–Helmholtz time** (computed): GM²/(RL) = **31 Myr** for the Sun; an n = 3 polytrope's binding energy (3/2)GM²/R gives 47 Myr. Either way, tens of millions of years.
- **The age-of-the-Sun quarrel** (std): Helmholtz (1854); Kelvin, "On the age of the Sun's heat" (1862): very probably under 100 million years and almost certainly under 500 million, later narrowed towards 20–40 million (1897); Darwin's denudation of the Weald, about 300 million years (*Origin*, 1859, dropped from later editions); radioactivity (Becquerel 1896); Rutherford's 1904 lecture, with Kelvin in the audience; Eddington's 1920 address on "subatomic energy", from Aston's measurement that helium weighs 0.7–0.8% less than four hydrogen atoms; Patterson's 4.55 billion years for Earth from meteorites (1956). Today's Sun: 4.567 billion years (Part II).
- **Jeans and fragmentation** (std): the Jeans criterion falls out of the virial theorem (collapse when |Ω| > 2K). An isothermal cloud's Jeans mass falls as ρ^−½ as it contracts, so it breaks into ever smaller pieces (Hoyle 1953) until the fragments become opaque to their own heat: the opacity limit, about **0.007–0.01 M☉** (Low & Lynden-Bell 1976; Rees 1976), the smallest objects star formation makes (Part II's brown dwarfs and free-floating planets).
- **Polytropes** (std; Lane 1870, Emden 1907, Chandrasekhar 1939): P = Kρ^(1+1/n) turns the structure equations into the Lane–Emden equation, ξ⁻² d/dξ(ξ² dθ/dξ) = −θⁿ, with θ(0) = 1, θ′(0) = 0. Analytic for n = 0, 1 and 5. Constants (Chandrasekhar 1939; Horedt 2004):

| n | ξ₁ | −ξ₁² θ′(ξ₁) | ρ_c / ρ̄ | Stands for |
|---|---|---|---|---|
| 0 | 2.4495 | 4.8990 | 1 | Incompressible |
| 1 | π | π | 3.2899 | — |
| 1.5 | 3.65375 | 2.71406 | 5.99071 | Fully convective stars, cold white dwarfs |
| 2 | 4.35287 | 2.41105 | 11.40254 | — |
| 3 | 6.89685 | 2.01824 | 54.1825 | Eddington's standard model; relativistic white dwarfs |
| 4 | 14.97155 | 1.79723 | 622.408 | — |
| 5 | ∞ | √3 | ∞ | Infinite radius, finite mass |

- **The Sun as an n = 3 polytrope** (computed): ρ_c = 76 g/cm³ and T_c = 12 million K, against Model S's 150 g/cm³ and 15.7 million K. The Sun's real ρ_c/ρ̄ = 107 sits between n = 3 (54) and n = 3.5 (153), near n ≈ 3.3 (computed by interpolation; the stage's solver gives the exact value for Check yourself).
- **Eddington's standard model** (std): n = 3 with a constant ratio β of gas to total pressure gives the quartic 1 − β = 0.00298 μ⁴β⁴(M/M☉)². With μ = 0.61, radiation pressure is 0.04% of the total in the Sun, about 4% at 10 M☉ and about 40% at 100 M☉ (computed); radiation's growing share is why stars much heavier than ~100 M☉ are rare and unstable. The heaviest known, R136a1, is about 200 M☉ (Part II).

---

## 3. Getting the energy out (Chapter 21)

- **The random walk** (std): a photon's mean free path ℓ = 1/(κρ) is under a millimetre at the Sun's centre and a few centimetres in the radiative zone; after N steps it has moved √N ℓ, so crossing R takes (R/ℓ)² steps and R²/(ℓc) of time. With a mean ℓ of 1 cm the Sun gives about 5,000 years (computed); careful sums give 10⁴–1.7 × 10⁵ years (Mitalas & Sills 1992; Part II brief §7). The photon isn't one photon: each absorption and re-emission is a new one, and the energy, not the particle, diffuses.
- **Radiative diffusion** (std): L(r) = −(64πr²σT³ / 3κρ) dT/dr.
- **Opacity sources** (std; the forms are textbook fits, Carroll & Ostlie ch. 9, Hansen & Kawaler ch. 4):
  - electron scattering, κ_es = 0.2(1 + X) cm²/g = 0.35 cm²/g for the Sun's X = 0.74 (computed);
  - bound–free and free–free (Kramers' law, κ ∝ ρT^−3.5), dominant in most of the Sun's radiative zone;
  - H⁻ in cool envelopes and photospheres, rising steeply with temperature, κ ∝ ρ^½ T⁹ (for 3,000–6,000 K);
  - conduction by degenerate electrons in white-dwarf cores (Chapter 24);
  - the **iron bump** near 200,000 K, which drives β Cephei pulsations (Part II's Cepheids used helium's second ionisation).
  - Tabulated opacities: OPAL (Iglesias & Rogers 1996; LLNL's tables, terms verify) and OP (Seaton et al.); Part III's solver uses the analytic fits, labelled.
- **Convection** (std): the Schwarzschild criterion (1906): convection where the radiative gradient ∇_rad = d ln T/d ln P needed to carry L exceeds the adiabatic ∇_ad (0.4 for an ideal monatomic gas, lower in ionisation zones). Mixing-length theory (Böhm-Vitense 1958; α_MLT ≈ 1.7–2, calibrated on the Sun). The Sun convects from 0.713 R☉ outward (helioseismology; Part II). Convective cores in stars heavier than about 1.1–1.2 M☉, because CNO burning (§4) crowds the power into the middle; stars lighter than about 0.35 M☉ convect throughout. Inside the convection zone the real gradient sits almost exactly on the adiabat, which Model S shows directly (its T, P and Γ₁; FGONG has Γ₁ as a variable, std; verify that `build-solar-model.ts` can read it).
- **The four equations** (std): dm/dr = 4πr²ρ; dP/dr = −Gmρ/r²; dL/dr = 4πr²ρε; dT/dr from radiation or convection; with the equation of state, the opacity and ε(ρ, T, X). The Vogt–Russell theorem (Vogt 1926, Russell 1927): mass and composition fix the star.
- **Solving them** (std): Schwarzschild's fitting method (integrate out from the centre and in from the surface, match at a fitting point, Newton on the four guesses: P_c, T_c, R, L), or Henyey's relaxation (Henyey et al. 1959, 1964; what MESA does). Textbook ZAMS codes follow the first (Hansen, Kawaler & Trimble 2004, ch. 7 and their ZAMS program; std).
- **Homology** (std): with radiative transport and constant κ, L ∝ μ⁴M³/κ, independent of the radius; with Kramers' opacity L ∝ μ^7.5 M^5.5 R^−0.5. So a main-sequence star's luminosity is set by how fast radiation leaks out, and fusion adjusts to supply it: the **thermostat**. In a degenerate core the pressure doesn't depend on temperature and the thermostat fails (the helium flash; Chapter 24).
- **MESA** (Paxton et al. 2011–2019; Jermyn et al. 2023; open source, LGPL; std) is what researchers use; it is named in the text as the grown-up version of Figure 21.4.

---

## 4. The nuclear furnace (Chapter 22)

- **The barrier** (computed): the Coulomb barrier between two protons at about 1.4 fm is about **1 MeV**; at the Sun's centre kT = **1.35 keV**. The share of a Maxwell distribution above 1 MeV is about e^−740: classically, nothing fuses.
- **Tunnelling** (std): Gamow (1928), Atkinson & Houtermans (1929). The tunnelling probability is e^(−√(E_G/E)) with the Gamow energy E_G = 2μc²(παZ₁Z₂)², **493 keV for p + p** (computed).
- **The Gamow peak** (computed, non-resonant reactions; E₀ = (E_G(kT)²/4)^⅓, width Δ = 4(E₀kT/3)^½, and the rate's sensitivity ν = d ln r / d ln T = (3E₀/kT − 2)/3):

| Reaction | T | kT | E₀ | Width | ν (rate ∝ T^ν) |
|---|---|---|---|---|---|
| p + p | 15.7 MK | 1.35 keV | 6.1 keV | 6.6 keV | 3.8 |
| p + ¹²C | 20 MK | 1.72 keV | 29 keV | 16 keV | 16 |
| p + ¹⁴N | 20 MK | 1.72 keV | 32 keV | 17 keV | 18 |
| ¹²C + ¹²C | 0.8 GK | 69 keV | 2.1 MeV | 0.88 MeV | 30 |
| ¹⁶O + ¹⁶O | 2 GK | 172 keV | 6.2 MeV | 2.4 MeV | 35 |

  At E₀ the p + p tunnelling probability is about 10⁻⁴ (computed: 1.2 × 10⁻⁴). The full pp rate goes as ~T⁴ near 15 MK and CNO's as T^16–20 (std).
- **S-factors** (checked): Solar Fusion III (Acharya et al. 2025, *Rev. Mod. Phys.*; arXiv:2405.06470) recommends **S₁₁(0) = 4.09 × 10⁻²⁵ MeV b (±1.5%)** for p + p and S₁,₁₄(0) = 1.68 ± 0.14 keV b for ¹⁴N(p,γ)¹⁵O; a 2024 measurement gives 1.92 ± 0.08 keV b for the latter (arXiv:2410.16086).
- **The pp chains** (std): p + p → d + e⁺ + ν, a weak interaction, so slow that a proton in the Sun's core waits about 10¹⁰ years; d + p → ³He + γ in about a second; ³He + ³He → ⁴He + 2p (ppI) or ³He + ⁴He → ⁷Be (ppII via ⁷Li, ppIII via ⁸B); Q = 26.73 MeV per helium nucleus, 0.71% of the mass (Part II; computed 0.712%); in the Sun ppI ends about 83% of chains and ppII about 17%, ppIII 0.02% (std; verify against SF III or a standard solar model). The neutrinos take about 2%.
- **The CNO cycle** (std): Bethe (1939; Nobel 1967) and von Weizsäcker (1938); ¹²C(p,γ)¹³N(β⁺)¹³C(p,γ)¹⁴N(p,γ)¹⁵O(β⁺)¹⁵N(p,α)¹²C; ¹⁴N(p,γ) is the slowest step, so the cycle turns carbon into nitrogen, which giants later dredge up to their surfaces. It overtakes the pp chains above about 1.3 M☉ (T_c ≈ 17–18 MK). In the Sun it makes about 1% of the power; Borexino detected its neutrinos (2020, *Nature* 587, 577).
- **The Sun's core is gentle** (computed from a central ε of ~1.8 × 10⁻³ W/kg and 150 g/cm³: verify against Model S in the stage): about 280 W/m³, a fifth of a resting human body's ~1,400 W/m³ (computed: 100 W in 0.07 m³). The Sun is bright because it is big, not because its furnace is fierce.
- **Triple-alpha and Hoyle's resonance** (std): ⁸Be's ground state sits 92 keV above two α particles and lives 8 × 10⁻¹⁷ s; carbon forms through the 0⁺ state of ¹²C at **7.654 MeV**, 380 keV above three α particles. Hoyle predicted it in 1953 (published 1954); Dunbar, Pixley, Wenzel & Whaling found a level near 7.68 MeV that year; Cook, Fowler, Lauritsen & Lauritsen (1957) showed it forms from ⁸Be + α (std; verify the details). The often-told "anthropic" framing came later (Kragh 2010; std, verify). The rate goes as T^−3 e^(−4.40/T₉), so ν ≈ 4.40/T₉ − 3 ≈ **41 at 10⁸ K** (computed).
- **¹²C(α,γ)¹⁶O** (std): the "holy grail" of nuclear astrophysics; its rate, uncertain by perhaps 10–20% (deBoer et al. 2017, *Rev. Mod. Phys.* 89, 035007), sets white dwarfs' carbon-to-oxygen ratio and moves the black-hole mass gap's edge (Farmer et al. 2020).
- **The late burning stages** (Woosley, Heger & Weaver 2002, *Rev. Mod. Phys.* 74, 1015, Table I; the 15 M☉ hydrogen and helium rows checked against a lecture's copy, the rest verify):

| Fuel | Main products | 15 M☉: T (GK) / τ | 25 M☉: T (GK) / τ |
|---|---|---|---|
| H | He | 0.035 / 11 Myr | 0.038 / 6.7 Myr |
| He | C, O | 0.18 / 2.0 Myr | 0.20 / 0.84 Myr |
| C | Ne, Mg | 0.83 / 2,000 yr | 0.81 / 520 yr |
| Ne | O, Mg | 1.6 / 0.7 yr | 1.6 / 0.9 yr |
| O | Si, S | 1.9 / 2.6 yr | 2.1 / 0.4 yr |
| Si | Fe peak (⁵⁶Ni) | 3.3 / 18 days | 3.7 / ~1 day |

  Other codes' carbon-burning times differ by factors of ~3 at 20–25 M☉ (MESA paper I; checked), so the figure should show ranges, not a single model as truth.
- **Neutrino cooling** (std): after helium burning, pair, photo and plasma neutrinos (Itoh et al. 1996 fits) carry off the core's energy faster than photons can diffuse out, so the core races through its last fuels while the surface hardly changes. Whether Betelgeuse's core is already past helium burning can't be read from its surface (an asteroseismic claim that it is in carbon burning, Saio et al. 2023, is disputed; verify).

---

## 5. Where the elements come from (Chapter 23)

- **Binding energy per nucleon** (std; AME2020): ⁴He 7.07 MeV, ¹²C 7.68, ¹⁶O 7.98, ⁵⁶Fe 8.790, ⁵⁸Fe 8.792, **⁶²Ni 8.795** (the true maximum), ²³⁸U 7.57. Silicon burning ends at ⁵⁶Ni (Z = N = 28, doubly magic), which decays through ⁵⁶Co to ⁵⁶Fe, hence iron's abundance.
- **The liquid drop** (std): Weizsäcker (1935), Bethe & Bacher (1936): volume, surface, Coulomb, asymmetry and pairing terms (one standard fit: 15.8, 18.3, 0.714, 23.2 and 12 MeV). **Magic numbers** 2, 8, 20, 28, 50, 82, 126 (Goeppert Mayer and Jensen 1949; Nobel 1963).
- **The data** (checked): NUBASE2020 (Kondev et al. 2021, *Chin. Phys. C* 45, 030001): 3,340 nuclides' ground states and 1,938 isomers; AME2020 (Huang et al., Wang et al. 2021, *Chin. Phys. C* 45, 030002–3). The IAEA's LiveChart API (`nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all`) serves every ground state as CSV from ENSDF, NUBASE and AME, under the IAEA's terms (teaching use allowed, with acknowledgement; checked). The AMDC pages refused automated requests (HTTP 403/402).
- **The s-process** (std): neutrons from ¹³C(α,n)¹⁶O between thermal pulses of AGB stars (n_n ~ 10⁷ cm⁻³) and ²²Ne(α,n)²⁵Mg in pulses and in massive stars (~10¹⁰–10¹¹); captures every few years to centuries, slower than most β decays, so the path hugs the valley of stability; the "main" component (A > 90) from AGB stars of 1–3 M☉, the "weak" one (A < 90) from massive stars. Along the path σN is nearly constant between magic numbers, with steps at N = 50, 82, 126 (Clayton et al. 1961; Seeger, Fowler & Clayton 1965). Branch points where a β decay and a capture compete (⁸⁵Kr, ⁹⁵Zr, ¹⁵¹Sm). It ends at ²⁰⁹Bi: a capture makes ²¹⁰Bi, which decays to ²¹⁰Po and α-decays back to ²⁰⁶Pb.
- **How we know the s-process happens now** (std): technetium, which has no stable isotope, in the spectra of S stars (Merrill 1952); ⁹⁹Tc, made by the s-process, lives 2.1 × 10⁵ years.
- **Cross sections** (checked): KADoNiS v0.3 at exp-astro.de/kadonis1.0/ (Dillmann et al.), the successor of Bao et al. (2000, *ADNDT* 76, 70): Maxwellian-averaged cross sections at 5–100 keV for 357 isotopes, as tab-separated files; asks for a citation; no other terms found.
- **The r-process** (std): neutron densities above 10²⁰ cm⁻³ at 1–2 GK, captures in milliseconds, so the path runs far from stability where neutron separation energies fall to 2–3 MeV, piling up at the magic numbers (waiting points) and decaying back to stability as the peaks at **A ≈ 80, 130 and 195**. Lanthanides' opacity turns kilonovae red (Kasen et al. 2013; Barnes & Kasen 2013).
  - GW170817's kilonova AT2017gfo (2017), with strontium identified (Watson et al. 2019, *Nature* 574, 497) (std).
  - **Tellurium** (A = 130) in the kilonova of GRB 230307A, seen by JWST (Levan et al. 2024, *Nature* 626, 737; checked).
  - Other proposed sites (std; verify the current state): collapsars (Siegel, Barnes & Metzger 2019) and magnetar giant flares (Patel et al. 2025); old metal-poor stars rich in europium.
  - A toy r-process needs masses and half-lives far from stability, where nothing is measured: the waiting-point approximation with a mass model that keeps shell gaps (a Duflo–Zuker or WS4-type formula, implemented from its paper) and a Q-value rule for β half-lives (verify the choice in the stage). The figure is a toy and says so.
- **Others** (std): the p-process (γ-process) for the 35 proton-rich nuclei; the i-process (Cowan & Rose 1977); cosmic-ray spallation for lithium, beryllium and boron (Reeves, Fowler & Hoyle 1970); the Big Bang for hydrogen, most helium (Y_p ≈ 0.245) and some lithium, named but not taught (it is cosmology).
- **Who worked it out** (std): Burbidge, Burbidge, Fowler & Hoyle (1957, *Rev. Mod. Phys.* 29, 547) and Cameron (1957).
- **Origins of each element:** Johnson (2019, *Science* 363, 474) drew the periodic table by origin (std); Kobayashi, Karakas & Lugaro (2020, *ApJ* 900, 179) computed the shares from carbon to uranium (std; verify that their tables can be used). Solar System isotopic abundances: Lodders (2021, *Space Sci. Rev.* 217, 44) (std, verify); the s/r split: Arlandini et al. (1999), Bisterzo et al. (2014), Prantzos et al. (2020) (std; verify which gives a usable table).
- **You** (std): by mass about 65% oxygen, 18% carbon, 10% hydrogen, 3% nitrogen, 1.5% calcium, 1% phosphorus.

---

## 6. Matter at its limit (Chapter 24)

- **A Fermi gas** (std): p_F = ℏ(3π²n)^⅓; non-relativistic P = (3π²)^⅔ ℏ² n^(5/3) / (5mₑ); ultra-relativistic P = (3π²)^⅓ ℏc n^(4/3) / 4; independent of temperature when T ≪ T_F. Electrons become relativistic (p_F = mₑc) at ρ = 0.97 × 10⁶ μₑ g/cm³, about 2 × 10⁶ g/cm³ for μₑ = 2 (computed).
- **History** (std): Fowler (1926, *MNRAS* 87, 114) explained white dwarfs by Fermi–Dirac statistics; Anderson (1929) and Stoner (1930) found a limit; Chandrasekhar (1931, *ApJ* 74, 81; on the voyage to England in 1930), Landau (1932); Eddington's public rejection (1935); Nobel 1983.
- **The limit** (computed): M_Ch = (√(3π)/2)(ℏc/G)^(3/2) ω₃ / (μₑm_u)² = **5.83/μₑ² M☉: 1.46 M☉ for helium or carbon–oxygen (μₑ = 2), 1.26 for an iron core (μₑ = 2.15)**. Coulomb corrections, inverse β decay and general relativity bring a real carbon–oxygen white dwarf's maximum to about 1.38–1.39 M☉ (std). BSE uses 1.44 (`evolv2.f`, checked).
- **Mass and radius** (std): non-relativistic R ∝ M^−⅓; Nauenberg's (1972) fit R ≈ 0.0112 R☉ [(M/M_Ch)^−⅔ − (M/M_Ch)^⅔]^½.
- **Measured white dwarfs** (std; verify each):

| Star | Mass (M☉) | Radius (R☉) | Source |
|---|---|---|---|
| Sirius B | 1.018 ± 0.011 | 0.0081 | Bond et al. 2017; Joyce et al. 2018 |
| Procyon B | 0.592 ± 0.006 | 0.0123 | Bond et al. 2015 |
| 40 Eridani B | 0.573 ± 0.018 | ~0.013 | Bond et al. 2017 |
| ZTF J1901+1458 | 1.33–1.37 | ~0.0031 (2,100 km, the Moon's size) | Caiazzo et al. 2021, *Nature* 595, 39 |

  Earth's radius is 0.00917 R☉, so a white dwarf the size of Earth weighs about 0.9 M☉ (computed from Nauenberg's fit; the stage's solver gives the exact value).
- **Cooling** (std): Mestel (1952): L ∝ M T_c^(7/2), cooling age ∝ (M/L)^(5/7). **Crystallisation** releases latent heat and slows cooling: Gaia's pile-up (Tremblay et al. 2019, *Nature* 565, 202); the Q branch, where some massive white dwarfs pause for billions of years, explained by ²²Ne distillation (Blouin et al. 2021; Bédard et al. 2024, *Nature* 627, 286) (std; verify).
- **Cold balls from Jupiter to Sirius B** (std): Zapolsky & Salpeter (1969): cold spheres grow with mass (R ∝ M^⅓) until degeneracy takes over, peak near a few Jupiter masses, then shrink (R ∝ M^−⅓). Jupiter is close to the largest a cold ball can be; brown dwarfs are all about Jupiter's size.

---

## 7. Stellar explosions (Chapter 25)

- **Collapse** (std): an iron core of about 1.3–2 M☉ loses pressure to electron captures and to photodisintegration (⁵⁶Fe → 13 ⁴He + 4n absorbs 124 MeV), collapses in a few tenths of a second, and bounces at nuclear density (2.7 × 10¹⁴ g/cm³). About 3 × 10⁴⁶ J are released, 99% as neutrinos; about 10⁴⁴ J ("one foe") goes into the explosion and 10⁴² J into light. The bounce shock stalls; neutrino heating revives it (Bethe & Wilson 1985); 3D simulations now explode (Burrows & Vartanyan 2021, *Nature* 589, 29).
- **SN 1987A** (Part II, std): 24 neutrinos over ~13 s with energies of ~10–40 MeV, consistent with ~3 × 10⁴⁶ J; 0.07 M☉ of ⁵⁶Ni on its tail; ⁵⁶Co's γ-ray lines seen by the Solar Maximum Mission (Matz et al. 1988); **JWST's ionised argon and sulphur point to a neutron star** at the centre (Fransson et al. 2024, *Science* 383, 898; checked: strong but indirect).
- **Types** (std): Minkowski (1941) split I (no hydrogen) from II; Ia (silicon at 615 nm), Ib (helium), Ic (neither), II-P, II-L, IIn, IIb. Ib and Ic come from stripped stars, mostly stripped by companions (Chapter 28). The Galaxy has about 1.6 a century (Part II). SN 2023ixf in M101, 6.9 Mpc, the nearest core collapse in a decade (std).
- **Type Ia** (std): a carbon–oxygen white dwarf ignites carbon in degenerate matter (the thermostat fails again) and is destroyed, making ~0.6 M☉ (0.4–0.8) of ⁵⁶Ni and no remnant; peak M_V ≈ −19.3; the Phillips (1993) width–luminosity relation makes them distance markers (and leads to cosmology, named only). SN 2011fe in M101 (6.4 Mpc, about 0.5 M☉ of ⁵⁶Ni; Pereira et al. 2013; verify); SN 2014J in M82, with ⁵⁶Co's lines (Churazov et al. 2014). Progenitors: single degenerate (Whelan & Iben 1973) or double degenerate (Iben & Tutukov 1984; Webbink 1984); **double detonation** of sub-Chandrasekhar white dwarfs, now with two calcium shells in SNR 0509−67.5 (Das et al. 2025, *Nature Astronomy* 9, 1356; checked: "substantial evidence", in the authors' words).
- **Radioactive light** (std): ⁵⁶Ni → ⁵⁶Co (mean life 8.8 days) → ⁵⁶Fe (111.3 days), depositing 3.9 × 10¹⁰ and 6.8 × 10⁹ erg/g/s at the start of each decay; Arnett (1980, 1982, *ApJ* 253, 785): the peak luminosity equals the decay power at peak ("Arnett's rule"), and the width is the diffusion time τ_m ∝ (κM_ej/vc)^½. γ-ray leakage on the tail (Clocchiatti & Wheeler 1997). Hydrogen-rich explosions' plateaus: Popov (1993).
- **Light curves to compare with** (verify terms): SN 1987A's bolometric curve (Suntzeff & Bouchet 1990; Catchpole et al. 1987–89), SN 2011fe's (Munari et al. 2013; Pereira et al. 2013; Zhang et al. 2016). The Open Supernova Catalog (Guillochon et al. 2017) aggregates them; its present status and data licence weren't established (checked: the paper and code repository exist; the site's state is unclear).
- **Electron-capture supernovae** (std): oxygen–neon cores; SN 2018zd (Hiramatsu et al. 2021); perhaps the Crab of 1054.
- **Pair instability** (std): above ~10⁹ K at low density, photons make electron–positron pairs, the adiabatic index falls below 4/3, the oxygen core collapses and burns explosively (Fowler & Hoyle 1964; Barkat, Rakavy & Sack 1967; Rakavy & Shaviv 1967). Helium cores of 64–133 M☉ are destroyed (Heger & Woosley 2002), 35–65 pulse (Woosley 2017), heavier ones collapse; the black-hole mass gap from ~45–50 M☉ (Farmer et al. 2019). **SN 2018ibb** is the best candidate (Schulze et al. 2024, *A&A* 683, A223), with 25–44 M☉ of ⁵⁶Ni inferred (checked); SN 2007bi was an earlier one (Gal-Yam et al. 2009). The adiabatic index of ions + radiation + pairs in equilibrium can be computed exactly from Fermi–Dirac integrals, so Figure 25.4's wedge is real physics, not a sketch.
- **Gamma-ray bursts** (std): long ones from collapsars with Ic-BL supernovae (GRB 980425/SN 1998bw); short ones from mergers (GRB 170817A; Chapter 29).

---

## 8. Neutron stars (Chapter 26)

- **Structure** (std): an atmosphere centimetres thick; a crust about 1 km deep, a lattice of ever more neutron-rich nuclei in electrons, with neutrons dripping out at 4 × 10¹¹ g/cm³ and "pasta" phases at its base; a core of neutrons with 5–10% protons, electrons and muons, perhaps hyperons or quarks deep down; superfluid and superconducting. Mean density for 1.4 M☉ in 12 km: 3.9 × 10¹⁴ g/cm³ (computed), above an atomic nucleus's.
- **History** (std): Baade & Zwicky (1934); Tolman, Oppenheimer & Volkoff (1939): the TOV equation, with 0.7 M☉ the maximum for free neutrons.
- **The TOV equation** (std): hydrostatic equilibrium with three relativistic factors (pressure adds to the gravitating mass, the gravitating mass includes pressure, and the r − 2Gm/c² term).
- **Equations of state** (std): Read, Lackey, Owen & Friedman (2009, *Phys. Rev. D* 79, 124032): a piecewise polytrope with three pieces above the SLy crust fits 34 tabulated equations of state to a few per cent; their Table III gives each fit's parameters and maximum mass (SLy ~2.05, APR4 ~2.2, MPA1 ~2.5, MS1 ~2.8 M☉; verify against the table).
- **Measurements** (std unless marked):
  - masses: PSR J0348+0432, 2.01 ± 0.04 (Antoniadis et al. 2013); J0740+6620, 2.08 ± 0.07 (Fonseca et al. 2021); J0952−0607, 2.35 ± 0.17 (Romani et al. 2022; in `records.ts`); double neutron stars 1.2–1.4.
  - **NICER radii:** J0030+0451 about 12.7–13 km (Riley et al. 2019; Miller et al. 2019); J0740+6620 about 12.4–13.7 km (2021); **J0437−4715 11.4 km** at 1.418 ± 0.044 M☉ (Choudhury et al. 2024, *ApJL* 971, L20; checked), which a 2025 reanalysis widens to 11.9–15.5 km (Miller et al., arXiv:2512.08790; checked). Radii are hard; the figure shows the ranges.
  - GW170817's tidal deformability: R(1.4 M☉) ≈ 11.9 ± 1.4 km (LVK 2018); the maximum mass about 2.2–2.3 M☉ (Rezzolla, Most & Weih 2018).
- **Pulsars** (std): Bell Burnell's first, 28 Nov 1967 (Part II); rotating neutron stars (Pacini 1967; Gold 1968); the Crab spins at 33.7 ms (verify), Ṗ = 4.2 × 10⁻¹³, braking index 2.50 (Lyne et al. 2015); the fastest, PSR J1748−2446ad at 716 Hz (Hessels et al. 2006); the first millisecond pulsar, B1937+21 (Backer et al. 1982), and recycling by a companion (Alpar et al. 1982; Radhakrishnan & Srinivasan 1982); the death line (Chen & Ruderman 1993); glitches (Vela).
- **Spin-down** (std, with I = 10³⁸ kg m²): B ≈ 3.2 × 10¹⁹ (PṖ)^½ G; characteristic age τ = P/(2Ṗ); Ė = 4π²IṖ/P³. Computed:

| Pulsar | P | Ṗ | B (G) | τ | Ė (W) |
|---|---|---|---|---|---|
| Crab | 33.7 ms | 4.2 × 10⁻¹³ | 3.8 × 10¹² | 1,270 yr (true age 972 yr) | 4.3 × 10³¹ (110,000 L☉) |
| Vela | 89.3 ms | 1.25 × 10⁻¹³ | 3.4 × 10¹² | 11,000 yr | 6.9 × 10²⁹ |
| J0437−4715 | 5.76 ms | 5.7 × 10⁻²⁰ | 5.8 × 10⁸ | 1.6 Gyr | 1.2 × 10²⁷ |
| B1913+16 | 59.0 ms | 8.6 × 10⁻¹⁸ | 2.3 × 10¹⁰ | 108 Myr | 1.7 × 10²⁶ |

- **Long-period radio transients** (std; verify): GLEAM-X J162759.5−523504.3 (18 min, 2022), GPM J1839−10 (21 min, 2023), ASKAP J1935+2148 (54 min, 2024): neutron stars or white dwarfs, argued over.
- **Magnetars** (std): Duncan & Thompson (1992); SGR 1806−20's spin-down (Kouveliotou et al. 1998); giant flares in 1979, 1998 and 27 Dec 2004; a fast radio burst from SGR 1935+2154 (28 Apr 2020). The McGill catalogue lists about 30 (24 confirmed and 7 candidates as cited in 2024; checked from citing papers; verify the live count).
- **The catalogue** (checked): ATNF Pulsar Catalogue v2.9.0 (6 Oct 2026), 4,503 pulsars, 110 more than v2.8.1 (18 Jun 2026); cite Manchester, Hobbs, Teoh & Hobbs (2005, *AJ* 129, 1993) and the URL; the software is GPL v3; the data are ATNF/CSIRO's, "for bona fide research purposes", under CSIRO's legal notice.

---

## 9. Black holes (Chapter 27)

- **History** (std): Michell (1784) and Laplace (1796), dark stars; Schwarzschild (1916); Oppenheimer & Snyder (1939); Kerr (1963); Penrose (1965; Nobel 2020); Wheeler popularised "black hole" (1967); Hawking radiation (1974).
- **Lengths** (computed): r_s = 2GM/c² = **2.95 km per solar mass**; the photon sphere at 1.5 r_s; the innermost stable circular orbit (ISCO) at 3 r_s = 6GM/c²; the shadow's radius √27 GM/c² = 2.6 r_s. For a maximally spinning Kerr hole the prograde ISCO moves in to GM/c² (std).
- **Orbits** (std): the effective potential for a mass gains a −GML²/(c²r³) term; orbits precess, zoom and whirl, and plunge inside the ISCO. Mercury: **42.98″ per century** (computed from 6πGM/(c²a(1 − e²)) per orbit), the excess Le Verrier found in 1859 and Einstein explained in 1915. S2: 12.1′ per orbit (computed; §12).
- **Light** (std): deflection 4GM/(c²b): 1.75″ at the Sun's limb (Dyson, Eddington & Davidson 1920, from the 1919 eclipse); captured below b = √27 GM/c².
- **Accretion** (std): falling to the ISCO releases **5.7%** of the rest-mass energy (computed: 1 − √(8/9)) for a non-spinning hole, up to 42% for a maximal Kerr hole (32% at Thorne's a = 0.998), against fusion's 0.7%. Thin discs: Shakura & Sunyaev (1973), Novikov & Thorne (1973); T ∝ r^−¾; ~10⁷ K (X-rays) round a 10 M☉ hole near its Eddington limit, ~10⁵ K (ultraviolet) round 10⁸ M☉.
- **The Eddington luminosity** (computed): 4πGMm_pc/σ_T = **1.26 × 10³¹ W per solar mass** (33,000 L☉) for pure hydrogen.
- **X-ray binaries** (std; verify the counts): Sco X-1 (Giacconi et al. 1962), Cygnus X-1 (21.2 M☉, Miller-Jones et al. 2021); about 20 black holes dynamically confirmed in X-ray binaries and ~70 candidates (BlackCAT, Corral-Santana et al. 2016); microquasars (GRS 1915+105, Mirabel & Rodríguez 1994). Dormant ones: Gaia BH1–3 (Part II).
- **Jets** (std): M87's jet (Curtis 1918); Blandford & Znajek (1977).
- **The Event Horizon Telescope** (std unless marked): M87\* (10 Apr 2019): a ring of 42 ± 3 µas, 6.5 × 10⁹ M☉, 16.8 Mpc; Sgr A\* (12 May 2022): 51.8 ± 2.3 µas. Computed shadow diameters: **53 µas for Sgr A\*** (4.30 × 10⁶ M☉ at 8.277 kpc) and **40 µas for M87\***. Sgr A\*'s polarised ring (2024; checked); **M87\*'s polarisation pattern reversed between 2017 and 2021** while the ring stayed the same size, with faint emission at the jet's base seen for the first time (EHT, *A&A*, Sep 2025; checked). No EHT movie had been released (checked: none found).

---

## 10. Two stars are stranger than one (Chapter 28)

- **The Roche potential** (std): gravity of both stars plus the centrifugal term in the frame turning with the orbit; Roche (1849, 1873); detached, semi-detached and contact binaries (Kopal 1959). Eggleton's (1983) fit for the lobe's volume-equivalent radius, r_L/a = 0.49q^⅔ / (0.6q^⅔ + ln(1 + q^⅓)), is BSE's `rl.f` exactly (checked). The stream from L1, bent by the Coriolis force, misses the accretor and forms a disc when its closest approach r_min (Lubow & Shu 1975; Ulrich & Burger 1976, as BSE uses; checked) exceeds the accretor's radius.
- **Conservative transfer** (std): with total mass and orbital angular momentum J = M₁M₂(Ga/M)^½ fixed, a ∝ (M₁M₂)^−2: the orbit shrinks while the donor is the heavier star, reaches its smallest at equal masses, then widens.
- **Stability** (std; BSE's values checked from the paper): dynamical when the donor's radius grows faster than its lobe as it loses mass; BSE's critical mass ratios: Hertzsprung-gap donors 4.0, low-mass main-sequence 0.695, white dwarfs 0.628, naked helium giants 0.784, giants from Hjellming & Webbink's (1987) fit (Hurley et al. 2002 eq. 57), main-sequence and core-helium-burning donors 3.0 (`evolv2.f`'s notes, checked).
- **Algol** (std; verify): β Persei Aa1 is a B8 V star of 3.17 M☉, Aa2 a K0 IV subgiant of 0.70 M☉, P = 2.867 days (Baron et al. 2012, *ApJ* 752, 20); a third star of 1.76 M☉ on a 680-day orbit. Computed: a = 13.3 R☉, and the subgiant's Roche lobe 3.45 R☉, about its radius: it fills it. **The paradox**: the lighter star is the more evolved; solved by mass transfer from the once-heavier star (Crawford 1955; Hoyle 1955; Morton 1960; Kippenhahn & Weigert 1967; Paczyński 1971). Goodricke timed its dips in 1783 (Part II).
- **Common envelopes** (std): Paczyński (1976); the energy formalism (Webbink 1984): α_CE ΔE_orb = G M M_env/(λR). α is uncertain by a factor of several; observed post-common-envelope pairs suggest α ~ 0.2–0.3 for some systems and larger for others (std; verify).
- **BSE's physics** (Hurley, Tout & Pols 2002, *MNRAS* 329, 897; checked from the paper and code unless marked):
  - tides: Hut's (1981) equilibrium tide with convective damping after Rasio et al. (1996) for convective envelopes; Zahn's (1977) dynamical tide for radiative ones; Campbell (1984) for degenerate stars;
  - magnetic braking: Rappaport, Verbunt & Joss (1983), off for fully convective stars below 0.35 M☉;
  - gravitational radiation: weak-field point masses (Eggleton);
  - winds: SSE's, enhanced by a companion (bwind) and accreted Bondi–Hoyle fashion (acc2 = 3/2, β_W = 1/8 in `binary.in`);
  - novae keep ε = 0.001 of what they accrete; Eddington-limited accretion (`eddfac`);
  - supernova kicks from a Maxwellian of σ = 190 km/s through `ran3` (seeded);
  - mergers by a collision matrix (`instar.f`); a white dwarf that reaches 1.44 M☉ explodes as a Type Ia (`mch = 1.44` in `evolv2.f`), an oxygen–neon one collapses; a carbon–oxygen white dwarf that gathers 0.15 M☉ of helium detonates as an edge-lit detonation (verify);
  - the paper's Table 3 defaults (verify; from a summary): α_CE 3.0, η 0.5, B_W 0, α_W 1.5, ε 0.001, σ 190 km/s, tides on.
- **`binary.in` as distributed** (checked): 3.0 + 0.3 M☉, 200 days, Z = 0.001, e = 0.5 (an example); η 0.5, bwind 0, hewind 1.0, **α 3.0**, λ 0.5; ceflag 0, tflag 1, ifflag 0, wdflag 1, bhflag 0, nsflag 1, mxns 3.0, idum 29769; pts 0.05, 0.01, 0.02; σ 190, β 0.125, ξ 1.0, acc2 1.5, ε 0.001, **eddfac 10**, γ −1. `bse.f`'s comments call α = 1.0 and eddfac = 1.0 "normal", and wdflag's default 0.
- **The zoo** (std unless marked):
  - cataclysmic variables (dwarf novae, novae, polars); recurrent novae: RS Ophiuchi (latest 2021), U Sco, **T Coronae Borealis** (1866, 1946; not erupted as of October 2026, checked);
  - low- and high-mass X-ray binaries, Be/X-ray binaries; millisecond pulsars and "spiders" (black widows, redbacks); PSR J1023+0038, which switches between a pulsar and an accreting state;
  - blue stragglers (Sandage 1953; McCrea 1964; in NGC 188 mostly from mass transfer, Mathieu & Geller 2009);
  - mergers: V1309 Scorpii, the first seen (2008; Tylenda et al. 2011); KIC 9832227's predicted 2022 merger, withdrawn after a data error (Molnar et al. 2017; Socia et al. 2018): a good "how do we know" story;
  - stripped helium stars found at last in the Magellanic Clouds (Drout et al. 2023, *Science* 382, 1287; verify);
  - ultracompact white-dwarf pairs: HM Cancri (5.4 min), ZTF J1539+5027 (6.9 min; Burdge et al. 2019), future LISA sources;
  - about 70% of O stars interact with a companion (Sana et al. 2012; Part II).
- **Successors of BSE** (std): COSMIC (Breivik et al. 2020, built on BSE), COMPAS, MOBSE, SEVN, StarTrack, BPASS, POSYDON. They keep the skeleton and change the recipes, which is the Forge's lesson: binary outcomes are model-dependent.

---

## 11. Ripples in spacetime (Chapter 29)

- **Theory** (std): Einstein (1916, 1918), the quadrupole formula; Peters & Mathews (1963); Peters (1964): da/dt and de/dt for two point masses, and the merger time t = (5/256) c⁵a⁴/(G³m₁m₂M) for a circular orbit.
- **The Hulse–Taylor pulsar** (std unless marked): PSR B1913+16, found in 1974 (Nobel 1993); P_b = 7.75 hours, e = 0.617, masses 1.438 and 1.390 M☉ (Weisberg & Huang 2016, *ApJ* 829, 55); its periastron advances 4.2° a year; Ṗ_b(GR) = −2.40 × 10⁻¹² (computed); observed/GR = **0.9983 ± 0.0016** (checked); it merges in about **300 million years** (computed by integrating Peters' equations: 301 Myr).
- **The double pulsar** (checked): PSR J0737−3039A/B (Burgay et al. 2003; Lyne et al. 2004): the quadrupole formula confirmed to 1.3 × 10⁻⁴ at 95% (Kramer et al. 2021, *Phys. Rev. X* 11, 041050).
- **Detectors** (std): LIGO's 4 km arms; a strain of 10⁻²¹ changes an arm's length by about hL/2 = 2 × 10⁻¹⁸ m, about a thousandth of a proton's width (computed); Michelson's interferometer again (Part II, Chapter 11). Virgo (3 km), KAGRA (3 km, underground and cryogenic).
- **GW150914** (std): 14 Sep 2015, 09:50:45 UTC; 36 + 29 → 62 M☉, 3 M☉c² radiated, a peak power of 3.6 × 10⁴⁹ W, 410 Mpc (Abbott et al. 2016); GWTC-1's revision 35.6 + 30.6 → 63.1 M☉ at 440 Mpc. Chirp mass ≈ 28 M☉ in the source's frame (computed), about 30 as LIGO measured it (redshifted); in LIGO's band for about 0.2 s from 35 Hz (computed: 0.17 s); peak near 250 Hz.
- **The chirp** (std): f rises as (t_c − t)^−⅜, ḟ = (96/5)π^(8/3)(GM_c/c³)^(5/3) f^(11/3), amplitude ∝ f^⅔; M_c = (m₁m₂)^(3/5)/(m₁ + m₂)^(1/5). The gravitational-wave frequency at the ISCO is **4,400 Hz × (M☉/M)** (computed: 4,397), 68 Hz for 65 M☉. Ringdown: Kerr quasi-normal modes (Berti, Cardoso & Will 2006 fits); an equal-mass non-spinning merger leaves a spin of about 0.69 and radiates about 5% of the mass. A binary neutron star (M_c = 1.19 M☉) spends about a minute above 30 Hz and 17 minutes above 10 Hz (computed).
- **GW170817** (std): 17 Aug 2017; 40 Mpc, NGC 4993; GRB 170817A 1.7 s later, so gravity's speed equals light's to within about 10⁻¹⁵; the kilonova AT2017gfo (Chapter 23); a radius limit (Chapter 26).
- **The catalogue** (checked unless marked):
  - runs: O1 2015–16, O2 2016–17, O3 2019–20, **O4 24 May 2023 – 18 Nov 2025**, with about 250 candidates in real time; O5 planned for late 2027 (May 2025 schedule; verify);
  - GWTC-4.0 (26 Aug 2025): 128 new O4a candidates, 218 in all;
  - **GWTC-5.0 (26 May 2026): 161 new O4b candidates, 390 in all with p_astro ≥ 0.5**; every new one consistent with a pair of black holes, no new neutron-star mergers; GWOSC's cumulative list shows 391 events on 4 Nov 2026, with masses, distances, spins and chirp masses (90% intervals) downloadable as CSV;
  - GW190521 (~85 + 66 M☉, the first intermediate-mass remnant; std); **GW231123**, 190–265 M☉ in total, both holes spinning fast, the lighter in the pair-instability gap; perhaps hierarchical mergers (checked); GW230529, a 2.5–4.5 M☉ object in the lower mass gap with a neutron star (std, verify);
  - **GW250114**: m₁ = 33.6, m₂ = 32.2 M☉, signal-to-noise 80, two ringdown modes resolved, Hawking's area law confirmed to high credibility (*PRL* 135, 2025; checked);
  - primary masses cluster near 10 and 35 M☉ (LVK GWTC-3 population; std).
- **Licence** (checked): GWOSC data are CC BY 4.0; cite an LVK open-data paper (for O4b, arXiv:2605.27090) and include GWOSC's acknowledgement in full; strain files of 32 s and 4,096 s per event at 4 and 16 kHz.
- **Longer waves** (std; verify dates): LISA adopted by ESA on 25 Jan 2024, launch planned around 2035; pulsar timing arrays' evidence for a nanohertz background (NANOGrav's 15-year data, 2023), most likely from pairs of supermassive black holes.

---

## 12. Crowds of stars (Chapter 30)

- **Clusters as gases** (std): virial balance 2K + W = 0; crossing time t_cr = r/σ; two-body relaxation t_rh = 0.138 N^½ r_h^(3/2) / (m^½ G^½ ln 0.4N) (Spitzer 1987): **15 Myr** for 1,000 stars of 0.5 M☉ within 1 pc, where t_cr ≈ 0.7 Myr (computed). Equipartition drives mass segregation; stars evaporate past the Jacobi radius; isolated clusters would last ~100 t_rh (Ambartsumian 1938; Spitzer 1940); the Galaxy's tides make it much faster; core collapse after ~15 t_rh for equal masses (Hénon; Lynden-Bell & Wood 1968, the gravothermal catastrophe), halted by binaries.
- **Methods** (std): Plummer's (1911) sphere sampled by Aarseth, Hénon & Wielen's (1974) recipe; softened direct summation; Hermite fourth-order integration with block time steps (Makino & Aarseth 1992), the method of the NBODY codes. Holmberg's 1941 "simulation" of two galaxies with 37 light bulbs each and photocells is the first (std).
- **Tidal tails** (std): the Hyades' tails across 800 pc, found with Gaia DR2 (Röser et al. 2019; Meingast & Alves 2019); Palomar 5's (Odenkirchen et al. 2001). Open clusters typically dissolve within a few hundred million years (Lamers et al. 2005). The Milky Way has about 160 globular clusters (Harris catalogue; verify the count).
- **The Milky Way** (std unless marked; Bland-Hawthorn & Gerhard 2016, *ARA&A* 54, 529):
  - the Sun 8.2–8.3 kpc from the centre (GRAVITY: 8.178 in 2019, 8.277 in 2022; verify) and about 21 pc above the plane; circular speed about 229–233 km/s; a galactic year of about 220 Myr (computed: 219 Myr at 230 km/s and 8.2 kpc);
  - the mass inside the Sun's orbit, v²R/G ≈ 1.0 × 10¹¹ M☉ (computed);
  - stars: about 5 × 10¹⁰ M☉ in 100–400 billion stars; thin disc ~300 pc thick, thick disc ~900 pc, scale lengths 2–3 kpc; a bar ~5 kpc long turning at ~40 km/s/kpc (verify);
  - total (virial) mass 0.5–2 × 10¹² M☉, most of it dark (verify; see the rotation curve below);
  - built from eaten galaxies: Gaia–Enceladus, 8–11 Gyr ago (Helmi et al. 2018, *Nature* 563, 85; Belokurov et al. 2018); the Sagittarius dwarf being torn apart now (Ibata, Gilmore & Irwin 1994); Gaia's phase spiral (Antoja et al. 2018).
- **Rotation curves** (std unless marked):
  - Babcock (1939) and Rubin & Ford (1970) on Andromeda; Rubin, Ford & Thonnard (1978, 1980); Bosma (1978) and van Albada et al. (1985, NGC 3198) with neutral hydrogen beyond the stars; Zwicky's "dunkle Materie" in the Coma cluster (1933); dark halos (Ostriker & Peebles 1973; Einasto, Kaasik & Saar 1974);
  - the Milky Way's own: Eilers et al. (2019, *ApJ* 871, 120), 229 km/s at the Sun falling 1.7 km/s per kpc out to 25 kpc; **Ou et al. (2024, *MNRAS* 528, 693): from ~230 km/s at 5 kpc to ~170 km/s at 28 kpc**, a cored dark halo (checked); **Jiao et al. (2023, *A&A* 678, A208): a Keplerian fall between 19 and 26.5 kpc and 2.06 × 10¹¹ M☉ in all** (checked); a 2026 review (arXiv:2608.10189) says this rests on delicate Jeans-model assumptions and that streams, satellites and the Local Group's timing argue for a heavier halo (checked: summary). Gaia DR4 (2 Dec 2026) may move this. An "as of" topic.
  - **SPARC** (Lelli, McGaugh & Schombert 2016, *AJ* 152, 157): 175 galaxies with 3.6 µm photometry and HI/Hα rotation curves split into stars, gas and the rest; the site asks for a citation and states no licence (checked).
  - The alternative: modified gravity (MOND, Milgrom 1983; a₀ ≈ 1.2 × 10⁻¹⁰ m/s²) fits galaxies' curves well; the case for dark matter rests also on clusters and cosmology, which the course doesn't teach. The chapter says so plainly.
- **Mass models** (std): Hernquist (1990) bulge; exponential disc's circular speed from Freeman (1970), v² = 4πGΣ₀R_d y²[I₀K₀ − I₁K₁](y), y = R/2R_d; NFW (Navarro, Frenk & White 1996) or pseudo-isothermal halos.
- **Spiral arms** (std): the winding problem; density waves (Lin & Shu 1964), patterns slower than the stars, which pass through like cars through a jam; Kalnajs's (1973) kinematic spirals from nested, slightly turned ellipses; transient, recurring arms (Toomre 1981; Sellwood & Carlberg 1984, 2014), still debated.
- **Sagittarius A\*** (std unless marked): found by Balick & Brown (1974); **S2**: P = 16.05 years, a = 0.1255″, e = 0.884, pericentre in May 2018 (GRAVITY 2020, *A&A* 636, L5; verify the elements); computed: a = 1,040 AU at 8.277 kpc, **M = a³/P² = 4.35 × 10⁶ M☉** (GRAVITY: 4.3 × 10⁶; checked: "about 4.25" in 2020, 4.30 in later papers, verify), pericentre 120 AU, the precession 12.1′ per orbit, matching GRAVITY's detection (f_SP = 1.10 ± 0.19, 2020; checked); the gravitational redshift at the 2018 pericentre (GRAVITY 2018, *A&A* 615, L15); any extended mass inside S2's orbit below ~0.1% (checked). Nobel 2020: Genzel and Ghez, with Penrose. S2's next pericentre falls around 2034.4 (computed), which the text must compute from today, not state.

---

## 13. Colliding galaxies (Chapter 31)

- **Toomre & Toomre** (1972, *ApJ* 178, 623): two point masses with rings of test particles (std) reproduce bridges and tails (the Antennae, NGC 4038/9, ~20 Mpc; the Mice, NGC 4676, ~90 Mpc); a head-on hit makes a ring (the Cartwheel; Lynds & Toomre 1976); Arp's *Atlas of Peculiar Galaxies* (1966). Holmberg's light bulbs came first (1941; §12).
- **Dynamical friction** (std): Chandrasekhar (1943); without it point-mass galaxies pass and part; with it they merge.
- **Stars don't collide** (computed; verify in the stage): with 0.1 stars per pc³ and Sun-sized stars the mean free path is ~10¹⁵ pc, against a galaxy's 3 × 10⁴ pc, so among 10¹¹ stars crossing once, a few collide, ten or so allowing for gravitational focusing.
- **The Milky Way and Andromeda** (std unless marked): Andromeda 765 ± 11 kpc (verify), approaching the Galaxy's centre at ~110 km/s (van der Marel et al. 2012); its sideways speed from Hubble and Gaia is small and uncertain (57 km/s, van der Marel et al. 2019; 82 ± 38, Salomon et al. 2021; verify); van der Marel et al. (2012): first pass in ~4 Gyr, merger ~2 Gyr later. **Sawala et al. (2025, *Nature Astronomy*, 2 Jun 2025): about a 50% chance of a merger within 10 Gyr**; reported by one source as 44% for the two galaxies alone, 63% with M33 and 37% with the Large Magellanic Cloud (checked, as reported; verify against the paper); the LMC merges with the Milky Way first; Andromeda's sideways speed is the biggest uncertainty (checked).
- **Active galaxies** (std): Seyfert (1943); Schmidt's 3C 273 (1963), redshift 0.158; quasars powered by accretion (Chapter 27); black-hole mass tracks the bulge's velocity dispersion (Ferrarese & Merritt 2000; Gebhardt et al. 2000).
- **The door to cosmology** (std): Hubble's Cepheids put Andromeda outside the Galaxy (1925; Part II); galaxies' redshifts grow with distance (Lemaître 1927; Hubble 1929). The course stops there.

---

## 14. The labs' engines

**BSE** (§10 for its physics)
- **Source** (checked): AMUSE, `src/amuse_bse/src`, commit 9f8c7af (20 Mar 2025); README dated 12 Feb 2000 with change notes in `evolv2.f` to September 2004 (the de Kool option `ceflag = 3`, `hewind`); ASCL 1303.014; Hurley's page at Swinburne (`~jhurley/binary.html`). Citation request only; run once in WSL to make fixtures, never shipped.
- **Size** (checked): `evolv2.f` 2,340 lines, `comenv.f` 353, `gntage.f` 299, `popbin.f` 220, `kick.f` 139, `mix.f` 137, `dgcore.f` 126, `instar.f` 100, `corerd.f` 48, `ran3.f` 45, `rl.f` 13. The shared single-star routines are identical to SSE's (checked by `diff -w`), and the course's SSE port matches Hurley's code step for step over 168 stars (Stage 13), so the binary routines are the whole job.
- **Testing** (plan §5): fixtures over a grid of masses, periods, eccentricities and metallicities with kicks off (σ = 0) for step-for-step comparison, and with kicks on through an exact port of `ran3` and the same seed.
- **Mass range** 0.1–100 M☉, Z = 0.0001–0.03, any period and eccentricity (README; checked).

**Many-body** (§12): softened direct summation is N² (Part I's measurement: about 340 million pair forces a second on one core, so 2,000 stars run at ~170 steps a second); a Hermite integrator with block steps is accurate enough to show relaxation and evaporation honestly over hundreds of crossing times.

**Restricted galaxies** (§13): test particles in the moving potentials of two or three extended galaxies (Plummer or Hernquist halos), with Chandrasekhar's dynamical friction on the galaxies; 100,000 particles cost 2 × 10⁵ pair forces a step, about 1,700 steps a second on one core.

**General relativity in the Orrery** (std): the first post-Newtonian correction for one dominant mass (Anderson et al. 1975, as in REBOUNDx's `gr` force; Tamayo et al. 2020), or the Einstein–Infeld–Hoffmann equations for every pair; tests: Mercury's 43″ a century, S2's 12′ an orbit.

**The Sun's death and its planets** (std): SSE's 1 M☉ track (Part II: up to 221 R☉ on the AGB, ending at 0.52 M☉); slow mass loss widens orbits as a ∝ 1/M (Jeans 1924); tides in the giant's convective envelope drag planets in (Zahn 1977, 1989; Villaver & Livio 2009; Mustill & Villaver 2012). Schröder & Smith (2008, *MNRAS* 386, 155) find Earth engulfed near the tip of the red-giant branch; the result depends on the mass-loss rate and the tides, so readers can vary them. **This is the master plan's showcase; its question is whether Earth is swallowed, not whether it escapes.**

**WebGPU** (checked): Chrome and Edge since 113 (Android 12+ since 121), Safari 26 (macOS, iOS, iPadOS), Firefox 141 on Windows and 145 on Apple-silicon Macs; not yet Firefox on Linux or Android. WebGL with CPU workers stays the main path; WebGPU only for the stretch (self-gravitating galaxies).

---

## 15. Data sources and licences

| Data | What we take | Licence or terms | Status |
|---|---|---|---|
| **GWOSC** (LIGO, Virgo, KAGRA) | The cumulative catalogue's masses, spins, distances, chirp masses (CSV); GW150914's strain, whitened and band-passed by the script | **CC BY 4.0**; cite an LVK open-data paper and give GWOSC's acknowledgement in full | (checked) |
| **ATNF Pulsar Catalogue** v2.9.0 | P, Ṗ, type flags and binarity of 4,503 pulsars | Property of ATNF/CSIRO; "for bona fide research purposes"; CSIRO's legal notice; cite Manchester et al. 2005 and the URL | (checked): **needs permission** (plan §13) |
| **IAEA LiveChart** (ENSDF, NUBASE2020, AME2020) | Every nuclide's Z, N, mass excess, binding energy, half-life, decay modes | IAEA terms: adapting and copying for teaching and in non-commercial products allowed, with acknowledgement | (checked) |
| **AME2020, NUBASE2020** (*Chin. Phys. C* 45) | As above, citable | Open access; the journal's CC BY 3.0 re-use policy | (checked as the journal's policy; per article verify) |
| **KADoNiS v0.3** | Neutron-capture cross sections at 30 keV for 357 isotopes | Citation (Dillmann et al.); no other terms found | (checked) |
| **Read et al. (2009)** | Piecewise-polytrope parameters for ~10 neutron-star equations of state | Facts, cited | (std) |
| **Measured white dwarfs, neutron stars, pulsars** | Masses, radii, periods from their papers | Facts, cited | (std; each verify) |
| **Woosley, Heger & Weaver (2002)** | Burning stages of 15 and 25 M☉ stars | Facts, cited | (verify) |
| **Solar abundances and their s/r split** | Isotopic abundances; s and r shares | Published tables (Lodders 2021; Prantzos et al. 2020 or others) | (verify) |
| **Element origins** | Shares by site | Kobayashi et al. 2020 (or Johnson's categories) | (verify) |
| **Supernova light curves** (SN 1987A, SN 2011fe) | Bolometric light curves | Published photometry; the Open Supernova Catalog's state unclear | (verify) |
| **Milky Way rotation curve** | Eilers et al. 2019, Ou et al. 2024 tables | Facts, cited | (checked: papers) |
| **SPARC** | A handful of galaxies' rotation curves with their stars and gas | Citation requested; no licence stated | (checked) |
| **S2's orbit** | GRAVITY's elements (and perhaps published positions) | Facts, cited | (verify) |
| **Local Group** | Masses, distances and velocities with errors | Facts, cited (Sawala et al. 2025 and its sources) | (verify) |
| **Model S** (already used) | Γ₁ added, for the convection figure | Cited (Part II) | (verify the FGONG column) |
| **BSE Fortran** (Hurley) | Run once to make test fixtures | Citation request; not shipped | (checked) |
| **Gaia DR3** (already used) | White dwarfs for crystallisation; the Galaxy's stars | CC BY-NC 3.0 IGO (Part II) | (checked in Part II) |

---

## 16. Algorithms

| Job | Method | Check | Source |
|---|---|---|---|
| Lane–Emden | RK4 or adaptive RK45 from a series start near the centre (θ ≈ 1 − ξ²/6 + nξ⁴/120) | n = 0, 1, 5 analytic; the table of §2 to 6 figures | Chandrasekhar 1939; Horedt 2004 |
| Virial contraction | A polytrope sequence at fixed mass, energy bookkeeping | 2K + Ω = 0 to round-off; half radiated, half heat | (std) |
| ZAMS model | Four equations with ideal gas + radiation, analytic opacities, pp + CNO rates; shooting to a fitting point with Newton on (P_c, T_c, R, L), or Henyey relaxation | The Sun within ~10–30% of Model S; L ∝ M³–⁴ against DEBCat | Hansen, Kawaler & Trimble 2004 ch. 7 (std) |
| Convection | ∇_rad vs ∇_ad; in the model, adiabatic where convective | Model S's base of the convection zone at 0.713 R☉ | (std) |
| Gamow peak | Maxwell × tunnelling, integrated numerically; E₀ and width analytic | The analytic peak and width | (std) |
| Reaction rates | Caughlan & Fowler (1988) analytic fits, NACRE where better | Published rates at chosen T | CF88; NACRE (std) |
| Reaction networks | Small stiff networks by implicit Euler or a Rosenbrock method with the Jacobian | Mass conservation; CNO's equilibrium ratios | (std) |
| Chart of nuclides | IAEA ground states | Counts; binding-energy maximum at ⁶²Ni | (checked) |
| s-process | Captures along the valley with KADoNiS cross sections and measured half-lives, exposures as in classical analyses | σN flat between magic numbers | Seeger, Fowler & Clayton 1965 (std) |
| r-process (toy) | Waiting-point approximation: (n,γ)⇌(γ,n) Saha equilibrium in each isotopic chain, β decays at the waiting points, then decay back | Peaks near A = 80, 130, 195 | Kratz et al. 1993 (std) |
| White dwarfs | Chandrasekhar's exact T = 0 Fermi-gas pressure in hydrostatic equilibrium | M_Ch to 4 figures; Nauenberg's fit; Sirius B | (std) |
| Fermi–Dirac integrals | Numerical quadrature (or Aparicio's 1998 fits) | Limits of nondegenerate and degenerate gas | (std) |
| Pair instability | Γ₁ of ions + radiation + e⁺e⁻ pairs in equilibrium; n = 3 central tracks | Γ₁ < 4/3 region against published diagrams | (std) |
| Collapse and bounce (toy) | 1D Lagrangian hydrodynamics with artificial viscosity (von Neumann–Richtmyer), a Γ-law that stiffens at nuclear density | Energy conservation; a homologous inner core | (std) |
| Supernova light curves | Arnett (1982) with γ-ray leakage; Popov (1993) for plateaus | Arnett's rule; ⁵⁶Co's tail slope 0.98 mag per 100 days | (std) |
| Neutron stars | TOV with piecewise polytropes, integrated outward; M–R by sweeping the central pressure | Read et al.'s maximum masses | Read et al. 2009 |
| Pulsar spin-down and beams | Dipole spin-down; the beam cone's crossing of the line of sight | Characteristic ages and fields of §8 | (std) |
| Schwarzschild orbits | Geodesics in proper time (r, φ) from the conserved E and L, integrated with RK4 or the Orrery's IAS15 | Circular orbits, ISCO at 6M, precession against 6πM/(a(1−e²)) | (std) |
| Light bending | Null geodesics (the orbit equation u″ + u = 3Mu²) | Weak-field 4M/b; capture at √27 M | (std) |
| Accretion disc | Shakura–Sunyaev temperature with the ISCO as inner edge; multi-colour black body | Efficiencies of §9 | (std) |
| *(stretch)* Ray-traced black hole | A WebGL fragment shader marching null geodesics (u″ + u = 3Mu²) through a thin disc | Shadow size √27 M; known images (Luminet 1979) | (std) |
| Roche geometry | Potential, Lagrange points (Part I's `lagrange.ts`), Eggleton's lobe, the L1 stream integrated in the rotating frame | Eggleton's fit; r_min against Ulrich & Burger | (std) |
| Binary evolution | BSE ported from the Fortran | Hurley's own code, step for step | §14 |
| Inspiral | Peters' equations (a, e) | Hulse–Taylor's Ṗ_b; circular merger times | Peters 1964 |
| Chirp | Leading-order (or 3.5PN) inspiral phase and amplitude, joined to a damped ringdown at the merger frequency; sound by Web Audio | Chirp mass back from the sweep; GW150914's real strain beside it | (std) |
| Clusters | Plummer initial conditions; softened Hermite with block steps; Hill's tidal field in a rotating frame | Energy error; the virial ratio; escapers past the Jacobi radius | Makino & Aarseth 1992 (std) |
| Rotation curves | Sums in quadrature of bulge, disc, gas and halo speeds; χ² against data | Freeman's disc formula; NFW analytic | (std) |
| Spiral patterns | Kalnajs's turned ellipses; material arms wound by v(R) | — | (std) |
| S2 | Part II's visual-orbit code (Campbell elements, Thiele–Innes) | GRAVITY's positions and the mass from a³/P² | (std) |
| Galaxy collisions | Test particles in two moving halos with dynamical friction; leapfrog in a worker; WebGL points | Toomre's tails for his parameters; energy of the halos' orbit | Toomre & Toomre 1972 |
| Will we collide? | Monte Carlo over the measured masses and velocities, with friction, seeded | Sawala et al.'s ~50% | Sawala et al. 2025 (verify) |

---

## 17. Timeline for Part III

*(std unless marked)*

| Year | Event |
|---|---|
| 1784 | Michell's dark stars |
| 1849 | Roche's limit and lobes |
| 1854, 1862 | Helmholtz and Kelvin: the Sun shines by contraction |
| 1859 | Darwin's 300 million years for the Weald; Le Verrier's excess precession of Mercury |
| 1870, 1907 | Lane and Emden: polytropes |
| 1906 | Schwarzschild's criterion for convection |
| 1911 | Plummer's sphere |
| 1915–16 | Einstein's general relativity; Schwarzschild's solution |
| 1919 | Light bent by the Sun at the eclipse |
| 1920 | Eddington: subatomic energy |
| 1926 | Fowler: degenerate electrons hold up white dwarfs; Eddington's *Internal Constitution of the Stars* |
| 1928–29 | Gamow; Atkinson and Houtermans: tunnelling makes fusion possible |
| 1930–31 | Chandrasekhar's limit |
| 1934 | Baade and Zwicky: neutron stars from supernovae |
| 1938–39 | Bethe and von Weizsäcker: the pp chain and the CNO cycle; Oppenheimer and Volkoff; Oppenheimer and Snyder |
| 1941 | Holmberg's light-bulb galaxy collision |
| 1943 | Chandrasekhar's dynamical friction |
| 1952 | Merrill finds technetium in stars; Mestel's white-dwarf cooling |
| 1953–57 | Hoyle's resonance in carbon, found at Caltech |
| 1955 | The Algol paradox solved by mass transfer |
| 1957 | B²FH and Cameron: how stars make the elements |
| 1962–64 | Sco X-1; Cygnus X-1 |
| 1963 | Kerr's spinning black hole; Schmidt's quasar |
| 1964 | Lin and Shu's density waves |
| 1967 | Bell Burnell's pulsar (Part II) |
| 1970–80 | Rubin and Ford's rotation curves |
| 1972 | Toomre and Toomre's bridges and tails |
| 1973 | Shakura and Sunyaev's accretion discs |
| 1974 | Hulse and Taylor's binary pulsar; Hawking radiation |
| 1976 | Paczyński's common envelope |
| 1982 | The first millisecond pulsar; Arnett's light curves |
| 1987 | SN 1987A's neutrinos (Part II) |
| 2000, 2002 | Hurley, Pols and Tout's SSE and BSE |
| 2002 | S2 seen to swing round Sgr A\* at pericentre (Schödel et al. 2002; Ghez et al. 2003) |
| 2003 | The double pulsar |
| 2015 | GW150914, the first gravitational waves |
| 2017 | GW170817 and its kilonova |
| 2018 | Gaia–Enceladus found; S2's redshift at pericentre |
| 2019 | The EHT's image of M87\* |
| 2020 | S2's Schwarzschild precession; Borexino's CNO neutrinos |
| 2022 | The EHT's image of Sgr A\* |
| 2024 | JWST's evidence for SN 1987A's neutron star; NICER's J0437−4715 (checked) |
| 2025 | O4 ends; GW250114 and Hawking's area law; GW231123; the double detonation in SNR 0509−67.5; Milky Way and Andromeda at even odds; M87\*'s polarisation flip (checked) |
| 2026 | GWTC-5.0 (checked); Gaia DR4 (due 2 Dec) |

---

## 18. Glossary (Part III terms)

- **Accretion disc:** gas spiralling onto a star or black hole, heated by friction as it falls.
- **Adiabatic:** without heat flowing in or out, as when a rising parcel of gas expands and cools.
- **Binding energy:** the energy needed to pull a nucleus (or a star, or an orbit) apart.
- **Chirp, chirp mass:** a gravitational wave's rising pitch as two bodies spiral together, and the combination of their masses that sets how fast it rises.
- **Common envelope:** a shared envelope engulfing both stars of a pair, which drags them together.
- **CNO cycle, pp chain:** the two ways stars fuse hydrogen into helium.
- **Coulomb barrier:** the electric repulsion two nuclei must get through to fuse.
- **Dark matter:** the unseen mass that holds galaxies' outer parts in orbit.
- **Degeneracy pressure:** the pressure of particles that can't be packed closer, by the Pauli principle; it doesn't depend on temperature.
- **Density wave:** a pattern, like a traffic jam, that moves through a disc slower than its stars.
- **Dynamical friction:** the drag on a massive body moving through a crowd of stars.
- **Eddington luminosity:** the brightest an object can shine before its light pushes away the gas falling on it.
- **Effective potential:** energy against distance for an orbit, including the effect of its angular momentum.
- **Event horizon:** a black hole's boundary of no return (listed in Part II's brief but not yet in the site's glossary).
- **Fermi energy, Fermi momentum:** the highest energy and momentum filled in a degenerate gas.
- **Gamow peak:** the narrow range of energies at which fusion actually happens in a star.
- **Gravitational wave:** a ripple in spacetime that stretches and squeezes what it passes.
- **Hydrostatic equilibrium:** the balance of pressure and weight in every layer of a star.
- **Innermost stable circular orbit (ISCO):** the closest a body can orbit a black hole without plunging in.
- **Isotope, nuclide:** atoms of one element with different numbers of neutrons; one kind of nucleus.
- **Kelvin–Helmholtz time:** how long a star could shine by shrinking alone.
- **Kilonova:** the glow of radioactive heavy elements thrown out by merging neutron stars.
- **Magic numbers:** numbers of protons or neutrons that make nuclei especially stable.
- **Magnetar:** a neutron star with a field of 10¹⁴–10¹⁵ gauss.
- **Mass transfer, Roche lobe:** gas passing from one star to its companion, and the region inside which a star's gas stays its own.
- **Millisecond pulsar:** an old neutron star spun up by a companion.
- **Opacity:** how strongly matter blocks light passing through it.
- **Photon sphere, shadow:** where light can circle a black hole, and the dark disc it leaves on the sky.
- **Polytrope:** a model star in which pressure follows a power of density.
- **Relaxation time:** how long until stars' encounters have reshuffled their orbits.
- **Rotation curve:** orbital speed against distance from a galaxy's centre.
- **r-process, s-process:** rapid and slow neutron captures that make most elements heavier than iron.
- **Spin-down:** a pulsar slowing as it radiates its spin away.
- **Tidal tail:** stars or gas pulled out of a cluster or galaxy by another's tides.
- **Tunnelling:** a quantum particle passing a barrier it couldn't classically climb.
- **Virial theorem:** in a bound system, kinetic energy is half the size of the (negative) potential energy.

---

## 19. Questions readers will ask

- **If the Sun's core is 15 million degrees, why doesn't it just explode?** The thermostat: heat makes the core expand and cool, which slows the fusion.
- **How can fusion work at "only" 15 million degrees?** Quantum tunnelling, and the sheer number of protons: each waits about ten billion years.
- **Where did the gold in my ring come from?** Most likely from merging neutron stars; other sites are argued over.
- **Is there a limit to how big a star can be?** Its own light pushes it apart above a few hundred solar masses.
- **Could the Sun become a neutron star or black hole?** No: below 1.4 solar masses its core stays a white dwarf.
- **What's inside a black hole?** General relativity predicts a singularity; nobody knows what really happens there.
- **Would you be spaghettified falling into a black hole?** Near a stellar black hole, yes, outside the horizon; at a supermassive one you'd cross the horizon intact.
- **Can we hear gravitational waves?** Not directly: they stretch space, not air. We turn the strain into sound, and some chirps fall in the range of hearing.
- **Is dark matter real?** Something holds galaxies together that we can't see; whether it is a particle or a change to gravity is still open.
- **Will the Milky Way collide with Andromeda?** Maybe: by current measurements about even odds within 10 billion years. If it does, the stars themselves almost never collide.
- **Will the Sun swallow Earth?** Probably, near the tip of the red-giant branch, but it is close: it depends on how much mass the Sun loses and how strongly its tides drag Earth in.

---

## Sources

**Checked on 4 Nov 2026**
- BSE in AMUSE: https://github.com/amusecode/amuse/tree/main/src/amuse_bse/src (commit 9f8c7af); ASCL: https://ascl.net/1303.014; Hurley's page: https://astronomy.swin.edu.au/~jhurley/binary.html
- Hurley, J. R., Tout, C. A. & Pols, O. R. (2002), *MNRAS* 329, 897: https://arxiv.org/abs/astro-ph/0201220
- ATNF Pulsar Catalogue: https://www.atnf.csiro.au/research/pulsar/psrcat/download.html and catalogueHistory.html; CSIRO copyright: https://www.csiro.au/copyright
- GWOSC: https://gwosc.org/acknowledgement/, https://gwosc.org/GWTC-5.0/, https://gwosc.org/eventapi/html/GWTC/, https://gwosc.org/GWTC-4.0/
- GWTC-5.0: https://arxiv.org/abs/2605.27225 and https://ligo.org/detections/o4b-catalog/; O4's end: https://ligo.org/ligo-virgo-kagra-collaboration-successfully-wraps-up-its-fourth-observing-run/
- GW250114: *PRL* 135 (2025), via https://eprints.whiterose.ac.uk/id/eprint/231845; GW231123: https://arxiv.org/abs/2507.08219
- IAEA LiveChart API: https://www-nds.iaea.org/relnsd/vcharthtml/api_v0_guide.html; IAEA terms: https://nucleus.iaea.org/Pages/Others/Terms-Of-Use.aspx
- AME2020 and NUBASE2020: https://cpc.ihep.ac.cn/article/doi/10.1088/1674-1137/abddaf and .../abddae
- KADoNiS v0.3: https://exp-astro.de/kadonis1.0/
- SPARC: https://astroweb.case.edu/SPARC/
- Sawala, T. et al. (2025), "No certainty of a Milky Way–Andromeda collision", *Nature Astronomy*: https://www.uwa.edu.au/news/article/2025/june/astronomers-thought-the-milky-way-was-doomed-to-crash-into-andromeda
- Milky Way rotation curve: Ou, X. et al. (2024), *MNRAS* 528, 693 (arXiv:2303.12838); Jiao, Y. et al. (2023), *A&A* 678, A208; the 2026 review: https://arxiv.org/abs/2608.10189
- GRAVITY Collaboration (2020), *A&A* 636, L5: https://arxiv.org/abs/2004.07187
- EHT's polarisation flip: https://eventhorizontelescope.org/new-eht-images-reveal-unexpected-polarization-flips-at-m87
- NICER J0437−4715: https://arxiv.org/abs/2407.06789; reanalysis: https://arxiv.org/abs/2512.08790
- Weisberg, J. M. & Huang, Y. (2016), *ApJ* 829, 55: https://arxiv.org/abs/1606.02744
- Kramer, M. et al. (2021), *Phys. Rev. X* 11, 041050: https://www.mpifr-bonn.mpg.de/pressreleases/2021/12
- Solar Fusion III: https://arxiv.org/abs/2405.06470; ¹⁴N(p,γ): https://arxiv.org/abs/2410.16086
- SN 1987A's neutron star: https://esawebb.org/news/weic2404
- SNR 0509−67.5: Das, P. et al. (2025), *Nature Astronomy* 9, 1356
- SN 2018ibb: https://arxiv.org/abs/2305.05796 and https://arxiv.org/abs/2405.20009
- Levan, A. et al. (2024), *Nature* 626, 737: https://arxiv.org/abs/2307.02098
- Gaia DR4's date: https://www.cosmos.esa.int/web/gaia/release
- T Coronae Borealis: https://en.wikipedia.org/wiki/T_Coronae_Borealis
- WebGPU: https://web.dev/blog/webgpu-supported-major-browsers

**Standard references (from knowledge; check details before quoting)**
- Kippenhahn, R., Weigert, A. & Weiss, A. (2012). *Stellar Structure and Evolution*, 2nd ed. Hansen, C. J., Kawaler, S. D. & Trimble, V. (2004). *Stellar Interiors*, 2nd ed. Clayton, D. D. (1968). *Principles of Stellar Evolution and Nucleosynthesis*. Shapiro, S. L. & Teukolsky, S. A. (1983). *Black Holes, White Dwarfs, and Neutron Stars*. Binney, J. & Tremaine, S. (2008). *Galactic Dynamics*, 2nd ed. Carroll, B. W. & Ostlie, D. A. (2017). *An Introduction to Modern Astrophysics*, 2nd ed.
- Chandrasekhar, S. (1939). *An Introduction to the Study of Stellar Structure*. Horedt, G. P. (2004). *Polytropes*.
- Mitalas, R. & Sills, K. R. (1992). *ApJ* 401, 759. Böhm-Vitense, E. (1958). *Z. Astrophys.* 46, 108. Henyey, L. G. et al. (1964). *ApJ* 139, 306.
- Caughlan, G. R. & Fowler, W. A. (1988). *ADNDT* 40, 283. Angulo, C. et al. (1999). *Nucl. Phys. A* 656, 3. deBoer, R. J. et al. (2017). *Rev. Mod. Phys.* 89, 035007.
- Woosley, S. E., Heger, A. & Weaver, T. A. (2002). *Rev. Mod. Phys.* 74, 1015. Itoh, N. et al. (1996). *ApJS* 102, 411.
- Burbidge, E. M., Burbidge, G. R., Fowler, W. A. & Hoyle, F. (1957). *Rev. Mod. Phys.* 29, 547. Seeger, P. A., Fowler, W. A. & Clayton, D. D. (1965). *ApJS* 11, 121. Kratz, K.-L. et al. (1993). *ApJ* 403, 216. Johnson, J. A. (2019). *Science* 363, 474. Kobayashi, C., Karakas, A. I. & Lugaro, M. (2020). *ApJ* 900, 179. Lodders, K. (2021). *Space Sci. Rev.* 217, 44.
- Chandrasekhar, S. (1931). *ApJ* 74, 81. Fowler, R. H. (1926). *MNRAS* 87, 114. Nauenberg, M. (1972). *ApJ* 175, 417. Mestel, L. (1952). *MNRAS* 112, 583. Zapolsky, H. S. & Salpeter, E. E. (1969). *ApJ* 158, 809. Bond, H. E. et al. (2015, 2017). Caiazzo, I. et al. (2021). *Nature* 595, 39. Tremblay, P.-E. et al. (2019). *Nature* 565, 202. Bédard, A. et al. (2024). *Nature* 627, 286.
- Arnett, W. D. (1982). *ApJ* 253, 785. Popov, D. V. (1993). *ApJ* 414, 712. Bethe, H. A. & Wilson, J. R. (1985). *ApJ* 295, 14. Burrows, A. & Vartanyan, D. (2021). *Nature* 589, 29. Heger, A. & Woosley, S. E. (2002). *ApJ* 567, 532. Farmer, R. et al. (2019, 2020). Schulze, S. et al. (2024). *A&A* 683, A223. Fransson, C. et al. (2024). *Science* 383, 898.
- Read, J. S. et al. (2009). *Phys. Rev. D* 79, 124032. Oppenheimer, J. R. & Volkoff, G. M. (1939). *Phys. Rev.* 55, 374. Manchester, R. N. et al. (2005). *AJ* 129, 1993. Lyne, A. G. et al. (2015). *MNRAS* 446, 857. Antoniadis, J. et al. (2013). *Science* 340, 448. Choudhury, D. et al. (2024). *ApJL* 971, L20.
- Shakura, N. I. & Sunyaev, R. A. (1973). *A&A* 24, 337. Blandford, R. D. & Znajek, R. L. (1977). *MNRAS* 179, 433. Luminet, J.-P. (1979). *A&A* 75, 228. Event Horizon Telescope Collaboration (2019, 2022), *ApJL* 875, L1; 930, L12.
- Eggleton, P. P. (1983). *ApJ* 268, 368. Paczyński, B. (1976). In *Structure and Evolution of Close Binary Systems*, IAU Symp. 73. Webbink, R. F. (1984). *ApJ* 277, 355. Hut, P. (1981). *A&A* 99, 126. Zahn, J.-P. (1977). *A&A* 57, 383. Rappaport, S., Verbunt, F. & Joss, P. C. (1983). *ApJ* 275, 713. Baron, F. et al. (2012). *ApJ* 752, 20. Tylenda, R. et al. (2011). *A&A* 528, A114. Socia, Q. J. et al. (2018). *ApJL* 864, L32. Breivik, K. et al. (2020). *ApJ* 898, 71.
- Peters, P. C. (1964). *Phys. Rev.* 136, B1224. Abbott, B. P. et al. (2016). *PRL* 116, 061102; (2017) *PRL* 119, 161101. Berti, E., Cardoso, V. & Will, C. M. (2006). *Phys. Rev. D* 73, 064030. Agazie, G. et al. (2023). *ApJL* 951, L8.
- Spitzer, L. (1987). *Dynamical Evolution of Globular Clusters*. Aarseth, S. J., Hénon, M. & Wielen, R. (1974). *A&A* 37, 183. Makino, J. & Aarseth, S. J. (1992). *PASJ* 44, 141. Röser, S. et al. (2019). *A&A* 621, L2. Meingast, S. & Alves, J. (2019). *A&A* 621, L3. Lamers, H. J. G. L. M. et al. (2005). *A&A* 441, 117.
- Bland-Hawthorn, J. & Gerhard, O. (2016). *ARA&A* 54, 529. Eilers, A.-C. et al. (2019). *ApJ* 871, 120. Lelli, F., McGaugh, S. S. & Schombert, J. M. (2016). *AJ* 152, 157. Freeman, K. C. (1970). *ApJ* 160, 811. Navarro, J. F., Frenk, C. S. & White, S. D. M. (1996). *ApJ* 462, 563. Hernquist, L. (1990). *ApJ* 356, 359. Lin, C. C. & Shu, F. H. (1964). *ApJ* 140, 646. Kalnajs, A. J. (1973). *Proc. ASA* 2, 174. Milgrom, M. (1983). *ApJ* 270, 365. Helmi, A. et al. (2018). *Nature* 563, 85.
- Toomre, A. & Toomre, J. (1972). *ApJ* 178, 623. Holmberg, E. (1941). *ApJ* 94, 385. Chandrasekhar, S. (1943). *ApJ* 97, 255. van der Marel, R. P. et al. (2012). *ApJ* 753, 8; (2019) *ApJ* 872, 24. Salomon, J.-B. et al. (2021). *MNRAS* 507, 2592.
- Schröder, K.-P. & Smith, R. C. (2008). *MNRAS* 386, 155. Villaver, E. & Livio, M. (2009). *ApJL* 705, L81. Mustill, A. J. & Villaver, E. (2012). *ApJ* 761, 121. Anderson, J. D. et al. (1975). *ApJ* 200, 221. Tamayo, D. et al. (2020). *MNRAS* 491, 2885.
- McKagan, S. B., Perkins, K. K. & Wieman, C. E. (2008). *Phys. Rev. ST Phys. Educ. Res.* 4, 020103. Kersting, M. et al. (2018). *Phys. Rev. Phys. Educ. Res.* 14, 010130. Comins, N. F. (2001). *Heavenly Errors*.
