import { lightShares, relativeLight, type EclipsingPair } from '../core/binaries/eclipse';
import { binaryState, eclipseLimit, minimumMasses, semiAmplitudes, semiMajorAxis, type BinaryOrbit } from '../core/binaries/orbit';
import { AU, R_SUN } from '../core/constants';
import { nelderMead } from '../core/math/minimise';
import { chiSquare, measure } from '../core/signal/series';
import debcat from '../data/debcat.json';
import { formatSuns } from './thermal';

/**
 * The binary workbench's pairs and arithmetic (Figures 14.1–14.3): visual
 * pairs to weigh from their orbits on the sky, close pairs to weigh from
 * their velocities, and eclipsing pairs whose dips give sizes. Units as in
 * src/core/binaries: M☉, days, R☉, km/s, degrees.
 */

export const R_SUN_PER_AU = AU / R_SUN;
const YEAR = 365.25;

export interface VisualPreset {
  id: string;
  name: string;
  names: [string, string];
  orbit: BinaryOrbit;
  /** Parallax, arcseconds. */
  parallax: number;
  temperatures: [number, number];
  note: string;
}

/**
 * Two pairs whose orbits on the sky have been watched for more than a full
 * turn: the Sixth Catalog of Orbits' solutions (Bond et al. 2017 for Sirius,
 * Akeson et al. 2021 for α Centauri), with ω turned from the companion's
 * orbit to the brighter star's. The masses are the papers'; the tilt is shown
 * from face-on to edge-on, so Sirius's (136°) appears as 44°.
 */
export const VISUAL_PRESETS: readonly VisualPreset[] = [
  {
    id: 'sirius',
    name: 'Sirius',
    names: ['Sirius A', 'Sirius B'],
    orbit: { m1: 2.063, m2: 1.018, period: 50.1284 * YEAR, e: 0.59142, i: 180 - 136.336, omega: 149.161 - 180, node: 45.4 },
    parallax: 0.37921,
    temperatures: [9940, 25000],
    note: 'A white dwarf and the brightest star in the night sky, 2.6 parsecs away.',
  },
  {
    id: 'alpha-centauri',
    name: 'α Centauri',
    names: ['α Centauri A', 'α Centauri B'],
    orbit: { m1: 1.0788, m2: 0.9092, period: 79.762 * YEAR, e: 0.51947, i: 79.243, omega: 231.519 - 180, node: 205.073 },
    parallax: 0.75081,
    temperatures: [5790, 5260],
    note: 'Two Sun-like stars, the nearest to the Sun but for Proxima, which circles them far out.',
  },
];

/** The workbench's own pair for Figure 14.1: a heavier and a lighter star, 10 parsecs away. */
export const DEFAULT_VISUAL: VisualPreset = {
  id: 'model',
  name: 'Your pair',
  names: ['Star 1', 'Star 2'],
  orbit: { m1: 2, m2: 1, period: 40 * YEAR, e: 0.5, i: 50, omega: 120, node: 30 },
  parallax: 0.1,
  temperatures: [9000, 6000],
  note: '',
};

/** What the orbit on the sky gives: its size in AU from its size in arcseconds and the parallax, the total mass, and the split. */
export function weighVisual(orbit: BinaryOrbit, parallax: number) {
  const aRsun = semiMajorAxis(orbit.m1 + orbit.m2, orbit.period);
  const aAu = aRsun / R_SUN_PER_AU;
  const years = orbit.period / YEAR;
  const total = aAu ** 3 / (years * years);
  // Each star's distance from the balance point is inversely proportional to its mass.
  const share1 = orbit.m2 / (orbit.m1 + orbit.m2);
  return { aAu, aArcsec: aAu * parallax, years, total, a1: aAu * share1, a2: aAu * (1 - share1), m1: total * (1 - share1), m2: total * share1 };
}

/** "3.08", "0.909", "12.4": a mass or distance to three significant figures. */
export function three(x: number): string {
  return Number(x.toPrecision(3)).toLocaleString('en-GB');
}

