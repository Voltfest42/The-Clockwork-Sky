import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { C, G, M_SUN } from '../src/core/constants';
import {
  chirp,
  chirpMass,
  chirpMassFromSweep,
  cyclesBetween,
  finalSpin,
  frequencyBefore,
  frequencyRate,
  iscoFrequency,
  joinFrequency,
  radiatedFraction,
  ringdown,
  sweepRate,
  symmetricMassRatio,
  timeBefore,
  xOfFrequency,
  xRate,
} from '../src/core/gr/chirp';
import { enhancement, mergerTime, periastronAdvance, periastronShift, periodDecay, petersConstant, petersRates, petersTrack, separationFor, trackAt } from '../src/core/gr/peters';
import { ligoNoise, lisaNoise, noiseStrain, ptaBackground, ptaReach } from '../src/core/gr/sensitivity';
import { binFrequency, fft, ifft } from '../src/core/math/fft';
import { hilbert, match, octaveUp, spectrogram, welchPsd, whiten } from '../src/core/signal/strain';
import { SECONDS_PER_JULIAN_YEAR } from '../src/core/units';
import { checkChirp, chirpFit, CHIRP_BEST, CHIRP_RANGE, LIGO_CHIRP } from '../src/content/checks/chapter29Answers';
import { MERGER_CENSUS, MERGERS, NEXT_RUN, RUNS, eventDate } from '../src/data/mergers';
import { HEAVIEST_MERGER, LOUDEST_MERGER } from '../src/data/records';
import { GW150914, asd } from '../src/figures/gw150914';
import { CHIRP_PRESETS, chirpView, DETECTORS, describeFrequency, eventsUpTo, heavierMassHistogram, kindOf, PAIRS, pairFacts, SOURCES } from '../src/figures/ripples';
import { armResponse, ringPositions } from '../src/figures/stretch';
import { CHAPTERS } from '../src/site/course';
import { GLOSSARY } from '../src/site/glossary';

const YEAR = SECONDS_PER_JULIAN_YEAR;
const HT = PAIRS.find((p) => p.id === 'hulse-taylor')!;
const DP = PAIRS.find((p) => p.id === 'double-pulsar')!;

describe('Peters’ equations', () => {
  it('gives the Hulse–Taylor pulsar’s decay, periastron advance and merger time (Weisberg & Huang 2016; the brief)', () => {
    const f = pairFacts(HT);
    // Relativity's prediction: −2.40263 × 10⁻¹² with their masses
    expect(f.pbdot).toBeCloseTo(-2.402e-12, 14);
    expect(f.advance).toBeCloseTo(4.226, 2);
    expect(f.mergeIn / YEAR / 1e6).toBeCloseTo(301, 0);
    // The shortcut (1 − e²)^(7/2) is within a few per cent
    expect(mergerTime(HT.m1 * M_SUN, HT.m2 * M_SUN, f.a, HT.e) / f.mergeIn).toBeGreaterThan(1);
    expect(mergerTime(HT.m1 * M_SUN, HT.m2 * M_SUN, f.a, HT.e) / f.mergeIn).toBeLessThan(1.03);
  });

  it('gives the double pulsar’s decay and advance (Kramer et al. 2021: GR predicts −1.24787 × 10⁻¹² and 16.8995° a year)', () => {
    const f = pairFacts(DP);
    expect(f.pbdot / -1.24787e-12).toBeCloseTo(1, 3);
    expect(f.advance).toBeCloseTo(16.8995, 1);
    expect(f.mergeIn / YEAR / 1e6).toBeCloseTo(86, 0);
  });

  it('merges a circular orbit in exactly the analytic time, and its separation falls as (1 − t/T)^(1/4)', () => {
    const m = 1.4 * M_SUN;
    const a0 = 1e9;
    const track = petersTrack(m, m, a0, 0);
    expect(track.mergeAt / mergerTime(m, m, a0, 0)).toBeCloseTo(1, 6);
    const T = track.mergeAt;
    const mid = trackAt(track, T / 2);
    expect(mid.a / a0).toBeCloseTo(0.5 ** 0.25, 3);
  });

  it('keeps Peters’ constant along an eccentric track, as it must (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.05, max: 0.9, noNaN: true }), fc.double({ min: 0.5, max: 30, noNaN: true }), (e0, mass) => {
        const m = mass * M_SUN;
        const track = petersTrack(m, m * 0.7, 1e10, e0, 300);
        const c0 = petersConstant(track.points[0].a, track.points[0].e);
        for (const p of track.points.filter((q) => q.e > 1e-3)) expect(petersConstant(p.a, p.e) / c0).toBeCloseTo(1, 4);
      }),
      { numRuns: 25 },
    );
  });

  it('only ever shrinks and rounds an orbit (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.95, noNaN: true }), fc.double({ min: 1e7, max: 1e12, noNaN: true }), (e, a) => {
        const r = petersRates(10 * M_SUN, 3 * M_SUN, a, e);
        expect(r.dadt).toBeLessThan(0);
        expect(r.dedt).toBeLessThanOrEqual(0);
        expect(enhancement(e)).toBeGreaterThanOrEqual(1);
      }),
    );
  });

  it('draws the periastron shift as Taylor and Weisberg did: about 40 s earlier after thirty years', () => {
    const f = pairFacts(HT);
    expect(periastronShift(HT.period, f.pbdot, 30 * YEAR)).toBeCloseTo(-38.6, 0);
    expect(periodDecay(HT.m1 * M_SUN, HT.m2 * M_SUN, HT.period, HT.e)).toBe(f.pbdot);
    expect(periastronAdvance((HT.m1 + HT.m2) * M_SUN, HT.period, HT.e)).toBeGreaterThan(0);
  });

  it('leaves the Sun and Jupiter together for 10²³ years', () => {
    const f = pairFacts(PAIRS.find((p) => p.id === 'sun-jupiter')!);
    expect(Math.log10(f.mergeIn / YEAR)).toBeCloseTo(23.4, 1);
  });
});

