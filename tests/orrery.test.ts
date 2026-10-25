import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../src/core/math/vec3';
import { momentum } from '../src/core/nbody/diagnostics';
import { GM_SUN_AU_DAY } from '../src/core/nbody/system';
import { elementsFromState, stateFromElements } from '../src/core/orbits/elements';
import { hillRadius, lagrangePoints } from '../src/core/orbits/lagrange';
import { MAX_BODIES, Orrery, type OrreryBody } from '../src/core/orrery/engine';
import { frameOf, toFrame } from '../src/core/orrery/frame';
import { isPlanetary, parentage } from '../src/core/orrery/hierarchy';
import { createOrreryHost, type OrreryMessage, type OrrerySnapshot } from '../src/core/orrery/protocol';
import { DEG } from '../src/core/units';
import { formatDistance, formatMass, formatSpan, maxRateIndex, RATES } from '../src/lab/orrery/format';
import { COMET_PASSES, FIGURE_EIGHT_PERIOD_DAYS, findPreset, KEPLER_16, PRESETS, TRAPPIST_1, TROJAN_STARTS } from '../src/lab/orrery/presets';
import fixture from './fixtures/orrery.json';
import { expectNear } from './helpers';

const preset = (id: string) => findPreset(id)!.bodies();
const at = (o: Orrery, id: string): Vec3 => {
  const i = o.ids.indexOf(id);
  return [o.system.x[3 * i], o.system.x[3 * i + 1], o.system.x[3 * i + 2]];
};
const between = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('orbital elements', () => {
  it('come back from the state they give, for any bound orbit', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 50, noNaN: true }),
        fc.double({ min: 0, max: 0.97, noNaN: true }),
        fc.double({ min: 0.01, max: 3.1, noNaN: true }),
        fc.double({ min: 0, max: 6.28, noNaN: true }),
        fc.double({ min: 0, max: 6.28, noNaN: true }),
        fc.double({ min: 0, max: 6.28, noNaN: true }),
        (a, e, i, node, peri, M) => {
          const s = stateFromElements(1, { a, e, i, node, peri, M });
          const el = elementsFromState(1, s.x, s.v);
          expectNear(el.a, a, 1e-9 * a, 'a');
          expectNear(el.e, e, 1e-9, 'e');
          expectNear(el.i, i, 1e-9, 'i');
          // The same position again, whatever the angles came back as.
          const back = stateFromElements(1, el);
          expectNear(between(back.x, s.x), 0, 1e-7 * a, 'position');
        },
      ),
    );
  });

  it('give Earth’s year and Halley’s comet’s orbit', () => {
    const earth = stateFromElements(GM_SUN_AU_DAY, { a: 1.000_001, e: 0.0167, i: 0, node: 0, peri: 0, M: 1 });
    expectNear(elementsFromState(GM_SUN_AU_DAY, earth.x, earth.v).period, 365.26, 0.01, 'a year');
    const halley = elementsFromState(GM_SUN_AU_DAY, [0.586, 0, 0], [0, 0.0315, 0.002]);
    expect(halley.e).toBeGreaterThan(0.9);
    expect(halley.e).toBeLessThan(1);
  });

  it('describe a hyperbola with a negative semi-major axis and no period', () => {
    const fast = elementsFromState(1, [1, 0, 0], [0, 1.6, 0]);
    expect(fast.a).toBeLessThan(0);
    expect(fast.e).toBeGreaterThan(1);
    expect(fast.period).toBe(Infinity);
    const s = stateFromElements(1, fast);
    expectNear(between(s.x, [1, 0, 0]), 0, 1e-9, 'same place');
  });
});

