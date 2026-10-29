import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { AU, L_SUN, R_SUN, SIGMA, SOLAR_IRRADIANCE, T_SUN } from '../src/core/constants';
import { absorptionHeight, whereToObserve } from '../src/core/light/atmosphere';
import { AIRY_FIRST_ZERO, airy, apertureToSplit, besselJ0, besselJ1, pointSpread, psfAt, rayleighLimit } from '../src/core/light/diffraction';
import { blackBodyBV, equivalentWidth, FILTER_V, photonRateV } from '../src/core/light/filters';
import {
  fractionBetween,
  fractionShortward,
  frequencyOf,
  luminosity,
  peakWavelength,
  photonEnergyEv,
  planck,
  planckFrequency,
  radiusFor,
  surfaceFlux,
  temperatureForPeak,
  VISIBLE,
} from '../src/core/light/planck';
import { fractionalYear, visualPosition } from '../src/core/binaries/visual';
import { Random } from '../src/core/random';
import { ARCSEC, DEG } from '../src/core/units';
import { VISUAL_PAIRS } from '../src/data/binaries';
import { FAMOUS_STARS } from '../src/data/stars';
import { BUCKETS, eyesWorth } from '../src/data/telescopes';
import { BANDS, bandOf } from '../src/data/spectrum';
import { expectNear } from './helpers';

const pair = (id: string) => VISUAL_PAIRS.find((p) => p.id === id)!;

describe('waves and photons (brief §2)', () => {
  it('turns wavelengths into frequencies and photon energies', () => {
    expectNear(frequencyOf(0.21106), 1.4204e9, 0.0001e9, '21 cm');
    expectNear(photonEnergyEv(550e-9), 2.254, 0.001, '550 nm');
    expectNear(photonEnergyEv(1e-9) / 1000, 1.2398, 0.0001, '1 nm in keV');
    expectNear(photonEnergyEv(0.21) * 1e6, 5.9, 0.05, '21 cm in µeV');
  });

  it('puts every wavelength in one band, in order', () => {
    for (let i = 1; i < BANDS.length; i++) expect(BANDS[i].from).toBe(BANDS[i - 1].to);
    expect(bandOf(550e-9).id).toBe('visible');
    expect(bandOf(1e-12).id).toBe('gamma');
    expect(bandOf(0.21).id).toBe('radio');
    expect(bandOf(9.3e-6).id).toBe('infrared');
  });
});

