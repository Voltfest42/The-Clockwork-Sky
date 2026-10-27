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
- Addresses drop apostrophes: `/the-suns-year/`, `/keplers-laws/` (hash addresses until Stage 3b).
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

**Stage 3b (Search engines) is done** (23 Oct 2026). It was slotted in before Stage 4, so later stages keep their numbers.
- **Real paths.** Every page has its own address with a trailing slash (`/`, `/the-turning-sky/`, `/toolkit/powers-of-ten/`, `/part-1/`, `/orrery/`), and sections are fragments (`/the-turning-sky/#the-sky-as-a-dome`). Links are ordinary `<a href>`; a document-level listener turns plain clicks on internal page links into `pushState` navigations (`src/site/router.ts`), so back, forward, section scrolling, the sidebar's active section, reading progress and focus work as before. Old `#/…` links are moved with `replaceState` on load; a one-line script in `index.html` hides the start page's HTML until the app has rendered the right page, so nothing flashes.
- **Prerendering.** `npm run build` now runs the client build, a Vite SSR build of `src/entry-server.tsx`, and `scripts/prerender.ts`, which renders all 52 pages to `dist/<path>/index.html` plus `dist/404.html`, `sitemap.xml` and `robots.txt`. The browser hydrates (`hydrateRoot`), after loading the first page's content, so neither side shows "Loading…". One route list (`src/site/routes.ts`, from `course.ts` plus the extra pages) drives the prerender, the head tags, the sitemap and the tab title. A single stylesheet (`cssCodeSplit: false`) styles every page before its scripts run, and the prerender checks every CSS-module class it writes exists in it.
- **Figures and hydration.** `Figure` prerenders its frame (number, title, legend, "Try this", the simplified note) and a new required `description` of the figure, in a box the height of the live figure (`height`, measured at desktop width; without JavaScript it shrinks to the text). The live figure mounts right after hydration, and `useOnScreen` restarts then. Check yourself prerenders its questions; interactive widgets mount after hydration, and the questions remount then to pick up stored answers. Stored progress, answers and place are read lazily, never at import. The Voyager sentence uses `usePageTime()`: the build's time (written as `<html data-rendered>`) during hydration, then the reader's clock.
- **Head and structured data** (`src/site/seo.ts`): a unique title and description per page (chapters' from their titles and blurbs), canonical `https://sky.moving-parts.dev/<path>`, Open Graph and Twitter tags as in Rulebook (og:site_name "Moving Parts", the 1200 × 630 image from the Moving Parts project). The start page is a schema.org `Course` (free, en-GB, Beginner, provider Moving Parts, offers category Free, an online course instance, the three parts as syllabus sections). Each chapter and Toolkit page is a `LearningResource` that `isPartOf` the course by `@id`. The 404 page is `noindex`.
- **CloudFront.** A viewer-request function (`infra/lib/viewer-request.ts`, replacing Rulebook's `canonicalHostCode` with a superset) sends other host names to sky.moving-parts.dev, adds trailing slashes and drops a typed `index.html` (301s, combined into one hop, path and query kept), and serves `/x/` from `/x/index.html`. 403s and 404s from S3 now return `404.html` with a 404 status, not the start page. `scripts/serve.ts` runs the same function in front of `dist/` for `npm run preview` and the end-to-end tests.
- **Tests**: 340 unit and property tests (new: the route list, unique titles and descriptions, the sitemap lists exactly the routes, head tags and escaping, the Course and LearningResource data, the viewer-request function's rewrites and redirects; the router's paths and moved `#/` links) and 56 end-to-end tests (new: every page with JavaScript off has its own h1, title, canonical address and description; written chapters have their text, headings and figure frames in the HTML; the structured data; axe on prerendered pages with scripts blocked; slash and index.html redirects, the sitemap and robots.txt; old `#/` links land at the right section; links, back and forward without reloads; progress shown after hydration; unknown addresses get a 404; and every page hydrated on a development build of React, which reports any mismatch, served on port 4177).
- **Checked live with curl after the deploy:** all 52 pages return 200 with their own title and canonical address; `/the-turning-sky`, `/about/index.html` and `/the-moon?ref=x` return a 301 to the slashed address; the `dmjexr84ttb4x.cloudfront.net` address returns a 301 to the same path and query on sky.moving-parts.dev; unknown pages return the prerendered 404 page with status 404; the sitemap lists 52 addresses. The search-engine and site end-to-end tests also pass against the live site.

**Decisions and deviations in Stage 3b**
- **Stage number 3b**, not 4, so the later stages and the part plan's references keep their numbers.
- **Figures hydrate as placeholders, by design.** Rendering the live figures on the server would mean their first browser render must match the server's, but they start from "now", the reader's place and canvas sizes. So every figure's body waits for hydration, and search engines get its description instead. No figure needed a different approach.
- **Google's Course markup**: Google dropped Course *info* rich results on 9 Sep 2025. The Course *list* rich result still exists but needs at least three courses and an ItemList on a summary page, so a single course doesn't qualify. The markup keeps Google's still-documented Course properties (name, description, provider) and is valid schema.org for other consumers. An ItemList of the explainers on moving-parts.dev would be a Moving Parts change.
- **Every page is in the sitemap**, including the 29 "coming soon" chapters, as asked. They are thin pages; if Search Console flags them as soft 404s, they could get `noindex` until written.
- **Rulebook has no unit test for `canonicalHostCode`**, so the tests here are new: they run the function's code through `new Function` with fake CloudFront events.
- A malformed address such as `/%E0%A4%A/` gets a 400 from CloudFront itself, before the function runs; the local server answers 404.
- The link-preview image `public/og-image.png` was already supplied from the Moving Parts project and is committed with this stage.

**Stage 4 (Chapters 3 and 4) is done** (24 Oct 2026).
- **Core**: the Moon's phases (Meeus ch. 49, all four phases with the planetary terms); the eclipse finder (Meeus ch. 54: time of greatest eclipse, γ, u, type, magnitudes, semi-durations) with Saros numbering (van den Bergh's, from a reference eclipse and the inex); equinoxes and solstices from the Sun's apparent longitude; perihelion and aphelion for Earth's centre (the Moon shifts them by up to a day from the barycentre's); the Moon's mean node; sunlight (noon height, day length with refraction, sunrise azimuth, daily and noon sunlight per m² at the top of the atmosphere, from the nominal solar luminosity); topocentric rising, transit and setting of the Sun and the Moon; which constellation a direction is in, by the IAU boundaries (a crossing count on the J2000 polygons, with the polar caps handled); calendar drift for no-leap, Julian and Gregorian rules from the Sun's real equinoxes.
- **Data**: `scripts/fetch-eclipses.ts` writes NASA's 454 solar and 459 lunar eclipses for 1900–2100 (with Saros numbers) to `tests/fixtures/eclipses.json`, credited as NASA asks. The site doesn't ship it: its eclipses come from the finder.
- **Chapter 3** with Figures 3.1 (the Sun's year: a chart following the Sun along the ecliptic, its constellation outlined, entry dates to the minute for any year from 3000 BC, and the astrologers' sign beside it), 3.2 ★ (the seasons machine: a Scene3D heliocentric scene with a lit, tilted Earth and its latitude circles, a predict-first question on perihelion, charts of noon height, day length and daily sunlight for both hemispheres, the beam on the ground, a tilt slider to Uranus's 98° and a distance switch), 3.3 (the Sun's daily path on the sky view, a whole-sky view by default, with the solstice and equinox paths and each month's sunrise points), 3.4 (calendar drift, 45 BC–AD 2500), 3.5 (stretch: build the analemma, with the tilt and the ellipse switchable) and 3.6 (Earth's tilt over 250,000 years, in the Milanković deep dive). Check yourself: six questions, one interactive (the day of the highest noon Sun where you live).
- **Chapter 4** with Figures 4.1 ★ (the phase machine: the Moon dragged round its orbit from above, the Moon from Earth, your sky at any hour, a predict-first question, an Earth's shadow switch, both hemispheres), 4.2 (one orbit, two months), 4.3 (spinning or not), 4.4 ★ (eclipse seasons: a Scene3D geocentric scene with the tilted orbit, the nodes and both shadows, and a timeline of the year's new and full Moons, eclipse seasons and eclipses with their Saros numbers), 4.5 (shadows: umbra, penumbra and antumbra from exact tangent geometry; total, annular and partial solar eclipses and the red Moon) and 4.6 (stretch: a Saros series from the finder). Check yourself: six questions, one interactive (put the Moon at first quarter).
- **Shared pieces**: `LineChart` takes explicit ticks, markers, a baseline, a width and a pointer to pick an x value (no chart had used it before); the sky view gained `moon` and `stars` layer switches; a third chart colour, `--series-3`, contrast-checked in both themes. Two glossary terms: analemma, equation of time.
- **Tests**: 404 unit and property tests (new: Meeus 27.a, 49.a, 49.b and 54.a; every phase within 0.05° of the lunar theory's elongation; every NASA eclipse from 1900 to 2100 found, timed within 5 minutes, typed and Saros-numbered, γ within 0.01, magnitudes within 0.03; the 2026 equinoxes and solstices within 15 minutes; perihelion and aphelion of 2024–2026 within 3 hours; London's solstice sunrises and sunsets within 3 minutes; the midnight Sun in Tromsø; every direction in exactly one constellation; the Sun's 13 constellations on the usual dates; calendar drift; the figures' sums and the interactive answers) and 74 end-to-end tests (new: both chapters on a phone; every figure by mouse and keyboard; both 3D scenes in WebGL; the predict-first questions; both interactive questions; axe in both themes with every figure in use).

**Decisions and deviations in Stage 4**
- **Five eclipses are excused** in the NASA comparison, each within 0.005 of a dividing line in NASA's own magnitudes: the partial solar eclipse of 5 Jan 1935 (magnitude 0.0013) and the penumbral lunar eclipses of 18 Jul 2027 and 6 Jun 2096 (0.0014 and 0.0047), which Meeus's method misses; the annular eclipse of 9 May 1948 (0.9999), which it calls hybrid; and the total lunar eclipse of 4 Apr 2015 (umbral magnitude 1.0008), which it calls partial. The test states the rule and caps the count at five. Figure 4.4 therefore leaves out the 18 Jul 2027 penumbral eclipse, and its note says such eclipses can be missed.
- **NASA's credit line** is now "Eclipse Predictions by Fred Espenak (NASA's GSFC)" (the brief had "NASA/GSFC"); the fixture and the About page use it.
- **No Earth texture yet.** The plan's Sun–Earth–Moon scene has a textured Earth; textures arrive with the planet globes in Stage 7 (Solar System Scope), so Earth is a lit globe with its equator, tropics, polar circles and your latitude for now. The scene is two factories, heliocentric for the seasons and geocentric for eclipses, rather than one with camera presets; the view from the ground is the beam diagram (3.2) and the idealised sky (4.1).
- **Figure 3.3 looks straight up by default**, with the horizon round the rim, so the summer sunrises in the north-east show; "Facing the equator" is a button. Its sky is dark and starless so the paths stand out.
- **The phase machine's sky is idealised**: on the equator at an equinox, with the Moon's orbit in the equator's plane, so rise and set times follow from the phase alone (06:00 plus about 50 minutes a day). Its note says so. Real rising and setting are in the core (`riseSet.ts`) and tested.
- **Both stretch figures were built**: 3.5 (the analemma) and 4.6 (a Saros series), so Chapter 3 has a fifth section, "The analemma". Figure 3.6 sits inside a deep dive, so the prerender test now allows a figure in a closed `<details>`.
- **Eclipse seasons are shaded where the Sun is within 17° of the mean node**, one round value between the solar limits of about 15.4° and 18.5°.
- **Facts checked against the model and data**: the June solstice point moved from Gemini into Taurus in 1990; the Sun spends 45 days in Virgo and 7 in Scorpius; the next total solar eclipses (12 Aug 2026; 2 Aug 2027, 6 min 23 s; 22 Jul 2028) and lunar ones (3 Mar 2026, 31 Dec 2028) match NASA; Saros 126 runs 1179–2459 with 72 eclipses, and Saros 136 1360–2622 with 71, as in NASA's catalogue.

**Stage 5 (Chapters 5 and 6) is done** (24 Oct 2026).
- **Core**: the wanderers (`src/core/ephemeris/wanderers.ts`): geocentric places against the stars (J2000 ecliptic), elongation, oppositions and conjunctions (inferior and superior for Mercury and Venus), stations, greatest elongations and whole retrograde loops, by scanning and bisection (`src/core/math/roots.ts`); Ptolemy's model of a superior planet (`src/core/orbits/ptolemy.ts`: deferent, off-centre centre, equant, epicycle tied to the mean Sun; a score against real longitudes; a deterministic Nelder–Mead best fit, with or without the equant); ellipses (`src/core/orbits/ellipse.ts`: foci, apsides, position at a time, areas swept, by Kepler's second law and independently by Simpson's rule, vis-viva speeds, the third law); Kepler's equation now reports every guess through an optional `emit` and takes a starting guess.
- **Data**: `src/data/orbits.ts` (the planets from Standish's Table 1; Ceres, Pluto, Haumea, Makemake, Eris and comets Encke, Halley and Swift–Tuttle from JPL's Small-Body Database, fetched 24 Oct 2026; Jupiter's four large moons from JPL's satellite mean elements and NASA's fact sheet) and `src/data/timeline.ts` (the history timeline, from brief §6 and §13).
- **Shared pieces**: `ScatterChart` (points and lines on linear or log axes, with a pointer to pick an x value); the history `Timeline` (in Chapter 5 and, whole, on the About page).
- **Chapter 5** with Figures 5.1 (a year of planets: the five planets' paths on the star chart along the ecliptic, backward stretches drawn thick, a follow switch and a table of each planet's farthest angle from the Sun and backward dates for any year from 3000 BC), 5.2 ★ (retrograde loops: Earth and the planet from above with numbered lines of sight and a ring of directions to the stars, beside the loop on the real star chart with the same numbers; Mars, Jupiter, Saturn or Venus, previous and next loop), 5.3 ★ (tune Ptolemy: six sliders, the construction with the model's and the real Mars's lines of sight, the miss over 2020–2035 as a chart, an average and worst score, and Ptolemy's proportions, the best fit and the best fit without an equant), 5.4 (measure Venus's or Mercury's orbit from the greatest elongation, with the next real greatest elongations from the ephemeris) and 5.5 (Venus in two worlds: phases under Ptolemy's arrangement and the Sun-centred one, and Venus as Galileo could see it from October 1610 to January 1611, computed). Section 5.6 is a narrative with the timeline; a deep dive explains why the epicycle is Earth's orbit. Check yourself: five questions.
- **Chapter 6** with Figures 6.1 ★ (draw an ellipse: pins and string, the two lengths summing, real orbits to scale), 6.2 ★ (sweeping areas: twelve wedges of equal time, each measured, and speeds from the vis-viva equation for real orbits), 6.3 ★ (period against distance on log–log or ordinary axes for 21 bodies, the Sun's line and Jupiter's, your own planet, and a table of P² ÷ a³) and 6.4 (deep dive: Newton's method on Kepler's equation step by step, on the orbit's circle and on the equation's curve, with three starting guesses). Check yourself: five questions, one interactive (set the eccentricity of Halley's comet's orbit).
- **Toolkit T3, Ratios and scaling**, with Figure T3.1 (scale a square and a cube; length, area and volume on log–log axes). Four glossary terms: ellipse, greatest elongation, semi-major axis, station. The About page lists the new simplifications and sources, and the whole timeline.
- **Tests**: 438 unit and property tests (new: Mars's oppositions of 2025, 2027 and 2029 and its stations of 2024–25 to the day, Jupiter's and Saturn's oppositions, Venus's inferior conjunction and greatest elongations of 2025 to 0.05°; synodic periods and retrograde lengths against the brief; Mercury and Venus kept near the Sun; ellipse string lengths and apsides; the second law against Simpson's rule; perihelion and aphelion speeds, and r × v conserved; the third law for every body to 0.6%; Jupiter's moons weighing Jupiter at 1/1047; Kepler's solver step by step; Ptolemy's model, the best fit and the equant; the figures' helpers) and 90 end-to-end tests (new: both chapters on a phone; every figure by mouse or keyboard; the interactive question; Toolkit T3; axe in both themes with every figure in use).

**Decisions and deviations in Stage 5**
- **The fit is scored on 2020–2035**, every 5 days, on longitude only. Ptolemy's proportions (epicycle 39½ and eccentricity 6 on a deferent of 60, equant at twice the centre's distance), with today's apogee and the true speeds, average 0.55° and miss by at most 3.4°; the best fit averages 0.23° (worst 0.88°) and lands on nearly Ptolemy's proportions (epicycle 0.658, equant 1.95 × the centre); the best fit without an equant averages 1.32° (worst 8.7°). The best fit always starts from Ptolemy's values, since Nelder–Mead from a plain start finds a poor local minimum.
- **Figure 5.2's ring shows directions.** A ring of "distant stars" drawn just outside the orbits hides the loop (parallax swamps it), so each number sits on the ring where its line of sight points, as if the stars were infinitely far; the lines of sight run on out of the picture.
- **Venus in two worlds** uses circles in a frame turning with the Earth–Sun line; Ptolemy's Venus has the same directions and the same apparent sizes as the real one, so only the phase differs (never more than 34% lit). Galileo's views come from the ephemeris (78% lit and 14″ on 1 Oct 1610 to 19% and 46″ on 30 Jan 1611).
- **The orbit view is per figure, in SVG**, on the shared core (`orbits/ellipse.ts`, `retrograde.ts`); its 3D form and the rotating frame come with the n-body figures and the Orrery. **The histogram waits for Stage 7**, where Figure 8.4 needs it; Stage 5 added the log axes.
- **Orbits from JPL's Small-Body Database**, osculating: Halley's comet has e = 0.968 (the brief's 0.967), a = 17.93 AU and a 75.9-year period; Pluto a = 39.59 AU and 249 years (the brief's mean values are 39.5 AU and 248). The interactive question accepts 0.943–0.993.
- **Figure 6.4 opens at M = 30°, e = 0.5**: the safeguarded solver halves its bracket when Newton's step would leave it, which near the bracket's edge (M = 60°, e = 0.6, say) takes several halvings, a good thing to find but a poor first view.
- **Figure 5.1 follows Venus at first**: in late 2026 Mars has no loop, while Venus is between its eastern and western elongations.
- Chapter 5 has no interactive question (the plan has none); Chapter 6's is the plan's.
- **Facts checked against the model and data**: Mars's oppositions 16 Jan 2025, 19 Feb 2027 and 25 Mar 2029, and its stations 6 Dec 2024 and 24 Feb 2025 (79 days, 19°); Jupiter's oppositions 7 Dec 2024 and 10 Jan 2026; Saturn's 21 Sep 2025; Venus at inferior conjunction 23 Mar 2025 and greatest elongations 47.2° east on 10 Jan 2025 and 45.9° west on 1 Jun 2025; synodic periods within 2 days of the brief's (3 for Mercury); retrograde lengths: Mercury 20–24 days, Venus 41–43, Mars 60–81, Jupiter 118–124, Saturn 134–142; the greatest elongations reach 27.8° (Mercury) and 47.2° (Venus); Earth's speed 30.3 km/s at perihelion and 29.3 at aphelion, Mercury's 59 and 39, Halley's 55 and 0.9.
- Two older end-to-end tests were flaky under load: Chapter 2's interactive question now waits for the question's remount after hydration, and Chapter 1's light's race allows 40 s to reach Proxima when the whole suite is running.

**Stage 6 (Chapter 7) is done** (24 Oct 2026).
- **Core**: generic steppers for x″ = a(x) (`src/core/integrate/steppers.ts`: forward Euler, leapfrog kick–drift–kick with its acceleration reused, classical RK4), each reporting its stages (kicks, drifts, RK4's four probes) through an optional `emit` and counting its acceleration evaluations; the n-body engine (`src/core/nbody/`): typed-array state with G·m per body (any consistent units; AU and days for planets, with SI conversions at the edges), direct-summation gravity, test particles, the centre-of-mass frame; diagnostics (energy, angular momentum, momentum, their drift, the relative two-body orbit); a `Simulation` with configure and edit; the exact two-body answer (`twoBody.ts`); and the **worker protocol** (`protocol.ts`: load, run at a rate, pause, step, edit; snapshots with trails of tracked bodies thinned to 4,000 points, energy and angular-momentum errors; errors as messages, including a blown-up run). `src/workers/nbody.worker.ts` hosts it; `src/viz/nbody/useNBody.ts` talks to it, queuing requests until the worker exists and falling back to the main thread where there are no workers.
- **Data**: `src/data/gravity.ts` (pairs to weigh, with the ISS's orbit as of October 2026; balance pairs; tide bodies; Earth and Mars for the transfer).
- **Chapter 7** with Figures 7.1 ★ (Newton's cannon: a 100 km mountain at true scale, shots computed by the engine with leapfrog, the view zooming from a 300 km stretch of ground out to eight Earth radii, the straight no-gravity line and how far the ball has fallen, gravity's strength at the ball; 7.85 km/s to circle and 11.10 to escape from the mountain top), 7.2 ★ (step by step, **run in the worker**: Euler, leapfrog or RK4 on a circle or an e = 0.5 orbit, 8 to 1,000 steps an orbit, Play and One step with RK4's trial points and the velocity arrow, and a chart of all three methods' energy errors over 20 orbits on a log scale), 7.3 ★ (the cosmic scale: six pairs, a ruler ring and a stopwatch with 1–5 laps, the mass from the reader's own measurements against the accurate value), 7.4 (the barycentre: five pairs and a mass-ratio slider from 1 to 10⁶, with a true-scale close-up of the heavier body and its wobble speed), 7.5 ★ (tide maker: the Moon's pull and the pull minus the average, the equilibrium bulges, the Sun for spring and neap tides, a turning Earth and a harbour's water level over a lunar day) and 7.6 (stretch, built: a Hohmann transfer to Mars from today's mean positions, launch windows, hit or miss). Section 7.6 has the timeline from Newton to Hohmann; a deep dive on why gravity is an inverse square. Check yourself: six questions, one interactive (set the cannon's speed for an orbit).
- **Toolkit T4, Solving by stepping**, with a worked table (a ball thrown up, stepped by Euler) and Figure T4.1 (steps on a spring, the three methods, 8–200 steps a swing). Three glossary terms: Hohmann transfer, inverse-square law, spring and neap tides; three timeline entries (Newton c. 1666, Halley's comet at perihelion in 1759, Hohmann 1925). The About page lists the new simplifications, tests and sources.
- **Tests**: 480 unit and property tests (new: units and the Gaussian constant; Earth's circular and escape speeds; gravity's inverse square, and Newton's third law as a property; each method against Kepler's solution and **converging at its order** (1, 2, 4); Euler's energy rising every step; leapfrog's bounded over 1,000 orbits, with angular momentum kept to 10⁻¹¹; RK4's steady downward drift; momentum kept by every method; the stages and costs of a step; **the figure-eight of three equal stars returning after one period**; the relative orbit; the protocol's load, step, run, pause, edit, trail thinning and error messages; the Moon test; the cannon's ranges, orbits, escape and energy; the energy charts; weighing every pair to 1% and how measurement errors carry; the balance points and Jupiter's 12.5 m/s wobble; the tides' 0.46 ratio, two high tides a lunar day, spring and neap ranges; the transfer's 259 days, 44° lead, 780-day windows and hits; the spring; the interactive answer) and 100 end-to-end tests (new: Chapter 7 on a phone; every figure by mouse or keyboard; the n-body worker actually starting; the interactive question; Toolkit T4; axe in both themes with every figure in use).

**Decisions and deviations in Stage 6**
- **The engine keeps G·m, not m**, so it works in any consistent units; energies and angular momenta are reported times G, and only their drifts are used. Test particles (G·m = 0) are pulled but pull nothing and carry no energy, so Figure 7.2's planet has Earth's mass.
- **Only Figure 7.2 runs in the worker.** The cannon, the energy chart and the spring are small enough to compute on the main thread with the same core code. The worker and its protocol are ready for the Orrery (Stage 8), which adds the WHFast- and IAS15-style integrators, collisions and escapes.
- **On a circle, leapfrog's energy error beats RK4's** over 20 orbits at up to about 365 steps an orbit; on the stretched orbit RK4 wins with many steps. The figure shows both as they are; the captions say RK4 is more accurate per step but drifts.
- **Figure 7.2 opens with Euler on a circle at 60 steps an orbit**: from the stretched orbit at 36 steps Euler flings the planet out within half an orbit, too abrupt for a first view.
- **The cannon fires from 100 km**, drawn at true scale, so its speeds are 7.85 and 11.10 km/s; the text gives 7.9 and 11.2 from the ground. The figure zooms instead of exaggerating the mountain.
- **The tides are the equilibrium tide** at the equator with the Moon and Sun over it: 0.36 m under the Moon, ranges of 0.78 m (spring) and 0.29 m (neap). The arrows are the centre's pull plus the exact quadrupole stretch, scaled up, so "minus the average" is a literal subtraction and the near and far sides look alike, as they do at 60 Earth radii.
- **The transfer uses circular orbits and mean longitudes**, so its windows (the next around 16 November 2026) can be a few weeks from real mission windows; its note says so.
- **No "Open this in the Orrery" links yet** (Part I plan §12, question 3): they come with the Orrery in Stage 8.
- Facts checked against the model and data: the Moon falls 1.36 mm a second, against g/60.3² (1% apart); the ISS at 420 km feels 88% of surface gravity; the masses weighed from each pair's orbit agree with the fact sheets to under 1% (Sun 1.99 × 10³⁰, Earth plus Moon 6.03 × 10²⁴, Earth from the ISS 5.97 × 10²⁴, Jupiter 1.90 × 10²⁷, Mars 6.42 × 10²³, Pluto plus Charon 1.46 × 10²² kg); barycentres 4,670 km (Earth–Moon), 2,130 km (Pluto–Charon) and 742,000 km = 1.07 R☉ (Sun–Jupiter); the Sun's tide is 0.46 of the Moon's and its pull 178 times; Hohmann 259 days, Mars 44.3° ahead, windows every 780 days.

**Stage 7 (Chapters 8 and 9) is done** (25 Oct 2026). All of Part I's chapters are live.
- **Data** (`scripts/`, `src/data/`): `build-asteroids.ts` reduces the orbits of all 895,910 numbered asteroids from JPL's Small-Body Database (fetched 25 Oct 2026) to a histogram of semi-major axes (1.5–5.5 AU in 0.01 AU bins), group counts, the median distance to the nearest numbered neighbour in the main belt (from every asteroid's real position on 1 Oct 2026, by Kepler's equation) and a 50 × 50 × 2 million km box of the belt (`asteroids.json`, 3 kB). `build-neighbours.ts` cuts the 323 stars within 10 pc from HYG (`hyg/neighbours.json`, CC BY-SA, 12 kB gzipped), with classes O–M and D (23 faint stars with no spectral type classed by colour). `fetch-galilean.ts` writes the four Galilean moons' states on 1 Jan 2026 from Horizons (JUP365) with JPL's G·m values, and a 60-day test fixture. `build-textures.py` (Python and Pillow, the one script not in TypeScript, since Node has no image encoder without a native dependency) makes 1024 × 512 WebP maps of the eight planets, the Moon and Saturn's rings from Solar System Scope's 2k textures (CC BY 4.0, confirmed on their site): 387 kB in all, hashed assets loaded only by the globes. `src/data/planets.ts` holds the planet-card values from NASA's fact sheets with moon counts as of March 2026; `src/data/gaia.ts` the Gaia dates.
- **Core**: mean-motion resonances from Kepler's third law (`orbits/resonance.ts`), Hayashi's minimum-mass disc (`orbits/disc.ts`: temperature, snow line, solid and gas surface densities, rounded condensation temperatures after Lodders 2003), parallax, light-years and the distance modulus (`stars/distance.ts`), and galactic ↔ equatorial vectors.
- **Shared pieces**: the planet globe (`viz/scene3d/globe.ts`: a textured, tilted, spinning sphere with rings, and a per-scene texture cache); the `Histogram` (bars on linear or log counts, markers, a pointer and arrow keys to read a bar); Scene3D's engine now reports a click without a drag to the scene (`onClick`), for picking; `ZoomFigure` takes a start, title and description.
- **Chapter 8** with Figures 8.1 ★ (the Solar System today: real positions at four zooms with orbits and belts, play, or the planets in a row at true sizes against the Sun's edge; a card per planet with today's distances and light times), 8.2 ★ (planet cards: any two of the planets and the Moon as 3D globes at true relative size, spinning at their true relative rates, with a table of size, mass, gravity and your weight, days, years and your age, tilt, temperature, air, moons and rings), 8.3 (Jupiter's clockwork moons, run in the n-body worker from Horizons states, with lap counters, "Run one lap of Ganymede" giving 4 : 2 : 1, and an edge-on strip as Galileo saw them), 8.4 ★ (gaps in the belt: the histogram with the resonances, a log scale, and a real box of the belt with every numbered asteroid in it) and 8.5 (the snow line: the disc's temperature with the planets, what freezes where, the star's brightness, and the fourfold jump in solids). Check yourself: six questions, one interactive (find the 3 : 1 gap).
- **Chapter 9** with Figures 9.1 ★ (parallax: Earth's orbit and the line of sight to the distant stars, the star's yearly ellipse through a magnified telescope with a scale bar, real parallaxes for Proxima, Sirius, 61 Cygni, Vega and Betelgeuse, and a distance slider), 9.2 ★ (the neighbourhood: 323 stars within 10 pc in 3D in galactic axes, coloured by type and sized by light, on stalks to the Galaxy's plane, with type filters, click or list to pick, and an info card), 9.3 (move the Sun away on the magnitude scale beside the Moon, Venus, Sirius, Vega and Polaris), 9.4 (the Milky Way from inside: the sky view at 22:00 tonight with the band, the galactic midline and the direction of the centre) and 9.5 (the zoom from the Solar System to the whole Galaxy). Gaia's fourth data release is a sentence that changes tense by itself on 2 December 2026. Check yourself: five questions, one interactive (move the Sun to the edge of sight).
- Ten glossary terms (absolute magnitude, brown dwarf, dwarf planet, galaxy, globular cluster, Kirkwood gap, red dwarf, resonance, snow line, white dwarf); nine timeline entries (Uranus 1781, Ceres 1801, Kirkwood 1866, Shapley 1918, Pluto 1930, Laskar 1989, the IAU's planet definition 2006, Gaia 2013, ʻOumuamua 2017). The About page lists the new tests, simplifications, sources and credits (Solar System Scope, the Minor Planet Center).
- **Tests**: 511 unit and property tests (new: the Kirkwood gaps from Kepler's third law and their depth in the real counts, the Hildas and Trojans; the numbered-asteroid counts and spacing; the snow line at 2.71 AU and the fourfold jump; Jupiter's moons against Horizons over 60 days and their 1 : 2 : 4 laps, periods within 1% and the Laplace angle near 180°; the planet cards' values, your weight and age; the planets' positions and the size row; parallax and distance round trips; the brief's stars at their distances; the parallactic ellipse; the distance modulus, the Sun at magnitude 0.47 from α Centauri and invisible beyond 17.1 pc; the neighbours' counts and positions; the galactic equator and centre; both interactive answers) and 117 end-to-end tests (new: both chapters on a phone; every figure by mouse or keyboard; both globes and the neighbourhood in WebGL; Jupiter's moons in the worker; both interactive questions; axe in both themes with every figure in use).

**Decisions and deviations in Stage 7**
- **The asteroid belt's spacing is millions of kilometres, not "about a million"**: the median distance from a main-belt asteroid to its nearest *numbered* neighbour is 2.7 million km (mean 3.2), about 7 times the Moon's distance. The text says "millions of kilometres"; the figure's note says that unnumbered and undiscovered asteroids would shrink it, but not to anything worth dodging.
- **Jupiter's moons step at 0.005 days.** At 0.02 days leapfrog's phase lag made Io's lap 0.3% too long, more than the error from leaving out Jupiter's bulge (J2). With a point-mass Jupiter, Io still falls behind Horizons by about 0.3° a day (17° in 60 days), Europa by 0.05° and Ganymede by 0.01°; the test bounds exactly that, and the figure's note says so. The Laplace angle stays within 15° of 180° over ten laps of Ganymede.
- **Figure order in Chapter 9**: the plan had the zoom and the Milky Way band together as 9.4; they are two figures, 9.4 (the band in the sky view) and 9.5 (the zoom).
- **Planet cards cover the eight planets and the Moon**; Pluto has no Solar System Scope map, so it stays in the text. Saturn's year is the fact sheet's sidereal 10,759 days (the summary table rounds to 10,747); Uranus has **29** moons, counting S/2025 U1 (the brief gave 28 or 29); Venus shows its cloud tops.
- **The neighbourhood is HYG's 323 stars**, which miss some faint red dwarfs and all brown dwarfs. The text uses Reylé et al. (2021) for the census (540 objects in 339 systems: 375 stars including 20 white dwarfs, 85 brown dwarfs, 77 planets; 249 of the stars are M dwarfs) and the figure's note says what the catalogue lacks. In HYG the Sun gives out more light than 94% of its neighbours.
- **The Galaxy's centre** is marked at l = 0, b = 0, 4′ from Sagittarius A*.
- **The Milky Way figure opens at 22:00 tonight, looking straight up**, with the stars drawn as if dark, so the band shows in any season; in late October from London the centre is below the horizon and the caption says the fainter half of the band is up.
- **Fixed in passing**: Figure 7.6 showed yesterday's date (0h UT minus ΔT is the evening before); it and Figure 8.1 now start at noon.
- No "Open this in the Orrery" links yet; they come with the Orrery in Stage 8. With every Part I chapter written, the site test for "planned" chapters has no Part I chapter left to check (its "Builds on" link check still runs).
- **Facts checked against the model and data**: the Kirkwood gaps at 2.06, 2.50, 2.82, 2.96 and 3.28 AU (the brief's 2.95 and 3.27 are rounded), all clearly emptied in the counts (the 7 : 3 gap is the shallowest, a third of its surroundings); 10,588 numbered Trojans; Jupiter's moons' periods within 0.1% of JPL's; the snow line at 2.71 AU; Proxima 4.25 ly, Sirius 8.60, 61 Cygni 11.4, Vega 25.0, Betelgeuse 548; the Sun at magnitude 0.47 from α Centauri (in Cassiopeia) and visible to 17.1 pc (55.9 ly); Gaia DR4 on 2 December 2026 (ESA).

**Stage 8 (the Orrery v1 and Part I polish) is done** (25 Oct 2026). **Part I is complete**, and listed on moving-parts.dev.
- **Core integrators** (`src/core/nbody/`): Kepler's problem in universal variables (`keplerDrift.ts`: Stumpff's functions, f and g, any conic, either direction, whole laps dropped, Newton's method kept inside a bracket); a **Wisdom–Holman** integrator in Jacobi coordinates in the style of WHFast (`wisdomHolman.ts`: kick–drift–kick, the interaction kick as the full Jacobi acceleration minus the Kepler part, its last acceleration reused, any body order with the heaviest first); and **IAS15** (`ias15.ts`: Gauss–Radau spacings, Newton's divided differences turned into the polynomial's coefficients by matrices computed at load, a predictor–corrector loop to 10⁻¹⁶, steps sized by the last coefficient against ε = 10⁻⁹, redone when too large, the next step's fit predicted from this one's, compensated summation, negative steps, a step limit to land on a time, a minimum step).
- **The Orrery's engine** (`src/core/orrery/`, with `orbits/elements.ts` and `orbits/lagrange.ts`): orbital elements both ways; Lagrange points and Hill radii; who orbits whom (`hierarchy.ts`: parents by Hill sphere and binding, orbits measured Jacobi-fashion about the parent and its inner children, so a planet round two stars has a steady orbit); frames (`frame.ts`: centred on the centre of mass or a body, or turning with a pair about their centre of mass); the engine (`engine.ts`: Wisdom–Holman for planetary systems, IAS15 otherwise, leapfrog for comparison, automatic with a manual override; collisions that merge bodies keeping mass and momentum; close encounters, captures, releases and escapes logged; energy and angular-momentum drift; runaway steps and non-finite states caught; up to 50 bodies with masses, distances and speeds checked; add a body on an orbit about any other, delete, change a mass or a velocity, make an orbit circular, and undo, 30 deep); and its own worker protocol (`protocol.ts`, `src/workers/orrery.worker.ts`: load, run at a rate with a time budget per tick and the achieved rate reported, pause, advance, frame, method and the edits; trails recorded in the worker after every step in the chosen frame, about 90 points a lap of each body's own orbit).
- **Data**: `scripts/fetch-orrery.ts` writes the Sun, the planets' system barycentres, Pluto, Earth and the Moon from Horizons (DE441) on 1 January 2026 with DE440's masses (`src/data/orrery.json`), and the same bodies a Julian century later (`tests/fixtures/orrery.json`).
- **The Orrery** (`src/lab/orrery/`, at `/orrery/`): eleven systems (the Solar System today; Earth and Moon; Jupiter's Galilean moons; Sun, Jupiter and the Trojans; the figure-eight; the Pythagorean problem; Kepler-16; TRAPPIST-1; a comet meets Jupiter; Jupiter 100 times heavier; one planet for comparing methods), each with a blurb, a "Try this" and a "What's simplified" note. A view from above in Canvas 2D (pan, zoom by wheel, pinch, buttons or keys, click to pick, the picked body's velocity arrow to drag while paused, a scale bar, fading trails, the Lagrange points in a turning frame) and a 3D view in Scene3D (the same model, rings in the plane, click to pick). Centre on any body, turn with any body and its parent, trails from none to thirty laps, a time warp from real time to 10,000 years a second (capped at about 3,000 laps of the fastest orbit a second), "Jump a second's worth". A card for the picked body (mass, parent, distance, speed, orbit, period; make it circular, delete, mass ×0.1 to ×10, 1% and 10% faster or slower, turn 10°); a form to add a body (seven masses from a test particle to the Sun, any parent, a, e, i, Ω, ω, M); a table of every body's orbit; the energy and angular-momentum errors and the integrator's step; an event log; "Copy a link to this system" (the stretch goal, built: the state in `?system=`); `?preset=` and `?method=` in the address. The page explains the integrators, the energy error, the events, what's simplified and the sources; without JavaScript it describes the lab.
- **Links into the Orrery**: Figures 7.2 (one planet, leapfrog), 7.4 (Earth and Moon) and 8.3 (Jupiter's moons) have an "Open this in the Orrery" link (a new `orrery` prop on `Figure`); Chapters 7, 8 (the Trojans) and 9 link to it in the text.
- **Polish**: three glossary terms (Lagrange point, Hill sphere, three-body problem) and six timeline entries (Lagrange 1772, Wolf's Achilles 1906, Wisdom and Holman 1991, Moore's figure-eight 1993, Kepler-16 b 2011, TRAPPIST-1's seven planets 2017); the About page lists the Orrery's tests, simplifications and sources, and says Part I is complete; a scan of the chapters, glossary and lab for American spellings and leftover markers found none; Firefox and WebKit projects (`CROSS_BROWSER=1`) and a slow-phone profile (`PERF=1`, `e2e/performance.spec.ts`) in the Playwright config.
- **Moving Parts**: the Clockwork Sky card is now a link to sky.moving-parts.dev ("Starts from the basics · 9 chapters · The Orrery", tagged "Part I of III"), and the front page's structured data lists the course.
- **Tests**: 552 unit and property tests (new: Stumpff's functions against their closed forms and their recurrence; the Kepler drift against Kepler's solution up to e = 0.99, backwards, over ten laps, and on parabolas and hyperbolas keeping energy and angular momentum; Wisdom–Holman exact for one planet at seven steps an orbit, a planetary system's energy kept to 10⁻⁷ for 1,000 years, a thousand times better than leapfrog at the same step; IAS15's spacings as the roots of P₇ + P₈, an e = 0.99 orbit to 10⁻⁹ over 100 laps, the figure-eight's return, the Pythagorean problem's energy to 10⁻⁹, forward and back again, and agreement with Wisdom–Holman; elements round trips; Lagrange points in balance, Sun–Earth L1 and L2 at 1.5 million km; who orbits whom, Kepler-16 b's 228.8 days about both stars; every preset loading with the right method; **the Solar System against Horizons a century later**; the figure-eight, the Pythagorean escape, TRAPPIST-1's periods, the tadpoles and the horseshoe, the comets' passes on cue and comet C's capture and release, Saturn thrown out by a heavy Jupiter; mergers keeping momentum; edits, undo and refused bodies; escapes; the turning frame; the protocol's runs, trails, edits and errors; the readouts' words) and 128 end-to-end tests, plus 20 in WebKit and 4 slow-phone measurements on request (new: the Orrery on a phone, every preset, the turning frame and 3D, picking, editing, adding, a refused body and undo, the Pythagorean escape in the log, the keyboard, a copied link, the three figures' links, axe in both themes with the lab in use).

**Decisions and deviations in Stage 8**
- **The Orrery has its own protocol and worker** rather than extending the figures': its bodies come and go (mergers, edits), it records trails in a chosen frame, and its integrators pick their own steps. The figures' protocol is unchanged.
- **Wisdom–Holman runs in "safe mode"**: Jacobi coordinates are made from the inertial state and back every step, kick–drift–kick, with no symplectic correctors. Its step is a 25th of the shortest orbit judged at periapsis, P(1 − e)^1.5 with e capped at 0.9; leapfrog's is a 300th; IAS15 starts at a 100th.
- **IAS15 uses its original global step rule** (the largest last coefficient over the largest acceleration) with ε = 10⁻⁹, REBOUND's long-standing default. A tighter ε stalls in round-off at the Pythagorean problem's closest pass (the step shrinks without end), so the engine sets a minimum step of 10⁻¹³ of the system's timescale and reports a collision if it is reached.
- **Automatic switching is one-way**: the first time two bodies come within three Hill radii, the engine moves to IAS15 and stays there (a MERCURIUS-style switch back is for version 2). A system that starts with two bodies that close starts on IAS15, as the comet preset does.
- **The Solar System preset uses each planet system's barycentre** (Earth–Moon, Mars, Jupiter, … carrying their moons' masses) and adds Pluto, so Wisdom–Holman takes 2.5-day steps; the Moon has its own preset with the Sun and Earth. A century from 1 January 2026 it lands within 20″ of JPL's positions for Mercury (mostly relativity, which the Orrery leaves out), 16″ for Venus, 8″ for Earth, 4″ for Mars and 0.1″ for the rest, with either integrator; the energy drifts by about 10⁻¹⁰.
- **An eleventh preset, one planet**, gives Figure 7.2's link something to open (with leapfrog); the plan's ten are all there.
- **Kepler-16 and TRAPPIST-1 were verified**: Doyle et al. (2011) through the NASA Exoplanet Archive and later papers' citations (A 0.6897 and B 0.20255 M☉, 41.07922 days, e = 0.15944; the planet 105.8 Earth masses, 228.776 days, e = 0.0069; the binary's 0.2243 AU follows from Kepler's third law); Agol et al. (2021) through the Exoplanet Archive (the star 0.0898 M☉; the seven planets' masses, radii and periods). Where each body starts along its orbit is made up (said in their notes), and the orbits are flat.
- **The comets are set up at their closest approach and run backwards** with IAS15 to the preset's start; since comets weigh nothing, each is run back alone with its own time. Comet A passes at 0.012 AU at 1.3 times Jupiter's escape speed and is flung out to a = 17 AU; comet B passes at 0.08 AU; comet C, at 0.02 AU and 0.964 of the escape speed, is caught by Jupiter (bound inside its Hill sphere) from about day 2,700 to day 9,250, looping at 0.08–0.4 AU.
- **The Trojans** are test particles with Jupiter on a circular orbit: tadpoles from ±60° with orbits 1.2% wider or narrower swing over about 48–74°; wide ones from 30° and −25° over 28–122°; the horseshoe, from opposite Jupiter on an orbit 0.3% wider, swings round both points and never comes within 22° of Jupiter.
- **Jupiter 100 times heavier** (0.095 M☉) is not "planetary" for the automatic choice, so it runs on IAS15 from the start; Saturn is thrown onto a 55 AU, e = 0.89 orbit after a pass at 1.9 Hill radii around year 43.
- **The event log** records a pass when a pair has come within three Hill radii (or 5% of the system's size without a dominant body), only if it is closer than any earlier pass by that pair, and not again for a bound pair going round just as before; an escape needs positive energy against the rest, moving outward beyond three system sizes, and not being half of a bound pair (so the Pythagorean problem's binary isn't "escaped"); captures and releases come from the hierarchy changing.
- **Text checked against the engine, and corrected**: leapfrog's energy error on the Solar System is a few hundred times Wisdom–Holman's (not "a thousandfold"); IAS15's steps at the Pythagorean problem's closest passes shrink to seconds (not minutes); the figure-eight survives a 1% nudge but falls apart after 3–10%, so the lab gained 1% velocity buttons; the Earth–Moon centre of mass is 4,400–4,900 km from Earth's centre as the Moon's distance changes ("about 4,700 km").
- **Fixed on the way**: after a merger, `advanceTo` kept watching the old system object and never finished; the running clock drifted ahead by up to a step each tick (it now keeps a target time); in development React's double mount sent the first load to a worker it then closed; the time-warp row made the page scroll sideways at 375 pixels.
- **Cross-browser**: WebKit passes every page's overview test and the @cross tests (the sky view, the seasons machine, the n-body worker, the neighbourhood in WebGL, the zoom by pointer, the Orrery's 3D view and editing). **Firefox could not be tested on this machine**: Windows refuses to run Playwright's Firefox build ("Permission denied" on firefox.exe), and that is an operating-system security setting. Run `CROSS_BROWSER=1 npm run e2e` where Firefox can start.
- **Performance** on Chromium with the CPU slowed four times on a phone-sized screen: the sky view playing time at 38 fps (worst frame 50 ms), the scale zoom's tour at 51 fps, the Orrery at 60 fps both with the Solar System at a century a second and with the Pythagorean problem in IAS15 (the engine runs off the main thread). Bundles: the shell is 85 kB gzipped; three.js (187 kB), the star catalogue (177 kB) and the Orrery (29 kB) load only where needed.
- **The accuracy and copy pass awaits your review**: the automated checks and the Orrery's own claims are done; the read-through by you that the plan asks for hasn't happened yet.

**Stage 8b (fixes from your read-through of Part I) is done** (27 Oct 2026).
- **Figure 2.2**: a heading button (N, E, S, W) now lets go when the view is turned by hand, as in Figure 2.1; the caption and the view's label then describe the nearest compass point ("facing roughly east"), and Home brings the heading back. The end-to-end test checks it.
- **Figure 6.4**: the starting point's jump at M = 180° with Danby's guess is not a bug: his guess is M ± 0.85 e, on the side where sin M points, so it switches sides at aphelion, a jump of 1.7 e radians. The answer itself doesn't jump. The caption now says so near aphelion, and the chapter's description of the guess is more exact (close near perihelion, where the equation is hardest; overshooting near aphelion, where the answer is close to M).
- **Chapter 3, the polar circles**: the text now says the change from polar night to midnight Sun is gradual (a first glimpse at noon, then longer days), and explains the poles' one sunrise and one sunset a year: the Sun circles level with the horizon and creeps up over a couple of days around the spring equinox.
- **"Air" for other worlds** is now "atmosphere" (Mercury, Venus, Mars, the rocky planets, Jupiter, Titan, Venus in Chapter 5's Check yourself, Figure 8.2's table and notes); Earth's air stays air. Venus's atmosphere "presses down 92 times as hard as our air" (it was "92 times as thick"). Figure 8.2's Mars row no longer gives the pressure twice.
- Tests: 552 unit and 128 end-to-end tests pass.

**Stage 8c (dates that stay right, and unfinished parts marked) is done** (27 Oct 2026).
- **The start page** shows Parts II and III, and the Star Forge, as plain cards marked "Coming soon" instead of links, and "Where to start" marks those parts as coming soon. A part becomes a link by itself once all its chapters are written (`partReady` in `course.ts`), a lab once it is built. Their pages are still reachable from the sidebar. The Labs page and Part II's page show the Star Forge the same way.
- **No "next" or "last" with a fixed date in the text.** Chapter 4's next total solar eclipses and next total lunar eclipse, and Chapter 5's next opposition of Mars, are now computed from today (the build's date in the prerendered HTML, the reader's clock after hydration) by the course's own eclipse finder and planet positions (`src/site/content/upcoming.ts`, `NextEclipses` and `NextMarsOpposition` in `Dated.tsx`). Where each eclipse can be seen, and the longest totality, come from NASA's decade tables, 2021–2050 (`scripts/build-eclipse-regions.ts` → `src/data/eclipseRegions.json`, with NASA's abbreviations written out); beyond them the dates still come, without the places. Chapter 5's Mars loop is now a past example ("In 2024–25, for example, …").
- **Figures 2.5 and 3.4** start from the reader's own year ("Today"), not 2026.
- **A register of facts that go out of date** (`src/data/asOf.ts`): moon counts, the interstellar visitors, the ISS's orbit, the numbered asteroids, Gaia DR4's date and measured ΔT, each with the month it was last checked, where it lives, where to check it and how often (6–24 months). The pages' "as of" dates come from it; `tests/dated.test.tsx` fails when one is overdue, and when NASA's eclipse regions run less than ten years ahead. Chapter 8's interstellar visitors sentence is built from the data, with its date. `CLAUDE.md`'s facts convention says so.
- **Fixed on the way**: Chapter 1's Voyager sentence sat outside any paragraph in the HTML; it and the eclipse sentence are now paragraphs.
- Checked: NASA's 2021–2050 tables agree with the eclipse finder on every central solar eclipse's type and every total lunar eclipse (9 April 2043 is total but not central); the next total solar eclipses after 27 October 2026 are 2 August 2027 (6 min 23 s), 22 July 2028 and 25 November 2030, the next total lunar eclipse 31 December 2028, and Mars's next oppositions 19 February 2027 and 25 March 2029.
- Tests: 566 unit and 128 end-to-end tests pass.

**Next: Stage 9, Part II research and detailed plan** (§3 and §11): write `docs/part2/research.md` and `docs/part2/plan.md` for Part II's chapters, the Star Forge v1 and its Toolkit pages, and agree them before building.

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

**Navigation and routing.** A sidebar (grouped by part, collapsible), chapters loaded on demand, reading progress remembered in the browser, and error boundaries around every figure. Since Stage 3b every page has a real address with its own prerendered HTML, such as `/the-turning-sky/#where-you-stand-changes-the-sky` (the other explainers use `#/` hash URLs, which search engines can't tell apart). Part pages are `/part-1/` and so on, the labs `/orrery/` and `/star-forge/`, and Toolkit pages `/toolkit/<slug>/`. Chapters are numbered 1–31 straight through, so "see Chapter 14" is unambiguous. Sections and figures are numbered by chapter (Figure 7.3). Nothing is locked: readers can jump anywhere.

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

Exactly like the other explainers: a private, encrypted S3 bucket readable only by CloudFront through Origin Access Control, HTTPS only, hashed assets cached for a year and the pages' HTML never cached, and `npm run deploy` to build, upload and invalidate. It is a **new stack**, `ClockworkSkySite`, in the same account and region (`default` profile, `us-east-1`). It gets a certificate and an alias record for **sky.moving-parts.dev** in the existing `moving-parts.dev` hosted zone, as Beyond Dijkstra's `infra/lib/site-stack.ts` does.

Since Stage 3b every page is a prerendered folder (`/the-moon/index.html`). A CloudFront Function on viewer requests sends any other host name (the `*.cloudfront.net` address) to sky.moving-parts.dev, adds a missing trailing slash, drops a typed `index.html` (all 301s, in one hop) and serves `/the-moon/` from `/the-moon/index.html`. An address with no page gets the prerendered `404.html` with a 404 status.

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
| 3b | — | **Search engines:** real paths, prerendered pages, head tags, structured data, sitemap, a CloudFront Function | Every page has its own HTML ✔ |
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
