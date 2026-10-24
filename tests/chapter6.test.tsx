import { describe, expect, it } from 'vitest';
import { checkHalley } from '../src/content/checks/chapter6Answers';
import { ellipseArea } from '../src/core/orbits/ellipse';
import { formatE, formatPeriod, ORBIT_PRESETS, presetFor, speedKmS, speedRange, wedge } from '../src/figures/ellipses';
import { expectNear } from './helpers';

describe('the ellipse and area figures (6.1, 6.2)', () => {
  it('has real orbits as presets, found again by their eccentricity', () => {
    expect(ORBIT_PRESETS.map((p) => p.id)).toEqual(['circle', 'earth', 'mars', 'mercury', 'pluto', 'halley']);
    for (const p of ORBIT_PRESETS) expect(presetFor(p.e)?.id).toBe(p.id);
    expect(presetFor(0.5)).toBeUndefined();
    expect(formatE(0.0167)).toBe('0.0167');
    expect(formatE(0.968)).toBe('0.968');
  });

  it('gives Earth’s and Halley’s speeds', () => {
    const earth = ORBIT_PRESETS.find((p) => p.id === 'earth')!;
    const { fastest, slowest } = speedRange(earth);
    expectNear(fastest, 30.29, 0.02, 'perihelion');
    expectNear(slowest, 29.29, 0.02, 'aphelion');
    const halley = speedRange(ORBIT_PRESETS.find((p) => p.id === 'halley')!);
    expectNear(halley.fastest, 55.1, 0.2, 'Halley at perihelion');
    expect(halley.slowest).toBeLessThan(1);
    expectNear(speedKmS(1, 1), 29.78, 0.01, 'circular at 1 AU');
  });

  it('draws twelve wedges that tile the orbit', () => {
    const orbit = { a: 1, e: 0.6 };
    // The shoelace area of each wedge's outline is close to a twelfth of the whole.
    for (let k = 0; k < 12; k++) {
      const pts = wedge(orbit, (2 * Math.PI * k) / 12, (2 * Math.PI * (k + 1)) / 12, 200);
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const [p, q] = [pts[i], pts[(i + 1) % pts.length]];
        area += p.x * q.y - q.x * p.y;
      }
      expectNear(Math.abs(area / 2) / ellipseArea(orbit), 1 / 12, 2e-4, `wedge ${k + 1}`);
    }
  });
});

describe('the harmonic law figure (6.3)', () => {
  it('formats periods', () => {
    expect(formatPeriod(0.2408)).toBe('0.24 years (88 days)');
    expect(formatPeriod(8)).toBe('8.0 years');
    expect(formatPeriod(164.8)).toBe('165 years');
  });
});

describe('Chapter 6’s interactive question', () => {
  it('accepts Halley’s shape and explains the rest', () => {
    expect(checkHalley(0.968).correct).toBe(true);
    expect(checkHalley(0.95).correct).toBe(true);
    expect(checkHalley(0.99).correct).toBe(true);
    expect(checkHalley(0.9).correct).toBe(false);
    expect(checkHalley(0.1).correct).toBe(false);
  });
});
