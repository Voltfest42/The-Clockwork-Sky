import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkEarthTwin, TWIN_START } from '../src/content/checks/chapter19Answers';
import { DETECTION_SIGMA } from '../src/core/exoplanets/detect';
import { habitableZone } from '../src/core/exoplanets/habitable';
import { signalPerScaleHeight, transitDepthAt } from '../src/core/exoplanets/transmission';
import { AS_OF } from '../src/data/asOf';
import census from '../src/data/exoplanets.json';
import { CENSUS } from '../src/data/exoplanets';
import {
  allPlanets,
  ATMOSPHERES,
  campaign,
  countsBy,
  earthLeavesZone,
  earthTwin,
  geometryOf,
  kindOf,
  lineUpChance,
  PLANET_PRESETS,
  planetByName,
  SOLAR_SYSTEM,
  sunAtAge,
  thinned,
  verdictOf,
  zonePlanets,
  zoneSystems,
  zoneWord,
} from '../src/figures/otherWorlds';
import { SUN_AGE } from '../src/figures/starLives';
import { expectNear } from './helpers';

const preset = (id: string) => PLANET_PRESETS.find((p) => p.id === id)!;

describe('the census file', () => {
  it('holds every planet the Archive counted, with the counts the chapter quotes', () => {
    expect(census.count).toBe(CENSUS.count);
    expect(allPlanets()).toHaveLength(CENSUS.count);
    expect(census.planets.reduce((a, b) => a + b, 0)).toBe(CENSUS.count);
    expect(census.facility.filter((f) => f === 2)).toHaveLength(CENSUS.tess);
    expect(census.facility.filter((f) => f === 0)).toHaveLength(CENSUS.kepler);
    expect(census.facility.filter((f) => f === 1)).toHaveLength(CENSUS.k2);
    expect(census.fetched).toBe(CENSUS.fetched);
    expect(census.citation).toMatch(/NASA Exoplanet Archive/);
    expect(AS_OF.exoplanets.checked).toBe(CENSUS.fetched.slice(0, 7));
  });

  it('has the famous planets with their published values', () => {
    const peg = planetByName('51 Peg b')!;
    expect(peg.year).toBe(1995);
    expectNear(peg.period!, 4.23, 0.01, '51 Peg b’s period');
    const trappist = allPlanets().filter((p) => p.host === 'TRAPPIST-1');
    expect(trappist).toHaveLength(7);
    expect(planetByName('Kepler-16 b')!.circumbinary).toBe(true);
    expect(planetByName('PSR B1257+12 c')!.year).toBe(1992);
    expect(Math.min(...allPlanets().map((p) => p.year))).toBe(1992);
  });

  it('keeps only measured masses and radii, in sensible ranges', () => {
    for (const p of allPlanets()) {
      if (p.mass !== null) expect(p.mass).toBeGreaterThan(0);
      if (p.radius !== null) {
        expect(p.radius).toBeGreaterThan(0.2);
        expect(p.radius).toBeLessThan(150);
      }
    }
    // A wobble-only planet has no measured radius.
    expect(planetByName('51 Peg b')!.radius).toBeNull();
  });

  it('grows from three pulsar planets in 1994 to thousands, transits overtaking wobbles in the 2010s', () => {
    expect(countsBy(1994)).toEqual({ total: 3, groups: [0, 0, 0, 0, 3] });
    const c2008 = countsBy(2008);
    expect(c2008.groups[1]).toBeGreaterThan(c2008.groups[0]);
    const c2016 = countsBy(2016);
    expect(c2016.groups[0]).toBeGreaterThan(c2016.groups[1]);
    expect(countsBy(2100).total).toBe(CENSUS.count);
  });

  it('names planets’ kinds by size', () => {
    expect(kindOf({ radius: 1, mass: null, period: 365 })).toBe('Earth-sized');
    expect(kindOf({ radius: 3, mass: null, period: 10 })).toBe('a sub-Neptune');
    expect(kindOf({ radius: 14, mass: null, period: 3 })).toBe('a hot Jupiter');
    expect(kindOf({ radius: null, mass: 150, period: 4.2 })).toBe('a hot Jupiter');
  });

  it('puts the Solar System’s planets at their sizes', () => {
    const jupiter = SOLAR_SYSTEM.find((w) => w.name === 'Jupiter')!;
    expectNear(jupiter.radius, 11.2, 0.1, 'Jupiter, R⊕');
    expect(SOLAR_SYSTEM).toHaveLength(8);
  });
});

