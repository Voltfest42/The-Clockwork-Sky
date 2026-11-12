import { formatScientific } from '../core/math/scientific';
import type { ClusterConfig, ClusterInfo, ClusterSample } from '../core/nbody/clusterHost';
import { exponentialDiscSpeed, fitHalo, hernquistSpeed, nfwSpeed, totalSpeed, nfwMassInside, type MeasuredGalaxy } from '../core/galaxy/rotation';
import { keplerMass, nextPericentre, semiMajorAxisAu, yearLabel } from '../core/galaxy/s2';
import { angularSpeed } from '../core/galaxy/spiral';
import { MILKY_WAY, MILKY_WAY_CURVES, MILKY_WAY_MODEL, SPARC_GALAXIES } from '../data/galaxy';
import { SGR_A_STAR, S2_ORBIT } from '../data/s2';
import { ramp, rgb } from '../viz/particles/colour';

/**
 * What Chapter 30's figures share and their tests check: captions, colours,
 * the rotation-curve models and the weighing of Sagittarius A*.
 */

// ---------- formatting ----------

/** "3 × 10⁸" style for big numbers, plain below ten thousand. */
export function formatBig(x: number, digits = 2): string {
  return Math.abs(x) >= 1e4 ? formatScientific(x, digits) : Number(x.toPrecision(digits)).toLocaleString('en-GB');
}

/** A time in millions or billions of years. */
export function formatMyr(t: number): string {
  if (t >= 1000) return `${(t / 1000).toFixed(t >= 10_000 ? 0 : 2)} billion years`;
  if (t >= 10) return `${Math.round(t)} million years`;
  return `${t.toFixed(1)} million years`;
}

/** A length in parsecs to two or three significant figures. */
export function formatPc(x: number): string {
  return `${x >= 10 ? Math.round(x) : x.toFixed(1)} pc`;
}

// ---------- Figure 30.1: a cluster evaporates ----------

export const STAR_COUNTS = [500, 1000, 2000] as const;
export const CLUSTER_ORBITS = [
  { radius: 4, label: '4 kpc from the centre' },
  { radius: 8.2, label: '8.2 kpc (the Sun’s)' },
  { radius: 16, label: '16 kpc' },
] as const;

/** A star's colour by its mass (M☉): faint red dwarfs to blue-white stars of 3 M☉, on a log scale. */
export function massColour(m: number): [number, number, number] {
  const t = Math.log(m / 0.08) / Math.log(3 / 0.08);
  return ramp([rgb('#e2603f'), rgb('#f3b35b'), rgb('#fff1c9'), rgb('#9cc8ff')], t);
}

/** A star's dot size (CSS px) by its mass. */
export function massSize(m: number): number {
  return 2.2 + 2.6 * Math.log10(1 + m / 0.08);
}

export const BOUND_COLOUR = rgb('#9cc8ff');
export const ESCAPED_COLOUR = rgb('#f59e0b');

/** The cluster's state in words, for the caption and the 3D view's description. */
export function clusterCaption(config: ClusterConfig, info: ClusterInfo, sample: ClusterSample, ended: 'dissolved' | 'limit' | null): string {
  const masses = config.masses === 'kroupa' ? 'with Kroupa’s mix of masses from 0.08 to 3 M☉' : 'all of 0.5 M☉';
  const start = `${config.n.toLocaleString('en-GB')} stars ${masses} (${Math.round(info.totalMass)} M☉ in all), ${config.orbit} kpc from the Galaxy’s centre, starting with half their mass within ${formatPc(config.halfMass)}: a relaxation time of ${Math.round(info.relaxation)} million years.`;
  const trh = sample.t / info.relaxation;
  if (sample.t === 0) return `${start} The Galaxy’s tide sets a Jacobi radius of ${formatPc(info.jacobi)}.`;
  const lost = config.n - sample.boundCount;
  const when = `After ${formatMyr(sample.t)} (${trh.toFixed(1)} relaxation times)`;
  if (ended === 'dissolved') return `${start} ${when}, the cluster has dissolved: almost every star is in the tails.`;
  const sunk = sample.heavy < 0.75 * sample.lagrangian[1];
  const segregation =
    sample.boundCount < 50
      ? ''
      : config.masses === 'kroupa'
      ? ` The heaviest tenth of the stars hold half their mass within ${formatPc(sample.heavy)}, the cluster as a whole within ${formatPc(sample.lagrangian[1])}: ${sunk ? 'the heavy stars have sunk to the middle' : 'the heavy stars have not yet sunk far'}.`
      : ` Half the bound mass is within ${formatPc(sample.lagrangian[1])}, a tenth within ${formatPc(sample.lagrangian[0])}.`;
  const stop = ended === 'limit' ? ' The run stops here.' : '';
  return `${start} ${when}: ${Math.round(sample.bound * 100)}% of the mass is still within the Jacobi radius of ${formatPc(sample.jacobi)}, and ${lost.toLocaleString('en-GB')} stars have left it.${segregation} Energy error: ${formatScientific(Math.abs(sample.energyError), 1)}.${stop}`;
}

