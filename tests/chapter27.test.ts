import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AU, C, G, GM_SUN, L_SUN, M_SUN } from '../src/core/constants';
import { accretionEfficiency, discLuminosity, eddingtonLuminosity, FUELS, iscoRadius, makeDisc, maxTemperatureFactor } from '../src/core/gr/disc';
import {
  CAPTURE_IMPACT,
  circularOrbit,
  circularOrbits,
  classify,
  closestApproach,
  deflection,
  effectivePotential,
  orbitWithTurningPoints,
  potentialEnergy,
  newtonPotentialEnergy,
  precessionPerOrbit,
  shadowDiameter,
  traceOrbit,
  traceRay,
  weakFieldDeflection,
  weakFieldPrecession,
} from '../src/core/gr/schwarzschild';
import { carlsonRF, ellipticK } from '../src/core/math/elliptic';
import { cross, dot, norm } from '../src/core/math/vec3';
import { checkIsco } from '../src/content/checks/chapter27Answers';
import { bandOf, discFor, ORBIT_PRESETS, orbitPair, positionAt, spectrumOf, SUN_IMPACT, turnedBy } from '../src/figures/blackHoles';
import { GLOSSARY } from '../src/site/glossary';
import { CHAPTERS, TOOLKIT } from '../src/site/course';

const rel = (a: number, b: number) => Math.abs(a / b - 1);
const ARCSEC = Math.PI / (180 * 3600);
const MICROARCSEC = ARCSEC * 1e-6;
const PARSEC = 3.0857e16;

describe('elliptic integrals (math/elliptic.ts)', () => {
  it('gives K(0) = π/2, K(1/√2) = 1.854075 and Carlson’s R_F(1, 2, 0) = 1.3110288', () => {
    expect(ellipticK(0)).toBeCloseTo(Math.PI / 2, 14);
    expect(ellipticK(Math.SQRT1_2)).toBeCloseTo(1.8540746773, 9);
    expect(carlsonRF(1, 2, 0)).toBeCloseTo(1.3110287771461, 10);
  });
});

