import { describe, expect, it } from 'vitest';
import { alignments, elongation, geocentricPlace, greatestElongations, longitudeRate, retrogradeLoops, stations } from '../src/core/ephemeris/wanderers';
import { calendarFromJd, jdFromCalendar } from '../src/core/time/calendar';
import { ttFromUt, utFromTt } from '../src/core/time/deltaT';
import { DEG } from '../src/core/units';
import { expectNear } from './helpers';

/** 0h UT on a date, as a Julian Date (TT). */
const jd = (year: number, month: number, day: number) => ttFromUt(jdFromCalendar({ year, month, day }));
/** "2025-01-16" for a Julian Date (TT), in UT. */
const ymd = (jdTT: number) => {
  const { year, month, day } = calendarFromJd(utFromTt(jdTT));
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.floor(day)).padStart(2, '0')}`;
};

// Published dates (UT) from the almanacs: Mars's oppositions of January 2025 and February 2027 (the research brief), and
// its stations either side of the first; Jupiter's and Saturn's oppositions of 2024–2026; Venus's inferior conjunction
// and greatest elongations of 2025.
describe('the wanderers’ cycles', () => {
  it('finds Mars’s oppositions and its backward loop of 2024–25', () => {
    const events = alignments('mars', jd(2024, 6, 1), jd(2027, 6, 1)).map((a) => `${a.kind} ${ymd(a.jdTT)}`);
    expect(events).toEqual(['opposition 2025-01-16', 'conjunction 2026-01-09', 'opposition 2027-02-19']);
    expect(alignments('mars', jd(2029, 1, 1), jd(2029, 12, 31)).map((a) => `${a.kind} ${ymd(a.jdTT)}`)).toEqual(['opposition 2029-03-25']);
    const [loop] = retrogradeLoops('mars', jd(2024, 10, 1), jd(2025, 4, 1));
    expect(ymd(loop.begins.jdTT)).toBe('2024-12-06');
    expect(ymd(loop.ends.jdTT)).toBe('2025-02-24');
    expect(ymd(loop.middle)).toBe('2025-01-16');
    expect(loop.days).toBeGreaterThan(60);
    expect(loop.days).toBeLessThan(85);
  });

  it('finds the giants’ oppositions', () => {
    const opp = (planet: 'jupiter' | 'saturn', from: number, to: number) =>
      alignments(planet, from, to)
        .filter((a) => a.kind === 'opposition')
        .map((a) => ymd(a.jdTT));
    expect(opp('jupiter', jd(2024, 6, 1), jd(2026, 6, 1))).toEqual(['2024-12-07', '2026-01-10']);
    expect(opp('saturn', jd(2025, 1, 1), jd(2025, 12, 31))).toEqual(['2025-09-21']);
  });

  it('finds Venus’s inferior conjunction and greatest elongations of 2025', () => {
    const events = alignments('venus', jd(2025, 1, 1), jd(2025, 12, 31)).map((a) => `${a.kind} ${ymd(a.jdTT)}`);
    expect(events).toEqual(['inferior conjunction 2025-03-23']);
    const greatest = greatestElongations('venus', jd(2025, 1, 1), jd(2025, 12, 31));
    expect(greatest.map((g) => `${g.side} ${ymd(g.jdTT)}`)).toEqual(['east 2025-01-10', 'west 2025-06-01']);
    expectNear(greatest[0].angle / DEG, 47.2, 0.05, 'eastern');
    expectNear(greatest[1].angle / DEG, 45.9, 0.05, 'western');
  });

  it('keeps Mercury and Venus near the Sun, and lets Mars go anywhere', () => {
    let maxMercury = 0;
    let maxVenus = 0;
    let maxMars = 0;
    for (let t = jd(2020, 1, 1); t < jd(2028, 1, 1); t += 3) {
      maxMercury = Math.max(maxMercury, elongation('mercury', t));
      maxVenus = Math.max(maxVenus, elongation('venus', t));
      maxMars = Math.max(maxMars, elongation('mars', t));
    }
    expect(maxMercury / DEG).toBeGreaterThan(27);
    expect(maxMercury / DEG).toBeLessThan(28.5);
    expect(maxVenus / DEG).toBeGreaterThan(46.5);
    expect(maxVenus / DEG).toBeLessThan(47.9);
    // Opposite the Sun, give or take its few degrees above or below the ecliptic.
    expect(maxMars / DEG).toBeGreaterThan(170);
  });

  it('gives the synodic periods and retrograde lengths of the research brief', () => {
    // Synodic periods (days) and typical retrograde lengths: brief §6.
    const cases = [
      { planet: 'mercury', synodic: 115.88, years: 8, retro: [18, 26] },
      { planet: 'venus', synodic: 583.92, years: 33, retro: [38, 46] },
      { planet: 'mars', synodic: 779.94, years: 33, retro: [58, 82] },
      { planet: 'jupiter', synodic: 398.88, years: 13, retro: [110, 130] },
      { planet: 'saturn', synodic: 378.09, years: 11, retro: [130, 145] },
    ] as const;
    for (const c of cases) {
      const from = jd(2000, 1, 1);
      const to = from + c.years * 365.25;
      const middles = alignments(c.planet, from, to).filter((a) => a.kind === 'opposition' || a.kind === 'inferior conjunction');
      const mean = (middles[middles.length - 1].jdTT - middles[0].jdTT) / (middles.length - 1);
      expectNear(mean, c.synodic, c.planet === 'mercury' ? 3 : 2, `${c.planet}'s synodic period`);
      for (const loop of retrogradeLoops(c.planet, from, to)) {
        expect(loop.days, `${c.planet} retrograde at ${ymd(loop.middle)}`).toBeGreaterThanOrEqual(c.retro[0]);
        expect(loop.days).toBeLessThanOrEqual(c.retro[1]);
      }
    }
  }, 30_000);

  it('stands still at each station and moves backwards in between', () => {
    const [begin, end] = stations('mars', jd(2024, 10, 1), jd(2025, 4, 1));
    expect(begin.turns).toBe('retrograde');
    expect(end.turns).toBe('direct');
    expect(Math.abs(longitudeRate('mars', begin.jdTT))).toBeLessThan(1e-4);
    expect(longitudeRate('mars', (begin.jdTT + end.jdTT) / 2)).toBeLessThan(0);
    expect(longitudeRate('mars', begin.jdTT - 20)).toBeGreaterThan(0);
    // At opposition Mars is on the far side of the sky from the Sun, and close: about 0.64 AU in January 2025.
    expectNear(geocentricPlace('mars', jd(2025, 1, 16)).distance, 0.643, 0.01, 'distance');
  });
});
