/**
 * Chapter 29's figure logic, kept apart from the drawing so it can be
 * tested: the pairs of Figure 29.1, the chirps of Figure 29.3, the census of
 * Figure 29.4, and the sources and detectors of Figure 29.5.
 */
import { C, G, M_SUN } from '../core/constants';
import { chirp, chirpMass, finalSpin, frequencyBefore, iscoFrequency, radiatedFraction, ringdown, symmetricMassRatio, timeBefore, type Chirp } from '../core/gr/chirp';
import { inspiralStrain, ligoNoise, lisaNoise, noiseStrain, ptaBackground, ptaReach, PTA_BACKGROUND, steadyStrain } from '../core/gr/sensitivity';
import { periodDecay, periastronAdvance, petersTrack, separationFor, type PetersTrack } from '../core/gr/peters';
import { PARSEC, SECONDS_PER_JULIAN_YEAR } from '../core/units';
import { MERGERS, RUNS, type MergerEvent, type RunId } from '../data/mergers';

const YEAR = SECONDS_PER_JULIAN_YEAR;

// ---------- Figure 29.1: the shrinking orbit ----------

export interface PairPreset {
  id: string;
  name: string;
  /** Masses, M☉. */
  m1: number;
  m2: number;
  /** Orbital period, s. */
  period: number;
  e: number;
  what: string;
}

/**
 * The pairs to try. The Hulse–Taylor pulsar: Weisberg & Huang (2016). The double pulsar: Kramer et al. (2021).
 * ZTF J1539+5027, two white dwarfs eclipsing every 6.91 minutes: Burdge et al. (2019). The Sun and Jupiter.
 */
export const PAIRS: readonly PairPreset[] = [
  { id: 'hulse-taylor', name: 'The Hulse–Taylor pulsar', m1: 1.438, m2: 1.39, period: 0.322997448918 * 86400, e: 0.617134, what: 'two neutron stars, one a pulsar (PSR B1913+16)' },
  { id: 'double-pulsar', name: 'The double pulsar', m1: 1.338185, m2: 1.248868, period: 0.10225156248 * 86400, e: 0.0877775, what: 'two neutron stars, both seen as pulsars (PSR J0737−3039A and B)' },
  { id: 'white-dwarfs', name: 'Two white dwarfs', m1: 0.61, m2: 0.21, period: 6.91 * 60, e: 0, what: 'two white dwarfs eclipsing each other (ZTF J1539+5027)' },
  { id: 'sun-jupiter', name: 'The Sun and Jupiter', m1: 1, m2: 9.547919e-4, period: 11.862 * YEAR, e: 0.0489, what: 'a star and its largest planet' },
];

/** Your own pair's starting values. */
export const OWN_PAIR: PairPreset = { id: 'own', name: 'Your own pair', m1: 10, m2: 10, period: 3600, e: 0.5, what: 'a pair of your choosing' };

/** The Hulse–Taylor pulsar's measured decay, corrected for the Galaxy's pull: observed ÷ relativity's prediction = 0.9983 ± 0.0016 (Weisberg & Huang 2016). */
export const HULSE_TAYLOR_RATIO = { value: 0.9983, error: 0.0016 } as const;

export interface PairFacts {
  a: number;
  /** Ṗ_b (s/s), the periastron's advance (degrees a year), the merger time (s, by Peters' equations) and the waves' frequency now (Hz). */
  pbdot: number;
  advance: number;
  mergeIn: number;
  waveFrequency: number;
  track: PetersTrack;
}

export function pairFacts(p: PairPreset): PairFacts {
  const m1 = p.m1 * M_SUN;
  const m2 = p.m2 * M_SUN;
  const a = separationFor(m1 + m2, p.period);
  const track = petersTrack(m1, m2, a, p.e, 400);
  return {
    a,
    pbdot: periodDecay(m1, m2, p.period, p.e),
    advance: (periastronAdvance(m1 + m2, p.period, p.e) * YEAR * 180) / Math.PI,
    mergeIn: track.mergeAt,
    waveFrequency: 2 / p.period,
    track,
  };
}

