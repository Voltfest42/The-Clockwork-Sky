import { expect, test, type Locator, type Page } from '@playwright/test';
import { CHAPTERS } from '../src/site/course';
import { accessibilityViolations, expectNoBrokenFigures, figureByNumber, waitForHydration, watchErrors } from './helpers';

const chapter = CHAPTERS[27];

function caption(figure: Locator, text: RegExp | string) {
  return figure.locator('p[aria-live="polite"]:not(.visually-hidden)').filter({ hasText: text });
}

async function openChapter(page: Page, section = '') {
  await page.goto(`/${chapter.slug}/${section ? `#${section}` : ''}`);
  await expect(page.locator('main').getByRole('heading', { level: 1, name: 'Two stars are stranger than one' })).toBeVisible();
}

test('Chapter 28 shows its sections, four figures, a timeline and a Check yourself @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page);
  const main = page.locator('main');
  await expect(main.getByText('Builds on:')).toBeVisible();
  for (const title of chapter.sections) await expect(main.getByRole('heading', { level: 2, name: title })).toBeVisible();
  for (const n of ['28.1', '28.2', '28.3', '28.4']) {
    const figure = figureByNumber(page, n);
    await expect(figure).toBeVisible();
    await expect(figure.getByText('Try this')).toBeVisible();
    await expect(figure.getByRole('button', { name: `Reset figure ${n}` })).toBeVisible();
  }
  await expect(main.getByRole('region', { name: 'Two stars' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Check yourself' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('the Roche explorer: lobes, a full donor, and a stream that hits or misses', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-roche-potential');
  await waitForHydration(page);
  const figure = figureByNumber(page, '28.1');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^The donor is 2\.0 times the companion’s mass\. Its Roche lobe, .* is 0\.440 separations in radius \(by volume\); the companion’s is 0\.321\. L1 lies 0\.571 separations from the donor\. The donor fills 75% of the way to L1: it is inside its lobe, and keeps its gas\./)).toBeVisible();
  await figure.getByRole('button', { name: 'Fill the lobe' }).click();
  await expect(caption(figure, /gas spills through L1\. .* the stream would pass 0\.0\d\d separations from the companion’s centre, but the companion’s radius is 0\.080, so the stream hits it/)).toBeVisible();
  await figure.getByRole('slider', { name: /^Mass ratio/ }).fill('-0.7');
  await expect(caption(figure, /^The donor is 0\.20 times .* it misses, circles the companion and forms a disc about 0\.17\d separations out/)).toBeVisible();
  await expect(figure.getByRole('img', { name: '3D view of the Roche potential as a landscape' }).or(figure.locator('canvas')).first()).toBeVisible();
  await figure.getByRole('button', { name: 'Reset figure 28.1' }).click();
  await expect(caption(figure, /keeps its gas/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the orbit as mass changes hands: smallest at equal masses, wider when gas is lost', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'mass-transfer-changes-the-orbit');
  await waitForHydration(page);
  const figure = figureByNumber(page, '28.2');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^3\.0 M☉ gives mass to 1\.5 M☉, which keeps 100% of it\. Now the donor has 1\.80 M☉ and its companion 2\.70 M☉: the separation is 0\.86 times what it was and the period 0\.79 times\. With nothing lost, the orbit is smallest when the masses are equal, 0\.79 times its start\./)).toBeVisible();
  await figure.getByRole('slider', { name: 'Share the companion keeps' }).fill('0.5');
  await expect(caption(figure, /which keeps 50% of it\. .* and 0\.60 M☉ has left the pair/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the Algol paradox: BSE makes Algol, its lighter star the more evolved', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-algol-paradox');
  await waitForHydration(page);
  const figure = figureByNumber(page, '28.3');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^911 million years after birth\. Star 1, born with 2\.8 M☉, is a red giant of 0\.70 M☉, filling its Roche lobe; star 2, born with 1\.0 M☉, is a main-sequence star of 3\.10 M☉\. They orbit every 2\.88 days, 13\.\d R☉ apart\. The lighter star is the more evolved: the Algol paradox\./)).toBeVisible({ timeout: 15_000 });
  await figure.getByRole('button', { name: 'Masses equal' }).click();
  await expect(caption(figure, /^443 million years after birth\. .* They orbit every 0\.8\d days/)).toBeVisible();
  await figure.getByRole('button', { name: 'Merged' }).click();
  await expect(caption(figure, /They are no longer a pair\./)).toBeVisible();
  await expect(figure.getByText(/the merged star is a carbon–oxygen white dwarf of 0\.88 M☉/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the binary zoo: a map of fates, a cell’s story, and the keyboard', async ({ page }) => {
  const errors = watchErrors(page);
  await openChapter(page, 'the-binary-zoo');
  await waitForHydration(page);
  const figure = figureByNumber(page, '28.4');
  await figure.scrollIntoViewIfNeeded();
  await expect(caption(figure, /^1\.6 \+ 0\.8 M☉ in a 55-day orbit, at Z = 0\.02 and α = 1: white dwarf fed by a companion\. After 13\.8 billion years it is a carbon–oxygen white dwarf/)).toBeVisible({ timeout: 20_000 });
  const map = figure.getByRole('img', { name: /^Map of outcomes/ });
  await map.focus();
  for (let k = 0; k < 10; k++) await map.press('ArrowLeft');
  await expect(caption(figure, /^1\.6 \+ 0\.8 M☉ in a 1\.0-day orbit, .*: merged into one star\./)).toBeVisible({ timeout: 20_000 });
  await figure.getByRole('button', { name: 'Metal-poor (Z = 0.001)' }).click();
  await expect(caption(figure, /at Z = 0\.001 and α = 1/)).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('the interactive question: a stream that misses its companion', async ({ page }) => {
  await openChapter(page);
  await waitForHydration(page);
  const question = page.getByRole('group', { name: /stream from L1 misses the companion/ });
  const slider = question.getByRole('slider', { name: 'Mass ratio, donor ÷ companion' });
  await slider.scrollIntoViewIfNeeded();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/A mass ratio of 2\.0: the stream comes within/)).toBeVisible();
  await slider.fill('-0.7');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/A mass ratio of 0\.20: right/)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('Chapter 28, with every figure in use, passes the accessibility checks', async ({ page }) => {
      await openChapter(page);
      await waitForHydration(page);
      await figureByNumber(page, '28.1').getByRole('button', { name: 'Fill the lobe' }).click();
      await figureByNumber(page, '28.2').getByRole('slider', { name: 'Share the companion keeps' }).fill('0.5');
      await figureByNumber(page, '28.3').getByRole('button', { name: 'Masses equal' }).click();
      await expect(caption(figureByNumber(page, '28.4'), /orbit/)).toBeVisible({ timeout: 20_000 });
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
