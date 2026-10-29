import { R_EARTH, R_SUN } from '../core/constants';
import { absoluteMagnitude, lightYearsFromParsecs } from '../core/stars/distance';
import { bcVOf, fromGaia, fromPhysics, luminosityFromBolometric, radiusFrom, regionOf, temperatureFromBVTable, type HRPoint, type Region } from '../core/stars/hr';
import { famousStar } from '../data/stars';
import type { DensityGrid, HRMarker } from '../viz/hr/HRDiagram';
import { formatKelvin } from '../viz/spectrum/format';
import { formatSuns } from './thermal';

/**
 * Chapter 13's figures: plot a star (13.1), the HR diagram of real stars
 * (13.2) and stars to scale (13.3).
 */

// ---------- the famous stars on the diagram ----------

const MARKED = ['sun', 'proxima', 'alpha-cen-a', 'sirius-a', 'sirius-b', 'procyon-b', 'vega', 'arcturus', 'aldebaran', 'polaris', 'betelgeuse', 'rigel', 'deneb', 'spica'] as const;
const LEFT = new Set(['sirius-b', 'procyon-b', 'rigel', 'deneb', 'spica', 'vega']);

export function famousName(id: string): string {
  const s = famousStar(id);
  return id === 'sun' ? 'the Sun' : s.name;
}

/** The famous stars as markers, at their measured temperatures and luminosities. */
export function famousMarkers(highlight?: string): HRMarker[] {
  return MARKED.map((id) => {
    const s = famousStar(id);
    return {
      id,
      label: id === 'sun' ? 'Sun' : s.name.replace(' A', '').replace('α Centauri', 'α Cen A'),
      point: fromPhysics(s.temperature.value, s.luminosity.value),
      highlight: id === highlight,
      side: LEFT.has(id) ? 'left' : 'right',
    };
  });
}

// ---------- the regions ----------

export const REGIONS: Record<Region, { name: string; text: string }> = {
  'main-sequence': {
    name: 'The main sequence',
    text: 'Stars turning hydrogen into helium in their cores, as the Sun does, for most of their lives. Where a star sits along it is set by its mass: heavy stars hot and bright at the top left, light ones cool and dim at the bottom right.',
  },
  'red-dwarfs': {
    name: 'Red dwarfs, the bottom of the main sequence',
    text: 'Small, cool, dim stars of a tenth to half the Sun’s mass. Three stars in four near the Sun are red dwarfs, yet not one is bright enough to see without a telescope.',
  },
  subgiants: {
    name: 'Subgiants',
    text: 'Stars that have used up the hydrogen in their cores and are starting to swell on their way to becoming giants (Chapter 17).',
  },
  giants: {
    name: 'Giants',
    text: 'Stars near the ends of their lives, swollen to tens of times the Sun’s width with cool surfaces: Arcturus and Aldebaran. The Sun will be one in about 5 billion years.',
  },
  supergiants: {
    name: 'Supergiants',
    text: 'The rare, brilliant giants made by stars of more than about eight Suns’ mass, hundreds of times the Sun’s width: Betelgeuse, Rigel, Deneb. None lies within 100 parsecs.',
  },
  'white-dwarfs': {
    name: 'White dwarfs',
    text: 'The exposed cores of dead stars like the Sun, the size of Earth and slowly cooling: hot but dim, because they are so small. Sirius B is one.',
  },
  between: {
    name: 'The thinly peopled gap',
    text: 'Few stars live between the main sequence and the white dwarfs: hot subdwarfs, stars stripped of their outer layers, and white dwarfs in pairs whose light blends with a companion’s.',
  },
};

/** What lives at a place on the diagram, in a sentence or two. */
export function describePlace(p: HRPoint): string {
  const r = REGIONS[regionOf(p.kelvin, p.luminosity)];
  return `${r.name}. ${r.text} Here: ${formatKelvin(p.kelvin)}, ${formatSuns(p.luminosity)} times the Sun’s luminosity, ${formatSuns(radiusFrom(p.luminosity, p.kelvin))} times its width.`;
}

// ---------- Gaia's stars and the naked-eye stars, loaded on demand ----------

export interface StarSet {
  density?: DensityGrid;
  points: HRPoint[];
  /** How many stars the set has in all (the density grid's, or the points'). */
  count: number;
}

export interface GaiaSets {
  hundred: StarSet;
  twenty: StarSet;
}

/** Gaia's stars within 100 parsecs (the density grid and a sample) and within 20 (every one), on both sets of axes. */
export async function loadGaia(): Promise<GaiaSets> {
  const data = (await import('../data/gaia/hr.json')).default;
  const pairs = (flat: readonly number[], stride: number) => {
    const out: HRPoint[] = [];
    for (let i = 0; i < flat.length; i += stride) out.push(fromGaia(flat[i] / 1000, flat[i + 1] / 100));
    return out;
  };
  const near = pairs(data.near, 3);
  return {
    hundred: { density: data.grid, points: pairs(data.sample, 2), count: data.count },
    twenty: { points: near, count: near.length },
  };
}

/** The stars you can see with the naked eye (visual magnitude 6 or brighter) with a Hipparcos parallax of 2 mas or more, from the HYG catalogue. */
export async function loadNakedEye(): Promise<StarSet> {
  const hyg = (await import('../data/hyg/stars.json')).default;
  const points: HRPoint[] = [];
  for (let i = 0; i < hyg.count; i++) {
    const mag = hyg.mag[i] / 100;
    const plx = hyg.plx[i] / 10; // mas
    const ci = hyg.ci[i];
    if (mag > 6 || plx < 2 || ci === null) continue;
    const bv = ci / 1000;
    const kelvin = temperatureFromBVTable(bv);
    const mV = absoluteMagnitude(mag, 1000 / plx);
    points.push(fromPhysics(kelvin, luminosityFromBolometric(mV + bcVOf(kelvin))));
  }
  return { points, count: points.length };
}

