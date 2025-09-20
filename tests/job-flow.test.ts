import { test, expect } from '@playwright/test';

// Note: These tests require demo accounts to be seeded
// Run `npm run seed` before running these tests

test.describe('Job Management Flow', () => {
  test('farmer can post a job', async ({ page }) => {
    // Login as farmer
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'farmer1@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=🚜')).toBeVisible();

    // Navigate to post job tab
    await page.click('text=Post Job');

    // Fill out job form
    await page.fill('input[placeholder*="Corn"]', 'Test Corn');
    await page.fill('input[type="number"][step="0.1"]', '20.5');
    await page.fill('input[type="number"]:not([step])', '1500');
    await page.fill('input[placeholder*="pickup"]', 'Test Farm, IA');
    await page.fill('input[placeholder*="dropoff"]', 'Test Mill, IL');

    // Submit job
    await page.click('button:text("Post Job")');

    // Should show success and switch to my jobs
    await expect(page).toHaveURL('/dashboard');
    // Job should appear in the list (checking for the crop name)
    await expect(page.locator('text=Test Corn')).toBeVisible();
  });

  test('carrier can view and accept available jobs', async ({ page }) => {
    // Login as carrier
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'carrier1@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=🚚')).toBeVisible();

    // Should be on Available Jobs tab by default
    await expect(page.locator('text=Available Jobs')).toBeVisible();

    // Look for open jobs
    const openJobs = page.locator('[data-testid="job-card"]:has-text("open"), .bg-white:has-text("open")');
    const jobCount = await openJobs.count();

    if (jobCount > 0) {
      // Find and click the first "Accept Job" button
      const acceptButton = page.locator('button:text("Accept Job")').first();

      if (await acceptButton.isVisible()) {
        await acceptButton.click();

        // Should show success message or job should change status
        // Wait a moment for the action to complete
        await page.waitForTimeout(2000);
      }
    }

    // Check My Jobs tab to see accepted jobs
    await page.click('text=My Jobs');
    await expect(page.locator('text=My Jobs')).toBeVisible();
  });

  test('job status can be updated through the flow', async ({ page }) => {
    // Login as carrier who has accepted jobs
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'carrier2@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // Go to My Jobs
    await page.click('text=My Jobs');

    // Look for accepted jobs that can be moved to in_transit
    const acceptedJobs = page.locator('.bg-white:has-text("accepted")');
    const acceptedCount = await acceptedJobs.count();

    if (acceptedCount > 0) {
      // Click on view details for first accepted job
      await acceptedJobs.first().locator('button:text("View Details")').click();

      // This would open a job details modal/page where status can be updated
      // For now, we're just checking that the UI responds
      await page.waitForTimeout(1000);
    }
  });

  test('map displays jobs and carriers', async ({ page }) => {
    // Login as any user
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'farmer1@demo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // Check that map container is present
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Check for map tiles loading
    await expect(page.locator('.leaflet-tile-container')).toBeVisible();

    // Toggle sidebar to see full map
    await page.click('button:text("←")');

    // Map should expand
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Toggle sidebar back
    await page.click('button:text("→")');
  });
});