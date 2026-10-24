import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkHighestNoon, noonHeights } from '../src/content/checks/chapter3Answers';
import { jdFromCalendar } from '../src/core/time/calendar';
import { DEG } from '../src/core/units';
import { analemmaPoint } from '../src/figures/analemma';
import { apsisDays, dayFacts, monthTicks, seasonOf, sunDays } from '../src/figures/seasons';
import { dailyMotion, dayLabel, dayOfYearOf, daysInYear, noonOfDay, signAt, signMatches } from '../src/figures/sunsYear';
import { niceTicks } from '../src/viz/ticks';
import { expectNear } from './helpers';

describe('the Sun’s year (Figure 3.1)', () => {
  it('counts days of the year and labels them', () => {
    expect(dayOfYearOf(2026, 1, 1)).toBe(0);
    expect(dayOfYearOf(2026, 3, 1)).toBe(59);
    expect(dayOfYearOf(2028, 3, 1)).toBe(60);
    expect(daysInYear(2028)).toBe(366);
    expect(dayLabel(2026, 296)).toBe('24 October');
    expect(dayLabel(-99, 0)).toBe('1 January');
  });

  it('names the astrologers’ sign, which no longer matches the constellation', () => {
    const october24 = noonOfDay(2026, dayOfYearOf(2026, 10, 24));
    expect(signAt(october24)).toBe('Scorpio');
    expect(signAt(noonOfDay(2026, dayOfYearOf(2026, 4, 1)))).toBe('Aries');
    expect(signMatches('Scorpio', 'Sco')).toBe(true);
    expect(signMatches('Scorpio', 'Vir')).toBe(false);
  });

  it('moves the Sun about 1° a day, fastest in January', () => {
    const january = dailyMotion(noonOfDay(2026, 2));
    const july = dailyMotion(noonOfDay(2026, 185));
    expectNear(january, 1.019, 0.002, 'January');
    expectNear(july, 0.953, 0.002, 'July');
  });
});

describe('the seasons machine (Figure 3.2)', () => {
  const days = sunDays(2026);

  it('names the seasons for both hemispheres', () => {
    expect(seasonOf(10 * DEG, 'north')).toBe('spring');
    expect(seasonOf(10 * DEG, 'south')).toBe('autumn');
    expect(seasonOf(100 * DEG, 'north')).toBe('summer');
    expect(seasonOf(200 * DEG, 'south')).toBe('spring');
    expect(seasonOf(300 * DEG, 'north')).toBe('winter');
  });

  it('gives London about 16 h 38 min of day in June and 7 h 50 min in December, and six times the sunlight', () => {
    const june = dayFacts(days[dayOfYearOf(2026, 6, 21)], 51.5 * DEG, 23.44 * DEG);
    const december = dayFacts(days[dayOfYearOf(2026, 12, 21)], 51.5 * DEG, 23.44 * DEG);
    expectNear(june.dayLength, 16 + 38 / 60, 0.05, 'June');
    expectNear(december.dayLength, 7 + 50 / 60, 0.05, 'December');
    expectNear(june.noonHeight, 62, 0.1, 'June noon');
    expectNear(december.noonHeight, 15, 0.1, 'December noon');
    expect(june.sunlight / december.sunlight).toBeGreaterThan(6);
  });

  it('has no seasons without the tilt: the same day and the same Sun all year, but for the distance', () => {
    const facts = days.map((d) => dayFacts(d, 51.5 * DEG, 0));
    for (const f of facts) expectNear(f.noonHeight, 38.5, 1e-9, 'noon');
    const sunlight = facts.map((f) => f.sunlight);
    expectNear(Math.max(...sunlight) / Math.min(...sunlight), 1.069, 0.003, 'the 7% from distance');
    const facing = days.map((d) => dayFacts(d, 0, 23.44 * DEG).facing);
    expect(facing.indexOf(Math.max(...facing))).toBeLessThan(5);
  });

  it('mirrors the hemispheres', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 364 }), fc.double({ min: 0, max: 60, noNaN: true }), (d, lat) => {
        const north = dayFacts(days[d], lat * DEG, 23.44 * DEG);
        const south = dayFacts(days[d], -lat * DEG, 23.44 * DEG);
        // Without refraction the two days would add to 24 hours; with it, to a little more (most at high latitudes).
        expect(north.dayLength + south.dayLength).toBeGreaterThanOrEqual(24 - 1e-9);
        expect(north.dayLength + south.dayLength).toBeLessThan(25);
      }),
    );
  });

  it('puts perihelion in early January and aphelion in early July', () => {
    const { perihelion, aphelion } = apsisDays(2026);
    expect(perihelion.day).toBe(2);
    expect(aphelion.day).toBe(dayOfYearOf(2026, 7, 6));
    expect(monthTicks(2026)[2]).toEqual({ value: 59, label: 'M' });
  });
});

