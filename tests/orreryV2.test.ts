import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CLUSTER_DEFAULTS, createClusterHost, type ClusterConfig, type ClusterInfo, type ClusterMessage, type ClusterSample } from '../src/core/nbody/clusterHost';
import { densityCentre, G_CLUSTER, jacobiRadius, galacticTide } from '../src/core/nbody/cluster';
import { COLLISION_PRESETS, STAR_CHOICES, type CollisionConfig } from '../src/core/nbody/collisionHost';
import { kingDensity, kingProfile, kingSphere } from '../src/core/nbody/king';
import { Random } from '../src/core/random';
import {
  DyingStar,
  DYING_SUN_PLANETS,
  EARTH_MASS,
  engulfmentBoundary,
  followPlanet,
  R_SUN_AU,
  starAt,
  SUN_NOW,
  SUN_Z,
  tidalRate,
  tidelessBoundary,
  turnoverTime,
} from '../src/core/orrery/dyingSun';
import { Orrery } from '../src/core/orrery/engine';
import { parentage } from '../src/core/orrery/hierarchy';
import { createOrreryHost, type OrreryMessage, type OrrerySnapshot } from '../src/core/orrery/protocol';
import { einsteinPrecession, LIGHT_AU_DAY, relativityEnergy, withRelativity } from '../src/core/orrery/relativity';
import { gravity } from '../src/core/nbody/system';
import { lifeOf } from '../src/core/stellar/lives';
import { ARCSEC } from '../src/core/units';
import {
  CLUSTER_ORBIT_CHOICES,
  CLUSTER_STAR_CHOICES,
  clusterFromQuery,
  clusterQuery,
  collisionFromQuery,
  collisionQuery,
  HALF_MASS_CHOICES,
  modeFromQuery,
  W0_CHOICES,
} from '../src/lab/orrery/manyLinks';
import { CLUSTER_PRESETS, GALAXY_PRESETS } from '../src/lab/orrery/manyPresets';
import { findPreset } from '../src/lab/orrery/presets';
import { fateWords, sunsDeathModel, sunWords } from '../src/lab/orrery/sunsDeath';
import { expectNear } from './helpers';

const preset = (id: string) => findPreset(id)!.bodies();
const CENTURY = 36_525;

