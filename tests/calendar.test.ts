import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  calendarFromJd,
  dayFraction,
  dayOfWeek,
  dayOfYear,
  daysInMonth,
  formatYear,
  GREGORIAN_START_JD,
  isLeapYear,
  isValidDate,
  jdFromCalendar,
  type CalendarDate,
  type CalendarName,
} from '../src/core/time/calendar';
import { J2000, jdFromUnixMs, julianCenturies, julianEpoch, unixMsFromJd } from '../src/core/time/julian';

const date = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });

describe('calendar date → Julian Date (Meeus ch. 7)', () => {
  // Meeus, Example 7.a, Example 7.b and Table 7.a. Before 1582 October 15 the dates are Julian.
  const cases: [CalendarDate, number][] = [
    [date(1957, 10, 4.81), 2_436_116.31],
    [date(333, 1, 27.5), 1_842_713.0],
    [date(2000, 1, 1.5), 2_451_545.0],
    [date(1999, 1, 1), 2_451_179.5],
    [date(1987, 1, 27), 2_446_822.5],
    [date(1987, 6, 19.5), 2_446_966.0],
    [date(1988, 1, 27), 2_447_187.5],
    [date(1988, 6, 19.5), 2_447_332.0],
    [date(1900, 1, 1), 2_415_020.5],
    [date(1600, 1, 1), 2_305_447.5],
    [date(1600, 12, 31), 2_305_812.5],
    [date(837, 4, 10.3), 2_026_871.8],
    [date(-123, 12, 31), 1_676_496.5],
    [date(-122, 1, 1), 1_676_497.5],
    [date(-1000, 7, 12.5), 1_356_001.0],
    [date(-1000, 2, 29), 1_355_866.5],
    [date(-1001, 8, 17.9), 1_355_671.4],
    [date(-4712, 1, 1.5), 0.0],
  ];

  it.each(cases)('%o is JD %d', (d, jd) => {
    expect(jdFromCalendar(d)).toBeCloseTo(jd, 6);
  });

  it.each(cases)('JD %# converts back to its date', (d, jd) => {
    const back = calendarFromJd(jd);
    expect(back.year).toBe(d.year);
    expect(back.month).toBe(d.month);
    expect(back.day).toBeCloseTo(d.day, 6);
  });

  it('converts Meeus Example 7.d: JD 1507900.13 is −584 May 28.63', () => {
    const d = calendarFromJd(1_507_900.13);
    expect([d.year, d.month]).toEqual([-584, 5]);
    expect(d.day).toBeCloseTo(28.63, 6);
  });

  it('switches calendars where the reform did: Thursday 4 October 1582, then Friday 15 October', () => {
    const thursday = jdFromCalendar(date(1582, 10, 4));
    const friday = jdFromCalendar(date(1582, 10, 15));
    expect(friday - thursday).toBe(1);
    expect(friday).toBe(GREGORIAN_START_JD);
    expect(dayOfWeek(thursday)).toBe(4);
    expect(dayOfWeek(friday)).toBe(5);
  });

  it('extends either calendar backwards: JD 0 is 24 November 4714 BC in the Gregorian calendar', () => {
    expect(jdFromCalendar(date(-4713, 11, 24.5), 'gregorian')).toBe(0);
    expect(calendarFromJd(0, 'gregorian')).toEqual(date(-4713, 11, 24.5));
    // The calendars agree in the third century and drift apart by a day a century after that, mostly.
    expect(jdFromCalendar(date(250, 6, 1), 'julian')).toBe(jdFromCalendar(date(250, 6, 1), 'gregorian'));
    expect(jdFromCalendar(date(1582, 10, 5), 'julian') - jdFromCalendar(date(1582, 10, 5), 'gregorian')).toBe(10);
    expect(jdFromCalendar(date(2000, 1, 1), 'julian') - jdFromCalendar(date(2000, 1, 1), 'gregorian')).toBe(13);
  });

  it('counts the days between Halley’s perihelia of 1910 and 1986 (Meeus Example 7.e)', () => {
    expect(jdFromCalendar(date(1986, 2, 9)) - jdFromCalendar(date(1910, 4, 20))).toBe(27_689);
  });

  it('finds the date 10,000 days after 1991 July 11 (Meeus Example 7.f)', () => {
    expect(calendarFromJd(jdFromCalendar(date(1991, 7, 11)) + 10_000)).toEqual(date(2018, 11, 26));
  });
});

describe('days of the week and of the year', () => {
  it('knows that 1954 June 30 was a Wednesday (Meeus Example 7.e) and J2000 a Saturday', () => {
    expect(dayOfWeek(jdFromCalendar(date(1954, 6, 30)))).toBe(3);
    expect(dayOfWeek(J2000)).toBe(6);
    expect(dayOfWeek(jdFromCalendar(date(1954, 6, 30.99)))).toBe(3);
  });

  it('advances the weekday by one each day, before and after JD 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100_000, max: 4_000_000 }), (n) => {
        const jd = n + 0.5;
        expect(dayOfWeek(jd + 1)).toBe((dayOfWeek(jd) + 1) % 7);
      }),
    );
  });

  it('numbers days within the year (Meeus Examples 7.f and 7.g)', () => {
    expect(dayOfYear(date(1978, 11, 14))).toBe(318);
    expect(dayOfYear(date(1988, 4, 22))).toBe(113);
    expect(dayOfYear(date(1988, 12, 31.75))).toBe(366);
    // 1582 lost ten days, so it had only 355.
    expect(dayOfYear(date(1582, 10, 15))).toBe(278);
    expect(dayOfYear(date(1582, 12, 31))).toBe(355);
  });

  it('reads times of day as fractions', () => {
    expect(dayFraction(19, 21)).toBe(0.80625);
    expect(dayFraction(12)).toBe(0.5);
  });
});