describe('Planck, Wien and Stefan–Boltzmann agree (brief §3)', () => {
  it('has σ from h, c and k', () => {
    expectNear(SIGMA, 5.670_374_419e-8, 1e-16, 'σ');
  });

  it('peaks where Wien says, per unit wavelength', () => {
    for (const T of [310, 3600, 5772, 9940, 40_000]) {
      const peak = peakWavelength(T);
      expect(planck(peak, T)).toBeGreaterThan(planck(peak * 1.001, T));
      expect(planck(peak, T)).toBeGreaterThan(planck(peak * 0.999, T));
      expect(temperatureForPeak(peak)).toBeCloseTo(T, 8);
    }
    expectNear(peakWavelength(5772) * 1e9, 502, 0.5, 'the Sun');
    expectNear(peakWavelength(310) * 1e6, 9.35, 0.01, 'you');
    expectNear(peakWavelength(3600) * 1e9, 805, 0.5, 'Betelgeuse');
  });

  it('integrates to σT⁴ (π times the radiance, over every wavelength)', () => {
    for (const T of [300, 5772, 30_000]) {
      // Simpson's rule in ln λ from 0.01 to 100 times the peak.
      const n = 4000;
      const a = Math.log(peakWavelength(T) / 100);
      const b = Math.log(peakWavelength(T) * 100);
      let sum = 0;
      for (let i = 0; i <= n; i++) {
        const l = Math.exp(a + ((b - a) * i) / n);
        sum += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * planck(l, T) * l;
      }
      const flux = (Math.PI * sum * (b - a)) / (3 * n);
      expectNear(flux / surfaceFlux(T), 1, 2e-5, `T = ${T}`);
    }
  });

  it('agrees per unit frequency: B_ν dν = B_λ dλ', () => {
    const l = 600e-9;
    const nu = frequencyOf(l);
    expectNear(planckFrequency(nu, 5772) * (nu / l), planck(l, 5772), planck(l, 5772) * 1e-12, 'B_ν vs B_λ');
  });

  it('splits the power between bands, matching a direct sum', () => {
    fc.assert(
      fc.property(fc.double({ min: 500, max: 50_000, noNaN: true }), fc.double({ min: 0.2, max: 5, noNaN: true }), (T, k) => {
        const l = peakWavelength(T) * k;
        // Direct: Simpson's rule in ln λ from far below to λ.
        const n = 2000;
        const a = Math.log(peakWavelength(T) / 50);
        const b = Math.log(l);
        let sum = 0;
        for (let i = 0; i <= n; i++) {
          const x = Math.exp(a + ((b - a) * i) / n);
          sum += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * planck(x, T) * x;
        }
        const direct = (Math.PI * sum * (b - a)) / (3 * n) / surfaceFlux(T);
        expectNear(fractionShortward(l, T), direct, 2e-6, `T ${T}, λ ${l}`);
      }),
      { numRuns: 60 },
    );
    // Wien's peak divides a black body's power about 1 : 3.
    expectNear(fractionShortward(peakWavelength(5772), 5772), 0.25, 0.001, 'shortward of the peak');
    // The Sun gives about 37% of its light between 400 and 700 nm, a 3,000 K filament under 10%.
    expectNear(fractionBetween(VISIBLE.from, VISIBLE.to, 5772), 0.37, 0.01, 'the Sun');
    expect(fractionBetween(VISIBLE.from, VISIBLE.to, 3000)).toBeLessThan(0.1);
    expect(fractionBetween(VISIBLE.from, VISIBLE.to, 310)).toBeLessThan(1e-15);
  });

  it('gives the Sun’s luminosity from its size and temperature, and stars’ sizes back', () => {
    expectNear(surfaceFlux(T_SUN) / 1e6, 63.0, 0.1, 'MW per m²');
    expectNear(luminosity(R_SUN, T_SUN) / L_SUN, 1, 0.001, 'L☉');
    expectNear(radiusFor(L_SUN, T_SUN) / R_SUN, 1, 0.001, 'R☉');
    // Measuring the Sun's power from sunlight at Earth: 3.83 × 10²⁶ W.
    expectNear((SOLAR_IRRADIANCE * 4 * Math.PI * AU * AU) / 1e26, 3.83, 0.01, 'from 1,361 W/m²');
  });

  it('checks the famous stars: L ≈ R²T⁴ within each star’s uncertainty', () => {
    for (const s of FAMOUS_STARS) {
      const computed = s.radius.value ** 2 * (s.temperature.value / T_SUN) ** 4;
      const [lo, hi] = s.luminosity.range ?? [s.luminosity.value, s.luminosity.value];
      // Measured separately: allow 25% beyond the stated range.
      expect(computed, s.name).toBeGreaterThan(lo / 1.25);
      expect(computed, s.name).toBeLessThan(hi * 1.25);
    }
    const betelgeuse = FAMOUS_STARS.find((s) => s.id === 'betelgeuse')!;
    expectNear(betelgeuse.radius.value ** 2 * (betelgeuse.temperature.value / T_SUN) ** 4, 88_000, 1000, 'Betelgeuse');
    const siriusB = FAMOUS_STARS.find((s) => s.id === 'sirius-b')!;
    expectNear(siriusB.radius.value ** 2 * (siriusB.temperature.value / T_SUN) ** 4, 0.023, 0.001, 'Sirius B');
    expect(new Set(FAMOUS_STARS.map((s) => s.id)).size).toBe(FAMOUS_STARS.length);
  });
});

