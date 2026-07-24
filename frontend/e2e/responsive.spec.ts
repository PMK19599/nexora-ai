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

const viewports = [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

for (const vp of viewports) {
  test(`registration form is fully reachable and scrollable at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/register');
    
    // Fill out first step to get to step 2
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.click('button:has-text("Continue")');
    
    // Step 2: Click Neurodivergent track to expand content
    await page.click('button:has-text("Accessible")');
    // Click Autism preset to show features
    await page.click('button:has-text("autism")');
    
    // Verify Create Account button is reachable
    const createBtn = page.locator('button:has-text("Create Account")');
    await createBtn.scrollIntoViewIfNeeded();
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();
    
    // Verify no horizontal scrollbar by checking page width against viewport width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(vp.width);
  });
}
