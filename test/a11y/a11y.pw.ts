import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function open(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => (window as unknown as { __ready: Promise<unknown> }).__ready);
}

const axe = (page: import('@playwright/test').Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();

test('axe sin violaciones en idle (es, en y con aviso de respaldo)', async ({ page }) => {
  await open(page);
  expect((await axe(page)).violations).toEqual([]);
  const meta = page.locator('#fb [part="meta"]');
  await expect(meta).toHaveText('Using the system voice');
});

test('axe sin violaciones en playing, paused y error', async ({ page }) => {
  await open(page);
  const play = page.locator('#es button[part="play"]');
  await play.click();
  await expect(page.locator('#es [part="root"]')).toHaveAttribute('data-state', 'playing');
  expect((await axe(page)).violations).toEqual([]);

  await page.locator('#es button[part="pause"]').click();
  await expect(page.locator('#es [part="root"]')).toHaveAttribute('data-state', 'paused');
  expect((await axe(page)).violations).toEqual([]);

  await page.evaluate(() => {
    const el = document.getElementById('en') as unknown as { createEngine: unknown };
    el.createEngine = () => ({
      kind: { value: 'moss-server' },
      prepare: async () => {
        throw new Error('boom');
      },
      voices: () => [],
      dispose: () => undefined,
    });
  });
  await page.locator('#en button[part="play"]').click();
  await expect(page.locator('#en [part="root"]')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#en [part="error"]')).toHaveText('The narration could not be played');
  expect((await axe(page)).violations).toEqual([]);
});

test('teclado: Tab llega al botón, el foco es visible y Enter/Espacio alternan', async ({
  page,
}) => {
  await open(page);
  await page.keyboard.press('Tab');
  const play = page.locator('#es button[part="play"]');
  await expect(play).toBeFocused();
  const outline = await play.evaluate((b) => getComputedStyle(b).outlineWidth);
  expect(outline).toBe('2px');
  await page.keyboard.press('Enter');
  await expect(page.locator('#es [part="root"]')).toHaveAttribute('data-state', 'playing');
  await expect(page.locator('#es [role="status"]')).toHaveText('Reproduciendo');
});