describe('leap years and valid dates', () => {
  it('applies each calendar’s rule, including year 0 (1 BC) and negative years', () => {
    expect(isLeapYear(1900, 'julian')).toBe(true);
    expect(isLeapYear(1900, 'gregorian')).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1500)).toBe(true); // Julian before the reform
    expect(isLeapYear(0)).toBe(true);
    expect(isLeapYear(-1)).toBe(false);
    expect(isLeapYear(-4)).toBe(true);
    expect(isLeapYear(-100, 'gregorian')).toBe(false);
    expect(isLeapYear(-400, 'gregorian')).toBe(true);
  });

  it('makes each calendar year 365 or 366 days long, exactly as its leap rule says', () => {
    const calendar = fc.constantFrom<CalendarName>('julian', 'gregorian');
    fc.assert(
      fc.property(fc.integer({ min: -4712, max: 5000 }), calendar, (year, cal) => {
        const length = jdFromCalendar(date(year + 1, 1, 1), cal) - jdFromCalendar(date(year, 1, 1), cal);
        expect(length).toBe(isLeapYear(year, cal) ? 366 : 365);
        const months = Array.from({ length: 12 }, (_, i) => daysInMonth(year, i + 1, cal));
        expect(months.reduce((a, b) => a + b, 0)).toBe(length);
      }),
    );
  });

  it('rejects dates that never existed', () => {
    expect(isValidDate(date(1900, 2, 29))).toBe(false);
    expect(isValidDate(date(1900, 2, 29), 'julian')).toBe(true);
    expect(isValidDate(date(2024, 2, 29.9))).toBe(true);
    expect(isValidDate(date(1582, 10, 10))).toBe(false);
    expect(isValidDate(date(1582, 10, 10), 'julian')).toBe(true);
    expect(isValidDate(date(1582, 10, 4.99))).toBe(true);
    expect(isValidDate(date(2026, 13, 1))).toBe(false);
    expect(isValidDate(date(2026, 4, 31))).toBe(false);
    expect(isValidDate(date(2026, 4, 0.5))).toBe(false);
    expect(isValidDate(date(2026.5, 4, 1))).toBe(false);
  });
});

describe('round trips', () => {
  const calendar = fc.constantFrom<CalendarName>('julian', 'gregorian');

  it('Julian Date → calendar date → Julian Date, in both calendars, from JD 0 to AD 6000', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 3_912_000, noNaN: true }), calendar, (jd, cal) => {
        const d = calendarFromJd(jd, cal);
        expect(isValidDate({ ...d, day: d.day }, cal)).toBe(true);
        expect(jdFromCalendar(d, cal)).toBeCloseTo(jd, 6);
      }),
    );
  });

  it('calendar date → Julian Date → calendar date, for every valid date', () => {
    const valid = fc
      .record({
        year: fc.integer({ min: -4712, max: 6000 }),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.integer({ min: 1, max: 31 }),
        time: fc.double({ min: 0, max: 0.999, noNaN: true }),
        cal: calendar,
      })
      .filter(({ year, month, day, cal }) => day <= daysInMonth(year, month, cal));
    fc.assert(
      fc.property(valid, ({ year, month, day, time, cal }) => {
        const back = calendarFromJd(jdFromCalendar(date(year, month, day + time), cal), cal);
        expect([back.year, back.month]).toEqual([year, month]);
        expect(back.day).toBeCloseTo(day + time, 6);
      }),
    );
  });

  it('follows each day with the next, skipping 5–14 October 1582', () => {
    const nextDay = ({ year, month, day }: CalendarDate): CalendarDate => {
      if (year === 1582 && month === 10 && day === 4) return date(1582, 10, 15);
      if (day < daysInMonth(year, month)) return date(year, month, day + 1);
      return month < 12 ? date(year, month + 1, 1) : date(year + 1, 1, 1);
    };
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3_900_000 }), (n) => {
        expect(calendarFromJd(n + 1.5)).toEqual(nextDay(calendarFromJd(n + 0.5)));
      }),
      // The reform, the turn of 1 BC into AD 1, and the first day of the count.
      { examples: [[2_299_159], [1_721_422], [0]] },
    );
  });
});

describe('Julian Dates', () => {
  it('counts centuries and years from J2000', () => {
    expect(julianCenturies(J2000)).toBe(0);
    expect(julianCenturies(jdFromCalendar(date(1987, 4, 10)))).toBeCloseTo(-0.127_296_372_348, 12);
    expect(julianEpoch(J2000 + 365.25 * 26)).toBe(2026);
  });

  it('converts JavaScript times for "now"', () => {
    expect(jdFromUnixMs(0)).toBe(2_440_587.5);
    expect(jdFromUnixMs(Date.UTC(2000, 0, 1, 12))).toBe(J2000);
    expect(unixMsFromJd(J2000)).toBe(Date.UTC(2000, 0, 1, 12));
  });
});

describe('writing years', () => {
  it('turns astronomical years into BC and AD', () => {
    expect(formatYear(0)).toBe('1 BC');
    expect(formatYear(-584)).toBe('585 BC');
    expect(formatYear(-9999)).toBe('10,000 BC');
    expect(formatYear(150)).toBe('AD 150');
    expect(formatYear(2026)).toBe('2026');
    expect(formatYear(3000, 'always')).toBe('AD 3000');
    expect(formatYear(16_000, 'always')).toBe('AD 16,000');
  });
});
