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

// —— Pairs of stars ——

/** Binaries mode's outcome card, its narration and its list of events. */
const outcome = (page: Page) => lab(page).getByRole('heading', { level: 3, name: /^How it ends: / });
const pairCaption = (page: Page) => lab(page).locator('p[aria-live="polite"]').filter({ hasText: /after birth\./ });
const happenings = (page: Page) => lab(page).locator('div').filter({ has: page.getByRole('heading', { level: 3, name: /^What happens/ }) }).last();

async function openPair(page: Page, query = '?mode=binary') {
  await openForge(page, query);
  await expect(outcome(page)).toBeVisible({ timeout: 20_000 });
}

test('binaries mode opens on Algol, worked out by BSE in the stellar worker, and fits a phone @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openPair(page);
  await expect(lab(page).getByRole('combobox', { name: 'Start from' })).toHaveValue('algol');
  await expect(lab(page).getByRole('button', { name: 'A pair' })).toHaveAttribute('aria-pressed', 'true');
  await expect(pairCaption(page)).toContainText('911 million years after birth. Star 1 is a red giant of 0.70 M☉, filling its Roche lobe; star 2 is a main-sequence star of 3.10 M☉.');
  await expect(outcome(page)).toHaveText('How it ends: merged into one star');
  await expect(lab(page).getByRole('img', { name: /^911 million years after birth/ })).toBeVisible();
  await expect(lab(page).getByRole('img', { name: /^Both stars’ tracks on the HR diagram/ })).toBeVisible();
  await expect(lab(page).getByRole('img', { name: /^Each star’s phases and the pair’s/ })).toBeVisible();
  await expect(lab(page).getByRole('list', { name: 'Outcomes with other common-envelope efficiencies' }).getByRole('listitem')).toHaveCount(6, { timeout: 20_000 });
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some((r) => /stellar\.worker/.test(r.name)))).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('every ready-made pair loads and ends as its blurb says', async ({ page }) => {
  const errors = watchErrors(page);
  await openPair(page);
  const menu = lab(page).getByRole('combobox', { name: 'Start from' });
  const expectations: [string, string, RegExp][] = [
    ['cataclysmic-variable', 'white dwarf fed by a companion', /a carbon–oxygen white dwarf of 0\.66 M☉ and a low-mass main-sequence star of 0\.04 M☉/],
    ['helium-type-ia', 'white dwarf destroyed (Type Ia?)', /a carbon–oxygen white dwarf of 1\.00 M☉, alone/],
    ['white-dwarf-merger', 'white dwarf destroyed (Type Ia?)', /nothing at all/],
    ['blue-straggler', 'merged into one star', /a carbon–oxygen white dwarf of 0\.59 M☉, alone/],
    ['stripped-supernova', 'merged into one star', /Star 1 became a neutron star of 1\.33 M☉ with a kick of 236 km\/s/],
    ['millisecond-pulsar', 'X-ray binary', /a neutron star of 2\.18 M☉ and a helium white dwarf of 0\.28 M☉, 51\.1 days apart/],
    ['cygnus-x1', 'two black holes', /gravitational waves bring them together 672 million years later, within the universe’s age/],
    ['hulse-taylor', 'two neutron stars', /The neutron stars formed at 22\.9 million years; gravitational waves bring them together 1\.81 billion years later/],
    ['gw150914', 'two black holes', /the black holes have merged/],
  ];
  for (const [id, name, text] of expectations) {
    await menu.selectOption(id);
    await expect(outcome(page)).toHaveText(`How it ends: ${name}`, { timeout: 20_000 });
    await expect(lab(page).getByRole('heading', { level: 3, name: /^How it ends/ }).locator('..')).toContainText(text);
  }
  expect(errors).toEqual([]);
});

