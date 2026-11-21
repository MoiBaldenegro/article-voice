import { expect, test } from '@playwright/test';

type Result = { ended: number[]; underruns: number };
declare global {
  interface Window {
    play(segments: number, gapMs: number): Promise<Result>;
  }
}

test('reproduce PCM sintético en streaming sin underruns', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(() => window.play(3, 0));
  expect(r.ended).toEqual([0, 1, 2]);
  expect(r.underruns).toBe(0);
});

test('cuenta un underrun cuando el audio llega tarde a mitad de un segmento', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(() => window.play(1, 600));
  expect(r.ended).toEqual([0]);
  expect(r.underruns).toBe(1);
});
