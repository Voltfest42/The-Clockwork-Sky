import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AMU, C, H, K_B, M_E, M_SUN, R_EARTH, R_SUN } from '../src/core/constants';
import { ageAtLuminosity, CARBON_OXYGEN, coolingTrack, frozenShare, interpolate, meltingTemperature, mestelLuminosity } from '../src/core/compact/cooling';
import { buildWhiteDwarf, chandrasekharMass, densityAt, massForRadius, massRadiusCurve, MU_E, nauenbergRadius, relativisticShare, whiteDwarfOfMass } from '../src/core/compact/whiteDwarf';
import { degeneratePressure, gamma1 as gamma1GasLight, radiationPressure } from '../src/core/structure/eos';
import { degeneracyDensity, exactElectronPressure, fermiEnergy, gamma1Pairs, hotGas, OXYGEN, pairGas } from '../src/core/structure/fermi';
import { checkEarthSized, EARTH_SIZED_TOLERANCE } from '../src/content/checks/chapter24Answers';
import { MEASURED_WHITE_DWARFS } from '../src/data/whiteDwarfs';
import { HEAVIEST_WHITE_DWARF } from '../src/data/records';
import { delayAt, earthSizedMass, fermiState, FERMI_PRESETS, freezingLine, modelRadiusFor, MEASURED, track } from '../src/figures/limits';
import { CHAPTERS } from '../src/site/course';

const rel = (a: number, b: number) => Math.abs(a / b - 1);
const HBAR = H / (2 * Math.PI);
const neOf = (rhoGcc: number, mue = 2) => (rhoGcc * 1000) / (mue * AMU);

describe('electrons at any temperature (structure/fermi.ts)', () => {
  it('gives Chandrasekhar’s zero-temperature pressure when cold, from slow electrons to fast', () => {
    for (const rho of [1e3, 1e6, 1e9, 1e12]) {
      const p = exactElectronPressure(rho * 1000, 1e3, 2);
      expect(rel(p, degeneratePressure(neOf(rho))), `ρ = ${rho} g/cm³`).toBeLessThan(1e-6);
    }
  });

  it('gives the research notes’ limits: (3π²)^{2/3}ħ²n^{5/3}/5mₑ when slow, (3π²)^{1/3}ħcn^{4/3}/4 when fast', () => {
    const slow = neOf(10);
    expect(rel(exactElectronPressure(10 * 1000, 1, 2), ((3 * Math.PI ** 2) ** (2 / 3) * HBAR ** 2 * slow ** (5 / 3)) / (5 * M_E))).toBeLessThan(2e-3);
    const fast = neOf(1e13);
    expect(rel(exactElectronPressure(1e16, 1e3, 2), ((3 * Math.PI ** 2) ** (1 / 3) * HBAR * C * fast ** (4 / 3)) / 4)).toBeLessThan(2e-3);
  });

  it('gives an ideal gas’s nkT when hot and thin', () => {
    for (const rho of [1e-6, 1e-3, 1e-1]) {
      const n = neOf(rho);
      expect(rel(exactElectronPressure(rho * 1000, 1e7, 2), n * K_B * 1e7), `ρ = ${rho} g/cm³`).toBeLessThan(1e-4);
    }
  });

  it('never pushes less than an ideal gas or than packed electrons at zero temperature, and keeps the net charge, pairs and all (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: -2, max: 11, noNaN: true }), fc.double({ min: 4, max: 9.5, noNaN: true }), (lr, lt) => {
        const ne = neOf(10 ** lr);
        const T = 10 ** lt;
        const g = pairGas(ne, T, true);
        // Where pairs outnumber the gas’s own electrons, the net charge is a small difference of large numbers: good to the integrals’ precision.
        expect(Math.abs(g.electrons - g.positrons - ne)).toBeLessThan(1e-8 * (g.electrons + g.positrons));
        const cold = pairGas(ne, T, false);
        expect(cold.pressure).toBeGreaterThanOrEqual(0.999 * Math.max(ne * K_B * T, degeneratePressure(ne)));
      }),
      { numRuns: 60 },
    );
  });

  it('puts the switch to fast electrons (p_F = mₑc) at 1.95 × 10⁶ g/cm³ for two nucleons per electron, as the brief computes', () => {
    const lambda = H / (M_E * C);
    const rho = ((8 * Math.PI) / 3) * lambda ** -3 * 2 * AMU;
    expect(rel(rho / 1000, 0.97e6 * 2)).toBeLessThan(0.01);
  });

  it('draws the degeneracy line where the Fermi energy equals kT, climbing as T^{3/2} while the electrons are slow', () => {
    for (const T of [1e5, 1e7, 1e9]) {
      const rho = degeneracyDensity(T, 2);
      expect(rel(fermiEnergy(rho / (2 * AMU)), K_B * T)).toBeLessThan(1e-9);
    }
    const slope = Math.log10(degeneracyDensity(1e6, 2) / degeneracyDensity(1e5, 2));
    expect(Math.abs(slope - 1.5)).toBeLessThan(0.01);
  });

  it('gives the chapter’s numbers: the Sun’s centre a little packed, white-dwarf matter very', () => {
    const sun = FERMI_PRESETS.find((p) => p.id === 'sun')!;
    const s = fermiState(sun.rho, sun.T, sun.mue);
    expect(s.P / s.ideal).toBeGreaterThan(1.02);
    expect(s.P / s.ideal).toBeLessThan(1.05); // “only 4% harder”
    expect(s.filled).toBeGreaterThan(0.12);
    expect(s.filled).toBeLessThan(0.17); // “a seventh”
    const wd = fermiState(1e9, 1e7, 2);
    expect(Math.abs(wd.EF / 1.602_176_634e-16 - 144)).toBeLessThan(1); // 140 keV
    expect(rel(wd.TF, 1.67e9)).toBeLessThan(0.01);
    expect(wd.P / wd.ideal).toBeGreaterThan(60);
    expect(wd.P / wd.ideal).toBeLessThan(66); // “60 times”
    expect(wd.filled).toBeGreaterThan(0.99);
    const giant = FERMI_PRESETS.find((p) => p.id === 'giant')!;
    expect(giant.T / fermiState(giant.rho, giant.T, giant.mue).TF).toBeLessThan(0.1); // packed when it flashes
  });
});

