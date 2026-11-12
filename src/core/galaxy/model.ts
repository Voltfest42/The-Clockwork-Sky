import { Random } from '../random';

/**
 * A model Milky Way as points (Figure 30.2), seeded, in kpc with the centre at
 * the origin, the disc in the x–y plane and the Sun on the negative x axis.
 * The Galaxy turns clockwise seen from the north (+z), so the arms trail that
 * way. Each part is sampled from a simple density with the sizes in
 * src/data/galaxy.ts; how many points each part gets is chosen for the
 * picture, not in proportion to its mass.
 */

export type GalaxyPart = 'thin' | 'thick' | 'bar' | 'halo' | 'globulars';

export interface GalaxyStructure {
  sunRadius: number;
  thinDisc: { scaleLength: number; scaleHeight: number };
  thickDisc: { scaleLength: number; scaleHeight: number };
  bar: { halfLength: number; angle: number };
}

export interface GalaxyCloud {
  part: GalaxyPart;
  /** x, y, z per point, kpc. */
  positions: Float32Array;
  /** For the thin disc: how near each point is to an arm's middle, 0–1. */
  armness?: Float32Array;
}

/** Points per part. */
export const GALAXY_POINTS: Record<GalaxyPart, number> = { thin: 26_000, thick: 7_000, bar: 7_000, halo: 3_500, globulars: 160 };

/** A radius from an exponential disc of scale length h, by the sum of two exponential draws (R e^(−R/h) is a gamma distribution), up to rMax. */
function discRadius(random: Random, h: number, rMax: number): number {
  let r: number;
  do r = -h * Math.log(random.uniform(1e-12, 1) * random.uniform(1e-12, 1));
  while (r > rMax);
  return r;
}

/** A height from an exponential profile e^(−|z|/h). */
function discHeight(random: Random, h: number): number {
  return (random.bernoulli(0.5) ? 1 : -1) * -h * Math.log(random.uniform(1e-12, 1));
}

/** A radius from a power-law halo, ρ ∝ (r² + c²)^(−s/2), up to rMax: the cumulative mass tabulated on a grid and inverted. */
function haloSampler(core: number, slope: number, rMax: number): (random: Random) => number {
  const n = 2000;
  const r = Array.from({ length: n + 1 }, (_, i) => (rMax * i) / n);
  const cumulative = [0];
  for (let i = 1; i <= n; i++) {
    const mid = (r[i] + r[i - 1]) / 2;
    cumulative.push(cumulative[i - 1] + mid * mid * (mid * mid + core * core) ** (-slope / 2) * (r[i] - r[i - 1]));
  }
  return (random) => {
    const u = random.next() * cumulative[n];
    let lo = 0;
    let hi = n;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < u) lo = mid;
      else hi = mid;
    }
    return r[lo] + ((u - cumulative[lo]) / (cumulative[hi] - cumulative[lo])) * (r[hi] - r[lo]);
  };
}

/** Arms: four trailing logarithmic spirals of 12° pitch, placed as in the scale zoom's sketch, with the Sun between two of them. */
export function armPhase(R: number, theta: number, sunRadius: number): number {
  const k = Math.tan((12 * Math.PI) / 180);
  const phase0 = Math.PI - Math.log(sunRadius / 5.5) / k + Math.PI / 4;
  // How far round from the nearest arm, in units of the gap between arms (0 on an arm, 0.5 midway)
  const u = ((theta - phase0 - Math.log(R / 5.5) / k) / (Math.PI / 2)) % 1;
  return Math.abs(u < 0 ? u + 1 : u);
}

/** Samples every part of the model. */
export function sampleGalaxy(structure: GalaxyStructure, seed = 30): GalaxyCloud[] {
  const random = new Random(seed);
  const stellarHalo = haloSampler(1, 3.5, 60);
  const clusterHalo = haloSampler(1.5, 3.5, 40);
  const clouds: GalaxyCloud[] = [];

  // The thin disc, crowded towards the arms: a point is kept with a chance that peaks on an arm
  {
    const n = GALAXY_POINTS.thin;
    const positions = new Float32Array(3 * n);
    const armness = new Float32Array(n);
    let i = 0;
    while (i < n) {
      const R = discRadius(random, structure.thinDisc.scaleLength, 20);
      if (R < 2.5 && random.next() < 0.8) continue;
      const theta = random.uniform(0, 2 * Math.PI);
      const u = armPhase(R, theta, structure.sunRadius);
      const near = Math.exp(-(Math.min(u, 1 - u) ** 2) / (2 * 0.09 ** 2));
      if (random.next() > 0.25 + 0.75 * near) continue;
      positions.set([R * Math.cos(theta), R * Math.sin(theta), discHeight(random, structure.thinDisc.scaleHeight * (0.5 + 0.5 * random.next()))], 3 * i);
      armness[i] = near;
      i++;
    }
    clouds.push({ part: 'thin', positions, armness });
  }

  // The thick disc
  {
    const n = GALAXY_POINTS.thick;
    const positions = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      const R = discRadius(random, structure.thickDisc.scaleLength, 16);
      const theta = random.uniform(0, 2 * Math.PI);
      positions.set([R * Math.cos(theta), R * Math.sin(theta), discHeight(random, structure.thickDisc.scaleHeight)], 3 * i);
    }
    clouds.push({ part: 'thick', positions });
  }

  // The bar and bulge: a boxy, elongated cloud turned from the Sun–centre line
  {
    const n = GALAXY_POINTS.bar;
    const positions = new Float32Array(3 * n);
    const angle = Math.PI + (structure.bar.angle * Math.PI) / 180;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    for (let i = 0; i < n; i++) {
      const bulge = random.bernoulli(0.4);
      const along = bulge ? random.normal() * 0.9 : random.normal() * (structure.bar.halfLength / 2.2);
      const across = random.normal() * (bulge ? 0.8 : 0.55);
      const z = random.normal() * (bulge ? 0.6 : 0.3);
      positions.set([along * c - across * s, along * s + across * c, z], 3 * i);
    }
    clouds.push({ part: 'bar', positions });
  }

  // The halo's stars: old, sparse and round-ish, ρ ∝ r^−3.5 beyond a kiloparsec, a little flattened
  {
    const n = GALAXY_POINTS.halo;
    const positions = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      const r = stellarHalo(random);
      const z = random.uniform(-1, 1);
      const phi = random.uniform(0, 2 * Math.PI);
      const sxy = Math.sqrt(1 - z * z);
      positions.set([r * sxy * Math.cos(phi), r * sxy * Math.sin(phi), 0.7 * r * z], 3 * i);
    }
    clouds.push({ part: 'halo', positions });
  }

  // Globular clusters: the same kind of spread, a little more concentrated
  {
    const n = GALAXY_POINTS.globulars;
    const positions = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      const r = clusterHalo(random) + (i < 8 ? random.uniform(40, 120) : 0);
      const z = random.uniform(-1, 1);
      const phi = random.uniform(0, 2 * Math.PI);
      const sxy = Math.sqrt(1 - z * z);
      positions.set([r * sxy * Math.cos(phi), r * sxy * Math.sin(phi), r * z], 3 * i);
    }
    clouds.push({ part: 'globulars', positions });
  }
  return clouds;
}
