import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { eclipticMatrix, eclipticPole, equatorPole, precessionMatrix, precessionObliquity } from '../src/core/coords/precession';
import { apparentAltitude, refractionFromApparent, refractionFromTrue } from '../src/core/coords/refraction';
import { horizontalFromEquatorial, meanObliquity } from '../src/core/coords/transforms';
import { dms, hms, wrapPi } from '../src/core/math/angles';
import { angleBetween, apply, determinant, fromSpherical, multiply, norm, toSpherical, transpose, type Vec3 } from '../src/core/math/vec3';
import { eclipticChartFrames, horizonFrames, horizonMatrix } from '../src/core/sky/frames';
import { angleFromCentre, azAlt, cameraBasis, horizonOnScreen, localDirection, project, projectionScale, unproject } from '../src/core/sky/projection';
import { dailyPath, daylight, fractionAboveHorizon, limitingMagnitude, meridianAltitude } from '../src/core/sky/visibility';
import { countBrighterThan, findHip, findStarByName, parseStarCatalogue, type RawStarFile } from '../src/core/stars/catalogue';
import { starAt, starPositionsAt } from '../src/core/stars/motion';
import { blackBodyColour, starColour, starDot, temperatureFromBV } from '../src/core/stars/photometry';
import { utFromTt } from '../src/core/time/deltaT';
import { jdFromCalendar } from '../src/core/time/calendar';
import { localSiderealTime } from '../src/core/time/sidereal';
import { ARCMIN, ARCSEC, DEG } from '../src/core/units';
import rawStars from '../src/data/hyg/stars.json';
import { expectAngle, expectNear } from './helpers';

const stars = parseStarCatalogue(rawStars as unknown as RawStarFile);
const jdOfEpoch = (year: number) => 2_451_545 + (year - 2000) * 365.25;

const unit = fc.tuple(fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), fc.double({ min: -Math.PI / 2, max: Math.PI / 2, noNaN: true }));

