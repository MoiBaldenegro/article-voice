import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  outputDir: '../../test-results',
  use: { baseURL: 'http://localhost:4175' },
  webServer: {
    command: 'node serve.mjs',
    url: 'http://localhost:4175/',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
