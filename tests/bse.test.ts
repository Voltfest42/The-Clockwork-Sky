import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { BSE_DEFAULTS, evolveBinary, type BseResult } from '../src/core/stellar/bse/evolve';

interface FixtureBinary {
  m1: number;
  m2: number;
  period: number;
  ecc: number;
  z: number;
  sigma: number;
  seed: number;
  /** How many steps BSE stored. */
  n: number;
  /** The event log, bpp(j,1..10). */
  bpp: number[][];
  /** Steps kept: [j (0-based), ...bcm(j+1, KEPT)]. */
  steps: number[][];
}

const fixtures = JSON.parse(gunzipSync(readFileSync('tests/fixtures/bse/binaries.json.gz')).toString()) as {
  tEnd: number;
  kept: number[];
  binaries: FixtureBinary[];
};
const { kept: KEPT, binaries } = fixtures;

/** bcm columns compared as logarithms (absolute), spins (loose, see below), eccentricity (absolute) and types (exact). */
const LOGS = new Set([5, 6, 19, 20]);
const SPINS = new Set([13, 27]);
const TYPES = new Set([2, 16]);

const relDiff = (x: number, y: number) => Math.abs(x - y) / Math.max(Math.abs(y), 1e-12);

/** Why bcm column `col` of a step disagrees, or '' if it doesn't. */
function columnMismatch(col: number, x: number, y: number): string {
  let ok: boolean;
  if (TYPES.has(col)) ok = x === y;
  else if (LOGS.has(col)) ok = Math.abs(x - y) <= 1e-5;
  else if (col === 32) ok = Math.abs(x - y) <= 1e-6;
  // A star's spin is the small difference of large angular momenta when it is far from synchronous or overfills its
  // lobe a lot, so it wanders at the 10% level while the orbit it feeds agrees to 10⁻⁹ (the orbit is checked tightly)
  else if (SPINS.has(col)) ok = Math.abs(x - y) <= 0.1 * Math.abs(y) + 0.05;
  else if (col === 15 || col === 29) ok = relDiff(x, y) <= 1e-5;
  else ok = relDiff(x, y) <= 1e-6;
  return ok ? '' : `column ${col}: ${x} against ${y}`;
}

interface Verdict {
  result: BseResult;
  /** The first step where the types differ at the same time: a rounding tie at a phase boundary. */
  tie?: { j: number; t: number; realigned: boolean };
  /** Disagreements before any tie. */
  problems: string[];
}

/**
 * BSE lands every step exactly on the next phase boundary (dtm = the time left in the phase), so whether a star
 * changes type at that step or one tiny step (10⁻⁷ of the age) later is decided by the last bit of its age. The
 * port's times agree with gfortran's to ~10⁻¹⁵ but not bit for bit (V8's and glibc's pow, exp and log differ in the
 * last place), so at some boundaries the two codes go opposite ways. That is a tie: same time, one side already in
 * the new type, and the other side reaching the same type one tiny step later. After a tie the steps are offset and
 * the stars' winds are integrated over slightly different steps, so later values differ at the 10⁻⁵ level and can
 * grow where tides couple everything; so each binary is compared step for step up to its first tie, and the tie
 * itself must realign.
 */
