import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { semiAmplitudes } from '../src/core/binaries/orbit';
import { DEFAULT_LIMB } from '../src/core/binaries/eclipse';
import { M_JUPITER, M_EARTH, R_JUPITER, R_EARTH } from '../src/core/constants';
import { DETECTION_SIGMA, fitWobble, measureDip } from '../src/core/exoplanets/detect';
import { distanceForFlux, fluxAt, habitableZone, zoneFlux, zoneOf } from '../src/core/exoplanets/habitable';
import {
  centralDepth,
  fullDuration,
  impactParameter,
  isGrazing,
  lightWithPlanet,
  orbitInStarRadii,
  radiusRatio,
  smallPlanetDepth,
  skySeparation,
  totalDuration,
  transitLight,
  transitProbability,
  uniformDepth,
} from '../src/core/exoplanets/transit';
import { opacity, scaleHeight, signalPerScaleHeight, surfaceGravity, transitDepthAt, type Atmosphere } from '../src/core/exoplanets/transmission';
import { EARTH_IN_SUNS, minimumMassFromWobble, planetOrbit, starVelocity, wobbleAmplitude } from '../src/core/exoplanets/wobble';
import { boxModel, measure, sampleTimes } from '../src/core/signal/series';
import { expectNear } from './helpers';

const JUPITER_EARTHS = M_JUPITER / M_EARTH;

describe('wobbles', () => {
  it('moves the Sun by 12.5 m/s for Jupiter and 9 cm/s for Earth', () => {
    expectNear(JUPITER_EARTHS, 317.8, 0.1, 'Jupiter in Earths');
    expectNear(wobbleAmplitude(JUPITER_EARTHS, 1, 4332.59), 12.5, 0.1, 'Jupiter');
    expectNear(wobbleAmplitude(1, 1, 365.256), 0.0895, 0.001, 'Earth');
  });

  it('gives 51 Pegasi b’s swing of about 56 m/s from its least mass', () => {
    // Mayor & Queloz (1995): K = 59 ± 3 m/s, m sin i = 0.47 Jupiter masses, P = 4.23 days, M* = 1 M☉.
    expectNear(wobbleAmplitude(0.47 * JUPITER_EARTHS, 1, 4.2293), 59, 4, '51 Peg b');
  });

  it('agrees with the binaries core’s semi-amplitude, and gives the mass back, as properties', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 5000, noNaN: true }),
        fc.double({ min: 0.08, max: 2, noNaN: true }),
        fc.double({ min: 0.3, max: 5000, noNaN: true }),
        fc.double({ min: 10, max: 90, noNaN: true }),
        fc.double({ min: 0, max: 0.8, noNaN: true }),
        (m, star, p, i, e) => {
          const k = wobbleAmplitude(m, star, p, i, e);
          const { k1 } = semiAmplitudes(planetOrbit(m, star, p, i, e));
          expect(Math.abs(k - k1 * 1000) / k).toBeLessThan(1e-9);
          // m sin i comes back, to within the planet's share of the pair's mass.
          const back = minimumMassFromWobble(k, star, p, e) / (m * Math.sin((i * Math.PI) / 180));
          expect(Math.abs(back - 1)).toBeLessThanOrEqual((m * EARTH_IN_SUNS) / star + 1e-9);
        },
      ),
    );
  });

  it('puts a circular orbit’s swing through zero at the transit, and peaks a quarter of an orbit later', () => {
    const orbit = planetOrbit(318, 1, 10);
    expect(Math.abs(starVelocity(orbit, 0))).toBeLessThan(1e-9);
    expectNear(Math.abs(starVelocity(orbit, 2.5)), wobbleAmplitude(318, 1, 10), 1e-6, 'peak');
  });
});

