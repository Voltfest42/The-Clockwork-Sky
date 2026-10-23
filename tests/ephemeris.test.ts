import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AU } from '../src/core/constants';
import { eclipticMatrix } from '../src/core/coords/precession';
import { moonGeocentric, planetGeocentric, skyBodies, sunGeocentric, type SkyBodyName } from '../src/core/ephemeris/bodies';
import { eccentricAnomaly, hyperbolicAnomaly, trueAnomalyFromEccentric } from '../src/core/ephemeris/kepler';
import { moonPosition } from '../src/core/ephemeris/moon';
import { heliocentricEcliptic, planetsValidAt, standishTable } from '../src/core/ephemeris/planets';
import { sunPosition } from '../src/core/ephemeris/sun';
import { angleBetween, apply, fromSpherical, norm, toSpherical, type Vec3 } from '../src/core/math/vec3';
import { jdFromCalendar } from '../src/core/time/calendar';
import { julianEpoch } from '../src/core/time/julian';
import { ARCSEC, DEG } from '../src/core/units';
import horizons from './fixtures/horizons.json';
import { expectAngle, expectNear } from './helpers';

describe("Kepler's equation", () => {
  it('leaves residuals below 1e-12 rad for every eccentricity up to 0.99', () => {
    fc.assert(
      fc.property(fc.double({ min: -20, max: 20, noNaN: true }), fc.double({ min: 0, max: 0.99, noNaN: true }), (M, e) => {
        const E = eccentricAnomaly(M, e);
        expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-12);
      }),
      { numRuns: 2000 },
    );
  });

  it('copes with the hard corner: e close to 1 and M close to 0', () => {
    for (const e of [0.999, 0.999999]) {
      for (const M of [1e-9, 1e-6, 1e-3, -1e-4]) {
        const E = eccentricAnomaly(M, e);
        expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-12);
      }
    }
  });

  it('matches Meeus Example 30.a (e = 0.1, M = 5°: E = 5.554589°)', () => {
    expectNear(eccentricAnomaly(5 * DEG, 0.1) / DEG, 5.554589, 1e-6, 'E');
  });

  it('gives the true anomaly from the eccentric anomaly', () => {
    expect(trueAnomalyFromEccentric(0, 0.5)).toBe(0);
    expectNear(trueAnomalyFromEccentric(Math.PI / 2, 0), Math.PI / 2, 1e-15);
    // At E = 90°, the planet is at x = −ae from the focus… so cos ν = −e.
    expectNear(Math.cos(trueAnomalyFromEccentric(Math.PI / 2, 0.3)), -0.3, 1e-15);
  });

  it('solves the hyperbolic form', () => {
    fc.assert(
      fc.property(fc.double({ min: -50, max: 50, noNaN: true }), fc.double({ min: 1.001, max: 5, noNaN: true }), (M, e) => {
        const F = hyperbolicAnomaly(M, e);
        expect(Math.abs(e * Math.sinh(F) - F - M)).toBeLessThan(1e-9 * Math.max(1, Math.abs(M)));
      }),
      { numRuns: 1000 },
    );
  });
});

describe('the Sun (Meeus ch. 25)', () => {
  it('matches Example 25.a: 1992 October 13.0 TD', () => {
    const sun = sunPosition(2_448_908.5);
    expectNear(sun.lon / DEG, 199.90988, 0.00002, 'true longitude ☉');
    expectNear(sun.distance, 0.99766, 0.00001, 'R');
    expectNear(sun.eccentricity, 0.016711668, 1e-9, 'e');
  });
});

describe('the Moon (Meeus ch. 47)', () => {
  it('matches Example 47.a: 1992 April 12, 0h TD', () => {
    const moon = moonPosition(2_448_724.5);
    expectNear(moon.lon / DEG, 133.162655, 0.000002, 'λ');
    expectNear(moon.lat / DEG, -3.229126, 0.000002, 'β');
    expectNear(moon.distanceKm, 368_409.7, 0.1, 'Δ');
  });
});

