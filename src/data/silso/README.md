# Sunspots (SILSO: non-commercial)

`sunspots.json` is the sunspot record for Chapter 15 (Figure 15.2 and the Check yourself question): the monthly mean total sunspot number from January 1749, its 13-month smoothed version, and the dates and smoothed heights of every cycle's minimum and maximum, all version 2 of the series.

**Source:** WDC-SILSO, Royal Observatory of Belgium, Brussels (doi 10.24414/qnza-ac80): `SN_m_tot_V2.0.csv`, `SN_ms_tot_V2.0.csv` and the table of cycle minima and maxima at sidc.be/SILSO, fetched 29 Oct 2026 (the record runs to September 2026; the last few months are provisional, and the file marks where that starts). SILSO's data are shared under the [Creative Commons Attribution-NonCommercial 4.0 licence](https://creativecommons.org/licenses/by-nc/4.0/), and so is this file, kept in this folder apart from the course's other files. SILSO's daily *estimated* numbers aren't used, as SILSO asks.

`butterfly.json` is the butterfly diagram: for each solar (Carrington) rotation from number 275 (1874) to 2315 (2026), the sunspot area in 50 bands of latitude, equal in sin(latitude), from the south pole to the north, stored as a level from 0 (none) to 15 (each step twice the area). **Source:** the Royal Greenwich Observatory (1874–1976) and USAF/NOAA (from 1977) sunspot-group records, compiled by David Hathaway (`bflydata.txt` at solarcyclescience.com, formerly NASA Marshall Space Flight Center; areas after 1976 multiplied by 1.4 to match Greenwich's). These are US and UK government records, credited here and on the About page; they are not under SILSO's licence, but sit beside its file because they belong to the same figure.

Both are built by `scripts/build-sunspots.ts`.
