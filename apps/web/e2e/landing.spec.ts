import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('shows hero section with title and CTA buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Burn Subtitles');
    await expect(page.locator('text=Get Started Free')).toBeVisible();
    await expect(page.locator('text=View Pricing')).toBeVisible();
  });

  test('shows feature cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Client-Side Rendering')).toBeVisible();
  });

  test('navigates to pricing page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Pricing');
    await expect(page).toHaveURL('/pricing');
    await expect(page.locator('h1')).toContainText('Pricing');
  });

  test('pricing page shows 3 tiers', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: 'Free' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise' })).toBeVisible();
  });

  test('navigates to login via Get Started', async ({ page }) => {
    await page.goto('/');
    // "Get Started Free" links to /dashboard which redirects unauthenticated to /login
    await page.locator('text=Get Started Free').click();
    await expect(page).toHaveURL(/\/(login|dashboard)/);
  });

  test('visual regression: hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('landing-hero.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('visual regression: pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveScreenshot('pricing-page.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

});
