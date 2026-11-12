import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { visualPosition } from '../src/core/binaries/visual';
import { sampleGalaxy, GALAXY_POINTS } from '../src/core/galaxy/model';
import {
  concentration,
  exponentialDiscSpeed,
  fitHalo,
  G_GALAXY,
  haloRadius,
  hernquistSpeed,
  massInside,
  nfwMassInside,
  nfwSpeed,
  pointMassSpeed,
  totalSpeed,
} from '../src/core/galaxy/rotation';
import { keplerMass, nextPericentre, orbitAt, pericentre, precessionPerOrbit, relativisticRedshift, toArcmin, yearLabel } from '../src/core/galaxy/s2';
import { angularSpeed, armStars, innerLindbladSpeed, kalnajsOvals, ovalStars, windArms, windingPitch } from '../src/core/galaxy/spiral';
import { besselI0, besselI1, besselK0, besselK1 } from '../src/core/math/bessel';
import {
  ClusterSim,
  crossingTime,
  G_CLUSTER,
  galacticTide,
  jacobiRadius,
  KMS,
  KROUPA,
  kroupaMasses,
  kroupaMeanMass,
  plummerSphere,
  PLUMMER_HALF_MASS,
  readCluster,
  relaxationTime,
  tidalStrength,
} from '../src/core/nbody/cluster';
import { buildCluster, CLUSTER_DEFAULTS, createClusterHost, type ClusterMessage } from '../src/core/nbody/clusterHost';
import { Random } from '../src/core/random';
import { ARCSEC } from '../src/core/units';
import { checkWeighing, WEIGH_START } from '../src/content/checks/chapter30Answers';
import { AS_OF } from '../src/data/asOf';
import { MILKY_WAY, MILKY_WAY_CURVES, MILKY_WAY_MODEL, ROTATION_DEBATE, SPARC_GALAXIES } from '../src/data/galaxy';
import { SGR_A_STAR, S2_ORBIT } from '../src/data/s2';
import { TIMELINE } from '../src/data/timeline';
import { bestHalo, clusterCaption, GALACTIC_YEAR, ROTATION_GALAXIES, S2_A_AU, SGR_A_RANGE, weigh } from '../src/figures/crowds';
import { CHAPTERS } from '../src/site/course';
import { GLOSSARY } from '../src/site/glossary';

const close = (actual: number, expected: number, relative: number) => expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(relative);

/** Two stars on an orbit, no tide, a softening far below their separation. */
function binary(e: number, eta: number) {
  const m = 10;
  const a = 0.01;
  const rApo = a * (1 + e);
  const vApo = Math.sqrt(((G_CLUSTER * 2 * m) / a) * ((1 - e) / (1 + e)));
  const stars = {
    mass: Float64Array.from([m, m]),
    x: Float64Array.from([-rApo / 2, 0, 0, rApo / 2, 0, 0]),
    v: Float64Array.from([0, -vApo / 2, 0, 0, vApo / 2, 0]),
  };
  const period = 2 * Math.PI * Math.sqrt(a ** 3 / (G_CLUSTER * 2 * m));
  return { sim: new ClusterSim(stars, { softening: 1e-9, tide: null, eta, maxStep: period / 64 }), period };
}

