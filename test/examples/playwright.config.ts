import { defineConfig } from '@playwright/test';

// Requiere `pnpm build` en la raíz y `pnpm install --ignore-workspace` en cada ejemplo
// (lo hace `pnpm test:examples`).
export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  outputDir: '../../test-results',
  webServer: [
    {
      command: 'pnpm dev --port 5183 --strictPort',
      cwd: '../../examples/react',
      url: 'http://localhost:5183/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev --port 4331',
      cwd: '../../examples/astro',
      url: 'http://localhost:4331/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
