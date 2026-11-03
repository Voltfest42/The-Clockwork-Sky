import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkPleiadesAge, PLEIADES_ACCEPTED } from '../src/content/checks/chapter17Answers';
import { isochrone } from '../src/core/stellar/lives';
import { computeStellar, requestKey } from '../src/core/stellar/requests';
import { LEAVITT, MILKY_WAY } from '../src/data/cepheids';
import {
  AU_IN_R_SUN,
  cepheidAbsoluteV,
  cepheidDistance,
  cepheidShape,
  clusterById,
  clusterPoints,
  CLUSTERS,
  clusterZ,
  formatMyr,
  isochroneHR,
  leavittFits,
  LIFETIME_PREDICTIONS,
  lifetimeCurve,
  lifetimeReadout,
  shortMyr,
  snapAge,
  sunAt,
  sunMilestones,
  swallowed,
  turnoffReadout,
  widenedOrbit,
} from '../src/figures/starLives';
import { expectNear } from './helpers';

describe('formatting', () => {
  it('says spans of time in words', () => {
    expect(formatMyr(11003)).toBe('11 billion years');
    expect(formatMyr(24.3)).toBe('24 million years');
    expect(formatMyr(3.66e6)).toBe('3.7 trillion years');
    expect(formatMyr(0.3)).toBe('300 thousand years');
    expect(shortMyr(4570)).toBe('4.6 Gyr');
    expect(shortMyr(120)).toBe('120 Myr');
  });
});

describe('Figure 17.1, lifetimes', () => {
  it('has one right answer to the prediction: the light star', () => {
    expect(LIFETIME_PREDICTIONS.filter((p) => p.correct).map((p) => p.id)).toEqual(['light']);
  });

  it('falls with mass, close to the rule of thumb near the Sun', () => {
    const curve = lifetimeCurve();
    for (let i = 1; i < curve.length; i++) expect(curve[i].years).toBeLessThan(curve[i - 1].years);
    const sun = lifetimeReadout(1);
    expectNear(sun.years / 1e10, 1.1, 0.1, 'Sun');
    expectNear(sun.vsSun, 1, 1e-12, 'the Sun against itself');
  });

  it('says which masses have had time to die in the Galaxy', () => {
    expect(lifetimeReadout(1).anyDied).toBe(true);
    expect(lifetimeReadout(0.8).anyDied).toBe(false);
    expect(lifetimeReadout(10).burn).toBeGreaterThan(1000);
  });
});

describe('Figure 17.2, the Sun’s life', () => {
  const m = sunMilestones();

  it('leaves the main sequence at about 11 billion years and ends as a white dwarf of about half its mass', () => {
    expectNear(m.leavesMainSequence / 1000, 11, 0.5, 'Gyr');
    expect(m.heliumFlash).toBeGreaterThan(m.leavesMainSequence);
    expectNear(m.whiteDwarf.mass, 0.52, 0.03, 'white dwarf');
  });

  it('swells to near the size of Earth’s orbit today, having lost a quarter to a third of its mass', () => {
    expect(m.tip.R).toBeGreaterThan(150);
    expect(m.agbMax.au).toBeGreaterThan(0.9);
    expect(m.agbMax.au).toBeLessThan(1.3);
    expect(m.tip.mass).toBeGreaterThan(0.66);
    expect(m.tip.mass).toBeLessThan(0.8);
  });

  it('is about as bright and as big today as it is', () => {
    const now = sunAt(4570);
    expectNear(now.L, 1, 0.1, 'L');
    expectNear(now.R, 1, 0.1, 'R');
  });

  it('swallows Mercury, while Earth’s orbit widens as the Sun loses mass', () => {
    const biggest = sunAt(m.agbMax.t);
    expect(swallowed(biggest)).toContain('Mercury');
    expect(swallowed(biggest)).not.toContain('Earth');
    expectNear(widenedOrbit(1, 0.5), 2, 1e-12, 'a ∝ 1/M');
    expectNear(AU_IN_R_SUN, 215.03, 0.01, 'AU in R☉');
  });
});

