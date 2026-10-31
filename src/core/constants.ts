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

/** Jupiter's gravitational parameter G·M, m³/s² (IAU 2015 nominal). */
export const GM_JUPITER = 1.266_865_3e17;

/** Jupiter's mass, kg, from GM_JUPITER / G (about 1.898 × 10²⁷ kg, 317.8 Earths). */
export const M_JUPITER = GM_JUPITER / G;

/** Jupiter's equatorial radius, m (IAU 2015 nominal; 11.2 Earths). */
export const R_JUPITER = 7.149_2e7;

// ---------- light and heat (Part II) ----------

/** Planck's constant, J s. Exact (SI definition of the kilogram, 2019). */
export const H = 6.626_070_15e-34;

/** Boltzmann's constant, J/K. Exact (SI definition of the kelvin, 2019). */
export const K_B = 1.380_649e-23;

/** The elementary charge, C, and so one electronvolt in joules. Exact (SI, 2019). */
export const EV = 1.602_176_634e-19;

/** The Stefan–Boltzmann constant σ = 2π⁵k⁴/(15c²h³), W m⁻² K⁻⁴ (about 5.670 374 419 × 10⁻⁸; exact, since c, h and k are). */
export const SIGMA = (2 * Math.PI ** 5 * K_B ** 4) / (15 * C ** 2 * H ** 3);

/** Wien's displacement constant b: a black body's spectrum per unit wavelength peaks at b / T. m K (CODATA: 2.897 771 955 × 10⁻³). */
export const WIEN_B = 2.897_771_955e-3;

/** The Sun's effective temperature, K (IAU 2015 nominal). */
export const T_SUN = 5_772;

/** Sunlight above the air at 1 AU, the total solar irradiance, W/m² (IAU 2015 nominal; Kopp & Lean 2011). */
export const SOLAR_IRRADIANCE = 1_361;

// ---------- atoms (Part II) ----------

/** The electron's mass, kg (CODATA 2018). */
export const M_E = 9.109_383_7015e-31;

/** The proton-to-electron mass ratio (CODATA 2018). */
export const PROTON_ELECTRON_MASS_RATIO = 1_836.152_673_43;

/** The atomic mass unit (dalton), kg (CODATA 2018). */
export const AMU = 1.660_539_066_6e-27;

/** The Rydberg constant for an infinitely heavy nucleus, m⁻¹ (CODATA 2018). */
export const RYDBERG_INFINITY = 10_973_731.568_160;
