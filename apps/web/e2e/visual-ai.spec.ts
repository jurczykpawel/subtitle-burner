import { test, expect } from '@playwright/test';
import { analyzeScreenshot, isAIAvailable } from './helpers/ai-screenshot';

/**
 * AI-powered visual screenshot analysis tests.
 *
 * These tests use a vision model via OpenRouter to analyze page screenshots
 * and verify that the UI contains the expected visual elements. They are
 * skipped automatically when OPENROUTER_API_KEY is not set or rate limited.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Public pages (no auth required)
// ──────────────────────────────────────────────────────────────────────────────
test.describe.configure({ mode: 'serial' });

test.describe('AI Visual Analysis - Public Pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async () => {
    test.skip(!isAIAvailable(), 'OPENROUTER_API_KEY not set - skipping AI visual tests');
    test.setTimeout(120000);
  });

  test('landing page has headline, CTAs, and feature cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('h1');

    const analysis = await analyzeScreenshot(
      page,
      'Analyze this landing page. Does it have: 1) A clear headline about subtitles/video, 2) Call-to-action buttons, 3) Feature cards or descriptions? Answer with YES or NO for each point.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    expect(analysis).toBeTruthy();
    console.log('[AI] Landing page analysis:', analysis);
    expect(analysis!.toLowerCase()).toContain('yes');
  });

  test('pricing page shows multiple tiers with prices', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForSelector('h1');

    const analysis = await analyzeScreenshot(
      page,
      'Does this pricing page show multiple pricing tiers/plans? Are there at least 2 different plan options with prices? Answer YES or NO.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    expect(analysis).toBeTruthy();
    console.log('[AI] Pricing page analysis:', analysis);
    expect(analysis!.toLowerCase()).toContain('yes');
  });

  test('login form has email, password, and submit button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form');

    const analysis = await analyzeScreenshot(
      page,
      'Is this a login/sign-in form? Does it have an email input field, a password input field, and a submit button? Answer YES or NO.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    expect(analysis).toBeTruthy();
    console.log('[AI] Login form analysis:', analysis);
    expect(analysis!.toLowerCase()).toContain('yes');
  });

  test('pricing page has exactly 3 tiers', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForSelector('h1');

    const analysis = await analyzeScreenshot(
      page,
      'How many pricing tiers/plans are shown on this page? Answer with just the number.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    expect(analysis).toBeTruthy();
    console.log('[AI] Pricing tier count:', analysis);
    expect(analysis!).toContain('3');
  });

  test('signup page has email, password, and create account button', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForSelector('form');

    const analysis = await analyzeScreenshot(
      page,
      'Is this a signup/registration form? Does it have an email input field, a password input field, and a "Create Account" or similar submit button? Answer YES or NO.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    expect(analysis).toBeTruthy();
    console.log('[AI] Signup form analysis:', analysis);
    expect(analysis!.toLowerCase()).toContain('yes');
  });

  test('accessibility check on landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('h1');

    const analysis = await analyzeScreenshot(
      page,
      'Looking at this page from an accessibility perspective: Is the text readable? Is there sufficient contrast between text and background? Are interactive elements (buttons, links) clearly distinguishable? Rate from 1-10 and explain briefly.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    console.log('[AI] Accessibility check:', analysis);
    expect(analysis).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Authenticated pages (storageState from Playwright config)
// ──────────────────────────────────────────────────────────────────────────────
test.describe('AI Visual Analysis - Authenticated Pages', () => {
  test.beforeEach(async () => {
    test.skip(!isAIAvailable(), 'OPENROUTER_API_KEY not set - skipping AI visual tests');
    test.setTimeout(120000);
  });

  test('editor has video player, toolbar, sidebar, and timeline', async ({ page }) => {
    // Upload a video first to have an editor page to test
    const fs = await import('fs');
    const path = await import('path');
    const videoPath = path.join(__dirname, 'fixtures', 'test-video.mp4');
    const videoBuffer = fs.readFileSync(videoPath);

    const response = await page.request.post('/api/videos', {
      multipart: {
        video: { name: 'test-video.mp4', mimeType: 'video/mp4', buffer: videoBuffer },
        duration: '2',
        width: '320',
        height: '240',
      },
    });
    test.skip(!response.ok(), 'Video upload failed (storage not configured)');
    const data = await response.json();

    await page.goto(`/dashboard/${data.id}`);
    await expect(page.locator('text=Subtitle Burner')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    const analysis = await analyzeScreenshot(
      page,
      'Does this editor have a video player, toolbar with buttons, a sidebar with tabs, and a timeline at the bottom? Answer YES or NO with brief explanation.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    expect(analysis).toBeTruthy();
    console.log('[AI] Editor analysis:', analysis);
    expect(analysis!.toLowerCase()).toContain('yes');
  });

  test('upload page has drop zone and file input', async ({ page }) => {
    await page.goto('/dashboard/new');
    await page.waitForSelector('input[type="file"]');

    const analysis = await analyzeScreenshot(
      page,
      'Is this a file upload page? Does it have a drag-and-drop zone or area for uploading a video file? Answer YES or NO.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    expect(analysis).toBeTruthy();
    console.log('[AI] Upload page analysis:', analysis);
    expect(analysis!.toLowerCase()).toContain('yes');
  });

  test('editor shows subtitles overlaid on video', async ({ page }) => {
    const fs = await import('fs');
    const path = await import('path');
    const videoPath = path.join(__dirname, 'fixtures', 'test-video.mp4');
    const videoBuffer = fs.readFileSync(videoPath);

    const response = await page.request.post('/api/videos', {
      multipart: {
        video: { name: 'test-video.mp4', mimeType: 'video/mp4', buffer: videoBuffer },
        duration: '2',
        width: '320',
        height: '240',
      },
    });
    test.skip(!response.ok(), 'Video upload failed (storage not configured)');
    const data = await response.json();

    await page.goto(`/dashboard/${data.id}`);
    await expect(page.locator('text=Subtitle Burner')).toBeVisible({ timeout: 15000 });

    // Add a subtitle so it appears on the video
    await page.locator('button:has-text("+ Add Subtitle")').click();
    await page.waitForTimeout(500);

    const analysis = await analyzeScreenshot(
      page,
      'Is there a video player visible on this page? Is there any subtitle or text overlay visible on or near the video area? Answer YES or NO with brief explanation.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    expect(analysis).toBeTruthy();
    console.log('[AI] Subtitle overlay analysis:', analysis);
    expect(analysis!.toLowerCase()).toContain('yes');
  });

  test('dashboard shows heading, navigation, and project list or empty state', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('h1');

    const analysis = await analyzeScreenshot(
      page,
      'Is this a dashboard or projects page? Does it have a heading, navigation/sidebar, and either a list of projects or an empty state message? Answer YES or NO.'
    );

    test.skip(analysis === 'RATE_LIMITED', 'OpenRouter rate limited');
    expect(analysis).toBeTruthy();
    console.log('[AI] Dashboard analysis:', analysis);
    expect(analysis!.toLowerCase()).toContain('yes');
  });
});