/** A period in days as words: "3.96 days", "50.1 years". */
export function formatPeriod(days: number): string {
  if (days < 2) return `${three(days * 24)} hours`;
  if (days < 1000) return `${three(days)} days`;
  return `${three(days / YEAR)} years`;
}

// —— Close pairs: velocities and eclipses ——

interface DebcatSystem {
  name: string;
  period: number | null;
  logM: (number | null)[];
  eLogM: (number | null)[];
  logR: (number | null)[];
  eLogR: (number | null)[];
  logT: (number | null)[];
}

/** A DEBCat system by name. */
export function debcatSystem(name: string): DebcatSystem {
  const s = (debcat.systems as DebcatSystem[]).find((x) => x.name === name);
  if (!s) throw new Error(`No DEBCat system ${name}`);
  return s;
}

/** A value and its uncertainty from DEBCat's log₁₀ and its error. */
export function fromLog(log: number, eLog: number): { value: number; error: number } {
  const value = 10 ** log;
  return { value, error: value * Math.LN10 * eLog };
}

export interface EclipsePreset {
  id: string;
  name: string;
  pair: EclipsingPair;
  note: string;
}

const betaAur = debcatSystem('beta Aur');
const cmDra = debcatSystem('CM Dra');

/**
 * Pairs for Figures 14.2 and 14.3. β Aurigae (Menkalinan, a naked-eye star)
 * and CM Draconis take their masses, radii, temperatures and periods from
 * DEBCat; their orbits are circular, and their tilts are the papers'
 * (Southworth et al. 2007: 76.0°; Morales et al. 2009: 89.8°). For circular
 * orbits ω = 0 puts the eclipses at phases 0.25 and 0.75, clear of the chart's edges.
 */
export const ECLIPSE_PRESETS: readonly EclipsePreset[] = [
  {
    id: 'model',
    name: 'A pair of your own',
    pair: { m1: 1.2, m2: 0.8, period: 3, e: 0, i: 90, omega: 0, r1: 1.3, r2: 0.8, t1: 6200, t2: 5000 },
    note: 'A star a little heavier than the Sun and one a little lighter, three days round each other.',
  },
  {
    id: 'beta-aur',
    name: 'β Aurigae',
    pair: {
      m1: 10 ** betaAur.logM[0]!,
      m2: 10 ** betaAur.logM[1]!,
      period: betaAur.period!,
      e: 0,
      i: 76,
      omega: 0,
      r1: 10 ** betaAur.logR[0]!,
      r2: 10 ** betaAur.logR[1]!,
      t1: Math.round(10 ** betaAur.logT[0]!),
      t2: Math.round(10 ** betaAur.logT[1]!),
    },
    note: 'Menkalinan in Auriga: two hot A stars almost alike, tilted so they only graze each other, dimming the pair by a tenth.',
  },
  {
    id: 'cm-dra',
    name: 'CM Draconis',
    pair: {
      m1: 10 ** cmDra.logM[0]!,
      m2: 10 ** cmDra.logM[1]!,
      period: cmDra.period!,
      e: 0,
      i: 89.8,
      omega: 0,
      r1: 10 ** cmDra.logR[0]!,
      r2: 10 ** cmDra.logR[1]!,
      t1: Math.round(10 ** cmDra.logT[0]!),
      t2: Math.round(10 ** cmDra.logT[1]!),
    },
    note: 'Two red dwarfs a quarter of the Sun’s width, edge-on, round each other in 30 hours.',
  },
  {
    id: 'eccentric',
    name: 'An eccentric pair',
    pair: { m1: 1.5, m2: 1.1, period: 12, e: 0.45, i: 88, omega: 40, r1: 1.7, r2: 1.1, t1: 7000, t2: 6000 },
    note: 'An oval orbit: the velocity curves lose their wave shape, and the eclipses come at uneven intervals.',
  },
];