describe('the chirp', () => {
  const m1 = 35.6 * M_SUN;
  const m2 = 30.6 * M_SUN;

  it('weighs GW150914 as the brief computes: chirp mass 28.7 M☉, 3.2 M☉ radiated, spin 0.68, a ringing at 250 Hz', () => {
    const eta = symmetricMassRatio(m1, m2);
    expect(chirpMass(m1, m2) / M_SUN).toBeCloseTo(28.72, 2);
    expect(radiatedFraction(eta) * 66.2).toBeCloseTo(3.16, 1);
    expect(finalSpin(eta)).toBeCloseTo(0.684, 2);
    const c = chirp({ m1, m2, distance: 1.358e25, redshift: 0.09, fLow: 20, sampleRate: 4096 });
    expect(c.finalMass / M_SUN).toBeCloseTo(63.0, 0);
    expect(c.fRing).toBeGreaterThan(240);
    expect(c.fRing).toBeLessThan(260);
    expect(c.tau * 1000).toBeCloseTo(4.1, 1);
    // In LIGO's band from 35 Hz for about a fifth of a second (the leading-order clock)
    expect(timeBefore(c.mcSeen, 35)).toBeGreaterThan(0.15);
    expect(timeBefore(c.mcSeen, 35)).toBeLessThan(0.2);
  });

  it('puts the innermost stable orbit’s waves at 4,400 Hz × M☉/M, and keeps two neutron stars in band for a minute above 30 Hz and 17 minutes above 10', () => {
    expect(iscoFrequency(M_SUN)).toBeCloseTo(4397, 0);
    expect(iscoFrequency(65 * M_SUN)).toBeCloseTo(67.6, 1);
    const mc = chirpMass(1.46 * M_SUN, 1.27 * M_SUN);
    expect(mc / M_SUN).toBeCloseTo(1.185, 3);
    expect(timeBefore(mc, 30)).toBeCloseTo(56, 0);
    expect(timeBefore(mc, 10) / 60).toBeCloseTo(17.5, 1);
    expect(cyclesBetween(mc, 30, 1000)).toBeGreaterThan(2600);
  });

  it('gets the chirp mass back from the sweep, and f rises as (t_c − t)^(−3/8) (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 100, noNaN: true }), fc.double({ min: 0.001, max: 100, noNaN: true }), (mass, tau) => {
        const mc = mass * M_SUN;
        const f = frequencyBefore(mc, tau);
        expect(chirpMassFromSweep(f, frequencyRate(mc, f)) / mc).toBeCloseTo(1, 9);
        expect(frequencyBefore(mc, tau / 2) / f).toBeCloseTo(2 ** 0.375, 9);
        expect(timeBefore(mc, f) / tau).toBeCloseTo(1, 9);
      }),
    );
  });

  it('steps the leading-order inspiral onto the analytic clock, and the sampled sweep gives the chirp mass back', () => {
    const c = chirp({ m1, m2, distance: 1e25, fLow: 20, sampleRate: 4096, order: 0 });
    // From the start to the join, the stepped time matches the analytic one
    const stepped = c.tJoin - c.t0;
    const analytic = timeBefore(c.mcSeen, c.fLow) - timeBefore(c.mcSeen, c.fJoin);
    expect(stepped / analytic).toBeCloseTo(1, 3);
    // The sweep at 40 Hz, measured from the samples
    const i = c.f.findIndex((f) => f >= 40);
    const fdot = (c.f[i + 1] - c.f[i - 1]) * (c.sampleRate / 2);
    expect(chirpMassFromSweep(c.f[i], fdot) / c.mcSeen).toBeCloseTo(1, 3);
    // The amplitude grows as f^(2/3)
    const j = c.f.findIndex((f) => f >= 80);
    expect(c.amp[j] / c.amp[i]).toBeCloseTo((c.f[j] / c.f[i]) ** (2 / 3), 3);
  });

  it('agrees with the leading order when the stars are far apart, and sweeps faster near the end with relativity’s corrections', () => {
    const M = 66 * M_SUN;
    const eta = 0.2486;
    expect(xRate(1e-4, M, eta, 3.5) / xRate(1e-4, M, eta, 0)).toBeCloseTo(1, 2);
    expect(sweepRate(150, M, eta, 3.5)).toBeGreaterThan(1.5 * sweepRate(150, M, eta, 0));
    // The 1PN coefficient of TaylorT4, −(743/336 + 11η/4)
    const x = 1e-3;
    const ratio = xRate(x, M, eta, 3.5) / xRate(x, M, eta, 0);
    expect((ratio - 1 - 4 * Math.PI * x ** 1.5) / x).toBeCloseTo(-(743 / 336 + (11 / 4) * eta), 1);
  });

  it('joins smoothly where the inspiral’s sweep meets the ringdown’s: at leading order near numerical relativity’s peak, G M f / c³ ≈ 0.057', () => {
    const M = 60 * M_SUN;
    const ring = ringdown(M * (1 - radiatedFraction(0.25)), finalSpin(0.25));
    const f0 = joinFrequency(M, 0.25, ring.f, ring.tau, 0);
    expect((G * M * f0) / C ** 3).toBeCloseTo(0.057, 3);
    const f35 = joinFrequency(M, 0.25, ring.f, ring.tau, 3.5);
    expect(sweepRate(f35, M, 0.25, 3.5) * ring.tau).toBeCloseTo(ring.f - f35, 3);
  });

  it('makes a continuous chirp: frequency rising to the join and on to the ringing, the amplitude peaking once (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 3, max: 120, noNaN: true }), fc.double({ min: 0.1, max: 1, noNaN: true }), (mass, q) => {
        const c = chirp({ m1: mass * M_SUN, m2: mass * q * M_SUN, distance: 1e25, fLow: 20, sampleRate: 8192, maxDuration: 1, ringTimes: 6 });
        let peaks = 0;
        for (let i = 1; i < c.f.length; i++) {
          expect(c.f[i]).toBeGreaterThanOrEqual(c.f[i - 1] * (1 - 1e-9));
          expect(Math.abs(c.h[i])).toBeLessThanOrEqual(c.amp[i] * (1 + 1e-12));
          if (i < c.amp.length - 1 && c.amp[i] > c.amp[i - 1] && c.amp[i] >= c.amp[i + 1]) peaks++;
        }
        expect(peaks).toBe(1);
        expect(c.f[c.f.length - 1]).toBeLessThanOrEqual(c.fRing);
        expect(c.f[c.f.length - 1]).toBeGreaterThan(0.95 * c.fRing);
      }),
      { numRuns: 15 },
    );
  }, 30_000);

  it('cuts two neutron stars where they touch, and plays heavy black holes lower and shorter', () => {
    const ns = chirpView(1.46, 1.27, 40, 0.01);
    expect(ns.neutronStars).toBe(true);
    expect(ns.contact).toBeGreaterThan(1400);
    expect(ns.contact).toBeLessThan(1800);
    expect(Math.max(...ns.model.f)).toBeLessThan(ns.contact! * 1.01);
    const light = chirpView(10, 10, 440, 0.09);
    const heavy = chirpView(60, 60, 440, 0.09);
    expect(heavy.model.fRing).toBeLessThan(light.model.fRing);
    expect(-heavy.model.t0).toBeLessThan(-light.model.t0);
    expect(heavy.radiated).toBeGreaterThan(light.radiated);
  });
});

