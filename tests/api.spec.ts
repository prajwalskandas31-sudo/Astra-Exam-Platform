import { test, expect } from '@playwright/test';

test('api endpoints return 401 when unauthenticated', async ({ request }) => {
  const response = await request.get('/api/attempts/history');
  expect(response.status()).toBe(401);
});

test('upload pdf endpoint is protected', async ({ request }) => {
  const response = await request.post('/api/questions/upload-pdf', {
    data: { test: 'data' }
  });
  // Next-auth typically returns 401 for protected API routes
  expect([401, 403]).toContain(response.status());
});
