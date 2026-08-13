import { test, expect } from '@playwright/test';

test.describe('Auth Flow Routes', () => {
  test('reset password page does not redirect to login and has correct title', async ({ page }) => {
    await page.goto('/reset-password?token=test-token');
    
    // Ensure the URL remains stable (no redirect)
    await expect(page).toHaveURL(/\/reset-password\?token=test-token/);
    
    // Ensure the title is correct and not "Page not found"
    await expect(page).toHaveTitle('Reset password — Nexora AI');
    
    // Ensure the page renders the reset password form
    await expect(page.locator('text=Choose a new password')).toBeVisible();
  });

  test('verify email page does not redirect to login and has correct title', async ({ page }) => {
    await page.goto('/verify-email?token=test-token');
    
    // Ensure the URL remains stable
    await expect(page).toHaveURL(/\/verify-email\?token=test-token/);
    
    // Ensure the title is correct
    await expect(page).toHaveTitle('Verify email — Nexora AI');
    
    // The page will show a verification attempt (could succeed or fail, but shouldn't be the login form)
    await expect(page.locator('text=Verifying').or(page.locator('text=Verification failed'))).toBeVisible();
  });

  test('forgot password page has correct title', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveTitle('Forgot password — Nexora AI');
    await expect(page.locator('text=Reset your password')).toBeVisible();
  });

  test('verify pending page has correct title', async ({ page }) => {
    await page.goto('/verify-pending');
    await expect(page).toHaveTitle('Check your email — Nexora AI');
    await expect(page.locator('text=Verify your email')).toBeVisible();
  });

  test('reset password page tolerates trailing slash', async ({ page }) => {
    await page.goto('/reset-password/?token=test-token');
    
    // Ensure the URL remains stable (no redirect to login)
    await expect(page).toHaveURL(/\/reset-password\/\?token=test-token/);
    
    await expect(page).toHaveTitle('Reset password — Nexora AI');
    await expect(page.locator('text=Choose a new password')).toBeVisible();
  });

  test('verify email page tolerates trailing slash', async ({ page }) => {
    await page.goto('/verify-email/?token=test-token');
    
    // Ensure the URL remains stable
    await expect(page).toHaveURL(/\/verify-email\/\?token=test-token/);
    
    await expect(page).toHaveTitle('Verify email — Nexora AI');
    await expect(page.locator('text=Verifying').or(page.locator('text=Verification failed'))).toBeVisible();
  });

  test('dashboard redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Unauthenticated user should be redirected to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Sign in')).toBeVisible();
  });
});
