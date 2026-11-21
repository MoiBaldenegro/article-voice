import { expect, test, type Page } from '@playwright/test';

type Recorded = { type: string; detail: unknown; id: string };

const root = (id: string) => `#${id} [part="root"]`;
const button = (id: string, part: string) => `#${id} button[part="${part}"]`;
const events = (page: Page) =>
  page.evaluate(() => (window as unknown as { __events: Recorded[] }).__events);

test.beforeEach(async ({ page }) => {
  // Los eventos article-voice:* burbujean al document; se capturan desde antes del arranque.
  await page.addInitScript(() => {
    const w = window as unknown as { __events: Recorded[] };
    w.__events = [];
    for (const t of ['statechange', 'segment', 'ended', 'fallback', 'error']) {
      document.addEventListener(`article-voice:${t}`, (e) =>
        w.__events.push({
          type: t,
          detail: (e as CustomEvent).detail,
          id: (e.target as Element).id,
        }),
      );
    }
  });
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('article-voice') !== undefined);
});

test('play con servidor falso: playing, avanza segmentos hasta ended', async ({ page }) => {
  await page.locator(button('av', 'play')).click();
  await expect(page.locator(root('av'))).toHaveAttribute('data-state', 'playing');
  await expect
    .poll(async () => (await events(page)).some((e) => e.type === 'ended'), { timeout: 30_000 })
    .toBe(true);

  const seen = await events(page);
  const indexes = seen
    .filter((e) => e.type === 'segment')
    .map((e) => (e.detail as { index: number }).index);
  expect(new Set(indexes).size).toBeGreaterThan(1);
  expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  expect(seen.some((e) => e.type === 'fallback' && e.id === 'av')).toBe(false);
  const requests = await page.evaluate(() =>
    fetch('http://localhost:4177/__count').then((r) => r.text()),
  );
  expect(Number(requests)).toBeGreaterThan(1);
});

test('con el servidor caído usa la voz del sistema y emite article-voice:fallback', async ({
  page,
}) => {
  await page.locator(button('down', 'play')).click();
  await expect(page.locator('#down [part="meta"]')).toHaveText('Se usa la voz del sistema');
  expect((await events(page)).some((e) => e.type === 'fallback' && e.id === 'down')).toBe(true);
});

test('pause, resume y stop', async ({ page }) => {
  await page.locator(button('av', 'play')).click();
  await expect(page.locator(root('av'))).toHaveAttribute('data-state', 'playing');

  await page.locator(button('av', 'pause')).click();
  await expect(page.locator(root('av'))).toHaveAttribute('data-state', 'paused');

  await page.locator(button('av', 'play')).click(); // en pausa el botón reanuda
  await expect(page.locator(root('av'))).toHaveAttribute('data-state', 'playing');

  await page.locator(button('av', 'stop')).click();
  await expect(page.locator(root('av'))).toHaveAttribute('data-state', 'idle');
  const states = (await events(page))
    .filter((e) => e.type === 'statechange')
    .map((e) => (e.detail as { state: string }).state);
  expect(states).toEqual(expect.arrayContaining(['playing', 'paused', 'idle']));
});