describe('signals', () => {
  it('transforms and transforms back (property), and finds a sine’s frequency', () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: -1, max: 1, noNaN: true }), { minLength: 64, maxLength: 64 }), (xs) => {
        const re = Float64Array.from(xs);
        const im = new Float64Array(64);
        fft(re, im);
        ifft(re, im);
        xs.forEach((x, i) => expect(re[i]).toBeCloseTo(x, 10));
      }),
    );
    const n = 256;
    const re = Float64Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 20 * i) / n));
    const im = new Float64Array(n);
    fft(re, im);
    const mags = Array.from(re, (r, k) => Math.hypot(r, im[k]));
    const k = mags.slice(0, n / 2).indexOf(Math.max(...mags.slice(0, n / 2)));
    expect(binFrequency(k, n, 1 / n)).toBe(20);
  });

  it('measures white noise’s spectrum as flat, and whitening coloured noise flattens it', () => {
    let seed = 1;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647 - 0.5;
    };
    const fs = 1024;
    const x = Float64Array.from({ length: 16384 }, rand);
    const { psd } = welchPsd(x, fs, 256);
    const mean = psd.slice(5, 120).reduce((s, v) => s + v, 0) / 115;
    // Variance 1/12 spread over fs/2 Hz, one-sided
    expect(mean).toBeCloseTo((1 / 12) * (2 / fs), 4);
    const white = whiten(x, fs, () => 1, 20, 400);
    expect(white.length).toBe(x.length);
  });

  it('turns a cosine into a sine with the Hilbert transform, raises a chirp an octave, and finds a hidden template', () => {
    const n = 1024;
    const x = Float64Array.from({ length: n }, (_, i) => Math.cos((2 * Math.PI * 32 * i) / n));
    const h = hilbert(x);
    for (let i = 100; i < 900; i += 50) expect(h[i]).toBeCloseTo(Math.sin((2 * Math.PI * 32 * i) / n), 6);
    const up = octaveUp(x);
    for (let i = 100; i < 900; i += 50) expect(up[i]).toBeCloseTo(Math.cos((2 * Math.PI * 64 * i) / n), 6);
    // A template shifted by 37 samples and turned by a quarter-cycle is found, with an overlap of 1
    const template = Float64Array.from({ length: 300 }, (_, i) => Math.sin(i * 0.2) * Math.exp(-((i - 150) ** 2) / 2000));
    const tq = hilbert(template);
    const data = new Float64Array(1024);
    for (let i = 0; i < 300; i++) data[i + 400] = -tq[i];
    const m = match(data, Float64Array.from({ length: 1024 }, (_, i) => (i >= 363 && i < 663 ? template[i - 363] : 0)), 350, 750, 60);
    expect(m.shift).toBe(37);
    expect(m.overlap).toBeCloseTo(1, 3);
  });

  it('draws a chirp’s spectrogram rising in frequency', () => {
    const c = chirp({ m1: 10 * M_SUN, m2: 10 * M_SUN, distance: 1e25, fLow: 30, sampleRate: 4096, order: 0 });
    const s = spectrogram(c.h, 4096, 256, 128, 1000);
    const loudest = s.power.map((col) => col.indexOf(Math.max(...col)));
    const early = loudest[2];
    const late = loudest[Math.floor(loudest.length * 0.9)];
    expect(s.freqs[late]).toBeGreaterThan(s.freqs[early]);
  });
});

