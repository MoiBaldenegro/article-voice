import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  outputDir: '../../test-results',
  use: { baseURL: 'http://localhost:4174' },
  webServer: {
    command: 'node serve.mjs',
    url: 'http://localhost:4174/',
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
      },
    },
  ],
});
