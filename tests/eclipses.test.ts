import { describe, expect, it } from 'vitest';
import { eclipsesBetween, eclipseAt, SAROS_DAYS, sarosNumber, type Eclipse } from '../src/core/ephemeris/eclipses';
import { meanAscendingNode } from '../src/core/ephemeris/moon';
import { moonAge, nextPhase, phasesBetween, phaseTime } from '../src/core/ephemeris/lunation';
import { moonElongation } from '../src/core/ephemeris/phase';
import { sunPosition } from '../src/core/ephemeris/sun';
import { jdFromCalendar } from '../src/core/time/calendar';
import { DEG } from '../src/core/units';
import nasa from './fixtures/eclipses.json';
import { expectNear } from './helpers';

const MINUTE = 1 / 1440;
const moonLongitudeOfSun = (jdTT: number) => sunPosition(jdTT).lon;

describe('the Moon’s phases (Meeus ch. 49)', () => {
  it('matches Example 49.a: the new Moon of February 1977', () => {
    expectNear(phaseTime(-283), 2_443_192.651_18, 2e-5, 'JDE');
  });

  it('matches Example 49.b: the first last quarter of 2044', () => {
    expectNear(phaseTime(544.75), 2_467_636.491_86, 2e-5, 'JDE');
  });

  it('puts every phase where the lunar theory has the Moon 0°, 90°, 180° or 270° from the Sun', () => {
    // Over 1900–2100 the two theories agree to a few minutes of time (the Moon moves 0.5° an hour against the Sun).
    const phases = phasesBetween(jdFromCalendar({ year: 1900, month: 1, day: 1 }), jdFromCalendar({ year: 2100, month: 1, day: 1 }));
    expect(phases.length).toBe(9895);
    const target = { new: 0, 'first quarter': 90, full: 180, 'last quarter': -90 };
    for (const p of phases.filter((_, i) => i % 7 === 0)) {
      let off = moonElongation(p.jdTT) / DEG - target[p.name];
      off = ((off + 540) % 360) - 180;
      expect(Math.abs(off), `${p.name} at JD ${p.jdTT}`).toBeLessThan(0.05); // 0.05° ≈ 6 minutes
    }
  });

  it('finds the next phase and the Moon’s age', () => {
    const jd = jdFromCalendar({ year: 2026, month: 3, day: 1 });
    const full = nextPhase(jd, 'full');
    // NASA: total lunar eclipse, greatest at 2026 Mar 3 11:33:27 TD; full Moon 11:38 UT.
    expectNear(full.jdTT, jdFromCalendar({ year: 2026, month: 3, day: 3.4848 }), 10 * MINUTE, 'full Moon');
    // Full Moon comes 13.9 to 15.6 days after new Moon, as the Moon's speed varies round its elliptical orbit.
    expect(moonAge(full.jdTT + 0.01)).toBeGreaterThan(13.5);
    expect(moonAge(full.jdTT + 0.01)).toBeLessThan(16);
    expect(moonAge(full.jdTT - 0.01)).toBeLessThan(moonAge(full.jdTT + 0.01));
  });
});

const TYPE: Record<string, string> = { P: 'partial', A: 'annular', T: 'total', H: 'hybrid', N: 'penumbral' };

