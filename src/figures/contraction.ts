import { contract, type ContractionState, type ContractionTrack } from '../core/structure/contraction';
import { L_SUN, R_SUN } from '../core/constants';
import { SECONDS_PER_JULIAN_YEAR } from '../core/units';

/**
 * Figure 20.2's helpers: the balls of gas to try, the predict-first answers,
 * and what each moment of a contraction says.
 */

export const CONTRACTION_PRESETS = [
  { id: 'sun', name: 'The Sun', mass: 1 },
  { id: 'red-dwarf', name: 'A red dwarf', mass: 0.2 },
  { id: 'brown-dwarf', name: 'A brown dwarf', mass: 0.05 },
  { id: 'planet-mass', name: '15 Jupiters', mass: 0.0143 },
] as const;

export const CONTRACTION_MASSES: readonly [number, number] = [0.01, 1.4];

export const CONTRACTION_PREDICTIONS = [
  { id: 'cools', label: 'It cools down, like an ember', correct: false },
  { id: 'same', label: 'It stays at the same temperature', correct: false },
  { id: 'heats', label: 'It heats up', correct: true },
] as const;

const tracks = new Map<number, ContractionTrack>();
/** A contraction, cached by mass. */
export function contractionOf(mass: number): ContractionTrack {
  const key = Number(mass.toPrecision(3));
  let t = tracks.get(key);
  if (!t) {
    t = contract(key);
    tracks.set(key, t);
  }
  return t;
}

export const years = (seconds: number) => seconds / SECONDS_PER_JULIAN_YEAR;

/** "50 million years", "12,000 years", "1.1 billion years". */
export function formatYears(y: number): string {
  if (y >= 1e9) return `${Number((y / 1e9).toPrecision(2))} billion years`;
  if (y >= 1e6) return `${Number((y / 1e6).toPrecision(2))} million years`;
  if (y >= 1) return `${Number(y.toPrecision(2)).toLocaleString('en-GB')} years`;
  return 'a year';
}

/** "1.6 million K", "300,000 K". */
export function formatTemperature(t: number): string {
  if (t >= 1e6) return `${Number((t / 1e6).toPrecision(2))} million K`;
  return `${Number(t.toPrecision(2)).toLocaleString('en-GB')} K`;
}

export const solarRadii = (s: ContractionState) => s.radius / R_SUN;
export const solarLuminosities = (s: ContractionState) => s.luminosity / L_SUN;

/** The energy so far, as shares of what gravity has released: heat gained, packed electrons, radiated. Shares of zero at the start. */
export function energyShares(track: ContractionTrack, s: ContractionState) {
  const first = track.states[0];
  const released = first.gravity - s.gravity;
  if (released <= 0) return { released: 0, heat: 0, packing: 0, radiated: 0 };
  return {
    released,
    heat: (s.heat - first.heat) / released,
    packing: (s.packing - first.packing) / released,
    radiated: s.radiated / released,
  };
}

/** What the end of a contraction means, in a sentence. */
export function outcomeText(track: ContractionTrack): string {
  const last = track.states[track.states.length - 1];
  if (track.outcome === 'ignites') {
    return `Hydrogen ignites when the centre reaches ${formatTemperature(last.tC)}, after ${formatYears(years(last.age))} of shrinking: a star is born, at ${solarRadii(last).toPrecision(2)} times the Sun’s radius.`;
  }
  return `It never gets hot enough to fuse hydrogen. Its centre peaks at ${formatTemperature(track.peakTemperature)}; then its electrons, packed tight, hold it up without heat, and it cools as it shines: a brown dwarf.`;
}
