import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = __dirname;

describe('ejemplos por framework', () => {
  it.each([
    ['html', 'index.html', 'npx serve examples/html'],
    ['astro', 'src/pages/index.astro', 'pnpm dev'],
    ['react', 'src/main.jsx', 'pnpm dev'],
  ])('%s existe y documenta su comando de arranque', (name, entry, command) => {
    expect(existsSync(join(dir, name, entry))).toBe(true);
    const readme = readFileSync(join(dir, name, 'README.md'), 'utf8');
    expect(readme).toContain(command);
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toContain(`[${name}]`);
  });
});
