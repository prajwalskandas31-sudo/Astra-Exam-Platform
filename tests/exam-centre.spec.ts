import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';

/*
 * Anti-copying papers, Exam Centre mode and offline exams, end to end, in a fresh institute:
 *  1. shuffled papers: same questions, different order per student, graded identically
 *  2. student-ID sign-in, seat plan with neighbours on different sets, start code
 *  3. an offline exam in a real browser with the network switched off, uploaded afterwards
 *  4. the USB fallback (staff upload an exported answer file) and "collect unfinished papers"
 *
 * Safe on production: .test accounts, no messaging provider.
 */

test.describe.configure({ mode: 'serial', timeout: 240_000 });

const RUN = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12) + Math.floor(Math.random() * 1000);
const PASSWORD = 'QaPass-2026!';
const mail = (who: string) => `${who}.${RUN}@astra-qa.test`;
const SID = (n: number) => `QA${RUN.slice(-6)}-${String(n).padStart(3, '0')}`;

const state: {
  questionIds: string[];
  answerKey: Record<string, string>;
  students: { email: string; password: string; code: string }[];
  shuffledTest?: string;
  centreTest?: string;
  startCode?: string;
} = { questionIds: [], answerKey: {}, students: [] };

async function ok<T = any>(res: Awaited<ReturnType<APIRequestContext['get']>>, what: string): Promise<T> {
  const body = await res.text();
  expect(res.ok(), `${what} → ${res.status()} ${body.slice(0, 300)}`).toBeTruthy();
  return JSON.parse(body || 'null') as T;
}

async function apiLogin(browser: Browser, email: string, password: string, institute = '') {
  const context = await browser.newContext();
  const api = context.request;
  const { csrfToken } = await (await api.get('/api/auth/csrf')).json();
  await api.post('/api/auth/callback/credentials', { form: { csrfToken, email, password, institute, json: 'true' } });
  const session = await (await api.get('/api/auth/session')).json();
  expect(session?.user?.id, `login ${email}`).toBeTruthy();
  return { context, api };
}

/** Pick the correct option for each question by its ID (whatever letter it is shown under). */
const correctAnswers = (questions: { question: { id: string } }[]) =>
  questions.map((tq) => ({ questionId: tq.question.id, selectedOption: state.answerKey[tq.question.id], status: 'ANSWERED', timeSpent: 5 }));

test('1. institute with Exam Centre + offline modes, a question bank and students with IDs', async ({ browser, playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL });
  await ok(await anon.post('/api/auth/register-institute', {
    data: { instituteName: `QA Centre ${RUN}`, name: 'Centre Admin', email: mail('admin'), phone: '+91 00000 00001', password: PASSWORD, examCategories: ['PLAB'] },
  }), 'register institute');
  await anon.dispose();

  const { context, api } = await apiLogin(browser, mail('admin'), PASSWORD);
  // Off by default; the toggle switches both on (offline needs centre mode)
  let modes = await ok(await api.get('/api/organization/exam-modes'), 'modes');
  expect(modes).toEqual({ examCentreEnabled: false, offlineExamsEnabled: false });
  await ok(await api.patch('/api/organization', { data: { offlineExamsEnabled: true } }), 'enable offline');
  modes = await ok(await api.get('/api/organization/exam-modes'), 'modes');
  expect(modes).toEqual({ examCentreEnabled: true, offlineExamsEnabled: true });

  const letters = ['A', 'B', 'C', 'D'];
  const questions = Array.from({ length: 12 }, (_, i) => ({
    text: `Centre question ${i + 1} (${RUN})`,
    options: letters.map((id) => ({ id, text: `Answer ${i + 1}${id}` })),
    correctOption: letters[(i * 3) % 4],
    subject: i < 6 ? 'Medicine' : 'Surgery',
    topic: 'Centre', difficulty: 'MEDIUM', marks: 1, negativeMarks: 0, tags: 'qa', examCategory: 'PLAB',
  }));
  await ok(await api.post('/api/questions/bulk', { data: { questions, sourceFile: 'qa-centre' } }), 'questions');
  const list = await ok<any>(await api.get(`/api/questions?search=${encodeURIComponent(RUN)}&limit=50`), 'list');
  const rows = (Array.isArray(list) ? list : list.questions) as { id: string; correctOption: string }[];
  expect(rows.length).toBe(12);
  state.questionIds = rows.map((q) => q.id);
  state.answerKey = Object.fromEntries(rows.map((q) => [q.id, q.correctOption]));

  const imported = await ok<any>(await api.post('/api/users/import', {
    data: { rows: [1, 2, 3, 4].map((n) => ({ studentCode: SID(n).toLowerCase(), name: `Centre Student ${n}`, email: mail(`s${n}`) })) },
  }), 'import');
  expect(imported.summary.created).toBe(4);
  state.students = [1, 2, 3, 4].map((n) => ({ email: mail(`s${n}`), code: SID(n), password: imported.credentials.find((c: any) => c.email === mail(`s${n}`)).password }));

  // A duplicate student ID is refused
  const dup = await ok<any>(await api.post('/api/users/import', { data: { rows: [{ studentCode: SID(1), name: 'Dup', email: mail('dup') }], dryRun: true } }), 'dup');
  expect(dup.results[0].status).toBe('error');
  await context.close();
});

