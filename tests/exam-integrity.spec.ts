import { test, expect, type APIRequestContext } from '@playwright/test';

// API-level checks for the exam write path: autosave, submit races, late writes and throttling.
// Uses the demo accounts and tests created by `prisma db seed`.

async function apiSignIn(request: APIRequestContext, email: string, password = 'password123') {
  const { csrfToken } = await (await request.get('/api/auth/csrf')).json();
  const res = await request.post('/api/auth/callback/credentials', {
    form: { csrfToken, email, password, json: 'true' },
    maxRedirects: 0,
  });
  return res;
}

test.describe('Exam integrity (API)', () => {
  test('autosave, concurrent submits and late writes', async ({ request }) => {
    await apiSignIn(request, 'student@astra.com');

    const start = await request.post('/api/attempts/start', { data: { testId: 'seed-test-plab-2' } });
    expect(start.ok()).toBeTruthy();
    const { attemptId } = await start.json();

    const attempt = await (await request.get(`/api/attempts/${attemptId}`)).json();
    const questions: { question: { id: string; correctOption?: string } }[] = attempt.test.questions;
    expect(questions.length).toBeGreaterThan(1);
    // Answers must never reach the browser while the exam is running
    for (const q of questions) expect(q.question.correctOption).toBeUndefined();

    const [first, second] = questions.map((q) => q.question.id);
    const answer = (questionId: string, selectedOption: string) => ({ questionId, selectedOption, status: 'ANSWERED', timeSpent: 12 });

    // Autosave writes only questions from this paper
    const sync = await request.put(`/api/attempts/${attemptId}/sync`, {
      data: { answers: [answer(first, 'A'), answer('not-a-question-in-this-test', 'B')], timeRemaining: 400 },
    });
    expect(sync.ok()).toBeTruthy();

    // Two submits at once (double click, retry after a timeout): graded exactly once, same result
    const body = { reason: 'MANUAL', answers: [answer(first, 'B'), answer(second, 'B')] };
    const [s1, s2] = await Promise.all([
      request.post(`/api/attempts/${attemptId}/submit`, { data: body }),
      request.post(`/api/attempts/${attemptId}/submit`, { data: body }),
    ]);
    expect(s1.ok()).toBeTruthy();
    expect(s2.ok()).toBeTruthy();
    const [r1, r2] = [await s1.json(), await s2.json()];
    expect(r1.status).toBe('COMPLETED');
    expect(r2.status).toBe('COMPLETED');
    expect(r1.score).toBe(r2.score);
    expect(r1.attemptedCount).toBe(2);

    // A late autosave can't change a graded attempt
    const late = await request.put(`/api/attempts/${attemptId}/sync`, {
      data: { answers: [answer(second, 'C')], timeRemaining: 100 },
    });
    expect(late.status()).toBe(409);

    // The final answers from the submit body are what got graded
    const graded = await (await request.get(`/api/attempts/${attemptId}`)).json();
    const saved = Object.fromEntries(graded.answers.map((a: { questionId: string; selectedOpt: string }) => [a.questionId, a.selectedOpt]));
    expect(saved[first]).toBe('B');
    expect(saved[second]).toBe('B');
  });

  test('repeated failed sign-ins are throttled', async ({ request }) => {
    const email = `throttle-${Date.now()}@example.test`;
    let last = '';
    for (let i = 0; i < 11; i++) {
      const res = await apiSignIn(request, email, 'wrong-password');
      last = JSON.stringify(await res.json().catch(() => ({})));
    }
    expect(last).toContain('TooManyAttempts');
  });

  test('health check and security headers', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expect((await res.json()).db).toBe('ok');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['x-frame-options']).toBe('DENY');
    expect(res.headers()['x-powered-by']).toBeUndefined();
  });
});