describe('the analemma (Figure 3.5)', () => {
  const real = Array.from({ length: 365 }, (_, d) => analemmaPoint(d, { tilt: true, ellipse: true }));

  it('runs the sundial 14 minutes behind in February and 16 ahead in early November', () => {
    const eot = real.map((p) => p.equationOfTime);
    const min = Math.min(...eot);
    const max = Math.max(...eot);
    expectNear(min, -14.2, 0.4, 'February');
    expectNear(max, 16.4, 0.4, 'November');
    expect(eot.indexOf(min)).toBeGreaterThan(dayOfYearOf(2026, 2, 5));
    expect(eot.indexOf(min)).toBeLessThan(dayOfYearOf(2026, 2, 18));
    expect(eot.indexOf(max)).toBeGreaterThan(dayOfYearOf(2026, 10, 28));
    expect(eot.indexOf(max)).toBeLessThan(dayOfYearOf(2026, 11, 8));
  });

  it('reduces to a line with only the ellipse, and to nothing with neither', () => {
    for (let d = 0; d < 365; d += 7) {
      expect(analemmaPoint(d, { tilt: false, ellipse: true }).declination).toBeCloseTo(0, 12);
      const none = analemmaPoint(d, { tilt: false, ellipse: false });
      expect(Math.abs(none.equationOfTime)).toBeLessThan(1e-9);
    }
    const ellipse = Array.from({ length: 365 }, (_, d) => analemmaPoint(d, { tilt: false, ellipse: true }).equationOfTime);
    expectNear(Math.max(...ellipse), 7.7, 0.2, 'ellipse alone');
    const tilt = Array.from({ length: 365 }, (_, d) => analemmaPoint(d, { tilt: true, ellipse: false }).equationOfTime);
    expectNear(Math.max(...tilt), 9.9, 0.2, 'tilt alone');
    expectNear(Math.max(...tilt), -Math.min(...tilt), 0.01, 'symmetric');
  });
});

describe('Chapter 3’s interactive question', () => {
  it('accepts the June solstice in London, and the days around it', () => {
    expect(checkHighestNoon(2026, 51.5, dayOfYearOf(2026, 6, 21)).correct).toBe(true);
    expect(checkHighestNoon(2026, 51.5, dayOfYearOf(2026, 6, 28)).correct).toBe(true);
    expect(checkHighestNoon(2026, 51.5, dayOfYearOf(2026, 3, 1)).correct).toBe(false);
    expect(checkHighestNoon(2026, 51.5, dayOfYearOf(2026, 12, 21)).correct).toBe(false);
  });

  it('accepts the December solstice in Sydney and the overhead days in Singapore', () => {
    expect(checkHighestNoon(2026, -33.9, dayOfYearOf(2026, 12, 21)).correct).toBe(true);
    expect(checkHighestNoon(2026, -33.9, dayOfYearOf(2026, 6, 21)).correct).toBe(false);
    const singapore = noonHeights(2026, 1.35);
    const overhead = singapore.map((h, d) => [h, d] as const).filter(([h]) => h > 89.5).map(([, d]) => d);
    expect(overhead.some((d) => d > 70 && d < 100)).toBe(true);
    expect(overhead.some((d) => d > 250 && d < 280)).toBe(true);
    expect(checkHighestNoon(2026, 1.35, overhead[0]).correct).toBe(true);
    expect(checkHighestNoon(2026, 1.35, dayOfYearOf(2026, 6, 21)).correct).toBe(false);
  });

  it('works for this year’s noon at any latitude', () => {
    expect(jdFromCalendar({ year: 2026, month: 1, day: 1 })).toBeGreaterThan(0);
    fc.assert(
      fc.property(fc.double({ min: -89, max: 89, noNaN: true }), (lat) => {
        const heights = noonHeights(2026, lat);
        const best = heights.indexOf(Math.max(...heights));
        expect(checkHighestNoon(2026, lat, best).correct).toBe(true);
      }),
      { numRuns: 30 },
    );
  });
});

describe('chart ticks', () => {
  it('picks round steps', () => {
    expect(niceTicks(0, 24)).toEqual([0, 5, 10, 15, 20]);
    expect(niceTicks(22, 24.8)).toEqual([22, 23, 24]);
  });
});