/** "300 million years", "12 minutes", "2.4 × 10²³ years": a time in words. */
export function formatDuration(s: number): string {
  const y = s / YEAR;
  if (y >= 1e12) {
    const e = Math.floor(Math.log10(y));
    const m = y / 10 ** e;
    return `${m.toFixed(1)} × 10${superscript(e)} years`;
  }
  if (y >= 1e9) return `${sig(y / 1e9)} billion years`;
  if (y >= 1e6) return `${sig(y / 1e6)} million years`;
  if (y >= 1e4) return `${Math.round(y / 1000).toLocaleString('en-GB')},000 years`;
  if (y >= 2) return `${Math.round(y).toLocaleString('en-GB')} years`;
  const d = s / 86400;
  if (d >= 2) return `${sig(d)} days`;
  const h = s / 3600;
  if (h >= 2) return `${sig(h)} hours`;
  const min = s / 60;
  if (min >= 2) return `${sig(min)} minutes`;
  if (s >= 1) return `${sig(s)} seconds`;
  if (s >= 1e-3) return `${Number((s * 1e3).toPrecision(2))} ms`;
  return `${Number((s * 1e6).toPrecision(2))} µs`;
}

function sig(x: number): string {
  return x >= 100 ? Math.round(x).toLocaleString('en-GB') : x >= 10 ? x.toFixed(0) : x.toFixed(1);
}

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function superscript(n: number): string {
  return String(n)
    .split('')
    .map((c) => (c === '-' ? '⁻' : SUPERSCRIPTS[Number(c)]))
    .join('');
}

/** A period in words: "7.75 hours", "6.9 minutes", "11.9 years". */
export function formatPeriod(s: number): string {
  if (s >= 2 * YEAR) return `${(s / YEAR).toFixed(1)} years`;
  if (s >= 2 * 86400) return `${(s / 86400).toFixed(1)} days`;
  if (s >= 2 * 3600) return `${(s / 3600).toFixed(2)} hours`;
  if (s >= 120) return `${(s / 60).toFixed(1)} minutes`;
  if (s >= 1) return `${s.toFixed(1)} seconds`;
  return `${(s * 1000).toFixed(1)} ms`;
}

/** A length in words: kilometres, or the Sun's radii, or AU. */
export function formatLength(m: number): string {
  const au = m / 1.495978707e11;
  if (au >= 100) return `${Number(au.toPrecision(2)).toLocaleString('en-GB')} AU`;
  if (au >= 0.1) return `${au.toFixed(2)} AU`;
  if (m >= 1e9) return `${(m / 6.957e8).toFixed(2)} R☉`;
  if (m >= 1e3) return `${Math.round(m / 1e3).toLocaleString('en-GB')} km`;
  return `${m.toFixed(0)} m`;
}

// ---------- Figure 29.3: chirps ----------

export interface ChirpPreset {
  id: string;
  name: string;
  /** Masses at the source, M☉; distance, Mpc; redshift. */
  m1: number;
  m2: number;
  mpc: number;
  z: number;
  neutronStars?: boolean;
}

function fromCatalogue(id: string, name: string, eventName: string, fallback: Omit<ChirpPreset, 'id' | 'name'>): ChirpPreset {
  const e = MERGERS.find((m) => m.name === eventName);
  if (!e?.m1 || !e.m2 || !e.d) return { id, name, ...fallback };
  return { id, name, m1: e.m1[0], m2: e.m2[0], mpc: e.d[0], z: e.z ?? fallback.z, neutronStars: fallback.neutronStars };
}

/** The chirps to start from: GW150914 as first reported (GWTC-1), the others from GWOSC's catalogue. */
export const CHIRP_PRESETS: readonly ChirpPreset[] = [
  { id: 'gw150914', name: 'GW150914', m1: 35.6, m2: 30.6, mpc: 440, z: 0.09 },
  fromCatalogue('gw170817', 'GW170817 (neutron stars)', 'GW170817', { m1: 1.46, m2: 1.27, mpc: 40, z: 0.01, neutronStars: true }),
  fromCatalogue('gw250114', 'GW250114 (the loudest)', 'GW250114_082203', { m1: 33.8, m2: 32.3, mpc: 405, z: 0.09 }),
  fromCatalogue('gw231123', 'GW231123 (the heaviest)', 'GW231123_135430', { m1: 137, m2: 101, mpc: 2200, z: 0.4 }),
];

