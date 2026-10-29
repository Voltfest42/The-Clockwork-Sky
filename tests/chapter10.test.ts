import { describe, expect, it } from 'vitest';
import { rayleighLimit } from '../src/core/light/diffraction';
import { ARCSEC } from '../src/core/units';
import { checkEpsilonLyrae, smallestToSplit } from '../src/content/checks/chapter10Answers';
import { describeExposure, Exposure, GRID, PIXEL_SHARE, photonRate, TARGETS, total } from '../src/figures/photons';
import { colourName, describeWavelength, rulerCaption, sameSizeAs } from '../src/figures/spectrumRuler';
import { adaptiveStrehl, airFor, blurWidth, formatAperture, formatArcsec, isSplit, pairToday, PAIRS, profile, renderPair, type Optics } from '../src/figures/splitStars';
import { BUCKETS } from '../src/data/telescopes';
import { formatEnergy, formatFrequency, formatKelvin, formatWavelength, spectralColour } from '../src/viz/spectrum/format';
import { expectNear } from './helpers';

const NOW = Date.UTC(2026, 9, 29);

describe('the spectrum ruler (Figure 10.1)', () => {
  it('reads wavelengths, frequencies, energies and temperatures in sensible units', () => {
    expect(formatWavelength(550e-9)).toBe('550 nm');
    expect(formatWavelength(9.35e-6)).toBe('9.35 µm');
    expect(formatWavelength(0.211)).toBe('21.1 cm');
    expect(formatWavelength(1e-12)).toBe('1 pm');
    expect(formatWavelength(3000)).toBe('3 km');
    expect(formatFrequency(1.42e9)).toBe('1.42 GHz');
    expect(formatEnergy(1240)).toBe('1.24 keV');
    expect(formatEnergy(5.9e-6)).toBe('5.9 µeV');
    expect(formatKelvin(5772)).toBe('5,772 K');
    expect(formatKelvin(2.9e9)).toBe('2.9 billion K');
  });

  it('names colours and bands, and finds things of the same size', () => {
    expect(colourName(650e-9)).toBe('red');
    expect(colourName(470e-9)).toBe('blue');
    expect(colourName(800e-9)).toBeNull();
    expect(sameSizeAs(1e-10).name).toBe('an atom');
    expect(sameSizeAs(100).name).toBe('a football pitch');
    const green = describeWavelength(550e-9);
    expect(green.band.id).toBe('visible');
    expect(green.energy).toBe('2.25 eV');
    expect(green.glow).toBe('5,269 K');
    expect(rulerCaption(550e-9)).toBe('550 nm: visible light (green), at 545 THz. Each photon carries 2.25 eV, and a body at 5,269 K glows brightest here.');
    expect(rulerCaption(0.211)).toContain('radio');
  });

  it('draws the visible strip from violet through green to red', () => {
    const [r4, , b4] = spectralColour(420);
    const [r5, g5, b5] = spectralColour(530);
    const [r7, g7] = spectralColour(690);
    expect(b4).toBeGreaterThan(r4);
    expect(g5).toBeGreaterThan(Math.max(r5, b5));
    expect(r7).toBeGreaterThan(g7);
    // Beyond 700 nm it stays red, fading.
    const [r75, g75] = spectralColour(760);
    expect(r75).toBeGreaterThan(g75);
    expect(r75).toBeLessThan(r7);
  });
});

describe('counting photons (Figure 10.2)', () => {
  it('spreads the light over the grid, nearly all of it', () => {
    let s = 0;
    for (const v of PIXEL_SHARE) s += v;
    expectNear(s, 1, 1e-4, 'light on the grid');
    expect(PIXEL_SHARE.length).toBe(GRID * GRID);
  });

  it('collects photons at real rates: about 1,400 a second from a magnitude-6 star into the eye', () => {
    const eye = BUCKETS[0];
    const limit = TARGETS.find((t) => t.id === 'limit')!;
    expectNear(photonRate(limit.V, eye), 1360, 50, 'eye');
    // JWST collects 660,000 times as much.
    expectNear(photonRate(limit.V, BUCKETS.find((b) => b.id === 'jwst')!) / photonRate(limit.V, eye) / 1000, 660, 5, 'JWST');
  });

  it('counts Poisson photons, the same for the same seed, building up during the exposure', () => {
    const a = new Exposure(5000, 3);
    const b = new Exposure(5000, 3);
    expect(total(a.countsAt(1))).toBe(total(b.countsAt(1)));
    expectNear(total(a.countsAt(1)), 5000, 4 * Math.sqrt(5000), 'total');
    let last = 0;
    for (let f = 0; f <= 1.0001; f += 0.1) {
      const n = total(a.countsAt(f));
      expect(n).toBeGreaterThanOrEqual(last * 0.97);
      last = n;
    }
    expect(total(a.countsAt(0))).toBe(0);
    // Noise shrinks as 1/√N: across many seeds, the spread of the total is about √N.
    const totals = Array.from({ length: 200 }, (_, k) => total(new Exposure(400, k + 10).countsAt(1)));
    const mean = totals.reduce((x, y) => x + y) / totals.length;
    const sd = Math.sqrt(totals.reduce((x, y) => x + (y - mean) ** 2, 0) / totals.length);
    expectNear(sd / Math.sqrt(400), 1, 0.15, 'spread');
  });

  it('describes exposures', () => {
    expect(describeExposure(0.001, 0, 0.01, 0.1, 'a distant galaxy', 'your eye')).toBe(
      'In 0.1 s, your eye caught no photons from a distant galaxy: on average one arrives every 1 min 40 s.',
    );
    expect(describeExposure(140, 136, 1400, 0.1, 'a star', 'your eye')).toContain('a faint, grainy blob');
    expect(describeExposure(1e6, 1e6, 1e7, 0.1, 'Vega', 'Hubble')).toContain('a smooth, sharp star. The noise is about √N, 0.10% of the signal.');
  });
});

