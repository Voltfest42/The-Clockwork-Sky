/**
 * Chapter 28's figure logic, kept apart from the drawing so it can be tested:
 * the Roche explorer’s levels and stream, the orbit as mass changes hands, the
 * Algol preset, and the binary zoo’s grid and categories.
 */
import { sampleGrid, type Grid } from '../core/math/contour';
import { fillPotential, l1Stream, lagrangePoints, muOf, rochePotential, rocheLobe, surfaceRadius, type Stream } from '../core/binaries/roche';
import type { Outcome } from '../core/stellar/bse/outcome';

/** Figure 28.1's starting state: the donor twice the accretor’s mass, three-quarters of the way to filling its lobe. */
export const ROCHE_START = { q: 2, fill: 0.75, r2: 0.08 } as const;

/** The view: the plane of the orbit, in separations, centred on the centre of mass. */
export const ROCHE_VIEW = { x0: -1.75, x1: 1.75, y0: -1.3, y1: 1.3 } as const;

export function rocheGrid(q: number, nx = 211, ny = 157): Grid {
  const mu = muOf(q);
  const { x0, x1, y0, y1 } = ROCHE_VIEW;
  return sampleGrid((x, y) => rochePotential(x, y, 0, mu), nx, ny, x0, x1, y0, y1);
}

export interface RocheLevels {
  l1: number;
  l2: number;
  l3: number;
  /** Deeper levels round the stars, and higher ones out towards L4 and L5. */
  inner: number[];
  outer: number[];
  floor: number;
  rim: number;
}

/** The contour levels: L1's, L2's and L3's, six deeper and four between L3 and L4. */
export function rocheLevels(q: number): RocheLevels {
  const mu = muOf(q);
  const pts = lagrangePoints(mu);
  const [l1, l2, l3, l4] = pts.map((p) => p.phi);
  const inner = [0.08, 0.2, 0.38, 0.62, 0.95, 1.4].map((d) => l1 - d);
  const outer = [0.2, 0.4, 0.6, 0.8].map((f) => l3 + f * (l4 - l3));
  return { l1, l2, l3, inner, outer, floor: l1 - 1.3, rim: l4 };
}

/**
 * The donor's outline in the orbital plane: the equipotential that reaches `fill` of the way to L1, traced by rays
 * from the donor's centre, so that a full donor is its own lobe and not the figure of eight.
 */
