/** Ticks at a round step (1, 2 or 5 × a power of ten) giving about five lines. */
export function niceTicks(min: number, max: number): number[] {
  const rough = (max - min) / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough * 0.75) ?? rough;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step - 1e-9) * step; t <= max + 1e-9; t += step) ticks.push(Math.round(t / step) * step || 0);
  return ticks;
}