// ---------- Figure 30.2: the Galaxy from outside ----------

/** The time for one lap at the Sun's radius (Myr): 2π × 8.2 kpc at 230 km/s. */
export const GALACTIC_YEAR = (2 * Math.PI) / angularSpeed(MILKY_WAY.circularSpeed, MILKY_WAY.sunRadius);

export const GALAXY_PART_INFO = {
  thin: { label: 'Thin disc', colour: '#8fb8ff', size: 2.2, what: 'young and middle-aged stars, gas and dust, in spiral arms; about 300 pc thick' },
  thick: { label: 'Thick disc', colour: '#f0a35a', size: 2.2, what: 'older stars, about 900 pc thick' },
  bar: { label: 'Bar and bulge', colour: '#ffd966', size: 2.4, what: 'old stars in a bar about 10 kpc long, turned 27° from the line to the Sun' },
  halo: { label: 'Stellar halo', colour: '#c9a2ff', size: 2.4, what: 'the oldest stars, sparse, out past 50 kpc, many from eaten galaxies' },
  globulars: { label: 'Globular clusters', colour: '#f4f4f4', size: 6.5, what: 'about 160 balls of old stars, mostly in the halo' },
} as const;

// ---------- Figure 30.3: the rotation curve ----------

export interface RotationParts {
  bulge: (r: number) => number;
  disc: (r: number) => number;
  gas: (r: number) => number;
  halo: (r: number) => number;
  visible: (r: number) => number;
  total: (r: number) => number;
}

export interface RotationGalaxy {
  id: string;
  name: string;
  /** How far out the chart goes, kpc, and its top speed, km/s. */
  rMax: number;
  vMax: number;
  /** Measured points: radius, speed, error (km/s). */
  points: { r: number; v: number; error: number; set: string }[];
  /** The halo's mass the slider starts at and its range, M☉. */
  haloMass: number;
  haloRange: [number, number];
  /** The stars' mass (M☉) for a mass-to-light ratio of 1 (the Milky Way's counted stars count as 0.5). */
  starsPerRatio: number;
  /** The visible parts' speeds for a mass-to-light ratio (and a halo of mass M). */
  parts: (ratio: number, haloMass: number) => RotationParts;
  blurb: string;
}

/** The stars' mass-to-light ratio at 3.6 µm the figure starts with (Lelli et al. 2016's 0.5 for discs). */
export const RATIO_START = 0.5;

function interpolate(xs: readonly number[], ys: readonly number[]) {
  return (x: number) => {
    if (x < xs[0] || x > xs[xs.length - 1]) return NaN;
    let i = 1;
    while (i < xs.length - 1 && xs[i] < x) i++;
    const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1);
    return ys[i - 1] + t * (ys[i] - ys[i - 1]);
  };
}

const milkyWay: RotationGalaxy = {
  id: 'milky-way',
  name: 'The Milky Way',
  rMax: 30,
  vMax: 280,
  points: MILKY_WAY_CURVES.flatMap((c) => c.r.map((r, i) => ({ r, v: c.v[i], error: (c.lo[i] + c.hi[i]) / 2, set: c.name }))),
  haloMass: MILKY_WAY_MODEL.haloMass,
  haloRange: [0, 3e12],
  starsPerRatio: (MILKY_WAY_MODEL.bulge.mass + MILKY_WAY_MODEL.disc.mass) / RATIO_START,
  parts: (ratio, haloMass) => {
    const k = ratio / RATIO_START;
    const { bulge, disc, gas } = MILKY_WAY_MODEL;
    const parts = {
      bulge: (r: number) => hernquistSpeed(r, k * bulge.mass, bulge.scale),
      disc: (r: number) => exponentialDiscSpeed(r, k * disc.mass, disc.scaleLength),
      gas: (r: number) => exponentialDiscSpeed(r, gas.mass, gas.scaleLength),
      halo: (r: number) => nfwSpeed(r, haloMass),
    };
    const visible = (r: number) => totalSpeed(parts.bulge(r), parts.disc(r), parts.gas(r));
    return { ...parts, visible, total: (r: number) => totalSpeed(visible(r), parts.halo(r)) };
  },
  blurb: 'measured from the motions of red giants across the disc with Gaia, APOGEE and WISE (Eilers et al. 2019; Ou et al. 2024)',
};