describe('precession (Vondrák, Capitaine & Wallace 2011)', () => {
  // Reference values from ERFA's own tests (t_erfa_c.c: t_ltpecl, t_ltpequ, t_ltp).
  it('matches eraLtpecl for 1500 BC (epoch −1500)', () => {
    const v = eclipticPole(jdOfEpoch(-1500));
    expectNear(v[0], 0.0004768625676477096, 1e-12);
    expectNear(v[1], -0.4052259533091875, 1e-12);
    expectNear(v[2], 0.9142164401096448, 1e-12);
  });

  it('matches eraLtpequ for epoch −2500', () => {
    const v = equatorPole(jdOfEpoch(-2500));
    expectNear(v[0], -0.3586652560237327, 1e-12);
    expectNear(v[1], -0.1996978910771129, 1e-12);
    expectNear(v[2], 0.911855244225082, 1e-12);
  });

  it('matches eraLtp for epoch 1666.666', () => {
    const P = precessionMatrix(jdOfEpoch(1666.666));
    const expected = [
      [0.9967044141159214, 0.07437801893193211, 0.03237624409345603],
      [-0.07437802731819618, 0.9972293894454534, -0.001205768842723593],
      [-0.03237622482766576, -0.001206286039697609, 0.9994750246704011],
    ];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expectNear(P[i][j], expected[i][j], 1e-12, `P[${i}][${j}]`);
  });

  it('is the identity at J2000.0 to within the model’s fit (about 0.01″)', () => {
    const P = precessionMatrix(2_451_545);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expectNear(P[i][j], i === j ? 1 : 0, 0.05 * ARCSEC);
  });

  it('gives proper rotations for any epoch from 200,000 BC to AD 200,000', () => {
    fc.assert(
      fc.property(fc.double({ min: -200_000, max: 200_000, noNaN: true }), (year) => {
        const P = precessionMatrix(jdOfEpoch(year));
        expectNear(determinant(P), 1, 1e-12);
        const I = multiply(P, transpose(P));
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expectNear(I[i][j], i === j ? 1 : 0, 1e-12);
      }),
    );
  });

  it('gives the J2000 obliquity (84,381.406″) and agrees with Laskar’s for 2,000 years', () => {
    expectNear(precessionObliquity(2_451_545) / ARCSEC, 84_381.406, 0.01);
    for (const year of [0, 1000, 1500, 2500, 3000, 4000]) {
      expectNear(precessionObliquity(jdOfEpoch(year)) / ARCSEC, meanObliquity(jdOfEpoch(year)) / ARCSEC, 2, `obliquity in ${year}`);
    }
  });

  it('moves the equinox about 50.3″ a year along the ecliptic: once round in about 25,800 years', () => {
    // A star on the J2000 ecliptic gains ecliptic longitude of date at the rate of the general precession.
    const lon = (year: number) => toSpherical(apply(eclipticMatrix(jdOfEpoch(year)), [1, 0, 0])).lon;
    const perYear = wrapPi(lon(2050) - lon(1950)) / 100;
    expectNear(perYear / ARCSEC, 50.288, 0.01);
    expectNear((2 * Math.PI) / perYear, 25_772, 10);
  });

  it('matches Meeus Example 21.b: θ Persei from J2000 to 2028 November 13.19 TD', () => {
    // Mean place, J2000: 2h 44m 11.986s, +49° 13′ 42.48″; proper motion +0.03425 s/yr in RA and −0.0895″/yr in Dec.
    const ra = hms(2, 44, 11.986);
    const dec = dms(49, 13, 42.48);
    const pmra = 0.03425 * 15 * ARCSEC * Math.cos(dec);
    const jd = 2_462_088.69;
    const epoch = 2000 + (jd - 2_451_545) / 365.25;
    const moved = starAt(ra, dec, pmra, -0.0895 * ARCSEC, 0, 0, epoch);
    const ofDate = toSpherical(apply(precessionMatrix(jd), [moved.x, moved.y, moved.z]));
    expectAngle(ofDate.lon, hms(2, 46, 11.331), 0.3, 'α');
    expectAngle(ofDate.lat, dms(49, 20, 54.54), 0.3, 'δ');
  });

  it('keeps the ecliptic matrix consistent with the precession matrix', () => {
    for (const year of [-10_000, -3000, 0, 2026, 16_000]) {
      const jd = jdOfEpoch(year);
      // The equinox of date is the first row of both.
      expectNear(angleBetween(precessionMatrix(jd)[0], eclipticMatrix(jd)[0]), 0, 1e-14);
    }
  });
});

describe('the pole stars, from the catalogue and the precession model', () => {
  /** The year a star comes closest to the north celestial pole, and how close, searching [from, to]. */
  function closestApproach(name: string, from: number, to: number, step: number) {
    const i = findStarByName(stars, name);
    let best = { year: from, separation: Infinity };
    for (let year = from; year <= to; year += step) {
      const s = starAt(stars.ra[i], stars.dec[i], stars.pmra[i], stars.pmdec[i], stars.parallax[i], stars.rv[i], year);
      const separation = angleBetween([s.x, s.y, s.z], equatorPole(jdOfEpoch(year)));
      if (separation < best.separation) best = { year, separation };
    }
    return best;
  }

  it('brings Polaris within about 0.46° of the pole around 2100', () => {
    const { year, separation } = closestApproach('Polaris', 2000, 2200, 1);
    expect(year).toBeGreaterThanOrEqual(2095);
    expect(year).toBeLessThanOrEqual(2110);
    expectNear(separation / DEG, 0.46, 0.01);
  });

  it('put Thuban within 0.1° of the pole around 2800 BC', () => {
    const { year, separation } = closestApproach('Thuban', -4000, -2000, 5);
    expect(year).toBeGreaterThanOrEqual(-2900);
    expect(year).toBeLessThanOrEqual(-2700);
    expect(separation / DEG).toBeLessThan(0.12);
  });

  it('brings Vega to about 6° from the pole around AD 13,600', () => {
    const { year, separation } = closestApproach('Vega', 10_000, 16_000, 10);
    expect(year).toBeGreaterThan(13_000);
    expect(year).toBeLessThan(14_200);
    expectNear(separation / DEG, 5.7, 0.3);
  });
});