describe('GW150914’s data', () => {
  it('ships two seconds from each detector, whitened to unit noise, with the chirp standing out at the event', () => {
    expect(GW150914.H1.length).toBe(4096);
    expect(GW150914.L1.length).toBe(4096);
    expect(GW150914.sampleRate).toBe(2048);
    const rms = (xs: Float64Array, from: number, to: number) => Math.sqrt(xs.slice(from, to).reduce((s, v) => s + v * v, 0) / (to - from));
    // The first second (noise) has a spread near 1; the last 0.15 s before the peak is louder
    expect(rms(GW150914.H1, 0, 2048)).toBeGreaterThan(0.7);
    expect(rms(GW150914.H1, 0, 2048)).toBeLessThan(1.3);
    const event = Math.round(-GW150914.start * 2048);
    expect(rms(GW150914.H1, event - 200, event + 60)).toBeGreaterThan(1.5 * rms(GW150914.H1, 0, 2048));
    // The noise spectrum is at its quietest near 100–300 Hz, a few × 10⁻²³ /√Hz
    expect(asd('H1', 150)).toBeLessThan(asd('H1', 25));
    expect(asd('H1', 150)).toBeGreaterThan(1e-24);
    expect(asd('H1', 150)).toBeLessThan(1e-22);
  });

  it('fits the model best near 25 M☉ of chirp mass, and the question accepts 21.5–29.5 M☉, LIGO’s 28.6 among them', () => {
    const fits = [20, 21, 21.5, 24, CHIRP_BEST, 26, 29.5, 30, 34].map((mc) => ({ mc, o: chirpFit(mc) }));
    const best = fits.find((f) => f.mc === CHIRP_BEST)!.o;
    for (const f of fits) expect(f.o).toBeLessThanOrEqual(best + 0.005);
    const threshold = best * 0.875;
    expect(fits.find((f) => f.mc === CHIRP_RANGE[0])!.o).toBeGreaterThanOrEqual(threshold);
    expect(fits.find((f) => f.mc === CHIRP_RANGE[1])!.o).toBeGreaterThanOrEqual(threshold);
    expect(fits.find((f) => f.mc === 21)!.o).toBeLessThan(threshold);
    expect(fits.find((f) => f.mc === 30)!.o).toBeLessThan(threshold);
    expect(LIGO_CHIRP.median).toBeGreaterThanOrEqual(CHIRP_RANGE[0]);
    expect(LIGO_CHIRP.median).toBeLessThanOrEqual(CHIRP_RANGE[1]);
    expect(checkChirp({ mc: 25 }).correct).toBe(true);
    expect(checkChirp({ mc: 15 }).correct).toBe(false);
    expect(checkChirp({ mc: 40 }).correct).toBe(false);
  }, 30_000);
});

