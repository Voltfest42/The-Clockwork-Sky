/**
 * Cepheids for Chapter 17's Leavitt's law (Figure 17.4).
 *
 * LEAVITT: Table I of Harvard College Observatory Circular 173 (Leavitt &
 * Pickering, 3 March 1912), "Periods of 25 variable stars in the Small
 * Magellanic Cloud", read from the scan in NASA's Astrophysics Data System
 * (1912HarCi.173....1L) on 30 Oct 2026. Public domain. For each star: its
 * Harvard number, its photographic magnitudes at maximum and minimum on the
 * provisional scale of the time, and its period in days.
 *
 * MILKY_WAY: two nearby Cepheids with distances measured by parallax, for
 * the distance calculator: periods and mean V magnitudes (GCVS), reddenings,
 * and distances from the Hubble Space Telescope's parallaxes (Benedict et al.
 * 2002, AJ 124, 1695, for δ Cephei; Benedict et al. 2007, AJ 133, 1810, for
 * ℓ Carinae).
 */

export interface LeavittStar {
  /** Harvard number. */
  h: number;
  /** Photographic magnitudes at maximum and minimum light. */
  max: number;
  min: number;
  /** Period, days. */
  period: number;
}

export const LEAVITT: readonly LeavittStar[] = [
  { h: 1505, max: 14.8, min: 16.1, period: 1.25336 },
  { h: 1436, max: 14.8, min: 16.4, period: 1.6637 },
  { h: 1446, max: 14.8, min: 16.4, period: 1.762 },
  { h: 1506, max: 15.1, min: 16.3, period: 1.87502 },
  { h: 1413, max: 14.7, min: 15.6, period: 2.17352 },
  { h: 1460, max: 14.4, min: 15.7, period: 2.913 },
  { h: 1422, max: 14.7, min: 15.9, period: 3.501 },
  { h: 842, max: 14.6, min: 16.1, period: 4.2897 },
  { h: 1425, max: 14.3, min: 15.3, period: 4.547 },
  { h: 1742, max: 14.3, min: 15.5, period: 4.9866 },
  { h: 1646, max: 14.4, min: 15.4, period: 5.311 },
  { h: 1649, max: 14.3, min: 15.2, period: 5.323 },
  { h: 1492, max: 13.8, min: 14.8, period: 6.2926 },
  { h: 1400, max: 14.1, min: 14.8, period: 6.65 },
  { h: 1355, max: 14.0, min: 14.8, period: 7.483 },
  { h: 1374, max: 13.9, min: 15.2, period: 8.397 },
  { h: 818, max: 13.6, min: 14.7, period: 10.336 },
  { h: 1610, max: 13.4, min: 14.6, period: 11.645 },
  { h: 1365, max: 13.8, min: 14.8, period: 12.417 },
  { h: 1351, max: 13.4, min: 14.4, period: 13.08 },
  { h: 827, max: 13.4, min: 14.3, period: 13.47 },
  { h: 822, max: 13.0, min: 14.6, period: 16.75 },
  { h: 823, max: 12.2, min: 14.1, period: 31.94 },
  { h: 824, max: 11.4, min: 12.8, period: 65.8 },
  { h: 821, max: 11.2, min: 12.1, period: 127.0 },
];

/** Leavitt's own summary: the logarithm of the period grows by about 0.48 for each magnitude brighter. */
export const LEAVITT_SLOPE = 0.48;

export interface MilkyWayCepheid {
  id: string;
  name: string;
  /** Period, days. */
  period: number;
  /** Mean apparent V magnitude, and the range. */
  meanV: number;
  range: [number, number];
  /** Dimming by dust, magnitudes (A_V = 3.1 E(B − V)). */
  av: number;
  /** Distance by parallax, parsecs. */
  parallaxDistance: number;
  note: string;
}

export const MILKY_WAY: readonly MilkyWayCepheid[] = [
  { id: 'delta-cep', name: 'δ Cephei', period: 5.366, meanV: 3.95, range: [3.48, 4.37], av: 0.23, parallaxDistance: 273, note: 'the first of its kind, found by John Goodricke in 1784' },
  { id: 'ell-car', name: 'ℓ Carinae', period: 35.56, meanV: 3.72, range: [3.28, 4.18], av: 0.52, parallaxDistance: 498, note: 'a bright southern Cepheid with one of the longest periods visible to the eye' },
];

/** Benedict et al. (2007)'s calibration from HST parallaxes of ten Milky Way Cepheids: M_V = −2.43 (log P − 1) − 4.05. */
export const PL_V = { slope: -2.43, zero: -4.05 } as const;
