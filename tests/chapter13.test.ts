import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkWhiteDwarf } from '../src/content/checks/chapter13Answers';
import { bcGOf, bpRpOf, fromGaia, fromJohnson, fromPhysics, radiusFrom, regionOf, spectralTypeOf, temperatureFromBpRp, temperatureFromBVTable } from '../src/core/stars/hr';
import dwarfs from '../src/data/dwarfSequence.json';
import gaia from '../src/data/gaia/hr.json';
import { FAMOUS_STARS } from '../src/data/stars';
import { describePlace, famousMarkers, inWords, placeStar, PLOTTABLE, regionShares, SCALE_STARS, scalePositions } from '../src/figures/hrStars';
import { expectNear } from './helpers';

describe('the HR diagram’s two sets of axes (Mamajek’s table)', () => {
  it('reads Mamajek’s table, version 2022.04.16', () => {
    expect(dwarfs.source).toMatch(/2022\.04\.16/);
    expect(dwarfs.spt[0]).toBe('O3V');
    expect(dwarfs.spt.indexOf('G2V')).toBeGreaterThan(0);
    expect(dwarfs.teff[dwarfs.spt.indexOf('G2V')]).toBe(5770);
  });

  it('puts the Sun where Gaia would', () => {
    const sun = fromPhysics(5772, 1);
    expectNear(sun.bpRp, 0.82, 0.02, 'G_BP − G_RP');
    expectNear(sun.mG, 4.67, 0.05, 'M_G');
    expectNear(bcGOf(5772), 0.07, 0.05, 'BC_G (Andrae et al. 2018: +0.06)');
    expectNear(fromJohnson(0.65, 4.83).luminosity, 1, 0.05, 'from B − V and M_V');
    expect(spectralTypeOf(5772)).toBe('G2V');
  });

  // Hotter than about 26,000 K the colour is held at its limit, so it no longer gives the temperature.
  it('turns colours back into temperatures (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 3000, max: 25000, noNaN: true }), (T) => Math.abs(temperatureFromBpRp(bpRpOf(T)) / T - 1) < 0.01),
    );
    expectNear(temperatureFromBVTable(0.65), 5770, 60, 'B − V of the Sun');
  });

  it('goes round from Gaia’s axes to the physicists’ and back (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 4, noNaN: true }), fc.double({ min: -3, max: 15, noNaN: true }), (bpRp, mG) => {
        const p = fromGaia(bpRp, mG);
        const q = fromPhysics(p.kelvin, p.luminosity);
        return Math.abs(q.bpRp - bpRp) < 0.01 && Math.abs(q.mG - mG) < 0.01;
      }),
    );
  });

  it('works sizes out from luminosity and temperature', () => {
    expectNear(radiusFrom(100, 5772 / 2), 40, 1e-9, 'half as hot, 100 times as luminous');
    expectNear(radiusFrom(0.01, 4 * 5772), 1 / 160, 1e-12, 'a white dwarf');
  });

  it('puts the famous stars in their regions', () => {
    const region = (id: string) => {
      const s = FAMOUS_STARS.find((x) => x.id === id)!;
      return regionOf(s.temperature.value, s.luminosity.value);
    };
    expect(region('sun')).toBe('main-sequence');
    expect(region('vega')).toBe('main-sequence');
    expect(region('proxima')).toBe('red-dwarfs');
    expect(region('sirius-b')).toBe('white-dwarfs');
    expect(region('procyon-b')).toBe('white-dwarfs');
    expect(region('arcturus')).toBe('giants');
    expect(region('aldebaran')).toBe('giants');
    expect(region('betelgeuse')).toBe('supergiants');
    expect(region('rigel')).toBe('supergiants');
    expect(region('deneb')).toBe('supergiants');
  });
});

