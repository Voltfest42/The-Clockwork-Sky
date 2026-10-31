import { AU, R_SUN } from '../../core/constants';
import { BROWN_DWARF_KW, type ForgeLife } from '../../core/stellar/forge';
import { FATE_NAMES } from '../../core/stellar/lives';
import type { SseStep } from '../../core/stellar/sse/evolve';
import { physicistRange, type AxisRange } from '../../viz/hr/axes';
import { formatRadius, msun } from './format';

/** The Star Forge's helpers for its views: the HR diagram's range, a star's layers, and its state and fate in words. */

export const AU_IN_R_SUN = AU / R_SUN;
/** Neutron stars, black holes and nothing: off the HR diagram. */
export const isGone = (kw: number) => kw === 13 || kw === 14 || kw === 15;
export const isLiving = (kw: number) => kw < 10 || kw === BROWN_DWARF_KW;

/** The diagram's range: every star from hot white dwarfs to red supergiants, widened for brown dwarfs and old white dwarfs when they are shown. */
export function forgeRange(lives: readonly ForgeLife[]): AxisRange {
  let cool = 1800;
  let faint = 10 ** -5.5;
  for (const life of lives) {
    for (const s of life.track.steps) {
      if (isGone(s.kw)) continue;
      cool = Math.min(cool, s.T * 0.85);
      faint = Math.min(faint, s.L * 0.4);
    }
  }
  return physicistRange(250000, Math.max(300, cool), Math.max(1e-9, faint), 10 ** 7.2);
}

/** What each stellar type is, as a noun: "a red giant", "an asymptotic-giant-branch star". */
export const TYPE_NOUNS: Record<number, string> = {
  0: 'a fully convective main-sequence star',
  1: 'a main-sequence star',
  2: 'a star crossing to the giants',
  3: 'a red giant',
  4: 'a giant burning helium in its core',
  5: 'an asymptotic-giant-branch star',
  6: 'a pulsing asymptotic-giant-branch star',
  7: 'a helium star',
  8: 'a helium star swelling up',
  9: 'a helium giant',
  10: 'a helium white dwarf',
  11: 'a carbon–oxygen white dwarf',
  12: 'an oxygen–neon white dwarf',
  13: 'a neutron star',
  14: 'a black hole',
  15: 'nothing',
  [BROWN_DWARF_KW]: 'a brown dwarf',
};

/** What the star is now, in a phrase: "a red giant, 22 times the Sun’s width". */
export function describeNow(s: SseStep): string {
  if (s.kw === 15) return 'nothing at all';
  if (s.kw === 14) return `a black hole whose horizon is ${formatRadius(s.R)}`;
  if (s.kw === 13) return `a neutron star ${formatRadius(s.R)}`;
  return `${TYPE_NOUNS[s.kw]}, ${formatRadius(s.R)}`;
}

export interface Layer {
  name: string;
  /** Inner and outer edges as fractions of the radius, and of the mass. */
  r: [number, number];
  m: [number, number];
  colour: string;
}

const CORE = '#ef8a6f';
const RADIATIVE = '#ffd166';
const CONVECTIVE = '#8ecae6';
const HELIUM = '#cdb4f6';

/** The star's layers from SSE's core and convective envelope; see the note under the view for what SSE doesn't give. */
export function layersOf(s: SseStep): Layer[] {
  const R = s.R;
  const M = Math.max(s.mt, 1e-12);
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  if (s.kw >= 10 && s.kw <= 15) return [];
  if (s.kw === 0 || s.kw === BROWN_DWARF_KW) return [{ name: 'Convection zone: the whole star churns', r: [0, 1], m: [0, 1], colour: CONVECTIVE }];
  if (s.kw === 7) return [{ name: 'Helium, burning at the centre', r: [0, 1], m: [0, 1], colour: HELIUM }];
  const coreR = clamp(s.rc / R);
  const coreM = clamp(s.mc / M);
  const envR = clamp(s.renv / R);
  const envM = clamp(s.menv / M);
  const out: Layer[] = [];
  if (s.kw >= 2 && coreM > 0) {
    const name = s.kw === 8 || s.kw === 9 ? 'Carbon–oxygen core' : s.kw >= 5 ? 'Core: carbon and oxygen inside helium' : s.kw === 4 ? 'Helium core, burning helium' : 'Helium core';
    out.push({ name, r: [0, coreR], m: [0, coreM], colour: CORE });
  }
  const inner: [number, number] = [out.length ? coreR : 0, out.length ? coreM : 0];
  const hasEnvelope = envR > 1e-6 && envM > 1e-9;
  const conv: [number, number] = hasEnvelope ? [Math.max(inner[0], 1 - envR), Math.max(inner[1], 1 - envM)] : [1, 1];
  const middle = s.kw === 8 || s.kw === 9 ? 'Helium envelope' : s.kw <= 1 ? 'Radiative zone: light carries the heat out' : 'Hydrogen envelope, carried by light';
  if (conv[0] > inner[0] + 1e-6 || conv[1] > inner[1] + 1e-6) out.push({ name: middle, r: [inner[0], conv[0]], m: [inner[1], conv[1]], colour: s.kw === 8 || s.kw === 9 ? HELIUM : RADIATIVE });
  if (hasEnvelope) out.push({ name: 'Convective envelope: hot gas rises, cool gas sinks', r: [conv[0], 1], m: [conv[1], 1], colour: CONVECTIVE });
  return out;
}

export const ZONE_STYLE = {
  fitted: { fill: '#2a9d8f', name: 'Fitted to detailed models' },
  extrapolated: { fill: '#e9c46a', name: 'Formulas stretched beyond their models' },
  'other-model': { fill: '#9d7ad6', name: 'Other models take over' },
  unreliable: { fill: '#9aa5b1', name: 'Nothing here is reliable' },
} as const;

/** "a neutron star", "an oxygen–neon white dwarf". */
export const withArticle = (name: string) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name.toLowerCase()}`;

/** "A neutron star of 2.0 M☉", "Nothing", "A brown dwarf". */
export function fateWords(life: ForgeLife): string {
  const f = life.fate;
  if (f.kind === 'nothing') return 'Nothing';
  if (f.kind === 'brown-dwarf') return 'A brown dwarf, fading';
  return `${FATE_NAMES[f.kind]}, ${msun(f.remnant)}`;
}

