/**
 * White dwarfs whose masses and radii are both measured (Chapter 24), for the
 * mass–radius curve. Masses in M☉, radii in R☉, with one-sigma errors.
 *
 * - Sirius B: mass from its orbit (Bond et al. 2017, ApJ 840, 70), radius from
 *   its spectrum and distance (as tabulated by Romero et al. 2019, MNRAS 484,
 *   2711, after Joyce et al. 2018, MNRAS 481, 2361).
 * - Procyon B: Bond et al. (2015), ApJ 813, 106.
 * - 40 Eridani B: mass from the orbit of Mason et al. (2017), radius by Bond
 *   et al. (2017), ApJ 848, 16.
 * - ZTF J1901+1458: Caiazzo et al. (2021), Nature 595, 39: 1.327–1.365 M☉
 *   depending on its make-up, 2,140 (+160, −230) km, the size of the Moon.
 *
 * Facts, cited; checked 5 Nov 2026.
 */

export interface MeasuredWhiteDwarf {
  id: string;
  name: string;
  mass: number;
  massError: number;
  radius: number;
  radiusError: number;
}

const KM = 1 / 695_700;

export const MEASURED_WHITE_DWARFS: readonly MeasuredWhiteDwarf[] = [
  { id: 'sirius-b', name: 'Sirius B', mass: 1.018, massError: 0.011, radius: 0.008098, radiusError: 0.000046 },
  { id: 'procyon-b', name: 'Procyon B', mass: 0.592, massError: 0.006, radius: 0.01232, radiusError: 0.00032 },
  { id: '40-eri-b', name: '40 Eridani B', mass: 0.573, massError: 0.018, radius: 0.01308, radiusError: 0.0002 },
  { id: 'ztf-j1901', name: 'ZTF J1901+1458', mass: 1.346, massError: 0.019, radius: 2140 * KM, radiusError: 195 * KM },
];
