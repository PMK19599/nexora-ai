import { test, expect } from '@playwright/test';

test.describe('Accessibility Presets', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login endpoint
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          data: { 
            user: {
              id: '1', name: 'Test', email: 'test@example.com', 
              onboardingComplete: true, role: 'student',
              accessibility: {}
            },
            csrfToken: 'mock-token'
          }
        })
      });
    });
    
    await page.route('**/api/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          data: { 
            user: {
              id: '1', name: 'Test', email: 'test@example.com', 
              onboardingComplete: true, role: 'student',
              accessibility: {}
            },
            csrfToken: 'mock-token'
          }
        })
      });
    });

    await page.route('**/api/auth/profile', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: {} } })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for the login to complete and redirect
    await page.waitForURL('**/dashboard');
    
    // Now go to accessibility page
    await page.goto('/accessibility');
  });

  test('Reading-Friendly applies the correct font and spacing classes', async ({ page }) => {
    await page.click('button:has-text("Reading-Friendly")');
    
    const body = page.locator('body');
    await expect(body).toHaveClass(/font-dyslexic/);
    await expect(body).toHaveClass(/line-spacing-extra/);
    await expect(body).toHaveClass(/font-size-large/);
    await expect(body).toHaveClass(/high-contrast/);
    
    // Verify it doesn't have focus mode or predictable layout
    await expect(body).not.toHaveClass(/focus-mode/);
  });

  test('Focus-Friendly applies the intended classes without conflicting distraction rules', async ({ page }) => {
    await page.click('button:has-text("Focus-Friendly")');
    
    const body = page.locator('body');
    await expect(body).toHaveClass(/focus-mode/);
    await expect(body).toHaveClass(/no-animations/);
    
    // Crucially, reduced-distractions should NOT be applied (this was the conflict)
    await expect(body).not.toHaveClass(/reduced-distractions/);
  });

  test('Predictable Layout applies expected reduced-motion and stability classes', async ({ page }) => {
    await page.click('button:has-text("Predictable Layout")');
    
    const body = page.locator('body');
    await expect(body).toHaveClass(/predictable-navigation/);
    await expect(body).toHaveClass(/no-animations/);
    await expect(body).toHaveClass(/high-contrast/);
    await expect(body).toHaveClass(/reduced-distractions/);
  });

  test('Switching presets removes classes from the previous preset', async ({ page }) => {
    // Apply reading-friendly
    await page.click('button:has-text("Reading-Friendly")');
    const body = page.locator('body');
    await expect(body).toHaveClass(/font-dyslexic/);
    
    // Switch to focus-friendly
    await page.click('button:has-text("Focus-Friendly")');
    
    // Previous class should be removed
    await expect(body).not.toHaveClass(/font-dyslexic/);
    
    // New class should be applied
    await expect(body).toHaveClass(/focus-mode/);
  });

  test('Persistence: Reloading the page retains settings via local storage', async ({ page }) => {
    await page.click('button:has-text("Reading-Friendly")');
    await expect(page.locator('body')).toHaveClass(/font-dyslexic/);
    
    // Reload page
    await page.reload();
    
    // Wait for client-side routing and layout
    await page.waitForLoadState('networkidle');
    
    // Settings should still be applied
    await expect(page.locator('body')).toHaveClass(/font-dyslexic/);
  });
});