describe('relativity in the Orrery', () => {
  it('pulls towards the heavy body and keeps momentum, for any positions', () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: -5, max: 5, noNaN: true }), { minLength: 9, maxLength: 9 }), (coords) => {
        const gm = Float64Array.from([2.96e-4, 1e-9, 3e-7]);
        const x = Float64Array.from(coords);
        // Keep the bodies apart, so the pulls are finite.
        if (Math.hypot(x[3] - x[0], x[4] - x[1], x[5] - x[2]) < 0.05 || Math.hypot(x[6] - x[0], x[7] - x[1], x[8] - x[2]) < 0.05 || Math.hypot(x[6] - x[3], x[7] - x[4], x[8] - x[5]) < 0.05) return;
        // Relativity's term alone, on top of no gravity at all.
        const extra = new Float64Array(9);
        withRelativity((_x, out) => out.fill(0), gm, 0, 1)(x, extra);
        for (let k = 0; k < 3; k++) {
          const terms = [0, 1, 2].map((b) => gm[b] * extra[3 * b + k]);
          const scale = Math.max(...terms.map(Math.abs));
          expect(Math.abs(terms[0] + terms[1] + terms[2])).toBeLessThanOrEqual(1e-12 * scale);
        }
        // The extra pull on body 1 points at the heavy body; Newton's is added on top unchanged.
        const r = [x[3] - x[0], x[4] - x[1], x[5] - x[2]];
        expect(extra[3] * r[0] + extra[4] * r[1] + extra[5] * r[2]).toBeLessThanOrEqual(0);
        const newton = new Float64Array(9);
        const both = new Float64Array(9);
        gravity(gm)(x, newton);
        withRelativity(gravity(gm), gm, 0, 1)(x, both);
        for (let k = 0; k < 9; k++) expect(both[k]).toBeCloseTo(newton[k] + extra[k], 12);
      }),
      { numRuns: 200 },
    );
  });

  it('turns Mercury’s orbit about the Sun alone by Einstein’s 43″ a century, and not at all without it', () => {
    const sunAndMercury = preset('solar-system').filter((b) => b.id === 'sun' || b.id === 'mercury');
    const orbit = parentage(new Orrery(sunAndMercury).system.gm, new Orrery(sunAndMercury).system.x, new Orrery(sunAndMercury).system.v).orbits[1]!;
    const formula = (einsteinPrecession(new Orrery(sunAndMercury).system.gm[0], orbit.a, orbit.e) * CENTURY) / orbit.period / ARCSEC;
    expectNear(formula, 42.98, 0.02, 'Einstein’s formula for Mercury');
    for (const strength of [0, 1]) {
      const o = new Orrery(sunAndMercury, 'whfast');
      o.setRelativity(strength);
      o.watch('mercury');
      o.advanceTo(2 * CENTURY);
      const rate = (o.precession()!.rate * CENTURY) / ARCSEC;
      expectNear(rate, strength * formula, 0.05, `Mercury’s turning with relativity ${strength}`);
      expect(Math.abs(o.energyError())).toBeLessThan(1e-9);
    }
  });

  it('puts Mercury’s turning at 532″ a century under Newton in the Solar System, and 43″ more with relativity', () => {
    const rates = [0, 1].map((strength) => {
      const o = new Orrery(preset('solar-system'));
      o.setRelativity(strength);
      o.watch('mercury');
      o.advanceTo(3 * CENTURY);
      expect(o.method).toBe('whfast');
      expect(Math.abs(o.energyError())).toBeLessThan(1e-9);
      return (o.precession()!.rate * CENTURY) / ARCSEC;
    });
    // The classic Newtonian share from the planets is 532″; the observed total in this frame, about 575″.
    expectNear(rates[0], 532, 3, 'Newton');
    expectNear(rates[1], 575, 3, 'with relativity');
    expectNear(rates[1] - rates[0], 43, 1, 'relativity’s share');
  });

  it('turns S2’s orbit by 12′ a lap round Sagittarius A*, keeping the energy with relativity’s term', () => {
    const o = new Orrery(preset('s2'));
    o.setRelativity(1);
    o.watch('s2');
    const orbit = parentage(o.system.gm, o.system.x, o.system.v).orbits[1]!;
    expectNear(orbit.a, 1031, 2, 'S2’s semi-major axis, AU');
    expectNear(orbit.period / 365.25, 16.05, 0.02, 'S2’s period, years');
    o.advanceTo(10 * orbit.period);
    const perLap = (o.precession()!.rate * orbit.period) / ARCSEC / 60;
    const formula = (einsteinPrecession(o.system.gm[0], orbit.a, orbit.e) / ARCSEC) * (1 / 60);
    expectNear(formula, 12.16, 0.02, 'Einstein’s formula for S2, arcminutes');
    // A line fitted to ten laps of a staircase overshoots by 1/(2N²), half a per cent.
    expect(Math.abs(perLap / formula - 1)).toBeLessThan(0.01);
    expect(Math.abs(o.energyError())).toBeLessThan(1e-8);
  });

  it('counts relativity’s potential in the energy, and exaggerates the turning a hundredfold on request', () => {
    const o = new Orrery(preset('s2'));
    o.setRelativity(100);
    o.watch('s2');
    const orbit = parentage(o.system.gm, o.system.x, o.system.v).orbits[1]!;
    o.advanceTo(6 * orbit.period);
    const ratio = (o.precession()!.rate * orbit.period) / einsteinPrecession(o.system.gm[0], orbit.a, orbit.e);
    // The extra potential's own higher-order terms make a hundredfold correction turn the orbit a little more than 100 times.
    expect(ratio).toBeGreaterThan(95);
    expect(ratio).toBeLessThan(120);
    expect(Math.abs(o.energyError())).toBeLessThan(1e-6);
    expect(relativityEnergy(o.system.gm, o.system.x, 0, 1)).toBeLessThan(0);
    expect(LIGHT_AU_DAY).toBeCloseTo(173.1446, 4);
  });
});

