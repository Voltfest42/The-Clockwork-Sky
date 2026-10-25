import { DAYS_PER_JULIAN_YEAR } from '../core/units';
import type { World } from '../data/planets';

/**
 * The sums behind the planet cards (Figure 8.2): your weight and your age on
 * another world, and days and years in words.
 */

/** What a bathroom scale would read there (kg), for someone who reads `kg` on Earth: the scale measures the pull, which goes with the surface gravity. */
export function weightThere(kg: number, world: Pick<World, 'gravity'>): number {
  return kg * world.gravity;
}

/** Your age in that world's years, for an age in Earth years. */
export function ageThere(years: number, world: Pick<World, 'orbitDays'>): number {
  return (years * DAYS_PER_JULIAN_YEAR) / world.orbitDays;
}

/** A length of time given in hours, in words: "23 hours 56 minutes", "58.6 days", "11.9 years". */
export function formatHours(hours: number): string {
  const h = Math.abs(hours);
  if (h < 48) {
    const whole = Math.floor(h);
    const minutes = Math.round((h - whole) * 60);
    if (minutes === 60) return `${whole + 1} hours`;
    return minutes ? `${whole} hours ${minutes} minutes` : `${whole} hours`;
  }
  return formatDays(h / 24);
}

/** A length of time given in days, in words. */
export function formatDays(days: number): string {
  if (days < 2) return formatHours(days * 24);
  if (days < 1000) return `${days < 100 ? days.toFixed(1) : Math.round(days).toLocaleString('en-GB')} days`;
  return `${(days / DAYS_PER_JULIAN_YEAR).toFixed(1)} years`;
}

/** A year there, in words, with days for short years: "88 days", "11.9 years". */
export function formatYear(world: Pick<World, 'orbitDays'>): string {
  return world.orbitDays < 1000 ? `${Math.round(world.orbitDays)} days` : `${(world.orbitDays / DAYS_PER_JULIAN_YEAR).toFixed(1)} Earth years`;
}

/** A number in words that keep about three figures: 0.055, 0.815, 14.5, 317.8, 1,321. */
export function threeFigures(x: number): string {
  if (x >= 1000) return Math.round(x).toLocaleString('en-GB');
  if (x >= 100) return x.toFixed(0);
  if (x >= 10) return x.toFixed(1);
  if (x >= 1) return x.toFixed(2);
  return x.toPrecision(2);
}

/** "Jupiter is 11.2 times as wide as Earth", or "The Moon is 3.67 times narrower than Earth": one world's width against another's. */
export function compareSizes(a: Pick<World, 'name' | 'diameterKm'>, b: Pick<World, 'name' | 'diameterKm'>): string {
  const ratio = a.diameterKm / b.diameterKm;
  if (Math.abs(ratio - 1) < 0.02) return `${a.name} and ${lowerThe(b.name)} are almost the same size.`;
  if (ratio >= 1) return `${a.name} is ${threeFigures(ratio)} times as wide as ${lowerThe(b.name)}.`;
  return `${a.name} is ${threeFigures(1 / ratio)} times narrower than ${lowerThe(b.name)}.`;
}

/** "The Moon" in the middle of a sentence is "the Moon". */
export function lowerThe(name: string): string {
  return name.startsWith('The ') ? `the ${name.slice(4)}` : name;
}
