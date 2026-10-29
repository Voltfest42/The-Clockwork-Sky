import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { C } from '../src/core/constants';
import { continuumOpacity, equivalentWidth, paynePeak, syntheticSpectrum, tioShare, type Line } from '../src/core/spectra/atmosphere';
import { relativisticWavelength, shiftedWavelength, velocityFromShift } from '../src/core/spectra/doppler';
import { bindingEnergy, HYDROGEN_IONISATION, levelEnergy, lineName, RYDBERG_H, seriesLimit, vacuumToAir, vacuumWavelength, wavelength } from '../src/core/spectra/hydrogen';
import { electronPressureOf, ELEMENTS, hydrogenLevelShare, ionisationFractions } from '../src/core/spectra/saha';
import lineData from '../src/data/spectra/lines.json';
import { expectNear } from './helpers';

const LINES: readonly Line[] = lineData.lines;
const line = (nm: number) => LINES.find((l) => Math.abs(l.nm - nm) < 0.05)!;

describe('hydrogen’s ladder (Bohr; brief §4)', () => {
  it('has Rydberg’s constant and the ionisation energy', () => {
    expectNear(RYDBERG_H, 1.096_776e7, 2, 'R_H');
    expectNear(HYDROGEN_IONISATION, 13.598, 0.001, 'eV');
    expect(levelEnergy(1)).toBe(0);
    expectNear(levelEnergy(2), 10.199, 0.001, 'level 2');
    expectNear(bindingEnergy(2), 3.4, 0.001, 'level 2 below the limit');
  });

  it('gives the Balmer lines in air to 0.01 nm, and Lyman α in vacuum', () => {
    expectNear(wavelength(2, 3) * 1e9, 656.28, 0.01, 'Hα');
    expectNear(wavelength(2, 4) * 1e9, 486.13, 0.01, 'Hβ');
    expectNear(wavelength(2, 5) * 1e9, 434.05, 0.01, 'Hγ');
    expectNear(wavelength(2, 6) * 1e9, 410.17, 0.01, 'Hδ');
    expectNear(vacuumWavelength(2, 3) * 1e9, 656.47, 0.01, 'Hα in vacuum');
    expectNear(wavelength(1, 2) * 1e9, 121.57, 0.01, 'Lyα');
    expectNear(seriesLimit(2) * 1e9, 364.6, 0.1, 'Balmer limit');
    expectNear(wavelength(3, 4) * 1e9, 1875.1, 0.2, 'Paα');
    expect(lineName(2, 3)).toBe('Hα');
    expect(lineName(1, 3)).toBe('Lyβ');
    expect(lineName(3, 4)).toBe('Paα');
  });

  it('agrees with NIST’s hydrogen lines', () => {
    for (const l of LINES.filter((x) => x.element === 'H')) {
      const upper = [3, 4, 5, 6, 7, 8].find((n) => Math.abs(wavelength(2, n) * 1e9 - l.nm) < 0.05);
      expect(upper, `${l.nm}`).toBeDefined();
      expectNear(wavelength(2, upper!) * 1e9, l.nm, 0.01, l.name ?? '');
    }
  });

  it('shrinks each series’ wavelengths towards its limit (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3 }), fc.integer({ min: 1, max: 20 }), (lower, k) => {
        const a = wavelength(lower, lower + k);
        const b = wavelength(lower, lower + k + 1);
        return b < a && b > seriesLimit(lower) * 0.9999;
      }),
    );
  });

  it('converts vacuum to air wavelengths only above 200 nm', () => {
    expectNear(vacuumToAir(500e-9) * 1e9, 499.86, 0.005, '500 nm');
    expect(vacuumToAir(150e-9)).toBe(150e-9);
  });
});