describe('the Orrery switching back after a close pass', () => {
  it('moves to IAS15 for the comets’ passes, then back to Wisdom–Holman once they are well clear', () => {
    const o = new Orrery(preset('comet').filter((b) => b.id !== 'comet-3'));
    expect(o.method).toBe('whfast');
    o.advanceTo(400);
    expect(o.method).toBe('ias15');
    o.advanceTo(8000);
    expect(o.method).toBe('whfast');
    const switches = o.events.filter((e) => e.kind === 'method').map((e) => e.text);
    expect(switches[0]).toMatch(/switched to IAS15/);
    expect(switches[switches.length - 1]).toBe('The close pass is over: switched back to Wisdom–Holman.');
    expect(Math.abs(o.energyError())).toBeLessThan(1e-7);
  });

  it('stays on IAS15 while a comet is caught by Jupiter', () => {
    const o = new Orrery(preset('comet'));
    o.advanceTo(6000);
    expect(o.method).toBe('ias15');
  });
});

describe('the Sun’s death', () => {
  const track = lifeOf(1, SUN_Z, { windScale: 1 });

  it('follows SSE’s Sun: a red giant 0.86 AU in radius at 12.33 billion years, a white dwarf of about half its mass', () => {
    const tip = track.steps.filter((s) => s.kw === 3).reduce((a, b) => (b.R > a.R ? b : a));
    expectNear(tip.R * R_SUN_AU, 0.864, 0.01, 'the red giant’s tip, AU');
    expectNear(tip.t, 12_326, 5, 'when, Myr');
    expectNear(tip.mt, 0.764, 0.01, 'its mass then');
    expectNear(starAt(track, 13_000).mass, 0.52, 0.01, 'the white dwarf');
    // The turnover time at the tip is about half a year.
    const t = turnoverTime(starAt(track, tip.t));
    expect(t).toBeGreaterThan(0.3);
    expect(t).toBeLessThan(0.7);
  });

  it('widens an orbit as the Sun loses mass, keeping a × M, when there is no tide', () => {
    for (const a0 of [1, 1.5, 3, 5.2]) {
      const path = followPlanet(track, a0, EARTH_MASS, 0);
      expect(path.engulfed).toBeNull();
      const m0 = starAt(track, SUN_NOW).mass;
      const m1 = starAt(track, track.steps[track.steps.length - 1].t).mass;
      expectNear(path.final, (a0 * m0) / m1, 1e-9 * a0, `a × M kept from ${a0} AU`);
    }
  });

  it('swallows a planet without tides exactly when the Sun reaches its widened orbit', () => {
    const line = tidelessBoundary(track);
    expect(followPlanet(track, line * 0.995, EARTH_MASS, 0).engulfed).not.toBeNull();
    expect(followPlanet(track, line * 1.005, EARTH_MASS, 0).engulfed).toBeNull();
    expectNear(engulfmentBoundary(track, EARTH_MASS, 0), line, 0.002, 'the boundary without tides');
  });

  it('pulls planets in with the tide, more strongly the heavier they are and the closer the Sun’s surface', () => {
    const star = starAt(track, 12_320);
    expect(tidalRate(star, 1.3, 1e-3)).toBeGreaterThan(tidalRate(star, 1.3, EARTH_MASS));
    expect(tidalRate(star, 1.0, EARTH_MASS)).toBeGreaterThan(tidalRate(star, 1.3, EARTH_MASS));
    expectNear(tidalRate(star, 1.0, EARTH_MASS) / tidalRate(star, 1.0 * 2 ** (1 / 8), EARTH_MASS), 2, 0.3, 'the (R/a)⁸ cliff');
    expect(tidalRate(starAt(track, SUN_NOW), 1, EARTH_MASS)).toBeLessThan(1e-12);
    expect(tidalRate(star, 1, EARTH_MASS, 0)).toBe(0);
  });

  it('puts the line for a Jupiter between Nordhaus et al.’s 1.6 AU and Mustill and Villaver’s 2.7 AU, with Reimers’s earlier winds', () => {
    // Mustill & Villaver (2012) find 2.7 AU with mass lost late on the AGB (Vassiliadis & Wood), and say Reimers-type winds, which
    // take mass earlier, let planets slip out of the tide's reach; they quote 1.6 AU from Nordhaus et al. (2010).
    const jupiter = engulfmentBoundary(track, 317.83 * EARTH_MASS, 1);
    expect(jupiter).toBeGreaterThan(1.6);
    expect(jupiter).toBeLessThan(2.7);
    const earth = engulfmentBoundary(track, EARTH_MASS, 1);
    expect(earth).toBeLessThan(jupiter);
    // Earth escapes, by about 6%.
    expect(earth).toBeGreaterThan(0.9);
    expect(earth).toBeLessThan(1);
  });

  it('swallows Mercury and Venus and lets Earth escape with SSE’s winds and the tide × 1; a tide ten times stronger takes Earth too', () => {
    const fates = (tide: number, wind = 1) => {
      const t = lifeOf(1, SUN_Z, { windScale: wind });
      return Object.fromEntries(DYING_SUN_PLANETS.map((p) => [p.id, followPlanet(t, p.a, p.mass * EARTH_MASS, tide)]));
    };
    const fiducial = fates(1);
    expect(fiducial.mercury.engulfed).not.toBeNull();
    expect(fiducial.venus.engulfed).not.toBeNull();
    expect(fiducial.earth.engulfed).toBeNull();
    expectNear(fiducial.earth.final, 1.71, 0.02, 'Earth’s last orbit, AU');
    expect(fiducial.mars.engulfed).toBeNull();
    expect(fates(10).earth.engulfed).not.toBeNull();
    expect(fates(1, 0.5).earth.engulfed).not.toBeNull();
    expect(fates(0).venus.engulfed).toBeNull();
  });

  it('paces the Sun’s clock so each change is slow beside the orbits it touches', () => {
    const dying = new DyingStar(track, 12_320, 1);
    const planets = [
      { a: 1.3, m: EARTH_MASS, period: 2 * Math.PI * Math.sqrt(1.3 ** 3 / (0.76 * 2.959e-4)) },
      { a: 6.8, m: 1e-3, period: 2 * Math.PI * Math.sqrt(6.8 ** 3 / (0.76 * 2.959e-4)) },
    ];
    const pace = dying.pace(planets);
    expect(pace).toBeGreaterThan(0);
    expect(pace).toBeLessThanOrEqual(DyingStar.MAX_PACE);
    const r = dying.rates();
    expect(Math.abs(r.mass) * pace * planets[1].period).toBeLessThanOrEqual(DyingStar.SHARE * 1.000001);
    // Swelling near the planets: its radius is paced by the outermost lap too.
    expect(r.radius).toBeGreaterThan(0);
    expect(r.radius * pace * planets[1].period).toBeLessThanOrEqual(DyingStar.SHARE * 1.000001);
  });

  it('runs real planets round the dying Sun in the n-body engine, in step with the averaged model', { timeout: 30_000 }, () => {
    // The Sun, Venus, Earth and Mars from the preset (Mercury's short laps and Jupiter's long ones would only slow the test).
    const o = new Orrery(
      preset('suns-death').filter((b) => ['sun', 'venus', 'earth', 'mars'].includes(b.id)),
      'whfast',
    );
    o.setDyingStar(new DyingStar(track, SUN_NOW, 1));
    let steps = 0;
    while (o.dying!.age < o.dying!.end - 1e-6 && steps < 3e6) {
      o.step();
      steps++;
    }
    expect(o.ids).toEqual(['sun', 'earth', 'mars']);
    const swallowed = o.events.filter((e) => e.kind === 'engulfed').map((e) => e.text);
    expect(swallowed).toHaveLength(1);
    expect(swallowed[0]).toMatch(/^The Sun swallowed Venus, 12\.32\d billion years after its birth, when its radius reached 0\.\d\d AU\.$/);
    const p = parentage(o.system.gm, o.system.x, o.system.v);
    for (const [id, a0, mass] of [['earth', 1, 1.0123], ['mars', 1.5237, 0.1074]] as const) {
      const orbit = p.orbits[o.ids.indexOf(id)]!;
      const averaged = followPlanet(track, a0, mass * EARTH_MASS, 1);
      expectNear(orbit.a, averaged.final, 0.01 * averaged.final, `${id}’s orbit, n-body against averaged`);
    }
    expectNear(o.system.gm[0] / 2.959_122_082_855_911e-4, 0.52, 0.01, 'the white dwarf’s mass');
    expect(Number.isNaN(o.energyError())).toBe(true);
  });

  it('describes the Sun and the planets’ fates in words', () => {
    const model = sunsDeathModel(1, 1);
    expect(model.paths.map((p) => p.id)).toEqual(['mercury', 'venus', 'earth', 'mars', 'jupiter']);
    expect(fateWords('Venus', model.paths[1].path)).toMatch(/^Venus is swallowed 12\.32\d billion years after the Sun’s birth\.$/);
    expect(fateWords('Earth', model.paths[2].path)).toMatch(/^Earth survives, ending 1\.7\d AU from the white dwarf; the Sun’s surface reached \d+% of the way to its orbit\.$/);
    expect(sunWords(starAt(track, 12_326))).toMatch(/^The Sun at 12\.326 billion years old: red giant, 1\d\d times its present radius/);
    expect(sunWords(starAt(track, SUN_NOW))).toMatch(/^The Sun at 4\.57 billion years old: main sequence, (0\.9\d|1\.0) times its present radius/);
    expect(model.todayMass).toBeGreaterThan(0.999);
  });
});

