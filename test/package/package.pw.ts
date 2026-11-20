import { expect, test } from '@playwright/test';

const expected = { core: 'object', hasError: 'function' };

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