describe('transits', () => {
  it('dims the Sun by 1% for Jupiter and 84 parts per million for Earth', () => {
    expectNear(uniformDepth(radiusRatio(R_JUPITER / R_EARTH, 1)), 0.0106, 0.0002, 'Jupiter');
    expectNear(uniformDepth(radiusRatio(1, 1)) * 1e6, 84, 0.5, 'Earth, ppm');
  });

  it('lines up for 0.47% of Earth-like orbits, and about a tenth of hot Jupiters’', () => {
    expectNear(transitProbability(orbitInStarRadii(1, 1)) * 100, 0.465, 0.005, 'Earth, %');
    expectNear(transitProbability(orbitInStarRadii(0.05, 1)), 0.093, 0.002, 'at 0.05 AU');
  });

  it('lasts 13 hours for Earth crossing the middle of the Sun', () => {
    const g = { k: radiusRatio(1, 1), aOverR: orbitInStarRadii(1, 1), i: 90, period: 365.256 };
    expectNear(totalDuration(g) * 24, 13.0, 0.1, 'hours');
    expect(fullDuration(g)).toBeLessThan(totalDuration(g));
  });

  it('matches the exact central depth of a limb-darkened star', () => {
    for (const k of [0.0092, 0.05, 0.1, 0.2]) {
      const ring = 1 - lightWithPlanet(0, k, DEFAULT_LIMB, 4000);
      expect(Math.abs(ring / centralDepth(k) - 1)).toBeLessThan(2e-3);
    }
    // Deeper than k² in the middle, because the centre is brighter than the mean.
    expect(centralDepth(0.1)).toBeGreaterThan(uniformDepth(0.1));
    // With no limb darkening it is exactly k².
    expectNear(centralDepth(0.1, [0, 0]), 0.01, 1e-12, 'uniform');
  });

  it('matches Mandel & Agol’s small-planet limit across the disc', () => {
    for (const z of [0, 0.3, 0.6, 0.85]) expect(Math.abs((1 - lightWithPlanet(z, 0.01, DEFAULT_LIMB, 4000)) / smallPlanetDepth(0.01, z) - 1)).toBeLessThan(0.02);
  });

  it('makes grazing transits shallow and V-shaped, with no flat bottom', () => {
    const g = { k: 0.1, aOverR: 10, i: (Math.acos(1 / 10) * 180) / Math.PI, period: 3 };
    expectNear(impactParameter(g.aOverR, g.i), 1, 1e-9, 'b');
    expect(isGrazing(g)).toBe(true);
    expect(fullDuration(g)).toBe(0);
    expect(totalDuration(g)).toBeGreaterThan(0);
    expect(1 - transitLight(g, 0)).toBeLessThan(0.5 * uniformDepth(0.1));
  });

  it('never brightens the star, and is deepest at mid-transit, as properties', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.005, max: 0.3, noNaN: true }), fc.double({ min: 0, max: 1.3, noNaN: true }), (k, z) => {
        const light = lightWithPlanet(z, k, DEFAULT_LIMB, 200);
        expect(light).toBeLessThanOrEqual(1);
        // To the rings' resolution: two thousandths of the depth (the smallest planets reach one thousandth; round-off can tip one at the very centre past it).
        expect(light - lightWithPlanet(0, k, DEFAULT_LIMB, 200)).toBeGreaterThan(-2e-3 * k * k - 1e-12);
      }),
    );
  });

  it('hides the planet behind the star half an orbit later', () => {
    expect(skySeparation(0.5, 10, 90).inFront).toBe(false);
    expect(transitLight({ k: 0.1, aOverR: 10, i: 90, period: 3 }, 1.5)).toBe(1);
  });
});

describe('habitable zones', () => {
  it('runs from 0.95 to 1.68 AU round the Sun (Kopparapu et al. 2014)', () => {
    const z = habitableZone(1, 5780);
    expectNear(z.inner, 0.95, 0.005, 'runaway greenhouse');
    expectNear(z.outer, 1.676, 0.005, 'maximum greenhouse');
    expectNear(z.optimisticInner, 0.75, 0.005, 'recent Venus');
    expectNear(z.optimisticOuter, 1.768, 0.005, 'early Mars');
    expect(zoneOf(fluxAt(1, 1), 5780)).toBe('conservative');
    expect(zoneOf(fluxAt(1, 0.723), 5780)).toBe('too-hot');
    expect(zoneOf(fluxAt(1, 1.524), 5780)).toBe('conservative');
  });

  it('sits close in round red dwarfs, where cooler starlight warms planets more', () => {
    // TRAPPIST-1 (L = 0.00055 L☉): its e, f and g are in or near the zone, at 0.03–0.05 AU.
    const z = habitableZone(10 ** -3.26, 2570);
    expect(z.inner).toBeGreaterThan(0.02);
    expect(z.outer).toBeLessThan(0.06);
    expect(zoneFlux('runawayGreenhouse', 3000)).toBeLessThan(zoneFlux('runawayGreenhouse', 6000));
  });

  it('grows as the square root of the star’s power, as a property', () => {
    fc.assert(
      fc.property(fc.double({ min: 1e-4, max: 1e4, noNaN: true }), fc.double({ min: 2600, max: 7200, noNaN: true }), (L, T) => {
        const a = habitableZone(L, T);
        const b = habitableZone(4 * L, T);
        expect(Math.abs(b.inner / a.inner - 2)).toBeLessThan(1e-9);
        expect(a.optimisticInner).toBeLessThan(a.inner);
        expect(a.inner).toBeLessThan(a.outer);
        expect(a.outer).toBeLessThan(a.optimisticOuter);
        expectNear(fluxAt(L, distanceForFlux(L, 0.5)), 0.5, 1e-12, 'flux round trip');
      }),
    );
  });
});

