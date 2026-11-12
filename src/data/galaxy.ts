import curves from './rotationCurves.json';
import sparc from './sparc/galaxies.json';
import type { MeasuredGalaxy } from '../core/galaxy/rotation';

/**
 * The Milky Way and other galaxies for Chapter 30. Structure from
 * Bland-Hawthorn & Gerhard (2016, ARA&A 54, 529) unless noted; the measured
 * rotation curves are built by scripts/build-rotation-curves.ts.
 */

export const MILKY_WAY = {
  /** The Sun's distance from the centre, kpc (GRAVITY 2019: 8.178; 2022: 8.277; the course uses 8.2). */
  sunRadius: 8.2,
  /** The Sun's height above the disc's midplane, kpc (Bennett & Bovy 2019: 20.8 pc). */
  sunHeight: 0.021,
  /** The circular speed at the Sun, km/s (Eilers et al. 2019: 229; Ou et al. 2024: 233). */
  circularSpeed: 230,
  /** The stars' total mass, M☉, and how many stars. */
  stellarMass: 5e10,
  stars: '100 to 400 billion',
  thinDisc: { scaleLength: 2.6, scaleHeight: 0.3 },
  thickDisc: { scaleLength: 2.0, scaleHeight: 0.9 },
  /** The bar: half its length (kpc), its angle to the Sun–centre line (degrees), and how fast its pattern turns (km/s per kpc). */
  bar: { halfLength: 5, angle: 27, patternSpeed: 40 },
  /** The halo's stars, M☉ (Deason et al. 2019: 1.4 × 10⁹). */
  stellarHalo: 1.4e9,
  /** Globular clusters known: Harris (2010 edition) lists 157; Vasiliev & Baumgardt (2021) about 170. */
  globularClusters: 160,
  /** The whole Galaxy's mass, dark halo included, M☉: estimates span this range. */
  totalMass: [0.5e12, 2e12] as const,
  /** Gaia–Enceladus merged with the Milky Way this many billion years ago (Helmi et al. 2018; Belokurov et al. 2018). */
  enceladus: '8 to 11',
} as const;

/**
 * The Milky Way's mass model for Figure 30.3: a Hernquist bulge (and bar), one
 * exponential disc for the thin and thick discs' stars, an exponential gas
 * disc (atomic and molecular hydrogen with helium), and an NFW dark halo. The
 * stars' 6 × 10¹⁰ M☉ and the gas's 10¹⁰ are close to McMillan's (2017)
 * 5.4 × 10¹⁰ and 1.2 × 10¹⁰; the halo's mass is fitted to the measured curves
 * (tests/chapter30.test.ts checks it).
 */
export const MILKY_WAY_MODEL = {
  bulge: { mass: 1.0e10, scale: 0.6 },
  disc: { mass: 5.0e10, scaleLength: 2.6 },
  gas: { mass: 1.0e10, scaleLength: 5 },
  /** The best NFW halo mass for these, with the concentration simulations give it (fitted to Eilers et al. and Ou et al. together). */
  haloMass: 1.35e12,
} as const;

/** The Milky Way's circular speed against radius (kpc, km/s, with the lower and upper uncertainties). */
export interface MeasuredCurve {
  name: string;
  source: string;
  r: readonly number[];
  v: readonly number[];
  lo: readonly number[];
  hi: readonly number[];
}

export const MILKY_WAY_CURVES: readonly MeasuredCurve[] = [
  { name: 'Eilers et al. 2019', source: 'Eilers, Hogg, Rix & Ness 2019, ApJ 871, 120 (Table 1)', ...curves.eilers2019 },
  { name: 'Ou et al. 2024', source: 'Ou, Eilers, Necib & Frebel 2024, MNRAS 528, 693 (Table 1)', ...curves.ou2024 },
];

/** Galaxies from SPARC (Lelli, McGaugh & Schombert 2016), with their luminosity at 3.6 µm (L☉). */
export const SPARC_GALAXIES: readonly (MeasuredGalaxy & { id: string; luminosity: number })[] = sparc;

/**
 * The argument over the Milky Way's dark mass, as of the date checked
 * (registered in asOf.ts as "rotationCurve").
 */
export const ROTATION_DEBATE = {
  asOf: 'November 2026',
  /** Jiao et al. 2023 (A&A 678, A208): a Keplerian fall from 19 to 26.5 kpc, and the Galaxy's whole mass. */
  jiao: { mass: 2.06e11, from: 19, to: 26.5 },
  /** Ou et al. 2024: the speed from about 230 km/s at 5 kpc to about 170 at 28 kpc. */
  ou: { from: 230, to: 173, at: 27.3 },
} as const;
