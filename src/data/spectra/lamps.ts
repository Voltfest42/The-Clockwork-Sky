/**
 * The brightest visible lines of five gases, as a glowing tube of each shows
 * them, for Kirchhoff's three spectra (Figure 12.1). Wavelengths in air, nm,
 * from the NIST Atomic Spectra Database's strong-line lists; the relative
 * brightnesses (0–1) are schematic, a rough guide to which lines stand out.
 */

export interface Gas {
  id: string;
  name: string;
  /** Where readers have seen it glow. */
  seen: string;
  lines: readonly (readonly [nm: number, brightness: number])[];
}

export const GASES: readonly Gas[] = [
  {
    id: 'hydrogen',
    name: 'Hydrogen',
    seen: 'the pink glow of star-forming clouds, like the Orion Nebula',
    lines: [
      [656.28, 1],
      [486.13, 0.5],
      [434.05, 0.3],
      [410.17, 0.2],
      [397.01, 0.12],
    ],
  },
  {
    id: 'helium',
    name: 'Helium',
    seen: 'the yellow line seen in the Sun in 1868, before helium was found on Earth',
    lines: [
      [388.86, 0.5],
      [447.15, 0.6],
      [471.31, 0.3],
      [492.19, 0.3],
      [501.57, 0.6],
      [587.56, 1],
      [667.82, 0.6],
      [706.52, 0.5],
      [728.13, 0.2],
    ],
  },
  {
    id: 'sodium',
    name: 'Sodium',
    seen: 'old orange street lights, and salt sprinkled in a flame',
    lines: [
      [497.85, 0.06],
      [498.29, 0.08],
      [568.27, 0.1],
      [568.82, 0.15],
      [588.995, 1],
      [589.592, 0.95],
      [615.42, 0.1],
      [616.07, 0.12],
    ],
  },
  {
    id: 'neon',
    name: 'Neon',
    seen: 'red-orange neon signs',
    lines: [
      [540.06, 0.3],
      [585.25, 0.8],
      [588.19, 0.5],
      [594.48, 0.6],
      [597.55, 0.3],
      [603.0, 0.4],
      [607.43, 0.6],
      [609.62, 0.5],
      [614.31, 0.8],
      [616.36, 0.4],
      [621.73, 0.4],
      [626.65, 0.6],
      [630.48, 0.3],
      [633.44, 0.6],
      [638.3, 0.7],
      [640.22, 1],
      [650.65, 0.8],
      [659.9, 0.5],
      [667.83, 0.6],
      [671.7, 0.4],
      [692.95, 0.8],
      [703.24, 0.9],
      [717.39, 0.4],
      [724.52, 0.5],
      [743.89, 0.4],
    ],
  },
  {
    id: 'mercury',
    name: 'Mercury',
    seen: 'the blue-white glow inside fluorescent tubes',
    lines: [
      [404.66, 0.7],
      [407.78, 0.25],
      [435.83, 1],
      [491.6, 0.1],
      [546.07, 1],
      [576.96, 0.6],
      [579.07, 0.6],
      [623.44, 0.1],
      [690.75, 0.1],
    ],
  },
];