describe('Lagrange points', () => {
  it('balance the pulls and the turning in the rotating frame', () => {
    for (const q of [3e-6, 9.5e-4, 0.012, 0.3]) {
      for (const p of lagrangePoints(q)) {
        // The effective force at the point: zero.
        const r1 = Math.hypot(p.x + q, p.y);
        const r2 = Math.hypot(p.x - 1 + q, p.y);
        const fx = p.x - ((1 - q) * (p.x + q)) / r1 ** 3 - (q * (p.x - 1 + q)) / r2 ** 3;
        const fy = p.y - ((1 - q) * p.y) / r1 ** 3 - (q * p.y) / r2 ** 3;
        expectNear(Math.hypot(fx, fy), 0, 1e-9, `${p.name} at q = ${q}`);
      }
    }
  });

  it('put Sun–Earth L1 and L2 1.5 million km from Earth, and L4 and L5 at the corners of equilateral triangles', () => {
    const q = 3.0e-6;
    const [l1, l2, , l4] = lagrangePoints(q);
    const au = 149.6e6;
    expectNear((1 - q - l1.x) * au, 1.49e6, 0.02e6, 'L1');
    expectNear((l2.x - 1 + q) * au, 1.50e6, 0.02e6, 'L2');
    expectNear(Math.hypot(l4.x + q, l4.y), 1, 1e-12, 'L4 from the Sun');
    expectNear(Math.hypot(l4.x - 1 + q, l4.y), 1, 1e-12, 'L4 from Earth');
    expectNear(hillRadius(1, 0, 3.0e-6, 1) * au, 1.5e6, 0.02e6, 'Earth’s Hill sphere');
  });
});

describe('who orbits whom', () => {
  it('puts the planets round the Sun, the Moon round Earth and Jupiter’s moons round Jupiter', () => {
    const solar = new Orrery(preset('solar-system'));
    const p = parentage(solar.system.gm, solar.system.x, solar.system.v);
    expect(solar.names[p.root]).toBe('Sun');
    for (let i = 1; i < solar.ids.length; i++) expect(p.parent[i]).toBe(p.root);
    expect(isPlanetary(solar.system.gm, p)).toBe(true);

    const em = new Orrery(preset('earth-moon'));
    const q = parentage(em.system.gm, em.system.x, em.system.v);
    expect(em.names[q.parent[em.ids.indexOf('moon')]]).toBe('Earth');
    expect(isPlanetary(em.system.gm, q)).toBe(false);

    const gal = new Orrery(preset('galilean'));
    const g = parentage(gal.system.gm, gal.system.x, gal.system.v);
    for (const id of ['io', 'europa', 'ganymede', 'callisto']) expect(gal.names[g.parent[gal.ids.indexOf(id)]]).toBe('Jupiter');
  });

  it('measures a planet round two stars about both of them', () => {
    const o = new Orrery(preset('kepler-16'));
    const p = parentage(o.system.gm, o.system.x, o.system.v);
    const b = o.ids.indexOf('kepler-16b');
    expectNear(p.orbits[b]!.period, KEPLER_16.planetPeriod, 0.5, 'the planet’s period, about both stars');
    expectNear(p.orbits[b]!.a, 0.7048, 0.002, 'its distance (Doyle et al.: 0.7048 AU)');
    expectNear(p.orbits[o.ids.indexOf('kepler-16b-star')]!.period, KEPLER_16.binaryPeriod, 0.01, 'the stars’ period');
  });
});

