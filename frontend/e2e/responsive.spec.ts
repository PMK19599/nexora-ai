import { test, expect } from '@playwright/test';

test('auth actions remain reachable in mobile landscape', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 320 });
  await page.goto('/register');
  await page.getByText(/Already have an account/i).scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: /Sign in/ })).toBeVisible();
});

test('auth actions remain reachable at simulated 200 percent zoom', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 480 });
  await page.goto('/register');
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await page.getByText(/Already have an account/i).scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: /Sign in/ })).toBeVisible();
});