describe('split the stars (Figure 10.4)', () => {
  const optics = (aperture: number, air = 'none' as const, wavelength = 550e-9): Optics => ({ wavelength, aperture, air: airFor(air, wavelength) });
  const pair = (id: string) => pairToday(PAIRS.find((p) => p.id === id)!, NOW);

  it('splits equal pairs a little inside Rayleigh’s limit, and unequal ones a little outside', () => {
    const layout = { separation: 2 * ARCSEC, positionAngle: 0, ratio: 1 };
    const rayleigh = (1.22 * 550e-9) / layout.separation;
    expect(isSplit(optics(rayleigh), layout)).toBe(true);
    expect(isSplit(optics(rayleigh * 0.7), layout)).toBe(false);
    // ε¹ Lyrae's companion is 2.4 times fainter: it needs a few per cent more than Rayleigh's aperture.
    const smallest = smallestToSplit(NOW);
    const rayleighEps = (1.22 * 550e-9) / pair('epsilon-lyrae-1').separation;
    expect(smallest / rayleighEps).toBeGreaterThan(1);
    expect(smallest / rayleighEps).toBeLessThan(1.15);
  });

  it('can’t beat the air on the ground, without adaptive optics', () => {
    const layout = { separation: 0.4 * ARCSEC, positionAngle: 0, ratio: 1 };
    expect(isSplit(optics(8, 'none'), layout)).toBe(true);
    expect(isSplit({ wavelength: 550e-9, aperture: 8, air: airFor('good', 550e-9) }, layout)).toBe(false);
    // Adaptive optics works in infrared, barely at all in visible light.
    expectNear(adaptiveStrehl(2.2e-6), 0.6, 0.01, 'K band');
    expect(adaptiveStrehl(550e-9)).toBeLessThan(0.001);
    expect(isSplit({ wavelength: 2.2e-6, aperture: 8, air: airFor('adaptive', 2.2e-6) }, { ...layout, separation: 0.2 * ARCSEC })).toBe(true);
    expect(blurWidth({ wavelength: 550e-9, aperture: 8, air: airFor('good', 550e-9) }) / ARCSEC).toBeGreaterThan(0.6);
  });

  it('finds Sirius’s white dwarf in a decent telescope in space, though it is 10,000 times fainter', () => {
    const sirius = pair('sirius');
    expectNear(sirius.ratio, 1e-4, 2e-5, 'brightness ratio');
    expect(isSplit(optics(0.2), sirius)).toBe(true);
    expect(isSplit(optics(0.01), sirius)).toBe(false);
  });

  it('draws images that hold the stars’ light, however small the blur', () => {
    for (const aperture of [0.05, 2, 39]) {
      const o = optics(aperture);
      const layout = pair('epsilon-lyrae-2');
      const fov = Math.max(2.8 * layout.separation, 7 * blurWidth(o));
      const img = renderPair(o, layout, fov, 96);
      let s = 0;
      for (const v of img) s += v;
      // Both stars' light, less what falls outside the field.
      expectNear(s / (1 + layout.ratio), 1, 0.08, `D = ${aperture} m`);
    }
    const line = profile(optics(0.2), pair('castor'), 100);
    expect(line.length).toBe(101);
    expect(Math.max(...line.map(([, v]) => v))).toBeGreaterThan(0);
  });

  it('writes apertures and angles', () => {
    expect(formatAperture(0.007)).toBe('7 mm');
    expect(formatAperture(0.06)).toBe('6.0 cm');
    expect(formatAperture(0.2)).toBe('20 cm');
    expect(formatAperture(2.4)).toBe('2.4 m');
    expect(formatArcsec(rayleighLimit(550e-9, 2.4))).toBe('0.058″');
    expect(formatArcsec(2.04 * ARCSEC)).toBe('2.0″');
  });

  it('marks the interactive question: the smallest telescope that splits ε¹ Lyrae', () => {
    const smallest = smallestToSplit(NOW);
    expect(checkEpsilonLyrae(smallest * 1.1, NOW).correct).toBe(true);
    expect(checkEpsilonLyrae(smallest * 0.9, NOW).correct).toBe(false);
    expect(checkEpsilonLyrae(0.3, NOW).correct).toBe(false);
    // About 7 cm.
    expect(smallest).toBeGreaterThan(0.06);
    expect(smallest).toBeLessThan(0.08);
  });
});