test('2. shuffled paper: different order per student, original IDs graded correctly, start code hidden', async ({ browser }) => {
  const { context, api } = await apiLogin(browser, mail('admin'), PASSWORD);
  const t = await ok(await api.post('/api/tests', {
    data: { title: `Shuffled ${RUN}`, duration: 30, type: 'MOCK', mode: 'CBT', isPublished: true, questionIds: state.questionIds, shuffleMode: 'PER_STUDENT', shuffleOptions: true },
  }), 'create shuffled test');
  state.shuffledTest = t.id;
  expect(t.shuffleMode).toBe('PER_STUDENT');
  await context.close();

  const papers: string[][] = [];
  for (const s of state.students.slice(0, 2)) {
    const { context: c, api: sApi } = await apiLogin(browser, s.email, s.password);
    const start = await ok(await sApi.post('/api/attempts/start', { data: { testId: t.id } }), 'start');
    const attempt = await ok(await sApi.get(`/api/attempts/${start.attemptId}`), 'attempt');
    expect(JSON.stringify(attempt)).not.toContain('startCode');
    const qs = attempt.test.questions as { question: { id: string; options: string; correctOption?: string } }[];
    expect(qs.every((q) => q.question.correctOption === undefined)).toBe(true);
    papers.push(qs.map((q) => q.question.id));
    // Options carry positional labels A-D over their original IDs
    const opts = JSON.parse(qs[0].question.options);
    expect(opts.map((o: any) => o.label)).toEqual(['A', 'B', 'C', 'D']);
    // Sections stay together: all Medicine before Surgery
    const subjects = qs.map((q: any) => q.section);
    expect(subjects.lastIndexOf('Medicine')).toBeLessThan(subjects.indexOf('Surgery'));

    const graded = await ok(await sApi.post(`/api/attempts/${start.attemptId}/submit`, { data: { answers: correctAnswers(qs) } }), 'submit');
    expect(graded.score).toBe(12);
    await c.close();
  }
  expect(papers[0]).not.toEqual(papers[1]);
  expect([...papers[0]].sort()).toEqual([...papers[1]].sort());
});

