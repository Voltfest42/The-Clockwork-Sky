import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fitMassModel, liquidDropBinding, liquidDropTerms, massesWithModel, modelMassExcess, shellCorrection, shellFunction, valleyZ } from '../src/core/nuclear/liquidDrop';
import {
  betaMinusQ,
  bindingEnergy,
  bindingPerNucleon,
  decayKind,
  MAGIC,
  mainKind,
  measuredMasses,
  mostBound,
  mostBoundByMass,
  neutronSeparation,
  nuclideSymbol,
  protonSeparation,
} from '../src/core/nuclear/nuclides';
import { decayBack, firstStableIsobar, fitQRule, isotopeChains, runRProcess, sahaFactor, waitingEnergy } from '../src/core/nuclear/rprocess';
import { abundancesAt, branchPoints, captureRate, classicalSigmaN, decayToStable, exposureTime, runSProcess } from '../src/core/nuclear/sprocess';
import { checkPileUp, PILE_UP_CHOICES, PILE_UP_N } from '../src/content/checks/chapter23Answers';
import {
  atomicWeight,
  ELEMENT_ORIGINS,
  formatHalfLife,
  IN_YOU,
  mainComponent,
  nuclides,
  originsOf,
  peaksOf,
  processShares,
  rProcessSetup,
  rRun,
  S_ONLY,
  sNetwork,
  solarByMass,
  solarLogEps,
  solarMassFraction,
  sRun,
  tablePlace,
} from '../src/figures/elements';
import { CHAPTERS } from '../src/site/course';
import { expectNear } from './helpers';

const YEAR = 3.155_76e7;
const key = (Z: number, A: number) => Z * 1000 + A - Z;

describe('the chart of nuclides (Figure 23.1)', () => {
  const table = nuclides();
  const get = (Z: number, A: number) => table.get(Z, A - Z)!;

  it('holds more than 3,300 nuclides, of which 244 are stable', () => {
    expect(table.list.length).toBeGreaterThan(3300);
    expect(table.list.filter((n) => n.halfLife === Infinity).length).toBe(244);
  });

  it('gives the research notes’ binding energies per nucleon, with nickel-62 the most tightly bound', () => {
    const cases: [number, number, number][] = [
      [2, 4, 7.074],
      [6, 12, 7.68],
      [8, 16, 7.976],
      [26, 56, 8.790],
      [26, 58, 8.792],
      [28, 62, 8.795],
      [92, 238, 7.57],
    ];
    for (const [Z, A, b] of cases) expectNear(bindingPerNucleon(get(Z, A))! / 1000, b, 0.003, `${Z}/${A}`);
    const best = mostBound(table);
    expect([best.Z, best.A]).toEqual([28, 62]);
  });

  it('works out separation and decay energies from the masses (the deuteron, iron-57, lead-208, cobalt-60, tritium)', () => {
    const m = measuredMasses(table);
    expectNear(bindingEnergy(get(1, 2))!, 2224.57, 0.05, 'deuteron');
    expectNear(neutronSeparation(m, 26, 31)!, 7646, 2, 'S_n of ⁵⁷Fe');
    expectNear(neutronSeparation(m, 82, 126)!, 7368, 2, 'S_n of ²⁰⁸Pb');
    expectNear(protonSeparation(m, 82, 126)!, 8004, 3, 'S_p of ²⁰⁸Pb');
    expectNear(betaMinusQ(m, 27, 33)!, 2823, 2, 'Q of ⁶⁰Co');
    expectNear(betaMinusQ(m, 1, 2)!, 18.59, 0.05, 'Q of tritium');
  });

  it('every element found in nature has isotopes whose shares add up to 100%', () => {
    const sums = new Map<number, number>();
    for (const n of table.list) if (n.abundance !== null) sums.set(n.Z, (sums.get(n.Z) ?? 0) + n.abundance);
    expect(sums.size).toBeGreaterThan(80);
    for (const [Z, s] of sums) expect(Math.abs(s - 100), `Z = ${Z}: ${s}`).toBeLessThan(0.2);
  });

  it('tin, with a magic 50 protons, has ten stable isotopes, more than any other element', () => {
    const counts = new Map<number, number>();
    for (const n of table.list) if (n.halfLife === Infinity) counts.set(n.Z, (counts.get(n.Z) ?? 0) + 1);
    expect(counts.get(50)).toBe(10);
    for (const [Z, c] of counts) if (Z !== 50) expect(c).toBeLessThan(10);
  });

  it('has the half-lives the chapter quotes', () => {
    const cases: [number, number, string][] = [
      [0, 1, '10.2 minutes'],
      [28, 56, '6.1 days'],
      [27, 56, '77.2 days'],
      [43, 99, '211,000 years'],
      [36, 85, '10.7 years'],
      [40, 95, '64 days'],
      [62, 151, '90 years'],
      [83, 210, '5 days'],
      [84, 210, '138 days'],
      [30, 80, '562 milliseconds'],
      [48, 130, '162 milliseconds'],
      [61, 145, '17.7 years'],
    ];
    for (const [Z, A, text] of cases) {
      const n = get(Z, A);
      expect(formatHalfLife(n.halfLife, n.halfLifeBound), `${Z}/${A}`).toBe(text);
    }
  });

  it('names decays and nuclides the usual way', () => {
    expect(decayKind('B-')).toBe('beta-minus');
    expect(decayKind('EC+B+')).toBe('beta-plus');
    expect(decayKind('A')).toBe('alpha');
    expect(decayKind('SF')).toBe('fission');
    expect(decayKind('2P')).toBe('proton');
    expect(mainKind(get(26, 56))).toBe('stable');
    expect(mainKind(get(92, 238))).toBe('alpha');
    expect(nuclideSymbol(26, 56)).toBe('⁵⁶Fe');
    expect(nuclideSymbol(82, 208)).toBe('²⁰⁸Pb');
  });

  it('stable nuclei lie in a valley: β⁻ emitters on the neutron-rich side, β⁺ emitters on the proton-rich side', () => {
    for (const n of table.list) {
      if (n.A < 30 || n.A > 200 || n.halfLife === null || !Number.isFinite(n.halfLife)) continue;
      const z0 = valleyZ(n.A);
      const kind = mainKind(n);
      if (kind === 'beta-minus') expect(n.Z, `${n.Z}/${n.A}`).toBeLessThan(z0 + 2.5);
      if (kind === 'beta-plus') expect(n.Z, `${n.Z}/${n.A}`).toBeGreaterThan(z0 - 2.5);
    }
  });
});

