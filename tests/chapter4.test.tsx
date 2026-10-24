import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkFirstQuarter } from '../src/content/checks/chapter4Answers';
import { DEG } from '../src/core/units';
import { dayOfYearTT, eclipseName, sunFromNode, yearOfEclipses, yearStartTT } from '../src/figures/eclipseSeasons';
import { orbitPoint } from '../src/figures/eclipseSeasons/scene';
import { ageOfElongation, altitudeOf, elongationOfAge, hourText, illuminated, litOnRight, litPath, moonHourAngle, moonTimes, sunHourAngle } from '../src/figures/phases';
import { DIAGRAM, lunarDiagram, shadowOf, solarDiagram, solarView, viewFrom } from '../src/figures/shadows';
import { formatDays, SIDEREAL_MONTH, synodicMonthFor, SIDEREAL_YEAR } from '../src/figures/twoMonths';
import { expectNear } from './helpers';

describe('the phase machine (Figure 4.1)', () => {
  it('turns age into elongation and back', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 29.5, noNaN: true }), (age) => {
        expectNear(ageOfElongation(elongationOfAge(age)), age, 1e-9, 'age');
      }),
    );
    expect(illuminated(0)).toBe(0);
    expectNear(illuminated(Math.PI), 1, 1e-15, 'full');
    expectNear(illuminated(Math.PI / 2), 0.5, 1e-15, 'quarter');
    expect(litPath(0, 10)).toBe('');
    expect(litPath(Math.PI / 3, 10)).toContain('A');
    expect(litOnRight(1)).toBe(true);
    expect(litOnRight(4)).toBe(false);
  });

  it('raises the full Moon at sunset and the first quarter at noon', () => {
    expect(hourText(moonTimes(Math.PI).rise)).toBe('18:00');
    expect(hourText(moonTimes(Math.PI).set)).toBe('06:00');
    expect(hourText(moonTimes(Math.PI / 2).rise)).toBe('12:00');
    expect(hourText(moonTimes(Math.PI / 2).highest)).toBe('18:00');
    expect(hourText(moonTimes(0).rise)).toBe('06:00');
  });

  it('puts the Sun and the Moon on the idealised sky', () => {
    expect(altitudeOf(sunHourAngle(12))).toBeCloseTo(Math.PI / 2, 12);
    expect(altitudeOf(sunHourAngle(18))).toBeCloseTo(0, 12);
    // At sunset a first-quarter Moon is highest; a full Moon is rising.
    expect(altitudeOf(moonHourAngle(18, Math.PI / 2))).toBeCloseTo(Math.PI / 2, 12);
    expect(altitudeOf(moonHourAngle(18, Math.PI))).toBeCloseTo(0, 12);
    expect(moonHourAngle(18, Math.PI)).toBeLessThan(0);
  });
});

describe('two kinds of month (Figure 4.2)', () => {
  it('gives the synodic month from the sidereal month and the year', () => {
    expectNear(synodicMonthFor(SIDEREAL_YEAR), 29.530_59, 0.0002, 'synodic');
    expect(synodicMonthFor(120)).toBeGreaterThan(35);
    expect(formatDays(SIDEREAL_MONTH)).toBe('27 days 7 h 43 min');
  });
});

