import { AU, R_SUN } from '../core/constants';
import { fromGaia, fromPhysics, type HRPoint } from '../core/stars/hr';
import { lifeOf, msLifetime, phasesOf, stateAt, turnoffMass, zFromFeH, Z_SUN_SSE, type IsochronePoint, type Phase } from '../core/stellar/lives';
import type { SseStep, SseTrack } from '../core/stellar/sse/evolve';
import { LEAVITT, PL_V, type LeavittStar } from '../data/cepheids';
import clusterData from '../data/gaia/clusters.json';
import { famousStar } from '../data/stars';

/** Helpers for Chapter 17's figures: lifetimes, the Sun's life, clusters and their ages, and Leavitt's Cepheids. Times in Myr unless named. */

// —— Formatting ——

/** A span of time given in Myr, in words: "42 million years", "10 billion years", "3.7 trillion years". */
export function formatMyr(myr: number): string {
  const years = myr * 1e6;
  const sig = (x: number) => Number(x.toPrecision(2)).toLocaleString('en-GB');
  if (years >= 1e12) return `${sig(years / 1e12)} trillion years`;
  if (years >= 1e9) return `${sig(years / 1e9)} billion years`;
  if (years >= 1e6) return `${sig(years / 1e6)} million years`;
  if (years >= 1e3) return `${sig(years / 1e3)} thousand years`;
  return `${sig(Math.max(years, 1))} years`;
}

/** A short form for axes: "4.6 Gyr", "120 Myr", "300 kyr". */
export function shortMyr(myr: number): string {
  const sig = (x: number) => Number(x.toPrecision(2)).toLocaleString('en-GB');
  if (myr >= 1e6) return `${sig(myr / 1e6)} Tyr`;
  if (myr >= 1e3) return `${sig(myr / 1e3)} Gyr`;
  if (myr >= 1) return `${sig(myr)} Myr`;
  if (myr >= 1e-3) return `${sig(myr * 1e3)} kyr`;
  return `${sig(myr * 1e6)} yr`;
}

// —— Figure 17.1: lifetimes ——

/** The Sun's age and the oldest stars' (the Galaxy's), Myr. */
export const SUN_AGE = 4570;
export const GALAXY_AGE = 13000;

export const LIFETIME_MASSES: [number, number] = [0.1, 100];

/** The main-sequence lifetime (years) against mass, from SSE at solar metallicity, log-spaced. */
export function lifetimeCurve(n = 80, z = Z_SUN_SSE): { mass: number; years: number }[] {
  const [lo, hi] = LIFETIME_MASSES;
  return Array.from({ length: n }, (_, i) => {
    const mass = lo * (hi / lo) ** (i / (n - 1));
    return { mass, years: msLifetime(mass, z) * 1e6 };
  });
}

/** The rule of thumb t ≈ 10 billion years × M^−2.5 (years). */
export const ruleOfThumb = (mass: number) => 1e10 * mass ** -2.5;

/** Famous stars with their masses, for the lifetime chart. */
export const LIFETIME_STARS = ['proxima', 'alpha-cen-b', 'sun', 'procyon-a', 'sirius-a', 'polaris', 'spica', 'betelgeuse', 'rigel'].map((id) => {
  const s = famousStar(id);
  return { id, name: s.name, mass: s.mass.value };
});

export interface LifetimeReadout {
  mass: number;
  years: number;
  /** Lifetime against the Sun's (SSE's 1 M☉). */
  vsSun: number;
  /** Fuel (∝ mass) and burn rate (∝ luminosity at arrival, L ∝ M^3.5 roughly) against the Sun's. */
  fuel: number;
  burn: number;
  /** Has any star of this mass died yet, in the Galaxy's 13 billion years? */
  anyDied: boolean;
}

export function lifetimeReadout(mass: number, z = Z_SUN_SSE): LifetimeReadout {
  const years = msLifetime(mass, z) * 1e6;
  const sun = msLifetime(1, z) * 1e6;
  return { mass, years, vsSun: years / sun, fuel: mass, burn: (mass / 1) * (sun / years), anyDied: years < GALAXY_AGE * 1e6 };
}

