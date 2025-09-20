import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should navigate to farmer signup', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Convoy for Agriculture');

    // Click farmer signup
    await page.click('text=I\'m a Farmer');

    await expect(page).toHaveURL('/auth?role=farmer');
    await expect(page.locator('text=Farmer')).toBeVisible();
  });

  test('should navigate to carrier signup', async ({ page }) => {
    await page.goto('/');

    // Click carrier signup
    await page.click('text=I\'m a Carrier');

    await expect(page).toHaveURL('/auth?role=carrier');
    await expect(page.locator('text=Carrier')).toBeVisible();
  });

  test('should show sign in form by default when visiting auth directly', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
  });

  test('should toggle between sign in and sign up', async ({ page }) => {
    await page.goto('/auth');

    // Should start with sign in
    await expect(page.locator('h1')).toContainText('Welcome Back');

    // Switch to sign up
    await page.click('text=Don\'t have an account? Sign up');
    await expect(page.locator('h1')).toContainText('Create Account');

    // Switch back to sign in
    await page.click('text=Already have an account? Sign in');
    await expect(page.locator('h1')).toContainText('Welcome Back');
  });

  test('should show validation for empty form', async ({ page }) => {
    await page.goto('/auth');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Browser validation should prevent submission
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused();
  });
});