test('3. centre exam: seat plan, sets, start code gate, student-ID sign-in', async ({ browser }) => {
  const { context, api } = await apiLogin(browser, mail('admin'), PASSWORD);
  const t = await ok(await api.post('/api/tests', {
    data: { title: `Centre ${RUN}`, duration: 20, type: 'MOCK', mode: 'CBT', isPublished: true, questionIds: state.questionIds, shuffleMode: 'SETS', setCount: 4, centreExam: true, allowOffline: true },
  }), 'create centre test');
  state.centreTest = t.id;
  expect(t.centreExam).toBe(true);
  expect(t.allowOffline).toBe(true);
  expect(t.startCode).toBeUndefined(); // never serialised, even to staff, except by the console

  await ok(await api.post(`/api/tests/${t.id}/centre`, { data: { action: 'rooms', rooms: [{ name: 'Lab 1', rows: 2, cols: 2 }] } }), 'rooms');
  const seated = await ok(await api.post(`/api/tests/${t.id}/centre`, { data: { action: 'autoSeat' } }), 'seat');
  expect(seated.seated).toBe(4);
  const centre = await ok(await api.get(`/api/tests/${t.id}/centre`), 'console');
  state.startCode = centre.test.startCode;
  expect(state.startCode).toMatch(/^[A-Z2-9]{8}$/);
  // 2x2 room with 4 sets: every seat a different set
  const sets = centre.students.map((s: any) => s.seat.set);
  expect(new Set(sets).size).toBe(4);
  expect(centre.students.map((s: any) => s.studentCode)).toEqual([1, 2, 3, 4].map(SID));
  await context.close();

  // Student signs in with their student ID (not email)
  const s1 = state.students[0];
  const { context: c, api: sApi } = await apiLogin(browser, s1.code.toLowerCase(), s1.password);
  const noCode = await sApi.post('/api/attempts/start', { data: { testId: t.id } });
  expect(noCode.status()).toBe(403);
  expect((await noCode.json()).centre).toBe(true);
  const wrong = await sApi.post('/api/attempts/start', { data: { testId: t.id, startCode: 'WRONG234' } });
  expect(wrong.status()).toBe(403);
  const lobby = await ok(await sApi.get(`/api/offline/${t.id}?paper=1`), 'lobby');
  expect(lobby.student.studentCode).toBe(s1.code);
  expect(lobby.seat.label).toContain('Lab 1');
  expect(lobby.setCode).toMatch(/^[A-D]$/);
  expect(lobby.paper.data.data).toBeTruthy();
  expect(JSON.stringify(lobby)).not.toContain('Centre question'); // the paper is encrypted
  expect(JSON.stringify(lobby)).not.toContain(state.startCode!);
  await c.close();
});

async function loginWithStudentId(page: Page, code: string, password: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: /use your student id/i }).click();
  await page.getByLabel('Student ID').fill(code);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /sign in to dashboard/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 });
}

