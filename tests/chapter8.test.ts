import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { discTemperature, gasDensity, MATERIALS, radiusAtTemperature, snowLine, solidDensity } from '../src/core/orbits/disc';
import { JUPITER_A, JUPITER_RESONANCES, orbitsPerPlanetOrbit, periodRatio, resonanceAxis } from '../src/core/orbits/resonance';
import { Simulation } from '../src/core/nbody/simulation';
import { positionOf } from '../src/core/nbody/system';
import { jdFromCalendar } from '../src/core/time/calendar';
import asteroids from '../src/data/asteroids.json';
import { MOONS_AS_OF, WORLDS, worldById } from '../src/data/planets';
import { describeLaps, galileanBodies, inFrame, LapCounter, laplaceAngle, MOONS, orbitFrame, PERIODS, STEP_DAYS, type MoonId } from '../src/figures/galilean';
import { ageThere, compareSizes, formatDays, formatHours, formatYear, weightThere } from '../src/figures/planetCards';
import { distanceBetween, lightTime, orbitPath, planetAt, sizeRow } from '../src/figures/solarSystem';
import { beltBins, binAt, gapDepth, resonanceMarkers, spacingWords } from '../src/figures/asteroidBelt';
import { checkThreeToOne } from '../src/content/checks/chapter8Answers';
import fixture from './fixtures/galilean.json';
import { expectNear } from './helpers';

describe('resonances with Jupiter (brief §9)', () => {
  it('puts the Kirkwood gaps at 2.50, 2.82, 2.95 and 3.27 AU', () => {
    const at = (p: number, q: number) => resonanceAxis(JUPITER_A, p, q);
    expectNear(at(3, 1), 2.5, 0.01, '3:1');
    expectNear(at(5, 2), 2.82, 0.01, '5:2');
    expectNear(at(7, 3), 2.95, 0.01, '7:3');
    expectNear(at(2, 1), 3.27, 0.01, '2:1');
    expectNear(at(4, 1), 2.06, 0.01, '4:1');
    expectNear(at(3, 2), 3.97, 0.01, 'Hildas');
  });

  it('round-trips: an orbit at a resonance goes round p times for every q of the planet’s', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9 }), fc.integer({ min: 1, max: 9 }), (p, q) => {
        const a = resonanceAxis(JUPITER_A, p, q);
        expect(orbitsPerPlanetOrbit(a, JUPITER_A)).toBeCloseTo(p / q, 10);
        expect(periodRatio(a, JUPITER_A)).toBeCloseTo(q / p, 10);
      }),
    );
  });

  it('finds the real belt nearly empty at the gaps and full between them', () => {
    const bins = beltBins();
    for (const r of JUPITER_RESONANCES.filter((x) => x.kind === 'gap' && x.p !== 4)) {
      const a = resonanceAxis(JUPITER_A, r.p, r.q);
      // At least three times fewer asteroids in the gap than in the belt round it (the 7 : 3 gap is the shallowest).
      expect(gapDepth(bins, a), r.name).toBeLessThan(r.p === 7 ? 0.35 : 0.2);
    }
    expect(binAt(bins, 2.5).count).toBeLessThan(binAt(bins, 2.6).count / 10);
    expect(binAt(bins, 3.27).count).toBeLessThan(binAt(bins, 3.1).count / 50);
    // The Hildas and Trojans pile up at 3 : 2 and 1 : 1.
    expect(binAt(bins, 3.97).count).toBeGreaterThan(5 * binAt(bins, 3.6).count);
    expect(binAt(bins, 5.2).count).toBeGreaterThan(20 * binAt(bins, 4.6).count);
  });

  it('counts the numbered asteroids, and their spacing in the belt is millions of km', () => {
    expect(asteroids.count).toBeGreaterThan(850_000);
    expect(asteroids.histogram.counts.reduce((s, c) => s + c, 0)).toBeGreaterThan(0.97 * asteroids.count);
    expect(asteroids.spacing.medianKm).toBeGreaterThan(1e6);
    expect(asteroids.spacing.medianKm).toBeLessThan(5e6);
    expect(spacingWords(asteroids.spacing.medianKm)).toMatch(/^2\.7 million km, about 7 times the distance to the Moon$/);
    expect(resonanceMarkers().map((m) => m.a.toFixed(2))).toEqual(['2.06', '2.50', '2.82', '2.96', '3.28', '3.97', '5.20']);
  });

  it('accepts 2.45–2.55 AU for the 3 : 1 question', () => {
    expect(checkThreeToOne(2.5).correct).toBe(true);
    expect(checkThreeToOne(2.45).correct).toBe(true);
    expect(checkThreeToOne(2.7).correct).toBe(false);
    expect(checkThreeToOne(2.2).correct).toBe(false);
  });
});