describe('orbits round a black hole (gr/schwarzschild.ts)', () => {
  it('puts the innermost stable orbit at 6GM/c², with L² = 12 and E = √(8/9)', () => {
    const c = circularOrbit(6);
    expect(c.L ** 2).toBeCloseTo(12, 12);
    expect(c.E).toBeCloseTo(Math.sqrt(8 / 9), 12);
    const both = circularOrbits(Math.sqrt(12))!;
    expect(both.stable).toBeCloseTo(6, 9);
    expect(both.unstable).toBeCloseTo(6, 9);
    expect(circularOrbits(3.4)).toBeNull();
  });

  it('puts circular orbits where the effective potential is flat, and the energy of each on it (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 3.2, max: 200, noNaN: true }), (r) => {
        const { L, E } = circularOrbit(r);
        const h = r * 1e-5;
        const slope = (effectivePotential(r + h, L) - effectivePotential(r - h, L)) / (2 * h);
        expect(Math.abs(slope)).toBeLessThan(1e-7);
        expect(effectivePotential(r, L)).toBeCloseTo(E * E, 10);
      }),
    );
  });

  it('adds exactly −L²/r³ to Newton’s potential', () => {
    expect(potentialEnergy(10, 4) - newtonPotentialEnergy(10, 4)).toBeCloseTo(-16 / 1000, 14);
  });

  it('gives a precession that matches the weak-field rule far out and exceeds it close in', () => {
    expect(rel(precessionPerOrbit(1000, 3000), weakFieldPrecession(1000, 3000))).toBeLessThan(0.004);
    expect(precessionPerOrbit(10, 30)).toBeGreaterThan(1.4 * weakFieldPrecession(10, 30));
  });

  it('precesses by the exact amount when the orbit is stepped: the closest point moves on by the elliptic integral’s angle', () => {
    const { E, L } = orbitWithTurningPoints(10, 30);
    const orbit = traceOrbit(E, L, { turns: 3, dphi: 0.001 });
    const angles: number[] = [];
    const p = orbit.points;
    for (let i = 1; i < p.length - 1; i++) if (p[i].r < p[i - 1].r && p[i].r <= p[i + 1].r) angles.push(Math.atan2(p[i].y, p[i].x));
    let step = angles[1] - angles[0];
    while (step < 0) step += 2 * Math.PI;
    expect(Math.abs(step - orbit.precession!)).toBeLessThan(0.003);
  });

  it('gives Mercury 43″ a century and S2 12′ an orbit, by the weak-field rule', () => {
    const a = 0.387098 * AU;
    const e = 0.20563;
    const perOrbit = (6 * Math.PI * GM_SUN) / (C * C * a * (1 - e * e));
    const orbitsPerCentury = 36525 / 87.9691;
    expect(perOrbit * orbitsPerCentury / ARCSEC).toBeCloseTo(42.98, 1);
    // S2 (GRAVITY 2020): a = 1,031 AU (0.1255″ at 8.25 kpc), e = 0.8847, 4.26 million Suns.
    const aS2 = 0.1255 * 8248.6 * AU;
    const s2 = (6 * Math.PI * GM_SUN * 4.261e6) / (C * C * aS2 * (1 - 0.8847 ** 2));
    expect(s2 / ARCSEC / 60).toBeCloseTo(12.1, 1);
  });

  it('classifies the figure’s presets as their names say', () => {
    const kinds = Object.fromEntries(ORBIT_PRESETS.map((p) => [p.id, classify(p.E, p.L).kind]));
    expect(kinds).toEqual({ far: 'bound', precessing: 'bound', whirl: 'bound', isco: 'circular', plunge: 'plunge', flyby: 'flyby' });
    const whirl = ORBIT_PRESETS.find((p) => p.id === 'whirl')!;
    expect(traceOrbit(whirl.E, whirl.L).precession!).toBeGreaterThan(Math.PI);
  });

  it('sends a plunging orbit through the horizon, and Newton’s from the same start back out', () => {
    const p = ORBIT_PRESETS.find((q) => q.id === 'plunge')!;
    const pair = orbitPair(p.E, p.L);
    expect(pair.relativity.fellIn).toBe(true);
    expect(Math.min(...pair.newton.points.map((q) => q.r))).toBeGreaterThan(2);
  });

  it('nearly agrees with Newton far away: after a turn the bodies are apart by the precession, 2.7°, and no more', () => {
    const far = ORBIT_PRESETS.find((q) => q.id === 'far')!;
    const pair = orbitPair(far.E, far.L);
    const t = pair.newton.points.find((q, i) => i > 10 && Math.atan2(q.y, q.x) > 0 && Math.atan2(pair.newton.points[i - 1].y, pair.newton.points[i - 1].x) < 0)!.t;
    const a = positionAt(pair.relativity, t);
    const b = positionAt(pair.newton, t);
    const precession = pair.relativity.precession!;
    expect((precession * 180) / Math.PI).toBeCloseTo(2.7, 1);
    // At the far end of the orbit the closest point's shift moves the body about precession × 600 GM/c².
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1.5 * precession * 600);
  });

  it('turns a fly-past by more the closer it comes', () => {
    const turn = (L: number) => turnedBy(traceOrbit(1.01, L, { turns: 2 }));
    expect(turn(4.6)).toBeGreaterThan(turn(6));
  });

  it('gives a body the same energy at both turning points (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 7, max: 60, noNaN: true }), fc.double({ min: 1.1, max: 5, noNaN: true }), (rp, ratio) => {
        const ra = rp * ratio;
        const { E, L } = orbitWithTurningPoints(rp, ra);
        expect(effectivePotential(rp, L)).toBeCloseTo(E * E, 10);
      }),
    );
  });
});

