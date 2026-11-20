import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHttpServerProbe } from './HttpServerProbe.js';

function listen(
  handler: Parameters<typeof createServer>[1],
): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/` });
    });
  });
}

describe('createHttpServerProbe', () => {
  it('true si el servidor responde', async () => {
    const { server, url } = await listen((_req, res) => res.end('ok'));
    try {
      expect(await createHttpServerProbe()(url)).toBe(true);
    } finally {
      server.close();
    }
  });

  it('prueba GET si HEAD da 405', async () => {
    const methods: string[] = [];
    const { server, url } = await listen((req, res) => {
      methods.push(req.method ?? '');
      res.statusCode = req.method === 'HEAD' ? 405 : 200;
      res.end();
    });
    try {
      expect(await createHttpServerProbe()(url)).toBe(true);
      expect(methods).toEqual(['HEAD', 'GET']);
    } finally {
      server.close();
    }
  });

  it('false si responde 5xx', async () => {
    const { server, url } = await listen((_req, res) => {
      res.statusCode = 503;
      res.end();
    });
    try {
      expect(await createHttpServerProbe()(url)).toBe(false);
    } finally {
      server.close();
    }
  });

  it('false con el servidor caído', async () => {
    const { server, url } = await listen((_req, res) => res.end());
    await new Promise((r) => server.close(r));
    expect(await createHttpServerProbe()(url)).toBe(false);
  });

  it('false por timeout si el servidor no contesta', async () => {
    const { server, url } = await listen(() => undefined);
    try {
      expect(await createHttpServerProbe({ timeoutMs: 50 })(url)).toBe(false);
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });

  it('false si la señal ya está abortada, y envía sin credenciales', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    expect(await createHttpServerProbe()('http://127.0.0.1:1/', ctrl.signal)).toBe(false);

    const seen: RequestInit[] = [];
    const fake = (async (_u: unknown, init?: RequestInit) => {
      seen.push(init ?? {});
      return new Response(null, { status: 200 });
    }) as typeof fetch;
    expect(await createHttpServerProbe({ fetch: fake })('https://x.test/')).toBe(true);
    expect(seen[0]).toMatchObject({ credentials: 'omit', method: 'HEAD' });
  });
});