/** The heaviest a neutron star can be, roughly, M☉: pairs with both masses below it are treated as neutron stars. */
export const NEUTRON_STAR_MAX = 2.5;

// ---------- Figure 29.4: the census ----------

export type MergerKind = 'bbh' | 'nsbh' | 'bns';

/** By the median masses: two above 3 M☉ are black holes, one below a neutron star (with the lower gap's objects counted as neutron stars by mass, as LVK's papers often do). */
export function kindOf(e: MergerEvent): MergerKind | null {
  if (!e.m1 || !e.m2) return null;
  if (e.m1[0] < 3) return 'bns';
  if (e.m2[0] < 3) return 'nsbh';
  return 'bbh';
}

export const KIND_NAMES: Record<MergerKind, string> = { bbh: 'two black holes', nsbh: 'a neutron star and a black hole', bns: 'two neutron stars' };

/** The events up to and including a run, in catalogue order. */
export function eventsUpTo(run: RunId): MergerEvent[] {
  const last = RUNS.findIndex((r) => r.id === run);
  const runs = new Set(RUNS.slice(0, last + 1).map((r) => r.id));
  return MERGERS.filter((e) => runs.has(e.run));
}

/** The pair-instability gap in black holes' masses (Chapter 25): about 50 to 130 M☉. */
export const PAIR_INSTABILITY_GAP = [50, 130] as const;
/** The heaviest neutron stars, about 2.3 M☉; the lower mass gap to the lightest black holes seen in X-ray binaries, about 5 M☉. */
export const NEUTRON_STAR_RANGE = [1.1, 2.3] as const;
export const LOWER_GAP = [2.3, 5] as const;

/** A histogram of the heavier masses (medians) in bins `width` M☉ wide, from 0 to `max`. */
export function heavierMassHistogram(events: readonly MergerEvent[], width = 5, max = 150): { x0: number; x1: number; count: number }[] {
  const bins = Array.from({ length: Math.ceil(max / width) }, (_, i) => ({ x0: i * width, x1: (i + 1) * width, count: 0 }));
  for (const e of events) if (e.m1) bins[Math.min(bins.length - 1, Math.floor(e.m1[0] / width))].count++;
  return bins;
}

// ---------- Figure 29.5: the gravitational-wave spectrum ----------

export interface Detector {
  id: string;
  name: string;
  /** Characteristic strain of its noise at f, √(f S_n). */
  noise: (f: number) => number;
  from: number;
  to: number;
  what: string;
}

export const DETECTORS: readonly Detector[] = [
  {
    id: 'pta',
    name: 'Pulsar timing arrays (after 15 years)',
    noise: (f) => ptaReach(f),
    from: 1e-9,
    to: 3e-7,
    what: 'Dozens of millisecond pulsars timed for years: a passing wave makes their ticks arrive early or late in a pattern that depends on their directions on the sky (the Hellings–Downs curve). The arms are the light-years to the pulsars.',
  },
  {
    id: 'lisa',
    name: 'LISA (planned, launch about 2035)',
    noise: (f) => noiseStrain(f, lisaNoise),
    from: 2e-5,
    to: 0.5,
    what: 'Three spacecraft 2.5 million kilometres apart, trailing Earth round the Sun, with lasers measuring the distances between test masses floating inside them. ESA adopted it in January 2024.',
  },
  {
    id: 'ligo',
    name: 'Advanced LIGO (design)',
    noise: (f) => noiseStrain(f, ligoNoise),
    from: 10,
    to: 5000,
    what: 'Two L-shaped interferometers with 4-km arms, in Washington and Louisiana, with Virgo in Italy and KAGRA in Japan (3-km arms). Below about 10 Hz the ground’s shaking drowns everything.',
  },
];

