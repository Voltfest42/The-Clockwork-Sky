import { VOYAGER_1 } from '../../data/scale';

/** Dates for sentences whose tense depends on today (see Dated.tsx). Times are Unix milliseconds. */

/** When the page loaded: "now" for the text. */
export const PAGE_LOADED = Date.now();

const MILESTONE = Date.parse(VOYAGER_1.lightDay.when);
const LAUNCH = Date.parse(VOYAGER_1.launched);
const YEAR_MS = 365.25 * 86_400_000;

/** Whether Voyager 1 has reached one light-day from Earth yet. */
export function voyagerHasReachedLightDay(now = Date.now()): boolean {
  return now >= MILESTONE;
}

/** Whole years since Voyager 1's launch. */
export function voyagerYears(now = Date.now()): number {
  return Math.floor((now - LAUNCH) / YEAR_MS);
}