describe('Γ₁ of ions, electrons with pairs, and light', () => {
  it('matches Chandrasekhar’s formula for ideal gas and light where pairs and packing don’t matter', () => {
    for (const [rhoGcc, T] of [
      [1, 1e7],
      [1e-2, 3e7],
      [1e-4, 3e7],
      [1e-6, 2e7],
    ]) {
      const s = hotGas(rhoGcc * 1000, T, OXYGEN);
      const beta = 1 - radiationPressure(T) / s.pressure;
      expect(Math.abs(gamma1Pairs(rhoGcc * 1000, T) - gamma1GasLight(beta)), `${rhoGcc} g/cm³, ${T} K`).toBeLessThan(2e-3);
    }
  });

  it('is 5/3 for a thin ideal gas and falls towards 4/3 as light takes over, and for packed electrons near light speed', () => {
    expect(Math.abs(gamma1Pairs(1e3, 1e5) - 5 / 3)).toBeLessThan(2e-3);
    expect(Math.abs(gamma1Pairs(1e-3, 3e8) - 4 / 3)).toBeLessThan(2e-3);
    const fast = gamma1Pairs(1e14, 1e7);
    expect(fast).toBeGreaterThan(4 / 3);
    expect(fast).toBeLessThan(1.36);
  });

  it('dips below 4/3 where light makes pairs: at a billion kelvin in thin oxygen', () => {
    expect(gamma1Pairs(1e3 * 1000, 1e9)).toBeLessThan(4 / 3);
    expect(gamma1Pairs(1e8 * 1000, 1e9)).toBeGreaterThan(4 / 3);
  });
});

