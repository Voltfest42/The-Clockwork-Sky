import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { jdFromCalendar } from '../src/core/time/calendar';
import { ttFromUt } from '../src/core/time/deltaT';
import { DEG } from '../src/core/units';
import { TIMELINE, timelineBetween } from '../src/data/timeline';
import { planetYear, sideOfSun, summarise } from '../src/figures/planetYear';
import { fitWindow, ptolemysValues } from '../src/figures/ptolemyFit';
import { dateLabel, halfWindow, loopAfter, loopBefore, sampleLoop, sightDirection } from '../src/figures/retrograde';
import { galileosVenus, greatestElongationFor, radiusFromElongation, triangle, venusIn } from '../src/figures/venus';
import { scoreFit } from '../src/core/orbits/ptolemy';
import { expectNear } from './helpers';

const jd = (year: number, month: number, day: number) => ttFromUt(jdFromCalendar({ year, month, day }));

describe('a year of planets (Figure 5.1)', () => {
  const year = planetYear(2025).map(summarise);
  const of = (p: string) => year.find((s) => s.planet === p)!;

  it('keeps Mercury and Venus near the Sun and lets the others reach opposition', () => {
    expect(of('mercury').farthest.angle / DEG).toBeLessThan(28.5);
    expect(of('venus').farthest.angle / DEG).toBeLessThan(47.5);
    expectNear(of('venus').farthest.angle / DEG, 47.2, 0.1, 'Venus on 10 January 2025');
    // Mars and Saturn reach opposition in 2025; Jupiter’s fall just either side of it (7 December 2024, 10 January 2026).
    for (const p of ['mars', 'saturn']) expect(of(p).farthest.angle / DEG, p).toBeGreaterThan(170);
    expect(of('jupiter').farthest.angle / DEG).toBeGreaterThan(165);
  });

  it('finds the year’s backward stretches, day by day', () => {
    // Mars: from the year's start (it turned back on 6 December 2024) to 24 February 2025 (day 54).
    expect(of('mars').backwards).toEqual([{ from: 0, to: 53 }]);
    // Mercury goes backwards three times a year.
    expect(of('mercury').backwards).toHaveLength(3);
    expect(sideOfSun(40 * DEG)).toBe('40° east of the Sun, in the evening sky');
    expect(sideOfSun(-3 * DEG)).toBe('3° from the Sun, lost in its glare');
  });
});

describe('retrograde loops (Figure 5.2)', () => {
  it('steps from loop to loop', () => {
    const loop = loopAfter('mars', jd(2024, 6, 1));
    expect(dateLabel(loop.middle)).toBe('16 January 2025');
    expect(dateLabel(loopAfter('mars', loop.middle + 1).middle)).toBe('19 February 2027');
    expect(dateLabel(loopBefore('mars', loop.middle - 1).middle)).toBe('8 December 2022');
    expect(halfWindow('mars', loop)).toBe(Math.round(loop.days * 1.4));
    expect(dateLabel(loopAfter('venus', jd(2025, 1, 1)).middle)).toBe('23 March 2025');
  });

  it('points the lines of sight the way the planet is seen, and they swing back during the loop', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), (a, b) => {
        const earth = { x: Math.cos(a), y: Math.sin(a) };
        const planet = { x: 1.5 * Math.cos(b), y: 1.5 * Math.sin(b) };
        const d = sightDirection(earth, planet);
        expectNear(Math.hypot(d.x, d.y), 1, 1e-12, 'unit');
        const cross = (planet.x - earth.x) * d.y - (planet.y - earth.y) * d.x;
        expectNear(cross, 0, 1e-9, 'along the line');
      }),
    );
    // Between the stations of 2024–25 the direction turns clockwise (westwards); before them, anticlockwise.
    const turn = (t: number) => {
      const [s0, s1] = sampleLoop('mars', t, t + 1, 1);
      const [d0, d1] = [sightDirection(s0.earth, s0.planet), sightDirection(s1.earth, s1.planet)];
      return d0.x * d1.y - d0.y * d1.x;
    };
    expect(turn(jd(2025, 1, 16))).toBeLessThan(0);
    expect(turn(jd(2024, 10, 1))).toBeGreaterThan(0);
    const samples = sampleLoop('mars', jd(2025, 1, 1), jd(2025, 1, 1) + 10, 5);
    expect(samples).toHaveLength(3);
    expectNear(Math.hypot(samples[0].earth.x, samples[0].earth.y), 0.983, 0.002, 'Earth near perihelion');
  });
});

describe('Tune Ptolemy (Figure 5.3)', () => {
  it('scores Ptolemy’s proportions at about half a degree over 2020–2035', () => {
    const { times, real, epoch } = fitWindow();
    expect(times.length).toBeGreaterThan(1000);
    const score = scoreFit(ptolemysValues(epoch.jdTT), epoch, times, real);
    expectNear(score.mean / DEG, 0.55, 0.1, 'average miss');
  });
});

describe('Venus (Figures 5.4 and 5.5)', () => {
  it('makes a right angle at Venus at greatest elongation, giving 0.72', () => {
    const most = greatestElongationFor(0.72333);
    expectNear(most / DEG, 46.3, 0.05, 'greatest elongation');
    expectNear(radiusFromElongation(most), 0.72333, 1e-12, 'radius');
    // Search the orbit for the greatest angle: the angle at Venus is 90° there.
    let best = { elongation: 0, atPlanet: 0 };
    for (let a = 0; a < 360; a += 0.05) {
      const t = triangle(0.72333, a * DEG);
      if (t.elongation > best.elongation) best = t;
    }
    expectNear(best.elongation / DEG, 46.3, 0.05, 'found');
    expectNear(best.atPlanet / DEG, 90, 0.2, 'right angle');
  });

  it('never lets Ptolemy’s Venus get more than about a third lit, while the real one goes from full to new', () => {
    let ptolemy = 0;
    let copernicus = { min: 1, max: 0 };
    for (let d = 0; d < 584; d += 1) {
      ptolemy = Math.max(ptolemy, venusIn('ptolemy', d).lit);
      const lit = venusIn('copernicus', d).lit;
      copernicus = { min: Math.min(copernicus.min, lit), max: Math.max(copernicus.max, lit) };
      // Both arrangements put Venus in the same direction.
      expectNear(venusIn('ptolemy', d).elongation, venusIn('copernicus', d).elongation, 1e-12, 'same direction');
    }
    expect(ptolemy).toBeLessThan(0.36);
    expect(copernicus.max).toBeGreaterThan(0.999);
    expect(copernicus.min).toBeLessThan(0.001);
  });

  it('shows Galileo a shrinking phase and a growing disc, autumn 1610 to winter 1611', () => {
    const views = galileosVenus();
    for (let i = 1; i < views.length; i++) {
      expect(views[i].lit).toBeLessThan(views[i - 1].lit);
      expect(views[i].diameter).toBeGreaterThan(views[i - 1].diameter);
    }
    expect(views[0].lit).toBeGreaterThan(0.75);
    expect(views.every((v) => v.east)).toBe(true);
    expect(views[views.length - 1].lit).toBeLessThan(0.25);
  });
});

describe('the history timeline', () => {
  it('runs in order and picks a stretch', () => {
    for (let i = 1; i < TIMELINE.length; i++) expect(TIMELINE[i].year).toBeGreaterThanOrEqual(TIMELINE[i - 1].year);
    const stretch = timelineBetween(-300, 1620);
    expect(stretch[0].who).toBe('Aristarchus of Samos');
    expect(stretch[stretch.length - 1].who).toBe('Kepler');
  });
});