describe('colours through filters', () => {
  it('has Bessell’s V filter about 89 nm wide', () => {
    expectNear(equivalentWidth(FILTER_V) * 1e9, 89.3, 0.5, 'V');
  });

  it('gives black bodies B − V near 0 at 10,000 K, redder as they cool', () => {
    // On the Vega system, a 10,000 K black body is a little redder than Vega (B − V = 0), whose continuum is bluer than a black body's.
    expectNear(blackBodyBV(10_000), 0.15, 0.03, '10,000 K');
    expectNear(blackBodyBV(T_SUN), 0.64, 0.03, 'the Sun’s temperature');
    let last = Infinity;
    for (let T = 2500; T <= 60_000; T *= 1.2) {
      const bv = blackBodyBV(T);
      expect(bv).toBeLessThan(last);
      last = bv;
    }
    // Very hot bodies approach the Rayleigh–Jeans limit, about −0.39; the hottest stars reach about −0.33.
    expectNear(blackBodyBV(1e7), -0.39, 0.02, 'very hot');
  });

  it('counts photons: about 1,000 per cm² per second per ångström from a magnitude-0 star at 550 nm', () => {
    const perCm2 = photonRateV(0) * 1e-4;
    expectNear(perCm2 / 1e5, 9.1, 0.3, 'per cm² through V');
    expectNear(perCm2 / (equivalentWidth(FILTER_V) * 1e10), 1000, 30, 'per Å');
    // A dark-adapted eye catches about 300,000 a second from Vega and 1,400 from a magnitude-6 star.
    const eye = BUCKETS[0];
    expectNear((photonRateV(0.03) * eye.area) / 1e5, 3.4, 0.3, 'Vega');
    expectNear(photonRateV(6) * eye.area, 1400, 100, 'magnitude 6');
    expectNear(eyesWorth(BUCKETS.find((b) => b.id === 'jwst')!) / 1000, 660, 5, 'JWST in eyes');
  });
});

describe('diffraction (brief §2, §14)', () => {
  it('computes Bessel functions against tables', () => {
    expectNear(besselJ0(1), 0.765_197_686_6, 1e-10, 'J0(1)');
    expectNear(besselJ1(1), 0.440_050_585_7, 1e-10, 'J1(1)');
    expectNear(besselJ0(10), -0.245_935_764_5, 1e-10, 'J0(10)');
    expectNear(besselJ1(20), 0.066_833_124_2, 1e-9, 'J1(20)');
    expectNear(besselJ0(30), -0.086_367_983_6, 1e-9, 'J0(30)');
    expectNear(besselJ1(AIRY_FIRST_ZERO), 0, 1e-12, 'first zero of J1');
    expectNear(besselJ1(7.015_586_669_8), 0, 1e-10, 'second zero');
    // The two methods meet smoothly at 12.
    expectNear(besselJ0(11.999_999), besselJ0(12.000_001), 1e-6, 'continuity');
  });

  it('draws the Airy pattern: bright centre, first dark ring at 1.22 λ/D, first bright ring 1.75% as bright', () => {
    expect(airy(0)).toBe(1);
    expectNear(airy(AIRY_FIRST_ZERO), 0, 1e-20, 'dark ring');
    expectNear(airy(5.1356), 0.0175, 0.0002, 'bright ring');
    expectNear(rayleighLimit(1, 1), 1.21967, 1e-5, '1.22');
  });

  it('gives the brief’s resolutions', () => {
    const arcsec = (x: number) => x / ARCSEC;
    expectNear(arcsec(rayleighLimit(550e-9, 0.007)), 19.8, 0.2, 'the eye');
    expectNear(arcsec(rayleighLimit(550e-9, 2.4)), 0.058, 0.001, 'Hubble');
    expectNear(arcsec(rayleighLimit(2e-6, 6.5)), 0.077, 0.001, 'JWST');
    expectNear(arcsec(rayleighLimit(2.2e-6, 39)), 0.014, 0.001, 'the ELT');
    expectNear(arcsec(rayleighLimit(1.3e-3, 10_700e3)) * 1e6, 31, 1, 'the EHT in µas');
    // ε Lyrae's 2.3″ pair needs about 6 cm.
    expectNear(apertureToSplit(550e-9, 2.3 * ARCSEC) * 100, 6.0, 0.1, 'cm');
  });

  it('spreads a star’s light: unit flux in every image, Airy without air, a wide disc with seeing', () => {
    const D = 0.2;
    const l = 550e-9;
    const total = (psf: ReturnType<typeof pointSpread>) => {
      let s = 0;
      for (let i = 0; i < psf.values.length; i++) s += psf.values[i] * 2 * Math.PI * i * psf.step * psf.step;
      return s;
    };
    const clear = pointSpread(l, D, { kind: 'none' }, 60 * (l / D), 3000);
    expectNear(total(clear), 1, 0.02, 'diffraction');
    expectNear(psfAt(clear, rayleighLimit(l, D)) / clear.values[0], 0, 1e-4, 'dark ring');
    const seeing = pointSpread(l, D, { kind: 'seeing', fwhm: 1 * ARCSEC }, 6 * ARCSEC, 600);
    // Kolmogorov seeing has wide wings: a few per cent of the light lies beyond 6″.
    expectNear(total(seeing), 0.97, 0.02, 'seeing');
    // The seeing's FWHM (1″ at 500 nm, 0.98″ at 550 nm) combines with the telescope's own (1.03 λ/D), and the peak is far below the diffraction peak.
    const half = seeing.values[0] / 2;
    let i = 0;
    while (seeing.values[i] > half) i++;
    expectNear((2 * i * seeing.step) / ARCSEC, Math.hypot(0.98, (1.03 * l) / D / ARCSEC), 0.05, 'FWHM');
    expect(seeing.values[0] / clear.values[0]).toBeLessThan(0.3);
    const ao = pointSpread(l, D, { kind: 'adaptive', fwhm: 1 * ARCSEC, strehl: 0.5 }, 6 * ARCSEC, 600);
    expectNear(ao.values[0] / clear.values[0], 0.5 + 0.5 * (seeing.values[0] / clear.values[0]), 0.01, 'adaptive optics');
  });
});

