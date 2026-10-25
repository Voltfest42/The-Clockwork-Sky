# Stars (share-alike)

`stars.json` holds the 8,920 stars of visual magnitude 6.5 or brighter from the **HYG database, version 4.4**, by David Nash ([astronexus.com/hyg](https://astronexus.com/hyg), [codeberg.org/astronexus/hyg](https://codeberg.org/astronexus/hyg)), which combines the Hipparcos, Yale Bright Star and Gliese catalogues.

The HYG database is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/). This file is a derived work (a subset of the stars and columns, rounded and repacked) and is shared under the same licence. It is kept in this folder, apart from the course's other files, so the licence is clear.

`neighbours.json` holds the 323 stars of the same database within 10 parsecs of the Sun, for Figure 9.2: positions (ICRS equatorial, parsecs), visual and absolute magnitudes, B−V, spectral type, name, Gliese number and a class (O–M, or D for a white dwarf; estimated from colour for the few with no spectral type). It is a derived work under the same licence.

They are built by `scripts/build-stars.ts` and `scripts/build-neighbours.ts`; the units of each column are recorded in the files themselves.