/** The velocity curves of both stars over one orbit, km/s, at n + 1 phases. */
export function velocityCurves(orbit: BinaryOrbit, n = 200): { v1: { x: number; y: number }[]; v2: { x: number; y: number }[] } {
  const v1: { x: number; y: number }[] = [];
  const v2: { x: number; y: number }[] = [];
  for (let k = 0; k <= n; k++) {
    const s = binaryState(orbit, k / n);
    v1.push({ x: k / n, y: s.v1 });
    v2.push({ x: k / n, y: s.v2 });
  }
  return { v1, v2 };
}

/** The pair's light curve over one orbit at n + 1 phases, as a fraction of its light. */
export function lightCurvePoints(pair: EclipsingPair, n = 400): { x: number; y: number }[] {
  return Array.from({ length: n + 1 }, (_, k) => ({ x: k / n, y: relativeLight(pair, k / n) }));
}

/** The velocities' arithmetic, for the readout under Figure 14.2. */
export function weighByVelocities(pair: BinaryOrbit) {
  const { k1, k2 } = semiAmplitudes(pair);
  const min = minimumMasses(pair.period, k1, k2, pair.e);
  return { k1, k2, ratio: k2 / k1, min1: min.m1, min2: min.m2, sin3: Math.sin((pair.i * Math.PI) / 180) ** 3 };
}

/** The fit pair of Figure 14.2: β Aurigae's velocities measured on 24 nights, each to ±3 km/s (simulated from the published orbit). */
export const VELOCITY_FIT = (() => {
  const pair = ECLIPSE_PRESETS[1].pair;
  const phases = Array.from({ length: 24 }, (_, k) => (k * 0.6180339887 + 0.07) % 1);
  const one = measure(phases, (p) => binaryState(pair, p).v1, 3, 1889);
  const two = measure(phases, (p) => binaryState(pair, p).v2, 3, 1890);
  return { pair, phases, v1: one.values, v2: two.values, sigma: 3 };
})();

/** How well two semi-amplitudes (km/s) fit the measured velocities of Figure 14.2: χ² per measurement. */
export function velocityMisfit(k1: number, k2: number): number {
  const { phases, v1, v2, sigma, pair } = VELOCITY_FIT;
  const shape = phases.map((p) => Math.cos(binaryState(pair, p).nu + (pair.omega * Math.PI) / 180));
  const model1 = shape.map((s) => k1 * s);
  const model2 = shape.map((s) => -k2 * s);
  return (chiSquare(v1, model1, sigma) + chiSquare(v2, model2, sigma)) / (2 * phases.length);
}

/** The best-fitting semi-amplitudes for Figure 14.2's measurements, by least squares (the curves' shape is known, so it is linear). */
export function bestVelocityFit(): { k1: number; k2: number } {
  const { phases, v1, v2, pair } = VELOCITY_FIT;
  const shape = phases.map((p) => Math.cos(binaryState(pair, p).nu + (pair.omega * Math.PI) / 180));
  const ss = shape.reduce((a, s) => a + s * s, 0);
  return { k1: shape.reduce((a, s, k) => a + s * v1[k], 0) / ss, k2: -shape.reduce((a, s, k) => a + s * v2[k], 0) / ss };
}

/**
 * The fit pair of Figure 14.3: β Aurigae's light measured 600 times round its
 * orbit to 2 parts in 1,000 (simulated from the published solution, the
 * scatter of a small space telescope on a bright star).
 */
export const ECLIPSE_FIT = (() => {
  const pair = ECLIPSE_PRESETS[1].pair;
  const phases = Array.from({ length: 600 }, (_, k) => (k + 0.5) / 600);
  const data = measure(phases, (p) => relativeLight(pair, p), 0.002, 1783);
  return { pair, phases: Float64Array.from(phases), light: data.values, sigma: 0.002 };
})();

export interface EclipseFit {
  r1: number;
  r2: number;
  i: number;
}

/** χ² per measurement of an eclipse fit to Figure 14.3's measurements. */
export function eclipseMisfit(fit: EclipseFit): number {
  const { pair, phases, light, sigma } = ECLIPSE_FIT;
  const trial: EclipsingPair = { ...pair, ...fit };
  const model = Array.from(phases, (p) => relativeLight(trial, p));
  return chiSquare(light, model, sigma) / phases.length;
}

