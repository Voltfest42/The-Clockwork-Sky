/**
 * Light buckets, from the eye to the largest telescopes (the Part II research
 * brief, §2). Apertures are diameters in metres; areas in square metres, for a
 * clear circle unless the telescope's own figure is given (JWST's hexagons,
 * the ELT's segments). Central obstructions are ignored.
 */

export interface Bucket {
  id: string;
  name: string;
  /** Diameter, m. */
  aperture: number;
  /** Collecting area, m². */
  area: number;
  /** A few words: where and when. */
  note: string;
}

const circle = (d: number) => (Math.PI * d * d) / 4;

export const BUCKETS: readonly Bucket[] = [
  { id: 'eye', name: 'your eye', aperture: 0.007, area: circle(0.007), note: 'a pupil 7 mm wide, opened up in the dark' },
  { id: 'binoculars', name: 'binoculars', aperture: 0.05, area: circle(0.05), note: '50 mm lenses (one side)' },
  { id: 'backyard', name: 'a backyard telescope', aperture: 0.2, area: circle(0.2), note: 'a 200 mm (8-inch) mirror' },
  { id: 'hubble', name: 'Hubble', aperture: 2.4, area: circle(2.4), note: 'in orbit since 1990' },
  { id: 'jwst', name: 'JWST', aperture: 6.5, area: 25.4, note: '18 hexagonal mirrors, at the Sun–Earth L2 point since 2022' },
  { id: 'elt', name: 'the ELT', aperture: 39, area: 978, note: 'ESO’s Extremely Large Telescope in Chile, being built' },
];

/** How many dark-adapted eyes a bucket is worth: its area over a 7 mm pupil's. JWST is about 660,000. */
export function eyesWorth(bucket: Bucket): number {
  return bucket.area / BUCKETS[0].area;
}