describe('the cluster integrator', () => {
  it('keeps a pair’s orbit: energy, and back to the start after whole periods', () => {
    const { sim, period } = binary(0.6, 0.02);
    const e0 = sim.jacobiEnergy();
    sim.advanceTo(Math.ceil((10 * period) / sim.maxStep) * sim.maxStep);
    expect(Math.abs((sim.jacobiEnergy() - e0) / e0)).toBeLessThan(1e-4);
  });

  it('is fourth order: halving the steps cuts the energy error about sixteen times', () => {
    const run = (eta: number) => {
      const { sim, period } = binary(0.5, eta);
      const e0 = sim.jacobiEnergy();
      sim.advanceTo(Math.ceil((5 * period) / sim.maxStep) * sim.maxStep);
      return Math.abs((sim.jacobiEnergy() - e0) / e0);
    };
    // Steps go as √η, so η ÷ 4 halves them
    const ratio = run(0.04) / run(0.01);
    expect(ratio).toBeGreaterThan(8);
    expect(ratio).toBeLessThan(40);
  });

  it('keeps every step a power of two that divides the star’s time, and levels everyone at the longest step', () => {
    const random = new Random(4);
    const stars = plummerSphere(100, 50, 1, random);
    const sim = new ClusterSim(stars, { softening: 0.02, tide: galacticTide(8.2), eta: 0.05, maxStep: 0.3 });
    for (let k = 0; k < 2000; k++) sim.step();
    for (let i = 0; i < sim.n; i++) {
      expect(Number.isInteger(Math.log2(sim.dt[i]))).toBe(true);
      expect(sim.ti[i] % sim.dt[i]).toBe(0);
      expect(sim.dt[i]).toBeLessThanOrEqual(sim.maxStep);
    }
    sim.advanceTo(Math.ceil(sim.t / sim.maxStep + 1) * sim.maxStep);
    expect(sim.level()).toBe(true);
  });
});

describe('starting a cluster', () => {
  it('samples a Plummer sphere in balance, with half its mass inside 1.305 scale radii', () => {
    const random = new Random(11);
    const stars = plummerSphere(3000, 1000, 1, random, undefined, 1e9);
    const sim = new ClusterSim(stars, { softening: 1e-6, tide: null, maxStep: 0.1 });
    const { kinetic, potential } = sim.energies();
    close((2 * kinetic) / -potential, 1, 0.06);
    // The exact potential energy is −(3π/32) GM²/a
    close(potential, (-(3 * Math.PI) / 32) * G_CLUSTER * 1000 ** 2, 0.05);
    const r = Array.from({ length: 3000 }, (_, i) => Math.hypot(stars.x[3 * i], stars.x[3 * i + 1], stars.x[3 * i + 2])).sort((p, q) => p - q);
    close(r[1500], PLUMMER_HALF_MASS, 0.06);
    expect(PLUMMER_HALF_MASS).toBeCloseTo(1.3048, 4);
    // At rest at the origin
    let px = 0;
    for (let i = 0; i < 3000; i++) px += stars.mass[i] * stars.v[3 * i];
    expect(Math.abs(px)).toBeLessThan(1e-9);
  });

  it('draws Kroupa’s masses with the exact mean, inside the limits', () => {
    const masses = kroupaMasses(40_000, new Random(3), 0.08, 3);
    const mean = masses.reduce((s, m) => s + m, 0) / masses.length;
    close(mean, kroupaMeanMass(0.08, 3), 0.02);
    expect(Math.min(...masses)).toBeGreaterThanOrEqual(0.08);
    expect(Math.max(...masses)).toBeLessThanOrEqual(3);
    // Below the break, the slope is shallower: about two-thirds of the stars are lighter than half a Sun
    const light = masses.filter((m) => m < KROUPA.mBreak).length / masses.length;
    expect(light).toBeGreaterThan(0.6);
    expect(light).toBeLessThan(0.8);
  });

  it('gives the brief’s timescales: 15 Myr to relax 1,000 stars of half a Sun within a parsec, crossing in about a million years', () => {
    close(relaxationTime(1000, 1, 0.5), 15, 0.05);
    expect(crossingTime(500, 1)).toBeGreaterThan(0.9);
    expect(crossingTime(500, 1)).toBeLessThan(1.3);
    // Relaxation takes about N / (8 ln N) crossings
    const ratio = relaxationTime(1000, 1, 0.5) / crossingTime(500, 1);
    expect(ratio).toBeGreaterThan(10);
    expect(ratio).toBeLessThan(25);
  });

  it('has G and the speed unit right', () => {
    close(G_CLUSTER, 4.4985e-3, 1e-4);
    close(KMS, 1.0227, 1e-4);
  });
});

