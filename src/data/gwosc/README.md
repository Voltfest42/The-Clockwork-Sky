# Gravitational-wave data from GWOSC

Files in this folder are derived from data released by the **Gravitational Wave Open Science Center** (GWOSC, [gwosc.org](https://gwosc.org)) and are licensed under the **Creative Commons Attribution 4.0 International License** ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), as GWOSC's data are. They are kept apart from the course's other data for that reason.

Built by `node scripts/fetch-gwtc.ts` (raw downloads in `scripts/.cache/gwosc/`, not committed):

- `events.json`: GWOSC's cumulative catalogue of compact-binary mergers ([gwosc.org/eventapi/csv/GWTC/](https://gwosc.org/eventapi/csv/GWTC/)), fetched 11 Nov 2026: 391 events from GWTC-1, GWTC-2.1, GWTC-3, GWTC-4.1 and GWTC-5.0, with each event's masses at the source, chirp mass, remnant mass, luminosity distance and effective spin (median and 90% credible interval, as GWOSC lists them), redshift, network signal-to-noise ratio and probability of being astrophysical. Changes: columns renamed and shortened; the catalogue name's "-confident" dropped; each event's observing run added (O4's catalogues by catalogue, the earlier ones by date). Nothing else is altered.
- `gw150914.json`: two seconds of GW150914's strain from LIGO Hanford (H1) and Livingston (L1), from GWOSC's 32-second, 4,096 Hz files (`H-H1_GWOSC_4KHZ_R1-1126259447-32`, `L-L1_GWOSC_4KHZ_R1-1126259447-32`, event version v3), and each detector's noise amplitude spectral density from 20 to 400 Hz. Changes: the noise spectrum estimated from the whole 32 s (Welch's method, 4 s Hann segments); the strain whitened by it and band-passed between 35 and 350 Hz; cut to 1.5 s before and 0.5 s after the event's time (GPS 1126259462.4); halved to 2,048 samples a second; divided by the whitened noise's standard deviation and rounded to two decimals.

## Credit

Please cite:

- The LIGO Scientific Collaboration, the Virgo Collaboration and the KAGRA Collaboration, "Open Data from LIGO, Virgo, and KAGRA through the Second Part of the Fourth Observing Run", arXiv:2605.27090 (for the catalogue through O4b);
- R. Abbott et al. (LIGO Scientific Collaboration and Virgo Collaboration), "Open data from the first and second observing runs of Advanced LIGO and Advanced Virgo", SoftwareX 13 (2021) 100658 (for GW150914's strain).

GWOSC's acknowledgement, in full:

> This research has made use of data or software obtained from the Gravitational Wave Open Science Center (gwosc.org), a service of the LIGO Scientific Collaboration, the Virgo Collaboration, and KAGRA. This material is based upon work supported by NSF's LIGO Laboratory which is a major facility fully funded by the National Science Foundation, as well as the Science and Technology Facilities Council (STFC) of the United Kingdom, the Max-Planck-Society (MPS), and the State of Niedersachsen/Germany for support of the construction of Advanced LIGO and construction and operation of the GEO600 detector. Additional support for Advanced LIGO was provided by the Australian Research Council. Virgo is funded, through the European Gravitational Observatory (EGO), by the French Centre National de Recherche Scientifique (CNRS), the Italian Istituto Nazionale di Fisica Nucleare (INFN) and the Dutch Nikhef, with contributions by institutions from Belgium, Germany, Greece, Hungary, Ireland, Japan, Monaco, Poland, Portugal, Spain. KAGRA is supported by Ministry of Education, Culture, Sports, Science and Technology (MEXT), Japan Society for the Promotion of Science (JSPS) in Japan; National Research Foundation (NRF) and Ministry of Science and ICT (MSIT) in Korea; Academia Sinica (AS) and National Science and Technology Council (NSTC) in Taiwan.
