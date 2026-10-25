import { apparentMagnitude, distanceForMagnitude, NAKED_EYE_LIMIT, SUN_ABSOLUTE_MAGNITUDE } from '../core/stars/distance';
import { AU } from '../core/constants';
import { LIGHT_YEAR, PARSEC } from '../core/units';

/**
 * Move the Sun away (Figure 9.3): how bright the Sun looks from far away,
 * in magnitudes, against things in our own sky. Brightness falls with the
 * square of the distance: 10 times farther, 100 times fainter, 5 magnitudes.
 */

/** The Sun's apparent magnitude from `parsecs` away. */
export function sunMagnitude(parsecs: number): number {
  return apparentMagnitude(SUN_ABSOLUTE_MAGNITUDE, parsecs);
}

/** How far (parsecs) the Sun can go before it fades below what the eye can see: about 17 pc, 55 light-years. */
export function sunVisibleTo(limit = NAKED_EYE_LIMIT): number {
  return distanceForMagnitude(SUN_ABSOLUTE_MAGNITUDE, limit);
}

/** Things in Earth's sky to compare with, by apparent magnitude. */
export const SKY_REFERENCES = [
  { name: 'The Sun, from Earth', mag: -26.74 },
  { name: 'The full Moon', mag: -12.7 },
  { name: 'Venus at its brightest', mag: -4.6 },
  { name: 'Sirius', mag: -1.46 },
  { name: 'Vega', mag: 0.03 },
  { name: 'Polaris', mag: 1.98 },
  { name: 'The faintest stars the eye sees', mag: 6 },
  { name: 'The faintest stars in binoculars', mag: 9.5 },
] as const;

/** Places to view the Sun from, with their distances (parsecs). */
export const VANTAGE_POINTS = [
  { id: 'neptune', name: 'Neptune', parsecs: (30.07 * AU) / PARSEC },
  { id: 'alpha-cen', name: 'α Centauri', parsecs: 1.34 },
  { id: 'sirius', name: 'Sirius', parsecs: 2.64 },
  { id: 'vega', name: 'Vega', parsecs: 7.68 },
  { id: 'pleiades', name: 'the Pleiades', parsecs: 136 },
  { id: 'centre', name: 'the Galaxy’s centre', parsecs: 8200 },
] as const;

/** A distance in parsecs, in the unit that reads best: AU inside the Oort cloud, light-years beyond. */
export function distanceWords(parsecs: number): string {
  const au = (parsecs * PARSEC) / AU;
  if (au < 10_000) return `${au < 10 ? au.toFixed(1) : Math.round(au).toLocaleString('en-GB')} AU`;
  const ly = (parsecs * PARSEC) / LIGHT_YEAR;
  return `${ly < 10 ? ly.toFixed(2) : ly < 1000 ? ly.toFixed(0) : Math.round(ly).toLocaleString('en-GB')} light-years`;
}

/** The Sun's brightness from there, in a sentence. */
export function describeSun(parsecs: number): string {
  const m = sunMagnitude(parsecs);
  const where = distanceWords(parsecs);
  const mag = `${m < 0 ? '−' : ''}${Math.abs(m).toFixed(1)}`;
  const brighter = SKY_REFERENCES.filter((r) => r.mag > m && r.name !== 'The faintest stars the eye sees' && r.name !== 'The faintest stars in binoculars');
  if (m > NAKED_EYE_LIMIT) return `From ${where} the Sun is magnitude ${mag}: too faint to see without a telescope or binoculars.`;
  if (m > 1) return `From ${where} the Sun is magnitude ${mag}: an ordinary star, visible to the eye in a dark sky.`;
  if (m > -2) return `From ${where} the Sun is magnitude ${mag}: one of the brightest stars in the sky${brighter.length ? `, brighter than ${brighter[0].name}` : ''}.`;
  return `From ${where} the Sun is magnitude ${mag}: far brighter than any star in our sky.`;
}
