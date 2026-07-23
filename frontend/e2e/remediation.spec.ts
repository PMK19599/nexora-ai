import { test, expect } from '@playwright/test';

test('shows a branded 404 for invalid routes', async ({ page }) => {
  await page.goto('/definitely-not-a-real-route');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('registration is scrollable at 320px and exposes semantic fields', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/register');
  await expect(page.getByLabel('Full Name')).toHaveAttribute('autocomplete', 'name');
  await expect(page.getByLabel('Email Address')).toHaveAttribute('autocomplete', 'email');
  await expect(page.getByLabel('Confirm password')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
  await page.getByText(/Already have an account/i).scrollIntoViewIfNeeded();
  await expect(page.getByText(/Already have an account/i)).toBeVisible();
});

test('accessible track query is honored and uses preference-led wording', async ({ page }) => {
  await page.goto('/register?track=neurodivergent');
  await page.getByLabel('Full Name').fill('Example Test');
  await page.getByLabel('Email Address').fill('test@example.invalid');
  await page.getByLabel(/^Password$/).fill('a-long-test-passphrase');
  await page.getByLabel('Confirm password').fill('a-long-test-passphrase');
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText('Which support preset would help you?')).toBeVisible();
  await expect(page.getByText('You do not need a diagnosis to use these settings.')).toBeVisible();
  await expect(page.getByRole('button', { name: /No preset/ })).toBeVisible();
});

test('login offers recovery without demo credentials', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
  await expect(page.getByText(/Quick demo access/i)).toHaveCount(0);
});
