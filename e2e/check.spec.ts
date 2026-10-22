import { expect, test, type Locator, type Page } from '@playwright/test';
import { accessibilityViolations, watchErrors } from './helpers';

/** The sample Check yourself block on the landing page. */
function sample(page: Page) {
  return page.getByRole('region', { name: 'Try a Check yourself' });
}

function closestQuestion(page: Page) {
  return sample(page).getByRole('group', { name: /When is Earth closest to the Sun\?/ });
}

function guessQuestion(page: Page) {
  return sample(page).getByRole('group', { name: /How many Earths would fit/ });
}

/** Moves a slider to a position by keyboard, as a reader would. */
async function slideTo(page: Page, slider: Locator, position: number) {
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < position; i++) await page.keyboard.press('ArrowRight');
}

test('a wrong answer is explained, and the right one confirmed @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const question = closestQuestion(page);
  const check = question.getByRole('button', { name: 'Check' });
  await expect(check).toBeDisabled();

  await question.getByRole('radio', { name: 'In early July, in the middle of the northern summer' }).check();
  await check.click();
  await expect(question.getByText('Not quite.')).toBeVisible();
  await expect(question.getByText(/it comes from the idea that the seasons are caused by our distance/)).toBeVisible();
  await expect(sample(page).getByText('You’ve answered 1 of 2, and got 0 right.')).toBeVisible();

  await question.getByRole('radio', { name: 'In early January' }).check();
  await check.click();
  await expect(question.getByText('Right.')).toBeVisible();
  await expect(question.getByText(/about 7% more sunlight/)).toBeVisible();
  await expect(sample(page).getByText('You’ve answered 1 of 2, and got 1 right.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('every answer can be explained at once', async ({ page }) => {
  await page.goto('/');
  const question = closestQuestion(page);
  await question.getByRole('radio', { name: 'In early January' }).check();
  await question.getByRole('button', { name: 'Check' }).click();
  const explainAll = question.getByRole('button', { name: 'Explain every answer' });
  await explainAll.click();
  await expect(question.getByText(/^✗ Not quite\.$/)).toHaveCount(3);
  await expect(question.getByText(/^✓ Right\.$/)).toHaveCount(1);
  await expect(question.getByText(/Earth’s orbit is very nearly a circle/)).toBeVisible();
  await question.getByRole('button', { name: 'Hide the explanations' }).click();
  await expect(question.getByText(/^✗ Not quite\.$/)).toHaveCount(0);
});

test('an interactive question checks the state of its control, and can be worked by keyboard', async ({ page }) => {
  await page.goto('/');
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
  await page.goto('/');
  await closestQuestion(page).getByRole('radio', { name: 'In early January' }).check();
  await closestQuestion(page).getByRole('button', { name: 'Check' }).click();
  await slideTo(page, guessQuestion(page).getByRole('slider'), 300);
  await guessQuestion(page).getByRole('button', { name: 'Check' }).click();
  await expect(sample(page).getByText('You’ve answered 2 of 2, and got 1 right.')).toBeVisible();

  await page.reload();
  await expect(sample(page).getByText('You’ve answered 2 of 2, and got 1 right.')).toBeVisible();
  await expect(closestQuestion(page).getByRole('radio', { name: 'In early January' })).toBeChecked();
  await expect(guessQuestion(page).getByText('1,000 Earths')).toBeVisible();
  await expect(guessQuestion(page).getByText(/Too many/)).toBeVisible();

  await sample(page).getByRole('button', { name: 'Clear my answers' }).click();
  await expect(sample(page).getByText('Your answers stay in this browser.')).toBeVisible();
  await expect(closestQuestion(page).getByRole('radio', { name: 'In early January' })).not.toBeChecked();
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
  await page.goto('/');
  await closestQuestion(page).getByRole('radio', { name: 'In early January' }).check();
  await closestQuestion(page).getByRole('button', { name: 'Check' }).click();
  await expect(closestQuestion(page).getByText('Right.')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('right and wrong answers pass the accessibility checks', async ({ page }) => {
      await page.goto('/');
      const question = closestQuestion(page);
      await question.getByRole('radio', { name: 'In early January' }).check();
      await question.getByRole('button', { name: 'Check' }).click();
      await question.getByRole('button', { name: 'Explain every answer' }).click();
      await guessQuestion(page).getByRole('button', { name: 'Check' }).click();
      await expect(guessQuestion(page).getByText(/Too few/)).toBeVisible();
      expect(await accessibilityViolations(page)).toEqual([]);
    });
  });
}