describe('the Galaxy’s tide', () => {
  it('balances the cluster’s pull at the Jacobi radius', () => {
    const tide = galacticTide(8.2);
    fc.assert(
      fc.property(fc.double({ min: 10, max: 1e6, noNaN: true }), (mass) => {
        const r = jacobiRadius(mass, tide);
        close((G_CLUSTER * mass) / r ** 2, tidalStrength(tide) * r, 1e-9);
      }),
    );
    // A flat curve: 4Ω² − κ² = 2Ω²
    close(tidalStrength(tide), 2 * tide.omega ** 2, 1e-12);
    // The Sun's Ω is 28 km/s per kpc
    close((tide.omega / KMS) * 1000, 230 / 8.2, 1e-9);
  });

  it('puts the figure’s clusters’ Jacobi radii where the chapter says', () => {
    const at = (orbit: number) => buildCluster({ ...CLUSTER_DEFAULTS, orbit });
    const sun = at(8.2);
    expect(sun.totalMass).toBeGreaterThan(350);
    expect(sun.totalMass).toBeLessThan(450);
    expect(Math.round(sun.jacobi)).toBe(10);
    expect(Math.round(at(4).jacobi)).toBe(6);
    expect(at(16).jacobi).toBeGreaterThan(sun.jacobi);
  });

  it('keeps the Jacobi integral while a cluster loses stars into two tails, its heavy stars sinking', () => {
    const b = buildCluster({ n: 250, masses: 'kroupa', orbit: 4, halfMass: 2, seed: 2 });
    const e0 = b.sim.jacobiEnergy();
    const until = Math.ceil((5 * b.relaxation) / b.sim.maxStep) * b.sim.maxStep;
    let centre: number[] | undefined;
    let t = 0;
    while (t < until) {
      t = Math.min(until, t + b.sim.maxStep * 32);
      b.sim.advanceTo(t);
      centre = readCluster(b.sim.mass, b.sim.positionsNow(), b.tide, centre).centre;
    }
    expect(Math.abs((b.sim.jacobiEnergy() - e0) / e0)).toBeLessThan(1e-3);
    const x = b.sim.positionsNow();
    const reading = readCluster(b.sim.mass, x, b.tide, centre);
    expect(reading.boundMass / b.totalMass).toBeLessThan(0.9);
    expect(reading.boundMass / b.totalMass).toBeGreaterThan(0.05);
    expect(reading.heavyHalfMass).toBeLessThan(reading.lagrangian[1]);
    // Far escapers: those on the Galaxy's side (x < 0) run ahead (y > 0), the others lag
    let along = 0;
    let against = 0;
    for (let i = 0; i < b.sim.n; i++) {
      const dx = x[3 * i] - reading.centre[0];
      const dy = x[3 * i + 1] - reading.centre[1];
      if (Math.abs(dy) < 2 * reading.jacobi) continue;
      if (Math.sign(dx) !== Math.sign(dy)) along++;
      else against++;
    }
    expect(along + against).toBeGreaterThan(10);
    expect(along / (along + against)).toBeGreaterThan(0.8);
  });

  it('runs through the host: loaded, then states with readings, centred on the cluster', () => {
    const messages: ClusterMessage[] = [];
    const host = createClusterHost((m) => messages.push(m));
    host.receive({ type: 'load', config: { ...CLUSTER_DEFAULTS, n: 120 } });
    expect(messages[0].type).toBe('loaded');
    expect(messages[1].type).toBe('state');
    const info = messages[0] as Extract<ClusterMessage, { type: 'loaded' }>;
    host.receive({ type: 'advance', t: info.relaxation });
    const last = messages[messages.length - 1] as Extract<ClusterMessage, { type: 'state' }>;
    expect(last.t).toBeGreaterThanOrEqual(info.relaxation);
    expect(last.samples.length).toBeGreaterThan(10);
    expect(Math.abs(last.samples[last.samples.length - 1].energyError)).toBeLessThan(1e-4);
    // The bound stars sit round the origin of the positions sent
    let sx = 0;
    let count = 0;
    for (let i = 0; i < 120; i++) {
      if (!last.bound[i]) continue;
      sx += last.positions[3 * i];
      count++;
    }
    expect(Math.abs(sx / count)).toBeLessThan(0.5);
    const caption = clusterCaption(info.config, info, last.samples[last.samples.length - 1], null);
    expect(caption).toMatch(/^120 stars with Kroupa’s mix .* relaxation times\): \d+% of the mass is still within the Jacobi radius/);
  });
});

