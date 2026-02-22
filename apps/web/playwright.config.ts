import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { readFileSync } from 'fs';

// Load .env file for E2E tests (Playwright doesn't load it automatically)
try {
  const envFile = readFileSync(path.join(__dirname, '../../.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env file not found, skip
}

const authFile = path.join(__dirname, 'e2e', '.auth', 'user.json');

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  outputDir: './e2e/test-results',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'bun run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /landing\.spec\.ts/],
    },
    {
      name: 'no-auth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /landing\.spec\.ts/,
    },
  ],
});
