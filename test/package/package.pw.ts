import { expect, test } from '@playwright/test';

const expected = { core: 'object', hasError: 'function', registered: 'function' };

for (const page of ['vite.html', 'plain.html']) {
  test(`dist/ funciona desde ${page}`, async ({ page: p }) => {
    const errors: string[] = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(`/${page}`);
    await p.waitForFunction(() => '__result' in window);
    expect(await p.evaluate(() => (window as unknown as { __result: unknown }).__result)).toEqual(
      expected,
    );
    expect(errors).toEqual([]);
  });
}

test('el snippet del README registra e inicializa <article-voice>', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/snippet.html');
  await page.waitForFunction(() => customElements.get('article-voice') !== undefined);
  const info = await page.evaluate(() => {
    const el = document.querySelector('article-voice') as HTMLElement & { engine: string };
    return { engine: el.engine, upgraded: el instanceof customElements.get('article-voice')! };
  });
  expect(info).toEqual({ engine: 'web-speech', upgraded: true });
  expect(errors).toEqual([]);
});