describe('the HR diagram of real stars (Figure 13.2)', () => {
  it('has Gaia’s stars within 100 parsecs, CC BY-NC 3.0 IGO', () => {
    expect(gaia.licence).toMatch(/^CC BY-NC 3\.0 IGO/);
    expect(gaia.count).toBeGreaterThan(200_000);
    expect(gaia.grid.counts.length).toBe(gaia.grid.nx * gaia.grid.ny);
    expect(gaia.grid.counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0.99 * gaia.count);
    expect(gaia.near.length % 3).toBe(0);
    expect(gaia.sample.length).toBe(6000);
    for (let i = 2; i < gaia.near.length; i += 3) expect(gaia.near[i]).toBeGreaterThanOrEqual(500);
  });

  it('finds about nine stars in ten on the main sequence, and the Sun brighter than nine in ten', () => {
    const { x0, dx, nx, y0, dy, ny, counts } = gaia.grid;
    let main = 0;
    let dimmer = 0;
    let all = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const n = counts[j * nx + i];
        if (!n) continue;
        const p = fromGaia(x0 + (i + 0.5) * dx, y0 + (j + 0.5) * dy);
        const r = regionOf(p.kelvin, p.luminosity);
        if (r === 'main-sequence' || r === 'red-dwarfs') main += n;
        if (p.luminosity < 1) dimmer += n;
        all += n;
      }
    }
    expectNear(main / all, 0.9, 0.04, 'main sequence');
    expect(dimmer / all).toBeGreaterThan(0.9);
  });

  it('counts shares in words', () => {
    expect(inWords(0.9)).toBe('9 in 10');
    expect(inWords(0.077)).toBe('1 in 13');
    expect(inWords(0.74)).toBe('3 in 4');
    expect(inWords(0.001)).toBe('almost none');
    const shares = regionShares([fromPhysics(5772, 1), fromPhysics(3000, 0.002)]);
    expect(shares['main-sequence']).toBe(0.5);
    expect(shares['red-dwarfs']).toBe(0.5);
  });

  it('describes what lives where', () => {
    expect(describePlace(fromPhysics(5772, 1))).toMatch(/^The main sequence\. .* Here: 5,772 K, 1 times the Sun’s luminosity, 1 times its width\.$/);
    expect(describePlace(fromPhysics(10000, 0.003))).toMatch(/^White dwarfs\./);
    expect(famousMarkers('sun').filter((m) => m.highlight).map((m) => m.id)).toEqual(['sun']);
  });
});

describe('plot a star (Figure 13.1)', () => {
  it('places Vega from its parallax, magnitude and colour', () => {
    const vega = placeStar(PLOTTABLE.find((s) => s.id === 'vega')!.plotted);
    expectNear(vega.parsecs, 7.68, 0.01, 'distance');
    expectNear(vega.mV, 0.6, 0.02, 'M_V');
    expectNear(vega.luminosity, 50, 15, 'luminosity');
    expect(regionOf(vega.kelvin, vega.luminosity)).toBe('main-sequence');
  });

  it('places Betelgeuse among the supergiants and Sirius B among the white dwarfs', () => {
    const b = placeStar(PLOTTABLE.find((s) => s.id === 'betelgeuse')!.plotted);
    expect(regionOf(b.kelvin, b.luminosity)).toBe('supergiants');
    const w = placeStar(PLOTTABLE.find((s) => s.id === 'sirius-b')!.plotted);
    expect(regionOf(w.kelvin, w.luminosity)).toBe('white-dwarfs');
  });
});

describe('stars to scale (Figure 13.3)', () => {
  it('runs from Sirius B to the largest known, smallest first', () => {
    for (let i = 1; i < SCALE_STARS.length; i++) expect(SCALE_STARS[i].radius).toBeGreaterThan(SCALE_STARS[i - 1].radius);
    expect(SCALE_STARS[0].id).toBe('sirius-b');
    expect(SCALE_STARS[SCALE_STARS.length - 1].radius).toBe(1500);
    const pos = scalePositions();
    for (let i = 1; i < pos.length; i++) expect(pos[i] - SCALE_STARS[i].radius).toBeGreaterThan(pos[i - 1] + SCALE_STARS[i - 1].radius);
  });
});

describe('the interactive question: pick a white dwarf', () => {
  it('accepts only the white dwarf', () => {
    expect(checkWhiteDwarf('D').correct).toBe(true);
    for (const l of ['A', 'B', 'C', 'E', 'F', '']) expect(checkWhiteDwarf(l).correct).toBe(false);
  });
});