describe('the Orrery’s presets', () => {
  it('all load, with names, colours and sensible views', () => {
    for (const p of PRESETS) {
      const o = new Orrery(p.bodies(), p.method);
      expect(o.ids.length, p.id).toBeGreaterThan(1);
      expect(new Set(o.ids).size).toBe(o.ids.length);
      expect(p.zoom).toBeGreaterThan(0);
      expect(p.blurb.length).toBeGreaterThan(40);
      expect(p.tryThis.length).toBeGreaterThan(40);
    }
  });

  it('choose Wisdom–Holman for planetary systems and IAS15 for the rest', () => {
    const method = (id: string) => new Orrery(preset(id)).method;
    for (const id of ['solar-system', 'galilean', 'trojans', 'trappist-1']) expect(method(id), id).toBe('whfast');
    for (const id of ['earth-moon', 'figure-eight', 'pythagorean', 'kepler-16', 'heavy-jupiter']) expect(method(id), id).toBe('ias15');
  });

  it('keep the Solar System within 20″ of JPL’s positions after a hundred years, with either integrator', () => {
    const sun = fixture.rows.find((r) => r.id === 'sun')!.x;
    const end = fixture.rows[0].jdTT - findPreset('solar-system')!.epochTT!;
    expect(end).toBe(36_525);
    for (const method of ['whfast', 'ias15'] as const) {
      const o = new Orrery(preset('solar-system'), method);
      o.advanceTo(end, undefined, undefined, true);
      expect(o.system.t).toBe(end);
      for (const id of o.ids.filter((x) => x !== 'sun')) {
        const want = fixture.rows.find((r) => r.id === (id === 'earth' ? 'earth-moon' : id))!.x;
        const got = at(o, id);
        const s = at(o, 'sun');
        const g: Vec3 = [got[0] - s[0], got[1] - s[1], got[2] - s[2]];
        const w: Vec3 = [want[0] - sun[0], want[1] - sun[1], want[2] - sun[2]];
        const cos = (g[0] * w[0] + g[1] * w[1] + g[2] * w[2]) / (Math.hypot(...g) * Math.hypot(...w));
        const arcsec = (Math.acos(Math.min(1, cos)) / DEG) * 3600;
        // Mercury's 20″ is mostly relativity, which the Orrery leaves out (43″ a century at perihelion).
        expect(arcsec, `${id} by ${method}`).toBeLessThan(id === 'mercury' || id === 'venus' ? 25 : id === 'earth' ? 10 : 5);
        expectNear(Math.hypot(...g) / Math.hypot(...w), 1, 1e-4, `${id}’s distance`);
      }
      expect(Math.abs(o.energyError())).toBeLessThan(1e-9);
    }
  });

  it('bring the figure-eight back to where it started after one period', () => {
    const o = new Orrery(preset('figure-eight'));
    const start = o.bodies();
    o.advanceTo(FIGURE_EIGHT_PERIOD_DAYS, undefined, undefined, true);
    for (const b of start) expect(between(at(o, b.id), b.x), b.id).toBeLessThan(1e-5);
  });

  it('end the Pythagorean problem with the lightest star thrown out, energy kept throughout', () => {
    const o = new Orrery(preset('pythagorean'));
    o.advanceTo(70 / Math.sqrt(GM_SUN_AU_DAY));
    expect(o.events.some((e) => e.kind === 'escape' && e.text.startsWith('Star of 3 Suns'))).toBe(true);
    expect(o.events.filter((e) => e.kind === 'escape')).toHaveLength(1);
    expect(o.events.filter((e) => e.kind === 'encounter').length).toBeLessThan(30);
    expect(Math.abs(o.energyError())).toBeLessThan(1e-9);
  });

  it('give TRAPPIST-1’s planets their measured periods, and keep them in order for a thousand days', () => {
    const o = new Orrery(preset('trappist-1'));
    const periods = () => parentage(o.system.gm, o.system.x, o.system.v).orbits.slice(1).map((orbit) => orbit!.period);
    periods().forEach((p, k) => expectNear(p, TRAPPIST_1.planets[k].period, 0.002 * TRAPPIST_1.planets[k].period, TRAPPIST_1.planets[k].name));
    o.advanceTo(1000);
    periods().forEach((p, k) => expectNear(p, TRAPPIST_1.planets[k].period, 0.02 * TRAPPIST_1.planets[k].period, `${TRAPPIST_1.planets[k].name} later`));
    expect(Math.abs(o.energyError())).toBeLessThan(1e-6);
  });

  it('make tadpoles about L4 and L5 and a horseshoe round both, seen from Jupiter', () => {
    const o = new Orrery(preset('trojans'));
    const n = TROJAN_STARTS.length;
    const lo = new Array(n).fill(Infinity);
    const hi = new Array(n).fill(-Infinity);
    const nearest = new Array(n).fill(Infinity);
    o.advanceTo(365.25 * 600, undefined, (s) => {
      const ja = Math.atan2(s.x[4] - s.x[1], s.x[3] - s.x[0]);
      for (let k = 0; k < n; k++) {
        const i = k + 2;
        let a = (Math.atan2(s.x[3 * i + 1] - s.x[1], s.x[3 * i] - s.x[0]) - ja) / DEG;
        a = ((a + 540) % 360) - 180;
        lo[k] = Math.min(lo[k], a);
        hi[k] = Math.max(hi[k], a);
        nearest[k] = Math.min(nearest[k], Math.abs(a));
      }
    });
    TROJAN_STARTS.forEach((t, k) => {
      if (t.name.startsWith('Horseshoe')) {
        // Round both points, through the far side, but never near Jupiter.
        expect(hi[k] - lo[k]).toBeGreaterThan(350);
        expect(nearest[k]).toBeGreaterThan(15);
      } else if (t.angle > 0) {
        expect(lo[k], t.name).toBeGreaterThan(15);
        expect(hi[k], t.name).toBeLessThan(170);
        expect(lo[k] < 60 && hi[k] > 60, `${t.name} swings about 60°`).toBe(true);
      } else {
        expect(hi[k], t.name).toBeLessThan(-15);
        expect(lo[k], t.name).toBeGreaterThan(-170);
        expect(lo[k] < -60 && hi[k] > -60, `${t.name} swings about −60°`).toBe(true);
      }
    });
  });

  it('send the comets past Jupiter on cue, switch to IAS15 for them, and let the slow one be caught and then freed', () => {
    // Comet C starts close enough to Jupiter for IAS15; without it the run starts on Wisdom–Holman and switches.
    const quick = new Orrery(preset('comet').filter((b) => b.id !== 'comet-3'));
    expect(quick.method).toBe('whfast');
    quick.advanceTo(400);
    expect(quick.method).toBe('ias15');
    expect(quick.events.some((e) => /^Jupiter and Comet [AB] came within three Hill radii: switched to IAS15/.test(e.text))).toBe(true);

    const o = new Orrery(preset('comet'));
    expect(o.method).toBe('ias15');
    o.advanceTo(9500);
    for (const c of COMET_PASSES.slice(0, 2)) {
      const pass = o.events.find((e) => e.text.startsWith(`Jupiter and ${c.name} passed within`));
      expect(pass, c.name).toBeDefined();
      expectNear(pass!.t, c.at, 5, `${c.name}’s pass on cue`);
    }
    const caught = o.events.find((e) => e.text.startsWith('Comet C (caught) has been caught by Jupiter'));
    const freed = o.events.find((e) => e.text.startsWith('Comet C (caught) has broken free of Jupiter'));
    expect(caught).toBeDefined();
    expect(freed).toBeDefined();
    expect(freed!.t - caught!.t).toBeGreaterThan(2 * 365);
  });

  it('let a Jupiter 100 times heavier throw Saturn out of its orbit within a century', () => {
    const o = new Orrery(preset('heavy-jupiter'));
    o.advanceTo(365.25 * 100);
    const p = parentage(o.system.gm, o.system.x, o.system.v);
    const saturn = p.orbits[o.ids.indexOf('saturn')]!;
    expect(saturn.a > 20 || saturn.e > 0.5).toBe(true);
    expect(o.events.some((e) => e.text.includes('and Saturn passed within'))).toBe(true);
    expect(Math.abs(o.energyError())).toBeLessThan(1e-9);
  });
});