describe('the liquid drop and the mass formula', () => {
  const table = nuclides();

  it('follows the measured binding of every stable nucleus beyond calcium within 1%', () => {
    for (const n of table.list) {
      if (n.halfLife !== Infinity || n.A < 40) continue;
      const B = bindingEnergy(n)! / 1000;
      expect(Math.abs(liquidDropBinding(n.Z, n.N) / B - 1), `${n.Z}/${n.A}`).toBeLessThan(0.01);
    }
  });

  it('puts the valley at Z = A/2 for light nuclei and at Z = 82 for A = 208, and the peak near A = 60', () => {
    expectNear(valleyZ(16), 8, 0.5, 'A = 16');
    expectNear(valleyZ(56), 26, 1, 'A = 56');
    expectNear(valleyZ(208), 82, 1, 'A = 208');
    let peak = 0;
    let best = 0;
    for (let A = 20; A < 250; A++) {
      const Z = Math.round(valleyZ(A));
      const b = liquidDropBinding(Z, A - Z) / A;
      if (b > best) [best, peak] = [b, A];
    }
    expect(peak).toBeGreaterThan(50);
    expect(peak).toBeLessThan(70);
  });

  it('the valley bends towards extra neutrons: Z/A falls as A grows (a property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 280 }), fc.integer({ min: 1, max: 40 }), (A, dA) => {
        expect(valleyZ(A + dA)).toBeGreaterThan(valleyZ(A));
        expect(valleyZ(A + dA) / (A + dA)).toBeLessThan(valleyZ(A) / A);
      }),
    );
  });

  it('splits A = 56 on the drop’s valley as the figure says: 15.8 MeV held, 4.8 lost to the surface, 2.0 to repulsion, 0.3 to the extra neutrons', () => {
    const Z = Math.round(valleyZ(56));
    expect(Z).toBe(25);
    const t = liquidDropTerms(Z, 56 - Z);
    expectNear(t.volume / 56, 15.8, 0.01, 'volume');
    expectNear(-t.surface / 56, 4.78, 0.01, 'surface');
    expectNear(-t.coulomb / 56, 2.0, 0.01, 'Coulomb');
    expectNear(-t.asymmetry / 56, 0.27, 0.01, 'asymmetry');
  });

  it('the shell function is zero at every magic number and positive between them (a property)', () => {
    for (const m of [...MAGIC, 184]) expect(Math.abs(shellFunction(m))).toBeLessThan(1e-9);
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 183 }), (n) => {
        if ((MAGIC as readonly number[]).includes(n)) return;
        expect(shellFunction(n)).toBeGreaterThan(0);
      }),
    );
    // Closed shells bind more: lead-208's correction is below its neighbours' midway between shells.
    expect(shellCorrection(82, 126, 3)).toBeLessThan(shellCorrection(70, 104, 3));
  });

  it('the fitted mass formula misses the measured masses by about 2 MeV, against 3 MeV for the liquid drop alone', () => {
    const model = fitMassModel(table);
    expect(model.fitted).toBeGreaterThan(2000);
    expect(model.rms).toBeLessThan(2.2);
    expect(model.rms).toBeGreaterThan(1.5);
    expectNear(model.volume, 15.7, 0.5, 'a_V');
    expectNear(model.coulomb, 0.71, 0.03, 'a_C');
    expect(model.shell).toBeGreaterThan(1);
  });

  it('joins the measured masses exactly, so separation energies are continuous at the last known isotope', () => {
    const model = fitMassModel(table);
    const masses = massesWithModel(table, model);
    for (const Z of [30, 48, 68]) {
      const nMax = table.maxN[Z];
      expect(masses(Z, nMax)).toBe(table.get(Z, nMax)!.massExcess);
      const beyond = masses(Z, nMax + 1)!;
      expect(beyond - masses(Z, nMax)!).toBeCloseTo(modelMassExcess(Z, nMax + 1, model) - modelMassExcess(Z, nMax, model), 6);
    }
  });
});

