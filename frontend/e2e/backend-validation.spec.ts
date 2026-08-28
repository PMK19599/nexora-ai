import { test, expect } from '@playwright/test';

test.describe('Backend API Validation Constraints', () => {
  const URL = 'https://backend-kappa-fawn-15.onrender.com';
  // We use the dev endpoint if running locally, otherwise we'd use the provided one.
  // Actually, since we want to test locally against our code changes, we need to know the local backend URL or wait until deployed.
  // Since the user asked for tests added, let's write them against the local API, or just assume the standard setup.
  const API_URL = process.env.API_URL || 'http://localhost:5000/api';
  let csrfToken = '';
  let cookieHeader = '';

  test.beforeAll(async ({ request }) => {
    const email = `testuser_${Date.now()}@example.com`;
    const password = 'password123';
    try {
      let res = await request.post(`${API_URL}/auth/register`, {
        data: { name: 'Test User', email, password }
      });
      if (!res.ok()) {
        res = await request.post(`${API_URL}/auth/login`, {
          data: { email: 'nexora.beta.test@gmail.com', password: 'vhuewcy6324rt267ygfbcyg3' }
        });
      }
      if (!res.ok()) {
        console.log('Failed to register or login. Tests might fail.');
      } else {
        const json = await res.json();
        csrfToken = json.csrfToken;
        const cookies = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie').map(h => h.value.split(';')[0]);
        cookieHeader = cookies.join('; ');
      }
    } catch (e) {
      console.log('Could not authenticate for API tests. Tests might fail.');
    }
  });

  test('POST /career/analyze validation constraints', async ({ request }) => {
    const headers = { 'x-csrf-token': csrfToken, Cookie: cookieHeader };
    // 1. Empty payload
    let res = await request.post(`${API_URL}/career/analyze`, { headers, data: {} });
    expect(res.status()).toBe(400);

    // 2. Missing individual required field (dreamJob)
    res = await request.post(`${API_URL}/career/analyze`, { headers, data: { company: 'Google' } });
    expect(res.status()).toBe(400);

    // 3. Null values
    res = await request.post(`${API_URL}/career/analyze`, { headers, data: { dreamJob: null, company: null } });
    expect(res.status()).toBe(400);

    // 4. Numbers where strings are expected
    res = await request.post(`${API_URL}/career/analyze`, { headers, data: { dreamJob: 123, company: 456 } });
    expect(res.status()).toBe(400);
  });

  test('POST /tutors/request validation constraints', async ({ request }) => {
    const headers = { 'x-csrf-token': csrfToken, Cookie: cookieHeader };
    // 1. Empty payload
    let res = await request.post(`${API_URL}/tutors/request`, { headers, data: {} });
    expect(res.status()).toBe(400);

    // 2. Missing individual required field
    res = await request.post(`${API_URL}/tutors/request`, { headers, data: { subject: 'Math', scheduledAt: 'tomorrow', duration: 60 } });
    expect(res.status()).toBe(400);

    // 3. Null values
    res = await request.post(`${API_URL}/tutors/request`, { headers, data: { tutorId: null, subject: 'Math', scheduledAt: 'tomorrow', duration: 60 } });
    expect(res.status()).toBe(400);

    // 4. Numbers where strings are expected
    res = await request.post(`${API_URL}/tutors/request`, { headers, data: { tutorId: 123, subject: 456, scheduledAt: 'tomorrow', duration: 60 } });
    expect(res.status()).toBe(400);
  });

  test('POST /games/submit validation constraints', async ({ request }) => {
    const headers = { 'x-csrf-token': csrfToken, Cookie: cookieHeader };
    // 1. Empty payload
    let res = await request.post(`${API_URL}/games/submit`, { headers, data: {} });
    expect(res.status()).toBe(400);

    // 2. Missing individual required field
    res = await request.post(`${API_URL}/games/submit`, { headers, data: { answers: [] } });
    expect(res.status()).toBe(400);

    // 3. Strings where arrays are expected
    res = await request.post(`${API_URL}/games/submit`, { headers, data: { gameId: 'abc', answers: 'not-an-array' } });
    expect(res.status()).toBe(400);

    // 4. Null values
    res = await request.post(`${API_URL}/games/submit`, { headers, data: { gameId: null, answers: null } });
    expect(res.status()).toBe(400);
  });
});
