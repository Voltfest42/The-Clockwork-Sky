import { PAGE_LOADED, voyagerHasReachedLightDay, voyagerYears } from './voyagerDates';

/**
 * Sentences whose tense depends on today's date, so the text stays right
 * after the event without an edit. "Now" is the reader's clock.
 */

/** Voyager 1's light-day milestone on 18 November 2026, in the right tense for today. */
export function VoyagerLightDay({ now = PAGE_LOADED }: { now?: number }) {
  const years = voyagerYears(now);
  return voyagerHasReachedLightDay(now) ? (
    <>
      On 18 November 2026, Voyager 1 became the first spacecraft to reach one light-day from Earth: its radio signals take a full day to get home. It
      was launched in 1977. After {years} years of travelling, faster than any bullet, it has gone as far as light goes in one day.
    </>
  ) : (
    <>
      On 18 November 2026, Voyager 1 will become the first spacecraft to reach one light-day from Earth: from then on, its radio signals will take a
      full day to get home. It was launched in 1977. After {years} years of travelling, faster than any bullet, it has almost gone as far as light
      goes in one day.
    </>
  );
}
