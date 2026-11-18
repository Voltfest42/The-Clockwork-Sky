import type { ClusterConfig } from '../../core/nbody/clusterHost';
import { COLLISION_PRESETS, type CollisionPreset } from '../../core/nbody/collisionHost';

/**
 * Ready-made runs for the Orrery's many-body modes. Clusters use the engine
 * of Figure 30.1 (Hermite with block steps, every star pulling every other),
 * galaxies the engine of Figure 31.1 (Toomre's restricted method with
 * dynamical friction).
 */

export type ClusterPresetId = 'young-open' | 'core-collapse' | 'hyades';

export interface ClusterPreset {
  id: ClusterPresetId;
  name: string;
  blurb: string;
  tryThis: string;
  config: ClusterConfig;
  /** Pause the run when it reaches this time, Myr (the Hyades' age). */
  stopAt?: number;
  colourBy: 'mass' | 'bound';
}

export const CLUSTER_PRESETS: readonly ClusterPreset[] = [
  {
    id: 'young-open',
    name: 'A young open cluster dissolves',
    blurb: 'Five hundred stars, Kroupa’s mix of masses, 4 kpc from the Galaxy’s centre, where its tide is strong. Stars that gain enough energy in close passes cross the Jacobi radius and drift away; within about half a billion years almost nothing is left.',
    tryThis: 'Colour the stars by bound or escaped and run it. When half the mass has gone, frame the whole tails: which way does each tail point? Then move the cluster out to 16 kpc and run it again.',
    config: { n: 500, masses: 'kroupa', orbit: 4, halfMass: 2, seed: 1 },
    colourBy: 'bound',
  },
  {
    id: 'core-collapse',
    name: 'A cluster alone: core collapse',
    blurb: 'Five hundred stars, Kroupa’s mix, alone in space with no tide. Close passes share energy out: the heavy stars sink, and the core shrinks and heats while the outskirts swell, the runaway called core collapse. With a mix of masses it comes within about eight relaxation times.',
    tryThis: 'Watch the chart of radii: the 2% and 10% radii fall while the 90% radius grows. Then try all equal masses: the core shrinks far more slowly (theory gives about fifteen relaxation times to collapse, and the softening here slows it further).',
    config: { n: 500, masses: 'kroupa', orbit: 8.2, halfMass: 2, seed: 1, tide: false },
    colourBy: 'mass',
  },
  {
    id: 'hyades',
    name: 'The Hyades’ tails',
    blurb: 'A thousand stars on a circular orbit at the Sun’s distance from the Galaxy’s centre, run to the Hyades’ age of about 650 million years. Gaia found the real cluster’s two tails, each hundreds of parsecs long (2019).',
    tryThis: 'Let it run to 650 million years (it pauses there; it takes a few minutes). Frame the whole tails: one leads the cluster round the Galaxy, nearer the centre; the other trails, further out.',
    config: { n: 1000, masses: 'kroupa', orbit: 8.2, halfMass: 2, seed: 1 },
    stopAt: 650,
    colourBy: 'bound',
  },
];

export function findClusterPreset(id: string | null): ClusterPreset | undefined {
  return CLUSTER_PRESETS.find((p) => p.id === id);
}

/** The encounters offered in the Orrery: Figure 31.1's four and the Milky Way meeting Andromeda. */
export const GALAXY_PRESETS: readonly CollisionPreset[] = ['antennae', 'mice', 'ring', 'flyby', 'milky-way'];

export function isGalaxyPreset(id: string | null): id is CollisionPreset {
  return id !== null && id in COLLISION_PRESETS;
}