describe('the star catalogue', () => {
  it('holds the naked-eye sky: about 8,900 stars to magnitude 6.5, brightest first', () => {
    expect(stars.count).toBeGreaterThan(8800);
    expect(stars.count).toBeLessThan(9100);
    for (let i = 1; i < stars.count; i++) expect(stars.mag[i]).toBeGreaterThanOrEqual(stars.mag[i - 1]);
    expect(stars.mag[stars.count - 1]).toBeLessThanOrEqual(6.5);
    expect(stars.names.get(0)).toBe('Sirius');
  });

  it('makes Polaris only about the 48th-brightest star', () => {
    const polaris = findStarByName(stars, 'Polaris');
    expect(countBrighterThan(stars, stars.mag[polaris] - 0.001)).toBe(47);
  });

  it('has the right positions and motions for some well-known stars', () => {
    const sirius = findHip(stars, 32349);
    expectAngle(stars.ra[sirius], hms(6, 45, 8.9), 1);
    expectAngle(stars.dec[sirius], dms(-16, 42, 58), 1);
    const arcturus = findStarByName(stars, 'Arcturus');
    expectNear(Math.hypot(stars.pmra[arcturus], stars.pmdec[arcturus]) / ARCSEC, 2.28, 0.01);
    expectNear(1 / (stars.parallax[arcturus] / ARCSEC), 11.26, 0.1); // parsecs
    expect(stars.bv[findStarByName(stars, 'Betelgeuse')]).toBeGreaterThan(1.4);
    expect(stars.bv[findStarByName(stars, 'Rigel')]).toBeLessThan(0);
  });
});

describe('stars’ own motions', () => {
  it('leave every star where it was at J2000.0', () => {
    const at2000 = starPositionsAt(stars, 2000);
    for (let i = 0; i < stars.count; i += 97) {
      const v = fromSpherical(stars.ra[i], stars.dec[i]);
      expectNear(angleBetween([at2000.xyz[3 * i], at2000.xyz[3 * i + 1], at2000.xyz[3 * i + 2]], v), 0, 1e-12);
      expectNear(at2000.mag[i], stars.mag[i], 1e-5);
    }
  });

  it('move a star by its proper motion times the time, for short spans', () => {
    fc.assert(
      fc.property(unit, fc.double({ min: -1e-5, max: 1e-5, noNaN: true }), fc.double({ min: -1e-5, max: 1e-5, noNaN: true }), ([ra, dec], pmra, pmdec) => {
        fc.pre(Math.abs(dec) < 1.5);
        const s = starAt(ra, dec, pmra, pmdec, 0, 0, 2010);
        expectNear(angleBetween([s.x, s.y, s.z], fromSpherical(ra, dec)), 10 * Math.hypot(pmra, pmdec), 1e-12);
      }),
    );
  });

  it('carry Arcturus about 16° across the 26,000 years of Figure 2.5', () => {
    const i = findStarByName(stars, 'Arcturus');
    const a = starAt(stars.ra[i], stars.dec[i], stars.pmra[i], stars.pmdec[i], stars.parallax[i], stars.rv[i], -10_000);
    const b = starAt(stars.ra[i], stars.dec[i], stars.pmra[i], stars.pmdec[i], stars.parallax[i], stars.rv[i], 16_000);
    expectNear(angleBetween([a.x, a.y, a.z], [b.x, b.y, b.z]) / DEG, 16.4, 0.3);
  });

  it('brighten stars that approach us: Sirius is coming closer', () => {
    const i = findStarByName(stars, 'Sirius');
    const later = starPositionsAt(stars, 62_000);
    expect(later.mag[i]).toBeLessThan(stars.mag[i]);
  });
});