describe('light round a black hole', () => {
  it('captures light aimed within √27 GM/c², and lets wider rays out', () => {
    expect(closestApproach(CAPTURE_IMPACT * 0.999)).toBeNull();
    expect(closestApproach(CAPTURE_IMPACT * (1 + 1e-6))!).toBeCloseTo(3, 1);
    expect(traceRay(5).captured).toBe(true);
    expect(traceRay(5.5).captured).toBe(false);
  });

  it('bends light by 4GM/c²b + 15πG²M²/4c⁴b² far out, to second order (the third is 128/3b³)', () => {
    for (const b of [300, 1000, 10_000]) expect(rel(deflection(b), 4 / b + (15 * Math.PI) / (4 * b * b))).toBeLessThan(12 / b ** 2);
  });

  it('bends light more the closer it passes, without limit at the capture edge (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 5.3, max: 500, noNaN: true }), (b) => {
        expect(deflection(b)).toBeGreaterThan(deflection(b * 1.05));
        expect(deflection(b)).toBeGreaterThan(weakFieldDeflection(b));
      }),
    );
    expect(deflection(CAPTURE_IMPACT * 1.000001)).toBeGreaterThan(4 * Math.PI);
  });

  it('agrees with a traced ray’s final direction', () => {
    const ray = traceRay(10, { from: 5000, to: 5000, dpsi: 0.001 });
    const [p, q] = ray.points.slice(-2);
    expect(Math.atan2(q.y - p.y, q.x - p.x)).toBeCloseTo(-deflection(10), 5);
  });

  it('bends starlight at the Sun’s edge by 1.75″', () => {
    expect(SUN_IMPACT * 1476.625).toBeCloseTo(6.957e8, -3);
    expect(deflection(SUN_IMPACT) / ARCSEC).toBeCloseTo(1.75, 2);
  });

  it('gives the shadows the chapter quotes: 53 µas for Sagittarius A*, 40 µas for M87*', () => {
    expect(shadowDiameter(4.3e6 * M_SUN, 8277 * PARSEC) / MICROARCSEC).toBeCloseTo(53.3, 0);
    expect(shadowDiameter(6.5e9 * M_SUN, 16.8e6 * PARSEC) / MICROARCSEC).toBeCloseTo(39.7, 0);
  });

  it('gives the chapter’s horizon sizes: 2.95 km per Sun, 12.7 million km for 4.3 million Suns', () => {
    expect((2 * G * M_SUN) / C ** 2 / 1000).toBeCloseTo(2.95, 2);
    expect((2 * G * 4.3e6 * M_SUN) / C ** 2 / 1e9).toBeCloseTo(12.7, 1);
  });
});

describe('accretion discs (gr/disc.ts)', () => {
  it('moves the innermost stable orbit from 6 to 1 GM/c² as the spin rises, through 1.237 at Thorne’s 0.998', () => {
    expect(iscoRadius(0)).toBeCloseTo(6, 12);
    expect(iscoRadius(1)).toBeCloseTo(1, 9);
    expect(iscoRadius(0.998)).toBeCloseTo(1.237, 3);
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.99, noNaN: true }), (a) => {
        expect(iscoRadius(a + 0.005)).toBeLessThan(iscoRadius(a));
      }),
    );
  });

  it('gives the brief’s efficiencies: 5.7%, 32% and 42%', () => {
    expect(accretionEfficiency(0)).toBeCloseTo(1 - Math.sqrt(8 / 9), 12);
    expect(accretionEfficiency(0) * 100).toBeCloseTo(5.72, 2);
    expect(accretionEfficiency(0.998) * 100).toBeCloseTo(32.1, 1);
    expect(accretionEfficiency(1) * 100).toBeCloseTo(42.3, 1);
  });

  it('gives the Eddington luminosity: 1.26 × 10³¹ W, 33,000 Suns, per solar mass', () => {
    expect(eddingtonLuminosity(M_SUN) / 1e31).toBeCloseTo(1.26, 2);
    expect(Math.round(eddingtonLuminosity(M_SUN) / L_SUN / 1000)).toBe(33);
  });

  it('adds the disc’s rings up to its luminosity', () => {
    for (const d of [makeDisc(10 * M_SUN, 0, 0.3), makeDisc(1e8 * M_SUN, 0.9, 1)]) expect(rel(discLuminosity(d), d.luminosity)).toBeLessThan(0.01);
  });

  it('heats the inner disc to about 10⁷ K round 10 Suns and 10⁵ K round 10⁸, as T ∝ M^−¼ (property)', () => {
    expect(makeDisc(10 * M_SUN, 0, 1).tMax).toBeGreaterThan(5e6);
    expect(makeDisc(10 * M_SUN, 0, 1).tMax).toBeLessThan(1.5e7);
    expect(makeDisc(1e8 * M_SUN, 0, 1).tMax).toBeGreaterThan(5e4);
    expect(makeDisc(1e8 * M_SUN, 0, 1).tMax).toBeLessThan(3e5);
    expect(maxTemperatureFactor()).toBeCloseTo(0.488, 3);
    fc.assert(
      fc.property(fc.double({ min: 0, max: 8, noNaN: true }), (lm) => {
        const ratio = makeDisc(10 ** (lm + 1) * M_SUN, 0, 0.5).tMax / makeDisc(10 ** lm * M_SUN, 0, 0.5).tMax;
        expect(ratio).toBeCloseTo(10 ** -0.25, 9);
      }),
    );
  });

  it('makes the stellar disc shine in X-rays and the quasar’s in ultraviolet', () => {
    const peak = (id: string) => spectrumOf(discFor(id, 0, 0.3)).reduce((a, b) => (b.nuLnu > a.nuLnu ? b : a)).wavelength;
    expect(bandOf(peak('stellar'))).toBe('X-rays');
    expect(bandOf(peak('quasar'))).toBe('ultraviolet');
  });

  it('orders the fuels: falling onto a neutron star beats a black hole that doesn’t spin, and fusion gives 0.71%', () => {
    const e = Object.fromEntries(FUELS.map((f) => [f.id, f.efficiency]));
    expect(e['neutron-star']).toBeGreaterThan(e.bh0);
    expect(e.fusion * 100).toBeCloseTo(0.71, 2);
    expect(e.fission * 100).toBeCloseTo(0.091, 3);
    const sorted = [...FUELS].sort((a, b) => a.efficiency - b.efficiency).map((f) => f.id);
    expect(sorted).toEqual(FUELS.map((f) => f.id));
  });
});

