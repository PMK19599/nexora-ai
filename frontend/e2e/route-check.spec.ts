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

  test('Logged in access checks', async ({ page }) => {
    console.log('Logging in...');
    await page.goto(`${URL}/login`);
    await page.fill('input[type="email"]', 'nexora.beta.test@gmail.com');
    await page.fill('input[type="password"]', 'vhuewcy6324rt267ygfbcyg3');
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
