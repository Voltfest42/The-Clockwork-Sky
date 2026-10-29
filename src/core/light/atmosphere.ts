/**
 * How far down light from space gets: the height (km) at which the air has
 * absorbed (or, for long radio waves, reflected) about half of the light of a
 * wavelength coming from above. Zero means it reaches the ground.
 *
 * A sketch, not a measurement: the classic diagram (after Giacconi and others)
 * drawn from band values (the Part II research brief, §2). The real absorption
 * changes line by line, with the weather and with the height of the site.
 * Wavelengths in metres, heights in kilometres.
 */

/** [log₁₀ wavelength (m), height (km)], in order of wavelength; straight lines in between. */
const SKETCH: readonly (readonly [number, number])[] = [
  [-14, 25], // gamma rays: pair production, absorbed about 25–30 km up
  [-12, 28],
  [-11, 32], // hard X-rays
  [-10, 45],
  [-9, 75], // soft X-rays, ~1 keV
  [-8, 110], // extreme ultraviolet: atomic oxygen and nitrogen, high in the thermosphere
  [-7.3, 120],
  [-7.05, 95], // far ultraviolet: molecular oxygen (Schumann–Runge)
  [-6.75, 60],
  [-6.6, 45], // 250 nm: ozone's Hartley band, 25–50 km up
  [-6.53, 30],
  [-6.505, 12],
  [-6.49, 0], // above ~320 nm: through to the ground
  [-5.62, 0], // visible and near infrared, with windows to 2.4 µm (J, H, K)
  [-5.57, 3], // water at 2.5–3 µm
  [-5.5, 0], // the L and M windows, 3.2–5 µm
  [-5.32, 0],
  [-5.25, 8], // water vapour, 5–8 µm
  [-5.13, 8],
  [-5.1, 0], // the N window, 8–13 µm
  [-4.89, 0],
  [-4.82, 10], // carbon dioxide at 15 µm
  [-4.72, 3], // the Q window near 20 µm, from high dry sites
  [-4.5, 13], // far infrared: water vapour, absorbed below ~13 km (SOFIA flew at 12–14 km)
  [-3.6, 13],
  [-3.4, 4], // submillimetre windows, from 4–5 km up (Mauna Kea, ALMA)
  [-3, 2],
  [-2.6, 0], // millimetre and centimetre waves reach the ground
  [1, 0], // radio, to about 10 m (30 MHz)
  [1.5, 120], // longer waves are turned back by the ionosphere
  [4, 200],
];

/** The height (km) where about half of the light of a wavelength (m) from space has been absorbed; 0 if it reaches the ground. */
export function absorptionHeight(wavelength: number): number {
  const x = Math.log10(wavelength);
  if (x <= SKETCH[0][0]) return SKETCH[0][1];
  for (let i = 1; i < SKETCH.length; i++) {
    const [x1, h1] = SKETCH[i];
    if (x <= x1) {
      const [x0, h0] = SKETCH[i - 1];
      return h0 + ((h1 - h0) * (x - x0)) / (x1 - x0);
    }
  }
  return SKETCH[SKETCH.length - 1][1];
}

/** Places to put a telescope, by height (km). */
export const PLATFORMS = [
  { id: 'ground', name: 'the ground', height: 0 },
  { id: 'mountain', name: 'a high mountain (Mauna Kea, 4.2 km; ALMA, 5 km)', height: 5 },
  { id: 'aircraft', name: 'an aircraft (SOFIA flew at 12–14 km)', height: 14 },
  { id: 'balloon', name: 'a balloon (about 40 km)', height: 40 },
  { id: 'rocket', name: 'a rocket, briefly (100 km and up)', height: 100 },
  { id: 'satellite', name: 'a satellite (Hubble, a few hundred km up; JWST, 1.5 million km away)', height: Infinity },
] as const;

/** The lowest place from which a telescope sees light of a wavelength (m): the first platform above where it is absorbed. */
export function whereToObserve(wavelength: number): (typeof PLATFORMS)[number] {
  const h = absorptionHeight(wavelength);
  if (h <= 0.5) return PLATFORMS[0];
  return PLATFORMS.find((p) => p.height >= h) ?? PLATFORMS[PLATFORMS.length - 1];
}
