/* eslint-disable @typescript-eslint/no-explicit-any -- el código de la página se evalúa en el navegador (window.__avDemo) */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const root = resolve(import.meta.dirname, '../..');
const site = resolve(root, '_site');
const url = pathToFileURL(resolve(site, 'index.html')).href;

test.beforeAll(() => {
  execFileSync('sh', ['scripts/build-landing.sh', site], { cwd: root });
});

test('el audio de la demo pesa menos de 2 MB y tiene una frase por archivo', () => {
  const dir = resolve(site, 'audio');
  const oggs = readdirSync(dir).filter((f) => f.endsWith('.ogg'));
  const bytes = oggs.reduce((n, f) => n + statSync(resolve(dir, f)).size, 0);
  expect(bytes).toBeLessThan(2 * 1024 * 1024);
  const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8')) as {
    sentences: { file: string }[];
  };
  expect(manifest.sentences.map((s) => s.file)).toEqual(oggs.sort());
});

test('cada archivo de audio carga y coincide con una frase del artículo', async ({ page }) => {
  await page.goto(url);
  const sentences = await page.locator('#art-text .s').count();
  await page.waitForFunction(() => (window as any).__avDemo.durations.every((d: number) => d > 0));
  const d = await page.evaluate(() => (window as any).__avDemo.durations as number[]);
  expect(d).toHaveLength(sentences);
  d.forEach((x) => expect(x).toBeGreaterThan(1));
});

test('play hace avanzar el audio real y el resaltado lo sigue; pausa y velocidad lo controlan', async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.locator('.demo-note').last()).toContainText('Audio generado con MOSS-TTS-Nano');
  await page.waitForFunction(() => (window as any).__avDemo.durations.every((d: number) => d > 0));
  await page.click('#av-play');
  await page.waitForFunction(() => (window as any).__avDemo.audio.currentTime > 0.5, undefined, {
    timeout: 15000,
  });
  const demo = () =>
    page.evaluate(() => {
      const a = (window as any).__avDemo;
      return {
        mode: a.mode,
        state: a.state,
        t: a.audio.currentTime as number,
        paused: a.audio.paused as boolean,
      };
    });
  const a = await demo();
  expect(a.mode).toBe('moss');
  expect(a.state).toBe('playing');
  await expect(page.locator('#art-text .s.now')).toHaveCount(1);
  expect(Number(await page.locator('#av-progress').getAttribute('data-elapsed'))).toBeGreaterThan(
    0,
  );

  await page.click('#av-play'); // pausa
  const p1 = await demo();
  expect(p1.paused).toBe(true);
  await page.waitForTimeout(400);
  expect((await demo()).t).toBeCloseTo(p1.t, 1);

  await page.click('#av-rate');
  expect(await page.evaluate(() => (window as any).__avDemo.audio.playbackRate)).toBe(1.25);
  await page.click('#av-play'); // continúa
  await page.waitForFunction((t) => (window as any).__avDemo.audio.currentTime > t + 0.3, p1.t, {
    timeout: 10000,
  });
});

test('si el audio no carga, la demo lo indica y cae a web-speech', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__spoken = [];
    const synth = {
      speak: (u: { text: string }) => (window as any).__spoken.push(u.text),
      cancel: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    (window as any).SpeechSynthesisUtterance = function (this: any, text: string) {
      this.text = text;
    };
  });
  await page.route('**/audio/*.ogg', (r) => r.abort());
  await page.goto(url);
  await page.click('#av-play');
  await expect(page.locator('#av-engine')).toHaveText('web-speech', { timeout: 10000 });
  await expect(page.locator('#av-notice')).toBeVisible();
  await expect(page.locator('#av-notice')).toContainText('web-speech');
  await page.waitForFunction(() => (window as any).__spoken.length > 0);
});