describe('the planets (Standish)', () => {
  it('uses Table 1 for 1800–2050 and Tables 2a/2b otherwise', () => {
    expect(standishTable(jdFromCalendar({ year: 1900, month: 1, day: 1 }))).toBe(1);
    expect(standishTable(jdFromCalendar({ year: 1700, month: 1, day: 1 }))).toBe(2);
    expect(standishTable(jdFromCalendar({ year: 2100, month: 1, day: 1 }))).toBe(2);
  });

  it('are valid from 3000 BC to AD 3000 only', () => {
    expect(planetsValidAt(jdFromCalendar({ year: -2999, month: 1, day: 1 }))).toBe(true);
    expect(planetsValidAt(jdFromCalendar({ year: -3000, month: 12, day: 31 }))).toBe(false);
    expect(planetsValidAt(jdFromCalendar({ year: 3000, month: 12, day: 31 }))).toBe(true);
    expect(planetsValidAt(jdFromCalendar({ year: 3001, month: 1, day: 1 }))).toBe(false);
    expect(() => heliocentricEcliptic('mars', jdFromCalendar({ year: 3500, month: 1, day: 1 }))).toThrow(RangeError);
    expect(skyBodies(jdFromCalendar({ year: 5000, month: 1, day: 1 })).map((b) => b.name)).toEqual(['sun', 'moon']);
  });

  it('keep each planet near its semi-major axis', () => {
    const bounds: Record<string, [number, number]> = { mercury: [0.3, 0.47], earth: [0.98, 1.02], jupiter: [4.9, 5.5], neptune: [29.7, 30.4] };
    for (let jd = 2_378_496.5; jd < 2_469_807.5; jd += 1234.5) {
      for (const [planet, [lo, hi]] of Object.entries(bounds)) {
        const r = norm(heliocentricEcliptic(planet as 'mercury', jd));
        expect(r, `${planet} at JD ${jd}`).toBeGreaterThan(lo);
        expect(r, `${planet} at JD ${jd}`).toBeLessThan(hi);
      }
    }
  });
});

// ---------- against JPL Horizons (DE441) ----------

interface Row {
  body: SkyBodyName;
  jdTT: number;
  ra: number;
  dec: number;
  delta: number;
}
const rows = horizons.rows as Row[];

/** JPL's nominal heliocentric errors (λ, φ in arcseconds; ρ in 1000 km) for 1800–2050 and for 3000 BC–AD 3000. */
const STANDISH_ERRORS: Record<string, { modern: [number, number, number]; long: [number, number, number]; a: number }> = {
  mercury: { modern: [15, 1, 1], long: [20, 15, 1], a: 0.387 },
  venus: { modern: [20, 1, 4], long: [40, 30, 8], a: 0.723 },
  earth: { modern: [20, 8, 6], long: [40, 15, 15], a: 1 },
  mars: { modern: [40, 2, 25], long: [100, 40, 30], a: 1.524 },
  jupiter: { modern: [400, 10, 600], long: [600, 100, 1000], a: 5.203 },
  saturn: { modern: [600, 25, 1500], long: [1000, 100, 4000], a: 9.537 },
  uranus: { modern: [50, 2, 1000], long: [2000, 30, 8000], a: 19.19 },
  neptune: { modern: [10, 1, 200], long: [400, 15, 4000], a: 30.07 },
};

/** The largest geocentric error (arcseconds) that JPL's heliocentric error budget allows, for a planet at distance Δ (AU). */
function planetTolerance(body: string, jdTT: number, delta: number): number {
  const span = standishTable(jdTT) === 1 ? 'modern' : 'long';
  const linear = (name: string) => {
    const { a } = STANDISH_ERRORS[name];
    const [lambda, phi, rho] = STANDISH_ERRORS[name][span];
    // An angular error at the planet's distance from the Sun, plus its distance error, as a length in AU.
    return Math.hypot(lambda, phi) * ARCSEC * a + (rho * 1e6) / AU;
  };
  return (1.5 * (linear(body) + linear('earth'))) / delta / ARCSEC + 5;
}

function horizonsVector(row: Row): Vec3 {
  return fromSpherical(row.ra * DEG, row.dec * DEG, row.delta);
}

function modelVector(row: Row): Vec3 {
  if (row.body === 'sun') return sunGeocentric(row.jdTT);
  if (row.body === 'moon') return moonGeocentric(row.jdTT);
  return planetGeocentric(row.body, row.jdTT);
}

const modern = (row: Row) => {
  const epoch = julianEpoch(row.jdTT);
  return epoch >= 1800 && epoch <= 2050;
};