export function donorOutline(q: number, fill: number, n = 180): [number, number][] {
  const mu = muOf(q);
  // A full donor: a level a ten-thousandth inside L1's (the rays can't find the saddle point itself), with L1 put back
  const full = fill >= 1;
  const phi = fillPotential(mu, Math.min(fill, 1), 1);
  const level = full ? phi - 1e-4 * Math.abs(phi) : phi;
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    if (full && k === 0) {
      out.push([lagrangePoints(mu)[0].x, 0]);
      continue;
    }
    const r = surfaceRadius(mu, 1, level, Math.cos(a), Math.sin(a), 0);
    if (Number.isFinite(r)) out.push([-mu + r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

/** Contour lines near the stars only: the level surfaces also close again far out, where the centrifugal term wins. */
export const nearTheStars = (lines: [number, number][][], radius = 1.25) => lines.filter((l) => l.every(([x, y]) => Math.hypot(x, y) < radius));

/** The stream for a mass ratio and accretor radius, or none if the donor doesn’t fill its lobe. */
export const rocheStream = (q: number, r2: number): Stream => l1Stream(muOf(q), r2);

/** Both stars' Roche lobes (Eggleton), in separations: the donor’s and the accretor’s. */
export const lobes = (q: number): [number, number] => [rocheLobe(q), rocheLobe(1 / q)];

/** The interactive question: does the stream miss a companion of Figure 28.1's starting radius? */
export function streamMisses(q: number): boolean {
  return !rocheStream(q, ROCHE_START.r2).hits;
}

/** Figure 28.2's pairs: the donor’s and accretor’s starting masses (M☉), and how far the donor is stripped. */
export const TRANSFER_START = { m1: 3, m2: 1.5, beta: 1 } as const;

/**
 * Algol’s ancestors for Figure 28.3, found by a search of BSE runs at Z = 0.02 (binary.in’s switches): 2.8 + 1.0 M☉ in
 * a 1.8-day orbit reach 0.70 + 3.10 M☉ in a 2.88-day orbit after 911 million years, the lighter star a K-type giant
 * filling its lobe. Algol itself: 3.17 + 0.70 M☉, 2.867 days (Baron et al. 2012).
 */
export const ALGOL = { m1: 2.8, m2: 1.0, period: 1.8, ecc: 0, z: 0.02 } as const;
export const ALGOL_TODAY = { mA: 3.17, mB: 0.7, period: 2.867, rB: 3.5 } as const;

/** The zoo’s grid: primaries (M☉) and periods (days), even in their logarithms. */
export const ZOO_MASSES = Array.from({ length: 20 }, (_, i) => Number((10 ** (Math.log10(0.8) + (i * (Math.log10(60) - Math.log10(0.8))) / 19)).toPrecision(3)));
export const ZOO_PERIODS = Array.from({ length: 24 }, (_, i) => Number((10 ** ((i * 4) / 23)).toPrecision(3)));
export const ZOO_START = { q: 0.5, z: 0.02, alpha: 1 } as const;
export const ZOO_RATIOS = [0.2, 0.5, 0.9] as const;
export const ZOO_METALLICITIES = [
  { z: 0.02, name: 'Solar (Z = 0.02)' },
  { z: 0.001, name: 'Metal-poor (Z = 0.001)' },
] as const;

/** The zoo’s categories, in the map’s legend order, with a letter for each cell so colour isn’t the only cue. */
export const ZOO_KINDS: readonly { id: Outcome; letter: string; name: string; colour: string; about: string }[] = [
  { id: 'detached', letter: '', name: 'never touched', colour: '#3a4766', about: 'Both stars lived as if alone: the orbit was too wide for either to fill its Roche lobe.' },
  { id: 'transfer', letter: 't', name: 'traded mass', colour: '#6b7fa8', about: 'One star filled its lobe and fed the other, like Algol, and both survived as a pair, without becoming one of the kinds below.' },
  { id: 'merger', letter: 'M', name: 'merged into one star', colour: '#b45309', about: 'The stars touched or spiralled together in a common envelope and became a single star: a blue straggler, a fast-spinning giant, or a Thorne–Żytkow object.' },
  { id: 'cv', letter: 'C', name: 'white dwarf fed by a companion', colour: '#0f766e', about: 'A white dwarf drew gas from an overflowing companion: a cataclysmic variable, a nova or a recurrent nova like T Coronae Borealis.' },
  { id: 'typeIa', letter: 'I', name: 'white dwarf destroyed (Type Ia?)', colour: '#e11d48', about: 'A white dwarf grew to the Chandrasekhar mass, piled up enough helium to detonate, or merged with another and exploded: BSE’s candidates for Type Ia supernovae.' },
  { id: 'dwd', letter: 'W', name: 'two white dwarfs', colour: '#a78bfa', about: 'Both stars ended as white dwarfs, still in orbit: the kind of pair LISA will hear.' },
  { id: 'xrb', letter: 'X', name: 'X-ray binary', colour: '#2563eb', about: 'A neutron star or black hole fed on an overflowing companion: an X-ray binary, the way to a millisecond pulsar.' },
  { id: 'disrupted', letter: 'x', name: 'pulled apart by a supernova', colour: '#64748b', about: 'A supernova’s mass loss and kick unbound the pair, and the stars flew apart.' },
  { id: 'dns', letter: 'n', name: 'two neutron stars', colour: '#38bdf8', about: 'Two neutron stars still in orbit after both supernovae, like the Hulse–Taylor pulsar.' },
  { id: 'nsbh', letter: 'h', name: 'neutron star and black hole', colour: '#22d3ee', about: 'A neutron star and a black hole in orbit.' },
  { id: 'bbh', letter: 'b', name: 'two black holes', colour: '#facc15', about: 'Two black holes in orbit: if close enough, gravitational waves bring them together, as LIGO hears (Chapter 29).' },
];

export const zooKind = (id: Outcome) => ZOO_KINDS.find((k) => k.id === id)!;
