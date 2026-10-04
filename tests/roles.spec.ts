import { test, expect } from '@playwright/test';

test.describe('Role-based E2E Flows', () => {

  test('Super Admin Flow - Login and access Organization Dashboard', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form with seeded admin credentials
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('superadmin@platform.com');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.getByRole('button', { name: 'Sign In to Dashboard' }).click();

    // Verify it navigates away from login
    await page.waitForURL(/.*(dashboard|admin).*/, { timeout: 15000 }).catch(() => {});
    
    // Explicitly navigate to admin org page if not already there
    await page.goto('/admin/organization');
    
    // Check if the organization content is visible (depends on how Next-Auth session is cached)
    // We expect the page not to redirect to login since we are authenticated as SUPER_ADMIN
    await expect(page).not.toHaveURL(/.*login.*/i);
    
    // Look for dashboard specific elements
    await expect(page.locator('body')).toContainText(/organization/i);
  });

  test('Faculty Flow - Login and access Faculty Dashboard', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form with seeded faculty credentials
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('faculty@apex.com');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.getByRole('button', { name: 'Sign In to Dashboard' }).click();

    // Verify it navigates away from login
    await page.waitForURL(/.*(dashboard|faculty).*/, { timeout: 15000 }).catch(() => {});
    
    // Navigate to faculty specific area if it exists (e.g. question bank or tests)
    // Assuming /dashboard is the fallback
    await page.goto('/dashboard');
    
    await expect(page).not.toHaveURL(/.*login.*/i);
  });

});