describe('rotation curves', () => {
  it('has modified Bessel functions to seven figures', () => {
    close(besselI0(1), 1.266065878, 1e-6);
    close(besselI1(1), 0.565159104, 1e-6);
    close(besselK0(1), 0.421024438, 1e-6);
    close(besselK1(1), 0.601907230, 1e-6);
    close(besselI0(5), 27.23987182, 1e-6);
    close(besselI1(5), 24.33564214, 1e-6);
    close(besselK0(5), 0.0036910983, 1e-6);
    close(besselK1(5), 0.0040446134, 1e-6);
    close(besselK0(0.1), 2.427069025, 1e-6);
  });

  it('gives an exponential disc its peak at 2.2 scale lengths and Kepler’s fall far out', () => {
    let best = { R: 0, v: 0 };
    for (let R = 0.05; R < 10; R += 0.005) {
      const v = exponentialDiscSpeed(R, 1e10, 1);
      if (v > best.v) best = { R, v };
    }
    expect(best.R).toBeGreaterThan(2.1);
    expect(best.R).toBeLessThan(2.25);
    // A little above a sphere of the same mass there
    expect(best.v).toBeGreaterThan(pointMassSpeed(best.R, 1e10 * (1 - (1 + best.R) * Math.exp(-best.R))));
    close(exponentialDiscSpeed(40, 1e10, 1), pointMassSpeed(40, 1e10), 0.01);
  });

  it('gives Hernquist’s and NFW’s curves their closed forms', () => {
    close(hernquistSpeed(1, 1e10, 1), Math.sqrt((G_GALAXY * 1e10) / 4), 1e-12);
    fc.assert(
      fc.property(fc.double({ min: 1e9, max: 1e13, noNaN: true }), (mass) => {
        close(nfwMassInside(haloRadius(mass), mass), mass, 1e-9);
        close(nfwSpeed(haloRadius(mass), mass) ** 2, (G_GALAXY * mass) / haloRadius(mass), 1e-9);
      }),
    );
    expect(concentration(1.35e12)).toBeGreaterThan(7);
    expect(concentration(1.35e12)).toBeLessThan(9);
    close(totalSpeed(3, 4), 5, 1e-12);
    expect(totalSpeed(3, -4)).toBeLessThan(0);
  });

  it('weighs the Galaxy inside the Sun’s orbit at 10¹¹ Suns, and a lap at 220 million years', () => {
    close(massInside(MILKY_WAY.circularSpeed, MILKY_WAY.sunRadius), 1.0e11, 0.02);
    close(massInside(ROTATION_DEBATE.ou.to, ROTATION_DEBATE.ou.at), 1.9e11, 0.02);
    expect(Math.round(GALACTIC_YEAR / 10) * 10).toBe(220);
  });

  it('has the measured curves as the papers print them', () => {
    const [eilers, ou] = MILKY_WAY_CURVES;
    expect(eilers.r.length).toBe(38);
    expect(ou.r.length).toBe(37);
    expect(eilers.v[eilers.r.indexOf(8.19)]).toBe(228.86);
    expect(ou.v[ou.r.indexOf(27.31)]).toBe(172.98);
    expect(SPARC_GALAXIES.map((g) => g.name)).toEqual(['NGC 3198', 'NGC 2403', 'NGC 6503', 'UGC 2885', 'DDO 154']);
    const n3198 = SPARC_GALAXIES[0];
    expect(n3198.distance).toBe(13.8);
    expect(n3198.r.length).toBe(43);
    close(n3198.luminosity, 3.8279e10, 1e-4);
  });

  it('fits the Milky Way at 230 km/s at the Sun, with the halo fitted to both curves', () => {
    const mw = ROTATION_GALAXIES[0];
    const parts = mw.parts(0.5, MILKY_WAY_MODEL.haloMass);
    expect(parts.total(8.2)).toBeGreaterThan(225);
    expect(parts.total(8.2)).toBeLessThan(235);
    close(bestHalo(mw, 0.5), MILKY_WAY_MODEL.haloMass, 0.05);
    // The visible matter alone falls far short out at 25 kpc
    expect(parts.visible(25)).toBeLessThan(0.6 * parts.total(25));
  });

  it('needs a dark halo for every SPARC galaxy: the visible matter falls short far out, a halo makes it up', () => {
    for (const g of ROTATION_GALAXIES.slice(1)) {
      const last = g.points[g.points.length - 1];
      const parts = g.parts(0.5, g.haloMass);
      expect(parts.visible(last.r)).toBeLessThan(0.6 * last.v);
      close(parts.total(last.r), last.v, 0.1);
      // The figure's best halo agrees with the core's fit
      close(bestHalo(g, 0.5), g.haloMass, 0.15);
    }
    // NGC 3198 fits well; DDO 154, a dwarf, badly (its middle wants a core)
    expect(fitHalo(SPARC_GALAXIES[0]).chiSquare).toBeLessThan(3);
    expect(fitHalo(SPARC_GALAXIES[4]).chiSquare).toBeGreaterThan(10);
  });
});