/** Choices for the predict-first question, the right one first. */
export const LIFETIME_PREDICTIONS = [
  { id: 'light', label: 'The light star', correct: true },
  { id: 'heavy', label: 'The heavy star: it has more fuel', correct: false },
  { id: 'same', label: 'About the same', correct: false },
] as const;

// —— Figure 17.2: the Sun's life ——

/** The planets whose orbits the figure draws, at their distances today (AU). */
export const INNER_PLANETS = [
  { name: 'Mercury', au: 0.387 },
  { name: 'Venus', au: 0.723 },
  { name: 'Earth', au: 1 },
  { name: 'Mars', au: 1.524 },
] as const;

/** One astronomical unit in solar radii. */
export const AU_IN_R_SUN = AU / R_SUN;

let sunTrack: SseTrack | null = null;
/** The Sun's life from SSE: 1 M☉ at Z = 0.02, to a white dwarf cooling for 250 million years. */
export function sunLife(): SseTrack {
  sunTrack ??= lifeOf(1, Z_SUN_SSE);
  return sunTrack;
}

/** The Sun's phases, from its track. */
export const sunPhases = (): Phase[] => phasesOf(sunLife());

/** When the Sun stops being a star and becomes a white dwarf, Myr. */
export function sunDeath(): number {
  return sunLife().steps.find((s) => s.kw >= 10)!.t;
}

/** The Sun at a time (Myr after it reached the main sequence). */
export function sunAt(t: number): SseStep {
  const track = sunLife();
  return stateAt(track, t) ?? track.steps[track.steps.length - 1];
}

/**
 * A planet's orbit (AU) when the Sun has lost mass: as it loses mass slowly, orbits widen in proportion,
 * a × M stays the same. (Tides, which pull a planet in, are left out.)
 */
export const widenedOrbit = (au: number, sunMass: number) => au / sunMass;

export interface SunMilestones {
  leavesMainSequence: number;
  heliumFlash: number;
  /** The tip of the red-giant branch: time, radius (R☉ and AU), luminosity, mass left. */
  tip: { t: number; R: number; au: number; L: number; mass: number };
  /** The largest the Sun gets on the asymptotic giant branch. */
  agbMax: { t: number; R: number; au: number; L: number; mass: number };
  whiteDwarf: { t: number; mass: number };
}

export function sunMilestones(): SunMilestones {
  const steps = sunLife().steps;
  const first = (kw: number) => steps.find((s) => s.kw === kw)!;
  const largest = (kws: number[]) => steps.filter((s) => kws.includes(s.kw)).reduce((a, b) => (b.R > a.R ? b : a));
  const describe = (s: SseStep) => ({ t: s.t, R: s.R, au: s.R / AU_IN_R_SUN, L: s.L, mass: s.mt });
  const wd = steps.find((s) => s.kw >= 10)!;
  return {
    leavesMainSequence: first(2).t,
    heliumFlash: first(4).t,
    tip: describe(largest([3])),
    agbMax: describe(largest([5, 6])),
    whiteDwarf: { t: wd.t, mass: wd.mt },
  };
}

/** Which planets the Sun's surface reaches at a moment, allowing for their widened orbits. */
export function swallowed(step: SseStep): string[] {
  return INNER_PLANETS.filter((p) => widenedOrbit(p.au, step.mt) * AU_IN_R_SUN < step.R).map((p) => p.name);
}

// —— Figure 17.3: age a cluster ——

export interface ClusterInfo {
  id: string;
  name: string;
  members: number;
  /** Distance, pc; E(B − V), mag; [Fe/H]. */
  distance: number;
  distanceSource: string;
  ebv: number;
  feh: number;
  /** Published age range, Myr, and where it comes from. */
  age: [number, number];
  ageSource: string;
  stars: number[];
}

export const CLUSTERS = clusterData.clusters as unknown as ClusterInfo[];

export const clusterById = (id: string) => CLUSTERS.find((c) => c.id === id)!;

/** Gaia's reddening and dimming per magnitude of E(B − V): E(BP − RP) = 1.339 E(B − V), A_G = 2.740 E(B − V) (Casagrande & VandenBerg 2018). */
export const GAIA_REDDENING = { bpRp: 1.339, g: 2.74 } as const;

