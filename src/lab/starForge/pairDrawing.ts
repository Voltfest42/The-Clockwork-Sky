import { criticalPotential, muOf, rochePotential } from '../../core/binaries/roche';
import { contourLines, sampleGrid } from '../../core/math/contour';
import type { BinaryStep } from '../../core/stellar/bse/outcome';
import type { BinaryRun } from '../../core/stellar/bse/runs';
import { physicistRange, type AxisRange } from '../../viz/hr/axes';
import { pairState, type PairState } from './binary';

/**
 * The binaries mode's drawing decisions, kept apart from the components so
 * they can be tested: where the two stars go in the view to scale, the HR
 * diagram's range, the charts on offer, the strips' colours and the time
 * axis's ticks.
 */

const alive = (k: number) => k !== 15;

export const VIEW_W = 360;
export const VIEW_H = 230;
/** A star is never drawn smaller than this radius, px; the caption says when one is enlarged. */
export const MIN_R = 2;

/** The critical Roche surface's outline in the orbital plane, in separations, star 1 on the left (as Figure 28.3 draws it). */
export function lobeOutline(q: number): [number, number][][] {
  const mu = muOf(q);
  const grid = sampleGrid((x, y) => rochePotential(x, y, 0, mu), 121, 81, -1.25, 1.25, -0.85, 0.85);
  return contourLines(grid, criticalPotential(mu) + 1e-9);
}

/** A round length for a scale bar about a quarter of the view: 1, 2 or 5 × 10ⁿ R☉. */
export function scaleBar(rsunAcross: number): number {
  const target = rsunAcross / 4;
  const p = 10 ** Math.floor(Math.log10(target));
  return [5, 2, 1].map((k) => k * p).find((v) => v <= target) ?? p;
}

/** Whether a star at this step would be drawn enlarged in the pair's view. */
export function pairViewEnlarged(s: BinaryStep): boolean {
  return pairLayout(s).enlarged;
}

export interface Layout {
  px: number;
  stars: { k: 0 | 1; x: number; r: number }[];
  lobes: boolean;
  enlarged: boolean;
}

export function pairLayout(s: BinaryStep): Layout {
  const state = pairState(s);
  const cx = VIEW_W / 2;
  const radius = (k: 0 | 1) => (s.rrl[k] >= 1 && state !== 'merged' ? s.R[k] / s.rrl[k] : s.R[k]);
  if (state === 'merged') {
    const k: 0 | 1 = alive(s.kw[0]) ? 0 : 1;
    const px = (VIEW_H / 2 - 24) / Math.max(s.R[k], 1e-6);
    const pxShown = Math.min(px, 60);
    const r = s.R[k] * pxShown;
    return { px: pxShown, stars: [{ k, x: cx, r: Math.max(r, MIN_R) }], lobes: false, enlarged: r < MIN_R };
  }
  if (state === 'gone') return { px: 1, stars: [], lobes: false, enlarged: false };
  if (state === 'unbound') {
    const big = Math.max(s.R[0], s.R[1], 1e-6);
    const px = Math.min(60, (VIEW_H / 2 - 24) / big);
    const stars = ([0, 1] as const).map((k) => ({ k, x: k === 0 ? 70 : VIEW_W - 70, r: Math.max(s.R[k] * px, MIN_R) }));
    return { px, stars, lobes: false, enlarged: s.R[0] * px < MIN_R || s.R[1] * px < MIN_R };
  }
  const px = Math.min((VIEW_W / 2 - 10) / (1.3 * s.sep), (VIEW_H / 2 - 16) / (0.85 * s.sep));
  const mu = s.m[1] / (s.m[0] + s.m[1]);
  const stars = ([0, 1] as const).map((k) => {
    const x = k === 0 ? -mu * s.sep : (1 - mu) * s.sep;
    return { k, x: cx + x * px, r: Math.max(radius(k) * px, MIN_R) };
  });
  return { px, stars, lobes: true, enlarged: radius(0) * px < MIN_R || radius(1) * px < MIN_R };
}

/** The diagram's range: both tracks while the stars burn, with room around them. */
export function pairRange(run: BinaryRun | null): AxisRange {
  let hot = 30000;
  let cool = 4000;
  let faint = Infinity;
  let bright = 0;
  if (run) {
    for (const s of run.steps)
      for (const k of [0, 1]) {
        if (s.kw[k] > 9) continue;
        hot = Math.max(hot, Math.min(s.T[k] * 1.25, 250000));
        cool = Math.min(cool, s.T[k] * 0.8);
        faint = Math.min(faint, s.L[k]);
        bright = Math.max(bright, s.L[k]);
      }
  }
  if (!Number.isFinite(faint)) [faint, bright] = [1e-3, 1e6];
  // A heavy pair's tracks get the room, not the dwarfs below them: at most eight decades of luminosity, at least five
  const top = Math.min(10 ** 7.2, Math.max(10, bright * 4));
  const bottom = Math.max(1e-6, Math.min(faint * 0.3, top / 1e5), top / 1e8);
  return physicistRange(hot, Math.max(1500, cool), bottom, top);
}

export type ChartKind = 'masses' | 'radii' | 'period' | 'separation' | 'eccentricity';
export const CHARTS: { id: ChartKind; name: string }[] = [
  { id: 'masses', name: 'Masses' },
  { id: 'radii', name: 'Radii and lobes' },
  { id: 'period', name: 'Period' },
  { id: 'separation', name: 'Separation' },
  { id: 'eccentricity', name: 'Eccentricity' },
];

/** "0", "450 Myr", "2.5 Gyr", "300 kyr": a tick on a time axis. */
export function shortAge(myr: number): string {
  if (myr === 0) return '0';
  if (myr >= 1000) return `${Number((myr / 1000).toPrecision(2))} Gyr`;
  if (myr >= 1) return `${Number(myr.toPrecision(3))} Myr`;
  return `${Number((myr * 1000).toPrecision(2))} kyr`;
}

export const PAIR_FILL: Record<PairState, string> = {
  'apart-orbit': '#d8e2f0',
  'overflow-1': '#ffd27a',
  'overflow-2': '#8fd3c7',
  contact: '#f4a261',
  merged: '#cdb4f6',
  unbound: '#adb5bd',
  gone: '#e9ecef',
};

/** Moments the strips mark across all three rows: BSE's event label, a dash so colour isn't the only cue, and a name. */
export const INSTANTS: readonly { label: number; dash?: string; name: string }[] = [
  { label: 7, name: 'a common envelope' },
  { label: 6, dash: '5 3', name: 'the stars merge' },
  { label: 11, dash: '1.5 2.5', name: 'a supernova pulls the pair apart' },
];

/** The pair's states, for the strips' legend. */
export const PAIR_LEGEND: PairState[] = ['apart-orbit', 'overflow-1', 'overflow-2', 'contact', 'merged', 'unbound'];

export const ALPHAS = [0.2, 0.5, 1, 2, 3, 5] as const;
