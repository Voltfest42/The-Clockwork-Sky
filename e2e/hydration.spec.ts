import { expect, test } from '@playwright/test';
import { PAGES } from '../src/site/routes';

/**
 * Hydration on every page, against a build with React's development code
 * (playwright.config.ts serves it on port 4177, or E2E_DEV_PORT), which reports every way the
 * browser's first render can differ from the prerendered HTML. The production
 * build stays quiet about some of them, such as a mismatched attribute.
 */
test.skip(!!process.env.BASE_URL, 'Needs the local development build.');
test.use({ baseURL: process.env.E2E_DEV_URL ?? 'http://localhost:4177' });

test('every page hydrates without warnings, and its figures come alive', async ({ page }) => {
  test.setTimeout(240_000);
  const messages: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') messages.push(`${page.url()}: ${m.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`${page.url()}: ${error.message}`));

  for (const meta of PAGES) {
    await page.goto(meta.path);
    await expect(page.locator('main h1')).toBeVisible();
    // Once hydrated, no figure is left showing its prerendered description.
    await expect(page.locator('figure [data-figure-placeholder]'), meta.path).toHaveCount(0);
  }

  const response = await page.goto('/toolkit/no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'There’s no page here' })).toBeVisible();

  expect(messages.filter((m) => !/status of 404/.test(m))).toEqual([]);
});
