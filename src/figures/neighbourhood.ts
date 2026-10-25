import { galacticFromEquatorialVector } from '../core/coords/galactic';
import type { Vec3 } from '../core/math/vec3';
import { lightYearsFromParsecs, SUN_ABSOLUTE_MAGNITUDE } from '../core/stars/distance';
import data from '../data/hyg/neighbours.json';

/**
 * The stars within 10 parsecs (Figure 9.2), from the HYG catalogue, in
 * galactic axes: x towards the Galaxy's centre, z towards its north pole, in
 * parsecs, with the Sun at the origin.
 */

export type StarClass = 'A' | 'F' | 'G' | 'K' | 'M' | 'D';

export interface Neighbour {
  name: string;
  gl: string;
  /** Galactic position, parsecs. */
  position: Vec3;
  distance: number;
  mag: number;
  absmag: number;
  spect: string;
  cls: StarClass;
  guessed: boolean;
}

export const CLASSES: readonly StarClass[] = ['A', 'F', 'G', 'K', 'M', 'D'];

export const CLASS_INFO: Record<StarClass, { name: string; colour: string; words: string }> = {
  A: { name: 'A: white', colour: '#cdd9ff', words: 'a hot white star, about twice the Sun’s mass' },
  F: { name: 'F: yellow-white', colour: '#f1efff', words: 'a yellow-white star, a little hotter and heavier than the Sun' },
  G: { name: 'G: yellow, like the Sun', colour: '#ffe9a8', words: 'a yellow star like the Sun' },
  K: { name: 'K: orange', colour: '#ffbe73', words: 'an orange star, smaller and cooler than the Sun' },
  M: { name: 'M: red dwarf', colour: '#ff7a4d', words: 'a red dwarf: small, cool and faint' },
  D: { name: 'White dwarf', colour: '#8fd3ff', words: 'a white dwarf: the hot, Earth-sized core left by a dead star' },
};

export const NEIGHBOURS: readonly Neighbour[] = data.stars.map((s) => {
  const position = galacticFromEquatorialVector([s.x, s.y, s.z]);
  return {
    name: s.name,
    gl: s.gl,
    position,
    distance: Math.hypot(...position),
    mag: s.mag,
    absmag: s.absmag,
    spect: s.spect,
    cls: s.cls as StarClass,
    guessed: s.guessed,
  };
});

/** How many of each class. */
export function classCounts(stars: readonly Neighbour[] = NEIGHBOURS): Record<StarClass, number> {
  const counts = { A: 0, F: 0, G: 0, K: 0, M: 0, D: 0 };
  for (const s of stars) counts[s.cls]++;
  return counts;
}

/** A star's light output, in Suns (visual light only), from its absolute magnitude. */
export function luminosity(absmag: number): number {
  return 10 ** (-0.4 * (absmag - SUN_ABSOLUTE_MAGNITUDE));
}

/** The share of the neighbours (0–1) that give out less light than the Sun. */
export function fainterThanSun(stars: readonly Neighbour[] = NEIGHBOURS): number {
  return stars.filter((s) => s.absmag > SUN_ABSOLUTE_MAGNITUDE).length / stars.length;
}

/** A star in a sentence for the info card and caption. */
export function describeNeighbour(s: Neighbour): string {
  const ly = lightYearsFromParsecs(s.distance);
  const L = luminosity(s.absmag);
  const light = L >= 1 ? `${L < 10 ? L.toFixed(1) : Math.round(L)} times as much light as the Sun` : `${L >= 0.01 ? (100 * L).toFixed(L < 0.1 ? 1 : 0) : (100 * L).toPrecision(1)}% of the Sun’s light`;
  const seen = s.mag <= 6 ? `visible to the eye, at magnitude ${s.mag.toFixed(1)}` : `too faint to see without a telescope (magnitude ${s.mag.toFixed(1)})`;
  return `${s.name}: ${CLASS_INFO[s.cls].words}${s.spect ? ` (type ${s.spect})` : ''}, ${ly.toFixed(1)} light-years away. It gives out ${light}, and is ${seen}.`;
}

/** Size of a star's dot (px) from its absolute magnitude: brighter stars bigger, squeezed so red dwarfs still show. */
export function dotSize(absmag: number): number {
  return Math.max(3, Math.min(14, 9 - 0.45 * (absmag - SUN_ABSOLUTE_MAGNITUDE)));
}