describe('Figure 19.1, find the planet', () => {
  it('finds 51 Pegasi b by its wobble in a month, and shows no transit', () => {
    const c = campaign(preset('51-peg-b'));
    expectNear(c.k, 58, 2, 'K');
    expect(c.transits).toBe(false);
    expect(verdictOf(c)).toEqual({ wobble: true, transit: false });
  });

  it('finds HD 209458 b both ways, with a hot Jupiter’s density', () => {
    const c = campaign(preset('hd-209458-b'));
    expect(verdictOf(c)).toEqual({ wobble: true, transit: true });
    expectNear(c.depth, 0.015, 0.002, 'depth, as HD 209458 b’s 1.5%');
    expect(c.duration * 24).toBeGreaterThan(2);
    expect(c.duration * 24).toBeLessThan(3.5);
  });

  it('gives Jupiter one transit in ten years, which isn’t enough', () => {
    const c = campaign(preset('jupiter'));
    expect(c.transitCount).toBe(1);
    expect(verdictOf(c).transit).toBe(false);
    expect(verdictOf(c).wobble).toBe(true);
  });

  it('leaves an Earth twin unfound in a year, but finds the same Earth round a red dwarf', () => {
    expect(verdictOf(campaign(preset('earth-twin')))).toEqual({ wobble: false, transit: false });
    const red = campaign(preset('red-dwarf-earth'));
    expect(verdictOf(red).transit).toBe(true);
    expect(red.k).toBeGreaterThan(1);
  });

  it('recovers the planted swing and dip within their uncertainties', () => {
    for (const id of ['51-peg-b', 'hd-209458-b', 'red-dwarf-earth']) {
      const c = campaign(preset(id));
      expect(Math.abs(c.wobble.k - c.k)).toBeLessThan(4 * c.wobble.error);
      // The box averages over the whole transit, ingress and limb included, so it reads shallower than the deepest point.
      if (c.transits) {
        expect(c.dip.depth).toBeGreaterThan(0.5 * c.depth - 4 * c.dip.error);
        expect(c.dip.depth).toBeLessThan(c.depth + 4 * c.dip.error);
      }
    }
  });

  it('only transits within the limit of edge-on', () => {
    const s = { ...preset('hd-209458-b'), tilt: 80 };
    expect(campaign(s).transits).toBe(false);
    expect(geometryOf(preset('earth-twin')).aOverR).toBeGreaterThan(200);
  });

  it('never finds more than it should in pure noise: a planet too light to see stays unfound, as a property', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 1000, noNaN: true }), fc.integer({ min: 20, max: 400 }), (period, nights) => {
        const c = campaign({ ...preset('earth-twin'), mass: 0.001, radius: 0.3, period, tilt: 60, rvPrecision: 10, lightPrecision: 1000, nights });
        expect(verdictOf(c)).toEqual({ wobble: false, transit: false });
      }),
      { numRuns: 20 },
    );
  });

  it('thins points evenly for drawing', () => {
    expect(thinned(10, 20)).toHaveLength(10);
    const t = thinned(100_000, 4000);
    expect(t).toHaveLength(4000);
    expect(t[0]).toBe(0);
    expect(t[3999]).toBeLessThan(100_000);
  });
});