describe('King models', () => {
  it('have King’s concentrations: c = 0.67, 1.26 and 2.12 for W₀ = 3, 6 and 9', () => {
    expectNear(kingProfile(3).concentration, 0.67, 0.01, 'W₀ = 3');
    expectNear(kingProfile(6).concentration, 1.26, 0.01, 'W₀ = 6');
    expectNear(kingProfile(9).concentration, 2.12, 0.01, 'W₀ = 9');
  });

  it('join the density’s series and formula smoothly, and enclose all their mass at the tidal radius', () => {
    const below = kingDensity(0.019999);
    const above = kingDensity(0.020001);
    expect(Math.abs(above / below - 1)).toBeLessThan(1e-3);
    const p = kingProfile(6);
    expect(p.mass[p.mass.length - 1]).toBe(1);
    for (let k = 1; k < p.mass.length; k++) expect(p.mass[k]).toBeGreaterThanOrEqual(p.mass[k - 1] - 1e-12);
  });

  it('sample spheres in balance, every star slower than escape, with the half-mass radius asked for', () => {
    const masses = new Float64Array(2000).fill(0.5);
    const k = kingSphere(masses, 6, { halfMass: 2 }, new Random(3));
    let kinetic = 0;
    let potential = 0;
    const r: number[] = [];
    for (let i = 0; i < 2000; i++) {
      kinetic += 0.25 * (k.v[3 * i] ** 2 + k.v[3 * i + 1] ** 2 + k.v[3 * i + 2] ** 2);
      r.push(Math.hypot(k.x[3 * i], k.x[3 * i + 1], k.x[3 * i + 2]));
      for (let j = i + 1; j < 2000; j++) potential -= (G_CLUSTER * 0.25) / Math.hypot(k.x[3 * i] - k.x[3 * j], k.x[3 * i + 1] - k.x[3 * j + 1], k.x[3 * i + 2] - k.x[3 * j + 2]);
    }
    expectNear(kinetic / -potential, 0.5, 0.03, 'virial ratio');
    r.sort((a, b) => a - b);
    expectNear(r[999], 2, 0.15, 'half-mass radius, pc');
    expect(r[1999]).toBeLessThanOrEqual(k.profile.tidal * k.r0 * 1.05);
  });

  it('fill their Jacobi radius in the Galaxy’s tide', () => {
    const masses = new Float64Array(500).fill(0.5);
    const tide = galacticTide(8.2);
    const rJ = jacobiRadius(250, tide);
    const k = kingSphere(masses, 6, { tidal: rJ }, new Random(1));
    expectNear(k.profile.tidal * k.r0, rJ, 1e-9, 'tidal radius');
  });
});