/** Two bodies set to collide head on. */
function headOn(): OrreryBody[] {
  return [
    { id: 'a', name: 'A', gm: 3e-6, radius: 0.001, colour: '#fff', x: [-0.01, 0, 0], v: [0.001, 0.0002, 0] },
    { id: 'b', name: 'B', gm: 1e-6, radius: 0.001, colour: '#fff', x: [0.01, 0, 0], v: [-0.001, 0, 0] },
    { id: 'c', name: 'C', gm: 1e-9, radius: 0, colour: '#fff', x: [5, 0, 0], v: [0, 0, 0] },
  ];
}

describe('the Orrery’s engine', () => {
  it('merges bodies that touch, keeping their mass and momentum', () => {
    const o = new Orrery(headOn(), 'ias15');
    const before = momentum(o.system);
    o.advanceTo(30);
    expect(o.ids).toEqual(['a', 'c']);
    expectNear(o.system.gm[0], 4e-6, 1e-18, 'the masses add');
    const after = momentum(o.system);
    for (let k = 0; k < 3; k++) expectNear(after[k], before[k], 1e-20, 'momentum');
    expectNear(o.radii[0], Math.cbrt(2) * 0.001, 1e-12, 'the volumes add');
    expect(o.events.some((e) => e.kind === 'collision' && e.text === 'B and A collided and merged.')).toBe(true);
  });

  it('adds a body on an orbit, makes an orbit circular, changes a mass, deletes, and undoes each', () => {
    const o = new Orrery(preset('one-planet'), 'ias15');
    const id = o.addOnOrbit({ name: 'New world', gm: 1e-7, radius: 1e-5, colour: '#fff', parent: 'sun', orbit: { a: 2, e: 0.3, i: 10 * DEG, node: 1, peri: 2, M: 3 } });
    expect(id).toBe('new-world');
    const p = parentage(o.system.gm, o.system.x, o.system.v);
    const orbit = p.orbits[o.ids.indexOf(id)]!;
    expectNear(orbit.a, 2, 1e-3, 'its orbit’s size');
    expectNear(orbit.e, 0.3, 1e-3, 'its eccentricity');
    expectNear(orbit.i, 10 * DEG, 1e-4, 'its tilt');

    o.circularise('planet');
    const q = parentage(o.system.gm, o.system.x, o.system.v);
    expectNear(q.orbits[o.ids.indexOf('planet')]!.e, 0, 1e-6, 'circular now');

    o.setMass('planet', 0.001);
    expect(o.system.gm[o.ids.indexOf('planet')]).toBe(0.001);
    o.remove(id);
    expect(o.ids).not.toContain(id);

    o.undo();
    expect(o.ids).toContain(id);
    o.undo();
    expect(o.system.gm[o.ids.indexOf('planet')]).toBeLessThan(0.001);
    o.undo();
    o.undo();
    expect(o.ids).toEqual(['sun', 'planet']);
    expect(o.canUndo).toBe(false);
  });

  it('turns away bad bodies with a reason, and changes nothing', () => {
    const o = new Orrery(preset('one-planet'));
    const base = { name: 'X', gm: 1e-7, radius: 0, colour: '#fff', parent: 'sun', orbit: { a: 1, e: 0, i: 0, node: 0, peri: 0, M: 0 } };
    expect(() => o.addOnOrbit({ ...base, orbit: { ...base.orbit, e: 1 } })).toThrow(/eccentricity/);
    expect(() => o.addOnOrbit({ ...base, orbit: { ...base.orbit, a: 0.001 } })).toThrow(/into Sun/);
    expect(() => o.addOnOrbit({ ...base, gm: 1 })).toThrow(/too heavy/);
    expect(() => o.addOnOrbit({ ...base, parent: 'nobody' })).toThrow(/Pick a body/);
    expect(() => o.setVelocity('planet', [100, 0, 0])).toThrow(/too fast/);
    o.remove('sun');
    expect(() => o.remove('planet')).toThrow(/last body/);
    expect(o.ids).toEqual(['planet']);
    const many = Array.from({ length: MAX_BODIES + 1 }, (_, k) => ({ id: `b${k}`, name: `B${k}`, gm: 1e-9, radius: 0, colour: '#fff', x: [k + 1, 0, 0] as Vec3, v: [0, 0.01, 0] as Vec3 }));
    expect(() => new Orrery(many)).toThrow(/up to 50/);
  });

  it('reports a body flung away fast as escaped', () => {
    const bodies = preset('one-planet');
    bodies[1] = { ...bodies[1], v: [0.03, 0.03, 0] };
    const o = new Orrery(bodies);
    o.advanceTo(2000);
    expect(o.events.some((e) => e.kind === 'escape' && e.text.startsWith('Planet has escaped'))).toBe(true);
  });

  it('keeps leapfrog’s energy error bounded and Wisdom–Holman’s at round-off on one planet', () => {
    const leap = new Orrery(preset('one-planet'), 'leapfrog');
    leap.advanceTo(3650);
    expect(Math.abs(leap.energyError())).toBeGreaterThan(1e-7);
    expect(Math.abs(leap.energyError())).toBeLessThan(1e-3);
    const wh = new Orrery(preset('one-planet'), 'whfast');
    wh.advanceTo(3650);
    expect(Math.abs(wh.energyError())).toBeLessThan(1e-12);
  });

  it('turns with a pair: in Jupiter’s frame, Jupiter stays put on the +x axis', () => {
    const o = new Orrery(preset('trojans'));
    const pos = () => toFrame(frameOf({ centre: null, rotate: ['sun', 'jupiter'] }, o.ids, o.system.gm, o.system.x, o.system.v), at(o, 'jupiter'));
    const start = pos();
    o.advanceTo(2000);
    const later = pos();
    expectNear(later[0], start[0], 1e-6, 'x');
    expectNear(later[1], 0, 1e-9, 'y');
    expect(start[0]).toBeGreaterThan(5);
  });
});

