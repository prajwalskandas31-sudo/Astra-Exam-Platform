import { randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';

/*
 * Full platform journey with dummy profiles, in a brand-new isolated institute:
 * institute sign-up → setup → staff, students, parents → a real CBT exam through the UI →
 * results, peer comparison, review, reports → every page of every portal for every role.
 *
 * Safe on production: all accounts use the reserved .test domain and the institute has no
 * WhatsApp/SMS provider connected, so no message can reach a real person.
 *
 *   E2E_BASE_URL=https://astra-exam-platform.vercel.app npx playwright test tests/full-journey.spec.ts --workers=1
 */

test.describe.configure({ mode: 'serial', timeout: 180_000 });

const RUN = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12) + Math.floor(Math.random() * 1000);
const DOMAIN = 'astra-qa.test';
// Fresh per run (the accounts only live for the run); never commit a fixed password to a public repo
const PASSWORD = process.env.E2E_QA_PASSWORD || `Qa-${randomUUID()}`;
const mail = (who: string) => `${who}.${RUN}@${DOMAIN}`;

const state: {
  joinCode?: string;
  testId?: string;
  questionIds: string[];
  answerKey: Record<string, string>;
  creds: Record<string, string>; // email → password
  attemptA?: string;
  attemptB?: string;
} = { questionIds: [], answerKey: {}, creds: {} };

const STUDENT_PAGES = ['/student', '/student/mocks', '/student/exams', '/student/my-results', '/student/review', '/student/analysis', '/student/mistakes', '/student/practice', '/student/bookmarks', '/student/history', '/student/messages', '/student/documents', '/student/news', '/student/buy-exams', '/student/settings'];
const MENTOR_PAGES = ['/mentor', '/mentor/students', '/mentor/analytics', '/mentor/question-banks', '/mentor/test-manager', '/mentor/reports', '/mentor/documents', '/mentor/approvals', '/mentor/messages', '/mentor/settings'];
const ADMIN_PAGES = ['/admin', '/admin/analytics', '/admin/organization', '/admin/users', '/admin/batches', '/admin/approvals', '/admin/question-banks', '/admin/test-manager', '/admin/reports', '/admin/packages', '/admin/messaging', '/admin/notifications', '/admin/audit-log', '/admin/settings'];
const PARENT_PAGES = ['/dashboard/parent', '/dashboard/parent/children', '/dashboard/parent/reports', '/dashboard/parent/weaknesses', '/dashboard/parent/requests', '/dashboard/parent/payments', '/dashboard/parent/messages', '/dashboard/parent/settings'];

// ---------- helpers ----------

async function uiLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder(/student@astra\.com/i).fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /sign in to dashboard/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 });
}

async function newUser(browser: Browser, email: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await uiLogin(page, email, password);
  return { context, page, api: context.request };
}

async function ok<T = unknown>(res: Awaited<ReturnType<APIRequestContext['get']>>, what: string): Promise<T> {
  const body = await res.text();
  expect(res.ok(), `${what} → ${res.status()} ${body.slice(0, 300)}`).toBeTruthy();
  try {
    return JSON.parse(body) as T;
  } catch {
    return body as T;
  }
}

/**
 * Visit every page and collect anything that looks broken: server errors (5xx), failed API
 * calls (4xx other than auth), uncaught page errors, error boundaries and error states.
 */
async function sweep(page: Page, paths: string[]) {
  const problems: string[] = [];
  let current = '';
  const onResponse = (r: { status(): number; url(): string; request(): { method(): string } }) => {
    const u = new URL(r.url());
    if (u.origin !== new URL(page.url() || 'http://x').origin && !u.pathname.startsWith('/api/')) return;
    if (r.status() >= 500) problems.push(`${current}: ${r.request().method()} ${u.pathname} → ${r.status()}`);
    else if (u.pathname.startsWith('/api/') && r.status() >= 400 && ![401, 403, 404, 409].includes(r.status())) {
      problems.push(`${current}: ${r.request().method()} ${u.pathname} → ${r.status()}`);
    }
  };
  const onPageError = (e: Error) => problems.push(`${current}: uncaught ${e.message.slice(0, 160)}`);
  page.on('response', onResponse);
  page.on('pageerror', onPageError);
  for (const path of paths) {
    current = path;
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    if (!res || res.status() >= 400) problems.push(`${path}: HTTP ${res?.status()}`);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    if (page.url().includes('/login')) problems.push(`${path}: bounced to login`);
    const text = await page.locator('body').innerText().catch(() => '');
    for (const bad of ['Something went wrong', 'Internal Error', 'Failed to load', 'Application error', "This page couldn't load"]) {
      if (text.includes(bad)) problems.push(`${path}: shows "${bad}"`);
    }
  }
  page.off('response', onResponse);
  page.off('pageerror', onPageError);
  expect(problems, problems.join('\n')).toEqual([]);
}

