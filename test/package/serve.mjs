// Sirve (1) HTML sin bundler que importa dist/ tal cual y (2) la build de Vite del paquete.
import { build } from 'vite';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const out = join(here, '.vite-out');

await build({
  root: join(here, 'fixtures'),
  logLevel: 'warn',
  resolve: { alias: { 'article-voice': join(root, 'dist/index.js') } },
  build: {
    outDir: out,
    emptyOutDir: true,
    rollupOptions: { input: join(here, 'fixtures/vite.html') },
  },
});

const types = { '.html': 'text/html', '.js': 'text/javascript' };
createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  const file = p.startsWith('/dist/')
    ? join(root, p)
    : p === '/snippet.html'
      ? join(here, 'fixtures/snippet.html')
      : p === '/plain.html'
        ? join(here, 'fixtures/plain.html')
        : join(out, p === '/vite.html' ? 'vite.html' : p);
  try {
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(4173);
