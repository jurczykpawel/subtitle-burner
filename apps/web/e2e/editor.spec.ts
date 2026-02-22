import { test, expect } from '@playwright/test';

import path from 'path';
import fs from 'fs';

let projectId: string;

test.beforeEach(async ({ page }) => {
  if (!projectId) {
    // Upload a video via the API using the page's request context (has auth cookies)
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

    if (response.ok()) {
      const data = await response.json();
      projectId = data.id;
    }
  }

  test.skip(!projectId, 'Failed to create test project');

  await page.goto(`/dashboard/${projectId}`);
  // Wait for the editor to fully load (toolbar appears once videoUrl is set)
  await expect(page.locator('text=Subtitle Burner')).toBeVisible({ timeout: 15000 });
});

test.describe('Editor page', () => {
  // -------------------------------------------------------------------
  // 1. Editor loads
  // -------------------------------------------------------------------
  test('editor loads with toolbar visible', async ({ page }) => {
    // The toolbar banner text is present
    await expect(page.locator('text=Subtitle Burner')).toBeVisible();
    // A video element should be in the DOM
    await expect(page.locator('video')).toBeAttached();
  });

  // -------------------------------------------------------------------
  // 2. Toolbar buttons present
  // -------------------------------------------------------------------
  test('toolbar has all expected buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("Import SRT")')).toBeVisible();
    await expect(page.locator('button:has-text("Export SRT")')).toBeVisible();
    await expect(page.locator('button:has-text("Undo")')).toBeVisible();
    await expect(page.locator('button:has-text("Redo")')).toBeVisible();
    await expect(page.locator('button:has-text("Play")')).toBeVisible();
    await expect(page.locator('button:has-text("+ Add Subtitle")')).toBeVisible();
    await expect(page.locator('button:has-text("Render")')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 3. Add subtitle
  // -------------------------------------------------------------------
  test('clicking "+ Add Subtitle" adds a subtitle to the list', async ({ page }) => {
    // Switch to Subtitles tab to see the list
    await page.locator('[role="tab"]:has-text("Subtitles")').click();
    // Initially no subtitles
    await expect(page.locator('h3:has-text("Subtitles (0)")')).toBeVisible();

    // Add a subtitle
    await page.locator('button:has-text("+ Add Subtitle")').click();

    // The count should now be 1
    await expect(page.locator('h3:has-text("Subtitles (1)")')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 4. Edit subtitle text
  // -------------------------------------------------------------------
  test('clicking a subtitle opens textarea for editing', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Subtitles")').click();

    // Add a subtitle
    await page.locator('button:has-text("+ Add Subtitle")').click();
    await expect(page.locator('h3:has-text("Subtitles (1)")')).toBeVisible();

    // Click the subtitle item to select it (the clickable card area)
    const subtitleItem = page.locator('.cursor-pointer.rounded-md.border').first();
    await subtitleItem.click();

    // A textarea should appear for editing
    const textarea = subtitleItem.locator('textarea');
    await expect(textarea).toBeVisible();

    // Clear and type new text
    await textarea.fill('Hello World');
    await expect(textarea).toHaveValue('Hello World');
  });

  // -------------------------------------------------------------------
  // 5. Delete subtitle
  // -------------------------------------------------------------------
  test('clicking the delete button removes the subtitle', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Subtitles")').click();

    // Add a subtitle
    await page.locator('button:has-text("+ Add Subtitle")').click();
    await expect(page.locator('h3:has-text("Subtitles (1)")')).toBeVisible();

    // Click the delete button (the x button within the subtitle item)
    const deleteButton = page.locator('.cursor-pointer.rounded-md.border').first().locator('button:has-text("\u00d7")');
    await deleteButton.click();

    // Back to 0
    await expect(page.locator('h3:has-text("Subtitles (0)")')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 6. Import SRT
  // -------------------------------------------------------------------
  test('importing an SRT file populates the subtitle list', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Subtitles")').click();

    // Set files on the hidden SRT input directly
    const srtPath = path.join(__dirname, 'fixtures', 'test.srt');
    await page.locator('input[accept=".srt"]').setInputFiles(srtPath);

    // The test.srt fixture has 2 subtitle cues — wait for them to appear in the sidebar
    const subtitlePanel = page.getByRole('tabpanel', { name: 'Subtitles' });
    await expect(subtitlePanel.getByText('Hello, world!')).toBeVisible({ timeout: 10000 });
    await expect(subtitlePanel.getByText('This is a test subtitle.')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 7. Tab switching
  // -------------------------------------------------------------------
  test('sidebar tabs switch between Templates, Style, and Subtitles', async ({ page }) => {
    // Click Templates tab
    await page.locator('[role="tab"]:has-text("Templates")').click();
    // Template gallery should show category filter buttons
    await expect(page.locator('text=Save Current as Template')).toBeVisible();

    // Click Style tab
    await page.locator('[role="tab"]:has-text("Style")').click();
    await expect(page.locator('h3:has-text("Style")')).toBeVisible();

    // Click Subtitles tab
    await page.locator('[role="tab"]:has-text("Subtitles")').click();
    await expect(page.locator('h3:has-text("Subtitles")')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 8. Style panel controls
  // -------------------------------------------------------------------
  test('style panel has font size slider and color inputs', async ({ page }) => {
    await page.locator('[role="tab"]:has-text("Style")').click();
    await expect(page.locator('h3:has-text("Style")')).toBeVisible();

    // Font size slider (Slider renders an input[type="range"] or a role="slider" element)
    await expect(page.locator('text=Size:')).toBeVisible();
    await expect(page.locator('[role="slider"]').first()).toBeVisible();

    // Color inputs
    const colorInputs = page.locator('input[type="color"]');
    const count = await colorInputs.count();
    expect(count).toBeGreaterThanOrEqual(2); // At least Font Color + Background

    // Font label
    await expect(page.locator('text=Font Color')).toBeVisible();
    await expect(page.locator('text=Background')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 9. Playback controls
  // -------------------------------------------------------------------
  test('play button is present and clickable', async ({ page }) => {
    const playButton = page.locator('button:has-text("Play")');
    await expect(playButton).toBeVisible();
    await playButton.click();

    // With a synthetic test video, playback may not start (no real frames),
    // so just verify the button remains interactive
    await expect(
      page.locator('button:has-text("Pause")').or(page.locator('button:has-text("Play")'))
    ).toBeVisible({ timeout: 3000 });
  });

  // -------------------------------------------------------------------
  // 10. Timeline visible
  // -------------------------------------------------------------------
  test('timeline section with zoom controls is visible', async ({ page }) => {
    // The timeline has zoom label and +/- buttons
    await expect(page.locator('text=Zoom:')).toBeVisible();
    await expect(page.getByRole('button', { name: '-', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '+', exact: true })).toBeVisible();

    // Snap toggle button
    await expect(page.locator('button:has-text("Snap")')).toBeVisible();
  });

  // -------------------------------------------------------------------
  // 11. Visual regression
  // -------------------------------------------------------------------
  test('visual regression: editor with toolbar and timeline', async ({ page }) => {
    // Let the page settle
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('editor-full.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

});
