import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { eclipsesBetween } from '../src/core/ephemeris/eclipses';
import { AS_OF, dueAt, monthYear } from '../src/data/asOf';
import regions from '../src/data/eclipseRegions.json';
import { INTERSTELLAR_VISITORS, MOONS_AS_OF, visitorsSentence } from '../src/data/planets';
import { NextEclipses, NextMarsOpposition } from '../src/site/content/Dated';
import { dayLabel, durationWords, jdTTFromMs, nextOpposition, nextTotalLunarEclipse, nextTotalSolarEclipses, placeList, REGIONS_UNTIL } from '../src/site/content/upcoming';

const text = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/<!-- -->/g, '');
const at = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

describe('facts that go out of date', () => {
  // When this fails, check the fact against its source, update it and its date in src/data/asOf.ts.
  for (const [key, fact] of Object.entries(AS_OF)) {
    it(`${fact.what} were checked recently enough (${key})`, () => {
      expect(Date.now() < dueAt(fact), `${fact.what} were last checked in ${monthYear(fact.checked)}: check them against ${fact.source}, then update ${fact.where} and src/data/asOf.ts`).toBe(true);
    });
  }

  it('shows the dates they were checked', () => {
    expect(MOONS_AS_OF).toBe(monthYear(AS_OF.moons.checked));
    expect(monthYear('2026-03')).toBe('March 2026');
    expect(dueAt({ ...AS_OF.moons, checked: '2026-03', everyMonths: 12 })).toBe(Date.UTC(2027, 2, 1));
    expect(visitorsSentence()).toBe(
      `Three are known, as of ${monthYear(AS_OF.visitors.checked)}: ʻOumuamua, found on 19 October 2017; comet Borisov, on 30 August 2019; and 3I/ATLAS, on 1 July 2025.`,
    );
    expect(INTERSTELLAR_VISITORS).toHaveLength(3);
  });

  it('has NASA’s eclipse regions for at least ten more years', () => {
    const tenYears = Date.now() + 10 * 365.25 * 86_400_000;
    expect(Date.parse(REGIONS_UNTIL), 'Extend scripts/build-eclipse-regions.ts to the next decade of NASA’s tables and run it.').toBeGreaterThan(tenYears);
  });
});

describe('what comes next', () => {
  it('names the next total eclipses after 27 October 2026, with where to see them', () => {
    const solar = nextTotalSolarEclipses(jdTTFromMs(at('2026-10-27')), 3);
    expect(solar.map((e) => e.date)).toEqual(['2 August 2027', '22 July 2028', '25 November 2030']);
    expect(solar[0].path).toBe('Morocco, Spain, Algeria, Libya, Egypt, Saudi Arabia, Yemen, Somalia');
    expect(solar[0].seconds).toBe(383);
    const lunar = nextTotalLunarEclipse(jdTTFromMs(at('2026-10-27')));
    expect(lunar.date).toBe('31 December 2028');
    expect(lunar.seen).toBe('Europe, Africa, Asia, Australia, Pacific');
  });

  it('moves on as the dates pass', () => {
    expect(nextTotalSolarEclipses(jdTTFromMs(at('2026-01-01')), 1)[0].date).toBe('12 August 2026');
    expect(nextTotalSolarEclipses(jdTTFromMs(at('2027-08-03')), 1)[0].date).toBe('22 July 2028');
    expect(nextTotalLunarEclipse(jdTTFromMs(at('2029-01-01'))).date).toBe('26 June 2029');
    // Beyond NASA's table the dates still come, without the places.
    const far = nextTotalSolarEclipses(jdTTFromMs(at('2060-01-01')), 1)[0];
    expect(far.path).toBeUndefined();
    expect(far.jdTT).toBeGreaterThan(jdTTFromMs(at('2060-01-01')));
  });

  it('finds Mars’s next opposition: 19 February 2027, then 25 March 2029', () => {
    expect(dayLabel(nextOpposition('mars', jdTTFromMs(at('2026-10-27'))))).toBe('19 February 2027');
    expect(dayLabel(nextOpposition('mars', jdTTFromMs(at('2027-03-01'))))).toBe('25 March 2029');
  });

  it('agrees with the course’s eclipse finder about every eclipse in NASA’s table', () => {
    const found = eclipsesBetween(jdTTFromMs(at('2021-01-01')), jdTTFromMs(at('2051-01-01')));
    for (const e of regions.solar) {
      const match = found.find((f) => f.kind === 'solar' && Math.abs(f.jdTT - jdTTFromMs(at(e.date))) < 1);
      expect(match, `solar eclipse of ${e.date}`).toBeDefined();
      // Its type agrees (9 April 2043 is total but not central: the shadow's axis just misses Earth).
      expect(match!.type, `the type of ${e.date}`).toBe(e.type);
    }
    const totals = found.filter((f) => f.kind === 'solar' && f.type === 'total');
    for (const t of totals) expect(regions.solar.some((e) => Math.abs(jdTTFromMs(at(e.date)) - t.jdTT) < 1), `total eclipse on ${dayLabel(t.jdTT)} in the table`).toBe(true);
    for (const e of regions.lunar) {
      const match = found.find((f) => f.kind === 'lunar' && Math.abs(f.jdTT - jdTTFromMs(at(e.date))) < 1);
      expect(match?.type, `lunar eclipse of ${e.date}`).toBe('total');
    }
  });

  it('writes lists of places and durations in words', () => {
    expect(placeList('Arctic, Greenland, Iceland, Spain')).toBe('the Arctic, Greenland, Iceland and Spain');
    expect(placeList('Pacific, Panama')).toBe('the Pacific and Panama');
    expect(placeList('Antarctica')).toBe('Antarctica');
    expect(durationWords(383)).toBe('6 minutes 23 seconds');
    expect(durationWords(60)).toBe('1 minute');
    expect(durationWords(41)).toBe('41 seconds');
  });

  it('puts it in a sentence that changes with the reader’s date', () => {
    expect(text(<NextEclipses now={at('2026-10-27')} />)).toBe(
      'The next total eclipses of the Sun are on 2 August 2027, across Morocco, Spain, Algeria, Libya, Egypt, Saudi Arabia, Yemen and Somalia, with up to 6 minutes 23 seconds of totality; on 22 July 2028, across Australia and New Zealand; and on 25 November 2030, across Botswana, South Africa and Australia. Earth’s shadow next turns the Moon red on 31 December 2028, seen from Europe, Africa, Asia, Australia and the Pacific.',
    );
    expect(text(<NextEclipses now={at('2026-01-01')} />)).toContain('on 12 August 2026, across the Arctic, Greenland, Iceland and Spain');
    expect(text(<NextMarsOpposition now={at('2026-10-27')} />)).toBe('Its next opposition is on 19 February 2027.');
  });
});
