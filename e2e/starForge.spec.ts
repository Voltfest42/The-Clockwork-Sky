import { expect, test, type Page } from '@playwright/test';
import { accessibilityViolations, watchErrors } from './helpers';

/** The Star Forge (/star-forge/): presets, editing, comparing, clusters, links and accessibility. */

const lab = (page: Page) => page.locator('main');
/** The narration under the HR diagram. */
const caption = (page: Page) => lab(page).locator('p[aria-live="polite"]').first();
/** The fate card: the box that says how the star ends. */
const fate = (page: Page) => lab(page).locator('div[aria-live="polite"]').filter({ hasText: 'Its end' });

async function openForge(page: Page, query = '') {
  await page.goto(`/star-forge/${query}`);
  await expect(lab(page).getByRole('heading', { level: 1, name: 'The Star Forge' })).toBeVisible();
  await expect(lab(page).getByRole('combobox', { name: 'Start from' })).toBeVisible({ timeout: 15_000 });
}

test('the Star Forge starts with the Sun, worked out in the stellar worker @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openForge(page);
  await expect(fate(page)).toContainText('a carbon–oxygen white dwarf of 0.52 M☉', { timeout: 15_000 });
  await expect(caption(page)).toContainText('a main-sequence star');
  await expect(lab(page).getByRole('img', { name: /HR diagram with the star’s track/ })).toBeVisible();
  await expect(lab(page).getByRole('table')).toContainText('11 billion years');
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some((r) => /stellar\.worker/.test(r.name)))).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('every preset loads with its own star, stars or cluster', async ({ page }) => {
  const errors = watchErrors(page);
  await openForge(page);
  const menu = lab(page).getByRole('combobox', { name: 'Start from' });
  const expectations: [string, RegExp][] = [
    ['sirius', /a carbon–oxygen white dwarf of 0\.6\d M☉/],
    ['red-dwarf', /a helium white dwarf/],
    ['brown-dwarf', /shrinks, fades and cools for ever/],
    ['betelgeuse', /a neutron star of 2\.03 M☉/],
    ['heavy-100', /a black hole of 15 M☉/],
    ['pair-instability', /Other models:.*nothing is left/],
  ];
  for (const [id, text] of expectations) {
    await menu.selectOption(id);
    await expect(fate(page)).toContainText(text, { timeout: 15_000 });
  }
  await menu.selectOption('winds-20');
  await expect(lab(page).getByRole('table').getByRole('row')).toHaveCount(3);
  await expect(lab(page).getByRole('table')).toContainText(/Neutron star, 2\.33 M☉[\s\S]*Black hole, 8\.29 M☉/, { timeout: 15_000 });
  await menu.selectOption('m67');
  await expect(lab(page).getByRole('heading', { name: 'M67', exact: true })).toBeVisible();
  await expect(lab(page).getByText(/The line has \d+ stars/)).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('a star can be forged by slider, typed values and the calibration map; out-of-range values are clamped and the engine’s limits explained @cross', async ({ page }) => {
  const errors = watchErrors(page);
  await openForge(page);
  await expect(fate(page)).toContainText('white dwarf', { timeout: 15_000 });
  // The mass slider by keyboard: up a few steps from 1 Sun.
  const mass = lab(page).getByRole('slider', { name: 'Mass at birth' });
  await mass.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await expect(mass).toHaveAttribute('aria-valuetext', /^1\.1\d M☉$/);
  // A typed mass beyond the limit.
  const typed = lab(page).getByRole('textbox', { name: 'or type (M☉)' });
  await typed.fill('1000');
  await typed.press('Enter');
  await expect(lab(page).getByRole('status').filter({ hasText: 'became 300 M☉' })).toBeVisible();
  await expect(fate(page)).toContainText('black hole', { timeout: 15_000 });
  // No winds at all, for a star this heavy: SSE stalls, and the Forge says so.
  await lab(page).getByRole('slider', { name: 'Winds' }).fill('0');
  await expect(lab(page).getByText('The engine stopped')).toBeVisible({ timeout: 15_000 });
  await lab(page).getByRole('slider', { name: 'Winds' }).fill('1');
  // A click on the calibration map, in the brown dwarfs' zone.
  const map = lab(page).getByRole('img', { name: /Where the engine can be trusted/ });
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width * 0.15, y: box.height * 0.35 } });
  await expect(fate(page)).toContainText('cools for ever', { timeout: 15_000 });
  await expect(lab(page).getByText('Brown dwarfs follow published cooling models, not SSE.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('time runs through the whole life, evenly or as time before the end, to the remnant', async ({ page }) => {
  const errors = watchErrors(page);
  await openForge(page, '?preset=sun');
  await expect(caption(page)).toContainText('a main-sequence star', { timeout: 15_000 });
  const goTo = lab(page).getByRole('group', { name: 'Go to' });
  await goTo.getByRole('button', { name: 'Red giant' }).click();
  await expect(caption(page)).toContainText('a red giant');
  await lab(page).getByRole('button', { name: 'As time before the end' }).first().click();
  await goTo.getByRole('button', { name: 'AGB' }).click();
  await expect(caption(page)).toContainText('asymptotic-giant-branch star');
  await lab(page).getByRole('button', { name: 'By mass' }).click();
  await expect(lab(page).getByRole('img', { name: /insides by mass/ })).toBeVisible();
  await goTo.getByRole('button', { name: 'Carbon–oxygen white dwarf' }).click();
  await expect(caption(page)).toContainText('all that is left is a carbon–oxygen white dwarf');
  await expect(lab(page).getByText(/A white dwarf: the bare core/)).toBeVisible();
  for (const name of ['Luminosity', 'Radius', 'Temperature', 'Mass']) {
    await lab(page).getByRole('group', { name: 'Chart shows' }).getByRole('button', { name }).click();
    await expect(lab(page).getByRole('img', { name: new RegExp(`star’s ${name.toLowerCase()} through its life`) })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('stars can be compared, up to four, and a link brings them back @cross', async ({ page, context, browserName }) => {
  const errors = watchErrors(page);
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openForge(page);
  const stars = lab(page).getByRole('group', { name: 'Stars' });
  for (let i = 0; i < 3; i++) await stars.getByRole('button', { name: '+ Compare another star' }).click();
  await expect(stars.getByRole('button', { name: '+ Compare another star' })).toHaveCount(0);
  await expect(lab(page).getByRole('table').getByRole('row')).toHaveCount(5);
  await expect(lab(page).getByRole('img', { name: /stars drawn to scale beside the Sun/ })).toBeVisible();
  await expect(lab(page).getByRole('slider', { name: 'Age' })).toBeVisible();
  await stars.getByRole('button', { name: 'Remove star 2' }).click();
  await expect(lab(page).getByRole('table').getByRole('row')).toHaveCount(4, { timeout: 15_000 });
  await expect(caption(page)).toContainText('star 3 is');
  await lab(page).getByRole('button', { name: 'Copy a link to these stars' }).click();
  const shared = lab(page).getByRole('status').filter({ hasText: '?stars=' });
  await expect(shared).toBeVisible();
  const url = (await shared.textContent())!.replace(/^Copied: /, '');
  await page.goto(url);
  await expect(lab(page).getByRole('table').getByRole('row')).toHaveCount(4, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test('the chapters’ links open the matching star or cluster', async ({ page }) => {
  const errors = watchErrors(page);
  await openForge(page, '?mass=25&z=0.0001');
  await expect(lab(page).getByRole('group', { name: 'Stars' })).toContainText('25 M☉, Z 0.0001, winds ×1');
  await expect(fate(page)).toContainText('a black hole of 23 M☉', { timeout: 15_000 });
  await openForge(page, '?cluster=pleiades&age=120');
  await expect(lab(page).getByRole('combobox', { name: 'Start from' })).toHaveValue('pleiades');
  await expect(lab(page).getByText(/stars heavier than 4\.\d+ M☉ have left the main sequence/)).toBeVisible();
  await lab(page).getByRole('button', { name: 'Forge the turn-off star' }).click();
  await expect(fate(page)).toContainText('Its end', { timeout: 15_000 });
  expect(errors).toEqual([]);
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });
    test(`the Star Forge passes the accessibility checks in use (${scheme})`, async ({ page }) => {
      await openForge(page, '?preset=winds-20');
      await expect(lab(page).getByRole('table')).toContainText('Black hole', { timeout: 15_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
      await lab(page).getByRole('button', { name: 'A cluster' }).click();
      await expect(lab(page).getByText(/The line has \d+ stars/)).toBeVisible({ timeout: 20_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