describe('seeing through a giant telescope', () => {
  it('blurs a 39 m telescope’s image to the seeing disc, not to its own tiny diffraction limit', () => {
    const psf = pointSpread(550e-9, 39, { kind: 'seeing', fwhm: 0.7 * ARCSEC }, 4 * ARCSEC, 800);
    const half = psf.values[0] / 2;
    let i = 0;
    while (psf.values[i] > half) i++;
    // 0.7″ at 500 nm is 0.687″ at 550 nm.
    expectNear((2 * i * psf.step) / ARCSEC, 0.687, 0.03, 'FWHM');
  });
});

describe('visual binaries (ORB6)', () => {
  it('puts Sirius B about 11″ from Sirius A in 2025, widening towards 2025 and closing after', () => {
    const now = visualPosition(pair('sirius').orbit, 2025.5);
    expectNear(now.separation / ARCSEC, 11.2, 0.4, 'Sirius 2025');
    // Periastron in 1994.6: the stars are closest, about a(1 − e) projected (3.1″ in 1993–94).
    expect(visualPosition(pair('sirius').orbit, 1994).separation / ARCSEC).toBeLessThan(4);
    // A whole period later the stars are back where they were.
    const later = visualPosition(pair('sirius').orbit, 2025.5 + pair('sirius').orbit.period);
    expectNear(later.separation, now.separation, 1e-12, 'periodic');
  });

  it('gives today’s separations for the brief’s doubles', () => {
    const sep = (id: string, year = 2026.8) => visualPosition(pair(id).orbit, year).separation / ARCSEC;
    expectNear(sep('epsilon-lyrae-1'), 2.0, 0.1, 'ε¹ Lyrae');
    expectNear(sep('epsilon-lyrae-2'), 2.4, 0.15, 'ε² Lyrae');
    expectNear(sep('castor'), 5.5, 0.6, 'Castor');
    // α Centauri was 4″ apart in 2016 and widens to about 10″ by 2026.
    expect(sep('alpha-centauri', 2016)).toBeLessThan(5);
    expect(sep('alpha-centauri')).toBeGreaterThan(sep('alpha-centauri', 2020));
  });

  it('matches the catalogue’s own ephemerides for 2025–2029', () => {
    // ORB6's ephemeris file (fetched 29 October 2026): position angle (°) and separation (″) on 1 January of each year.
    const EPHEMERIS: Record<string, readonly (readonly [number, number])[]> = {
      sirius: [[59.0, 11.256], [57.1, 11.163], [55.2, 11.032], [53.3, 10.861], [51.2, 10.648]],
      castor: [[49.8, 5.66], [49.3, 5.717], [48.9, 5.772], [48.5, 5.827], [48.1, 5.88]],
      'alpha-centauri': [[9.2, 8.737], [11.9, 9.294], [14.3, 9.765], [16.5, 10.121], [18.6, 10.329]],
      'epsilon-lyrae-1': [[342.2, 2.064], [341.8, 2.038], [341.4, 2.011], [340.9, 1.983], [340.5, 1.953]],
      'epsilon-lyrae-2': [[72.1, 2.415], [71.7, 2.418], [71.3, 2.421], [70.9, 2.424], [70.5, 2.427]],
    };
    // Each pair's right ascension and declination (degrees): the catalogue's angles are for the equinox of date, which
    // precession turns by 0.00557° sin α sec δ a year from J2000.
    const WHERE: Record<string, readonly [number, number]> = {
      sirius: [101.29, -16.72],
      castor: [113.65, 31.89],
      'alpha-centauri': [219.9, -60.83],
      'epsilon-lyrae-1': [281.08, 39.67],
      'epsilon-lyrae-2': [281.09, 39.61],
    };
    for (const [id, rows] of Object.entries(EPHEMERIS)) {
      const [ra, dec] = WHERE[id];
      rows.forEach(([theta, rho], k) => {
        const year = 2025 + k;
        const p = visualPosition(pair(id).orbit, year);
        expectNear(p.separation / ARCSEC, rho, 0.002, `${id} ρ ${year}`);
        const precession = (0.00557 * Math.sin(ra * DEG) * (year - 2000)) / Math.cos(dec * DEG);
        expectNear(p.positionAngle / DEG + precession, theta, 0.06, `${id} θ ${year}`);
      });
    }
  });

  it('turns dates into fractional years', () => {
    expectNear(fractionalYear(Date.UTC(2000, 0, 1, 12)), 2000, 1e-12, 'J2000');
    expectNear(fractionalYear(Date.UTC(2026, 9, 29)), 2026.824, 0.001, 'today');
  });
});

