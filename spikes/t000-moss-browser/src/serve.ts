/**
 * Spike T-000 · servidor local: página, bundles, runtime de ORT y pesos.
 * Uso: node src/serve.ts <carpeta de pesos> [puerto] [--isolated]
 * Con --isolated envía COOP/COEP: la página queda aislada entre orígenes y WASM puede usar hilos.
 */
import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const [modelsDir, portArg, ...flags] = process.argv.slice(2);
if (!modelsDir) throw new Error('uso: serve.ts <pesos> [puerto] [--isolated]');
const port = Number(portArg ?? 8787);
const isolated = flags.includes('--isolated');
const root = resolve(import.meta.dirname, '..');

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.onnx': 'application/octet-stream',
  '.data': 'application/octet-stream',
  '.model': 'application/octet-stream',
};

const PAGE = `<!doctype html><meta charset="utf-8"><title>Spike T-000</title>
<pre id="log"></pre><script type="module" src="/dist/page.js"></script>`;

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (isolated) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': types['.html']! }).end(PAGE);
    return;
  }
  let file: string | null = null;
  const p = decodeURIComponent(url.pathname);
  if (p.startsWith('/dist/')) file = join(root, 'out', 'dist', p.slice(6));
  else if (p.startsWith('/ort/')) file = join(root, 'node_modules', 'onnxruntime-web', 'dist', p.slice(5));
  else if (p.startsWith('/models/')) {
    // Alias: los repos se guardan como <org>__<repo>; la página los pide sin la organización.
    const rel = p.slice(8).replace(/^(MOSS-TTS-Nano-100M-ONNX|MOSS-Audio-Tokenizer-Nano-ONNX)\//, 'OpenMOSS-Team__$1/');
    file = join(modelsDir, rel);
  }
  if (!file || p.includes('..') || !existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  const size = statSync(file).size;
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'content-length': size, 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`spike en http://127.0.0.1:${port} aislado=${isolated}`));