describe('positions against JPL Horizons, 1800–2050', () => {
  it('has fixtures for every body', () => {
    expect(new Set(rows.map((r) => r.body)).size).toBe(9);
    expect(rows.filter(modern).length).toBeGreaterThanOrEqual(9 * 25);
  });

  it('puts the Sun within 0.01° (Meeus’s stated accuracy)', () => {
    for (const row of rows.filter((r) => r.body === 'sun' && modern(r))) {
      const off = angleBetween(modelVector(row), horizonsVector(row)) / ARCSEC;
      expect(off, `Sun at JD ${row.jdTT}`).toBeLessThan(36);
      // Meeus's distance ignores the Moon's pull on Earth (Earth swings 4,700 km about the Earth–Moon barycentre).
      expectNear(norm(modelVector(row)), row.delta, 1e-4, 'Sun distance');
    }
  });

  it('puts the Moon within 30″, and its distance within 60 km', () => {
    // Meeus quotes about 10″ against the full ELP-2000/82; against DE441 the 60-term series is off by up to 27″ in longitude here.
    for (const row of rows.filter((r) => r.body === 'moon' && modern(r))) {
      const off = angleBetween(modelVector(row), horizonsVector(row)) / ARCSEC;
      expect(off, `Moon at JD ${row.jdTT}`).toBeLessThan(30);
      expectNear((norm(modelVector(row)) * AU) / 1000, (row.delta * AU) / 1000, 60, 'Moon distance (km)');
    }
  });

  it('puts every planet within JPL’s error budget', () => {
    for (const row of rows.filter((r) => r.body !== 'sun' && r.body !== 'moon' && modern(r))) {
      const off = angleBetween(modelVector(row), horizonsVector(row)) / ARCSEC;
      expect(off, `${row.body} at JD ${row.jdTT}`).toBeLessThan(planetTolerance(row.body, row.jdTT, row.delta));
    }
  });
});

describe('positions against JPL Horizons, 3000 BC to AD 3000', () => {
  const long = rows.filter((r) => !modern(r) && planetsValidAt(r.jdTT));

  it('keeps every planet within JPL’s long-span error budget', () => {
    for (const row of long.filter((r) => r.body !== 'sun' && r.body !== 'moon')) {
      const off = angleBetween(modelVector(row), horizonsVector(row)) / ARCSEC;
      expect(off, `${row.body} at JD ${row.jdTT}`).toBeLessThan(planetTolerance(row.body, row.jdTT, row.delta));
    }
  });

  it('keeps the Sun within 0.03°', () => {
    for (const row of long.filter((r) => r.body === 'sun')) {
      const off = angleBetween(modelVector(row), horizonsVector(row)) / ARCSEC;
      expect(off, `Sun at JD ${row.jdTT}`).toBeLessThan(108);
    }
  });

  it('keeps the Moon within 0.25° (Meeus’s series drifts from DE441 far from the present)', () => {
    for (const row of long.filter((r) => r.body === 'moon')) {
      const off = angleBetween(modelVector(row), horizonsVector(row)) / DEG;
      expect(off, `Moon at JD ${row.jdTT}`).toBeLessThan(0.25);
    }
  });
});

describe('sky bodies', () => {
  const jd = jdFromCalendar({ year: 2026, month: 10, day: 23 });
  const bodies = skyBodies(jd);

  it('lists the Sun, the Moon and seven planets', () => {
    expect(bodies.map((b) => b.name)).toEqual(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
  });

  it('give sensible brightness and lighting', () => {
    const by = Object.fromEntries(bodies.map((b) => [b.name, b]));
    expect(by.venus.magnitude).toBeLessThan(-3.5);
    expect(by.venus.magnitude).toBeGreaterThan(-5);
    expect(by.jupiter.magnitude).toBeLessThan(-1.5);
    expect(by.neptune.magnitude).toBeGreaterThan(7.5);
    for (const b of bodies) {
      expect(b.illuminated).toBeGreaterThanOrEqual(0);
      expect(b.illuminated).toBeLessThanOrEqual(1);
    }
    // Outer planets are always nearly fully lit from Earth.
    expect(by.saturn.illuminated).toBeGreaterThan(0.99);
  });

  it('keep the Sun on the ecliptic of date, at Meeus’s longitude', () => {
    for (let k = 0; k < 12; k++) {
      const t = jd + k * 30.4;
      const ecl = toSpherical(apply(eclipticMatrix(t), sunGeocentric(t)));
      expect(Math.abs(ecl.lat)).toBeLessThan(1e-12);
      expectAngle(ecl.lon, sunPosition(t).lon, 1e-6);
    }
  });
});