test('4. offline exam in the browser: network off at the start, answers upload when it is back', async ({ browser }) => {
  const s1 = state.students[0];
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginWithStudentId(page, s1.code, s1.password);

  await page.goto(`/exam/centre/${state.centreTest}`);
  await expect(page.getByTestId('lobby-student-id')).toContainText(s1.code);
  await expect(page.getByTestId('paper-status')).toContainText('ready to work offline', { timeout: 90_000 });

  // The centre's internet goes down before the start
  await context.setOffline(true);
  await page.getByLabel('Start code').fill('WRONG234');
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByText(/start code isn't right/i)).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('Start code').fill(state.startCode!.toLowerCase());
  await page.getByRole('button', { name: 'Start exam' }).click();

  await expect(page.getByTestId('paper-set')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /start cbt exam|resume exam/i }).click();

  // Answer every question by clicking the option whose text is the correct answer
  for (let i = 0; i < 12; i++) {
    const text = await page.locator('h2').first().innerText();
    const n = Number(/Centre question (\d+)/.exec(text)![1]);
    const correct = ['A', 'B', 'C', 'D'][((n - 1) * 3) % 4];
    await page.getByRole('radio', { name: new RegExp(`Answer ${n}${correct}$`) }).click();
    if (i < 11) await page.getByRole('button', { name: /save & next|next/i }).last().click();
  }

  // Reload while offline: the page and the answers survive (service worker + device storage)
  await page.waitForTimeout(600); // answers reach the device within 250 ms of a click
  await page.reload();
  await expect(page.getByTestId('paper-set')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /resume exam/i }).click();
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await expect(page.getByText('Answered', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Submit now' }).click();
  await expect(page.getByTestId('offline-done')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('upload-pending')).toBeVisible();

  // Internet is back: the sheet uploads by itself and gets graded in the background queue
  await context.setOffline(false);
  await expect(page.getByRole('button', { name: 'View result' })).toBeVisible({ timeout: 120_000 });
  await page.getByRole('button', { name: 'View result' }).click();
  await page.waitForURL(/\/exam\/.+\/results/, { timeout: 60_000 });
  await expect(page.getByText('12', { exact: false }).first()).toBeVisible();
  await context.close();

  const { context: c, api } = await apiLogin(browser, mail('admin'), PASSWORD);
  const centre = await ok(await api.get(`/api/tests/${state.centreTest}/centre`), 'console');
  const row = centre.students.find((s: any) => s.studentCode === s1.code);
  expect(row.state).toBe('SUBMITTED');
  expect(row.score).toBe(12);
  await c.close();
});

test('5. USB fallback and collecting unfinished papers', async ({ browser }) => {
  // Student 2: a device that never got online; the invigilator uploads its answer file
  const s2 = state.students[1];
  const { context: c2, api: s2Api } = await apiLogin(browser, s2.email, s2.password);
  const lobby2 = await ok(await s2Api.get(`/api/offline/${state.centreTest}?paper=1`), 'lobby 2');
  const sheet = { ticket: lobby2.paper.ticket, startedAt: Date.now() - 10 * 60_000, submittedAt: Date.now(), reason: 'MANUAL', violations: 0, deviceId: 'DEV-USB', answers: state.questionIds.slice(0, 6).map((id) => ({ questionId: id, selectedOption: state.answerKey[id], status: 'ANSWERED', timeSpent: 3 })) };
  await c2.close();

  // Student 3: started (checkpoint sent), then the computer died
  const s3 = state.students[2];
  const { context: c3, api: s3Api } = await apiLogin(browser, s3.email, s3.password);
  const lobby3 = await ok(await s3Api.get(`/api/offline/${state.centreTest}?paper=1`), 'lobby 3');
  await ok(await s3Api.post('/api/offline/checkpoint', { data: { ticket: lobby3.paper.ticket, startedAt: Date.now() - 5 * 60_000, violations: 1, answers: state.questionIds.slice(0, 3).map((id) => ({ questionId: id, selectedOption: state.answerKey[id], status: 'ANSWERED' })) } }), 'checkpoint');
  // Another student can't upload s3's sheet
  const forged = await s2Api.post('/api/offline/submissions', { data: { ...sheet, ticket: lobby3.paper.ticket } }).catch(() => null);
  if (forged) expect(forged.status()).not.toBe(202);
  // On another computer the student sees their checkpoint to resume from
  const again = await ok(await s3Api.get(`/api/offline/${state.centreTest}`), 'lobby 3 again');
  expect(again.checkpoint.answers.length).toBe(3);
  await c3.close();

  const { context, api } = await apiLogin(browser, mail('admin'), PASSWORD);
  const live = await ok(await api.get(`/api/tests/${state.centreTest}/centre`), 'console');
  expect(live.students.find((s: any) => s.studentCode === s3.code).state).toBe('WRITING');

  const up = await api.post('/api/offline/submissions', { data: { sheets: [sheet] } });
  expect(up.status()).toBe(202);
  // Re-uploading the same file is harmless
  const again2 = await ok(await api.post('/api/offline/submissions', { data: { sheets: [sheet] } }), 're-upload');
  expect(['duplicate', 'already_submitted']).toContain(again2.results[0].status);

  const collected = await ok(await api.post(`/api/tests/${state.centreTest}/centre`, { data: { action: 'collect' } }), 'collect');
  expect(collected.collected).toBe(1);
  await ok(await api.post(`/api/tests/${state.centreTest}/centre`, { data: { action: 'process' } }), 'process');

  await expect.poll(async () => {
    const c = await ok(await api.get(`/api/tests/${state.centreTest}/centre`), 'console');
    const by = (code: string) => c.students.find((s: any) => s.studentCode === code);
    return [by(s2.code).state, by(s2.code).score, by(s3.code).state, by(s3.code).score, by(s3.code).violations];
  }, { timeout: 90_000 }).toEqual(['SUBMITTED', 6, 'SUBMITTED', 3, 1]);

  // Staff pages render
  const page = await context.newPage();
  await page.goto(`/admin/test-manager/${state.centreTest}/centre`);
  await expect(page.getByTestId('start-code')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('centre-row')).toHaveCount(4);
  await context.close();
});
