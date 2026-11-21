import { expect, test } from '@playwright/test';

const examples = [
  { name: 'react', url: 'http://localhost:5183/' },
  { name: 'astro', url: 'http://localhost:4331/' },
];

for (const { name, url } of examples) {
  test(`${name}: registra <article-voice> y detecta el artículo`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const w = window as unknown as { __events: { type: string; detail: unknown }[] };
      w.__events = [];
      for (const t of ['ready', 'error']) {
        document.addEventListener(`article-voice:${t}`, (e) =>
          w.__events.push({ type: t, detail: (e as CustomEvent).detail }),
        );
      }
    });
    await page.goto(url);
    await page.waitForFunction(() => customElements.get('article-voice') !== undefined);

    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { __events: { type: string }[] }).__events.map((e) => e.type),
        ),
      )
      .toContain('ready');

    const state = await page.evaluate(() => {
      const el = document.querySelector('article-voice') as unknown as {
        article: { words: number } | null;
      };
      return {
        wordCount: el.article?.words ?? 0,
        events: (window as unknown as { __events: { type: string }[] }).__events,
        root: document.querySelector('article-voice')?.shadowRoot?.querySelector('[part="root"]')
          ? true
          : false,
      };
    });
    expect(state.events.filter((e) => e.type === 'error')).toEqual([]);
    expect(state.wordCount).toBeGreaterThanOrEqual(120);
    expect(state.root).toBe(true);
    expect(errors).toEqual([]);
  });
}