describe('star colours and dots', () => {
  it('turns B−V into temperature (Ballesteros): the Sun’s 0.65 gives about 5,800 K', () => {
    expectNear(temperatureFromBV(0.65), 5778, 15);
    expectNear(temperatureFromBV(0), 10_125, 10);
    expect(temperatureFromBV(1.85)).toBeLessThan(3700);
  });

  it('draws a 6,500 K body nearly white, cool stars orange and hot stars blue', () => {
    const [r, g, b] = blackBodyColour(6504);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(20);
    const [r3, g3, b3] = blackBodyColour(3000);
    expect(r3).toBe(255);
    expect(g3).toBeLessThan(r3);
    expect(b3).toBeLessThan(g3);
    const [r2, , b2] = blackBodyColour(20_000);
    expect(b2).toBe(255);
    expect(r2).toBeLessThan(b2);
    expect(starColour(NaN)).toEqual([255, 255, 255]);
  });

  it('gives brighter stars bigger, more opaque dots, and none past the limit', () => {
    fc.assert(
      fc.property(fc.double({ min: -5, max: 6.4, noNaN: true }), fc.double({ min: 0.01, max: 3, noNaN: true }), (m, d) => {
        const a = starDot(m, 6.5);
        const b = starDot(Math.min(6.5, m + d), 6.5);
        expect(a.radius).toBeGreaterThanOrEqual(b.radius);
        expect(a.alpha).toBeGreaterThanOrEqual(b.alpha);
      }),
    );
    expect(starDot(6.6, 6.5).radius).toBe(0);
  });
});

describe('refraction', () => {
  it('lifts the horizon by about 34′ (Bennett), and nothing at the zenith', () => {
    expectNear(refractionFromApparent(0) / ARCMIN, 34.5, 0.3);
    expect(refractionFromApparent(90 * DEG) / ARCSEC).toBeLessThan(0.5);
    expectNear(refractionFromApparent(10 * DEG) / ARCMIN, 5.3, 0.1);
  });

  it('agrees with Sæmundsson’s inverse to within 0.1′ above 1°', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 89, noNaN: true }), (h) => {
        const trueAlt = h * DEG;
        const seen = apparentAltitude(trueAlt);
        expectNear(seen - refractionFromApparent(seen), trueAlt, 0.1 * ARCMIN);
      }),
    );
    expect(refractionFromTrue(-30 * DEG)).toBe(refractionFromTrue(-1.5 * DEG));
  });
});

describe('the sky projection', () => {
  it('puts the view’s centre at the origin and a point 90° away at distance 2', () => {
    fc.assert(
      fc.property(unit, ([az, alt]) => {
        const basis = cameraBasis(az, alt);
        const centre = project(localDirection(az, alt), basis);
        expectNear(Math.hypot(centre.X, centre.Y), 0, 1e-12);
        expectNear(Math.hypot(project(basis.up, basis).X, project(basis.up, basis).Y), 2, 1e-12);
      }),
    );
  });

  it('round-trips through unproject', () => {
    fc.assert(
      fc.property(unit, unit, ([az, alt], [lon, lat]) => {
        const basis = cameraBasis(az, alt);
        const v = localDirection(lon, lat);
        fc.pre(project(v, basis).depth > -0.99);
        const { X, Y } = project(v, basis);
        const back = unproject(X, Y, basis);
        expectNear(angleBetween(back, v), 0, 1e-9);
      }),
    );
  });

  it('keeps east on the right when facing north, and the zenith at the top', () => {
    const basis = cameraBasis(0, 0);
    expect(project(localDirection(Math.PI / 2, 0), basis).X).toBeGreaterThan(0);
    expect(project(localDirection(0, 1), basis).Y).toBeGreaterThan(0);
  });

  it('maps a view of a given width to the canvas width', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.05, max: Math.PI, noNaN: true }), (fov) => {
        const s = projectionScale(fov, 800);
        // The edge of the canvas, 400 px from the centre, is half the view's width from the centre.
        expectNear(angleFromCentre(400 / s), fov / 2, 1e-12);
      }),
    );
  });

  it('puts the horizon where the analytic circle says, with the ground on the right side', () => {
    fc.assert(
      fc.property(fc.double({ min: -1.5, max: 1.5, noNaN: true }), fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), (alt, az) => {
        fc.pre(Math.abs(alt) > 0.01);
        const basis = cameraBasis(0, alt);
        const shape = horizonOnScreen(alt);
        if (shape.kind !== 'circle') return;
        const p = project(localDirection(az, 0), basis);
        fc.pre(p.depth > -0.95);
        expectNear(Math.hypot(p.X, p.Y - shape.centreY), shape.radius, 1e-6 * shape.radius);
        // A point below the horizon is inside the circle exactly when groundInside says so.
        const below = project(localDirection(az, -0.2), basis);
        fc.pre(below.depth > -0.95);
        expect(Math.hypot(below.X, below.Y - shape.centreY) < shape.radius).toBe(shape.groundInside);
      }),
    );
  });

  it('reads azimuth and altitude back from a direction', () => {
    fc.assert(
      fc.property(unit, ([az, alt]) => {
        fc.pre(Math.abs(alt) < 1.5);
        const back = azAlt(localDirection(az, alt));
        expectAngle(back.az, az, 1e-6);
        expectNear(back.alt, alt, 1e-12);
      }),
    );
  });
});

