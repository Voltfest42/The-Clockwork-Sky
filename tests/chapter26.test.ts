import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { C, G, M_SUN } from '../src/core/constants';
import { beamAngle, pulseProfile, pulseWidth } from '../src/core/compact/beam';
import {
  aged,
  characteristicAge,
  deathLinePdot,
  equilibriumPeriod,
  isPastDeathLine,
  pdotForAge,
  pdotForField,
  recyclingPath,
  RECYCLED,
  spinDownPower,
  spinUpLinePdot,
  surfaceField,
} from '../src/core/compact/pulsar';
import { buildNeutronStar, causalityRadiusKm, densityForEnthalpy, energyDensity, enthalpy, piecewiseEos, pressure, radiusForMass, soundSpeed } from '../src/core/compact/tov';
import { checkTooSoft, HEAVY_MASS } from '../src/content/checks/chapter26Answers';
import { AS_OF } from '../src/data/asOf';
import { CORE_DIVISIONS, EOS_FITS, SLY_CRUST } from '../src/data/eos';
import { HEAVY_NEUTRON_STARS, NICER_RADII } from '../src/data/neutronStars';
import { FAMOUS_PULSARS, PULSAR_COUNTS, PULSAR_SET } from '../src/data/pulsars';
import { FASTEST_PULSAR, HEAVIEST_NEUTRON_STAR } from '../src/data/records';
import { curveOf, eosOf, failingAt, insideStar, maxMass, neutronStarAt, ownPosition, OWN_START } from '../src/figures/neutronStars';
import { GLOSSARY } from '../src/site/glossary';
import { CHAPTERS, TOOLKIT } from '../src/site/course';

const rel = (a: number, b: number) => Math.abs(a / b - 1);
const YEAR = 365.25 * 86400;

describe('equations of state (data/eos.ts and compact/tov.ts)', () => {
  it('joins the SLy crust’s four pieces with continuous pressure, as Read et al.’s Table II does', () => {
    const { K, gamma, rho } = SLY_CRUST;
    for (let i = 0; i < 3; i++) expect(rel(K[i] * rho[i] ** gamma[i], K[i + 1] * rho[i] ** gamma[i + 1]), `boundary ${i}`).toBeLessThan(2e-4);
  });

  it('keeps pressure and energy continuous across every boundary, crust and core, for every fit (property)', () => {
    for (const fit of EOS_FITS) {
      const eos = piecewiseEos(fit);
      for (const piece of eos.pieces.slice(1)) {
        const at = piece.from * 1000;
        // The crust's constants are printed to six figures, so its own joins match to a few parts in 10⁵; the core's are exact.
        expect(rel(pressure(eos, at * (1 - 1e-9)), pressure(eos, at * (1 + 1e-9))), `${fit.id} p at ${piece.from}`).toBeLessThan(piece.from < 3e12 ? 2e-4 : 1e-6);
        expect(rel(energyDensity(eos, at * (1 - 1e-9)), energyDensity(eos, at * (1 + 1e-9))), `${fit.id} ε at ${piece.from}`).toBeLessThan(1e-6);
      }
      // The core's pressure at ρ₁ is the table's p₁.
      expect(rel(pressure(eos, CORE_DIVISIONS[0] * 1000) * 10, 10 ** fit.logP1), fit.id).toBeLessThan(1e-9);
    }
  });

  it('turns enthalpy back into density, at any density (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: EOS_FITS.length - 1 }), fc.double({ min: 5, max: 15.8, noNaN: true }), (k, lr) => {
        const eos = eosOf(EOS_FITS[k].id);
        const rho = 10 ** lr * 1000;
        expect(rel(densityForEnthalpy(eos, enthalpy(eos, rho)), rho)).toBeLessThan(1e-7);
      }),
      { numRuns: 200 },
    );
  });

  it('puts the crust’s base near half a nucleus’s density for every fit', () => {
    for (const fit of EOS_FITS) {
      const join = piecewiseEos(fit).crustCore;
      expect(join, fit.id).toBeGreaterThan(4e13);
      expect(join, fit.id).toBeLessThan(2.5e14);
    }
  });
});