describe('the merger census', () => {
  it('holds GWOSC’s list as counted in mergers.ts, with dates, runs and plausible masses', () => {
    expect(MERGERS.length).toBe(MERGER_CENSUS.count);
    expect(MERGERS.filter((e) => e.m1 && e.m2).length).toBe(MERGER_CENSUS.withMasses);
    expect(eventDate('GW150914').text).toBe('14 September 2015');
    expect(eventDate('GW230529_181500').iso).toBe('2023-05-29');
    for (const e of MERGERS) {
      expect(RUNS.some((r) => r.id === e.run)).toBe(true);
      if (e.m1 && e.m2) {
        expect(e.m1[0]).toBeGreaterThanOrEqual(e.m2[0]);
        expect(e.m1[1]).toBeLessThanOrEqual(0);
        expect(e.m1[2]).toBeGreaterThanOrEqual(0);
      }
    }
    expect(eventsUpTo('O1').map((e) => e.name)).toContain('GW150914');
    expect(eventsUpTo('O4b').length).toBe(MERGERS.length);
    expect(heavierMassHistogram(MERGERS).reduce((s, b) => s + b.count, 0)).toBe(MERGER_CENSUS.withMasses);
  });

  it('knows the famous ones: GW170817 two neutron stars, GW190814 a black hole and something of 2.6 M☉, and the records', () => {
    const find = (name: string) => MERGERS.find((e) => e.name.startsWith(name))!;
    expect(kindOf(find('GW170817'))).toBe('bns');
    expect(kindOf(find('GW190814'))).toBe('nsbh');
    expect(kindOf(find('GW150914'))).toBe('bbh');
    const heaviest = find(HEAVIEST_MERGER.name);
    expect(heaviest.m1![0] + heaviest.m2![0]).toBeGreaterThan(190);
    const loudest = find(LOUDEST_MERGER.name);
    expect(loudest.snr).toBeGreaterThan(75);
    // No merger is heavier, and none louder
    const total = (e: (typeof MERGERS)[number]) => (e.m1 && e.m2 ? e.m1[0] + e.m2[0] : 0);
    expect(Math.max(...MERGERS.map(total))).toBe(total(heaviest));
    expect(Math.max(...MERGERS.map((e) => e.snr ?? 0))).toBe(loudest.snr);
    // The presets read the catalogue
    expect(CHIRP_PRESETS.find((p) => p.id === 'gw250114')!.m1).toBeCloseTo(loudest.m1![0], 5);
  });

  it('dates what LVK plan next', () => {
    expect(NEXT_RUN.asOf).toMatch(/2026|2027/);
  });
});

