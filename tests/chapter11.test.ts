import { describe, expect, it } from 'vitest';
import { L_SUN, T_SUN } from '../src/core/constants';
import { checkHalfTemperature } from '../src/content/checks/chapter11Answers';
import { brightnessRatio, combinedMagnitude, explainDifference, formatRatio, LADDER, magnitudeDifference } from '../src/figures/magnitudes';
import {
  COLOUR_STARS,
  describeColour,
  describeGlow,
  formatPower,
  formatSuns,
  planckCurve,
  solarLuminosity,
  solarRadiusFor,
  sunlightAt,
  sunlightPlaces,
  sunPowerFromSunlight,
} from '../src/figures/thermal';
import { limbBrightness } from '../src/viz/star/colour';
import { expectNear } from './helpers';

const NOW = Date.UTC(2026, 9, 29);

describe('the blackbody explorer and two filters (Figures 11.1 and 11.2)', () => {
  it('describes glows', () => {
    expect(describeGlow(310)).toBe(
      'At 310 K the glow peaks at 9.35 µm and it gives out no visible light to speak of, only infrared. Each square metre gives out 524 W, almost none of it as visible light.',
    );
    expect(describeGlow(T_SUN)).toBe('At 5,772 K the glow peaks at 502 nm and it looks white, faintly warm. Each square metre gives out 63 MW, 37% of it as visible light.');
    expect(formatPower(5.67e12)).toBe('5.7 TW');
  });

  it('draws curves evenly in log wavelength', () => {
    const c = planckCurve(5772, 1e-7, 1e-5, 10);
    expect(c.length).toBe(11);
    expectNear(c[5][0], 1e-6, 1e-15, 'middle');
  });

  it('puts the stars on the B − V scale in order of temperature', () => {
    for (let i = 1; i < COLOUR_STARS.length; i++) {
      expect(COLOUR_STARS[i].BV).toBeGreaterThan(COLOUR_STARS[i - 1].BV);
      expect(COLOUR_STARS[i].kelvin).toBeLessThan(COLOUR_STARS[i - 1].kelvin);
    }
    expect(describeColour(T_SUN)).toBe(
      'At 5,772 K the spectrum peaks at 502 nm, and B − V = +0.64: redder than Vega, which sets the scale’s zero. The Sun, at about this temperature, measures +0.65.',
    );
    expect(describeColour(30_000)).toContain('peaks in the ultraviolet, beyond B');
  });
});

describe('size, temperature, power (Figure 11.3)', () => {
  it('works luminosity out from size and temperature, and back', () => {
    expect(solarLuminosity(1, T_SUN)).toBe(1);
    expectNear(solarLuminosity(4, T_SUN / 2), 1, 1e-12, 'four times as wide, half as hot');
    expectNear(solarLuminosity(764, 3600), 88_300, 300, 'Betelgeuse');
    expectNear(solarRadiusFor(1, T_SUN / 2), 4, 1e-12, 'radius back');
    expect(formatSuns(88_325)).toBe('88,000');
    expect(formatSuns(0.0231)).toBe('0.023');
    expect(formatSuns(25.7)).toBe('26');
  });

  it('darkens the star’s edge', () => {
    expect(limbBrightness(0)).toBe(1);
    expectNear(limbBrightness(1), 0.4, 1e-12, 'edge');
    expect(limbBrightness(0.5)).toBeGreaterThan(limbBrightness(0.9));
  });

  it('marks the interactive question: the Sun’s luminosity at half its temperature', () => {
    expect(checkHalfTemperature({ radius: 4, kelvin: 2890 }).correct).toBe(true);
    expect(checkHalfTemperature({ radius: 4.2, kelvin: 2880 }).correct).toBe(true);
    expect(checkHalfTemperature({ radius: 2, kelvin: 2890 }).correct).toBe(false);
    expect(checkHalfTemperature({ radius: 1, kelvin: 5772 }).correct).toBe(false);
    expect(checkHalfTemperature({ radius: 16, kelvin: 2890 }).correct).toBe(false);
  });
});

describe('the inverse-square law (Figure 11.4, brief §3)', () => {
  it('gives sunlight at each planet and at Voyager 1', () => {
    const at = (id: string) => sunlightPlaces(NOW).find((p) => p.id === id)!.watts;
    expectNear(at('mercury'), 9080, 30, 'Mercury');
    expectNear(at('earth'), 1361, 1, 'Earth');
    expectNear(at('jupiter'), 50, 1, 'Jupiter');
    expectNear(at('neptune'), 1.5, 0.05, 'Neptune');
    expectNear(at('voyager'), 0.046, 0.002, 'Voyager 1');
    expect(sunlightAt(2) / sunlightAt(1)).toBe(0.25);
  });

  it('weighs the Sun’s power from sunlight at Earth', () => {
    expectNear(sunPowerFromSunlight() / L_SUN, 1, 0.002, 'L☉');
  });
});

describe('logarithms and magnitudes (Toolkit T5)', () => {
  it('makes five magnitudes a factor of 100, and one about 2.512', () => {
    expectNear(brightnessRatio(0, 5), 100, 1e-9, 'five');
    expectNear(brightnessRatio(0, 1), 2.512, 0.001, 'one');
    expectNear(magnitudeDifference(100), 5, 1e-12, 'back');
    // The Sun is about 10¹⁰ times brighter than Sirius.
    expectNear(Math.log10(brightnessRatio(-26.74, -1.46)), 10.1, 0.05, 'Sun and Sirius');
  });

  it('adds stars’ light, not their magnitudes', () => {
    expectNear(combinedMagnitude(3, 3), 2.25, 0.01, 'two equal stars');
    expectNear(combinedMagnitude(...Array(100).fill(3)), -2, 1e-9, 'a hundred');
    expectNear(combinedMagnitude(0, 10), 0, 0.0002, 'a faint companion adds almost nothing');
  });

  it('explains differences in hundreds and steps', () => {
    expect(explainDifference(5)).toBe('100');
    expect(explainDifference(10)).toBe('100²');
    expect(explainDifference(5.97)).toBe('100 × 2.512^0.97');
    expect(formatRatio(244.3)).toBe('244');
    expect(formatRatio(1.2e10)).toBe('12 billion');
    expect(formatRatio(6e22)).toBe('6.0 × 10²²');
    for (let i = 1; i < LADDER.length; i++) expect(LADDER[i].V).toBeGreaterThan(LADDER[i - 1].V);
  });
});