describe('the Orrery’s clusters', () => {
  const run = (config: ClusterConfig, t: number) => {
    const samples: ClusterSample[] = [];
    let info: ClusterInfo | null = null;
    const h = createClusterHost((m: ClusterMessage) => {
      if (m.type === 'loaded') info = m;
      else if (m.type === 'state') samples.push(...m.samples);
    });
    h.receive({ type: 'load', config });
    h.receive({ type: 'advance', t });
    return { info: info!, samples };
  };

  it('run alone in space: everything bound, radii in order from the dense core, energy kept, balance held', () => {
    const { info, samples } = run({ n: 250, masses: 'equal', orbit: 8.2, halfMass: 2, seed: 2, tide: false, model: 'king', w0: 6 }, 40);
    expect(info.tide).toBeNull();
    expect(info.jacobi).toBe(Infinity);
    for (const s of samples) {
      expect(s.bound).toBe(1);
      expect(s.core[0]).toBeLessThan(s.core[1]);
      expect(s.core[1]).toBeLessThan(s.core[2]);
      expect(s.core[2]).toBeLessThan(s.core[3]);
      expect(Math.abs(s.energyError)).toBeLessThan(1e-4);
      expect(s.virial).toBeGreaterThan(0.4);
      expect(s.virial).toBeLessThan(0.6);
    }
    expectNear(info.halfMass, 2, 1e-9, 'half-mass radius');
  });

  it('find a clump’s density centre where the centre of mass misses it', () => {
    const random = new Random(5);
    const n = 600;
    const mass = new Float64Array(n).fill(1);
    const x = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
      // A tight clump at (5, 0, 0) and a wide spray of stars round the origin.
      const clump = i < 200;
      for (let k = 0; k < 3; k++) x[3 * i + k] = (clump ? 0.1 : 20) * random.uniform(-1, 1) + (clump && k === 0 ? 5 : 0);
    }
    const all = Array.from({ length: n }, (_, i) => i);
    const c = densityCentre(mass, x, all, [0, 0, 0]);
    expectNear(c[0], 5, 0.1, 'x');
    expectNear(c[1], 0, 0.1, 'y');
  });

  it('have presets that build, and a softening of a fiftieth of their half-mass radius', () => {
    for (const p of CLUSTER_PRESETS) {
      const { info } = run(p.config, 0);
      expect(info.config.n).toBe(p.config.n);
      expectNear(info.softening, info.halfMass / 50, 1e-12, p.id);
    }
    expect(CLUSTER_DEFAULTS.tide).toBeUndefined();
  });
});

