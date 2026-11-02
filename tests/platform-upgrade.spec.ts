import { test, expect, type Page } from '@playwright/test';

// Uses the demo accounts created by `prisma db seed` (run by `npm run db:setup` in CI).
async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByPlaceholder(/student@astra\.com/i).fill(email);
  await page.getByPlaceholder('••••••••').fill('password123');
  await page.getByRole('button', { name: /sign in to dashboard/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}

test.describe('Platform upgrade', () => {
  test('student sees the study plan and can open Daily Review', async ({ page }) => {
    await signIn(page, 'student@astra.com');
    await page.goto('/student');
    await expect(page.getByText('Exam countdown')).toBeVisible();
    await expect(page.getByText('Study streak')).toBeVisible();
    await page.goto('/student/review');
    await expect(page.getByRole('heading', { name: 'Daily Review' })).toBeVisible();
  });

  test('student can build a custom quiz from the question bank', async ({ page }) => {
    await signIn(page, 'student@astra.com');
    await page.goto('/student/practice');
    await expect(page.getByText('Build a custom quiz')).toBeVisible();
    await page.getByRole('button', { name: /start quiz/i }).click();
    await page.waitForURL(/\/exam\//, { timeout: 30_000 });
  });

  test('password reset never reveals whether an account exists', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/forgot-password/);
    await page.getByLabel('Account email').fill('nobody-here@example.test');
    await page.getByRole('button', { name: /send code/i }).click();
    await expect(page.getByText(/if an account with a phone number exists/i)).toBeVisible();
  });

  test('admin can open messaging settings and delivery logs', async ({ page }) => {
    await signIn(page, 'admin@apex.com');
    await page.goto('/admin/messaging');
    await expect(page.getByRole('heading', { name: 'WhatsApp & SMS' })).toBeVisible();
    await page.goto('/admin/notifications');
    await expect(page.getByRole('heading', { name: 'Notification Logs' })).toBeVisible();
  });

  test('short report links never expose a report without a valid code', async ({ page }) => {
    await page.goto('/r/doesnotexist1');
    await expect(page.getByText(/invalid or expired link/i)).toBeVisible();
  });
});
