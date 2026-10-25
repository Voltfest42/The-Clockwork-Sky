import { expect, test, type Page } from '@playwright/test';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, watchErrors } from './helpers';

/** The Orrery's narration under the view: the clock, the bodies and the frame. */
function status(page: Page) {
  return page.locator('main p[aria-live="polite"]').first();
}

async function openOrrery(page: Page, query = '') {
  await page.goto(`/orrery/${query}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'The Orrery' })).toBeVisible();
  await expect(status(page)).toContainText('bodies', { timeout: 15_000 });
}

const lab = (page: Page) => page.locator('main');

test('the Orrery starts with the Solar System today and runs it in its worker @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openOrrery(page);
  await expect(status(page)).toHaveText('1 January 2026. 10 bodies, centred on Sun, paused.');
  await expect(lab(page).getByRole('combobox', { name: 'Integrator' })).toHaveValue('auto');
  await expect(lab(page).getByRole('option', { name: 'Automatic (now Wisdom–Holman)' })).toHaveCount(1);
  const table = lab(page).getByRole('table');
  await expect(table.getByRole('row', { name: /Neptune Sun 30\.\d AU 0\.0\d\d 1\.\d° 16\d years/ })).toBeVisible();
  await lab(page).getByRole('button', { name: '▶ Run' }).click();
  await expect(lab(page).getByRole('button', { name: '❚❚ Pause' })).toBeVisible();
  await expect(status(page)).toContainText(/2027|2028/, { timeout: 10_000 });
  await lab(page).getByRole('button', { name: '❚❚ Pause' }).click();
  await expect(lab(page).getByText(/^Energy error/)).toContainText(/× 10⁻(?:⁹|¹[⁰¹²³⁴⁵⁶⁷⁸⁹])|below 10⁻¹⁵/);
  // The worker started: the module script for it was fetched.
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some((r) => /orrery\.worker/.test(r.name)))).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('every preset loads, and a link can open one with its own method', async ({ page }) => {
  const errors = watchErrors(page);
  await openOrrery(page, '?preset=one-planet&method=leapfrog');
  await expect(status(page)).toHaveText('Day 0.0. 2 bodies, centred on Sun, paused.');
  await expect(lab(page).getByRole('combobox', { name: 'Integrator' })).toHaveValue('leapfrog');
  const menu = lab(page).getByRole('combobox', { name: 'System' });
  for (const [value, bodies] of [
    ['earth-moon', 3],
    ['galilean', 5],
    ['trojans', 7],
    ['figure-eight', 3],
    ['pythagorean', 3],
    ['kepler-16', 3],
    ['trappist-1', 8],
    ['comet', 5],
    ['heavy-jupiter', 10],
    ['solar-system', 10],
  ] as const) {
    await menu.selectOption(value);
    await expect(status(page)).toContainText(`${bodies} bodies`);
  }
  expect(errors).toEqual([]);
});

test('the Trojans turn with Jupiter, with the Lagrange points; the 3D view starts in WebGL @cross', async ({ page }) => {
  const errors = watchErrors(page);
  await openOrrery(page, '?preset=trojans');
  await expect(status(page)).toContainText('turning with Sun and Jupiter');
  await lab(page).getByRole('button', { name: '▶ Run' }).click();
  await expect(status(page)).toContainText(/Year [1-9]\d/, { timeout: 15_000 });
  await lab(page).getByRole('button', { name: '❚❚ Pause' }).click();
  await lab(page).getByRole('combobox', { name: 'Turn with' }).selectOption('');
  await expect(status(page)).toContainText('centred on the centre of mass');
  await lab(page).getByRole('button', { name: '3D', exact: true }).click();
  await expect(lab(page).getByRole('group', { name: 'The Orrery in 3D' })).toBeVisible();
  await expect(lab(page).getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test('pick a body, change it, add one, undo, and see events in the log @cross', async ({ page }) => {
  const errors = watchErrors(page);
  await openOrrery(page, '?preset=one-planet');
  const table = lab(page).getByRole('table');
  await table.getByRole('button', { name: 'Planet' }).click();
  const card = lab(page).getByRole('heading', { level: 3, name: 'Planet' }).locator('..');
  await expect(card.getByText('0.500', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Make its orbit circular' }).click();
  await expect(card.getByText('0.000', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: '10% faster' }).click();
  await expect(lab(page).getByText('Changed Planet’s velocity.')).toBeVisible();
  await lab(page).getByRole('button', { name: 'Undo' }).click();
  await expect(card.getByText('0.000', { exact: true })).toBeVisible();

  // Add a moon round the planet, then one with an impossible orbit.
  await lab(page).getByText('Add a body').click();
  await lab(page).getByRole('textbox', { name: 'Name' }).fill('Moonlet');
  await lab(page).getByRole('combobox', { name: 'Mass' }).selectOption('moon');
  await lab(page).getByRole('combobox', { name: 'Going round' }).selectOption('planet');
  await lab(page).getByRole('textbox', { name: 'Size of orbit, a (AU)' }).fill('0.003');
  await lab(page).getByRole('button', { name: 'Add it' }).click();
  await expect(status(page)).toContainText('3 bodies');
  await expect(table.getByRole('row', { name: /Moonlet Planet 449,000 km/ })).toBeVisible();
  await lab(page).getByRole('textbox', { name: 'Eccentricity, e' }).fill('1.5');
  await lab(page).getByRole('button', { name: 'Add it' }).click();
  await expect(lab(page).getByRole('alert')).toContainText('The eccentricity must be at least 0 and less than 1.');
  await expect(status(page)).toContainText('3 bodies');

  // Delete it again.
  await table.getByRole('button', { name: 'Moonlet' }).click();
  await lab(page).getByRole('button', { name: 'Delete it' }).click();
  await expect(status(page)).toContainText('2 bodies');
  expect(errors.filter((e) => !/eccentricity/.test(e))).toEqual([]);
});

test('the Pythagorean problem logs its close passes and the escape', async ({ page }) => {
  const errors = watchErrors(page);
  await openOrrery(page, '?preset=pythagorean');
  const jump = lab(page).getByRole('button', { name: 'Jump a second’s worth' });
  // 200 days a jump: twenty jumps is well past the escape, around day 3,700.
  for (let k = 0; k < 20; k++) await jump.click();
  await expect(lab(page).getByRole('list', { name: 'Events, latest first' })).toContainText('Star of 3 Suns has escaped');
  await expect(lab(page).getByText(/^Energy error/)).toContainText(/× 10⁻(?:⁹|¹[⁰¹²³⁴⁵⁶⁷⁸⁹])|below 10⁻¹⁵/);
  expect(errors).toEqual([]);
});

test('the view from above works by keyboard', async ({ page }) => {
  await openOrrery(page);
  const view = lab(page).getByRole('application', { name: /The Orrery, seen from above/ });
  await view.focus();
  await page.keyboard.press('+');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Home');
  await expect(view).toBeFocused();
  await lab(page).getByRole('button', { name: 'Zoom in', exact: true }).click();
  await lab(page).getByRole('button', { name: 'Fit the view' }).click();
});

test('a copied link brings the same system back', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openOrrery(page, '?preset=kepler-16');
  await lab(page).getByRole('button', { name: 'Copy a link to this system' }).click();
  await expect(lab(page).getByText('Copied a link to this system, as it is now.')).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/orrery\/\?system=[\w-]+$/);
  await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(status(page)).toContainText('3 bodies');
  await expect(lab(page).getByRole('combobox', { name: 'System' })).toHaveValue('custom');
  await expect(lab(page).getByRole('table').getByRole('row', { name: /Kepler-16 b Kepler-16 A 0\.70\d AU/ })).toBeVisible();
});

test('Figures 7.2, 7.4 and 8.3 open matching systems in the Orrery', async ({ page }) => {
  await page.goto('/newtons-gravity/');
  await expect(figureByNumber(page, '7.2').getByRole('link', { name: 'Open this in the Orrery →' })).toHaveAttribute('href', '/orrery/?preset=one-planet&method=leapfrog');
  await expect(figureByNumber(page, '7.4').getByRole('link', { name: 'Open this in the Orrery →' })).toHaveAttribute('href', '/orrery/?preset=earth-moon');
  await page.goto('/a-tour-of-the-solar-system/');
  const link = figureByNumber(page, '8.3').getByRole('link', { name: 'Open this in the Orrery →' });
  await link.click();
  await expect(page).toHaveURL(/\/orrery\/\?preset=galilean$/);
  await expect(status(page)).toContainText('5 bodies, centred on Jupiter', { timeout: 15_000 });
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('the Orrery, in use, passes the accessibility checks', async ({ page }) => {
      await openOrrery(page, '?preset=galilean');
      expect(await accessibilityViolations(page)).toEqual([]);
      await lab(page).getByRole('table').getByRole('button', { name: 'Io' }).click();
      await lab(page).getByText('Add a body').click();
      await lab(page).getByRole('button', { name: 'Jump a second’s worth' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
      await lab(page).getByRole('button', { name: '3D', exact: true }).click();
      await expect(lab(page).getByText('Loading the 3D view…')).toHaveCount(0, { timeout: 15_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