function sparcGalaxy(g: MeasuredGalaxy & { id: string; luminosity: number }): RotationGalaxy {
  const r = g.r;
  const gas = interpolate(r, g.gas);
  const disc = interpolate(r, g.disc);
  const bulge = interpolate(r, g.bulge);
  const best = fitHalo(g).haloMass;
  const top = Math.max(...g.v.map((v, i) => v + g.error[i]));
  return {
    id: g.id,
    name: g.name,
    rMax: Math.ceil(r[r.length - 1] * 1.08),
    vMax: Math.ceil((top * 1.25) / 20) * 20,
    points: r.map((x, i) => ({ r: x, v: g.v[i], error: g.error[i], set: 'SPARC' })),
    haloMass: best,
    haloRange: [0, Math.max(3 * best, 1e10)],
    starsPerRatio: g.luminosity,
    parts: (ratio, haloMass) => {
      const parts = {
        bulge: (x: number) => Math.sqrt(ratio * 1.4) * bulge(x),
        disc: (x: number) => Math.sqrt(ratio) * disc(x),
        gas,
        halo: (x: number) => nfwSpeed(x, haloMass),
      };
      const visible = (x: number) => totalSpeed(parts.gas(x), parts.disc(x), parts.bulge(x));
      return { ...parts, visible, total: (x: number) => totalSpeed(visible(x), parts.halo(x)) };
    },
    blurb: `${g.distance} Mpc away, from SPARC (Lelli, McGaugh & Schombert 2016)`,
  };
}

export const ROTATION_GALAXIES: readonly RotationGalaxy[] = [milkyWay, ...SPARC_GALAXIES.map(sparcGalaxy)];

/** The best halo for a galaxy at a mass-to-light ratio, by least squares against the measured points (M☉). */
export function bestHalo(galaxy: RotationGalaxy, ratio: number): number {
  let best = { m: 0, chi: Infinity };
  const [lo, hi] = galaxy.haloRange;
  const chiAt = (m: number) => {
    const p = galaxy.parts(ratio, m);
    return galaxy.points.reduce((s, q) => s + ((p.total(q.r) - q.v) / Math.max(q.error, 0.02 * q.v)) ** 2, 0);
  };
  for (let u = 0; u <= 1; u += 1 / 400) {
    const m = lo + (hi - lo) * u * u;
    const chi = chiAt(m);
    if (chi < best.chi) best = { m, chi };
  }
  return best.m;
}

/** Dark mass (M☉) the halo holds inside radius r (kpc). */
export const haloMassInside = (r: number, haloMass: number) => (haloMass > 0 ? nfwMassInside(r, haloMass) : 0);

// ---------- Figure 30.5: S2 ----------

/** S2's semi-major axis, AU, from the published orbit and distance. */
export const S2_A_AU = semiMajorAxisAu(S2_ORBIT, SGR_A_STAR.distance);

/** The black hole's mass (M☉) from a ruler across the orbit's long axis (mas) and a timed period (years), at the fit's distance. */
export function weigh(longAxisMas: number, periodYears: number): number {
  const aAu = (longAxisMas / 2 / 1000) * SGR_A_STAR.distance;
  return keplerMass(aAu, periodYears);
}

/** The masses (M☉) the interactive question accepts: within what a ruler read to 2% and a stopwatch to 3% allow, round GRAVITY's 4.26 million. */
export const SGR_A_RANGE = [3.8e6, 4.8e6] as const;

export { yearLabel };

/** When S2 next passes pericentre after a fractional year. */
export const nextS2Pericentre = (year: number) => nextPericentre(S2_ORBIT, year);
