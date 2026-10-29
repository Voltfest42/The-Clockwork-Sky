import { describe, expect, it } from 'vitest';
import { checkEclipseStart, ECLIPSE_START } from '../src/content/checks/chapter14Answers';
import { semiAmplitudes } from '../src/core/binaries/orbit';
import { nelderMead } from '../src/core/math/minimise';
import debcat from '../src/data/debcat.json';
import { bestEclipseFit, bestVelocityFit, debcatSystem, ECLIPSE_FIT, ECLIPSE_PRESETS, eclipseMisfit, eclipseUncertainties, fromLog, VELOCITY_FIT, velocityMisfit, VISUAL_PRESETS, weighVisual } from '../src/figures/binaries';
import { DEBCAT_STARS, doubling, FAMOUS_WEIGHED, fitRange, logFit } from '../src/figures/massLuminosity';
import { bestPeak, NOISE_ONLY, periodogram, SIGNAL, WITH_PLANET } from '../src/figures/signal';
import { expectNear } from './helpers';

describe('DEBCat', () => {
  it('holds the 195 pairs of the 2017 version, with their citation', () => {
    expect(debcat.systems).toHaveLength(195);
    expect(debcat.source).toMatch(/Southworth \(2015\)/);
    expect(debcat.terms).toMatch(/citation/);
  });

  it('reads β Aurigae and CM Draconis as published', () => {
    const beta = debcatSystem('beta Aur');
    expectNear(fromLog(beta.logM[0]!, beta.eLogM[0]!).value, 2.376, 0.002, 'β Aur A mass');
    expectNear(fromLog(beta.logR[0]!, beta.eLogR[0]!).value, 2.762, 0.002, 'β Aur A radius');
    expectNear(fromLog(beta.logR[0]!, beta.eLogR[0]!).error, 0.017, 0.001, 'its uncertainty');
    expect(beta.period).toBe(3.96);
    const cm = debcatSystem('CM Dra');
    expectNear(10 ** cm.logM[0]!, 0.231, 0.001, 'CM Dra A mass');
  });

  it('gives luminosities from radius and temperature that agree with DEBCat’s own, where it lists them', () => {
    for (const s of debcat.systems) {
      for (const k of [0, 1]) {
        const [r, t, l] = [s.logR[k], s.logT[k], s.logL[k]];
        if (r === null || t === null || l === null) continue;
        const computed = 2 * r + 4 * (t - Math.log10(5772));
        expect(Math.abs(computed - l), `${s.name} ${k}`).toBeLessThan(0.1);
      }
    }
  });
});

