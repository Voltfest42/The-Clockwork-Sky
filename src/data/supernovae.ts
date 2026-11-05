/**
 * Two supernovae to hold Arnett's model against (Chapter 25), as the measured
 * numbers their papers give rather than whole light curves (the plan's
 * fallback, §13 question 5: the bolometric light curves' terms of use are
 * unclear). Luminosities in W, times in days after the explosion, masses in M☉.
 *
 * - SN 2011fe, a Type Ia in M101, 6.4 Mpc away: its bolometric light curve
 *   peaked at 1.17 × 10⁴³ erg/s, 16.58 ± 0.14 days after the explosion
 *   (Pereira et al. 2013, A&A 554, A27, from the Nearby Supernova Factory's
 *   spectrophotometry), and Arnett's rule gives 0.53 ± 0.11 M☉ of nickel-56.
 * - SN 1987A, a Type II in the Large Magellanic Cloud, 50 kpc away: its second
 *   maximum, about 85 days after the explosion, reached 10^41.90 erg/s (the
 *   bolometric curve of Hamuy et al. 1988, revised by Taddia et al. 2012, A&A
 *   537, A140); its radioactive tail needs 0.069 M☉ of nickel-56 (Bouchet et
 *   al. 1991, A&A 245, 490; Seitenzahl et al. 2014 fit 0.071 ± 0.003).
 *
 * Facts, cited; checked 5 Nov 2026.
 */

export interface MeasuredSupernova {
  id: string;
  name: string;
  type: string;
  /** Peak luminosity (W) and the day it came. */
  peak: { L: number; day: number };
  /** The nickel-56 its light needs (M☉), and how that was found. */
  nickel: { mass: number; error: number; how: string };
  where: string;
}

export const SN_2011FE: MeasuredSupernova = {
  id: 'sn2011fe',
  name: 'SN 2011fe',
  type: 'Ia',
  peak: { L: 1.17e36, day: 16.58 },
  nickel: { mass: 0.53, error: 0.11, how: 'from its peak, by Arnett’s rule' },
  where: 'the galaxy M101, 21 million light years away',
};

export const SN_1987A: MeasuredSupernova = {
  id: 'sn1987a',
  name: 'SN 1987A',
  type: 'II',
  peak: { L: 10 ** 41.9 * 1e-7, day: 85 },
  nickel: { mass: 0.069, error: 0.003, how: 'from its radioactive tail' },
  where: 'the Large Magellanic Cloud, 160,000 light years away',
};

export const MEASURED_SUPERNOVAE: readonly MeasuredSupernova[] = [SN_2011FE, SN_1987A];
