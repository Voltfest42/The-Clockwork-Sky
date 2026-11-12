import { usePageTime } from '../hydration';
import { GAIA } from '../../data/gaia';
import { dayLabel, durationWords, jdTTFromMs, nextOpposition, nextTotalLunarEclipse, nextTotalSolarEclipses, placeList } from './upcoming';
import { voyagerHasReachedLightDay, voyagerYears } from './voyagerDates';
import { fractionalYear } from '../../core/binaries/visual';
import { nextPericentre } from '../../core/galaxy/s2';
import { S2_ORBIT } from '../../data/s2';
import { yearLabel } from '../../core/galaxy/s2';

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

/** Gaia's fourth data release and Andromeda's motion (Chapter 31), in the right tense for today. */
export function GaiaDr4Andromeda({ now: given }: { now?: number }) {
  const pageTime = usePageTime();
  const now = given ?? pageTime;
  return now >= Date.parse(GAIA.dr4.when) ? (
    <>Gaia’s fourth data release, on {GAIA.dr4.date}, measures the same stars over five and a half years rather than three, which should sharpen Andromeda’s motion.</>
  ) : (
    <>Gaia’s fourth data release, due on {GAIA.dr4.date}, will measure the same stars over five and a half years rather than three, which should sharpen Andromeda’s motion.</>
  );
}

/**
 * The next three total eclipses of the Sun and the next total eclipse of the
 * Moon, from today, with where they can be seen (Chapter 4).
 */
export function NextEclipses({ now: given }: { now?: number }) {
  const pageTime = usePageTime();
  const from = jdTTFromMs(given ?? pageTime);
  const solar = nextTotalSolarEclipses(from, 3);
  const lunar = nextTotalLunarEclipse(from);
  const longest = solar.reduce((best, e) => ((e.seconds ?? 0) > (best?.seconds ?? 0) ? e : best), solar[0]);
  const items = solar.map((e) => {
    const where = e.path ? `, across ${placeList(e.path)}` : '';
    const how = e === longest && e.seconds ? `, with up to ${durationWords(e.seconds)} of totality` : '';
    return `${e.date}${where}${how}`;
  });
  return (
    <>
      The next total eclipses of the Sun are on {items[0]}; on {items[1]}; and on {items[2]}. Earth’s shadow next turns the Moon red on {lunar.date}
      {lunar.seen ? `, seen from ${placeList(lunar.seen)}` : ''}.
    </>
  );
}

/** When Mars is next opposite the Sun, and so in the middle of its next backward loop (Chapter 5). */
export function NextMarsOpposition({ now: given }: { now?: number }) {
  const pageTime = usePageTime();
  return <>Its next opposition is on {dayLabel(nextOpposition('mars', jdTTFromMs(given ?? pageTime)))}.</>;
}

/** When the star S2 next passes closest to the Milky Way's black hole, from its published orbit (Chapter 30). */
export function NextS2Pericentre({ now: given }: { now?: number }) {
  const pageTime = usePageTime();
  const year = fractionalYear(given ?? pageTime);
  return <>{yearLabel(nextPericentre(S2_ORBIT, year))}</>;
}
