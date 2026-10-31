import { clampStar, parseStars, starToken, type ForgeStar } from '../../core/stellar/forge';
import { findPreset, PRESETS } from './presets';

/**
 * The Star Forge's state in its address, so a link opens the same stars:
 * ?preset=sun, ?mass=18&z=0.02&wind=1, ?stars=20,0.02,1;20,0.001,1, or
 * ?cluster=pleiades&age=120 (with &z= to override the cluster's own).
 * Chapters 17 and 18 link in with ?mass=, ?preset=sun, ?cluster=&age= and
 * ?mass=&z=. Values outside the limits are clamped, with a note.
 */

export const CLUSTER_IDS = ['pleiades', 'hyades', 'praesepe', 'm67', 'ngc188', '47tuc'] as const;
export const AGE_LIMITS = [1, 15000] as const;

export type ForgeState =
  | { mode: 'stars'; stars: ForgeStar[]; preset: string | null }
  | { mode: 'cluster'; cluster: string; age: number; z: number | null; preset: string | null };

export function presetState(id: string): ForgeState {
  const p = findPreset(id) ?? PRESETS[0];
  if (p.cluster) return { mode: 'cluster', cluster: p.cluster.id, age: p.cluster.age, z: null, preset: p.id };
  return { mode: 'stars', stars: [...p.stars!], preset: p.id };
}

/** Reads an address's query ("?mass=18&z=0.02"): the state it asks for, and notes on anything that had to change. */
export function fromQuery(search: string): { state: ForgeState; notes: string[] } {
  const q = new URLSearchParams(search);
  const notes: string[] = [];
  const num = (key: string) => (q.has(key) ? Number(q.get(key)) : undefined);

  const cluster = q.get('cluster');
  if (cluster !== null) {
    if (!(CLUSTER_IDS as readonly string[]).includes(cluster)) {
      notes.push(`There’s no cluster called “${cluster.slice(0, 30)}” here, so the Pleiades are shown.`);
    }
    const id = (CLUSTER_IDS as readonly string[]).includes(cluster) ? cluster : 'pleiades';
    let age = num('age') ?? (id === 'pleiades' ? 120 : 1000);
    if (!Number.isFinite(age)) age = 1000;
    if (age < AGE_LIMITS[0] || age > AGE_LIMITS[1]) {
      const to = Math.min(AGE_LIMITS[1], Math.max(AGE_LIMITS[0], age));
      notes.push(`Ages run from 1 million to 15 billion years, so the age became ${to} million years.`);
      age = to;
    }
    const zIn = num('z');
    const z = zIn === undefined ? null : clampStar({ mass: 1, z: zIn, wind: 1 });
    if (z) notes.push(...z.notes);
    const preset = PRESETS.find((p) => p.cluster?.id === id && p.cluster.age === age && !z)?.id ?? null;
    return { state: { mode: 'cluster', cluster: id, age, z: z ? z.star.z : null, preset }, notes };
  }

  const stars = q.get('stars');
  if (stars !== null) {
    const parsed = parseStars(stars);
    if (parsed) return { state: { mode: 'stars', stars: parsed.stars, preset: null }, notes: parsed.notes };
    notes.push('The stars in this link couldn’t be read, so the Sun is shown instead.');
    return { state: presetState('sun'), notes };
  }

  const mass = num('mass');
  if (mass !== undefined) {
    const c = clampStar({ mass, z: num('z') ?? 0.02, wind: num('wind') ?? 1 });
    return { state: { mode: 'stars', stars: [c.star], preset: null }, notes: c.notes };
  }

  const preset = q.get('preset');
  if (preset !== null && !findPreset(preset)) notes.push(`There’s no preset called “${preset.slice(0, 30)}”, so the Sun is shown.`);
  return { state: presetState(preset ?? 'sun'), notes };
}

/** The query that opens a state again: the preset's own when it is one, otherwise the values. */
export function toQuery(state: ForgeState): string {
  if (state.preset) return `?preset=${state.preset}`;
  if (state.mode === 'cluster') return `?cluster=${state.cluster}&age=${state.age}${state.z === null ? '' : `&z=${state.z}`}`;
  if (state.stars.length === 1) {
    const s = state.stars[0];
    return `?mass=${s.mass}&z=${s.z}&wind=${s.wind}`;
  }
  return `?stars=${state.stars.map(starToken).join(';')}`;
}