test('a pair can be forged by slider, typed values and switches; out-of-range values are clamped @cross', async ({ page }) => {
  const errors = watchErrors(page);
  await openPair(page, '?preset=hulse-taylor');
  // Star 2's mass by keyboard, a few steps down from 11.4 Suns: the preset becomes your own pair
  const m2 = lab(page).getByRole('slider', { name: 'Star 2’s mass' });
  await m2.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  await expect(m2).toHaveAttribute('aria-valuetext', /^1\d(\.\d+)? M☉$/);
  await expect(lab(page).getByRole('combobox', { name: 'Start from' })).toHaveValue('custom');
  // A period typed beyond the limit
  const typed = lab(page).getByRole('textbox', { name: 'or type (days)' });
  await typed.fill('500000');
  await typed.press('Enter');
  await expect(lab(page).getByRole('status').filter({ hasText: 'The period runs from 0.1 to 100,000 days, so 500000 days became 100,000 days.' })).toBeVisible();
  // So wide that the stars live as if alone
  await expect(outcome(page)).toHaveText('How it ends: pulled apart by a supernova', { timeout: 20_000 });
  // The orbit by its separation instead
  await lab(page).getByRole('button', { name: 'By its separation' }).click();
  const sep = lab(page).getByRole('textbox', { name: 'or type (R☉)' });
  await sep.fill('20');
  await sep.press('Enter');
  await expect(lab(page).getByRole('slider', { name: 'Separation' })).toHaveAttribute('aria-valuetext', /^20 R☉ \(a period of /);
  // The uncertain physics
  await lab(page).getByRole('button', { name: 'Use BSE’s own switches (α = 3)' }).click();
  await expect(lab(page).getByRole('slider', { name: 'Common-envelope efficiency α' })).toHaveAttribute('aria-valuetext', '3 (BSE’s own)');
  const seed = lab(page).getByText(/^Kick seed \d+$/);
  const before = await seed.textContent();
  await lab(page).getByRole('button', { name: 'Reroll the kicks' }).click();
  await expect(seed).not.toHaveText(before!);
  await lab(page).getByRole('group', { name: 'Tides' }).getByRole('button', { name: 'Off' }).click();
  await expect(lab(page).getByRole('group', { name: 'Tides' }).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
  await lab(page).getByRole('button', { name: 'Use the Forge’s (α = 1)' }).click();
  await expect(lab(page).getByRole('slider', { name: 'Common-envelope efficiency α' })).toHaveAttribute('aria-valuetext', /^1 /);
  await expect(outcome(page)).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('time runs through a pair’s life by slider, by its events and by its strips; the charts follow', async ({ page }) => {
  const errors = watchErrors(page);
  await openPair(page, '?preset=algol');
  await happenings(page).getByRole('button', { name: '427 million years' }).click();
  await expect(pairCaption(page)).toContainText(/^427 million years after birth\. Star 1 is a main-sequence star/);
  await expect(lab(page).getByRole('slider', { name: 'Time since birth' })).toHaveAttribute('aria-valuetext', '427 million years');
  await lab(page).getByRole('group', { name: 'Time runs' }).getByRole('button', { name: 'On a log scale' }).click();
  await expect(lab(page).getByRole('img', { name: /^The pair’s masses against time/ })).toBeVisible();
  for (const name of ['Masses', 'Radii and lobes', 'Period', 'Separation', 'Eccentricity']) {
    await lab(page).getByRole('group', { name: 'Chart shows' }).getByRole('button', { name }).click();
    await expect(lab(page).getByRole('img', { name: new RegExp(`^The pair’s ${name.toLowerCase()} against time`) })).toBeVisible();
  }
  // A click near the strips' right end goes to the end of the run: one star left
  const strips = lab(page).getByRole('img', { name: /^Each star’s phases and the pair’s/ });
  const box = (await strips.boundingBox())!;
  await strips.click({ position: { x: box.width * 0.985, y: box.height * 0.5 } });
  await expect(pairCaption(page)).toContainText('The stars have become one');
  expect(errors).toEqual([]);
});

test('a pair and its moment come back from a link @cross', async ({ page, context, browserName }) => {
  const errors = watchErrors(page);
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openPair(page, '?preset=gw150914&t=5');
  await expect(lab(page).getByRole('slider', { name: 'Time since birth' })).toHaveAttribute('aria-valuetext', '5 million years');
  await lab(page).getByRole('slider', { name: 'Metallicity' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(outcome(page)).toBeVisible({ timeout: 20_000 });
  await lab(page).getByRole('button', { name: 'Copy a link to this pair, at this moment' }).click();
  const shared = lab(page).getByRole('status').filter({ hasText: '?mode=binary' });
  await expect(shared).toBeVisible();
  const url = (await shared.textContent())!.replace(/^Copied: /, '');
  expect(url).toMatch(/\?mode=binary&m1=100&m2=45&p=4\.29&z=0\.000\d+&wind=0\.25&t=5$/);
  await page.goto(url);
  await expect(outcome(page)).toBeVisible({ timeout: 20_000 });
  await expect(lab(page).getByRole('slider', { name: 'Winds' })).toHaveAttribute('aria-valuetext', '×0.25');
  await expect(lab(page).getByRole('slider', { name: 'Time since birth' })).toHaveAttribute('aria-valuetext', '5 million years');
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
      await lab(page).getByRole('button', { name: 'A pair' }).click();
      await expect(outcome(page)).toBeVisible({ timeout: 20_000 });
      await lab(page).getByRole('combobox', { name: 'Start from' }).selectOption('hulse-taylor');
      await expect(lab(page).getByRole('list', { name: 'Outcomes with other kicks' }).getByRole('listitem')).toHaveCount(6, { timeout: 20_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
