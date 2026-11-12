import type { VisualOrbit } from '../core/binaries/visual';

/**
 * The star S2's orbit round Sagittarius A*, the Milky Way's black hole, as
 * the GRAVITY Collaboration fitted it (2020, A&A 636, L5, Table 1): osculating
 * elements for the apocentre of 2010, from 27 years of positions and radial
 * velocities. Angles in degrees, the semi-major axis in arcseconds, times in
 * fractional years (J2000 equinox for the node).
 */
export const S2_ORBIT: VisualOrbit = {
  period: 16.0455,
  periastron: 2018.379,
  a: 0.125058,
  e: 0.884649,
  i: 134.567,
  node: 228.171,
  omega: 66.263,
};

/** The fit's distance to the Galactic Centre (pc) and the black hole's mass (M☉), with their errors. */
export const SGR_A_STAR = { distance: 8246.7, distanceError: 9.3, mass: 4.261e6, massError: 0.012e6 } as const;

/** Relativity's signatures in S2's orbit: the redshift (GRAVITY 2018, 2019) and the precession (GRAVITY 2020), as f = 1 for general relativity and 0 for Newton. */
export const S2_RELATIVITY = {
  redshift2018: { f: 0.9, stat: 0.09, sys: 0.15 },
  redshift2019: { f: 1.04, error: 0.05 },
  precession2020: { f: 1.1, error: 0.19 },
} as const;