describe('the sky frames', () => {
  it('agree with the coordinate transforms of Stage 1', () => {
    fc.assert(
      fc.property(unit, fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), fc.double({ min: -1.5, max: 1.5, noNaN: true }), ([ra, dec], lst, lat) => {
        const local = apply(horizonMatrix(lst, lat), fromSpherical(ra, dec));
        const expected = horizontalFromEquatorial({ ra, dec }, lst, lat);
        const got = azAlt(local);
        expectNear(got.alt, expected.alt, 1e-12);
        if (Math.abs(expected.alt) < 1.5) expectAngle(got.az, expected.az, 1e-5);
      }),
    );
  });

  it('put the celestial pole at an altitude equal to the latitude, due north', () => {
    for (const lat of [-60, -33.9, 0, 51.5, 69.6, 90]) {
      const frames = horizonFrames(jdFromCalendar({ year: 2026, month: 10, day: 23.9 }), { latitude: lat * DEG, longitude: 0 });
      const pole = azAlt(apply(frames.fromEquatorOfDate, [0, 0, 1]));
      expectNear(pole.alt / DEG, lat, 1e-9);
      if (Math.abs(lat) < 90) expectNear(Math.cos(pole.az), 1, 1e-9);
    }
  });

  it('turn the sky once per sidereal day, using UT', () => {
    const jd = jdFromCalendar({ year: 2026, month: 3, day: 20.5 });
    const place = { latitude: 51.5 * DEG, longitude: -0.13 * DEG };
    const frames = horizonFrames(jd, place);
    expectAngle(frames.lst, localSiderealTime(utFromTt(jd), place.longitude), 1e-9);
    const sidereal = horizonFrames(jd + 0.997_269_566, place);
    expectAngle(sidereal.lst, frames.lst, 0.1);
  });

  it('fix the chart frame to the J2000 ecliptic: the pole of date circles its north pole at 21°–26°', () => {
    // Not exactly 23.4°: the ecliptic itself slowly tilts away from where it was in 2000 (by about 2° in 12,000 years).
    expectNear(angleBetween(apply(eclipticChartFrames(2_451_545).fromEquatorOfDate, [0, 0, 1]), [0, 0, 1]) / DEG, 23.44, 0.01);
    for (const year of [-10_000, -2800, 2000, 14_000]) {
      const frames = eclipticChartFrames(jdOfEpoch(year));
      const pole = apply(frames.fromEquatorOfDate, [0, 0, 1]);
      expectNear(norm(pole), 1, 1e-12);
      expect(angleBetween(pole, [0, 0, 1]) / DEG).toBeGreaterThan(21);
      expect(angleBetween(pole, [0, 0, 1]) / DEG).toBeLessThan(26);
    }
  });
});