describe('spiral arms', () => {
  const flat = () => 230;

  it('winds arms of fixed stars as the formula says', () => {
    const p0 = (25 * Math.PI) / 180;
    fc.assert(
      fc.property(fc.double({ min: 2, max: 15, noNaN: true }), fc.double({ min: 0, max: 2000, noNaN: true }), (R, t) => {
        const omega = angularSpeed(230, R);
        const expected = Math.atan(1 / (1 / Math.tan(p0) + omega * t));
        expect(Math.abs(windingPitch(R, t, flat, p0) - expected)).toBeLessThan(1e-6);
      }),
    );
    // With the Milky Way's curve, about 2° at the Sun after a billion years
    const mw = ROTATION_GALAXIES[0].parts(0.5, MILKY_WAY_MODEL.haloMass).total;
    const pitch = (windingPitch(8.2, 1000, mw, p0) * 180) / Math.PI;
    expect(pitch).toBeGreaterThan(1.5);
    expect(pitch).toBeLessThan(2.2);
  });

  it('moves each arm star round its own circle at its own speed', () => {
    const stars = armStars(50, 2, 0.4, 2, 14, 1);
    const t = 300;
    const xy = windArms(stars, t, flat);
    stars.forEach((s, i) => {
      close(Math.hypot(xy[2 * i], xy[2 * i + 1]), s.R, 1e-9);
      const angle = Math.atan2(xy[2 * i + 1], xy[2 * i]);
      const expected = s.theta + angularSpeed(230, s.R) * t;
      expect(Math.abs(Math.atan2(Math.sin(angle - expected), Math.cos(angle - expected)))).toBeLessThan(1e-9);
    });
  });

  it('keeps Kalnajs’s pattern: turned back by the pattern’s angle, every star lies on its oval', () => {
    const ovals = kalnajsOvals(8, 2, 14);
    const pattern = innerLindbladSpeed(8.2, flat);
    fc.assert(
      fc.property(fc.double({ min: 0, max: 3000, noNaN: true }), (t) => {
        const xy = ovalStars(ovals, 12, t, pattern, flat);
        ovals.forEach((o, k) => {
          for (let j = 0; j < 12; j++) {
            const x = xy[2 * (k * 12 + j)];
            const y = xy[2 * (k * 12 + j) + 1];
            const back = -(o.angle + pattern * t);
            const u = x * Math.cos(back) - y * Math.sin(back);
            const v = x * Math.sin(back) + y * Math.cos(back);
            expect(Math.abs((u / (o.R * (1 + o.epsilon))) ** 2 + (v / (o.R * (1 - o.epsilon))) ** 2 - 1)).toBeLessThan(1e-9);
          }
        });
      }),
      { numRuns: 30 },
    );
    // For a flat curve, Ω − κ/2 = (1 − 1/√2) Ω
    close(pattern, (1 - Math.SQRT1_2) * angularSpeed(230, 8.2), 1e-5);
  });
});

