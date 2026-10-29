# X-shooter Spectral Library (CC BY 4.0)

`spectra.json` holds ten real stellar spectra for Chapter 12 (Figure 12.3), one or two of each class from O to M, plus a metal-poor star: 29 CMa (O7 Ia), λ Lep (B0.5 IV), HD 166283 (A1 V), HD 184571 (F5 V), HD 13043 (G2 V), HD 140283 (metal-poor F9–G0 IV), HD 16160 (K3 V), Alphard (K3 III), HD 119850 (M2 V) and Betelgeuse (M1–2 Ia). Spectral types are SIMBAD's (queried through its Harvard mirror on 29 Oct 2026); the temperatures in the file are approximate.

The spectra are from the **X-shooter Spectral Library, Data Release 2** (A. Gonneau and colleagues 2020, *A&A* 634, A133), downloaded from the ESO Science Archive Facility on 29 Oct 2026. Data from ESO's archive are licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/) (ESO's data access policy). Credit: "Based on observations collected at the European Southern Observatory." The course's file is a derived work: each star's UVB and VIS arms are joined (blended over 547–555 nm, where they overlap cleanly), averaged into 0.4 nm bins from 370 to 800 nm and scaled so the brightest bin is 1000. The spectra are in the stars' rest frames, with air wavelengths, and are not corrected for reddening.

It is built by `scripts/build-spectra.ts`.
