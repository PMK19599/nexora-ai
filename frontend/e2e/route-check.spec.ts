import { test, expect } from '@playwright/test';

test.describe('Verify Route Protection', () => {
  const URL = 'https://frontend-kappa-fawn-15.vercel.app';

  test('Logged out access checks', async ({ page }) => {
    const checkRoute = async (route, expectedPattern) => {
      await page.goto(`${URL}${route}`);
      await expect(page).toHaveURL(expectedPattern, { timeout: 10000 });
      console.log(`[Logged out] ${route} -> ${page.url()}`);
    };

    // Actual protected routes
    await checkRoute('/dashboard', /.*\/login/);
    await checkRoute('/review', /.*\/login/);
    await checkRoute('/games', /.*\/login/);
    await checkRoute('/career', /.*\/login/);
    await checkRoute('/tutors', /.*\/login/);
    await checkRoute('/groups', /.*\/login/);
    await checkRoute('/accessibility', /.*\/login/);

    // The invalid route
    await checkRoute('/game', /.*\/game/);
    const content = await page.textContent('body');
    if (content.includes('404') || content.includes('not found')) {
      console.log('Confirmed /game is a 404 page');
    }
  });

  test('authenticated user should be able to access protected routes', async ({ page }) => {
    const testEmail = process.env.TEST_EMAIL;
    const testPassword = process.env.TEST_PASSWORD;
    if (!testEmail || !testPassword) {
      test.skip(true, 'TEST_EMAIL and TEST_PASSWORD environment variables are required for this test.');
      return;
    }

    // Login first
    await page.goto(`${URL}/login`);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for successful login (dashboard or onboarding)
    await expect(page).toHaveURL(/.*\/(dashboard|onboarding)/, { timeout: 15000 });

    const checkRoute = async (route, expectedPattern) => {
      await page.goto(`${URL}${route}`);
      await expect(page).toHaveURL(expectedPattern, { timeout: 10000 });
      console.log(`[Logged in] ${route} -> ${page.url()}`);
    };

    await checkRoute('/games', /.*\/games/);
    await checkRoute('/game', /.*\/game/);
  });
});