describe('the gravitational-wave spectrum and stretch and squeeze', () => {
  it('puts LIGO’s noise at a few × 10⁻²⁴ /√Hz near 100 Hz and LISA’s best near a few millihertz', () => {
    expect(Math.sqrt(ligoNoise(100))).toBeGreaterThan(2e-24);
    expect(Math.sqrt(ligoNoise(100))).toBeLessThan(6e-24);
    expect(ligoNoise(5)).toBe(Infinity);
    const lisa = [1e-4, 1e-3, 5e-3, 2e-2, 1e-1].map((f) => noiseStrain(f, (g) => lisaNoise(g, false)));
    expect(lisa[2]).toBeLessThan(lisa[0]);
    expect(lisa[2]).toBeLessThan(lisa[4]);
    // The Galaxy's white dwarfs add a hump below a few millihertz
    expect(lisaNoise(1e-3, true)).toBeGreaterThan(lisaNoise(1e-3, false));
  });

  it('lets each detector hear its sources: GW150914’s and GW170817’s above LIGO, the million-Sun pair above LISA, the background above the pulsars’ reach at its lowest frequencies', () => {
    const above = (sourceId: string, detectorId: string) => {
      const s = SOURCES.find((x) => x.id === sourceId)!;
      const d = DETECTORS.find((x) => x.id === detectorId)!;
      return s.points.some((p) => p.f >= d.from && p.f <= d.to && p.h > d.noise(p.f));
    };
    expect(above('bbh', 'ligo')).toBe(true);
    expect(above('bns', 'ligo')).toBe(true);
    expect(above('mbh', 'lisa')).toBe(true);
    expect(above('white-dwarfs', 'lisa')).toBe(true);
    expect(above('background', 'pta')).toBe(true);
    expect(ptaBackground(1 / YEAR)).toBeCloseTo(2.4e-15, 17);
    expect(ptaReach(10 / (15 * YEAR))).toBeGreaterThan(ptaBackground(10 / (15 * YEAR)));
    const d = describeFrequency(100);
    expect(d.wavelength).toBeCloseTo(C / 100, 0);
    expect(d.detectors.map((x) => x.id)).toEqual(['ligo']);
  });

  it('stretches the ring one way while it squeezes the other, keeping its area to first order (property), and a detector at 45° can’t hear the plus polarisation', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.3, noNaN: true }), fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), (A, phi) => {
        for (const pol of ['plus', 'cross', 'circular'] as const) {
          const ring = ringPositions(pol, A, phi);
          // The determinant of the deformation is 1 − (h₊² + h×²)/4: area kept to first order
          const area = ring.reduce((s, p, i) => {
            const q = ring[(i + 1) % ring.length];
            return s + (p.now.x * q.now.y - q.now.x * p.now.y) / 2;
          }, 0);
          const rest = ring.reduce((s, p, i) => {
            const q = ring[(i + 1) % ring.length];
            return s + (p.rest.x * q.rest.y - q.rest.x * p.rest.y) / 2;
          }, 0);
          expect(Math.abs(area / rest - 1)).toBeLessThanOrEqual((A * A) / 2 + 1e-12);
        }
        expect(armResponse('plus', A, phi, Math.PI / 4)).toBeCloseTo(0, 12);
        expect(armResponse('cross', A, phi, 0)).toBeCloseTo(0, 12);
      }),
    );
  });
});

describe('Chapter 29 in the course', () => {
  it('is written, with its sections and glossary terms; Chapter 31 is not yet', () => {
    const ch = CHAPTERS.find((c) => c.number === 29)!;
    expect(ch.load).toBeDefined();
    expect(ch.sections).toEqual(['A clock in orbit', 'What a gravitational wave is', 'The chirp', 'Hundreds of collisions', 'Merging neutron stars']);
    expect(CHAPTERS.find((c) => c.number === 31)!.load).toBeUndefined();
    for (const id of ['gravitational-wave', 'strain', 'interferometer', 'chirp-mass', 'ringdown', 'pulsar-timing-array']) expect(GLOSSARY).toHaveProperty(id);
  });

  it('separates a pair into two masses only through the corrections: the separation for a period is Kepler’s', () => {
    expect(separationFor(2 * M_SUN, 2 * Math.PI * Math.sqrt((1e9) ** 3 / (G * 2 * M_SUN)))).toBeCloseTo(1e9, 0);
    expect(xOfFrequency(100, 60 * M_SUN)).toBeGreaterThan(0);
  });
});
