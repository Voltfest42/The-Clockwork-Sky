# Gaia (non-commercial)

`hr.json` is the Hertzsprung–Russell diagram of the stars within 100 parsecs for Chapter 13 (Figure 13.2): Gaia's colour G_BP − G_RP against absolute magnitude M_G, as the number of stars in each cell of a grid, every star within 20 parsecs, and a seeded sample of 3,000 of the rest.

It is made from **Gaia Data Release 3** (ESA/Gaia/DPAC, 2022), queried from the Gaia archive (`gaiadr3.gaia_source`) on 29 Oct 2026: stars with parallax > 10 mas, parallax_over_error > 10, a G_BP − G_RP colour, RUWE < 1.4 and a BP/RP flux excess between 1.0 + 0.015 (G_BP − G_RP)² and 1.3 + 0.06 (G_BP − G_RP)² (the clean-sample cut of Gaia Collaboration, Babusiaux et al. 2018). 238,209 stars pass.

Gaia's data are licensed under the [Creative Commons Attribution-NonCommercial 3.0 IGO License](https://creativecommons.org/licenses/by-nc/3.0/igo/). This file is a derived work and is shared under the same licence. It is kept in this folder, apart from the course's other files, so the licence is clear. Credit: "This work has made use of data from the European Space Agency (ESA) mission Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC)."

It is built by `scripts/build-hr.ts`; the units are recorded in the file itself.