describe('the eclipse finder (Meeus ch. 54) against NASA’s list for 1900–2100', () => {
  const from = jdFromCalendar({ year: 1900, month: 1, day: 1 });
  const to = jdFromCalendar({ year: 2101, month: 1, day: 1 });
  const ours = eclipsesBetween(from, to);
  const report = (e: Eclipse) => `${e.kind} k=${e.k} JD ${e.jdTT.toFixed(4)} γ=${e.gamma.toFixed(4)} u=${e.u.toFixed(4)} ${e.type}`;

  /**
   * A few eclipses sit right on a dividing line, where NASA's magnitude is within
   * 0.005 of the value that separates one kind from another (a grazing partial
   * or penumbral eclipse that barely happens, an annular eclipse that is almost
   * total). Meeus's shortened method may fall on either side of the line there,
   * so those cases are excused, and listed, but nothing else is.
   */
  const BORDER = 0.005;
  const excused: string[] = [];

  it.each(['solar', 'lunar'] as const)('finds every %s eclipse, at the right time, and no others', (kind) => {
    const theirs = nasa.rows.filter((r) => r.kind === kind);
    const mine = ours.filter((e) => e.kind === kind);
    const unmatched = new Set(mine);
    const problems: string[] = [];
    let worst = 0;
    for (const row of theirs) {
      const match = mine.find((e) => Math.abs(e.jdTT - row.jdTT) < 0.5);
      if (!match) {
        (row.magnitude < BORDER ? excused : problems).push(`missing: ${row.date} ${row.type} γ=${row.gamma} magnitude ${row.magnitude}`);
        continue;
      }
      unmatched.delete(match);
      worst = Math.max(worst, Math.abs(match.jdTT - row.jdTT));
      expectNear(match.gamma, row.gamma, 0.01, `γ on ${row.date}`);
    }
    for (const e of unmatched) {
      const magnitude = e.kind === 'solar' ? (e.magnitude ?? 1) : e.penumbralMagnitude;
      (magnitude < BORDER ? excused : problems).push(`extra: ${report(e)}`);
    }
    expect(problems).toEqual([]);
    expect(worst / MINUTE, 'worst time error, minutes').toBeLessThan(5);
  });

  it.each(['solar', 'lunar'] as const)('gives every %s eclipse the right type', (kind) => {
    const problems: string[] = [];
    for (const row of nasa.rows.filter((r) => r.kind === kind)) {
      const match = ours.find((e) => e.kind === kind && Math.abs(e.jdTT - row.jdTT) < 0.5);
      if (!match) continue;
      const expected = TYPE[row.type];
      // Hybrid eclipses sit on the line between total and annular, so either neighbour is accepted for them.
      const ok = match.type === expected || (row.type === 'H' && (match.type === 'total' || match.type === 'annular'));
      if (ok) continue;
      const nearLine =
        kind === 'solar' ? Math.abs(row.magnitude - 1) < BORDER : Math.abs(row.umbral! - 1) < BORDER || Math.abs(row.umbral!) < BORDER;
      (nearLine ? excused : problems).push(`${row.date}: NASA ${expected} (magnitude ${row.umbral ?? row.magnitude}), ours ${match.type}`);
    }
    expect(problems).toEqual([]);
  });

  it('excuses only a handful of eclipses on a dividing line', () => {
    // 1935-01-05 (solar, magnitude 0.0013), 1948-05-09 (annular, magnitude 0.9999), 2015-04-04 (total lunar, umbral magnitude 1.0008),
    // 2027-07-18 and 2096-06-06 (penumbral, magnitudes 0.0014 and 0.0047).
    expect(excused.length, excused.join('; ')).toBeLessThanOrEqual(5);
  });

  it('gets partial solar and lunar magnitudes close to NASA’s', () => {
    for (const row of nasa.rows) {
      const match = ours.find((e) => e.kind === row.kind && Math.abs(e.jdTT - row.jdTT) < 0.5);
      if (!match) continue;
      if (match.kind === 'solar' && match.type === 'partial') expectNear(match.magnitude!, row.magnitude, 0.02, `magnitude on ${row.date}`);
      if (match.kind === 'lunar') {
        expectNear(match.penumbralMagnitude, row.magnitude, 0.03, `penumbral magnitude on ${row.date}`);
        expectNear(match.umbralMagnitude, row.umbral!, 0.03, `umbral magnitude on ${row.date}`);
      }
    }
  });

  it('numbers every eclipse’s Saros series as NASA does', () => {
    const problems: string[] = [];
    for (const row of nasa.rows) {
      const match = ours.find((e) => e.kind === row.kind && Math.abs(e.jdTT - row.jdTT) < 0.5);
      if (match && sarosNumber(match) !== row.saros) problems.push(`${row.kind} ${row.date}: NASA ${row.saros}, ours ${sarosNumber(match)}`);
    }
    expect(problems).toEqual([]);
  });

  it('puts every eclipse near a node: the Sun within about 18.5° of it (solar), 17.5° (penumbral) or 12.5° (partial and total lunar)', () => {
    // The true node swings up to 1.7° either side of the mean node used here, so each limit gets that much leeway.
    for (const e of ours) {
      const sunFromNode = Math.abs(((((moonLongitudeOfSun(e.jdTT) - meanAscendingNode(e.jdTT)) / DEG) % 180) + 180) % 180);
      const off = Math.min(sunFromNode, 180 - sunFromNode);
      expect(off, `${e.kind} at JD ${e.jdTT}`).toBeLessThan((e.kind === 'solar' ? 18.5 : e.type === 'penumbral' ? 17.5 : 12.5) + 1.7);
    }
  });

  it('matches Meeus Example 54.a: the partial solar eclipse of 21 May 1993', () => {
    const e = eclipseAt(-82)!;
    expect(e.kind).toBe('solar');
    expect(e.type).toBe('partial');
    expectNear(e.jdTT, 2_449_129.0979, 2e-4, 'JDE');
    expectNear(e.gamma, 1.1348, 1e-4, 'γ');
    expectNear(e.u, 0.0097, 1e-4, 'u');
    if (e.kind === 'solar') expectNear(e.magnitude!, 0.74, 0.001, 'magnitude');
  });

  it('repeats a Saros later, with γ shifted only a little', () => {
    const total2026 = ours.find((e) => e.kind === 'solar' && Math.abs(e.jdTT - jdFromCalendar({ year: 2026, month: 8, day: 12.73 })) < 0.5)!;
    expect(total2026.type).toBe('total');
    const next = eclipseAt(total2026.k + 223)!;
    expectNear(next.jdTT - total2026.jdTT, SAROS_DAYS, 0.5, 'Saros');
    expect(Math.abs(next.gamma - total2026.gamma)).toBeLessThan(0.1);
  });
});
