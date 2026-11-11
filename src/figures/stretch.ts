/**
 * The geometry of Figure 29.2: how a gravitational wave travelling along z
 * moves free masses in the x–y plane, and how an interferometer's arms answer.
 * In the transverse–traceless description, a mass at rest at (x, y) is found
 * at x + ½(h₊x + h×y), y + ½(h×x − h₊y): the plus polarisation stretches x
 * while it squeezes y, the cross polarisation the same along the diagonals.
 */

export type Polarisation = 'plus' | 'cross' | 'circular';

/** The two polarisations' strains at phase φ (radians) for amplitude A: plus alone, cross alone, or both a quarter-cycle apart. */
export function strains(pol: Polarisation, A: number, phi: number): { hp: number; hx: number } {
  if (pol === 'plus') return { hp: A * Math.cos(phi), hx: 0 };
  if (pol === 'cross') return { hp: 0, hx: A * Math.cos(phi) };
  return { hp: A * Math.cos(phi), hx: A * Math.sin(phi) };
}

/** Sixteen masses on a ring of radius 1: where they rest and where the wave has moved them. */
export function ringPositions(pol: Polarisation, A: number, phi: number, n = 16): { rest: { x: number; y: number }; now: { x: number; y: number } }[] {
  const { hp, hx } = strains(pol, A, phi);
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    const x = Math.cos(a);
    const y = Math.sin(a);
    return { rest: { x, y }, now: { x: x + 0.5 * (hp * x + hx * y), y: y + 0.5 * (hx * x - hp * y) } };
  });
}

/**
 * The difference of the arms' lengths, ΔL₁/L − ΔL₂/L = h₊ cos 2ψ + h× sin 2ψ, for arms along (cos ψ, sin ψ) and
 * (−sin ψ, cos ψ), the wave coming straight down on the detector. Turned by 45°, a detector can't hear the plus
 * polarisation at all.
 */
export function armResponse(pol: Polarisation, A: number, phi: number, psi: number): number {
  const { hp, hx } = strains(pol, A, phi);
  return hp * Math.cos(2 * psi) + hx * Math.sin(2 * psi);
}

/** GW150914's peak strain in Hanford, about 1.0 × 10⁻²¹ (Abbott et al. 2016). */
export const REAL_STRAIN = 1.0e-21;
/** LIGO's arms, m. */
export const ARM_LENGTH = 4000;
/** A proton's width: twice its charge radius, 0.84 fm (CODATA 2018). */
export const PROTON_WIDTH = 2 * 0.8414e-15;
