import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';

describe('examples/moss-server', () => {
  let child: ChildProcess;
  let base: string;

  beforeAll(async () => {
    const port = 18000 + Math.floor(Math.random() * 1000);
    base = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [join(__dirname, 'server.mjs')], {
      env: {
        ...process.env,
        PORT: String(port),
        ALLOWED_ORIGINS: 'https://blog.example',
        VOICES: 'default,ana',
      },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    await new Promise<void>((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', (c) => reject(new Error(`servidor salió con ${c}`)));
      child.stdout?.once('data', () => resolve());
    });
  });
  afterAll(() => {
    child.removeAllListeners('exit');
    child.kill();
  });

  const post = (body: unknown, origin = 'https://blog.example') =>
    fetch(`${base}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify(body),
    });

  it('devuelve PCM 16-bit con CORS para el origen permitido', async () => {
    const res = await post({
      model: 'moss-tts-nano',
      input: 'Hola mundo',
      voice: 'ana',
      response_format: 'pcm',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://blog.example');
    expect(res.headers.get('access-control-allow-credentials')).toBeNull();
    expect(res.headers.get('content-type')).toBe('audio/pcm');
    const bytes = (await res.arrayBuffer()).byteLength;
    expect(bytes).toBeGreaterThan(0);
    expect(bytes % 2).toBe(0);
  });

  it('rechaza orígenes no permitidos sin generar audio', async () => {
    const res = await post({ input: 'Hola' }, 'https://otro.example');
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('responde al preflight y al sondeo de la raíz', async () => {
    const pre = await fetch(`${base}/v1/audio/speech`, {
      method: 'OPTIONS',
      headers: { origin: 'https://blog.example', 'access-control-request-method': 'POST' },
    });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-headers')).toContain('content-type');
    expect((await fetch(base, { method: 'HEAD' })).status).toBe(200);
  });

  it('valida la entrada', async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ input: 'x', voice: 'nadie' })).status).toBe(400);
    expect((await post({ input: 'x', response_format: 'mp3' })).status).toBe(400);
    expect((await post({ input: 'x'.repeat(5000) })).status).toBe(413);
  });
});
