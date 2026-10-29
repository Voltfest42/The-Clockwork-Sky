/**
 * The famous stars of Part II: the same stars come back in every chapter, so
 * readers get to know them. Values from the Part II research brief (§3), each
 * with its source; uncertain ones carry a range. Temperatures are effective
 * (surface) temperatures in kelvin; radius, luminosity and mass are in solar
 * units; distances in parsecs; V and B − V are the measured visual magnitude
 * and colour index (SIMBAD, from Hipparcos and the Bright Star Catalogue).
 *
 * The values are measured separately, so L need not equal R²T⁴ exactly (in
 * solar units, with T in units of 5,772 K); a test checks they agree within
 * each star's stated uncertainty. Figures that compute a luminosity from a
 * radius and temperature use R and T.
 */

export interface Measured {
  value: number;
  /** The range of published values, where they differ a lot. */
  range?: readonly [number, number];
  /** A key into STAR_SOURCES. */
  source: keyof typeof STAR_SOURCES;
}

export interface FamousStar {
  id: string;
  name: string;
  /** Spectral class and luminosity class: "G2 V". */
  spectralClass: string;
  /** What kind of star, in a few words. */
  kind: string;
  temperature: Measured;
  radius: Measured;
  luminosity: Measured;
  mass: Measured;
  /** Distance, parsecs (absent for the Sun). */
  distance?: Measured;
  /** Apparent visual magnitude. */
  V: number;
  /** Colour index B − V. */
  BV: number;
  /** Hipparcos number, for finding it in the star catalogue. */
  hip?: number;
}

export const STAR_SOURCES = {
  iau2015: 'IAU 2015 Resolution B3 (nominal solar values)',
  ramirez2012: 'I. Ramírez and colleagues (2012), ApJ 752, 5: the Sun’s B − V',
  boyajian2012: 'T. S. Boyajian and colleagues (2012), ApJ 757, 112',
  gaiaDr3: 'Gaia Data Release 3 (2022)',
  ribas2018: 'I. Ribas and colleagues (2018), Nature 563, 365: Barnard’s star',
  kervella2017: 'P. Kervella and colleagues (2017), A&A 597, A137: α Centauri A and B',
  akeson2021: 'R. Akeson and colleagues (2021), AJ 162, 14: α Centauri’s masses',
  bond2017: 'H. E. Bond and colleagues (2017), ApJ 840, 70: Sirius A and B',
  davis2011: 'J. Davis and colleagues (2011), PASA 28, 58: Sirius A’s size',
  barstow2005: 'M. A. Barstow and colleagues (2005), MNRAS 362, 1134: Sirius B',
  bond2015: 'H. E. Bond and colleagues (2015), ApJ 813, 106: Procyon A and B',
  yoon2010: 'J. Yoon and colleagues (2010), ApJ 708, 71: Vega',
  vanLeeuwen2007: 'F. van Leeuwen (2007), A&A 474, 653: the Hipparcos parallaxes',
  ramirez2011: 'I. Ramírez and C. Allende Prieto (2011), ApJ 743, 135: Arcturus',
  richichi2005: 'A. Richichi and A. Roccatagliata (2005), A&A 433, 305: Aldebaran',
  evans2018: 'N. R. Evans and colleagues (2018), ApJ 863, 187: Polaris',
  joyce2020: 'M. Joyce and colleagues (2020), ApJ 902, 63: Betelgeuse',
  levesque2020: 'E. M. Levesque and P. Massey (2020), ApJL 891, L37: Betelgeuse’s temperature',
  ohnaka2013: 'K. Ohnaka and colleagues (2013), A&A 555, A24: Antares',
  przybilla2006: 'N. Przybilla and colleagues (2006), A&A 445, 1099: Rigel and Deneb',
  schiller2008: 'F. Schiller and N. Przybilla (2008), A&A 479, 849: Deneb',
  tkachenko2016: 'A. Tkachenko and colleagues (2016), MNRAS 458, 1964: Spica',
  brief: 'the Part II research brief (§3), from several sources',
} as const;