/**
 * The 1σ uncertainties of a fit's radii and tilt, from how sharply χ² curves
 * round its minimum: the covariance is twice the inverse of χ²'s matrix of
 * second derivatives (worked out by finite differences). Unlike stepping one
 * value at a time, this allows for the radii and tilt trading off against each other.
 */
export function eclipseUncertainties(fit: EclipseFit): EclipseFit {
  const n = ECLIPSE_FIT.phases.length;
  const keys = ['r1', 'r2', 'i'] as const;
  const h = { r1: 0.01, r2: 0.01, i: 0.1 };
  const chi = (d: Partial<Record<(typeof keys)[number], number>>) => eclipseMisfit({ r1: fit.r1 + (d.r1 ?? 0), r2: fit.r2 + (d.r2 ?? 0), i: fit.i + (d.i ?? 0) }) * n;
  const c0 = chi({});
  const H = keys.map((a) =>
    keys.map((b) => {
      if (a === b) return (chi({ [a]: h[a] }) - 2 * c0 + chi({ [a]: -h[a] })) / (h[a] * h[a]);
      return (chi({ [a]: h[a], [b]: h[b] }) - chi({ [a]: h[a], [b]: -h[b] }) - chi({ [a]: -h[a], [b]: h[b] }) + chi({ [a]: -h[a], [b]: -h[b] })) / (4 * h[a] * h[b]);
    }),
  );
  const inv = invert3(H);
  const sigma = (k: number) => Math.sqrt(Math.max(0, 2 * inv[k][k]));
  return { r1: sigma(0), r2: sigma(1), i: sigma(2) };
}

/** The inverse of a 3 × 3 matrix. */
function invert3(m: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

/** The best fit of the two radii and the tilt to Figure 14.3's measurements, by Nelder and Mead's downhill simplex. */
export function bestEclipseFit(start: EclipseFit): EclipseFit {
  const penalty = (r1: number, r2: number, i: number) => (r1 <= 0.1 || r2 <= 0.1 || i > 90 || i < 50 ? 1e9 : 0);
  const run = (from: EclipseFit) =>
    nelderMead(([r1, r2, i]) => penalty(r1, r2, i) || eclipseMisfit({ r1, r2, i }), [from.r1, from.r2, from.i], [0.3, 0.3, 2], { tolerance: 1e-7, maxEvaluations: 600 });
  // From the reader's guess and from equal stars at a middling tilt, in case the guess sits in the wrong valley.
  const best = [run(start), run({ r1: 2.5, r2: 2.5, i: 78 })].reduce((a, b) => (b.value < a.value ? b : a));
  return { r1: best.x[0], r2: best.x[1], i: best.x[2] };
}

/** What the light curve shows now, for Figure 14.3's caption. */
export function describeEclipses(pair: EclipsingPair): string {
  const curve = lightCurvePoints(pair, 400);
  const dip = Math.min(...curve.map((p) => p.y));
  const limit = pair.e === 0 ? eclipseLimit(pair, pair.r1, pair.r2) : null;
  const [l1] = lightShares(pair);
  if (dip >= 1) {
    return `No eclipses: tilted ${three(pair.i)}° from face-on, the stars pass above and below each other as we see them.${limit !== null ? ` They start to eclipse at ${limit.toFixed(1)}°.` : ''}`;
  }
  return `The deepest dip takes away ${Math.round((1 - dip) * 100)}% of the pair’s light. Star 1 gives ${Math.round(l1 * 100)}% of the light, star 2 ${Math.round((1 - l1) * 100)}%; the dip is deeper when the hotter star is hidden.`;
}

/** "2.76 ± 0.02": a fitted value and its uncertainty. */
export function plusMinus(value: number, error: number): string {
  const digits = Math.max(0, -Math.floor(Math.log10(error)) + (error < 0.002 ? 0 : 1) - 1);
  const d = Math.min(3, Math.max(1, digits));
  return `${value.toFixed(d)} ± ${error.toFixed(d)}`;
}

export { formatSuns };
