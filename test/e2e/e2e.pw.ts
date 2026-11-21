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

/** Texto resaltado en la página (CSS Custom Highlight API) por el elemento. */
const highlighted = (page: Page) =>
  page.evaluate(() => {
    const h = (CSS as unknown as { highlights: Map<string, Iterable<Range>> }).highlights.get(
      'article-voice',
    );
    return h ? Array.from(h, (r) => r.toString()) : [];
  });

test('resalta el segmento en lectura sin mutar el DOM del artículo', async ({ page }) => {
  const before = await page.locator('#post').innerHTML();
  await page.locator(button('av', 'play')).click();
  await expect(page.locator(root('av'))).toHaveAttribute('data-state', 'playing');

  const article = await page.locator('#post').innerText();
  const seen = new Set<string>();
  await expect
    .poll(
      async () => {
        for (const text of await highlighted(page)) seen.add(text);
        return seen.size;
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(1);
  for (const text of seen) {
    expect(text.trim().length).toBeGreaterThan(0);
    expect(article.replace(/\s+/g, ' ')).toContain(text.replace(/\s+/g, ' ').trim());
    expect(text.length).toBeLessThanOrEqual(300);
  }
  expect(await page.locator('#post').innerHTML()).toBe(before);

  // Al terminar no queda nada resaltado.
  await expect
    .poll(async () => (await events(page)).some((e) => e.type === 'ended'), { timeout: 30_000 })
    .toBe(true);
  expect(await highlighted(page)).toEqual([]);
});

test('el resaltado se quita al detener y no aparece con no-highlight', async ({ page }) => {
  await page.locator(button('av', 'play')).click();
  await expect(page.locator(root('av'))).toHaveAttribute('data-state', 'playing');
  await expect.poll(async () => (await highlighted(page)).length).toBeGreaterThan(0);
  await page.locator(button('av', 'stop')).click();
  await expect.poll(async () => (await highlighted(page)).length).toBe(0);

  await page.evaluate(() => {
    (document.getElementById('av') as unknown as { noHighlight: boolean }).noHighlight = true;
  });
  await page.locator(button('av', 'play')).click();
  await expect(page.locator(root('av'))).toHaveAttribute('data-state', 'playing');
  await page.waitForTimeout(500);
  expect(await highlighted(page)).toEqual([]);
});

test('con prefers-reduced-motion el seguimiento no anima el scroll', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '4000px';
    document.getElementById('post')?.firstElementChild?.after(spacer);
    const calls: string[] = [];
    (window as unknown as { __scrolls: string[] }).__scrolls = calls;
    const orig = window.scrollTo.bind(window);
    window.scrollTo = ((o: ScrollToOptions) => {
      calls.push(String(o.behavior));
      orig(o);
    }) as typeof window.scrollTo;
  });
  await page.locator(button('av', 'play')).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __scrolls: string[] }).__scrolls))
    .not.toEqual([]);
  const calls = await page.evaluate(() => (window as unknown as { __scrolls: string[] }).__scrolls);
  expect(new Set(calls)).toEqual(new Set(['auto']));
});
