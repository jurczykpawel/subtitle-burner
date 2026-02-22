import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '..', '.auth', 'user.json');

const TEST_EMAIL = `e2e-${Date.now()}@test.local`;
const TEST_PASSWORD = 'testpass123';

setup('authenticate', async ({ page }) => {
  // 1. Register a fresh test user
  const registerRes = await page.request.post('/api/auth/register', {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  expect(registerRes.status()).toBe(201);

  // 2. Navigate to login page to get CSRF cookie set by NextAuth
  await page.goto('/api/auth/signin');
  await page.waitForLoadState('domcontentloaded');

  // 3. Get CSRF token from the page's cookie or from the API
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;
  expect(csrfToken).toBeTruthy();

  // 4. Submit credentials via NextAuth callback (uses page context cookies)
  const loginRes = await page.request.post('/api/auth/callback/credentials', {
    form: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      csrfToken,
      callbackUrl: 'http://localhost:3001/dashboard',
      redirect: 'false',
      json: 'true',
    },
  });

  // NextAuth returns 200 with json on success with redirect:false
  expect(loginRes.ok()).toBeTruthy();

  // 5. Verify we're authenticated by navigating to dashboard
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Projects', { timeout: 10000 });

  // 6. Save signed-in state
  await page.context().storageState({ path: authFile });
});