export const FAMOUS_STARS: readonly FamousStar[] = [
  {
    id: 'sun',
    name: 'the Sun',
    spectralClass: 'G2 V',
    kind: 'a yellow-white main-sequence star',
    temperature: { value: 5772, source: 'iau2015' },
    radius: { value: 1, source: 'iau2015' },
    luminosity: { value: 1, source: 'iau2015' },
    mass: { value: 1, source: 'iau2015' },
    V: -26.74,
    BV: 0.65,
  },
  {
    id: 'proxima',
    name: 'Proxima Centauri',
    spectralClass: 'M5.5 V',
    kind: 'a red dwarf, the nearest star',
    temperature: { value: 3050, range: [2980, 3100], source: 'boyajian2012' },
    radius: { value: 0.154, source: 'boyajian2012' },
    luminosity: { value: 0.0017, range: [0.0015, 0.0019], source: 'boyajian2012' },
    mass: { value: 0.122, source: 'brief' },
    distance: { value: 1.302, source: 'gaiaDr3' },
    V: 11.13,
    BV: 1.82,
    hip: 70890,
  },
  {
    id: 'barnard',
    name: 'Barnard’s star',
    spectralClass: 'M4 V',
    kind: 'a red dwarf',
    temperature: { value: 3200, source: 'ribas2018' },
    radius: { value: 0.19, source: 'ribas2018' },
    luminosity: { value: 0.0035, source: 'ribas2018' },
    mass: { value: 0.16, source: 'ribas2018' },
    distance: { value: 1.83, source: 'gaiaDr3' },
    V: 9.51,
    BV: 1.57,
    hip: 87937,
  },
  {
    id: 'alpha-cen-a',
    name: 'α Centauri A',
    spectralClass: 'G2 V',
    kind: 'a Sun-like star',
    temperature: { value: 5790, source: 'kervella2017' },
    radius: { value: 1.22, source: 'kervella2017' },
    luminosity: { value: 1.52, source: 'kervella2017' },
    mass: { value: 1.08, source: 'akeson2021' },
    distance: { value: 1.35, source: 'kervella2017' },
    V: 0.01,
    BV: 0.71,
    hip: 71683,
  },
  {
    id: 'alpha-cen-b',
    name: 'α Centauri B',
    spectralClass: 'K1 V',
    kind: 'an orange dwarf',
    temperature: { value: 5260, source: 'kervella2017' },
    radius: { value: 0.86, source: 'kervella2017' },
    luminosity: { value: 0.5, source: 'kervella2017' },
    mass: { value: 0.91, source: 'akeson2021' },
    distance: { value: 1.35, source: 'kervella2017' },
    V: 1.33,
    BV: 0.88,
    hip: 71681,
  },
  {
    id: 'sirius-a',
    name: 'Sirius A',
    spectralClass: 'A1 V',
    kind: 'a hot white main-sequence star, the brightest in our night sky',
    temperature: { value: 9940, source: 'brief' },
    radius: { value: 1.71, source: 'davis2011' },
    luminosity: { value: 25, source: 'brief' },
    mass: { value: 2.06, source: 'bond2017' },
    distance: { value: 2.64, source: 'vanLeeuwen2007' },
    V: -1.46,
    BV: 0.0,
    hip: 32349,
  },
  {
    id: 'sirius-b',
    name: 'Sirius B',
    spectralClass: 'DA2',
    kind: 'a white dwarf, the size of Earth',
    temperature: { value: 25000, source: 'barstow2005' },
    radius: { value: 0.0081, source: 'bond2017' },
    luminosity: { value: 0.025, range: [0.022, 0.027], source: 'brief' },
    mass: { value: 1.02, source: 'bond2017' },
    distance: { value: 2.64, source: 'vanLeeuwen2007' },
    V: 8.44,
    BV: -0.03,
  },
  {
    id: 'procyon-a',
    name: 'Procyon A',
    spectralClass: 'F5 IV–V',
    kind: 'a white star a little heavier than the Sun',
    temperature: { value: 6530, source: 'bond2015' },
    radius: { value: 2.05, source: 'bond2015' },
    luminosity: { value: 6.9, source: 'bond2015' },
    mass: { value: 1.48, source: 'bond2015' },
    distance: { value: 3.51, source: 'vanLeeuwen2007' },
    V: 0.37,
    BV: 0.42,
    hip: 37279,
  },
  {
    id: 'procyon-b',
    name: 'Procyon B',
    spectralClass: 'DQZ',
    kind: 'a cool white dwarf',
    temperature: { value: 7740, source: 'bond2015' },
    radius: { value: 0.0123, source: 'bond2015' },
    luminosity: { value: 0.0005, source: 'bond2015' },
    mass: { value: 0.59, source: 'bond2015' },
    distance: { value: 3.51, source: 'vanLeeuwen2007' },
    V: 10.7,
    BV: 0.0,
  },
  {
    id: 'vega',
    name: 'Vega',
    spectralClass: 'A0 V',
    kind: 'a hot white star, spinning fast, seen pole-on',
    temperature: { value: 9600, range: [8900, 10100], source: 'yoon2010' },
    radius: { value: 2.5, range: [2.4, 2.8], source: 'yoon2010' },
    luminosity: { value: 40, source: 'yoon2010' },
    mass: { value: 2.1, source: 'yoon2010' },
    distance: { value: 7.68, source: 'vanLeeuwen2007' },
    V: 0.03,
    BV: 0.0,
    hip: 91262,
  },
  {
    id: 'arcturus',
    name: 'Arcturus',
    spectralClass: 'K1.5 III',
    kind: 'an orange giant',
    temperature: { value: 4290, source: 'ramirez2011' },
    radius: { value: 25, source: 'ramirez2011' },
    luminosity: { value: 170, range: [170, 200], source: 'ramirez2011' },
    mass: { value: 1.1, source: 'ramirez2011' },
    distance: { value: 11.3, source: 'vanLeeuwen2007' },
    V: -0.05,
    BV: 1.23,
    hip: 69673,
  },
  {
    id: 'aldebaran',
    name: 'Aldebaran',
    spectralClass: 'K5 III',
    kind: 'an orange giant',
    temperature: { value: 3900, source: 'brief' },
    radius: { value: 45, source: 'richichi2005' },
    luminosity: { value: 440, source: 'brief' },
    mass: { value: 1.2, source: 'brief' },
    distance: { value: 20, source: 'vanLeeuwen2007' },
    V: 0.86,
    BV: 1.54,
    hip: 21421,
  },
  {
    id: 'polaris',
    name: 'Polaris',
    spectralClass: 'F7 Ib',
    kind: 'a yellow supergiant that pulses (a Cepheid)',
    temperature: { value: 6000, source: 'brief' },
    radius: { value: 40, range: [37, 46], source: 'brief' },
    luminosity: { value: 1300, range: [1100, 2500], source: 'brief' },
    mass: { value: 5.4, source: 'evans2018' },
    distance: { value: 135, range: [130, 140], source: 'brief' },
    V: 1.98,
    BV: 0.6,
    hip: 11767,
  },
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    spectralClass: 'M1–2 Ia–Iab',
    kind: 'a red supergiant',
    temperature: { value: 3600, source: 'levesque2020' },
    radius: { value: 764, range: [640, 1000], source: 'joyce2020' },
    luminosity: { value: 90000, range: [60000, 150000], source: 'brief' },
    mass: { value: 18, range: [16, 19], source: 'joyce2020' },
    distance: { value: 168, range: [153, 195], source: 'joyce2020' },
    V: 0.42,
    BV: 1.85,
    hip: 27989,
  },
  {
    id: 'antares',
    name: 'Antares',
    spectralClass: 'M1.5 Iab',
    kind: 'a red supergiant',
    temperature: { value: 3660, source: 'ohnaka2013' },
    radius: { value: 680, source: 'ohnaka2013' },
    luminosity: { value: 75000, source: 'ohnaka2013' },
    mass: { value: 14, range: [13, 15], source: 'brief' },
    distance: { value: 170, source: 'brief' },
    V: 1.06,
    BV: 1.83,
    hip: 80763,
  },
  {
    id: 'rigel',
    name: 'Rigel',
    spectralClass: 'B8 Ia',
    kind: 'a blue supergiant',
    temperature: { value: 12100, source: 'przybilla2006' },
    radius: { value: 79, source: 'przybilla2006' },
    luminosity: { value: 120000, source: 'przybilla2006' },
    mass: { value: 21, source: 'przybilla2006' },
    distance: { value: 264, source: 'vanLeeuwen2007' },
    V: 0.13,
    BV: -0.03,
    hip: 24436,
  },
  {
    id: 'deneb',
    name: 'Deneb',
    spectralClass: 'A2 Ia',
    kind: 'a white supergiant',
    temperature: { value: 8525, source: 'schiller2008' },
    radius: { value: 203, source: 'schiller2008' },
    luminosity: { value: 196000, source: 'schiller2008' },
    mass: { value: 19, source: 'schiller2008' },
    distance: { value: 800, range: [430, 800], source: 'schiller2008' },
    V: 1.25,
    BV: 0.09,
    hip: 102098,
  },
  {
    id: 'spica',
    name: 'Spica A',
    spectralClass: 'B1 III–IV',
    kind: 'a hot blue star in a close pair',
    temperature: { value: 25300, source: 'tkachenko2016' },
    radius: { value: 7.5, source: 'tkachenko2016' },
    luminosity: { value: 20500, source: 'tkachenko2016' },
    mass: { value: 11, source: 'tkachenko2016' },
    distance: { value: 77, source: 'vanLeeuwen2007' },
    V: 0.97,
    BV: -0.23,
    hip: 65474,
  },
];

/** A famous star by its id; throws for an unknown one, so a typo fails loudly. */
export function famousStar(id: string): FamousStar {
  const star = FAMOUS_STARS.find((s) => s.id === id);
  if (!star) throw new Error(`No famous star "${id}"`);
  return star;
}
