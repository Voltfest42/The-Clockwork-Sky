/**
 * How dust dims starlight at each wavelength: the extinction law of Cardelli,
 * Clayton & Mathis (1989, ApJ 345, 245), A_λ / A_V as a function of 1/λ, for the
 * diffuse dust of the Milky Way (R_V = A_V / E(B − V) = 3.1 by default).
 *
 * Wavelengths in metres, extinctions in magnitudes. The law is fitted from
 * 0.125 to 3.3 µm; beyond 3.3 µm its infrared power law is carried on, and
 * below 0.1 µm it is held at its 0.1-µm value.
 */

export const R_V_DIFFUSE = 3.1;

/** A_λ / A_V at wavelength λ (m) for dust with the given R_V. */
export function extinctionRatio(wavelength: number, rv = R_V_DIFFUSE): number {
  const x = Math.min(10, 1 / (wavelength * 1e6)); // inverse microns
  let a: number;
  let b: number;
  if (x < 1.1) {
    // Infrared (fitted from 0.3 µm⁻¹, carried on beyond)
    a = 0.574 * x ** 1.61;
    b = -0.527 * x ** 1.61;
  } else if (x < 3.3) {
    // Optical and near infrared
    const y = x - 1.82;
    a = 1 + y * (0.17699 + y * (-0.50447 + y * (-0.02427 + y * (0.72085 + y * (0.01979 + y * (-0.7753 + y * 0.32999))))));
    b = y * (1.41338 + y * (2.28305 + y * (1.07233 + y * (-5.38434 + y * (-0.62251 + y * (5.3026 + y * -2.09002))))));
  } else if (x < 8) {
    // Ultraviolet, with the 2175 Å bump
    let fa = 0;
    let fb = 0;
    if (x >= 5.9) {
      const d = x - 5.9;
      fa = -0.04473 * d ** 2 - 0.009779 * d ** 3;
      fb = 0.213 * d ** 2 + 0.1207 * d ** 3;
    }
    a = 1.752 - 0.316 * x - 0.104 / ((x - 4.67) ** 2 + 0.341) + fa;
    b = -3.09 + 1.825 * x + 1.206 / ((x - 4.62) ** 2 + 0.263) + fb;
  } else {
    // Far ultraviolet
    const d = x - 8;
    a = -1.073 - 0.628 * d + 0.137 * d ** 2 - 0.07 * d ** 3;
    b = 13.67 + 4.257 * d - 0.42 * d ** 2 + 0.374 * d ** 3;
  }
  return a + b / rv;
}

/** Extinction at λ (m) in magnitudes, for A_V magnitudes of visual extinction. */
export function extinction(wavelength: number, av: number, rv = R_V_DIFFUSE): number {
  return av * extinctionRatio(wavelength, rv);
}

/** The share of light at λ (m) that gets through A_V magnitudes of dust. */
export function transmission(wavelength: number, av: number, rv = R_V_DIFFUSE): number {
  return 10 ** (-0.4 * extinction(wavelength, av, rv));
}

/** The reddening E(B − V), magnitudes, from A_V and R_V. */
export const reddening = (av: number, rv = R_V_DIFFUSE) => av / rv;