describe('cold white dwarfs (compact/whiteDwarf.ts)', () => {
  it('gives the Chandrasekhar mass the research notes compute: 5.83/μₑ², 1.46 M☉ and 1.26 for iron', () => {
    expect(Math.abs(chandrasekharMass(2) / M_SUN - 1.457)).toBeLessThan(0.003);
    expect(Math.abs(chandrasekharMass(MU_E.iron) / M_SUN - 1.256)).toBeLessThan(0.003);
    expect(rel((chandrasekharMass(2) / M_SUN) * 4, 5.83)).toBeLessThan(0.002);
  });

  it('approaches the limit as the centre is squeezed without end, and its radius falls to nothing', () => {
    for (const mue of [2, MU_E.iron]) {
      const wd = buildWhiteDwarf(1e18, mue);
      expect(rel(wd.mass, chandrasekharMass(mue)), `μₑ = ${mue}`).toBeLessThan(2e-3);
      expect(wd.radius / 1000).toBeLessThan(50);
    }
  });

  it('is heavier and smaller the denser its centre (property), and R ∝ M^{−1/3} while its electrons are slow', () => {
    fc.assert(
      fc.property(fc.double({ min: 4, max: 11.5, noNaN: true }), fc.double({ min: 0.05, max: 0.5, noNaN: true }), (lr, step) => {
        const a = buildWhiteDwarf(10 ** lr * 1000, 2);
        const b = buildWhiteDwarf(10 ** (lr + step) * 1000, 2);
        expect(b.mass).toBeGreaterThan(a.mass);
        expect(b.radius).toBeLessThan(a.radius);
        expect(relativisticShare(b)).toBeGreaterThanOrEqual(relativisticShare(a) - 1e-9);
      }),
      { numRuns: 25 },
    );
    const a = buildWhiteDwarf(1e3 * 1000, 2);
    const b = buildWhiteDwarf(1e3 * 1000 * 1.5, 2);
    const slope = Math.log(b.radius / a.radius) / Math.log(b.mass / a.mass);
    expect(Math.abs(slope + 1 / 3)).toBeLessThan(0.01);
  });

  it('balances: the mass it reports is the sum of its shells, and its centre is as dense as asked', () => {
    const wd = buildWhiteDwarf(1e7 * 1000, 2);
    let m = 0;
    const p = wd.profile;
    for (let i = 1; i < p.length; i++) m += 2 * Math.PI * (p[i].r ** 2 * p[i].rho + p[i - 1].r ** 2 * p[i - 1].rho) * (p[i].r - p[i - 1].r);
    expect(rel(m, wd.mass)).toBeLessThan(5e-3);
    expect(rel(densityAt(Math.sqrt(1 + (p[0].x * p[0].x)), 2), 1e10)).toBeLessThan(1e-9);
  });

  it('agrees with Nauenberg’s fit within 3% below a solar mass, and within 15% nearer the limit', () => {
    for (const p of massRadiusCurve(2, 25, [4.5, 10])) {
      const fit = nauenbergRadius(p.mass) / 1000;
      expect(rel(p.radiusKm, fit), `${p.mass.toFixed(3)} M☉`).toBeLessThan(p.mass < 1 ? 0.03 : 0.15);
    }
  });

  it('puts the measured white dwarfs close to the curve: Sirius B within 2%, 40 Eridani B within 1%, Procyon B within 5%', () => {
    const off = (id: string) => {
      const w = MEASURED.find((m) => m.id === id)!;
      return modelRadiusFor(w.mass) / w.radiusKm - 1;
    };
    expect(Math.abs(off('sirius-b'))).toBeLessThan(0.02);
    expect(Math.abs(off('40-eri-b'))).toBeLessThan(0.01);
    expect(Math.abs(off('procyon-b'))).toBeLessThan(0.05);
    // Near the limit the cold model, without the ions’ charge or relativity, makes ZTF J1901+1458 too big, as the figure’s note says.
    expect(off('ztf-j1901')).toBeGreaterThan(0.15);
    expect(off('ztf-j1901')).toBeLessThan(0.4);
  });

  it('gives the chapter’s sizes: Sirius B 5,600 km, Procyon B 8,600 km, a white dwarf of 0.91 Suns the size of Earth', () => {
    const km = (id: string) => (MEASURED_WHITE_DWARFS.find((w) => w.id === id)!.radius * R_SUN) / 1000;
    expect(Math.abs(km('sirius-b') - 5600)).toBeLessThan(50);
    expect(Math.abs(km('procyon-b') - 8600)).toBeLessThan(50);
    expect(Math.abs(earthSizedMass() - 0.91)).toBeLessThan(0.005);
    expect(rel(whiteDwarfOfMass(earthSizedMass()).radius, R_EARTH)).toBeLessThan(2e-3);
    expect(massForRadius(R_EARTH * 1.5)).toBeLessThan(0.6);
    expect(HEAVIEST_WHITE_DWARF.radiusKm).toBe(2140);
  });

  it('the interactive question accepts the solver’s Earth-sized white dwarf, and not one 0.1 M☉ off', () => {
    const answer = earthSizedMass();
    expect(checkEarthSized({ mass: Math.round(answer * 100) / 100 }).correct).toBe(true);
    expect(checkEarthSized({ mass: answer + EARTH_SIZED_TOLERANCE + 0.02 }).correct).toBe(false);
    expect(checkEarthSized({ mass: 0.6 }).correct).toBe(false);
  });
});

