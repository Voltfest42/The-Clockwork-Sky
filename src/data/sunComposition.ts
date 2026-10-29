/**
 * What the Sun is made of: the abundances of the elements in its photosphere
 * today, log ε = log₁₀(N_X / N_H) + 12, from Asplund, Amarsi & Grevesse (2021,
 * A&A 653, A141), who give the mass fractions X = 0.7438, Y = 0.2423 and Z =
 * 0.0139. Helium can't be measured in the photosphere; its value comes from
 * helioseismology. The fifteen elements here carry all but about 0.01% of the
 * Sun's mass. Atomic masses in u (IUPAC).
 */

export interface SolarElement {
  symbol: string;
  name: string;
  logEps: number;
  mass: number;
}

export const SUN_COMPOSITION: readonly SolarElement[] = [
  { symbol: 'H', name: 'hydrogen', logEps: 12, mass: 1.008 },
  { symbol: 'He', name: 'helium', logEps: 10.914, mass: 4.0026 },
  { symbol: 'O', name: 'oxygen', logEps: 8.69, mass: 15.999 },
  { symbol: 'C', name: 'carbon', logEps: 8.46, mass: 12.011 },
  { symbol: 'Ne', name: 'neon', logEps: 8.06, mass: 20.18 },
  { symbol: 'N', name: 'nitrogen', logEps: 7.83, mass: 14.007 },
  { symbol: 'Mg', name: 'magnesium', logEps: 7.55, mass: 24.305 },
  { symbol: 'Si', name: 'silicon', logEps: 7.51, mass: 28.085 },
  { symbol: 'Fe', name: 'iron', logEps: 7.46, mass: 55.845 },
  { symbol: 'S', name: 'sulphur', logEps: 7.12, mass: 32.06 },
  { symbol: 'Al', name: 'aluminium', logEps: 6.43, mass: 26.982 },
  { symbol: 'Ar', name: 'argon', logEps: 6.38, mass: 39.948 },
  { symbol: 'Ca', name: 'calcium', logEps: 6.3, mass: 40.078 },
  { symbol: 'Na', name: 'sodium', logEps: 6.22, mass: 22.99 },
  { symbol: 'Ni', name: 'nickel', logEps: 6.2, mass: 58.693 },
];

/** The published mass fractions of hydrogen (X), helium (Y) and everything else (Z). */
export const SUN_MASS_FRACTIONS = { X: 0.7438, Y: 0.2423, Z: 0.0139 } as const;