describe('the snow line (Hayashi 1981)', () => {
  it('is 280 K at 1 AU, falls as one over the square root of distance, and puts the snow line at 2.7 AU', () => {
    expect(discTemperature(1)).toBe(280);
    expectNear(discTemperature(4), 140, 1e-9, 'at 4 AU');
    expectNear(snowLine(), 2.71, 0.01, 'snow line');
    expectNear(snowLine(4), 2 * snowLine(), 1e-9, 'four Suns: twice as far');
  });

  it('round-trips temperature and distance', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.05, max: 200, noNaN: true }), fc.double({ min: 0.1, max: 10, noNaN: true }), (r, L) => {
        expect(radiusAtTemperature(discTemperature(r, L), L)).toBeCloseTo(r, 8);
      }),
    );
  });

  it('jumps about fourfold in solids at the snow line, while the gas is smooth', () => {
    const s = snowLine();
    expectNear(solidDensity(s * 1.0001) / solidDensity(s * 0.9999), 30 / 7.1, 0.01, 'jump');
    expectNear(gasDensity(s * 1.0001) / gasDensity(s * 0.9999), 1, 0.001, 'gas');
    expect(MATERIALS.map((m) => m.freezesK)).toEqual([1300, 170, 40]);
    // Methane freezes beyond Neptune in this model; rock everywhere beyond 0.05 AU.
    expect(radiusAtTemperature(40)).toBeGreaterThan(30);
    expect(radiusAtTemperature(1300)).toBeLessThan(0.05);
  });
});

describe('Jupiter’s moons (8.3)', () => {
  const run = (days: number) => {
    const sim = new Simulation(galileanBodies(), 'leapfrog', STEP_DAYS);
    sim.advance(Math.round(days / STEP_DAYS));
    return sim;
  };

  it('follows Horizons’ positions for 60 days, drifting only as fast as leaving out Jupiter’s bulge explains', () => {
    const sim = new Simulation(galileanBodies(), 'leapfrog', STEP_DAYS);
    let t = 0;
    for (const row of [...fixture.rows].sort((a, b) => a.jdTT - b.jdTT)) {
      const days = row.jdTT - 2_461_041.5;
      sim.advance(Math.round((days - t) / STEP_DAYS));
      t = days;
      const index = MOONS.findIndex((m) => m.id === row.id) + 1;
      const p = positionOf(sim.system, index);
      const j = positionOf(sim.system, 0);
      const r = Math.hypot(...row.x);
      const miss = Math.hypot(p[0] - j[0] - row.x[0], p[1] - j[1] - row.x[1], p[2] - j[2] - row.x[2]);
      // Jupiter's bulge pulls the inner moons a little harder than a point would, so the real ones go round slightly faster
      // (Io by about 0.14%, 17° in 60 days). The drift grows steadily, and less for the outer moons.
      const limit = { io: 0.006, europa: 0.0012, ganymede: 0.00025, callisto: 0.0001 }[row.id as MoonId];
      expect(miss / r, `${row.id} after ${days} days`).toBeLessThan(limit * days);
    }
    expect(Math.abs(sim.energyError())).toBeLessThan(1e-6);
  });

  it('goes round 1 : 2 : 4, and keeps the Laplace angle near 180°', () => {
    const sim = new Simulation(galileanBodies(), 'leapfrog', STEP_DAYS);
    const frame = orbitFrame();
    const counters = Object.fromEntries(MOONS.map((m) => [m.id, new LapCounter()])) as Record<MoonId, LapCounter>;
    const longitude = (i: number) => {
      const p = inFrame(frame, positionOf(sim.system, 0), positionOf(sim.system, i));
      return Math.atan2(p.y, p.x);
    };
    let worst = 0;
    const days = 10 * PERIODS.ganymede;
    for (let k = 0; k < days / STEP_DAYS; k++) {
      sim.advance(1);
      MOONS.forEach((m, i) => counters[m.id].see(longitude(i + 1)));
      const off = Math.abs(Math.abs(laplaceAngle(longitude(1), longitude(2), longitude(3))) - Math.PI);
      worst = Math.max(worst, off);
    }
    expectNear(counters.europa.laps / counters.ganymede.laps, 2, 0.02, 'Europa per Ganymede');
    expectNear(counters.io.laps / counters.ganymede.laps, 4, 0.04, 'Io per Ganymede');
    expectNear(counters.ganymede.laps, 10, 0.1, 'Ganymede laps');
    expect(worst).toBeLessThan((15 * Math.PI) / 180);
  });

  it('has periods within 1% of JPL’s', () => {
    const sim = run(0);
    const frame = orbitFrame();
    const counters = MOONS.map(() => new LapCounter());
    const days = 50;
    for (let k = 0; k < days / STEP_DAYS; k++) {
      sim.advance(1);
      MOONS.forEach((_, i) => {
        const p = inFrame(frame, positionOf(sim.system, 0), positionOf(sim.system, i + 1));
        counters[i].see(Math.atan2(p.y, p.x));
      });
    }
    MOONS.forEach((m, i) => expectNear(days / counters[i].laps / PERIODS[m.id], 1, 0.01, m.name));
  });

  it('counts laps the short way round, and words them', () => {
    const c = new LapCounter();
    for (let k = 0; k <= 50; k++) c.see(((k * 0.3) % (2 * Math.PI)) - Math.PI);
    expectNear(c.laps, (50 * 0.3) / (2 * Math.PI), 1e-9, 'laps');
    expect(describeLaps(0, { io: 0, europa: 0, ganymede: 0, callisto: 0 })).toMatch(/Press Play/);
    expect(describeLaps(7.2, { io: 4.05, europa: 2.02, ganymede: 1.01, callisto: 0.43 })).toBe(
      'After 7.2 days. Io has gone round 4 times, Europa 2 times, Ganymede 1 time and Callisto 0 times. For each lap of Ganymede: Europa 2.00, Io 4.01.',
    );
  });
});