describe('visibility', () => {
  it('classifies daily paths: circumpolar if δ > 90° − φ, never rising if δ < −(90° − φ)', () => {
    fc.assert(
      fc.property(fc.double({ min: -89.9, max: 89.9, noNaN: true }), fc.double({ min: -89.5, max: 89.5, noNaN: true }), (latDeg, decDeg) => {
        const lat = latDeg * DEG;
        const dec = decDeg * DEG;
        // Sample the star's altitude through a day.
        let highest = -Infinity;
        let lowest = Infinity;
        for (let k = 0; k < 360; k++) {
          const alt = azAlt(apply(horizonMatrix(k * DEG, lat), fromSpherical(0, dec))).alt;
          highest = Math.max(highest, alt);
          lowest = Math.min(lowest, alt);
        }
        fc.pre(Math.abs(lowest) > 0.01 && Math.abs(highest) > 0.01);
        const expected = lowest > 0 ? 'circumpolar' : highest < 0 ? 'never-rises' : 'rises-and-sets';
        expect(dailyPath(dec, lat)).toBe(expected);
        expectNear(meridianAltitude(dec, lat), highest, 1e-4);
      }),
    );
  });

  it('answers the chapter’s questions: Polaris from Sydney, Canopus from London, Acrux from Sydney', () => {
    const polaris = stars.dec[findStarByName(stars, 'Polaris')];
    const canopus = stars.dec[findStarByName(stars, 'Canopus')];
    const acrux = stars.dec[findStarByName(stars, 'Acrux')];
    expect(dailyPath(polaris, -33.87 * DEG)).toBe('never-rises');
    expect(dailyPath(polaris, 51.5 * DEG)).toBe('circumpolar');
    expect(dailyPath(canopus, 51.5 * DEG)).toBe('never-rises');
    expect(dailyPath(canopus, -33.87 * DEG)).toBe('rises-and-sets');
    expect(dailyPath(acrux, -33.87 * DEG)).toBe('circumpolar');
    expect(fractionAboveHorizon(0, 51.5 * DEG)).toBeCloseTo(0.5, 12);
  });

  it('darkens the sky through the twilights', () => {
    expect(daylight(10 * DEG)).toBe('day');
    expect(daylight(-3 * DEG)).toBe('civil twilight');
    expect(daylight(-9 * DEG)).toBe('nautical twilight');
    expect(daylight(-15 * DEG)).toBe('astronomical twilight');
    expect(daylight(-30 * DEG)).toBe('night');
    expect(limitingMagnitude(-30 * DEG)).toBe(6.5);
    expect(limitingMagnitude(30 * DEG)).toBe(-4);
    for (let h = -30; h < 30; h += 0.5) expect(limitingMagnitude((h + 0.5) * DEG)).toBeLessThanOrEqual(limitingMagnitude(h * DEG));
  });
});

describe('a check on the whole chain', () => {
  it('puts Sirius where a planetarium would: London, 2026 Feb 1, 21:00 UT', () => {
    const jdTT = jdFromCalendar({ year: 2026, month: 2, day: 1 + 21 / 24 }) + 69.2 / 86_400;
    const frames = horizonFrames(jdTT, { latitude: 51.5074 * DEG, longitude: -0.1278 * DEG });
    const i = findStarByName(stars, 'Sirius');
    const at = starPositionsAt(stars, frames.epoch);
    const v: Vec3 = [at.xyz[3 * i], at.xyz[3 * i + 1], at.xyz[3 * i + 2]];
    const { az, alt } = azAlt(apply(frames.fromJ2000, v));
    // Sirius culminates at about 21.8° from London; at 21:00 UT on 1 Feb it is a little east of south.
    expect(alt / DEG).toBeGreaterThan(19);
    expect(alt / DEG).toBeLessThan(22);
    expect(az / DEG).toBeGreaterThan(165);
    expect(az / DEG).toBeLessThan(185);
  });
});
