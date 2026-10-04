import { test, expect } from '@playwright/test';

test('dashboard redirects to login if unauthenticated', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  
  // Depending on Next-Auth configuration, unauthenticated users might be redirected to /login, /api/auth/signin or similar
  await expect(page).toHaveURL(/.*login|signin|auth/i);
});

test('admin organization redirects to login if unauthenticated', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/organization');
  
  await expect(page).toHaveURL(/.*login|signin|auth/i);
});
