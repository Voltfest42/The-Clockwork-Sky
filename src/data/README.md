# Data files

Compact data files used by the course, built by the scripts in `scripts/` from raw downloads. Raw downloads go to `scripts/.cache/` and are not committed. Every file here is listed below with its source and licence, and credited on the site's About page.

Files under a share-alike licence (such as the HYG star catalogue, CC BY-SA 4.0) are kept separate from the rest and marked as such.

| File | Contents | Source | Licence | Built by |
|---|---|---|---|---|
| `hyg/stars.json` | The 8,920 stars to visual magnitude 6.5: ICRS position at J2000.0, proper motion, parallax, radial velocity, V magnitude, B−V, Hipparcos number, proper names and Bayer/Flamsteed designations. About 176 kB gzipped. | HYG database v4.4, David Nash, [astronexus.com/hyg](https://astronexus.com/hyg) | **CC BY-SA 4.0** (share-alike; see `hyg/README.md`) | `scripts/build-stars.ts` |
| `constellations.json` | The stick figures of the 88 constellations (Serpens in two parts), with every vertex matched to a star in `hyg/stars.json`; names and label positions; IAU boundaries. About 13 kB gzipped. | [d3-celestial](https://github.com/ofrohn/d3-celestial), © 2015 Olaf Frohn: figures after the IAU charts with Frohn's edits; boundaries from Davenhall & Leggett (1989), VizieR VI/49 | BSD 3-Clause (notice kept in the file) | `scripts/build-constellations.ts` |
| `milkyway.json` | The Milky Way's brightness on a 1° grid in right ascension and declination, from its five outline levels, smoothed with a 2° Gaussian. About 3 kB gzipped. | d3-celestial's `mw.json`, outline after J. R. Vieira | BSD 3-Clause (notice kept in the file) | `scripts/build-constellations.ts` |
| `places.ts` | Cities for the sky figures, the poles and a point on the equator: rounded coordinates and IANA time-zone names | Rounded public coordinates | — | by hand |

The test fixture `tests/fixtures/horizons.json` (geocentric astrometric positions of the Sun, the Moon and the planets at 42 dates from 3000 BC to AD 3000) comes from NASA JPL's Horizons system (DE441), a public service, and is fetched by `scripts/fetch-horizons.ts`.

The test fixture `tests/fixtures/eclipses.json` (every solar and lunar eclipse from 1900 to 2100: date and time of greatest eclipse, Saros series, type, gamma and magnitudes) comes from NASA's *Five Millennium Catalogs of Solar and Lunar Eclipses* by Fred Espenak, and is fetched by `scripts/fetch-eclipses.ts`. NASA allows the data to be reproduced with the acknowledgment **"Eclipse Predictions by Fred Espenak (NASA's GSFC)"**, which the file carries. The site itself doesn't ship it: its eclipses come from the course's own eclipse finder, which the fixture tests.

## Values in the code

Some small tables of published values live in the code itself, next to the formulas that use them:

| Where | What | Source |
|---|---|---|
| `src/core/time/deltaT.ts` | ΔT polynomials, and measured ΔT on 1 January of 2005–2026 | Espenak & Meeus (2006), NASA/TP-2006-214141; IERS and USNO Earth-orientation data |
| `src/core/constants.ts` | Physical constants and nominal solar and terrestrial values | SI definitions; CODATA 2018; IAU 2012 Resolution B2 and IAU 2015 Resolutions B2 and B3 |
| `src/core/ephemeris/meanLongitude.ts` | Mean longitudes and semi-major axes of the planets, 1800–2050; the Moon's mean longitude | Standish, *Keplerian Elements for Approximate Positions of the Major Planets* (JPL SSD), Table 1; Meeus (1998) 47.1 |
| `src/core/ephemeris/planets.ts` | The planets' Keplerian elements and rates, Tables 1, 2a and 2b; the giant planets' masses | Standish & Williams (1992), as published by JPL SSD ("Approximate Positions of the Planets"); IAU 2009 / DE430 mass ratios |
| `src/core/ephemeris/sun.ts`, `moon.ts` | The low-accuracy solar theory; the 60 + 60 largest periodic terms of ELP-2000/82 (Tables 47.A and 47.B) | Meeus (1998), chapters 25 and 47 (cross-checked against S. Keys's MIT-licensed Go port) |
| `src/core/ephemeris/bodies.ts` | Planets' visual magnitude formulas; bodies' radii; the Earth–Moon mass ratio | *Astronomical Almanac* 1984, via Meeus (1998) ch. 41; NASA Planetary Fact Sheets; DE430 |
| `src/data/orbits.ts` | Semi-major axes, eccentricities and periods for Figure 6.3: the planets from Standish's Table 1; five dwarf planets and three comets; Jupiter's four large moons | JPL Small-Body Database (osculating elements, fetched 24 Oct 2026); JPL planetary satellite mean elements (semi-major axes) and NASA's Jovian satellite fact sheet (sidereal periods) |
| `src/data/timeline.ts` | The history timeline of Part I | The Part I research brief (`docs/part1/research.md` §6 and §13) |
| `src/core/orbits/ptolemy.ts` | Ptolemy's proportions for Mars (epicycle 39½, eccentricity 6, deferent 60) | Ptolemy, *Almagest*, book X |
| `src/core/ephemeris/lunation.ts` | The mean lunation and the periodic terms for new Moon, full Moon and the quarters, with the 14 planetary arguments | Meeus (1998), chapter 49 |
| `src/core/ephemeris/eclipses.ts` | The terms for the time of greatest eclipse, γ and u, and the eclipse limits; reference eclipses for Saros numbering | Meeus (1998), chapter 54; Saros numbers as in NASA's catalogues (van den Bergh's numbering) |
| `src/core/ephemeris/seasons.ts`, `src/core/sky/sunlight.ts` | Aberration and nutation corrections to the Sun's longitude; the Sun's rising altitude; sunlight at 1 AU from the nominal solar luminosity | Meeus (1998), chapters 15, 25 and 27; IAU 2015 B3 |
| `src/core/ephemeris/moon.ts` (node) | The longitude of the Moon's mean ascending node | Meeus (1998), 47.7 |
| `src/core/coords/precession.ts` | Long-term precession of the ecliptic and the equator: polynomial and periodic coefficients | Vondrák, Capitaine & Wallace (2011), *A&A* 534, A22 (erratum 541, C1), as coded in ERFA's `eraLtpecl` and `eraLtpequ` (BSD 3-Clause) |
| `src/core/coords/refraction.ts` | Bennett's and Sæmundsson's refraction formulas | Bennett (1982); Sæmundsson (1986); Meeus (1998) ch. 16 |
| `src/core/stars/photometry.ts` | B−V to temperature; fits to the CIE 1931 colour-matching functions; sRGB matrix | Ballesteros (2012); Wyman, Sloan & Shirley (2013); IEC 61966-2-1 |
| `src/core/coords/galactic.ts` | The equatorial-to-galactic rotation | ESA (1997), *The Hipparcos and Tycho Catalogues*, vol. 1, §1.5.3 |
| `src/data/scale.ts` | Diameters of the Sun, planets and Moon; the Moon's distance; the asteroid belt, Kuiper belt, heliopause and Oort cloud; Voyager 1 (**as of 18 Nov 2026**); nearby and famous stars; the Milky Way; the football pitch, the Kármán line and the ISS (**altitude as of 2026**) | NASA Planetary Fact Sheets; IAU 2015 B3; NASA's Voyager announcement of 17 Jun 2026 (the Sun distance is computed from it); Gaia DR3 (Proxima), Hipparcos (bright stars), SIMBAD positions; Boyajian et al. 2012 (red-dwarf radii); Joyce et al. 2020 (Betelgeuse); Menten et al. 2007 (Orion Nebula); GRAVITY 2019 and 2021 (Galactic Centre); FIFA Laws of the Game (pitch); 2020 China–Nepal survey (Everest) |
| `src/data/everyday.ts` | Typical sizes of everyday things and great-circle distances between cities, for the scale model | Rounded typical values |

The values in `src/data/scale.ts`, `src/data/everyday.ts` and `src/data/places.ts` are public facts, not copyrightable data files, so they carry no licence of their own.
