import { G } from '../core/constants';
import { SECONDS_PER_DAY } from '../core/units';
import type { BalancePair } from '../data/gravity';

/**
 * The balance point of two bodies (Figure 7.4). Both circle their barycentre,
 * which divides the line between them in the inverse ratio of their masses:
 * the heavy body sits 1/(1 + ratio) of the way along. Lengths in km.
 */

/** How far the barycentre is from the heavy body's centre (km), for a mass ratio (heavy ÷ light) and the distance between centres (km). */
export function balanceDistance(ratio: number, separation: number): number {
  return separation / (1 + ratio);
}

/** The pair's orbital period (days) with the heavy body's mass kept and the light one's set by the ratio. */
export function balancePeriod(pair: BalancePair, ratio: number): number {
  const total = pair.heavyMass * (1 + 1 / ratio);
  const a = pair.separation * 1000;
  return (2 * Math.PI * Math.sqrt(a ** 3 / (G * total))) / SECONDS_PER_DAY;
}

/** The heavy body's speed round the barycentre (m/s): the wobble a distant astronomer could measure. */
export function wobbleSpeed(pair: BalancePair, ratio: number): number {
  const d = balanceDistance(ratio, pair.separation) * 1000;
  return (2 * Math.PI * d) / (balancePeriod(pair, ratio) * SECONDS_PER_DAY);
}

/** Where the barycentre is, in a sentence: inside or outside the heavy body, and by how much. */
export function describeBalance(pair: BalancePair, ratio: number): string {
  const d = balanceDistance(ratio, pair.separation);
  const km = (x: number) => `${Math.round(x).toLocaleString('en-GB')} km`;
  const heavyThe = pair.heavy;
  if (ratio === 1) return `With equal masses the balance point is exactly halfway, ${km(d)} from each centre, and the two go round it like dancers.`;
  if (d < pair.heavyRadius) {
    const depth = pair.heavyRadius - d;
    return `The balance point is ${km(d)} from ${possessive(heavyThe)} centre: inside ${heavyThe}, ${km(depth)} below the surface (${Math.round((100 * d) / pair.heavyRadius)}% of the way out).`;
  }
  const out = d / pair.heavyRadius;
  return `The balance point is ${km(d)} from ${possessive(heavyThe)} centre: outside ${heavyThe}, ${out.toFixed(out < 10 ? 2 : 0)} times its radius out, in the space between the two.`;
}

function possessive(name: string): string {
  return name.endsWith('s') ? `${name}’` : `${name}’s`;
}