describe('neutron stars by the TOV equation', () => {
  it('reproduces Read et al.’s fits’ heaviest stars to 0.1%, for all ten', () => {
    for (const fit of EOS_FITS) {
      const fitted = fit.mMax * (1 + fit.mMaxFitError / 100);
      expect(rel(maxMass(fit.id), fitted), fit.id).toBeLessThan(1e-3);
    }
  });

  it('reproduces their radii of 1.4 M☉ stars to 0.2%', () => {
    for (const fit of EOS_FITS) {
      const fitted = fit.r14 * (1 + fit.r14FitError / 100);
      expect(rel(radiusForMass(curveOf(fit.id), 1.4)!, fitted), fit.id).toBeLessThan(2e-3);
    }
  });

  it('agrees with Newton for light, barely relativistic stars, and parts from him for heavy ones', () => {
    const eos = eosOf('SLy');
    const light = buildNeutronStar(eos, 10 ** 13.9 * 1000);
    const lightN = buildNeutronStar(eos, 10 ** 13.9 * 1000, { newtonian: true });
    expect(light.compactness).toBeLessThan(0.03);
    expect(rel(light.mass, lightN.mass)).toBeLessThan(0.05);
    const heavy = neutronStarAt('SLy', 15.2);
    const heavyN = neutronStarAt('SLy', 15.2, true);
    expect(heavyN.mass / heavy.mass).toBeGreaterThan(1.5);
  });

  it('has no heaviest star in Newton’s gravity: the mass keeps rising with the central density (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 14.6, max: 15.7, noNaN: true }), (lr) => {
        expect(neutronStarAt('SLy', lr + 0.1, true).mass).toBeGreaterThan(neutronStarAt('SLy', lr, true).mass);
      }),
      { numRuns: 15 },
    );
  });

  it('keeps every star on the stable branch outside the causality limit, R > 2.9GM/c² (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: EOS_FITS.length - 1 }), fc.double({ min: 14.4, max: 15.6, noNaN: true }), (k, lr) => {
        const curve = curveOf(EOS_FITS[k].id);
        if (lr > curve.maximum.logRhoC) return;
        const s = neutronStarAt(EOS_FITS[k].id, lr);
        expect(s.radius / 1000).toBeGreaterThan(causalityRadiusKm(s.mass / M_SUN) * 0.97);
      }),
      { numRuns: 40 },
    );
  });

  it('has pressure falling outward and the mass inside rising, in every star', () => {
    const s = neutronStarAt('APR4', 15.1);
    for (let i = 1; i < s.profile.length; i++) {
      expect(s.profile[i].p).toBeLessThanOrEqual(s.profile[i - 1].p * (1 + 1e-12));
      expect(s.profile[i].m).toBeGreaterThanOrEqual(s.profile[i - 1].m);
    }
  });

  it('makes heavier stars smaller for SLy, between 1.2 and 2.0 M☉', () => {
    const c = curveOf('SLy');
    expect(radiusForMass(c, 2.0)!).toBeLessThan(radiusForMass(c, 1.2)!);
  });

  it('gives sound faster than light at the heaviest stars of the stiffest fits, as Read et al.’s table warns, and slower in soft ones', () => {
    expect(curveOf('WFF1').maximum.soundC).toBeGreaterThan(1);
    expect(curveOf('APR4').maximum.soundC).toBeGreaterThan(1);
    expect(curveOf('MS1').maximum.soundC).toBeLessThan(1);
    expect(curveOf('PAL6').maximum.soundC).toBeLessThan(1);
    expect(soundSpeed(eosOf('SLy'), 1e17)).toBeLessThan(0.3);
  });

  it('rules out the soft fits with the heaviest pulsars: only MPA1 and MS1 reach 2.35 M☉', () => {
    expect(failingAt(HEAVY_MASS).sort()).toEqual(['APR4', 'ENG', 'FPS', 'GNH3', 'H4', 'PAL6', 'SLy', 'WFF1']);
    expect(failingAt(2.01).sort()).toEqual(['FPS', 'GNH3', 'PAL6']);
  });
});

