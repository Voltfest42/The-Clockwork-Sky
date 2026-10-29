/**
 * The electromagnetic spectrum for Figure 10.1: its bands (whose boundaries
 * are conventions), things the size of each wavelength, and what each band
 * shows in the sky and what makes it on Earth (the Part II research brief, §2).
 * Wavelengths in metres.
 */

export interface Band {
  id: string;
  name: string;
  /** Shortest and longest wavelength, m. */
  from: number;
  to: number;
  /** What it shows in the sky. */
  sky: string;
  /** What makes it, on Earth and in space. */
  makes: string;
  /** A CSS colour for its strip (the visible band is drawn as a rainbow instead). */
  tint: string;
}

export const BANDS: readonly Band[] = [
  {
    id: 'gamma',
    name: 'Gamma rays',
    from: 1e-14,
    to: 1e-11,
    sky: 'The most violent places: gamma-ray bursts from collapsing stars and merging neutron stars, pulsars, and matter falling into black holes.',
    makes: 'Atomic nuclei changing state: radioactive decay, nuclear reactions, and particles smashing together.',
    tint: '#7c3aed',
  },
  {
    id: 'x-ray',
    name: 'X-rays',
    from: 1e-11,
    to: 1e-8,
    sky: 'Gas at millions of degrees: the Sun’s corona, gas swirling into black holes and neutron stars, and the remains of exploded stars.',
    makes: 'Fast electrons slamming to a stop, as in a hospital X-ray tube, and gas too hot for any atom to keep its electrons.',
    tint: '#4f46e5',
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    from: 1e-8,
    to: 4e-7,
    sky: 'Hot stars, tens of thousands of degrees, and the Sun’s thin outer layers.',
    makes: 'Very hot bodies, sparks and electric arcs, and the gas in fluorescent tubes. Sunburn is ultraviolet.',
    tint: '#2563eb',
  },
  {
    id: 'visible',
    name: 'Visible light',
    from: 4e-7,
    to: 7e-7,
    sky: 'Stars like the Sun, and glowing gas lit by hot stars, red with hydrogen.',
    makes: 'Bodies a few thousand degrees hot (a filament, a flame, the Sun), and electrons jumping between levels in atoms (LEDs, neon signs).',
    tint: '#16a34a',
  },
  {
    id: 'infrared',
    name: 'Infrared',
    from: 7e-7,
    to: 1e-3,
    sky: 'Cool stars and brown dwarfs, dust warmed by starlight, and young stars hidden inside their dust clouds.',
    makes: 'Everything warm: you, a radiator, the ground at night. A TV remote and a thermal camera work in infrared.',
    tint: '#dc2626',
  },
  {
    id: 'millimetre',
    name: 'Millimetre waves',
    from: 1e-3,
    to: 1e-2,
    sky: 'Cold gas and dust in the clouds where stars form, a few degrees above absolute zero, glowing as their molecules spin.',
    makes: 'Cold dust and molecules; on Earth, airport body scanners and the fastest mobile networks.',
    tint: '#b45309',
  },
  {
    id: 'radio',
    name: 'Radio',
    from: 1e-2,
    to: 1e4,
    sky: 'Cold hydrogen gas between the stars (at 21 cm), pulsars, and jets of fast electrons spiralling in magnetic fields.',
    makes: 'Electric currents shaking in an antenna: radio and TV, mobile phones and Wi-Fi; microwave ovens (12 cm) are short radio waves.',
    tint: '#78716c',
  },
];

/** The band a wavelength (m) is in. */
export function bandOf(wavelength: number): Band {
  return BANDS.find((b) => wavelength < b.to) ?? BANDS[BANDS.length - 1];
}

/** Things about the size of a wavelength, for the ruler. Sizes in metres. */
export const SAME_SIZE = [
  { name: 'an atomic nucleus', size: 1e-14 },
  { name: 'an atom', size: 1e-10 },
  { name: 'a virus', size: 1e-7 },
  { name: 'a bacterium', size: 2e-6 },
  { name: 'a human hair', size: 7e-5 },
  { name: 'a pinhead', size: 1.5e-3 },
  { name: 'a mouse', size: 7e-2 },
  { name: 'a person', size: 1.7 },
  { name: 'a football pitch', size: 105 },
  { name: 'a small town', size: 3e3 },
] as const;

/** Places on the ruler worth a visit, for the figure's buttons. */
export const SPECTRUM_STOPS = [
  { name: 'Medical X-ray', wavelength: 3e-11 },
  { name: 'Sunburn', wavelength: 3e-7 },
  { name: 'Green', wavelength: 550e-9 },
  { name: 'TV remote', wavelength: 940e-9 },
  { name: 'You', wavelength: 9.3e-6 },
  { name: 'Microwave oven', wavelength: 0.122 },
  { name: 'Hydrogen’s 21 cm', wavelength: 0.211 },
  { name: 'FM radio', wavelength: 3.1 },
] as const;