/** A cluster's members on the observers' axes, corrected for distance and dust. */
export function clusterPoints(c: ClusterInfo): HRPoint[] {
  const modulus = 5 * Math.log10(c.distance) - 5;
  const out: HRPoint[] = [];
  for (let i = 0; i < c.stars.length; i += 2) {
    const bpRp = c.stars[i] / 1000 - GAIA_REDDENING.bpRp * c.ebv;
    const mG = c.stars[i + 1] / 100 - modulus - GAIA_REDDENING.g * c.ebv;
    out.push(fromGaia(bpRp, mG));
  }
  return out;
}

/** SSE's metallicity for a cluster (Z = 0.02 is solar on SSE's scale). */
export const clusterZ = (c: ClusterInfo) => zFromFeH(c.feh);

/** An isochrone's stars on the HR diagram, by temperature and luminosity (main-sequence colours and corrections, so approximate for giants). */
export function isochroneHR(points: readonly IsochronePoint[]): HRPoint[] {
  return points.map((p) => fromPhysics(Math.min(40000, Math.max(2300, p.T)), p.L));
}

/** The ages the cluster figure's slider spans, Myr. */
export const AGE_RANGE: [number, number] = [10, 15000];

/** Isochrone ages step by a hundredth of a power of ten (2.3%), the slider's step. */
export const AGE_STEP = 0.01;

/**
 * An age (Myr) moved to the nearest step of an even grid in log age, 2.3% apart, rounded to three figures:
 * 100, 102, 105, 107, 110, … Isochrones at these ages are worked out once and then come from the cache.
 */
export const snapAge = (age: number) => Number((10 ** (Math.round(Math.log10(age) / AGE_STEP) * AGE_STEP)).toPrecision(3));

export function turnoffReadout(age: number, z: number) {
  const mass = turnoffMass(age, z);
  return { mass, lifetime: msLifetime(mass, z) };
}

// —— Figure 17.4: Leavitt's law ——

/** A least-squares line through magnitude against log₁₀ period: m = a + b log P. */
export function fitLine(points: readonly { logP: number; mag: number }[]): { a: number; b: number } {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.logP, 0) / n;
  const my = points.reduce((s, p) => s + p.mag, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sxy += (p.logP - mx) * (p.mag - my);
    sxx += (p.logP - mx) ** 2;
  }
  const b = sxy / sxx;
  return { a: my - b * mx, b };
}

/** Leavitt's maxima and minima, each with its straight line against log P. */
export function leavittFits(stars: readonly LeavittStar[] = LEAVITT) {
  const max = fitLine(stars.map((s) => ({ logP: Math.log10(s.period), mag: s.max })));
  const min = fitLine(stars.map((s) => ({ logP: Math.log10(s.period), mag: s.min })));
  return { max, min };
}

/** A Cepheid's absolute visual magnitude from its period (days), by Benedict et al.'s (2007) calibration. */
export const cepheidAbsoluteV = (period: number) => PL_V.slope * (Math.log10(period) - 1) + PL_V.zero;

/** Its power in visible light, in Suns (the Sun's M_V is 4.83). */
export const cepheidLuminosity = (period: number) => 10 ** (0.4 * (4.83 - cepheidAbsoluteV(period)));

/** Its distance (pc) from the period (days), the mean apparent V magnitude and the dimming by dust (magnitudes). */
export const cepheidDistance = (period: number, meanV: number, av: number) => 10 ** ((meanV - cepheidAbsoluteV(period) - av + 5) / 5);

/**
 * A schematic Cepheid light curve: brightness from 1 (maximum) to 0 (minimum) at a phase (0–1 from maximum). It
 * fades slowly for four-fifths of the cycle and brightens quickly in the last fifth, as Cepheids do; the shape is
 * drawn, not measured.
 */
export function cepheidShape(phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  const fall = 0.8;
  if (p < fall) return 1 - (p / fall) ** 0.75;
  return Math.sin(((p - fall) / (1 - fall)) * (Math.PI / 2)) ** 2;
}

/** The magnitude at a phase, between the brightest and faintest magnitudes. */
export const cepheidMagnitude = (phase: number, brightest: number, faintest: number) => faintest - (faintest - brightest) * cepheidShape(phase);