describe('planet cards (8.2)', () => {
  it('holds the NASA fact-sheet values, and moon counts as of March 2026', () => {
    expect(MOONS_AS_OF).toBe('March 2026');
    expect(worldById('saturn').moons).toBe(285);
    expect(worldById('jupiter').moons).toBe(101);
    expect(worldById('neptune').moons).toBe(16);
    // Saturn has the most known moons.
    expect([...WORLDS].sort((a, b) => b.moons - a.moons)[0].id).toBe('saturn');
    // Mass and size agree with the gravity: g ∝ M / R².
    for (const w of WORLDS) {
      const g = w.mass / (w.diameterKm / 12_756) ** 2;
      expect(Math.abs(g / w.gravity - 1), w.name).toBeLessThan(w.kind === 'gas giant' || w.kind === 'ice giant' ? 0.12 : 0.04);
    }
  });

  it('works out your weight and age there', () => {
    expectNear(weightThere(70, worldById('mars')), 26.6, 0.01, 'Mars');
    expectNear(weightThere(70, worldById('jupiter')), 177.1, 0.01, 'Jupiter');
    expectNear(ageThere(30, worldById('mercury')), 124.6, 0.1, 'Mercury');
    expectNear(ageThere(30, worldById('neptune')), 0.18, 0.01, 'Neptune');
    expectNear(ageThere(30, worldById('earth')), 30, 0.01, 'Earth');
  });

  it('words days and years', () => {
    expect(formatHours(23.934)).toBe('23 hours 56 minutes');
    expect(formatHours(4222.6)).toBe('176 days');
    expect(formatHours(-5832.5)).toBe('243 days');
    expect(formatDays(4332.59)).toBe('11.9 years');
    expect(formatYear(worldById('mars'))).toBe('687 days');
    expect(formatYear(worldById('saturn'))).toBe('29.5 Earth years');
    expect(compareSizes(worldById('jupiter'), worldById('earth'))).toBe('Jupiter is 11.2 times as wide as Earth.');
    expect(compareSizes(worldById('moon'), worldById('earth'))).toBe('The Moon is 3.67 times narrower than Earth.');
  });
});

describe('the Solar System today (8.1)', () => {
  const jd = jdFromCalendar({ year: 2026, month: 10, day: 25 });

  it('puts every planet at its distance from the Sun', () => {
    for (const w of WORLDS.filter((x) => x.id !== 'moon')) {
      const r = planetAt(w.id as Exclude<typeof w.id, 'moon'>, jd).r;
      expect(Math.abs(r / w.distanceAu - 1), w.name).toBeLessThan(0.22);
    }
  });

  it('closes each orbit, and words light times', () => {
    const path = orbitPath('mars', jd);
    expect(path).toHaveLength(180);
    expectNear(Math.hypot(path[0].x - path[179].x, path[0].y - path[179].y), 0.053, 0.01, 'one step apart');
    expect(lightTime(1)).toBe('8 minutes 19 seconds');
    expect(lightTime(30)).toBe('4 hours 10 minutes');
    expect(lightTime(0.05)).toBe('25 seconds');
    expect(distanceBetween('earth', 'earth', jd)).toBe(0);
  });

  it('lines the planets up at their true sizes', () => {
    const row = sizeRow(500, 40, 10);
    const jupiter = row.find((p) => p.id === 'jupiter')!;
    const earth = row.find((p) => p.id === 'earth')!;
    expectNear(jupiter.r / earth.r, 142_984 / 12_756, 1e-9, 'Jupiter : Earth');
    expectNear(jupiter.r, 51.3, 0.1, 'Jupiter px');
    const reach = (p: (typeof row)[number]) => (p.id === 'saturn' ? 2.27 : 1) * p.r;
    for (let i = 1; i < row.length; i++) expect(row[i].x - reach(row[i])).toBeGreaterThan(row[i - 1].x + reach(row[i - 1]));
    expect(row.at(-1)!.x + row.at(-1)!.r).toBeLessThan(560);
  });
});