describe('how far down light gets (a sketch)', () => {
  it('lets visible light and radio reach the ground, and stops the rest high up', () => {
    expect(absorptionHeight(550e-9)).toBe(0);
    expect(absorptionHeight(0.21)).toBe(0);
    expect(absorptionHeight(2.2e-6)).toBe(0); // the K window
    expect(absorptionHeight(10e-6)).toBe(0); // the N window
    expect(absorptionHeight(1e-9)).toBeGreaterThan(40);
    expect(absorptionHeight(1e-12)).toBeGreaterThan(20);
    expect(absorptionHeight(250e-9)).toBeGreaterThan(25); // ozone
    expect(absorptionHeight(100)).toBeGreaterThan(100); // the ionosphere
    expect(whereToObserve(550e-9).id).toBe('ground');
    expect(whereToObserve(1e-9).id).toBe('rocket'); // as X-ray astronomy began, in 1962
    expect(whereToObserve(30e-9).id).toBe('satellite');
    expect(whereToObserve(100e-6).id).toBe('aircraft');
    expect(whereToObserve(850e-6).id).toBe('mountain');
  });
});

describe('seeded Poisson counts', () => {
  it('has the right mean and spread', () => {
    for (const mean of [0.3, 4, 25, 400]) {
      const r = new Random(7);
      let s = 0;
      let s2 = 0;
      const n = 20_000;
      for (let i = 0; i < n; i++) {
        const k = r.poisson(mean);
        s += k;
        s2 += k * k;
      }
      const m = s / n;
      expectNear(m / mean, 1, 0.03, `mean ${mean}`);
      expectNear((s2 / n - m * m) / mean, 1, 0.06, `variance ${mean}`);
    }
  });
});
