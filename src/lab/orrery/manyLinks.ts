import { CLUSTER_DEFAULTS, type ClusterConfig } from '../../core/nbody/clusterHost';
import { COLLISION_DEFAULTS, COLLISION_PRESETS, STAR_CHOICES, type CollisionConfig, type CollisionPreset, type DiscSetting } from '../../core/nbody/collisionHost';

/**
 * The Orrery's many-body modes in the page's address, so that Figures 30.1
 * and 31.1 can open what they show, and a run can be shared:
 *
 * - a cluster: ?mode=cluster&n=1000&masses=kroupa&orbit=8.2&rh=2
 *   (&model=king&w0=6, &tide=0, &seed=), or ?mode=cluster&preset=hyades;
 * - galaxies: ?mode=galaxies&encounter=antennae (&ratio=&peri=&e=&tilt=&spin=
 *   &ctilt=&cspin=&friction=&stars=), where `ctilt=none` means a companion
 *   without a disc.
 *
 * Values are checked and held to the lab's choices, so a link can't ask for
 * something the lab can't run.
 */

export type OrreryMode = 'planets' | 'cluster' | 'galaxies';

export const CLUSTER_STAR_CHOICES = [100, 250, 500, 1000, 2000] as const;
export const CLUSTER_ORBIT_CHOICES = [4, 8.2, 16] as const;
export const HALF_MASS_CHOICES = [1, 2, 4] as const;
export const W0_CHOICES = [3, 6, 9] as const;

/** A cluster's settings as a query (without the mode). */
export function clusterQuery(c: ClusterConfig): string {
  const parts = [`n=${c.n}`, `masses=${c.masses}`, `orbit=${c.orbit}`, `rh=${c.halfMass}`];
  if (c.model === 'king') parts.push('model=king', `w0=${c.w0 ?? 6}`);
  if (c.tide === false) parts.push('tide=0');
  if (c.seed !== 1) parts.push(`seed=${c.seed}`);
  return parts.join('&');
}

/** The nearest of the allowed values. */
function nearest<T extends number>(x: number, allowed: readonly T[]): T {
  return allowed.reduce((best, v) => (Math.abs(v - x) < Math.abs(best - x) ? v : best), allowed[0]);
}

function numberFrom(q: URLSearchParams, key: string): number | null {
  const raw = q.get(key);
  if (raw === null || raw.trim() === '') return null;
  const x = Number(raw);
  return Number.isFinite(x) ? x : null;
}

/** A cluster's settings from the address, held to the lab's choices (the defaults where something is missing or wrong). */
export function clusterFromQuery(q: URLSearchParams): ClusterConfig {
  const d = CLUSTER_DEFAULTS;
  const n = numberFrom(q, 'n');
  const orbit = numberFrom(q, 'orbit');
  const rh = numberFrom(q, 'rh');
  const w0 = numberFrom(q, 'w0');
  const seed = numberFrom(q, 'seed');
  const config: ClusterConfig = {
    n: n === null ? d.n : nearest(n, CLUSTER_STAR_CHOICES),
    masses: q.get('masses') === 'equal' ? 'equal' : 'kroupa',
    orbit: orbit === null ? d.orbit : nearest(orbit, CLUSTER_ORBIT_CHOICES),
    halfMass: rh === null ? d.halfMass : nearest(rh, HALF_MASS_CHOICES),
    seed: seed === null ? 1 : Math.min(1e6, Math.max(1, Math.round(Math.abs(seed)))),
  };
  if (q.get('model') === 'king') {
    config.model = 'king';
    config.w0 = w0 === null ? 6 : nearest(w0, W0_CHOICES);
  }
  if (q.get('tide') === '0') config.tide = false;
  return config;
}

const ENCOUNTERS = Object.keys(COLLISION_PRESETS) as CollisionPreset[];

/** An encounter's settings as a query (without the mode). */
export function collisionQuery(c: CollisionConfig): string {
  const parts = [
    `encounter=${c.preset}`,
    `ratio=${c.massRatio}`,
    `peri=${c.pericentre}`,
    `e=${c.eccentricity}`,
    `tilt=${c.main.tilt}`,
    `spin=${c.main.spin}`,
    c.companion ? `ctilt=${c.companion.tilt}` : 'ctilt=none',
  ];
  if (c.companion) parts.push(`cspin=${c.companion.spin}`);
  parts.push(`friction=${c.friction ? 1 : 0}`, `stars=${c.stars}`);
  if (c.seed !== 1) parts.push(`seed=${c.seed}`);
  return parts.join('&');
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** An encounter's settings from the address: its preset, then any changes, held to the figure's ranges and steps. */
export function collisionFromQuery(q: URLSearchParams): CollisionConfig {
  const name = q.get('encounter');
  const preset: CollisionPreset = ENCOUNTERS.includes(name as CollisionPreset) ? (name as CollisionPreset) : COLLISION_DEFAULTS.preset;
  const base = COLLISION_PRESETS[preset];
  const ratio = numberFrom(q, 'ratio');
  const peri = numberFrom(q, 'peri');
  const e = numberFrom(q, 'e');
  const tilt = numberFrom(q, 'tilt');
  const ctilt = q.get('ctilt');
  const ctiltValue = numberFrom(q, 'ctilt');
  const stars = numberFrom(q, 'stars');
  const seed = numberFrom(q, 'seed');
  const spinOf = (key: string, fallback: 1 | -1): 1 | -1 => (q.get(key) === '-1' ? -1 : q.get(key) === '1' ? 1 : fallback);
  const main: DiscSetting = { ...base.main, tilt: tilt === null ? base.main.tilt : clamp(Math.round(tilt / 5) * 5, 0, 90), spin: spinOf('spin', base.main.spin) };
  let companion: DiscSetting | null = base.companion;
  if (ctilt === 'none') companion = null;
  else if (ctiltValue !== null) {
    companion = { ...(base.companion ?? { tilt: 60, omega: base.main.omega, spin: 1 }), tilt: clamp(Math.round(ctiltValue / 5) * 5, 0, 90) };
  }
  if (companion) companion = { ...companion, spin: spinOf('cspin', companion.spin) };
  return {
    ...base,
    massRatio: ratio === null ? base.massRatio : clamp(Math.round(ratio * 20) / 20, 0.1, 1),
    pericentre: peri === null ? base.pericentre : clamp(Math.round(peri), 1, 50),
    eccentricity: e === null ? base.eccentricity : clamp(Math.round(e * 10) / 10, 0.3, 2),
    main,
    companion,
    friction: q.get('friction') === '0' ? false : q.get('friction') === '1' ? true : base.friction,
    stars: stars === null ? COLLISION_DEFAULTS.stars : nearest(stars, STAR_CHOICES),
    seed: seed === null ? 1 : Math.min(1e6, Math.max(1, Math.round(Math.abs(seed)))),
  };
}

/** Which mode the address asks for. */
export function modeFromQuery(q: URLSearchParams): OrreryMode {
  const mode = q.get('mode');
  return mode === 'cluster' || mode === 'galaxies' ? mode : 'planets';
}