describe('inside a neutron star (Figure 26.1)', () => {
  const inside = insideStar('SLy', 1.4);

  it('builds a 1.4 M☉ SLy star 11.7 km in radius, its centre 3 to 4 times a nucleus’s density', () => {
    expect(inside.mass).toBeCloseTo(1.4, 3);
    expect(inside.star.radius / 1000).toBeCloseTo(11.7, 1);
    expect(inside.star.rhoC / 2.7e17).toBeGreaterThan(3);
    expect(inside.star.rhoC / 2.7e17).toBeLessThan(4);
  });

  it('gives a crust about a kilometre thick holding 1–2% of the mass, the drip 300–500 m down', () => {
    expect(inside.crust).toBeGreaterThan(800);
    expect(inside.crust).toBeLessThan(1200);
    expect(inside.outerCrust).toBeGreaterThan(300);
    expect(inside.outerCrust).toBeLessThan(500);
    const crustShare = inside.layers.filter((l) => /crust|pasta/.test(l.id)).reduce((s, l) => s + l.massShare, 0);
    expect(crustShare).toBeGreaterThan(0.01);
    expect(crustShare).toBeLessThan(0.02);
  });

  it('cuts the star into layers that fit together and add up to the whole mass', () => {
    for (let i = 1; i < inside.layers.length; i++) expect(inside.layers[i].from).toBeCloseTo(inside.layers[i - 1].to, 6);
    expect(inside.layers[inside.layers.length - 1].to).toBeCloseTo(inside.star.radius, 6);
    expect(inside.layers.reduce((s, l) => s + l.massShare, 0)).toBeCloseTo(1, 6);
  });

  it('has the inner core shrink away in light stars and grow in heavy ones', () => {
    const core = (m: number) => insideStar('SLy', m).layers.find((l) => l.id === 'inner-core')?.to ?? 0;
    expect(core(2.0)).toBeGreaterThan(core(1.4));
  });

  it('gives the chapter’s numbers: a mean density of 3.8 × 10¹⁴ g/cm³ for 1.4 M☉ in 12 km, and an escape speed of 60% of light’s', () => {
    const mean = (1.4 * M_SUN) / ((4 / 3) * Math.PI * 12e3 ** 3) / 1000;
    expect(mean / 1e14).toBeCloseTo(3.85, 1);
    expect(Math.sqrt((2 * G * inside.star.mass) / inside.star.radius) / C).toBeCloseTo(0.6, 1);
  });
});

describe('measured neutron stars (data/neutronStars.ts)', () => {
  it('lists the heaviest pulsars as the chapter quotes them, the heaviest in records.ts', () => {
    expect(HEAVY_NEUTRON_STARS.map((h) => h.mass)).toEqual([2.01, 2.08, 2.35]);
    expect(HEAVY_NEUTRON_STARS[2].mass).toBe(HEAVIEST_NEUTRON_STAR.mass);
  });

  it('gives NICER’s radii as ranges round their centres, all 10–17 km', () => {
    for (const n of NICER_RADII) {
      expect(n.radiusLow).toBeLessThan(n.radius);
      expect(n.radiusHigh).toBeGreaterThan(n.radius);
      expect(n.massLow).toBeLessThan(n.mass);
      expect(n.massHigh).toBeGreaterThan(n.mass);
      expect(n.radiusLow).toBeGreaterThan(10);
      expect(n.radiusHigh).toBeLessThan(17);
    }
  });
});

