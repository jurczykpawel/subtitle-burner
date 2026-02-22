import { test, expect } from '@playwright/test';


// These tests run WITHOUT auth (no storageState) - they test the auth pages themselves
test.use({ storageState: { cookies: [], origins: [] } });

const UNIQUE_EMAIL = `e2e-auth-${Date.now()}@test.local`;
const TEST_PASSWORD = 'testpass123';

test.describe('Auth pages', () => {
  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
  });

  test('signup page has email and password fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Create Account');
  });

  test('forgot password page has email field', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login page links to signup and forgot password', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Create account')).toBeVisible();
    await expect(page.getByText('Forgot password?')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('bad@email.com');
    await page.getByLabel('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Sign In' }).click();
    // Wait for button to show "Signing in..." then error to appear
    await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 30000 });
  });

  test('signup password field requires minimum 6 characters', async ({ page }) => {
    await page.goto('/signup');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('minlength', '6');
  });

  test('protected route redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('full signup flow: register → login → dashboard', async ({ page, request }) => {
    // Register via API (reliable)
    const registerRes = await request.post('/api/auth/register', {
      data: { email: UNIQUE_EMAIL, password: TEST_PASSWORD },
    });
    expect(registerRes.status()).toBe(201);

    // Login via API (same approach as auth.setup.ts)
    await page.goto('/api/auth/signin');
    await page.waitForLoadState('domcontentloaded');

    const csrfResponse = await page.request.get('/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;

    const loginRes = await page.request.post('/api/auth/callback/credentials', {
      form: {
        email: UNIQUE_EMAIL,
        password: TEST_PASSWORD,
        csrfToken,
        callbackUrl: 'http://localhost:3001/dashboard',
        redirect: 'false',
        json: 'true',
      },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Navigate to dashboard - should work now with session
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Projects', { timeout: 10000 });
  });

  test('visual regression: login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

});
