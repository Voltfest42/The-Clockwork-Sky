import { useSyncExternalStore } from 'react';
import type { Place } from '../core/sky/frames';
import type { Zone } from '../core/time/zone';
import { DEG } from '../core/units';
import { DEFAULT_PLACE_ID, findPlace } from '../data/places';

/**
 * Where the reader is standing, shared by every sky figure on the site and
 * remembered in this browser only (never sent anywhere). Storage can be
 * unavailable, so every access is guarded.
 */

export interface ChosenPlace {
  /** A city's id from data/places.ts, "here" for the reader's own location, or "custom" for typed coordinates. */
  id: string;
  name: string;
  /** Degrees, north positive. */
  latitude: number;
  /** Degrees, east positive. */
  longitude: number;
  /** IANA time-zone name, or null to use the longitude's hour band. */
  timeZone: string | null;
}

const KEY = 'clockwork-sky:place';
const listeners = new Set<() => void>();

function cityPlace(id: string): ChosenPlace {
  const city = findPlace(id) ?? findPlace(DEFAULT_PLACE_ID)!;
  return { id: city.id, name: city.name, latitude: city.latitude, longitude: city.longitude, timeZone: city.timeZone };
}

export const DEFAULT_PLACE: ChosenPlace = cityPlace(DEFAULT_PLACE_ID);

function valid(p: unknown): p is ChosenPlace {
  if (!p || typeof p !== 'object') return false;
  const q = p as Record<string, unknown>;
  return (
    typeof q.id === 'string' &&
    typeof q.name === 'string' &&
    typeof q.latitude === 'number' &&
    Math.abs(q.latitude) <= 90 &&
    typeof q.longitude === 'number' &&
    Math.abs(q.longitude) <= 180 &&
    (q.timeZone === null || typeof q.timeZone === 'string')
  );
}

function load(): ChosenPlace {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    return valid(parsed) ? parsed : DEFAULT_PLACE;
  } catch {
    return DEFAULT_PLACE;
  }
}

/** Read from storage on first use, never at import, so the module also runs on the server. */
let cache: ChosenPlace | null = null;
const current = () => (cache ??= load());

export function setPlace(place: ChosenPlace): void {
  cache = place;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(place));
  } catch {
    // Not remembered; still used for this visit.
  }
  listeners.forEach((listener) => listener());
}

/** Picks one of the listed cities. */
export function setCity(id: string): void {
  setPlace(cityPlace(id));
}

export function usePlace(): ChosenPlace {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current,
    () => DEFAULT_PLACE,
  );
}

/** The place in the core's units (radians). */
export function corePlace(place: ChosenPlace): Place {
  return { latitude: place.latitude * DEG, longitude: place.longitude * DEG };
}

/** The place's time zone. */
export function placeZone(place: ChosenPlace): Zone {
  return { name: place.timeZone, longitude: place.longitude * DEG };
}

/** "51.5° N, 0.1° W". */
export function formatLatLon(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(1)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(1)}° ${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lon}`;
}