describe('Figure 19.2, a transit up close', () => {
  it('lines up an Earth-like orbit one time in 215', () => {
    expectNear(1 / lineUpChance(1), 215, 1, 'one in');
    expectNear(lineUpChance(0.05), 0.093, 0.002, 'hot Jupiter');
  });
});

describe('Figure 19.4, habitable zones', () => {
  it('gives today’s Sun Kopparapu’s zone exactly, a fainter young Sun a closer one', () => {
    const now = sunAtAge(SUN_AGE);
    expectNear(now.luminosity, 1, 1e-9, 'L today');
    expectNear(now.zone.inner, 0.95, 0.005, 'inner');
    expectNear(now.zone.outer, 1.68, 0.01, 'outer');
    expect(sunAtAge(0).zone.inner).toBeLessThan(0.85);
  });

  it('moves the zone out past Earth about a billion years from now', () => {
    const t = earthLeavesZone() - SUN_AGE;
    expect(t).toBeGreaterThan(500);
    expect(t).toBeLessThan(2000);
  });

  it('puts Earth in the zone and Venus inside it; three of TRAPPIST-1’s planets in it, and Proxima b', () => {
    const [solar, trappist, proxima] = zoneSystems();
    const word = (s: (typeof solar), name: string) => zoneWord(s.luminosity, s.kelvin, s.planets.find((p) => p.name === name)!.a);
    expect(word(solar, 'Earth')).toBe('in the zone');
    expect(word(solar, 'Venus')).toMatch(/too hot/);
    expect(trappist.planets.filter((p) => zoneWord(trappist.luminosity, trappist.kelvin, p.a) === 'in the zone').map((p) => p.name)).toEqual(['e', 'f', 'g']);
    expect(word(proxima, 'b')).toBe('in the zone');
    expect(habitableZone(trappist.luminosity, trappist.kelvin).outer).toBeLessThan(0.06);
  });

  it('finds most known planets too hot, and a few small ones in the zone', () => {
    const points = zonePlanets();
    expect(points.length).toBeGreaterThan(300);
    expect(points.filter((p) => p.small).length).toBeGreaterThan(20);
  });
});

describe('Figure 19.5, starlight through an atmosphere', () => {
  const atm = (id: string) => ATMOSPHERES.find((a) => a.id === id)!;

  it('makes the puffy hot Jupiter easiest and Earth across the Sun hardest', () => {
    const per = ATMOSPHERES.map((a) => signalPerScaleHeight(a));
    expect(Math.max(...per)).toBe(signalPerScaleHeight(atm('hot-jupiter')));
    expect(Math.min(...per)).toBe(signalPerScaleHeight(atm('earth')));
    expect(signalPerScaleHeight(atm('rocky')) / signalPerScaleHeight(atm('earth'))).toBeGreaterThan(30);
  });

  it('gives the hot Jupiter’s carbon dioxide band about a thousand parts per million', () => {
    const a = atm('hot-jupiter');
    const band = (transitDepthAt(a, 4.3) - transitDepthAt(a, 3.9)) * 1e6;
    expect(band).toBeGreaterThan(700);
    expect(band).toBeLessThan(2500);
  });
});

describe('the interactive question: an Earth twin made detectable', () => {
  it('rejects the starting instruments and a year’s watch', () => {
    const r = checkEarthTwin(TWIN_START);
    expect(r.correct).toBe(false);
  });

  it('accepts a Kepler-like four years of light, or a wobble precise to 10 cm/s for years', () => {
    expect(checkEarthTwin({ rv: 1, light: 100, nights: 1460 }).correct).toBe(true);
    expect(checkEarthTwin({ rv: 0.1, light: 1000, nights: 1000 }).correct).toBe(true);
  });

  it('asks for three transits, however precise the light', () => {
    expect(checkEarthTwin({ rv: 10, light: 10, nights: 500 }).correct).toBe(false);
    expect(campaign(earthTwin(10, 10, 500)).dip.significance).toBeGreaterThan(DETECTION_SIGMA);
  });
});