describe('the binary workbench', () => {
  it('weighs Sirius and α Centauri from their orbits on the sky', () => {
    const sirius = weighVisual(VISUAL_PRESETS[0].orbit, VISUAL_PRESETS[0].parallax);
    expectNear(sirius.aArcsec, 7.50, 0.01, 'Sirius’s orbit, arcseconds (Bond et al. 2017: 7.4957″)');
    expectNear(sirius.aAu, 19.8, 0.05, 'Sirius’s orbit, AU');
    expectNear(sirius.total, 3.08, 0.01, 'Sirius A + B, M☉');
    expectNear(sirius.m1, 2.063, 0.005, 'Sirius A');
    const alpha = weighVisual(VISUAL_PRESETS[1].orbit, VISUAL_PRESETS[1].parallax);
    expectNear(alpha.aArcsec, 17.49, 0.03, 'α Centauri’s orbit, arcseconds (Akeson et al. 2021: 17.493″)');
    expectNear(alpha.total, 1.988, 0.002, 'α Centauri A + B, M☉');
  });

  it('swings β Aurigae’s stars by about 108 and 111 km/s, as measured', () => {
    const { k1, k2 } = semiAmplitudes(ECLIPSE_PRESETS[1].pair);
    expectNear(k1, 108, 2, 'K₁');
    expectNear(k2, 111, 2, 'K₂');
  });

  it('fits β Aurigae’s simulated velocities back to its swings, within the errors', () => {
    const fit = bestVelocityFit();
    const truth = semiAmplitudes(VELOCITY_FIT.pair);
    expectNear(fit.k1, truth.k1, 2.5, 'K₁');
    expectNear(fit.k2, truth.k2, 2.5, 'K₂');
    expect(velocityMisfit(fit.k1, fit.k2)).toBeLessThan(1.5);
    expect(velocityMisfit(80, 80)).toBeGreaterThan(20);
  });

  it('fits β Aurigae’s simulated eclipses back to the radii and tilt they were made from', () => {
    const truth = { r1: ECLIPSE_FIT.pair.r1, r2: ECLIPSE_FIT.pair.r2, i: ECLIPSE_FIT.pair.i };
    expectNear(eclipseMisfit(truth), 1, 0.15, 'χ² per point at the truth');
    const fit = bestEclipseFit({ r1: 2, r2: 2, i: 80 });
    const errors = eclipseUncertainties(fit);
    expect(eclipseMisfit(fit)).toBeLessThanOrEqual(eclipseMisfit(truth));
    for (const key of ['r1', 'r2', 'i'] as const) {
      expect(errors[key]).toBeGreaterThan(0);
      expect(Math.abs(fit[key] - truth[key]), key).toBeLessThan(3 * errors[key]);
    }
    expect(errors.r1).toBeLessThan(0.15);
    expect(errors.i).toBeLessThan(0.5);
  });

  it('finds a function’s minimum by the downhill simplex', () => {
    const { x } = nelderMead(([a, b]) => (a - 3) ** 2 + 10 * (b + 1) ** 2 + (a - 3) * (b + 1), [0, 0], [1, 1]);
    expectNear(x[0], 3, 1e-3, 'a');
    expectNear(x[1], -1, 1e-3, 'b');
    // Rosenbrock's banana-shaped valley.
    const banana = nelderMead(([a, b]) => (1 - a) ** 2 + 100 * (b - a * a) ** 2, [-1.2, 1], [0.5, 0.5], { maxEvaluations: 5000, tolerance: 1e-12 });
    expectNear(banana.x[0], 1, 1e-3, 'Rosenbrock a');
  });

  it('marks the interactive question right just past the tilt where eclipses begin', () => {
    expectNear(ECLIPSE_START, 79.03, 0.02, 'tilt');
    expect(checkEclipseStart(78.5).correct).toBe(false);
    expect(checkEclipseStart(79.2).correct).toBe(true);
    expect(checkEclipseStart(84).correct).toBe(false);
  });
});

describe('the mass–luminosity relation', () => {
  it('fits a power law exactly when there is one', () => {
    const fit = logFit([1, 2, 5, 10].map((x) => ({ x, y: 3 * x ** 3.5 })));
    expectNear(fit.slope, 3.5, 1e-12, 'slope');
    expectNear(10 ** fit.intercept, 3, 1e-12, 'scale');
  });

  it('finds DEBCat’s main-sequence stars rising roughly as M^3.5–4, steepest near the Sun, flatter at both ends', () => {
    const all = fitRange('luminosity', 0, 100);
    expect(all.count).toBeGreaterThan(280);
    expectNear(all.slope, 3.9, 0.3, 'all');
    const middle = fitRange('luminosity', 0.7, 2).slope;
    expect(middle).toBeGreaterThan(fitRange('luminosity', 0, 0.7).slope);
    expect(middle).toBeGreaterThan(fitRange('luminosity', 10, 100).slope);
    expectNear(fitRange('luminosity', 2, 10).slope, 3.5, 0.5, '2–10 Suns');
    expectNear(fitRange('radius', 0, 100).slope, 0.75, 0.15, 'radius');
    expect(doubling(3.5)).toBe('11');
  });

  it('puts the Sun and its weighed neighbours near the line', () => {
    const fit = fitRange('luminosity', 0, 100);
    for (const s of FAMOUS_WEIGHED.filter((x) => x.mass > 0.5)) {
      expect(Math.abs(Math.log10(s.luminosity) - fit.intercept - fit.slope * Math.log10(s.mass)), s.label).toBeLessThan(0.5);
    }
    expect(DEBCAT_STARS.filter((s) => !s.mainSequence).every((s) => s.luminosity > 10 ** fit.intercept * s.mass ** fit.slope * 0.5)).toBe(true);
  });
});

describe('find the signal (Toolkit T6)', () => {
  it('finds the planted transit at its period, far above the noise', () => {
    const peak = bestPeak(periodogram(WITH_PLANET));
    expectNear(peak.period, SIGNAL.period, 0.02, 'period');
    expect(peak.significance).toBeGreaterThan(8);
  });

  it('finds false alarms in noise alone, but none reaching the planet', () => {
    const noise = bestPeak(periodogram(NOISE_ONLY));
    expect(noise.significance).toBeGreaterThan(3.5);
    expect(noise.significance).toBeLessThan(bestPeak(periodogram(WITH_PLANET)).significance - 3);
  });
});
