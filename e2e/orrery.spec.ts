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

// ——— Version 2: relativity, the Sun's death, clusters and galaxies ———

/** Sets the time warp to its fastest. */
async function fastest(page: Page) {
  const warp = lab(page).getByRole('slider', { name: /Time warp/ });
  await warp.focus();
  await page.keyboard.press('End');
}

/** The mode switcher's buttons. */
const mode = (page: Page, name: string) => page.getByRole('group', { name: 'What to run' }).getByRole('button', { name });

test('relativity turns S2’s orbit 12′ a lap round Sagittarius A*, and Figures 27.1 and 30.5 open it @cross', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/black-holes/');
  await expect(figureByNumber(page, '27.1').getByRole('link', { name: 'Open this in the Orrery →' })).toHaveAttribute('href', '/orrery/?preset=s2');
  await page.goto('/crowds-of-stars/');
  const link = figureByNumber(page, '30.5').getByRole('link', { name: 'Open this in the Orrery →' });
  await expect(link).toHaveAttribute('href', '/orrery/?preset=s2');
  // The address itself (the other tests click their figures' links).
  await openOrrery(page, '?preset=s2');
  await expect(status(page)).toContainText('2 bodies, centred on Sagittarius A*', { timeout: 15_000 });
  await expect(lab(page).getByRole('combobox', { name: 'Relativity' })).toHaveValue('1');
  await expect(lab(page).getByRole('combobox', { name: 'System' })).toHaveValue('s2');
  // S2 is watched from the start.
  await expect(lab(page).getByText(/Relativity alone would turn it 12\.2′ a lap, and is switched on\./)).toBeVisible();
  await fastest(page);
  await lab(page).getByRole('button', { name: '▶ Run' }).click();
  await expect(lab(page).getByText(/^Its periapsis turns 12\.[12]′ a lap \(forwards\), measured over/)).toBeVisible({ timeout: 20_000 });
  await lab(page).getByRole('button', { name: '❚❚ Pause' }).click();
  await lab(page).getByRole('combobox', { name: 'Relativity' }).selectOption('100');
  await expect(lab(page).getByText(/here it is exaggerated 100 times\./)).toBeVisible();
  await lab(page).getByRole('combobox', { name: 'Relativity' }).selectOption('0');
  await expect(lab(page).getByText(/it is switched off\./)).toBeVisible();
  await expect(lab(page).getByText('Relativity off: Newton’s gravity alone.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Mercury’s periapsis turns with relativity in the Solar System', async ({ page }) => {
  const errors = watchErrors(page);
  await openOrrery(page, '?preset=solar-system&relativity=1');
  await expect(lab(page).getByRole('combobox', { name: 'Relativity' })).toHaveValue('1');
  await lab(page).getByRole('table').getByRole('button', { name: 'Mercury' }).click();
  await expect(lab(page).getByText(/Relativity alone would turn it 43\.0″ a century, and is switched on\./)).toBeVisible();
  await fastest(page);
  await lab(page).getByRole('button', { name: '▶ Run' }).click();
  // Wisdom–Holman at its fastest: a few centuries settle the fitted rate near 575″ a century.
  await expect(lab(page).getByText(/^Its periapsis turns 5[67]\d″ a century \(forwards\)/)).toBeVisible({ timeout: 30_000 });
  await lab(page).getByRole('button', { name: '❚❚ Pause' }).click();
  expect(errors).toEqual([]);
});

test('the Sun’s death: Figure 17.2 opens it, the charts answer at once, and the run swallows Mercury', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/a-stars-life/');
  const link = figureByNumber(page, '17.2').getByRole('link', { name: 'Open this in the Orrery →' });
  await expect(link).toHaveAttribute('href', '/orrery/?preset=suns-death');
  await link.click();
  await expect(status(page)).toContainText('The Sun at 4.57 billion years old: main sequence', { timeout: 15_000 });
  await expect(lab(page).getByText('Energy and angular momentum aren’t kept: the Sun is losing mass, and its tides drag on the planets.')).toBeVisible();
  await expect(lab(page).getByRole('heading', { name: 'The Sun’s death: the answer for these settings' })).toBeVisible();
  await expect(lab(page).getByText(/^Mercury is swallowed 12\.32\d billion years after the Sun’s birth\.$/)).toBeVisible();
  await expect(lab(page).getByText(/^Earth survives, ending 1\.71 AU from the white dwarf/)).toBeVisible();
  // A tide ten times stronger takes Earth too; the run can be started again with it.
  await lab(page).getByRole('button', { name: '× 10' }).click();
  await expect(lab(page).getByText(/^Earth is swallowed 12\.32\d billion years after the Sun’s birth\.$/)).toBeVisible();
  const again = lab(page).getByRole('button', { name: 'Run it again with these' });
  await expect(again).toBeEnabled();
  await again.click();
  await expect(again).toBeDisabled();
  await fastest(page);
  await lab(page).getByRole('button', { name: '▶ Run' }).click();
  await expect(lab(page).getByText(/^The Sun swallowed Mercury, 12\.32\d billion years after its birth/)).toBeVisible({ timeout: 90_000 });
  await lab(page).getByRole('button', { name: '❚❚ Pause' }).click();
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the cluster mode opens Figure 30.1’s cluster and runs a core collapse, on a phone too @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/crowds-of-stars/');
  const link = figureByNumber(page, '30.1').getByRole('link', { name: 'Open this in the Orrery →' });
  await expect(link).toHaveAttribute('href', '/orrery/?mode=cluster&n=1000&masses=kroupa&orbit=8.2&rh=2');
  await link.click();
  await expect(mode(page, 'A star cluster')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
  await expect(lab(page).getByRole('combobox', { name: 'Start from' })).toHaveValue('custom');
  await expect(lab(page).getByRole('group', { name: 'Stars' }).getByRole('button', { name: '1,000' })).toHaveAttribute('aria-pressed', 'true');
  await lab(page).getByRole('combobox', { name: 'Start from' }).selectOption('core-collapse');
  await expect(lab(page).getByRole('group', { name: 'The Galaxy’s tide' }).getByRole('button', { name: 'No tide' })).toHaveAttribute('aria-pressed', 'true');
  await expect(lab(page).getByText(/^500 stars with Kroupa’s mix of masses .* alone in space, with no tide/).first()).toBeVisible({ timeout: 15_000 });
  await lab(page).getByRole('button', { name: '▶ Run the cluster' }).click();
  await expect(lab(page).getByText(/After [\d.]+ million years \([\d.]+ relaxation times\): the virial ratio is 0\.\d\d/).first()).toBeVisible({ timeout: 30_000 });
  await lab(page).getByRole('button', { name: '❚❚ Pause' }).click();
  await expect(lab(page).getByText(/^Energy error/)).toBeVisible();
  // A King model in the tide fills its Jacobi radius, so its size buttons rest.
  await lab(page).getByRole('button', { name: 'King, W₀ = 6' }).click();
  await lab(page).getByRole('group', { name: 'The Galaxy’s tide' }).getByRole('button', { name: '8.2 kpc' }).click();
  await expect(lab(page).getByText(/fill its Jacobi radius/)).toBeVisible();
  await expect(lab(page).getByRole('group', { name: 'Half-mass radius at the start' }).getByRole('button', { name: '2 pc' })).toBeDisabled();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the galaxy mode opens Figure 31.1’s encounter, and the Milky Way meets Andromeda @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/colliding-galaxies/');
  const link = figureByNumber(page, '31.1').getByRole('link', { name: 'Open this in the Orrery →' });
  await expect(link).toHaveAttribute('href', '/orrery/?mode=galaxies&encounter=antennae&ratio=1&peri=26&e=0.5&tilt=60&spin=1&ctilt=60&cspin=1&friction=1&stars=20000');
  await link.click();
  await expect(mode(page, 'Colliding galaxies')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
  await expect(lab(page).getByRole('combobox', { name: 'Encounter' })).toHaveValue('antennae');
  await lab(page).getByRole('combobox', { name: 'Encounter' }).selectOption('milky-way');
  await expect(lab(page).getByText(/^A sketch of the Milky Way meeting Andromeda/).first()).toBeVisible();
  await expect(lab(page).getByRole('slider', { name: /The Milky Way’s mass/ })).toBeVisible();
  await lab(page).getByRole('button', { name: 'Fast' }).click();
  await lab(page).getByRole('button', { name: '▶ Run the collision' }).click();
  await expect(lab(page).getByText(/million years after the closest approach: the galaxies are \d+ kpc apart/).first()).toBeVisible({ timeout: 40_000 });
  await lab(page).getByRole('button', { name: '❚❚ Pause' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // Back to the planets: version 1's lab, fresh.
  await mode(page, 'Planets and stars').click();
  await expect(status(page)).toContainText('10 bodies', { timeout: 15_000 });
  await expect(page).toHaveURL(/\/orrery\/$/);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
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

    test('the Orrery’s second version, in use, passes the accessibility checks', async ({ page }) => {
      await openOrrery(page, '?preset=suns-death');
      await expect(lab(page).getByText(/^Earth survives/)).toBeVisible();
      await lab(page).getByRole('button', { name: 'Jump a second’s worth' }).click();
      expect(await accessibilityViolations(page)).toEqual([]);
      await mode(page, 'A star cluster').click();
      await expect(lab(page).getByText(/^500 stars with Kroupa’s mix/).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
      await mode(page, 'Colliding galaxies').click();
      await expect(lab(page).getByRole('combobox', { name: 'Encounter' })).toBeVisible();
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