/** The share of a set's points in each region. */
export function regionShares(points: readonly HRPoint[]): Record<Region, number> {
  const counts = { 'main-sequence': 0, 'red-dwarfs': 0, subgiants: 0, giants: 0, supergiants: 0, 'white-dwarfs': 0, between: 0 } as Record<Region, number>;
  for (const p of points) counts[regionOf(p.kelvin, p.luminosity)]++;
  for (const k of Object.keys(counts) as Region[]) counts[k] /= points.length || 1;
  return counts;
}

/** A share as "9 in 10", "1 in 20", "3 in 4". */
export function inWords(share: number): string {
  if (share >= 0.95) return 'almost all';
  if (share >= 0.15) {
    const options: [number, number][] = [
      [1, 5],
      [1, 4],
      [1, 3],
      [2, 5],
      [1, 2],
      [3, 5],
      [2, 3],
      [3, 4],
      [4, 5],
      [9, 10],
    ];
    const [a, b] = options.reduce((best, o) => (Math.abs(o[0] / o[1] - share) < Math.abs(best[0] / best[1] - share) ? o : best));
    return `${a} in ${b}`;
  }
  if (share < 0.005) return 'almost none';
  return `1 in ${Math.round(1 / share)}`;
}

// ---------- 13.1, plot a star ----------

export interface Plotted {
  /** Parallax, mas. */
  parallax: number;
  /** Apparent visual magnitude. */
  V: number;
  /** Colour index. */
  BV: number;
}

export interface Placed {
  parsecs: number;
  lightYears: number;
  mV: number;
  kelvin: number;
  bc: number;
  luminosity: number;
  radius: number;
  point: HRPoint;
}

/** From a parallax, a magnitude and a colour to a place on the diagram: distance, absolute magnitude, temperature, bolometric correction, luminosity and size. */
export function placeStar({ parallax, V, BV }: Plotted): Placed {
  const parsecs = 1000 / parallax;
  const mV = absoluteMagnitude(V, parsecs);
  const kelvin = temperatureFromBVTable(BV);
  const bc = bcVOf(kelvin);
  const luminosity = luminosityFromBolometric(mV + bc);
  return { parsecs, lightYears: lightYearsFromParsecs(parsecs), mV, kelvin, bc, luminosity, radius: radiusFrom(luminosity, kelvin), point: fromPhysics(kelvin, luminosity) };
}

/** Stars to plot, from the famous stars' parallaxes, magnitudes and colours. */
export const PLOTTABLE = ['sirius-a', 'vega', 'arcturus', 'aldebaran', 'betelgeuse', 'rigel', 'procyon-a', 'alpha-cen-a', 'proxima', 'barnard', 'sirius-b'].map((id) => {
  const s = famousStar(id);
  return { id, name: s.name, plotted: { parallax: Math.round((1000 / s.distance!.value) * 100) / 100, V: s.V, BV: s.BV } satisfies Plotted };
});

// ---------- 13.3, stars to scale ----------

export interface ScaleStar {
  id: string;
  name: string;
  /** Radius, Suns. */
  radius: number;
  range?: readonly [number, number];
  kelvin: number;
}

const famous = (id: string, name?: string): ScaleStar => {
  const s = famousStar(id);
  return { id, name: name ?? famousName(id), radius: s.radius.value, range: s.radius.range, kelvin: s.temperature.value };
};

/**
 * The stars of Figure 13.3, smallest first. Earth is there for scale. The
 * largest known stars' radii (UY Scuti, Stephenson 2-18, WOH G64) are about
 * 1,500 Suns, give or take a third, because red supergiants' edges and
 * distances are hard to pin down.
 */
export const SCALE_STARS: readonly ScaleStar[] = [
  famous('sirius-b'),
  { id: 'earth', name: 'Earth', radius: R_EARTH / R_SUN, kelvin: 0 },
  famous('proxima'),
  famous('sun', 'The Sun'),
  famous('sirius-a', 'Sirius'),
  famous('vega'),
  famous('arcturus'),
  famous('aldebaran'),
  famous('rigel'),
  famous('antares'),
  famous('betelgeuse'),
  { id: 'largest', name: 'The largest known', radius: 1500, range: [1000, 2000], kelvin: 3500 },
];

/** Each star's centre along the row, Suns from the left edge: side by side, a tenth of a width apart. */
export function scalePositions(stars: readonly ScaleStar[] = SCALE_STARS): number[] {
  const out: number[] = [];
  let x = 0;
  for (const s of stars) {
    x += s.radius * 1.1;
    out.push(x);
    x += s.radius * 1.1;
  }
  return out;
}

/** A width in Suns, readably, with kilometres: "1.4 Suns (970,000 km)". */
export function formatWidth(suns: number): string {
  const km = (suns * R_SUN) / 1000;
  const kmText =
    km >= 1e9
      ? `${Number((km / 1e9).toPrecision(2))} billion km`
      : km >= 1e6
        ? `${Number((km / 1e6).toPrecision(2))} million km`
        : `${Math.round(km).toLocaleString('en-GB', { maximumSignificantDigits: 2 })} km`;
  return `${formatSuns(suns)} Sun${suns === 1 ? '' : 's'} (${kmText})`;
}