describe('the Galaxy from outside', () => {
  const clouds = sampleGalaxy(MILKY_WAY);
  it('samples every part, the thin disc flat and crowded on its arms, the halo wide', () => {
    expect(clouds.map((c) => c.part)).toEqual(['thin', 'thick', 'bar', 'halo', 'globulars']);
    for (const c of clouds) expect(c.positions.length).toBe(3 * GALAXY_POINTS[c.part]);
    const thin = clouds[0];
    const heights = Array.from({ length: GALAXY_POINTS.thin }, (_, i) => Math.abs(thin.positions[3 * i + 2])).sort((a, b) => a - b);
    expect(heights[Math.floor(0.5 * heights.length)]).toBeLessThan(0.3);
    const armness = thin.armness!.reduce((s, a) => s + a, 0) / GALAXY_POINTS.thin;
    // Spread evenly, the mean would be 0.23
    expect(armness).toBeGreaterThan(0.35);
    const halo = clouds[3];
    const far = Array.from({ length: GALAXY_POINTS.halo }, (_, i) => Math.hypot(halo.positions[3 * i], halo.positions[3 * i + 1], halo.positions[3 * i + 2])).filter((r) => r > 20).length;
    expect(far).toBeGreaterThan(100);
  });

  it('is the same every time (seeded)', () => {
    expect(sampleGalaxy(MILKY_WAY)[2].positions).toEqual(clouds[2].positions);
  });
});

