import { test, expect, type APIRequestContext } from '@playwright/test';

// Self-serve institute sign-up, join links, audit log and the DPDP data rights, end to end through the API.

async function apiSignIn(request: APIRequestContext, email: string, password: string) {
  const { csrfToken } = await (await request.get('/api/auth/csrf')).json();
  await request.post('/api/auth/callback/credentials', { form: { csrfToken, email, password, json: 'true' }, maxRedirects: 0 });
}

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.describe('Institute onboarding and data rights', () => {
  test('an institute signs up, shares its link, a student joins it, and actions are audited', async ({ playwright, baseURL }) => {
    const admin = await playwright.request.newContext({ baseURL });
    const student = await playwright.request.newContext({ baseURL });
    const id = unique();
    const adminEmail = `owner-${id}@example.test`;

    // 1. Institute registers itself
    const reg = await admin.post('/api/auth/register-institute', {
      data: { instituteName: `E2E Academy ${id}`, name: 'Owner', email: adminEmail, phone: '+91 98765 43210', password: 'Password123!', examCategories: ['PLAB'] },
    });
    expect(reg.ok()).toBeTruthy();

    // 2. Admin signs in and sees the setup checklist and its join link
    await apiSignIn(admin, adminEmail, 'Password123!');
    const overview = await (await admin.get('/api/admin/overview')).json();
    expect(overview.setup.find((s: { id: string }) => s.id === 'students').done).toBe(false);
    const { code, url } = await (await admin.get('/api/organization/join-code')).json();
    expect(url).toContain(`/join/${code}`);

    // 3. The public lookup names the institute; a wrong code is rejected at sign-up
    const lookup = await (await student.get(`/api/auth/join-code?code=${code}`)).json();
    expect(lookup.name).toBe(`E2E Academy ${id}`);
    const bad = await student.post('/api/auth/register', { data: { name: 'S', email: `bad-${id}@example.test`, password: 'Password123!', joinCode: 'NOTREAL1' } });
    expect(bad.status()).toBe(400);

    // 4. A student signs up with the code and lands in that institute
    const studentEmail = `student-${id}@example.test`;
    const joined = await student.post('/api/auth/register', { data: { name: 'Joining Student', email: studentEmail, password: 'Password123!', joinCode: code.toLowerCase() } });
    expect(joined.ok()).toBeTruthy();
    const users = await (await admin.get('/api/users?role=STUDENT')).json();
    expect(JSON.stringify(users)).toContain(studentEmail);

    // 5. Admin actions are in the audit log
    const batch = await admin.post('/api/batches', { data: { name: 'Morning Batch' } });
    expect(batch.ok()).toBeTruthy();
    const log = await (await admin.get('/api/admin/audit')).json();
    expect(log.items.some((e: { action: string }) => e.action === 'batch.create')).toBe(true);

    // 6. The /join link redirects to sign-up with the code filled in
    const redirect = await student.get(`/join/${code}`, { maxRedirects: 0 });
    expect([307, 308]).toContain(redirect.status());
    expect(redirect.headers()['location']).toContain(`code=${code}`);

    await admin.dispose();
    await student.dispose();
  });

  test('a user can download their data and delete their account', async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL });
    const id = unique();
    // Register through a fresh institute so the test doesn't depend on seeded data
    const owner = `owner2-${id}@example.test`;
    await ctx.post('/api/auth/register-institute', { data: { instituteName: `Privacy Academy ${id}`, name: 'Owner', email: owner, phone: '+91 98765 43210', password: 'Password123!' } });
    await apiSignIn(ctx, owner, 'Password123!');
    const { code } = await (await ctx.get('/api/organization/join-code')).json();

    const user = await playwright.request.newContext({ baseURL });
    const email = `leaver-${id}@example.test`;
    expect((await user.post('/api/auth/register', { data: { name: 'Leaver', email, password: 'Password123!', joinCode: code } })).ok()).toBeTruthy();
    await apiSignIn(user, email, 'Password123!');

    const exported = await user.get('/api/profile/export');
    expect(exported.ok()).toBeTruthy();
    expect(exported.headers()['content-disposition']).toContain('attachment');
    const data = await exported.json();
    expect(data.profile.email).toBe(email);
    expect(JSON.stringify(data)).not.toContain('password":');

    // Wrong password is refused; the right one deletes the account
    expect((await user.delete('/api/profile', { data: { password: 'wrong-password' } })).status()).toBe(400);
    expect((await user.delete('/api/profile', { data: { password: 'Password123!' } })).ok()).toBeTruthy();

    // The institute's only admin can't delete themselves
    const lastAdmin = await ctx.delete('/api/profile', { data: { password: 'Password123!' } });
    expect(lastAdmin.status()).toBe(400);

    await ctx.dispose();
    await user.dispose();
  });
});