describe('detecting planets in noise', () => {
  const times = sampleTimes(0, 200, 1);

  it('recovers a planted swing to within its uncertainty, which falls as 1/√N', () => {
    const series = measure(times, (t) => 5 * Math.sin((2 * Math.PI * t) / 7.3 + 1), 2, 7);
    const fit = fitWobble(series, 7.3, 2);
    expect(Math.abs(fit.k - 5)).toBeLessThan(3 * fit.error);
    expectNear(fit.error, 2 * Math.sqrt(2 / times.length), 0.03, 'σ√(2/N)');
    expect(fit.significance).toBeGreaterThan(DETECTION_SIGMA);
  });

  it('finds no swing in pure noise most of the time', () => {
    let high = 0;
    for (let seed = 1; seed <= 50; seed++) if (fitWobble(measure(times, () => 0, 1, seed), 7.3, 1).significance > 4) high++;
    expect(high).toBeLessThanOrEqual(1);
  });

  it('measures a planted dip’s depth', () => {
    const t = sampleTimes(0, 60, 1 / 48);
    const series = measure(t, boxModel(4, 1, 0.2, 0.004), 0.002, 9);
    const dip = measureDip(series, 4, 1, 0.2, 0.002);
    expect(Math.abs(dip.depth - 0.004)).toBeLessThan(3 * dip.error);
    expect(dip.inside).toBeGreaterThan(100);
  });
});

describe('toy transmission spectra', () => {
  const hotJupiter: Atmosphere = { massEarths: 89, radiusEarths: 14.3, kelvin: 1100, mu: 2.3, starRadiusSuns: 0.93, gases: ['H2O', 'CO2'], cloudTop: null };

  it('gives a puffy hot Jupiter a scale height of about 900 km and some 400 ppm per scale height', () => {
    expectNear(surfaceGravity(1, 1), 9.82, 0.02, 'Earth’s gravity');
    expectNear(scaleHeight(1100, 2.3, surfaceGravity(89, 14.3)) / 1000, 930, 30, 'H, km');
    expectNear(signalPerScaleHeight(hotJupiter) * 1e6, 405, 10, 'ppm');
    expectNear(scaleHeight(288, 29, 9.81) / 1000, 8.4, 0.1, 'Earth’s air, km');
  });

  it('makes the planet look bigger in its gases’ bands, and clouds flatten them', () => {
    expect(transitDepthAt(hotJupiter, 4.3)).toBeGreaterThan(transitDepthAt(hotJupiter, 3.9));
    expect(transitDepthAt(hotJupiter, 1.4)).toBeGreaterThan(transitDepthAt(hotJupiter, 1.25));
    const cloudy = { ...hotJupiter, cloudTop: 4 };
    expect(transitDepthAt(cloudy, 4.3) - transitDepthAt(cloudy, 3.9)).toBeLessThan(transitDepthAt(hotJupiter, 4.3) - transitDepthAt(hotJupiter, 3.9));
    expect(opacity(3.3, ['CH4'])).toBeGreaterThan(opacity(3.3, []));
  });

  it('gives Earth seen across the Sun a signal under a part per million per scale height', () => {
    const earth: Atmosphere = { massEarths: 1, radiusEarths: 1, kelvin: 288, mu: 29, starRadiusSuns: 1, gases: ['H2O', 'CO2'], cloudTop: null };
    expect(signalPerScaleHeight(earth) * 1e6).toBeLessThan(1);
  });
});