describe('Figure 17.3, the clusters', () => {
  it('has six clusters from Gaia, under Gaia’s licence, within the size budget', () => {
    const raw = readFileSync('src/data/gaia/clusters.json');
    const file = JSON.parse(raw.toString());
    expect(file.licence).toMatch(/CC BY-NC 3\.0 IGO/);
    expect(CLUSTERS.map((c) => c.id)).toEqual(['pleiades', 'hyades', 'praesepe', 'm67', 'ngc188', '47tuc']);
    expect(gzipSync(raw).length).toBeLessThan(80_000);
    for (const c of CLUSTERS) expect(c.stars.length / 2).toBeGreaterThan(300);
  });

  it('puts the clusters at their known distances', () => {
    const near = (id: string, lo: number, hi: number) => {
      const d = clusterById(id).distance;
      expect(d, id).toBeGreaterThanOrEqual(lo);
      expect(d, id).toBeLessThanOrEqual(hi);
    };
    near('pleiades', 132, 140);
    near('hyades', 45, 49);
    near('praesepe', 177, 190);
    near('m67', 800, 900);
    near('ngc188', 1700, 2000);
  });

  it('keeps the Pleiades’ brightest stars and the Hyades’ red giants', () => {
    const pleiades = clusterPoints(clusterById('pleiades'));
    expect(pleiades.some((p) => p.mG < -1.5)).toBe(true);
    const hyades = clusterPoints(clusterById('hyades'));
    // Three of its four red giants (γ, δ, ε and θ¹ Tauri) pass the membership cuts.
    expect(hyades.filter((p) => p.bpRp > 1 && p.mG < 1.5).length).toBeGreaterThanOrEqual(3);
  });

  /** The median gap in M_G between a cluster's stars and the isochrone at the same colour, within a range of colours. */
  function mainSequenceGap(id: string, age: number, blue: number, red: number): number {
    const c = clusterById(id);
    const iso = isochroneHR(isochrone(age, clusterZ(c))).filter((p) => p.mG > 0.5);
    const gaps: number[] = [];
    for (const p of clusterPoints(c)) {
      if (p.bpRp < blue || p.bpRp > red) continue;
      const k = iso.findIndex((q, i) => i > 0 && (iso[i - 1].bpRp - p.bpRp) * (q.bpRp - p.bpRp) <= 0);
      if (k < 1) continue;
      const [a, b] = [iso[k - 1], iso[k]];
      const mg = a.mG + ((p.bpRp - a.bpRp) / (b.bpRp - a.bpRp)) * (b.mG - a.mG);
      gaps.push(p.mG - mg);
    }
    gaps.sort((x, y) => x - y);
    return gaps[Math.floor(gaps.length / 2)];
  }

  it('lays the engine’s main sequence on Gaia’s within a few tenths of a magnitude', () => {
    expect(Math.abs(mainSequenceGap('pleiades', 120, 0, 1.0))).toBeLessThan(0.35);
    expect(Math.abs(mainSequenceGap('hyades', 700, 0.4, 1.0))).toBeLessThan(0.35);
    expect(Math.abs(mainSequenceGap('m67', 4000, 0.8, 1.2))).toBeLessThan(0.35);
  });

  it('turns off at hot B stars in the Pleiades and at Sun-like stars in M67', () => {
    expectNear(turnoffReadout(120, clusterZ(clusterById('pleiades'))).mass, 4.7, 0.4, 'Pleiades');
    expectNear(turnoffReadout(4000, clusterZ(clusterById('m67'))).mass, 1.3, 0.1, 'M67');
  });
});

describe('Figure 17.3, the age slider', () => {
  it('moves the age in even steps of 2.3%, to three figures, so isochrones repeat and come from the cache', () => {
    expect([100, 102, 105, 107, 110, 112, 115, 117, 120, 123].map((a) => snapAge(a))).toEqual([100, 102, 105, 107, 110, 112, 115, 117, 120, 123]);
    expect(snapAge(1000)).toBe(1000);
    expect(snapAge(121)).toBe(120);
    fc.assert(
      fc.property(fc.double({ min: 1, max: 15000, noNaN: true }), (age) => {
        const s = snapAge(age);
        expect(snapAge(s)).toBe(s);
        expect(Math.abs(Math.log10(s / age))).toBeLessThanOrEqual(0.0075); // half a step, and the rounding to three figures
        const next = snapAge(s * 10 ** 0.01);
        expectNear(Math.log10(next / s), 0.01, 0.0045, 'step'); // each end rounded to three figures
      }),
    );
  });

  it('gives a coarse isochrone while the slider moves: the same main sequence and turn-off, a quarter of the giants', () => {
    const full = computeStellar({ kind: 'isochrone', age: 120, z: 0.02 }) as ReturnType<typeof isochrone>;
    const coarse = computeStellar({ kind: 'isochrone', age: 120, z: 0.02, detail: 'coarse' }) as ReturnType<typeof isochrone>;
    expect(coarse.length).toBeLessThan(full.length * 0.6);
    const top = (pts: ReturnType<typeof isochrone>) => Math.max(...pts.filter((p) => p.kw <= 1).map((p) => p.mass));
    expectNear(top(coarse), top(full), 1e-9, 'turn-off mass');
    expect(requestKey({ kind: 'isochrone', age: 120, z: 0.02, detail: 'coarse' })).not.toBe(requestKey({ kind: 'isochrone', age: 120, z: 0.02 }));
  });
});

describe('Figure 17.4, Leavitt’s law', () => {
  it('has Leavitt’s 25 stars in order of period, each brighter at maximum', () => {
    expect(LEAVITT).toHaveLength(25);
    for (let i = 1; i < LEAVITT.length; i++) expect(LEAVITT[i].period).toBeGreaterThan(LEAVITT[i - 1].period);
    for (const s of LEAVITT) expect(s.max).toBeLessThan(s.min);
  });

  it('gives back her slope: log P grows by about 0.48 per magnitude', () => {
    const { max, min } = leavittFits();
    expectNear(1 / Math.abs(max.b), 0.48, 0.03, 'maxima');
    expectNear(1 / Math.abs(min.b), 0.48, 0.03, 'minima');
  });

  it('puts δ Cephei and ℓ Carinae within 6% of their parallax distances', () => {
    for (const c of MILKY_WAY) expectNear(cepheidDistance(c.period, c.meanV, c.av) / c.parallaxDistance, 1, 0.06, c.name);
    expectNear(cepheidAbsoluteV(10), -4.05, 1e-12, 'M_V at 10 days');
  });

  it('draws a light curve that brightens fast and fades slowly', () => {
    expect(cepheidShape(0)).toBe(1);
    expectNear(cepheidShape(0.8), 0, 1e-12, 'minimum');
    fc.assert(
      fc.property(fc.double({ min: 0, max: 3, noNaN: true }), (p) => {
        const b = cepheidShape(p);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(1);
      }),
    );
  });
});

describe('Check yourself: the age of the Pleiades', () => {
  it('accepts the published age and the turn-off’s range, and nothing far from it', () => {
    expect(checkPleiadesAge(120).correct).toBe(true);
    expect(checkPleiadesAge(PLEIADES_ACCEPTED[0]).correct).toBe(true);
    expect(checkPleiadesAge(PLEIADES_ACCEPTED[1]).correct).toBe(true);
    expect(checkPleiadesAge(30).correct).toBe(false);
    expect(checkPleiadesAge(1000).correct).toBe(false);
  });
});
