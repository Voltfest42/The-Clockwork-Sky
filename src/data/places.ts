/**
 * Places for the sky figures: cities in both hemispheres from the Arctic to
 * the tip of South America, plus the poles and a point on the equator.
 * Coordinates are rounded city centres (degrees, east and north positive);
 * time zones are IANA names, which the browser turns into clock times.
 */

export interface PlaceInfo {
  id: string;
  name: string;
  /** Degrees north (negative south). */
  latitude: number;
  /** Degrees east (negative west). */
  longitude: number;
  /** IANA time-zone name. */
  timeZone: string;
}

export const PLACES: readonly PlaceInfo[] = [
  { id: 'north-pole', name: 'North Pole', latitude: 90, longitude: 0, timeZone: 'UTC' },
  { id: 'tromso', name: 'Tromsø', latitude: 69.65, longitude: 18.96, timeZone: 'Europe/Oslo' },
  { id: 'stockholm', name: 'Stockholm', latitude: 59.33, longitude: 18.07, timeZone: 'Europe/Stockholm' },
  { id: 'london', name: 'London', latitude: 51.51, longitude: -0.13, timeZone: 'Europe/London' },
  { id: 'new-york', name: 'New York', latitude: 40.71, longitude: -74.01, timeZone: 'America/New_York' },
  { id: 'cairo', name: 'Cairo', latitude: 30.04, longitude: 31.24, timeZone: 'Africa/Cairo' },
  { id: 'singapore', name: 'Singapore', latitude: 1.35, longitude: 103.82, timeZone: 'Asia/Singapore' },
  { id: 'equator', name: 'The equator (0°, 0°)', latitude: 0, longitude: 0, timeZone: 'UTC' },
  { id: 'nairobi', name: 'Nairobi', latitude: -1.29, longitude: 36.82, timeZone: 'Africa/Nairobi' },
  { id: 'sydney', name: 'Sydney', latitude: -33.87, longitude: 151.21, timeZone: 'Australia/Sydney' },
  { id: 'ushuaia', name: 'Ushuaia', latitude: -54.8, longitude: -68.3, timeZone: 'America/Argentina/Ushuaia' },
  { id: 'south-pole', name: 'South Pole', latitude: -90, longitude: 0, timeZone: 'UTC' },
];

/** Where the figures start until the reader picks somewhere else. */
export const DEFAULT_PLACE_ID = 'london';

export function findPlace(id: string): PlaceInfo | undefined {
  return PLACES.find((p) => p.id === id);
}
