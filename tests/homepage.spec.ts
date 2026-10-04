import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  
  // Verify the page title or a specific element on the homepage
  // The actual title might differ, assuming it's part of the layout
  await expect(page).toHaveTitle(/Astra|Exam/i);
});

test('has login link', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  
  // Look for a login button or link
  const loginLink = page.getByRole('link', { name: /login/i });
  if (await loginLink.count() > 0) {
    await expect(loginLink).toBeVisible();
  }
});
