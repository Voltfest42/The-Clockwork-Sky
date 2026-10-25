import earth from './earth.webp';
import jupiter from './jupiter.webp';
import mars from './mars.webp';
import mercury from './mercury.webp';
import moon from './moon.webp';
import neptune from './neptune.webp';
import saturnRing from './saturn-ring.webp';
import saturn from './saturn.webp';
import uranus from './uranus.webp';
import venus from './venus.webp';
import type { WorldId } from '../planets';

/**
 * Maps of the planets for the globes (Figure 8.2): Solar System Scope's 2k
 * textures (solarsystemscope.com/textures, CC BY 4.0), resized to 1024 × 512
 * WebP by scripts/build-textures.py. Each is a URL, fetched only when a globe
 * needs it. Venus is its cloud tops, as a visitor would see it.
 */
export const TEXTURES: Record<WorldId, string> = { mercury, venus, earth, moon, mars, jupiter, saturn, uranus, neptune };

/** Saturn's rings, as a strip from the inner edge (left) to the outer, with transparency. */
export const SATURN_RING_TEXTURE = saturnRing;

export const TEXTURE_CREDIT = 'Planet maps: Solar System Scope (solarsystemscope.com), CC BY 4.0';