describe('the Orrery’s links', () => {
  it('give a cluster’s settings back from its link, for every choice', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CLUSTER_STAR_CHOICES),
        fc.constantFrom('equal' as const, 'kroupa' as const),
        fc.constantFrom(...CLUSTER_ORBIT_CHOICES),
        fc.constantFrom(...HALF_MASS_CHOICES),
        fc.option(fc.constantFrom(...W0_CHOICES), { nil: undefined }),
        fc.boolean(),
        fc.integer({ min: 1, max: 1000 }),
        (n, masses, orbit, halfMass, w0, tide, seed) => {
          const config: ClusterConfig = { n, masses, orbit, halfMass, seed, ...(w0 ? { model: 'king' as const, w0 } : {}), ...(tide ? {} : { tide: false }) };
          expect(clusterFromQuery(new URLSearchParams(clusterQuery(config)))).toEqual(config);
        },
      ),
    );
  });

  it('hold a cluster link’s odd values to the lab’s choices', () => {
    const c = clusterFromQuery(new URLSearchParams('n=99999&masses=odd&orbit=-3&rh=1e9&model=king&w0=50&seed=-7'));
    expect(c).toEqual({ n: 2000, masses: 'kroupa', orbit: 4, halfMass: 4, seed: 7, model: 'king', w0: 9 });
  });

  it('give an encounter’s settings back from its link, presets and changes alike', () => {
    for (const p of GALAXY_PRESETS) {
      const config: CollisionConfig = { ...COLLISION_PRESETS[p], stars: 20_000, seed: 1 };
      expect(collisionFromQuery(new URLSearchParams(collisionQuery(config)))).toEqual(config);
    }
    fc.assert(
      fc.property(
        fc.constantFrom(...GALAXY_PRESETS),
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 3, max: 20 }),
        fc.integer({ min: 0, max: 18 }),
        fc.boolean(),
        fc.constantFrom(...STAR_CHOICES),
        (p, ratio, peri, e, tilt, friction, stars) => {
          const base = COLLISION_PRESETS[p];
          const config: CollisionConfig = { ...base, massRatio: ratio / 20, pericentre: peri, eccentricity: e / 10, main: { ...base.main, tilt: tilt * 5 }, friction, stars, seed: 1 };
          expect(collisionFromQuery(new URLSearchParams(collisionQuery(config)))).toEqual(config);
        },
      ),
    );
  });

  it('read the mode, and open Figure 31.1’s ring without a companion disc', () => {
    expect(modeFromQuery(new URLSearchParams('mode=cluster'))).toBe('cluster');
    expect(modeFromQuery(new URLSearchParams('mode=galaxies'))).toBe('galaxies');
    expect(modeFromQuery(new URLSearchParams('mode=nonsense'))).toBe('planets');
    const ring = collisionFromQuery(new URLSearchParams('encounter=ring&ctilt=none'));
    expect(ring.companion).toBeNull();
    expect(ring.preset).toBe('ring');
  });
});