function compare(b: FixtureBinary): Verdict {
  const result = evolveBinary({ m1: b.m1, m2: b.m2, period: b.period, ecc: b.ecc, z: b.z, tEnd: fixtures.tEnd }, { sigma: b.sigma, seed: b.seed });
  const problems: string[] = [];
  let tie: Verdict['tie'];
  for (const [k, row] of b.steps.entries()) {
    const j = row[0];
    const s = result.bcm[j];
    if (!s) {
      problems.push(`step ${j} is missing (the port took ${result.bcm.length} steps, BSE ${b.n})`);
      break;
    }
    const typesDiffer = s[2] !== row[2] || s[16] !== row[10];
    if (typesDiffer && relDiff(s[1], row[1]) <= 1e-9) {
      // Which side lags? Either way it must reach the other's type at the next step, a tiny step later.
      const next = b.steps[k + 1];
      const portAhead = next && next[0] === j + 1 && next[2] === s[2] && next[10] === s[16] && relDiff(next[1], s[1]) <= 1e-6;
      const p = result.bcm[j + 1];
      const portBehind = p && p[2] === row[2] && p[16] === row[10] && relDiff(p[1], row[1]) <= 1e-6;
      tie = { j, t: row[1], realigned: Boolean(portAhead || portBehind) };
      break;
    }
    const bad = KEPT.map((col, i) => columnMismatch(col, s[col], row[i + 1])).find(Boolean);
    if (bad) {
      problems.push(`step ${j} (t = ${row[1]} Myr): ${bad}`);
      break;
    }
  }
  // The event log up to the tie (all of it without one): the same events, types and values
  const until = tie ? tie.t * (1 - 1e-9) : Infinity;
  const theirs = b.bpp.filter((r) => r[0] < until);
  const ours = result.bpp.map((r) => r.slice(1)).filter((r) => r[0] < until);
  if (!tie && ours.length !== theirs.length) problems.push(`${ours.length} events against BSE's ${theirs.length}`);
  for (const [i, f] of theirs.entries()) {
    const a = ours[i];
    if (!a) break;
    const same = a[3] === f[3] && a[4] === f[4] && a[9] === f[9];
    const close = [0, 1, 2, 5, 6].every((c) => (c === 6 ? Math.abs(a[c] - f[c]) <= 1e-6 : relDiff(a[c], f[c]) <= 1e-6));
    if (!same || !close) {
      problems.push(`event ${i}: [${a.join(', ')}] against [${f.join(', ')}]`);
      break;
    }
  }
  if (!tie && result.bcm.length !== b.n) problems.push(`${result.bcm.length} steps against BSE's ${b.n}`);
  return { result, tie, problems };
}

describe('BSE against Hurley’s own code', () => {
  const verdicts: Verdict[] = [];
  beforeAll(() => {
    for (const b of binaries) verdicts.push(compare(b));
  }, 120_000);

  it('has fixtures with every kind of event and many outcomes', () => {
    const labels = new Set(binaries.flatMap((b) => b.bpp.map((r) => r[9])));
    expect([...labels].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const types = new Set(binaries.flatMap((b) => b.bpp.flatMap((r) => [r[3], r[4]])));
    expect([...types].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const finals = new Set(binaries.map((b) => `${b.bpp.at(-1)![3]}+${b.bpp.at(-1)![4]}`));
    expect(finals.size).toBeGreaterThan(30);
    expect(binaries.filter((b) => b.sigma > 0).length).toBe(24);
  });

  it.each(binaries.map((b, i) => [i, b.m1, b.m2, b.period, b.ecc, b.z, b.sigma] as const))(
    '#%i: %f + %f M☉, %f days, e = %f, Z = %f, σ = %f km/s, step for step',
    (i) => {
      const v = verdicts[i];
      expect(v.problems).toEqual([]);
      if (v.tie) expect(v.tie.realigned).toBe(true);
    },
  );

  it('ties at a phase boundary in under a quarter of the binaries, and matches the rest whole', () => {
    const tied = verdicts.filter((v) => v.tie).length;
    expect(tied / binaries.length).toBeLessThan(0.25);
    expect(verdicts.filter((v) => !v.tie).length).toBeGreaterThan(450);
  });

  it('ends with the same pair of types as BSE in every binary, ties included', () => {
    const differ = binaries.filter((b, i) => {
      const a = verdicts[i].result.bpp.at(-1)!;
      const f = b.bpp.at(-1)!;
      return a[4] !== f[3] || a[5] !== f[4];
    });
    expect(differ.map((b) => [b.m1, b.m2, b.period, b.ecc, b.z])).toEqual([]);
  });

  it('draws the kicks with BSE’s own random numbers', () => {
    // With kicks on, a pair survives or comes apart as in Hurley's code, with the same velocities
    const kicked = binaries.map((b, i) => [b, verdicts[i]] as const).filter(([b, v]) => b.sigma > 0 && !v.tie);
    expect(kicked.length).toBeGreaterThan(15);
    for (const [b, v] of kicked) {
      const disrupted = (r: number[]) => r[9] === 11;
      expect(v.result.bpp.some((r) => disrupted(r.slice(1)))).toBe(b.bpp.some(disrupted));
    }
  });

  it('uses binary.in’s switches, as the fixtures do', () => {
    expect(BSE_DEFAULTS).toMatchObject({ neta: 0.5, bwind: 0, hewind: 1, alpha1: 3, lambda: 0.5, tflag: 1, wdflag: 1, nsflag: 1, mxns: 3 });
    expect(BSE_DEFAULTS).toMatchObject({ sigma: 190, beta: 0.125, xi: 1, acc2: 1.5, epsnov: 0.001, eddfac: 10, gamma: -1 });
  });
});