describe('cooling and crystallising (compact/cooling.ts)', () => {
  it('without freezing, is the Mestel law SSE uses: L = 635 M Z^{0.4} (A t)^{−1.4} L☉, t in Myr', () => {
    for (const m of [0.6, 1.0]) {
      const t = coolingTrack(m, false);
      for (const ageMyr of [500, 2000, 8000]) {
        const sse = (635 * m * 0.02 ** 0.4) / (CARBON_OXYGEN.A * ageMyr) ** 1.4;
        expect(rel(interpolate(t, ageMyr * 1e6, 'L'), sse), `${m} M☉ at ${ageMyr} Myr`).toBeLessThan(0.03);
      }
    }
  });

  it('fades as t^{−7/5}, as Mestel’s law says', () => {
    const t = coolingTrack(0.8, false);
    const slope = Math.log(interpolate(t, 8e9, 'L') / interpolate(t, 1e9, 'L')) / Math.log(8);
    expect(Math.abs(slope + 1.4)).toBeLessThan(0.02);
  });

  it('freezes from the centre outwards, at a melting point that grows as ρ^{1/3}', () => {
    expect(rel(meltingTemperature(8e9) / meltingTemperature(1e9), 2)).toBeLessThan(1e-9);
    const wd = whiteDwarfOfMass(0.6);
    expect(Math.abs(meltingTemperature(wd.rhoC) / 1e6 - 3.8)).toBeLessThan(0.05); // the chapter’s 3.8 million K
    let last = 0;
    for (const T of [5e6, 3.8e6, 3e6, 2e6, 1e6, 3e5]) {
      const f = frozenShare(wd, T);
      expect(f).toBeGreaterThanOrEqual(last);
      last = f;
    }
    expect(frozenShare(wd, 5e6)).toBe(0);
    expect(frozenShare(wd, 3e5)).toBeGreaterThan(0.9);
  });

  it('crystallising slows the fading: older at every luminosity once freezing has begun, for every mass (property)', () => {
    fc.assert(
      fc.property(fc.constantFrom(0.6, 0.9, 1.1), fc.double({ min: -5, max: -3.5, noNaN: true }), (m, lL) => {
        const plain = track(m, false);
        const frozen = track(m, true);
        const L = 10 ** lL;
        if (L < mestelLuminosity(m * M_SUN, plain.freezingStarts.Tc) / 3.828e26) {
          expect(ageAtLuminosity(frozen, L)).toBeGreaterThan(ageAtLuminosity(plain, L));
        }
        expect(delayAt(m, 3e9)).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 20 },
    );
  });

  it('starts freezing a 0.6 M☉ white dwarf at about 5,700 K at its surface, near detailed models’ 6,000 K, and heavier ones hotter', () => {
    const line = freezingLine();
    const at = (m: number) => line.find((p) => p.mass === m)!.T;
    expect(Math.abs(at(0.6) - 5700)).toBeLessThan(200);
    for (let i = 1; i < line.length; i++) expect(line[i].T).toBeGreaterThan(line[i - 1].T);
  });

  it('runs fast at the faint end, as the figure’s note says: 3 to 5 billion years to 1/30,000 of the Sun’s light', () => {
    const plain = ageAtLuminosity(track(0.6, false), 10 ** -4.5) / 1e9;
    const frozen = ageAtLuminosity(track(0.6, true), 10 ** -4.5) / 1e9;
    expect(plain).toBeGreaterThan(2.5);
    expect(plain).toBeLessThan(3);
    expect(frozen).toBeGreaterThan(4.5);
    expect(frozen).toBeLessThan(5);
  });
});

describe('Chapter 24 in the course', () => {
  it('is written, with its sections, as is Chapter 25; Chapter 29 is not yet', () => {
    const ch = CHAPTERS.find((c) => c.number === 24)!;
    expect(ch.load).toBeDefined();
    expect(ch.sections).toEqual(['Packed electrons', 'Heavier is smaller', 'Chandrasekhar’s limit', 'Embers that crystallise']);
    expect(CHAPTERS.find((c) => c.number === 25)!.load).toBeDefined();
    expect(CHAPTERS.find((c) => c.number === 29)!.load).toBeUndefined();
  });
});
