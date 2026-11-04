import { M_SUN, R_SUN } from '../../core/constants';
import { polytrope, solveLaneEmden } from '../../core/structure/laneEmden';
import { formatGramsPerCc, SUN_CENTRE } from '../../figures/holding';

/**
 * Answers for Chapter 20's interactive Check yourself question: in Figure
 * 20.4's solver, find the index n whose star, given the Sun's mass and radius,
 * has the Sun's central density (Model S: 154 g/cm³). Answers within 15% of it
 * count, which the solver puts at n = 3.27–3.40.
 */

export const SUN_N_START = 1.5;
/** How close the central density must come to the Sun's. */
export const SUN_N_TOLERANCE = 0.15;

/** The central density (kg/m³) of an n-polytrope with the Sun's mass and radius. */
export function sunCentralDensity(n: number): number {
  return polytrope(solveLaneEmden(n), M_SUN, R_SUN).rhoC;
}

/** The indices (to 0.01) whose central density lies within the tolerance of the Sun's. */
export function acceptedIndices(): [number, number] {
  const ok = (n: number) => Math.abs(sunCentralDensity(n) / SUN_CENTRE.rho - 1) <= SUN_N_TOLERANCE;
  let lo = 4;
  let hi = 2;
  for (let k = 200; k <= 450; k++) {
    const n = k / 100;
    if (ok(n)) {
      lo = Math.min(lo, n);
      hi = Math.max(hi, n);
    }
  }
  return [lo, hi];
}

export function checkSunIndex({ n }: { n: number }) {
  const rho = sunCentralDensity(n);
  const ratio = rho / SUN_CENTRE.rho;
  const said = `n = ${n.toFixed(2)} gives a centre of ${formatGramsPerCc(rho)}`;
  if (Math.abs(ratio - 1) <= SUN_N_TOLERANCE) {
    return {
      correct: true,
      feedback: (
        <p>
          {said}: right, within {Math.round(Math.abs(ratio - 1) * 100)}% of the Sun’s {formatGramsPerCc(SUN_CENTRE.rho)}. The Sun is a little more
          centrally crowded than Eddington’s n = 3, because its core has turned half its hydrogen into helium, which is heavier per particle. No
          single n gets its temperature right as well: that needs the real physics of Chapter 21.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        {said}, {ratio > 1 ? `${ratio.toFixed(1)} times too dense` : `${(1 / ratio).toFixed(1)} times too thin`}. A higher n crowds more of the mass
        into the middle: {ratio > 1 ? 'try a lower one.' : 'try a higher one.'}
      </p>
    ),
  };
}