describe('the slow process (Figure 23.2)', () => {
  const net = sNetwork();
  const run = sRun(1e8);

  it('runs from iron to polonium-210, with every stable nucleus’s cross section measured but two', () => {
    expect(net.index.has(key(26, 56))).toBe(true);
    expect(net.index.has(key(83, 209))).toBe(true);
    expect(net.index.has(key(84, 210))).toBe(true);
    expect(net.index.has(key(43, 99))).toBe(true);
    const unmeasured = net.nuclei.filter((n) => n.stable && !n.measured);
    expect(unmeasured.map((n) => `${n.Z}/${n.A}`)).toEqual(['41/92', '62/146']);
  });

  it('catches a neutron every 13 years at 100 mb and 10⁸ per cm³, every 130 at 10 mb; an exposure of 1 per mb takes 1,300 years', () => {
    expectNear(1 / captureRate(100, 1e8) / YEAR, 13.2, 0.1, '100 mb');
    expectNear(1 / captureRate(10, 1e8) / YEAR, 132, 1, '10 mb');
    expectNear(exposureTime(1, 1e8) / YEAR, 1320, 10, 'τ = 1');
  });

  it('keeps every seed nucleus at every exposure and neutron density (a property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 7, max: 11, noNaN: true }), fc.double({ min: 0.01, max: 1.5, noNaN: true }), (logN, tau) => {
        const r = runSProcess(net, { neutronDensity: 10 ** logN, exposureMax: 1.5, step: 0.01, every: 0.05 });
        const Y = abundancesAt(r, tau);
        expect(Y.reduce((s, y) => s + y, 0)).toBeCloseTo(1, 9);
      }),
      { numRuns: 8 },
    );
  });

  it('piles up first at N = 50 (strontium-88 by an exposure of 0.8 per mb), then at N = 82 and N = 126, at any density (a property)', () => {
    const firstMagic = (r: typeof run) => {
      const seen: number[] = [];
      for (let k = 0; k < r.exposures.length; k++) {
        let best = -1;
        net.nuclei.forEach((x, i) => {
          if (x.A > 58 && (best < 0 || r.Y[k][i] > r.Y[k][best])) best = i;
        });
        const N = net.nuclei[best].N;
        if ((MAGIC as readonly number[]).includes(N) && !seen.includes(N)) seen.push(N);
      }
      return seen;
    };
    expect(firstMagic(run)).toEqual([50, 82, 126]);
    const at08 = abundancesAt(run, 0.8);
    let best = 0;
    net.nuclei.forEach((x, i) => x.A > 58 && at08[i] > at08[best] && (best = i));
    expect([net.nuclei[best].Z, net.nuclei[best].A]).toEqual([38, 88]);
    fc.assert(
      fc.property(fc.double({ min: 7, max: 10.5, noNaN: true }), (logN) => {
        expect(firstMagic(runSProcess(net, { neutronDensity: 10 ** logN, exposureMax: 3, step: 0.004, every: 0.02 }))[0]).toBe(PILE_UP_N);
      }),
      { numRuns: 5 },
    );
  });

  it('σN falls in steps at the magic numbers and only gently between them, for the Sun’s spread of exposures', () => {
    const main = mainComponent(1e8);
    const sigmaN = (Z: number, A: number) => net.nuclei[net.index.get(key(Z, A))!].sigma * main.get(key(Z, A))!;
    const between = [sigmaN(44, 100), sigmaN(48, 110), sigmaN(50, 116), sigmaN(52, 122), sigmaN(52, 124), sigmaN(54, 128), sigmaN(54, 130)];
    const lo = Math.min(...between);
    const hi = Math.max(...between);
    // Across thirty mass numbers between N = 50 and 82, σN falls by under a factor of two; across each step, by three or more.
    expect(hi / lo).toBeLessThan(1.8);
    expect(sigmaN(32, 70) / sigmaN(44, 100)).toBeGreaterThan(3);
    expect(sigmaN(52, 122) / sigmaN(64, 160)).toBeGreaterThan(3);
    expect(sigmaN(80, 198) / sigmaN(83, 209)).toBeGreaterThan(10);
  });

  it('matches the classical formula along the path where it has no branches', () => {
    const main = mainComponent(1e8);
    const byA = new Map<number, { sigma: number; y: number }>();
    for (const [k, y] of main) {
      const x = net.nuclei[net.index.get(k)!];
      const cur = byA.get(x.A);
      if (!cur || y > cur.y) byA.set(x.A, { sigma: x.sigma, y });
    }
    const As = [...byA.keys()].filter((A) => A >= 57).sort((a, b) => a - b);
    const classical = classicalSigmaN(
      As.map((A) => byA.get(A)!.sigma),
      0.3,
    );
    const at = (A: number) => byA.get(A)!.sigma * byA.get(A)!.y;
    const c = (A: number) => classical[As.indexOf(A)];
    for (const A of [110, 122, 130, 142, 150, 198]) expect(Math.abs(at(A) / at(100) / (c(A) / c(100)) - 1), `A = ${A}`).toBeLessThan(0.05);
  });

  it('with τ₀ = 0.3 per mb, matches all but one of the Sun’s s-only isotopes from mass 96 to 150 within a quarter', () => {
    const main = mainComponent(1e8);
    const sm = S_ONLY.find((s) => s.Z === 62 && s.A === 150)!;
    const norm = main.get(key(62, 150))! / sm.N;
    const misses = S_ONLY.filter((s) => s.A >= 96 && s.A <= 150)
      .map((s) => ({ s, r: main.get(key(s.Z, s.A))! / norm / s.N }))
      .filter(({ r }) => Math.abs(r - 1) > 0.25)
      .map(({ s }) => `${s.Z}/${s.A}`);
    expect(misses).toEqual(['56/136']);
  });

  it('has the chapter’s branch points: krypton-85 splits at 10⁸ per cm³ and mostly catches at 10¹⁰', () => {
    const kr85 = (n: number) => branchPoints(net, n).find((b) => b.Z === 36 && b.A === 85);
    expect(kr85(1e8)!.decayShare).toBeGreaterThan(0.3);
    expect(kr85(1e8)!.decayShare).toBeLessThan(0.8);
    expect(kr85(1e10)).toBeUndefined();
  });

  it('makes technetium-99 on the way, and ends by piling up lead and bismuth', () => {
    expect(abundancesAt(run, 1)[net.index.get(key(43, 99))!]).toBeGreaterThan(1e-6);
    const end = decayToStable(net, abundancesAt(run, 4));
    let leadAndBismuth = 0;
    for (const [k, y] of end) if (Math.floor(k / 1000) >= 82) leadAndBismuth += y;
    expect(leadAndBismuth).toBeGreaterThan(0.6);
  });
});

