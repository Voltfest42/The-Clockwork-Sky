# Data files

Compact data files used by the course, built by the scripts in `scripts/` from raw downloads. Raw downloads go to `scripts/.cache/` and are not committed. Every file here is listed below with its source and licence, and credited on the site's About page.

Files under a share-alike licence (such as the HYG star catalogue, CC BY-SA 4.0) are kept separate from the rest and marked as such.

| File | Contents | Source | Licence | Built by |
|---|---|---|---|---|
| *(none yet)* | The first data files (stars and constellations) arrive in Stage 3. | | | |

## Values in the code

Some small tables of published values live in the code itself, next to the formulas that use them:

| Where | What | Source |
|---|---|---|
| `src/core/time/deltaT.ts` | ΔT polynomials, and measured ΔT on 1 January of 2005–2026 | Espenak & Meeus (2006), NASA/TP-2006-214141; IERS and USNO Earth-orientation data |
| `src/core/constants.ts` | Physical constants and nominal solar and terrestrial values | SI definitions; CODATA 2018; IAU 2012 Resolution B2 and IAU 2015 Resolutions B2 and B3 |
| `src/core/ephemeris/meanLongitude.ts` | Mean longitudes and semi-major axes of the planets, 1800–2050; the Moon's mean longitude | Standish, *Keplerian Elements for Approximate Positions of the Major Planets* (JPL SSD), Table 1; Meeus (1998) 47.1 |
| `src/core/coords/galactic.ts` | The equatorial-to-galactic rotation | ESA (1997), *The Hipparcos and Tycho Catalogues*, vol. 1, §1.5.3 |
| `src/data/scale.ts` | Diameters of the Sun, planets and Moon; the Moon's distance; the asteroid belt, Kuiper belt, heliopause and Oort cloud; Voyager 1 (**as of 18 Nov 2026**); nearby and famous stars; the Milky Way; the football pitch, the Kármán line and the ISS (**altitude as of 2026**) | NASA Planetary Fact Sheets; IAU 2015 B3; NASA's Voyager announcement of 17 Jun 2026 (the Sun distance is computed from it); Gaia DR3 (Proxima), Hipparcos (bright stars), SIMBAD positions; Boyajian et al. 2012 (red-dwarf radii); Joyce et al. 2020 (Betelgeuse); Menten et al. 2007 (Orion Nebula); GRAVITY 2019 and 2021 (Galactic Centre); FIFA Laws of the Game (pitch); 2020 China–Nepal survey (Everest) |
| `src/data/everyday.ts` | Typical sizes of everyday things and great-circle distances between cities, for the scale model | Rounded typical values |

The values in `src/data/scale.ts` and `src/data/everyday.ts` are public facts, not copyrightable data files, so they carry no licence of their own.
