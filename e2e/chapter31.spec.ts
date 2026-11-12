import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, waitForHydration, watchErrors } from './helpers';

const chapter = CHAPTERS[30];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Colliding galaxies' })).toBeVisible();
}

test('Chapter 31 shows its sections, two figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['31.1', '31.2']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Colliding galaxies' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  // The odds, as of their date, come from the data file
  await expect(main.getByText(/the odds of a merger rose to 90%, in a median 6\.5 billion years/)).toBeVisible();
  await expect(main.getByText(/As of November 2026 the question is open\./)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('galaxy collision: the worker runs the encounter, the presets and controls rebuild it', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'bridges-and-tails');
  await waitForHydration(page);
  const figure = figureByNumber(page, '31.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The Antennae, after Toomre and Toomre \(1972\): two equal galaxies on a bound orbit \(e = 0\.5\).* Closest approach 26 kpc\. Dynamical friction is on\. \d+ million years before the closest approach: the galaxies are 60 kpc apart/)).toBeVisible();
  await figure.getByRole('button', { name: 'A ring galaxy' }).click();
  await expect(caption(figure, /^A ring galaxy, as Lynds and Toomre \(1976\) made them/)).toBeVisible();
  await figure.getByRole('button', { name: 'Fast' }).click();
  await figure.getByRole('button', { name: 'Run the collision' }).click();
  await expect(figure.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(caption(figure, /\d+ million years after the closest approach: the galaxies are \d+ kpc apart, moving at \d+ km\/s relative to each other\. They came within 1\.0 kpc\./)).toBeVisible({ timeout: 30_000 });
  await figure.getByRole('button', { name: 'Pause' }).click();
  await expect(figure.getByRole('button', { name: 'Carry on' })).toBeVisible();
  await figure.getByRole('button', { name: 'By starting radius' }).click();
  await figure.getByRole('button', { name: 'In the orbit’s plane' }).click();
  await expect(figure.getByRole('group', { name: '3D view of the colliding galaxies' })).toBeVisible();
  // Changing a setting makes it the reader's own
  await figure.getByRole('slider', { name: 'Closest approach' }).fill('10');
  await expect(caption(figure, /^Your own encounter: a main galaxy and a companion 30% as heavy on an open orbit \(e = 2\)\. .* Closest approach 10 kpc\. The main disc is standing upright to the orbit; the companion has no disc\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Dynamical friction' }).click();
  await expect(caption(figure, /Dynamical friction is off\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 31.1' }).click();
  await expect(caption(figure, /^The Antennae/)).toBeVisible();
  await expect(figure.getByRole('button', { name: 'By galaxy' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('will we collide: a thousand futures with each team’s measurements, galaxies left out and uncertainties narrowed', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-milky-way-and-andromeda');
  await waitForHydration(page);
  const figure = figureByNumber(page, '31.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(
    caption(figure, /^With the Milky Way, Andromeda, M33 and the Large Magellanic Cloud, measured as Sawala et al\. 2025 took them: the Milky Way and Andromeda merge within 10 billion years in \d+% of the futures .* Sawala et al\. 2025 found 54%\./),
  ).toBeVisible({ timeout: 60_000 });
  await expect(figure.getByText(/futures: 1,000 of 1,000/)).toBeVisible();
  await figure.getByRole('button', { name: 'The Large Magellanic Cloud' }).click();
  await expect(caption(figure, /^With the Milky Way, Andromeda and M33, .* Sawala et al\. 2025 found 63%\./)).toBeVisible({ timeout: 60_000 });
  await figure.getByRole('slider', { name: 'Uncertainty in Andromeda’s sideways motion' }).fill('0');
  await expect(caption(figure, /uncertainties narrowed \(Andromeda’s sideways motion to 0%\)/)).toBeVisible({ timeout: 60_000 });
  await figure.getByRole('button', { name: 'Andromeda’s paths' }).click();
  await expect(figure.getByRole('img', { name: /Andromeda’s paths round the Milky Way/ })).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 31.2' }).click();
  await figure.getByRole('button', { name: 'Wu et al. 2026' }).click();
  await expect(caption(figure, /measured as Wu et al\. 2026 took them: .* Wu et al\. 2026 found 90%\./)).toBeVisible({ timeout: 60_000 });
  await expect(figure.getByText(/moving sideways at 26 km\/s/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the interactive question: make a ring galaxy', async ({ page }) => {
  await openChapter(page);
  await waitForHydration(page);
  const question = page.getByRole('group', { name: /Make a ring galaxy/ });
  const mass = question.getByRole('slider', { name: 'Companion’s mass' });
  await mass.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/passing 30 kpc from the centre, with the disc tilted 0° to its orbit makes no ring\. The companion has to pass through the middle/)).toBeVisible();
  await question.getByRole('slider', { name: 'Closest approach' }).fill('1');
  await question.getByRole('slider', { name: 'Disc’s tilt to the orbit' }).fill('90');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/A companion 30% as heavy, passing 1 kpc from the centre, with the disc tilted 90° to its orbit: right, a ring \d+ kpc across spreads through the disc/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 31, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await waitForHydration(page);
      await figureByNumber(page, '31.1').getByRole('button', { name: 'A ring galaxy' }).click();
      await figureByNumber(page, '31.1').getByRole('button', { name: 'By starting radius' }).click();
      const lg = figureByNumber(page, '31.2');
      await lg.scrollIntoViewIfNeeded();
      await lg.getByRole('button', { name: 'Andromeda’s paths' }).click();
      await expect(lg.getByText(/futures: [1-9][\d,]* of 1,000/)).toBeVisible({ timeout: 30_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