describe('the toy rapid process (Figure 23.2)', () => {
  const setup = rProcessSetup();

  it('puts the waiting points where a neutron is bound by 3.1 MeV at 10²⁴ per cm³ and 1.5 billion K', () => {
    expectNear(waitingEnergy(1e24, 1.5e9) / 1000, 3.1, 0.05, 'S_a');
    expect(sahaFactor(1e24, 1.5e9)).toBeLessThan(1e-9);
    const chains = isotopeChains(setup, 1e24, 1.5e9);
    expect(chains.find((c) => c.Z === 48)!.waitingN).toBe(82);
    expect(chains.find((c) => c.Z === 68)!.waitingN).toBe(126);
  });

  it('fits a Q-value rule to measured half-lives near Sargent’s fifth power, good to a factor of a few', () => {
    const q = fitQRule(setup.table);
    expect(q.fitted).toBeGreaterThan(200);
    expect(q.b).toBeGreaterThan(3.5);
    expect(q.b).toBeLessThan(5.5);
    expect(q.scatter).toBeLessThan(0.7);
  });

  it('keeps every seed nucleus (a property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 20, max: 28, noNaN: true }), fc.double({ min: 1e9, max: 2e9, noNaN: true }), (logN, T) => {
        const run = runRProcess(setup, { neutronDensity: 10 ** logN, temperature: T, duration: 5, steps: 60 });
        for (const Y of run.elements) expect(Y.reduce((s, y) => s + y, 0)).toBeCloseTo(1, 9);
      }),
      { numRuns: 6 },
    );
  });

  it('averaged over bursts of every length, leaves peaks near A = 80, 130 and 195, where the Sun’s are', () => {
    const { run, patterns } = rRun(1e24, 1.5e9);
    const peaks = peaksOf(patterns.averaged[run.times.length - 1]);
    expect(peaks).toHaveLength(3);
    const sun = peaksOf(solarByMass('r'));
    peaks.forEach((A, i) => {
      expect(Math.abs(A - [80, 130, 195][i]), `peak ${A}`).toBeLessThanOrEqual(5);
      expect(Math.abs(A - sun[i]), `peak ${A} against the Sun’s ${sun[i]}`).toBeLessThanOrEqual(5);
    });
  });

  it('decays back along each mass to the first stable isobar, and past bismuth by α decays to lead, bismuth, thorium or uranium', () => {
    const back = decayBack(
      new Map([
        [236, 1],
        [230, 1],
        [237, 1],
        [238, 1],
        [130, 1],
      ]),
    );
    expect(back.get(232)).toBe(1);
    expect(back.get(206)).toBe(1);
    expect(back.get(209)).toBe(1);
    expect(back.get(238)).toBe(1);
    expect(back.get(130)).toBe(1);
    // Shielding: the rapid process's A = 134 stops at xenon-134, so barium-134 is s-only; A = 130 at tellurium-130.
    expect(firstStableIsobar(setup.table, 134)).toEqual({ Z: 54, N: 80 });
    expect(firstStableIsobar(setup.table, 130)).toEqual({ Z: 52, N: 78 });
  });
});