// ---------- the journey ----------

test('1. an institute signs itself up and lands on its setup checklist', async ({ page }) => {
  await page.goto('/register-institute');
  await page.fill('#inst', `QA Institute ${RUN}`);
  await page.fill('#name', 'Quinn Admin');
  await page.fill('#phone', '+91 00000 00001');
  await page.fill('#email', mail('admin'));
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'PLAB', exact: true }).click();
  await page.getByRole('button', { name: /create institute/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 60_000 });
  await expect(page.getByText('Get your institute running')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Invite students & parents')).toBeVisible();
  state.creds[mail('admin')] = PASSWORD;
});

test('2. admin sets up branding, batch, staff, question bank, a published test, announcement and material', async ({ browser }) => {
  const { context, api } = await newUser(browser, mail('admin'), PASSWORD);

  await ok(await api.patch('/api/organization', { data: { logoUrl: 'https://placehold.co/96x96.png', contactEmail: mail('office'), contactPhone: '+91 00000 00002' } }), 'branding');
  await ok(await api.post('/api/batches', { data: { name: 'QA Morning Batch' } }), 'batch');
  for (const [role, who] of [['FACULTY', 'faculty'], ['MENTOR', 'mentor']] as const) {
    await ok(await api.post('/api/users', { data: { name: `Qa ${who}`, email: mail(who), password: PASSWORD, role } }), `create ${who}`);
    state.creds[mail(who)] = PASSWORD;
  }

  const letters = ['A', 'B', 'C', 'D', 'E'];
  const subjects = ['Medicine', 'Surgery', 'Paediatrics', 'Psychiatry', 'Obstetrics'];
  const questions = Array.from({ length: 10 }, (_, i) => ({
    text: `QA question ${i + 1}: a patient presents with condition ${i + 1}. What is the next best step?`,
    options: letters.map((id) => ({ id, text: `Management option ${id}` })),
    correctOption: letters[i % 5],
    explanation: `Option ${letters[i % 5]} follows current guidance.`,
    subject: subjects[i % 5],
    topic: `Topic ${(i % 3) + 1}`,
    difficulty: ['EASY', 'MEDIUM', 'HARD'][i % 3],
    marks: 1,
    negativeMarks: 0,
    tags: 'qa',
    examCategory: 'PLAB',
  }));
  const bulk = await ok<{ count: number }>(await api.post('/api/questions/bulk', { data: { questions, sourceFile: 'qa-journey' } }), 'bulk questions');
  expect(bulk.count).toBe(10);

  const list = await ok<unknown>(await api.get('/api/questions?search=QA%20question&limit=50'), 'list questions');
  const rows = (Array.isArray(list) ? list : (list as { questions?: unknown[] }).questions ?? []) as { id: string; text: string; correctOption: string }[];
  const mine = rows.filter((q) => q.text.startsWith('QA question'));
  expect(mine.length).toBe(10);
  state.questionIds = mine.map((q) => q.id);
  state.answerKey = Object.fromEntries(mine.map((q) => [q.id, q.correctOption]));

  const created = await ok<{ id: string }>(await api.post('/api/tests', {
    data: { title: `QA PLAB Mock ${RUN}`, description: 'Journey test', duration: 30, type: 'MOCK', mode: 'CBT', isPublished: true, questionIds: state.questionIds },
  }), 'create test');
  state.testId = created.id;

  await ok(await api.post('/api/announcements', { data: { title: 'Welcome to QA batch', body: 'First mock on Sunday.', audience: 'ALL' } }), 'announcement');
  await ok(await api.post('/api/resources', { data: { title: 'QA formula sheet', url: 'https://example.com/qa-sheet.pdf', category: 'Notes', subject: 'Medicine' } }), 'resource');

  const code = await ok<{ code: string; url: string }>(await api.get('/api/organization/join-code'), 'join code');
  expect(code.url).toContain(`/join/${code.code}`);
  state.joinCode = code.code;
  await context.close();
});