describe('eclipse seasons (Figure 4.4)', () => {
  const y2026 = yearOfEclipses(2026);

  it('lists 2026’s four eclipses and two eclipse seasons', () => {
    expect(y2026.eclipses.map((e) => eclipseName(e))).toEqual([
      'Annular solar eclipse',
      'Total lunar eclipse',
      'Total solar eclipse',
      'Partial lunar eclipse',
    ]);
    expect(y2026.eclipses.map((e) => e.saros)).toEqual([121, 133, 126, 138]);
    expect(y2026.seasons).toHaveLength(2);
    expect(y2026.seasons.map((s) => s.node)).toEqual(['ascending', 'descending']);
    for (const e of y2026.eclipses) expect(y2026.seasons.some((s) => e.day >= s.from - 1 && e.day <= s.to + 1)).toBe(true);
    expect(y2026.phases.filter((p) => p.name === 'full')).toHaveLength(13);
  });

  it('brings the eclipse seasons about 19 days earlier each year', () => {
    const middle = (s: { from: number; to: number }) => (s.from + s.to) / 2;
    // The same node's season, a year apart (one that starts on 1 January is cut short, so skip it).
    const whole = (year: number) => yearOfEclipses(year).seasons.filter((s) => s.from > 0 && s.node === 'descending')[0];
    expectNear(middle(whole(2030)) - middle(whole(2031)), 18.6, 3, 'shift');
  });

  it('measures the Sun’s angle from the nearer node', () => {
    const total = y2026.eclipses[2];
    const s = sunFromNode(total.jdTT);
    expect(s.node).toBe('descending');
    expect(Math.abs(s.angle)).toBeLessThan(12 * DEG);
    expectNear(dayOfYearTT(2026, yearStartTT(2026) + 10), 10, 1e-9, 'days');
  });

  it('draws the Moon’s orbit tilted about the line of nodes', () => {
    const node = 1;
    const i = 0.3;
    expect(orbitPoint(0, node, i)[2]).toBeCloseTo(0, 12);
    expect(orbitPoint(Math.PI, node, i)[2]).toBeCloseTo(0, 12);
    expect(orbitPoint(Math.PI / 2, node, i)[2]).toBeGreaterThan(0);
    const p = orbitPoint(0.7, node, i);
    expectNear(Math.hypot(...p), 2.6, 1e-12, 'radius');
  });
});

describe('shadows (Figure 4.5)', () => {
  it('finds the umbra’s tip where the tangents meet', () => {
    const shadow = shadowOf({ x: 0, y: 0, r: 4 }, { x: 10, y: 0, r: 2 }, 50);
    expectNear(shadow.apex.x, 20, 1e-12, 'apex');
    expect(shadow.umbra).toHaveLength(3);
  });

  it('sees a total eclipse when the Moon is nearer than about 380,000 km, and an annular one beyond', () => {
    expect(solarDiagram(360, 0).seen).toBe('total');
    expect(solarDiagram(378, 0).seen).toBe('total');
    expect(solarDiagram(381, 0).seen).toBe('annular');
    expect(solarDiagram(404, 0).seen).toBe('annular');
    expect(solarDiagram(384.4, 0.6).seen).toBe('partial');
    expect(solarDiagram(384.4, 1).seen).toBe('none');
    // The limit itself: where the Moon and the Sun look the same size from the marked place.
    let lo = 356;
    let hi = 407;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (solarDiagram(mid, 0).seen === 'total') lo = mid;
      else hi = mid;
    }
    expectNear(lo, 379.7, 1.5, 'limit');
    expect(solarView(viewFrom({ x: 0, y: 0 }, { x: -10, y: 0, r: 1 }, { x: -5, y: 3, r: 0.5 }))).toBe('none');
  });

  it('takes the Moon through Earth’s shadow from total to missed', () => {
    expect(lunarDiagram(0).seen).toBe('total');
    expect(lunarDiagram(0.42).seen).toBe('partial');
    expect(lunarDiagram(0.72).seen).toBe('penumbral');
    expect(lunarDiagram(1).seen).toBe('none');
    const { umbra, penumbra, moon } = lunarDiagram(0);
    // Earth's umbra is about 2.7 Moon-widths across at the Moon, and the penumbra about twice that.
    expectNear(umbra / moon.r, 2.7, 0.15, 'umbra');
    expect(penumbra / umbra).toBeGreaterThan(1.7);
    expect(DIAGRAM.width).toBe(640);
  });
});

describe('Chapter 4’s interactive question', () => {
  it('accepts first quarter, and explains the usual mistakes', () => {
    expect(checkFirstQuarter(90).correct).toBe(true);
    expect(checkFirstQuarter(100).correct).toBe(true);
    expect(checkFirstQuarter(270).correct).toBe(false);
    expect(checkFirstQuarter(180).correct).toBe(false);
    expect(checkFirstQuarter(0).correct).toBe(false);
    expect(checkFirstQuarter(45).correct).toBe(false);
  });
});