describe('Saha and Boltzmann (brief §4 and §14)', () => {
  it('shares each element among its stages (property)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...(Object.keys(ELEMENTS) as (keyof typeof ELEMENTS)[])), fc.double({ min: 2000, max: 60000, noNaN: true }), fc.double({ min: 0.01, max: 1000, noNaN: true }), (symbol, T, pe) => {
        const f = ionisationFractions(ELEMENTS[symbol], T, pe);
        return Math.abs(f.reduce((a, b) => a + b, 0) - 1) < 1e-9 && f.every((x) => x >= 0 && x <= 1);
      }),
    );
  });

  it('half-ionises hydrogen near 9,600 K at 20 N/m² (Carroll & Ostlie’s example)', () => {
    let lo = 5000;
    let hi = 20000;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (ionisationFractions(ELEMENTS.H, mid, 20)[1] < 0.5) lo = mid;
      else hi = mid;
    }
    expectNear(lo, 9600, 150, 'half-ionised');
  });

  it('gives a main-sequence photosphere’s electron pressure', () => {
    expectNear(Math.log10(electronPressureOf(5772)), 0.2, 0.05, 'the Sun');
    expect(electronPressureOf(3000)).toBeLessThan(electronPressureOf(5772));
    expect(electronPressureOf(20000)).toBeGreaterThan(electronPressureOf(10000));
  });

  it('puts few hydrogen atoms on the second rung in the Sun', () => {
    expect(hydrogenLevelShare(2, 5772)).toBeLessThan(1e-8);
    expect(hydrogenLevelShare(2, 10000)).toBeGreaterThan(1e-5);
  });

  it('puts each element’s lines where the spectral classes have them', () => {
    expect(paynePeak('H I')).toBeGreaterThan(9000);
    expect(paynePeak('H I')).toBeLessThan(11500);
    expect(paynePeak('He I')).toBeGreaterThan(15000);
    expect(paynePeak('He I')).toBeLessThan(22000);
    expect(paynePeak('He II')).toBeGreaterThan(30000);
    expect(paynePeak('Ca II')).toBeGreaterThan(4500);
    expect(paynePeak('Ca II')).toBeLessThan(6500);
    expect(paynePeak('Fe I')).toBeGreaterThan(3700);
    expect(paynePeak('Fe I')).toBeLessThan(5200);
  });

  it('keeps titanium oxide to the coolest stars', () => {
    expectNear(tioShare(3900), 0.5, 1e-9, 'half at 3,900 K');
    expect(tioShare(3000)).toBeGreaterThan(0.9);
    expect(tioShare(5000)).toBeLessThan(0.02);
  });
});

describe('the toy atmosphere', () => {
  it('gives the Sun’s strong lines about their real equivalent widths', () => {
    const naD2 = equivalentWidth(line(588.995), 5772);
    const hBeta = equivalentWidth(line(486.133), 5772);
    const caK = equivalentWidth(line(393.366), 5772);
    expect(naD2).toBeGreaterThan(0.04);
    expect(naD2).toBeLessThan(0.2);
    expect(hBeta).toBeGreaterThan(0.15);
    expect(hBeta).toBeLessThan(0.8);
    expect(caK).toBeGreaterThan(0.8);
    expect(caK).toBeLessThan(4);
  });

  it('makes hydrogen’s lines strongest in A stars and helium’s in B and O stars', () => {
    const hBeta = (T: number) => equivalentWidth(line(486.133), T);
    expect(hBeta(9500)).toBeGreaterThan(hBeta(5772));
    expect(hBeta(9500)).toBeGreaterThan(hBeta(30000));
    const heI = (T: number) => equivalentWidth(line(447.15), T);
    expect(heI(20000)).toBeGreaterThan(10 * heI(9500));
    const heII = (T: number) => equivalentWidth(line(468.571), T);
    expect(heII(38000)).toBeGreaterThan(10 * heII(20000));
  });

  it('takes iron’s lines out when iron is taken out', () => {
    expect(equivalentWidth(line(527.036), 5772, { Fe: 0 })).toBe(0);
    expect(equivalentWidth(line(527.036), 5772, { Fe: 10 })).toBeGreaterThan(equivalentWidth(line(527.036), 5772));
  });

  it('follows the Planck curve between the lines', () => {
    const s = syntheticSpectrum({ kelvin: 8000, lines: [], from: 400, to: 700, step: 1 });
    for (let i = 0; i < s.nm.length; i++) expectNear(s.flux[i] / s.continuum[i], 1, 1e-12, `${s.nm[i]} nm`);
  });

  it('has a continuum opacity that rises from the Sun to the A stars', () => {
    expect(continuumOpacity(9500)).toBeGreaterThan(continuumOpacity(5772));
  });
});

describe('the Doppler shift (brief §4)', () => {
  it('shifts and measures back', () => {
    expectNear(shiftedWavelength(589, -110.5e3) - 589, -0.217, 0.001, 'Barnard’s star');
    fc.assert(
      fc.property(fc.double({ min: 300, max: 1000, noNaN: true }), fc.double({ min: -3e5, max: 3e5, noNaN: true }), (rest, v) => Math.abs(velocityFromShift(rest, shiftedWavelength(rest, v)) - v) < 1e-6),
    );
  });

  it('matches the relativistic shift to a part in a million at stars’ speeds', () => {
    const v = 300e3;
    expect(Math.abs(relativisticWavelength(500, v) - shiftedWavelength(500, v)) / 500).toBeLessThan(1e-6);
    expect((v / C) ** 2 / 2).toBeLessThan(1e-6);
  });
});