describe('pulsars and spin-down (compact/pulsar.ts)', () => {
  it('gives the research brief’s fields, ages and powers', () => {
    const cases = [
      { P: 0.0337, Pdot: 4.2e-13, B: 3.8e12, age: 1270, power: 4.3e31 },
      { P: 0.0893, Pdot: 1.25e-13, B: 3.4e12, age: 11_000, power: 6.9e29 },
      { P: 0.00576, Pdot: 5.7e-20, B: 5.8e8, age: 1.6e9, power: 1.2e27 },
      { P: 0.059, Pdot: 8.6e-18, B: 2.3e10, age: 1.08e8, power: 1.7e26 },
    ];
    for (const c of cases) {
      expect(rel(surfaceField(c.P, c.Pdot), c.B)).toBeLessThan(0.03);
      expect(rel(characteristicAge(c.P, c.Pdot), c.age)).toBeLessThan(0.05);
      expect(rel(spinDownPower(c.P, c.Pdot), c.power)).toBeLessThan(0.05);
    }
  });

  it('gives the chapter’s Crab: 3.8 × 10¹² G, 1,260 years and 120,000 Suns', () => {
    const crab = FAMOUS_PULSARS.find((p) => p.nickname === 'the Crab pulsar')!;
    expect(surfaceField(crab.P, crab.Pdot!) / 1e12).toBeCloseTo(3.8, 1);
    expect(Math.round(characteristicAge(crab.P, crab.Pdot!) / 10) * 10).toBe(1260);
    expect(Math.round(spinDownPower(crab.P, crab.Pdot!) / 3.828e26 / 1e4) * 1e4).toBe(120_000);
    expect(crab.Pdot! * YEAR * 1e6).toBeCloseTo(13, 0);
  });

  it('ages a pulsar along its line of constant field, PṖ fixed (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: -2.5, max: 0, noNaN: true }), fc.double({ min: 10, max: 15, noNaN: true }), fc.double({ min: 2, max: 10, noNaN: true }), (lp, lb, ly) => {
        const P0 = 10 ** lp;
        const B = 10 ** lb;
        const now = aged(P0, B, 10 ** ly);
        expect(rel(surfaceField(now.P, now.Pdot), B)).toBeLessThan(1e-9);
        expect(now.P).toBeGreaterThanOrEqual(P0);
        expect(aged(P0, B, 0).P).toBeCloseTo(P0, 12);
      }),
    );
  });

  it('draws the lines of the diagram with the right slopes: field −1, age +1, the death line +3, the spin-up line +4/3', () => {
    const slope = (f: (P: number) => number) => Math.log10(f(1) / f(0.1));
    expect(slope((P) => pdotForField(P, 1e12))).toBeCloseTo(-1, 9);
    expect(slope((P) => pdotForAge(P, 1e6))).toBeCloseTo(1, 9);
    expect(slope(deathLinePdot)).toBeCloseTo(3, 9);
    expect(slope(spinUpLinePdot)).toBeCloseTo(4 / 3, 9);
    expect(surfaceField(2, deathLinePdot(2)) / 4).toBeCloseTo(0.17e12, -8);
  });

  it('spins a neutron star with a 10⁹ G field up to about 2.6 ms at the Eddington rate, as the standard estimate', () => {
    expect(equilibriumPeriod(1e9) * 1000).toBeCloseTo(2.56, 1);
    expect(equilibriumPeriod(1e9, 0.1) / equilibriumPeriod(1e9)).toBeCloseTo(10 ** (3 / 7), 6);
  });

  it('recycles a dead pulsar into a millisecond pulsar with a weak field', () => {
    const path = recyclingPath(5, 1e12);
    const end = path[path.length - 1];
    expect(end.P).toBeLessThan(0.005);
    expect(rel(surfaceField(end.P, end.Pdot), RECYCLED.field)).toBeLessThan(1e-9);
    expect(isPastDeathLine(end.P, end.Pdot)).toBe(false);
  });

  it('starts the reader’s pulsar alive, and kills it within a billion years', () => {
    expect(ownPosition(OWN_START).dead).toBe(false);
    expect(ownPosition({ ...OWN_START, logAge: 9 }).dead).toBe(true);
  });
});

describe('famous pulsars (data/pulsars.ts)', () => {
  it('holds about sixty pulsars of every kind, each with a source and a note', () => {
    expect(FAMOUS_PULSARS.length).toBeGreaterThanOrEqual(55);
    expect(new Set(FAMOUS_PULSARS.map((p) => p.name)).size).toBe(FAMOUS_PULSARS.length);
    for (const p of FAMOUS_PULSARS) {
      expect(p.source.length, p.name).toBeGreaterThan(5);
      expect(p.note.length, p.name).toBeGreaterThan(10);
      expect(p.P).toBeGreaterThan(1e-3);
      if (p.Pdot !== null) expect(p.Pdot).toBeGreaterThan(0);
    }
    expect(PULSAR_SET.pulsars).toBe(FAMOUS_PULSARS);
  });

  it('puts each family where the chapter says: millisecond pulsars with weak fields and old ages, magnetars with strong fields', () => {
    for (const p of FAMOUS_PULSARS) {
      if (p.Pdot === null) continue;
      const B = surfaceField(p.P, p.Pdot);
      if (p.kind === 'millisecond') {
        expect(p.P, p.name).toBeLessThan(0.04);
        expect(B, p.name).toBeLessThan(3e10);
      }
      if (p.kind === 'magnetar' && p.name !== 'SGR 0418+5729') expect(B, p.name).toBeGreaterThan(1e13);
      if (p.kind === 'young') expect(characteristicAge(p.P, p.Pdot), p.name).toBeLessThan(5e5);
    }
  });

  it('puts exactly the pulsars known to defy the death line beyond it', () => {
    const beyond = FAMOUS_PULSARS.filter((p) => p.Pdot !== null && isPastDeathLine(p.P, p.Pdot)).map((p) => p.name);
    expect(beyond.sort()).toEqual(['PSR J0250+5854', 'PSR J2144−3933', 'SGR 0418+5729']);
  });

  it('has the fastest pulsar from records.ts, with its period', () => {
    const fastest = FAMOUS_PULSARS.find((p) => p.name === FASTEST_PULSAR.name)!;
    expect(Math.round(1 / fastest.P)).toBe(FASTEST_PULSAR.hertz);
    expect(Math.min(...FAMOUS_PULSARS.map((p) => p.P))).toBe(fastest.P);
  });

  it('registers the pulsar count and NICER’s radii as dated facts', () => {
    expect(AS_OF.pulsars.everyMonths).toBe(12);
    expect(AS_OF.nicer.everyMonths).toBe(24);
    expect(PULSAR_COUNTS.pulsars).toBeGreaterThan(4000);
  });
});

