import { describe, expect, it } from 'vitest';
import { checkBalmerPeak } from '../src/content/checks/chapter12Answers';
import { GASES } from '../src/data/spectra/lamps';
import lineData from '../src/data/spectra/lines.json';
import { SUN_MASS_FRACTIONS } from '../src/data/sunComposition';
import xsl from '../src/data/xsl/spectra.json';
import {
  describeDoppler,
  describeJump,
  describeKirchhoff,
  describeModel,
  JUMPS,
  massFractions,
  modelSpectrum,
  nearestRealStar,
  pairVelocities,
  realSpectrum,
  REAL_STARS,
  solarComposition,
  strongestLines,
} from '../src/figures/spectra';
import { expectNear } from './helpers';

describe('Kirchhoff’s three spectra (Figure 12.1)', () => {
  it('has five gases with visible lines', () => {
    expect(GASES.map((g) => g.id)).toEqual(['hydrogen', 'helium', 'sodium', 'neon', 'mercury']);
    for (const g of GASES) for (const [nm, b] of g.lines) expect(nm > 380 && nm < 750 && b > 0 && b <= 1, `${g.id} ${nm}`).toBe(true);
  });

  it('describes each view', () => {
    expect(describeKirchhoff('lamp', 'sodium')).toMatch(/^Looking straight at the hot, dense lamp: a continuous spectrum/);
    expect(describeKirchhoff('cloud', 'sodium')).toBe(
      'Looking at the thin cloud of sodium against a dark background: bright lines, light at only a few wavelengths, the strongest at 589.0 nm and 589.6 nm. That pattern is sodium’s alone.',
    );
    expect(describeKirchhoff('through', 'hydrogen')).toMatch(/dark lines where the bright lines were/);
  });
});

describe('hydrogen’s ladder (Figure 12.2)', () => {
  it('has the Lyman, Balmer and Paschen jumps up to level 6', () => {
    expect(JUMPS.length).toBe(12);
    expect(describeJump({ lower: 2, upper: 3 }, false)).toBe(
      'The electron drops from level 3 to level 2 and the atom gives out a photon: 1.89 eV, 656 nm, visible. This is Hα, in the Balmer series.',
    );
    expect(describeJump({ lower: 1, upper: 2 }, true)).toMatch(/^An atom on level 1 takes in a photon .*10\.20 eV, 122 nm, ultraviolet/);
  });
});

describe('make a spectrum (Figure 12.3)', () => {
  it('has ten real spectra from the X-shooter Spectral Library, CC BY 4.0', () => {
    expect(xsl.licence).toMatch(/^CC BY 4\.0/);
    expect(xsl.stars.length).toBe(10);
    for (const s of xsl.stars) {
      expect(s.flux.length).toBe(1075);
      expect(Math.max(...s.flux)).toBe(1000);
    }
    const sun = realSpectrum('hd13043');
    expectNear(Math.max(...sun.map(([, f]) => f)), 1, 1e-12, 'normalised');
  });

  it('puts a real star of the nearest class beside the model', () => {
    expect(nearestRealStar(5772).id).toBe('hd13043');
    expect(nearestRealStar(9500).id).toBe('hd166283');
    expect(nearestRealStar(35000).id).toBe('29-cma');
    expect(nearestRealStar(3400).id).toBe('hd119850');
    expect(nearestRealStar(5772, 0).id).toBe('hd140283');
    expect(REAL_STARS.map((s) => s.kelvin)).toEqual([...REAL_STARS.map((s) => s.kelvin)].sort((a, b) => b - a));
  });

  it('labels the strongest lines', () => {
    expect(strongestLines(9500).map(({ line }) => line.name)).toEqual(['Hα', 'Hβ', 'Hγ', 'Hδ']);
    expect(strongestLines(5772)[0].line.name).toBe('Ca II K');
    expect(strongestLines(38000).map(({ line }) => line.name)).toContain('He II 469');
    expect(describeModel(9500)).toBe('At 9,500 K, an A0 star on the main sequence. The strongest lines: Hα, Hβ, Hγ.');
    expect(describeModel(5772, { Fe: 0 })).toMatch(/You have changed iron to none\.$/);
    expect(describeModel(3400)).toMatch(/Bands of titanium oxide/);
  });

  it('normalises the model to its brightest point', () => {
    const m = modelSpectrum(5772);
    expectNear(Math.max(...m.points.map(([, f]) => f)), 1, 1e-12, 'max');
    expect(m.depth.every(([, d]) => d >= 0 && d <= 1)).toBe(true);
  });

  it('takes its lines from NIST', () => {
    expect(lineData.source).toMatch(/NIST Atomic Spectra Database/);
    expect(lineData.lines.length).toBeGreaterThanOrEqual(45);
  });

  it('marks the interactive question: where hydrogen’s lines are strongest', () => {
    expect(checkBalmerPeak(10000).correct).toBe(true);
    expect(checkBalmerPeak(9000).correct).toBe(true);
    expect(checkBalmerPeak(5772).correct).toBe(false);
    expect(checkBalmerPeak(25000).correct).toBe(false);
  });
});

describe('what the Sun is made of (Figure 12.4)', () => {
  it('gives Asplund and colleagues’ mass fractions', () => {
    const { X, Y, Z } = massFractions();
    expectNear(X, SUN_MASS_FRACTIONS.X, 0.002, 'X');
    expectNear(Y, SUN_MASS_FRACTIONS.Y, 0.002, 'Y');
    expectNear(Z, SUN_MASS_FRACTIONS.Z, 0.001, 'Z');
  });

  it('is about 92% hydrogen by number', () => {
    const c = solarComposition();
    expectNear(c.find((e) => e.symbol === 'H')!.byNumber, 0.92, 0.01, 'H');
    expectNear(c.reduce((s, e) => s + e.grams, 0), 1000, 1e-9, 'a kilogram');
  });
});

describe('the Doppler shifter (Figure 12.5)', () => {
  it('describes the shift', () => {
    expect(describeDoppler(-110.5)).toBe(
      'The star is moving 110.5 km/s towards us, so its lines are shifted to the blue (shorter wavelengths): sodium’s D₂ line moves 217 thousandths of a nanometre, from 588.995 to 588.778 nm. Δλ/λ = v/c: one part in 2,700.',
    );
    expect(describeDoppler(0)).toMatch(/isn’t moving/);
  });

  it('moves a pair’s lines apart and together', () => {
    const [a, b] = pairVelocities(0.25);
    expectNear(a, 60, 1e-9, 'star 1');
    expectNear(b, -60, 1e-9, 'star 2');
    expectNear(pairVelocities(0.5)[0], 0, 1e-9, 'crossing');
  });
});