test('3. admin imports students with linked parents from CSV (dry run, then for real)', async ({ browser }) => {
  const { context, api } = await newUser(browser, mail('admin'), PASSWORD);
  const rows = [
    { name: 'Bina Imported', email: mail('studentb'), phone: '+91 00000 00011', batch: 'QA Morning Batch', parentName: 'Parent of Bina', parentEmail: mail('parentb') },
    { name: 'Chetan Imported', email: mail('studentc'), phone: '+91 00000 00012', batch: 'QA Evening Batch' },
  ];
  const dry = await ok<{ summary: { created: number } }>(await api.post('/api/users/import', { data: { rows, dryRun: true } }), 'import dry run');
  expect(dry.summary.created).toBe(2);
  const real = await ok<{ summary: { created: number; parentsCreated: number; newBatches: string[] }; credentials: { email: string; password: string }[] }>(
    await api.post('/api/users/import', { data: { rows } }), 'import');
  expect(real.summary.created).toBe(2);
  expect(real.summary.parentsCreated).toBe(1);
  expect(real.summary.newBatches).toContain('QA Evening Batch');
  for (const c of real.credentials) state.creds[c.email] = c.password;
  expect(state.creds[mail('parentb')]).toBeTruthy();
  await context.close();
});

test('4. a student joins through the WhatsApp link and signs up', async ({ page }) => {
  await page.goto(`/join/${state.joinCode}`);
  await expect(page.getByText(`Joining QA Institute ${RUN}`)).toBeVisible({ timeout: 30_000 });
  await page.getByPlaceholder('Enter full name').fill('Aarav Linkjoin');
  await page.getByPlaceholder('you@example.com').fill(mail('studenta'));
  await page.getByPlaceholder('10-digit mobile number').fill('0000000021');
  await page.getByPlaceholder('At least 8 characters').fill(PASSWORD);
  await page.getByRole('button', { name: /register as student/i }).click();
  await page.waitForURL(/\/student/, { timeout: 60_000 });
  state.creds[mail('studenta')] = PASSWORD;
});

