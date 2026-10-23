import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { jdFromCalendar } from '../src/core/time/calendar';
import { clockTime, formatOffset, isKnownZone, jdFromClockTime, utcOffset, type Zone } from '../src/core/time/zone';
import { DEG } from '../src/core/units';
import { PLACES } from '../src/data/places';

const london: Zone = { name: 'Europe/London', longitude: -0.13 * DEG };
const sydney: Zone = { name: 'Australia/Sydney', longitude: 151.21 * DEG };
const newYork: Zone = { name: 'America/New_York', longitude: -74 * DEG };

describe('time zones', () => {
  it('knows every place’s zone', () => {
    for (const place of PLACES) expect(isKnownZone(place.timeZone), place.name).toBe(true);
  });

  it('follows daylight saving: London is UTC+0 in winter and UTC+1 in summer', () => {
    expect(utcOffset(london, jdFromCalendar({ year: 2026, month: 1, day: 15 }))).toBe(0);
    expect(utcOffset(london, jdFromCalendar({ year: 2026, month: 7, day: 15 }))).toBe(3600);
    expect(utcOffset(newYork, jdFromCalendar({ year: 2026, month: 1, day: 15 }))).toBe(-5 * 3600);
    // In the south, summer comes in January.
    expect(utcOffset(sydney, jdFromCalendar({ year: 2026, month: 1, day: 15 }))).toBe(11 * 3600);
    expect(utcOffset(sydney, jdFromCalendar({ year: 2026, month: 7, day: 15 }))).toBe(10 * 3600);
  });

  it('knows the old local mean time: London ran 1 min 15 s behind Greenwich before 1847', () => {
    expect(utcOffset(london, jdFromCalendar({ year: 1800, month: 6, day: 1 }))).toBe(-75);
    expect(formatOffset(-75)).toBe('UTC−0:01:15');
  });

  it('falls back to the longitude’s hour band without a name', () => {
    expect(utcOffset({ name: null, longitude: 151 * DEG }, 2_461_000)).toBe(10 * 3600);
    expect(utcOffset({ name: null, longitude: -74 * DEG }, 2_461_000)).toBe(-5 * 3600);
    expect(utcOffset({ name: 'Not/AZone', longitude: 30 * DEG }, 2_461_000)).toBe(2 * 3600);
  });

  it('formats offsets', () => {
    expect(formatOffset(0)).toBe('UTC');
    expect(formatOffset(3600)).toBe('UTC+1');
    expect(formatOffset(-5 * 3600)).toBe('UTC−5');
    expect(formatOffset(5.5 * 3600)).toBe('UTC+5:30');
  });

  it('reads clock times, including BC dates in the Julian calendar', () => {
    const jd = jdFromCalendar({ year: 2026, month: 7, day: 15 + 21 / 24 }); // 21:00 UT
    expect(clockTime(london, jd)).toEqual({ year: 2026, month: 7, day: 15, hour: 22, minute: 0, second: 0 });
    const ancient = jdFromCalendar({ year: -583, month: 5, day: 28.5 });
    expect(clockTime({ name: null, longitude: 0 }, ancient)).toEqual({ year: -583, month: 5, day: 28, hour: 12, minute: 0, second: 0 });
  });

  it('turns clock times back into moments', () => {
    fc.assert(
      fc.property(fc.integer({ min: -2999, max: 3000 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }), fc.integer({ min: 0, max: 86_399 }), (year, month, day, s) => {
        fc.pre(!(year === 1582 && month === 10));
        for (const zone of [london, sydney, { name: null, longitude: 100 * DEG }]) {
          const time = { year, month, day, hour: Math.floor(s / 3600), minute: Math.floor((s % 3600) / 60), second: s % 60 };
          const jd = jdFromClockTime(zone, time);
          const back = clockTime(zone, jd);
          // A clock time in the hour skipped when the clocks go forward reads an hour later.
          const shift = (back.hour - time.hour + 24) % 24;
          if (back.day === time.day) expect(shift === 0 || shift === 1).toBe(true);
          if (shift === 0) expect(back).toEqual(time);
        }
      }),
      { numRuns: 300 },
    );
  });
});
