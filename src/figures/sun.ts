import { L_SUN } from '../core/constants';
import { coalLifetime, fusionLifetime, kelvinHelmholtzTime, toYears } from '../core/stars/sun';
import solarModel from '../data/solarModel.json';

/**
 * The Sun up close (Figures 15.1, 15.2 and 15.3): its insides from a standard
 * solar model (Model S), its layers with what happens in each and how we
 * know, and how long it could shine on each fuel. The sunspot record's
 * helpers are in sunspots.ts.
 */

export type Profile = 'T' | 'rho' | 'm' | 'L';

export interface Shell {
  r: number;
  T: number;
  rho: number;
  P: number;
  m: number;
  L: number;
  X: number;
}

export const SHELLS: readonly Shell[] = solarModel.shells;
export const CONVECTION_BASE = solarModel.convectionBase;
export const CORE_EDGE = solarModel.core99;

/** A quantity at a fractional radius, by straight-line interpolation between the model's shells. */
export function solarAt(r: number, key: keyof Shell): number {
  const x = Math.max(0, Math.min(1, r));
  const k = SHELLS.findIndex((s) => s.r >= x);
  if (k <= 0) return SHELLS[0][key];
  const a = SHELLS[k - 1];
  const b = SHELLS[k];
  return a[key] + ((x - a.r) / (b.r - a.r)) * (b[key] - a[key]);
}

export interface Layer {
  id: string;
  name: string;
  /** Inner and outer edge, fractions of the Sun's radius; above 1, the outer atmosphere, drawn not to scale. */
  from: number;
  to: number;
  colour: string;
  what: string;
  howWeKnow: string;
}

export const LAYERS: readonly Layer[] = [
  {
    id: 'core',
    name: 'Core',
    from: 0,
    to: CORE_EDGE,
    colour: '#fff3c4',
    what: `Hydrogen fuses into helium at about 15.7 million degrees, under a pressure 230 billion times the air’s. The core makes 99% of the Sun’s power inside a quarter of its radius, and has turned half the hydrogen at its centre into helium so far.`,
    howWeKnow: 'Neutrinos made by the fusion fly straight out and are caught in detectors deep underground; the Sun’s vibrations measure the speed of sound almost to the centre.',
  },
  {
    id: 'radiative',
    name: 'Radiative zone',
    from: CORE_EDGE,
    to: CONVECTION_BASE,
    colour: '#ffd27a',
    what: 'The energy creeps outward as light, absorbed and given out again countless times, so it takes tens of thousands of years or more to cross. The gas itself stays put.',
    howWeKnow: 'Helioseismology: sound waves bouncing through the Sun show how fast sound travels at each depth, and so the temperature and make-up.',
  },
  {
    id: 'convection',
    name: 'Convection zone',
    from: CONVECTION_BASE,
    to: 1,
    colour: '#ff9f43',
    what: `In the outer 29% of the radius the gas itself carries the heat: hot gas rises, cools at the surface and sinks again, carrying the energy up in weeks. Its base, at ${Math.round(CONVECTION_BASE * 1000) / 10}% of the radius, is where the Sun’s magnetic field is thought to be wound up.`,
    howWeKnow: 'Helioseismology measured the base of the convection zone, at 0.713 of the radius, in the early 1990s; the convection shows on the surface as granules.',
  },
  {
    id: 'photosphere',
    name: 'Photosphere',
    from: 0.998,
    to: 1,
    colour: '#ffe8b0',
    what: 'The visible surface, a layer a few hundred kilometres thick at 5,772 K, where the gas turns transparent and light escapes. It is covered in granules, the tops of convection cells about 1,000 km across that last minutes, and sometimes in sunspots.',
    howWeKnow: 'We see it: its spectrum gives its temperature and make-up (Chapters 11 and 12), and telescopes such as DKIST resolve its granules.',
  },
  {
    id: 'chromosphere',
    name: 'Chromosphere',
    from: 1,
    to: 1.08,
    colour: '#f87171',
    what: 'A thin layer a few thousand kilometres thick, glowing red with hydrogen’s light, where the temperature climbs again from about 4,400 K to 20,000 K.',
    howWeKnow: 'It flashes pink round the Moon’s edge at the start and end of a total eclipse (Chapter 4), and filters tuned to hydrogen’s red line show it every day.',
  },
  {
    id: 'corona',
    name: 'Corona',
    from: 1.08,
    to: 1.5,
    colour: '#c4d7ff',
    what: 'The Sun’s outer atmosphere, at 1 to 3 million degrees, far hotter than the surface below it; why is still being worked out. It streams away as the solar wind, 1 to 2 million tonnes a second.',
    howWeKnow: 'Seen as a pearly halo in total eclipses (Chapter 4), in X-rays from space, and sampled directly by Parker Solar Probe, which passed 6.1 million km from the surface in December 2024.',
  },
];