describe('the lighthouse (compact/beam.ts)', () => {
  it('sees a pulse exactly when a beam can reach the line of sight (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: Math.PI / 2, noNaN: true }), fc.double({ min: 0.01, max: Math.PI - 0.01, noNaN: true }), fc.double({ min: 0.05, max: 0.6, noNaN: true }), (alpha, zeta, rho) => {
        const reach = Math.min(Math.abs(alpha - zeta), Math.abs(Math.PI - alpha - zeta)) < rho * 0.97;
        const miss = Math.min(Math.abs(alpha - zeta), Math.abs(Math.PI - alpha - zeta)) > rho * 1.03;
        const pulses = pulseProfile({ alpha, zeta, rho }).pulses.length;
        if (reach) expect(pulses).toBeGreaterThan(0);
        if (miss) expect(pulses).toBe(0);
      }),
      { numRuns: 200 },
    );
  });

  it('makes each pulse as wide as spherical geometry says (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.3, max: 1.4, noNaN: true }), fc.double({ min: -0.8, max: 0.8, noNaN: true }), fc.double({ min: 0.1, max: 0.4, noNaN: true }), (alpha, impact, rho) => {
        const zeta = alpha + impact * rho;
        const p = pulseProfile({ alpha, zeta, rho }, 3600);
        const main = p.pulses.find((q) => q.beam === 1)!;
        expect(Math.abs(main.width - pulseWidth(alpha, zeta, rho))).toBeLessThan(0.01);
      }),
      { numRuns: 60 },
    );
  });

  it('gives an orthogonal rotator a pulse and an interpulse half a turn apart', () => {
    const p = pulseProfile({ alpha: Math.PI / 2, zeta: Math.PI / 2 + 0.05, rho: 0.2 });
    expect(p.pulses).toHaveLength(2);
    const gap = Math.abs(p.pulses[0].centre - p.pulses[1].centre);
    expect(gap).toBeCloseTo(Math.PI, 1);
  });

  it('shows three parts through the middle of the beam, two through its ring and one at its edge', () => {
    expect(pulseProfile({ alpha: 0.5, zeta: 0.52, rho: 0.25 }).pulses[0].peaks).toBe(3);
    expect(pulseProfile({ alpha: 0.5, zeta: 0.62, rho: 0.25 }).pulses[0].peaks).toBe(2);
    expect(pulseProfile({ alpha: 0.5, zeta: 0.7, rho: 0.25 }).pulses[0].peaks).toBe(1);
  });

  it('measures the beam angle as the dot product of two unit vectors', () => {
    const alpha = 0.4;
    const zeta = 1.1;
    const phase = 0.7;
    const m = [Math.sin(alpha) * Math.cos(phase), Math.sin(alpha) * Math.sin(phase), Math.cos(alpha)];
    const los = [Math.sin(zeta), 0, Math.cos(zeta)];
    expect(Math.cos(beamAngle({ alpha, zeta, rho: 0.2 }, phase))).toBeCloseTo(m[0] * los[0] + m[1] * los[1] + m[2] * los[2], 12);
  });
});

describe('Chapter 26 in the course', () => {
  it('is written, with its sections, its Toolkit page and its glossary terms', () => {
    const ch = CHAPTERS.find((c) => c.number === 26)!;
    expect(ch.load).toBeDefined();
    expect(ch.sections).toEqual(['A nucleus the size of a city', 'The heaviest neutron star', 'Lighthouses', 'Clocks that slow down', 'Magnetars']);
    expect(TOOLKIT.find((t) => t.slug === 'vectors')!.load).toBeDefined();
    for (const id of ['equation-of-state', 'millisecond-pulsar', 'magnetar', 'neutron-star', 'pulsar']) expect(GLOSSARY).toHaveProperty(id);
  });

  it('marks the right equations of state in the interactive question', () => {
    const failing = failingAt(HEAVY_MASS);
    expect(checkTooSoft({ ticked: failing }).correct).toBe(true);
    expect(checkTooSoft({ ticked: failing.slice(1) }).correct).toBe(false);
    expect(checkTooSoft({ ticked: [...failing, 'MS1'] }).correct).toBe(false);
    expect(checkTooSoft({ ticked: [] }).correct).toBe(false);
  });
});