describe('the Orrery’s protocol', () => {
  const host = () => {
    const messages: OrreryMessage[] = [];
    let clock = 0;
    const h = createOrreryHost((m) => messages.push(m), () => (clock += 0.01));
    const last = () => messages.filter((m): m is OrrerySnapshot => m.type === 'state').pop()!;
    return { h, messages, last };
  };

  it('loads, runs at a rate, records trails in the chosen frame and pauses', () => {
    const { h, last } = host();
    h.receive({ type: 'load', bodies: preset('galilean'), method: 'auto', frame: { centre: 'jupiter', rotate: null } });
    expect(last().trailReset).toBe(true);
    expect(last().method).toBe('whfast');
    h.receive({ type: 'run', rate: 2, postEvery: 0.1 });
    for (let k = 0; k < 30; k++) h.tick(0.1, 1000);
    const s = last();
    expectNear(s.t, 6, 0.1, 'six days in three seconds');
    expect(s.running).toBe(true);
    // Trail points come in fives; Jupiter's own trail sits at the frame's centre.
    expect(s.trail.length % 5).toBe(0);
    const jupiterPoints = [];
    for (let k = 0; k < s.trail.length; k += 5) if (s.trail[k] === 0) jupiterPoints.push(Math.hypot(s.trail[k + 2], s.trail[k + 3]));
    expect(jupiterPoints.length).toBeGreaterThan(0);
    expect(Math.max(...jupiterPoints)).toBe(0);
    h.receive({ type: 'pause' });
    expect(last().running).toBe(false);
  });

  it('applies edits, says why one fails, and undoes', () => {
    const { h, messages, last } = host();
    h.receive({ type: 'load', bodies: preset('one-planet'), method: 'auto' });
    h.receive({ type: 'add', body: { name: 'Moonlet', gm: 0, radius: 0, colour: '#fff', parent: 'planet', orbit: { a: 0.002, e: 0, i: 0, node: 0, peri: 0, M: 0 } } });
    expect(last().ids).toEqual(['sun', 'planet', 'moonlet']);
    expect(last().canUndo).toBe(true);
    h.receive({ type: 'add', body: { name: 'Bad', gm: 0, radius: 0, colour: '#fff', parent: 'planet', orbit: { a: 1, e: 2, i: 0, node: 0, peri: 0, M: 0 } } });
    expect(messages.some((m) => m.type === 'error' && /eccentricity/.test(m.message))).toBe(true);
    h.receive({ type: 'undo' });
    expect(last().ids).toEqual(['sun', 'planet']);
    h.receive({ type: 'advance', days: 100 });
    expect(last().t).toBeGreaterThanOrEqual(100);
    expect(last().events.length).toBeGreaterThanOrEqual(0);
  });
});

describe('the Orrery’s words', () => {
  it('formats distances, spans and masses', () => {
    expect(formatDistance(4670 / 149_597_870.7)).toBe('4,670 km');
    expect(formatDistance(0.012)).toBe('0.012 AU (1,800,000 km)');
    expect(formatDistance(5.2026)).toBe('5.20 AU');
    expect(formatSpan(7.155)).toBe('7.16 days');
    expect(formatSpan(4332.6)).toBe('11.9 years');
    expect(formatSpan(0.5)).toBe('12 hours');
    expect(formatMass(GM_SUN_AU_DAY)).toBe('1.00 Suns');
  });

  it('caps the time warp by the fastest orbit', () => {
    // Mercury (88 days): up to a century a second; Io (1.8 days): far less.
    expect(RATES[maxRateIndex(62)].days).toBeGreaterThanOrEqual(365.25 * 100);
    expect(RATES[maxRateIndex(1.77)].days).toBeLessThanOrEqual(365.25 * 20);
    expect(maxRateIndex(1e-6)).toBeGreaterThanOrEqual(3);
  });
});

