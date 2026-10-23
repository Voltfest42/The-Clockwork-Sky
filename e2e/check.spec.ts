import { expect, test, type Locator, type Page } from '@playwright/test';
import { accessibilityViolations, watchErrors } from './helpers';

/** Chapter 1's Check yourself block. */
const CHAPTER = '/a-sense-of-scale/';

function sample(page: Page) {
  return page.getByRole('region', { name: 'Check yourself' });
}

function neptuneDistanceQuestion(page: Page) {
  return sample(page).getByRole('group', { name: /Suppose Earth were 1 m from the Sun/ });
}

function guessQuestion(page: Page) {
  return sample(page).getByRole('group', { name: /How many Earths would fit/ });
}

function neptuneOrbitQuestion(page: Page) {
  return sample(page).getByRole('group', { name: /Neptune’s orbit just fits/ });
}

/** Moves a slider to a position by keyboard, as a reader would. */
async function slideTo(page: Page, slider: Locator, position: number) {
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < position; i++) await page.keyboard.press('ArrowRight');
}

test('a wrong answer is explained, and the right one confirmed @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(CHAPTER);
  const question = neptuneDistanceQuestion(page);
  const check = question.getByRole('button', { name: 'Check' });
  await expect(check).toBeDisabled();

  await question.getByRole('radio', { name: '3 m' }).check();
  await check.click();
  await expect(question.getByText('Not quite.')).toBeVisible();
  await expect(question.getByText(/squeeze the outer planets in to fit the page/)).toBeVisible();
  await expect(sample(page).getByText('You’ve answered 1 of 5, and got 0 right.')).toBeVisible();

  await question.getByRole('radio', { name: '30 m' }).check();
  await check.click();
  await expect(question.getByText('Right.')).toBeVisible();
  await expect(question.getByText(/Mercury, in the same model, would be just\s+39 cm/)).toBeVisible();
  await expect(sample(page).getByText('You’ve answered 1 of 5, and got 1 right.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('every answer can be explained at once', async ({ page }) => {
  await page.goto(CHAPTER);
  const question = neptuneDistanceQuestion(page);
  await question.getByRole('radio', { name: '30 m' }).check();
  await question.getByRole('button', { name: 'Check' }).click();
  const explainAll = question.getByRole('button', { name: 'Explain every answer' });
  await explainAll.click();
  await expect(question.getByText(/^✗ Not quite\.$/)).toHaveCount(3);
  await expect(question.getByText(/^✓ Right\.$/)).toHaveCount(1);
  await expect(question.getByText(/That’s Saturn/)).toBeVisible();
  await question.getByRole('button', { name: 'Hide the explanations' }).click();
  await expect(question.getByText(/^✗ Not quite\.$/)).toHaveCount(0);
});

test('an interactive question checks the state of its control, and can be worked by keyboard', async ({ page }) => {
  await page.goto(CHAPTER);
  const question = guessQuestion(page);
  const slider = question.getByRole('slider', { name: 'Your guess' });
  await expect(question.getByText('10 Earths')).toBeVisible();

  await slider.focus();
  await page.keyboard.press('End');
  await expect(question.getByText('10,000 Earths')).toBeVisible();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Too many/)).toBeVisible();

  await slideTo(page, slider, 204); // 10^2.04 ≈ 110
  await expect(question.getByText('110 Earths')).toBeVisible();
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText('Right.')).toBeVisible();
  await expect(question.getByText(/About 109/)).toBeVisible();
});

test('answers are remembered in the browser, and can be cleared', async ({ page }) => {
  await page.goto(CHAPTER);
  await neptuneDistanceQuestion(page).getByRole('radio', { name: '30 m' }).check();
  await neptuneDistanceQuestion(page).getByRole('button', { name: 'Check' }).click();
  await slideTo(page, guessQuestion(page).getByRole('slider'), 300);
  await guessQuestion(page).getByRole('button', { name: 'Check' }).click();
  await expect(sample(page).getByText('You’ve answered 2 of 5, and got 1 right.')).toBeVisible();

  await page.reload();
  await expect(sample(page).getByText('You’ve answered 2 of 5, and got 1 right.')).toBeVisible();
  await expect(neptuneDistanceQuestion(page).getByRole('radio', { name: '30 m' })).toBeChecked();
  await expect(guessQuestion(page).getByText('1,000 Earths')).toBeVisible();
  await expect(guessQuestion(page).getByText(/Too many/)).toBeVisible();

  await sample(page).getByRole('button', { name: 'Clear my answers' }).click();
  await expect(sample(page).getByText('Your answers stay in this browser.')).toBeVisible();
  await expect(neptuneDistanceQuestion(page).getByRole('radio', { name: '30 m' })).not.toBeChecked();
  await expect(guessQuestion(page).getByText('10 Earths')).toBeVisible();
  await page.reload();
  await expect(sample(page).getByText('Your answers stay in this browser.')).toBeVisible();
});

test('the questions still work when the browser blocks storage', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  const errors = watchErrors(page);
  await page.goto(CHAPTER);
  await neptuneDistanceQuestion(page).getByRole('radio', { name: '30 m' }).check();
  await neptuneDistanceQuestion(page).getByRole('button', { name: 'Check' }).click();
  await expect(neptuneDistanceQuestion(page).getByText('Right.')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('right and wrong answers pass the accessibility checks', async ({ page }) => {
      await page.goto(CHAPTER);
      const question = neptuneDistanceQuestion(page);
      await question.getByRole('radio', { name: '30 m' }).check();
      await question.getByRole('button', { name: 'Check' }).click();
      await question.getByRole('button', { name: 'Explain every answer' }).click();
      await guessQuestion(page).getByRole('button', { name: 'Check' }).click();
      await expect(guessQuestion(page).getByText(/Too few/)).toBeVisible();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}

test('an interactive question can embed a figure: zoom until Neptune’s orbit fits', async ({ page }) => {
  await page.goto(CHAPTER);
  const question = neptuneOrbitQuestion(page);
  const slider = question.getByRole('slider', { name: 'Zoom' });
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/Not yet/)).toBeVisible();
  // Page Up steps a whole power of ten: from 10⁹ to 10¹³.
  await slider.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('PageUp');
  await expect(slider).toHaveValue('13');
  await question.getByRole('button', { name: 'Check' }).click();
  await expect(question.getByText(/13 steps of ×10 from you/)).toBeVisible();
});
