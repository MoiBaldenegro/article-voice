// Servidor estático (4176: página + dist/) y servidor falso de /v1/audio/speech (4177).
import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');

/** PCM 16-bit LE mono a 48 kHz: un tono de 0,25 s por petición. */
function pcm() {
  const n = 12000;
  const buf = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / 48000) * 8000), i * 2);
  }
  return buf;
}

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
};

let speechRequests = 0;
createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  if (pathname === '/v1/audio/speech' && req.method === 'POST') {
    speechRequests++;
    req.resume();
    return req.on('end', () =>
      res.writeHead(200, { ...cors, 'content-type': 'audio/pcm' }).end(pcm()),
    );
  }
  if (pathname === '/__count') return res.writeHead(200, cors).end(String(speechRequests));
  res.writeHead(200, cors).end('ok'); // sondeo HEAD/GET de la raíz
}).listen(4177);

const types = { '.html': 'text/html', '.js': 'text/javascript' };
createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  const file = p.startsWith('/dist/') ? join(root, p) : join(here, p === '/' ? 'page.html' : p);
  try {
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(4176);
