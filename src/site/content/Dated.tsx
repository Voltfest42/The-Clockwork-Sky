import { usePageTime } from '../hydration';
import { GAIA } from '../../data/gaia';
import { voyagerHasReachedLightDay, voyagerYears } from './voyagerDates';

/**
 * Sentences whose tense depends on today's date, so the text stays right
 * after the event without an edit. "Now" is the reader's clock once the page
 * has hydrated, and the time the HTML was built before that (see usePageTime).
 */

/** Voyager 1's light-day milestone on 18 November 2026, in the right tense for today. */
export function VoyagerLightDay({ now: given }: { now?: number }) {
  const pageTime = usePageTime();
  const now = given ?? pageTime;
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

/** Gaia's fourth data release on 2 December 2026, in the right tense for today. */
export function GaiaDr4({ now: given }: { now?: number }) {
  const pageTime = usePageTime();
  const now = given ?? pageTime;
  return now >= Date.parse(GAIA.dr4.when) ? (
    <>Its fourth data release, on {GAIA.dr4.date}, added five and a half years of measurements, and with them sharper distances still.</>
  ) : (
    <>Its fourth data release, due on {GAIA.dr4.date}, will add five and a half years of measurements, and with them sharper distances still.</>
  );
}
