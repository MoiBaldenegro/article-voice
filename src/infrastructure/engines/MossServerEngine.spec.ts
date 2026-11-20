import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { VoiceId, type AudioChunk } from '../../../libs/reader/src/index.js';
import { speechEngineContract } from '../../../libs/reader/src/core/domain/outbound/testing/contracts.js';
import { MossServerEngine } from './MossServerEngine.js';

type Handler = (req: IncomingMessage, res: ServerResponse, body: string) => void;

let server: Server;
let url: string;
let handler: Handler;
const received: { path: string; body: string; method: string }[] = [];

const pcm = (...samples: number[]): Buffer => {
  const b = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => b.writeInt16LE(s, i * 2));
  return b;
};

const okHandler: Handler = (_req, res) => {
  res.writeHead(200, { 'content-type': 'audio/pcm' });
  res.end(pcm(0, 16384, -16384, 32767));
};

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (d: Buffer) => (body += d.toString()));
    req.on('end', () => {
      received.push({ path: req.url ?? '', body, method: req.method ?? '' });
      handler(req, res, body);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
});
beforeEach(() => {
  received.length = 0;
  handler = okHandler;
});

const voice = VoiceId.of('default');
const collect = async (it: AsyncIterable<AudioChunk>): Promise<AudioChunk[]> => {
  const out: AudioChunk[] = [];
  for await (const c of it) out.push(c);
  return out;
};
const ready = async (opts: Partial<ConstructorParameters<typeof MossServerEngine>[0]> = {}) => {
  const e = new MossServerEngine({ serverUrl: url, ...opts });
  await e.prepare();
  return e;
};

speechEngineContract(
  'MossServerEngine (servidor falso)',
  () => new MossServerEngine({ serverUrl: url }),
);

describe('MossServerEngine', () => {
  it('envía el cuerpo OpenAI y decodifica PCM16 a Float32', async () => {
    const e = await ready();
    const chunks = await collect(e.synthesize('Hola.', voice));
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ method: 'POST', path: '/v1/audio/speech' });
    expect(JSON.parse(received[0]?.body ?? '')).toEqual({
      model: 'moss-tts-nano',
      input: 'Hola.',
      voice: 'default',
      response_format: 'pcm',
      speed: 1,
    });
    const all = Array.from(chunks.flatMap((c) => Array.from(c.samples)));
    expect(all).toEqual([0, 0.5, -0.5, 32767 / 32768]);
    expect(chunks[0]?.sampleRate).toBe(48000);
  });

  it('acepta server-url con ruta base y barra final', async () => {
    const e = await ready({ serverUrl: `${url}/tts/` });
    await collect(e.synthesize('x', voice));
    expect(received[0]?.path).toBe('/tts/v1/audio/speech');
  });

  it('entrega en streaming y reensambla muestras partidas entre fragmentos', async () => {
    handler = (_req, res) => {
      res.writeHead(200);
      const data = pcm(100, 200, 300);
      res.write(data.subarray(0, 3)); // corta una muestra por la mitad
      setTimeout(() => {
        res.write(data.subarray(3, 4));
        setTimeout(() => res.end(data.subarray(4)), 10);
      }, 10);
    };
    const e = await ready();
    const chunks = await collect(e.synthesize('x', voice));
    const all = chunks.flatMap((c) => Array.from(c.samples));
    expect(all).toEqual([100 / 32768, 200 / 32768, 300 / 32768]);
    for (const c of chunks) expect(c.samples.length).toBeGreaterThan(0);
  });

  it.each([400, 404, 429, 500, 503])(
    'respuesta %i → AV_SERVER_ERROR con details.status',
    async (status) => {
      handler = (_req, res) => {
        res.writeHead(status);
        res.end('error');
      };
      const e = await ready();
      await expect(collect(e.synthesize('x', voice))).rejects.toMatchObject({
        code: 'AV_SERVER_ERROR',
        details: { status },
      });
    },
  );

  it('caída de red → AV_SERVER_ERROR sin status', async () => {
    const e = await ready({ serverUrl: 'http://127.0.0.1:1' });
    const err = await collect(e.synthesize('x', voice)).catch((x: unknown) => x);
    expect(err).toMatchObject({ code: 'AV_SERVER_ERROR', recoverable: true });
    expect((err as { details?: { status?: number } }).details?.status).toBeUndefined();
  });

  it('conexión cortada a mitad de respuesta → AV_SERVER_ERROR', async () => {
    handler = (req, res) => {
      res.writeHead(200);
      res.write(pcm(1, 2));
      setTimeout(() => req.socket.destroy(), 10);
    };
    const e = await ready();
    await expect(collect(e.synthesize('x', voice))).rejects.toMatchObject({
      code: 'AV_SERVER_ERROR',
    });
  });

  it('abort durante la respuesta → AV_ABORTED', async () => {
    handler = (_req, res) => {
      res.writeHead(200);
      res.write(pcm(1, 2)); // y no termina
    };
    const e = await ready();
    const ac = new AbortController();
    const run = async (): Promise<void> => {
      for await (const _ of e.synthesize('x', voice, ac.signal)) {
        void _;
        ac.abort();
      }
    };
    await expect(run()).rejects.toMatchObject({ code: 'AV_ABORTED' });
  });

  it('abort antes de recibir cabeceras → AV_ABORTED', async () => {
    handler = () => undefined; // nunca responde
    const e = await ready();
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 20);
    await expect(collect(e.synthesize('x', voice, ac.signal))).rejects.toMatchObject({
      code: 'AV_ABORTED',
    });
  });

  it('dispose cancela una síntesis en curso', async () => {
    handler = () => undefined;
    const e = await ready();
    setTimeout(() => e.dispose(), 20);
    await expect(collect(e.synthesize('x', voice))).rejects.toMatchObject({ code: 'AV_ABORTED' });
  });

  it('no sigue redirecciones: el texto solo va al server-url configurado', async () => {
    handler = (_req, res) => {
      res.writeHead(307, { location: 'http://127.0.0.1:1/otro' });
      res.end();
    };
    const e = await ready();
    await expect(collect(e.synthesize('secreto', voice))).rejects.toMatchObject({
      code: 'AV_SERVER_ERROR',
    });
    expect(received).toHaveLength(1);
  });

  it('usa solo el origen configurado en la llamada a fetch', async () => {
    const calls: string[] = [];
    const fake = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(new Uint8Array(pcm(1)));
    }) as typeof fetch;
    const e = await ready({ serverUrl: 'https://tts.example.com', fetch: fake });
    await collect(e.synthesize('hola', voice));
    expect(calls).toEqual(['https://tts.example.com/v1/audio/speech']);
  });

  it('rechaza server-url inválida (http no local, credenciales)', () => {
    expect(() => new MossServerEngine({ serverUrl: 'http://tts.example.com' })).toThrow();
    expect(() => new MossServerEngine({ serverUrl: 'https://u:p@tts.example.com' })).toThrow();
  });
});
