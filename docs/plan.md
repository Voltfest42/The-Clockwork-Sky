# Master plan: "The Clockwork Sky"

*Drafted 22 Oct 2026 (Stage 0). This is the plan for the whole course. Each part gets its own research brief and detailed plan just before it is built: Part I's are in [part1/plan.md](part1/plan.md) and [part1/research.md](part1/research.md). It follows the stack and conventions of Beyond Dijkstra and From Black Box to Rulebook (`D:\Software Projects\Beyond Dijkstra`, `D:\Software Projects\From Black Box to Rulebook`).*

> **The brief, from you:** an educational course in astrophysics that, unlike the first two explainers, starts from the very basics and rises gradually, both in scope (the kinds of objects and phenomena) and in complexity (how they work at the level of physics). Three levels, beginner to advanced. A lab for orbital mechanics and one for stellar evolution, where readers can set the initial conditions and make unusual or extreme stars. Astronomy and astrophysics only: cosmology may become a course of its own later. Built in session-sized stages, with a break after each stage's commit and push.

## Status

**Stage 0 (planning) is done.** This plan, the Part I research brief and plan, and `CLAUDE.md` were written on 22 Oct 2026.

**Stage 1 (Foundations) is done** (22 Oct 2026). The site is live, unlisted, at https://sky.moving-parts.dev, and the code is on GitHub at `Voltfest42/The-Clockwork-Sky`.
- **Scaffold**, copied from Rulebook and renamed: Vite, TypeScript, ESLint, Vitest with fast-check, Playwright with axe, the site shell, the figure frame and step player, the line chart, the design tokens and `infra/`.
- **Course registry** (`src/site/course.ts`): three parts, chapters 1–31 (Part I's with their planned sections and "Builds on" links), eleven Toolkit pages and the two labs. Built on it: a sidebar grouped by part (collapsible, keyboard-operable), part pages, a landing page skeleton, Toolkit and Labs index pages, "coming soon" pages for every chapter, Toolkit page and lab (Part I's chapters list their planned sections), the Glossary (Part I's terms) and an About skeleton.
- **Check yourself** (`src/site/check/`): multiple choice with an explanation for every answer, interactive questions that check a figure's state, a tally, "Clear my answers", answers kept in local storage (and working without it).
- **Figure frame**: reset and "Try this" are now required props; it also takes a legend, the "What's simplified here?" note and the "Not to scale" tag.
- **Core** (`src/core`): units and constants; vectors and rotation matrices; angles (sexagesimal in and out, angular separation); Julian Dates and calendars (Julian and Gregorian, BC years); ΔT and TT ↔ UT; sidereal time; ecliptic, equatorial and horizontal coordinates; mean obliquity.
- **Hosting**: the CDK stack `ClockworkSkySite` (private S3 + CloudFront, a DNS-validated certificate and A/AAAA alias records for sky.moving-parts.dev in the `moving-parts.dev` zone).
- **Tests**: 190 unit and property tests, including Meeus's Examples 7.a–7.g, 10.a, 12.a, 12.b, 13.a, 13.b, 17.a and 22.a, Espenak & Meeus's historical ΔT table, round trips, and contrast checks on the design tokens in both themes; 24 end-to-end tests (every page, the sidebar by keyboard, Check yourself, axe in both themes, a 375-pixel screen and a phone).

**Decisions and deviations in Stage 1**
- Angles cross `src/core`'s boundaries in radians (SI), with `dms()` and `hms()` for reading degrees and hours. Azimuth runs from north through east; Meeus measures it from the south.
- ΔT: Espenak & Meeus (2006) before 2005 and after 2050; measured values for 1 January 2005–2026 (69.11 s at 2026.0, from IERS data); a smooth prediction in between. Their small correction for the Moon's secular acceleration is left out.
- Mean obliquity: Laskar (1986), Meeus 22.3, valid for ±10,000 years. (Stage 3 kept it; see below.)
- The landing page shows a sample Check yourself (when Earth is closest to the Sun; how many Earths fit across the Sun), so the component is live and tested before Chapter 1. Stage 2 can keep, move or replace it.
- Parts II and III have titles and blurbs (from §3) but no sections or "Builds on" links until their planning stages; their Toolkit pages (T5–T11) have placeholder blurbs. Part I's stretch section 3.5 (the analemma) isn't in the registry; add it if its figure gets built.
- Addresses drop apostrophes: `#/the-suns-year`, `#/keplers-laws`.
- End-to-end tests preview on port 4175 and the dev launch config uses 5175, clear of the sibling projects.
- The GitHub repository already existed (empty) when the stage began, so it only needed the push.

**Stage 2 (Chapter 1 and the 3D basics) is done** (22 Oct 2026).
- **Scene3D** (`src/viz/scene3d/`): three.js **0.186.1**, pinned exactly, in a lazy chunk (`engine.ts`, about 190 kB gzipped) that loads only when a 3D view comes near the screen. It has its own z-up orbit camera (pure maths in `orbitCamera.ts`, unit-tested): drag to turn, pinch or wheel to zoom (the wheel only once the view has focus, so the page still scrolls), arrow keys, +/− and Home. It also has an HTML label layer (projected, culled by priority), theme tokens re-read on a light/dark switch, rendering only on change, a pause off screen, reduced motion passed to the scene, a visually hidden text description, ResizeObserver resizing, and a WebGL fallback that shows the description instead.
- **The scale zoom** (`src/viz/scaleZoom/`, `src/core/scale/`): a Canvas 2D log camera from 10⁰ to 10²¹ m over a catalogue of real objects. Positions sit in a tree of frames (person → Earth → Sun → Galaxy) summed only to the shared ancestor, so 1.7 m survives next to 2.5 × 10²⁰ m. The camera glides from the person to the Sun to the Galactic Centre. Labels fade by scale and avoid each other. It has a scale bar in round units, the ×10 counter, slider and Page Up/Down, ÷10/×10 buttons, wheel and pinch, click-to-pick with an "In view" button list for keyboard users, and an info card (metres, km, Earths).
- **Chapter 1** (`src/content/chapter1.mdx`) with Figures 1.1 (the zoom, with a tour and Go to), 1.2 (the scale model: four Suns or your own size, a sizes strip, a distance strip, a table with everyday comparisons) and 1.3 (light's race, in Scene3D: five speeds, a log time slider, ten stops, follow-the-light camera). Its Check yourself has five questions, two of them interactive (Earths across the Sun; zoom until Neptune's orbit fits, using the zoom itself).
- **Toolkit T1 and T2** with their own figures: T1.1, the exponent machine, and T2.1, how big does it look.
- **The landing page**: the Palitzsch/Halley hook, the three parts as zoom levels (a ruler from 10⁻¹⁵ to 10²² m above the part cards), how to use the figures in six items, and where to start.
- **Core**: scientific notation and prefixes; angular size and the small-angle rule; formatted durations; galactic coordinates (the Hipparcos matrix); planets' mean longitudes and semi-major axes (Standish Table 1) and the Moon's mean longitude; scale models.
- **Tests**: 239 unit and property tests (new: the galactic poles, Sirius and Vega; planets' periods against NASA's fact sheets; the brief's grapefruit model and light times; the floating-origin tree; Voyager 1 one light-day from Earth at the milestone; the scale-bar units; the orbit camera; the Voyager tense switch), and 35 end-to-end tests (new: Chapter 1 on a phone with no sideways scroll; the zoom by keyboard, click and wheel; the reduced-motion tour; the scale model; light's race in WebGL reaching Proxima; both Toolkit figures; the embedded zoom question; axe in both themes with every figure in use).

**Decisions and deviations in Stage 2**
- The scale zoom is drawn in Canvas 2D, not three.js: one flat, top-down picture per scale reads better than a 3D camera across 21 decades, and it's lighter. Directions are flattened (Earth from above you, planets from above the ecliptic, stars from above the galactic plane, with things off those planes swung in at their true distance); sizes and distances are true. Light's race is the first Scene3D user.
- Planets in Figures 1.1 and 1.3 sit at their mean longitudes for the date of the page load, at their semi-major axes, on circles. The full Standish elements and Kepler's equation still come in Stage 3; `src/core/ephemeris/meanLongitude.ts` holds only a and L.
- Voyager 1: NASA gives one light-day (173.1 AU) from **Earth** on 18 Nov 2026, 06:16 UTC. Its distance from the **Sun** then, 172.4 AU, was computed from that and Earth's position (a unit test checks the two agree), and it moves out at 3.57 AU a year. The chapter's sentence switches tense at the milestone by itself (`src/site/content/Dated.tsx`); today it reads "will become".
- Values checked before going on screen (the brief's (std) values in §2 all held): c, AU, light-year, parsec, diameters, the Moon's distance and light times; the grapefruit model; Proxima's 1.302 pc and radius (0.154 R☉); GRAVITY's 8.18–8.28 kpc. Extra facts beyond §2, with sources in `src/data/README.md`: the ISS at about 420 km (2026), the Kármán line, Everest, the FIFA pitch, five more stars from §10, the Pleiades and the Orion Nebula, the heliopause crossing at 121.6 AU, and Sgr A*.
- The landing page's sample Check yourself is gone. Its Earths-across-the-Sun slider moved into Chapter 1. The "When is Earth closest to the Sun?" question is saved for Chapter 3.
- Every figure's content now sits inside its own error boundary (in `Figure`).
- Six glossary terms added: arcminute/arcsecond, heliopause, Oort cloud, order of magnitude, radian, scientific notation.
- Toolkit figures are numbered T1.1, T2.1.
- The Milky Way in the zoom is a seeded sketch (bar, four 12° arms, the Orion Spur), and labelled as such.

**Stage 3 (Chapter 2 and the sky view) is done** (23 Oct 2026).
- **Data** (`scripts/`, `src/data/`): `build-stars.ts` cuts HYG to the 8,920 stars of magnitude ≤ 6.5, brightest first (`src/data/hyg/stars.json`, 176 kB gzipped, CC BY-SA 4.0, in its own folder with its own README). `build-constellations.ts` turns d3-celestial into stick figures whose 893 vertices are all matched to catalogue stars (so the figures move with proper motion), names, IAU boundaries (13 kB gzipped) and a Milky Way map (3 kB). `fetch-horizons.ts` writes 378 Horizons (DE441) rows to `tests/fixtures/horizons.json`: nine bodies at 42 dates from 3000 BC to AD 3000. The data loads in its own chunks only when a sky figure nears the screen.
- **Core**: Kepler's equation (elliptic and hyperbolic, bracketed Newton); Standish's Tables 1, 2a and 2b; the Sun (Meeus ch. 25) and the Moon (ch. 47, all 120 terms); geocentric positions with light-time and Earth's offset from the Earth–Moon barycentre; planets' magnitudes and phases; Vondrák long-term precession (ecliptic and equator poles, the precession matrix, an ecliptic-of-date matrix); stars' straight-line space motion (proper motion, parallax and radial velocity, so magnitudes change with distance); B−V → temperature → sRGB through a Planck spectrum; star dot sizes; refraction (Bennett and Sæmundsson); the sky's frames and stereographic projection (with the horizon as an analytic circle); daily paths, twilight and limiting magnitude; Moon phase names; clock times through the IANA zone database (with local mean time before standard time).
- **The sky view** (`src/viz/sky/`): Canvas 2D, about 1.3 ms of script per frame. Stars by brightness and colour, constellation figures, names and boundaries, the Milky Way, alt-az and equatorial grids, the equator and the ecliptic, the Sun, the Moon (lit side and phase, with topocentric parallax) and planets, refraction, the ground and compass points, daylight and twilight, labels that avoid each other, overlays (trails, paths, markers, text). Drag, pinch, wheel after a click, keyboard (arrows, +/−, Home), zoom buttons, click to pick, "In view" buttons and a live text description. It also draws charts fixed to the stars.
- **Controls**: the time control (date with BC years and the Julian calendar before 1582, clock time with the zone always named, Now, play, seven speeds, steps of an hour, a star day, a Sun day, a month, a year); the place picker (12 places in both hemispheres, latitude and longitude, "Use my location"), shared by every sky figure and remembered in the browser.
- **Chapter 2** with Figures 2.1 (the sky tonight: place, time, layers, Look, Find, an info card), 2.2 (star trails over a 12-hour exposure, facing N, E, S or W), 2.3 (inside and outside: the sky view beside a Scene3D celestial sphere with the horizon, the axis, the caps that never set or rise, daily circles and a tilted Earth; a latitude slider), 2.4 (one spin, two days: an SVG of Earth spinning as it orbits, with 12-day, 30-day and real years) and 2.5 (the wandering pole: the pole's path from 10,000 BC to AD 16,000 on a chart fixed to the ecliptic, presets, the pole star of any year, and the view from your place in that year). Check yourself has six questions, one interactive (put Polaris on the horizon). Four new glossary terms: constellation, horizon, magnitude, proper motion. The About page lists the new sources, the figures' simplifications and the data credits.
- **Tests**: 321 unit and property tests (new: Kepler's equation to 1e-12; Meeus 25.a and 47.a; every Horizons row within its error budget; ERFA's eraLtpecl, eraLtpequ and eraLtp values; Meeus 21.b; the pole stars; the catalogue; space motion; colours; refraction; the projection and the analytic horizon; the frames against Stage 1's transforms; daily paths; time zones including BC dates and daylight saving; the sky model, Moon parallax and the Milky Way map), and 47 end-to-end tests (new: Chapter 2 on a phone; the sky view by date, place, Find, info card and keyboard; the place picker remembered across a reload; star trails, also with reduced motion; the 3D sphere in WebGL with the latitude slider; the two days; the pole stars; the interactive question; axe in both themes with every figure in use).

**Decisions and deviations in Stage 3**
- **HYG v4.4**, not v4.2: it is the current release (July 2026), with the same licence.
- **Standish's Uranus and Neptune are barycentric.** Against DE441 their elements fit positions about the Solar System's barycentre to ~10″ but heliocentric ones only to ~1′. `planets.ts` subtracts the Sun's offset from the barycentre (from the four giants' masses), which brings Neptune from 57″ to 11″. The inner planets and the Earth–Moon barycentre are heliocentric as they stand.
- **Measured accuracies** (max errors against Horizons, 1800–2050 / 3000 BC–AD 3000): Sun 26″ / 95″; Moon 27″ / 0.11° (Meeus's series and DE441 differ in the tidal secular terms far from the present); Mercury 18″, Venus 42″, Mars 96″, Jupiter 369″, Saturn 797″, Uranus 112″, Neptune 11″ (geocentric, so amplified near opposition; all within JPL's budget × 1.5). Tests use these limits, not the brief's 10″ for the Moon.
- **Facts checked against the model and data** (brief §3): Polaris is the 48th-brightest star; it is 0.63° from the pole now and comes closest, 0.46°, around 2100; Thuban came within 0.10° around 2800 BC (1.34° in 2560 BC); **Vega comes only to about 5.7°, around AD 13,600**, not "within about 5° around 14,000"; in 130 BC Polaris was 12.5° off; Sigma Octantis (mag 5.45) is 1.15° from the south pole; precession runs at 50.29″ a year, 25,772 years a turn; Arcturus moves 16° across Figure 2.5's span.
- **The Milky Way is a map, not polygons.** Filling d3-celestial's outlines under a stereographic projection breaks wherever an outline passes behind the viewer, so the build script decides inside/outside on a 1° RA/Dec grid (by counting edge crossings towards the north galactic pole), smooths the five levels with a 2° Gaussian, and the sky view looks it up per pixel of a 1/6-resolution canvas.
- **The time control is per figure; the place is shared.** The plan had one clock per page, but each figure needs its own (2.2 runs one night, 2.5 runs millennia). Times are shown in the place's own time zone, with daylight saving and pre-standard local mean time from the browser's IANA data; typed coordinates use the longitude's hour band.
- **The "outside view"** is a Scene3D scene of its own for Figure 2.3, not a mode of the sky view. The sky view's chart mode (fixed to the J2000 ecliptic) drives Figure 2.5, which also gained a "from your place" mode.
- **Figure 2.2 switches daylight off**, so trails can run 12 hours anywhere (said in its note).
- The sky draws refraction by Sæmundsson's formula (true → apparent); Bennett's is used to test it. The Moon (and every body) is drawn topocentric. Planets get light-time; nothing gets aberration or nutation.
- The Laskar mean obliquity stays; Vondrák's obliquity agrees with it to 2″ over AD 0–4000, and the sky frames use Vondrák's poles directly.
- Scene3D's label layer now hides a label unless it fits wholly inside the view.
- The Stage 1 mean-longitude module stays for Chapter 1's figures; the full elements are in `planets.ts`.

**Next: Stage 4, Chapters 3 and 4** (see [part1/plan.md](part1/plan.md) §10).

## Decisions so far

| Topic | Decision |
|---|---|
| Name | **The Clockwork Sky**. The front page already uses this name. |
| What it is | A self-guided **course** with three parts of rising scope and depth, plus two labs. It starts from scratch, unlike the first two explainers, which start in the deep end. |
| Audience | Curious adults and older teenagers with no background (Part I), rising to first-year university physics (Part III). They explore on their own, in their own time. *(My default.)* |
| Scope | Astronomy and astrophysics up to the Milky Way, plus an optional closing chapter on colliding galaxies. **No cosmology** (the expanding universe, the Big Bang, the cosmic microwave background, dark energy, large-scale structure): that is saved for a possible later course. *(Your call on cosmology; the closing chapter is my default.)* |
| Structure | **Part I · The Clockwork** (beginner), **Part II · The Stars** (moderate), **Part III · The Engine Room** (advanced): 31 chapters, numbered straight through. Part names are working titles. |
| Maths | Part I needs only arithmetic. Part II uses algebra in short boxes. Part III uses real equations and calculus, supported by a **Toolkit** appendix. The figures carry the intuition, so readers who skip the maths can still follow. *(My default.)* |
| Self-checks | A short **Check yourself** at the end of every chapter. *(My default.)* |
| Labs | **The Orrery** (orbital mechanics; version 1 after Part I) and **The Star Forge** (stellar evolution; version 1 after Part II). Both are upgraded in Part III. Working names. |
| Tone | As before: intuition and pictures first, game-dev analogies where they fit, formulas only when they earn their place. A new running question: *how do we know?* |
| Stack | The stack of the first two explainers (TypeScript, React, Vite, MDX), plus **three.js** for 3D scenes, loaded only by the figures that use it. |
| Physics | **Everything runs in the reader's browser**, written from scratch in TypeScript: positions of the Sun, Moon and planets, orbit integrators, stellar evolution (from published formulas), structure solvers. No server. |
| Hosting | A new S3 + CloudFront stack (`ClockworkSkySite`, `default` profile, `us-east-1`) on **sky.moving-parts.dev**, deployed after every stage. *(My default.)* |
| Git | One commit per stage, pushed to `git@github.com:Voltfest42/The-Clockwork-Sky.git`. The repository is created in Stage 1, with your OK. *(My default.)* |
| Planning | This master plan now. Each part's research and detailed plan get a planning stage of their own, just before that part is built. |
| Look | The design tokens and visual language of the other explainers and the front page: light and dark, colour-blind-safe. Sky views stay night-dark in both themes. |
| Spelling | British, as in the other explainers. |

---

## 1. What we're building

A self-guided **interactive course in three parts**, hosted on the web as part of Moving Parts. Readers move from the sky they can see with their own eyes, to the stars as physical objects, to the physics inside stars and the extreme objects stars leave behind. Every chapter is built around live figures that run real physics, and two labs let readers set up their own planetary systems and their own stars.

**The course in one breath:**

> *For thousands of years the sky has run like clockwork: the stars wheel overhead, the Moon and planets keep their schedules, and on Christmas night 1758 a comet came back when gravity said it would. Part I takes that clockwork apart. But the points of light on the dome are suns. They are born from collapsing gas, shine by fusion, and die as white dwarfs, neutron stars or black holes. Part II shows how we learned all that from starlight alone. Part III opens the machinery inside, down to the physics that decides each star's fate.*

**The thread that ties it together: gravity, and whatever holds out against it.**
- **Part I: motion.** An orbit is a fall that keeps missing. Sideways speed holds gravity off for ever.
- **Part II: heat.** A star is a ball of gas whose pressure holds gravity off, but only for as long as its fuel lasts.
- **Part III: the limits.** When the fuel runs out, stranger forces take over. Quantum (degeneracy) pressure holds up white dwarfs and neutron stars, up to a limit. Beyond that limit nothing can, and the result is a black hole.

**A second thread: how do we know?** Every chapter shows the observation or measurement behind its claims. Part I needs only angles and clocks (and, later, a telescope). Part II reads everything from starlight. Part III builds physical models and checks them against both.

**Principles** *(the first five are inherited from Beyond Dijkstra and Rulebook)*
- **Self-explanatory.** Every figure has a caption, a legend, a "Try this" prompt and a reset. Technical depth lives in optional "Deep dive" boxes.
- **Intuition first, then numbers, then equations.**
- **Real physics, not canned animations.** Figures compute from real models and real data: ephemerides, star catalogues, orbit integrators, stellar models. Where a figure exaggerates (parallax angles, planet sizes in an orbit diagram) or simplifies, it says so in a "What's simplified here?" note.
- **Honest.** Open questions stay open. Facts that change, such as moon counts and exoplanet counts, carry an "as of" date.
- **Robust for strangers.** It loads fast, needs no server and can't be broken by unusual input. Every figure has a reset. It works on phones, though the labs are designed for desktop first.
- **Gradual.** Each chapter builds only on earlier chapters and on the Toolkit, and says which at the top ("Builds on: Chapters 2 and 3").
- **Misconceptions head-on.** Education research shows which wrong ideas beginners bring, such as seasons caused by distance and Moon phases caused by Earth's shadow ([part1/research.md](part1/research.md) §1). The figures for those topics are designed to confront them, often by asking for a prediction before showing the answer.
- **Accessible.** WCAG 2.1 AA in both themes, full keyboard control, reduced motion respected, and colour never the only cue. Every 3D scene has a text description and keyboard camera controls.

**Out of scope:** cosmology (see above), observing guides and equipment advice, astrology (the zodiac appears only as the Sun's path), spaceflight beyond orbits and transfers, accounts, a backend, uploads and live data feeds.

---

## 2. Course structure

```
Landing       the hook (Halley's comet, 1758), the three parts as a map, how to use the figures, where to start
├─ Part I     The Clockwork     Chapters 1–9     → The Orrery
├─ Part II    The Stars         Chapters 10–19   → The Star Forge
├─ Part III   The Engine Room   Chapters 20–31   → both labs upgraded
├─ Labs       The Orrery · The Star Forge
├─ Toolkit    short refreshers on the maths and physics
├─ Glossary   every term, also shown as tooltips in the text
└─ About      what's simplified, data and credits, sources, how it's tested
```

**Why three parts, and why this order.** Scope and depth rise together. Part I stays in the Solar System and needs no equations. Part II reaches the stars and uses algebra-level physics. Part III goes inside stars and out to the Milky Way with the real equations. Some topics come round twice on purpose. White dwarfs, for example, appear in Part II as *what we observe* and in Part III as *why they can exist*. Each part ends with a lab that puts what it taught into the reader's hands.

**Pages**
- **Landing:** the hook, the three parts as zoom levels, a 30-second "how to use the figures", and where to start (Part I if you're new; Part II if you know the Solar System; Part III if you know some physics).
- **Part pages:** the level, the maths needed, what you'll be able to explain afterwards, the chapter list with progress, and a time estimate.
- **Chapter pages:** a "Builds on" line, sections with figures, a **Check yourself** block at the end, and "Next chapter →".
- **Toolkit pages:** one idea each, with a small interactive figure, linked from wherever a chapter first needs it:
  - Part I: *Powers of ten · Angles in the sky · Ratios and scaling · Solving by stepping*
  - Part II: *Logarithms and magnitudes · Measurements and uncertainty*
  - Part III: *Vectors · Rates of change · Adding up small pieces · Differential equations · Estimating with orders of magnitude*

**Navigation and routing.** These work as in the other explainers: a sidebar (now grouped by part, collapsible), hash URLs such as `/#/the-turning-sky/where-you-stand-changes-the-sky`, chapters loaded on demand, reading progress remembered in the browser, and error boundaries around every figure. Part pages are `/#/part-1` and so on, the labs `/#/orrery` and `/#/star-forge`, and Toolkit pages `/#/toolkit/<slug>`. Chapters are numbered 1–31 straight through, so "see Chapter 14" is unambiguous. Sections and figures are numbered by chapter (Figure 7.3). Nothing is locked: readers can jump anywhere.

**Check yourself.** Three to five questions per chapter:
- Multiple choice, where the wrong answers are the common misconceptions, each with its own explanation.
- Interactive questions that reuse the chapter's figures ("put the Moon where it would be at first quarter").

Answers stay in the browser, and no scores are sent anywhere.

---

## 3. The course map

Part I is planned in detail in [part1/plan.md](part1/plan.md). Parts II and III are outlined here and will be refined, and probably trimmed, in their planning stages. ★ marks the candidate key figures.

### Part I · The Clockwork (beginner): the sky and the Solar System

*Maths: arithmetic, ratios, powers of ten.*

| Ch | Title | What it covers |
|---|---|---|
| 1 | A sense of scale | Powers of ten from a person to the Milky Way; scale models; light as a measuring stick |
| 2 | The turning sky | The celestial sphere, daily motion, latitude, star time and Sun time, precession |
| 3 | The Sun's year | The ecliptic and zodiac, why we have seasons (tilt, not distance), solstices, calendars |
| 4 | The Moon | Phases, two kinds of month, tidal locking, eclipses and eclipse seasons, the Saros |
| 5 | Wanderers | Planets, retrograde loops, Ptolemy, Copernicus, Galileo, Tycho |
| 6 | Kepler's laws | Ellipses, equal areas, the harmonic law, Kepler's equation |
| 7 | Newton's gravity | The falling Moon, orbits computed step by step, weighing the Sun, barycentres, tides |
| 8 | A tour of the Solar System | Rocky worlds, giants and their moons, small bodies and resonances, how it formed |
| 9 | The stars are suns | Parallax, our stellar neighbours, the Sun seen from afar, our place in the Milky Way |
| Lab | **The Orrery** | Version 1: any planetary system, presets from the Solar System to three-body chaos |

### Part II · The Stars (moderate): stars as physical objects

*Maths: algebra and a handful of named laws.*

| Ch | Title | What it covers | Candidate key figures |
|---|---|---|---|
| 10 | Light, the messenger | Waves and photons, the electromagnetic spectrum, why some light never reaches the ground, how telescopes collect and resolve light, what each kind of light reveals | Telescope resolution (two stars merge or split as the aperture changes); the spectrum ruler |
| 11 | Colour is temperature | Thermal radiation: hotter is bluer (Wien) and far brighter (Stefan–Boltzmann); luminosity against apparent brightness; the inverse-square law | ★ Blackbody explorer; ★ the inverse-square law |
| 12 | Barcodes in starlight | Atoms and energy levels, absorption and emission lines, spectral classes set by temperature, Cecilia Payne's 1925 discovery that stars are mostly hydrogen, Doppler shifts | ★ Make a spectrum (temperature and composition in, lines out); Doppler shifter |
| 13 | Sorting the stars | Magnitudes (a logarithmic scale), absolute magnitude, the Hertzsprung–Russell diagram: main sequence, giants, white dwarfs | ★ The HR diagram of real stars (Gaia, within ~100 pc); find famous stars on it |
| 14 | Weighing the stars | Visual, spectroscopic and eclipsing binaries give masses and radii; the mass–luminosity relation | ★ Binary workbench: orbit, velocity curve and light curve together; fit the masses |
| 15 | The Sun up close | Layers, granulation, sunspots and the 11-year cycle, flares and space weather, solar neutrinos, fusion in outline (mass becomes energy) | Sun cutaway; ★ the sunspot cycle (real data) |
| 16 | Born in the dark | Gas and dust between the stars, molecular clouds, collapse, protostars, disks and jets, brown dwarfs; many small stars and few big ones | Collapse or not (mass, size, temperature of a cloud); a new cluster's star masses |
| 17 | A star's life | Lifetimes (massive stars burn out fast), when the hydrogen runs out, red giants, star clusters as snapshots, ages from the turn-off, pulsating stars | ★ The Sun's life on the HR diagram; ★ age a cluster (models against real Gaia clusters) |
| 18 | How stars die | Planetary nebulae and white dwarfs; supernovae; neutron stars and pulsars; black holes and how we know they exist; the mass thresholds; elements returned to space | ★ The fork in the road (mass in, fate out) |
| 19 | Other worlds | Exoplanets: wobbles, transits and other methods; what we've found; habitable zones; reading atmospheres | ★ Find the planet (one orbit, seen as a transit and as a wobble); the exoplanet census (real data) |
| Lab | **The Star Forge** | Version 1: any single star, from brown dwarfs to the most massive stars (§4) | |

*Engines and data:* thermal spectra and star colour, simplified line formation, Doppler shifts, binary light and velocity curves (reusing the Kepler code), the **SSE stellar-evolution engine** with isochrones, transit light curves, Gaia samples and cluster members, the NASA Exoplanet Archive, sunspot numbers.

### Part III · The Engine Room (advanced): inside the stars, and the extremes

*Maths: calculus, differential equations solved by stepping, a little quantum mechanics and relativity.*

| Ch | Title | What it covers | Candidate key figures |
|---|---|---|---|
| 20 | Holding a star up | Hydrostatic equilibrium; the virial theorem (a star heats up as it shrinks); the Kelvin–Helmholtz timescale and the 19th-century age-of-the-Sun puzzle; Jeans collapse; polytropes | ★ Lane–Emden solver: build a polytrope and compare it with the Sun's real profile |
| 21 | Getting the energy out | Radiative diffusion (a photon's random walk), opacity, convection and when it starts, the four structure equations | ★ A star built from the equations: mass and composition in, structure and luminosity out, and the mass–luminosity relation emerges |
| 22 | The nuclear furnace | Why fusion needs quantum tunnelling, the Gamow peak, the pp chains and the CNO cycle, triple-alpha and Hoyle's resonance, the late burning stages, neutrino cooling | ★ The Gamow peak; the last days of a massive star |
| 23 | Where the elements come from | Binding energy and the iron peak; slow and rapid neutron capture (giant stars, neutron-star mergers); the origin of every element | ★ Neutron captures step by step on the chart of nuclides (s-process against r-process) |
| 24 | Matter at its limit | Degeneracy pressure, white dwarfs (heavier ones are smaller), the Chandrasekhar mass, cooling and crystallizing white dwarfs | ★ Build a white dwarf: its radius shrinks to nothing at the limit |
| 25 | Stellar explosions | Core collapse and the neutrinos of SN 1987A, supernova types, thermonuclear supernovae, light curves powered by radioactive nickel, pair-instability supernovae | ★ A supernova's light curve from radioactive decay |
| 26 | Neutron stars | Structure and maximum mass, pulsars as clocks, spin-down, magnetars | ★ The P–Ṗ diagram of real pulsars; the pulsar lighthouse |
| 27 | Black holes | Horizons; orbits and light near a black hole; accretion disks and their efficiency; jets; X-ray binaries; imaging the shadow | ★ Orbits near a black hole, computed with general relativity; *(stretch)* a ray-traced black hole |
| 28 | Two stars are stranger than one | The Roche potential, mass transfer and what it does to the orbit, the Algol paradox, common envelopes, the binary zoo (novae, X-ray binaries, blue stragglers, Type Ia progenitors) | ★ Roche potential explorer; ★ the Algol paradox, step by step |
| 29 | Ripples in spacetime | Gravitational waves: the Hulse–Taylor pulsar, LIGO's detections, chirps and chirp mass, neutron-star mergers and kilonovae, the black-hole mass gap | ★ Make a chirp, and hear it |
| 30 | Crowds of stars | Star clusters and how they evolve and evaporate, the Milky Way's structure, the rotation curve and the evidence for dark matter, spiral arms, Sagittarius A\* weighed by the stars that orbit it | ★ A cluster evaporates (n-body); ★ the rotation curve; S2's orbit |
| 31 | *(optional)* Colliding galaxies | Toomre's tidal tails and bridges, galaxy mergers, active nuclei, and the door to cosmology | ★ Galaxy collision with 100,000 stars |
| Labs | **Version 2 of both** | Binary stars in the Star Forge; star clusters, galaxy collisions and the Sun's death in the Orrery (§4) | |

*Engines and data:* adaptive differential-equation solvers, the Lane–Emden and main-sequence structure solvers, reaction rates, a toy neutron-capture network, white-dwarf and neutron-star (TOV) structure, a supernova light-curve model, orbits in Schwarzschild spacetime, the **BSE binary-evolution engine**, the gravitational-wave chirp with Web Audio, many-body and restricted n-body simulation, a rotation-curve model, and the ATNF pulsar and LIGO–Virgo–KAGRA catalogues.

---

## 4. The labs

Both labs are feasible, for opposite reasons. Orbits are cheap to simulate for real. Stars are not, but astronomers have already boiled stellar evolution down to fast, well-tested formulas, and the lab uses those.

### The Orrery (orbital mechanics)

**Measured cost.** In Stage 0, plain JavaScript on one core of the development machine (Node 24, the V8 engine that Chrome and Edge use) did about 340 million gravitational pair interactions per second:

| System | Bodies | Speed |
|---|---|---|
| Solar System, three-body puzzles | 10 | ~5 million steps/s |
| Star cluster, every star pulling on every other | 1,000 / 2,000 / 4,000 | ~690 / ~170 / ~40 steps/s |
| Galaxy collision, Toomre-style (two galaxy cores plus stars that feel gravity but don't exert it) | 100,000 | ~850 steps/s |

Phones are several times slower. The systems worth teaching with are cheap. The hard parts are **accuracy** (naive integrators leak energy and planets drift off), **timescales** (Mercury's 88 days and Neptune's 165 years in one simulation) and the **interface** (a beginner's system should do something interesting, not fly apart).

**Version 1 (end of Part I, Stage 8)**
- **Build or pick a system.** Presets: the Solar System today (from JPL Horizons), the Earth and Moon, Jupiter's Galilean moons in resonance, the Sun and Jupiter with Trojan asteroids, the figure-eight three-body orbit, the Pythagorean three-body problem, a planet orbiting a binary star (Kepler-16), TRAPPIST-1's resonant chain, a comet passing Jupiter, and "what if Jupiter were 100 times heavier?". Readers add bodies by setting each orbit's size, shape and tilt, or by dragging a velocity arrow. A "make it circular" button helps, and masses come from presets or are typed in.
- **Watch.** Top-down or 3D views, following any body, with trails. A rotating frame makes the Lagrange points and horseshoe orbits visible. Time warp runs from real time to thousands of years per second for small systems.
- **Read.** Live orbital elements and periods, the energy and angular-momentum error (so readers see integration error for themselves), and notices for close encounters, collisions (bodies merge) and escapes.
- **Engine.** TypeScript in a Web Worker, with state in typed arrays; the main thread only draws. The integrators are chosen automatically, with a manual override:
  - exact two-body (Kepler) motion;
  - a Wisdom–Holman symplectic map in the style of WHFast, for planetary systems;
  - an adaptive 15th-order integrator in the style of IAS15, for close encounters and chaos;
  - leapfrog, for teaching (Chapter 7) and for clusters.

**Version 2 (Part III)**
- Star clusters with every star attracting every other (up to ~2,000 stars, softened).
- Galaxy collisions in Toomre's restricted style (~100,000 stars, drawn with WebGL).
- An optional general-relativity correction (Mercury's extra 43″ per century).
- The coupling showcase (below).
- *(Stretch)* Self-gravitating galaxies on the GPU with WebGPU, which ships in current browsers but not yet on every device.

### The Star Forge (stellar evolution)

**Why not simulate a star from scratch?** Research codes such as MESA solve the structure equations on thousands of layers with gigabytes of physics tables. They take minutes to hours per star, and they need expert hand-holding in exactly the extreme cases this lab should make easy. That can't run in a browser.

**What astronomers use when they need millions of stars, and what we'll use:**
- **SSE** (Hurley, Pols & Tout 2000): analytic formulas fitted to detailed stellar models, for 0.1–100 M☉ and metallicity Z = 0.0001–0.03, including mass loss and the remnant left behind. A whole life takes about a millisecond, so the lab responds instantly.
- **BSE** (Hurley, Tout & Pols 2002) extends it to binaries: Roche-lobe overflow, common envelopes, tides, magnetic braking, gravitational-wave inspiral and supernova kicks.

Both are still at the core of the population codes used today to predict gravitational-wave sources. We implement them in TypeScript from the papers. The authors' original Fortran code is run once, offline, only to produce reference tracks for the tests.

**Version 1 (end of Part II)**
- **Inputs.** Mass, metallicity and the strength of stellar winds. The whole life is computed at once, and the reader scrubs through it.
- **What the reader sees:**
  - the track on the HR diagram;
  - the star drawn to scale and in its true colour, beside the Sun and the planets' orbits;
  - luminosity, radius, temperature and core mass against time;
  - the phases of its life on a timeline;
  - its fate: a white dwarf (helium, carbon–oxygen or oxygen–neon), a neutron star, a black hole, or nothing at all.
- **Comparisons.** Up to four stars side by side, and isochrones for star clusters.
- **Extreme stars.** A calibration map shows where the formulas are tested, extrapolated, or out of their depth, and that boundary teaches something in itself. Three additions cover physics SSE doesn't reach:
  - brown dwarfs below the hydrogen-burning limit (about 0.08 M☉), with a simple cooling model;
  - stars of 100–300 M☉, extrapolated, with modern pair-instability outcomes (no remnant at all for helium cores of roughly 65–130 M☉);
  - ultra-metal-poor stars, flagged.
- **To decide in Part II planning:** an optional "detailed models" mode that interpolates MESA-based MIST tracks (0.1–300 M☉), for comparison with the formulas. Its licence and data size still need checking.

**Version 2 (Part III).** Binaries:
- **Inputs.** Companion mass, orbital period and eccentricity.
- **What the reader sees:** the Roche lobes; episodes of mass transfer, common envelopes, mergers and supernova kicks; and the outcome, classified (cataclysmic variable, X-ray binary, double white dwarf, Type Ia supernova, double neutron star with its merger time, and so on).
- *(Stretch)* A population mode that runs thousands of binaries in a worker and shows the outcomes as histograms.

### Coupling the two labs

BSE already couples stellar evolution to an orbit, in averaged form. Coupling the Star Forge to the full n-body Orrery is the expensive version, so it is done once, as a showcase: **the fate of the Solar System.** The Sun follows its 1 M☉ track and loses about half its mass, so the planets' orbits widen as the red giant swells. Whether Earth escapes is still a genuine research question, and the figure shows why it's close.

### Solvers that are figures, not labs

Part III's live solvers (Lane–Emden, the main-sequence structure solver, white dwarfs, neutron stars, black-hole orbits) are figures in their chapters. They show where the Star Forge's formulas come from.

---

## 5. Shared building blocks

Built once and reused across the course.

| Component | What it does | From / first built |
|---|---|---|
| Site shell | Sidebar grouped by part, routing, reading progress, lazy chapters, error boundaries | Rulebook, extended for parts (Stage 1) |
| Figure frame | Caption, legend, "Try this", reset, "What's simplified here?" | Rulebook |
| Step player | Play/pause, step forward and back, scrubber, speed, keyboard | Rulebook |
| Glossary tooltips, callouts, deep dives | — | Rulebook |
| Charts | Line, area, scatter and histogram, now with log axes | Rulebook, extended (Part I) |
| Timeline | Dated events on tracks | Rulebook (Part I history, Part III) |
| Check yourself | Misconception-based multiple choice with explanations; interactive questions that reuse figures | New (Stage 1) |
| Part and Toolkit pages | — | New (Stage 1) |
| Scene3D | three.js wrapper: camera controls for mouse, touch and keyboard; labels; themes; pausing off-screen; reduced motion; a text description | New (Stage 2) |
| Scale zoom | A continuous powers-of-ten zoom with objects to scale | New (Stage 2) |
| Sky view | Planetarium: real stars, constellations, the Sun, Moon and planets, the Milky Way, grids, horizon, daylight; seen from inside and from outside | New (Stage 3) |
| Time control, place picker | Any date and time (BC included), speed, stepping by day, month or year; a city list, latitude and longitude, optional "use my location" | New (Stage 3) |
| Orbit view | 2D and 3D orbits with ellipse geometry (foci, swept areas, apsides), trails, rotating frame | New (Stage 5) |
| n-body worker | The simulation engine off the main thread, with energy diagnostics | New (Stage 6) |
| Planet globe | A textured, lit sphere with axial tilt and rotation | New (Stage 7) |
| Spectrum view | Spectra, thermal curves, filters, lines | Part II |
| HR diagram | Real stars, tracks and isochrones | Part II |
| Star cutaway | A star's layers, burning zones and convection, to scale | Part II |
| Light-curve view | Brightness against time (binaries, transits, supernovae) | Part II |
| Profile plot | Quantities against radius or mass inside a star | Part III |
| Particle view | WebGL points for up to ~100,000 stars | Part III |
| Potential view | Roche and other potentials as contours and 3D surfaces | Part III |

**Visual language.** These rules hold everywhere. The palette is colour-blind-safe, and colour is never the only cue.
- Sky views are always night-dark, whatever the page theme, with stars in their true colours (from temperature).
- Each planet keeps one colour and marker shape across all figures. The Sun is always the same pale-yellow disc.
- Orbits are thin lines; the reader's own position ("you are here") has one consistent marker.
- Any exaggeration of size or angle carries a small "not to scale" tag.

---

## 6. Tech stack

| Piece | Choice |
|---|---|
| Language, build, UI | TypeScript (strict), Vite, React, MDX for chapter text |
| Routing | Hash router |
| 2D graphics | SVG for diagrams; Canvas 2D for the sky view and charts with many points |
| 3D graphics | three.js (WebGL), loaded only by the figures that need it |
| Many particles | WebGL points (Part III); WebGPU only as an optional stretch path |
| Heavy work | Web Workers (n-body, binary populations, long solves) |
| Sound | Web Audio (Part III's gravitational-wave chirp) |
| Tests | Vitest and fast-check (property tests against references), Playwright and axe (every page and figure, keyboard use, WCAG 2.1 AA in both themes, a phone-sized viewport) |
| Infrastructure | AWS CDK in TypeScript: a private S3 bucket behind CloudFront, copied from the other explainers |

---

## 7. Architecture

As in the first two explainers, **the physics knows nothing about the UI.** Engines live in `src/core`, report their steps through an optional `emit` callback where a figure steps through them, and use seeded randomness.

```
src/
  core/                      pure TypeScript, no UI, fully unit-tested
    units.ts  constants.ts  random.ts  trace.ts
    math/      vec3.ts  angles.ts  roots.ts  interp.ts  ode.ts
    time/      julian.ts  calendar.ts  deltaT.ts  sidereal.ts
    coords/    transforms.ts  precession.ts  refraction.ts
    ephem/     sun.ts  moon.ts  planets.ts  kepler.ts  elements.ts  phases.ts  eclipses.ts
    sky/       stars.ts  constellations.ts  magnitudes.ts  colour.ts
    nbody/     system.ts  integrators/ (leapfrog, rk4, whfast, ias15)  diagnostics.ts  presets.ts
    light/     blackbody.ts  spectra.ts                    (Part II)
    stellar/   sse/  bse/  isochrones.ts                    (Parts II–III)
    structure/ laneEmden.ts  zams.ts  whiteDwarf.ts  tov.ts (Part III)
    gr/        schwarzschild.ts  chirp.ts                   (Part III)
  viz/         figure frame, player, charts, Scene3D, SkyView, OrbitView, ScaleZoom, ...
  figures/     the chapters' figures, one folder per chapter
  labs/        orrery/  starForge/
  workers/     nbody.worker.ts  population.worker.ts
  site/        shell, routing, course registry, progress, glossary, pages
  content/     chapter and Toolkit MDX, timeline
  data/        compact derived data files, each with its licence noted
scripts/       data builders: stars, constellations, asteroids, Horizons fixtures, SSE fixtures
tests/  e2e/  infra/  docs/
```

**Conventions**
- **Units:** SI at module boundaries. Engines may use natural units inside (the n-body engine works in AU, days and solar masses; stellar models in solar units) and convert at their edges. Every exported function documents its units.
- **Time:** Julian Date (in Terrestrial Time) internally. JavaScript's `Date` is used only for "now" and for display. Historical dates go through our own calendar code, with astronomical year numbering (1 BC is year 0).
- **Data:** built by scripts from raw downloads. Raw files are not committed; the compact derived files are, each with its source and licence noted.
- **Figures:** lazy-loaded per chapter; heavy figures pause when off-screen.
- **The course registry** (`site/course.ts`) replaces the earlier `chapters.ts`. It lists parts, chapters, sections, Toolkit pages and "Builds on" links, so the sidebar, part pages and progress all come from one place.

---

## 8. Data and licences

Each part's research brief records the details. The About page lists every credit, and share-alike files are kept separate and marked.

| Data | Used for | Licence or terms | Part |
|---|---|---|---|
| HYG star database v4.2 (D. Nash, astronexus.com) | Sky view stars, nearby stars | CC BY-SA 4.0; our derived star file is shared under the same licence | I |
| d3-celestial (O. Frohn): constellation lines, IAU boundaries, Milky Way outline | Sky view | BSD 3-Clause | I |
| JPL "Approximate Positions of the Planets" (E. M. Standish) | Planet positions, 3000 BC–AD 3000 | NASA/JPL, public | I |
| JPL Horizons | Test fixtures, the Orrery's Solar System preset | NASA/JPL public service | I |
| NASA eclipse predictions (F. Espenak) | Eclipse lists, tests | Free to reproduce with the credit "Eclipse Predictions by Fred Espenak, NASA/GSFC" | I |
| NASA Planetary Fact Sheets | Planet cards | Public domain | I |
| JPL Small-Body Database | Asteroid-belt histogram | NASA/JPL, public | I |
| Solar System Scope textures | Planet globes | CC BY 4.0 (to confirm on their site in Stage 7) | I |
| Gaia DR3 (ESA) | HR diagram, clusters | CC BY-SA 3.0 IGO | II |
| NASA Exoplanet Archive | The exoplanet census | Public, with credit | II |
| SILSO sunspot number | The solar cycle | CC BY-NC 4.0 (to check against how the site is used) | II |
| MIST stellar tracks | Optional detailed-model mode | To check | II |
| SSE/BSE (Hurley et al.) | Stellar evolution | Implemented from the papers; the original code only makes test fixtures | II–III |
| ATNF pulsar catalogue | The P–Ṗ diagram | To check | III |
| GWTC (LIGO–Virgo–KAGRA, via GWOSC) | The merger population | To check (believed CC BY 4.0) | III |

---

## 9. Hosting

Exactly like the other explainers: a private, encrypted S3 bucket readable only by CloudFront through Origin Access Control, HTTPS only, hashed assets cached for a year and `index.html` never cached, and `npm run deploy` to build, upload and invalidate. It is a **new stack**, `ClockworkSkySite`, in the same account and region (`default` profile, `us-east-1`). It gets a certificate and an alias record for **sky.moving-parts.dev** in the existing `moving-parts.dev` hosted zone, as Beyond Dijkstra's `infra/lib/site-stack.ts` does.

The site goes live, unlisted, from Stage 1. When Part I is complete (Stage 8), the "Coming soon" card on moving-parts.dev becomes a link that says Part I is available and more is coming. That change is made in the Moving Parts project.

---

## 10. Accuracy and testing

- **You are the expert reviewer.** Each part's research brief and plan are reviewed in its planning stage, before anything is built, and each part ends with an accuracy pass over its text.
- **Engines are tested against independent references:** JPL Horizons positions, NASA's eclipse lists, analytic solutions (Kepler orbits; Lane–Emden for n = 0, 1 and 5), conservation laws, the original SSE/BSE code, and published tables.
- **Simplifications are labelled.** Every simplified figure has a "What's simplified here?" note, collected on the About page.
- **Facts that change carry "as of" dates,** and their values live in one data file, not in the prose.
- **End-to-end tests** check, as before, that every page and figure loads and works by keyboard, and run axe's WCAG 2.1 AA checks in both themes. They now also run at a phone-sized viewport.

---

## 11. Stages

Each stage is one session. It ends with tests passing, `docs/plan.md` updated, a commit (`Stage N: …`), a push and a deploy, and then **we stop**.

**How a stage runs**
1. Start a **fresh session** (it saves a lot of tokens). Read `CLAUDE.md`, the Status section above, and the current part's plan.
2. Build what the stage lists. Run the unit tests, lint, type-check and build, plus the end-to-end tests for the pages the stage touched.
3. Update the Status section: what's done, any changes to the plan, and what the next stage is.
4. Commit, push and deploy. Stop and report.

If a session runs low before the stage is finished, it stops at a clean point, commits as `Stage N (part 1): …`, and records what's left in Status.

| Stage | Part | Focus | Done when |
|---|---|---|---|
| 0 | — | **Planning:** this master plan, Part I research and plan, `CLAUDE.md` | Plans written ✔ |
| 1 | I | **Foundations:** scaffold copied from Rulebook, a course-shaped shell, core maths, time and coordinates with tests, the CDK stack, a first deploy | A placeholder site is live at sky.moving-parts.dev and the core tests pass ✔ |
| 2 | I | **Chapter 1**, Scene3D, the scale zoom, two Toolkit pages, the landing page | Chapter 1 is live |
| 3 | I | **Chapter 2**, the sky view, star data, positions of the Sun, Moon and planets, precession | Chapter 2 is live |
| 4 | I | **Chapters 3 and 4**, the Sun–Earth–Moon scene, the eclipse finder | Chapters 3 and 4 are live |
| 5 | I | **Chapters 5 and 6**, the orbit view, Kepler's equation, the Ptolemy model | Chapters 5 and 6 are live |
| 6 | I | **Chapter 7**, the n-body worker and teaching integrators | Chapter 7 is live |
| 7 | I | **Chapters 8 and 9**, planet globes, the asteroid belt, parallax, the stellar neighbourhood | All of Part I's chapters are live |
| 8 | I | **The Orrery v1 and Part I polish**, card on moving-parts.dev | Part I is complete and listed |
| 9 | II | **Part II research and detailed plan** | Plan agreed |
| 10–15 | II | Part II chapters, about two per stage; the SSE engine gets most of a stage of its own | Part II's chapters are live |
| 16 | II | **The Star Forge v1 and Part II polish** | Part II is complete |
| 17 | III | **Part III research and detailed plan** | Plan agreed |
| 18–26 | III | Part III chapters, one or two per stage; the BSE and many-body engines | Part III's chapters are live |
| 27 | III | **Both labs v2 and final polish** | Done |

That makes about 28 stages. The counts for Parts II and III are estimates that their planning stages will fix. The site is worth visiting from Stage 8 on, and each part can be released on its own.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| **Scope:** 31 chapters is roughly three explainers' worth | Each part is complete and useful on its own. Stretch items are marked. Parts II and III are re-planned, and can be trimmed, in their planning stages. Chapter 31 is optional. |
| **Accuracy:** a course for beginners has to be right | Research briefs with sources, your review before and after each part, engines tested against independent references, and "as of" dates |
| **Session limits and cost** | Stages sized to one session, a fresh session per stage, `CLAUDE.md` and the Status section as the hand-off, and the partial-commit fallback |
| **Style drift over ~28 stages** | `CLAUDE.md` conventions, shared components, and design tests (as in Rulebook) for tokens and figure structure |
| **3D on weak devices** | Light scenes, pausing off-screen, 2D alternatives where possible, reduced motion respected |
| **Numerical error in the simulations** | The right integrator for each job, energy errors shown to readers, conservation tests |
| **SSE/BSE ported with subtle bugs** | Reference tracks from the original code as test fixtures, covering every stellar type and the calibration edges |
| **Data licences** | Checked for each dataset in its part's research brief; credits on the About page; share-alike files kept separate |
| **Beginners overloaded** | One idea per section, maths in optional boxes, the Toolkit, Check yourself, figures that start simple and reveal options gradually |

---

## 13. Settled details

- **Name, scope and structure:** as in the Decisions table (agreed 22 Oct 2026, with my defaults for the open points).
- **Confirmed in Stage 1:** the GitHub repository `Voltfest42/The-Clockwork-Sky`, and the `sky.moving-parts.dev` subdomain.
- **To decide in later planning stages:** the Star Forge's optional MIST mode (Part II), and whether Chapter 31 stays (Part III).
