// Empaqueta WebAudioOutput con Vite y lo sirve en una página mínima para la prueba en Chrome.
import { build } from 'vite';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.vite-out');

await build({
  root: here,
  logLevel: 'warn',
  build: {
    outDir: out,
    emptyOutDir: true,
    rollupOptions: { input: join(here, 'page.html') },
  },
});

const types = { '.html': 'text/html', '.js': 'text/javascript' };
createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  const file = join(out, p === '/' ? 'page.html' : p);
  try {
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(4174);
