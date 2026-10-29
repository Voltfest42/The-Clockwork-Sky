import { CYCLES, monthName, tallestCycle } from '../../figures/sunspots';

/** Answers for Chapter 15's interactive Check yourself question: the cycle with the most sunspots. */

export const TALLEST = tallestCycle();

export function checkTallestCycle(n: number) {
  const c = CYCLES.find((x) => x.n === n);
  if (!c) return { correct: false, feedback: <p>Pick a cycle first.</p> };
  if (c.n === TALLEST.n) {
    return {
      correct: true,
      feedback: (
        <p>
          Cycle {c.n}: right. It peaked in {monthName(c.peakMonth!)} at a smoothed {c.height} sunspots, the most since counts began in 1749. The International
          Geophysical Year of 1957–58 was timed to catch it.
        </p>
      ),
    };
  }
  return {
    correct: false,
    feedback: (
      <p>
        Cycle {c.n} peaked at {c.height !== null ? `a smoothed ${c.height}` : 'a number not yet known'}
        {c.peakMonth ? ` in ${monthName(c.peakMonth)}` : ''}. One cycle peaked higher: look for the tallest peak in Figure 15.2.
      </p>
    ),
  };
}