describe('the Orrery’s protocol, version 2', () => {
  const host = () => {
    const messages: OrreryMessage[] = [];
    const h = createOrreryHost((m) => messages.push(m), () => performance.now());
    const last = () => messages.filter((m): m is OrrerySnapshot => m.type === 'state').pop()!;
    return { h, messages, last };
  };

  it('loads with relativity and a watched body, and switches relativity by message', () => {
    const { h, last, messages } = host();
    h.receive({ type: 'load', bodies: preset('s2'), method: 'auto', relativity: 1, watch: 's2' });
    expect(last().relativity).toBe(1);
    expect(last().precession?.id).toBe('s2');
    h.receive({ type: 'relativity', strength: 0 });
    expect(last().relativity).toBe(0);
    h.receive({ type: 'watch', id: null });
    expect(last().precession).toBeNull();
    const events = messages.flatMap((m) => (m.type === 'state' ? m.events : []));
    expect(events.some((e) => e.text === 'Relativity off: Newton’s gravity alone.')).toBe(true);
  });

  it('loads the Sun’s death with the Sun’s state in every snapshot', () => {
    const { h, last } = host();
    h.receive({ type: 'load', bodies: preset('suns-death'), method: 'whfast', dying: { windScale: 1, tide: 1 } });
    const s = last();
    expect(s.star).not.toBeNull();
    expectNear(s.star!.t, SUN_NOW, 1e-9, 'the Sun’s age at the start');
    expectNear(s.star!.mass, 1, 1e-3, 'its mass');
    expectNear(s.radii[0], s.star!.radius, 1e-12, 'the Sun drawn at its size');
    expect(s.events).toHaveLength(0);
    h.receive({ type: 'advance', days: 20_000 });
    expect(last().star!.t).toBeGreaterThan(SUN_NOW);
  });
});
