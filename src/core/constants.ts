/**
 * Physical and astronomical constants, in SI units.
 *
 * Exact values are definitions. The solar and terrestrial values are the IAU
 * 2015 nominal values (Resolution B3), which are conversion constants rather
 * than measurements of the real, slightly variable Sun and Earth.
 */

/** Speed of light in vacuum, m/s. Exact (SI definition of the metre). */
export const C = 299_792_458;

/** Newtonian constant of gravitation, m³ kg⁻¹ s⁻² (CODATA 2018 and 2022). Known to about 2 parts in 100,000. */
export const G = 6.674_3e-11;

/** Astronomical unit, m. Exact (IAU 2012 Resolution B2). */
export const AU = 149_597_870_700;

/** The Sun's gravitational parameter G·M, m³/s² (IAU 2015 nominal). Known far better than G or M separately. */
export const GM_SUN = 1.327_124_4e20;

/** The Sun's mass, kg, from GM_SUN / G (about 1.989 × 10³⁰ kg). */
export const M_SUN = GM_SUN / G;

/** The Sun's radius, m (IAU 2015 nominal). */
export const R_SUN = 6.957e8;

/** The Sun's luminosity, W (IAU 2015 nominal). */
export const L_SUN = 3.828e26;

/** Earth's gravitational parameter G·M, m³/s² (IAU 2015 nominal). */
export const GM_EARTH = 3.986_004e14;

/** Earth's mass, kg, from GM_EARTH / G (about 5.972 × 10²⁴ kg). */
export const M_EARTH = GM_EARTH / G;

/** Earth's equatorial radius, m (IAU 2015 nominal). */
export const R_EARTH_EQUATOR = 6.378_1e6;

/** Earth's polar radius, m (IAU 2015 nominal). */
export const R_EARTH_POLE = 6.356_8e6;

/** Earth's mean radius, m (IUGG). */
export const R_EARTH = 6.371_0e6;

/** The Moon's mean radius, m. */
export const R_MOON = 1.737_4e6;