describe('S2 and Sagittarius A*', () => {
  const D = SGR_A_STAR.distance;
  const M = SGR_A_STAR.mass;

  it('weighs Sagittarius A* at GRAVITY’s mass by Kepler’s third law', () => {
    close(S2_A_AU, 1031.3, 1e-3);
    close(keplerMass(S2_A_AU, S2_ORBIT.period), M, 2e-3);
    close(weigh(2 * S2_ORBIT.a * 1000, S2_ORBIT.period), M, 2e-3);
    expect(weigh(250, 16.05)).toBeGreaterThan(SGR_A_RANGE[0]);
    expect(weigh(250, 16.05)).toBeLessThan(SGR_A_RANGE[1]);
  });

  it('passes 120 AU from it at 7,700 km/s, turning 12′ a lap', () => {
    const peri = pericentre(S2_ORBIT, M, D);
    expect(peri.r).toBeGreaterThan(118);
    expect(peri.r).toBeLessThan(121);
    expect(peri.speed).toBeGreaterThan(7650);
    expect(peri.speed).toBeLessThan(7780);
    const at = orbitAt(S2_ORBIT, S2_ORBIT.periastron, D);
    close(at.r, peri.r, 1e-6);
    close(at.speed, peri.speed, 1e-4);
    const turn = toArcmin(precessionPerOrbit(S2_ORBIT, M, D));
    expect(turn).toBeGreaterThan(12.0);
    expect(turn).toBeLessThan(12.3);
  });

  it('gains about 200 km/s of redshift at pericentre and 6 at apocentre', () => {
    const peri = relativisticRedshift(orbitAt(S2_ORBIT, S2_ORBIT.periastron, D), M);
    expect(peri).toBeGreaterThan(195);
    expect(peri).toBeLessThan(215);
    const apo = relativisticRedshift(orbitAt(S2_ORBIT, S2_ORBIT.periastron + S2_ORBIT.period / 2, D), M);
    expect(apo).toBeGreaterThan(5);
    expect(apo).toBeLessThan(8);
  });

  it('swings from +4,000 to −1,900 km/s through pericentre', () => {
    let hi = -Infinity;
    let lo = Infinity;
    for (let y = 2017; y < 2019.5; y += 0.0005) {
      const vz = orbitAt(S2_ORBIT, y, D).vz;
      hi = Math.max(hi, vz);
      lo = Math.min(lo, vz);
    }
    expect(hi).toBeGreaterThan(3900);
    expect(hi).toBeLessThan(4050);
    expect(lo).toBeLessThan(-1850);
    expect(lo).toBeGreaterThan(-1950);
  });

  it('sits on the sky where Part II’s visual-orbit code puts it', () => {
    fc.assert(
      fc.property(fc.double({ min: 1990, max: 2050, noNaN: true }), (year) => {
        const p = orbitAt(S2_ORBIT, year, D);
        const v = visualPosition(S2_ORBIT, year);
        expect(Math.abs(p.east - v.east / ARCSEC)).toBeLessThan(1e-12);
        expect(Math.abs(p.north - v.north / ARCSEC)).toBeLessThan(1e-12);
        // Distance from its parts
        close(Math.hypot(p.east * D, p.north * D, p.z), p.r, 1e-9);
      }),
    );
  });

  it('comes round again in June 2034, counted from any day', () => {
    expect(nextPericentre(S2_ORBIT, 2026.86)).toBeCloseTo(2034.4245, 3);
    expect(yearLabel(nextPericentre(S2_ORBIT, 2026.86))).toBe('June 2034');
    expect(yearLabel(S2_ORBIT.periastron)).toBe('May 2018');
    fc.assert(
      fc.property(fc.double({ min: 1990, max: 2200, noNaN: true }), (year) => {
        const next = nextPericentre(S2_ORBIT, year);
        expect(next).toBeGreaterThanOrEqual(year - 1e-9);
        expect(next - year).toBeLessThan(S2_ORBIT.period + 1e-9);
      }),
    );
  });

  it('marks the question from the figure’s measurements', () => {
    expect(checkWeighing({ a: 1030, period: 16 }).correct).toBe(true);
    expect(checkWeighing({ a: 1015, period: 16.3 }).correct).toBe(true);
    // Each within its tolerance, but both pushing the mass down
    expect(checkWeighing({ a: 1000, period: 16.5 }).correct).toBe(false);
    expect(checkWeighing(WEIGH_START).correct).toBe(false);
    // Half the long axis, not all of it
    expect(checkWeighing({ a: 2060, period: 16 }).correct).toBe(false);
    expect(checkWeighing({ a: 1030, period: 12 }).correct).toBe(false);
  });
});

describe('Chapter 30 in the course', () => {
  it('is written, with its glossary terms, timeline and dated facts', () => {
    const chapter = CHAPTERS.find((c) => c.number === 30)!;
    expect(chapter.load).toBeDefined();
    for (const id of ['relaxation-time', 'jacobi-radius', 'tidal-tail', 'rotation-curve', 'dark-matter', 'density-wave']) expect(GLOSSARY).toHaveProperty(id);
    const events = TIMELINE.filter((e) => e.chapter === 30);
    expect(events.length).toBeGreaterThanOrEqual(15);
    for (let i = 1; i < TIMELINE.length; i++) expect(TIMELINE[i].year).toBeGreaterThanOrEqual(TIMELINE[i - 1].year);
    expect(AS_OF).toHaveProperty('rotationCurve');
    expect(ROTATION_DEBATE.asOf).toBe('November 2026');
  });
});
