import { expect, test, type Page } from '@playwright/test';
import { figureByNumber } from './helpers';

/**
 * A mid-range phone, roughly: Chromium with the CPU slowed four times (as in
 * Lighthouse's mobile profile) on a phone-sized screen. Each test measures the
 * frame rate of a running figure for a few seconds and records it. Run on
 * request: PERF=1 npx playwright test --project=perf
 */

test.use({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });

async function throttle(page: Page, rate = 4) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}

/** Frames per second and the worst frame (ms) over `seconds`, from requestAnimationFrame. */
async function measure(page: Page, seconds = 4): Promise<{ fps: number; worst: number; median: number }> {
  return page.evaluate(
    (s) =>
      new Promise((resolve) => {
        const times: number[] = [];
        let last = performance.now();
        const end = last + s * 1000;
        const frame = (now: number) => {
          times.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(frame);
          else {
            const sorted = [...times].sort((a, b) => a - b);
            resolve({ fps: times.length / s, worst: sorted[sorted.length - 1], median: sorted[Math.floor(sorted.length / 2)] });
          }
        };
        requestAnimationFrame(frame);
      }),
    seconds,
  );
}

function report(name: string, result: { fps: number; worst: number; median: number }) {
  test.info().annotations.push({ type: 'performance', description: `${name}: ${result.fps.toFixed(0)} fps, median frame ${result.median.toFixed(0)} ms, worst ${result.worst.toFixed(0)} ms` });
  console.log(`${name}: ${result.fps.toFixed(0)} fps, median frame ${result.median.toFixed(0)} ms, worst ${result.worst.toFixed(0)} ms`);
}

test('the sky view plays time smoothly on a slow phone @perf', async ({ page }) => {
  await page.goto('/the-turning-sky/');
  await throttle(page);
  const figure = figureByNumber(page, '2.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.locator('canvas').first()).toBeVisible();
  await figure.getByRole('button', { name: /Play/ }).first().click();
  const result = await measure(page);
  report('Sky view, playing', result);
  expect(result.fps).toBeGreaterThan(20);
});

test('the scale zoom glides on a slow phone @perf', async ({ page }) => {
  await page.goto('/a-sense-of-scale/');
  await throttle(page);
  const figure = figureByNumber(page, '1.1');
  await figure.scrollIntoViewIfNeeded();
  await figure.getByRole('button', { name: '▶ Fly out' }).click();
  const result = await measure(page);
  report('Scale zoom, touring', result);
  expect(result.fps).toBeGreaterThan(20);
});

test('the Orrery runs the Solar System at a century a second on a slow phone @perf', async ({ page }) => {
  await page.goto('/orrery/');
  await throttle(page);
  await expect(page.locator('main p[aria-live="polite"]').first()).toContainText('bodies', { timeout: 15_000 });
  await page.getByRole('slider', { name: 'Time warp' }).fill('13');
  await page.getByRole('button', { name: '▶ Run' }).click();
  await page.getByRole('application').scrollIntoViewIfNeeded();
  const result = await measure(page);
  report('Orrery, Solar System at a century a second', result);
  const warp = await page.getByText(/The computer is keeping up at/).count();
  test.info().annotations.push({ type: 'performance', description: warp ? 'The worker fell behind the time warp.' : 'The worker kept up with the time warp.' });
  expect(result.fps).toBeGreaterThan(20);
});

test('the Orrery’s Pythagorean problem, in IAS15, on a slow phone @perf', async ({ page }) => {
  await page.goto('/orrery/?preset=pythagorean');
  await throttle(page);
  await expect(page.locator('main p[aria-live="polite"]').first()).toContainText('bodies', { timeout: 15_000 });
  await page.getByRole('button', { name: '▶ Run' }).click();
  await page.getByRole('application').scrollIntoViewIfNeeded();
  const result = await measure(page);
  report('Orrery, Pythagorean problem', result);
  expect(result.fps).toBeGreaterThan(20);
});

test('the Star Forge scrubs through a life and forges new stars quickly on a slow phone @perf', async ({ page }) => {
  await page.goto('/star-forge/?preset=sun');
  await throttle(page);
  const fate = page.locator('main div[aria-live="polite"]').filter({ hasText: 'Its end' });
  await expect(fate).toContainText('white dwarf', { timeout: 20_000 });
  // Scrubbing: the time slider stepped every frame or so while the frames are measured.
  const time = page.getByRole('slider', { name: 'Time' });
  await time.focus();
  const measuring = measure(page, 3);
  for (let i = 0; i < 60; i++) await page.keyboard.press('ArrowRight');
  const result = await measuring;
  report('Star Forge, scrubbing time', result);
  // A new star: from the mass typed to its fate shown, worked out in the worker.
  const started = Date.now();
  const typed = page.getByRole('textbox', { name: 'or type (M☉)' });
  await typed.fill('18');
  await typed.press('Enter');
  await expect(fate).toContainText('neutron star', { timeout: 20_000 });
  const ms = Date.now() - started;
  test.info().annotations.push({ type: 'performance', description: `Star Forge, a new star of 18 Suns: ${ms} ms from Enter to its fate` });
  console.log(`Star Forge, a new star of 18 Suns: ${ms} ms from Enter to its fate`);
  expect(result.fps).toBeGreaterThan(15);
});