export interface WaveSource {
  id: string;
  name: string;
  /** A track (an inspiral sweeping up in frequency) or a point. */
  points: readonly { f: number; h: number }[];
  what: string;
}

function track(mc: number, D: number, from: number, to: number): { f: number; h: number }[] {
  const out: { f: number; h: number }[] = [];
  for (let i = 0; i <= 60; i++) {
    const f = from * (to / from) ** (i / 60);
    out.push({ f, h: inspiralStrain(mc, D, f) });
  }
  return out;
}

const MPC = 1e6 * PARSEC;
const FOUR_YEARS = 4 * YEAR;

/** The sources drawn, each at a stated distance, for a four-year look where it matters. */
export const SOURCES: readonly WaveSource[] = [
  {
    id: 'background',
    name: 'Pairs of supermassive black holes (the background)',
    points: Array.from({ length: 21 }, (_, i) => {
      const f = PTA_BACKGROUND.from * (PTA_BACKGROUND.to / PTA_BACKGROUND.from) ** (i / 20);
      return { f, h: ptaBackground(f) };
    }),
    what: 'A hum from pairs of black holes of hundreds of millions of Suns in the middles of galaxies, orbiting each other every few years, all over the universe at once. Pulsar timing arrays found its first evidence in 2023.',
  },
  {
    id: 'mbh',
    name: 'Two black holes of a million Suns, 1 Gpc away',
    points: track(chirpMass(1e6 * M_SUN, 1e6 * M_SUN), 1000 * MPC, 1e-5, iscoFrequency(2e6 * M_SUN)),
    what: 'Merging black holes like the one in the middle of the Milky Way, the heaviest that LISA will hear: their final years sweep through its band and their merger stands out above its noise by a factor of thousands.',
  },
  {
    id: 'white-dwarfs',
    name: 'Two white dwarfs in the Galaxy (ZTF J1539+5027, 2.3 kpc away)',
    points: [{ f: 2 / (6.91 * 60), h: steadyStrain(chirpMass(0.61 * M_SUN, 0.21 * M_SUN), 2.34e3 * PARSEC, 2 / (6.91 * 60), FOUR_YEARS) }],
    what: 'Tens of millions of pairs of white dwarfs in the Galaxy hum at millihertz, so many that most blur into a fog (the bump in LISA’s curve); the nearest and tightest, like ZTF J1539+5027, will stand out. Their orbits barely change in four years.',
  },
  {
    id: 'bbh',
    name: 'Two black holes like GW150914’s, 440 Mpc away',
    points: track(chirpMass(35.6 * M_SUN, 30.6 * M_SUN), 440 * MPC, 0.005, iscoFrequency(66.2 * M_SUN) * 2.2),
    what: 'Black holes of tens of Suns cross LISA’s band years before they merge, then sweep through LIGO’s in a fraction of a second.',
  },
  {
    id: 'bns',
    name: 'Two neutron stars like GW170817’s, 40 Mpc away',
    points: track(chirpMass(1.46 * M_SUN, 1.27 * M_SUN), 40 * MPC, 1, 1500),
    what: 'Neutron stars spend about a minute in LIGO’s band, thousands of cycles, before they touch at a kilohertz or more.',
  },
];

/** The waves' wavelength at frequency f, m. */
export function waveLength(f: number): number {
  return C / f;
}

/** What is going on at a frequency: its period, wavelength, and which detectors and sources are there. */
export function describeFrequency(f: number) {
  const period = 1 / f;
  const detectors = DETECTORS.filter((d) => f >= d.from && f <= d.to);
  const sources = SOURCES.filter((s) => {
    const fs = s.points.map((p) => p.f);
    return f >= Math.min(...fs) / 1.5 && f <= Math.max(...fs) * 1.5;
  });
  // The orbit of two Suns' worth that radiates at this frequency (the waves at twice the orbit's frequency)
  const orbit = separationFor(2 * M_SUN, 2 / f);
  return { period, wavelength: waveLength(f), detectors, sources, orbitForTwoSuns: orbit };
}

