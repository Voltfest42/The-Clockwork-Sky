# SPARC rotation curves

`galaxies.json` holds five galaxies from **SPARC** (Spitzer Photometry and Accurate Rotation Curves): NGC 3198, NGC 2403, NGC 6503, UGC 2885 and DDO 154. For each: its distance (Mpc), its luminosity at 3.6 µm (L☉), and at each radius (kpc) the measured rotation speed and its error, and the speeds its gas, stellar disc and bulge alone would give (km/s; the stars' for a mass-to-light ratio of 1 M☉/L☉ at 3.6 µm).

Built by `scripts/build-rotation-curves.ts` from SPARC's `Rotmod_LTG.zip` and `SPARC_Lelli2016c.mrt` (https://astroweb.cwru.edu/SPARC/).

SPARC's site asks users to cite the paper and states no licence. The course uses these few galaxies, cited, under its fair use for teaching (Part III plan §13, question 6):

> Lelli, F., McGaugh, S. S. & Schombert, J. M. 2016, "SPARC: Mass Models for 175 Disk Galaxies with Spitzer Photometry and Accurate Rotation Curves", *The Astronomical Journal* 152, 157.

The rotation curves themselves come from the radio and optical surveys SPARC compiled; the files name them per galaxy (Begeman 1989 and others).