describe('vectors (Toolkit T7)', () => {
  it('makes the cross product perpendicular to both, as long as the parallelogram’s area, and the dot product |a||b|cos θ (property)', () => {
    const v = fc.tuple(fc.double({ min: -5, max: 5, noNaN: true }), fc.double({ min: -5, max: 5, noNaN: true }), fc.double({ min: -5, max: 5, noNaN: true }));
    fc.assert(
      fc.property(v, v, (a, b) => {
        const c = cross(a, b);
        expect(Math.abs(dot(c, a))).toBeLessThan(1e-9);
        expect(Math.abs(dot(c, b))).toBeLessThan(1e-9);
        const na = norm(a);
        const nb = norm(b);
        if (na < 1e-3 || nb < 1e-3) return;
        const cos = dot(a, b) / (na * nb);
        expect(norm(c)).toBeCloseTo(na * nb * Math.sqrt(Math.max(0, 1 - cos * cos)), 6);
      }),
    );
  });
});

describe('Chapter 27 in the course', () => {
  it('is written, with its sections and glossary terms; Chapter 28 is not yet', () => {
    const ch = CHAPTERS.find((c) => c.number === 27)!;
    expect(ch.load).toBeDefined();
    expect(ch.sections).toEqual(['Where escape needs light speed', 'Orbits near a black hole', 'Light near a black hole', 'The brightest engines', 'Seeing the shadow']);
    expect(CHAPTERS.find((c) => c.number === 28)!.load).toBeUndefined();
    expect(TOOLKIT.find((t) => t.code === 'T7')!.load).toBeDefined();
    for (const id of ['innermost-stable-orbit', 'photon-sphere', 'accretion-disc', 'black-hole']) expect(GLOSSARY).toHaveProperty(id);
  });

  it('marks the interactive question: 6GM/c², within a quarter', () => {
    expect(checkIsco({ radius: 6 }).correct).toBe(true);
    expect(checkIsco({ radius: 6.2 }).correct).toBe(true);
    expect(checkIsco({ radius: 5.5 }).correct).toBe(false);
    expect(checkIsco({ radius: 3 }).correct).toBe(false);
    expect(checkIsco({ radius: 7 }).correct).toBe(false);
  });
});