/** The heaviest a ground-based detector can hear: the ISCO frequency falls below 10 Hz above about 440 M☉. */
export function heaviestHeardFromGround(): number {
  return C ** 3 / (6 ** 1.5 * Math.PI * G * 10) / M_SUN;
}

// ---------- Figure 29.3: building a chirp for display and for sound ----------

/** A neutron star's radius for the contact estimate, m (about 12 km, Chapter 26). */
export const NEUTRON_STAR_RADIUS = 12e3;

export interface ChirpView {
  model: Chirp;
  neutronStars: boolean;
  /** The waves' frequency when two neutron stars touch (their centres two radii apart), Hz, or null. */
  contact: number | null;
  /** The energy radiated, M☉c² (none counted for neutron stars, whose merger the model doesn't follow). */
  radiated: number;
}

/** The sample rate for a chirp ending at frequency f: a power of two above 2.5 f, from 2,048 to 16,384 a second. */
export function sampleRateFor(fEnd: number): number {
  let r = 2048;
  while (r < 2.5 * fEnd && r < 16384) r *= 2;
  return r;
}

/**
 * A chirp for masses at the source (M☉) at a distance (Mpc) and redshift: the whole black-hole chirp, or, if both
 * are light enough to be neutron stars, the inspiral up to where they touch, its last 3 ms faded out. At most
 * `maxDuration` seconds of inspiral.
 */
export function chirpView(m1: number, m2: number, mpc: number, z: number, maxDuration = 16, rate?: number): ChirpView {
  const neutronStars = Math.max(m1, m2) <= NEUTRON_STAR_MAX;
  const M = (m1 + m2) * M_SUN;
  const contact = neutronStars ? Math.sqrt((G * M) / (2 * NEUTRON_STAR_RADIUS) ** 3) / Math.PI / (1 + z) : null;
  const eta = symmetricMassRatio(m1, m2);
  const fEnd = contact ?? ringdown(M * (1 - radiatedFraction(eta)) * (1 + z), finalSpin(eta)).f;
  const sampleRate = rate ?? sampleRateFor(fEnd);
  const model = chirp({ m1: m1 * M_SUN, m2: m2 * M_SUN, distance: mpc * 1e6 * PARSEC, redshift: z, fLow: 20, sampleRate, maxDuration, ringTimes: 12 });
  if (contact !== null) {
    // End where the frequency reaches contact, the last 3 ms faded out
    let cut = model.f.length - 1;
    for (let i = 0; i < model.f.length; i++) {
      if (model.f[i] >= contact) {
        cut = Math.max(1, i - 1);
        break;
      }
    }
    const fade = Math.min(cut, Math.round(0.003 * sampleRate));
    const h = model.h.slice(0, cut + 1);
    const amp = model.amp.slice(0, cut + 1);
    for (let i = cut - fade; i <= cut; i++) {
      const w = (cut - i) / fade;
      h[i] *= w;
      amp[i] *= w;
    }
    const f = model.f.slice(0, cut + 1);
    const t0 = -(cut / sampleRate);
    let peak = 0;
    for (const a of amp) peak = Math.max(peak, a);
    return { model: { ...model, h, amp, f, t0, tJoin: 0, fJoin: f[cut], peak }, neutronStars, contact, radiated: 0 };
  }
  return { model, neutronStars, contact: null, radiated: m1 + m2 - model.finalMass / M_SUN };
}

/** The leading-order frequency track for the same chirp mass, from the model's start: f = f(τ_c − t), Hz against time (s, the model's). */
export function leadingOrderTrack(model: Chirp, points = 160): { t: number; f: number }[] {
  const tc = model.t0 + timeBefore(model.mcSeen, model.fLow);
  const out: { t: number; f: number }[] = [];
  for (let i = 0; i < points; i++) {
    const tau = timeBefore(model.mcSeen, model.fLow) * (1 - i / points) ** 2;
    if (tau <= 0) break;
    out.push({ t: tc - tau, f: frequencyBefore(model.mcSeen, tau) });
  }
  return out;
}
