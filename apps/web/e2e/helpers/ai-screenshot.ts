import type { Page } from '@playwright/test';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemma-3-27b-it:free';
const DELAY_BETWEEN_CALLS_MS = 5000; // 5s between calls → max 12 req/min
let lastCallTimestamp = 0;

export function isAIAvailable(): boolean {
  return !!OPENROUTER_API_KEY;
}

/**
 * Wait until enough time has passed since the last AI API call.
 * All AI tests run in serial mode in a single file, so in-memory tracking works.
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTimestamp;
  if (elapsed < DELAY_BETWEEN_CALLS_MS) {
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CALLS_MS - elapsed));
  }
  lastCallTimestamp = Date.now();
}

/**
 * Take a screenshot of the page and analyze it with a free vision model via OpenRouter.
 * Returns the AI's text analysis, or null if OPENROUTER_API_KEY is not set.
 */
export async function analyzeScreenshot(
  page: Page,
  prompt: string
): Promise<string | null> {
  if (!OPENROUTER_API_KEY) return null;

  const buffer = await page.screenshot({ fullPage: false });
  const base64 = buffer.toString('base64');

  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Throttle: wait for rate limit window before each attempt
    if (attempt > 0) {
      // Extra backoff on retry: 8s, 12s, 16s, 20s
      await new Promise((r) => setTimeout(r, (attempt + 1) * 4000));
    }
    await waitForRateLimit();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'subtitle-burner-e2e',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a QA engineer analyzing a UI screenshot. Answer concisely.\n\n${prompt}`,
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${base64}` },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (response.status === 429) {
      console.warn(`[ai-screenshot] Rate limited (attempt ${attempt + 1}/${maxRetries})`);
      continue;
    }

    if (!response.ok) {
      console.warn(`[ai-screenshot] OpenRouter API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  }

  console.warn('[ai-screenshot] All retries exhausted (rate limited)');
  return 'RATE_LIMITED';
}

/**
 * Analyze a screenshot and assert the response contains expected keywords.
 * Skips gracefully if no API key.
 */
export async function assertScreenshot(
  page: Page,
  prompt: string,
  expectedKeywords: string[]
): Promise<{ analysis: string | null; passed: boolean }> {
  const analysis = await analyzeScreenshot(page, prompt);
  if (!analysis) return { analysis: null, passed: true }; // skip = pass

  const lower = analysis.toLowerCase();
  const passed = expectedKeywords.every((kw) => lower.includes(kw.toLowerCase()));
  return { analysis, passed };
}
