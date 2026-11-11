/**
 * Record holders among the stars, which change as new ones are found or old
 * ones re-measured. Registered in asOf.ts ("records"); the chapters take their
 * values from here.
 */

/** The month the records were last checked, as the pages show it. */
export const RECORDS_AS_OF = 'November 2026';

/** The heaviest star known: R136a1 in the Tarantula Nebula (Kalari et al. 2022: 170–230 M☉; earlier estimates 250–320). */
export const HEAVIEST_STAR = { name: 'R136a1', where: 'the Tarantula Nebula in the Large Magellanic Cloud', mass: 200, range: '170 to 230' } as const;

/** The coldest brown dwarf known: WISE 0855−0714, about 285 K, 2.28 pc away (Luhman 2014). */
export const COLDEST_BROWN_DWARF = { name: 'WISE 0855−0714', kelvin: 285, lightYears: 7.4 } as const;

/** The nearest brown dwarfs: the pair Luhman 16 AB, 2.0 pc away (Luhman 2013). */
export const NEAREST_BROWN_DWARFS = { name: 'Luhman 16', lightYears: 6.5 } as const;

/** The heaviest neutron star measured well: PSR J0952−0607, 2.35 ± 0.17 M☉ (Romani et al. 2022), spinning 707 times a second. */
export const HEAVIEST_NEUTRON_STAR = { name: 'PSR J0952−0607', mass: 2.35, error: 0.17 } as const;

/** The heaviest black hole known from a star in our Galaxy: Gaia BH3, 33 M☉, 590 pc away (Gaia Collaboration, Panuzzo et al. 2024). */
export const HEAVIEST_GALACTIC_BLACK_HOLE = { name: 'Gaia BH3', mass: 33, parsecs: 590 } as const;

/** The heaviest white dwarf measured well: ZTF J1901+1458, 1.327–1.365 M☉ and 2,140 km across its radius, about the Moon's size (Caiazzo et al. 2021). */
export const HEAVIEST_WHITE_DWARF = { name: 'ZTF J1901+1458', mass: '1.33–1.37', radiusKm: 2140 } as const;

/** The fastest-spinning pulsar known: PSR J1748−2446ad in the globular cluster Terzan 5, 716 turns a second (Hessels et al. 2006). */
export const FASTEST_PULSAR = { name: 'PSR J1748−2446ad', hertz: 716 } as const;

/** The heaviest merger heard: GW231123, two fast-spinning black holes of about 137 and 101 M☉ at the source, 190–265 M☉ in all (LVK 2025, arXiv:2507.08219; GWOSC's GWTC-4.1). */
export const HEAVIEST_MERGER = { name: 'GW231123', total: '190–265' } as const;

/** The loudest merger heard: GW250114, two black holes of about 34 and 32 M☉, with a signal-to-noise ratio of about 80 (LVK 2025, Phys. Rev. Lett. 135). */
export const LOUDEST_MERGER = { name: 'GW250114', snr: 80 } as const;