/** The layer at a fractional radius (inside the Sun, the photosphere only right at the edge). */
export function layerAt(r: number): Layer {
  if (r >= 1) return LAYERS.find((l) => r <= l.to && l.from >= 1) ?? LAYERS[LAYERS.length - 1];
  if (r >= 0.998) return LAYERS[3];
  return LAYERS.find((l) => r >= l.from && r < l.to) ?? LAYERS[0];
}

/** "15.7 million K", "5,780 K". */
export function formatTemperature(T: number): string {
  if (T >= 1e6) return `${(T / 1e6).toFixed(T >= 1e7 ? 1 : 2)} million K`;
  return `${Math.round(T).toLocaleString('en-GB')} K`;
}

/** A density in kg/m³ as words with water for comparison. */
export function formatDensity(rho: number): string {
  const water = rho / 1000;
  if (water >= 1) return `${water.toFixed(water >= 10 ? 0 : 1)} times water’s`;
  if (water >= 0.01) return `${(1 / water).toFixed(0)} times thinner than water`;
  return `${rho.toPrecision(2)} kg/m³`;
}

export const PROFILES: readonly { id: Profile; name: string; axis: string; max: number; format: (v: number) => string }[] = [
  { id: 'T', name: 'Temperature', axis: 'Temperature (million K)', max: 16, format: (v) => `${v}` },
  { id: 'rho', name: 'Density', axis: 'Density (× water)', max: 160, format: (v) => `${v}` },
  { id: 'L', name: 'Power made inside', axis: 'Share of the Sun’s power', max: 1, format: (v) => `${Math.round(v * 100)}%` },
  { id: 'm', name: 'Mass inside', axis: 'Share of the Sun’s mass', max: 1, format: (v) => `${Math.round(v * 100)}%` },
];

/** A profile's value at a shell, in the chart's units. */
export function profileValue(shell: Shell, profile: Profile): number {
  if (profile === 'T') return shell.T / 1e6;
  if (profile === 'rho') return shell.rho / 1000;
  return shell[profile];
}

// —— Figure 15.3: the fuel gauge ——

export interface Fuel {
  id: string;
  name: string;
  /** How long it would last, years. */
  years: number;
  /** The arithmetic, in words. */
  sum: string;
  verdict: string;
}

const L = `${(L_SUN / 1e26).toFixed(1)} × 10²⁶`;

export const FUELS: readonly Fuel[] = [
  {
    id: 'coal',
    name: 'Burning, like coal',
    years: toYears(coalLifetime()),
    sum: `A Sun of coal and oxygen: 2 × 10³⁰ kg × 30 million joules a kilogram = 6 × 10³⁷ J, spent at ${L} W.`,
    verdict: 'Out in about 5,000 years, about the time since the first pyramids were built. Fire can’t be the answer.',
  },
  {
    id: 'gravity',
    name: 'Shrinking under its own weight',
    years: toYears(kelvinHelmholtzTime()),
    sum: `The energy released by squeezing the Sun to its size, about GM²/R = 3.8 × 10⁴¹ J, spent at ${L} W.`,
    verdict: 'About 30 million years: Kelvin’s answer in the 1860s, far too short for the geologists and for Darwin, and for Earth’s 4.5 billion years.',
  },
  {
    id: 'fusion',
    name: 'Fusing hydrogen into helium',
    years: toYears(fusionLifetime()),
    sum: `Turning a tenth of the Sun’s mass, the hydrogen in and around its core, into helium makes 0.7% of that mass into energy, E = mc²: 0.007 × 0.1 × 2 × 10³⁰ kg × (3 × 10⁸ m/s)² = 1.3 × 10⁴⁴ J, spent at ${L} W.`,
    verdict: 'About 10 billion years, enough for the age of Earth and more. Only fusion fits.',
  },
];

/** Times to mark on the gauge, years. */
export const FUEL_MARKS = [
  { years: 5000, label: 'the pyramids' },
  { years: 66e6, label: 'the dinosaurs die out' },
  { years: 4.54e9, label: 'the age of Earth' },
];