test('5. student takes the mock through the real exam screen and sees the result', async ({ browser }) => {
  const { context, page, api } = await newUser(browser, mail('studenta'), PASSWORD);
  // Skip the first-run onboarding modal if it shows
  await page.goto('/student/mocks');
  const card = page.locator('div', { hasText: `QA PLAB Mock ${RUN}` }).filter({ has: page.getByRole('button', { name: /start/i }) }).last();
  await card.getByRole('button', { name: /start/i }).click();
  await page.waitForURL(/\/exam\//, { timeout: 60_000 });
  state.attemptA = page.url().split('/exam/')[1].split(/[/?#]/)[0];

  await page.getByRole('button', { name: /start cbt exam|resume exam/i }).click();
  // Answer: first 7 correct, 8th wrong, last two skipped
  for (let i = 0; i < 10; i++) {
    // Questions were created with answer letters cycling A–E, so "QA question n" is answered (n-1) % 5
    const statement = page.getByText(/QA question \d+:/).first();
    await expect(statement).toBeVisible();
    const n = Number((await statement.innerText()).match(/QA question (\d+)/)![1]);
    const correct = ['A', 'B', 'C', 'D', 'E'][(n - 1) % 5];
    if (i < 7) await page.getByRole('radio').filter({ hasText: `Management option ${correct}` }).click();
    else if (i === 7) await page.getByRole('radio').filter({ hasText: `Management option ${correct === 'A' ? 'B' : 'A'}` }).click();
    if (i === 2) await page.getByRole('button', { name: 'Bookmark question' }).click();
    if (i < 9) await page.getByRole('button', { name: /save & next|^next$/i }).click();
  }
  await page.getByRole('button', { name: /review & submit|^submit$/i }).first().click();
  await page.getByRole('button', { name: 'Submit now' }).click();
  await page.waitForURL(/\/results/, { timeout: 90_000 });
  await expect(page.getByText(/7\s*\/\s*10|70(\.0)?%/).first()).toBeVisible({ timeout: 30_000 });

  const attempt = await ok<{ status: string; score: number; correctCount: number; incorrectCount: number; unattemptedCount: number }>(
    await api.get(`/api/attempts/${state.attemptA}`), 'attempt A');
  expect(attempt.status).toBe('COMPLETED');
  expect([attempt.correctCount, attempt.incorrectCount, attempt.unattemptedCount]).toEqual([7, 1, 2]);
  await context.close();
});

test('6. imported student signs in with the temporary password and takes the test (API)', async ({ browser }) => {
  const { context, api } = await newUser(browser, mail('studentb'), state.creds[mail('studentb')]);
  const { attemptId } = await ok<{ attemptId: string }>(await api.post('/api/attempts/start', { data: { testId: state.testId } }), 'start B');
  state.attemptB = attemptId;
  const paper = await ok<{ test: { questions: { question: { id: string; correctOption?: string } }[] } }>(await api.get(`/api/attempts/${attemptId}`), 'paper B');
  expect(paper.test.questions.every((q) => q.question.correctOption === undefined)).toBe(true);
  // Bina gets all ten right → she should rank first
  const answers = state.questionIds.map((id) => ({ questionId: id, selectedOption: state.answerKey[id], status: 'ANSWERED', timeSpent: 30 }));
  await ok(await api.put(`/api/attempts/${attemptId}/sync`, { data: { answers: answers.slice(0, 5), timeRemaining: 1500 } }), 'sync B');
  const result = await ok<{ score: number; rank: number }>(await api.post(`/api/attempts/${attemptId}/submit`, { data: { reason: 'MANUAL', answers } }), 'submit B');
  expect(result.score).toBe(10);
  expect(result.rank).toBe(1);
  await context.close();
});

test('7. student features: comparison, review queue, mistakes, bookmarks, question report, retest, data export', async ({ browser }) => {
  const { context, api } = await newUser(browser, mail('studenta'), PASSWORD);
  const cmp = await ok<{ participants: number; leaderboard: { name: string; score: number }[]; you: { score: number } }>(await api.get(`/api/attempts/${state.attemptA}/compare`), 'compare');
  expect(cmp.participants).toBe(2);
  expect(cmp.leaderboard[0].score).toBe(10);
  expect(cmp.you.score).toBe(7);

  // Aarav finished first, so his stored rank started as #1; once Bina's 10/10 is in it must become #2
  await expect
    .poll(async () => (await (await api.get(`/api/attempts/${state.attemptA}`)).json()).rank, { timeout: 60_000, intervals: [3_000] })
    .toBe(2);

  const review = await ok<{ items?: unknown[]; due?: unknown[] } | unknown[]>(await api.get('/api/reviews'), 'review queue');
  expect(JSON.stringify(review)).toContain('QA question');

  const bookmarks = await ok<string[]>(await api.get('/api/bookmarks?ids=1'), 'bookmarks');
  expect(bookmarks.length).toBe(1);

  await ok(await api.post('/api/question-reports', { data: { questionId: state.questionIds[0], reason: 'UNCLEAR', details: 'QA: wording check' } }), 'report question');
  const retest = await ok<{ attemptId?: string; id?: string }>(await api.post('/api/attempts/retest', { data: { parentAttemptId: state.attemptA, mode: 'RETRY_INCORRECT' } }), 'retest');
  expect(retest.attemptId ?? retest.id).toBeTruthy();

  const exported = await api.get('/api/profile/export');
  expect(exported.ok()).toBeTruthy();
  const data = await exported.json();
  expect(data.attempts.length).toBeGreaterThanOrEqual(1);
  await context.close();
});

test('8. every student page loads cleanly', async ({ browser }) => {
  const { context, page } = await newUser(browser, mail('studenta'), PASSWORD);
  await sweep(page, [...STUDENT_PAGES, `/exam/${state.attemptA}/results`]);
  await context.close();
});

test('9. parent (auto-linked by import) sees the child and every parent page loads', async ({ browser }) => {
  const { context, page, api } = await newUser(browser, mail('parentb'), state.creds[mail('parentb')]);
  const overview = await ok<unknown>(await api.get('/api/parent/overview'), 'parent overview');
  expect(JSON.stringify(overview)).toContain('Bina Imported');
  await sweep(page, PARENT_PAGES);
  await context.close();
});

test('10. a parent can self-link a child with email + registered mobile', async ({ browser }) => {
  const parent = await browser.newContext();
  const reg = await parent.request.post('/api/auth/register', { data: { name: 'Parent of Aarav', email: mail('parenta'), password: PASSWORD, role: 'PARENT', joinCode: state.joinCode } });
  await ok(reg, 'parent sign-up');
  await parent.close();
  const { context, api } = await newUser(browser, mail('parenta'), PASSWORD);
  await ok(await api.post('/api/parent/link-student', { data: { studentEmail: mail('studenta'), studentPhone: '0000000021' } }), 'link child');
  expect(JSON.stringify(await (await api.get('/api/parent/overview')).json())).toContain('Aarav Linkjoin');
  await context.close();
});

test('11. mentor reviews students, comments on a result, and every mentor page loads', async ({ browser }) => {
  const { context, page, api } = await newUser(browser, mail('mentor'), PASSWORD);
  const students = await ok<unknown>(await api.get('/api/mentor/students'), 'mentor students');
  expect(JSON.stringify(students)).toContain('Aarav Linkjoin');
  await ok(await api.patch(`/api/attempts/${state.attemptA}/comment`, { data: { comment: 'QA: good attempt, revise Topic 2.' } }), 'mentor comment');
  await sweep(page, MENTOR_PAGES);
  await context.close();
});

test('12. faculty resolves the question report and sees item analysis', async ({ browser }) => {
  const { context, page, api } = await newUser(browser, mail('faculty'), PASSWORD);
  const reports = await ok<unknown>(await api.get('/api/question-reports'), 'question reports');
  const list = (Array.isArray(reports) ? reports : (reports as { reports?: unknown[] }).reports ?? []) as { id: string; status: string }[];
  const open = list.find((r) => r.status === 'OPEN');
  expect(open, JSON.stringify(reports).slice(0, 300)).toBeTruthy();
  await ok(await api.patch(`/api/question-reports/${open!.id}`, { data: { status: 'RESOLVED', resolution: 'QA: wording clarified' } }), 'resolve report');
  const analysis = await ok<unknown>(await api.get(`/api/tests/${state.testId}/analysis`), 'item analysis');
  expect(JSON.stringify(analysis)).toContain('QA question');
  await page.goto(`/mentor/test-manager/${state.testId}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('body')).not.toContainText('Something went wrong');
  await context.close();
});

test('13. admin: checklist progress, audit trail, analytics, and every admin page loads', async ({ browser }) => {
  const { context, page, api } = await newUser(browser, mail('admin'), PASSWORD);
  const overview = await ok<{ setup: { id: string; done: boolean }[]; counts: { students: number; attempts: number } }>(await api.get('/api/admin/overview'), 'overview');
  const done = Object.fromEntries(overview.setup.map((s) => [s.id, s.done]));
  expect(done).toMatchObject({ branding: true, batches: true, students: true, questions: true, test: true, firstResult: true, messaging: false });
  expect(overview.counts.students).toBe(3);
  expect(overview.counts.attempts).toBe(2);

  const audit = await ok<{ items: { action: string }[] }>(await api.get('/api/admin/audit'), 'audit log');
  const actions = new Set(audit.items.map((i) => i.action));
  for (const a of ['organization.update', 'batch.create', 'user.create', 'question.import', 'test.create', 'user.import', 'announcement.create', 'resource.create']) {
    expect(actions, `missing ${a}`).toContain(a);
  }
  await sweep(page, ADMIN_PAGES);
  await context.close();
});

test('14. data rights: a student downloads their data and deletes their account', async ({ browser }) => {
  const { context, api } = await newUser(browser, mail('studentc'), state.creds[mail('studentc')]);
  const exported = await api.get('/api/profile/export');
  expect(exported.ok()).toBeTruthy();
  expect((await exported.json()).profile.email).toBe(mail('studentc'));
  await ok(await api.delete('/api/profile', { data: { password: state.creds[mail('studentc')] } }), 'delete account');
  await context.close();

  const gone = await browser.newContext();
  const page = await gone.newPage();
  await page.goto('/login');
  await page.getByPlaceholder(/student@astra\.com/i).fill(mail('studentc'));
  await page.getByPlaceholder('••••••••').fill(state.creds[mail('studentc')]);
  await page.getByRole('button', { name: /sign in to dashboard/i }).click();
  await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 30_000 });
  await gone.close();
});

test('15. access control: students and parents cannot reach staff data', async ({ browser }) => {
  const { context, api } = await newUser(browser, mail('studenta'), PASSWORD);
  for (const p of ['/api/admin/overview', '/api/admin/audit', '/api/users', '/api/organization/join-code', `/api/tests/${state.testId}/analysis`]) {
    expect([401, 403], p).toContain((await api.get(p)).status());
  }
  // Another student's attempt is not visible
  expect([403, 404]).toContain((await api.get(`/api/attempts/${state.attemptB}`)).status());
  await context.close();
});