describe('every element’s birthplace (Figure 23.3)', () => {
  it('has Johnson’s shares for all 103 elements, each adding up to 1', () => {
    expect(ELEMENT_ORIGINS).toHaveLength(103);
    for (const e of ELEMENT_ORIGINS) {
      const total = Object.values(e.shares).reduce((s, x) => s + (x ?? 0), 0);
      expect(Math.abs(total - 1), e.symbol).toBeLessThan(0.01);
    }
  });

  it('gives the chapter’s shares: hydrogen from the Big Bang, iron 64% from white dwarfs, gold 94% from merging neutron stars', () => {
    expect(originsOf(1)).toEqual([expect.objectContaining({ share: 1 })]);
    expect(originsOf(1)[0].origin.id).toBe('big-bang');
    expect(originsOf(26)[0]).toMatchObject({ share: 0.644, origin: expect.objectContaining({ id: 'white-dwarfs' }) });
    expect(originsOf(79)[0]).toMatchObject({ share: 0.94, origin: expect.objectContaining({ id: 'neutron-star-mergers' }) });
    expect(originsOf(43)[0].origin.id).toBe('none');
    expect(originsOf(8)[0]).toMatchObject({ share: 1, origin: expect.objectContaining({ id: 'massive-stars' }) });
  });

  it('makes a person nearly three-quarters from massive stars, a sixth from low-mass stars and a tenth from the Big Bang', () => {
    const shares: Record<string, number> = {};
    for (const [Z, pct] of Object.entries(IN_YOU)) for (const o of originsOf(Number(Z))) shares[o.origin.id] = (shares[o.origin.id] ?? 0) + (pct * o.share) / 100;
    expectNear(shares['massive-stars'], 0.73, 0.03, 'massive stars');
    expectNear(shares['low-mass-stars'], 1 / 6, 0.015, 'low-mass stars');
    expectNear(shares['big-bang'], 0.1, 0.001, 'Big Bang');
  });

  it('gives Prantzos et al.’s shares the deep dive quotes: the slow process makes 6% of gold, 8% of platinum, 5% of europium', () => {
    expectNear(processShares(79)!.s, 0.058, 0.001, 'gold');
    expectNear(processShares(78)!.s, 0.078, 0.001, 'platinum');
    expectNear(processShares(63)!.s, 0.049, 0.001, 'europium');
    expect(processShares(92)!.r).toBe(1);
  });

  it('reads the Sun’s abundances: iron at 7.46, cadmium from the meteorites, lithium 200 times scarcer than in them', () => {
    expect(solarLogEps(26)).toEqual({ value: 7.46, from: 'photosphere' });
    expect(solarLogEps(48)!.from).toBe('meteorites');
    expectNear(10 ** (3.25 - solarLogEps(3)!.value), 195, 2, 'lithium');
    expectNear(solarMassFraction(1)!, 0.744, 0.003, 'hydrogen by mass');
    expectNear(atomicWeight(26)!, 55.845, 0.002, 'iron’s atomic weight');
    expectNear(atomicWeight(6)!, 12.011, 0.002, 'carbon’s');
  });

  it('places every element in its own square of the table', () => {
    expect(tablePlace(1)).toEqual([1, 1]);
    expect(tablePlace(2)).toEqual([1, 18]);
    expect(tablePlace(26)).toEqual([4, 8]);
    expect(tablePlace(79)).toEqual([6, 11]);
    expect(tablePlace(57)).toEqual([9, 3]);
    expect(tablePlace(92)).toEqual([10, 6]);
    const seen = new Set<string>();
    for (let Z = 1; Z <= 103; Z++) {
      const p = tablePlace(Z).join(',');
      expect(seen.has(p), `Z = ${Z}`).toBe(false);
      seen.add(p);
    }
  });
});

describe('Chapter 23 in the course', () => {
  it('is written, with its sections', () => {
    const ch = CHAPTERS.find((c) => c.number === 23)!;
    expect(ch.load).toBeDefined();
    expect(ch.sections).toEqual(['The iron peak', 'Slow neutron captures', 'Rapid neutron captures', 'Every element’s birthplace']);
  });

  it('the interactive question accepts N = 50 and only N = 50', () => {
    for (const N of PILE_UP_CHOICES) expect(checkPileUp({ N }).correct).toBe(N === 50);
  });

  it('the binding curve’s measured line has one nucleus per mass number, rising to the iron peak and falling beyond', () => {
    const curve = mostBoundByMass(nuclides());
    const b = (A: number) => bindingPerNucleon(curve.find((n) => n.A === A)!)! / 1000;
    expect(b(62)).toBeGreaterThan(b(40));
    expect(b(62)).toBeGreaterThan(b(120));
    expect(b(120)).toBeGreaterThan(b(238));
  });
});
